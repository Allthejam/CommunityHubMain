'use server';

import { initializeAdminApp } from "@/firebase/admin-app";
import { Timestamp } from "firebase-admin/firestore";
import { addDays } from "date-fns";
import { uploadImageAction } from './storageActions';

type ActionResponse = {
    success: boolean;
    error?: string;
}

type JobVacancyParams = {
    title: string;
    company: string;
    companyLogo: string | null;
    businessId: string | null;
    jobType: string;
    salary: string;
    shortDescription: string;
    fullDescription: string;
    website: string;
    applicationEmail: string;
    applicationPhone: string;
    indeedApplyUrl: string;
    linkedinApplyUrl: string;
    communityId: string;
    ownerId: string;
};

export async function getJobsAction(communityId: string): Promise<{ success: boolean; data?: any[]; error?: string }> {
    if (!communityId) return { success: false, error: 'Community ID required' };
    try {
        const isDemo = communityId === '9ayHMyZf4SRw2gof1AM9' || communityId === 'c_showhome';
        const { firestore } = initializeAdminApp(isDemo ? 'comfeed' : undefined);
        const snapshot = await firestore.collection('jobs').where('communityId', '==', communityId).get();
        const data = snapshot.docs.map(doc => {
            const d = doc.data();
            return {
                id: doc.id,
                ...d,
                createdAt: d.createdAt?.toDate ? d.createdAt.toDate().toISOString() : d.createdAt,
                expiresAt: d.expiresAt?.toDate ? d.expiresAt.toDate().toISOString() : d.expiresAt,
            };
        });
        return { success: true, data };
    } catch (error: any) {
        console.error("Error fetching jobs:", error);
        return { success: false, error: error.message };
    }
}

