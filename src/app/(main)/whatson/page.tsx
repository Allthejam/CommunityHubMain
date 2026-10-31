"use client";

import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Loader2,
  Globe,
  Mail,
  Phone,
  Share2,
  Clock,
  MapPin,
  LayoutGrid,
  List,
  ArrowRight,
  ExternalLink,
  Compass,
} from "lucide-react";
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
      {days.map((day) => {
        const dayData = hours[day];
        if (!dayData) return null;
        const displayTime = dayData.closed ? 'Closed' : `${dayData.open} - ${dayData.close}`;
        return (
          <div key={day} className="flex justify-between text-sm">
            <span className="capitalize">{day}</span>
            <span className="text-muted-foreground">{displayTime}</span>
          </div>
        );
      })}
    </div>
  );
};

const WhatsonDialogContent = ({ item }: { item: WhatsonItem }) => {
  const isDemo = typeof window !== 'undefined' && (sessionStorage.getItem('isDemoMode') === 'true' || window.location.pathname.startsWith('/demo'));
  const demoPrefix = isDemo ? '/demo' : '';

  return (
    <>
      <DialogHeader className="p-6 pb-0">
        <div className="flex items-center gap-2 mb-2 flex-wrap">
          <Badge variant="outline" className="font-semibold text-xs">
            {item.category}
          </Badge>
          {item.scope === 'around' ? (
            <Badge className="bg-sky-600 hover:bg-sky-700 text-white font-semibold text-xs gap-1">
              <Compass className="h-3 w-3" /> Around & Nearby {item.areaName ? `· ${item.areaName}` : ''}
            </Badge>
          ) : (
            <Badge className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs gap-1">
              <MapPin className="h-3 w-3" /> In Town · Local
            </Badge>
          )}
        </div>
        <DialogTitle className="text-2xl font-bold tracking-tight">{item.title}</DialogTitle>
        {item.scope === 'around' && item.areaName && (
          <DialogDescription className="text-sky-600 dark:text-sky-400 font-medium text-xs">
            Surrounding Area: {item.areaName}
          </DialogDescription>
        )}
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
                  <h4 className="font-semibold text-md mb-2 flex items-center gap-2">
                    <Clock className="h-4 w-4" /> Opening Hours
                  </h4>
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
                      <a
                        href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(item.address)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary hover:underline"
                      >
                        {item.address}
                      </a>
                    </div>
                  )}
                  {item.phone && (
                    <div className="flex items-center gap-2">
                      <Phone className="h-4 w-4" />
                      <a href={`tel:${item.phone}`} className="text-primary hover:underline">
                        {item.phone}
                      </a>
                    </div>
                  )}
                  {item.email && (
                    <div className="flex items-center gap-2">
                      <Mail className="h-4 w-4" />
                      <a href={`mailto:${item.email}`} className="text-primary hover:underline">
                        {item.email}
                      </a>
                    </div>
                  )}
                  {item.website && (
                    <div className="flex items-center gap-2">
                      <Globe className="h-4 w-4" />
                      <a href={item.website} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                        Visit Website
                      </a>
                    </div>
                  )}
                  {item.social && (
                    <div className="flex items-center gap-2">
                      <Share2 className="h-4 w-4" />
                      <a href={item.social} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                        Social Media
                      </a>
                    </div>
                  )}
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

const WhatsonRow = ({ item }: { item: WhatsonItem }) => (
  <Dialog>
    <DialogTrigger asChild>
      <Card className="flex items-center p-4 cursor-pointer hover:shadow-md transition-shadow">
        <div className="relative h-16 w-16 flex-shrink-0 mr-4 rounded-md overflow-hidden bg-muted">
          <Image
            src={item.image || 'https://picsum.photos/seed/whatson-list/400'}
            alt={item.title}
            fill
            className="object-cover"
            data-ai-hint={item.dataAiHint || "local attraction"}
          />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <Badge variant="outline" className="text-[11px] font-medium">
              {item.category}
            </Badge>
            {item.scope === 'around' ? (
              <Badge className="text-[10px] font-semibold bg-sky-600 text-white">
                Around {item.areaName ? `· ${item.areaName}` : ''}
              </Badge>
            ) : (
              <Badge className="text-[10px] font-semibold bg-emerald-600 text-white">
                In Town
              </Badge>
            )}
          </div>
          <h3 className="font-semibold truncate">{item.title}</h3>
          {item.address && <p className="text-xs text-muted-foreground truncate">{item.address}</p>}
        </div>
        <Button variant="secondary" size="sm" className="ml-4 shrink-0">
          More Info
        </Button>
      </Card>
    </DialogTrigger>
    <DialogContent className="sm:max-w-xl p-0">
      <WhatsonDialogContent item={item} />
    </DialogContent>
  </Dialog>
);

