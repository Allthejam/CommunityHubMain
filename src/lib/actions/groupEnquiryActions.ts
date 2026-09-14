'use server';

import { initializeAdminApp } from '@/firebase/admin-app';
import { Timestamp } from 'firebase-admin/firestore';

export type GroupEnquiry = {
  id: string;
  groupId: string;
  groupName: string;
  senderName: string;
  senderEmail: string;
  senderPhone?: string;
  subject: string;
  message: string;
  createdAt: any;
  status: 'new' | 'read' | 'replied' | 'archived';
  repliedAt?: any;
};

type ActionResponse<T = any> = {
  success: boolean;
  data?: T;
  error?: string;
};

export async function sendGroupEnquiryAction(params: {
  groupId: string;
  groupName: string;
  senderName: string;
  senderEmail: string;
  senderPhone?: string;
  subject: string;
  message: string;
}): Promise<ActionResponse<{ enquiryId: string }>> {
  const { groupId, groupName, senderName, senderEmail, senderPhone, subject, message } = params;

  if (!groupId || !senderName?.trim() || !senderEmail?.trim() || !subject?.trim() || !message?.trim()) {
    return { success: false, error: 'Please fill in all required fields (Name, Email, Subject, and Message).' };
  }

  // Basic email validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(senderEmail.trim())) {
    return { success: false, error: 'Please provide a valid email address.' };
  }

  try {
    const { firestore } = initializeAdminApp();
    const now = Timestamp.now();

    const enquiryData = {
      groupId,
      groupName: groupName || 'Enterprise Group',
      senderName: senderName.trim(),
      senderEmail: senderEmail.trim().toLowerCase(),
      senderPhone: senderPhone?.trim() || '',
      subject: subject.trim(),
      message: message.trim(),
      createdAt: now,
      status: 'new' as const,
    };

    // Store in the group's subcollection
    const groupEnquiryRef = await firestore
      .collection('businesses')
      .doc(groupId)
      .collection('enquiries')
      .add(enquiryData);

    // Also notify group owner and team members if applicable
    const groupDoc = await firestore.collection('businesses').doc(groupId).get();
    if (groupDoc.exists) {
      const groupData = groupDoc.data();
      const recipients = new Set<string>();
      if (groupData?.ownerId) recipients.add(groupData.ownerId);
      if (Array.isArray(groupData?.teamMemberIds)) {
        groupData.teamMemberIds.forEach((id: string) => recipients.add(id));
      }

      for (const recipientId of Array.from(recipients)) {
        await firestore.collection('notifications').add({
          recipientId,
          type: 'Group Enquiry',
          subject: `New enquiry for ${groupData?.businessName || groupName}: "${subject.trim()}"`,
          from: senderName.trim(),
          date: now.toDate().toISOString(),
          status: 'new',
          relatedId: groupId,
          enquiryId: groupEnquiryRef.id,
          targetApp: 'enterprise'
        });
      }
    }

    return { success: true, data: { enquiryId: groupEnquiryRef.id } };
  } catch (error: any) {
    console.error('Error submitting group enquiry:', error);
    return { success: false, error: error.message || 'Failed to submit enquiry. Please try again later.' };
  }
}

export async function updateGroupEnquiryStatusAction(params: {
  groupId: string;
  enquiryId: string;
  status: 'new' | 'read' | 'replied' | 'archived';
}): Promise<ActionResponse> {
  const { groupId, enquiryId, status } = params;
  if (!groupId || !enquiryId || !status) {
    return { success: false, error: 'Missing required parameters.' };
  }

  try {
    const { firestore } = initializeAdminApp();
    const updatePayload: Record<string, any> = {
      status,
      updatedAt: Timestamp.now(),
    };

    if (status === 'replied') {
      updatePayload.repliedAt = Timestamp.now();
    }

    await firestore
      .collection('businesses')
      .doc(groupId)
      .collection('enquiries')
      .doc(enquiryId)
      .update(updatePayload);

    return { success: true };
  } catch (error: any) {
    console.error('Error updating group enquiry status:', error);
    return { success: false, error: error.message || 'Failed to update enquiry status.' };
  }
}

export async function deleteGroupEnquiryAction(params: {
  groupId: string;
  enquiryId: string;
}): Promise<ActionResponse> {
  const { groupId, enquiryId } = params;
  if (!groupId || !enquiryId) {
    return { success: false, error: 'Missing required parameters.' };
  }

  try {
    const { firestore } = initializeAdminApp();
    await firestore
      .collection('businesses')
      .doc(groupId)
      .collection('enquiries')
      .doc(enquiryId)
      .delete();

    return { success: true };
  } catch (error: any) {
    console.error('Error deleting group enquiry:', error);
    return { success: false, error: error.message || 'Failed to delete enquiry.' };
  }
}
