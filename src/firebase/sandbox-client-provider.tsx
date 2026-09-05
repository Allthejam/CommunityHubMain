'use client';

import React, { useMemo, type ReactNode } from 'react';
import { FirebaseProvider } from '@/firebase/provider';
import { initializeFirebase } from '@/firebase';
import { getFirestore } from 'firebase/firestore';

interface SandboxFirebaseClientProviderProps {
  children: ReactNode;
}

export function SandboxFirebaseClientProvider({ children }: SandboxFirebaseClientProviderProps) {
  const firebaseServices = useMemo(() => {
    const defaultServices = initializeFirebase();
    // Connect to the isolated comfeed secondary database
    const comfeedFirestore = getFirestore(defaultServices.firebaseApp, 'comfeed');
    return {
      firebaseApp: defaultServices.firebaseApp,
      auth: defaultServices.auth,
      firestore: comfeedFirestore,
    };
  }, []);

  return (
    <FirebaseProvider
      firebaseApp={firebaseServices.firebaseApp}
      auth={firebaseServices.auth}
      firestore={firebaseServices.firestore}
    >
      {children}
    </FirebaseProvider>
  );
}
