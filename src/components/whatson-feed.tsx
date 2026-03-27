

'use client';

import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, Globe, Mail, Phone, Share2, Clock, ArrowRight, MapPin, LayoutGrid, List } from "lucide-react";
import { collection, query, where, doc } from "firebase/firestore";
import { useUser, useFirestore, useDoc, useCollection, useMemoFirebase } from "@/firebase";
import { mockWhatsOn } from "@/lib/mock-data";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { useIsMobile } from "@/hooks/use-mobile";
import { Carousel, CarouselContent, CarouselItem } from "@/components/ui/carousel";
import Autoplay from "embla-carousel-autoplay";

type WhatsonItem = {
  id: string;
  title: string;
  category: string;
  image: string;
  dataAiHint: string;
  description: string;
  openingHours?: any;
  address?: string;
  website?: string;
  social?: string;
  email?: string;
  phone?: string;
};


const OpeningHours = ({ hours }: { hours: any }) => {
    if (!hours) return null;
    const days = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];
    return (
        <div className="space-y-2">
            {days.map(day => {
                const dayData = hours[day];
                if (!dayData) return null;
                const displayTime = dayData.closed ? 'Closed' : `${dayData.open} - ${dayData.close}`;
                return (
                    <div key={day} className="flex justify-between text-sm">
                        <span className="capitalize">{day}</span>
                        <span className="text-muted-foreground">{displayTime}</span>
                    </div>
                )
            })}
        </div>
    )
}

