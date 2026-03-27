
'use server';

import { initializeAdminApp } from "@/firebase/admin-app";
import { Timestamp } from "firebase-admin/firestore";

type ActionResponse = {
  success: boolean;
  error?: string;
};

type AccessRequestParams = {
    userId: string;
    applicantName: string;
    applicantTitle: string;
    agency: string;
    country: string;
    govLevel: string;
    phone: string;
    email: string;
    refName: string;
    refTitle: string;
    refEmail: string;
    refPhone: string;
    justification: string;
    agreedToTerms: boolean;
}

export async function createAccessRequestAction(params: AccessRequestParams): Promise<ActionResponse> {
    console.log("Received access request:", params);
    try {
        const { firestore } = initializeAdminApp();
        await firestore.collection('access_requests').add({ 
            ...params, 
            status: 'Pending', 
            createdAt: Timestamp.now() 
        });
        return { success: true };
    } catch (error: any) {
        return { success: false, error: "Failed to submit application to the database." };
    }
}

export async function validateContactAction(params: {
    email?: string;
    phone?: string;
    country: string;
}): Promise<{ isValid: boolean; reason?: string }> {
    console.log("Validating contact:", params);
    // This is a mock validation. A real implementation would use a third-party service
    // or more complex regex based on the country.
    if (params.email) {
        if (params.email.endsWith('.gov') || params.email.endsWith('.gov.uk') || params.email.endsWith('.police.uk')) {
            return { isValid: true };
        }
        return { isValid: false, reason: "Please use an official government or agency email address." };
    }
    if (params.phone) {
        if (params.phone.length > 8) {
            return { isValid: true };
        }
        return { isValid: false, reason: "The phone number appears to be invalid." };
    }
    return { isValid: false, reason: 'No contact information provided.' };
}

export async function validateJustificationAction(params: {
    justificationText: string;
}): Promise<{ isMeaningful: boolean; reason?: string }> {
    console.log("Validating justification text...");
    // Mock AI check. In a real app, you might use a GenAI model to check for spam/gibberish.
    const wordCount = params.justificationText.trim().split(/\s+/).filter(Boolean).length;
    if (wordCount < 50) {
        return { isMeaningful: false, reason: "The justification is too short to be considered meaningful." };
    }
    if (params.justificationText.includes("test") || params.justificationText.includes("asdf")) {
        return { isMeaningful: false, reason: "The justification appears to be test data." };
    }
    return { isMeaningful: true };
}

export async function grantSpecialAccessAction(params: {
  userId: string;
  requestId: string;
}): Promise<ActionResponse> {
  const { userId, requestId } = params;

  try {
    const { firestore } = initializeAdminApp();
    const batch = firestore.batch();

    // 1. Update the user's profile to grant access
    const userRef = firestore.collection('users').doc(userId);
    batch.update(userRef, { 'settings.hasBroadcastAccess': true });

    // 2. Create a notification for the user
    const notificationRef = firestore.collection('notifications').doc();
    batch.set(notificationRef, {
      recipientId: userId,
      type: 'Special Access Request',
      subject: 'Your request for broadcast access was approved!',
      from: 'Platform Administration',
      date: Timestamp.now().toDate().toISOString(),
      status: 'new',
      relatedId: requestId,
    });

    await batch.commit();
    return { success: true };
  } catch (error: any) {
    console.error("Error granting special access:", error);
    return { success: false, error: error.message };
  }
}
