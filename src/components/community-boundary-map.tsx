

'use client';

import * as React from 'react';
import { useUser, useFirestore, useDoc, useMemoFirebase } from "@/firebase";
import { doc, getDoc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { runSaveCommunityBoundary, runCheckBoundaryOverlap, runGetAllBoundaries, runCreateDisputeFromOverlap } from '@/lib/actions/communityActions';
import { cn } from "@/lib/utils";
import Link from 'next/link';

import { Loader2, Search, AlertTriangle, Flag, Info, Check, Sparkles, Lock, Unlock, Maximize2, Minimize2, Expand, Shrink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from './ui/input';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger, DialogClose } from './ui/dialog';

// Import Leaflet and Leaflet Draw CSS
import 'leaflet/dist/leaflet.css';
import 'leaflet-draw/dist/leaflet.draw.css';

// Type imports only, to avoid server-side issues
import type { Map, FeatureGroup, Control as LeafletControl } from 'leaflet'; 

interface CommunityBoundaryMapProps {
    disabled?: boolean;
    aspectRatio?: 'default' | 'square' | 'large';
    height?: string;
    initialBoundaryData?: string | null;
    initialIsLocked?: boolean;
    onLockChange?: (isLocked: boolean, boundaryGeoJson?: string | null) => void;
    showPresets?: boolean;
}

const CommunityBoundaryMap: React.FC<CommunityBoundaryMapProps> = ({ 
    disabled = false,
    aspectRatio = 'default',
    height,
    initialBoundaryData = null,
    initialIsLocked = false,
    onLockChange,
    showPresets = false
}) => {
    const mapContainerRef = React.useRef<HTMLDivElement>(null);
    const mapInstanceRef = React.useRef<Map | null>(null);
    const drawnItemsRef = React.useRef<FeatureGroup | null>(null);
    const overlapLayerRef = React.useRef<FeatureGroup | null>(null);
    const allBoundariesLayerRef = React.useRef<FeatureGroup | null>(null);
    const drawControlRef = React.useRef<LeafletControl.Draw | null>(null);

    const [address, setAddress] = React.useState('');
    const [isSearching, setIsSearching] = React.useState(false);
    const [boundaryData, setBoundaryData] = React.useState<string | null>(initialBoundaryData);
    const [isSaving, setIsSaving] = React.useState(false);
    const [isChecking, setIsChecking] = React.useState(false);
    const [overlapResult, setOverlapResult] = React.useState<{ overlaps: boolean; reason: string; conflictingCommunityId?: string; conflictingCommunityName?: string; conflictingCommunityGeoJson?: string; } | null>(null);
    const [acknowledgeOverlap, setAcknowledgeOverlap] = React.useState(false);
    const [isBoundaryModified, setIsBoundaryModified] = React.useState(false);
    const [isFetchingAll, setIsFetchingAll] = React.useState(false);
    const [isMapReady, setIsMapReady] = React.useState(false);
    const [isLocked, setIsLocked] = React.useState<boolean>(initialIsLocked);
    const [isFullscreen, setIsFullscreen] = React.useState(false);
    const [isTallMode, setIsTallMode] = React.useState(false);

    // Sync initial props if loaded asynchronously from Firestore
    React.useEffect(() => {
        if (initialBoundaryData && !boundaryData) {
            setBoundaryData(initialBoundaryData);
        }
    }, [initialBoundaryData, boundaryData]);

    React.useEffect(() => {
        if (initialIsLocked !== undefined) {
            setIsLocked(initialIsLocked);
        }
    }, [initialIsLocked]);

    // Handle Escape key to exit fullscreen
    React.useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && isFullscreen) {
                setIsFullscreen(false);
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isFullscreen]);

    // Invalidate Leaflet map size on fullscreen or height toggle
    React.useEffect(() => {
        const timer = setTimeout(() => {
            if (mapInstanceRef.current) {
                mapInstanceRef.current.invalidateSize();
            }
        }, 180);
        return () => clearTimeout(timer);
    }, [isFullscreen, isTallMode]);

    const { user } = useUser();
    const db = useFirestore();
    const { toast } = useToast();
    const userProfileRef = useMemoFirebase(() => (user ? doc(db, 'users', user.uid) : null), [user, db]);
    const { data: userProfile } = useDoc(userProfileRef);
    const communityId = (userProfile as any)?.impersonating?.communityId || userProfile?.communityId;
    
    const communityRef = useMemoFirebase(() => (communityId ? doc(db, 'communities', communityId) : null), [communityId, db]);
    const { data: communityData } = useDoc(communityRef);

    // Default GeoJSON polygon for regional boundary (Grantown-on-Spey, Blair Atholl, Ballater, Monadhliath)
    const defaultRegionalGeoJson = React.useMemo(() => ({
        "type": "Feature",
        "properties": { "name": "Cairngorms Regional Boundary" },
        "geometry": {
            "type": "Polygon",
            "coordinates": [[
                [-3.610, 57.332],
                [-3.041, 57.049],
                [-3.856, 56.764],
                [-4.100, 57.100],
                [-3.610, 57.332]
            ]]
        }
    }), []);

    // Fetch initial boundary data
    React.useEffect(() => {
        if (!communityId || !db) return;
        const fetchBoundary = async () => {
            const communityRef = doc(db, 'communities', communityId);
            const docSnap = await getDoc(communityRef);
            if (docSnap.exists() && docSnap.data().boundary) {
                setBoundaryData(docSnap.data().boundary);
            }
        };
        fetchBoundary();
    }, [communityId, db]);
    
    // Main map initialization effect
    React.useEffect(() => {
        if (typeof window === 'undefined' || !mapContainerRef.current) return;
        if (mapInstanceRef.current) return;

        let map: Map;

        const initMap = async () => {
            try {
                const L = await import('leaflet');
                await import('leaflet-draw');
                if (mapContainerRef.current && !(mapContainerRef.current as any)._leaflet_id) {
                    // Set default view to Highlands / Cairngorms region [57.15, -3.75] zoom 8
                    map = L.map(mapContainerRef.current).setView([57.15, -3.75], 8);
                    mapInstanceRef.current = map;
                    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
                        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
                    }).addTo(map);

                    // Initialize feature groups ONCE on map instance
                    if (!drawnItemsRef.current) drawnItemsRef.current = new L.FeatureGroup().addTo(map);
                    if (!overlapLayerRef.current) overlapLayerRef.current = new L.FeatureGroup().addTo(map);
                    if (!allBoundariesLayerRef.current) allBoundariesLayerRef.current = new L.FeatureGroup().addTo(map);

                    // Multiple size invalidations to ensure full container tile fill
                    setTimeout(() => map.invalidateSize(), 100);
                    setTimeout(() => map.invalidateSize(), 350);
                    setTimeout(() => map.invalidateSize(), 800);

                    // Observe container resizes (e.g. layout updates, mobile to desktop switch)
                    if (typeof window !== 'undefined' && 'ResizeObserver' in window && mapContainerRef.current) {
                        const ro = new ResizeObserver(() => {
                            if (mapInstanceRef.current) {
                                mapInstanceRef.current.invalidateSize();
                            }
                        });
                        ro.observe(mapContainerRef.current);
                    }

                    setIsMapReady(true);
                }
            } catch (error) {
                console.error("Failed to load Leaflet modules:", error);
                toast({ variant: 'destructive', title: 'Map Error', description: 'Could not load map components.' });
            }
        };

        initMap();

        return () => {
            if (mapInstanceRef.current) {
                mapInstanceRef.current.remove();
                mapInstanceRef.current = null;
                drawnItemsRef.current = null;
                overlapLayerRef.current = null;
                allBoundariesLayerRef.current = null;
                drawControlRef.current = null;
                setIsMapReady(false);
            }
        };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Effect to add layers and controls once the map is ready
    React.useEffect(() => {
        const map = mapInstanceRef.current;
        if (!isMapReady || !map || !drawnItemsRef.current) return;

        const L = (window as any).L;
        if (!L) return;

        // Clear existing layers to prevent duplicated/overlapping ghost layers
        drawnItemsRef.current.clearLayers();

        const isRegional = (userProfile as any)?.accountType === 'regional' || (userProfile as any)?.permissions?.isRegionalNetwork;
        const targetGeoJson = boundaryData ? JSON.parse(boundaryData) : (isRegional ? defaultRegionalGeoJson : null);

        if (targetGeoJson) {
            try {
                // Convert GeoJSON geometry to native Leaflet Polygon so Leaflet.draw vertex editing works flawlessly without crashing
                const parseRing = (ring: any[]): [number, number][] => ring.map((pt: any) => [pt[1], pt[0]]);
                const geom = targetGeoJson.geometry || targetGeoJson;
                
                if (geom && geom.coordinates) {
                    let polygonLayer: any = null;
                    if (geom.type === 'Polygon') {
                        const latLngs = parseRing(geom.coordinates[0]);
                        polygonLayer = L.polygon(latLngs, { color: '#10b981', weight: 3, fillColor: '#10b981', fillOpacity: 0.2 });
                    } else if (geom.type === 'MultiPolygon') {
                        const multiLatLngs = geom.coordinates.map((poly: any[]) => parseRing(poly[0]));
                        polygonLayer = L.polygon(multiLatLngs, { color: '#10b981', weight: 3, fillColor: '#10b981', fillOpacity: 0.2 });
                    }

                    if (polygonLayer) {
                        drawnItemsRef.current.addLayer(polygonLayer);
                    } else {
                        L.geoJSON(targetGeoJson, {
                            style: { color: '#10b981', weight: 3, fillColor: '#10b981', fillOpacity: 0.2 }
                        }).eachLayer((layer: any) => drawnItemsRef.current?.addLayer(layer));
                    }
                }

                if (drawnItemsRef.current.getLayers().length > 0) {
                    const bounds = drawnItemsRef.current.getBounds();
                    if (bounds.isValid()) {
                        map.fitBounds(bounds, { padding: [30, 30] });
                    }
                }
            } catch (e) { console.error("Error loading initial boundary data:", e); }
        }

        if (!disabled) {
            if (drawControlRef.current) {
                map.removeControl(drawControlRef.current);
                drawControlRef.current = null;
            }

            drawControlRef.current = new L.Control.Draw({
                edit: { featureGroup: drawnItemsRef.current },
                draw: {
                    polygon: { allowIntersection: false, shapeOptions: { color: '#10b981' } },
                    rectangle: true, circle: true, polyline: false, marker: false, circlemarker: false,
                },
            });
            map.addControl(drawControlRef.current);
        }
        
        const onDrawCreated = (e: any) => {
            drawnItemsRef.current?.clearLayers();
            drawnItemsRef.current?.addLayer(e.layer);
            const geoJsonStr = JSON.stringify(e.layer.toGeoJSON());
            setBoundaryData(geoJsonStr);
            setIsBoundaryModified(true);
            setOverlapResult(null);
            setAcknowledgeOverlap(false);
            overlapLayerRef.current?.clearLayers();
            if (onLockChange) {
                onLockChange(isLocked, geoJsonStr);
            }
        };
        
        const onDrawEdited = (e: any) => {
            e.layers.eachLayer((layer: any) => {
                if (layer.toGeoJSON) {
                    const geoJsonStr = JSON.stringify(layer.toGeoJSON());
                    setBoundaryData(geoJsonStr);
                    setIsBoundaryModified(true);
                    setOverlapResult(null);
                    setAcknowledgeOverlap(false);
                    if (onLockChange) {
                        onLockChange(isLocked, geoJsonStr);
                    }
                }
            });
            overlapLayerRef.current?.clearLayers();
        };

        const onDrawDeleted = () => {
            setBoundaryData(null);
            setIsBoundaryModified(true);
            setOverlapResult(null);
            setAcknowledgeOverlap(false);
            overlapLayerRef.current?.clearLayers();
        };

        map.on(L.Draw.Event.CREATED, onDrawCreated);
        map.on(L.Draw.Event.EDITED, onDrawEdited);
        map.on(L.Draw.Event.DELETED, onDrawDeleted);

        return () => {
            map.off(L.Draw.Event.CREATED, onDrawCreated);
            map.off(L.Draw.Event.EDITED, onDrawEdited);
            map.off(L.Draw.Event.DELETED, onDrawDeleted);
            if (drawControlRef.current) {
                map.removeControl(drawControlRef.current);
                drawControlRef.current = null;
            }
        };
    }, [isMapReady, disabled, boundaryData]);


    // High-resolution official OpenStreetMap administrative relation mappings for Scottish Authorities
    const SCOTTISH_REGION_RELATIONS: Record<string, { osmId: string; name: string; searchFallback: string }> = React.useMemo(() => ({
        highland: { osmId: 'R1765851', name: 'Highland Council Area', searchFallback: 'Highland, Scotland' },
        highlands: { osmId: 'R1765851', name: 'Highland Council Area', searchFallback: 'Highland, Scotland' },
        moray: { osmId: 'R1765853', name: 'Moray Council Area', searchFallback: 'Moray, Scotland' },
        morayshire: { osmId: 'R1765853', name: 'Moray Council Area', searchFallback: 'Moray, Scotland' },
        cairngorm: { osmId: 'R9363842', name: 'Cairngorms National Park', searchFallback: 'Cairngorms National Park' },
        cairngorms: { osmId: 'R9363842', name: 'Cairngorms National Park', searchFallback: 'Cairngorms National Park' },
        aberdeenshire: { osmId: 'R1765850', name: 'Aberdeenshire Council Area', searchFallback: 'Aberdeenshire, Scotland' },
        perth: { osmId: 'R1765852', name: 'Perth and Kinross Council Area', searchFallback: 'Perth and Kinross, Scotland' },
        kinross: { osmId: 'R1765852', name: 'Perth and Kinross Council Area', searchFallback: 'Perth and Kinross, Scotland' },
    }), []);

    const handleSearch = async (e?: React.FormEvent, customQuery?: string) => {
        if (e) e.preventDefault();
        const rawQueryText = customQuery || address;
        if (!rawQueryText || !mapInstanceRef.current) return;
        
        if (customQuery) setAddress(customQuery);
        setIsSearching(true);

        const lowerText = rawQueryText.toLowerCase();
        const matchedKey = Object.keys(SCOTTISH_REGION_RELATIONS).find(k => lowerText.includes(k));
        const relInfo = matchedKey ? SCOTTISH_REGION_RELATIONS[matchedKey] : null;

        try {
            let item: any = null;

            // Priority 1: Direct OpenStreetMap Relation ID Lookup for detailed high-res region MultiPolygons
            if (relInfo) {
                try {
                    const lookupResp = await fetch(`https://nominatim.openstreetmap.org/lookup?osm_ids=${relInfo.osmId}&format=json&polygon_geojson=1`);
                    const lookupData = await lookupResp.json();
                    if (lookupData && lookupData.length > 0 && lookupData[0].geojson) {
                        item = lookupData[0];
                    }
                } catch (err) {
                    console.warn("Direct relation lookup failed, falling back to search", err);
                }
            }

            // Priority 2: Strict Administrative Relation Search in GB (osm_type=R)
            if (!item) {
                const searchTerm = relInfo ? relInfo.searchFallback : `${rawQueryText}, Scotland, UK`;
                const searchResp = await fetch(`https://nominatim.openstreetmap.org/search?format=json&polygon_geojson=1&countrycodes=gb&osm_type=R&q=${encodeURIComponent(searchTerm)}`);
                const searchData = await searchResp.json();
                if (searchData && searchData.length > 0) {
                    item = searchData.find((d: any) => d.geojson && (d.geojson.type === 'Polygon' || d.geojson.type === 'MultiPolygon')) || searchData[0];
                }
            }

            // Priority 3: Fallback general search
            if (!item) {
                const searchResp = await fetch(`https://nominatim.openstreetmap.org/search?format=json&polygon_geojson=1&countrycodes=gb&q=${encodeURIComponent(rawQueryText)}`);
                const searchData = await searchResp.json();
                if (searchData && searchData.length > 0) {
                    item = searchData[0];
                }
            }

            // Render high-res detailed MultiPolygon onto Leaflet map
            if (item && item.geojson && (item.geojson.type === 'Polygon' || item.geojson.type === 'MultiPolygon')) {
                const L = (window as any).L;
                if (L && drawnItemsRef.current) {
                    drawnItemsRef.current.clearLayers();
                    const layer = L.geoJSON(item.geojson, {
                        style: {
                            color: '#10b981',
                            weight: 3,
                            fillColor: '#10b981',
                            fillOpacity: 0.25
                        }
                    });
                    drawnItemsRef.current.addLayer(layer);
                    setBoundaryData(JSON.stringify(item.geojson));
                    setIsBoundaryModified(true);
                    setOverlapResult(null);

                    const bounds = layer.getBounds();
                    if (bounds && bounds.isValid()) {
                        mapInstanceRef.current?.fitBounds(bounds, { padding: [30, 30] });
                    }
                    toast({
                        title: "Detailed Regional Boundary Loaded!",
                        description: `Auto-drawn detailed administrative region polygon for "${item.display_name.split(',')[0]}".`
                    });
                }
            } else {
                toast({ variant: 'destructive', title: 'Location not found', description: `Could not locate region polygon for "${rawQueryText}".` });
            }
        } catch (error) {
            toast({ variant: 'destructive', title: 'Error searching location' });
        } finally {
            setIsSearching(false);
        }
    };
    
    const handleSaveBoundary = async () => {
        if (!communityId) return;
        
        if (boundaryData && isBoundaryModified) {
            toast({
                title: "Validation Required",
                description: "You must check for overlaps before saving a new or modified boundary.",
                variant: "destructive",
            });
            return;
        }

        if (boundaryData && overlapResult?.overlaps && !acknowledgeOverlap) {
            toast({
                title: "Overlap Not Acknowledged",
                description: "You must acknowledge the overlap before saving.",
                variant: "destructive",
            });
            return;
        }

        setIsSaving(true);
        try {
            const params: {
                communityId: string;
                geoJsonString: string | null;
                overlapInfo?: any;
            } = {
                communityId,
                geoJsonString: boundaryData,
            };
            
            if (acknowledgeOverlap && overlapResult && overlapResult.overlaps) {
                params.overlapInfo = {
                    overlappingCommunityId: overlapResult.conflictingCommunityId,
                    overlappingCommunityName: overlapResult.conflictingCommunityName,
                    currentCommunityName: communityData?.name || 'Your Community',
                };
            }
    
            const result = await runSaveCommunityBoundary(params);
            
            if (result.success) {
                toast({ title: 'Boundary Saved!', description: 'The community boundary has been successfully updated.' });
                setIsBoundaryModified(false);
                setAcknowledgeOverlap(false);
                setOverlapResult(null);
            } else {
                throw new Error(result.error);
            }
        } catch(e: any) {
             toast({ variant: 'destructive', title: 'Error Saving Boundary', description: e.message || 'Could not save the boundary.' });
        } finally {
            setIsSaving(false);
        }
      };
    
    const handleOverlapCheck = async () => {
        if (!boundaryData || !communityId) return;

        setIsChecking(true);
        overlapLayerRef.current?.clearLayers();

        try {
            const result = await runCheckBoundaryOverlap({ communityId: communityId, geoJson: JSON.parse(boundaryData) });
            setOverlapResult(result);
            if (result.overlaps && result.conflictingCommunityGeoJson) {
                const L = (window as any).L;
                const conflictLayer = L.geoJSON(JSON.parse(result.conflictingCommunityGeoJson), {
                    style: { color: '#ef4444', weight: 2, opacity: 0.8, fillColor: '#ef4444', fillOpacity: 0.3 }
                }).bindTooltip(`Overlaps with: ${result.conflictingCommunityName}`);
                overlapLayerRef.current?.addLayer(conflictLayer);
            }
            setIsBoundaryModified(false);
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Error checking for overlap', description: error.message || 'Could not perform boundary check.'});
        } finally {
            setIsChecking(false);
        }
    }
    
    const handleShowAll = async () => {
        if (!allBoundariesLayerRef.current) return;
        setIsFetchingAll(true);
        allBoundariesLayerRef.current.clearLayers();
        try {
            const { boundaries } = await runGetAllBoundaries();
            const L = (window as any).L;
            if (boundaries && boundaries.length > 0) {
                boundaries.forEach(item => {
                    if (item.id === communityId) return;
                    try {
                        const geoJson = JSON.parse(item.boundary);
                        L.geoJSON(geoJson, { style: { color: '#3b82f6', weight: 1, opacity: 0.6, fillColor: '#3b82f6', fillOpacity: 0.1 } }).bindTooltip(item.name).addTo(allBoundariesLayerRef.current!);
                    } catch (e) { console.warn(`Could not parse boundary for ${item.name}`); }
                });
                toast({ title: 'Boundaries Loaded', description: `${boundaries.filter(b => b.id !== communityId).length} other community boundaries are now visible.` });
            } else {
                toast({ title: 'No Other Boundaries', description: 'No other communities have defined boundaries yet.' });
            }
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Error', description: 'Could not fetch all boundaries.' });
        } finally {
            setIsFetchingAll(false);
        }
    };
    
    const handleShowMyBoundary = () => {
        if (drawnItemsRef.current && drawnItemsRef.current.getLayers().length > 0) {
            mapInstanceRef.current?.fitBounds(drawnItemsRef.current.getBounds());
        } else {
            toast({ variant: 'destructive', title: 'No Boundary', description: 'You have not drawn or saved a boundary for this community yet.' });
        }
    };
    
    const canSave = (isBoundaryModified && boundaryData === null) || // Case 1: Deleting the boundary
                    (boundaryData && !isBoundaryModified && ( (overlapResult && !overlapResult.overlaps) || (overlapResult?.overlaps && acknowledgeOverlap) ) ); // Case 2: Saving a valid boundary

    const getInstructionText = () => {
        if (!boundaryData) return "Step 1: Draw your community boundary on the map using the tools on the left.";
        if (isBoundaryModified) return "Step 2: Click 'Check for Overlaps' to validate your new boundary.";
        if (overlapResult?.overlaps) return "Step 3: Overlap detected. You must either edit the boundary and re-check, or acknowledge the shared area below before you can save.";
        if (overlapResult?.overlaps === false) return "Step 3: Boundary validated! You can now save your changes."
        return "Step 2: Click 'Check for Overlaps' to validate your drawn boundary.";
    };

    const containerStyle: React.CSSProperties = React.useMemo(() => {
        if (isFullscreen) return { height: '100%', width: '100%', minHeight: '520px' };
        if (height) return { height, width: '100%' };
        if (aspectRatio === 'square') return { width: '100%', aspectRatio: '1 / 1', minHeight: '550px' };
        if (aspectRatio === 'large') return { height: isTallMode ? '820px' : '650px', width: '100%' };
        return { height: isTallMode ? '780px' : '560px', width: '100%' };
    }, [height, aspectRatio, isFullscreen, isTallMode]);

    return (
        <div className={cn(
            "space-y-4 transition-all duration-200",
            isFullscreen && "fixed inset-0 z-[9999] bg-slate-950/95 backdrop-blur-md p-4 sm:p-6 overflow-y-auto flex flex-col justify-between text-white"
        )}>
            <div className="space-y-2 shrink-0">
                {isFullscreen && (
                    <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                        <div>
                            <h2 className="text-lg font-bold text-white flex items-center gap-2">
                                <Search className="h-5 w-5 text-emerald-400" />
                                Interactive Full-Screen Boundary Editor
                            </h2>
                            <p className="text-xs text-slate-400">
                                Use the polygon/rectangle draw tools on the left of the map to mark out your boundary. Press Esc or click Exit when done.
                            </p>
                        </div>
                        <Button 
                            type="button" 
                            variant="outline" 
                            size="sm" 
                            onClick={() => setIsFullscreen(false)} 
                            className="bg-slate-800 hover:bg-slate-700 text-white border-slate-700 text-xs font-semibold"
                        >
                            <Minimize2 className="h-4 w-4 mr-1.5 text-sky-400" />
                            Exit Full Screen (Esc)
                        </Button>
                    </div>
                )}

                <div className="flex flex-wrap items-center gap-2">
                    <form onSubmit={handleSearch} className="flex-1 min-w-[260px] flex gap-2">
                        <Input 
                            type="text"
                            placeholder={showPresets ? "Search boundary or region (e.g. National Park, Regional District)..." : "Search boundary or township (e.g. Oakridge, DemoVille)..."}
                            value={address}
                            onChange={(e) => setAddress(e.target.value)}
                            disabled={disabled}
                            className={cn(isFullscreen && "bg-slate-900 border-slate-700 text-white placeholder:text-slate-500")}
                        />
                        <Button type="submit" disabled={isSearching || !address || disabled} className="shrink-0 font-semibold">
                            {isSearching && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            <Search className="mr-2 h-4 w-4" />
                            Search & Draw
                        </Button>
                    </form>

                    <div className="flex items-center gap-2 shrink-0">
                        {!isFullscreen && (
                            <Button 
                                type="button" 
                                variant="outline" 
                                size="sm" 
                                onClick={() => setIsTallMode(!isTallMode)} 
                                className="h-10 text-xs font-semibold border-slate-300 dark:border-slate-700"
                                title="Toggle between standard and extra tall map height"
                            >
                                {isTallMode ? <Shrink className="h-3.5 w-3.5 mr-1.5 text-emerald-600 dark:text-emerald-400" /> : <Expand className="h-3.5 w-3.5 mr-1.5 text-emerald-600 dark:text-emerald-400" />}
                                {isTallMode ? 'Standard (560px)' : 'Expand Height (780px)'}
                            </Button>
                        )}

                        <Button 
                            type="button" 
                            variant="outline" 
                            size="sm" 
                            onClick={() => setIsFullscreen(!isFullscreen)} 
                            className={cn(
                                "h-10 text-xs font-semibold shadow-sm",
                                isFullscreen 
                                    ? "bg-slate-800 text-white border-slate-700 hover:bg-slate-700" 
                                    : "bg-emerald-50 text-emerald-800 border-emerald-300 hover:bg-emerald-100 dark:bg-emerald-950 dark:text-emerald-200 dark:border-emerald-800"
                            )}
                            title={isFullscreen ? "Exit full screen view" : "Open expansive full screen map editor"}
                        >
                            {isFullscreen ? <Minimize2 className="h-4 w-4 mr-1.5 text-sky-400" /> : <Maximize2 className="h-4 w-4 mr-1.5 text-emerald-600 dark:text-emerald-400" />}
                            {isFullscreen ? 'Exit Full Screen' : 'Full Screen Map'}
                        </Button>
                    </div>
                </div>

                {showPresets && (!isLocked ? (
                    <div className="flex flex-wrap items-center justify-between gap-2 pt-0.5">
                        <div className="flex flex-wrap items-center gap-1.5">
                            <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 flex items-center gap-1">
                                <Sparkles className="h-3.5 w-3.5" /> AI Quick Presets:
                            </span>
                            {[
                                'Cairngorms National Park',
                                'Highland Region',
                                'Moray Council Area',
                                'Aberdeenshire',
                                'Perth and Kinross'
                            ].map((preset) => (
                                <Button
                                    key={preset}
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    className="h-7 text-[11px] px-2.5 bg-emerald-50/50 hover:bg-emerald-100 border-emerald-300 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300"
                                    onClick={() => handleSearch(undefined, preset)}
                                    disabled={isSearching || disabled}
                                >
                                    {preset}
                                </Button>
                            ))}
                        </div>

                        <Button
                            type="button"
                            size="sm"
                            className="h-7 text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
                            onClick={() => {
                                setIsLocked(true);
                                onLockChange?.(true, boundaryData);
                                toast({
                                    title: "Boundary Locked In!",
                                    description: "AI Quick Presets hidden. Encompassed communities generated in side column."
                                });
                            }}
                        >
                            <Lock className="mr-1.5 h-3.5 w-3.5" /> Lock It In
                        </Button>
                    </div>
                ) : (
                    <div className="flex items-center justify-between p-2 rounded-lg bg-emerald-50 border border-emerald-200 dark:bg-emerald-950/40">
                        <div className="flex items-center gap-2 text-xs font-bold text-emerald-800 dark:text-emerald-300">
                            <Lock className="h-4 w-4 text-emerald-600" />
                            <span>Boundary Locked & Saved</span>
                            <span className="text-[11px] font-normal text-emerald-700 dark:text-emerald-400 hidden sm:inline">
                                — Search & map draw toolbars stay active for fine tweaks
                            </span>
                        </div>
                        <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-6 text-[11px] text-emerald-700 hover:bg-emerald-100"
                            onClick={() => {
                                setIsLocked(false);
                                onLockChange?.(false, boundaryData);
                            }}
                        >
                            <Unlock className="mr-1 h-3 w-3" /> Unlock Presets
                        </Button>
                    </div>
                ))}
            </div>
            <div className={cn(
                "relative z-[1]", 
                disabled && "pointer-events-none opacity-70",
                isFullscreen && "flex-1 min-h-[450px] my-2"
            )}>
                <div ref={mapContainerRef} style={containerStyle} className="rounded-lg border bg-muted shadow-inner" />
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Info className="h-4 w-4 shrink-0" />
                <p>{getInstructionText()}</p>
            </div>
            <div className="flex justify-between items-start flex-wrap gap-4">
                {overlapResult?.overlaps && !isBoundaryModified && (
                    <Alert variant="destructive" className="flex-1 min-w-[250px] bg-red-50 dark:bg-red-900/20">
                        <AlertTriangle className="h-4 w-4" />
                        <AlertTitle>Overlap Detected</AlertTitle>
                        <AlertDescription>
                            {overlapResult.reason}
                            <div className="flex items-center space-x-2 mt-4">
                                <Checkbox id="acknowledge-overlap" onCheckedChange={(checked) => setAcknowledgeOverlap(checked as boolean)} />
                                <Label htmlFor="acknowledge-overlap" className="text-xs">I acknowledge the overlap and agree to share this area.</Label>
                            </div>
                            <Dialog>
                                <DialogTrigger asChild>
                                    <Button variant="link" size="sm" className="p-0 h-auto text-xs mt-2 text-destructive">What to do if you dispute this?</Button>
                                </DialogTrigger>
                                <DialogContent>
                                    <DialogHeader>
                                        <DialogTitle>Resolving a Boundary Dispute</DialogTitle>
                                    </DialogHeader>
                                    <div className="py-4 space-y-4 text-sm">
                                        <div className="flex items-start gap-4">
                                            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary font-bold flex-shrink-0">1</div>
                                            <div>
                                                <h4 className="font-semibold">Contact the Other Leader</h4>
                                                <p className="text-muted-foreground">First, try to resolve this directly. Contact the leader for the community of "{overlapResult?.conflictingCommunityName}".</p>
                                            </div>
                                        </div>
                                        <div className="flex items-start gap-4">
                                            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary font-bold flex-shrink-0">2</div>
                                            <div>
                                                <h4 className="font-semibold">Discuss & Resolve</h4>
                                                <p className="text-muted-foreground">Discuss the overlapping boundary lines and come to a mutual resolution. One or both of you may need to adjust your boundaries.</p>
                                            </div>
                                        </div>
                                        <div className="flex items-start gap-4">
                                            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary font-bold flex-shrink-0">3</div>
                                            <div>
                                                <h4 className="font-semibold">Contact Admins if Unresolved</h4>
                                                <p className="text-muted-foreground">If you cannot reach a resolution, please contact the platform administrators via the "Community Boundary Dispute" category on the Report an Issue page.</p>
                                            </div>
                                        </div>
                                    </div>
                                    <DialogFooter>
                                        <Button asChild><Link href={`/report-issue?tab=platform&subject=Community%20Boundary%20Dispute`}>Contact Admins</Link></Button>
                                        <DialogClose asChild><Button variant="outline">Close</Button></DialogClose>
                                    </DialogFooter>
                                </DialogContent>
                            </Dialog>
                        </AlertDescription>
                    </Alert>
                )}
                {overlapResult && !overlapResult.overlaps && !isBoundaryModified && (
                    <Alert variant="default" className="flex-1 min-w-[250px] bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800">
                        <Check className="h-4 w-4 text-green-600" />
                        <AlertTitle className="text-green-800 dark:text-green-300">No Overlaps Found</AlertTitle>
                        <AlertDescription className="text-green-700 dark:text-green-400">
                            {overlapResult.reason}
                        </AlertDescription>
                    </Alert>
                )}

                <div className="flex gap-2 ml-auto self-end flex-wrap">
                    <Button variant="secondary" onClick={handleShowAll} disabled={isFetchingAll}>
                        {isFetchingAll && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Show All Boundaries
                    </Button>
                    <Button variant="secondary" onClick={handleShowMyBoundary} disabled={!boundaryData}>
                        Show My Boundary
                    </Button>
                    <Button variant="outline" onClick={handleOverlapCheck} disabled={!boundaryData || isChecking || disabled}>
                        {isChecking && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Check for Overlaps
                    </Button>
                    <Button onClick={handleSaveBoundary} disabled={!canSave || isSaving || disabled}>
                        {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Save Boundary
                    </Button>
                </div>
            </div>
        </div>
    );
};

export default CommunityBoundaryMap;
