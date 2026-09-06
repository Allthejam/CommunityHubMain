'use client';

import { useMemo } from 'react';
import { useUser, useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';

export function getActiveCommunityId(userProfile?: any): string {
  if (typeof window !== 'undefined') {
    const isDemo = window.location.pathname.startsWith('/demo');
    if (isDemo) {
      return sessionStorage.getItem('visitedCommunityId') || '9ayHMyZf4SRw2gof1AM9';
    }
    // Clean up any stale demo keys when on live routes
    if (sessionStorage.getItem('isDemoMode') === 'true') {
      sessionStorage.removeItem('isDemoMode');
    }
    const visitedId = sessionStorage.getItem('visitedCommunityId');
    if (visitedId && visitedId !== '9ayHMyZf4SRw2gof1AM9') return visitedId;
  }
  return userProfile?.primaryHomeCommunityId || userProfile?.homeCommunityId || userProfile?.communityId || 'N3SarfGXPLxBI7XcsinX';
}

export function getDashboardLink(targetPath: string): string {
  if (typeof window !== 'undefined') {
    const isDemo = window.location.pathname.startsWith('/demo');
    if (isDemo) {
      return targetPath.startsWith('/demo') ? targetPath : `/demo${targetPath}`;
    }
  }
  return targetPath;
}

export function useActiveCommunityId() {
  const { user, isUserLoading } = useUser();
  const db = useFirestore();

  const userProfileRef = useMemoFirebase(() => (user && db ? doc(db, 'users', user.uid) : null), [user, db]);
  const { data: userProfile, isLoading: profileLoading } = useDoc(userProfileRef);

  const communityId = useMemo(() => {
    return getActiveCommunityId(userProfile);
  }, [userProfile]);

  return {
    communityId,
    userProfile,
    isLoading: isUserLoading || profileLoading,
  };
}
