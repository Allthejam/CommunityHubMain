'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { 
  Globe, 
  MapPin, 
  Search, 
  ArrowLeft, 
  ExternalLink, 
  Users, 
  Building2, 
  ShieldCheck,
  ChevronRight,
  Filter,
  Loader2,
  Lock,
  AlertCircle
} from 'lucide-react';

import { useUser, useFirestore, useDoc, useCollection, useMemoFirebase } from '@/firebase';
import { doc, collection, query, where } from 'firebase/firestore';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import RegionalHeader from '@/components/layout/regional-header';

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
      cBox.minLng <= rBox.maxLng &&
      cBox.maxLng >= rBox.minLng &&
      cBox.minLat <= rBox.maxLat &&
      cBox.maxLat >= rBox.minLat
    );
  } catch (err) {
    return false;
  }
}

export default function RegionalCommunitiesPage() {
  const { user } = useUser();
  const db = useFirestore();

  const userProfileRef = useMemoFirebase(() => {
    if (!user || !db) return null;
    return doc(db, 'users', user.uid);
  }, [user, db]);

  const { data: userProfile, isLoading: profileLoading } = useDoc(userProfileRef);
  const organizationName = userProfile?.organizationName || userProfile?.businessName || 'Regional Authority';
  const isLockedIn = !!userProfile?.regionalBoundaryLocked;
  const regionalBoundaryGeoJson = userProfile?.regionalBoundary || null;

  const [searchQuery, setSearchQuery] = useState('');

  // Live Firestore query for registered communities with polygon maps
  const communitiesQuery = useMemoFirebase(() => {
    if (!db) return null;
    return query(collection(db, 'communities'), where('boundary', '!=', null));
  }, [db]);

  // Live Firestore query for users with leader or president roles
  const leadersQuery = useMemoFirebase(() => {
    if (!db) return null;
    return query(collection(db, 'users'), where('role', 'in', ['president', 'leader', 'community-leader']));
  }, [db]);

  const { data: registeredDocs, isLoading: isLoadingCommunities } = useCollection(communitiesQuery);
  const { data: leaderUsersDocs } = useCollection(leadersQuery);

  const leaderCommunityIds = useMemo(() => {
    const set = new Set<string>();
    if (leaderUsersDocs && leaderUsersDocs.length > 0) {
      leaderUsersDocs.forEach((u: any) => {
        if (u.homeCommunityId) set.add(u.homeCommunityId);
        if (u.communityId) set.add(u.communityId);
        if (u.communityRoles) {
          Object.keys(u.communityRoles).forEach(cId => {
            if (u.communityRoles[cId]?.role === 'president' || u.communityRoles[cId]?.role === 'leader') {
              set.add(cId);
            }
          });
        }
      });
    }
    return set;
  }, [leaderUsersDocs]);

  // STRICT SPATIAL CONTAINMENT FILTER:
  // ONLY communities whose registered polygon map falls INSIDE the user's saved locked regional boundary!
  const encompassedCommunities = useMemo(() => {
    if (!registeredDocs || registeredDocs.length === 0 || !regionalBoundaryGeoJson) return [];
    return registeredDocs
      .map((docItem: any) => {
        const commId = docItem.id || docItem.docId;
        const hasLeader = (
          leaderCommunityIds.has(commId) ||
          (docItem.leaderCount && docItem.leaderCount > 0) ||
          !!docItem.leaderId ||
          !!docItem.leaderName ||
          !!docItem.leaderUserId ||
          docItem.hasLeader === true ||
          !!docItem.presidentId ||
          !!docItem.activeLeader
        );

        return {
          id: commId || String(Math.random()),
          name: docItem.name || 'Registered Community',
          population: docItem.memberCount || docItem.population || docItem.residentCount || 'Registered Hub',
          boundary: docItem.boundary,
          hasLeadership: hasLeader
        };
      })
      .filter(comm => !!comm.boundary && isCommunityInsideRegionalBoundary(regionalBoundaryGeoJson, comm.boundary));
  }, [registeredDocs, regionalBoundaryGeoJson, leaderCommunityIds]);

  const filteredCommunities = encompassedCommunities.filter(c => 
    c.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="container mx-auto max-w-7xl py-8 px-4 space-y-8">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <Button asChild variant="ghost" size="sm" className="mb-2 p-0 h-auto">
              <Link href="/regional/dashboard">
                <ArrowLeft className="mr-2 h-4 w-4" /> Back to Dashboard
              </Link>
            </Button>
            <div className="flex items-center gap-2">
              <h1 className="text-3xl font-extrabold font-headline tracking-tight">
                Encompassed Local Communities ({encompassedCommunities.length})
              </h1>
              {isLockedIn && (
                <Badge className="bg-emerald-600 text-white text-xs">
                  <Lock className="h-3 w-3 mr-1" /> Boundary Saved
                </Badge>
              )}
            </div>
            <p className="text-muted-foreground text-sm mt-1">
              Live database listing of all registered community hubs inside the perimeter map for {organizationName}.
            </p>
          </div>

          {isLockedIn && encompassedCommunities.length > 0 && (
            <div className="relative w-full sm:w-72">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder="Search registered towns..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
          )}
        </div>

        {profileLoading || isLoadingCommunities ? (
          <div className="py-20 text-center space-y-3">
            <Loader2 className="h-8 w-8 animate-spin text-emerald-600 mx-auto" />
            <p className="text-sm text-muted-foreground">Verifying registered community polygon maps from Firestore...</p>
          </div>
        ) : !isLockedIn || !regionalBoundaryGeoJson ? (
          <Card className="max-w-xl mx-auto text-center p-8 space-y-4 shadow-sm border-dashed border-2">
            <div className="p-4 rounded-full bg-amber-100 dark:bg-amber-950 text-amber-600 w-16 h-16 mx-auto flex items-center justify-center">
              <Globe className="h-8 w-8" />
            </div>
            <div className="space-y-2">
              <h3 className="text-xl font-bold text-foreground">No Locked Boundary Defined Yet</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                You have not locked in a regional perimeter boundary map for <strong>{organizationName}</strong> yet. Draw or select your region map and click "Lock It In" to auto-detect all enclosed registered community hubs.
              </p>
            </div>
            <Button asChild className="bg-emerald-600 hover:bg-emerald-700 font-bold">
              <Link href="/regional/map">
                <Globe className="mr-2 h-4 w-4" /> Open Boundary Setup & Map
              </Link>
            </Button>
          </Card>
        ) : encompassedCommunities.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredCommunities.map((comm) => (
              <Card key={comm.id} className="shadow-sm hover:shadow-md transition-shadow border">
                <CardHeader className="pb-3 border-b bg-muted/20">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <ShieldCheck className="h-4 w-4 text-emerald-600" />
                      <CardTitle className="text-base font-bold">{comm.name}</CardTitle>
                    </div>
                    <Badge className="bg-emerald-600 text-white text-[11px]">
                      Polygon Registered
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="p-4 space-y-3 text-xs">
                  <div className="flex justify-between items-center text-muted-foreground">
                    <span>Est. Resident Population:</span>
                    <span className="font-semibold text-foreground">{comm.population}</span>
                  </div>
                  <div className="flex justify-between items-center text-muted-foreground">
                    <span>Has Leadership:</span>
                    <Badge className={comm.hasLeadership ? 'bg-emerald-600 text-white text-[10px]' : 'bg-amber-500 text-white text-[10px]'}>
                      {comm.hasLeadership ? 'Yes' : 'No'}
                    </Badge>
                  </div>

                  <div className="pt-2 flex gap-2">
                    <Button asChild size="sm" variant="outline" className="w-full text-xs">
                      <Link href={`/community/${comm.id}`}>
                        View Community Hub <ExternalLink className="ml-1.5 h-3 w-3" />
                      </Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card className="max-w-xl mx-auto text-center p-8 space-y-4 shadow-sm border-dashed border-2">
            <div className="p-4 rounded-full bg-amber-100 dark:bg-amber-950 text-amber-600 w-16 h-16 mx-auto flex items-center justify-center">
              <AlertCircle className="h-8 w-8" />
            </div>
            <div className="space-y-2">
              <h3 className="text-xl font-bold text-foreground">0 Registered Communities Found</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Your regional boundary is saved, but no registered communities with an active <strong>polygon boundary map</strong> in the database fall within your perimeter yet.
              </p>
              <p className="text-xs text-emerald-700 dark:text-emerald-400 font-semibold pt-1">
                Only official registered community hubs with saved polygon maps appear here.
              </p>
            </div>
            <Button asChild variant="outline" size="sm">
              <Link href="/regional/map">
                Adjust Regional Boundary
              </Link>
            </Button>
          </Card>
        )}
    </div>
  );
}
