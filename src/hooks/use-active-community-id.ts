'use client';

import { useMemo, useState, useEffect } from 'react';
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

  const [sessionVisitedId, setSessionVisitedId] = useState<string | null>(() => {
    if (typeof window !== 'undefined') {
      return sessionStorage.getItem('visitedCommunityId');
    }
    return null;
  });

  const [sessionVisitedName, setSessionVisitedName] = useState<string | null>(() => {
    if (typeof window !== 'undefined') {
      return sessionStorage.getItem('visitedCommunityName');
    }
    return null;
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleSync = () => {
      setSessionVisitedId(sessionStorage.getItem('visitedCommunityId'));
      setSessionVisitedName(sessionStorage.getItem('visitedCommunityName'));
    };

    window.addEventListener('storage', handleSync);
    window.addEventListener('community-change', handleSync);
    return () => {
      window.removeEventListener('storage', handleSync);
      window.removeEventListener('community-change', handleSync);
    };
  }, []);

  const homeCommunityId = userProfile?.primaryHomeCommunityId || userProfile?.homeCommunityId || userProfile?.communityId || null;
  const homeCommunityName = userProfile?.primaryHomeCommunityName || userProfile?.homeCommunityName || userProfile?.communityName || null;

  const isDemo = typeof window !== 'undefined' && window.location.pathname.startsWith('/demo');

  const visitedCommunityId = (sessionVisitedId && sessionVisitedId !== homeCommunityId) ? sessionVisitedId : null;
  const isVisiting = Boolean(visitedCommunityId);

  const communityId = useMemo(() => {
    if (isDemo) {
      return sessionVisitedId || '9ayHMyZf4SRw2gof1AM9';
    }
    if (visitedCommunityId) return visitedCommunityId;
    return homeCommunityId || 'N3SarfGXPLxBI7XcsinX';
  }, [isDemo, sessionVisitedId, visitedCommunityId, homeCommunityId]);

  // Fetch the active community doc so we always have the accurate community name
  const communityRef = useMemoFirebase(() => (communityId && db ? doc(db, 'communities', communityId) : null), [communityId, db]);
  const { data: communityDoc, isLoading: communityLoading } = useDoc(communityRef);

  const communityName = useMemo(() => {
    if (communityDoc?.name) {
      if (typeof window !== 'undefined' && isVisiting) {
        sessionStorage.setItem('visitedCommunityName', communityDoc.name);
      }
      return communityDoc.name;
    }
    if (isVisiting && sessionVisitedName) return sessionVisitedName;
    if (!isVisiting && homeCommunityName) return homeCommunityName;
    return isDemo ? 'Oakridge Demo Community' : 'Community';
  }, [communityDoc, isVisiting, sessionVisitedName, homeCommunityName, isDemo]);

  return {
    communityId,
    communityName,
    homeCommunityId,
    homeCommunityName,
    isVisiting,
    visitedCommunityId,
    visitedCommunityName: isVisiting ? communityName : null,
    communityData: communityDoc,
    userProfile,
    isLoading: isUserLoading || profileLoading || communityLoading,
  };
}
