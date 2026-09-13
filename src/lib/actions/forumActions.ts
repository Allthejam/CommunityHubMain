

'use server';

import { initializeAdminApp } from "@/firebase/admin-app";
import { FieldValue, Timestamp } from "firebase-admin/firestore";

type ActionResponse = {
    success: boolean;
    error?: string;
    topicId?: string;
    categoryId?: string;
}

type CreateTopicParams = {
    categoryId: string;
    title: string;
    message: string;
    authorId: string;
    authorName: string;
    authorAvatar: string;
    isAnonymous?: boolean;
}

export async function runCreateForumTopic(params: CreateTopicParams): Promise<ActionResponse> {
    const { categoryId, title, message, authorId, authorName, authorAvatar, isAnonymous } = params;

    if (!categoryId || !title || !message || !authorId || !authorName) {
        return { success: false, error: "Missing required fields." };
    }

    try {
        const { firestore } = initializeAdminApp();
        const now = Timestamp.now();

        const topicRef = firestore.collection('forum-topics').doc();
        const postRef = topicRef.collection('posts').doc();
        const categoryRef = firestore.collection('forum-categories').doc(categoryId);
        const authorRef = firestore.collection('users').doc(authorId);

        await firestore.runTransaction(async (transaction) => {
            const authorDoc = await transaction.get(authorRef);
            if (!authorDoc.exists) {
                throw new Error("Author does not exist.");
            }

            const authorData = authorDoc.data();
            const isPrivate = authorData?.settings?.publicProfile === false || isAnonymous === true;
            const displayName = isPrivate ? 'Anonymous Member' : (authorName || authorData?.name || 'Community Member');
            const displayAvatar = isPrivate ? '' : (authorAvatar || authorData?.avatar || '');

            // 1. Create the topic document
            transaction.set(topicRef, {
                title,
                categoryId,
                authorId,
                authorName: displayName,
                authorAvatar: displayAvatar,
                authorRealName: authorData?.name || authorName,
                isAnonymous: isPrivate,
                createdAt: now,
                lastPost: now,
                replies: 0,
            });

            // 2. Create the initial post document
            transaction.set(postRef, {
                content: message,
                authorId,
                authorName: displayName,
                authorAvatar: displayAvatar,
                authorRealName: authorData?.name || authorName,
                isAnonymous: isPrivate,
                createdAt: now,
            });

            // 3. Update the category's topic and post counts
            transaction.update(categoryRef, {
                topics: FieldValue.increment(1),
                posts: FieldValue.increment(1),
            });
        });

        return { success: true, topicId: topicRef.id };

    } catch (error: any) {
        console.error("Error creating forum topic:", error);
        return { success: false, error: error.message || "Failed to create topic." };
    }
}

export async function runCreateForumCategory(params: {
    name: string;
    description: string;
    communityId: string;
}): Promise<ActionResponse> {
    const { name, description, communityId } = params;
    if (!name || !description || !communityId) {
        return { success: false, error: "Missing required fields." };
    }
    try {
        const { firestore } = initializeAdminApp();
        const categoryRef = firestore.collection('forum-categories').doc();
        await categoryRef.set({
            name,
            description,
            communityId,
            topics: 0,
            posts: 0,
            createdAt: Timestamp.now(),
        });
        return { success: true, categoryId: categoryRef.id };
    } catch (error: any) {
        console.error("Error creating forum category:", error);
        return { success: false, error: error.message || "Failed to create category." };
    }
}

export async function runUpdateForumCategory(id: string, data: { name: string, description: string }): Promise<ActionResponse> {
  if (!id || !data.name || !data.description) {
    return { success: false, error: "Missing required fields." };
  }
  try {
    const { firestore } = initializeAdminApp();
    const categoryRef = firestore.collection('forum-categories').doc(id);
    await categoryRef.update(data);
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function runDeleteForumCategory(id: string): Promise<ActionResponse> {
  if (!id) {
    return { success: false, error: "Category ID is required." };
  }
  try {
    const { firestore } = initializeAdminApp();
    // In a real app, you would run a batch delete for all topics and posts within this category.
    // This is a simplified version.
    await firestore.collection('forum-categories').doc(id).delete();
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function runAddPostToTopic(params: {
    topicId: string,
    content: string,
    authorId: string,
    isAnonymous?: boolean,
}): Promise<ActionResponse> {
    const { topicId, content, authorId, isAnonymous } = params;
    if (!topicId || !content || !authorId) {
        return { success: false, error: "Missing required fields." };
    }
    try {
        const { firestore } = initializeAdminApp();
        const now = Timestamp.now();
        const topicRef = firestore.collection('forum-topics').doc(topicId);
        const postRef = topicRef.collection('posts').doc();
        const userRef = firestore.collection('users').doc(authorId);

        await firestore.runTransaction(async (transaction) => {
            const userDoc = await transaction.get(userRef);
            if (!userDoc.exists) throw new Error("User not found.");

            const topicDoc = await transaction.get(topicRef);
            if (!topicDoc.exists) throw new Error("Topic not found.");
            
            const userData = userDoc.data();
            const isPrivate = userData?.settings?.publicProfile === false || isAnonymous === true;
            const displayName = isPrivate ? 'Anonymous Member' : (userData?.name || 'Community Member');
            const displayAvatar = isPrivate ? '' : (userData?.avatar || '');

            transaction.set(postRef, {
                content,
                authorId,
                authorName: displayName,
                authorAvatar: displayAvatar,
                authorRealName: userData?.name,
                isAnonymous: isPrivate,
                createdAt: now,
            });

            transaction.update(topicRef, {
                replies: FieldValue.increment(1),
                lastPost: now,
            });
        });

        return { success: true };
    } catch(error: any) {
        return { success: false, error: error.message };
    }
}
