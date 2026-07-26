const admin = require('firebase-admin');
const serviceAccount = require('./service-account.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function run() {
  const commId = '9ayHMyZf4SRw2gof1AM9';
  const commDoc = await db.collection('communities').doc(commId).get();
  if (commDoc.exists) {
    console.log("COMMUNITY DOC FOUND:", commDoc.id, commDoc.data());
  } else {
    console.log("COMMUNITY DOC NOT FOUND FOR ID:", commId);
    
    // Search communities with name "Show Home Community"
    const searchSnap = await db.collection('communities').get();
    console.log("TOTAL COMMUNITIES IN DB:", searchSnap.size);
    searchSnap.docs.forEach(doc => {
      if (doc.id.includes('9ayH') || doc.data().name?.includes('Show Home')) {
        console.log("MATCH:", doc.id, doc.data());
      }
    });
  }
}

run().catch(console.error);
