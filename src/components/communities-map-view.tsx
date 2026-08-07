'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import 'leaflet/dist/leaflet.css';
import type { Map as LeafletMap, Marker as LeafletMarker, LayerGroup } from 'leaflet';
import { PublicCommunityData, PublicRegionalNetworkData, runSaveCommunityCentroid } from '@/lib/actions/communityActions';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Crown, Users, MapPin, ExternalLink, Compass, LocateFixed, Loader2, ShieldCheck } from 'lucide-react';
import { updateUserCommunityAction } from '@/lib/actions/userActions';
import { useUser } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';

interface CommunitiesMapViewProps {
    communities: (PublicCommunityData & { distance?: number })[];
    allCommunities?: PublicCommunityData[];
    regionalNetworks?: PublicRegionalNetworkData[];
    showCommunityBoundaries?: boolean;
    showRegionalNetworks?: boolean;
    userLocation: { lat: number; lng: number } | null;
    selectedCommunityId: string | null;
    onSelectCommunity: (id: string) => void;
    onRequestGpsLocation?: () => void;
    isLocating?: boolean;
}

export function calculateDistanceMiles(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 3958.8; // Earth's radius in miles
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return Math.round((R * c) * 10) / 10;
}

export function getCentroidFromGeoJson(geoJsonStr: string): { lat: number; lng: number } | null {
    try {
        const geojson = JSON.parse(geoJsonStr);
        let coords: [number, number][] = [];

        if (geojson.type === 'FeatureCollection' && geojson.features && geojson.features.length > 0) {
            const geom = geojson.features[0].geometry;
            if (geom.type === 'Polygon') coords = geom.coordinates[0];
            else if (geom.type === 'MultiPolygon') coords = geom.coordinates[0][0];
        } else if (geojson.type === 'Feature' && geojson.geometry) {
            if (geojson.geometry.type === 'Polygon') coords = geojson.geometry.coordinates[0];
            else if (geojson.geometry.type === 'MultiPolygon') coords = geojson.geometry.coordinates[0][0];
        } else if (geojson.type === 'Polygon') {
            coords = geojson.coordinates[0];
        } else if (geojson.type === 'MultiPolygon') {
            coords = geojson.coordinates[0][0];
        }

        if (coords.length === 0) return null;

        let latSum = 0, lngSum = 0;
        coords.forEach(([lng, lat]) => {
            latSum += lat;
            lngSum += lng;
        });

        return { lat: latSum / coords.length, lng: lngSum / coords.length };
    } catch (e) {
        return null;
    }
}

