

'use server';

import { initializeAdminApp } from "@/firebase/admin-app";
import { FieldValue, Timestamp } from "firebase-admin/firestore";

type ActionResponse = {
  success: boolean;
  error?: string;
  conversationId?: string;
  message?: string;
};

export async function findOrCreateChatForItem(params: {
  currentUserId: string;
  sellerId: string;
  itemId: string;
  itemTitle: string;
}): Promise<ActionResponse> {
  const { currentUserId, sellerId, itemId, itemTitle } = params;
  if (!currentUserId || !sellerId || !itemId || !itemTitle) {
    return { success: false, error: 'Missing required information.' };
  }

  try {
    const { firestore } = initializeAdminApp();
    const conversationsRef = firestore.collection('conversations');

    // Check for an existing private chat between the two users
    const query1 = conversationsRef
      .where('memberIds', '==', [currentUserId, sellerId])
      .where('scope', '==', 'private')
      .limit(1);

    const query2 = conversationsRef
      .where('memberIds', '==', [sellerId, currentUserId])
      .where('scope', '==', 'private')
      .limit(1);

    const [snapshot1, snapshot2] = await Promise.all([query1.get(), query2.get()]);

    const existingChat = snapshot1.docs[0] || snapshot2.docs[0];

    if (existingChat) {
      // A chat already exists, return its ID
      return { success: true, conversationId: existingChat.id };
    }

    // No existing chat, so create a new one
    const userRef = firestore.collection('users').doc(currentUserId);
    const sellerRef = firestore.collection('users').doc(sellerId);

    const [userDoc, sellerDoc] = await Promise.all([userRef.get(), sellerRef.get()]);

    if (!userDoc.exists || !sellerDoc.exists) {
      return { success: false, error: 'One or more users not found.' };
    }

    const userData = userDoc.data()!;
    const sellerData = sellerDoc.data()!;
    
    // We need the communityId to scope the conversation
    const communityId = sellerData.communityId;
    if (!communityId) {
        return { success: false, error: 'Seller is not associated with a community.' };
    }

    const newConversationData = {
      name: `${userData.name} / ${sellerData.name}`,
      memberIds: [currentUserId, sellerId],
      scope: 'private',
      communityId: communityId,
      lastMessage: `Inquiry about: ${itemTitle}`,
      lastMessageTimestamp: Timestamp.now(),
      createdAt: Timestamp.now(),
      createdBy: currentUserId,
      archivedBy: [],
    };
    
    const newConvoRef = await conversationsRef.add(newConversationData);

    // Add an initial system message
    const initialMessage = {
      senderId: 'system',
      sender: 'System',
      text: `${userData.name} started a conversation with ${sellerData.name} about the marketplace item: "${itemTitle}".`,
      timestamp: Timestamp.now(),
    };
    await newConvoRef.collection('messages').add(initialMessage);

    return { success: true, conversationId: newConvoRef.id };

  } catch (error: any) {
    console.error("Error finding or creating chat:", error);
    return { success: false, error: "Could not initiate conversation." };
  }
}


export async function resetChats(): Promise<ActionResponse> {
  try {
    const { firestore } = initializeAdminApp();
    console.log("Starting chat reset process...");

    const conversationsRef = firestore.collection('conversations');
    const conversationsSnapshot = await conversationsRef.get();

    if (conversationsSnapshot.empty) {
        return { success: true, message: "No conversations found to delete." };
    }
    
    let convoCount = 0;

    for (const convoDoc of conversationsSnapshot.docs) {
        const messagesRef = convoDoc.ref.collection('messages');
        const messagesSnapshot = await messagesRef.get();

        if (!messagesSnapshot.empty) {
            const batch = firestore.batch();
            messagesSnapshot.docs.forEach(doc => {
                batch.delete(doc.ref);
            });
            await batch.commit();
        }

        await convoDoc.ref.delete();
        convoCount++;
    }

    const message = `Successfully deleted ${convoCount} conversation(s) and all their messages.`;
    console.log(message);
    return { success: true, message: message };

  } catch (error: any) {
    console.error("Error resetting chats:", error);
    return { success: false, error: error.message || 'Failed to reset chat histories.' };
  }
}

export async function debugAdmin(): Promise<ActionResponse> {
  const checks = {
    'GEMINI_API_KEY': !!process.env.GEMINI_API_KEY,
    'STRIPE_SECRET_KEY': !!process.env.STRIPE_SECRET_KEY,
    'STRIPE_WEBHOOK_SECRET': !!process.env.STRIPE_WEBHOOK_SECRET,
    'NEXT_PUBLIC_BASE_URL': !!process.env.NEXT_PUBLIC_BASE_URL,
  };

  const missingKeys = Object.entries(checks)
    .filter(([_, value]) => !value)
    .map(([key]) => key);

  if (missingKeys.length > 0) {
    const message = `Server environment is missing the following required keys: ${missingKeys.join(', ')}. Please check your .env file.`;
    console.error(message);
    return { success: false, error: message };
  }

  const message = 'All critical server environment variables are loaded correctly.';
  console.log(message);
  return { success: true, message };
}

export async function deleteMessageAction(params: {
    conversationId: string;
    messageId: string;
}): Promise<ActionResponse> {
    return { success: false, error: "This feature has been disabled." };
}
