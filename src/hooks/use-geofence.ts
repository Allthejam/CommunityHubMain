'use client';

import * as React from 'react';
import { useUser, useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, where } from 'firebase/firestore';

export type GeofenceCommunity = {
  id: string;
  name: string;
  boundary?: string; // stringified GeoJSON
};

const CACHE_KEY = 'cachedGeofenceCommunities_v1';
const CACHE_EXPIRY_MS = 24 * 60 * 60 * 1000; // 24 hours

export function useGeofence(currentCommunityId: string | null, enabled: boolean = true) {
  const { user } = useUser();
  const db = useFirestore();
  const [coords, setCoords] = React.useState<{ latitude: number; longitude: number } | null>(null);
  const [enteredCommunity, setEnteredCommunity] = React.useState<{ id: string; name: string } | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [shouldFetchQuery, setShouldFetchQuery] = React.useState(false);

  // Initialize cached communities from localStorage to allow zero-network instant startup
  const [cachedCommunities, setCachedCommunities] = React.useState<GeofenceCommunity[]>(() => {
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem(CACHE_KEY);
        if (stored) {
          const parsed = JSON.parse(stored);
          if (parsed?.timestamp && (Date.now() - parsed.timestamp < CACHE_EXPIRY_MS) && Array.isArray(parsed.data)) {
            return parsed.data;
          }
        }
      } catch (e) {}
    }
    return [];
  });

  // Defer database query for geofence boundaries by 3.5s so initial page load gets 100% network bandwidth
  React.useEffect(() => {
    const timer = setTimeout(() => {
      setShouldFetchQuery(true);
    }, 3500);
    return () => clearTimeout(timer);
  }, []);

  // Memoized query to fetch all communities with a valid boundary (deferred)
  const communitiesQuery = useMemoFirebase(() => {
    if (!db || !shouldFetchQuery) return null;
    return query(collection(db, 'communities'), where('boundary', '!=', null));
  }, [db, shouldFetchQuery]);

  const { data: liveCommunities } = useCollection<GeofenceCommunity>(communitiesQuery);

  // Update local cache whenever live communities arrive from database
  React.useEffect(() => {
    if (liveCommunities && liveCommunities.length > 0) {
      setCachedCommunities(liveCommunities);
      if (typeof window !== 'undefined') {
        try {
          localStorage.setItem(CACHE_KEY, JSON.stringify({
            timestamp: Date.now(),
            data: liveCommunities,
          }));
        } catch (e) {}
      }
    }
  }, [liveCommunities]);

  const effectiveCommunities = (liveCommunities && liveCommunities.length > 0) ? liveCommunities : cachedCommunities;

  // Helper to check if a coordinate is inside a polygon (ray-casting algorithm)
  const isPointInPolygon = React.useCallback((lat: number, lng: number, polygon: [number, number][]): boolean => {
    let inside = false;
    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
      const xi = polygon[i][0], yi = polygon[i][1];
      const xj = polygon[j][0], yj = polygon[j][1];
      const intersect = ((yi > lat) !== (yj > lat))
        && (lng < (xj - xi) * (lat - yi) / (yj - yi) + xi);
      if (intersect) inside = !inside;
    }
    return inside;
  }, []);

  // Helper to extract polygon coordinate loops from any valid GeoJSON object/string
  const extractPolygons = React.useCallback((geoJsonStr: string): [number, number][][] => {
    const result: [number, number][][] = [];
    if (!geoJsonStr) return result;
    try {
      const data = typeof geoJsonStr === 'string' ? JSON.parse(geoJsonStr) : geoJsonStr;
      if (data.type === 'FeatureCollection' && Array.isArray(data.features)) {
        data.features.forEach((f: any) => {
          if (f.geometry?.type === 'Polygon' && Array.isArray(f.geometry.coordinates?.[0])) {
            result.push(f.geometry.coordinates[0]);
          } else if (f.geometry?.type === 'MultiPolygon' && Array.isArray(f.geometry.coordinates)) {
            f.geometry.coordinates.forEach((p: any) => {
              if (Array.isArray(p?.[0])) result.push(p[0]);
            });
          }
        });
      } else if (data.type === 'Feature' && data.geometry?.type === 'Polygon' && Array.isArray(data.geometry.coordinates?.[0])) {
        result.push(data.geometry.coordinates[0]);
      } else if (data.type === 'Polygon' && Array.isArray(data.coordinates?.[0])) {
        result.push(data.coordinates[0]);
      } else if (data.geometry?.type === 'Polygon' && Array.isArray(data.geometry.coordinates?.[0])) {
        result.push(data.geometry.coordinates[0]);
      }
    } catch (e) {}
    return result;
  }, []);

  // Check current coordinates against all community boundaries
  const checkGeofences = React.useCallback((latitude: number, longitude: number) => {
    if (!effectiveCommunities || effectiveCommunities.length === 0) return;

    for (const community of effectiveCommunities) {
      if (!community.boundary) continue;

      try {
        const polygons = extractPolygons(community.boundary);

        for (const polygon of polygons) {
          if (Array.isArray(polygon) && polygon.length > 0) {
            const isInside = isPointInPolygon(latitude, longitude, polygon);
            
            if (isInside) {
              let isDismissedInSession = false;
              if (typeof window !== 'undefined') {
                try {
                  const storedDismissed = sessionStorage.getItem('dismissedGeofences');
                  if (storedDismissed) {
                    const list = JSON.parse(storedDismissed);
                    if (Array.isArray(list) && list.includes(community.id)) {
                      isDismissedInSession = true;
                    }
                  }
                } catch (e) {}
              }

              if (community.id !== currentCommunityId && !isDismissedInSession) {
                setEnteredCommunity({ id: community.id, name: community.name });
                return;
              }
            }
          }
        }
      } catch (err) {
        console.error(`Error checking geofence for community ${community.id}:`, err);
      }
    }
  }, [effectiveCommunities, currentCommunityId, isPointInPolygon, extractPolygons]);


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

    watchId = navigator.geolocation.watchPosition(successHandler, errorHandler, {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 5000,
    });

    return () => {
      if (watchId) navigator.geolocation.clearWatch(watchId);
    };
  }, [checkGeofences, enabled]);

  return {
    coords,
    enteredCommunity,
    setEnteredCommunity,
    error,
  };
}
