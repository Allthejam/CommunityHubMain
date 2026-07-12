
'use client';

import * as React from 'react';
import PostCard from '@/components/post-card'
import { Plus, Info } from 'lucide-react'
import type { Post } from '@/components/post-card';
import MainAppLayout from '../(main)/layout'
import { cn } from '@/lib/utils';
import { ReportItemForm } from '@/components/report-item-form'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useCollection, useFirestore, useUser, useMemoFirebase, useDoc } from '@/firebase';
import { collection, query, where, Timestamp, doc } from 'firebase/firestore';
import { Loader2 } from 'lucide-react';
import { type Item as LeaderItem } from '../leader/lost-and-found/page';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

type Item = Omit<LeaderItem, 'date'> & {
    date: Timestamp;
    reporterName: string;
    communityId: string;
};

function itemToPost(item: Item): Post {
    return {
        id: item.id,
        author: item.reporterName,
        authorId: (item as any).ownerId, // Assuming ownerId is on the item for contact purposes
        authorAvatar: '', // This can be improved later to fetch author's avatar
        timestamp: item.date.toDate().toLocaleDateString(),
        content: `${item.description}. Last seen near ${item.location}.`,
        image: item.image || null,
        likes: 0,
        comments: 0,
        status: item.status,
        communityId: item.communityId, // Pass communityId through
    }
}

function LostAndFoundContent() {
  const { user, isUserLoading } = useUser();
  const db = useFirestore();

  const userProfileRef = useMemoFirebase(() => (user ? doc(db, 'users', user.uid) : null), [user, db]);
  const { data: userProfile, isLoading: profileLoading } = useDoc(userProfileRef);
  const communityId = userProfile?.communityId;
  
  const activeItemsQuery = useMemoFirebase(() => 
    communityId && db
      ? query(
          collection(db, 'lostAndFound'),
          where('status', '==', 'active'),
          where('communityId', '==', communityId)
        )
      : null
  , [communityId, db]);

  const userPendingItemsQuery = useMemoFirebase(() =>
    user?.uid && communityId && db
      ? query(
          collection(db, 'lostAndFound'),
          where('status', '==', 'new'),
          where('ownerId', '==', user.uid),
          where('communityId', '==', communityId)
        )
      : null
  , [user, communityId, db]);


  const { data: activeItems, isLoading: activeItemsLoading } = useCollection<Item>(activeItemsQuery);
  const { data: pendingItems, isLoading: pendingItemsLoading } = useCollection<Item>(userPendingItemsQuery);

  const loading = isUserLoading || profileLoading || activeItemsLoading || pendingItemsLoading;

  const allItems = React.useMemo(() => {
    const combined = [...(activeItems || [])];
    const activeIds = new Set(combined.map(item => item.id));
    
    if (pendingItems) {
      pendingItems.forEach(item => {
        if (!activeIds.has(item.id)) {
          combined.push(item);
        }
      });
    }
    
    const twentyEightDaysAgo = new Date();
    twentyEightDaysAgo.setDate(twentyEightDaysAgo.getDate() - 28);
    
    return combined.filter(item => {
        try {
            // Try the 'date' field first, then fall back to 'createdAt'
            const rawDate = item.date || (item as any).createdAt;
            if (!rawDate) return false; // No date at all — hide it
            const itemDate = rawDate?.toDate ? rawDate.toDate() : new Date(rawDate);
            if (isNaN(itemDate.getTime())) return false; // Invalid date — hide it
            return itemDate >= twentyEightDaysAgo;
        } catch (e) {
            console.error("Error parsing date for item:", item, e);
            return false; // If we can't parse the date, assume it's expired
        }
    });
  }, [activeItems, pendingItems]);


  const lostPosts = allItems?.filter(item => item.type === 'lost').map(itemToPost) || [];
  const foundPosts = allItems?.filter(item => item.type === 'found').map(itemToPost) || [];

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            Lost & Found
            </h1>
            <p className="mt-2 text-muted-foreground">
            Help neighbors find their lost items.
            </p>
        </div>
        <ReportItemForm />
      </div>

      <Alert className="bg-amber-50/50 border-amber-200/60 dark:bg-amber-950/20 dark:border-amber-900/50">
        <Info className="h-4 w-4 text-amber-600 dark:text-amber-400" />
        <AlertTitle className="text-amber-800 dark:text-amber-300 font-semibold">Post Auto-Removal Notice</AlertTitle>
        <AlertDescription className="text-amber-700/90 dark:text-amber-400/90 text-sm">
          To keep the board clean, all reports are automatically removed 28 days (4 weeks) after the reported date unless they are manually resolved or deleted sooner by the poster.
        </AlertDescription>
      </Alert>

      <Tabs defaultValue="lost" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger
            value="lost"
            className="data-[state=active]:bg-red-100 data-[state=active]:text-red-700 data-[state=active]:font-bold data-[state=active]:shadow-inner dark:data-[state=active]:bg-red-900/50 dark:data-[state=active]:text-red-200"
          >
            Lost Items
          </TabsTrigger>
          <TabsTrigger
            value="found"
            className="data-[state=active]:bg-blue-100 data-[state=active]:text-blue-700 data-[state=active]:font-bold data-[state=active]:shadow-inner dark:data-[state=active]:bg-blue-900/50 dark:data-[state=active]:text-blue-200"
          >
            Found Items
          </TabsTrigger>
        </TabsList>
        <TabsContent value="lost" className="mt-6">
            {loading ? (
              <div className="flex justify-center items-center h-48"><Loader2 className="animate-spin h-8 w-8" /></div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                  {lostPosts.length > 0 ? lostPosts.map(post => <PostCard key={`lost-${post.id}`} post={post} />) : <p className="col-span-full text-center text-muted-foreground">No lost items reported.</p>}
              </div>
            )}
        </TabsContent>
        <TabsContent value="found" className="mt-6">
             {loading ? (
              <div className="flex justify-center items-center h-48"><Loader2 className="animate-spin h-8 w-8" /></div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                  {foundPosts.length > 0 ? foundPosts.map(post => <PostCard key={`found-${post.id}`} post={post} />) : <p className="col-span-full text-center text-muted-foreground">No found items reported.</p>}
              </div>
            )}
        </TabsContent>
      </Tabs>
    </div>
  )
}


export default function LostAndFoundPage() {
    return (
        <MainAppLayout>
            <LostAndFoundContent />
        </MainAppLayout>
    )
}
