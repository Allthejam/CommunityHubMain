
'use client';

import * as React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from './ui/card';
import { Button } from './ui/button';
import Link from 'next/link';
import { ArrowRight, Loader2, BedDouble } from 'lucide-react';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, where } from 'firebase/firestore';
import BusinessCard from '@/components/business-card';
import { businesses as mockBusinesses } from '@/lib/mock-data';
import { accommodationCategories } from '@/lib/categories';
import { differenceInDays } from 'date-fns';
import { shuffleArray } from '@/lib/utils';

type Business = {
  id: string;
  businessName: string;
  businessCategory?: string;
  logoImage?: string;
  shortDescription: string;
  status: "Pending Approval" | "Approved" | "Requires Amendment" | "Declined" | "Subscribed" | "Draft";
  createdAt?: { toDate: () => Date };
  listingSubscriptionExpiresAt?: { toDate: () => Date };
};

export function AccommodationFeed({ communityId }: { communityId: string | null }) {
  const db = useFirestore();
  const [clientAccommodations, setClientAccommodations] = React.useState<Business[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);

  // Query all businesses in this community (single-field query, fast & 100% indexed)
  const primaryQuery = useMemoFirebase(() => {
    if (!communityId || !db) return null;
    return query(
      collection(db, "businesses"),
      where("primaryCommunityId", "==", communityId)
    );
  }, [db, communityId]);

  // Also query businesses advertising additionally in this community
  const additionalQuery = useMemoFirebase(() => {
    if (!communityId || !db) return null;
    return query(
      collection(db, "businesses"),
      where("additionalCommunityIds", "array-contains", communityId)
    );
  }, [db, communityId]);

  const { data: primaryBusinesses, isLoading: primaryLoading } = useCollection<Business>(primaryQuery);
  const { data: additionalBusinesses, isLoading: additionalLoading } = useCollection<Business>(additionalQuery);
  
  const overallLoading = primaryLoading || additionalLoading;

  React.useEffect(() => {
    if (overallLoading) {
      setIsLoading(true);
      return;
    }

    const toDate = (timestamp: any): Date | null => {
        if (!timestamp) return null;
        if (typeof timestamp.toDate === 'function') {
            return timestamp.toDate();
        }
        if (timestamp.seconds) {
            return new Date(timestamp.seconds * 1000);
        }
        if (typeof timestamp === 'string' || typeof timestamp === 'number') {
            const d = new Date(timestamp);
            if (!isNaN(d.getTime())) return d;
        }
        return null;
    };

    const now = new Date();

    const isAccommodationBusiness = (b: any): boolean => {
      if (b.isAccommodation === true) return true;
      const cat = (b.businessCategory || '').toLowerCase().trim();
      return (
        cat.includes('stay') ||
        cat.includes('lodg') ||
        cat.includes('hotel') ||
        cat.includes('b&b') ||
        cat.includes('b-and-b') ||
        cat.includes('guest') ||
        cat.includes('campsite') ||
        cat.includes('camping') ||
        cat.includes('caravan') ||
        cat.includes('glamping') ||
        cat.includes('holiday') ||
        cat.includes('airbnb') ||
        cat.includes('accommodation') ||
        cat.includes('motel') ||
        cat.includes('inn') ||
        cat.includes('resort') ||
        cat.includes('hostel') ||
        cat.includes('cottage')
      );
    };

    const filterLive = (business: Business) => {
        const b = business as any;

        // 1. Must be an accommodation / stay
        if (!isAccommodationBusiness(b)) return false;

        // 2. Seeded / public directory unclaimed accommodations are ALWAYS live & claimable!
        if (b.isUnclaimed || b.ownerId === 'platform' || b.claimed === false || b.createdBy === 'platform') {
            return true;
        }

        // 3. Subscribed businesses
        if (b.status === 'Subscribed') {
            const expiryDate = toDate(b.listingSubscriptionExpiresAt);
            return !expiryDate || now <= expiryDate;
        }

        // 4. Free listings
        const freeExpiry = toDate(b.freeListingExpiresAt);
        if (b.isFreeListing && (!freeExpiry || now <= freeExpiry)) {
            return true;
        }

        // 5. Approved businesses
        if (b.status === 'Approved') {
            const creationDate = toDate(b.createdAt);
            if (!creationDate) return true;
            return differenceInDays(now, creationDate) <= 30;
        }

        return false;
    };
    
    // Combine and deduplicate
    const combined = [
      ...(primaryBusinesses || []),
      ...(additionalBusinesses || []),
    ];
    const unique = Array.from(new Map(combined.map(b => [b.id, b])).values());
    let liveFiltered = unique.filter(filterLive);
    
    if (liveFiltered.length > 0) {
      // Fair exposure: Randomize accommodations on each visit
      setClientAccommodations(shuffleArray(liveFiltered));
    } else {
        const mockStays = [
            { ...mockBusinesses.find(b => b.businessName === 'The Corner Bistro'), businessCategory: 'guest-house' },
            { ...mockBusinesses.find(b => b.businessName === 'Wellness Studio'), businessCategory: 'b-and-b' },
            { ...mockBusinesses.find(b => b.businessName === 'Knot & Grain'), businessCategory: 'holiday-let' },
        ].filter(Boolean);
        setClientAccommodations(shuffleArray(mockStays as Business[]));
    }
    setIsLoading(false);
  }, [primaryBusinesses, additionalBusinesses, overallLoading]);

  if (isLoading && clientAccommodations.length === 0) {
    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <BedDouble className="h-6 w-6" />
                    Local Stays
                </CardTitle>
                <CardDescription>Find places to stay in and around the community.</CardDescription>
            </CardHeader>
            <CardContent className="flex justify-center items-center h-48">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </CardContent>
        </Card>
    );
  }
  
  if (clientAccommodations.length === 0) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
            <BedDouble className="h-6 w-6" />
            Local Stays
        </CardTitle>
        <CardDescription>Find places to stay in and around the community.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {clientAccommodations.slice(0, 3).map(business => (
            <BusinessCard key={business.id} business={business as any} />
          ))}
        </div>
      </CardContent>
      <CardFooter>
        <Button variant="outline" asChild>
            <Link href="/directory?category=accommodation">
                See All Accommodations <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
        </Button>
      </CardFooter>
    </Card>
  );
}
