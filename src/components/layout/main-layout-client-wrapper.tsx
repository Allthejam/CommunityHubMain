
'use client';

import { useEffect } from 'react';
import { useUser, useDoc, useMemoFirebase, useFirestore } from '@/firebase';
import { doc } from 'firebase/firestore';
import { WelcomeDialog } from '@/components/welcome-dialog';
import { setNationalAdvertiserCommunity } from '@/lib/actions/userActions';
import { useRouter } from 'next/navigation';

export function MainLayoutClientWrapper({ children }: { children: React.ReactNode }) {
    const { user, isUserLoading } = useUser();
    const db = useFirestore();
    const router = useRouter();

    const userProfileRef = useMemoFirebase(() => {
        if (!user) return null;
        return doc(db, 'users', user.uid);
    }, [user, db]);

    const { data: userProfile, isLoading: profileLoading } = useDoc(userProfileRef);

    // This effect now ONLY handles post-login setup for specific account types.
    // It NO LONGER forces a return to the home community.
    useEffect(() => {
        if (!isUserLoading && !profileLoading && user && userProfile) {
            const postLoginTasks = async () => {
                // For National Advertisers, ensure they are 'viewing' the correct placeholder community
                // after login.
                if (userProfile.accountType === 'national' || userProfile.accountType === 'advertiser') {
                    await setNationalAdvertiserCommunity(user.uid);
                }
            };

            postLoginTasks();
        }
    }, [user, userProfile, isUserLoading, profileLoading, router]);

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
