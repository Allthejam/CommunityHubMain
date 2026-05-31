
import { initializeAdminApp } from "@/firebase/admin-app";
import { Timestamp } from "firebase-admin/firestore";
import { NextResponse } from "next/server";

// This endpoint is designed to be called by a scheduler (e.g., Cloud Scheduler).
// It should be protected to prevent public access, for example, by checking
// for a specific header that the scheduler sends. For this implementation,
// we'll assume such protection is configured at the hosting level.

export async function GET(request: Request) {
  try {
    const { firestore } = initializeAdminApp();
    console.log("Running scheduled job: check-free-listings...");

    const now = Timestamp.now();
    const businessesRef = firestore.collection("businesses");
    const expiredListingsQuery = businessesRef
      .where("isFreeListing", "==", true)
      .where("freeListingExpiresAt", "<=", now);

    const snapshot = await expiredListingsQuery.get();

    if (snapshot.empty) {
      console.log("No expired free listings found.");
      return NextResponse.json({ success: true, message: "No expired listings found." });
    }

    const batch = firestore.batch();
    let processedCount = 0;

    for (const doc of snapshot.docs) {
      const business = doc.data();
      console.log(`Processing expired listing for business: ${business.businessName} (${doc.id})`);

      // 1. Update the business status
      const businessRef = doc.ref;
      batch.update(businessRef, {
        status: "Pending Approval",
        isFreeListing: false,
        freeListingExpiresAt: null,
        storefrontSubscription: false, // Also disable the storefront
      });

      // 2. Notify the business owner
      if (business.ownerId) {
        const ownerNotificationRef = firestore.collection("notifications").doc();
        batch.set(ownerNotificationRef, {
          recipientId: business.ownerId,
          type: "Business Submission",
          subject: `Your free listing for "${business.businessName}" has expired`,
          from: "Platform Billing",
          date: Timestamp.now().toDate().toISOString(),
          status: 'new',
          relatedId: doc.id,
        });
      }

      // 3. Notify the community leader
      if (business.primaryCommunityId) {
        const usersRef = firestore.collection('users');
        const roleQuery = usersRef
            .where(`communityRoles.${business.primaryCommunityId}.role`, 'in', ['leader', 'president'])
            .limit(1);
        let leaderSnapshot = await roleQuery.get();

        if (leaderSnapshot.empty) {
            const primaryLeaderQuery = usersRef
                .where('homeCommunityId', '==', business.primaryCommunityId)
                .where('role', 'in', ['leader', 'president'])
                .limit(1);
            leaderSnapshot = await primaryLeaderQuery.get();
        }

        if (!leaderSnapshot.empty) {
          const leaderId = leaderSnapshot.docs[0].id;
          const leaderNotificationRef = firestore.collection("notifications").doc();
          batch.set(leaderNotificationRef, {
            recipientId: leaderId,
            type: "Business Submission",
            subject: `Free listing for "${business.businessName}" has expired and requires re-approval`,
            from: "Platform System",
            date: Timestamp.now().toDate().toISOString(),
            status: 'new',
            relatedId: doc.id,
          });
        }
      }
      processedCount++;
    }

    await batch.commit();

    const message = `Successfully processed ${processedCount} expired free listings.`;
    console.log(message);
    return NextResponse.json({ success: true, message });

  } catch (error: any) {
    console.error("Error in scheduled job check-free-listings:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
