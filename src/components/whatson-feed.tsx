
'use client';

import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, Globe, Mail, Phone, Share2, Clock, MapPin, LayoutGrid, List, ArrowRight, ExternalLink, Compass, Navigation, Sparkles, Tv } from "lucide-react";
import { collection, query, where } from "firebase/firestore";

import { useFirestore, useCollection, useMemoFirebase } from "@/firebase";
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
  scope?: 'in' | 'around';
  areaName?: string;
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

const WhatsonDialogContent = ({ item }: { item: WhatsonItem }) => {
    const isDemo = typeof window !== 'undefined' && (sessionStorage.getItem('isDemoMode') === 'true' || window.location.pathname.startsWith('/demo'));
    const demoPrefix = isDemo ? '/demo' : '';

    return (
    <>
        <DialogHeader className="p-6 pb-0">
            <DialogTitle className="text-2xl">{item.title}</DialogTitle>
            <div className="flex items-center gap-2 flex-wrap pt-1">
                <Badge variant="secondary" className="text-xs font-semibold">{item.category}</Badge>
                {item.scope === 'around' ? (
                    <Badge variant="outline" className="text-xs font-semibold bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-950/60 dark:text-sky-300">
                        Around {item.areaName ? `· ${item.areaName}` : '· Nearby Area'}
                    </Badge>
                ) : (
                    <Badge variant="outline" className="text-xs font-semibold bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300">
                        In Town (Local)
                    </Badge>
                )}
            </div>
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
        <DialogFooter className="p-6 pt-4 border-t flex flex-col sm:flex-row gap-3 sm:justify-between sm:items-center">
          {item.id ? (
            <Button variant="default" asChild className="w-full sm:w-auto font-medium">
              <Link href={`${demoPrefix}/whatson/${item.id}`}>
                See More / Full Details <ExternalLink className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          ) : null}

          <Button variant="outline" asChild className="w-full sm:w-auto gap-2">
            <a
              href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(item.address || item.title)}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              <MapPin className="h-4 w-4 text-primary" /> View on Google Maps
            </a>
          </Button>
        </DialogFooter>
    </>
    );
};


const WhatsonCard = ({ item }: { item: WhatsonItem }) => (
    <Dialog>
        <DialogTrigger asChild>
            <Card className="flex flex-col overflow-hidden cursor-pointer hover:shadow-lg transition-shadow">
                <CardHeader className="p-0">
                    <div className="relative w-full aspect-square bg-muted">
                        <Image
                            src={item.image || 'https://picsum.photos/seed/whatson/600/400'}
                            alt={item.title}
                            fill
                            className="object-cover"
                            data-ai-hint={item.dataAiHint || "local attraction"}
                        />
                        <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5 flex-wrap">
                            <Badge variant="secondary" className="text-[10px] font-bold backdrop-blur-md bg-background/85 shadow-xs">
                                {item.category}
                            </Badge>
                            {item.scope === 'around' ? (
                                <Badge className="text-[10px] font-bold bg-sky-600 hover:bg-sky-700 text-white shadow-xs">
                                    Around {item.areaName ? `· ${item.areaName}` : ''}
                                </Badge>
                            ) : (
                                <Badge className="text-[10px] font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs">
                                    In Town
                                </Badge>
                            )}
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="p-4 flex-grow">
                    <h3 className="font-bold text-base line-clamp-2 leading-snug">{item.title}</h3>
                    {item.address && (
                        <p className="text-xs text-muted-foreground flex items-center gap-1 truncate pt-0.5">
                            <MapPin className="h-3 w-3 shrink-0 text-primary" />
                            <span className="truncate">{item.address}</span>
                        </p>
                    )}
                </CardContent>
                <CardFooter className="p-4 pt-0 mt-auto">
                    <div className="text-sm font-medium text-primary w-full text-center">More Info</div>
                </CardFooter>
            </Card>
        </DialogTrigger>
        <DialogContent className="sm:max-w-xl p-0">
            <WhatsonDialogContent item={item} />
        </DialogContent>
    </Dialog>
);

