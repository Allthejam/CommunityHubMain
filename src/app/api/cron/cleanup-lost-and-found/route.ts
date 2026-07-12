
import { initializeAdminApp } from "@/firebase/admin-app";
import { Timestamp } from "firebase-admin/firestore";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  try {
    const { firestore } = initializeAdminApp();
    console.log("Running scheduled job: cleanup-lost-and-found...");

    const now = new Date();
    const twentyEightDaysAgo = new Date(now);
    twentyEightDaysAgo.setDate(twentyEightDaysAgo.getDate() - 28);

    const cutoffTimestamp = Timestamp.fromDate(twentyEightDaysAgo);

    // Query for lost-and-found items with a 'date' field older than 28 days
    const lostAndFoundRef = firestore.collection("lostAndFound");
    const expiredItemsQuery = lostAndFoundRef
      .where("date", "<=", cutoffTimestamp);

    const snapshot = await expiredItemsQuery.get();

    if (snapshot.empty) {
      console.log("No lost-and-found items older than 28 days found.");
      return NextResponse.json({ success: true, message: "No expired lost-and-found items to clean up." });
    }

    // Firestore batches are limited to 500 operations
    const batchSize = 500;
    let deletedCount = 0;

    for (let i = 0; i < snapshot.docs.length; i += batchSize) {
      const batch = firestore.batch();
      const chunk = snapshot.docs.slice(i, i + batchSize);

      for (const doc of chunk) {
        console.log(`Deleting expired lost-and-found item: ${doc.id} (date: ${doc.data().date?.toDate?.()?.toISOString?.() || 'unknown'})`);
        batch.delete(doc.ref);
        deletedCount++;
      }

      await batch.commit();
    }

    const message = `Successfully deleted ${deletedCount} expired lost-and-found items (older than 28 days).`;
    console.log(message);
    return NextResponse.json({ success: true, message });

  } catch (error: any) {
    console.error("Error in scheduled job cleanup-lost-and-found:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
