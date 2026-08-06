'use client';

import * as React from 'react';
import { useEffect, useState, useMemo, Suspense } from 'react';
import { useRouter } from 'next/navigation';
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
import { NoLeaderAlert } from '@/components/no-leader-alert';
import { LocalBusinessesFeed } from '@/components/local-businesses-feed';
import { ProductsFeed } from '@/components/products-feed';
import { CommunityAdverts } from '@/components/community-adverts';
import { HighstreetFeed } from '@/components/highstreet-feed';
import { AnnouncementBanners } from '@/components/announcement-banners';
import { AccommodationFeed } from '@/components/accommodation-feed';
import { BuySwapSellFeed } from '@/components/buy-swap-sell-feed';
import { GuestBook } from '@/components/guest-book';
import { RegionalNetworksFeed } from '@/components/regional-networks-feed';

import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { MapPin, ArrowRight } from 'lucide-react';

function getGeoJsonBoundingBox(geoJson: any): { minLng: number; maxLng: number; minLat: number; maxLat: number } | null {
  if (!geoJson) return null;
  let coords: [number, number][] = [];
  try {
    const data = typeof geoJson === 'string' ? JSON.parse(geoJson) : geoJson;
    if (data.type === 'FeatureCollection' && Array.isArray(data.features)) {
      data.features.forEach((f: any) => {
        if (f.geometry?.type === 'Polygon' && Array.isArray(f.geometry.coordinates?.[0])) {
          coords.push(...f.geometry.coordinates[0]);
        }
      });
    } else if (data.type === 'Feature' && data.geometry?.type === 'Polygon' && Array.isArray(data.geometry.coordinates?.[0])) {
      coords.push(...data.geometry.coordinates[0]);
    } else if (data.type === 'Polygon' && Array.isArray(data.coordinates?.[0])) {
      coords.push(...data.coordinates[0]);
    }
  } catch (e) {
    return null;
  }

  if (coords.length === 0) return null;

  let minLng = Infinity, maxLng = -Infinity, minLat = Infinity, maxLat = -Infinity;
  coords.forEach(([lng, lat]) => {
    if (typeof lng === 'number' && typeof lat === 'number') {
      if (lng < minLng) minLng = lng;
      if (lng > maxLng) maxLng = lng;
      if (lat < minLat) minLat = lat;
      if (lat > maxLat) maxLat = lat;
    }
  });

  if (minLng === Infinity) return null;
  return { minLng, maxLng, minLat, maxLat };
}

function isCommunityInsideRegionalBoundary(regionalGeoJsonStr: any, communityGeoJsonStr: any): boolean {
  if (!regionalGeoJsonStr || !communityGeoJsonStr) return false;
  try {
    const rBox = getGeoJsonBoundingBox(regionalGeoJsonStr);
    const cBox = getGeoJsonBoundingBox(communityGeoJsonStr);

    if (!rBox || !cBox) return false;

    return (
      cBox.minLng >= rBox.minLng &&
      cBox.maxLng <= rBox.maxLng &&
      cBox.minLat >= rBox.minLat &&
      cBox.maxLat <= rBox.maxLat
    );
  } catch (e) {
    return false;
  }
}

function HomePageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const urlCommunityId = searchParams ? searchParams.get('community') : null;

  const { user, isUserLoading: authLoading } = useUser();
  const db = useFirestore();
  const [activeCommunityId, setActiveCommunityId] = useState<string | null>(null);

  const userProfileRef = useMemoFirebase(() => {
    if (!user || !db) return null;
    return doc(db, 'users', user.uid);
  }, [user, db]);
  const { data: userProfile, isLoading: profileLoading } = useDoc(userProfileRef);

  const isRegionalUser = (userProfile?.accountType === 'regional' || userProfile?.permissions?.isRegionalNetwork) === true;

  useEffect(() => {
    if (profileLoading) return;

    if (urlCommunityId) {
      if (typeof window !== 'undefined') {
        sessionStorage.setItem('visitedCommunityId', urlCommunityId);
      }
      setActiveCommunityId(urlCommunityId);
      return;
    }

    const visitedSession = typeof window !== 'undefined' ? sessionStorage.getItem('visitedCommunityId') : null;
    const lockedHomeId = userProfile?.primaryHomeCommunityId || userProfile?.homeCommunityId;

    if (visitedSession) {
      setActiveCommunityId(visitedSession);
    } else if (lockedHomeId) {
      setActiveCommunityId(lockedHomeId);
    } else if (isRegionalUser) {
      router.replace('/regional/dashboard');
      return;
    } else if (userProfile?.communityId) {
      setActiveCommunityId(userProfile.communityId);
    } else {
      setActiveCommunityId(null);
    }
  }, [userProfile, profileLoading, router, urlCommunityId, isRegionalUser]);
  
  const activeCommunityRef = useMemoFirebase(() => {
    if (!activeCommunityId || !db) return null;
    return doc(db, 'communities', activeCommunityId);
  }, [activeCommunityId, db]);
  const { data: activeCommunity, isLoading: communityLoading } = useDoc(activeCommunityRef);
  
  const authoritiesQuery = useMemoFirebase(() => {
    if (!db) return null;
    return query(
      collection(db, 'users'),
      where('accountType', '==', 'regional')
    );
  }, [db]);
  const { data: authorityDocs } = useCollection(authoritiesQuery);

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
          where("targetCommunityIds", "array-contains", activeCommunityId),
          where("status", "==", "Live")
      );
  }, [db, activeCommunityId]);
  const { data: communityAnnouncementsData, isLoading: communityAnnouncementsLoading } = useCollection<Announcement>(communityAnnouncementsQuery);

  const regionalBroadcastsQuery = useMemoFirebase(() => {
    if (!db) return null;
    return query(
      collection(db, 'regionalBroadcasts'),
      where('status', '==', 'Live')
    );
  }, [db]);
  const { data: rawRegionalBroadcasts } = useCollection(regionalBroadcastsQuery);

  const targetedRegionalBroadcasts = useMemo(() => {
    if (!rawRegionalBroadcasts || !activeCommunityId) return [];
    return rawRegionalBroadcasts
      .filter((b: any) => {
        const explicitTargets = Array.isArray(b.targetCommunityIds) ? b.targetCommunityIds : [];
        if (explicitTargets.includes(activeCommunityId)) return true;

        if (b.authorityUserId && authorityDocs && activeCommunity) {
          const auth = authorityDocs.find((a: any) => a.id === b.authorityUserId || a.uid === b.authorityUserId);
          if (auth) {
            const encompassed = auth.encompassedCommunityIds || auth.targetCommunityIds || [];
            if (encompassed.includes(activeCommunityId) || auth.primaryCommunityId === activeCommunityId || auth.communityId === activeCommunityId) {
              return true;
            }
            if (auth.regionalBoundary && activeCommunity.boundary) {
              if (isCommunityInsideRegionalBoundary(auth.regionalBoundary, activeCommunity.boundary)) {
                return true;
              }
            }
            const commRegion = (activeCommunity.region || activeCommunity.state || '').toLowerCase().trim();
            const authRegion = (auth.region || auth.state || auth.organizationName || '').toLowerCase().trim();
            if (commRegion && authRegion && (commRegion.includes(authRegion) || authRegion.includes(commRegion))) {
              return true;
            }
          }
        }
        return false;
      })
      .map((b: any) => ({
        id: b.id,
        subject: b.title,
        message: b.message,
        type: b.broadcastType === 'emergency' ? 'Emergency' : 'Standard',
        severity: b.broadcastType === 'urgent' ? 'urgent' : 'normal',
        scope: 'platform',
        status: 'Live',
        creator: b.organizationName || 'Regional Network Authority',
        creatorId: b.authorityUserId,
        isRegionalNetwork: true,
        targetCommunityIds: b.targetCommunityIds,
        createdAt: b.createdAt
      }));
  }, [rawRegionalBroadcasts, activeCommunityId, authorityDocs, activeCommunity]);

  const filteredPlatformAnnouncements = useMemo(() => {
    if (!platformAnnouncementsData || !activeCommunity) return [];
    
    return platformAnnouncementsData.filter(ann => {
        const targetIds = (ann as any).targetCommunityIds || (ann as any).audience?.communities || [];
        const isRegional = (ann as any).isRegionalNetwork;

        // If targeted to specific communities, check spatial inclusion strictly
        if (targetIds.length > 0) {
            return targetIds.includes((activeCommunity as any).id);
        }

        // Regional broadcasts MUST NEVER leak globally without explicit targetCommunityIds matching activeCommunity
        if (isRegional) {
            return false;
        }

        const audience = (ann as any).audience;
        
        if (!audience) {
            return true;
        }

        const communities = audience.communities || [];
        const regions = audience.regions || [];
        const states = audience.states || [];
        const countries = audience.countries || [];

        const hasTargeting = communities.length > 0 || regions.length > 0 || states.length > 0 || countries.length > 0;
        
        if (!hasTargeting) {
            return true;
        }
        
        if (communities.includes((activeCommunity as any).id)) return true;
        if (regions.includes((activeCommunity as any).regionId)) return true;
        if (states.includes((activeCommunity as any).stateId)) return true;
        if (countries.includes((activeCommunity as any).countryId)) return true;
        
        return false;
    });
  }, [platformAnnouncementsData, activeCommunity]);

  const allAnnouncements = [...(filteredPlatformAnnouncements || []), ...(communityAnnouncementsData || []), ...(targetedRegionalBroadcasts || [])];
  
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
    ? allAnnouncements.filter(a => a.type === "Emergency" || a.severity === "emergency" || (a as any).broadcastType === "emergency") 
    : [];
    
  const standardAnnouncements = allAnnouncements.filter(a => a.type !== "Emergency" && a.severity !== "emergency" && (a as any).broadcastType !== "emergency");

  return (
    <div className="space-y-6 md:space-y-8">
      {isRegionalUser && (
        <div className="bg-gradient-to-r from-emerald-800 to-teal-900 text-white px-4 py-3 rounded-xl flex items-center justify-between shadow-md mb-2">
          <div className="flex items-center gap-2 text-xs md:text-sm">
            <MapPin className="h-4 w-4 text-emerald-300 shrink-0" />
            <span>Regional Authority View: Viewing <strong>{activeCommunity?.name || 'Community'} Home Feed</strong></span>
          </div>
          <Button asChild size="sm" className="bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold text-xs shadow-sm">
            <Link href="/regional/dashboard">
              Return to Back Office <ArrowRight className="ml-1 h-3.5 w-3.5" />
            </Link>
          </Button>
        </div>
      )}
      <div className='px-4 md:px-0'>
          <EmergencyAlert allBroadcasts={emergencyBroadcasts} />
          {userProfile?.accountType !== 'national' && <NoLeaderAlert communityId={activeCommunityId} userProfile={userProfile} />}
      </div>
      <WelcomeCards activeCommunityId={activeCommunityId} activeCommunity={activeCommunity} />
      
      <div className='px-4 md:px-0 space-y-6 md:space-y-8'>
          <AnnouncementBanners allAnnouncements={standardAnnouncements} />
          <EventsFeed communityId={activeCommunityId} />
          <div id="section-whatson" className="scroll-mt-20">
            <WhatsonFeed communityId={activeCommunityId} />
          </div>
          <div id="section-accommodation" className="scroll-mt-20">
            <AccommodationFeed communityId={activeCommunityId} />
          </div>
          <div id="section-businesses" className="scroll-mt-20">
            <LocalBusinessesFeed communityId={activeCommunityId} />
          </div>
          <CommunityAdverts communityId={activeCommunityId} />
          <div id="section-shopping" className="scroll-mt-20">
            <ProductsFeed communityId={activeCommunityId} />
          </div>
          <NationalAdvertisers layout="compact" />
          <JobsFeed communityId={activeCommunityId} />
          <EnterpriseGroupsFeed communityId={activeCommunityId} />
          <CampaignsSnippet communityId={activeCommunityId} />
          <NewsFeed communityId={activeCommunityId} />
          <PollsSnippet communityId={activeCommunityId} />
          <LocalCharitiesFeed communityId={activeCommunityId} />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
            <LostAndFoundFeed communityId={activeCommunityId} />
            <BuySwapSellFeed communityId={activeCommunityId} />
          </div>
          <HighstreetFeed communityId={activeCommunityId} />
          <ValuedPartners layout="carousel" />
          <RegionalNetworksFeed communityId={activeCommunityId} />
          <GuestBook communityId={activeCommunityId} />
      </div>
    </div>
  );
}

export default function HomePage() {
  return (
    <React.Suspense fallback={<div className="flex items-center justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-amber-600" /></div>}>
      <HomePageContent />
    </React.Suspense>
  );
}