function WhatsonContent() {
  const searchParams = useSearchParams();
  const urlScope = searchParams.get('scope');

  const { user, isUserLoading: authLoading } = useUser();
  const db = useFirestore();
  const [view, setView] = React.useState('grid');

  const userProfileRef = useMemoFirebase(() => (user && db ? doc(db, "users", user.uid) : null), [user, db]);
  const { data: userProfile, isLoading: profileLoading } = useDoc(userProfileRef);

  const isDemo = typeof window !== 'undefined' && (sessionStorage.getItem('isDemoMode') === 'true' || window.location.pathname.startsWith('/demo'));
  const activeCommunityId = isDemo
    ? '9ayHMyZf4SRw2gof1AM9'
    : ((typeof window !== 'undefined' ? sessionStorage.getItem('visitedCommunityId') : null) ||
        userProfile?.primaryHomeCommunityId ||
        userProfile?.homeCommunityId ||
        userProfile?.communityId);

  const communityDocRef = useMemoFirebase(
    () => (activeCommunityId && db ? doc(db, "communities", activeCommunityId) : null),
    [activeCommunityId, db]
  );
  const { data: activeCommunity } = useDoc<any>(communityDocRef);
  const communityName = activeCommunity?.name || (isDemo ? 'Grantown-on-Spey' : '');

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

  const loading = authLoading || profileLoading || itemsLoading;

  // Scope filter: 'in' | 'around' | 'all' (defaulting to 'in' - In Town / Community)
  const [scopeFilter, setScopeFilter] = React.useState<'all' | 'in' | 'around'>(() => {
    if (urlScope === 'around') return 'around';
    if (urlScope === 'all') return 'all';
    return 'in';
  });

  React.useEffect(() => {
    if (urlScope === 'around') {
      setScopeFilter('around');
    } else if (urlScope === 'all') {
      setScopeFilter('all');
    } else if (urlScope === 'in') {
      setScopeFilter('in');
    }
  }, [urlScope]);

  const [activeCategory, setActiveCategory] = React.useState("All");

  const whatsonToDisplay = React.useMemo(() => {
    const dbItems = whatsonItems || [];
    const combined = [...localDemoItems, ...dbItems.filter(d => !localDemoItems.some(l => l.id === d.id))];
    if (combined.length > 0) return combined;
    return mockWhatsOn.map(item => ({
      ...item,
      address: item.address || item.location,
      image: (item.image as any)?.imageUrl || 'https://picsum.photos/seed/whatson-placeholder/600/400',
      dataAiHint: (item.image as any)?.imageHint || 'local attraction'
    } as WhatsonItem));
  }, [whatsonItems, localDemoItems]);

  // Counts
  const inCount = React.useMemo(() => (whatsonToDisplay || []).filter(i => i.scope !== 'around').length, [whatsonToDisplay]);
  const aroundCount = React.useMemo(() => (whatsonToDisplay || []).filter(i => i.scope === 'around').length, [whatsonToDisplay]);

  // Scope filtering
  const scopeFilteredItems = React.useMemo(() => {
    if (!whatsonToDisplay) return [];
    if (scopeFilter === 'in') {
      return whatsonToDisplay.filter(i => i.scope !== 'around');
    }
    if (scopeFilter === 'around') {
      return whatsonToDisplay.filter(i => i.scope === 'around');
    }
    return whatsonToDisplay;
  }, [whatsonToDisplay, scopeFilter]);

  // Available categories based on current scope
  const allCategories = React.useMemo(() => {
    if (!scopeFilteredItems) return ["All"];
    return ["All", ...Array.from(new Set(scopeFilteredItems.map(item => item.category)))];
  }, [scopeFilteredItems]);

  // Reset category if not present in new scope
  React.useEffect(() => {
    if (activeCategory !== 'All' && !allCategories.includes(activeCategory)) {
      setActiveCategory('All');
    }
  }, [allCategories, activeCategory]);

  const filteredItems = React.useMemo(() => {
    if (activeCategory === "All") return scopeFilteredItems;
    return scopeFilteredItems.filter(item => item.category === activeCategory);
  }, [scopeFilteredItems, activeCategory]);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight font-headline">
            {scopeFilter === 'in'
              ? `What's On in ${communityName ? communityName : 'the Community'}`
              : scopeFilter === 'around'
              ? `Explore Around & Nearby ${communityName || ''}`
              : `What's On In & Around ${communityName ? communityName : 'the Community'}`}
          </h1>
          <p className="text-muted-foreground mt-1">
            {scopeFilter === 'in'
              ? `Local happenings, venues, weekly clubs, and town attractions in ${communityName || 'the community'}.`
              : scopeFilter === 'around'
              ? `Regional attractions, day-trip venues, and surrounding trails near ${communityName || 'the area'}.`
              : 'Discover local town venues, clubs, regional attractions, and surrounding day-trip destinations.'}
          </p>
        </div>
        <div className="flex items-center gap-1 rounded-md bg-muted p-1 shrink-0">
          <Button variant={view === 'grid' ? 'default' : 'ghost'} size="sm" onClick={() => setView('grid')}>
            <LayoutGrid className="h-4 w-4" />
            <span className="hidden sm:inline ml-2">Grid</span>
          </Button>
          <Button variant={view === 'list' ? 'default' : 'ghost'} size="sm" onClick={() => setView('list')}>
            <List className="h-4 w-4" />
            <span className="hidden sm:inline ml-2">List</span>
          </Button>
        </div>
      </div>

      {/* Scope Segmented Switcher */}
      <div className="flex flex-wrap items-center gap-2 p-1.5 bg-muted/60 dark:bg-muted/30 rounded-xl border w-fit">
        <Button
          size="sm"
          variant={scopeFilter === 'in' ? 'default' : 'ghost'}
          onClick={() => setScopeFilter('in')}
          className={`font-medium text-xs sm:text-sm gap-1.5 ${
            scopeFilter === 'in'
              ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm'
              : 'text-emerald-700 dark:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-950/40'
          }`}
        >
          <MapPin className="h-3.5 w-3.5" />
          In {communityName || 'Town'} ({inCount})
        </Button>
        <Button
          size="sm"
          variant={scopeFilter === 'around' ? 'default' : 'ghost'}
          onClick={() => setScopeFilter('around')}
          className={`font-medium text-xs sm:text-sm gap-1.5 ${
            scopeFilter === 'around'
              ? 'bg-sky-600 hover:bg-sky-700 text-white shadow-sm'
              : 'text-sky-700 dark:text-sky-300 hover:bg-sky-50 dark:hover:bg-sky-950/40'
          }`}
        >
          <Compass className="h-3.5 w-3.5" />
          Around &amp; Nearby ({aroundCount})
        </Button>
        <Button
          size="sm"
          variant={scopeFilter === 'all' ? 'default' : 'ghost'}
          onClick={() => setScopeFilter('all')}
          className="font-medium text-xs sm:text-sm"
        >
          All In &amp; Around ({whatsonToDisplay.length})
        </Button>
      </div>

      {/* Category Filter Chips */}
      {allCategories.length > 1 && (
        <div className="flex flex-wrap gap-2">
          {allCategories.map((category) => (
            <Button
              key={category}
              variant={activeCategory === category ? "default" : "outline"}
              size="sm"
              onClick={() => setActiveCategory(category)}
            >
              {category}
            </Button>
          ))}
        </div>
      )}

      {/* Content Rendering */}
      {view === 'grid' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {filteredItems && filteredItems.length > 0 ? (
            filteredItems.map((item) => (
              <Dialog key={item.id}>
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
                      <h3 className="font-semibold text-base line-clamp-2 leading-snug">{item.title}</h3>
                      {item.address && (
                        <p className="text-xs text-muted-foreground flex items-center gap-1 truncate pt-1">
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
            ))
          ) : (
            <div className="col-span-full text-center py-12 bg-muted/20 rounded-xl border border-dashed">
              <p className="text-muted-foreground font-medium">
                No items found for this selection. Check back soon!
              </p>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {filteredItems && filteredItems.length > 0 ? (
            filteredItems.map((item) => <WhatsonRow key={item.id} item={item} />)
          ) : (
            <div className="text-center py-12 bg-muted/20 rounded-xl border border-dashed">
              <p className="text-muted-foreground font-medium">
                No items found for this selection. Check back soon!
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function WhatsonPage() {
  return (
    <React.Suspense
      fallback={
        <div className="flex justify-center items-center h-96">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      }
    >
      <WhatsonContent />
    </React.Suspense>
  );
}
