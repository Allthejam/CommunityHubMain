
import 'dotenv/config'; // Ensure all environment variables are loaded
import { initializeApp, getApps, App, cert, type Credential } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import 'server-only'; // Ensures this module is only used on the server

let adminApp: App;

/**
 * Initializes and returns the Firebase Admin App instance.
 *
 * This function handles server-side Firebase initialization. It's designed to be
 * idempotent, meaning it will only initialize the app once.
 */
function createAdminApp(): App {
  if (getApps().some((app) => app.name === 'firebase-admin-app')) {
    return getApps().find((app) => app.name === 'firebase-admin-app')!;
  }

  try {
    let credential;
    try {
      // Explicitly load the service account key for local development.
      const serviceAccount = require('../../service-account.json');
      credential = cert(serviceAccount);
    } catch (err) {
      // In production (Firebase App Hosting), the file won't exist.
      // Firebase will automatically use Application Default Credentials.
      console.log('service-account.json not found, falling back to Application Default Credentials.');
    }
    
    return initializeApp(credential ? { credential } : undefined, 'firebase-admin-app');
  } catch (e: any) {
    console.error(
      'Firebase Admin initialization failed. ' + e.message
    );
    throw e;
  }
}

/**
 * Provides initialized Firebase Admin SDK services.
 *
 * This function is the entry point for accessing server-side Firebase services.
 * It ensures the admin app is initialized before returning the services.
 *
 * @returns An object containing the Firestore instance and the Admin App itself.
 */
export function initializeAdminApp() {
  if (!adminApp) {
    adminApp = createAdminApp();
  }
  return {
    firestore: getFirestore(adminApp),
    adminApp,
  };
}
