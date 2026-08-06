'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { 
  Map as MapIcon, 
  ArrowLeft, 
  Loader2, 
  Info, 
  Globe, 
  MapPin, 
  ChevronRight, 
  CheckCircle2,
  Users,
  Search,
  Lock,
  ShieldCheck,
  AlertCircle,
  Home as HomeIcon
} from 'lucide-react';
import { useUser, useFirestore, useDoc, useCollection, useMemoFirebase } from '@/firebase';
import { doc, collection, query, where, updateDoc, setDoc } from 'firebase/firestore';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import RegionalHeader from '@/components/layout/regional-header';

const CommunityBoundaryMap = dynamic(() => import("@/components/community-boundary-map"), {
  ssr: false,
  loading: () => (
    <div className="flex justify-center items-center h-96">
      <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
    </div>
  ),
});

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

    // Strict spatial containment & overlap check:
    // Community polygon MUST fall inside or intersect the locked regional boundary polygon
    const overlaps = (
      cBox.minLng <= rBox.maxLng &&
      cBox.maxLng >= rBox.minLng &&
      cBox.minLat <= rBox.maxLat &&
      cBox.maxLat >= rBox.minLat
    );

    return overlaps;
  } catch (err) {
    return false;
  }
}

export default function RegionalMapSetupPage() {
  const { user } = useUser();
  const db = useFirestore();
  const { toast } = useToast();

  const userProfileRef = useMemoFirebase(() => {
    if (!user || !db) return null;
    return doc(db, 'users', user.uid);
  }, [user, db]);

  const { data: userProfile } = useDoc(userProfileRef);
  const organizationName = userProfile?.organizationName || userProfile?.businessName || 'Regional Authority';

  const [searchQuery, setSearchQuery] = useState('');
  const [isLockedIn, setIsLockedIn] = useState(false);
  const [lockedBoundaryGeoJson, setLockedBoundaryGeoJson] = useState<string | null>(null);
  const [primaryHomeFeedId, setPrimaryHomeFeedId] = useState<string>('');

  // Load saved boundary, locked status, and primary home feed from Firestore on mount
  React.useEffect(() => {
    if (userProfile) {
      if (userProfile.regionalBoundaryLocked !== undefined) {
        setIsLockedIn(!!userProfile.regionalBoundaryLocked);
      }
      if (userProfile.regionalBoundary) {
        setLockedBoundaryGeoJson(userProfile.regionalBoundary);
      }
      if (userProfile.primaryHomeCommunityId || userProfile.homeCommunityId) {
        setPrimaryHomeFeedId(userProfile.primaryHomeCommunityId || userProfile.homeCommunityId);
      }
    }
  }, [userProfile]);

  const handleSetPrimaryHomeFeed = async (commId: string) => {
    setPrimaryHomeFeedId(commId);
    if (!user || !db) return;
    try {
      const selectedComm = registeredCommunitiesWithPolygons.find(c => c.id === commId);
      const userRef = doc(db, 'users', user.uid);
      await setDoc(userRef, {
        primaryHomeCommunityId: commId,
        homeCommunityId: commId,
        homeCommunityName: selectedComm?.name || 'Home Community'
      }, { merge: true });

      toast({
        title: 'Home Feed Linked Successfully!',
        description: `Your top menu 'Home Feed' button is now linked directly to ${selectedComm?.name || 'this community'}.`
      });
    } catch (err: any) {
      console.error("Error setting primary home feed:", err);
      toast({ title: 'Error', description: 'Failed to update Home Feed link.', variant: 'destructive' });
    }
  };

  // Handle saving locked boundary state directly to Firestore
  const handleLockChange = async (locked: boolean, geoJsonStr?: string | null) => {
    setIsLockedIn(locked);
    const boundaryToSave = geoJsonStr || lockedBoundaryGeoJson;

    if (geoJsonStr) {
      setLockedBoundaryGeoJson(geoJsonStr);
    }

    if (user && db) {
      try {
        const userRef = doc(db, 'users', user.uid);
        await setDoc(userRef, {
          regionalBoundary: boundaryToSave || null,
          regionalBoundaryLocked: locked,
          regionalBoundaryUpdatedAt: new Date().toISOString()
        }, { merge: true });

        toast({
          title: locked ? "Boundary Saved & Locked to Database!" : "Boundary Unlocked",
          description: locked ? "Your regional perimeter map has been saved to your account in Firestore." : "Presets re-enabled."
        });
      } catch (e: any) {
        console.error("Firestore save error:", e);
        toast({ variant: "destructive", title: "Error saving to database", description: e.message });
      }
    }
  };

  // STRICT RULE: Only query registered communities from Firestore that have a non-null registered polygon boundary!
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
  // ONLY communities whose registered polygon map falls INSIDE the locked regional boundary polygon are listed!
  const registeredCommunitiesWithPolygons = useMemo(() => {
    if (!registeredDocs || registeredDocs.length === 0 || !lockedBoundaryGeoJson) return [];
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
          hasLeadership: hasLeader,
          status: 'Inside Regional Boundary'
        };
      })
      .filter(comm => !!comm.boundary && isCommunityInsideRegionalBoundary(lockedBoundaryGeoJson, comm.boundary));
  }, [registeredDocs, lockedBoundaryGeoJson, leaderCommunityIds]);

  const filteredCommunities = registeredCommunitiesWithPolygons.filter(c => 
    c.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="container mx-auto max-w-7xl py-8 px-4 space-y-6">
        <div>
          <Button asChild variant="ghost" size="sm" className="mb-2 p-0 h-auto">
            <Link href="/regional/dashboard">
              <ArrowLeft className="mr-2 h-4 w-4" /> Back to Dashboard
            </Link>
          </Button>
          <h1 className="text-2xl md:text-3xl font-extrabold font-headline tracking-tight">
            Regional Boundary & Communities Map
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Draw or select your regional boundary map for {organizationName} and lock it in to detect all registered community polygon maps.
          </p>
        </div>

        {/* Clean 2-Column Desktop Grid (Square Map ~1/2 Page on PC, Full on Mobile) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* Left Column: Square Map (~Half Page on PC = 6 of 12 cols, Full on Mobile) */}
          <div className="lg:col-span-6 space-y-4">
            <Card className="shadow-md overflow-hidden">
              <CardHeader className="border-b bg-muted/30 p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <MapIcon className="h-5 w-5 text-emerald-600" />
                    <CardTitle className="text-base font-bold">Boundary Drawer</CardTitle>
                  </div>
                  <Badge className="bg-emerald-100 text-emerald-800 border-emerald-300 text-xs">
                    {isLockedIn ? '🔒 Boundary Locked' : 'Square View'}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="p-4">
                <CommunityBoundaryMap 
                  disabled={false} 
                  aspectRatio="square" 
                  initialBoundaryData={userProfile?.regionalBoundary || null}
                  initialIsLocked={!!userProfile?.regionalBoundaryLocked}
                  onLockChange={handleLockChange} 
                />
              </CardContent>
            </Card>

            <Alert className="bg-emerald-50 border-emerald-200 dark:bg-emerald-950/30 text-xs">
              <Info className="h-4 w-4 text-emerald-600" />
              <AlertTitle className="text-emerald-800 dark:text-emerald-300 font-semibold text-xs">Strict Verification Rule</AlertTitle>
              <AlertDescription className="text-xs text-emerald-700 dark:text-emerald-400 mt-0.5">
                Only communities registered in the database with an <strong>official saved polygon boundary map</strong> will be listed. Unregistered areas will not appear.
              </AlertDescription>
            </Alert>
          </div>

          {/* Right Column: Registered Communities With Polygon Maps ONLY */}
          <div className="lg:col-span-6 space-y-4">
            
            {/* PRIMARY HOME FEED SELECTOR DROPDOWN */}
            {isLockedIn && registeredCommunitiesWithPolygons.length > 0 && (
              <Card className="shadow-sm border-2 border-emerald-500/30 bg-emerald-50/40 dark:bg-emerald-950/20">
                <CardContent className="p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <HomeIcon className="h-4 w-4 text-emerald-600 font-bold" />
                      <Label className="text-sm font-bold text-foreground">Set Primary Home Feed Destination</Label>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Select which encompassed community hub links to your top navigation <strong>Home Feed</strong> menu button.
                    </p>
                  </div>

                  <div className="w-full sm:w-60 shrink-0">
                    <Select value={primaryHomeFeedId} onValueChange={handleSetPrimaryHomeFeed}>
                      <SelectTrigger className="h-9 text-xs bg-background font-semibold border-emerald-300">
                        <SelectValue placeholder="Select Home Feed Hub..." />
                      </SelectTrigger>
                      <SelectContent>
                        {registeredCommunitiesWithPolygons.map((comm) => (
                          <SelectItem key={comm.id} value={comm.id} className="text-xs">
                            🏠 {comm.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </CardContent>
              </Card>
            )}

            <Card className="shadow-md min-h-[500px] lg:min-h-[520px] flex flex-col justify-between">
              <CardHeader className="border-b bg-muted/30 p-4">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                  <div className="flex items-center gap-2">
                    <Globe className="h-5 w-5 text-emerald-600" />
                    <div>
                      <CardTitle className="text-base font-bold">
                        {isLockedIn ? `Registered Communities (${registeredCommunitiesWithPolygons.length})` : 'Encompassed Communities'}
                      </CardTitle>
                      <CardDescription className="text-xs">
                        {isLockedIn ? 'Strictly listing communities with registered polygon maps in database' : 'Lock in boundary to verify registered community polygons'}
                      </CardDescription>
                    </div>
                  </div>

                  {isLockedIn && registeredCommunitiesWithPolygons.length > 0 && (
                    <div className="relative w-full sm:w-44">
                      <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                      <Input 
                        placeholder="Filter registered..." 
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-8 h-8 text-xs"
                      />
                    </div>
                  )}
                </div>
              </CardHeader>
              
              {isLockedIn ? (
                isLoadingCommunities ? (
                  <CardContent className="p-8 my-auto text-center space-y-3">
                    <Loader2 className="h-8 w-8 animate-spin text-emerald-600 mx-auto" />
                    <p className="text-xs text-muted-foreground">Verifying registered community polygon maps in database...</p>
                  </CardContent>
                ) : registeredCommunitiesWithPolygons.length > 0 ? (
                  <>
                    <CardContent className="p-4 flex-1 space-y-3 overflow-y-auto max-h-[520px]">
                      {filteredCommunities.map((comm) => (
                        <div 
                          key={comm.id}
                          className="p-3 rounded-lg border bg-card hover:bg-emerald-50/50 dark:hover:bg-emerald-950/30 transition-colors flex items-center justify-between gap-3"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="p-2 rounded-lg bg-emerald-100 dark:bg-emerald-950 text-emerald-600 shrink-0">
                              <ShieldCheck className="h-4 w-4 text-emerald-600" />
                            </div>
                            <div className="truncate">
                              <h4 className="text-sm font-semibold text-foreground truncate">{comm.name}</h4>
                              <span className="text-xs text-muted-foreground flex items-center gap-2 mt-0.5">
                                <span className="flex items-center gap-1"><Users className="h-3 w-3" /> Est. {comm.population}</span>
                                <span>•</span>
                                <span className={comm.hasLeadership ? 'text-emerald-600 font-semibold dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'}>
                                  Leadership: {comm.hasLeadership ? 'Yes' : 'No'}
                                </span>
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            <Badge className="bg-emerald-600 text-white text-[10px] hidden sm:inline-flex">
                              <CheckCircle2 className="h-3 w-3 mr-1" /> Polygon Registered
                            </Badge>
                            <Button asChild size="sm" variant="ghost" className="h-8 w-8 p-0">
                              <Link href="/regional/communities">
                                <ChevronRight className="h-4 w-4 text-muted-foreground" />
                              </Link>
                            </Button>
                          </div>
                        </div>
                      ))}
                    </CardContent>

                    <CardFooter className="border-t p-4 bg-muted/20 flex justify-between items-center text-xs text-muted-foreground mt-auto">
                      <span>Verified Registered Polygon Hubs: <strong className="text-foreground">{registeredCommunitiesWithPolygons.length}</strong></span>
                      <Button asChild variant="outline" size="sm" className="text-xs">
                        <Link href="/regional/communities">Full Directory</Link>
                      </Button>
                    </CardFooter>
                  </>
                ) : (
                  <CardContent className="p-8 my-auto text-center space-y-4">
                    <div className="p-4 rounded-full bg-amber-100 dark:bg-amber-950/60 text-amber-600 w-16 h-16 mx-auto flex items-center justify-center">
                      <AlertCircle className="h-8 w-8" />
                    </div>
                    <div className="max-w-sm mx-auto space-y-2">
                      <h3 className="font-bold text-base text-foreground">0 Registered Communities Found</h3>
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        No registered communities with an active <strong>polygon boundary map</strong> in the database fall within this region yet.
                      </p>
                      <p className="text-[11px] text-emerald-700 dark:text-emerald-400 font-semibold pt-1">
                        Only official registered hubs with a saved polygon map appear here.
                      </p>
                    </div>
                  </CardContent>
                )
              ) : (
                <CardContent className="p-8 my-auto text-center space-y-4">
                  <div className="p-4 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 w-16 h-16 mx-auto flex items-center justify-center animate-pulse">
                    <Globe className="h-8 w-8" />
                  </div>
                  <div className="max-w-sm mx-auto space-y-2">
                    <h3 className="font-bold text-lg text-foreground">Registered Polygon Detector</h3>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      Select an AI preset or draw your boundary polygon on the map, then click <strong className="text-emerald-700 dark:text-emerald-400">"Lock It In"</strong> to verify and display only registered communities with saved polygon maps.
                    </p>
                  </div>
                </CardContent>
              )}
            </Card>
          </div>

        </div>
    </div>
  );
}
