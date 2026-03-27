
'use client';

import { useEffect, useState } from 'react';
import { collection, query, where, doc } from 'firebase/firestore';
import { useFirestore, useUser, useDoc, useMemoFirebase, useCollection } from '@/firebase';
import { type Announcement } from '@/lib/announcement-data';
import EmergencyAlert from '@/components/emergency-alert';
import { WelcomeCards } from '@/components/welcome-cards';
import { EventsFeed } from '@/components/events-feed';
import { WhatsonFeed } from '@/components/whatson-feed';
import { NationalAdvertisers } from '@/components/national-advertisers';
import { JobsFeed } from '@/components/jobs-feed';
import { EnterpriseGroupsFeed } from '@/components/enterprise-groups-feed';
import { ValuedPartners } from '@/components/valued-partners';
import { LocalCharitiesFeed } from '@/components/local-charities-feed';
import { LostAndFoundFeed } from '@/components/lost-and-found-feed';
import { NewsFeed } from '@/components/news-feed';
import { Loader2 } from 'lucide-react';
import { NoLeaderAlert } from '@/components/no-leader-alert';
import { LocalBusinessesFeed } from '@/components/local-businesses-feed';
import { ProductsFeed } from '@/components/products-feed';
import { SpecialOffersFeed } from '@/components/community-adverts';
import { HighstreetFeed } from '@/components/highstreet-feed';
import { AnnouncementBanners } from '@/components/announcement-banners';
import { AccommodationFeed } from '@/components/accommodation-feed';
import { BuySwapSellFeed } from '@/components/buy-swap-sell-feed';

export default function HomePage() {
  const { user, isUserLoading: authLoading } = useUser();
  const db = useFirestore();
  const [activeCommunityId, setActiveCommunityId] = useState<string | null>(null);

  // This effect runs immediately on the client to get the community ID
  // from either session storage (if visiting) or waits for the profile.
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const visitedId = sessionStorage.getItem('visitedCommunityId');
      if (visitedId) {
        setActiveCommunityId(visitedId);
      }
    }
  }, []);

  const userProfileRef = useMemoFirebase(() => {
    if (!user || !db) return null;
    return doc(db, 'users', user.uid);
  }, [user, db]);
  const { data: userProfile, isLoading: profileLoading } = useDoc(userProfileRef);

  // This effect sets the community ID from the user's profile
  // ONLY if one hasn't already been set from session storage.
  useEffect(() => {
    if (!activeCommunityId && userProfile?.communityId) {
      setActiveCommunityId(userProfile.communityId);
    }
  }, [userProfile, activeCommunityId]);
  
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
  const { data: communityAnnouncementsData, isLoading: communityLoading } = useCollection<Announcement>(communityAnnouncementsQuery);

  const allAnnouncements = [...(platformAnnouncementsData || []), ...(communityAnnouncementsData || [])];
  const dataLoading = platformLoading || communityLoading;
  
  // The main loading condition now depends on having the essential user/profile data AND a community ID.
  const isLoading = authLoading || profileLoading || !activeCommunityId;

  if (isLoading) {
      return (
          <div className="flex justify-center items-center h-96">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
      );
  }

  const settings = (userProfile as any)?.settings || {};
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
          <EventsFeed />
          <WhatsonFeed />
          <AccommodationFeed />
          <LocalBusinessesFeed />
          <SpecialOffersFeed />
          <ProductsFeed />
          <NationalAdvertisers />
          <ValuedPartners layout="carousel" />
          <JobsFeed />
          <EnterpriseGroupsFeed />
          <NewsFeed />
          <LocalCharitiesFeed />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
            <LostAndFoundFeed />
            <BuySwapSellFeed />
          </div>
          <HighstreetFeed />
      </div>
    </div>
  );
}
