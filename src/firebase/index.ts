
'use client';

import { firebaseConfig } from '@/firebase/config';
import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getAuth, type Auth } from 'firebase/auth';
import { getFirestore, type Firestore } from 'firebase/firestore'

// IMPORTANT: DO NOT MODIFY THIS FUNCTION
export function initializeFirebase() {
  if (!getApps().length) {
    // Important! initializeApp() is called without any arguments because Firebase App Hosting
    // integrates with the initializeApp() function to provide the environment variables needed to
    // populate the FirebaseOptions in production. It is critical that we attempt to call initializeApp()
    // without arguments.
    let firebaseApp;
    try {
      // Attempt to initialize via Firebase App Hosting environment variables
      firebaseApp = initializeApp();
    } catch (e) {
      // Only warn in production because it's normal to use the firebaseConfig to initialize
      // during development
      if (process.env.NODE_ENV === "production") {
        console.warn('Automatic initialization failed. Falling back to firebase config object.', e);
      }
      firebaseApp = initializeApp(firebaseConfig);
    }

    return getSdks(firebaseApp);
  }

  // If already initialized, return the SDKs with the already initialized App
  return getSdks(getApp());
}

export function getSdks(firebaseApp: FirebaseApp) {
  return {
    firebaseApp,
    auth: getAuth(firebaseApp),
    firestore: getFirestore(firebaseApp),
  };
}

export * from './provider';
export * from './client-provider';
export * from './firestore/use-collection';
export * from './firestore/use-doc';
export * from './non-blocking-updates';
export * from './errors';
export * from './error-emitter';

// This function needs to be defined in a client component
// to access `localStorage`, and it can't be in a hook
// because we might call it from an event handler.
export const initiateEmailSignIn = (auth: Auth, email: string, password: string) => {
  if (!auth) {
    console.error('Firebase Auth not available');
    return;
  }
  // The sign-in process is handled by the useUser hook's
  // onAuthStateChanged listener.
  import('firebase/auth').then(({ signInWithEmailAndPassword }) => {
    signInWithEmailAndPassword(auth, email, password).catch((e) => {
      // This is to display the error in the UI
      // It is not meant to be a substitute for the global error handler
      // which is used to display errors in the console
      // and in the future, to a logging service.
      console.error(e.message);
      // We will add a toast notification here later
    });
  });
};

