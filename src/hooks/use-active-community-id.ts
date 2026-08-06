'use client';

import { useMemo } from 'react';
import { useUser, useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';

export function useActiveCommunityId() {
  const { user, isUserLoading } = useUser();
  const db = useFirestore();

  const userProfileRef = useMemoFirebase(() => (user ? doc(db, 'users', user.uid) : null), [user, db]);
  const { data: userProfile, isLoading: profileLoading } = useDoc(userProfileRef);

  const communityId = useMemo(() => {
    if (typeof window !== 'undefined') {
      const visitedId = sessionStorage.getItem('visitedCommunityId');
      if (visitedId) return visitedId;
    }
    return userProfile?.communityId || userProfile?.homeCommunityId || null;
  }, [userProfile?.communityId, userProfile?.homeCommunityId]);

  return {
    communityId,
    userProfile,
    isLoading: isUserLoading || profileLoading,
  };
}
