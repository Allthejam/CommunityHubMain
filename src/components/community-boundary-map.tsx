'use client';

import * as React from 'react';
import { useUser, useFirestore, useDoc, useMemoFirebase } from "@/firebase";
import { doc, getDoc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { runSaveCommunityBoundary, runCheckBoundaryOverlap, runGetAllBoundaries, runCreateDisputeFromOverlap } from '@/lib/actions/communityActions';
import { cn } from "@/lib/utils";
import Link from 'next/link';

import { Loader2, Search, AlertTriangle, Flag, Info, Check } from 'lucide-react';
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
    communityId?: string;
}

const CommunityBoundaryMap: React.FC<CommunityBoundaryMapProps> = ({ disabled = false, communityId: propCommunityId }) => {
    const mapContainerRef = React.useRef<HTMLDivElement>(null);
    const mapInstanceRef = React.useRef<Map | null>(null);
    const drawnItemsRef = React.useRef<FeatureGroup | null>(null);
    const overlapLayerRef = React.useRef<FeatureGroup | null>(null);
    const allBoundariesLayerRef = React.useRef<FeatureGroup | null>(null);
    const drawControlRef = React.useRef<LeafletControl.Draw | null>(null);

    const [address, setAddress] = React.useState('');
    const [isSearching, setIsSearching] = React.useState(false);
    const [boundaryData, setBoundaryData] = React.useState<string | null>(null);
    const [isSaving, setIsSaving] = React.useState(false);
    const [isChecking, setIsChecking] = React.useState(false);
    const [overlapResult, setOverlapResult] = React.useState<{ overlaps: boolean; reason: string; conflictingCommunityId?: string; conflictingCommunityName?: string; conflictingCommunityGeoJson?: string; } | null>(null);
    const [acknowledgeOverlap, setAcknowledgeOverlap] = React.useState(false);
    const [isBoundaryModified, setIsBoundaryModified] = React.useState(false);
    const [isFetchingAll, setIsFetchingAll] = React.useState(false);
    const [isMapReady, setIsMapReady] = React.useState(false);

    const { user } = useUser();
    const db = useFirestore();
    const { toast } = useToast();
    const userProfileRef = useMemoFirebase(() => (user ? doc(db, 'users', user.uid) : null), [user, db]);
    const { data: userProfile } = useDoc(userProfileRef);

    const visitedCommunityId = typeof window !== 'undefined' ? sessionStorage.getItem('visitedCommunityId') : null;
    const communityId = propCommunityId || (userProfile as any)?.impersonating?.communityId || visitedCommunityId || userProfile?.activeCommunityId || userProfile?.communityId || userProfile?.homeCommunityId;
    
    const communityRef = useMemoFirebase(() => (communityId ? doc(db, 'communities', communityId) : null), [communityId, db]);
    const { data: communityData } = useDoc(communityRef);

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

                // Fix Leaflet marker icon paths in Next.js
                delete (L.Icon.Default.prototype as any)._getIconUrl;
                L.Icon.Default.mergeOptions({
                    iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
                    iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
                    shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
                });

                if (mapContainerRef.current && !(mapContainerRef.current as any)._leaflet_id) {
                    map = L.map(mapContainerRef.current, {
                        zoomControl: true,
                        scrollWheelZoom: true,
                    }).setView([54.5, -4], 5);
                    mapInstanceRef.current = map;

                    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
                        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
                    }).addTo(map);

                    setIsMapReady(true);

                    setTimeout(() => {
                        map.invalidateSize();
                    }, 250);
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
                setIsMapReady(false);
            }
        };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Effect to add layers and controls once the map is ready
    React.useEffect(() => {
        const map = mapInstanceRef.current;
        if (!isMapReady || !map) return;

        const L = (window as any).L;
        if (!L) return;

        drawnItemsRef.current = new L.FeatureGroup().addTo(map);
        overlapLayerRef.current = new L.FeatureGroup().addTo(map);
        allBoundariesLayerRef.current = new L.FeatureGroup().addTo(map);

        if (boundaryData) {
            try {
                const geoJson = JSON.parse(boundaryData);
                L.geoJSON(geoJson).eachLayer((layer: any) => drawnItemsRef.current?.addLayer(layer));
                if (drawnItemsRef.current.getLayers().length > 0) {
                    map.fitBounds(drawnItemsRef.current.getBounds());
                }
            } catch (e) { console.error("Error loading initial boundary data:", e); }
        }

        if (!disabled) {
            drawControlRef.current = new L.Control.Draw({
                edit: { featureGroup: drawnItemsRef.current },
                draw: {
                    polygon: { allowIntersection: false, shapeOptions: { color: '#9721F5' } },
                    rectangle: true, circle: true, polyline: false, marker: false, circlemarker: false,
                },
            });
            map.addControl(drawControlRef.current);
        }

        setTimeout(() => {
            map.invalidateSize();
        }, 300);
        
        const onDrawCreated = (e: any) => {
            drawnItemsRef.current?.clearLayers();
            drawnItemsRef.current?.addLayer(e.layer);
            setBoundaryData(JSON.stringify(e.layer.toGeoJSON()));
            setIsBoundaryModified(true);
            setOverlapResult(null);
            setAcknowledgeOverlap(false);
            overlapLayerRef.current?.clearLayers();
        };
        
        const onDrawEdited = (e: any) => {
            e.layers.eachLayer((layer: any) => setBoundaryData(JSON.stringify(layer.toGeoJSON())));
            setIsBoundaryModified(true);
            setOverlapResult(null);
            setAcknowledgeOverlap(false);
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


    const handleSearch = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!address || !mapInstanceRef.current) return;
        setIsSearching(true);
        try {
            const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}`);
            const data = await response.json();
            if (data && data.length > 0) {
                const { lat, lon } = data[0];
                mapInstanceRef.current?.setView([parseFloat(lat), parseFloat(lon)], 13);
                setTimeout(() => mapInstanceRef.current?.invalidateSize(), 200);
            } else {
                toast({ variant: 'destructive', title: 'Location not found' });
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
        if (!boundaryData) {
            toast({ variant: 'destructive', title: 'No Boundary Drawn', description: 'Please draw a boundary on the map first.' });
            return;
        }
        if (!communityId) {
            toast({ variant: 'destructive', title: 'Community Not Found', description: 'Could not identify active community.' });
            return;
        }

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
            setTimeout(() => mapInstanceRef.current?.invalidateSize(), 200);
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

    return (
        <div className="space-y-4 w-full">
            {/* Scoped CSS to prevent Tailwind from distorting Leaflet map tiles and controls */}
            <style jsx global>{`
                .leaflet-container {
                    width: 100% !important;
                    height: 400px !important;
                    position: relative !important;
                    z-index: 1 !important;
                    overflow: hidden !important;
                    border-radius: 0.5rem !important;
                }
                .leaflet-tile-container img {
                    max-width: none !important;
                    max-height: none !important;
                    width: auto !important;
                    height: auto !important;
                }
                .leaflet-control-container {
                    position: absolute !important;
                    z-index: 10 !important;
                }
                .leaflet-top, .leaflet-bottom {
                    position: absolute !important;
                    z-index: 10 !important;
                }
                .leaflet-pane {
                    z-index: 1 !important;
                }
                .leaflet-draw-toolbar a {
                    background-color: #ffffff !important;
                }
            `}</style>

            <form onSubmit={handleSearch} className="flex gap-2">
                <Input 
                    placeholder="Enter an address or city to jump to location..."
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    disabled={disabled}
                />
                <Button type="submit" disabled={isSearching || !address || disabled}>
                    {isSearching && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    <Search className="mr-2 h-4 w-4" />
                    Search
                </Button>
            </form>

            <div className={cn("relative z-0 overflow-hidden rounded-lg border bg-muted min-h-[400px] w-full isolate", disabled && "pointer-events-none opacity-70")}>
                <div ref={mapContainerRef} style={{ height: '400px', width: '100%', position: 'relative' }} className="w-full h-[400px] overflow-hidden rounded-lg" />
            </div>

            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Info className="h-4 w-4 shrink-0" />
                <p>{getInstructionText()}</p>
            </div>

            <div className="flex justify-between items-start flex-wrap gap-4">
                {overlapResult?.overlaps && !isBoundaryModified && (
                    <Alert variant="destructive" className="flex-1 min-w-[250px] bg-red-50 dark:bg-red-900/20">
                        <AlertTriangle className="h-4 w-4" />
                        <AlertTitle>Boundary Overlap Detected</AlertTitle>
                        <AlertDescription className="space-y-2 text-xs">
                            <p>{overlapResult.reason}</p>
                            <p>You can either adjust your boundary to remove the overlap, or check the box below to acknowledge the shared territory and log a dispute for platform review.</p>
                            <div className="flex items-center space-x-2 pt-2">
                                <Checkbox 
                                    id="acknowledge-overlap" 
                                    checked={acknowledgeOverlap} 
                                    onCheckedChange={(checked) => setAcknowledgeOverlap(checked as boolean)}
                                />
                                <Label htmlFor="acknowledge-overlap" className="text-xs font-semibold cursor-pointer">
                                    I acknowledge this overlap and wish to save anyway.
                                </Label>
                            </div>
                        </AlertDescription>
                    </Alert>
                )}

                {overlapResult && !overlapResult.overlaps && !isBoundaryModified && (
                     <Alert className="flex-1 min-w-[250px] bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300">
                        <Check className="h-4 w-4 text-emerald-600" />
                        <AlertTitle>Boundary Validated!</AlertTitle>
                        <AlertDescription className="text-xs">
                            No overlaps were found with neighboring communities. You can now save your boundary.
                        </AlertDescription>
                    </Alert>
                )}

                <div className="flex items-center gap-2 flex-wrap ml-auto">
                    <Button variant="outline" size="sm" onClick={handleShowMyBoundary} disabled={disabled}>
                        Focus My Boundary
                    </Button>
                    <Button variant="outline" size="sm" onClick={handleShowAll} disabled={isFetchingAll || disabled}>
                        {isFetchingAll && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Show Neighboring Boundaries
                    </Button>
                    <Button variant="secondary" size="sm" onClick={handleOverlapCheck} disabled={isChecking || !boundaryData || disabled}>
                        {isChecking && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Check for Overlaps
                    </Button>
                    <Button size="sm" onClick={handleSaveBoundary} disabled={isSaving || !canSave || disabled}>
                        {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Save Boundary
                    </Button>
                </div>
            </div>
        </div>
    );
};

export default CommunityBoundaryMap;
