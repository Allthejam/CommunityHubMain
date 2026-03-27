

'use client';
import React from 'react';
import BusinessCard from '@/components/business-card';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from './ui/card';
import { businesses as mockBusinesses } from '@/lib/mock-data';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Button } from './ui/button';
import Link from 'next/link';
import { ArrowRight, Clock, Loader2, MapPin, Phone } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import Image from 'next/image';
import { Badge } from './ui/badge';
import { Separator } from './ui/separator';
import { ScrollArea } from './ui/scroll-area';
import { useUser, useFirestore, useDoc, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, where, doc } from 'firebase/firestore';

type Business = {
  id: string;
  businessName: string;
  businessCategory?: string;
  logoImage?: string;
  shortDescription: string;
  status: "Pending Approval" | "Approved" | "Requires Amendment" | "Declined" | "Subscribed" | "Draft";
  phone?: string;
  googleMapsUrl?: string;
  openingHours?: any;
};

const OpeningHours = ({ hours }: { hours: Business['openingHours'] }) => {
    if (!hours) return null;
    const days = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];
    return (
        <div className="space-y-2">
            <h4 className="font-semibold text-md mb-2 flex items-center gap-2"><Clock className="h-4 w-4"/> Opening Hours</h4>
            <div className="space-y-2 text-sm">
                {days.map(day => {
                    const dayData = hours[day as keyof typeof hours];
                    if (!dayData) return null;
                    
                    const morningSession = dayData.morningOpen && dayData.morningClose ? `${dayData.morningOpen} - ${dayData.morningClose}` : null;
                    const afternoonSession = dayData.afternoonOpen && dayData.afternoonClose ? `${dayData.afternoonOpen} - ${dayData.afternoonClose}` : null;

                    let detailText;
                    if (dayData.closed) {
                        detailText = 'Closed';
                    } else if (morningSession && afternoonSession) {
                        detailText = `${morningSession}, ${afternoonSession}`;
                    } else if (morningSession) {
                        detailText = morningSession;
                    } else if (afternoonSession) {
                        detailText = afternoonSession;
                    } else {
                        detailText = 'Open (Times not specified)';
                    }

                    return (
                        <div key={day} className="flex justify-between items-center">
                            <span className="capitalize font-medium">{day}</span>
                            <span className="text-muted-foreground text-xs">{detailText}</span>
                        </div>
                    )
                })}
            </div>
        </div>
    )
}

const BusinessDialogContent = ({ business }: { business: Business }) => (
    <>
        <DialogHeader className="p-6 pb-2">
            <div className="flex items-center gap-4">
                <div className="relative h-16 w-16 flex-shrink-0">
                    <Image
                        src={business.logoImage || "https://picsum.photos/seed/business/600/400"}
                        alt={business.businessName}
                        fill
                        className="object-contain"
                    />
                </div>
                <div className="flex-1">
                    <DialogTitle className="text-2xl">{business.businessName}</DialogTitle>
                    {business.businessCategory && <Badge variant="outline">{business.businessCategory.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' & ')}</Badge>}
                </div>
            </div>
        </DialogHeader>
        <div className="grid overflow-y-auto">
            <ScrollArea className="max-h-[50vh] px-6">
                <p className="text-muted-foreground">{business.shortDescription}</p>
                <Separator className="my-4" />
                <div className="space-y-4">
                    {business.phone && (
                        <div className="flex items-start gap-3">
                            <Phone className="h-5 w-5 text-muted-foreground mt-0.5" />
                            <a href={`tel:${business.phone}`} className="text-primary hover:underline">{business.phone}</a>
                        </div>
                    )}
                    {business.googleMapsUrl && (
                         <div className="flex items-start gap-3">
                            <MapPin className="h-5 w-5 text-muted-foreground mt-0.5" />
                            <a href={business.googleMapsUrl} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">View on Google Maps</a>
                        </div>
                    )}
                    {business.openingHours && (
                        <>
                            <Separator className="my-4" />
                            <OpeningHours hours={business.openingHours} />
                        </>
                    )}
                </div>
            </ScrollArea>
        </div>
        <DialogFooter className="p-6 pt-2 border-t">
             <Button asChild className="w-full">
                <Link href={`/businesses/${business.id}`}>View Full Profile</Link>
            </Button>
        </DialogFooter>
    </>
);


export function LocalBusinessesFeed() {
  const { user, isUserLoading: authLoading } = useUser();
  const db = useFirestore();

  const userProfileRef = useMemoFirebase(() => (user && db ? doc(db, 'users', user.uid) : null), [user, db]);
  const { data: userProfile, isLoading: profileLoading } = useDoc(userProfileRef);
  
  const accommodationCategories = ["hotel", "guest-house", "b-and-b", "holiday-let", "campsite"];

  const businessesQuery = useMemoFirebase(() => {
    if (!userProfile?.communityId || !db) return null;
    return query(
      collection(db, "businesses"),
      where("primaryCommunityId", "==", userProfile.communityId),
      where("status", "==", "Subscribed")
    );
  }, [db, userProfile?.communityId]);

  const { data: liveBusinesses, isLoading: businessesLoading } = useCollection<Business>(businessesQuery);
  
  const filteredLiveBusinesses = React.useMemo(() => {
    if (!liveBusinesses) return [];
    return liveBusinesses.filter(b => !accommodationCategories.includes(b.businessCategory || ''));
  }, [liveBusinesses, accommodationCategories]);

  const businessesToDisplay = (filteredLiveBusinesses && filteredLiveBusinesses.length > 0) ? filteredLiveBusinesses : mockBusinesses.filter(b => !accommodationCategories.includes(b.businessCategory || ''));
  
  const randomBusinesses = React.useMemo(() => {
    return [...businessesToDisplay].sort(() => 0.5 - Math.random());
  }, [businessesToDisplay]);

  const [displayCount, setDisplayCount] = React.useState(3);

  const loading = authLoading || profileLoading || businessesLoading;

  if (loading) {
    return (
      <Card>
          <CardHeader>
              <CardTitle>Featured Local Businesses</CardTitle>
              <CardDescription>Discover great businesses in your area.</CardDescription>
          </CardHeader>
          <CardContent className="flex justify-center items-center h-48">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </CardContent>
      </Card>
    );
  }

  if (businessesToDisplay.length === 0) return null;
  

  return (
    <Card>
      <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
        <div>
            <CardTitle>Featured Local Businesses</CardTitle>
            <CardDescription>Discover great businesses in your area.</CardDescription>
        </div>
        <div className="w-full sm:w-auto">
            <Select value={String(displayCount)} onValueChange={(value) => setDisplayCount(Number(value))}>
                <SelectTrigger className="w-full sm:w-[120px]">
                    <SelectValue placeholder="Show..." />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="3">Show 3</SelectItem>
                    <SelectItem value="6">Show 6</SelectItem>
                    <SelectItem value="9">Show 9</SelectItem>
                </SelectContent>
            </Select>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {randomBusinesses && randomBusinesses.length > 0 ? (
            randomBusinesses.slice(0, displayCount).map(business => (
                <Dialog key={business.id}>
                    <DialogTrigger asChild>
                        <div>
                            <BusinessCard business={business as any} />
                        </div>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-md p-0">
                        <BusinessDialogContent business={business as any} />
                    </DialogContent>
                </Dialog>
            ))
          ) : (
            <p className="col-span-full text-center text-muted-foreground">No featured businesses in your community yet.</p>
          )}
        </div>
      </CardContent>
      <CardFooter>
        <Button variant="outline" asChild>
            <Link href="/directory">
                See All Businesses <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
        </Button>
      </CardFooter>
    </Card>
  );
}
