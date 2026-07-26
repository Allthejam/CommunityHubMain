
'use client';
import { useUser, useFirestore, useDoc, useMemoFirebase, useCollection } from '@/firebase';
import { doc, collection, query, where, limit } from 'firebase/firestore';
import { Card, CardContent, CardHeader, CardTitle, CardFooter, CardDescription } from './ui/card';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { Button } from './ui/button';
import { Skeleton } from './ui/skeleton';
import { User as UserIcon, Bell, BellOff, Globe, Heart, BadgeHelp, FileText } from 'lucide-react';
import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { updateUserFavouriteCommunitiesAction } from '@/lib/actions/userActions';
import { type Notification } from '@/lib/types/notifications';

export function WelcomeCards() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  
  const [notificationsAllowed, setNotificationsAllowed] = React.useState(true);

  const userProfileRef = useMemoFirebase(() => {
    if (!user || !firestore) return null;
    return doc(firestore, 'users', user.uid);
  }, [user, firestore]);

  const { data: userProfile, isLoading: isProfileLoading } = useDoc(userProfileRef);

  const communityId = userProfile?.communityId;

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

  const isLoading = isUserLoading || isProfileLoading || pollsLoading || notificationsLoading || petitionsLoading;
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
  }


  const handleEnableNotifications = () => {
    // In a real app, you would likely trigger a flow to request notification permissions
    // and then update user settings. For this component, we'll link to the settings page.
    console.log("Redirecting to settings to enable notifications...");
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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
                {userProfile?.name ? userProfile.name.split(' ').map((n) => n[0]).join('') : <UserIcon />}
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
                        <Bell className="h-4 w-4 mr-1.5"/>
                        {notificationCount > 0
                            ? `You have ${notificationCount} unread notification${notificationCount > 1 ? 's' : ''}.`
                            : "You have no unread notifications."
                        }
                    </div>
                 ) : (
                    <div className="mt-2 text-sm text-muted-foreground flex items-center">
                        <BellOff className="h-4 w-4 mr-1.5" />
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
      <Card className='border-0 md:border rounded-none md:rounded-lg'>
         <CardHeader className="p-4 md:p-6 pb-2 flex-row items-center justify-between">
            <CardTitle className="text-xl">
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
                <div className="flex flex-col items-start gap-2">
                    <p className="text-muted-foreground">
                        You are viewing the <span className="font-semibold text-foreground">{userProfile?.communityName || 'Community'}</span> hub.
                    </p>
                    <Button variant="outline" asChild>
                      <Link href={`/community/${userProfile?.communityId}/about`}>Want to know about this community</Link>
                    </Button>
                </div>
            )}
        </CardContent>
      </Card>
    </div>
  );
}
    