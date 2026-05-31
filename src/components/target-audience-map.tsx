
'use client';

import * as React from 'react';
import { useFirestore } from '@/firebase';
import type { Announcement } from '@/lib/announcement-data';
import 'leaflet/dist/leaflet.css';
import { Loader2, Maximize, Minimize } from 'lucide-react';
import { runGetAllBoundaries } from '@/lib/actions/communityActions';
import type { Map, FeatureGroup } from 'leaflet';
import { Button } from './ui/button';
import { cn } from '@/lib/utils';

interface TargetAudienceMapProps {
  announcement: Announcement | null;
}

export const TargetAudienceMap: React.FC<TargetAudienceMapProps> = ({ announcement }) => {
  const mapContainerRef = React.useRef<HTMLDivElement>(null);
  const mapInstanceRef = React.useRef<Map | null>(null);
  const featureGroupRef = React.useRef<FeatureGroup | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [isFullScreen, setIsFullScreen] = React.useState(false);

  React.useEffect(() => {
    if (typeof window === 'undefined' || !mapContainerRef.current) return;
    if (mapInstanceRef.current) return; // Initialize only once

    let map: Map;

    const initMap = async () => {
      try {
        const L = await import('leaflet');
        if (mapContainerRef.current && !(mapContainerRef.current as any)._leaflet_id) {
          map = L.map(mapContainerRef.current).setView([54.5, -4], 5);
          mapInstanceRef.current = map;

          L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
          }).addTo(map);

          featureGroupRef.current = new L.FeatureGroup().addTo(map);
        }
      } catch (error) {
        console.error("Failed to load Leaflet modules:", error);
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

  React.useEffect(() => {
    const map = mapInstanceRef.current;
    const featureGroup = featureGroupRef.current;
    if (!map || !featureGroup || !announcement) return;
    
    setLoading(true);
    featureGroup.clearLayers();

    const loadBoundaries = async () => {
        try {
            const { boundaries } = await runGetAllBoundaries();
            if (!boundaries) return;
            const L = await import('leaflet');

            const targetIds = new Set([
                ...(announcement.targetCommunityIds || []),
                ...(announcement.targetRegionIds || []),
                ...(announcement.targetStateIds || []),
                ...(announcement.targetCountryIds || []),
            ]);
            
            if (targetIds.size === 0) {
              setLoading(false);
              return;
            }

            boundaries.forEach(item => {
                if (targetIds.has(item.id)) {
                    try {
                        const geoJson = JSON.parse(item.boundary);
                        L.geoJSON(geoJson, {
                            style: { color: '#3b82f6', weight: 2, opacity: 0.8, fillColor: '#3b82f6', fillOpacity: 0.2 }
                        }).bindTooltip(item.name).addTo(featureGroup);
                    } catch (e) {
                        console.warn(`Could not parse boundary for ${item.name}`);
                    }
                }
            });

            if (featureGroup.getLayers().length > 0) {
                map.fitBounds(featureGroup.getBounds().pad(0.1));
            }

        } catch (error) {
            console.error("Error loading boundaries:", error);
        } finally {
            setLoading(false);
        }
    };
    loadBoundaries();

  }, [announcement]);
  
   React.useEffect(() => {
    if (mapInstanceRef.current) {
      const timer = setTimeout(() => mapInstanceRef.current?.invalidateSize(), 400); // Delay to allow dialog animation
      return () => clearTimeout(timer);
    }
  }, [isFullScreen]);

  return (
    <div className={cn("relative", isFullScreen && "fixed inset-0 z-[100] bg-background p-4")}>
      <div ref={mapContainerRef} className={cn("h-64 w-full rounded-lg border bg-muted", isFullScreen && "h-full w-full")}>
        {loading && <div className="flex h-full w-full items-center justify-center"><Loader2 className="h-6 w-6 animate-spin" /></div>}
      </div>
      <Button size="icon" variant="outline" className="absolute top-2 right-2 z-50 h-8 w-8 bg-background/80 hover:bg-background" onClick={() => setIsFullScreen(!isFullScreen)}>
        {isFullScreen ? <Minimize className="h-4 w-4" /> : <Maximize className="h-4 w-4" />}
      </Button>
    </div>
  );
};
