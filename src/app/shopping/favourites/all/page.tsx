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
};

export default function AllFavouritesPage() {
    const { user, isUserLoading } = useUser();
    const db = useFirestore();
    const userProfileRef = useMemoFirebase(() => (user ? doc(db, 'users', user.uid) : null), [user, db]);
    const { data: userProfile, isLoading: profileLoading } = useDoc(userProfileRef);

    const favouriteIds = userProfile?.favouriteBusinesses || [];

    const favouritesQuery = useMemoFirebase(() => {
        if (!db || favouriteIds.length === 0) return null;
        return query(collection(db, 'businesses'), where(documentId(), 'in', favouriteIds.slice(0, 10)));
    }, [db, favouriteIds]);
    
    const { data: favouriteBusinesses, isLoading: favouritesLoading } = useCollection<Business>(favouritesQuery);
    
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
                    All My Favourite Businesses
                </h1>
                <p className="text-muted-foreground">
                    A collection of all your favourite shops and services across all communities.
                </p>
            </div>

            {loading ? (
                <div className="flex justify-center items-center h-64">
                    <Loader2 className="h-8 w-8 animate-spin" />
                </div>
            ) : favouriteBusinesses && favouriteBusinesses.length > 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6">
                    {favouriteBusinesses.map(business => (
                        <Link key={business.id} href={`/businesses/${business.id}`} className="block h-full">
                            <BusinessCard business={business as any} />
                        </Link>
                    ))}
                </div>
            ) : (
                <div className="text-center py-16">
                    <p className="text-muted-foreground">You haven't added any businesses to your favourites yet.</p>
                </div>
            )}
        </div>
    );
}
