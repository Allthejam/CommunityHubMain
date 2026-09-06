'use client';

import { signOut, Auth } from 'firebase/auth';
import { Firestore, doc, updateDoc, serverTimestamp } from 'firebase/firestore';

/**
 * Perform a clean, global logout:
 * 1. Clear session storage (visiting status, persona, demo mode, etc.)
 * 2. Set online status to false in Firestore
 * 3. Sign out of Firebase Auth
 * 4. Perform a hard browser redirect to the landing/login page ('/')
 */
export async function performGlobalLogout(
  auth: Auth | null | undefined,
  firestore?: Firestore | null | undefined,
  user?: { uid: string } | null | undefined
): Promise<void> {
  try {
    if (typeof window !== 'undefined') {
      try {
        sessionStorage.removeItem('visitedCommunityId');
        sessionStorage.removeItem('visitedCommunityName');
        sessionStorage.removeItem('isDemoMode');
        sessionStorage.removeItem('sandboxPersona');
        sessionStorage.removeItem('activePersona');
        sessionStorage.removeItem('hasSkippedOnboarding');
        sessionStorage.removeItem('impersonatedRole');
      } catch (storageErr) {
        console.warn('Could not clear sessionStorage on logout:', storageErr);
      }
    }

    if (user?.uid && firestore) {
      try {
        const userStatusRef = doc(firestore, 'users', user.uid);
        await updateDoc(userStatusRef, {
          isOnline: false,
          lastSeen: serverTimestamp(),
        });
      } catch (statusErr) {
        console.warn('Could not update user offline status on logout:', statusErr);
      }
    }

    if (auth) {
      await signOut(auth);
    }
  } catch (error) {
    console.error('Error during global logout:', error);
  } finally {
    if (typeof window !== 'undefined') {
      window.location.href = '/';
    }
  }
}
