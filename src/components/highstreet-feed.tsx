
'use client';
import * as React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import Image from 'next/image';
import Link from 'next/link';
import { ShoppingBag, Loader2 } from 'lucide-react';
import { useUser, useFirestore, useDoc, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, where, doc } from 'firebase/firestore';

type Business = {
  id: string;
  businessName: string;
  logoImage?: string;
};

export function HighstreetFeed() {
  const { user, isUserLoading: authLoading } = useUser();
  const db = useFirestore();

  const userProfileRef = useMemoFirebase(() => (user && db ? doc(db, 'users', user.uid) : null), [user, db]);
  const { data: userProfile, isLoading: profileLoading } = useDoc(userProfileRef);

  const businessesQuery = useMemoFirebase(() => {
    if (!userProfile?.communityId || !db) return null;
    return query(
      collection(db, "businesses"),
      where("primaryCommunityId", "==", userProfile.communityId),
      where("status", "==", "Subscribed"),
      where("storefrontSubscription", "==", true)
    );
  }, [db, userProfile?.communityId]);

  const { data: liveBusinesses, isLoading: businessesLoading } = useCollection<Business>(businessesQuery);
  
  const businessesToDisplay = (liveBusinesses && liveBusinesses.length > 0) ? liveBusinesses : [];
  const extendedBusinesses = [...businessesToDisplay, ...businessesToDisplay];

  const loading = authLoading || profileLoading || businessesLoading;

  if (loading) {
    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <ShoppingBag className="h-6 w-6" />
                    Visit the Highstreet
                </CardTitle>
                <CardDescription>Take a stroll down our virtual highstreet and discover your new favourite local shop.</CardDescription>
            </CardHeader>
            <CardContent className="h-32 flex justify-center items-center">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </CardContent>
        </Card>
    );
  }

  if (businessesToDisplay.length === 0) {
      return null;
  }

  return (
    <Card className="overflow-hidden">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
            <ShoppingBag className="h-6 w-6" />
            Visit the Highstreet
        </CardTitle>
        <CardDescription>Take a stroll down our virtual highstreet and discover your new favourite local shop.</CardDescription>
      </CardHeader>
      <CardContent>
        <div
          className="w-full inline-flex flex-nowrap"
        >
          <div className="flex items-center justify-center md:justify-start [&_>_*]:mx-4 animate-marquee">
            {extendedBusinesses.map((business, index) => (
                <Link href={`/shopping/store/${business.id}`} key={`${business.id}-${index}`} className="block group w-32 flex-shrink-0">
                    <Card className="overflow-hidden h-full hover:shadow-md transition-shadow">
                        <div className="relative aspect-square w-full p-2">
                        {business.logoImage && (
                            <Image
                                src={business.logoImage}
                                alt={business.businessName}
                                fill
                                className="object-contain p-2 transition-transform duration-300 group-hover:scale-105"
                                data-ai-hint="company logo"
                            />
                        )}
                        </div>
                        <div className="p-2 bg-muted/50">
                            <h4 className="font-semibold text-xs truncate text-center">{business.businessName}</h4>
                        </div>
                    </Card>
                </Link>
            ))}
          </div>
           <div className="flex items-center justify-center md:justify-start [&_>_*]:mx-4 animate-marquee" aria-hidden="true">
            {extendedBusinesses.map((business, index) => (
                <Link href={`/shopping/store/${business.id}`} key={`duplicate-${business.id}-${index}`} className="block group w-32 flex-shrink-0">
                    <Card className="overflow-hidden h-full hover:shadow-md transition-shadow">
                        <div className="relative aspect-square w-full p-2">
                        {business.logoImage && (
                            <Image
                                src={business.logoImage}
                                alt={business.businessName}
                                fill
                                className="object-contain p-2 transition-transform duration-300 group-hover:scale-105"
                                data-ai-hint="company logo"
                            />
                        )}
                        </div>
                        <div className="p-2 bg-muted/50">
                            <h4 className="font-semibold text-xs truncate text-center">{business.businessName}</h4>
                        </div>
                    </Card>
                </Link>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
