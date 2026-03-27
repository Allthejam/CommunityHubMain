
'use client';

import * as React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from './ui/card';
import { Button } from './ui/button';
import Link from 'next/link';
import { ArrowRight, Loader2, BedDouble } from 'lucide-react';
import { useUser, useFirestore, useDoc, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, where, doc } from 'firebase/firestore';
import BusinessCard from '@/components/business-card';
import { businesses as mockBusinesses } from '@/lib/mock-data';

type Business = {
  id: string;
  businessName: string;
  businessCategory?: string;
  logoImage?: string;
  shortDescription: string;
  status: "Pending Approval" | "Approved" | "Requires Amendment" | "Declined" | "Subscribed" | "Draft";
};

export function AccommodationFeed() {
  const { user, isUserLoading: authLoading } = useUser();
  const db = useFirestore();

  const userProfileRef = useMemoFirebase(() => (user && db ? doc(db, 'users', user.uid) : null), [user, db]);
  const { data: userProfile, isLoading: profileLoading } = useDoc(userProfileRef);

  const accommodationCategories = ["hotel", "guest-house", "b-and-b", "holiday-let", "campsite"];

  const accommodationQuery = useMemoFirebase(() => {
    if (!userProfile?.communityId || !db) return null;
    return query(
      collection(db, "businesses"),
      where("primaryCommunityId", "==", userProfile.communityId),
      where("status", "in", ["Approved", "Subscribed"]),
      where("businessCategory", "in", accommodationCategories)
    );
  }, [db, userProfile?.communityId]);

  const { data: liveAccommodations, isLoading: accommodationsLoading } = useCollection<Business>(accommodationQuery);
  
  const accommodationsToDisplay = React.useMemo(() => {
    if (liveAccommodations && liveAccommodations.length > 0) {
      return liveAccommodations;
    }
    // Fallback to mock data if no live data is found
    // Repurpose some existing mocks to act as accommodation
    const mockStays = [
      { ...mockBusinesses.find(b => b.businessName === 'The Corner Bistro'), businessCategory: 'guest-house' },
      { ...mockBusinesses.find(b => b.businessName === 'Wellness Studio'), businessCategory: 'b-and-b' },
      { ...mockBusinesses.find(b => b.businessName === 'Knot & Grain'), businessCategory: 'holiday-let' },
    ].filter(Boolean); // Filter out any that weren't found
    
    // Only show mocks if the query has finished and returned no results
    if (!accommodationsLoading) {
      return mockStays as Business[];
    }
    return [];
  }, [liveAccommodations, accommodationsLoading]);
  
  const loading = authLoading || profileLoading || accommodationsLoading;

  if (loading && accommodationsToDisplay.length === 0) {
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
  
  if (accommodationsToDisplay.length === 0) {
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
          {accommodationsToDisplay.slice(0, 3).map(business => (
            <Link key={business.id} href={`/businesses/${business.id}`} className="block h-full">
                <BusinessCard business={business as any} />
            </Link>
          ))}
        </div>
      </CardContent>
      <CardFooter>
        <Button variant="outline" asChild>
            <Link href="/directory">
                See All Accommodations <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
        </Button>
      </CardFooter>
    </Card>
  );
}
