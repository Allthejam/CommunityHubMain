const admin = require('firebase-admin');
const serviceAccount = require('./service-account.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function run() {
  const userDoc = await db.collection('users').doc('YVSK7VIB0nT4ISQT5dGm7oyRxKH3').get();
  console.log("FULL USER DOC YVSK7VIB0nT4ISQT5dGm7oyRxKH3:");
  console.log(JSON.stringify(userDoc.data(), null, 2));

  console.log("\n--- ALL COMMUNITIES IN DATABASE ---");
  const commsSnap = await db.collection('communities').get();
  commsSnap.docs.forEach(d => {
    const data = d.data();
    console.log(`COMMUNITY ID: ${d.id} | NAME: "${data.name}" | STATUS: ${data.status} | CREATED: ${data.createdAt?.toDate ? data.createdAt.toDate() : data.createdAt}`);
  });
}

run().catch(console.error);
