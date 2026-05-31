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

export async function postJobVacancyAction(params: JobVacancyParams): Promise<ActionResponse> {
    try {
        const { firestore } = initializeAdminApp();
        const now = new Date();
        const expiresAt = addDays(now, 28);
        
        let logoUrl = params.companyLogo;
        
        if (logoUrl && logoUrl.startsWith('data:image')) {
            const path = `job_logos/${params.ownerId}/${Date.now()}`;
            const uploadResult = await uploadImageAction({ base64Data: logoUrl, path });
            if (uploadResult.success && uploadResult.url) {
                logoUrl = uploadResult.url;
            }
        }

        await firestore.collection('jobs').add({
            ...params,
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
        const { firestore } = initializeAdminApp();
        const jobRef = firestore.collection('jobs').doc(jobId);
        
        let logoUrl = params.companyLogo;
        if (logoUrl && logoUrl.startsWith('data:image')) {
            const path = `job_logos/${params.ownerId || 'updated'}/${Date.now()}`;
            const uploadResult = await uploadImageAction({ base64Data: logoUrl, path });
            if (uploadResult.success && uploadResult.url) {
                logoUrl = uploadResult.url;
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

export async function deleteJobVacancyAction(jobId: string): Promise<ActionResponse> {
    try {
        const { firestore } = initializeAdminApp();
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
        const { firestore } = initializeAdminApp();
        const now = new Date();
        const expiresAt = addDays(now, 28);

        const payload: any = { 
            ...params,
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
        const { firestore } = initializeAdminApp();
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

export async function deleteJobSeekerProfileAction(seekerId: string): Promise<ActionResponse> {
    try {
        const { firestore } = initializeAdminApp();
        await firestore.collection('jobSeekers').doc(seekerId).delete();
        return { success: true };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}
