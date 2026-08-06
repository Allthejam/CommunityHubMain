'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { 
  Map as MapIcon, 
  MapPin, 
  ShieldCheck, 
  Globe, 
  Users, 
  Radio, 
  ArrowLeft, 
  Building, 
  Search, 
  Info,
  CheckCircle2,
  Filter
} from 'lucide-react';
import { useFirestore, useCollection, useDoc, useMemoFirebase, useUser } from '@/firebase';
import { collection, query, where, doc } from 'firebase/firestore';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';

function RegionalNetworksDirectoryContent() {
  const db = useFirestore();
  const { user } = useUser();
  const searchParams = useSearchParams();
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'local' | 'global'>('local');

  // Detect active community
  const userProfileRef = useMemoFirebase(() => {
    if (!user || !db) return null;
    return doc(db, 'users', user.uid);
  }, [user, db]);
  const { data: userProfile } = useDoc(userProfileRef);

  const activeCommunityId = useMemo(() => {
    if (typeof window !== 'undefined') {
      const urlComm = searchParams?.get('community');
      if (urlComm) return urlComm;
      const visited = sessionStorage.getItem('visitedCommunityId');
      if (visited) return visited;
    }
    return userProfile?.primaryHomeCommunityId || userProfile?.homeCommunityId || userProfile?.communityId || null;
  }, [searchParams, userProfile]);

  const activeCommunityRef = useMemoFirebase(() => {
    if (!activeCommunityId || !db) return null;
    return doc(db, 'communities', activeCommunityId);
  }, [activeCommunityId, db]);
  const { data: activeCommunity } = useDoc(activeCommunityRef);

  const activeCommunityName = activeCommunity?.name || 'Current Community';

  // Live query for verified regional authorities
  const authoritiesQuery = useMemoFirebase(() => {
    if (!db) return null;
    return query(
      collection(db, 'users'),
      where('accountType', '==', 'regional')
    );
  }, [db]);

function getGeoJsonBoundingBox(geoJson: any): { minLng: number; maxLng: number; minLat: number; maxLat: number } | null {
  if (!geoJson) return null;
  let coords: [number, number][] = [];
  try {
    const data = typeof geoJson === 'string' ? JSON.parse(geoJson) : geoJson;
    if (data.type === 'FeatureCollection' && Array.isArray(data.features)) {
      data.features.forEach((f: any) => {
        if (f.geometry?.type === 'Polygon' && Array.isArray(f.geometry.coordinates?.[0])) {
          coords.push(...f.geometry.coordinates[0]);
        }
      });
    } else if (data.type === 'Feature' && data.geometry?.type === 'Polygon' && Array.isArray(data.geometry.coordinates?.[0])) {
      coords.push(...data.geometry.coordinates[0]);
    } else if (data.type === 'Polygon' && Array.isArray(data.coordinates?.[0])) {
      coords.push(...data.coordinates[0]);
    }
  } catch (e) {
    return null;
  }

  if (coords.length === 0) return null;

  let minLng = Infinity, maxLng = -Infinity, minLat = Infinity, maxLat = -Infinity;
  coords.forEach(([lng, lat]) => {
    if (typeof lng === 'number' && typeof lat === 'number') {
      if (lng < minLng) minLng = lng;
      if (lng > maxLng) maxLng = lng;
      if (lat < minLat) minLat = lat;
      if (lat > maxLat) maxLat = lat;
    }
  });

  if (minLng === Infinity) return null;
  return { minLng, maxLng, minLat, maxLat };
}

function isCommunityInsideRegionalBoundary(regionalGeoJsonStr: any, communityGeoJsonStr: any): boolean {
  if (!regionalGeoJsonStr || !communityGeoJsonStr) return false;
  try {
    const rBox = getGeoJsonBoundingBox(regionalGeoJsonStr);
    const cBox = getGeoJsonBoundingBox(communityGeoJsonStr);

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

  const { data: authorityDocs, isLoading } = useCollection(authoritiesQuery);

  // Local jurisdiction authorities (geofenced for active community & its regional umbrella)
  const localAuthorities = useMemo(() => {
    if (!authorityDocs || !activeCommunityId) return [];
    return authorityDocs.filter((auth: any) => {
      const encompassed = auth.encompassedCommunityIds || auth.targetCommunityIds || [];
      if (encompassed.includes(activeCommunityId) || auth.primaryCommunityId === activeCommunityId || auth.communityId === activeCommunityId) {
        return true;
      }
      if (activeCommunity) {
        // 1. Spatial Boundary Polygon Containment (Map Page Logic)
        if (auth.regionalBoundary && activeCommunity.boundary) {
          if (isCommunityInsideRegionalBoundary(auth.regionalBoundary, activeCommunity.boundary)) {
            return true;
          }
        }
        // 2. Region / Jurisdiction String Matching
        const commRegion = (activeCommunity.region || activeCommunity.state || '').toLowerCase().trim();
        const authRegion = (auth.region || auth.state || auth.organizationName || '').toLowerCase().trim();
        if (commRegion && authRegion && (commRegion.includes(authRegion) || authRegion.includes(commRegion))) {
          return true;
        }
      }
      return false;
    });
  }, [authorityDocs, activeCommunityId, activeCommunity]);

  const displayedAuthorities = useMemo(() => {
    const list = activeTab === 'local' ? localAuthorities : (authorityDocs || []);
    if (!searchQuery.trim()) return list;
    return list.filter((auth: any) => {
      const name = (auth.organizationName || auth.businessName || 'Regional Network Authority').toLowerCase();
      const region = (auth.region || auth.state || auth.country || '').toLowerCase();
      return name.includes(searchQuery.toLowerCase()) || region.includes(searchQuery.toLowerCase());
    });
  }, [activeTab, localAuthorities, authorityDocs, searchQuery]);

  return (
    <div className="container mx-auto max-w-7xl py-8 px-4 space-y-8">
      {/* Header Banner */}
      <div>
        <Button asChild variant="ghost" size="sm" className="mb-2 p-0 h-auto">
          <Link href="/home">
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to Home Feed
          </Link>
        </Button>
        <div className="bg-gradient-to-r from-emerald-900 via-teal-900 to-slate-900 text-white rounded-2xl p-6 md:p-8 shadow-lg relative overflow-hidden">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-400/30 text-xs font-semibold px-3 py-1">
                  Verified Regional Authorities Directory
                </Badge>
              </div>
              <h1 className="text-2xl md:text-4xl font-extrabold font-headline tracking-tight text-white flex items-center gap-3">
                <MapIcon className="h-8 w-8 text-emerald-400" /> Regional Networks & Jurisdictions
              </h1>
              <p className="text-emerald-100/80 text-sm md:text-base mt-2 max-w-2xl font-light">
                Discover verified regional authorities managing geofenced perimeter boundaries, multi-community emergency broadcasts, and regional public announcements.
              </p>
            </div>
            
            <div className="relative w-full md:w-72">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder="Search regional networks..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 bg-background/90 text-foreground text-xs"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Info Card */}
      <Alert className="bg-emerald-50/50 border-emerald-200 dark:bg-emerald-950/30">
        <ShieldCheck className="h-4 w-4 text-emerald-600" />
        <AlertTitle className="text-emerald-800 dark:text-emerald-300 font-bold text-xs">Strict Spatial Geofencing Enforced</AlertTitle>
        <AlertDescription className="text-xs text-emerald-700 dark:text-emerald-400 mt-0.5">
          All regional network boundaries are locked via GIS spatial containment. Viewing hub: <strong className="text-foreground">{activeCommunityName}</strong>.
        </AlertDescription>
      </Alert>

      {/* Tabs Filter */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b pb-4">
        <Tabs value={activeTab} onValueChange={(val) => setActiveTab(val as any)} className="w-full sm:w-auto">
          <TabsList className="bg-muted p-1">
            <TabsTrigger value="local" className="text-xs font-bold px-4">
              <MapPin className="h-3.5 w-3.5 mr-1.5 text-emerald-600" />
              Assigned to {activeCommunityName} ({localAuthorities.length})
            </TabsTrigger>
            <TabsTrigger value="global" className="text-xs font-bold px-4">
              <Globe className="h-3.5 w-3.5 mr-1.5 text-blue-600" />
              All Network Authorities Directory ({authorityDocs?.length || 0})
            </TabsTrigger>
          </TabsList>
        </Tabs>
        <span className="text-xs text-muted-foreground">
          Showing {displayedAuthorities.length} authority network{displayedAuthorities.length === 1 ? '' : 's'}
        </span>
      </div>

      {/* Directory Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {displayedAuthorities.length > 0 ? (
          displayedAuthorities.map((auth: any) => {
            const authId = auth.id || auth.docId || auth.uid;
            const orgName = auth.organizationName || auth.businessName || 'Regional Network Authority';
            const region = auth.region || auth.state || auth.country || 'Regional Jurisdiction';
            const bio = auth.shortBio || auth.summary || auth.description || 'Official multi-community regional authority network managing geofenced emergency broadcasts and public announcements.';
            const address = auth.address || auth.jurisdictionAddress || 'Regional Network Headquarters';
            const hotline = auth.emergencyHotline || auth.phone || 'Emergency Services / Local Hotline';

            const encompassed = auth.encompassedCommunityIds || auth.targetCommunityIds || [];
            const isEncompassingCurrent = activeCommunityId ? (encompassed.includes(activeCommunityId) || auth.primaryCommunityId === activeCommunityId || auth.communityId === activeCommunityId) : false;

            return (
              <Card key={authId} className="shadow-md hover:border-emerald-500/50 transition-all flex flex-col justify-between border-2 border-emerald-500/10">
                <CardHeader className="border-b bg-emerald-50/40 dark:bg-emerald-950/20 p-5">
                  <div className="flex items-center justify-between gap-2">
                    <Badge className="bg-emerald-100 text-emerald-800 border-emerald-300 text-[10px]">
                      <CheckCircle2 className="h-3 w-3 mr-1 text-emerald-600" /> Verified Authority
                    </Badge>
                    {isEncompassingCurrent ? (
                      <Badge className="bg-emerald-600 text-white text-[10px] font-bold">
                        ✅ Serves {activeCommunityName}
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="bg-muted text-muted-foreground text-[10px]">
                        📍 {region}
                      </Badge>
                    )}
                  </div>
                  <CardTitle className="text-lg font-bold font-headline mt-3 text-foreground">
                    {orgName}
                  </CardTitle>
                  <CardDescription className="text-xs mt-1 text-emerald-800/80 dark:text-emerald-300/80 font-medium">
                    Authorized Regional Network Authority ({region})
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-5 space-y-3 text-xs flex-1">
                  <div className="p-3 rounded-lg border bg-card space-y-1">
                    <span className="text-muted-foreground font-semibold text-[10px] uppercase tracking-wider">Short Bio / Overview</span>
                    <p className="text-xs text-foreground line-clamp-3 leading-relaxed">{bio}</p>
                  </div>

                  <div className="space-y-1 pt-1">
                    <span className="text-muted-foreground font-semibold text-[10px] uppercase tracking-wider">Jurisdiction Address</span>
                    <p className="text-xs font-medium text-foreground line-clamp-1">{address}</p>
                  </div>

                  <div className="space-y-1 pt-1 border-t">
                    <span className="text-muted-foreground font-semibold text-[10px] uppercase tracking-wider">Emergency Hotline</span>
                    <p className="text-xs font-bold text-red-600 flex items-center gap-1">
                      <Radio className="h-3 w-3" /> {hotline}
                    </p>
                  </div>
                </CardContent>
                <CardFooter className="border-t p-4 bg-muted/10">
                  <Button asChild variant="default" size="sm" className="w-full text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white">
                    <Link href={`/regional/public-site${authId ? `?authority=${authId}` : ''}`}>
                      <Globe className="mr-1.5 h-3.5 w-3.5" /> View Public Billboard & Showcase
                    </Link>
                  </Button>
                </CardFooter>
              </Card>
            );
          })
        ) : (
          <Card className="shadow-md col-span-full p-8 text-center space-y-3 bg-muted/20 border-dashed border-2">
            <MapIcon className="h-10 w-10 text-muted-foreground mx-auto" />
            <div className="space-y-1">
              <h3 className="text-base font-bold text-foreground">
                {activeTab === 'local' ? `No Regional Authority Assigned to ${activeCommunityName}` : 'No Regional Network Authorities Found'}
              </h3>
              <p className="text-xs text-muted-foreground max-w-md mx-auto leading-relaxed">
                {activeTab === 'local' ? (
                  <>Regional network coverage is strictly geofenced to participating jurisdictions. There are currently no regional network authorities assigned to <strong>{activeCommunityName}</strong>.</>
                ) : (
                  <>No verified regional network authorities match your search query.</>
                )}
              </p>
            </div>
            {activeTab === 'local' && (
              <Button onClick={() => setActiveTab('global')} variant="outline" size="sm" className="text-xs font-semibold">
                <Globe className="mr-1.5 h-3.5 w-3.5" /> Browse All Regional Networks Directory
              </Button>
            )}
          </Card>
        )}
      </div>
    </div>
  );
}

export default function RegionalNetworksDirectoryPage() {
  return (
    <React.Suspense fallback={<div className="container mx-auto p-8 flex justify-center text-xs text-muted-foreground">Loading regional network directory...</div>}>
      <RegionalNetworksDirectoryContent />
    </React.Suspense>
  );
}
