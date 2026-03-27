
'use client';
import * as React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { lostItems as mockLostItems, foundItems as mockFoundItems } from '@/lib/mock-data';
import { Button } from './ui/button';
import Link from 'next/link';
import { Search, Package, Loader2 } from 'lucide-react';
import { useUser, useFirestore, useDoc, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, where, doc } from 'firebase/firestore';
import type { Item as LostFoundItem } from '@/app/leader/lost-and-found/page';

export function LostAndFoundFeed() {
  const { user, isUserLoading: authLoading } = useUser();
  const db = useFirestore();

  const userProfileRef = useMemoFirebase(() => (user && db ? doc(db, 'users', user.uid) : null), [user, db]);
  const { data: userProfile, isLoading: profileLoading } = useDoc(userProfileRef);

  const itemsQuery = useMemoFirebase(() => {
    if (!userProfile?.communityId || !db) return null;
    return query(
        collection(db, "lostAndFound"),
        where("communityId", "==", userProfile.communityId),
        where("status", "==", "active")
    );
  }, [db, userProfile?.communityId]);
  
  const { data: liveItems, isLoading: itemsLoading } = useCollection<LostFoundItem>(itemsQuery);

  const loading = authLoading || profileLoading || itemsLoading;

  const lostItems = (liveItems && liveItems.length > 0)
    ? liveItems.filter(item => item.type === 'lost')
    : mockLostItems.map(item => ({...item, name: item.description}));

  const foundItems = (liveItems && liveItems.length > 0)
    ? liveItems.filter(item => item.type === 'found')
    : mockFoundItems.map(item => ({...item, name: item.description}));
    
  if (loading) {
    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Search className="h-6 w-6" />
                    Lost & Found
                </CardTitle>
                <CardDescription>Help reconnect lost items with their owners.</CardDescription>
            </CardHeader>
            <CardContent className="h-48 flex justify-center items-center">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </CardContent>
        </Card>
    );
  }

  if (lostItems.length === 0 && foundItems.length === 0) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
            <Search className="h-6 w-6" />
            Lost & Found
        </CardTitle>
        <CardDescription>Help reconnect lost items with their owners.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid md:grid-cols-2 gap-8">
            <div>
                <h3 className="font-semibold mb-4 flex items-center gap-2 text-destructive">
                    <Search className="h-5 w-5" />
                    Recently Lost
                </h3>
                <div className="space-y-4">
                    {lostItems.slice(0, 3).map(item => (
                        <div key={item.id} className="flex items-center justify-between">
                            <div>
                                <p className="font-medium">{(item as any).name || item.description}</p>
                                <p className="text-sm text-muted-foreground">{(item as any).location}</p>
                            </div>
                            <Button asChild variant="secondary" size="sm">
                                <Link href={`/lost-and-found`}>Details</Link>
                            </Button>
                        </div>
                    ))}
                     {lostItems.length === 0 && <p className="text-sm text-muted-foreground">No lost items reported.</p>}
                </div>
            </div>
            <div>
                <h3 className="font-semibold mb-4 flex items-center gap-2 text-green-600">
                    <Package className="h-5 w-5" />
                    Recently Found
                </h3>
                 <div className="space-y-4">
                    {foundItems.slice(0, 3).map(item => (
                        <div key={item.id} className="flex items-center justify-between">
                            <div>
                                <p className="font-medium">{(item as any).name || item.description}</p>
                                <p className="text-sm text-muted-foreground">{(item as any).location}</p>
                            </div>
                             <Button asChild variant="secondary" size="sm">
                                <Link href={`/lost-and-found`}>Details</Link>
                            </Button>
                        </div>
                    ))}
                    {foundItems.length === 0 && <p className="text-sm text-muted-foreground">No found items reported.</p>}
                </div>
            </div>
        </div>
      </CardContent>
    </Card>
  );
}
