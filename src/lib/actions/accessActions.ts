

'use server';

import { initializeAdminApp } from "@/firebase/admin-app";
import { Timestamp, FieldValue } from "firebase-admin/firestore";

type ActionResponse = {
  success: boolean;
  error?: string;
};

type AccessRequestParams = {
    userId: string;
    applicantName: string;
    applicantTitle: string;
    displayName: string;
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
    coverageArea: string;
}

export async function createAccessRequestAction(params: AccessRequestParams): Promise<ActionResponse> {
    console.log("Received access request:", params);
    try {
        const { firestore } = initializeAdminApp();
        const counterRef = firestore.collection('counters').doc('access_requests');

        const newApplicationId = await firestore.runTransaction(async (transaction) => {
            const counterDoc = await transaction.get(counterRef);
            const currentCount = counterDoc.data()?.count || 0;
            const newCount = currentCount + 1;
            
            transaction.set(counterRef, { count: newCount }, { merge: true });
            
            const year = new Date().getFullYear();
            const paddedCount = String(newCount).padStart(5, '0');
            return `NEBS-${year}-${paddedCount}`;
        });

        const batch = firestore.batch();
        
        // Use the new custom ID for the document
        const requestRef = firestore.collection('access_requests').doc(newApplicationId);
        batch.set(requestRef, { 
            ...params, 
            applicationId: newApplicationId, // Store the ID in the document as well
            status: 'Pending', 
            createdAt: Timestamp.now() 
        });

        const adminUsersQuery = firestore.collection('users').where('role', 'in', ['admin', 'owner']);
        const adminSnapshot = await adminUsersQuery.get();

        if (!adminSnapshot.empty) {
            adminSnapshot.forEach(adminDoc => {
                const notificationRef = firestore.collection('notifications').doc();
                batch.set(notificationRef, {
                    recipientId: adminDoc.id,
                    type: 'Special Access Request',
                    subject: `New Request (${newApplicationId}) from ${params.applicantName}`,
                    from: "Platform System",
                    date: Timestamp.now(),
                    status: 'new',
                    relatedId: requestRef.id,
                    actionUrl: `/admin/access-requests`,
                    targetApp: 'admin'
                });
            });
        }

        await batch.commit();

        return { success: true };
    } catch (error: any) {
        console.error("Error creating access request and sending notifications:", error);
        return { success: false, error: "Failed to submit application and notify administrators." };
    }
}

export async function validateContactAction(params: {
    email?: string;
    phone?: string;
    country: string;
}): Promise<{ isValid: boolean; reason?: string; isWarning?: boolean }> {
    console.log("Validating contact:", params);
    
    if (params.email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(params.email)) {
            return { isValid: false, reason: "Please enter a valid email address." };
        }
        
        const officialDomains = ['.gov', '.gov.uk', '.police.uk', '.parliament.uk'];
        if (officialDomains.some(domain => params.email!.endsWith(domain))) {
            return { isValid: true, reason: "Official email address domain verified." };
        }
        
        return { 
            isValid: true, 
            isWarning: true, 
            reason: "This is not an official government email. Manual verification will be required, which may delay your application." 
        };
    }
    
    if (params.phone) {
        // A simple regex for UK numbers: starts with +44 or 0, followed by 10 or 11 digits.
        const ukRegex = /^(?:(?:\+44)|(?:0)) ?[1-9]\d{8,9}$/;
        // US numbers: optional +1, then 10 digits
        const usRegex = /^(?:(?:\+1)?|1\s?)?(?:\(\d{3}\)|\d{3})[\s-]?\d{3}[\s-]?\d{4}$/;
        
        let isValidPhone = false;
        if (params.country === 'United Kingdom') {
            isValidPhone = ukRegex.test(params.phone.replace(/\s/g, ''));
        } else if (params.country === 'United States') {
             isValidPhone = usRegex.test(params.phone.replace(/\D/g, ''));
        } else {
             isValidPhone = params.phone.replace(/\D/g, '').length > 8;
        }

        if (isValidPhone) {
            return { isValid: true, reason: "Phone number format appears valid for the selected country." };
        }
        return { isValid: false, reason: `Phone number does not appear to match the format for your selected country.` };
    }
    
    return { isValid: false, reason: 'No contact information provided.' };
}

