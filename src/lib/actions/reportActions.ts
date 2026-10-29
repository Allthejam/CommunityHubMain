
'use server';

import { initializeAdminApp } from "@/firebase/admin-app";
import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { uploadImageAction } from "@/lib/actions/storageActions";

type ActionResponse = {
  success: boolean;
  error?: string;
};

export async function updateReportStatusAction(params: {
  reportId: string;
  status: string;
  resolutionNotes?: string;
  resolvedBy?: string;
  acknowledgedBy?: string;
  reportType: 'community' | 'platform';
}): Promise<ActionResponse> {
  const { reportId, status, resolutionNotes, resolvedBy, acknowledgedBy, reportType } = params;

  if (!reportId || !status) {
    return { success: false, error: 'Report ID and status are required.' };
  }

  try {
    const { firestore } = initializeAdminApp();
    const collectionName = reportType === 'community' ? 'community_reports' : 'platform_reports';
    const reportRef = firestore.collection(collectionName).doc(reportId);
    
    const updateData: any = { status, updatedAt: Timestamp.now() };

    if (status === 'In Progress') {
        updateData.acknowledgedAt = Timestamp.now();
        if (acknowledgedBy) {
            updateData.acknowledgedBy = acknowledgedBy;
        }
    }

    if (status === 'Resolved') {
      updateData.resolvedAt = Timestamp.now();
      if (resolutionNotes) {
        updateData.resolutionNotes = resolutionNotes;
      }
      if (resolvedBy) {
        updateData.resolvedBy = resolvedBy;
      }
    }

    await reportRef.update(updateData);
    
    return { success: true };
  } catch (error: any) {
    console.error(`Error updating report ${reportId}:`, error);
    return { success: false, error: error.message || 'Failed to update report status.' };
  }
}

export async function createReportAction(params: {
    userId: string;
    communityId?: string | null;
    subject: string;
    description: string;
    category: string;
    severity?: 'Low' | 'Moderate' | 'Severe';
    reportType: 'community' | 'platform';
    userName: string;
    image?: string | null;
    images?: string[] | null;
    contactPreference?: string;
    contactDetail?: string;
}): Promise<ActionResponse> {
    const { userId, communityId, subject, description, category, severity, reportType, userName, image, images, contactPreference, contactDetail } = params;

    if (!userId || !subject || !description || !category) {
        return { success: false, error: 'Missing required fields.' };
    }

    try {
        const { firestore } = initializeAdminApp();
        const batch = firestore.batch();
        const usersRef = firestore.collection('users');

        const collectionName = reportType === 'community' ? 'community_reports' : 'platform_reports';
        const newReportRef = firestore.collection(collectionName).doc();
        
        // Consolidate images (up to 2 maximum)
        let incomingImages: string[] = [];
        if (Array.isArray(images) && images.length > 0) {
            incomingImages = images.filter(Boolean);
        } else if (image) {
            incomingImages = [image];
        }
        incomingImages = incomingImages.slice(0, 2);

        // Upload any base64 images to Cloud Storage bucket
        const uploadedImageUrls: string[] = [];
        for (let idx = 0; idx < incomingImages.length; idx++) {
            const img = incomingImages[idx];
            if (img.startsWith('data:image/')) {
                try {
                    const storagePath = `reports/${communityId || 'platform'}/${newReportRef.id}/img_${idx}_${Date.now()}.jpg`;
                    const uploadRes = await uploadImageAction({
                        base64Data: img,
                        path: storagePath,
                    });
                    if (uploadRes.success && uploadRes.url) {
                        uploadedImageUrls.push(uploadRes.url);
                    } else {
                        uploadedImageUrls.push(img);
                    }
                } catch (imgErr) {
                    console.error("Failed to upload report image to Cloud Storage:", imgErr);
                    uploadedImageUrls.push(img);
                }
            } else {
                uploadedImageUrls.push(img);
            }
        }
        
        batch.set(newReportRef, {
            communityId: communityId || null,
            subject,
            reporterName: userName,
            createdAt: Timestamp.now(),
            updatedAt: Timestamp.now(),
            status: 'New',
            description,
            category: category.toLowerCase(), // Standardize to lowercase
            severity: severity || 'Moderate',
            reporterId: userId,
            image: uploadedImageUrls[0] || null,
            images: uploadedImageUrls,
            contactPreference,
            contactDetail,
        });

        if (reportType === 'community' && communityId) {
            const allUsersSnapshot = await usersRef.where('memberOf', 'array-contains', communityId).get();
            const recipients = new Map<string, FirebaseFirestore.DocumentData>();

            allUsersSnapshot.docs.forEach(doc => {
                recipients.set(doc.id, doc.data());
            });

            if (recipients.size === 0) {
                console.log(`No members found in community ${communityId} to notify.`);
                await batch.commit();
                return { success: true };
            }

            for (const [recipientId, recipientData] of recipients.entries()) {
                let shouldNotify = false;
                
                const communityRoleData = recipientData.communityRoles?.[communityId];
                const effectiveRole = communityRoleData?.role || (recipientData.homeCommunityId === communityId ? recipientData.role : null);

                if (effectiveRole === 'leader' || effectiveRole === 'president') {
                    shouldNotify = true;
                } else if (effectiveRole === 'police-liaison-officer') {
                    const permissions = communityRoleData?.permissions || recipientData.permissions || {};
                    const viewableCategories = permissions.viewableReportCategories || [];
                    const canView = permissions.canViewAllCommunityReports ||
                                    (Array.isArray(viewableCategories) && viewableCategories.some((c: string) => c.toLowerCase() === category.toLowerCase())) ||
                                    category.toLowerCase() === 'report a crime';
                    if (canView) {
                        shouldNotify = true;
                    }
                }
                
                if (shouldNotify) {
                    const notificationRef = firestore.collection('notifications').doc();
                    batch.set(notificationRef, {
                        recipientId: recipientId,
                        communityId: communityId,
                        type: 'New Report',
                        subject: `New Report: ${subject}`,
                        from: userName,
                        date: Timestamp.now(),
                        status: 'new',
                        relatedId: newReportRef.id,
                        targetApp: 'main'
                    });
                }
            }
        }
        
        await batch.commit();
        
        return { success: true };
    } catch (error: any) {
        console.error("Error creating report:", error);
        return { success: false, error: 'Failed to submit your report.' };
    }
}
