
'use client';

import { useEffect, useRef } from 'react';
import { useFirestore } from '@/firebase';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { getAuth, onAuthStateChanged, type User } from 'firebase/auth';

export function PresenceManager() {
    const db = useFirestore();
    const lastUserId = useRef<string | null>(null);

    useEffect(() => {
        if (!db) return;

        const auth = getAuth();

        const setStatus = (userId: string, isOnline: boolean) => {
            if (!userId) return;
            const userStatusRef = doc(db, 'users', userId);
            const statusUpdate = {
                isOnline,
                lastSeen: serverTimestamp(),
            };
            // Use setDoc with merge to prevent race conditions on user creation.
            // This will create the document with these fields if it doesn't exist,
            // or update them if it does.
            setDoc(userStatusRef, statusUpdate, { merge: true }).catch(console.error);
        };
        
        const unsubscribe = onAuthStateChanged(auth, (user: User | null) => {
            // User signs in
            if (user) {
                setStatus(user.uid, true);
                lastUserId.current = user.uid;
            } else {
                // User is signed out, clear the tracked user ID.
                // The actual offline update is handled by the logout button or beforeunload.
                lastUserId.current = null;
            }
        });

        const handleVisibilityChange = () => {
            if (lastUserId.current) {
                const isOnline = document.visibilityState === 'visible';
                setStatus(lastUserId.current, isOnline);
            }
        };

        const handleBeforeUnload = () => {
            if (lastUserId.current) {
                setStatus(lastUserId.current, false);
            }
        };
        
        // Initial check for a currently logged-in user
        if (auth.currentUser) {
            lastUserId.current = auth.currentUser.uid;
            setStatus(auth.currentUser.uid, true);
        }

        window.addEventListener('visibilitychange', handleVisibilityChange);
        window.addEventListener('beforeunload', handleBeforeUnload);

        return () => {
            // This is a "best effort" attempt. The logout button is more reliable.
            handleBeforeUnload(); 
            unsubscribe();
            window.removeEventListener('visibilitychange', handleVisibilityChange);
            window.removeEventListener('beforeunload', handleBeforeUnload);
        };
    }, [db]);

    return null;
}
