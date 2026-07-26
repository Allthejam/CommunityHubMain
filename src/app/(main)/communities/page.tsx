'use client';

import React, { useState, useEffect, useMemo } from 'react';
import dynamic from 'next/dynamic';
import { 
    runGetAllPublicCommunities, 
    PublicCommunityData, 
    runSaveCommunityCentroid 
} from '@/lib/actions/communityActions';
import { calculateDistanceMiles, getCentroidFromGeoJson } from '@/components/communities-map-view';
import { updateUserCommunityAction } from '@/lib/actions/userActions';
import { useUser } from '@/firebase';
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
    Home
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

    const [communities, setCommunities] = useState<PublicCommunityData[]>([]);
    const [loading, setLoading] = useState(true);

    // GPS & Manual Location State
    const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
    const [locationLabel, setLocationLabel] = useState<string>('United Kingdom (National Overview)');
    const [customLocationQuery, setCustomLocationQuery] = useState('');
    const [isLocating, setIsLocating] = useState(false);
    const [isSearchingLocation, setIsSearchingLocation] = useState(false);
    const [locationDenied, setLocationDenied] = useState(false);

    // Filters
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedCountry, setSelectedCountry] = useState<string>('United Kingdom');
    const [selectedRegion, setSelectedRegion] = useState<string>('all');
    const [enableRadiusFilter, setEnableRadiusFilter] = useState<boolean>(true); // Default true for precise location filtering
    const [maxDistanceMiles, setMaxDistanceMiles] = useState<number>(25);
    const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'no-leader'>('all');

    // Selection
    const [selectedCommunityId, setSelectedCommunityId] = useState<string | null>(null);
    const [switchingId, setSwitchingId] = useState<string | null>(null);

    // Fetch Communities
    useEffect(() => {
        const fetchCommunities = async () => {
            setLoading(true);
            const res = await runGetAllPublicCommunities();
            if (res.success && res.communities) {
                setCommunities(res.communities);

                // Asynchronously geocode top unmapped communities using Nominatim & save centroids
                geocodeUnmappedCommunities(res.communities);
            } else {
                toast({ title: "Error", description: res.error || "Failed to load communities", variant: "destructive" });
            }
            setLoading(false);
        };
        fetchCommunities();
    }, []);

    // Center Map on User's Registered Home Community
    const setRegisteredCommunityAsCenter = (commList: PublicCommunityData[] = communities): boolean => {
        const homeCommId = (userProfile as any)?.homeCommunityId || (userProfile as any)?.communityId || (user as any)?.homeCommunityId;
        
        let homeComm: PublicCommunityData | undefined = undefined;
        if (homeCommId) {
            homeComm = commList.find(c => c.id === homeCommId);
        }
        
        // Fallback to Grantown on Spey or Carrbridge if home community is not found by ID
        if (!homeComm) {
            homeComm = commList.find(c => c.name.toLowerCase().includes('grantown') || c.name.toLowerCase().includes('carrbridge'));
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
        }
        return false;
    };

    // Default to user's registered community when communities or userProfile load
    useEffect(() => {
        if (communities.length > 0) {
            setRegisteredCommunityAsCenter(communities);
        }
    }, [communities, userProfile]);

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

    // Handle Manual Location Search (e.g. "Grantown on Spey", "Aviemore", "Blackpool", "Edinburgh")
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

    // Nominatim Lazy Geocoding Background Helper
    const geocodeUnmappedCommunities = async (commList: PublicCommunityData[]) => {
        const unmapped = commList.filter(c => !c.centroid && !c.boundary).slice(0, 15);
        for (const comm of unmapped) {
            const queryStr = [comm.name, comm.region, comm.state, comm.country].filter(Boolean).join(', ');
            try {
                const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(queryStr)}`);
                const data = await response.json();
                if (data && data.length > 0) {
                    const lat = parseFloat(data[0].lat);
                    const lng = parseFloat(data[0].lon);
                    const centroid = { lat, lng };

                    setCommunities(prev => prev.map(c => c.id === comm.id ? { ...c, centroid } : c));
                    runSaveCommunityCentroid(comm.id, centroid);
                }
            } catch (err) {
                // Ignore rate limit or network errors silently
            }
            await new Promise(r => setTimeout(r, 600)); // Respect Nominatim rate limit (1 req per sec)
        }
    };

    // Unique Regions List
    const availableRegions = useMemo(() => {
        const regions = new Set<string>();
        communities.forEach(c => {
            if (c.region) regions.add(c.region);
        });
        return Array.from(regions).sort();
    }, [communities]);

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
                if (c.country && c.country.toLowerCase() !== selectedCountry.toLowerCase()) {
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

            // Region Filter
            if (selectedRegion !== 'all' && c.region !== selectedRegion) {
                return false;
            }

            // Status Filter
            if (statusFilter === 'active' && (c.leaderCount || 0) === 0 && c.status !== 'active') return false;
            if (statusFilter === 'no-leader' && (c.leaderCount || 0) > 0) return false;

            // Distance Radius Filter
            if (enableRadiusFilter && userLocation) {
                // If community has no position or exceeds max distance, exclude it from radius search
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
    }, [processedCommunities, searchQuery, selectedCountry, selectedRegion, statusFilter, enableRadiusFilter, maxDistanceMiles, userLocation]);

    // Switch Community Handler
    const handleSwitchCommunity = async (commId: string, commName: string) => {
        if (!user) {
            router.push('/signup');
            return;
        }
        setSwitchingId(commId);
        const res = await updateUserCommunityAction({ userId: user.uid, communityId: commId });
        setSwitchingId(null);

        if (res.success) {
            toast({ title: "Community Switched!", description: `You are now viewing ${commName}` });
            window.location.href = '/home';
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
                            </div>
                        </div>

                        {/* Address / Postcode / Town Input Search */}
                        <div className="flex items-center gap-2 pt-1 border-t border-blue-100/80 dark:border-blue-900/40">
                            <div className="relative flex-1">
                                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                                <Input
                                    placeholder="Search by address, UK postcode, or town (e.g. PH26 3HG, Grantown-on-Spey)..."
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
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        {/* Text Search */}
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Search by community name or region..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="pl-9"
                            />
                        </div>

                        {/* Country Select */}
                        <div>
                            <Select value={selectedCountry} onValueChange={setSelectedCountry}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Country" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="United Kingdom">United Kingdom</SelectItem>
                                    <SelectItem value="United States">United States</SelectItem>
                                    <SelectItem value="all">All Countries</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Region Select */}
                        <div>
                            <Select value={selectedRegion} onValueChange={setSelectedRegion}>
                                <SelectTrigger>
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

                        {/* Status Filter */}
                        <div>
                            <Select value={statusFilter} onValueChange={(val: any) => setStatusFilter(val)}>
                                <SelectTrigger>
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
                </CardContent>
            </Card>

            {/* Main Interactive Grid Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                {/* Interactive Leaflet Map Column */}
                <div className="lg:col-span-7 xl:col-span-8">
                    <CommunitiesMapView
                        communities={filteredCommunities}
                        allCommunities={processedCommunities}
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
