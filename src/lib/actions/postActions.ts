

'use server';

import { initializeAdminApp } from "@/firebase/admin-app";
import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { uploadImageAction } from './storageActions';

type ActionResponse = {
  success: boolean;
  error?: string;
  postId?: string;
};

type CreatePostParams = {
  authorId: string;
  authorName?: string;
  authorAvatar?: string;
  content: string;
  image?: string | null;
  videoUrl?: string | null;
  communityId: string;
};

export async function createPostAction(params: CreatePostParams): Promise<ActionResponse> {
  const { authorId, content, image, videoUrl, communityId } = params;

  if (!authorId || !content || !communityId) {
    return { success: false, error: "Missing required fields (author, content, or community)." };
  }

  try {
    const isDemoCommunity = communityId === '9ayHMyZf4SRw2gof1AM9' || communityId === 'c_showhome';
    const { firestore } = initializeAdminApp(isDemoCommunity ? 'comfeed' : undefined); 

    // Fetch user profile to get necessary info like name and avatar
    let authorName = params.authorName || 'Community Member';
    let authorAvatar = params.authorAvatar || '';

    try {
      const userRef = firestore.collection('users').doc(authorId);
      let userDoc = await userRef.get();
      if (!userDoc.exists && isDemoCommunity) {
        const { firestore: defaultDb } = initializeAdminApp();
        userDoc = await defaultDb.collection('users').doc(authorId).get();
      }
      if (userDoc.exists) {
        const userData = userDoc.data()!;
        authorName = userData.name || authorName;
        authorAvatar = userData.avatar || authorAvatar;
      }
    } catch (err) {
      console.warn("Could not fetch user profile for post author:", err);
    }
    
    let imageUrl: string | null = null;
    
    // Generate a unique ID for the new post first.
    const postRef = firestore.collection(`communities/${communityId}/posts`).doc();

    // If an image is provided (as a base64 string), upload it to storage.
    if (image && image.startsWith('data:')) {
      try {
        const storagePath = `posts/${communityId}/${postRef.id}/${Date.now()}`;
        const uploadResult = await uploadImageAction({ base64Data: image, path: storagePath });
        if (uploadResult.success && uploadResult.url) {
          imageUrl = uploadResult.url;
        }
      } catch (imgErr) {
        console.warn("Image upload failed, using inline fallback if small or omitting:", imgErr);
      }
    } else if (image) {
      imageUrl = image;
    }
    
    const postData = {
      authorId,
      authorName,
      authorAvatar,
      content,
      image: imageUrl,
      videoUrl: videoUrl || null,
      communityId,
      status: 'active',
      createdAt: Timestamp.now(),
      likes: 0,
      commentCount: 0,
      likedBy: [],
    };
    
    // Save to the appropriate database (comfeed for 9ayHMyZf4SRw2gof1AM9, default for live communities)
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
    const isDemoCommunity = communityId === '9ayHMyZf4SRw2gof1AM9' || communityId === 'c_showhome';
    const { firestore } = initializeAdminApp(isDemoCommunity ? 'comfeed' : undefined);
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
    const isDemoCommunity = communityId === '9ayHMyZf4SRw2gof1AM9' || communityId === 'c_showhome';
    const { firestore } = initializeAdminApp(isDemoCommunity ? 'comfeed' : undefined);
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
    const isDemoCommunity = communityId === '9ayHMyZf4SRw2gof1AM9' || communityId === 'c_showhome';
    const { firestore } = initializeAdminApp(isDemoCommunity ? 'comfeed' : undefined);
    const postRef = firestore.collection(`communities/${communityId}/posts`).doc(postId);
    const postDoc = await postRef.get();

    if (!postDoc.exists) {
      throw new Error("Post not found.");
    }
    
    // Security Check: Ensure the user deleting is the author.
    if (postDoc.data()?.authorId !== userId) {
      return { success: false, error: "You do not have permission to delete this post." };
    }

    await postRef.delete();
    
    return { success: true };
  } catch (error: any) {
    console.error("Error deleting post:", error);
    return { success: false, error: 'Could not delete the post.' };
  }
}
