'use client';

import { useEffect } from 'react';
import { useUser, useDoc, useMemoFirebase, useFirestore } from '@/firebase';
import { doc } from 'firebase/firestore';
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

    useEffect(() => {
        if (!isUserLoading && !profileLoading && user && userProfile) {
            const postLoginTasks = async () => {
                if (userProfile.accountType === 'national' || userProfile.accountType === 'advertiser') {
                    await setNationalAdvertiserCommunity(user.uid);
                }
            };

            postLoginTasks();
        }
    }, [user, userProfile, isUserLoading, profileLoading, router]);

    return (
        <>
            {children}
        </>
    );
}
