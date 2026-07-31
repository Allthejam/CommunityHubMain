'use client';

import * as React from 'react';
import { useUser, useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';

export function useActiveCommunityId() {
  const { user, isUserLoading } = useUser();
  const db = useFirestore();

  const userProfileRef = useMemoFirebase(() => {
    if (!user || !db) return null;
    return doc(db, 'users', user.uid);
  }, [user, db]);

  const { data: userProfile, isLoading: profileLoading } = useDoc(userProfileRef);
  const [visitedCommunityId, setVisitedCommunityId] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (typeof window !== 'undefined') {
      const visitedId = sessionStorage.getItem('visitedCommunityId');
      if (visitedId) {
        setVisitedCommunityId(visitedId);
      }
    }
  }, []);

  const activeCommunityId = visitedCommunityId || userProfile?.communityId || userProfile?.homeCommunityId || '9ayHMyZf4SRw2gof1AM9';
  
  const homeCommId = userProfile?.homeCommunityId || userProfile?.communityId;
  const isVisiting = !!(homeCommId && activeCommunityId && homeCommId !== activeCommunityId);

  return {
    communityId: activeCommunityId,
    userProfile,
    isVisiting,
    isLoading: isUserLoading || profileLoading,
    homeCommunityId: homeCommId,
    homeCommunityName: userProfile?.homeCommunityName || userProfile?.communityName || 'Home Community',
  };
}
