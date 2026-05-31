
'use server';

import { initializeAdminApp } from "@/firebase/admin-app";
import { FieldValue, Timestamp } from "firebase-admin/firestore";

type ActionResponse = {
  success: boolean;
  error?: string;
};

export async function createPollAction(params: {
  communityId: string;
  question: string;
  options: string[];
  endDate: Date;
}): Promise<ActionResponse> {
  const { communityId, question, options, endDate } = params;

  if (!communityId || !question || options.length < 2) {
    return { success: false, error: "Missing required fields for poll creation." };
  }

  try {
    const { firestore } = initializeAdminApp();
    const pollRef = firestore.collection(`communities/${communityId}/polls`).doc();
    
    const pollOptions = options.map(optionText => ({
        text: optionText,
        votes: 0
    }));

    await pollRef.set({
      question,
      options: pollOptions,
      status: 'active',
      totalVotes: 0,
      createdAt: Timestamp.now(),
      endDate: Timestamp.fromDate(endDate),
      communityId,
      votedBy: [],
    });

    return { success: true };
  } catch (error: any) {
    console.error("Error creating poll:", error);
    return { success: false, error: error.message || "Failed to create poll." };
  }
}

export async function updatePollStatusAction(params: {
    communityId: string;
    pollId: string;
    status: 'closed' | 'archived';
}): Promise<ActionResponse> {
    const { communityId, pollId, status } = params;

    if (!communityId || !pollId || !status) {
        return { success: false, error: "Missing required fields." };
    }

    try {
        const { firestore } = initializeAdminApp();
        const pollRef = firestore.doc(`communities/${communityId}/polls/${pollId}`);
        await pollRef.update({ status });
        return { success: true };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

export async function deletePollAction(params: {
    communityId: string;
    pollId: string;
}): Promise<ActionResponse> {
    const { communityId, pollId } = params;
    if (!communityId || !pollId) {
        return { success: false, error: "Missing required fields." };
    }
    try {
        const { firestore } = initializeAdminApp();
        await firestore.doc(`communities/${communityId}/polls/${pollId}`).delete();
        return { success: true };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

export async function voteOnPollAction(params: {
  communityId: string;
  pollId: string;
  userId: string;
  optionIndex: number;
}): Promise<ActionResponse> {
  const { communityId, pollId, userId, optionIndex } = params;

  if (!communityId || !pollId || !userId || optionIndex === undefined) {
    return { success: false, error: "Missing required information to vote." };
  }

  try {
    const { firestore } = initializeAdminApp();
    const pollRef = firestore.collection(`communities/${communityId}/polls`).doc(pollId);

    await firestore.runTransaction(async (transaction) => {
      const pollDoc = await transaction.get(pollRef);
      if (!pollDoc.exists) {
        throw new Error("Poll not found.");
      }

      const pollData = pollDoc.data()!;
      if (pollData.votedBy?.includes(userId)) {
        throw new Error("You have already voted on this poll.");
      }

      if (optionIndex < 0 || optionIndex >= pollData.options.length) {
          throw new Error("Invalid option selected.");
      }

      // Prepare the update for the specific option
      const newOptions = [...pollData.options];
      newOptions[optionIndex].votes = (newOptions[optionIndex].votes || 0) + 1;

      transaction.update(pollRef, {
        totalVotes: FieldValue.increment(1),
        votedBy: FieldValue.arrayUnion(userId),
        options: newOptions
      });
    });

    return { success: true };
  } catch (error: any) {
    console.error("Error voting on poll:", error);
    return { success: false, error: error.message };
  }
}
