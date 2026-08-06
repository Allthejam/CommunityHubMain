
'use client';
import React, { useEffect, useMemo, useState } from 'react';
import BusinessCard from '@/components/business-card';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from './ui/card';
import { businesses as mockBusinesses, mockCourierBusiness } from '@/lib/mock-data';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Button } from './ui/button';
import Link from 'next/link';
import { ArrowRight, Clock, Loader2, MapPin, Phone, Truck } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import Image from 'next/image';
import { Badge } from './ui/badge';
import { Separator } from './ui/separator';
import { ScrollArea } from './ui/scroll-area';
import { useUser, useFirestore, useDoc, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, where, doc, limit } from 'firebase/firestore';
import { differenceInDays } from 'date-fns';
import { accommodationCategories } from '@/lib/categories';

type Business = {
  id: string;
  businessName: string;
  businessCategory?: string;
  logoImage?: string;
  shortDescription: string;
  status: "Pending Approval" | "Approved" | "Subscribed" | "Requires Amendment" | "Declined" | "Draft";
  phone?: string;
  googleMapsUrl?: string;
  openingHours?: any;
  listingSubscriptionExpiresAt?: { toDate: () => Date };
  createdAt?: { toDate: () => Date };
  primaryCommunityId?: string;
  accountType?: string;
  leaderCount?: number;
  isFreeListing?: boolean;
  freeListingExpiresAt?: { toDate: () => Date };
  sellsRestrictedProducts?: boolean;
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


export function LocalBusinessesFeed({ communityId }: { communityId: string | null }) {
  const db = useFirestore();
  const { userProfile, isLoading: profileLoading } = useUser();
  const [displayCount, setDisplayCount] = React.useState(3);
  const [clientBusinesses, setClientBusinesses] = React.useState<Business[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);

  const communityRef = useMemoFirebase(() => (communityId ? doc(db, 'communities', communityId) : null), [communityId, db]);
  const { data: communityData, isLoading: communityLoading } = useDoc(communityRef);
  
  const businessesQuery = useMemoFirebase(() => {
    if (!communityId || !db) return null;
    return query(
      collection(db, "businesses"),
      where("primaryCommunityId", "==", communityId),
      where("status", "in", ["Approved", "Subscribed"])
    );
  }, [db, communityId]);
  
  const courierId = communityData?.courierId;

  const couriersQuery = useMemoFirebase(() => {
    if (!courierId || !db) return null;
    return query(collection(db, "businesses"), 
      where("ownerId", "==", courierId), 
      where("accountType", "==", "courier"),
      where("status", "==", "Subscribed"),
      limit(1));
  }, [courierId, db]);


  const { data: liveBusinesses, isLoading: businessesLoading } = useCollection<Business>(businessesQuery);
  const { data: realCourierBusinesses, isLoading: couriersLoading } = useCollection<Business>(couriersQuery);
  
  const accommodationCategoryValues = useMemo(() => accommodationCategories.map(c => c.value), []);
  
  const overallLoading = businessesLoading || couriersLoading || communityLoading || profileLoading;
  
  useEffect(() => {
    if (overallLoading) {
      setIsLoading(true);
      return;
    }
    
    const toDate = (timestamp: any): Date | null => {
        if (!timestamp) return null;
        if (typeof timestamp.toDate === 'function') return timestamp.toDate();
        if (timestamp.seconds) return new Date(timestamp.seconds * 1000);
        if (typeof timestamp === 'string' || typeof timestamp === 'number') {
            const d = new Date(timestamp);
            if (!isNaN(d.getTime())) return d;
        }
        return null;
    };

    const now = new Date();
    const filterLive = (business: Business) => {
        if (accommodationCategoryValues.includes(business.businessCategory || '')) return false;

        // CRITICAL: Filter out enterprise groups from the local business feed
        if (business.accountType === 'enterprise') return false;

        // Age restricted visibility logic
        const userIsUnder21 = userProfile?.ageRange === 'Under 18' || userProfile?.ageRange === '18-24';
        if (userIsUnder21 && business.sellsRestrictedProducts) {
            return false;
        }

        if (business.isFreeListing) {
            const expiryDate = toDate(business.freeListingExpiresAt);
            return !expiryDate || now <= expiryDate;
        }
        if (business.status === 'Subscribed') {
            const expiryDate = toDate(business.listingSubscriptionExpiresAt);
            return !expiryDate || now <= expiryDate;
        }
        if (business.status === 'Approved' && business.createdAt) {
            const creationDate = toDate(business.createdAt);
            if (!creationDate) return false;
            return differenceInDays(now, creationDate) <= 14;
        }
        return false;
    };
    
    let livePrimary = (liveBusinesses || []).filter(filterLive);
    const couriers = (realCourierBusinesses || []).filter(filterLive);
    
    let combinedLocal = [...livePrimary, ...couriers];
    
    if(livePrimary.length === 0 && couriers.length === 0) {
        const fallback = mockBusinesses.filter(b => !accommodationCategoryValues.includes(b.businessCategory || ''));
        combinedLocal.push(...fallback as Business[]);
    }
    
    const showMockCourier = (communityData?.leaderCount || 0) === 0 && !communityData?.courierId;
    if (showMockCourier) {
      combinedLocal.unshift({ ...mockCourierBusiness, leaderCount: communityData?.leaderCount || 0 } as any);
    }
    
    const finalBusinesses = Array.from(new Map(combinedLocal.map(item => [item.id, item])).values());
    
    setClientBusinesses(finalBusinesses);
    setIsLoading(false);

  }, [JSON.stringify(liveBusinesses), JSON.stringify(realCourierBusinesses), JSON.stringify(communityData), overallLoading, accommodationCategoryValues, userProfile]);

  if (isLoading) {
    return (
        <Card>
            <CardHeader>
                <CardTitle>Featured Local Businesses</CardTitle>
                <CardDescription>Discover great businesses in your area.</CardDescription>
            </CardHeader>
            <CardContent className="h-48 flex justify-center items-center">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </CardContent>
        </Card>
    );
  }

  if (clientBusinesses.length === 0 && !isLoading) return null;
  

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
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {clientBusinesses.slice(0, displayCount).map(business => (
                <Dialog key={business.id}>
                    <DialogTrigger asChild>
                        <div className="h-full">
                            <BusinessCard business={business as any} />
                        </div>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-md p-0">
                        <BusinessDialogContent business={business as any} />
                    </DialogContent>
                </Dialog>
            ))}
        </div>
      </CardContent>
      <CardFooter className="flex-wrap gap-2">
        <Button variant="outline" asChild>
            <Link href="/directory">
                See All Businesses <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
        </Button>
         {!communityData?.courierId && (
            <Button asChild>
                <Link href="/courier-info">
                    <Truck className="mr-2 h-4 w-4" />
                    Become a Courier
                </Link>
            </Button>
        )}
      </CardFooter>
    </Card>
  );
}
