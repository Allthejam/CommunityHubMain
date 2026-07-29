'use client';
import { useUser, useFirestore, useDoc, useMemoFirebase, useCollection } from '@/firebase';
import { doc, collection, query, where, limit } from 'firebase/firestore';
import { Card, CardContent, CardHeader, CardTitle, CardFooter, CardDescription } from './ui/card';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { Button } from './ui/button';
import { Skeleton } from './ui/skeleton';
import { User as UserIcon, Bell, BellOff, Globe, Heart, BadgeHelp, FileText, Palmtree, MapPin, Compass, Utensils, Bed, ShoppingBag, ArrowRight, Loader2, Sparkles, RefreshCw, Locate, Check } from 'lucide-react';
import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { updateUserFavouriteCommunitiesAction, returnToHomeCommunityAction } from '@/lib/actions/userActions';
import { type Notification } from '@/lib/types/notifications';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from './ui/badge';

type MappedCommunityDoc = {
  id: string;
  name: string;
  boundary?: string;
};

export function WelcomeCards() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  
  const [notificationsAllowed, setNotificationsAllowed] = React.useState(true);
  const [isSyncingLocation, setIsSyncingLocation] = React.useState(false);
  const [detectedCommunity, setDetectedCommunity] = React.useState<{ id: string; name: string } | null>(null);
  const [locationSyncedMessage, setLocationSyncedMessage] = React.useState<string | null>(null);

  const userProfileRef = useMemoFirebase(() => {
    if (!user || !firestore) return null;
    return doc(firestore, 'users', user.uid);
  }, [user, firestore]);

  const { data: userProfile, isLoading: isProfileLoading } = useDoc(userProfileRef);

  const communityId = userProfile?.communityId;

  // Query all mapped communities for location detection
  const communitiesQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(collection(firestore, 'communities'), where('boundary', '!=', null));
  }, [firestore]);
  const { data: mappedCommunities } = useCollection<MappedCommunityDoc>(communitiesQuery);

  const pollsQuery = useMemoFirebase(() => {
    if (!communityId || !firestore) return null;
    return query(
        collection(firestore, `communities/${communityId}/polls`),
        where('status', '==', 'active'),
        limit(5)
    );
  }, [communityId, firestore]);
  const { data: activePolls, isLoading: pollsLoading } = useCollection(pollsQuery);

  const unvotedPolls = React.useMemo(() => {
    if (!activePolls || !user) return [];
    return activePolls.filter((poll: any) => !poll.votedBy?.includes(user.uid));
  }, [activePolls, user]);

  const petitionsQuery = useMemoFirebase(() => {
    if (!communityId || !firestore) return null;
    return query(
        collection(firestore, `communities/${communityId}/petitions`),
        where('status', '==', 'active'),
        limit(5)
    );
  }, [communityId, firestore]);
  const { data: activePetitions, isLoading: petitionsLoading } = useCollection(petitionsQuery);

  const unsignedPetitions = React.useMemo(() => {
    if (!activePetitions || !user) return [];
    return activePetitions.filter((pet: any) => !pet.signedBy?.includes(user.uid));
  }, [activePetitions, user]);

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

  const effectivePollsLoading = communityId ? pollsLoading : false;
  const effectivePetitionsLoading = communityId ? petitionsLoading : false;
  const effectiveNotificationsLoading = user ? notificationsLoading : false;
  const isLoading = isUserLoading || isProfileLoading || effectivePollsLoading || effectiveNotificationsLoading || effectivePetitionsLoading;
  
  const notificationCount = newNotifications?.length || 0;
  const isNationalAdvertiser = userProfile?.accountType === 'national';
  
  const isFavourited = userProfile?.favouriteCommunities?.includes(userProfile?.communityId);

  const handleToggleFavourite = async () => {
    if (!user || !userProfile?.communityId) {
        toast({ title: 'Error', description: 'Could not update favourites.', variant: 'destructive' });
        return;
    }
    const result = await updateUserFavouriteCommunitiesAction({
        userId: user.uid,
        communityId: userProfile.communityId,
        isFavourited: !!isFavourited
    });
    if (result.success) {
        toast({ title: 'Favourites Updated' });
    } else {
        toast({ title: 'Error', description: result.error, variant: 'destructive' });
    }
  };

  const [isReturning, setIsReturning] = useState(false);
  const isVisiting = !!(userProfile?.homeCommunityId && userProfile?.communityId && userProfile.homeCommunityId !== userProfile.communityId);
  const homeCommName = userProfile?.homeCommunityName || 'Home Community';
  const currentCommName = userProfile?.communityName || 'Community';
  const currentCommId = userProfile?.communityId || userProfile?.homeCommunityId;

  // Ray-casting algorithm to check if lat/lon is inside a boundary polygon
  const isPointInPolygon = useCallback((lat: number, lng: number, polygon: [number, number][]): boolean => {
    let inside = false;
    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
      const xi = polygon[i][0], yi = polygon[i][1];
      const xj = polygon[j][0], yj = polygon[j][1];
      const intersect = ((yi > lat) !== (yj > lat)) && (lng < (xj - xi) * (lat - yi) / (yj - yi) + xi);
      if (intersect) inside = !inside;
    }
    return inside;
  }, []);

  // Location sync trigger attached to Visitor Guide button
  const handleSyncLocation = () => {
    if (typeof window === 'undefined' || !navigator.geolocation) {
      toast({ title: 'Location Error', description: 'Geolocation is not supported by your device.', variant: 'destructive' });
      return;
    }

    setIsSyncingLocation(true);
    setLocationSyncedMessage(null);
    setDetectedCommunity(null);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        let foundMatch: { id: string; name: string } | null = null;

        if (mappedCommunities && mappedCommunities.length > 0) {
          for (const comm of mappedCommunities) {
            if (!comm.boundary) continue;
            try {
              const geoJson = JSON.parse(comm.boundary);
              const polygon = geoJson?.geometry?.coordinates?.[0];
              if (Array.isArray(polygon) && isPointInPolygon(latitude, longitude, polygon as [number, number][])) {
                foundMatch = { id: comm.id, name: comm.name };
                break;
              }
            } catch (e) {}
          }
        }

        setIsSyncingLocation(false);

        if (foundMatch) {
          setDetectedCommunity(foundMatch);
          setLocationSyncedMessage(`You are in ${foundMatch.name}!`);
          toast({
            title: '📍 Location Detected!',
            description: `You are currently in ${foundMatch.name}. Tap "Switch Hub" to view.`,
          });
        } else {
          setDetectedCommunity(null);
          setLocationSyncedMessage(`Location synced! No mapped community hub detected at your current coordinates.`);
          toast({
            title: '📍 Location Synced',
            description: `No mapped community hub found at your location. You are on ${currentCommName}.`,
          });
        }
      },
      (error) => {
        setIsSyncingLocation(false);
        toast({ title: 'Location Error', description: error.message || 'Could not acquire GPS location.', variant: 'destructive' });
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  };

  const handleSwitchToDetectedCommunity = (commId: string, commName: string) => {
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('visitedCommunityId', commId);
    }
    setDetectedCommunity(null);
    setLocationSyncedMessage(null);
    toast({
      title: 'Community Switched!',
      description: `Now displaying content for ${commName}.`,
    });
    window.location.reload();
  };

  const handleReturnHome = async () => {
    if (!user) return;
    setIsReturning(true);
    sessionStorage.removeItem('visitedCommunityId');
    const res = await returnToHomeCommunityAction({ userId: user.uid });
    setIsReturning(false);
    if (res.success) {
        toast({ title: "Returned Home", description: `You are now back at your home community (${res.communityName}).` });
    } else {
        toast({ title: "Error", description: res.error, variant: "destructive" });
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Left Card: User Profile Welcome */}
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
                  Welcome back, {userProfile?.firstName || 'Allan'}!
                </p>
                 {isNationalAdvertiser ? (
                    <div className="text-sm text-muted-foreground mt-1">
                      <p>As a National Advertiser, this page is a preview of how your adverts appear in a live community.</p>
                      <p>Use the user menu to visit other communities.</p>
                    </div>
                 ) : notificationsAllowed ? (
                    <div className="text-sm text-muted-foreground mt-1 flex items-center">
                        <Bell className="h-4 w-4 mr-1.5 text-primary"/>
                        {notificationCount > 0
                            ? `You have ${notificationCount} unread notification${notificationCount > 1 ? 's' : ''}.`
                            : "You have no unread notifications."
                        }
                    </div>
                 ) : (
                    <div className="mt-2 text-sm text-muted-foreground flex items-center">
                        <BellOff className="h-4 w-4 mr-1.5 text-muted-foreground" />
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

        {!isLoading && (unvotedPolls.length > 0 || unsignedPetitions.length > 0) && (
            <CardFooter className="p-4 md:p-6 pt-0 border-t mt-4 w-full">
                <div className={cn(
                    "grid grid-cols-1 gap-6 w-full",
                    unvotedPolls.length > 0 && unsignedPetitions.length > 0 ? "md:grid-cols-2 md:divide-x md:divide-slate-100" : ""
                )}>
                    {unvotedPolls.length > 0 && (
                        <div className="w-full">
                            <div className="flex items-center gap-2 mb-2">
                                <BadgeHelp className="h-5 w-5 text-indigo-500"/>
                                <h4 className="font-semibold text-sm">Have Your Say!</h4>
                            </div>
                            <p className="text-xs text-muted-foreground mb-3 leading-relaxed">
                                {unvotedPolls.length === 1 
                                  ? "There's a new community poll waiting for your vote." 
                                  : `You have ${unvotedPolls.length} community polls waiting for your vote.`}
                            </p>
                            <Button asChild className="w-full h-8 text-xs bg-indigo-600 hover:bg-indigo-700 text-white">
                                <Link href="/polls">View & Vote</Link>
                            </Button>
                        </div>
                    )}
                    {unsignedPetitions.length > 0 && (
                        <div className={cn(
                            "w-full",
                            unvotedPolls.length > 0 ? "md:pl-6" : ""
                        )}>
                            <div className="flex items-center gap-2 mb-2">
                                <FileText className="h-5 w-5 text-emerald-500"/>
                                <h4 className="font-semibold text-sm">Support Local Campaigns</h4>
                            </div>
                            <p className="text-xs text-muted-foreground mb-3 leading-relaxed">
                                {unsignedPetitions.length === 1 
                                  ? "There's a new petition awaiting your signature." 
                                  : `You have ${unsignedPetitions.length} petitions awaiting your signature.`}
                            </p>
                            <Button asChild className="w-full h-8 text-xs bg-emerald-600 hover:bg-emerald-700 text-white">
                                <Link href="/petitions">View & Sign</Link>
                            </Button>
                        </div>
                    )}
                </div>
            </CardFooter>
        )}
        {!isLoading && unvotedPolls.length === 0 && unsignedPetitions.length === 0 && (
            <CardFooter className="p-3 bg-slate-50/30 border-t flex items-center justify-center gap-2 text-[11px] font-semibold text-slate-400 select-none">
              <span className="flex items-center gap-1">📊 {activePolls?.length || 0} Poll{(activePolls?.length !== 1) ? 's' : ''} running</span>
              <span className="text-slate-200">|</span>
              <span className="flex items-center gap-1">📝 {activePetitions?.length || 0} Petition{(activePetitions?.length !== 1) ? 's' : ''} running</span>
            </CardFooter>
        )}
      </Card>

      {/* Right Card: Interactive Community & Holiday Maker Guide with Location Sync */}
      <Card className="border-0 md:border rounded-none md:rounded-lg flex flex-col justify-between overflow-hidden max-w-full">
        <Tabs defaultValue="overview" className="w-full flex-grow flex flex-col justify-between max-w-full">
          <div>
            <CardHeader className="p-4 md:p-6 pb-2 flex flex-col sm:flex-row sm:items-center justify-between gap-3 max-w-full">
              <div className="flex items-center justify-between w-full sm:w-auto">
                <div>
                  <CardTitle className="text-lg sm:text-xl font-bold flex items-center gap-2">
                    {isVisiting ? (
                      <span className="flex items-center gap-1.5 text-amber-700 dark:text-amber-400">
                        <MapPin className="h-5 w-5 animate-bounce shrink-0" />
                        Visiting {currentCommName}
                      </span>
                    ) : (
                      <span className="flex items-center gap-1.5">
                        <Globe className="h-5 w-5 text-primary shrink-0" />
                        {isNationalAdvertiser ? "National View" : homeCommName}
                      </span>
                    )}
                  </CardTitle>
                  <CardDescription className="text-xs mt-0.5">
                    {isVisiting ? `Hub context: ${currentCommName} (Home: ${homeCommName})` : `Your primary home community hub`}
                  </CardDescription>
                </div>

                {!isNationalAdvertiser && (
                  <Button variant="ghost" size="icon" className="sm:hidden shrink-0" onClick={handleToggleFavourite} title="Toggle Favourite">
                    <Heart className={cn("h-5 w-5 text-muted-foreground transition-colors", isFavourited && "fill-red-500 text-red-500")} />
                  </Button>
                )}
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-end shrink-0">
                {!isNationalAdvertiser && (
                  <Button variant="ghost" size="icon" className="hidden sm:inline-flex shrink-0" onClick={handleToggleFavourite} title="Toggle Favourite">
                    <Heart className={cn("h-5 w-5 text-muted-foreground transition-colors", isFavourited && "fill-red-500 text-red-500")} />
                  </Button>
                )}
                <TabsList className="h-9 p-1 grid grid-cols-2 w-full sm:w-auto">
                  <TabsTrigger value="overview" className="text-xs px-2.5 h-7">
                    Overview
                  </TabsTrigger>
                  <TabsTrigger 
                    value="holiday_maker" 
                    className="text-xs px-2.5 h-7 gap-1 font-semibold text-purple-700 dark:text-purple-300"
                    onClick={() => {
                      if (!detectedCommunity && !isSyncingLocation) {
                        handleSyncLocation();
                      }
                    }}
                  >
                    <Palmtree className="h-3.5 w-3.5 text-purple-500 shrink-0" />
                    <span>Visitor Guide</span>
                  </TabsTrigger>
                </TabsList>
              </div>
            </CardHeader>

            <CardContent className="p-4 md:p-6 pt-2">
              {isLoading ? (
                <div className="space-y-3 py-2">
                  <Skeleton className="h-5 w-4/5" />
                  <Skeleton className="h-10 w-1/2" />
                </div>
              ) : (
                <>
                  {/* Tab 1: Overview & Visiting Switch Banner */}
                  <TabsContent value="overview" className="mt-0 space-y-4">
                    {isVisiting ? (
                      <div className="p-4 rounded-xl border border-amber-300 bg-amber-50/60 dark:bg-amber-950/30 space-y-3">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <p className="font-bold text-sm text-amber-900 dark:text-amber-200 flex items-center gap-1.5">
                              <Sparkles className="h-4 w-4 text-amber-600" />
                              You are visiting &ldquo;{currentCommName}&rdquo;
                            </p>
                            <p className="text-xs text-amber-800 dark:text-amber-300 mt-1 leading-relaxed">
                              Browse local events, shops, and attractions for {currentCommName}, or return to your locked Home Community ({homeCommName}).
                            </p>
                          </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-2 pt-1">
                          <Button size="sm" variant="outline" asChild className="text-xs h-8">
                            <Link href={`/community/${currentCommId}/about`}>About {currentCommName}</Link>
                          </Button>
                          <Button size="sm" className="bg-amber-600 hover:bg-amber-700 text-white text-xs h-8 font-semibold shadow-xs" onClick={handleReturnHome} disabled={isReturning}>
                            {isReturning && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
                            Return to Home ({homeCommName})
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        <p className="text-sm text-muted-foreground">
                          You are currently viewing your home community hub: <strong className="text-foreground font-bold">{homeCommName}</strong>.
                        </p>
                        <div className="flex items-center gap-2 pt-1">
                          <Button variant="outline" size="sm" asChild className="text-xs h-8">
                            <Link href={`/community/${currentCommId}/about`}>About {homeCommName}</Link>
                          </Button>
                          <Button variant="secondary" size="sm" className="text-xs h-8 gap-1.5" onClick={handleSyncLocation} disabled={isSyncingLocation}>
                            {isSyncingLocation ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Locate className="h-3.5 w-3.5 text-primary" />}
                            <span>Sync My Location</span>
                          </Button>
                        </div>
                      </div>
                    )}
                  </TabsContent>

                  {/* Tab 2: Holiday Makers & Visitors Guide with Integrated GPS Sync */}
                  <TabsContent value="holiday_maker" className="mt-0 space-y-3">
                    <div className="p-3.5 rounded-xl border bg-purple-50/60 dark:bg-purple-950/20 border-purple-200 dark:border-purple-900 space-y-3">
                      <div className="flex items-center justify-between">
                        <Badge className="bg-purple-600 text-white gap-1 text-[11px]">
                          <Palmtree className="h-3 w-3" /> Holiday Maker & Visitor Guide
                        </Badge>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="h-6 text-[11px] text-purple-700 dark:text-purple-300 gap-1 p-1 hover:bg-purple-100" 
                          onClick={handleSyncLocation}
                          disabled={isSyncingLocation}
                        >
                          {isSyncingLocation ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}
                          <span>Sync GPS Location</span>
                        </Button>
                      </div>

                      {/* Location Detection Notification */}
                      {detectedCommunity && (
                        <div className="p-3 rounded-lg border border-indigo-300 bg-indigo-50 dark:bg-indigo-950/50 space-y-2">
                          <p className="text-xs font-bold text-indigo-900 dark:text-indigo-200 flex items-center gap-1.5">
                            <MapPin className="h-4 w-4 text-indigo-600 animate-bounce" />
                            Location Detected: You are currently in &ldquo;{detectedCommunity.name}&rdquo;!
                          </p>
                          <p className="text-[11px] text-indigo-700 dark:text-indigo-300">
                            Would you like to switch to browse the {detectedCommunity.name} community hub?
                          </p>
                          <div className="flex items-center gap-2 pt-1">
                            <Button 
                              size="sm" 
                              className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs h-7 px-3 font-semibold"
                              onClick={() => handleSwitchToDetectedCommunity(detectedCommunity.id, detectedCommunity.name)}
                            >
                              Switch to {detectedCommunity.name}
                            </Button>
                            <Button 
                              size="sm" 
                              variant="ghost" 
                              className="text-xs h-7 text-muted-foreground"
                              onClick={() => setDetectedCommunity(null)}
                            >
                              Dismiss
                            </Button>
                          </div>
                        </div>
                      )}

                      {!detectedCommunity && locationSyncedMessage && (
                        <p className="text-[11px] text-purple-800 dark:text-purple-300 font-medium italic flex items-center gap-1">
                          <Check className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                          {locationSyncedMessage}
                        </p>
                      )}

                      <p className="text-xs text-muted-foreground leading-relaxed">
                        Staying in or visiting {currentCommName}? Explore everything this community hub has mapped out for visitors:
                      </p>

                      {/* Visitor Feature Quick Grid */}
                      <div className="grid grid-cols-2 gap-2 text-xs pt-1">
                        <Button variant="outline" size="sm" asChild className="justify-start gap-2 h-8 text-xs bg-background">
                          <Link href="/home#accommodation">
                            <Bed className="h-3.5 w-3.5 text-purple-600 shrink-0" />
                            <span>Stays & Hotels</span>
                          </Link>
                        </Button>

                        <Button variant="outline" size="sm" asChild className="justify-start gap-2 h-8 text-xs bg-background">
                          <Link href="/home#businesses">
                            <Utensils className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                            <span>Dining & Pubs</span>
                          </Link>
                        </Button>

                        <Button variant="outline" size="sm" asChild className="justify-start gap-2 h-8 text-xs bg-background">
                          <Link href="/home#whatson">
                            <Compass className="h-3.5 w-3.5 text-blue-600 shrink-0" />
                            <span>What's On & Sights</span>
                          </Link>
                        </Button>

                        <Button variant="outline" size="sm" asChild className="justify-start gap-2 h-8 text-xs bg-background">
                          <Link href="/home#highstreet">
                            <ShoppingBag className="h-3.5 w-3.5 text-amber-600 shrink-0" />
                            <span>Local Shopping</span>
                          </Link>
                        </Button>
                      </div>

                      <div className="pt-2 border-t flex items-center justify-between text-xs">
                        <span className="text-muted-foreground">Local History & Info:</span>
                        <Button variant="link" size="sm" className="p-0 h-auto text-xs text-purple-700 dark:text-purple-400 font-bold" asChild>
                          <Link href={`/community/${currentCommId}/about`} className="flex items-center gap-1">
                            {currentCommName} Guide <ArrowRight className="h-3 w-3" />
                          </Link>
                        </Button>
                      </div>
                    </div>
                  </TabsContent>
                </>
              )}
            </CardContent>
          </div>
        </Tabs>
      </Card>
    </div>
  );
}