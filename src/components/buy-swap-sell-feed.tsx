'use client';
import * as React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { Button } from './ui/button';
import Link from 'next/link';
import { ShoppingCart, Loader2 } from 'lucide-react';
import { useUser, useFirestore, useDoc, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, where, doc, Timestamp } from 'firebase/firestore';

type MarketplaceItem = {
    id: string;
    title: string;
    price?: number;
    listingType: 'For Sale' | 'To Swap' | 'Free' | 'Looking For';
    expiresAt: Timestamp;
}

export function BuySwapSellFeed() {
  const { user, isUserLoading: authLoading } = useUser();
  const db = useFirestore();

  const userProfileRef = useMemoFirebase(() => (user && db ? doc(db, 'users', user.uid) : null), [user, db]);
  const { data: userProfile, isLoading: profileLoading } = useDoc(userProfileRef);
  const communityId = userProfile?.communityId;

  const itemsQuery = useMemoFirebase(() => {
    if (!communityId || !db) return null;
    return query(
        collection(db, `communities/${communityId}/marketplace`),
        where("status", "==", "active")
    );
  }, [communityId, db]);

  const { data: items, isLoading: itemsLoading } = useCollection<MarketplaceItem>(itemsQuery);

  const loading = authLoading || profileLoading || itemsLoading;

  const activeItems = React.useMemo(() => {
    if (!items) return [];
    const now = new Date();
    return items.filter(item => item.expiresAt && item.expiresAt.toDate() > now);
  }, [items]);

  if (loading) {
    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <ShoppingCart className="h-6 w-6" />
                    Local Buy, Swap & Sell
                </CardTitle>
            </CardHeader>
            <CardContent className="h-36 flex justify-center items-center">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </CardContent>
        </Card>
    );
  }
  
  if (!activeItems || activeItems.length === 0) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
            <ShoppingCart className="h-6 w-6" />
            Local Buy, Swap & Sell
        </CardTitle>
        <CardDescription>Items for sale or trade from your neighbors.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
            {activeItems.slice(0,3).map(item => (
                <div key={item.id} className="flex items-center justify-between">
                    <div>
                        <p className="font-medium">{item.title}</p>
                        <p className="text-sm text-muted-foreground">
                            {item.listingType === 'For Sale' && item.price ? `£${item.price.toFixed(2)}` : item.listingType}
                        </p>
                    </div>
                    <Button asChild variant="secondary" size="sm">
                        <Link href={`/marketplace`}>View</Link>
                    </Button>
                </div>
            ))}
        </div>
      </CardContent>
    </Card>
  );
}
