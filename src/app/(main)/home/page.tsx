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
import { CampaignsSnippet } from '@/components/campaigns-snippet';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { returnToHomeCommunityAction } from '@/lib/actions/userActions';
import { NoLeaderAlert } from '@/components/no-leader-alert';
import { LocalBusinessesFeed } from '@/components/local-businesses-feed';
import { ProductsFeed } from '@/components/products-feed';
import { CommunityAdverts } from '@/components/community-adverts';
import { HighstreetFeed } from '@/components/highstreet-feed';
import { AnnouncementBanners } from '@/components/announcement-banners';
import { AccommodationFeed } from '@/components/accommodation-feed';
import { BuySwapSellFeed } from '@/components/buy-swap-sell-feed';
import { GuestBook } from '@/components/guest-book';

import { LazyFeed } from '@/components/lazy-feed';

export default function HomePage() {
  const { user, isUserLoading: authLoading } = useUser();
  const db = useFirestore();
  const { toast } = useToast();
  const [activeCommunityId, setActiveCommunityId] = useState<string | null>('9ayHMyZf4SRw2gof1AM9');
  const [isReturning, setIsReturning] = useState(false);

  const userProfileRef = useMemoFirebase(() => {
    if (!user || !db) return null;
    return doc(db, 'users', user.uid);
  }, [user, db]);
  const { data: userProfile, isLoading: profileLoading } = useDoc(userProfileRef);

  // This single effect now reliably determines the active community ID
  useEffect(() => {
    if (profileLoading) return;

    const visitedId = typeof window !== 'undefined' ? sessionStorage.getItem('visitedCommunityId') : null;
    if (visitedId) {
      setActiveCommunityId(visitedId);
    } 
    else if (userProfile?.communityId) {
      setActiveCommunityId(userProfile.communityId);
    } 
    else {
      setActiveCommunityId(userProfile?.homeCommunityId || '9ayHMyZf4SRw2gof1AM9');
    }
  }, [userProfile, profileLoading]);
  
  const activeCommunityRef = useMemoFirebase(() => {
    const commId = activeCommunityId || '9ayHMyZf4SRw2gof1AM9';
    if (!db) return null;
    return doc(db, 'communities', commId);
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
      const commId = activeCommunityId || '9ayHMyZf4SRw2gof1AM9';
      if (!db) return null;
      return query(
          collection(db, "announcements"), 
          where("scope", "==", "community"),
          where("communityId", "==", commId),
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

  const mailingLists = (userProfile as any)?.mailingLists || {};
  const showEmergency = mailingLists.emergency !== false;

  const emergencyBroadcasts = showEmergency 
    ? allAnnouncements.filter(a => a.type === "Emergency") 
    : [];
    
  const standardAnnouncements = allAnnouncements.filter(a => a.type === "Standard");

  const homeCommId = userProfile?.homeCommunityId || '9ayHMyZf4SRw2gof1AM9';
  const homeCommName = userProfile?.homeCommunityName || 'Show Home Community, "Display Only"';
  const currentCommId = activeCommunityId || userProfile?.communityId;
  const currentCommName = (activeCommunity as any)?.name || userProfile?.communityName || 'Community';

  const isVisiting = !!(currentCommId && homeCommId && currentCommId !== homeCommId);

  const handleReturnHome = async () => {
    if (!user) return;
    setIsReturning(true);
    try {
      sessionStorage.removeItem('visitedCommunityId');
      const res = await returnToHomeCommunityAction({ userId: user.uid });
      if (res.success) {
          setActiveCommunityId(homeCommId);
          toast({ title: "Returned Home", description: `You are now back at your home community (${homeCommName}).` });
      } else {
          toast({ title: "Error", description: res.error, variant: "destructive" });
      }
    } catch (err: any) {
      toast({ title: "Error", description: err.message || "Failed to return home", variant: "destructive" });
    } finally {
      setIsReturning(false);
    }
  };

  return (
    <div className="space-y-6 md:space-y-8">
      {isVisiting && (
        <div className="mx-4 md:mx-0 p-4 rounded-xl border border-amber-300 dark:border-amber-900 bg-amber-50 dark:bg-amber-950/40 text-amber-900 dark:text-amber-200 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-sm">
          <div className="flex items-center gap-3 text-sm">
            <span className="text-xl">📍</span>
            <div>
              <p className="font-bold text-base">
                You are currently visiting the <span className="underline decoration-amber-400 font-extrabold">{currentCommName}</span> hub.
              </p>
              <p className="text-xs text-amber-800 dark:text-amber-300 mt-0.5">
                Your Home Community is: <strong className="font-semibold">{homeCommName}</strong>
              </p>
            </div>
          </div>
          <Button size="sm" className="bg-amber-600 hover:bg-amber-700 text-white font-semibold text-xs px-4 h-9 shadow-sm whitespace-nowrap" onClick={handleReturnHome} disabled={isReturning}>
            {isReturning && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Return to Home Community
          </Button>
        </div>
      )}

      <div className='px-4 md:px-0 space-y-4'>
          <EmergencyAlert allBroadcasts={emergencyBroadcasts} />
          {userProfile?.accountType !== 'national' && <NoLeaderAlert communityId={activeCommunityId} userProfile={userProfile} />}
      </div>

      {/* Priority 1 (Top of Page): Loads Instantly */}
      <WelcomeCards />
      
      <div className='px-4 md:px-0 space-y-6 md:space-y-8'>
          <AnnouncementBanners allAnnouncements={standardAnnouncements} />
          
          {/* Top Priority Feeds: Loaded Immediately */}
          <div id="events" className="scroll-mt-20"><EventsFeed communityId={activeCommunityId} /></div>
          <NewsFeed communityId={activeCommunityId} />
          <CampaignsSnippet communityId={activeCommunityId} />

          {/* Staged / Lazy Loaded Feeds: Fetched progressively as user scrolls */}
          <LazyFeed id="whatson" className="scroll-mt-20">
            <WhatsonFeed communityId={activeCommunityId} />
          </LazyFeed>

          <LazyFeed id="accommodation" className="scroll-mt-20">
            <AccommodationFeed communityId={activeCommunityId} />
          </LazyFeed>

          <LazyFeed id="dining" className="scroll-mt-20">
            <LocalBusinessesFeed communityId={activeCommunityId} />
          </LazyFeed>

          <LazyFeed>
            <CommunityAdverts communityId={activeCommunityId} />
          </LazyFeed>

          <LazyFeed>
            <ProductsFeed communityId={activeCommunityId} />
          </LazyFeed>

          <LazyFeed>
            <NationalAdvertisers layout="compact" />
          </LazyFeed>

          <LazyFeed>
            <JobsFeed communityId={activeCommunityId} />
          </LazyFeed>

          <LazyFeed>
            <EnterpriseGroupsFeed communityId={activeCommunityId} />
          </LazyFeed>

          <LazyFeed>
            <PollsSnippet communityId={activeCommunityId} />
          </LazyFeed>

          <LazyFeed>
            <LocalCharitiesFeed communityId={activeCommunityId} />
          </LazyFeed>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
            <LazyFeed>
              <LostAndFoundFeed communityId={activeCommunityId} />
            </LazyFeed>
            <LazyFeed>
              <BuySwapSellFeed communityId={activeCommunityId} />
            </LazyFeed>
          </div>

          <LazyFeed id="shopping" className="scroll-mt-20">
            <HighstreetFeed communityId={activeCommunityId} />
          </LazyFeed>

          <LazyFeed>
            <ValuedPartners layout="carousel" />
          </LazyFeed>

          <LazyFeed>
            <GuestBook communityId={activeCommunityId} />
          </LazyFeed>
      </div>
    </div>
  );
}