export async function validateJustificationAction(params: {
    justificationText: string;
}): Promise<{ isMeaningful: boolean; reason?: string }> {
    console.log("Validating justification text...");
    // Mock AI check. In a real app, you might use a GenAI model to check for spam/gibberish.
    const wordCount = params.justificationText.trim().split(/\s+/).filter(Boolean).length;
    if (wordCount < 100) {
        return { isMeaningful: false, reason: "The justification is too short to be considered meaningful. Please provide at least 100 words." };
    }
     if (wordCount > 500) {
        return { isMeaningful: false, reason: "The justification is too long. Please keep it under 500 words." };
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

    const requestRef = firestore.collection('access_requests').doc(requestId);
    const requestDoc = await requestRef.get();

    if (!requestDoc.exists) {
        throw new Error("Access request not found.");
    }
    const requestData = requestDoc.data()!;
    const requestPermissions = requestData.permissions || {};
    
    const scopesToSave = (requestData.broadcastScopes || []).map((s: any) => ({
        id: s.id || '',
        country: s.country || null,
        state: s.state || null,
        region: s.region || null,
        community: s.community || null,
        targetLevel: s.targetLevel || 'unknown',
    }));

    const userRef = firestore.collection('users').doc(userId);
    
    const userUpdate: { [key: string]: any } = { 
        'permissions.hasBroadcastAccess': true,
        'broadcastDisplayName': requestData.displayName || requestData.applicantName,
        'coverageArea': requestData.coverageArea || null,
        'broadcastScopes': scopesToSave,
    };

    if (requestPermissions.standard) {
        userUpdate['permissions.canSendStandardBroadcast'] = true;
    }
    if (requestPermissions.emergency) {
        userUpdate['permissions.canSendEmergencyBroadcast'] = true;
    }

    batch.update(userRef, userUpdate);

    // Create a notification for the user
    const notificationRef = firestore.collection('notifications').doc();
    batch.set(notificationRef, {
      recipientId: userId,
      type: 'Special Access Request',
      subject: 'Your request for broadcast access was approved!',
      from: 'Platform Administration',
      date: Timestamp.now(),
      status: 'new',
      relatedId: requestId,
      targetApp: 'main'
    });
    
    // Update the request status to Approved
    batch.update(requestRef, { status: 'Approved' });


    await batch.commit();
    return { success: true };
  } catch (error: any) {
    console.error("Error granting special access:", error);
    return { success: false, error: error.message };
  }
}

export async function declineSpecialAccessAction(params: {
  requestId: string;
  reason: string;
}): Promise<ActionResponse> {
  const { requestId, reason } = params;

  try {
    const { firestore } = initializeAdminApp();
    const batch = firestore.batch();

    const requestRef = firestore.collection('access_requests').doc(requestId);
    const requestDoc = await requestRef.get();

    if (!requestDoc.exists) {
        throw new Error("Access request not found.");
    }
    const requestData = requestDoc.data()!;
    const userId = requestData.userId;
    
    // 1. Update the request status to Declined and add the reason
    batch.update(requestRef, { status: 'Declined', declineReason: reason });

    // 2. Create a notification for the user with the reason
    const notificationRef = firestore.collection('notifications').doc();
    batch.set(notificationRef, {
      recipientId: userId,
      type: 'Special Access Request',
      subject: 'Your Broadcast Access Request was declined',
      message: 'Click to see the reason for the decision.',
      details: {
          declineReason: reason
      },
      from: 'Platform Administration',
      date: Timestamp.now(),
      status: 'new',
      relatedId: requestId,
      targetApp: 'main'
    });

    await batch.commit();
    return { success: true };
  } catch (error: any) {
    console.error("Error declining special access request:", error);
    return { success: false, error: error.message };
  }
}

