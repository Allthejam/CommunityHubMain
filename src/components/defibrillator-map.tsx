'use client';

import * as React from 'react';
import { type DefibrillatorItem } from '@/lib/actions/communityProfileActions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Search, Loader2, Navigation, MapPin, ExternalLink, HeartPulse } from 'lucide-react';
import 'leaflet/dist/leaflet.css';
import type { Map as LeafletMap, Marker as LeafletMarker, LayerGroup } from 'leaflet';

interface DefibrillatorMapProps {
  mode?: 'view' | 'picker';
  defibrillators?: DefibrillatorItem[];
  selectedId?: string | null;
  onSelect?: (id: string) => void;
  userLocation?: { lat: number; lng: number } | null;
  initialLat?: number;
  initialLng?: number;
  onLocationSelect?: (lat: number, lng: number) => void;
  height?: string;
  className?: string;
}

export default function DefibrillatorMap({
  mode = 'view',
  defibrillators = [],
  selectedId,
  onSelect,
  userLocation,
  initialLat = 57.3308,
  initialLng = -3.6120,
  onLocationSelect,
  height = '420px',
  className = '',
}: DefibrillatorMapProps) {
  const mapContainerRef = React.useRef<HTMLDivElement>(null);
  const mapInstanceRef = React.useRef<LeafletMap | null>(null);
  const markersLayerRef = React.useRef<LayerGroup | null>(null);
  const pickerMarkerRef = React.useRef<LeafletMarker | null>(null);
  const userMarkerRef = React.useRef<LeafletMarker | null>(null);

  const [currentPickerCoords, setCurrentPickerCoords] = React.useState<{ lat: number; lng: number } | null>(
    initialLat && initialLng ? { lat: initialLat, lng: initialLng } : null
  );
  const [searchQuery, setSearchQuery] = React.useState('');
  const [isSearching, setIsSearching] = React.useState(false);
  const [isMapReady, setIsMapReady] = React.useState(false);

  // Initialize Map
  React.useEffect(() => {
    let isMounted = true;
    let map: LeafletMap | null = null;

    const init = async () => {
      if (!mapContainerRef.current || mapInstanceRef.current) return;
      const L = await import('leaflet');

      if (!isMounted || !mapContainerRef.current) return;

      const centerLat = initialLat || (defibrillators[0]?.lat) || 57.3308;
      const centerLng = initialLng || (defibrillators[0]?.lng) || -3.6120;

      map = L.map(mapContainerRef.current, {
        center: [centerLat, centerLng],
        zoom: 15,
        zoomControl: true,
      });

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        maxZoom: 19,
      }).addTo(map);

      const markersGroup = L.layerGroup().addTo(map);
      markersLayerRef.current = markersGroup;
      mapInstanceRef.current = map;
      setIsMapReady(true);

      // Picker click handler
      if (mode === 'picker') {
        map.on('click', (e) => {
          const { lat, lng } = e.latlng;
          setCurrentPickerCoords({ lat, lng });
          if (onLocationSelect) onLocationSelect(lat, lng);
        });
      }
    };

    init();

    return () => {
      isMounted = false;
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [mode]);

  // Handle Picker Mode Markers
  React.useEffect(() => {
    if (mode !== 'picker' || !isMapReady || !mapInstanceRef.current) return;

    const updatePickerMarker = async () => {
      const L = await import('leaflet');
      const map = mapInstanceRef.current;
      if (!map) return;

      if (pickerMarkerRef.current) {
        pickerMarkerRef.current.remove();
        pickerMarkerRef.current = null;
      }

      if (currentPickerCoords) {
        const pinIcon = L.divIcon({
          className: 'custom-aed-picker-pin',
          html: `<div style="background-color: #dc2626; color: white; border-radius: 50%; width: 36px; height: 36px; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 12px rgba(220, 38, 38, 0.5); border: 2.5px solid white; cursor: grab;">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/>
              <polyline points="12 6 12 11 14 13"/>
            </svg>
          </div>`,
          iconSize: [36, 36],
          iconAnchor: [18, 18],
        });

        const marker = L.marker([currentPickerCoords.lat, currentPickerCoords.lng], {
          icon: pinIcon,
          draggable: true,
        }).addTo(map);

        marker.on('dragend', (e) => {
          const latlng = (e.target as LeafletMarker).getLatLng();
          setCurrentPickerCoords({ lat: latlng.lat, lng: latlng.lng });
          if (onLocationSelect) onLocationSelect(latlng.lat, latlng.lng);
        });

        pickerMarkerRef.current = marker;
      }
    };

    updatePickerMarker();
  }, [mode, isMapReady, currentPickerCoords, onLocationSelect]);

  // Handle View Mode Markers
  React.useEffect(() => {
    if (mode !== 'view' || !isMapReady || !mapInstanceRef.current || !markersLayerRef.current) return;

    const renderPins = async () => {
      const L = await import('leaflet');
      const map = mapInstanceRef.current;
      const layer = markersLayerRef.current;
      if (!map || !layer) return;

      layer.clearLayers();

      const validItems = defibrillators.filter((d) => typeof d.lat === 'number' && typeof d.lng === 'number');

      validItems.forEach((defib) => {
        const isSelected = selectedId === defib.id;
        const is247 = defib.accessType === '24_7';

        const pinIcon = L.divIcon({
          className: 'custom-aed-pin',
          html: `<div style="background-color: ${isSelected ? '#b91c1c' : '#dc2626'}; color: white; border-radius: 50%; width: ${isSelected ? '40px' : '34px'}; height: ${isSelected ? '40px' : '34px'}; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 12px rgba(220, 38, 38, 0.45); border: ${isSelected ? '3.5px solid #fef08a' : '2.5px solid white'}; transform: translate(-50%, -50%); transition: transform 0.2s ease;">
            <svg width="${isSelected ? '22' : '18'}" height="${isSelected ? '22' : '18'}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/>
              <polyline points="12 6 12 11 14 13"/>
            </svg>
          </div>`,
          iconSize: [34, 34],
          iconAnchor: [0, 0],
          popupAnchor: [0, -20],
        });

        const navUrl = `https://www.google.com/maps/dir/?api=1&destination=${defib.lat},${defib.lng}`;

        const popupContent = `
          <div style="font-family: inherit; min-width: 200px; padding: 2px;">
            <div style="font-size: 11px; font-weight: 700; color: ${is247 ? '#059669' : '#d97706'}; text-transform: uppercase; margin-bottom: 3px;">
              ${is247 ? '● 24/7 Public Access' : '● Restricted Hours'}
            </div>
            <div style="font-size: 14px; font-weight: 700; color: #0f172a; margin-bottom: 4px; line-height: 1.3;">
              ${defib.name}
            </div>
            <div style="font-size: 12px; color: #475569; margin-bottom: 6px; line-height: 1.3;">
              ${defib.address}
            </div>
            ${defib.cabinetCodeInstructions ? `
              <div style="background-color: #fef2f2; border: 1px solid #fecaca; border-radius: 6px; padding: 4px 8px; font-size: 11px; font-weight: 600; color: #991b1b; margin-bottom: 8px;">
                🔑 ${defib.cabinetCodeInstructions}
              </div>
            ` : ''}
            <a href="${navUrl}" target="_blank" rel="noopener noreferrer" style="display: block; text-align: center; background-color: #dc2626; color: white; font-size: 12px; font-weight: 600; padding: 6px 12px; border-radius: 6px; text-decoration: none; margin-top: 4px;">
              Get Google Maps Directions ➔
            </a>
          </div>
        `;

        const marker = L.marker([defib.lat!, defib.lng!], { icon: pinIcon }).addTo(layer);
        marker.bindPopup(popupContent);

        marker.on('click', () => {
          if (onSelect) onSelect(defib.id);
        });

        if (isSelected) {
          marker.openPopup();
          map.panTo([defib.lat!, defib.lng!], { animate: true });
        }
      });

      // Fit bounds if multiple pins exist and none is specifically selected
      if (validItems.length > 1 && !selectedId) {
        const bounds = L.latLngBounds(validItems.map((d) => [d.lat!, d.lng!]));
        if (userLocation) {
          bounds.extend([userLocation.lat, userLocation.lng]);
        }
        map.fitBounds(bounds, { padding: [40, 40], maxZoom: 16 });
      }
    };

    renderPins();
  }, [mode, isMapReady, defibrillators, selectedId, userLocation, onSelect]);

  // Handle User Location Marker in View Mode
  React.useEffect(() => {
    if (mode !== 'view' || !isMapReady || !mapInstanceRef.current) return;

    const updateUserPin = async () => {
      const L = await import('leaflet');
      const map = mapInstanceRef.current;
      if (!map) return;

      if (userMarkerRef.current) {
        userMarkerRef.current.remove();
        userMarkerRef.current = null;
      }

      if (userLocation) {
        const userIcon = L.divIcon({
          className: 'custom-user-pin',
          html: `<div style="background-color: #2563eb; color: white; border-radius: 50%; width: 22px; height: 22px; display: flex; align-items: center; justify-content: center; box-shadow: 0 0 0 6px rgba(37, 99, 235, 0.35); border: 2.5px solid white;"></div>`,
          iconSize: [22, 22],
          iconAnchor: [11, 11],
        });

        const marker = L.marker([userLocation.lat, userLocation.lng], { icon: userIcon }).addTo(map);
        marker.bindPopup('<div style="font-weight: 600; font-size: 12px; color: #1e3a8a;">📍 You Are Here</div>');
        userMarkerRef.current = marker;
      }
    };

    updateUserPin();
  }, [mode, isMapReady, userLocation]);

  // Address Geocoder for Picker
  const handleAddressSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim() || !mapInstanceRef.current) return;
    setIsSearching(true);

    try {
      const query = encodeURIComponent(searchQuery);
      const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${query}&limit=1`);
      const data = await res.json();

      if (data && data.length > 0) {
        const lat = parseFloat(data[0].lat);
        const lng = parseFloat(data[0].lon);
        setCurrentPickerCoords({ lat, lng });
        if (onLocationSelect) onLocationSelect(lat, lng);

        mapInstanceRef.current.flyTo([lat, lng], 17, { animate: true, duration: 1.2 });
      }
    } catch (err) {
      console.error('Failed to geocode address:', err);
    } finally {
      setIsSearching(false);
    }
  };

  return (
    <div className={`relative w-full rounded-xl overflow-hidden border shadow-sm ${className}`}>
      {mode === 'picker' && (
        <div className="absolute top-3 left-3 right-3 z-[1000] flex gap-2">
          <form onSubmit={handleAddressSearch} className="flex-1 flex gap-2">
            <Input
              type="text"
              placeholder="Search postcode or street to center pin..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-background/95 backdrop-blur-md shadow-md h-9 text-xs sm:text-sm"
            />
            <Button type="submit" size="sm" variant="secondary" disabled={isSearching} className="shadow-md shrink-0">
              {isSearching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
            </Button>
          </form>
        </div>
      )}

      <div ref={mapContainerRef} style={{ height }} className="w-full bg-muted" />

      {mode === 'picker' && (
        <div className="p-2.5 bg-muted/80 backdrop-blur-sm border-t flex items-center justify-between text-xs text-muted-foreground">
          <div className="flex items-center gap-1.5 font-medium text-foreground">
            <MapPin className="h-3.5 w-3.5 text-red-600" />
            {currentPickerCoords ? (
              <span>
                Lat: <strong>{currentPickerCoords.lat.toFixed(5)}</strong>, Lng: <strong>{currentPickerCoords.lng.toFixed(5)}</strong>
              </span>
            ) : (
              <span>Click anywhere on the map or drag the pin to place</span>
            )}
          </div>
          <span className="text-[11px] text-muted-foreground hidden sm:inline">Tip: Click or drag to refine spot</span>
        </div>
      )}
    </div>
  );
}
