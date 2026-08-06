'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { 
  Map as MapIcon, 
  MapPin, 
  Radio, 
  ShieldCheck, 
  Globe, 
  ChevronRight, 
  Users, 
  Bell, 
  Flame,
  Building
} from 'lucide-react';
import { useFirestore, useCollection, useDoc, useMemoFirebase } from '@/firebase';
import { collection, query, where, limit, doc } from 'firebase/firestore';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';

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

export function RegionalNetworksFeed({ communityId }: RegionalNetworksFeedProps) {
  const db = useFirestore();

  // Query verified regional network authorities
  const authoritiesQuery = useMemoFirebase(() => {
    if (!db) return null;
    return query(
      collection(db, 'users'),
      where('accountType', '==', 'regional'),
      limit(3)
    );
  }, [db]);

  const { data: authorityDocs, isLoading: isLoadingAuthorities } = useCollection(authoritiesQuery);

  const activeCommunityRef = useMemoFirebase(() => {
    if (!communityId || !db) return null;
    return doc(db, 'communities', communityId);
  }, [communityId, db]);
  const { data: activeCommunity } = useDoc(activeCommunityRef);

  // Query live regional broadcasts
  const broadcastsQuery = useMemoFirebase(() => {
    if (!db) return null;
    return query(
      collection(db, 'regionalBroadcasts'),
      where('status', '==', 'Live'),
      limit(10)
    );
  }, [db]);

  const { data: rawBroadcastDocs, isLoading: isLoadingBroadcasts } = useCollection(broadcastsQuery);

  // Filter authorities by spatial/jurisdiction match for current communityId
  const geofencedAuthorities = useMemo(() => {
    if (!authorityDocs || !communityId) return [];
    return authorityDocs.filter((auth: any) => {
      const encompassed = auth.encompassedCommunityIds || auth.targetCommunityIds || [];
      if (encompassed.includes(communityId) || auth.primaryCommunityId === communityId || auth.communityId === communityId) {
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
  }, [authorityDocs, communityId, activeCommunity]);

  // Filter broadcasts by spatial targetedCommunityIds match for current communityId
  const geofencedBroadcasts = useMemo(() => {
    if (!rawBroadcastDocs || !communityId) return [];
    return rawBroadcastDocs.filter((b: any) => {
      return Array.isArray(b.targetCommunityIds) && b.targetCommunityIds.includes(communityId);
    }).slice(0, 2);
  }, [rawBroadcastDocs, communityId]);

  return (
    <Card className="shadow-md overflow-hidden border-2 border-emerald-600/20 bg-card">
      <CardHeader className="bg-gradient-to-r from-emerald-900 via-teal-900 to-slate-900 text-white p-5 md:p-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-400/30 text-[10px] uppercase font-bold">
                <ShieldCheck className="h-3 w-3 mr-1" /> Regional Network Authority
              </Badge>
            </div>
            <CardTitle className="text-xl md:text-2xl font-bold font-headline text-white flex items-center gap-2">
              <MapIcon className="h-6 w-6 text-emerald-400" /> Regional Networks & Multi-Community Coverage
            </CardTitle>
            <CardDescription className="text-emerald-100/80 text-xs md:text-sm">
              Official regional authorities, boundary perimeter maps, and multi-community announcements.
            </CardDescription>
          </div>

          <Button asChild size="sm" className="bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold text-xs shrink-0 shadow-md">
            <Link href="/regional-networks">
              Explore Regional Directory <ChevronRight className="ml-1 h-3.5 w-3.5" />
            </Link>
          </Button>
        </div>
      </CardHeader>

      <CardContent className="p-5 md:p-6 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          
          {/* Authority Information */}
          <div className="p-4 rounded-xl border bg-muted/20 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Globe className="h-4 w-4 text-emerald-600" />
                <span className="text-xs font-bold uppercase tracking-wider text-foreground">Verified Regional Authority</span>
              </div>
              <Badge variant="outline" className="text-[10px] bg-emerald-50 text-emerald-700 border-emerald-300">
                100% Geofenced
              </Badge>
            </div>

            {isLoadingAuthorities ? (
              <Skeleton className="h-16 w-full" />
            ) : geofencedAuthorities.length > 0 ? (
              geofencedAuthorities.map((auth: any) => (
                <div key={auth.id} className="space-y-1 pt-1 border-t">
                  <h4 className="text-sm font-bold text-foreground">{auth.organizationName || auth.businessName || 'Regional Network Authority'}</h4>
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <MapPin className="h-3 w-3 text-emerald-600" /> {auth.region || 'Assigned Jurisdiction Region'}
                  </p>
                </div>
              ))
            ) : (
              <div className="space-y-1 pt-1 border-t">
                <h4 className="text-sm font-semibold text-muted-foreground">No Regional Authority Assigned</h4>
                <p className="text-xs text-muted-foreground">
                  Regional network coverage is strictly geofenced to participating jurisdictions.
                </p>
              </div>
            )}
          </div>

          {/* Active Regional Broadcast Stream */}
          <div className="p-4 rounded-xl border bg-muted/20 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Radio className="h-4 w-4 text-emerald-600" />
                <span className="text-xs font-bold uppercase tracking-wider text-foreground">Live Regional Announcements</span>
              </div>
              <Badge variant="outline" className="text-[10px] bg-blue-50 text-blue-700 border-blue-300">
                Jurisdiction Feed
              </Badge>
            </div>

            {isLoadingBroadcasts ? (
              <Skeleton className="h-16 w-full" />
            ) : geofencedBroadcasts.length > 0 ? (
              geofencedBroadcasts.map((b: any) => (
                <div key={b.id} className="space-y-1 pt-1 border-t text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-foreground line-clamp-1">{b.title}</span>
                    <Badge className={b.broadcastType === 'emergency' ? 'bg-red-600 text-white text-[9px]' : 'bg-blue-600 text-white text-[9px]'}>
                      {b.broadcastType?.toUpperCase()}
                    </Badge>
                  </div>
                  <p className="text-[11px] text-muted-foreground line-clamp-1">{b.message}</p>
                </div>
              ))
            ) : (
              <div className="space-y-1 pt-1 border-t text-xs">
                <span className="font-semibold text-muted-foreground">No Active Regional Broadcasts</span>
                <p className="text-[11px] text-muted-foreground">Broadcasts dispatched by regional authorities appear strictly within targeted community hubs.</p>
              </div>
            )}
          </div>

        </div>
      </CardContent>

      <CardFooter className="bg-muted/10 border-t p-4 flex flex-col sm:flex-row justify-between items-center gap-3 text-xs text-muted-foreground">
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-4 w-4 text-emerald-600" />
          <span>Regional Network Back-Office & Perimeter System</span>
        </div>
        <Link href="/regional-networks" className="font-semibold text-emerald-600 hover:underline flex items-center gap-1">
          View Regional Directory & Coverage Maps <ChevronRight className="h-3.5 w-3.5" />
        </Link>
      </CardFooter>
    </Card>
  );
}
