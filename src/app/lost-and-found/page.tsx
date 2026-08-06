
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
  const communityId = (typeof window !== 'undefined' ? sessionStorage.getItem('visitedCommunityId') : null) || userProfile?.primaryHomeCommunityId || userProfile?.homeCommunityId || userProfile?.communityId;
  
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
          where('status', '==', 'pending_approval'),
          where('ownerId', '==', user.uid),
          where('communityId', '==', communityId)
        )
      : null
  , [user?.uid, communityId, db]);


  const { data: activeItems, isLoading: activeLoading } = useCollection<Item>(activeItemsQuery);
  const { data: pendingItems, isLoading: pendingLoading } = useCollection<Item>(userPendingItemsQuery);

  const loading = isUserLoading || profileLoading || activeLoading || pendingLoading;

  const allItems = React.useMemo(() => {
    const combined = [...(activeItems || []), ...(pendingItems || [])];
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
      {/* Amber & Indigo Shimmering Hero Header */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-amber-500/15 via-rose-500/15 to-indigo-500/15 border border-amber-500/20 p-6 md:p-10 shadow-lg backdrop-blur-sm">
        <div className="absolute -top-24 -right-24 w-72 h-72 bg-amber-500/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-72 h-72 bg-indigo-500/20 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-8">
          <div className="space-y-3 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-background/80 backdrop-blur-md border border-amber-500/30 text-xs font-semibold text-amber-600 dark:text-amber-400 shadow-xs">
              <Info className="h-3.5 w-3.5" />
              <span>Community Helper & Recovery</span>
            </div>

            <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight font-headline">
              <span className="bg-gradient-to-r from-amber-600 via-rose-600 to-indigo-600 dark:from-amber-400 dark:via-rose-400 dark:to-indigo-400 bg-clip-text text-transparent">
                Lost & Found
              </span>
            </h1>

            <p className="text-sm md:text-base text-muted-foreground leading-relaxed">
              Report lost pets, keys, or belongings, and browse items found by helpful neighbors across your community.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 shrink-0">
            <div className="p-4 rounded-2xl bg-background/80 backdrop-blur-md border border-border/80 shadow-xs flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-red-500/10 text-red-600 dark:text-red-400">
                <Info className="h-6 w-6" />
              </div>
              <div>
                <div className="text-xl font-bold">{lostPosts.length}</div>
                <div className="text-xs text-muted-foreground">Lost Items</div>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-background/80 backdrop-blur-md border border-border/80 shadow-xs flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400">
                <Plus className="h-6 w-6" />
              </div>
              <div>
                <div className="text-xl font-bold">{foundPosts.length}</div>
                <div className="text-xs text-muted-foreground">Found Items</div>
              </div>
            </div>

            <ReportItemForm />
          </div>
        </div>
      </div>

      <Alert className="bg-amber-50/50 border-amber-200/60 dark:bg-amber-950/20 dark:border-amber-900/50">
        <Info className="h-4 w-4 text-amber-600 dark:text-amber-400" />
        <AlertTitle className="text-amber-800 dark:text-amber-300 font-semibold">Post Auto-Removal Notice</AlertTitle>
        <AlertDescription className="text-amber-700/90 dark:text-amber-400/90 text-sm">
          To keep the board clean, all reports are automatically removed 28 days (4 weeks) after the reported date unless resolved sooner.
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
