
'use client';
import { useUser, useFirestore, useDoc, useMemoFirebase, useCollection } from '@/firebase';
import { doc, collection, query, where, limit } from 'firebase/firestore';
import { Card, CardContent, CardHeader, CardTitle, CardFooter, CardDescription } from './ui/card';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { Button } from './ui/button';
import { Skeleton } from './ui/skeleton';
import { User as UserIcon, Bell, BellOff, Globe, Heart, BadgeHelp, Compass, MapPin, Home as HomeIcon, Hotel, Utensils, Ticket, ShoppingBag, Sparkles, Target } from 'lucide-react';
import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { updateUserFavouriteCommunitiesAction, returnToHomeCommunityAction } from '@/lib/actions/userActions';

import { type Notification } from '@/lib/types/notifications';
import { Badge } from './ui/badge';

interface WelcomeCardsProps {
  activeCommunityId?: string | null;
  activeCommunity?: any;
}

export function WelcomeCards({ activeCommunityId, activeCommunity }: WelcomeCardsProps) {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const router = useRouter();
  const { toast } = useToast();
  
  const [notificationsAllowed, setNotificationsAllowed] = React.useState(true);

  const userProfileRef = useMemoFirebase(() => {
    if (!user || !firestore) return null;
    return doc(firestore, 'users', user.uid);
  }, [user, firestore]);

  const { data: userProfile, isLoading: isProfileLoading } = useDoc(userProfileRef);

  const homeCommunityId = userProfile?.primaryHomeCommunityId || userProfile?.homeCommunityId || userProfile?.communityId;
  const homeCommunityName = userProfile?.primaryHomeCommunityName || userProfile?.homeCommunityName || userProfile?.communityName || 'Home Community';

  const effectiveCommunityId = activeCommunityId || homeCommunityId;
  const effectiveCommunityName = activeCommunity?.name || (effectiveCommunityId === homeCommunityId ? homeCommunityName : 'Visiting Community');
  
  const isVisiting = Boolean(effectiveCommunityId && homeCommunityId && effectiveCommunityId !== homeCommunityId);

  const pollsQuery = useMemoFirebase(() => {
    if (!effectiveCommunityId || !firestore) return null;
    return query(
        collection(firestore, `communities/${effectiveCommunityId}/polls`),
        where('status', '==', 'active'),
        limit(1)
    );
  }, [effectiveCommunityId, firestore]);
  const { data: activePolls, isLoading: pollsLoading } = useCollection(pollsQuery);

  const petitionsQuery = useMemoFirebase(() => {
    if (!effectiveCommunityId || !firestore) return null;
    return query(
        collection(firestore, `communities/${effectiveCommunityId}/petitions`),
        where('status', '==', 'active'),
        limit(1)
    );
  }, [effectiveCommunityId, firestore]);
  const { data: activePetitions, isLoading: petitionsLoading } = useCollection(petitionsQuery);

  const notificationsQuery = useMemoFirebase(() => {
    if (!user || !firestore) return null;
    return query(
        collection(firestore, "notifications"), 
        where("recipientId", "==", user.uid),
        where("status", "==", "new")
    );
  }, [user, firestore]);
  const { data: newNotifications, isLoading: notificationsLoading } = useCollection<Notification>(notificationsQuery);

  React.useEffect(() => {
    if (userProfile) {
        const mailingLists = (userProfile as any)?.mailingLists || {};
        const pushEnabled = 'Notification' in window && Notification.permission === 'granted';
        setNotificationsAllowed((mailingLists.standard !== false || mailingLists.emergency !== false) && pushEnabled);
    }
  }, [userProfile]);

  const isLoading = isUserLoading || isProfileLoading || pollsLoading || petitionsLoading || notificationsLoading;
  const notificationCount = newNotifications?.length || 0;
  const isNationalAdvertiser = userProfile?.accountType === 'national';
  
  const isFavourited = userProfile?.favouriteCommunities?.includes(effectiveCommunityId);

  const handleToggleFavourite = async () => {
    if (!user || !effectiveCommunityId) {
        toast({ title: 'Error', description: 'Could not update favourites.', variant: 'destructive' });
        return;
    }
    const result = await updateUserFavouriteCommunitiesAction({
        userId: user.uid,
        communityId: effectiveCommunityId,
        isFavourited: !!isFavourited
    });
    if (result.success) {
        toast({ title: 'Favourites Updated' });
    } else {
        toast({ title: 'Error', description: result.error, variant: 'destructive' });
    }
  };

  const handleReturnHome = async () => {
    if (typeof window !== 'undefined') {
      sessionStorage.removeItem('visitedCommunityId');
      sessionStorage.removeItem('visitedCommunityName');
    }
    if (user) {
      await returnToHomeCommunityAction({ userId: user.uid });
    }
    window.location.href = '/home';
  };


  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Left Card: Welcome & Notifications */}
      <Card className="border-0 md:border rounded-none md:rounded-lg flex flex-col">
        <CardContent className="p-4 md:p-6 flex items-center gap-4 flex-grow">
          {isLoading ? (
            <Skeleton className="h-14 w-14 rounded-full" />
          ) : (
            <Avatar className="h-14 w-14 border">
              <AvatarImage
                src={userProfile?.avatar}
                alt={userProfile?.name || 'User Avatar'}
              />
              <AvatarFallback>
                {userProfile?.name ? userProfile.name.split(' ').map((n: string) => n[0]).join('') : <UserIcon />}
              </AvatarFallback>
            </Avatar>
          )}
          <div className="flex-1">
            {isLoading ? (
              <div className="space-y-2">
                <Skeleton className="h-6 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
                <Skeleton className="h-4 w-2/3" />
              </div>
            ) : (
              <>
                <p className="text-xl font-semibold">
                  Welcome back, {userProfile?.firstName || userProfile?.name?.split(' ')[0] || 'Member'}!
                </p>
                 {isNationalAdvertiser ? (
                    <div className="text-sm text-muted-foreground mt-1">
                      <p>As a National Advertiser, this page is a preview of how your adverts appear in a live community.</p>
                      <p>Use the user menu to visit other communities.</p>
                    </div>
                 ) : notificationsAllowed ? (
                    <div className="text-sm text-muted-foreground mt-1 flex items-center">
                        <Bell className="h-4 w-4 mr-1.5 shrink-0" />
                        {notificationCount > 0
                            ? `You have ${notificationCount} unread notification${notificationCount > 1 ? 's' : ''}.`
                            : "You have no unread notifications."
                        }
                    </div>
                 ) : (
                    <div className="mt-2 text-sm text-muted-foreground flex items-center">
                        <BellOff className="h-4 w-4 mr-1.5 shrink-0" />
                       <span>Notifications are currently disabled.</span>
                        <Button size="sm" variant="link" className="p-1 h-auto" asChild>
                            <Link href="/settings">Manage Settings</Link>
                        </Button>
                    </div>
                )}
              </>
            )}
          </div>
        </CardContent>
          {!isLoading && ((activePolls && activePolls.length > 0) || (activePetitions && activePetitions.length > 0)) && (
            <CardFooter className="p-4 md:p-6 pt-0 border-t mt-4">
                <div className="w-full space-y-3">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <BadgeHelp className="h-5 w-5 text-indigo-600 dark:text-indigo-400"/>
                            <h4 className="font-bold text-sm text-foreground">Have Your Say!</h4>
                        </div>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-amber-700 bg-amber-50 dark:bg-amber-950/40 dark:text-amber-300 px-2 py-0.5 rounded border border-amber-200 dark:border-amber-800">
                          Civic Action
                        </span>
                    </div>

                    <p className="text-xs text-muted-foreground">
                        {activePolls && activePolls.length > 0 && activePetitions && activePetitions.length > 0
                          ? "New community polls & local petitions are active and waiting for your participation."
                          : activePolls && activePolls.length > 0
                          ? "There's a new community poll waiting for your vote."
                          : "There's an active local petition waiting for your support."}
                    </p>

                    <div className={cn(
                      "grid gap-2",
                      activePolls && activePolls.length > 0 && activePetitions && activePetitions.length > 0
                        ? "grid-cols-1 sm:grid-cols-2"
                        : "grid-cols-1"
                    )}>
                      {activePolls && activePolls.length > 0 && (
                        <Button asChild className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs">
                          <Link href="/polls" className="flex items-center justify-center gap-1.5">
                            <BadgeHelp className="h-4 w-4" />
                            <span>View & Vote Polls</span>
                          </Link>
                        </Button>
                      )}

                      {activePetitions && activePetitions.length > 0 && (
                        <Button asChild className="w-full bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs">
                          <Link href="/campaigns" className="flex items-center justify-center gap-1.5">
                            <Target className="h-4 w-4" />
                            <span>View & Sign Petitions</span>
                          </Link>
                        </Button>
                      )}
                    </div>
                </div>
            </CardFooter>
        )}
      </Card>

      {/* Right Card: Visitor Guide (if visiting another community) OR Your Home Community */}
      {isVisiting ? (
        <Card className="border-0 md:border rounded-none md:rounded-lg border-emerald-500/30 bg-emerald-50/40 dark:bg-emerald-950/20 shadow-sm flex flex-col justify-between">
          <CardHeader className="p-4 md:p-6 pb-2 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Compass className="h-5 w-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <CardTitle className="text-xl font-bold font-headline text-foreground">
                Visitor Guide & Overview
              </CardTitle>
            </div>
            <Badge variant="outline" className="w-fit bg-emerald-100 text-emerald-800 border-emerald-300 text-xs font-semibold">
              🌐 Visiting Mode
            </Badge>
          </CardHeader>
          <CardContent className="p-4 md:p-6 pt-2 space-y-4 flex-1 flex flex-col justify-between">
            <div className="space-y-3">
              <p className="text-sm leading-relaxed text-foreground">
                Browse local events, shops, marketplace items, and attractions for <strong className="text-emerald-700 dark:text-emerald-400 font-bold">{effectiveCommunityName}</strong>, or return to your locked Home Community (<strong className="text-foreground font-bold">{homeCommunityName}</strong>).
              </p>

              {/* Quick Visitor Shortcuts */}
              <div className="space-y-2 pt-1">
                <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-800 dark:text-emerald-300 flex items-center gap-1.5">
                  <Sparkles className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" /> Quick Visitor Shortcuts:
                </span>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <a 
                    href="#section-accommodation"
                    onClick={(e) => {
                      e.preventDefault();
                      document.getElementById('section-accommodation')?.scrollIntoView({ behavior: 'smooth' });
                    }}
                    className="p-2.5 rounded-xl border bg-card hover:bg-emerald-100/70 dark:hover:bg-emerald-900/40 border-emerald-200 dark:border-emerald-800/60 transition-all text-center flex flex-col items-center gap-1.5 group shadow-2xs cursor-pointer"
                  >
                    <Hotel className="h-4 w-4 text-emerald-600 dark:text-emerald-400 group-hover:scale-110 transition-transform" />
                    <span className="text-[11px] font-bold text-foreground group-hover:text-emerald-700 dark:group-hover:text-emerald-300">Stays & Hotels</span>
                  </a>

                  <a 
                    href="#section-businesses"
                    onClick={(e) => {
                      e.preventDefault();
                      document.getElementById('section-businesses')?.scrollIntoView({ behavior: 'smooth' });
                    }}
                    className="p-2.5 rounded-xl border bg-card hover:bg-emerald-100/70 dark:hover:bg-emerald-900/40 border-emerald-200 dark:border-emerald-800/60 transition-all text-center flex flex-col items-center gap-1.5 group shadow-2xs cursor-pointer"
                  >
                    <Utensils className="h-4 w-4 text-emerald-600 dark:text-emerald-400 group-hover:scale-110 transition-transform" />
                    <span className="text-[11px] font-bold text-foreground group-hover:text-emerald-700 dark:group-hover:text-emerald-300">Dining & Pubs</span>
                  </a>

                  <a 
                    href="#section-whatson"
                    onClick={(e) => {
                      e.preventDefault();
                      document.getElementById('section-whatson')?.scrollIntoView({ behavior: 'smooth' });
                    }}
                    className="p-2.5 rounded-xl border bg-card hover:bg-emerald-100/70 dark:hover:bg-emerald-900/40 border-emerald-200 dark:border-emerald-800/60 transition-all text-center flex flex-col items-center gap-1.5 group shadow-2xs cursor-pointer"
                  >
                    <Ticket className="h-4 w-4 text-emerald-600 dark:text-emerald-400 group-hover:scale-110 transition-transform" />
                    <span className="text-[11px] font-bold text-foreground group-hover:text-emerald-700 dark:group-hover:text-emerald-300">What&apos;s On & Sights</span>
                  </a>

                  <a 
                    href="#section-shopping"
                    onClick={(e) => {
                      e.preventDefault();
                      document.getElementById('section-shopping')?.scrollIntoView({ behavior: 'smooth' });
                    }}
                    className="p-2.5 rounded-xl border bg-card hover:bg-emerald-100/70 dark:hover:bg-emerald-900/40 border-emerald-200 dark:border-emerald-800/60 transition-all text-center flex flex-col items-center gap-1.5 group shadow-2xs cursor-pointer"
                  >
                    <ShoppingBag className="h-4 w-4 text-emerald-600 dark:text-emerald-400 group-hover:scale-110 transition-transform" />
                    <span className="text-[11px] font-bold text-foreground group-hover:text-emerald-700 dark:group-hover:text-emerald-300">Local Shopping</span>
                  </a>
                </div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-3 border-t border-emerald-200/60 dark:border-emerald-900/60">
              <Button 
                onClick={handleReturnHome}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-sm flex-1"
              >
                <HomeIcon className="mr-1.5 h-3.5 w-3.5" /> Return to {homeCommunityName}
              </Button>
              <Button variant="outline" size="sm" asChild className="text-xs font-semibold border-emerald-300 text-emerald-800 dark:text-emerald-300 hover:bg-emerald-100 shrink-0">
                <Link href={`/community/${effectiveCommunityId}/about`}>
                  About {effectiveCommunityName}
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card className="border-0 md:border rounded-none md:rounded-lg">
          <CardHeader className="p-4 md:p-6 pb-2 flex-row items-center justify-between">
            <CardTitle className="text-xl font-bold font-headline">
              {isNationalAdvertiser ? "National Advertiser View" : "Your Home Community"}
            </CardTitle>
            {!isNationalAdvertiser && (
              <Button variant="ghost" size="icon" onClick={handleToggleFavourite}>
                <Heart className={cn("h-6 w-6 text-muted-foreground transition-colors", isFavourited && "fill-red-500 text-red-500")} />
              </Button>
            )}
          </CardHeader>
          <CardContent className="p-4 md:p-6 pt-0">
            {isLoading ? (
              <div className="space-y-3">
                <Skeleton className="h-5 w-4/5" />
                <Skeleton className="h-10 w-1/2" />
              </div>
            ) : isNationalAdvertiser ? (
              <div className="space-y-3 text-sm text-muted-foreground">
                <p>As a National Advertiser, you don't have a specific home community. This page serves as a preview of how your adverts will appear within a live community hub.</p>
                <p>Use the user menu to visit other communities.</p>
              </div>
            ) : (
              <div className="flex flex-col items-start gap-3">
                <p className="text-muted-foreground text-sm">
                  You are currently in your locked Home Community: <span className="font-bold text-foreground">{homeCommunityName}</span>.
                </p>
                <Button variant="outline" size="sm" asChild className="text-xs font-semibold">
                  <Link href={`/community/${effectiveCommunityId || userProfile?.communityId}/about`}>About {homeCommunityName}</Link>
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
    