export async function getJobVacancyAction(jobId: string, communityId?: string): Promise<{ success: boolean; data?: any; error?: string }> {
    try {
        const isDemo = communityId === '9ayHMyZf4SRw2gof1AM9' || communityId === 'c_showhome';
        const { firestore } = initializeAdminApp(isDemo ? 'comfeed' : undefined);
        const doc = await firestore.collection('jobs').doc(jobId).get();
        if (!doc.exists) {
            if (!isDemo) {
                const { firestore: comfeedDb } = initializeAdminApp('comfeed');
                const comDoc = await comfeedDb.collection('jobs').doc(jobId).get();
                if (comDoc.exists) {
                    const d = comDoc.data()!;
                    return {
                        success: true,
                        data: {
                            id: comDoc.id,
                            ...d,
                            createdAt: d.createdAt?.toDate ? d.createdAt.toDate().toISOString() : d.createdAt,
                            expiresAt: d.expiresAt?.toDate ? d.expiresAt.toDate().toISOString() : d.expiresAt,
                        }
                    };
                }
            }
            return { success: false, error: 'Job not found' };
        }
        const d = doc.data()!;
        return {
            success: true,
            data: {
                id: doc.id,
                ...d,
                createdAt: d.createdAt?.toDate ? d.createdAt.toDate().toISOString() : d.createdAt,
                expiresAt: d.expiresAt?.toDate ? d.expiresAt.toDate().toISOString() : d.expiresAt,
            }
        };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

export async function getJobSeekersAction(communityId: string): Promise<{ success: boolean; data?: any[]; error?: string }> {
    if (!communityId) return { success: false, error: 'Community ID required' };
    try {
        const isDemo = communityId === '9ayHMyZf4SRw2gof1AM9' || communityId === 'c_showhome';
        const { firestore } = initializeAdminApp(isDemo ? 'comfeed' : undefined);
        const snapshot = await firestore.collection('jobSeekers').where('communityId', '==', communityId).get();
        const data = snapshot.docs.map(doc => {
            const d = doc.data();
            return {
                id: doc.id,
                ...d,
                createdAt: d.createdAt?.toDate ? d.createdAt.toDate().toISOString() : d.createdAt,
                expiresAt: d.expiresAt?.toDate ? d.expiresAt.toDate().toISOString() : d.expiresAt,
                availableFrom: d.availableFrom?.toDate ? d.availableFrom.toDate().toISOString() : d.availableFrom,
            };
        });
        return { success: true, data };
    } catch (error: any) {
        console.error("Error fetching job seekers:", error);
        return { success: false, error: error.message };
    }
}

export async function getJobSeekerAction(seekerId: string, communityId?: string): Promise<{ success: boolean; data?: any; error?: string }> {
    try {
        const isDemo = communityId === '9ayHMyZf4SRw2gof1AM9' || communityId === 'c_showhome';
        const { firestore } = initializeAdminApp(isDemo ? 'comfeed' : undefined);
        const doc = await firestore.collection('jobSeekers').doc(seekerId).get();
        if (!doc.exists) {
            if (!isDemo) {
                const { firestore: comfeedDb } = initializeAdminApp('comfeed');
                const comDoc = await comfeedDb.collection('jobSeekers').doc(seekerId).get();
                if (comDoc.exists) {
                    const d = comDoc.data()!;
                    return {
                        success: true,
                        data: {
                            id: comDoc.id,
                            ...d,
                            createdAt: d.createdAt?.toDate ? d.createdAt.toDate().toISOString() : d.createdAt,
                            expiresAt: d.expiresAt?.toDate ? d.expiresAt.toDate().toISOString() : d.expiresAt,
                            availableFrom: d.availableFrom?.toDate ? d.availableFrom.toDate().toISOString() : d.availableFrom,
                        }
                    };
                }
            }
            return { success: false, error: 'Job seeker not found' };
        }
        const d = doc.data()!;
        return {
            success: true,
            data: {
                id: doc.id,
                ...d,
                createdAt: d.createdAt?.toDate ? d.createdAt.toDate().toISOString() : d.createdAt,
                expiresAt: d.expiresAt?.toDate ? d.expiresAt.toDate().toISOString() : d.expiresAt,
                availableFrom: d.availableFrom?.toDate ? d.availableFrom.toDate().toISOString() : d.availableFrom,
            }
        };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

export async function postJobVacancyAction(params: JobVacancyParams): Promise<ActionResponse> {
    try {
        const isDemo = params.communityId === '9ayHMyZf4SRw2gof1AM9' || params.communityId === 'c_showhome';
        const { firestore } = initializeAdminApp(isDemo ? 'comfeed' : undefined);
        const now = new Date();
        const expiresAt = addDays(now, 28);
        
        let logoUrl = params.companyLogo;
        
        if (logoUrl && logoUrl.startsWith('data:image')) {
            try {
                const path = `job_logos/${params.ownerId || 'demo'}/${Date.now()}`;
                const uploadResult = await uploadImageAction({ base64Data: logoUrl, path });
                if (uploadResult.success && uploadResult.url) {
                    logoUrl = uploadResult.url;
                }
            } catch (e) {
                console.error("Logo upload fallback:", e);
            }
        }

        await firestore.collection('jobs').add({
            ...params,
            ownerId: params.ownerId || (isDemo ? 'demo-personal' : ''),
            companyLogo: logoUrl,
            createdAt: Timestamp.fromDate(now),
            expiresAt: Timestamp.fromDate(expiresAt),
        });
        return { success: true };
    } catch (error: any) {
        console.error("Error posting job vacancy:", error);
        return { success: false, error: error.message };
    }
}

export async function updateJobVacancyAction(jobId: string, params: Partial<JobVacancyParams>): Promise<ActionResponse> {
    try {
        const isDemo = params.communityId === '9ayHMyZf4SRw2gof1AM9' || params.communityId === 'c_showhome';
        const { firestore } = initializeAdminApp(isDemo ? 'comfeed' : undefined);
        const jobRef = firestore.collection('jobs').doc(jobId);
        
        let logoUrl = params.companyLogo;
        if (logoUrl && logoUrl.startsWith('data:image')) {
            try {
                const path = `job_logos/${params.ownerId || 'updated'}/${Date.now()}`;
                const uploadResult = await uploadImageAction({ base64Data: logoUrl, path });
                if (uploadResult.success && uploadResult.url) {
                    logoUrl = uploadResult.url;
                }
            } catch (e) {
                console.error("Logo upload fallback:", e);
            }
        }

        await jobRef.update({
            ...params,
            ...(logoUrl && { companyLogo: logoUrl }),
            updatedAt: Timestamp.now(),
        });
        return { success: true };
    } catch (error: any) {
        console.error("Error updating job vacancy:", error);
        return { success: false, error: error.message };
    }
}

export async function deleteJobVacancyAction(jobId: string, communityId?: string): Promise<ActionResponse> {
    try {
        const isDemo = communityId === '9ayHMyZf4SRw2gof1AM9' || communityId === 'c_showhome';
        const { firestore } = initializeAdminApp(isDemo ? 'comfeed' : undefined);
        await firestore.collection('jobs').doc(jobId).delete();
        return { success: true };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

type JobSeekerParams = {
    name: string;
    summary: string;
    profile: string;
    availableFrom?: Date;
    linkedin: string;
    portfolio: string;
    email: string;
    phone: string;
    communityId: string;
    ownerId: string;
};

export async function postJobSeekerProfileAction(params: JobSeekerParams): Promise<ActionResponse> {
    try {
        const isDemo = params.communityId === '9ayHMyZf4SRw2gof1AM9' || params.communityId === 'c_showhome';
        const { firestore } = initializeAdminApp(isDemo ? 'comfeed' : undefined);
        const now = new Date();
        const expiresAt = addDays(now, 28);

        const payload: any = { 
            ...params,
            ownerId: params.ownerId || (isDemo ? 'demo-personal' : ''),
            createdAt: Timestamp.fromDate(now),
            expiresAt: Timestamp.fromDate(expiresAt),
        };
        if (params.availableFrom) {
            payload.availableFrom = Timestamp.fromDate(new Date(params.availableFrom));
        }
        await firestore.collection('jobSeekers').add(payload);
        return { success: true };
    } catch (error: any) {
        console.error("Error posting job seeker profile:", error);
        return { success: false, error: error.message };
    }
}

export async function updateJobSeekerProfileAction(seekerId: string, params: Partial<JobSeekerParams>): Promise<ActionResponse> {
    try {
        const isDemo = params.communityId === '9ayHMyZf4SRw2gof1AM9' || params.communityId === 'c_showhome';
        const { firestore } = initializeAdminApp(isDemo ? 'comfeed' : undefined);
        const payload: any = { ...params, updatedAt: Timestamp.now() };
        if (params.availableFrom) {
            payload.availableFrom = Timestamp.fromDate(new Date(params.availableFrom));
        }
        await firestore.collection('jobSeekers').doc(seekerId).update(payload);
        return { success: true };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

export async function deleteJobSeekerProfileAction(seekerId: string, communityId?: string): Promise<ActionResponse> {
    try {
        const isDemo = communityId === '9ayHMyZf4SRw2gof1AM9' || communityId === 'c_showhome';
        const { firestore } = initializeAdminApp(isDemo ? 'comfeed' : undefined);
        await firestore.collection('jobSeekers').doc(seekerId).delete();
        return { success: true };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}
