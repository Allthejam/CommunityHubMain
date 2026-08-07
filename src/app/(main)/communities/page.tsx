'use client';

import React, { useState, useEffect, useMemo } from 'react';
import dynamic from 'next/dynamic';
import { 
    runGetAllPublicCommunities, 
    PublicCommunityData, 
    runSaveCommunityCentroid,
    runGetAllRegionalNetworks,
    PublicRegionalNetworkData
} from '@/lib/actions/communityActions';

import { calculateDistanceMiles, getCentroidFromGeoJson } from '@/components/communities-map-view';
import { updateUserCommunityAction } from '@/lib/actions/userActions';
import { useUser, useFirestore } from '@/firebase';
import { collection, query, where, onSnapshot, doc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';

import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from '@/components/ui/tooltip';
import { 
    Search, 
    MapPin, 
    Crown, 
    Users, 
    Compass, 
    Loader2, 
    Filter, 
    Sparkles, 
    Building2, 
    ExternalLink,
    LocateFixed,
    Navigation,
    Home,
    AlertCircle,
    Info
} from 'lucide-react';


// Dynamic import for Leaflet map to prevent SSR issues
const CommunitiesMapView = dynamic(() => import('@/components/communities-map-view'), {
    ssr: false,
    loading: () => (
        <div className="w-full h-[550px] md:h-[650px] bg-slate-100 dark:bg-slate-800 rounded-2xl flex flex-col items-center justify-center gap-3 border">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-sm font-medium text-muted-foreground">Loading Interactive Community Map...</p>
        </div>
    )
});

export default function CommunitiesDiscoveryPage() {
    const { user, userProfile } = useUser();
    const { toast } = useToast();
    const router = useRouter();
    const db = useFirestore();

    const [communities, setCommunities] = useState<PublicCommunityData[]>([]);
    const [regionalNetworks, setRegionalNetworks] = useState<PublicRegionalNetworkData[]>([]);
    const [loading, setLoading] = useState(true);

    // Map Layer Checkbox Filter Toggles
    const [showCommunityBoundaries, setShowCommunityBoundaries] = useState<boolean>(true);
    const [showRegionalNetworks, setShowRegionalNetworks] = useState<boolean>(true);

    // GPS & Manual Location State
    const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
    const [locationLabel, setLocationLabel] = useState<string>('United Kingdom (National Overview)');
    const [customLocationQuery, setCustomLocationQuery] = useState('');
    const [isLocating, setIsLocating] = useState(false);
    const [isSearchingLocation, setIsSearchingLocation] = useState(false);
    const [locationDenied, setLocationDenied] = useState(false);

    // Filters: Country -> Constituent/State -> Region -> Target Community
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedCountry, setSelectedCountry] = useState<string>('United Kingdom');
    const [selectedState, setSelectedState] = useState<string>('all');
    const [selectedRegion, setSelectedRegion] = useState<string>('all');
    const [selectedTargetCommunityId, setSelectedTargetCommunityId] = useState<string>('all');
    const [enableRadiusFilter, setEnableRadiusFilter] = useState<boolean>(true); // Default true for precise location filtering
    const [maxDistanceMiles, setMaxDistanceMiles] = useState<number>(25);
    const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'no-leader'>('all');

    // Selection
    const [selectedCommunityId, setSelectedCommunityId] = useState<string | null>(null);
    const [switchingId, setSwitchingId] = useState<string | null>(null);

    // Cascading Handlers
    const handleCountryChange = (country: string) => {
        setSelectedCountry(country);
        setSelectedState('all');
        setSelectedRegion('all');
        setSelectedTargetCommunityId('all');
    };

    const handleStateChange = (state: string) => {
        setSelectedState(state);
        setSelectedRegion('all');
        setSelectedTargetCommunityId('all');
    };

    const handleRegionChange = (region: string) => {
        setSelectedRegion(region);
        setSelectedTargetCommunityId('all');
    };

    const handleTargetCommunityChange = (communityId: string) => {
        setSelectedTargetCommunityId(communityId);
        if (communityId !== 'all') {
            setSelectedCommunityId(communityId);
        }
    };

    // Geocode unmapped communities
    const geocodeUnmappedCommunities = async (commList: PublicCommunityData[]) => {
        const unmapped = commList.filter(c => !c.centroid && c.boundary);
        for (const comm of unmapped.slice(0, 5)) {
            if (comm.boundary) {
                const centroid = getCentroidFromGeoJson(comm.boundary);
                if (centroid) {
                    comm.centroid = centroid;
                    runSaveCommunityCentroid(comm.id, centroid);
                }
            }
        }
    };

    // Fetch Communities and Regional Networks
    useEffect(() => {
        const fetchCommunitiesAndNetworks = async () => {
            setLoading(true);
            const [commRes, regRes] = await Promise.all([
                runGetAllPublicCommunities(),
                runGetAllRegionalNetworks()
            ]);

            if (commRes.success && commRes.communities) {
                setCommunities(commRes.communities);
                geocodeUnmappedCommunities(commRes.communities);
            } else if (commRes.error) {
                toast({ title: "Error", description: commRes.error || "Failed to load communities", variant: "destructive" });
            }

            if (regRes.success && regRes.networks) {
                setRegionalNetworks(regRes.networks);
            }

            setLoading(false);
        };
        fetchCommunitiesAndNetworks();
    }, []);

    const [fetchedUserProfile, setFetchedUserProfile] = useState<any>(null);

    // Fetch logged-in user profile document directly from Firestore
    useEffect(() => {
        if (!db || !user?.uid) return;
        const unsub = onSnapshot(doc(db, "users", user.uid), (snapshot) => {
            if (snapshot.exists()) {
                setFetchedUserProfile(snapshot.data());
            }
        });
        return () => unsub();
    }, [db, user?.uid]);

    // Center Map on User's Registered Home Community
    const setRegisteredCommunityAsCenter = (
        commList: PublicCommunityData[] = communities,
        profileData: any = fetchedUserProfile
    ): boolean => {
        const homeCommId = profileData?.communityId || profileData?.homeCommunityId || (user as any)?.communityId;
        
        let homeComm: PublicCommunityData | undefined = undefined;
        if (homeCommId) {
            homeComm = commList.find(c => c.id === homeCommId);
        }

        if (homeComm) {
            let coords = homeComm.centroid;
            if (!coords && homeComm.boundary) {
                coords = getCentroidFromGeoJson(homeComm.boundary) || undefined;
            }
            if (coords) {
                setUserLocation(coords);
                setLocationLabel(`Registered Community (${homeComm.name})`);
                setSelectedCommunityId(homeComm.id);
                toast({ title: "Registered Community Set", description: `Map centered on your registered home community: ${homeComm.name}` });
                return true;
            }
        } else if (commList.length > 0) {
            // If user has no registered community or not logged in, default to first available community in list
            const defaultComm = commList[0];
            let coords = defaultComm.centroid;
            if (!coords && defaultComm.boundary) {
                coords = getCentroidFromGeoJson(defaultComm.boundary) || undefined;
            }
            if (coords) {
                setUserLocation(coords);
                setLocationLabel(`Overview (${defaultComm.name})`);
                setSelectedCommunityId(defaultComm.id);
                return true;
            }
        }
        return false;
    };

    // Default to user's registered community when communities or user profile loads
    useEffect(() => {
        if (communities.length > 0) {
            setRegisteredCommunityAsCenter(communities, fetchedUserProfile);
        }
    }, [communities, fetchedUserProfile]);

    // Get Live Device GPS / Wi-Fi Geolocation
    const requestGpsLocation = () => {
        if (!navigator.geolocation) {
            toast({ title: "Not Supported", description: "Geolocation is not supported by your browser." });
            return;
        }
        setIsLocating(true);
        navigator.geolocation.getCurrentPosition(
            (pos) => {
                setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
                setLocationLabel('Your Live GPS / Wi-Fi Location');
                setIsLocating(false);
                setLocationDenied(false);
                toast({ title: "Live Location Found", description: "Map centered on your live device location." });
            },
            (err) => {
                console.warn("Geolocation denied or unavailable:", err);
                setIsLocating(false);
                setLocationDenied(true);
                setRegisteredCommunityAsCenter(communities);
            },
            { enableHighAccuracy: true, timeout: 10000 }
        );
    };

    // Handle Manual Location Search (e.g. "London", "Edinburgh", "Manchester")
    const handleManualLocationSearch = async (queryText?: string) => {
        const term = (queryText || customLocationQuery).trim();
        if (!term) return;

        setIsSearchingLocation(true);
        try {
            const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(term + ', UK')}`);
            const data = await response.json();

            if (data && data.length > 0) {
                const lat = parseFloat(data[0].lat);
                const lng = parseFloat(data[0].lon);
                setUserLocation({ lat, lng });
                setLocationLabel(data[0].display_name.split(',')[0] || term);
                setCustomLocationQuery('');
                toast({ title: "Location Set", description: `Map centered on ${data[0].display_name.split(',')[0] || term}` });
            } else {
                toast({ title: "Location Not Found", description: `Could not find "${term}". Please try a town name or postcode.`, variant: "destructive" });
            }
        } catch (error) {
            toast({ title: "Search Error", description: "Failed to search location. Please try again.", variant: "destructive" });
        } finally {
            setIsSearchingLocation(false);
        }
    };



    const [dbCountries, setDbCountries] = useState<{ id: string; name: string }[]>([]);
    const [dbStates, setDbStates] = useState<{ id: string; name: string; parent?: string }[]>([]);
    const [dbRegions, setDbRegions] = useState<{ id: string; name: string; parent?: string }[]>([]);

    // 1. Fetch 250+ Countries from locations collection
    useEffect(() => {
        if (!db) return;
        const q = query(collection(db, "locations"), where("type", "==", "country"));
        const unsub = onSnapshot(q, (snapshot) => {
            const countryList = snapshot.docs.map(doc => ({ id: doc.id, name: (doc.data().name || '').trim() })).sort((a, b) => {
                const popular = ['United Kingdom', 'United States'];
                const aIsPopular = popular.indexOf(a.name);
                const bIsPopular = popular.indexOf(b.name);
                if (aIsPopular > -1 && bIsPopular > -1) return aIsPopular - bIsPopular;
                if (aIsPopular > -1) return -1;
                if (bIsPopular > -1) return 1;
                return a.name.localeCompare(b.name);
            });
            setDbCountries(countryList);
        });
        return () => unsub();
    }, [db]);

    // Selected Country Location Doc
    const selectedCountryDoc = useMemo(() => {
        if (selectedCountry === 'all') return null;
        return dbCountries.find(c => c.name.toLowerCase() === selectedCountry.toLowerCase() || c.id === selectedCountry);
    }, [dbCountries, selectedCountry]);

    // 2. Fetch States/Constituents based on selected Country ID
    useEffect(() => {
        if (!db || !selectedCountryDoc) {
            setDbStates([]);
            return;
        }
        const q = query(collection(db, "locations"), where("type", "==", "state"), where("parent", "==", selectedCountryDoc.id));
        const unsub = onSnapshot(q, (snapshot) => {
            const stateList = snapshot.docs.map(doc => ({ id: doc.id, name: (doc.data().name || '').trim(), parent: doc.data().parent })).sort((a, b) => a.name.localeCompare(b.name));
            setDbStates(stateList);
        });
        return () => unsub();
    }, [db, selectedCountryDoc]);

    // Selected State Location Doc
    const selectedStateDoc = useMemo(() => {
        if (selectedState === 'all') return null;
        return dbStates.find(s => s.name.toLowerCase() === selectedState.toLowerCase() || s.id === selectedState);
    }, [dbStates, selectedState]);

    // 3. Fetch Regions based on selected State ID
    useEffect(() => {
        if (!db || !selectedStateDoc) {
            setDbRegions([]);
            return;
        }
        const q = query(collection(db, "locations"), where("type", "==", "region"), where("parent", "==", selectedStateDoc.id));
        const unsub = onSnapshot(q, (snapshot) => {
            const regionList = snapshot.docs.map(doc => ({ id: doc.id, name: (doc.data().name || '').trim(), parent: doc.data().parent })).sort((a, b) => a.name.localeCompare(b.name));
            setDbRegions(regionList);
        });
        return () => unsub();
    }, [db, selectedStateDoc]);

    // Dynamic Cascading Location Lists
    const availableCountries = useMemo(() => {
        if (dbCountries.length > 0) {
            return dbCountries.map(c => c.name);
        }
        const set = new Set<string>(['United Kingdom', 'United States']);
        communities.forEach(c => {
            if (c.country) set.add(c.country);
        });
        return Array.from(set).sort();
    }, [dbCountries, communities]);

    const availableStates = useMemo(() => {
        if (dbStates.length > 0) {
            return dbStates.map(s => s.name);
        }
        const set = new Set<string>();
        communities.forEach(c => {
            const matchCountry = selectedCountry === 'all' || (c.country && c.country.toLowerCase() === selectedCountry.toLowerCase());
            if (matchCountry && c.state) {
                set.add(c.state);
            }
        });
        return Array.from(set).sort();
    }, [dbStates, communities, selectedCountry]);

    const availableRegions = useMemo(() => {
        if (dbRegions.length > 0) {
            return dbRegions.map(r => r.name);
        }
        const set = new Set<string>();
        communities.forEach(c => {
            const matchCountry = selectedCountry === 'all' || (c.country && c.country.toLowerCase() === selectedCountry.toLowerCase());
            const matchState = selectedState === 'all' || (c.state && c.state.toLowerCase() === selectedState.toLowerCase());
            if (matchCountry && matchState && c.region) {
                set.add(c.region);
            }
        });
        return Array.from(set).sort();
    }, [dbRegions, communities, selectedCountry, selectedState]);

    const availableTargetCommunities = useMemo(() => {
        return communities.filter(c => {
            const matchCountry = selectedCountry === 'all' || (c.country && c.country.toLowerCase() === selectedCountry.toLowerCase());
            const matchState = selectedState === 'all' || (c.state && c.state.toLowerCase() === selectedState.toLowerCase());
            const matchRegion = selectedRegion === 'all' || (c.region && c.region.toLowerCase() === selectedRegion.toLowerCase());
            return matchCountry && matchState && matchRegion;
        }).sort((a, b) => a.name.localeCompare(b.name));
    }, [communities, selectedCountry, selectedState, selectedRegion]);

    // Enhanced Communities with Distance & Centroids
    const processedCommunities = useMemo(() => {
        return communities.map(c => {
            let coords = c.centroid;
            if (!coords && c.boundary) {
                coords = getCentroidFromGeoJson(c.boundary) || undefined;
            }

            let distance: number | undefined = undefined;
            if (userLocation && coords) {
                distance = calculateDistanceMiles(userLocation.lat, userLocation.lng, coords.lat, coords.lng);
            }

            return {
                ...c,
                centroid: coords,
                distance
            };
        });
    }, [communities, userLocation]);

    // Filtered & Sorted Communities
    const filteredCommunities = useMemo(() => {
        return processedCommunities.filter(c => {
            // Country Filter
            if (selectedCountry !== 'all') {
                if (!c.country || c.country.toLowerCase() !== selectedCountry.toLowerCase()) {
                    return false;
                }
            }

            // State / Constituent Filter
            if (selectedState !== 'all') {
                if (!c.state || c.state.toLowerCase() !== selectedState.toLowerCase()) {
                    return false;
                }
            }

            // Region Filter
            if (selectedRegion !== 'all') {
                if (!c.region || c.region.toLowerCase() !== selectedRegion.toLowerCase()) {
                    return false;
                }
            }

            // Target Community Filter
            if (selectedTargetCommunityId !== 'all') {
                if (c.id !== selectedTargetCommunityId) {
                    return false;
                }
            }

            // Text Search
            if (searchQuery.trim()) {
                const q = searchQuery.toLowerCase();
                const matchName = c.name.toLowerCase().includes(q);
                const matchRegion = c.region?.toLowerCase().includes(q);
                const matchState = c.state?.toLowerCase().includes(q);
                if (!matchName && !matchRegion && !matchState) return false;
            }

            // Status Filter
            if (statusFilter === 'active' && (c.leaderCount || 0) === 0 && c.status !== 'active') return false;
            if (statusFilter === 'no-leader' && (c.leaderCount || 0) > 0) return false;

            // Distance Radius Filter
            if (enableRadiusFilter && userLocation) {
                if (c.distance === undefined || c.distance > maxDistanceMiles) {
                    return false;
                }
            }

            return true;
        }).sort((a, b) => {
            if (a.distance !== undefined && b.distance !== undefined) {
                return a.distance - b.distance;
            }
            return a.name.localeCompare(b.name);
        });
    }, [processedCommunities, searchQuery, selectedCountry, selectedState, selectedRegion, selectedTargetCommunityId, statusFilter, enableRadiusFilter, maxDistanceMiles, userLocation]);

    // Switch Community Handler
    const handleSwitchCommunity = async (commId: string, commName: string) => {
        if (!user) {
            router.push('/signup');
            return;
        }
        setSwitchingId(commId);

        if (typeof window !== 'undefined') {
            sessionStorage.setItem('visitedCommunityId', commId);
        }

        const res = await updateUserCommunityAction({ userId: user.uid, communityId: commId });
        setSwitchingId(null);

        if (res.success) {
            toast({ title: "Community Switched!", description: `You are now viewing ${commName}` });
            window.location.href = `/home?community=${commId}`;
        } else {
            toast({ title: "Error", description: res.error || "Failed to switch community", variant: "destructive" });
        }
    };


    // Stats Counters
    const activeCount = useMemo(() => communities.filter(c => c.status === 'active' || (c.leaderCount || 0) > 0).length, [communities]);
    const noLeaderCount = useMemo(() => communities.filter(c => (c.leaderCount || 0) === 0).length, [communities]);

    return (
        <div className="container mx-auto px-4 py-8 space-y-8 max-w-7xl">
            {/* Header Section */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b pb-6">
                <div>
                    <h1 className="text-3xl font-bold font-headline flex items-center gap-2">
                        <Compass className="h-8 w-8 text-primary" />
                        Explore Communities
                    </h1>
                    <p className="text-muted-foreground text-sm mt-1">
                        Find local digital town squares near you, join active communities, or become the leader of your area.
                    </p>
                </div>

                {/* Stats Bar */}
                <div className="flex flex-wrap gap-2 text-xs font-medium">
                    <Badge variant="outline" className="px-3 py-1.5 bg-card">
                        <Building2 className="h-3.5 w-3.5 mr-1.5 text-primary" />
                        {communities.length} Communities
                    </Badge>
                    <Badge variant="outline" className="px-3 py-1.5 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300 border-emerald-200">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 mr-1.5 inline-block"></span>
                        {activeCount} Active
                    </Badge>
                    <Badge variant="outline" className="px-3 py-1.5 bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-300 border-amber-200">
                        <Crown className="h-3.5 w-3.5 mr-1.5 text-amber-500" />
                        {noLeaderCount} Leader Needed
                    </Badge>
                </div>
            </div>

            {/* Filter Toolbar */}
            <Card className="border shadow-sm bg-card/60 backdrop-blur-md">
                <CardContent className="p-4 sm:p-6 space-y-4">
                    {/* Location Control Bar & Search Options */}
                    <div className="p-4 bg-gradient-to-r from-blue-50/80 to-indigo-50/50 dark:from-blue-950/40 dark:to-indigo-950/20 border border-blue-100 dark:border-blue-900/50 rounded-2xl space-y-3">
                        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
                            <div className="flex items-center gap-2">
                                <Navigation className="h-4 w-4 text-blue-600 dark:text-blue-400 shrink-0" />
                                <div>
                                    <span className="text-muted-foreground block text-[11px]">Active Map Center:</span>
                                    <strong className="text-blue-950 dark:text-blue-200 text-sm font-bold">{locationLabel}</strong>
                                </div>
                            </div>

                            {/* Location Source Quick Buttons */}
                            <div className="flex items-center gap-2 w-full sm:w-auto">
                                <Button 
                                    size="sm" 
                                    variant="outline" 
                                    onClick={() => setRegisteredCommunityAsCenter()}
                                    className="h-8 text-xs font-semibold gap-1.5 bg-background shadow-xs hover:bg-emerald-50 hover:text-emerald-700 dark:hover:bg-emerald-950/50 border-emerald-200"
                                    title="Center map on your registered home community"
                                >
                                    <Home className="h-3.5 w-3.5 text-emerald-600" />
                                    <span>Registered Community</span>
                                </Button>

                                <div className="flex items-center gap-1">
                                    <Button 
                                        size="sm" 
                                        variant="outline" 
                                        onClick={requestGpsLocation} 
                                        disabled={isLocating}
                                        className="h-8 text-xs font-semibold gap-1.5 bg-background shadow-xs hover:bg-blue-50 hover:text-blue-700 dark:hover:bg-blue-950/50"
                                        title="Use live device GPS or Wi-Fi triangulation"
                                    >
                                        {isLocating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <LocateFixed className="h-3.5 w-3.5 text-blue-600" />}
                                        <span>Live GPS / Wi-Fi</span>
                                    </Button>

                                    <TooltipProvider>
                                        <Tooltip>
                                            <TooltipTrigger asChild>
                                                <button type="button" className="text-amber-600 dark:text-amber-400 hover:text-amber-700 p-1 transition-colors rounded-full hover:bg-amber-100/50 dark:hover:bg-amber-950/50" aria-label="Wi-Fi accuracy information">
                                                    <AlertCircle className="h-4 w-4" />
                                                </button>
                                            </TooltipTrigger>
                                            <TooltipContent className="max-w-xs text-xs p-3 space-y-1.5 bg-slate-900 text-slate-100 border-slate-700 shadow-xl">
                                                <p className="font-bold text-amber-300 flex items-center gap-1.5">
                                                    <AlertCircle className="h-3.5 w-3.5" />
                                                    Wi-Fi Location Accuracy Note
                                                </p>
                                                <p className="leading-relaxed">
                                                    Wi-Fi connections rely on internet provider IP routing, which can place your location at a regional data hub <strong>hundreds of miles away</strong> (e.g. Blackpool instead of Scotland).
                                                </p>
                                                <p className="text-[11px] text-slate-300 pt-1.5 border-t border-slate-800">
                                                    For exact results on desktop/Wi-Fi, please type your town or postcode below.
                                                </p>
                                            </TooltipContent>
                                        </Tooltip>
                                    </TooltipProvider>
                                </div>
                            </div>
                        </div>

                        {/* Address / Postcode / Town Input Search */}
                        <div className="flex items-center gap-2 pt-1 border-t border-blue-100/80 dark:border-blue-900/40">
                            <div className="relative flex-1">
                                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                                <Input
                                    placeholder="Search by address, postcode, or town (e.g. London, Edinburgh)..."
                                    value={customLocationQuery}
                                    onChange={(e) => setCustomLocationQuery(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && handleManualLocationSearch()}
                                    className="h-8 text-xs pl-8 bg-background"
                                />
                            </div>
                            <Button 
                                size="sm" 
                                variant="default"
                                onClick={() => handleManualLocationSearch()}
                                disabled={isSearchingLocation || !customLocationQuery.trim()}
                                className="h-8 text-xs font-semibold shrink-0"
                            >
                                {isSearchingLocation ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Search Address / Postcode"}
                            </Button>
                        </div>

                        {/* Wi-Fi vs Mobile GPS Accuracy Notice Banner */}
                        <div className="flex items-start gap-2 p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-[11px] text-amber-800 dark:text-amber-300 leading-normal">
                            <AlertCircle className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                            <span>
                                <strong>Wi-Fi Accuracy Notice:</strong> Wi-Fi geolocation uses your ISP's internet routing hub (which can place you 100s of miles away, e.g. Blackpool). For exact location, use mobile device GPS or type your town/postcode above.
                            </span>
                        </div>

                    </div>

                    {/* Cascading Location Filter Toolbar (Country -> Constituent -> Region -> Community) */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
                        {/* 1. Country Select */}
                        <div>
                            <Label className="text-[11px] font-medium text-muted-foreground mb-1 block">Country</Label>
                            <Select value={selectedCountry} onValueChange={handleCountryChange}>
                                <SelectTrigger className="h-9 text-xs">
                                    <SelectValue placeholder="All Countries" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Countries</SelectItem>
                                    {availableCountries.map(c => (
                                        <SelectItem key={c} value={c}>{c}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        {/* 2. Constituent / State Select */}
                        <div>
                            <Label className="text-[11px] font-medium text-muted-foreground mb-1 block">
                                {selectedCountry === 'United Kingdom' ? 'Constituent' : selectedCountry === 'United States' ? 'State' : 'State / Constituent'}
                            </Label>
                            <Select value={selectedState} onValueChange={handleStateChange}>
                                <SelectTrigger className="h-9 text-xs">
                                    <SelectValue placeholder="All Constituents" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All {selectedCountry === 'United Kingdom' ? 'Constituents' : 'States'}</SelectItem>
                                    {availableStates.map(st => (
                                        <SelectItem key={st} value={st}>{st}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        {/* 3. Region Select */}
                        <div>
                            <Label className="text-[11px] font-medium text-muted-foreground mb-1 block">Region</Label>
                            <Select value={selectedRegion} onValueChange={handleRegionChange}>
                                <SelectTrigger className="h-9 text-xs">
                                    <SelectValue placeholder="All Regions" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Regions</SelectItem>
                                    {availableRegions.map(reg => (
                                        <SelectItem key={reg} value={reg}>{reg}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        {/* 4. Specific Community Select */}
                        <div>
                            <Label className="text-[11px] font-medium text-muted-foreground mb-1 block">Community</Label>
                            <Select value={selectedTargetCommunityId} onValueChange={handleTargetCommunityChange}>
                                <SelectTrigger className="h-9 text-xs">
                                    <SelectValue placeholder="All Communities" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Communities</SelectItem>
                                    {availableTargetCommunities.map(comm => (
                                        <SelectItem key={comm.id} value={comm.id}>{comm.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        {/* 5. Status Filter */}
                        <div>
                            <Label className="text-[11px] font-medium text-muted-foreground mb-1 block">Leader Status</Label>
                            <Select value={statusFilter} onValueChange={(val: any) => setStatusFilter(val)}>
                                <SelectTrigger className="h-9 text-xs">
                                    <SelectValue placeholder="All Statuses" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Statuses</SelectItem>
                                    <SelectItem value="active">Active Only</SelectItem>
                                    <SelectItem value="no-leader">Leader Role Available</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    {/* Optional Radius Slider Toggle */}
                    <div className="pt-2 border-t flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-sm">
                        <div className="flex items-center space-x-2">
                            <Checkbox 
                                id="radius-filter" 
                                checked={enableRadiusFilter} 
                                onCheckedChange={(checked) => setEnableRadiusFilter(!!checked)} 
                            />
                            <Label htmlFor="radius-filter" className="text-xs cursor-pointer font-medium">
                                Filter list by distance radius from {locationLabel.split(',')[0]}
                            </Label>
                        </div>

                        {enableRadiusFilter && (
                            <div className="flex items-center gap-3 w-full sm:w-auto">
                                <span className="text-xs text-muted-foreground whitespace-nowrap">
                                    Radius: <strong>{maxDistanceMiles} miles</strong>
                                </span>
                                <div className="w-full sm:w-48">
                                    <Slider
                                        value={[maxDistanceMiles]}
                                        min={5}
                                        max={60}
                                        step={5}
                                        onValueChange={(val) => setMaxDistanceMiles(val[0])}
                                    />
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Map Layer Overlay Checkbox Toggles */}
                    <div className="pt-3 border-t flex flex-wrap items-center justify-between gap-4 text-xs">
                        <div className="flex flex-wrap items-center gap-6">
                            <span className="font-semibold text-muted-foreground uppercase text-[10px] tracking-wider">Map Layer Filters:</span>
                            
                            <div className="flex items-center space-x-2">
                                <Checkbox 
                                    id="show-community-layers" 
                                    checked={showCommunityBoundaries} 
                                    onCheckedChange={(checked) => setShowCommunityBoundaries(!!checked)} 
                                />
                                <Label htmlFor="show-community-layers" className="text-xs cursor-pointer font-medium flex items-center gap-1.5">
                                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block"></span>
                                    <span>Community Hubs & Boundaries</span>
                                </Label>
                            </div>

                            <div className="flex items-center space-x-2">
                                <Checkbox 
                                    id="show-regional-layers" 
                                    checked={showRegionalNetworks} 
                                    onCheckedChange={(checked) => setShowRegionalNetworks(!!checked)} 
                                />
                                <Label htmlFor="show-regional-layers" className="text-xs cursor-pointer font-medium flex items-center gap-1.5 text-indigo-700 dark:text-indigo-300">
                                    <span className="w-3 h-2 rounded-xs border border-indigo-500 bg-indigo-500/30 inline-block"></span>
                                    <span>Regional Networks ({regionalNetworks.length})</span>
                                </Label>
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Main Interactive Grid Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                {/* Interactive Leaflet Map Column */}
                <div className="lg:col-span-7 xl:col-span-8">
                    <CommunitiesMapView
                        communities={filteredCommunities}
                        allCommunities={processedCommunities}
                        regionalNetworks={regionalNetworks}
                        showCommunityBoundaries={showCommunityBoundaries}
                        showRegionalNetworks={showRegionalNetworks}
                        userLocation={userLocation}
                        selectedCommunityId={selectedCommunityId}
                        onSelectCommunity={(id) => setSelectedCommunityId(id)}
                        onRequestGpsLocation={requestGpsLocation}
                        isLocating={isLocating}
                    />
                </div>


                {/* Search Results List Column */}
                <div className="lg:col-span-5 xl:col-span-4 space-y-4">
                    <div className="flex items-center justify-between">
                        <h2 className="text-lg font-bold font-headline">
                            Matching Communities ({filteredCommunities.length})
                        </h2>
                        {userLocation && (
                            <span className="text-xs text-muted-foreground">Sorted by distance</span>
                        )}
                    </div>

                    {loading ? (
                        <div className="flex flex-col items-center justify-center p-12 space-y-3">
                            <Loader2 className="h-8 w-8 animate-spin text-primary" />
                            <p className="text-sm text-muted-foreground">Loading communities...</p>
                        </div>
                    ) : filteredCommunities.length === 0 ? (
                        <Card className="text-center p-8">
                            <CardContent className="space-y-3 pt-6">
                                <Building2 className="h-10 w-10 text-muted-foreground mx-auto" />
                                <h3 className="font-semibold text-lg">No Communities Found</h3>
                                <p className="text-sm text-muted-foreground">
                                    Try expanding your search radius or clearing your region filter.
                                </p>
                                <Button 
                                    variant="outline" 
                                    size="sm" 
                                    onClick={() => {
                                        setSearchQuery('');
                                        setSelectedRegion('all');
                                        setStatusFilter('all');
                                        setMaxDistanceMiles(60);
                                    }}
                                >
                                    Reset Filters
                                </Button>
                            </CardContent>
                        </Card>
                    ) : (
                        <div className="space-y-3 max-h-[600px] overflow-y-auto pr-1">
                            {filteredCommunities.map(comm => {
                                const isActive = comm.status === 'active' || (comm.leaderCount || 0) > 0;
                                const isSelected = selectedCommunityId === comm.id;

                                return (
                                    <Card 
                                        key={comm.id} 
                                        className={`transition-all duration-200 cursor-pointer hover:border-primary/50 ${isSelected ? 'border-primary bg-primary/5 ring-1 ring-primary' : 'bg-card'}`}
                                        onClick={() => setSelectedCommunityId(comm.id)}
                                    >
                                        <CardContent className="p-4 space-y-3">
                                            <div className="flex items-start justify-between gap-2">
                                                <div>
                                                    <h3 className="font-bold text-base hover:text-primary flex items-center gap-1.5">
                                                        {comm.name}
                                                    </h3>
                                                    <p className="text-xs text-muted-foreground">
                                                        {[comm.region, comm.state].filter(Boolean).join(', ')}
                                                    </p>
                                                </div>
                                                <Badge variant={isActive ? "default" : "secondary"} className={isActive ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300" : "bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300"}>
                                                    {isActive ? 'Active' : 'Leader Needed'}
                                                </Badge>
                                            </div>

                                            <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground pt-1 border-t">
                                                <span className="flex items-center gap-1">
                                                    <Users className="h-3.5 w-3.5 text-primary" />
                                                    <strong>{comm.memberCount || 0}</strong> Members
                                                </span>
                                                <span className="flex items-center gap-1">
                                                    <Crown className="h-3.5 w-3.5 text-amber-500" />
                                                    <strong>{comm.leaderCount || 0}</strong> Leaders
                                                </span>
                                                {comm.distance !== undefined && (
                                                    <span className="flex items-center gap-1 text-blue-600 dark:text-blue-400 font-semibold ml-auto">
                                                        <MapPin className="h-3.5 w-3.5" />
                                                        {comm.distance} mi
                                                    </span>
                                                )}
                                            </div>

                                            <div className="flex items-center gap-2 pt-2">
                                                <Button 
                                                    size="sm" 
                                                    className="w-full text-xs font-semibold" 
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleSwitchCommunity(comm.id, comm.name);
                                                    }}
                                                    disabled={switchingId === comm.id}
                                                >
                                                    {switchingId === comm.id ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : <ExternalLink className="h-3.5 w-3.5 mr-1" />}
                                                    Visit Community Hub
                                                </Button>

                                                {(comm.leaderCount || 0) === 0 && (
                                                    <Button 
                                                        size="sm" 
                                                        variant="outline"
                                                        className="w-full text-xs border-amber-300 text-amber-700 hover:bg-amber-50 dark:text-amber-300 dark:hover:bg-amber-950/50"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            router.push('/signup/leader');
                                                        }}
                                                    >
                                                        <Crown className="h-3.5 w-3.5 mr-1 text-amber-500" />
                                                        Become Leader
                                                    </Button>
                                                )}
                                            </div>
                                        </CardContent>
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
