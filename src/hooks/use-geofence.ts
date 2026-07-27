'use client';

import * as React from 'react';
import { useUser, useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, where } from 'firebase/firestore';

export type GeofenceCommunity = {
  id: string;
  name: string;
  boundary?: string; // stringified GeoJSON
};

export function useGeofence(currentCommunityId: string | null, enabled: boolean = true) {
  const { user } = useUser();
  const db = useFirestore();
  const [coords, setCoords] = React.useState<{ latitude: number; longitude: number } | null>(null);
  const [enteredCommunity, setEnteredCommunity] = React.useState<{ id: string; name: string } | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  // Memoized query to fetch all communities with a valid boundary
  const communitiesQuery = useMemoFirebase(() => {
    if (!db) return null;
    return query(collection(db, 'communities'), where('boundary', '!=', null));
  }, [db]);

  const { data: communities } = useCollection<GeofenceCommunity>(communitiesQuery);

  // Helper to check if a coordinate is inside a polygon (ray-casting algorithm)
  const isPointInPolygon = React.useCallback((lat: number, lng: number, polygon: [number, number][]): boolean => {
    let inside = false;
    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
      const xi = polygon[i][0], yi = polygon[i][1]; // lon, lat
      const xj = polygon[j][0], yj = polygon[j][1]; // lon, lat
      const intersect = ((yi > lat) !== (yj > lat))
        && (lng < (xj - xi) * (lat - yi) / (yj - yi) + xi);
      if (intersect) inside = !inside;
    }
    return inside;
  }, []);

  // Check current coordinates against all community boundaries
  const checkGeofences = React.useCallback((latitude: number, longitude: number) => {
    if (!communities || communities.length === 0) return;

    for (const community of communities) {
      if (!community.boundary) continue;

      try {
        const geoJson = JSON.parse(community.boundary);
        const polygon = geoJson?.geometry?.coordinates?.[0];

        if (Array.isArray(polygon)) {
          const isInside = isPointInPolygon(latitude, longitude, polygon as [number, number][]);
          
          if (isInside) {
            // We are inside this community! Check if it's different from the active one
            if (community.id !== currentCommunityId) {
              setEnteredCommunity({ id: community.id, name: community.name });
              return; // Trigger only one community detection at a time
            }
          }
        }
      } catch (err) {
        console.error(`Error parsing boundary for community ${community.id}:`, err);
      }
    }
  }, [communities, currentCommunityId, isPointInPolygon]);

  React.useEffect(() => {
    if (!enabled) {
      setCoords(null);
      return;
    }

    if (typeof window === 'undefined' || !navigator.geolocation) {
      setError('Geolocation is not supported by your browser.');
      return;
    }

    let watchId: number;

    const successHandler = (position: GeolocationPosition) => {
      const { latitude, longitude } = position.coords;
      setCoords({ latitude, longitude });
      checkGeofences(latitude, longitude);
    };

    const errorHandler = (err: GeolocationPositionError) => {
      setError(err.message);
    };

    // Watch position in high-accuracy real-time config
    watchId = navigator.geolocation.watchPosition(successHandler, errorHandler, {
      enableHighAccuracy: true, // High accuracy GPS for real-time movement tracking while driving
      timeout: 10000,           // 10 second timeout
      maximumAge: 5000,         // Cache for 5 seconds so position updates rapidly while travelling
    });

    return () => {
      if (watchId) navigator.geolocation.clearWatch(watchId);
    };
  }, [checkGeofences]);

  return {
    coords,
    enteredCommunity,
    setEnteredCommunity,
    error,
  };
}
