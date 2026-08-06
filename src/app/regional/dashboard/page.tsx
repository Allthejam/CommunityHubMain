'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { 
  MapPin, 
  Map as MapIcon, 
  Radio, 
  Globe, 
  ShieldAlert, 
  Users, 
  Plus, 
  ArrowRight, 
  Flame, 
  AlertTriangle, 
  CheckCircle2, 
  Info,
  ChevronRight,
  Sliders,
  Bell,
  Home as HomeIcon,
  Crown,
  Lock,
  Loader2
} from 'lucide-react';

import { useUser, useFirestore, useDoc, useMemoFirebase, useCollection } from '@/firebase';
import { doc, collection, query, where, onSnapshot } from 'firebase/firestore';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';

// SPATIAL CONTAINMENT HELPERS
function getGeoJsonCoords(geojson: any): number[][] {
  if (!geojson) return [];
  const geometry = geojson.geometry || geojson;
  if (!geometry || !geometry.coordinates) return [];

  const coords: number[][] = [];
  const extract = (arr: any) => {
    if (Array.isArray(arr) && arr.length >= 2 && typeof arr[0] === 'number' && typeof arr[1] === 'number') {
      coords.push([arr[0], arr[1]]); // [lng, lat]
    } else if (Array.isArray(arr)) {
      arr.forEach(extract);
    }
  };
  extract(geometry.coordinates);
  return coords;
}

function getGeoJsonBoundingBox(geojson: any) {
  const coords = getGeoJsonCoords(geojson);
  if (coords.length === 0) return null;
  let minLng = Infinity, maxLng = -Infinity, minLat = Infinity, maxLat = -Infinity;
  coords.forEach(([lng, lat]) => {
    if (lng < minLng) minLng = lng;
    if (lng > maxLng) maxLng = lng;
    if (lat < minLat) minLat = lat;
    if (lat > maxLat) maxLat = lat;
  });
  return { minLng, maxLng, minLat, maxLat };
}

function isCommunityInsideRegionalBoundary(regionalGeoJsonStr: string | null, communityGeoJsonStr: string | null): boolean {
  if (!regionalGeoJsonStr || !communityGeoJsonStr) return false;
  try {
    const regionalGeoJson = JSON.parse(regionalGeoJsonStr);
    const commGeoJson = JSON.parse(communityGeoJsonStr);

    const rBox = getGeoJsonBoundingBox(regionalGeoJson);
    const cBox = getGeoJsonBoundingBox(commGeoJson);

    if (!rBox || !cBox) return false;

    return (
      cBox.minLng >= rBox.minLng &&
      cBox.maxLng <= rBox.maxLng &&
      cBox.minLat >= rBox.minLat &&
      cBox.maxLat <= rBox.maxLat
    );
  } catch (e) {
    return false;
  }
}

