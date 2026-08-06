'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { 
  MapPin, 
  Map as MapIcon, 
  Radio, 
  Globe, 
  ShieldCheck, 
  Users, 
  ArrowLeft, 
  Flame, 
  AlertTriangle, 
  CheckCircle2, 
  Info,
  ChevronRight,
  ChevronLeft,
  Phone,
  Mail,
  ExternalLink,
  Clock,
  Building,
  ShieldAlert,
  Crown,
  Bell,
  Sliders,
  Camera,
  Sparkles,
  Play,
  Pause,
  Maximize2
} from 'lucide-react';

import { useUser, useFirestore, useDoc, useMemoFirebase, useCollection } from '@/firebase';
import { doc, collection, query, where, onSnapshot } from 'firebase/firestore';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

// 3D REVOLVING PHOTO WHEEL COMPONENT
function Regional3DPhotoWheel({ photos }: { photos: any[] }) {
  const [rotation, setRotation] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [isHovered, setIsHovered] = useState(false);
  const [selectedPhoto, setSelectedPhoto] = useState<any | null>(null);

  // Smooth continuous auto-rotation
  useEffect(() => {
    if (!isPlaying || isHovered || photos.length <= 1) return;
    const timer = setInterval(() => {
      setRotation(prev => (prev + 0.4) % 360);
    }, 40);
    return () => clearInterval(timer);
  }, [isPlaying, isHovered, photos.length]);

  if (photos.length === 0) {
    return (
      <Card className="shadow-md overflow-hidden border-2 border-dashed border-emerald-500/30">
        <CardHeader className="border-b bg-emerald-50/40 dark:bg-emerald-950/20 p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Camera className="h-5 w-5 text-emerald-600" />
              <div>
                <CardTitle className="text-base font-bold">Regional Photo Gallery</CardTitle>
                <CardDescription className="text-xs">Authority photo showcase</CardDescription>
              </div>
            </div>
            <Button asChild size="sm" variant="outline" className="text-xs text-emerald-700 border-emerald-300 hover:bg-emerald-100">
              <Link href="/regional/public-site/photos">
                <Camera className="mr-1.5 h-3.5 w-3.5" /> Upload Photos
              </Link>
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-6 text-center space-y-3">
          <div className="h-16 w-16 bg-emerald-100 dark:bg-emerald-900/40 rounded-full flex items-center justify-center mx-auto text-emerald-600">
            <Sparkles className="h-8 w-8 animate-pulse" />
          </div>
          <div className="space-y-1">
            <h4 className="text-sm font-bold text-foreground">No Showcase Photos Uploaded Yet</h4>
            <p className="text-xs text-muted-foreground max-w-xs mx-auto">
              Upload photos in your Public Site Photos dropdown to activate the 3D revolving photo showcase.
            </p>
          </div>
          <Button asChild size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs">
            <Link href="/regional/public-site/photos">
              Manage Authority Photos
            </Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  // Ensure minimum items for smooth circular wheel geometry
  const displayPhotos = photos.length >= 4 ? photos : [...photos, ...photos, ...photos, ...photos].slice(0, 6);
  const totalItems = displayPhotos.length;
  const angleStep = 360 / totalItems;
  const radius = Math.max(140, Math.round(110 / Math.tan(Math.PI / totalItems)));

  const handlePrev = () => setRotation(prev => prev - angleStep);
  const handleNext = () => setRotation(prev => prev + angleStep);

  return (
    <Card className="shadow-md overflow-hidden bg-gradient-to-b from-slate-900 via-slate-900 to-emerald-950 text-white border border-emerald-500/30">
      <CardHeader className="border-b border-white/10 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Camera className="h-5 w-5 text-emerald-400" />
            <div>
              <CardTitle className="text-base font-bold text-white flex items-center gap-1.5">
                Authority Photo Showcase
                <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-400/30 text-[10px]">
                  3D Carousel
                </Badge>
              </CardTitle>
              <CardDescription className="text-xs text-emerald-200/70">
                {photos.length} Photo{photos.length === 1 ? '' : 's'} in Regional Gallery
              </CardDescription>
            </div>
          </div>
          <div className="flex items-center gap-1">
            {photos.length > 1 && (
              <Button
                size="icon"
                variant="ghost"
                onClick={() => setIsPlaying(!isPlaying)}
                className="h-8 w-8 text-emerald-300 hover:text-white hover:bg-white/10"
                title={isPlaying ? 'Pause Rotation' : 'Auto Rotate'}
              >
                {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
              </Button>
            )}
            <Button asChild size="sm" variant="secondary" className="text-xs bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold">
              <Link href="/regional/public-site/photos">
                Gallery
              </Link>
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-4 pt-6 flex flex-col items-center justify-center relative overflow-hidden select-none">
        
        {/* 3D Wheel Stage */}
        <div 
          className="w-full h-56 flex items-center justify-center relative my-2"
          style={{ perspective: '1000px' }}
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
        >
          <div
            className="w-full h-full relative flex items-center justify-center transition-transform duration-100 ease-out"
            style={{
              transformStyle: 'preserve-3d',
              transform: `rotateY(${rotation}deg)`
            }}
          >
            {displayPhotos.map((item, index) => {
              const itemAngle = index * angleStep;
              return (
                <div
                  key={`${item.id}-${index}`}
                  onClick={() => setSelectedPhoto(item)}
                  className="absolute w-36 h-44 rounded-xl overflow-hidden shadow-2xl border-2 border-emerald-400/40 bg-slate-800 cursor-pointer group transition-all duration-300 hover:border-emerald-300 hover:scale-110"
                  style={{
                    transform: `rotateY(${itemAngle}deg) translateZ(${radius}px)`,
                    backfaceVisibility: 'visible'
                  }}
                >
                  <img
                    src={item.imageUrl}
                    alt={item.altText || item.name}
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-transparent to-transparent opacity-80 group-hover:opacity-100 transition-opacity p-2 flex flex-col justify-end">
                    <p className="text-[11px] font-bold text-white line-clamp-1 group-hover:text-emerald-300 transition-colors">
                      {item.name}
                    </p>
                    <span className="text-[9px] text-emerald-200/80 flex items-center gap-1">
                      <Maximize2 className="h-2.5 w-2.5" /> Enlarge
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Carousel Wheel Navigation Controls */}
        {photos.length > 1 && (
          <div className="flex items-center justify-between w-full pt-3 px-2 z-10 border-t border-white/10 mt-2">
            <Button
              size="sm"
              variant="outline"
              onClick={handlePrev}
              className="text-xs bg-white/5 border-white/20 text-white hover:bg-white/20"
            >
              <ChevronLeft className="h-4 w-4 mr-1" /> Spin Left
            </Button>
            <span className="text-[10px] text-emerald-200/70 italic">
              Hover to pause • Click photo to view
            </span>
            <Button
              size="sm"
              variant="outline"
              onClick={handleNext}
              className="text-xs bg-white/5 border-white/20 text-white hover:bg-white/20"
            >
              Spin Right <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        )}

      </CardContent>

      {/* Full Resolution Photo Modal */}
      <Dialog open={!!selectedPhoto} onOpenChange={(open) => { if (!open) setSelectedPhoto(null); }}>
        <DialogContent className="sm:max-w-3xl p-0 overflow-hidden bg-slate-950 border-slate-800 text-white">
          <DialogHeader className="p-4 border-b border-slate-800 bg-slate-900">
            <DialogTitle className="text-base font-bold text-white flex items-center gap-2">
              <Camera className="h-4 w-4 text-emerald-400" /> {selectedPhoto?.name}
            </DialogTitle>
          </DialogHeader>
          {selectedPhoto && (
            <div className="flex flex-col items-center">
              <div className="w-full bg-black flex items-center justify-center max-h-[70vh] min-h-[300px]">
                <img
                  src={selectedPhoto.imageUrl}
                  alt={selectedPhoto.altText || selectedPhoto.name}
                  className="max-w-full max-h-[70vh] object-contain"
                />
              </div>
              <div className="p-4 w-full bg-slate-900 border-t border-slate-800 text-xs space-y-1">
                <p className="font-bold text-emerald-300">{selectedPhoto.name}</p>
                {selectedPhoto.altText && (
                  <p className="text-slate-300 italic">Alt description: {selectedPhoto.altText}</p>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </Card>
  );
}

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

import { useSearchParams } from 'next/navigation';

function RegionalPublicSiteContent() {
  const { user } = useUser();
  const db = useFirestore();
  const searchParams = useSearchParams();
  const authorityParam = searchParams.get('authority');

  // Fallback query for regional authority user if not logged in or authorityParam not provided
  const fallbackQuery = useMemoFirebase(() => {
    if (!db) return null;
    return query(collection(db, 'users'), where('accountType', '==', 'regional'));
  }, [db]);

  const { data: fallbackUsers } = useCollection(fallbackQuery);

  const targetUid = useMemo(() => {
    if (authorityParam) return authorityParam;
    if (user?.uid) return user.uid;
    if (fallbackUsers && fallbackUsers.length > 0) return fallbackUsers[0].id || fallbackUsers[0].docId;
    return null;
  }, [authorityParam, user, fallbackUsers]);

  const userProfileRef = useMemoFirebase(() => {
    if (!targetUid || !db) return null;
    return doc(db, 'users', targetUid);
  }, [targetUid, db]);

  const { data: fetchedProfile } = useDoc(userProfileRef);

  const userProfile = useMemo(() => {
    if (fetchedProfile) return fetchedProfile;
    if (!authorityParam && !user?.uid && fallbackUsers && fallbackUsers.length > 0) {
      return fallbackUsers[0];
    }
    return null;
  }, [fetchedProfile, authorityParam, user, fallbackUsers]);

  const organizationName = userProfile?.organizationName || userProfile?.businessName || 'Highlands Regional Network Authority';
  const regionName = userProfile?.region || userProfile?.state || 'Highlands Region';
  const shortBio = userProfile?.shortBio || userProfile?.summary || '';
  const mainBio = userProfile?.description || userProfile?.mainBio || '';
  const allEmails = Array.isArray(userProfile?.emails) && userProfile.emails.length > 0
    ? userProfile.emails
    : [userProfile?.contactEmail || userProfile?.email || 'authority@regional.gov.uk'];

  const allPhones = Array.isArray(userProfile?.phones) && userProfile.phones.length > 0
    ? userProfile.phones
    : [userProfile?.contactPhone || userProfile?.phone || '+44 (0) 1479 870000'];

  const contactEmail = allEmails[0];
  const contactPhone = allPhones[0];
  const emergencyHotline = userProfile?.emergencyHotline || '999 / 112 (Emergency Control)';
  const website = userProfile?.website || 'https://regional.gov.uk';
  const address = userProfile?.address || 'Regional Network Headquarters, Highland Region, UK';
  const operatingHours = userProfile?.operatingHours || '24/7 Regional Emergency Response & Network Ops';
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

  // 3. Live Snapshot for Regional Broadcasts
  const [broadcasts, setBroadcasts] = useState<any[]>([]);

  useEffect(() => {
    if (!db || !targetUid) return;
    const q = query(
      collection(db, 'regionalBroadcasts'),
      where('authorityUserId', '==', targetUid)
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
  }, [db, targetUid]);

  // 4. Live query for Regional Photos
  const photosQuery = useMemoFirebase(() => {
    if (!db || !targetUid) return null;
    return query(
      collection(db, 'regionalPhotos'),
      where('userId', '==', targetUid)
    );
  }, [db, targetUid]);

  const { data: photoDocs } = useCollection(photosQuery);

  const regionalPhotos = useMemo(() => {
    if (!photoDocs) return [];
    return photoDocs.map((d: any) => ({
      id: d.id || d.docId,
      name: d.name || 'Untitled',
      altText: d.altText || '',
      imageUrl: d.imageUrl || '',
      storagePath: d.storagePath || '',
      uploadedAt: d.uploadedAt || null,
    }));
  }, [photoDocs]);

  const activeBroadcasts = useMemo(() => {
    return broadcasts.filter(b => b.status === 'Live' || b.status === 'Active');
  }, [broadcasts]);

  const isOwner = Boolean(
    user && 
    targetUid && 
    user.uid === targetUid && 
    (userProfile?.accountType === 'regional' || userProfile?.role === 'regional' || userProfile?.permissions?.isRegionalNetwork)
  );

  return (
    <div className="container mx-auto max-w-7xl py-8 px-4 space-y-8">
      
      {/* Navigation Top Bar */}
      <div className="flex items-center justify-between">
        <Button asChild variant="ghost" size="sm" className="p-0 h-auto">
          <Link href={isOwner ? "/regional/dashboard" : "/regional-networks"}>
            <ArrowLeft className="mr-2 h-4 w-4" /> {isOwner ? "Back to Back-Office Dashboard" : "Back to Regional Directory"}
          </Link>
        </Button>
        {isOwner ? (
          <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-300 text-xs">
            🌐 Public Site Preview
          </Badge>
        ) : (
          <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-300 text-xs">
            🌐 Official Public Billboard
          </Badge>
        )}
      </div>

      {/* Hero Authority Billboard Banner */}
      <div className="bg-gradient-to-r from-emerald-900 via-teal-900 to-slate-900 text-white rounded-2xl p-6 md:p-10 shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 -mt-10 -mr-10 w-72 h-72 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="space-y-6 relative z-10">
          
          <div className="flex flex-wrap items-center gap-3">
            <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-400/30 text-xs font-semibold px-3 py-1">
              <ShieldCheck className="h-3.5 w-3.5 mr-1" /> Official Regional Authority Public Billboard
            </Badge>
            <span className="text-emerald-200/80 text-xs flex items-center gap-1">
              <MapPin className="h-3.5 w-3.5" /> {regionName}
            </span>
          </div>

          <div className="space-y-2">
            <h1 className="text-3xl md:text-5xl font-extrabold font-headline tracking-tight text-white">
              {organizationName}
            </h1>
            <p className="text-emerald-100/90 text-sm md:text-base max-w-3xl font-light leading-relaxed">
              {shortBio ? shortBio : `Official public information page, live regional broadcasts, and encompassed community hub directory for ${regionName}.`}
            </p>
          </div>

          {/* Quick Contact & Emergency Action Row */}
          <div className="flex flex-wrap items-center gap-4 pt-2">
            <a 
              href={`tel:${contactPhone}`} 
              className="inline-flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold px-4 py-2.5 rounded-xl text-xs md:text-sm shadow-md transition-colors"
            >
              <Phone className="h-4 w-4" /> Call Authority: {contactPhone}
            </a>
            <a 
              href={`mailto:${contactEmail}`} 
              className="inline-flex items-center gap-2 bg-white/10 hover:bg-white/20 text-white font-semibold px-4 py-2.5 rounded-xl text-xs md:text-sm border border-white/20 transition-colors"
            >
              <Mail className="h-4 w-4" /> Email: {contactEmail}
            </a>
            {website && (
              <a 
                href={website.startsWith('http') ? website : `https://${website}`} 
                target="_blank" 
                rel="noreferrer"
                className="inline-flex items-center gap-2 bg-white/10 hover:bg-white/20 text-white font-semibold px-4 py-2.5 rounded-xl text-xs md:text-sm border border-white/20 transition-colors"
              >
                <ExternalLink className="h-4 w-4" /> Official Website
              </a>
            )}
          </div>

        </div>
      </div>

      {/* Main 2-Column Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* Left Column: Live Announcements & Affected Communities (7 Cols) */}
        <div className="lg:col-span-7 space-y-6">
          <Card className="shadow-md">
            <CardHeader className="border-b bg-muted/30 p-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Radio className="h-5 w-5 text-red-600" />
                  <div>
                    <CardTitle className="text-lg font-bold font-headline">Live Jurisdiction Announcements</CardTitle>
                    <CardDescription className="text-xs">Active broadcasts & affected community hubs</CardDescription>
                  </div>
                </div>
                <Badge className="bg-red-100 text-red-800 border-red-300 text-xs">
                  {activeBroadcasts.length} Active Notice{activeBroadcasts.length === 1 ? '' : 's'}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              {activeBroadcasts.length === 0 ? (
                <div className="p-8 text-center space-y-3 bg-muted/20 rounded-xl border">
                  <CheckCircle2 className="h-8 w-8 text-emerald-600 mx-auto" />
                  <p className="text-sm font-semibold text-foreground">No Active Emergency or Urgent Alerts</p>
                  <p className="text-xs text-muted-foreground max-w-md mx-auto">
                    All standard operations in {regionName} are running normally. Active broadcasts dispatched by {organizationName} will appear here.
                  </p>
                </div>
              ) : (
                activeBroadcasts.map((b) => (
                  <div key={b.id} className="p-5 rounded-xl border bg-card space-y-3 shadow-sm">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <Badge className={
                          b.broadcastType === 'emergency' ? 'bg-red-600 text-white font-bold' :
                          b.broadcastType === 'urgent' ? 'bg-amber-600 text-white font-bold' :
                          'bg-blue-600 text-white font-bold'
                        }>
                          {b.broadcastType?.toUpperCase() || 'STANDARD'}
                        </Badge>
                        <Badge variant="outline" className="text-[10px] bg-muted">
                          {b.alertTier === 'tier1' ? 'Tier 1 Top Red Banner' : b.alertTier === 'tier2' ? 'Tier 2 Pop-Up Alert' : 'Tier 3 Feed & Billboard'}
                        </Badge>
                      </div>
                      <span className="text-[11px] text-muted-foreground font-medium">Status: Live</span>
                    </div>

                    <div>
                      <h3 className="text-base font-bold text-foreground">{b.title}</h3>
                      <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{b.message}</p>
                    </div>

                    {/* Affected Communities List */}
                    <div className="pt-2 border-t space-y-1.5">
                      <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                        <MapPin className="h-3 w-3 text-emerald-600" /> Targeted / Affected Community Hubs ({b.targetCommunityNames?.length || b.targetCommunityIds?.length || 0}):
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {Array.isArray(b.targetCommunityNames) && b.targetCommunityNames.length > 0 ? (
                          b.targetCommunityNames.map((name: string, idx: number) => (
                            <Badge key={idx} variant="secondary" className="text-[10px] bg-emerald-50 text-emerald-800 border border-emerald-200">
                              🏠 {name}
                            </Badge>
                          ))
                        ) : (
                          <Badge variant="secondary" className="text-[10px] bg-emerald-50 text-emerald-800 border border-emerald-200">
                            Targeted Hubs Encompassed
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          {/* Regional Photo Showcase Carousel (Left Column under Announcements) */}
          <Card className="shadow-md overflow-hidden border border-emerald-500/20 bg-slate-900 text-white">
            <CardHeader className="border-b border-slate-800 bg-slate-950/80 p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Camera className="h-5 w-5 text-emerald-400" />
                  <div>
                    <CardTitle className="text-base font-bold text-white">Regional Photo Showcase</CardTitle>
                    <CardDescription className="text-xs text-slate-400">Interactive 3D revolving carousel ({regionalPhotos.length} photos)</CardDescription>
                  </div>
                </div>
                {isOwner && (
                  <Button asChild size="sm" variant="outline" className="text-xs bg-emerald-500/10 text-emerald-300 border-emerald-500/30 hover:bg-emerald-500/20">
                    <Link href="/regional/public-site/photos">
                      <Camera className="mr-1.5 h-3.5 w-3.5" /> Manage Gallery
                    </Link>
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent className="p-4">
              <Regional3DPhotoWheel photos={regionalPhotos} />
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Jurisdiction Communities & Contact Info (5 Cols) */}
        <div className="lg:col-span-5 space-y-6">
          
          {/* Encompassed Community Hubs Directory Card */}
          <Card className="shadow-md">
            <CardHeader className="border-b bg-muted/30 p-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Globe className="h-5 w-5 text-emerald-600" />
                  <div>
                    <CardTitle className="text-base font-bold">Jurisdiction Communities ({encompassedCommunities.length})</CardTitle>
                    <CardDescription className="text-xs">Hubs geofenced inside perimeter boundary map</CardDescription>
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-5 space-y-2 max-h-[360px] overflow-y-auto pr-1">
              {isLoadingCommunities ? (
                <Skeleton className="h-20 w-full" />
              ) : encompassedCommunities.length === 0 ? (
                <div className="p-4 text-center text-xs text-muted-foreground">
                  No community hubs geofenced inside boundary yet.
                </div>
              ) : (
                encompassedCommunities.map((comm) => (
                  <Link 
                    key={comm.id}
                    href={`/home?community=${comm.id}`}
                    className="p-3 rounded-lg border bg-card hover:bg-emerald-50/50 dark:hover:bg-emerald-950/30 transition-colors flex items-center justify-between group"
                  >
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-1.5">
                        <span className="h-2 w-2 rounded-full bg-emerald-500 shrink-0" />
                        <span className="text-xs font-semibold text-foreground group-hover:text-emerald-600 transition-colors">
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
                ))
              )}
            </CardContent>
          </Card>

          {/* Official Authority Contact & Settings Info Card */}
          <Card className="shadow-md border-2 border-emerald-500/20">
            <CardHeader className="border-b bg-emerald-50/50 dark:bg-emerald-950/20 p-5">
              <div className="flex items-center gap-2">
                <Building className="h-5 w-5 text-emerald-600" />
                <div>
                  <CardTitle className="text-base font-bold">Official Authority Information</CardTitle>
                  <CardDescription className="text-xs">Saved from Authority Settings</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-5 space-y-4 text-xs">
              
              <div className="space-y-1">
                <span className="text-muted-foreground font-semibold uppercase text-[10px] tracking-wider">Official Organization Name</span>
                <p className="font-bold text-foreground text-sm">{organizationName}</p>
              </div>

              <div className="space-y-1 pt-2 border-t">
                <span className="text-muted-foreground font-semibold uppercase text-[10px] tracking-wider">Emergency Response Hotline</span>
                <p className="font-bold text-red-600 flex items-center gap-1 text-xs">
                  <ShieldAlert className="h-3.5 w-3.5 shrink-0" /> {emergencyHotline}
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t">
                <div>
                  <span className="text-muted-foreground font-semibold uppercase text-[10px] tracking-wider">Phone Number(s)</span>
                  <div className="space-y-0.5 mt-0.5">
                    {allPhones.map((ph: string, i: number) => (
                      <p key={i} className="font-medium text-foreground">{ph}</p>
                    ))}
                  </div>
                </div>
                <div>
                  <span className="text-muted-foreground font-semibold uppercase text-[10px] tracking-wider">Contact Email(s)</span>
                  <div className="space-y-0.5 mt-0.5">
                    {allEmails.map((em: string, i: number) => (
                      <p key={i} className="font-medium text-foreground line-clamp-1">{em}</p>
                    ))}
                  </div>
                </div>
              </div>

              <div className="space-y-1 pt-2 border-t">
                <span className="text-muted-foreground font-semibold uppercase text-[10px] tracking-wider flex items-center gap-1">
                  <Clock className="h-3 w-3 text-emerald-600" /> Operating Hours
                </span>
                <p className="font-medium text-foreground">{operatingHours}</p>
              </div>

              <div className="space-y-1 pt-2 border-t">
                <span className="text-muted-foreground font-semibold uppercase text-[10px] tracking-wider">Jurisdiction Address</span>
                <p className="font-medium text-foreground">{address}</p>
              </div>

            </CardContent>
            {isOwner && (
              <CardFooter className="border-t p-4">
                <Button asChild variant="outline" size="sm" className="w-full text-xs font-semibold">
                  <Link href="/regional/settings">
                    <Sliders className="mr-1.5 h-3.5 w-3.5" /> Edit Information in Authority Settings
                  </Link>
                </Button>
              </CardFooter>
            )}
          </Card>

        </div>

      </div>

      {/* Full-Width Section: Authority Overview & Mandate (Main Bio Rich Text) */}
      {mainBio && (
        <Card className="shadow-lg w-full border-t-4 border-t-emerald-600">
          <CardHeader className="border-b bg-emerald-50/40 dark:bg-emerald-950/20 p-6">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-emerald-500/10 rounded-xl text-emerald-600 dark:text-emerald-400">
                <Building className="h-6 w-6" />
              </div>
              <div>
                <CardTitle className="text-xl font-bold font-headline text-foreground">Authority Overview & Mandate</CardTitle>
                <CardDescription className="text-xs">Official background, responsibilities & operational mandate for {regionName}</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-6 md:p-8">
            <div 
              className="prose prose-sm md:prose-base dark:prose-invert max-w-none text-foreground leading-relaxed"
              dangerouslySetInnerHTML={{ __html: mainBio }}
            />
          </CardContent>
        </Card>
      )}

    </div>
  );
}

export default function RegionalPublicSitePage() {
  return (
    <React.Suspense fallback={
      <div className="container mx-auto max-w-7xl py-12 px-4 text-center space-y-4">
        <Skeleton className="h-48 w-full rounded-2xl" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <Skeleton className="h-96 w-full rounded-2xl" />
          <Skeleton className="h-96 w-full rounded-2xl" />
        </div>
      </div>
    }>
      <RegionalPublicSiteContent />
    </React.Suspense>
  );
}
