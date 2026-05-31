
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

  const accommodationCategoryValues = React.useMemo(() => accommodationCategories.map(c => c.value), []);

  const accommodationQuery = useMemoFirebase(() => {
    if (!communityId || !db) return null;
    return query(
      collection(db, "businesses"),
      where("primaryCommunityId", "==", communityId),
      where("status", "in", ["Approved", "Subscribed"]),
      where("businessCategory", "in", accommodationCategoryValues)
    );
  }, [db, communityId, accommodationCategoryValues]);

  const { data: liveAccommodations, isLoading: accommodationsLoading } = useCollection<Business>(accommodationQuery);
  
  const overallLoading = accommodationsLoading;

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
    const filterLive = (business: Business) => {
        if (business.status === 'Subscribed') {
            const expiryDate = toDate(business.listingSubscriptionExpiresAt);
            return !expiryDate || now <= expiryDate;
        }
        if (business.status === 'Approved' && business.createdAt) {
            const creationDate = toDate(business.createdAt);
            if (!creationDate) return false;
            return differenceInDays(now, creationDate) <= 14;
        }
        return false;
    };
    
    let liveFiltered = (liveAccommodations || []).filter(filterLive);
    
    if (liveFiltered.length > 0) {
      setClientAccommodations(liveFiltered);
    } else {
        const mockStays = [
            { ...mockBusinesses.find(b => b.businessName === 'The Corner Bistro'), businessCategory: 'guest-house' },
            { ...mockBusinesses.find(b => b.businessName === 'Wellness Studio'), businessCategory: 'b-and-b' },
            { ...mockBusinesses.find(b => b.businessName === 'Knot & Grain'), businessCategory: 'holiday-let' },
        ].filter(Boolean);
        setClientAccommodations(mockStays as Business[]);
    }
    setIsLoading(false);
  }, [JSON.stringify(liveAccommodations), overallLoading]);

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
