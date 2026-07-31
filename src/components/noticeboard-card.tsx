'use client';

import React, { useRef, useState, useMemo } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Pin, 
  BarChart3, 
  FileText, 
  Sparkles, 
  Palmtree, 
  MapPin, 
  Locate, 
  ArrowRight, 
  Bed, 
  Utensils, 
  Compass, 
  ShoppingBag, 
  ChevronLeft, 
  ChevronRight, 
  Check, 
  Loader2, 
  Trophy, 
  BellRing,
  Globe,
  Heart
} from 'lucide-react';
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious, type CarouselApi } from "@/components/ui/carousel";
import Autoplay from "embla-carousel-autoplay";
import { useUser, useFirestore, useDoc, useMemoFirebase, useCollection } from '@/firebase';
import { doc, collection, query, where, limit, orderBy } from 'firebase/firestore';
import { type Notification } from '@/lib/types/notifications';
import { type Announcement } from '@/lib/announcement-data';
import { returnToHomeCommunityAction, updateUserFavouriteCommunitiesAction } from '@/lib/actions/userActions';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

type MappedCommunityDoc = {
  id: string;
  name: string;
  boundary?: string;
};

export function NoticeboardCard() {
  const { user } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();

  const [api, setApi] = useState<CarouselApi>();
  const [currentSlide, setCurrentSlide] = useState(0);
  const [count, setCount] = useState(0);
  const [isSyncingLocation, setIsSyncingLocation] = useState(false);
  const [detectedCommunity, setDetectedCommunity] = useState<{ id: string; name: string } | null>(null);
  const [locationSyncedMessage, setLocationSyncedMessage] = useState<string | null>(null);
  const [isReturning, setIsReturning] = useState(false);

  const plugin = useRef(Autoplay({ delay: 6000, stopOnInteraction: true }));

  // Load User Profile
  const userProfileRef = useMemoFirebase(() => {
    if (!user || !firestore) return null;
    return doc(firestore, 'users', user.uid);
  }, [user, firestore]);
  const { data: userProfile, isLoading: profileLoading } = useDoc(userProfileRef);

  const communityId = userProfile?.communityId;
  const homeCommName = userProfile?.homeCommunityName || 'Home Community';
  const currentCommName = userProfile?.communityName || 'Community';
  const currentCommId = userProfile?.communityId || userProfile?.homeCommunityId;
  const isVisiting = !!(userProfile?.homeCommunityId && userProfile?.communityId && userProfile.homeCommunityId !== userProfile.communityId);
  const isNationalAdvertiser = userProfile?.accountType === 'national';
  const isFavourited = userProfile?.favouriteCommunities?.includes(userProfile?.communityId);

  // Mapped communities for location sync
  const communitiesQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(collection(firestore, 'communities'), where('boundary', '!=', null));
  }, [firestore]);
  const { data: mappedCommunities } = useCollection<MappedCommunityDoc>(communitiesQuery);

  // Active Polls
  const pollsQuery = useMemoFirebase(() => {
    if (!communityId || !firestore) return null;
    return query(
      collection(firestore, `communities/${communityId}/polls`),
      where('status', '==', 'active'),
      limit(2)
    );
  }, [communityId, firestore]);
  const { data: activePolls, isLoading: pollsLoading } = useCollection(pollsQuery);

  const activePoll = activePolls?.[0];

  // Active Petitions
  const petitionsQuery = useMemoFirebase(() => {
    if (!communityId || !firestore) return null;
    return query(
      collection(firestore, `communities/${communityId}/petitions`),
      where('status', '==', 'active'),
      limit(2)
    );
  }, [communityId, firestore]);
  const { data: activePetitions, isLoading: petitionsLoading } = useCollection(petitionsQuery);

  const activePetition = activePetitions?.[0];

  // Community Announcements
  const announcementsQuery = useMemoFirebase(() => {
    if (!communityId || !firestore) return null;
    return query(
      collection(firestore, 'announcements'),
      where('scope', '==', 'community'),
      where('communityId', '==', communityId),
      limit(2)
    );
  }, [communityId, firestore]);
  const { data: announcements, isLoading: announcementsLoading } = useCollection<Announcement>(announcementsQuery);

  const activeAnnouncement = announcements?.[0];

  React.useEffect(() => {
    if (!api) return;
    setCount(api.scrollSnapList().length);
    setCurrentSlide(api.selectedScrollSnap());

    api.on("select", () => {
      setCurrentSlide(api.selectedScrollSnap());
    });
  }, [api]);

  // Ray-casting for GPS location sync
  const isPointInPolygon = (lat: number, lng: number, polygon: [number, number][]): boolean => {
    let inside = false;
    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
      const xi = polygon[i][0], yi = polygon[i][1];
      const xj = polygon[j][0], yj = polygon[j][1];
      const intersect = ((yi > lat) !== (yj > lat)) && (lng < (xj - xi) * (lat - yi) / (yj - yi) + xi);
      if (intersect) inside = !inside;
    }
    return inside;
  };

  const handleSyncLocation = () => {
    if (typeof window === 'undefined' || !navigator.geolocation) {
      toast({ title: 'Location Error', description: 'Geolocation is not supported.', variant: 'destructive' });
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
          if (foundMatch.id === currentCommId) {
            setDetectedCommunity(null);
            setLocationSyncedMessage(`You are currently in ${foundMatch.name} (Active Hub)!`);
            toast({
              title: '📍 Location Synced!',
              description: `You are in ${foundMatch.name}, which is your active hub.`,
            });
          } else {
            setDetectedCommunity(foundMatch);
            setLocationSyncedMessage(`You are in ${foundMatch.name}!`);
            toast({
              title: '📍 Location Detected!',
              description: `You are currently in ${foundMatch.name}. Tap "Switch Hub" to view.`,
            });
          }
        } else {
          setDetectedCommunity(null);
          setLocationSyncedMessage(`Location synced! No mapped community hub detected at your coordinates.`);
          toast({
            title: '📍 Location Synced',
            description: `No mapped community hub found. You remain on ${currentCommName}.`,
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
    toast({ title: 'Community Switched!', description: `Now displaying content for ${commName}.` });
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

  const handleToggleFavourite = async () => {
    if (!user || !userProfile?.communityId) return;
    const result = await updateUserFavouriteCommunitiesAction({
        userId: user.uid,
        communityId: userProfile.communityId,
        isFavourited: !!isFavourited
    });
    if (result.success) {
        toast({ title: 'Favourites Updated' });
    }
  };

  const scrollToSection = (id: string) => {
    if (typeof window === 'undefined') return;
    const elem = document.getElementById(id);
    if (elem) {
      elem.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  return (
    <Card className="border-0 md:border rounded-none md:rounded-lg flex flex-col justify-between overflow-hidden max-w-full bg-gradient-to-br from-amber-50/40 via-background to-purple-50/40 dark:from-amber-950/20 dark:to-purple-950/20">
      <CardHeader className="p-4 md:p-5 pb-2 flex flex-row items-center justify-between gap-2 border-b bg-background/60 backdrop-blur-xs">
        <div>
          <CardTitle className="text-lg sm:text-xl font-bold flex items-center gap-2">
            <Pin className="h-5 w-5 text-amber-600 dark:text-amber-400 rotate-45 shrink-0" />
            <span>Noticeboard!</span>
            <Badge variant="secondary" className="text-[10px] px-2 py-0 bg-amber-100 dark:bg-amber-900/50 text-amber-800 dark:text-amber-200 font-bold border-amber-300">
              Live Pins
            </Badge>
          </CardTitle>
          <CardDescription className="text-xs mt-0.5">
            {isVisiting ? `Pinned notices & alerts for ${currentCommName}` : `Pinned notices & active campaigns for ${homeCommName}`}
          </CardDescription>
        </div>

        <div className="flex items-center gap-1">
          {!isNationalAdvertiser && (
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleToggleFavourite} title="Toggle Favourite">
              <Heart className={cn("h-4 w-4 text-muted-foreground transition-colors", isFavourited && "fill-red-500 text-red-500")} />
            </Button>
          )}
          <Button 
            variant="outline" 
            size="sm" 
            className="h-7 text-xs gap-1.5 font-semibold bg-background"
            onClick={handleSyncLocation}
            disabled={isSyncingLocation}
          >
            {isSyncingLocation ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Locate className="h-3.5 w-3.5 text-primary shrink-0" />}
            <span className="hidden sm:inline">Sync GPS</span>
          </Button>
        </div>
      </CardHeader>

      <CardContent className="p-4 md:p-5 pt-3">
        {/* Location Sync Alert Banner if detected */}
        {detectedCommunity && (
          <div className="mb-3 p-3 rounded-lg border border-indigo-300 bg-indigo-50 dark:bg-indigo-950/60 space-y-2">
            <p className="text-xs font-bold text-indigo-900 dark:text-indigo-200 flex items-center gap-1.5">
              <MapPin className="h-4 w-4 text-indigo-600 animate-bounce shrink-0" />
              Location Detected: You are currently in &ldquo;{detectedCommunity.name}&rdquo;!
            </p>
            {detectedCommunity.id !== currentCommId ? (
              <div className="flex items-center gap-2">
                <Button size="sm" className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs h-7 px-3 font-semibold" onClick={() => handleSwitchToDetectedCommunity(detectedCommunity.id, detectedCommunity.name)}>
                  Switch to {detectedCommunity.name}
                </Button>
                <Button size="sm" variant="ghost" className="text-xs h-7 text-muted-foreground" onClick={() => setDetectedCommunity(null)}>
                  Dismiss
                </Button>
              </div>
            ) : (
              <p className="text-[11px] text-emerald-800 dark:text-emerald-300 font-semibold flex items-center gap-1">
                <Check className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                You are currently viewing the active {detectedCommunity.name} hub.
              </p>
            )}
          </div>
        )}

        {/* Noticeboard Carousel */}
        <Carousel
          setApi={setApi}
          plugins={[plugin.current]}
          className="w-full"
          onMouseEnter={plugin.current.stop}
          onMouseLeave={plugin.current.reset}
        >
          <CarouselContent>
            {/* Slide 1: 📊 Active Community Poll Pin */}
            <CarouselItem>
              <div className="p-4 rounded-xl border bg-indigo-50/50 dark:bg-indigo-950/20 border-indigo-200 dark:border-indigo-900 space-y-3 min-h-[155px] flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between">
                    <Badge className="bg-indigo-600 text-white gap-1 text-[11px]">
                      <BarChart3 className="h-3 w-3" /> Community Poll
                    </Badge>
                    <span className="text-[11px] text-indigo-700 dark:text-indigo-300 font-semibold">
                      {activePoll ? "Active Vote" : "Polls Hub"}
                    </span>
                  </div>
                  <h4 className="font-bold text-sm text-foreground mt-2 line-clamp-1">
                    {activePoll ? (activePoll as any).title : "Have Your Say in Local Decisions!"}
                  </h4>
                  <p className="text-xs text-muted-foreground mt-1 line-clamp-2 leading-relaxed">
                    {activePoll ? (activePoll as any).description || "Cast your vote on important topics affecting your community hub." : "Participate in local polls, share your feedback, and see live community voting results."}
                  </p>
                </div>
                <div className="pt-2 border-t flex items-center justify-between">
                  <span className="text-[11px] text-indigo-800 dark:text-indigo-300 font-medium">
                    {activePoll ? `${(activePoll as any).options?.length || 0} Options` : "Join the Discussion"}
                  </span>
                  <Button asChild size="sm" className="h-7 text-xs bg-indigo-600 hover:bg-indigo-700 text-white px-3">
                    <Link href="/polls">View & Vote <ArrowRight className="ml-1 h-3 w-3" /></Link>
                  </Button>
                </div>
              </div>
            </CarouselItem>

            {/* Slide 2: 📝 Community Petition Pin */}
            <CarouselItem>
              <div className="p-4 rounded-xl border bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-900 space-y-3 min-h-[155px] flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between">
                    <Badge className="bg-emerald-600 text-white gap-1 text-[11px]">
                      <FileText className="h-3 w-3" /> Local Campaign
                    </Badge>
                    <span className="text-[11px] text-emerald-700 dark:text-emerald-300 font-semibold">
                      {activePetition ? "Signature Needed" : "Petitions"}
                    </span>
                  </div>
                  <h4 className="font-bold text-sm text-foreground mt-2 line-clamp-1">
                    {activePetition ? (activePetition as any).title : "Support Community Petitions!"}
                  </h4>
                  <p className="text-xs text-muted-foreground mt-1 line-clamp-2 leading-relaxed">
                    {activePetition ? (activePetition as any).description || "Add your signature to support local petitions in your community." : "Sign petitions to advocate for community improvements and local initiatives."}
                  </p>
                </div>
                <div className="pt-2 border-t flex items-center justify-between">
                  <span className="text-[11px] text-emerald-800 dark:text-emerald-300 font-medium">
                    {activePetition ? `${(activePetition as any).signedBy?.length || 0} Signatures` : "Make a Difference"}
                  </span>
                  <Button asChild size="sm" className="h-7 text-xs bg-emerald-600 hover:bg-emerald-700 text-white px-3">
                    <Link href="/petitions">View & Sign <ArrowRight className="ml-1 h-3 w-3" /></Link>
                  </Button>
                </div>
              </div>
            </CarouselItem>

            {/* Slide 3: 🏖️ Visitor & Holiday Maker Guide Pin */}
            <CarouselItem>
              <div className="p-4 rounded-xl border bg-purple-50/50 dark:bg-purple-950/20 border-purple-200 dark:border-purple-900 space-y-3 min-h-[155px] flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between">
                    <Badge className="bg-purple-600 text-white gap-1 text-[11px]">
                      <Palmtree className="h-3 w-3" /> Visitor Guide
                    </Badge>
                    <span className="text-[11px] text-purple-700 dark:text-purple-300 font-bold">{currentCommName}</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-2 leading-relaxed">
                    Exploring or staying in {currentCommName}? Quick links to mapped visitor spots:
                  </p>
                  <div className="grid grid-cols-2 gap-1.5 text-xs pt-1">
                    <Button variant="outline" size="sm" className="justify-start gap-1.5 h-7 text-[11px] bg-background cursor-pointer" onClick={() => scrollToSection('accommodation')}>
                      <Bed className="h-3 w-3 text-purple-600 shrink-0" />
                      <span>Stays & Hotels</span>
                    </Button>
                    <Button variant="outline" size="sm" className="justify-start gap-2 h-7 text-[11px] bg-background cursor-pointer" onClick={() => scrollToSection('dining')}>
                      <Utensils className="h-3 w-3 text-emerald-600 shrink-0" />
                      <span>Dining & Pubs</span>
                    </Button>
                    <Button variant="outline" size="sm" className="justify-start gap-1.5 h-7 text-[11px] bg-background cursor-pointer" onClick={() => scrollToSection('whatson')}>
                      <Compass className="h-3 w-3 text-blue-600 shrink-0" />
                      <span>Sights & What's On</span>
                    </Button>
                    <Button variant="outline" size="sm" className="justify-start gap-1.5 h-7 text-[11px] bg-background cursor-pointer" onClick={() => scrollToSection('shopping')}>
                      <ShoppingBag className="h-3 w-3 text-amber-600 shrink-0" />
                      <span>Local Shopping</span>
                    </Button>
                  </div>
                </div>
              </div>
            </CarouselItem>

            {/* Slide 4: 📢 Community Announcement / Pinned Notice Pin */}
            <CarouselItem>
              <div className="p-4 rounded-xl border bg-amber-50/50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-900 space-y-3 min-h-[155px] flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between">
                    <Badge className="bg-amber-600 text-white gap-1 text-[11px]">
                      <BellRing className="h-3 w-3" /> Pinned Notice
                    </Badge>
                    <span className="text-[11px] text-amber-800 dark:text-amber-300 font-semibold">Noticeboard Alert</span>
                  </div>
                  <h4 className="font-bold text-sm text-foreground mt-2 line-clamp-1">
                    {activeAnnouncement ? activeAnnouncement.title : `Welcome to ${currentCommName} Hub`}
                  </h4>
                  <p className="text-xs text-muted-foreground mt-1 line-clamp-2 leading-relaxed">
                    {activeAnnouncement ? activeAnnouncement.content : `Stay updated with local news, upcoming events, and community discussions in ${currentCommName}.`}
                  </p>
                </div>
                <div className="pt-2 border-t flex items-center justify-between">
                  <span className="text-[11px] text-amber-800 dark:text-amber-300 font-medium">
                    {isVisiting ? `Visiting ${currentCommName}` : `Home: ${homeCommName}`}
                  </span>
                  {isVisiting ? (
                    <Button size="sm" className="h-7 text-xs bg-amber-600 hover:bg-amber-700 text-white px-3 font-semibold" onClick={handleReturnHome} disabled={isReturning}>
                      {isReturning && <Loader2 className="mr-1 h-3 w-3 animate-spin" />} Return Home
                    </Button>
                  ) : (
                    <Button asChild variant="outline" size="sm" className="h-7 text-xs px-3">
                      <Link href={`/community/${currentCommId}/about`}>Hub Info <ArrowRight className="ml-1 h-3 w-3" /></Link>
                    </Button>
                  )}
                </div>
              </div>
            </CarouselItem>
          </CarouselContent>
        </Carousel>

        {/* Slide Indicator Dots */}
        <div className="flex items-center justify-center gap-1.5 mt-3">
          {Array.from({ length: count || 4 }).map((_, index) => (
            <button
              key={index}
              className={cn(
                "h-1.5 rounded-full transition-all duration-300",
                currentSlide === index ? "w-5 bg-amber-600 dark:bg-amber-400" : "w-1.5 bg-muted-foreground/30 hover:bg-muted-foreground/60"
              )}
              onClick={() => api?.scrollTo(index)}
              title={`Go to notice ${index + 1}`}
            />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