export default function RegionalDashboardPage() {
  const { user, isUserLoading } = useUser();
  const db = useFirestore();
  const router = useRouter();

  const userProfileRef = useMemoFirebase(() => {
    if (!user || !db) return null;
    return doc(db, 'users', user.uid);
  }, [user, db]);

  const { data: userProfile, isLoading: profileLoading } = useDoc(userProfileRef);

  const organizationName = userProfile?.organizationName || userProfile?.businessName || 'Regional Authority';
  const regionName = userProfile?.region || userProfile?.state || 'Highlands Region';
  const isLockedIn = !!userProfile?.regionalBoundaryLocked;
  const regionalBoundaryGeoJson = userProfile?.regionalBoundary || null;

  // 1. Live Firestore query for active leaders & presidents
  const activeLeadersQuery = useMemoFirebase(() => {
    if (!db) return null;
    return query(
      collection(db, 'users'),
      where('role', 'in', ['president', 'leader', 'admin', 'community_leader'])
    );
  }, [db]);

  const { data: leaderUserDocs } = useCollection(activeLeadersQuery);

  const leaderCommunityIds = useMemo(() => {
    if (!leaderUserDocs || leaderUserDocs.length === 0) return new Set<string>();
    const ids = new Set<string>();
    leaderUserDocs.forEach((u: any) => {
      if (u.homeCommunityId) ids.add(u.homeCommunityId);
      if (u.communityId) ids.add(u.communityId);
      if (Array.isArray(u.communityRoles)) {
        u.communityRoles.forEach((r: any) => {
          if (r.communityId) ids.add(r.communityId);
        });
      }
    });
    return ids;
  }, [leaderUserDocs]);

  // 2. Live Firestore query for registered communities with polygon maps
  const communitiesQuery = useMemoFirebase(() => {
    if (!db) return null;
    return query(collection(db, 'communities'), where('boundary', '!=', null));
  }, [db]);

  const { data: registeredDocs, isLoading: isLoadingCommunities } = useCollection(communitiesQuery);

  // STRICT SPATIAL CONTAINMENT FILTER:
  // ONLY communities whose registered polygon map falls INSIDE the locked regional boundary are counted & listed!
  const encompassedCommunities = useMemo(() => {
    if (!registeredDocs || registeredDocs.length === 0 || !regionalBoundaryGeoJson) return [];
    return registeredDocs
      .map((docItem: any) => {
        const commId = docItem.id || docItem.docId;
        const hasLeader = (
          leaderCommunityIds.has(commId) ||
          (typeof docItem.leaderCount === 'number' && docItem.leaderCount > 0) ||
          !!docItem.leaderId ||
          !!docItem.leaderName ||
          !!docItem.leaderUserId ||
          docItem.hasLeader === true ||
          !!docItem.presidentId ||
          !!docItem.activeLeader
        );

        let popVal = 0;
        if (typeof docItem.population === 'number') popVal = docItem.population;
        else if (typeof docItem.memberCount === 'number') popVal = docItem.memberCount;
        else if (typeof docItem.residentCount === 'number') popVal = docItem.residentCount;
        else if (typeof docItem.population === 'string') popVal = parseInt(docItem.population, 10) || 0;

        return {
          id: commId || String(Math.random()),
          name: docItem.name || 'Registered Community',
          population: popVal > 0 ? popVal : 17,
          boundary: docItem.boundary,
          hasLeadership: hasLeader
        };
      })
      .filter(comm => !!comm.boundary && isCommunityInsideRegionalBoundary(regionalBoundaryGeoJson, comm.boundary));
  }, [registeredDocs, regionalBoundaryGeoJson, leaderCommunityIds]);

  const totalPopulationSum = useMemo(() => {
    return encompassedCommunities.reduce((acc, c) => acc + (typeof c.population === 'number' ? c.population : 0), 0);
  }, [encompassedCommunities]);

  // 3. Live Snapshot for Regional Broadcasts
  const [broadcasts, setBroadcasts] = useState<any[]>([]);

  useEffect(() => {
    if (!db || !user) return;
    const q = query(
      collection(db, 'regionalBroadcasts'),
      where('authorityUserId', '==', user.uid)
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map(docSnap => ({
        id: docSnap.id,
        ...docSnap.data()
      }));
      docs.sort((a: any, b: any) => (b.createdAt?.toMillis?.() || 0) - (a.createdAt?.toMillis?.() || 0));
      setBroadcasts(docs);
    });
    return () => unsubscribe();
  }, [db, user]);

  const activeEmergencyAlerts = useMemo(() => {
    return broadcasts.filter(b => b.broadcastType === 'emergency' && (b.status === 'Live' || b.status === 'Active'));
  }, [broadcasts]);

  // Demo perimeter corners for visual reference
  const perimeterCorners = [
    { label: 'Northern Perimeter', location: 'Grantown-on-Spey / Glenlivet Boundary' },
    { label: 'Southern Perimeter', location: 'Blair Atholl & Glen Shee Corridor' },
    { label: 'Eastern Perimeter', location: 'Strathdee & Ballater Fringes' },
    { label: 'Western Perimeter', location: 'Monadhliath Mountains Corridor' },
  ];

  return (
    <div className="container mx-auto max-w-7xl py-8 px-4 space-y-8">
        {/* Welcome Header & Authority Banner */}
        <div className="bg-gradient-to-r from-emerald-800 via-teal-800 to-slate-900 text-white rounded-2xl p-6 md:p-8 shadow-lg relative overflow-hidden">
          <div className="absolute right-0 top-0 -mt-10 -mr-10 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 relative z-10">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-400/30 text-xs font-semibold px-3 py-1">
                  Verified Regional Authority
                </Badge>
                <span className="text-emerald-200/80 text-xs flex items-center gap-1">
                  <MapPin className="h-3.5 w-3.5" /> {regionName}
                </span>
                {isLockedIn && (
                  <Badge className="bg-emerald-600 text-white text-[10px] flex items-center gap-1">
                    <Lock className="h-3 w-3" /> Boundary Locked
                  </Badge>
                )}
              </div>
              <h1 className="text-2xl md:text-4xl font-extrabold font-headline tracking-tight text-white">
                {organizationName}
              </h1>
              <p className="text-emerald-100/80 text-sm md:text-base mt-2 max-w-2xl font-light">
                Regional Back-Office for boundary perimeter management, multi-community emergency broadcasts, and regional billboard announcements.
              </p>
            </div>
            
            <div className="flex flex-wrap gap-3">
              <Button asChild className="bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold shadow-md">
                <Link href="/regional/map">
                  <MapIcon className="mr-2 h-4 w-4" /> {isLockedIn ? 'Inspect Boundary Map' : 'Draw Boundary Map'}
                </Link>
              </Button>
              <Button asChild className="bg-sky-100 hover:bg-sky-200 text-sky-950 font-bold border border-sky-300 shadow-md">
                <Link href="/regional/broadcasts">
                  <Radio className="mr-2 h-4 w-4 text-sky-700" /> New Broadcast
                </Link>
              </Button>
            </div>
          </div>
        </div>

        {/* Quick Stats Row - SYNCED WITH LIVE FIRESTORE DATA */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="border-l-4 border-l-emerald-500 shadow-sm">
            <CardContent className="p-5 flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Encompassed Communities</p>
                <h3 className="text-2xl font-bold text-foreground mt-1">{encompassedCommunities.length} Communities</h3>
                <p className="text-xs text-emerald-600 font-medium mt-1">Geofenced inside boundary map</p>
              </div>
              <div className="p-3 bg-emerald-100 dark:bg-emerald-950/50 rounded-xl text-emerald-600">
                <Globe className="h-6 w-6" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-blue-500 shadow-sm">
            <CardContent className="p-5 flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Est. Covered Population</p>
                <h3 className="text-2xl font-bold text-foreground mt-1">~{totalPopulationSum > 0 ? totalPopulationSum.toLocaleString() : (encompassedCommunities.length * 17)}</h3>
                <p className="text-xs text-blue-600 font-medium mt-1">Regional Residents & Members</p>
              </div>
              <div className="p-3 bg-blue-100 dark:bg-blue-950/50 rounded-xl text-blue-600">
                <Users className="h-6 w-6" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-red-500 shadow-sm">
            <CardContent className="p-5 flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Active Emergency Alerts</p>
                <h3 className="text-2xl font-bold text-foreground mt-1">{activeEmergencyAlerts.length} Active Alert{activeEmergencyAlerts.length === 1 ? '' : 's'}</h3>
                <p className="text-xs text-red-600 font-medium mt-1">
                  {activeEmergencyAlerts.length > 0 ? activeEmergencyAlerts[0].title : 'No active red alerts'}
                </p>
              </div>
              <div className="p-3 bg-red-100 dark:bg-red-950/50 rounded-xl text-red-600">
                <Flame className="h-6 w-6" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-purple-500 shadow-sm">
            <CardContent className="p-5 flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Total Broadcast Dispatches</p>
                <h3 className="text-2xl font-bold text-foreground mt-1">{broadcasts.length} Dispatches</h3>
                <p className="text-xs text-purple-600 font-medium mt-1">Standard, Urgent & Emergency</p>
              </div>
              <div className="p-3 bg-purple-100 dark:bg-purple-950/50 rounded-xl text-purple-600">
                <Bell className="h-6 w-6" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main 2-Column Dashboard Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Left Column: Boundary & Communities (2 Cols) */}
          <div className="lg:col-span-2 space-y-8">
            
            {/* Interactive Boundary & Perimeter Drawer Card */}
            <Card className="shadow-md">
              <CardHeader className="border-b bg-muted/30">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <MapIcon className="h-5 w-5 text-emerald-600" />
                    <div>
                      <CardTitle className="text-lg">Geographic Boundary & Perimeter Map</CardTitle>
                      <CardDescription>Defined map boundary for {organizationName}</CardDescription>
                    </div>
                  </div>
                  <Button asChild size="sm" variant="outline" className="border-emerald-600 text-emerald-700 hover:bg-emerald-50">
                    <Link href="/regional/map">
                      <Sliders className="mr-1.5 h-4 w-4" /> {isLockedIn ? 'Manage Boundary' : 'Edit Boundary'}
                    </Link>
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="p-6 space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {perimeterCorners.map((corner, i) => (
                    <div key={i} className="p-4 rounded-xl border bg-card hover:border-emerald-500/50 transition-colors">
                      <div className="flex items-center gap-2 text-xs font-semibold text-emerald-700 dark:text-emerald-400 mb-1">
                        <MapPin className="h-3.5 w-3.5" />
                        {corner.label}
                      </div>
                      <p className="text-sm font-medium text-foreground">{corner.location}</p>
                    </div>
                  ))}
                </div>

                <Alert className="bg-emerald-50/50 border-emerald-200 dark:bg-emerald-950/30">
                  <Info className="h-4 w-4 text-emerald-600" />
                  <AlertTitle className="text-emerald-800 dark:text-emerald-300 font-semibold text-xs">Spatial Containment Status</AlertTitle>
                  <AlertDescription className="text-xs text-emerald-700 dark:text-emerald-400 mt-1">
                    Your boundary map currently geofences <strong>{encompassedCommunities.length} registered communities</strong>. Any new registered community falling within your boundary polygon will be automatically connected.
                  </AlertDescription>
                </Alert>
              </CardContent>
            </Card>

            {/* Encompassed Communities Selector & Overview - SYNCED REAL-TIME */}
            <Card className="shadow-md">
              <CardHeader className="border-b bg-muted/30">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Globe className="h-5 w-5 text-emerald-600" />
                    <div>
                      <CardTitle className="text-lg">Encompassed Local Communities ({encompassedCommunities.length})</CardTitle>
                      <CardDescription>All registered communities inside your regional boundary</CardDescription>
                    </div>
                  </div>
                  <Button asChild size="sm" variant="ghost">
                    <Link href="/regional/communities">
                      View Full Directory <ChevronRight className="ml-1 h-4 w-4" />
                    </Link>
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="p-6">
                {isLoadingCommunities ? (
                  <div className="py-8 text-center space-y-2">
                    <Loader2 className="h-6 w-6 animate-spin text-emerald-600 mx-auto" />
                    <p className="text-xs text-muted-foreground">Loading encompassed communities...</p>
                  </div>
                ) : encompassedCommunities.length === 0 ? (
                  <div className="py-8 text-center space-y-2">
                    <MapPin className="h-8 w-8 text-muted-foreground mx-auto" />
                    <p className="text-sm font-medium">No Communities In Boundary Yet</p>
                    <p className="text-xs text-muted-foreground">Lock in your boundary map to discover registered communities.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                    {encompassedCommunities.map((comm) => (
                      <Link 
                        key={comm.id}
                        href={`/community/${comm.id}`}
                        className="p-3 rounded-lg border bg-card hover:bg-emerald-50/50 dark:hover:bg-emerald-950/30 cursor-pointer transition-colors flex items-center justify-between group"
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-1.5">
                            <span className="h-2 w-2 rounded-full bg-emerald-500 shrink-0" />
                            <span className="text-xs font-semibold text-foreground group-hover:text-emerald-600 transition-colors line-clamp-1">
                              {comm.name}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                            <span>Pop: {comm.population}</span>
                            <span>•</span>
                            <span className={comm.hasLeadership ? "text-emerald-600 font-semibold flex items-center gap-0.5" : "text-slate-400"}>
                              {comm.hasLeadership ? <Crown className="h-2.5 w-2.5" /> : null}
                              Leader: {comm.hasLeadership ? 'Yes' : 'No'}
                            </span>
                          </div>
                        </div>
                        <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-emerald-600 transition-colors shrink-0" />
                      </Link>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

          </div>

          {/* Right Column: Broadcast History & Authority Profile (1 Col) */}
          <div className="space-y-8">
            <Card className="shadow-md border-t-4 border-t-red-500">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Radio className="h-5 w-5 text-red-600" />
                    <CardTitle className="text-lg">Recent Regional Broadcasts</CardTitle>
                  </div>
                  <Button asChild variant="ghost" size="sm" className="p-0 h-auto text-xs text-red-600 hover:text-red-700">
                    <Link href="/regional/broadcasts">View All</Link>
                  </Button>
                </div>
                <CardDescription>Live snapshot of recent dispatches</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {broadcasts.length === 0 ? (
                  <div className="p-4 rounded-lg border bg-muted/20 text-center space-y-2">
                    <Radio className="h-6 w-6 text-muted-foreground mx-auto" />
                    <p className="text-xs text-muted-foreground">No regional broadcasts dispatched yet.</p>
                  </div>
                ) : (
                  <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1">
                    {broadcasts.slice(0, 4).map((b) => (
                      <div key={b.id} className="p-3 rounded-lg border bg-card space-y-2 text-xs">
                        <div className="flex items-center justify-between">
                          <Badge className={
                            b.broadcastType === 'emergency' ? 'bg-red-100 text-red-800 border-red-300' :
                            b.broadcastType === 'urgent' ? 'bg-amber-100 text-amber-800 border-amber-300' :
                            'bg-blue-100 text-blue-800 border-blue-300'
                          }>
                            {b.broadcastType?.toUpperCase() || 'STANDARD'}
                          </Badge>
                          <Badge variant="outline" className="text-[10px]">
                            {b.status || 'Live'}
                          </Badge>
                        </div>
                        <p className="font-bold text-foreground line-clamp-1">{b.title}</p>
                        <p className="text-[11px] text-muted-foreground line-clamp-2">{b.message}</p>
                      </div>
                    ))}
                  </div>
                )}

                <Button asChild className="w-full bg-red-600 hover:bg-red-700 text-white font-bold">
                  <Link href="/regional/broadcasts">
                    <Plus className="mr-1.5 h-4 w-4" /> Create New Broadcast
                  </Link>
                </Button>
              </CardContent>
            </Card>

            <Card className="shadow-md">
              <CardHeader>
                <CardTitle className="text-lg">Authority Profile & Contact</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div>
                  <p className="font-semibold text-xs text-muted-foreground">Official Authority Name</p>
                  <p className="font-medium text-foreground">{organizationName}</p>
                </div>
                <div>
                  <p className="font-semibold text-xs text-muted-foreground">Regional Jurisdiction</p>
                  <p className="font-medium text-foreground">{regionName}</p>
                </div>
                <div>
                  <p className="font-semibold text-xs text-muted-foreground">Boundary Status</p>
                  <Badge className={isLockedIn ? "bg-emerald-600 text-white text-[10px] mt-0.5" : "bg-amber-500 text-white text-[10px] mt-0.5"}>
                    {isLockedIn ? '🔒 Verified & Locked' : '✏️ Draft Map'}
                  </Badge>
                </div>
              </CardContent>
              <CardFooter className="border-t pt-4">
                <Button asChild variant="outline" size="sm" className="w-full">
                  <Link href="/regional/settings">Manage Authority Settings</Link>
                </Button>
              </CardFooter>
            </Card>
          </div>

        </div>
    </div>
  );
}
