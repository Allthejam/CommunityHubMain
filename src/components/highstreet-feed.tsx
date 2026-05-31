
'use client';
import * as React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from './ui/card';
import Image from 'next/image';
import Link from 'next/link';
import { ShoppingBag, Loader2, ArrowRight } from 'lucide-react';
import { useUser, useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, where } from 'firebase/firestore';
import { Carousel, CarouselContent, CarouselItem } from "@/components/ui/carousel";
import Autoplay from "embla-carousel-autoplay";
import { Button } from './ui/button';
import { mockProducts } from '@/lib/mock-data';
import { Badge } from './ui/badge';
import { differenceInDays } from 'date-fns';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { ProductDialogContent } from './product-dialog-content';

type Business = {
  id: string;
  businessName: string;
  logoImage?: string;
  sellsRestrictedProducts?: boolean;
};

export function HighstreetFeed({ communityId }: { communityId: string | null }) {
  const db = useFirestore();
  const { userProfile, isLoading: profileLoading } = useUser();
  
  const businessesQuery = useMemoFirebase(() => {
    if (!communityId || !db) return null;
    return query(
      collection(db, "businesses"),
      where("primaryCommunityId", "==", communityId),
      where("storefrontSubscription", "==", true),
      where("status", "in", ["Approved", "Subscribed"])
    );
  }, [db, communityId]);

  const { data: liveBusinesses, isLoading: businessesLoading } = useCollection<Business>(businessesQuery);
  
  const businessesToDisplay = React.useMemo(() => {
    if (!liveBusinesses) return [];
    
    const userIsUnder21 = userProfile?.ageRange === 'Under 18' || userProfile?.ageRange === '18-24';
    
    return liveBusinesses.filter(business => {
        if (userIsUnder21 && business.sellsRestrictedProducts) {
            return false;
        }
        return true;
    });
  }, [liveBusinesses, userProfile]);
  
  // Duplicate items to ensure scrolling effect if there are few items
  const carouselItems = React.useMemo(() => {
    if (businessesToDisplay.length > 0 && businessesToDisplay.length < 10) {
        return [...businessesToDisplay, ...businessesToDisplay];
    }
    return businessesToDisplay;
  }, [businessesToDisplay]);

  
  const plugin = React.useRef(
    Autoplay({ delay: 2000, stopOnInteraction: true })
  )

  const loading = businessesLoading || profileLoading;

  if (loading) {
    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <ShoppingBag className="h-6 w-6" />
                    Visit the Highstreet
                </CardTitle>
                <CardDescription>Take a stroll down our virtual highstreet and discover your new favourite local shop.</CardDescription>
            </CardHeader>
            <CardContent className="h-32 flex justify-center items-center">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </CardContent>
        </Card>
    );
  }

  if (businessesToDisplay.length === 0) {
      return null;
  }

  return (
    <Card className="overflow-hidden">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
            <ShoppingBag className="h-6 w-6" />
            Visit the Highstreet
        </CardTitle>
        <CardDescription>Take a stroll down our virtual highstreet and discover your new favourite local shop.</CardDescription>
      </CardHeader>
      <CardContent>
        <Carousel
          opts={{
            align: "start",
            loop: true,
          }}
          plugins={[plugin.current]}
          onMouseEnter={plugin.current.stop}
          onMouseLeave={plugin.current.reset}
          className="w-full"
        >
          <CarouselContent className="-ml-4">
            {carouselItems.map((business, index) => (
              <CarouselItem key={`${business.id}-${index}`} className="pl-4 basis-1/2 sm:basis-1/3 md:basis-1/4 lg:basis-1/5 xl:basis-1/6">
                <Link href={`/shopping/store/${business.id}`} className="block group">
                    <Card className="overflow-hidden h-full hover:shadow-md transition-shadow">
                        <div className="relative aspect-square w-full p-2">
                        {business.logoImage && (
                            <Image
                                src={business.logoImage}
                                alt={business.businessName}
                                fill
                                className="object-contain p-2 transition-transform duration-300 group-hover:scale-105"
                                data-ai-hint="company logo"
                            />
                        )}
                        </div>
                        <div className="p-2 bg-muted/50">
                            <h4 className="font-semibold text-xs truncate text-center">{business.businessName}</h4>
                        </div>
                    </Card>
                </Link>
              </CarouselItem>
            ))}
          </CarouselContent>
        </Carousel>
      </CardContent>
    </Card>
  );
}
