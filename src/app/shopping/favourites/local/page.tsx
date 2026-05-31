

'use client';

import * as React from 'react';
import { useUser, useFirestore, useCollection, useMemoFirebase, useDoc } from '@/firebase';
import { collection, query, where, documentId, doc } from 'firebase/firestore';
import { Loader2, Heart } from 'lucide-react';
import Link from 'next/link';
import BusinessCard from '@/components/business-card';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';

type Business = {
  id: string;
  businessName: string;
  businessCategory?: string;
  logoImage?: string;
  shortDescription: string;
  status: "Pending Approval" | "Approved" | "Requires Amendment" | "Declined" | "Subscribed" | "Draft";
  primaryCommunityId: string;
  storefrontSubscription?: boolean;
};

export default function LocalFavouritesPage() {
    const { user, isUserLoading } = useUser();
    const db = useFirestore();
    const userProfileRef = useMemoFirebase(() => (user ? doc(db, 'users', user.uid) : null), [user, db]);
    const { data: userProfile, isLoading: profileLoading } = useDoc(userProfileRef);

    const [activeCommunityId, setActiveCommunityId] = React.useState<string | null>(null);

    React.useEffect(() => {
        if (profileLoading) return;
        const visitedId = sessionStorage.getItem('visitedCommunityId');
        if (visitedId) {
          setActiveCommunityId(visitedId);
        } else if (userProfile?.communityId) {
          setActiveCommunityId(userProfile.communityId);
        } else {
          setActiveCommunityId(null);
        }
    }, [userProfile, profileLoading]);

    const favouriteIds = userProfile?.favouriteBusinesses || [];

    const favouritesQuery = useMemoFirebase(() => {
        if (!db || favouriteIds.length === 0) return null;
        // Firestore 'in' queries are limited to 10 items. For a production app, this would need chunking.
        return query(collection(db, 'businesses'), where(documentId(), 'in', favouriteIds.slice(0, 30)));
    }, [db, favouriteIds]);
    
    const { data: favouriteBusinesses, isLoading: favouritesLoading } = useCollection<Business>(favouritesQuery);

    const localFavourites = React.useMemo(() => {
        if (!favouriteBusinesses || !activeCommunityId) return [];
        return favouriteBusinesses.filter(b => 
            b.primaryCommunityId === activeCommunityId &&
            b.storefrontSubscription && 
            (b.status === 'Subscribed' || b.status === 'Approved')
        );
    }, [favouriteBusinesses, activeCommunityId]);
    
    const loading = isUserLoading || profileLoading || favouritesLoading;

    return (
        <div className="space-y-8">
            <div>
                <Button asChild variant="ghost" className="mb-4">
                    <Link href="/shopping">
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Back to Shopping
                    </Link>
                </Button>
                <h1 className="text-3xl font-bold tracking-tight font-headline flex items-center gap-2">
                    <Heart className="h-8 w-8 text-primary" />
                    My Favourite Local Businesses
                </h1>
                <p className="text-muted-foreground">
                    A collection of your favourite shops and services in your current community.
                </p>
            </div>

            {loading ? (
                <div className="flex justify-center items-center h-64">
                    <Loader2 className="h-8 w-8 animate-spin" />
                </div>
            ) : localFavourites && localFavourites.length > 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6">
                    {localFavourites.map(business => (
                        <BusinessCard key={business.id} business={business as any} />
                    ))}
                </div>
            ) : (
                <div className="text-center py-16">
                    <p className="text-muted-foreground">You haven't added any businesses from this community to your favourites yet.</p>
                </div>
            )}
        </div>
    );
}