export function WhatsonFeed({
  communityId,
  mode = 'in',
  communityName,
}: {
  communityId: string | null;
  mode?: 'in' | 'around';
  communityName?: string;
}) {
  const db = useFirestore();
  const isDemo = typeof window !== 'undefined' && (sessionStorage.getItem('isDemoMode') === 'true' || window.location.pathname.startsWith('/demo'));
  const demoPrefix = isDemo ? '/demo' : '';
  const activeCommunityId = isDemo ? '9ayHMyZf4SRw2gof1AM9' : communityId;

  const [localDemoItems, setLocalDemoItems] = React.useState<WhatsonItem[]>([]);

  React.useEffect(() => {
    if (isDemo && typeof window !== 'undefined') {
      try {
        const stored = JSON.parse(
          sessionStorage.getItem(`demo_whatson_${activeCommunityId}`) || 
          localStorage.getItem(`demo_whatson_${activeCommunityId}`) || '[]'
        );
        setLocalDemoItems(stored.filter((i: any) => i.status === 'Active' || !i.status));
      } catch (e) {}
    }
  }, [isDemo, activeCommunityId]);

  const whatsonQuery = useMemoFirebase(() => {
    if (!activeCommunityId || !db) {
      return null;
    }
    return query(
      collection(db, "whatson"),
      where("communityId", "==", activeCommunityId),
      where("status", "in", ["Active", "Live", "approved"])
    );
  }, [db, activeCommunityId]);

  const { data: whatsonItems, isLoading: itemsLoading } = useCollection<WhatsonItem>(whatsonQuery);
  
  const itemsToDisplay = React.useMemo(() => {
    const dbItems = whatsonItems || [];
    const combined = [...localDemoItems, ...dbItems.filter(d => !localDemoItems.some(l => l.id === d.id))];
    if (mode === 'around') {
      const aroundItems = combined.filter(item => item.scope === 'around');
      if (aroundItems.length > 0) return aroundItems;
      return mockWhatsOn
        .filter(item => item.scope === 'around')
        .map(item => ({
          ...item,
          address: item.address || item.location,
          image: (item.image as any)?.imageUrl || 'https://picsum.photos/seed/whatson-placeholder/600/400',
          dataAiHint: (item.image as any)?.imageHint || 'local attraction'
        } as WhatsonItem));
    } else {
      const inItems = combined.filter(item => item.scope !== 'around');
      if (inItems.length > 0) return inItems;
      return mockWhatsOn
        .filter(item => item.scope !== 'around')
        .map(item => ({
          ...item,
          address: item.address || item.location,
          image: (item.image as any)?.imageUrl || 'https://picsum.photos/seed/whatson-placeholder/600/400',
          dataAiHint: (item.image as any)?.imageHint || 'local attraction'
        } as WhatsonItem));
    }


  }, [whatsonItems, localDemoItems, mode]);
    
  if (itemsLoading) {
      return (
          <Card className={mode === 'around' ? "border-t-4 border-t-sky-500 shadow-sm" : "border-t-4 border-t-emerald-500 shadow-sm"}>
            <CardHeader>
                <CardTitle>
                  {mode === 'around' ? `Explore Around & Nearby ${communityName || ''}` : `What's On in ${communityName || 'the Community'}`}
                </CardTitle>
                <CardDescription>
                  {mode === 'around' ? 'Loading regional day-trip venues and surrounding attractions...' : 'Loading local happenings, venues and weekly clubs...'}
                </CardDescription>
            </CardHeader>
            <CardContent className="h-48 flex justify-center items-center">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </CardContent>
        </Card>
      );
  }

  if (itemsToDisplay.length === 0) return null;

  const isAround = mode === 'around';

  return (
    <Card className={isAround ? "border-t-4 border-t-sky-500 shadow-sm" : "border-t-4 border-t-emerald-500 shadow-sm"}>
      <CardHeader>
        <div className="flex items-center justify-between gap-2 mb-1">
          {isAround ? (
            <Badge variant="outline" className="text-sky-700 dark:text-sky-300 border-sky-300 dark:border-sky-800 bg-sky-50/60 dark:bg-sky-950/30 gap-1.5 font-semibold text-xs py-0.5">
              <Compass className="h-3.5 w-3.5 text-sky-600 dark:text-sky-400" /> Around & Surrounding Area
            </Badge>
          ) : (
            <Badge variant="outline" className="text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800 bg-emerald-50/60 dark:bg-emerald-950/30 gap-1.5 font-semibold text-xs py-0.5">
              <MapPin className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" /> In Town · Local
            </Badge>
          )}
          <span className="text-xs text-muted-foreground font-medium">{itemsToDisplay.length} listed</span>
        </div>
        <CardTitle className="text-xl sm:text-2xl font-bold tracking-tight">
          {isAround
            ? `Explore Around & Nearby ${communityName || ''}`
            : `What's On in ${communityName || 'the Community'}`}
        </CardTitle>
        <CardDescription className="text-sm text-muted-foreground">
          {isAround
            ? 'Regional attractions, day-trip venues, surrounding trails & activity centres.'
            : 'Local happenings, venues, weekly clubs & town events.'}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
            {itemsToDisplay.slice(0, 3).map(item => (
                <WhatsonCard key={item.id} item={item} />
            ))}
        </div>
      </CardContent>
      <CardFooter className="pt-2">
            <Button
              variant="outline"
              asChild
              className={isAround ? "border-sky-200 dark:border-sky-800 hover:bg-sky-50 dark:hover:bg-sky-950/50" : "border-emerald-200 dark:border-emerald-800 hover:bg-emerald-50 dark:hover:bg-emerald-950/50"}
            >
                <Link href={`${demoPrefix}/whatson?scope=${mode}`}>
                  {isAround ? 'Explore All Around & Nearby' : 'See All In Town'}
                  <ArrowRight className={`ml-2 h-4 w-4 ${isAround ? 'text-sky-600' : 'text-emerald-600'}`} />
                </Link>
            </Button>
      </CardFooter>
    </Card>
  );
}
