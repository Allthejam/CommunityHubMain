"use client";

import * as React from "react";
import Link from "next/link";
import dynamicMap from "next/dynamic";
import { usePathname } from "next/navigation";
import {
  HeartPulse,
  MapPin,
  Navigation,
  Phone,
  PhoneCall,
  ShieldAlert,
  Clock,
  KeyRound,
  ExternalLink,
  Compass,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  Locate,
  ArrowLeft,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { useUser, useFirestore, useDoc, useMemoFirebase } from "@/firebase";
import { doc } from "firebase/firestore";
import {
  type DefibrillatorItem,
  DEFAULT_DEMO_DEFIBRILLATORS,
} from "@/lib/types/defibrillators";

const DefibrillatorMap = dynamicMap(() => import("@/components/defibrillator-map"), {
  ssr: false,
  loading: () => (
    <div className="h-[420px] flex flex-col items-center justify-center bg-muted/40 rounded-xl border">
      <Loader2 className="h-8 w-8 animate-spin text-red-600 mb-2" />
      <span className="text-xs text-muted-foreground font-medium">Loading Community Defibrillator Map...</span>
    </div>
  ),
});

// Haversine formula to compute distance in metres
function calculateDistanceMetres(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371e3; // Earth radius in metres
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function formatDistance(metres: number): string {
  if (metres < 1000) {
    const mins = Math.max(1, Math.round(metres / 80)); // ~80m/min walking speed
    return `${Math.round(metres)}m away (~${mins} min walk)`;
  }
  const miles = (metres / 1609.34).toFixed(1);
  return `${miles} miles away`;
}

export function DefibrillatorsClient() {
  const pathname = usePathname();
  const isDemo = pathname?.startsWith("/demo");
  const demoPrefix = isDemo ? "/demo" : "";

  const { user } = useUser();
  const db = useFirestore();

  const userProfileRef = useMemoFirebase(
    () => (user && db ? doc(db, "users", user.uid) : null),
    [user, db]
  );
  const { data: userProfile } = useDoc<any>(userProfileRef);

  const activeCommunityId = isDemo
    ? "9ayHMyZf4SRw2gof1AM9"
    : ((typeof window !== "undefined" ? sessionStorage.getItem("visitedCommunityId") : null) ||
        userProfile?.primaryHomeCommunityId ||
        userProfile?.homeCommunityId ||
        userProfile?.communityId ||
        "9ayHMyZf4SRw2gof1AM9");

  const communityDocRef = useMemoFirebase(
    () => (activeCommunityId && db ? doc(db, "communities", activeCommunityId) : null),
    [activeCommunityId, db]
  );
  const { data: activeCommunity, isLoading: communityLoading } = useDoc<any>(communityDocRef);
  const communityName = activeCommunity?.name || (isDemo ? "Grantown-on-Spey" : "Local Community");

  const profileId = activeCommunity?.profileId || activeCommunityId;
  const profileDocRef = useMemoFirebase(
    () => (profileId && db ? doc(db, "community_profiles", profileId) : null),
    [profileId, db]
  );
  const { data: profileData, isLoading: profileLoading } = useDoc<any>(profileDocRef);

  const [selectedId, setSelectedId] = React.useState<string | null>(null);

  // User Geolocation
  const [userLocation, setUserLocation] = React.useState<{ lat: number; lng: number } | null>(null);
  const [locatingUser, setLocatingUser] = React.useState(false);
  const [geoError, setGeoError] = React.useState<string | null>(null);

  // Filter: 'all' | '24_7'
  const [accessFilter, setAccessFilter] = React.useState<"all" | "24_7">("all");

  // Resolve defibrillators ensuring it is always a genuine array
  const defibrillators: DefibrillatorItem[] = React.useMemo(() => {
    // 1. Check local session storage (demo mode)
    if (typeof window !== "undefined") {
      try {
        const cached =
          sessionStorage.getItem(`demo_about_${activeCommunityId}`) ||
          localStorage.getItem(`demo_about_${activeCommunityId}`);
        if (cached) {
          const parsed = JSON.parse(cached);
          if (Array.isArray(parsed.defibrillators) && parsed.defibrillators.length > 0) {
            return parsed.defibrillators;
          }
        }
      } catch (e) {}
    }

    // 2. Client Firestore data
    if (profileData && Array.isArray(profileData.defibrillators) && profileData.defibrillators.length > 0) {
      return profileData.defibrillators;
    }

    // 3. Fallback to default demo defibrillators
    return Array.isArray(DEFAULT_DEMO_DEFIBRILLATORS) ? DEFAULT_DEMO_DEFIBRILLATORS : [];
  }, [activeCommunityId, profileData]);

  // Request browser geolocation
  const handleFindNearest = () => {
    if (!navigator.geolocation) {
      setGeoError("Geolocation is not supported by your browser or device.");
      return;
    }

    setLocatingUser(true);
    setGeoError(null);

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const coords = {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
        };
        setUserLocation(coords);
        setLocatingUser(false);
      },
      (err) => {
        setLocatingUser(false);
        if (err.code === err.PERMISSION_DENIED) {
          setGeoError("Location permission was denied. You can still use the map and addresses below.");
        } else {
          setGeoError("Could not obtain your live position. Please check your GPS signal.");
        }
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 30000 }
    );
  };

  // Compute items sorted with distance if location available
  const sortedDefibrillators = React.useMemo(() => {
    let items = Array.isArray(defibrillators) ? [...defibrillators] : [];

    if (accessFilter === "24_7") {
      items = items.filter((d) => d.accessType === "24_7");
    }

    if (!userLocation) {
      return items.map((d) => ({ ...d, distanceMetres: null }));
    }

    const itemsWithDistance = items.map((d) => {
      if (typeof d.lat === "number" && typeof d.lng === "number") {
        const dist = calculateDistanceMetres(userLocation.lat, userLocation.lng, d.lat, d.lng);
        return { ...d, distanceMetres: dist };
      }
      return { ...d, distanceMetres: null };
    });

    return itemsWithDistance.sort((a, b) => {
      if (a.distanceMetres === null) return 1;
      if (b.distanceMetres === null) return -1;
      return a.distanceMetres - b.distanceMetres;
    });
  }, [defibrillators, userLocation, accessFilter]);

  const count247 = React.useMemo(() => {
    const list = Array.isArray(defibrillators) ? defibrillators : [];
    return list.filter((d) => d.accessType === "24_7").length;
  }, [defibrillators]);

  const loading = communityLoading && profileLoading;

  return (
    <div className="container max-w-6xl mx-auto py-6 sm:py-8 space-y-8">
      {/* Top Breadcrumb & Quick Actions */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Button variant="ghost" size="sm" asChild className="gap-2">
          <Link href={`${demoPrefix}/home`}>
            <ArrowLeft className="h-4 w-4" /> Back to Home
          </Link>
        </Button>
        <Button
          variant="outline"
          size="sm"
          asChild
          className="border-red-200 dark:border-red-900 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 gap-1.5 font-semibold"
        >
          <a href="tel:999">
            <PhoneCall className="h-3.5 w-3.5" /> Call 999 (Emergency)
          </a>
        </Button>
      </div>

      {/* Emergency Priority Alert Banner */}
      <div className="rounded-2xl border-2 border-red-500/80 bg-red-50 dark:bg-red-950/40 p-4 sm:p-6 shadow-md text-red-950 dark:text-red-100 space-y-3">
        <div className="flex items-start gap-3.5">
          <div className="p-2.5 rounded-full bg-red-600 text-white shrink-0 mt-0.5 shadow-sm">
            <ShieldAlert className="h-6 w-6" />
          </div>
          <div className="space-y-1.5 flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-extrabold text-sm sm:text-base uppercase tracking-wider text-red-700 dark:text-red-400">
                Cardiac Emergency Protocol
              </span>
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold bg-red-600 text-white animate-pulse">
                Call 999 Immediately
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black tracking-tight text-red-900 dark:text-red-100">
              If Someone Is Unresponsive &amp; Not Breathing:
            </h2>
            <p className="text-sm sm:text-base text-red-800 dark:text-red-200 leading-relaxed">
              <strong>1. Call 999 without delay.</strong> Put the phone on speaker.
              <br />
              <strong>2. Start chest compressions (CPR) immediately.</strong>
              <br />
              <strong>3. Send someone to retrieve the nearest defibrillator below.</strong> The 999 call handler will give you the cabinet keypad unlock code over the phone.
            </p>
          </div>
        </div>
      </div>

      {/* Page Header */}
      <div className="space-y-2">
        <div className="flex items-center gap-2 flex-wrap">
          <Badge className="bg-red-600 hover:bg-red-700 text-white font-bold gap-1.5 py-1 px-3">
            <HeartPulse className="h-4 w-4" /> Public Access Defibrillators (AED)
          </Badge>
          <span className="text-xs text-muted-foreground font-medium">
            {defibrillators.length} registered in {communityName}
          </span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight font-headline">
          Nearest Defibrillators in {communityName}
        </h1>
        <p className="text-sm sm:text-base text-muted-foreground max-w-3xl">
          Locate life-saving Automated External Defibrillators with exact map coordinates, cabinet keypad instructions,
          and 1-tap walking directions.
        </p>
      </div>

      {/* Geolocation Button & Filters */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-xl bg-card border shadow-xs">
        <div className="flex items-center gap-2 flex-wrap">
          <Button
            onClick={handleFindNearest}
            disabled={locatingUser}
            className="bg-red-600 hover:bg-red-700 text-white font-bold gap-2 shadow-xs"
          >
            {locatingUser ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Locate className="h-4 w-4" />
            )}
            {userLocation ? "Refresh Nearest to My Location" : "Find Closest to My Location"}
          </Button>

          {userLocation && (
            <Badge variant="outline" className="border-emerald-300 text-emerald-700 dark:text-emerald-300 bg-emerald-50/50 gap-1 font-semibold py-1">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
              Live GPS Active · Sorted by Proximity
            </Badge>
          )}
        </div>

        <div className="flex items-center gap-1.5 p-1 bg-muted rounded-lg text-xs">
          <Button
            size="sm"
            variant={accessFilter === "all" ? "default" : "ghost"}
            onClick={() => setAccessFilter("all")}
            className="h-8 text-xs font-semibold"
          >
            All Defibs ({defibrillators.length})
          </Button>
          <Button
            size="sm"
            variant={accessFilter === "24_7" ? "default" : "ghost"}
            onClick={() => setAccessFilter("24_7")}
            className={`h-8 text-xs font-semibold ${
              accessFilter === "24_7" ? "bg-emerald-600 hover:bg-emerald-700 text-white" : ""
            }`}
          >
            24/7 Access Only ({count247})
          </Button>
        </div>
      </div>

      {geoError && (
        <div className="p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-xl text-xs text-amber-800 dark:text-amber-200 flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" />
          <span>{geoError}</span>
        </div>
      )}

      {/* Main Grid: Interactive Map + Defibrillator Cards */}
      <div className="space-y-6">
        {/* Interactive Town Map */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold flex items-center gap-2">
              <MapPin className="h-5 w-5 text-red-600" /> Interactive Defibrillator Map
            </h3>
            <span className="text-xs text-muted-foreground hidden sm:inline">
              Tap any pin on the map to view access instructions &amp; get directions
            </span>
          </div>
          <DefibrillatorMap
            mode="view"
            defibrillators={sortedDefibrillators}
            selectedId={selectedId}
            onSelect={(id) => setSelectedId(id)}
            userLocation={userLocation}
            height="440px"
          />
        </div>

        {/* Defibrillator Cards List */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold flex items-center gap-2">
              <HeartPulse className="h-5 w-5 text-red-600" /> Available Defibrillators List
            </h3>
            <span className="text-xs text-muted-foreground">
              Showing {sortedDefibrillators.length} locations
            </span>
          </div>

          {loading ? (
            <div className="text-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-red-600 mx-auto" />
            </div>
          ) : sortedDefibrillators.length === 0 ? (
            <div className="text-center py-12 border border-dashed rounded-2xl bg-muted/20">
              <HeartPulse className="h-10 w-10 text-muted-foreground mx-auto mb-2 opacity-50" />
              <p className="font-semibold text-muted-foreground">No defibrillators found for this filter.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {sortedDefibrillators.map((defib, idx) => {
                const isSelected = selectedId === defib.id;
                const is247 = defib.accessType === "24_7";
                const destination =
                  defib.lat && defib.lng ? `${defib.lat},${defib.lng}` : encodeURIComponent(defib.address);
                const googleMapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${destination}&travelmode=walking`;

                return (
                  <Card
                    key={defib.id}
                    className={`transition-all duration-200 border-2 cursor-pointer ${
                      isSelected
                        ? "border-red-600 shadow-md ring-2 ring-red-600/20 bg-red-50/20 dark:bg-red-950/10"
                        : "border-border hover:border-red-300 dark:hover:border-red-800 hover:shadow-sm"
                    }`}
                    onClick={() => setSelectedId(defib.id)}
                  >
                    <CardHeader className="p-4 pb-2">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {is247 ? (
                            <Badge className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] gap-1">
                              ● 24/7 Public Access
                            </Badge>
                          ) : (
                            <Badge className="bg-amber-600 hover:bg-amber-700 text-white font-bold text-[11px] gap-1">
                              <Clock className="h-3 w-3" /> Restricted Hours
                            </Badge>
                          )}

                          {defib.distanceMetres !== null && defib.distanceMetres !== undefined && (
                            <Badge variant="outline" className="border-red-300 text-red-700 dark:text-red-300 bg-red-50/60 dark:bg-red-950/40 font-bold text-[11px] gap-1">
                              <Navigation className="h-3 w-3" />
                              {formatDistance(defib.distanceMetres)}
                            </Badge>
                          )}
                        </div>

                        <span className="text-xs font-mono font-bold text-muted-foreground/80">
                          #{idx + 1}
                        </span>
                      </div>

                      <CardTitle className="text-base sm:text-lg font-bold tracking-tight text-foreground mt-2 leading-snug">
                        {defib.name}
                      </CardTitle>

                      <CardDescription className="text-xs text-muted-foreground flex items-center gap-1 pt-0.5">
                        <MapPin className="h-3.5 w-3.5 shrink-0 text-red-600" />
                        <span className="line-clamp-1">{defib.address}</span>
                      </CardDescription>
                    </CardHeader>

                    <CardContent className="p-4 pt-1 pb-3 space-y-2 text-xs">
                      {defib.locationNotes && (
                        <p className="text-muted-foreground bg-muted/40 p-2 rounded-md italic">
                          &ldquo;{defib.locationNotes}&rdquo;
                        </p>
                      )}

                      <div className="space-y-1 pt-1">
                        {defib.cabinetCodeInstructions && (
                          <div className="flex items-center gap-1.5 font-semibold text-red-700 dark:text-red-300">
                            <KeyRound className="h-3.5 w-3.5 shrink-0" />
                            <span>Cabinet: {defib.cabinetCodeInstructions}</span>
                          </div>
                        )}

                        {defib.accessHours && (
                          <div className="flex items-center gap-1.5 text-muted-foreground">
                            <Clock className="h-3.5 w-3.5 shrink-0" />
                            <span>Hours: {defib.accessHours}</span>
                          </div>
                        )}

                        {defib.what3words && (
                          <div className="flex items-center gap-1.5 text-muted-foreground">
                            <span className="font-bold text-red-600">///</span>
                            <a
                              href={`https://what3words.com/${defib.what3words.replace("///", "")}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-primary hover:underline font-mono"
                              onClick={(e) => e.stopPropagation()}
                            >
                              {defib.what3words}
                            </a>
                          </div>
                        )}
                      </div>
                    </CardContent>

                    <CardFooter className="p-4 pt-0 gap-2 flex flex-col sm:flex-row">
                      <Button
                        asChild
                        size="sm"
                        className="w-full bg-red-600 hover:bg-red-700 text-white font-bold gap-1.5 shadow-xs"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <a href={googleMapsUrl} target="_blank" rel="noopener noreferrer">
                          <Navigation className="h-4 w-4" /> Get Walking Directions
                        </a>
                      </Button>

                      <Button
                        asChild
                        variant="outline"
                        size="sm"
                        className="w-full sm:w-auto shrink-0 gap-1 text-xs"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <a
                          href={`https://www.google.com/maps/search/?api=1&query=${destination}`}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <ExternalLink className="h-3.5 w-3.5" /> Map View
                        </a>
                      </Button>
                    </CardFooter>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
