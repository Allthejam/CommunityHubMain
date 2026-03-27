

'use server';

import { initializeAdminApp } from "@/firebase/admin-app";
import { FieldValue, Timestamp } from "firebase-admin/firestore";

type ActionResponse = {
  success: boolean;
  error?: string;
  postId?: string;
};

type CreatePostParams = {
  authorId: string;
  content: string;
  image?: string | null;
  videoUrl?: string | null;
};

export async function createPostAction(params: CreatePostParams): Promise<ActionResponse> {
  const { authorId, content, image, videoUrl } = params;

  if (!authorId || !content) {
    return { success: false, error: "Missing required fields (author or content)." };
  }

  try {
    const { firestore } = initializeAdminApp(); 

    // Fetch user profile to get necessary info
    const userRef = firestore.collection('users').doc(authorId);
    const userDoc = await userRef.get();

    if (!userDoc.exists) {
      return { success: false, error: "Author not found." };
    }
    const userData = userDoc.data()!;
    const communityId = userData.communityId;
    const authorName = userData.name;
    const authorAvatar = userData.avatar || '';

    if (!communityId) {
      return { success: false, error: "Your account is not associated with a community." };
    }
    
    const postRef = firestore.collection(`communities/${communityId}/posts`).doc();
    
    const postData = {
      id: postRef.id,
      authorId,
      authorName,
      authorAvatar,
      content,
      image: image || null,
      videoUrl: videoUrl || null,
      communityId,
      status: 'active',
      createdAt: Timestamp.now(),
      likes: 0,
      commentCount: 0,
      likedBy: [],
    };
    
    await postRef.set(postData);
    
    return { success: true, postId: postRef.id };
  } catch (error: any) {
    console.error("Error creating post:", error);
    return { success: false, error: "A server error occurred while trying to create the post." };
  }
}

export async function likePostAction(params: {
  postId: string;
  userId: string;
  communityId: string;
}): Promise<ActionResponse> {
  const { postId, userId, communityId } = params;
  if (!postId || !userId || !communityId) {
    return { success: false, error: 'Missing required parameters.' };
  }

  try {
    const { firestore } = initializeAdminApp();
    const postRef = firestore.collection(`communities/${communityId}/posts`).doc(postId);

    await firestore.runTransaction(async (transaction) => {
      const postDoc = await transaction.get(postRef);
      if (!postDoc.exists) {
        throw new Error("Post not found.");
      }
      
      const postData = postDoc.data();
      const likedBy = postData?.likedBy || [];
      
      if (likedBy.includes(userId)) {
        // User has already liked, so unlike
        transaction.update(postRef, {
          likes: FieldValue.increment(-1),
          likedBy: FieldValue.arrayRemove(userId)
        });
      } else {
        // User has not liked yet, so like
        transaction.update(postRef, {
          likes: FieldValue.increment(1),
          likedBy: FieldValue.arrayUnion(userId)
        });
      }
    });

    return { success: true };
  } catch (error: any) {
    console.error("Error liking post:", error);
    return { success: false, error: 'Could not update like status.' };
  }
}

export async function updatePostAction(params: {
  postId: string;
  communityId: string;
  content?: string;
  videoUrl?: string | null;
}): Promise<ActionResponse> {
  const { postId, communityId, content, videoUrl } = params;
  if (!postId || !communityId) {
    return { success: false, error: "Post and Community ID are required." };
  }

  try {
    const { firestore } = initializeAdminApp();
    const postRef = firestore.collection(`communities/${communityId}/posts`).doc(postId);

    const updateData: { [key: string]: any } = {
        updatedAt: Timestamp.now(),
    };

    if (content !== undefined) {
        updateData.content = content;
    }
    
    if (videoUrl !== undefined) {
      updateData.videoUrl = videoUrl;
    }
    
    if (Object.keys(updateData).length === 1) {
        // Only updatedAt is present, no actual data changed
        return { success: true }; 
    }

    await postRef.update(updateData);

    return { success: true };
  } catch (error: any) {
    console.error("Error updating post:", error);
    return { success: false, error: "Could not update post." };
  }
}

export async function deletePostAction(params: {
  postId: string;
  communityId: string;
  userId: string;
}): Promise<ActionResponse> {
  const { postId, communityId, userId } = params;
  if (!postId || !communityId || !userId) {
    return { success: false, error: 'Post ID, Community ID, and User ID are required.' };
  }

  try {
    const { firestore } = initializeAdminApp();
    const postRef = firestore.collection(`communities/${communityId}/posts`).doc(postId);
    const postDoc = await postRef.get();

    if (!postDoc.exists) {
      throw new Error("Post not found.");
    }
    
    // Security Check: Ensure the user deleting is the author.
    if (postDoc.data()?.authorId !== userId) {
      return { success: false, error: "You do not have permission to delete this post." };
    }

    // It's good practice to delete subcollections in a batch, but for now we'll just delete the post.
    await postRef.delete();
    
    return { success: true };
  } catch (error: any) {
    console.error("Error deleting post:", error);
    return { success: false, error: 'Could not delete the post.' };
  }
}
