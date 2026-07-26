'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import 'leaflet/dist/leaflet.css';
import type { Map as LeafletMap, Marker as LeafletMarker, LayerGroup } from 'leaflet';
import { PublicCommunityData, runSaveCommunityCentroid } from '@/lib/actions/communityActions';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Crown, Users, MapPin, ExternalLink, Compass } from 'lucide-react';
import { updateUserCommunityAction } from '@/lib/actions/userActions';
import { useUser } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';

interface CommunitiesMapViewProps {
    communities: (PublicCommunityData & { distance?: number })[];
    userLocation: { lat: number; lng: number } | null;
    selectedCommunityId: string | null;
    onSelectCommunity: (id: string) => void;
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
        if (geojson.type === 'Feature' && geojson.geometry) {
            if (geojson.geometry.type === 'Polygon') {
                coords = geojson.geometry.coordinates[0];
            } else if (geojson.geometry.type === 'MultiPolygon') {
                coords = geojson.geometry.coordinates[0][0];
            }
        } else if (geojson.type === 'Polygon') {
            coords = geojson.coordinates[0];
        }
        if (!coords || coords.length === 0) return null;
        
        let sumLat = 0;
        let sumLng = 0;
        coords.forEach(([lng, lat]) => {
            sumLat += lat;
            sumLng += lng;
        });
        return { lat: sumLat / coords.length, lng: sumLng / coords.length };
    } catch {
        return null;
    }
}

export default function CommunitiesMapView({
    communities,
    userLocation,
    selectedCommunityId,
    onSelectCommunity
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
                mapInstanceRef.current = map;

                L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                }).addTo(map);

                markersLayerRef.current = L.layerGroup().addTo(map);
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

    // Update center when user location changes
    useEffect(() => {
        if (mapInstanceRef.current && userLocation) {
            mapInstanceRef.current.flyTo([userLocation.lat, userLocation.lng], 9, { duration: 1.2 });
        }
    }, [userLocation]);

    // Render Markers & Boundaries
    useEffect(() => {
        if (!isMapReady || !mapInstanceRef.current || !markersLayerRef.current) return;

        const updateMarkers = async () => {
            const L = await import('leaflet');
            markersLayerRef.current?.clearLayers();
            markersMapRef.current.clear();

            // Render User Location Pin if available
            if (userLocation) {
                const userIcon = L.divIcon({
                    className: 'custom-user-marker',
                    html: `<div style="background-color: #3b82f6; width: 18px; height: 18px; border-radius: 50%; border: 3px solid white; box-shadow: 0 0 10px rgba(59, 130, 246, 0.8);"></div>`,
                    iconSize: [18, 18],
                    iconAnchor: [9, 9]
                });
                const userMarker = L.marker([userLocation.lat, userLocation.lng], { icon: userIcon, zIndexOffset: 1000 })
                    .bindPopup('<b>Your Current Location</b>');
                markersLayerRef.current?.addLayer(userMarker);
            }

            // Render Community Pins
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
                    const res = await updateUserCommunityAction({ userId: user.uid, communityId: community.id });
                    if (res.success) {
                        toast({ title: "Community Switched!", description: `Now viewing ${community.name}` });
                        window.location.href = '/home';
                    } else {
                        toast({ title: "Error", description: res.error || "Failed to switch community", variant: "destructive" });
                    }
                });

                marker.bindPopup(popupContent);
                marker.on('click', () => onSelectCommunity(community.id));

                markersLayerRef.current?.addLayer(marker);
                markersMapRef.current.set(community.id, marker);

                // Draw GeoJSON boundary polygon if available
                if (community.boundary) {
                    try {
                        const geojson = JSON.parse(community.boundary);
                        L.geoJSON(geojson, {
                            style: {
                                color: pinColor,
                                weight: 2,
                                opacity: 0.7,
                                fillColor: pinColor,
                                fillOpacity: 0.15
                            }
                        }).addTo(markersLayerRef.current!);
                    } catch (e) {
                        // ignore malformed geojson
                    }
                }
            });
        };

        updateMarkers();
    }, [isMapReady, communities, userLocation]);

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
                {userLocation && (
                    <div className="flex items-center gap-2">
                        <span className="w-3 h-3 rounded-full bg-blue-500 inline-block"></span>
                        <span>Your Location</span>
                    </div>
                )}
            </div>
        </div>
    );
}
