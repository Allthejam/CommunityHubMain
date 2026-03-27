
'use server';

import { initializeAdminApp } from "@/firebase/admin-app";
import { FieldValue, Timestamp } from "firebase-admin/firestore";

type ActionResponse = {
  success: boolean;
  error?: string;
};

const initialRoadmapData = [
    { accountType: "Personal Account", icon: 'User', status: 'Live', improvements: ['Community forum access', 'Direct messaging with members'], order: 0 },
    { accountType: "Business Account", icon: 'Building2', status: 'Live', improvements: ['Profile page customization', 'Storefront for product sales'], order: 1 },
    { accountType: "Community Leader", icon: 'Crown', status: 'Live', improvements: ['Member management tools', 'Content moderation queue'], order: 2 },
    { accountType: "Enterprise Account", icon: 'HeartHandshake', status: 'In Development', improvements: ['Multi-community management', 'Centralized billing'], order: 3 },
    { accountType: "National Advertiser", icon: 'Globe', status: 'Live', improvements: ['Platform-wide ad campaigns', 'Performance analytics'], order: 4 },
];


export async function seedInitialRoadmapData(): Promise<ActionResponse> {
    try {
        const { firestore } = initializeAdminApp();
        const batch = firestore.batch();
        const roadmapCollection = firestore.collection('roadmap');

        initialRoadmapData.forEach(item => {
            const docRef = roadmapCollection.doc(); // Auto-generate ID
            batch.set(docRef, item);
        });

        await batch.commit();
        return { success: true };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}


export async function addRoadmapImprovement(params: {
  roadmapItemId: string;
  improvementText: string;
}): Promise<ActionResponse> {
  const { roadmapItemId, improvementText } = params;
  if (!roadmapItemId || !improvementText) {
    return { success: false, error: "Roadmap item ID and improvement text are required." };
  }
  try {
    const { firestore } = initializeAdminApp();
    const itemRef = firestore.collection("roadmap").doc(roadmapItemId);
    await itemRef.update({
      improvements: FieldValue.arrayUnion(improvementText),
    });
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function removeRoadmapImprovement(params: {
    roadmapItemId: string;
    improvementText: string;
}): Promise<ActionResponse> {
    const { roadmapItemId, improvementText } = params;
    if (!roadmapItemId || !improvementText) {
        return { success: false, error: "Roadmap item ID and improvement text are required." };
    }
    try {
        const { firestore } = initializeAdminApp();
        const itemRef = firestore.collection("roadmap").doc(roadmapItemId);
        await itemRef.update({
            improvements: FieldValue.arrayRemove(improvementText),
        });
        return { success: true };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

export async function addRoadmapItem(params: {
    accountType: string;
    status: string;
    order: number;
}): Promise<ActionResponse> {
    const { accountType, status, order } = params;
    if (!accountType || !status) {
        return { success: false, error: "Account type and status are required." };
    }
    try {
        const { firestore } = initializeAdminApp();
        await firestore.collection("roadmap").add({
            accountType,
            status,
            order,
            icon: 'Briefcase', // Default icon
            improvements: [],
        });
        return { success: true };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

export async function deleteRoadmapItem(itemId: string): Promise<ActionResponse> {
    if (!itemId) {
        return { success: false, error: "Item ID is required." };
    }
    try {
        const { firestore } = initializeAdminApp();
        await firestore.collection("roadmap").doc(itemId).delete();
        return { success: true };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}
