'use client';
import { useUser, useFirestore, useDoc, useMemoFirebase, useCollection } from '@/firebase';
import { doc, collection, query, where, limit } from 'firebase/firestore';
import { Card, CardContent, CardHeader, CardTitle, CardFooter, CardDescription } from './ui/card';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { Button } from './ui/button';
import { Skeleton } from './ui/skeleton';
import {
  User as UserIcon,
  Globe,
  Heart,
  BadgeHelp,
  Compass,
  MapPin,
  Home as HomeIcon,
  Hotel,
  Utensils,
  Ticket,
  ShoppingBag,
  Sparkles,
  Target,
  Vote,
  ShieldAlert,
  AlertTriangle
} from 'lucide-react';
import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { updateUserFavouriteCommunitiesAction, returnToHomeCommunityAction } from '@/lib/actions/userActions';
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

  // Real-time Emergency Plan Subscription for Active Alert Status
  const emergencyPlanRef = useMemoFirebase(() => {
    if (!effectiveCommunityId || !firestore) return null;
    return doc(firestore, `communities/${effectiveCommunityId}/emergency_plan/main`);
  }, [effectiveCommunityId, firestore]);
  const { data: emergencyPlan } = useDoc<any>(emergencyPlanRef);

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

  const isLoading = isUserLoading || isProfileLoading || pollsLoading || petitionsLoading;
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
        isFavourited: !isFavourited
    });
    if (result.success) {
        toast({
            title: isFavourited ? 'Removed from Favourites' : 'Added to Favourites',
            description: isFavourited ? `Removed ${effectiveCommunityName} from your favourite communities.` : `Added ${effectiveCommunityName} to your favourite communities.`
        });
    } else {
        toast({ title: 'Error', description: result.error || 'Failed to update favourites.', variant: 'destructive' });
    }
  };

  const handleReturnHome = async () => {
    if (!user) return;
    if (typeof window !== 'undefined') {
      sessionStorage.removeItem('visitedCommunityId');
      sessionStorage.removeItem('visitedCommunityName');
      window.dispatchEvent(new Event('community-change'));
    }
    returnToHomeCommunityAction({ userId: user.uid }).catch(console.error);
    toast({ title: 'Welcome Home!', description: `Returned to ${homeCommunityName}.` });
    router.push('/home');
    router.refresh();
  };

  const hasActiveParticipation = Boolean(activePolls && activePolls.length > 0) || Boolean(activePetitions && activePetitions.length > 0);

  // Emergency Alert Properties: Only active when status is amber/red AND there is a published notice/message
  const threatStatus = emergencyPlan?.currentThreatStatus || 'normal';
  const isEmergencyPublic = emergencyPlan?.isPublicOnAboutPage !== false;
  const hasActiveNotice = emergencyPlan?.officialNotice?.isActive && Boolean(emergencyPlan?.officialNotice?.headline || emergencyPlan?.officialNotice?.message);
  
  const isRedAlert = isEmergencyPublic && threatStatus === 'incident' && hasActiveNotice;
  const isAmberAlert = isEmergencyPublic && threatStatus === 'advisory' && hasActiveNotice;
  const activeAlertHeadline = emergencyPlan?.officialNotice?.headline || (isRedAlert ? 'Active Incident Alert' : 'Resilience Advisory');

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
      {/* Left Card: Welcome / Profile Card */}
      <Card className="border-0 md:border rounded-none md:rounded-lg flex flex-col justify-between">
        <CardHeader className="p-4 md:p-6 pb-2 flex-row items-center gap-3 space-y-0">
          <Avatar className="h-10 w-10">
            <AvatarImage src={userProfile?.photoURL || ''} />
            <AvatarFallback>
              <UserIcon className="h-5 w-5" />
            </AvatarFallback>
          </Avatar>
          <div className="flex-1">
            <CardTitle className="text-xl font-bold font-headline">
              Welcome, {userProfile?.name || 'Neighbour'}!
            </CardTitle>
            <CardDescription className="text-xs">
              {effectiveCommunityName}
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="p-4 md:p-6 pt-2 space-y-3">
          {isLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-2/3" />
            </div>
          ) : (
            <p className="text-sm text-muted-foreground leading-relaxed">
              Stay informed with local news, events, announcements, and local services in <strong>{effectiveCommunityName}</strong>.
            </p>
          )}
        </CardContent>
        {hasActiveParticipation && (
            <CardFooter className="p-4 md:p-6 pt-0">
                <div className="w-full p-3 rounded-lg bg-primary/5 border border-primary/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
                    <span className="font-semibold text-primary flex items-center gap-1.5">
                      <BadgeHelp className="h-4 w-4 shrink-0" /> Your voice matters in this community:
                    </span>
                    <div className="flex items-center gap-2 flex-wrap w-full sm:w-auto">
                      {activePolls && activePolls.length > 0 && (
                        <Button variant="default" size="sm" asChild className="h-7 text-xs gap-1.5 flex-1 sm:flex-initial">
                          <Link href={`/community/${effectiveCommunityId}/polls`}>
                            <Vote className="h-4 w-4" />
                            <span>Vote in Active Poll</span>
                          </Link>
                        </Button>
                      )}
                      {activePetitions && activePetitions.length > 0 && (
                        <Button variant="outline" size="sm" asChild className="h-7 text-xs gap-1.5 flex-1 sm:flex-initial">
                          <Link href={`/community/${effectiveCommunityId}/petitions`}>
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

      {/* Right Card: Visitor Guide OR Your Home Community */}
      {isVisiting ? (
        <Card className="border-0 md:border rounded-none md:rounded-lg border-emerald-500/30 bg-emerald-50/40 dark:bg-emerald-950/20 shadow-sm flex flex-col justify-between">
          <CardHeader className="p-4 md:p-6 pb-2 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Compass className="h-5 w-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <CardTitle className="text-xl font-bold font-headline text-foreground">
                Visitor Guide & Overview
              </CardTitle>
            </div>
            <div className="flex items-center gap-1.5">
              {isRedAlert && (
                <Button size="sm" asChild className="h-6 px-2 text-[10px] font-bold bg-red-600 hover:bg-red-500 text-white gap-1 animate-pulse shadow-sm">
                  <Link href={`/community/${effectiveCommunityId}/emergency`}>
                    <ShieldAlert className="h-3 w-3" /> See Alert
                  </Link>
                </Button>
              )}
              {isAmberAlert && (
                <Button size="sm" asChild className="h-6 px-2 text-[10px] font-bold bg-amber-500 hover:bg-amber-600 text-slate-950 gap-1 shadow-sm">
                  <Link href={`/community/${effectiveCommunityId}/emergency`}>
                    <AlertTriangle className="h-3 w-3" /> See Alert
                  </Link>
                </Button>
              )}
              <Badge variant="outline" className="w-fit bg-emerald-100 text-emerald-800 border-emerald-300 text-xs font-semibold">
                🌐 Visiting Mode
              </Badge>
            </div>
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
        <Card className="border-0 md:border rounded-none md:rounded-lg flex flex-col justify-between">
          <CardHeader className="p-4 md:p-6 pb-2 flex-row items-center justify-between">
            <CardTitle className="text-xl font-bold font-headline">
              {isNationalAdvertiser ? "National Advertiser View" : "Your Home Community"}
            </CardTitle>
            <div className="flex items-center gap-2">
              {/* Discrete Alert Button if Red or Amber Alert with Active Notice */}
              {isRedAlert && (
                <Button size="sm" asChild className="h-6 px-2.5 text-[10px] font-bold bg-red-600 hover:bg-red-500 text-white gap-1 animate-pulse shadow-sm">
                  <Link href={`/community/${effectiveCommunityId || userProfile?.communityId}/emergency`}>
                    <ShieldAlert className="h-3 w-3" /> See Alert
                  </Link>
                </Button>
              )}
              {isAmberAlert && (
                <Button size="sm" asChild className="h-6 px-2.5 text-[10px] font-bold bg-amber-500 hover:bg-amber-600 text-slate-950 gap-1 shadow-sm">
                  <Link href={`/community/${effectiveCommunityId || userProfile?.communityId}/emergency`}>
                    <AlertTriangle className="h-3 w-3" /> See Alert
                  </Link>
                </Button>
              )}
              {!isNationalAdvertiser && (
                <Button variant="ghost" size="icon" onClick={handleToggleFavourite}>
                  <Heart className={cn("h-6 w-6 text-muted-foreground transition-colors", isFavourited && "fill-red-500 text-red-500")} />
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent className="p-4 md:p-6 pt-0 space-y-3">
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

                {/* Visible Alert Strip on Your Home Community Card if Red or Amber Alert with Message is Active */}
                {(isRedAlert || isAmberAlert) && (
                  <div className={cn(
                    "w-full p-3 rounded-xl border flex items-center justify-between gap-3 text-xs shadow-sm",
                    isRedAlert ? "bg-red-950/20 border-red-500/60 text-red-300" : "bg-amber-950/20 border-amber-500/60 text-amber-300"
                  )}>
                    <div className="flex items-center gap-2 truncate">
                      {isRedAlert ? (
                        <ShieldAlert className="h-4 w-4 text-red-500 animate-pulse shrink-0" />
                      ) : (
                        <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0" />
                      )}
                      <span className="font-bold truncate text-foreground">{activeAlertHeadline}</span>
                    </div>
                    <Button
                      size="sm"
                      asChild
                      className={cn(
                        "h-7 px-3 text-xs font-bold shrink-0",
                        isRedAlert ? "bg-red-600 hover:bg-red-500 text-white" : "bg-amber-500 hover:bg-amber-600 text-slate-950"
                      )}
                    >
                      <Link href={`/community/${effectiveCommunityId || userProfile?.communityId}/emergency`}>
                        View Bulletin
                      </Link>
                    </Button>
                  </div>
                )}

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