
'use client';

import * as React from 'react';
import { useUser, useFirestore, useDoc, useMemoFirebase } from "@/firebase";
import { doc, getDoc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { runSaveCommunityBoundary, runCheckBoundaryOverlap, runCreateDisputeFromOverlap, runGetAllBoundaries } from '@/lib/actions/communityActions';
import { cn } from "@/lib/utils";

import { Loader2, Search, AlertTriangle, Flag, Info, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

// Import Leaflet and Leaflet Draw CSS
import 'leaflet/dist/leaflet.css';
import 'leaflet-draw/dist/leaflet.draw.css';

// Type imports only, to avoid server-side issues
import type { Map, FeatureGroup, Control as LeafletControl } from 'leaflet'; 

interface CommunityBoundaryMapProps {
    disabled?: boolean;
}

const CommunityBoundaryMap: React.FC<CommunityBoundaryMapProps> = ({ disabled = false }) => {
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
    const [isDisputing, setIsDisputing] = React.useState(false);
    const [isFetchingAll, setIsFetchingAll] = React.useState(false);
    const [isMapReady, setIsMapReady] = React.useState(false);

    const { user } = useUser();
    const db = useFirestore();
    const { toast } = useToast();
    const userProfileRef = useMemoFirebase(() => (user ? doc(db, 'users', user.uid) : null), [user, db]);
    const { data: userProfile } = useDoc(userProfileRef);
    const communityId = (userProfile as any)?.impersonating?.communityId || userProfile?.communityId;

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
        // Prevent map from initializing on the server
        if (typeof window === 'undefined' || !mapContainerRef.current) return;

        // Prevent re-initialization
        if (mapInstanceRef.current) return;

        let map: Map;

        const initMap = async () => {
            try {
                const L = await import('leaflet');
                await import('leaflet-draw');

                // This check prevents re-initialization on hot reloads
                if (mapContainerRef.current && !(mapContainerRef.current as any)._leaflet_id) {
                    map = L.map(mapContainerRef.current).setView([54.5, -4], 5);
                    mapInstanceRef.current = map;

                    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
                        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
                    }).addTo(map);
                    
                    setIsMapReady(true);
                }
            } catch (error) {
                console.error("Failed to load Leaflet modules:", error);
                toast({ variant: 'destructive', title: 'Map Error', description: 'Could not load map components.' });
            }
        };

        initMap();

        // Cleanup function
        return () => {
            if (mapInstanceRef.current) {
                mapInstanceRef.current.remove();
                mapInstanceRef.current = null;
                setIsMapReady(false);
            }
        };
    // Empty dependency array ensures this runs only once on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Effect to add layers and controls once the map is ready
    React.useEffect(() => {
        const map = mapInstanceRef.current;
        if (!isMapReady || !map) return;

        const L = (window as any).L;
        if (!L) return;

        // Initialize layer groups
        drawnItemsRef.current = new L.FeatureGroup().addTo(map);
        overlapLayerRef.current = new L.FeatureGroup().addTo(map);
        allBoundariesLayerRef.current = new L.FeatureGroup().addTo(map);

        // Load initial data if available
        if (boundaryData) {
            try {
                const geoJson = JSON.parse(boundaryData);
                L.geoJSON(geoJson).eachLayer((layer: any) => drawnItemsRef.current?.addLayer(layer));
                if (drawnItemsRef.current.getLayers().length > 0) {
                    map.fitBounds(drawnItemsRef.current.getBounds());
                }
            } catch (e) { console.error("Error loading initial boundary data:", e); }
        }

        // Add draw controls if not disabled
        if (!disabled) {
            drawControlRef.current = new L.Control.Draw({
                edit: { featureGroup: drawnItemsRef.current },
                draw: {
                    polygon: { allowIntersection: false, shapeOptions: { color: '#9721F5' } },
                    rectangle: true, circle: true, 
                    polyline: false, marker: false, circlemarker: false,
                },
            });
            map.addControl(drawControlRef.current);
        }
        
        const onDrawCreated = (e: any) => {
            drawnItemsRef.current?.clearLayers();
            overlapLayerRef.current?.clearLayers();
            allBoundariesLayerRef.current?.clearLayers();
            drawnItemsRef.current?.addLayer(e.layer);
            setBoundaryData(JSON.stringify(e.layer.toGeoJSON()));
            setIsBoundaryModified(true);
        };
        
        const onDrawEdited = (e: any) => {
            e.layers.eachLayer((layer: any) => setBoundaryData(JSON.stringify(layer.toGeoJSON())));
            setIsBoundaryModified(true);
        };

        const onDrawDeleted = () => {
            setBoundaryData(null);
            setIsBoundaryModified(true);
        };

        map.on(L.Draw.Event.CREATED, onDrawCreated);
        map.on(L.Draw.Event.EDITED, onDrawEdited);
        map.on(L.Draw.Event.DELETED, onDrawDeleted);

        // Cleanup event listeners
        return () => {
            map.off(L.Draw.Event.CREATED, onDrawCreated);
            map.off(L.Draw.Event.EDITED, onDrawEdited);
            map.off(L.Draw.Event.DELETED, onDrawDeleted);
            if (drawControlRef.current) {
                map.removeControl(drawControlRef.current);
            }
        };
    }, [isMapReady, disabled, boundaryData]); // Re-run if map readiness or props change


    React.useEffect(() => {
        if (isBoundaryModified) {
            setOverlapResult(null);
            setAcknowledgeOverlap(false);
            if (overlapLayerRef.current) {
                overlapLayerRef.current.clearLayers();
            }
        }
    }, [isBoundaryModified]);

    const handleSearch = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!address || !mapInstanceRef.current) return;
        setIsSearching(true);
        try {
            const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${address}`);
            const data = await response.json();
            if (data && data.length > 0) {
                const { lat, lon } = data[0];
                mapInstanceRef.current?.setView([lat, lon], 13);
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
        if (!communityId || !boundaryData) return;
        setIsSaving(true);
        try {
            const result = await runSaveCommunityBoundary({ communityId, geoJsonString: boundaryData });
            if (result.success) {
                toast({ title: 'Boundary Saved!', description: 'The community boundary has been successfully updated.' });
                setIsBoundaryModified(false);
            } else {
                throw new Error(result.error);
            }
        } catch(e: any) {
             toast({ variant: 'destructive', title: 'Error Saving Boundary', description: e.message || 'Could not save the boundary.' });
        } finally {
            setIsSaving(false);
        }
    }
    
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
    
    const handleDispute = async () => {
        if (!overlapResult?.conflictingCommunityId || !overlapResult?.conflictingCommunityName || !communityId || !userProfile) {
            toast({ variant: 'destructive', title: 'Error', description: 'Cannot initiate dispute, required information is missing.' });
            return;
        }
        setIsDisputing(true);
        try {
            const result = await runCreateDisputeFromOverlap({
                reportingCommunityId: communityId,
                reportingCommunityName: userProfile.communityName || 'Unknown Community',
                overlappingCommunityId: overlapResult.conflictingCommunityId,
                overlappingCommunityName: overlapResult.conflictingCommunityName,
                reportedBy: userProfile.name,
            });

            if (result.success) {
                toast({ title: 'Dispute Raised', description: 'A notification has been sent to the platform administrators.' });
            } else {
                throw new Error(result.error);
            }
        } catch (error: any) {
             toast({ variant: 'destructive', title: 'Dispute Failed', description: error.message || 'Could not raise a dispute.' });
        } finally {
            setIsDisputing(false);
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
    
    const canSave = boundaryData && !isBoundaryModified && ((overlapResult && !overlapResult.overlaps) || (overlapResult && overlapResult.overlaps && acknowledgeOverlap));

    const getInstructionText = () => {
        if (!boundaryData) return "Step 1: Draw your community boundary on the map using the tools on the left.";
        if (isBoundaryModified) return "Step 2: Click 'Check for Overlaps' to validate your new boundary.";
        if (overlapResult?.overlaps) return "Step 3: Overlap detected. You must either edit the boundary and re-check, or acknowledge the shared area below before you can save.";
        if (overlapResult?.overlaps === false) return "Step 3: Boundary validated! You can now save your changes."
        return "Step 2: Click 'Check for Overlaps' to validate your drawn boundary.";
    };

    return (
        <div className="space-y-4">
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
            <div className={cn("relative z-[1]", disabled && "pointer-events-none opacity-70")}>
                <div ref={mapContainerRef} style={{ height: '400px', width: '100%' }} className="rounded-lg border bg-muted" />
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
                    {overlapResult?.overlaps && (
                        <Button variant="destructive" onClick={handleDispute} disabled={isDisputing || disabled}>
                            {isDisputing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            <Flag className="mr-2 h-4 w-4" />
                            Dispute Overlap
                        </Button>
                    )}
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

    