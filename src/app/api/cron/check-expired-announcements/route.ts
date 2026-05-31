
import { initializeAdminApp } from "@/firebase/admin-app";
import { Timestamp, FieldValue } from "firebase-admin/firestore";
import { NextResponse } from "next/server";
import { addDays, isBefore } from "date-fns";

export async function GET(request: Request) {
  try {
    const { firestore } = initializeAdminApp();
    console.log("Running scheduled job: check-expired-announcements...");

    const now = new Date();
    const fourteenDaysAgo = addDays(now, -14);
    
    const announcementsRef = firestore.collection("announcements");
    // Query for live announcements created more than 14 days ago that do NOT have a specified end date.
    const expiredAnnouncementsQuery = announcementsRef
      .where("status", "==", "Live")
      .where("endDate", "==", null)
      .where("createdAt", "<=", Timestamp.fromDate(fourteenDaysAgo));

    const snapshot = await expiredAnnouncementsQuery.get();

    if (snapshot.empty) {
      console.log("No date-less live announcements older than 14 days found.");
      return NextResponse.json({ success: true, message: "No expired announcements to process." });
    }

    const batch = firestore.batch();
    let processedCount = 0;

    for (const doc of snapshot.docs) {
        console.log(`Archiving announcement: ${doc.id}`);
        const announcementRef = doc.ref;
        batch.update(announcementRef, {
            status: "Archived",
            history: FieldValue.arrayUnion({
                status: "Archived",
                timestamp: Timestamp.now(),
                actorId: "system-auto-archive",
            }),
        });
        processedCount++;
    }

    await batch.commit();

    const message = `Successfully auto-archived ${processedCount} expired announcements.`;
    console.log(message);
    return NextResponse.json({ success: true, message });

  } catch (error: any) {
    console.error("Error in scheduled job check-expired-announcements:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
