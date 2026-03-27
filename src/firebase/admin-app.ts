
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
  const existingApp = getApps().find((app) => app.name === 'firebase-admin-app');
  if (existingApp) {
    return existingApp;
  }

  // 1. Attempt initialization with Application Default Credentials (ADC)
  // This is the preferred method for Firebase App Hosting and other Google Cloud environments.
  try {
    return initializeApp({
      // When credential is not provided, it defaults to Application Default Credentials
    }, 'firebase-admin-app');
  } catch (adcError: any) {
    // 2. Fallback to service-account.json for local development
    try {
      const serviceAccount = require('../../service-account.json');
      const credential = cert(serviceAccount);
      
      return initializeApp({
        credential,
      }, 'firebase-admin-app');
    } catch (localError: any) {
      console.error(
        'Firebase Admin initialization failed. Ensure you are either in a Google Cloud environment or service-account.json is present locally. Original error: ' + localError.message
      );
      throw localError;
    }
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