export default function CommunitiesMapView({
    communities,
    allCommunities,
    regionalNetworks = [],
    showCommunityBoundaries = true,
    showRegionalNetworks = true,
    userLocation,
    selectedCommunityId,
    onSelectCommunity,
    onRequestGpsLocation,
    isLocating = false
}: CommunitiesMapViewProps) {
    const mapContainerRef = useRef<HTMLDivElement>(null);
    const mapInstanceRef = useRef<LeafletMap | null>(null);
    const markersLayerRef = useRef<LayerGroup | null>(null);
    const markersMapRef = useRef<Map<string, LeafletMarker>>(new Map());

    const { user } = useUser();
    const { toast } = useToast();
    const router = useRouter();

    const [isMapReady, setIsMapReady] = useState(false);

    // Initialize Map
    useEffect(() => {
        if (typeof window === 'undefined' || !mapContainerRef.current) return;
        if (mapInstanceRef.current) return;

        const initMap = async () => {
            const L = await import('leaflet');
            
            if (mapContainerRef.current && !(mapContainerRef.current as any)._leaflet_id) {
                const initialLat = userLocation?.lat || 54.5;
                const initialLng = userLocation?.lng || -4.0;
                const initialZoom = userLocation ? 9 : 6;

                const map = L.map(mapContainerRef.current).setView([initialLat, initialLng], initialZoom);

                L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                    maxZoom: 19,
                    attribution: '&copy; OpenStreetMap contributors'
                }).addTo(map);

                const markersGroup = L.layerGroup().addTo(map);
                markersLayerRef.current = markersGroup;
                mapInstanceRef.current = map;
                setIsMapReady(true);
            }
        };

        initMap();

        return () => {
            if (mapInstanceRef.current) {
                mapInstanceRef.current.remove();
                mapInstanceRef.current = null;
            }
        };
    }, []);

    // Update Markers & Polygons whenever props or layer toggles change
    useEffect(() => {
        if (!isMapReady || !mapInstanceRef.current || !markersLayerRef.current) return;

        const updateMarkers = async () => {
            const L = await import('leaflet');
            markersLayerRef.current?.clearLayers();
            markersMapRef.current.clear();

            // Render User's Live Location Pulse Pin if available
            if (userLocation) {
                const userIcon = L.divIcon({
                    className: 'custom-user-marker',
                    html: `
                        <div style="position: relative; width: 24px; height: 24px;">
                            <div style="position: absolute; width: 24px; height: 24px; border-radius: 50%; background: #3b82f6; opacity: 0.4; animation: ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>
                            <div style="position: absolute; top: 4px; left: 4px; width: 16px; height: 16px; border-radius: 50%; background: #2563eb; border: 2px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3);"></div>
                        </div>
                    `,
                    iconSize: [24, 24],
                    iconAnchor: [12, 12]
                });
                const userMarker = L.marker([userLocation.lat, userLocation.lng], { icon: userIcon })
                    .bindPopup('<div style="font-weight: 700; color: #1e3a8a;">📍 You Are Here</div><div style="font-size: 11px; color: #475569;">Your current GPS location</div>');
                markersLayerRef.current?.addLayer(userMarker);
            }

            // 1. Render Community Pins & Boundaries if enabled
            if (showCommunityBoundaries) {
                communities.forEach(community => {
                    let coords = community.centroid;

                    if (!coords && community.boundary) {
                        coords = getCentroidFromGeoJson(community.boundary) || undefined;
                    }

                    if (!coords) return; // Skip if no position resolves yet

                    const isActive = community.status === 'active' || (community.leaderCount || 0) > 0;
                    const isNoLeader = (community.leaderCount || 0) === 0;

                    const pinColor = isActive ? '#10b981' : isNoLeader ? '#f59e0b' : '#6b7280';
                    
                    const customIcon = L.divIcon({
                        className: 'custom-community-marker',
                        html: `
                            <div style="background-color: ${pinColor}; width: 30px; height: 30px; border-radius: 50% 50% 50% 0; transform: rotate(-45deg); border: 2px solid white; display: flex; align-items: center; justify-content: center; box-shadow: 0 2px 6px rgba(0,0,0,0.3);">
                                <div style="transform: rotate(45deg); width: 10px; height: 10px; background: white; border-radius: 50%;"></div>
                            </div>
                        `,
                        iconSize: [30, 30],
                        iconAnchor: [15, 30]
                    });

                    const marker = L.marker([coords.lat, coords.lng], { icon: customIcon });

                    const popupContent = document.createElement('div');
                    popupContent.className = 'p-1 min-w-[200px] text-slate-900';
                    popupContent.innerHTML = `
                        <div style="font-weight: 700; font-size: 15px; margin-bottom: 2px;">${community.name}</div>
                        <div style="font-size: 12px; color: #64748b; margin-bottom: 8px;">${[community.region, community.state].filter(Boolean).join(', ')}</div>
                        <div style="display: flex; gap: 8px; margin-bottom: 8px;">
                            <span style="background: ${isActive ? '#ecfdf5' : '#fffbeb'}; color: ${isActive ? '#047857' : '#b45309'}; font-size: 11px; padding: 2px 8px; border-radius: 12px; font-weight: 600;">
                                ${isActive ? 'Active Community' : 'Leader Role Available'}
                            </span>
                        </div>
                        <div style="font-size: 12px; color: #475569; margin-bottom: 10px;">
                            👥 <strong>${community.memberCount || 0}</strong> Members &bull; 👑 <strong>${community.leaderCount || 0}</strong> Leaders
                        </div>
                        <button id="btn-visit-${community.id}" style="width: 100%; background: #4f46e5; color: white; border: none; padding: 6px 12px; border-radius: 6px; font-weight: 600; font-size: 12px; cursor: pointer;">
                            Visit Community Hub
                        </button>
                    `;

                    popupContent.querySelector(`#btn-visit-${community.id}`)?.addEventListener('click', async () => {
                        if (!user) {
                            router.push('/signup');
                            return;
                        }
                        if (typeof window !== 'undefined') {
                            sessionStorage.setItem('visitedCommunityId', community.id);
                        }
                        const res = await updateUserCommunityAction({ userId: user.uid, communityId: community.id });
                        if (res.success) {
                            toast({ title: "Community Switched!", description: `Now viewing ${community.name}` });
                            window.location.href = `/home?community=${community.id}`;
                        } else {
                            toast({ title: "Error", description: res.error || "Failed to switch community", variant: "destructive" });
                        }
                    });

                    marker.bindPopup(popupContent);
                    marker.on('click', () => onSelectCommunity(community.id));

                    markersLayerRef.current?.addLayer(marker);
                    markersMapRef.current.set(community.id, marker);
                });

                // Render GeoJSON boundary polygons across communities
                const boundarySource = (allCommunities && allCommunities.length > 0) ? allCommunities : communities;
                boundarySource.forEach(c => {
                    if (c.boundary) {
                        try {
                            const geojson = JSON.parse(c.boundary);
                            const isActive = c.status === 'active' || (c.leaderCount || 0) > 0;
                            const polyColor = isActive ? '#10b981' : '#f59e0b';
                            const poly = L.geoJSON(geojson, {
                                style: {
                                    color: polyColor,
                                    weight: 2,
                                    opacity: 0.8,
                                    fillColor: polyColor,
                                    fillOpacity: 0.15,
                                    dashArray: '5, 5'
                                }
                            }).bindTooltip(`<b>${c.name}</b><br/>${c.region || ''}`, { permanent: false, direction: 'center' });
                            markersLayerRef.current?.addLayer(poly);
                        } catch (e) {
                            // ignore malformed geojson
                        }
                    }
                });
            }

            // 2. Render Regional Network Boundaries if enabled
            if (showRegionalNetworks && regionalNetworks && regionalNetworks.length > 0) {
                regionalNetworks.forEach(r => {
                    if (r.regionalBoundary) {
                        try {
                            const geojson = JSON.parse(r.regionalBoundary);
                            const poly = L.geoJSON(geojson, {
                                style: {
                                    color: '#6366f1', // Indigo purple for regional authority boundaries
                                    weight: 3,
                                    opacity: 0.85,
                                    fillColor: '#818cf8',
                                    fillOpacity: 0.1,
                                    dashArray: '8, 6'
                                }
                            }).bindTooltip(`<b>🛡️ Regional Network</b><br/>${r.name}<br/><i>${r.region || ''}</i>`, { permanent: false, direction: 'center' });
                            markersLayerRef.current?.addLayer(poly);
                        } catch (e) {
                            // ignore malformed geojson
                        }
                    }
                });
            }
        };

        updateMarkers();
    }, [isMapReady, communities, allCommunities, regionalNetworks, showCommunityBoundaries, showRegionalNetworks, userLocation]);

    // Handle selection from list
    useEffect(() => {
        if (!selectedCommunityId || !mapInstanceRef.current) return;
        const targetMarker = markersMapRef.current.get(selectedCommunityId);
        if (targetMarker) {
            const latLng = targetMarker.getLatLng();
            mapInstanceRef.current.flyTo(latLng, 12, { duration: 1 });
            targetMarker.openPopup();
        }
    }, [selectedCommunityId]);

    return (
        <div className="relative w-full h-[550px] md:h-[650px] rounded-2xl overflow-hidden border shadow-sm">
            {/* Global CSS Override to eliminate Leaflet's default div-icon black border square */}
            <style jsx global>{`
                .leaflet-div-icon {
                    background: transparent !important;
                    border: none !important;
                    box-shadow: none !important;
                }
                .leaflet-popup-content-wrapper {
                    border-radius: 12px;
                }
            `}</style>

            <div ref={mapContainerRef} className="w-full h-full z-0" />
            
            {/* Map Legend Floating Card */}
            <div className="absolute bottom-4 left-4 z-10 bg-background/95 backdrop-blur-md p-3 rounded-xl border shadow-md text-xs space-y-1.5 hidden sm:block">
                <div className="font-semibold text-slate-700 dark:text-slate-200 mb-1">Map Legend</div>
                <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-emerald-500 inline-block"></span>
                    <span>Active Community</span>
                </div>
                <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-amber-500 inline-block"></span>
                    <span>Leader Needed</span>
                </div>
                {showRegionalNetworks && (
                    <div className="flex items-center gap-2">
                        <span className="w-3.5 h-2.5 rounded-xs border-2 border-indigo-500 bg-indigo-500/20 inline-block"></span>
                        <span>Regional Network Boundary</span>
                    </div>
                )}
                {userLocation && (
                    <div className="flex items-center gap-2">
                        <span className="w-3 h-3 rounded-full bg-blue-500 inline-block"></span>
                        <span>Your Location (📍 You Are Here)</span>
                    </div>
                )}

            </div>
        </div>
    );
}