const WhatsonDialogContent = ({ item }: { item: WhatsonItem }) => (
    <>
        <DialogHeader className="p-6 pb-0">
            <DialogTitle className="text-2xl">{item.title}</DialogTitle>
            <DialogDescription>{item.category}</DialogDescription>
        </DialogHeader>
        <div className="grid overflow-y-auto">
            <ScrollArea className="max-h-[60vh] px-6">
                <div className="space-y-4 pr-1 pb-4">
                    {item.image && (
                        <div className="relative w-full aspect-video rounded-md overflow-hidden bg-muted">
                            <Image src={item.image} alt={item.title} fill className="object-cover" />
                        </div>
                    )}
                    <div
                        className="text-sm text-muted-foreground prose dark:prose-invert max-w-none"
                        dangerouslySetInnerHTML={{ __html: item.description || '' }}
                    />
                    
                    {item.openingHours && (
                        <>
                            <Separator />
                            <div>
                                <h4 className="font-semibold text-md mb-2 flex items-center gap-2"><Clock className="h-4 w-4"/> Opening Hours</h4>
                                <OpeningHours hours={item.openingHours} />
                            </div>
                        </>
                    )}
                    
                    {(item.address || item.phone || item.email || item.website || item.social) && <Separator />}
                    
                    {(item.address || item.phone || item.email || item.website || item.social) && (
                        <div>
                            <h4 className="font-semibold text-md mb-2">Contact & Links</h4>
                            <div className="space-y-2 text-sm">
                                {item.address && (
                                    <div className="flex items-start gap-3">
                                        <MapPin className="h-4 w-4 mt-1 text-muted-foreground" />
                                        <a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(item.address)}`} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">{item.address}</a>
                                    </div>
                                )}
                                {item.phone && <div className="flex items-center gap-2"><Phone className="h-4 w-4" /><a href={`tel:${item.phone}`} className="text-primary hover:underline">{item.phone}</a></div>}
                                {item.email && <div className="flex items-center gap-2"><Mail className="h-4 w-4" /><a href={`mailto:${item.email}`} className="text-primary hover:underline">{item.email}</a></div>}
                                {item.website && <div className="flex items-center gap-2"><Globe className="h-4 w-4" /><a href={item.website} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">Visit Website</a></div>}
                                {item.social && <div className="flex items-center gap-2"><Share2 className="h-4 w-4" /><a href={item.social} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">Social Media</a></div>}
                            </div>
                        </div>
                    )}
                </div>
            </ScrollArea>
        </div>
        <DialogFooter className="p-6 pt-4 border-t">
             <Button asChild>
                <Link href="#">View on Map</Link>
            </Button>
        </DialogFooter>
    </>
);

const WhatsonItemCard = ({ item }: { item: WhatsonItem }) => (
    <Card className="flex flex-col overflow-hidden cursor-pointer hover:shadow-lg transition-shadow h-full">
        <CardHeader className="p-0">
            <div className="relative w-full aspect-square bg-muted">
                <Image
                    src={item.image || 'https://picsum.photos/seed/whatson/600/400'}
                    alt={item.title}
                    fill
                    className="object-cover transition-transform duration-300 group-hover:scale-105"
                    data-ai-hint={item.dataAiHint || "local attraction"}
                />
            </div>
        </CardHeader>
        <CardContent className="p-4 flex-grow">
            <h3 className="font-semibold text-base line-clamp-2 h-12">{item.title}</h3>
        </CardContent>
        <CardFooter className="p-4 pt-0 mt-auto">
            <div className="text-sm font-medium text-primary w-full text-center">More Info</div>
        </CardFooter>
    </Card>
);

export function WhatsonFeed() {
  const { user, isUserLoading: authLoading } = useUser();
  const db = useFirestore();
  const [view, setView] = React.useState('grid');


  const userProfileRef = useMemoFirebase(() => (user && db ? doc(db, "users", user.uid) : null), [user, db]);
  const { data: userProfile, isLoading: profileLoading } = useDoc(userProfileRef);

  const whatsonQuery = useMemoFirebase(() => {
    if (!userProfile?.communityId || !db) {
      return null;
    }
    return query(
      collection(db, "whatson"),
      where("communityId", "==", userProfile.communityId),
      where("status", "==", "Active")
    );
  }, [db, userProfile?.communityId]);

  const { data: whatsonItems, isLoading: itemsLoading } = useCollection<WhatsonItem>(whatsonQuery);
  
  const loading = authLoading || profileLoading || itemsLoading;

  const [activeFilter, setActiveFilter] = React.useState("All");
  
  const isMobile = useIsMobile();
  const plugin = React.useRef(Autoplay({ delay: 4000, stopOnInteraction: true }));


  const whatsonToDisplay = React.useMemo(() => {
    const sourceData = (whatsonItems && whatsonItems.length > 0) ? whatsonItems : mockWhatsOn.map(item => ({
        ...item,
        image: item.image?.imageUrl || 'https://picsum.photos/seed/whatson-placeholder/600/400',
        dataAiHint: item.image?.imageHint || 'local attraction'
    }));

    if (activeFilter === "All") return sourceData;
    return sourceData.filter(item => item.category === activeFilter);
  }, [whatsonItems, activeFilter]);
  
  const randomItems = React.useMemo(() => {
    return [...whatsonToDisplay].sort(() => 0.5 - Math.random());
  }, [whatsonToDisplay]);
  
  const allCategories = React.useMemo(() => {
    const sourceData = (whatsonItems && whatsonItems.length > 0) ? whatsonItems : mockWhatsOn.map(item => ({...item}));
    return ["All", ...Array.from(new Set(sourceData.map(item => item.category)))];
  }, [whatsonItems]);
    
  if (loading) {
      return (
          <div className="flex justify-center items-center h-96">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
      );
  }
  
  if (whatsonToDisplay.length === 0 && activeFilter === 'All') return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle>What's On</CardTitle>
        <CardDescription>Regular local attractions and venues.</CardDescription>
        <div className="flex flex-wrap gap-2 pt-4">
            {allCategories.map((category) => (
            <Button
                key={category}
                variant={activeFilter === category ? "default" : "outline"}
                size="sm"
                onClick={() => setActiveFilter(category)}
            >
                {category}
            </Button>
            ))}
        </div>
      </CardHeader>
      <CardContent>
        {isMobile ? (
          <Carousel
            opts={{ align: "start", loop: randomItems.length > 2 }}
            plugins={[plugin.current]}
            onMouseEnter={plugin.current.stop}
            onMouseLeave={plugin.current.reset}
            className="w-full"
          >
            <CarouselContent className="-ml-2">
              {randomItems.slice(0, 4).map((item) => (
                <CarouselItem key={item.id} className="pl-2 basis-2/3">
                  <Dialog>
                    <DialogTrigger asChild>
                        <div><WhatsonItemCard item={item} /></div>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-xl p-0 grid grid-rows-[auto,minmax(0,1fr),auto] max-h-[90vh]">
                       <WhatsonDialogContent item={item} />
                    </DialogContent>
                  </Dialog>
                </CarouselItem>
              ))}
            </CarouselContent>
          </Carousel>
        ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {randomItems.length > 0 ? (
                    randomItems.slice(0, 4).map((item) => (
                    <Dialog key={item.id}>
                        <DialogTrigger asChild>
                           <div><WhatsonItemCard item={item} /></div>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-xl p-0 grid grid-rows-[auto,minmax(0,1fr),auto] max-h-[90vh]">
                            <WhatsonDialogContent item={item} />
                        </DialogContent>
                    </Dialog>
                    ))
                ) : (
                    <p className="col-span-full text-muted-foreground text-center py-10">
                        No items found for this category. Check back later!
                    </p>
                )}
            </div>
        )}
      </CardContent>
        <CardFooter>
            <Button variant="outline" asChild>
                <Link href="/whatson">See All <ArrowRight className="ml-2 h-4 w-4" /></Link>
            </Button>
        </CardFooter>
    </Card>
  );
}
