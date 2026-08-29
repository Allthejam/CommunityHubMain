'use client';

import * as React from 'react';
import { 
  Bus, 
  Train, 
  Car, 
  Phone, 
  ExternalLink, 
  Zap, 
  Bike, 
  Ship, 
  Compass, 
  Navigation, 
  Search, 
  MapPin, 
  Clock, 
  Info, 
  Lightbulb, 
  Sparkles, 
  CheckCircle2, 
  ArrowRight,
  Radio,
  SlidersHorizontal,
  ChevronRight
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useUser, useFirestore, useMemoFirebase, useDoc } from "@/firebase";
import { doc } from 'firebase/firestore';
import { 
  type TravelCategory, 
  type TravelServiceItem, 
  DEFAULT_TRAVEL_SERVICES 
} from "@/lib/types/travel";
import Link from 'next/link';

function getCategoryMeta(category: TravelCategory) {
  switch (category) {
    case 'bus':
      return {
        label: 'Buses & Coaches',
        icon: <Bus className="h-4 w-4" />,
        colorClass: 'bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-950/50 dark:text-sky-300 dark:border-sky-800',
        badgeBg: 'bg-sky-500',
        accentBorder: 'border-t-sky-500',
      };
    case 'train':
      return {
        label: 'Trains & Rail',
        icon: <Train className="h-4 w-4" />,
        colorClass: 'bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/50 dark:text-indigo-300 dark:border-indigo-800',
        badgeBg: 'bg-indigo-500',
        accentBorder: 'border-t-indigo-500',
      };
    case 'taxi':
      return {
        label: 'Taxis & Private Hire',
        icon: <Car className="h-4 w-4" />,
        colorClass: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-800',
        badgeBg: 'bg-amber-500',
        accentBorder: 'border-t-amber-500',
      };
    case 'community':
      return {
        label: 'Community Minibuses',
        icon: <Compass className="h-4 w-4" />,
        colorClass: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800',
        badgeBg: 'bg-emerald-500',
        accentBorder: 'border-t-emerald-500',
      };
    case 'ev_parking':
      return {
        label: 'EV & Parking',
        icon: <Zap className="h-4 w-4" />,
        colorClass: 'bg-teal-50 text-teal-700 border-teal-200 dark:bg-teal-950/50 dark:text-teal-300 dark:border-teal-800',
        badgeBg: 'bg-teal-500',
        accentBorder: 'border-t-teal-500',
      };
    case 'cycling':
      return {
        label: 'Active & Cycling',
        icon: <Bike className="h-4 w-4" />,
        colorClass: 'bg-lime-50 text-lime-700 border-lime-200 dark:bg-lime-950/50 dark:text-lime-300 dark:border-lime-800',
        badgeBg: 'bg-lime-500',
        accentBorder: 'border-t-lime-500',
      };
    case 'ferry':
      return {
        label: 'Ferries & Boats',
        icon: <Ship className="h-4 w-4" />,
        colorClass: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/50 dark:text-blue-300 dark:border-blue-800',
        badgeBg: 'bg-blue-500',
        accentBorder: 'border-t-blue-500',
      };
  }
}

