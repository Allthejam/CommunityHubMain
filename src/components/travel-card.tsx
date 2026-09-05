'use client';

import * as React from 'react';
import { 
  Navigation, 
  Bus, 
  Train, 
  Car, 
  Phone, 
  Zap, 
  Radio, 
  ExternalLink, 
  ChevronRight, 
  Clock, 
  MapPin, 
  Compass,
  ArrowRight
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { useFirestore, useDoc, useMemoFirebase } from "@/firebase";
import { doc } from 'firebase/firestore';
import { 
  type TravelServiceItem, 
  DEFAULT_TRAVEL_SERVICES 
} from "@/lib/types/travel";

export function TravelCard({ communityId }: { communityId?: string | null }) {
  const db = useFirestore();

  const effectiveId = communityId || '9ayHMyZf4SRw2gof1AM9';
  const communityDocRef = useMemoFirebase(() => (effectiveId && db ? doc(db, 'communities', effectiveId) : null), [effectiveId, db]);
  const { data: communityData } = useDoc(communityDocRef);

  const communityName = communityData?.name || 'Show Home Community, "Display Only"';

  const travelServices: TravelServiceItem[] = React.useMemo(() => {
    if (communityData?.travelServices && Array.isArray(communityData.travelServices)) {
      return communityData.travelServices.filter((s: TravelServiceItem) => s.isActive !== false);
    }
    if (effectiveId === '9ayHMyZf4SRw2gof1AM9' || effectiveId === 'c_showhome' || (communityName && (communityName.toLowerCase().includes('oakridge') || communityName.toLowerCase().includes('show') || communityName.toLowerCase().includes('demo')))) {
      return DEFAULT_TRAVEL_SERVICES;
    }
    return [];
  }, [communityData, effectiveId, communityName]);

  const topBuses = React.useMemo(() => {
    return travelServices.filter(s => s.category === 'bus').slice(0, 2);
  }, [travelServices]);

  const nearestTrain = React.useMemo(() => {
    return travelServices.find(s => s.category === 'train');
  }, [travelServices]);

  const localTaxi = React.useMemo(() => {
    return travelServices.find(s => s.category === 'taxi' && s.telephone);
  }, [travelServices]);

  const evPoint = React.useMemo(() => {
    return travelServices.find(s => s.category === 'ev_parking');
  }, [travelServices]);

  if (travelServices.length === 0) {
    return null;
  }

  return (
    <Card className="border-t-4 border-t-sky-500 shadow-sm hover:shadow-md transition-shadow bg-gradient-to-br from-card via-card to-sky-50/15 dark:to-sky-950/10">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-sky-100 dark:bg-sky-950/60 text-sky-600 dark:text-sky-400 border border-sky-200 dark:border-sky-800 shadow-xs">
              <Navigation className="h-5 w-5" />
            </div>
            <div>
              <CardTitle className="text-base font-bold">Local Travel & Getting Around</CardTitle>
              <CardDescription className="text-xs">Live buses, trains, and taxi links</CardDescription>
            </div>
          </div>
          <Badge variant="outline" className="bg-sky-50 dark:bg-sky-950/40 text-sky-700 dark:text-sky-300 border-sky-200 dark:border-sky-800 text-[10px] font-semibold gap-1">
            <span className="h-1.5 w-1.5 rounded-full bg-sky-500 animate-pulse" />
            Live Links
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-3 pb-3 text-xs">
        
        {/* Top Bus Routes */}
        {topBuses.length > 0 && (
          <div className="space-y-1.5">
            <p className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5 text-[11px]">
              <Bus className="h-3.5 w-3.5 text-sky-600" />
              <span>Primary Bus Routes</span>
            </p>
            <div className="grid grid-cols-1 gap-2">
              {topBuses.map((bus) => (
                <div key={bus.id} className="p-2.5 rounded-xl bg-sky-50/80 dark:bg-sky-950/40 border border-sky-200 dark:border-sky-800 flex items-center justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <span className="font-black text-sky-900 dark:text-sky-200 bg-sky-200 dark:bg-sky-900 px-1.5 py-0.5 rounded text-[11px]">
                        {bus.routeNumber || 'Bus'}
                      </span>
                      <span className="font-extrabold text-foreground truncate text-xs">{bus.title}</span>
                    </div>
                    <p className="text-xs font-medium text-slate-700 dark:text-slate-300 truncate mt-0.5">{bus.destinations}</p>
                  </div>

                  {bus.liveTrackerUrl && (
                    <Button asChild size="sm" variant="ghost" className="h-7 px-2.5 text-xs font-bold text-sky-800 dark:text-sky-200 hover:bg-sky-100 dark:hover:bg-sky-900/60 shrink-0">
                      <a href={bus.liveTrackerUrl} target="_blank" rel="noopener noreferrer">
                        <Radio className="h-3 w-3 mr-1 text-sky-600" /> Live
                      </a>
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Rail & Taxi Highlights Grid */}
        <div className="grid grid-cols-2 gap-2 pt-1">
          {/* Nearest Train */}
          {nearestTrain ? (
            <div className="p-2.5 rounded-xl bg-indigo-50/80 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 space-y-1">
              <div className="flex items-center gap-1 font-extrabold text-indigo-950 dark:text-indigo-200 text-[11px]">
                <Train className="h-3.5 w-3.5 text-indigo-600 shrink-0" />
                <span className="truncate">{nearestTrain.stationName || 'Nearest Rail'}</span>
              </div>
              <p className="text-[11px] font-medium text-slate-700 dark:text-slate-300 truncate">{nearestTrain.distanceFromCentre || nearestTrain.destinations}</p>
              {nearestTrain.liveTrackerUrl && (
                <a 
                  href={nearestTrain.liveTrackerUrl} 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="inline-flex items-center gap-1 text-[11px] font-bold text-indigo-700 dark:text-indigo-300 hover:underline pt-0.5"
                >
                  Departures <ExternalLink className="h-2.5 w-2.5" />
                </a>
              )}
            </div>
          ) : null}

          {/* Quick Taxi */}
          {localTaxi && localTaxi.telephone ? (
            <div className="p-2.5 rounded-xl bg-amber-50/80 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 space-y-1">
              <div className="flex items-center gap-1 font-extrabold text-amber-950 dark:text-amber-200 text-[11px]">
                <Car className="h-3.5 w-3.5 text-amber-600 shrink-0" />
                <span className="truncate">{localTaxi.operator}</span>
              </div>
              <p className="text-[11px] font-medium text-slate-700 dark:text-slate-300 truncate">Local taxi service</p>
              <a 
                href={`tel:${localTaxi.telephone}`} 
                className="inline-flex items-center gap-1 text-[11px] font-extrabold text-amber-800 dark:text-amber-300 hover:underline pt-0.5"
              >
                <Phone className="h-2.5 w-2.5" /> {localTaxi.telephone}
              </a>
            </div>
          ) : null}
        </div>

      </CardContent>

      <CardFooter className="pt-0">
        <Button asChild size="sm" variant="outline" className="w-full text-xs font-semibold border-sky-200 dark:border-sky-800 hover:bg-sky-50 dark:hover:bg-sky-950/40 text-sky-700 dark:text-sky-300 justify-between">
          <Link href="/travel">
            <span>View Full Travel Guide & Timetables</span>
            <ChevronRight className="h-3.5 w-3.5" />
          </Link>
        </Button>
      </CardFooter>
    </Card>
  );
}
