'use client';

import { useEffect, useState, useMemo } from 'react';
import { collection, query, where, doc, getDoc } from 'firebase/firestore';
import { useUser, useFirestore, useDoc, useMemoFirebase, useCollection } from '@/firebase';
import { type Announcement } from '@/lib/announcement-data';
import EmergencyAlert from '@/components/emergency-alert';
import { WelcomeCards } from '@/components/welcome-cards';
import { EventsFeed } from '@/components/events-feed';
import { WhatsonFeed } from '@/components/whatson-feed';
import NationalAdvertisers from '@/components/national-advertisers';
import { JobsFeed } from '@/components/jobs-feed';
import { EnterpriseGroupsFeed } from '@/components/enterprise-groups-feed';
import { ValuedPartners } from '@/components/valued-partners';
import { LocalCharitiesFeed } from '@/components/local-charities-feed';
import { LostAndFoundFeed } from '@/components/lost-and-found-feed';
import { NewsFeed } from '@/components/news-feed';
import { PollsSnippet } from '@/components/polls-snippet';
import { Loader2 } from 'lucide-react';
import { NoLeaderAlert } from '@/components/no-leader-alert';
import { LocalBusinessesFeed } from '@/components/local-businesses-feed';
import { ProductsFeed } from '@/components/products-feed';
import { CommunityAdverts } from '@/components/community-adverts';
import { HighstreetFeed } from '@/components/highstreet-feed';
import { AnnouncementBanners } from '@/components/announcement-banners';
import { AccommodationFeed } from '@/components/accommodation-feed';
import { BuySwapSellFeed } from '@/components/buy-swap-sell-feed';
import { GuestBook } from '@/components/guest-book';

export default function HomePage() {
  const { user, isUserLoading: authLoading } = useUser();
  const db = useFirestore();
  const [activeCommunityId, setActiveCommunityId] = useState<string | null>(null);

  const userProfileRef = useMemoFirebase(() => {
    if (!user || !db) return null;
    return doc(db, 'users', user.uid);
  }, [user, db]);
  const { data: userProfile, isLoading: profileLoading } = useDoc(userProfileRef);

  // This single effect now reliably determines the active community ID
  useEffect(() => {
    // Wait until the user profile has been loaded
    if (profileLoading) return;

    // First, check session storage for a "visiting" community ID
    const visitedId = sessionStorage.getItem('visitedCommunityId');
    if (visitedId) {
      setActiveCommunityId(visitedId);
    } 
    // If not visiting, use the community ID from the user's profile
    else if (userProfile?.communityId) {
      setActiveCommunityId(userProfile.communityId);
    } 
    // Otherwise, there's no community to show
    else {
      setActiveCommunityId(null);
    }
  }, [userProfile, profileLoading]);
  
  const activeCommunityRef = useMemoFirebase(() => {
    if (!activeCommunityId || !db) return null;
    return doc(db, 'communities', activeCommunityId);
  }, [activeCommunityId, db]);
  const { data: activeCommunity, isLoading: communityLoading } = useDoc(activeCommunityRef);
  
  const platformAnnouncementsQuery = useMemoFirebase(() => {
      if (!db) return null;
      return query(
          collection(db, "announcements"), 
          where("scope", "==", "platform"),
          where("status", "==", "Live")
      );
  }, [db]);
  const { data: platformAnnouncementsData, isLoading: platformLoading } = useCollection<Announcement>(platformAnnouncementsQuery);

  const communityAnnouncementsQuery = useMemoFirebase(() => {
      if (!db || !activeCommunityId) return null;
      return query(
          collection(db, "announcements"), 
          where("scope", "==", "community"),
          where("communityId", "==", activeCommunityId),
          where("status", "==", "Live")
      );
  }, [db, activeCommunityId]);
  const { data: communityAnnouncementsData, isLoading: communityAnnouncementsLoading } = useCollection<Announcement>(communityAnnouncementsQuery);

  const filteredPlatformAnnouncements = useMemo(() => {
    if (!platformAnnouncementsData || !activeCommunity) return [];
    
    return platformAnnouncementsData.filter(ann => {
        const audience = (ann as any).audience;
        
        // If there's no audience object, default to platform-wide
        if (!audience) {
            return true;
        }

        const communities = audience.communities || [];
        const regions = audience.regions || [];
        const states = audience.states || [];
        const countries = audience.countries || [];

        const hasTargeting = communities.length > 0 || regions.length > 0 || states.length > 0 || countries.length > 0;
        
        // If no specific audience is defined inside the audience object, it's global
        if (!hasTargeting) {
            return true;
        }
        
        // Check for specific matches
        if (communities.includes((activeCommunity as any).id)) return true;
        if (regions.includes((activeCommunity as any).regionId)) return true;
        if (states.includes((activeCommunity as any).stateId)) return true;
        if (countries.includes((activeCommunity as any).countryId)) return true;
        
        return false; // No match found
    });
  }, [platformAnnouncementsData, activeCommunity]);

  const allAnnouncements = [...(filteredPlatformAnnouncements || []), ...(communityAnnouncementsData || [])];
  
  // The main loading condition now depends on having the essential user/profile data AND a community ID.
  const isLoading = authLoading || profileLoading || communityLoading || !activeCommunityId;

  if (isLoading) {
      return (
          <div className="flex justify-center items-center h-96">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
      );
  }

  const mailingLists = (userProfile as any)?.mailingLists || {};
  const showEmergency = mailingLists.emergency !== false;

  const emergencyBroadcasts = showEmergency 
    ? allAnnouncements.filter(a => a.type === "Emergency") 
    : [];
    
  const standardAnnouncements = allAnnouncements.filter(a => a.type === "Standard");

  return (
    <div className="space-y-6 md:space-y-8">
      <div className='px-4 md:px-0'>
          <EmergencyAlert allBroadcasts={emergencyBroadcasts} />
          {userProfile?.accountType !== 'national' && <NoLeaderAlert communityId={activeCommunityId} userProfile={userProfile} />}
      </div>
      <WelcomeCards />
      
      <div className='px-4 md:px-0 space-y-6 md:space-y-8'>
          <AnnouncementBanners allAnnouncements={standardAnnouncements} />
          <EventsFeed communityId={activeCommunityId} />
          <WhatsonFeed communityId={activeCommunityId} />
          <AccommodationFeed communityId={activeCommunityId} />
          <LocalBusinessesFeed communityId={activeCommunityId} />
          <CommunityAdverts communityId={activeCommunityId} />
          <ProductsFeed communityId={activeCommunityId} />
          <NationalAdvertisers layout="compact" />
          <JobsFeed communityId={activeCommunityId} />
          <EnterpriseGroupsFeed communityId={activeCommunityId} />
          <NewsFeed communityId={activeCommunityId} />
          <PollsSnippet communityId={activeCommunityId} />
          <LocalCharitiesFeed communityId={activeCommunityId} />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
            <LostAndFoundFeed communityId={activeCommunityId} />
            <BuySwapSellFeed communityId={activeCommunityId} />
          </div>
          <HighstreetFeed communityId={activeCommunityId} />
          <ValuedPartners layout="carousel" />
          <GuestBook communityId={activeCommunityId} />
      </div>
    </div>
  );
}
