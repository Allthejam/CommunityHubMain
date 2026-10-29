import { initializeAdminApp } from "@/firebase/admin-app";
import { Timestamp } from "firebase-admin/firestore";
import { getStorage } from "firebase-admin/storage";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  try {
    const { firestore, adminApp } = initializeAdminApp();
    const bucket = getStorage(adminApp).bucket(process.env.GCLOUD_STORAGE_BUCKET);
    console.log("Running scheduled job: cleanup-expired-reports...");

    const now = new Date();

    // 1. Unopened / New reports cutoff: 6 months (180 days)
    const sixMonthsAgo = new Date(now);
    sixMonthsAgo.setDate(sixMonthsAgo.getDate() - 180);
    const sixMonthsTimestamp = Timestamp.fromDate(sixMonthsAgo);

    // 2. Opened / In Progress / Resolved cutoff: 3 months (90 days)
    const threeMonthsAgo = new Date(now);
    threeMonthsAgo.setDate(threeMonthsAgo.getDate() - 90);
    const threeMonthsTimestamp = Timestamp.fromDate(threeMonthsAgo);

    // 3. Warning threshold for 28 days before expiry
    // 6 months - 28 days = 152 days
    const warnSixMonths = new Date(now);
    warnSixMonths.setDate(warnSixMonths.getDate() - 152);
    // 3 months - 28 days = 62 days
    const warnThreeMonths = new Date(now);
    warnThreeMonths.setDate(warnThreeMonths.getDate() - 62);

    const collections = ["community_reports", "platform_reports"];
    let deletedReportsCount = 0;
    let deletedImagesCount = 0;
    let warningsDispatchedCount = 0;

    for (const collName of collections) {
      const snap = await firestore.collection(collName).get();
      if (snap.empty) continue;

      for (const reportDoc of snap.docs) {
        const data = reportDoc.data();
        const status = data.status || "New";
        const isUnread = status === "New";
        const createdAt = data.createdAt?.toDate ? data.createdAt.toDate() : (data.createdAt ? new Date(data.createdAt) : null);
        const acknowledgedAt = data.acknowledgedAt?.toDate ? data.acknowledgedAt.toDate() : (data.acknowledgedAt ? new Date(data.acknowledgedAt) : null);
        const resolvedAt = data.resolvedAt?.toDate ? data.resolvedAt.toDate() : (data.resolvedAt ? new Date(data.resolvedAt) : null);

        // Date used for opened calculation: latest of acknowledgedAt, resolvedAt, or createdAt
        const activeDate = resolvedAt || acknowledgedAt || createdAt;
        if (!createdAt) continue;

        let shouldDelete = false;
        let shouldWarn = false;
        let daysRemaining = 0;

        if (isUnread) {
          // 6 months rule
          if (createdAt <= sixMonthsAgo) {
            shouldDelete = true;
          } else if (createdAt <= warnSixMonths && !data.expiryWarningSent) {
            shouldWarn = true;
            const expiryDate = new Date(createdAt);
            expiryDate.setDate(expiryDate.getDate() + 180);
            daysRemaining = Math.max(1, Math.round((expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));
          }
        } else {
          // 3 months rule from active date
          const dateToTest = activeDate || createdAt;
          if (dateToTest <= threeMonthsAgo) {
            shouldDelete = true;
          } else if (dateToTest <= warnThreeMonths && !data.expiryWarningSent) {
            shouldWarn = true;
            const expiryDate = new Date(dateToTest);
            expiryDate.setDate(expiryDate.getDate() + 90);
            daysRemaining = Math.max(1, Math.round((expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));
          }
        }

        // Action A: Delete report and clean storage images
        if (shouldDelete) {
          console.log(`[Report Cleanup] Permanently deleting expired report ${reportDoc.id} in ${collName}`);
          
          // Collect images to purge from Cloud Storage
          const imagesToPurge: string[] = [];
          if (Array.isArray(data.images)) {
            imagesToPurge.push(...data.images);
          } else if (data.image) {
            imagesToPurge.push(data.image);
          }

          for (const imgUrl of imagesToPurge) {
            if (typeof imgUrl === "string" && imgUrl.includes("storage.googleapis.com")) {
              try {
                // Extract relative object path from public storage URL
                const match = imgUrl.match(/storage\.googleapis\.com\/[^/]+\/(.+)$/);
                if (match && match[1]) {
                  const objectPath = decodeURIComponent(match[1]);
                  const file = bucket.file(objectPath);
                  const [exists] = await file.exists();
                  if (exists) {
                    await file.delete();
                    deletedImagesCount++;
                  }
                }
              } catch (fileErr) {
                console.warn(`[Report Cleanup] Cloud Storage file delete warning for ${imgUrl}:`, fileErr);
              }
            }
          }

          await reportDoc.ref.delete();
          deletedReportsCount++;
        }

        // Action B: Send 4-week advance warning notification to leaders/admins
        else if (shouldWarn) {
          console.log(`[Report Cleanup] Sending 28-day deletion warning for report ${reportDoc.id}`);
          const communityId = data.communityId;

          // Dispatch notification to Leader or Admin
          if (collName === "community_reports" && communityId) {
            const usersRef = firestore.collection("users");
            const roleQuery = usersRef
              .where(`communityRoles.${communityId}.role`, "in", ["leader", "president", "police-liaison-officer"])
              .limit(5);
            let leaderSnap = await roleQuery.get();
            if (leaderSnap.empty) {
              leaderSnap = await usersRef
                .where("homeCommunityId", "==", communityId)
                .where("role", "in", ["leader", "president", "police-liaison-officer"])
                .limit(5)
                .get();
            }

            for (const leaderDoc of leaderSnap.docs) {
              const notifRef = firestore.collection("notifications").doc();
              await notifRef.set({
                recipientId: leaderDoc.id,
                communityId,
                type: "Report Cleanup Warning",
                subject: `⚠️ Action Required: Report "${data.subject}" will be permanently deleted in ${daysRemaining} days`,
                from: "System Housekeeping",
                date: Timestamp.now(),
                status: "new",
                relatedId: reportDoc.id,
                targetApp: "main",
              });
            }
          } else {
            // Platform report: notify platform admins
            const adminSnap = await firestore.collection("users")
              .where("role", "in", ["admin", "owner", "administrator", "superadmin"])
              .limit(5)
              .get();
            for (const adminDoc of adminSnap.docs) {
              const notifRef = firestore.collection("notifications").doc();
              await notifRef.set({
                recipientId: adminDoc.id,
                type: "Platform Report Cleanup",
                subject: `⚠️ Platform Report "${data.subject}" will be permanently deleted in ${daysRemaining} days`,
                from: "System Housekeeping",
                date: Timestamp.now(),
                status: "new",
                relatedId: reportDoc.id,
                targetApp: "main",
              });
            }
          }

          await reportDoc.ref.update({
            expiryWarningSent: true,
            expiryWarningSentAt: Timestamp.now(),
          });
          warningsDispatchedCount++;
        }
      }
    }

    const message = `Cleanup completed: ${deletedReportsCount} reports permanently deleted, ${deletedImagesCount} storage files purged, ${warningsDispatchedCount} advance warning notifications dispatched.`;
    console.log(message);
    return NextResponse.json({ success: true, message, deletedReportsCount, deletedImagesCount, warningsDispatchedCount });
  } catch (error: any) {
    console.error("Error running cleanup-expired-reports:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
