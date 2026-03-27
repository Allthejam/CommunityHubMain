'use client';

import { useUser, useDoc, useMemoFirebase, useFirestore } from '@/firebase';
import { doc } from 'firebase/firestore';
import { WelcomeDialog } from '@/components/welcome-dialog';
import { Loader2 } from 'lucide-react';

export function MainLayoutClientWrapper({ children }: { children: React.ReactNode }) {
    const { user, isUserLoading } = useUser();
    const db = useFirestore();

    const userProfileRef = useMemoFirebase(() => {
        if (!user) return null;
        return doc(db, 'users', user.uid);
    }, [user, db]);

    const { data: userProfile, isLoading: profileLoading } = useDoc(userProfileRef);
    
    // We only show the dialog if we have the user and profile, and the flag is not set.
    // We also avoid showing it during the initial data fetch.
    const showDialog = !isUserLoading && !profileLoading && user && userProfile && !userProfile.hasSeenWelcome;

    return (
        <>
            {showDialog && (
                <WelcomeDialog userProfile={userProfile} />
            )}
            {children}
        </>
    );
}