export default function TravelPage() {
  const { user } = useUser();
  const db = useFirestore();

  const userProfileRef = useMemoFirebase(() => (user && db ? doc(db, 'users', user.uid) : null), [user, db]);
  const { data: userProfile } = useDoc(userProfileRef);

  const effectiveCommunityId = userProfile?.communityId || 'c_showhome';

  const communityDocRef = useMemoFirebase(() => (effectiveCommunityId && db ? doc(db, 'communities', effectiveCommunityId) : null), [effectiveCommunityId, db]);
  const { data: communityData } = useDoc(communityDocRef);

  const communityName = communityData?.name || userProfile?.communityName || 'Grantown-on-Spey & Strathspey';

  // Read custom travel services from community if saved, or fallback to default for sample community
  const travelServices: TravelServiceItem[] = React.useMemo(() => {
    if (communityData?.travelServices && Array.isArray(communityData.travelServices)) {
      return communityData.travelServices.filter((s: TravelServiceItem) => s.isActive !== false);
    }
    if (effectiveCommunityId === 'c_showhome' || (communityName && communityName.toLowerCase().includes('grantown'))) {
      return DEFAULT_TRAVEL_SERVICES;
    }
    return [];
  }, [communityData, effectiveCommunityId, communityName]);

  const [activeTab, setActiveTab] = React.useState<string>('all');
  const [searchQuery, setSearchQuery] = React.useState<string>('');

  const filteredServices = React.useMemo(() => {
    return travelServices.filter(item => {
      // 1. Tab filter
      if (activeTab !== 'all' && item.category !== activeTab) {
        return false;
      }
      // 2. Search query filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const titleMatch = (item.title || '').toLowerCase().includes(q);
        const operatorMatch = (item.operator || '').toLowerCase().includes(q);
        const destMatch = (item.destinations || '').toLowerCase().includes(q);
        const routeMatch = (item.routeNumber || '').toLowerCase().includes(q);
        const stationMatch = (item.stationName || '').toLowerCase().includes(q);
        return titleMatch || operatorMatch || destMatch || routeMatch || stationMatch;
      }
      return true;
    });
  }, [travelServices, activeTab, searchQuery]);

  const countsByCategory = React.useMemo(() => {
    const counts: Record<string, number> = { all: travelServices.length };
    travelServices.forEach(s => {
      counts[s.category] = (counts[s.category] || 0) + 1;
    });
    return counts;
  }, [travelServices]);

  return (
    <div className="space-y-8 pb-16 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-4">
      
      {/* Hero Travel Command Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-sky-600 via-indigo-600 to-primary p-6 sm:p-10 text-white shadow-xl">
        <div className="relative z-10 max-w-3xl space-y-3">
          <div className="flex items-center gap-2 flex-wrap">
            <Badge className="bg-white/20 hover:bg-white/30 text-white font-bold px-3 py-1 text-xs backdrop-blur-md border-white/20 gap-1.5 shadow-xs">
              <Navigation className="h-3.5 w-3.5" />
              Getting Around & Local Transit
            </Badge>
            <Badge className="bg-white/10 text-white font-medium text-xs backdrop-blur-md border-white/10 gap-1">
              <MapPin className="h-3 w-3 text-sky-200" />
              {communityName}
            </Badge>
            <span className="text-[11px] font-semibold bg-emerald-400/20 text-emerald-100 border border-emerald-300/30 px-2.5 py-0.5 rounded-full backdrop-blur-md">
              ⚡ Zero-Cost Live Deep-Links
            </span>
          </div>

          <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight font-headline text-white leading-tight">
            Local Travel & Transit Guide
          </h1>
          <p className="text-sm sm:text-base text-slate-100/90 leading-relaxed">
            Direct access to local bus timetables, live vehicle trackers, nearest train connections, registered taxi dials, community dial-a-ride, and EV charging points for <strong className="text-white underline underline-offset-2">{communityName}</strong>.
          </p>

          {/* Quick Search Bar */}
          <div className="pt-3 max-w-xl">
            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input 
                type="text"
                placeholder="Search bus routes (e.g. 37), train stations, taxi firms, or destinations..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 pr-4 py-2.5 h-11 bg-white dark:bg-card text-foreground placeholder:text-muted-foreground rounded-2xl shadow-lg border-0 focus-visible:ring-2 focus-visible:ring-sky-400 text-sm font-medium"
              />
              {searchQuery && (
                <button 
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs text-muted-foreground hover:text-foreground font-semibold"
                >
                  Clear
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Decorative Background Icon */}
        <Compass className="absolute right-6 -bottom-8 h-64 w-64 text-white/10 pointer-events-none transform rotate-12" />
      </div>

      {/* Category Navigation Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full space-y-6">
        <div className="flex items-center justify-between overflow-x-auto pb-2 scrollbar-none">
          <TabsList className="h-11 p-1 bg-muted/80 backdrop-blur-md rounded-2xl border flex-nowrap gap-1">
            <TabsTrigger value="all" className="rounded-xl text-xs font-semibold px-3.5 data-[state=active]:bg-card data-[state=active]:shadow-xs">
              All Modes ({countsByCategory['all'] || 0})
            </TabsTrigger>
            <TabsTrigger value="bus" className="rounded-xl text-xs font-semibold px-3.5 gap-1.5 data-[state=active]:bg-card data-[state=active]:shadow-xs">
              <Bus className="h-3.5 w-3.5 text-sky-600" />
              Buses ({countsByCategory['bus'] || 0})
            </TabsTrigger>
            <TabsTrigger value="train" className="rounded-xl text-xs font-semibold px-3.5 gap-1.5 data-[state=active]:bg-card data-[state=active]:shadow-xs">
              <Train className="h-3.5 w-3.5 text-indigo-600" />
              Trains ({countsByCategory['train'] || 0})
            </TabsTrigger>
            <TabsTrigger value="taxi" className="rounded-xl text-xs font-semibold px-3.5 gap-1.5 data-[state=active]:bg-card data-[state=active]:shadow-xs">
              <Car className="h-3.5 w-3.5 text-amber-600" />
              Taxis ({countsByCategory['taxi'] || 0})
            </TabsTrigger>
            <TabsTrigger value="community" className="rounded-xl text-xs font-semibold px-3.5 gap-1.5 data-[state=active]:bg-card data-[state=active]:shadow-xs">
              <Compass className="h-3.5 w-3.5 text-emerald-600" />
              Dial-a-Ride ({countsByCategory['community'] || 0})
            </TabsTrigger>
            <TabsTrigger value="ev_parking" className="rounded-xl text-xs font-semibold px-3.5 gap-1.5 data-[state=active]:bg-card data-[state=active]:shadow-xs">
              <Zap className="h-3.5 w-3.5 text-teal-600" />
              EV & Parking ({countsByCategory['ev_parking'] || 0})
            </TabsTrigger>
            <TabsTrigger value="cycling" className="rounded-xl text-xs font-semibold px-3.5 gap-1.5 data-[state=active]:bg-card data-[state=active]:shadow-xs">
              <Bike className="h-3.5 w-3.5 text-lime-600" />
              Cycling ({countsByCategory['cycling'] || 0})
            </TabsTrigger>
          </TabsList>
        </div>

        {/* Services Cards Grid */}
        {filteredServices.length === 0 ? (
          <div className="rounded-3xl border border-dashed p-12 text-center space-y-3 bg-muted/20">
            <Compass className="h-10 w-10 text-muted-foreground mx-auto" />
            <h3 className="text-base font-bold text-foreground">No Transit Services Found</h3>
            <p className="text-xs text-muted-foreground max-w-sm mx-auto">
              No transport services matched your search &quot;{searchQuery}&quot;. Try resetting your filters.
            </p>
            <Button variant="outline" size="sm" onClick={() => { setActiveTab('all'); setSearchQuery(''); }}>
              Reset Filters
            </Button>
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {filteredServices.map((service) => {
              const meta = getCategoryMeta(service.category);
              return (
                <Card 
                  key={service.id} 
                  className={`flex flex-col border-t-4 ${meta.accentBorder} shadow-sm hover:shadow-md transition-all duration-200 bg-card`}
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="space-y-1">
                        <Badge variant="outline" className={`text-[10px] font-bold gap-1 py-0.5 ${meta.colorClass}`}>
                          {meta.icon}
                          {meta.label}
                        </Badge>
                        <p className="text-xs font-extrabold text-slate-800 dark:text-slate-200 tracking-tight">{service.operator}</p>
                      </div>

                      {service.routeNumber && (
                        <div className="px-2.5 py-1 rounded-xl bg-primary/10 text-primary font-black text-sm border border-primary/20 shrink-0">
                          {service.routeNumber}
                        </div>
                      )}
                    </div>

                    <CardTitle className="text-base font-extrabold tracking-tight text-foreground pt-1">
                      {service.title}
                    </CardTitle>
                    {service.destinations && (
                      <div className="mt-1 p-2 rounded-lg bg-muted/60 dark:bg-muted/40 border border-border/60">
                        <p className="text-xs font-bold text-slate-900 dark:text-slate-100 leading-snug">
                          {service.destinations}
                        </p>
                      </div>
                    )}
                  </CardHeader>

                  <CardContent className="space-y-3 flex-1 pb-3 text-xs">
                    {service.frequency && (
                      <div className="flex items-center gap-2 text-slate-900 dark:text-slate-100 bg-slate-100 dark:bg-slate-800/80 p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 font-semibold">
                        <Clock className="h-4 w-4 text-primary shrink-0" />
                        <span>{service.frequency}</span>
                      </div>
                    )}

                    {service.distanceFromCentre && (
                      <div className="flex items-center gap-2 text-slate-900 dark:text-slate-100 bg-slate-100 dark:bg-slate-800/80 p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 font-semibold">
                        <MapPin className="h-4 w-4 text-sky-600 shrink-0" />
                        <span>{service.distanceFromCentre}</span>
                      </div>
                    )}

                    {service.description && (
                      <p className="text-slate-800 dark:text-slate-200 text-xs font-medium leading-relaxed">
                        {service.description}
                      </p>
                    )}

                    {/* High-Contrast Local Insider Advice */}
                    {service.localTips && (
                      <div className="p-3 rounded-xl bg-amber-100 dark:bg-amber-950/80 border-2 border-amber-300 dark:border-amber-700 space-y-1.5 shadow-xs">
                        <div className="flex items-center gap-1.5 font-black text-xs text-amber-950 dark:text-amber-100">
                          <Lightbulb className="h-4 w-4 text-amber-700 dark:text-amber-400 shrink-0" />
                          <span>Local Community Tip</span>
                        </div>
                        <p className="text-xs font-semibold leading-relaxed text-amber-950 dark:text-amber-100">
                          {service.localTips}
                        </p>
                      </div>
                    )}
                  </CardContent>

                  <CardFooter className="pt-2 border-t flex flex-wrap gap-2">
                    {/* Live Tracker Direct Link */}
                    {service.liveTrackerUrl && (
                      <Button asChild size="sm" className="flex-1 font-semibold text-xs bg-primary hover:bg-primary/90 text-primary-foreground shadow-xs gap-1.5">
                        <a href={service.liveTrackerUrl} target="_blank" rel="noopener noreferrer">
                          <Radio className="h-3.5 w-3.5" />
                          Live Tracker
                          <ExternalLink className="h-3 w-3 ml-0.5 opacity-80" />
                        </a>
                      </Button>
                    )}

                    {/* Timetable Link */}
                    {service.timetableUrl && (
                      <Button asChild size="sm" variant="outline" className="flex-1 font-semibold text-xs gap-1.5">
                        <a href={service.timetableUrl} target="_blank" rel="noopener noreferrer">
                          Timetable
                          <ExternalLink className="h-3 w-3 ml-0.5 opacity-80" />
                        </a>
                      </Button>
                    )}

                    {/* Taxi Phone Call */}
                    {service.telephone && (
                      <Button asChild size="sm" className="flex-1 font-semibold text-xs bg-amber-600 hover:bg-amber-700 text-white shadow-xs gap-1.5">
                        <a href={`tel:${service.telephone}`}>
                          <Phone className="h-3.5 w-3.5" />
                          Call {service.telephone}
                        </a>
                      </Button>
                    )}

                    {/* Booking Link */}
                    {service.bookingUrl && !service.liveTrackerUrl && (
                      <Button asChild size="sm" className="flex-1 font-semibold text-xs bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs gap-1.5">
                        <a href={service.bookingUrl} target="_blank" rel="noopener noreferrer">
                          Book Tickets
                          <ExternalLink className="h-3 w-3 ml-0.5 opacity-80" />
                        </a>
                      </Button>
                    )}

                    {/* Map Pin Location */}
                    {service.mapLocationUrl && (
                      <Button asChild size="sm" variant="ghost" className="text-xs text-muted-foreground hover:text-foreground">
                        <a href={service.mapLocationUrl} target="_blank" rel="noopener noreferrer">
                          <MapPin className="h-3.5 w-3.5 mr-1" /> Map Location
                        </a>
                      </Button>
                    )}
                  </CardFooter>
                </Card>
              );
            })}
          </div>
        )}
      </Tabs>

      {/* Leader & Community Contribution Banner */}
      <div className="rounded-2xl border bg-gradient-to-r from-card via-muted/30 to-card p-5 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-primary/10 text-primary shrink-0">
            <Info className="h-5 w-5" />
          </div>
          <div>
            <p className="font-bold text-foreground">Are you a Community Leader or Local Operator?</p>
            <p className="text-muted-foreground">Keep your community transit guide up to date with new bus routes, railway timetables, or taxi contacts.</p>
          </div>
        </div>

        <Button asChild size="sm" variant="outline" className="font-semibold shrink-0 text-xs gap-1.5">
          <Link href="/leader/travel">
            Manage Travel Hub <ChevronRight className="h-3.5 w-3.5" />
          </Link>
        </Button>
      </div>

    </div>
  );
}
