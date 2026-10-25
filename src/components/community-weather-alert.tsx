'use client';

import * as React from 'react';
import Link from 'next/link';
import {
  CloudLightning,
  Wind,
  CloudRain,
  Sun,
  AlertTriangle,
  ShieldAlert,
  CheckCircle2,
  ExternalLink,
  Thermometer,
  Droplets,
  PhoneCall,
  Loader2,
  Info,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';

export interface WeatherAlertData {
  success: boolean;
  communityName: string;
  coordinates: { lat: number; lng: number };
  alertLevel: 'clear' | 'yellow' | 'amber' | 'red';
  alertHeadline: string;
  alertDescription: string;
  externalUrl: string;
  metWarnings?: {
    title: string;
    description: string;
    link: string;
    level: 'yellow' | 'amber' | 'red';
  }[];
  current: {
    tempC: number;
    feelsLikeC: number;
    windSpeedMph: number;
    windGustsMph: number;
    peakGustsMph: number;
    precipMm: number;
    dailyPrecipMm: number;
    condition: string;
    weatherCode: number;
  };
  updatedAt: string;
}

function getCenterFromBoundary(boundary?: any): { lat: number; lng: number } | null {
  if (!boundary) return null;
  try {
    const geo = typeof boundary === 'string' ? JSON.parse(boundary) : boundary;
    const coords: [number, number][] = [];
    const collect = (arr: any) => {
      if (!Array.isArray(arr)) return;
      if (arr.length >= 2 && typeof arr[0] === 'number' && typeof arr[1] === 'number') {
        coords.push([arr[0], arr[1]]);
      } else {
        arr.forEach(collect);
      }
    };
    if (geo.type === 'FeatureCollection' && Array.isArray(geo.features)) {
      geo.features.forEach((f: any) => collect(f.geometry?.coordinates));
    } else if (geo.type === 'Feature') {
      collect(geo.geometry?.coordinates);
    } else {
      collect(geo.coordinates);
    }
    if (coords.length === 0) return null;
    let minLng = Infinity,
      maxLng = -Infinity,
      minLat = Infinity,
      maxLat = -Infinity;
    coords.forEach(([lng, lat]) => {
      if (lng < minLng) minLng = lng;
      if (lng > maxLng) maxLng = lng;
      if (lat < minLat) minLat = lat;
      if (lat > maxLat) maxLat = lat;
    });
    if (minLat === Infinity) return null;
    return {
      lat: (minLat + maxLat) / 2,
      lng: (minLng + maxLng) / 2,
    };
  } catch {
    return null;
  }
}

export function CommunityWeatherAlertStrip({
  communityId,
  communityName,
  boundary,
  demoPrefix = '',
}: {
  communityId?: string | null;
  communityName: string;
  boundary?: any;
  demoPrefix?: string;
}) {
  const [weather, setWeather] = React.useState<WeatherAlertData | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [isModalOpen, setIsModalOpen] = React.useState(false);

  React.useEffect(() => {
    let cancelled = false;

    const loadWeather = async () => {
      setLoading(true);
      try {
        const center = getCenterFromBoundary(boundary);
        const params = new URLSearchParams();
        params.set('name', communityName || 'Grantown-on-Spey');
        if (center) {
          params.set('lat', String(center.lat));
          params.set('lng', String(center.lng));
        }

        const res = await fetch(`/api/weather?${params.toString()}`);
        if (res.ok) {
          const data = await res.json();
          if (!cancelled && data.success) {
            setWeather(data);
            setLoading(false);
            return;
          }
        }
      } catch (err) {
        console.warn('Weather API fetch fallback:', err);
      }

      // Direct client-side fallback for mobile PWA / offline-cached routes
      try {
        const center = getCenterFromBoundary(boundary) || { lat: 57.329, lng: -3.609 };
        const directUrl = `https://api.open-meteo.com/v1/forecast?latitude=${center.lat}&longitude=${center.lng}&current=temperature_2m,apparent_temperature,precipitation,weather_code,wind_speed_10m,wind_gusts_10m&daily=weather_code,precipitation_sum,wind_gusts_10m_max&wind_speed_unit=mph&timezone=Europe%2FLondon&forecast_days=1`;
        const directRes = await fetch(directUrl);
        if (directRes.ok && !cancelled) {
          const d = await directRes.json();
          const cur = d.current || {};
          const daily = d.daily || {};
          const tempC = Math.round(cur.temperature_2m ?? 8);
          const feelsLikeC = Math.round(cur.apparent_temperature ?? tempC);
          const windSpeedMph = Math.round(cur.wind_speed_10m ?? 0);
          const windGustsMph = Math.round(cur.wind_gusts_10m ?? windSpeedMph);
          const peakGustsMph = Math.max(windGustsMph, Math.round(daily.wind_gusts_10m_max?.[0] ?? windGustsMph));
          const dailyPrecipMm = Number(daily.precipitation_sum?.[0] ?? cur.precipitation ?? 0);

          let alertLevel: 'clear' | 'yellow' | 'amber' | 'red' = 'clear';
          let alertHeadline = 'Weather Normal — No Active Warnings';
          if (peakGustsMph >= 60) {
            alertLevel = 'red';
            alertHeadline = `Severe Storm Warning — Gusts up to ${peakGustsMph} mph`;
          } else if (peakGustsMph >= 45 || dailyPrecipMm >= 25) {
            alertLevel = 'amber';
            alertHeadline = `Storm & High Wind Alert — Gusts ${peakGustsMph} mph`;
          } else if (peakGustsMph >= 32 || windSpeedMph >= 22 || dailyPrecipMm >= 12) {
            alertLevel = 'yellow';
            alertHeadline = `Weather Advisory: High Winds (Gusts ${peakGustsMph} mph)`;
          }

          setWeather({
            success: true,
            communityName: communityName || 'Home Community',
            coordinates: center,
            alertLevel,
            alertHeadline,
            alertDescription: `Live conditions in ${communityName}: ${tempC}°C, winds ${windSpeedMph} mph with gusts up to ${peakGustsMph} mph.`,
            externalUrl: 'https://www.metoffice.gov.uk/weather/warnings-and-advice/uk-warnings',
            current: {
              tempC,
              feelsLikeC,
              windSpeedMph,
              windGustsMph,
              peakGustsMph,
              precipMm: Number(cur.precipitation ?? 0),
              dailyPrecipMm,
              condition: peakGustsMph >= 35 ? 'High Winds / Stormy' : 'Local Conditions',
              weatherCode: Number(cur.weather_code ?? 0),
            },
            updatedAt: new Date().toISOString(),
          });
        }
      } catch {
        // Ignore fallback error
      }

      if (!cancelled) {
        setLoading(false);
      }
    };

    loadWeather();
    // Refresh every 10 minutes
    const interval = setInterval(loadWeather, 10 * 60 * 1000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [communityName, boundary]);

  if (loading) {
    return (
      <div className="w-full p-2.5 rounded-xl border bg-muted/30 flex items-center gap-2 text-xs text-muted-foreground">
        <Loader2 className="h-3.5 w-3.5 animate-spin shrink-0" />
        <span>Checking live local weather & storm warnings...</span>
      </div>
    );
  }

  if (!weather) return null;

  const isRed = weather.alertLevel === 'red';
  const isAmber = weather.alertLevel === 'amber';
  const isYellow = weather.alertLevel === 'yellow';
  const hasAlert = isRed || isAmber || isYellow;

  const stripClasses = isRed
    ? 'bg-red-50 dark:bg-red-950/30 border-red-500/60 text-red-950 dark:text-red-100'
    : isAmber
    ? 'bg-amber-50 dark:bg-amber-950/30 border-amber-500/60 text-amber-950 dark:text-amber-100'
    : isYellow
    ? 'bg-yellow-50 dark:bg-yellow-950/30 border-yellow-500/60 text-yellow-950 dark:text-yellow-100'
    : 'bg-emerald-50/70 dark:bg-emerald-950/20 border-emerald-500/30 text-slate-900 dark:text-slate-100';

  const badgeClasses = isRed
    ? 'bg-red-600 text-white'
    : isAmber
    ? 'bg-amber-500 text-slate-950 font-black'
    : isYellow
    ? 'bg-yellow-400 text-slate-950 font-black'
    : 'bg-emerald-600 text-white';

  const statusLabel = isRed
    ? '🔴 Severe Weather Warning'
    : isAmber
    ? '🟠 Storm / Weather Warning'
    : isYellow
    ? '🟡 Weather Advisory'
    : '🟢 Weather: All Clear';

  return (
    <>
      <div
        className={cn(
          'w-full p-3 rounded-xl border-2 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs shadow-xs transition-all',
          stripClasses
        )}
      >
        <div className="space-y-1 min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <Badge className={cn('text-[10px] uppercase tracking-wider px-2 py-0.5', badgeClasses)}>
              {statusLabel}
            </Badge>
            <span className="font-mono font-bold text-[11px] opacity-90">
              {weather.current.tempC}°C • {weather.current.condition} • Gusts {weather.current.peakGustsMph} mph
            </span>
          </div>
          <p className="font-bold text-xs sm:text-sm truncate flex items-center gap-1.5">
            {hasAlert ? (
              <CloudLightning className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0" />
            ) : (
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
            )}
            <span className="truncate">{weather.alertHeadline}</span>
          </p>
        </div>

        <Button
          type="button"
          size="sm"
          onClick={() => setIsModalOpen(true)}
          className={cn(
            'h-8 px-3 text-xs font-bold shrink-0 gap-1.5 shadow-xs',
            isRed
              ? 'bg-red-600 hover:bg-red-500 text-white'
              : isAmber
              ? 'bg-amber-500 hover:bg-amber-600 text-slate-950'
              : isYellow
              ? 'bg-yellow-400 hover:bg-yellow-500 text-slate-950'
              : 'bg-emerald-600 hover:bg-emerald-500 text-white'
          )}
        >
          <Info className="h-3.5 w-3.5" />
          {hasAlert ? 'View Weather Notice' : 'View Weather'}
        </Button>
      </div>

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-lg bg-card border text-card-foreground">
          <DialogHeader>
            <div className="flex items-center gap-2 mb-1">
              <Badge className={cn('text-[10px] uppercase tracking-wider', badgeClasses)}>
                {statusLabel}
              </Badge>
              <Badge variant="outline" className="text-[10px] font-semibold">
                UK Met Office / Live Telemetry
              </Badge>
            </div>
            <DialogTitle className="text-lg font-black flex items-center gap-2">
              {hasAlert ? (
                <CloudLightning className="h-5 w-5 text-amber-500 shrink-0" />
              ) : (
                <Sun className="h-5 w-5 text-emerald-500 shrink-0" />
              )}
              {weather.alertHeadline}
            </DialogTitle>
            <DialogDescription className="text-xs font-medium">
              Live local weather & severe weather warning feed for <strong>{communityName}</strong>
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2 text-xs">
            {/* Notice Description Box */}
            <div
              className={cn(
                'p-4 rounded-xl border-2 space-y-2 leading-relaxed font-medium text-sm',
                stripClasses
              )}
            >
              <p>{weather.alertDescription}</p>
            </div>

            {/* Live Weather Telemetry Grid */}
            <div className="grid grid-cols-3 gap-2.5">
              <div className="p-3 rounded-xl border bg-muted/30 space-y-1 text-center">
                <div className="flex items-center justify-center gap-1 text-muted-foreground font-bold text-[10px] uppercase">
                  <Thermometer className="h-3.5 w-3.5 text-primary" /> Temperature
                </div>
                <p className="text-lg font-black text-foreground">{weather.current.tempC}°C</p>
                <p className="text-[10px] text-muted-foreground">Feels like {weather.current.feelsLikeC}°C</p>
              </div>

              <div className="p-3 rounded-xl border bg-muted/30 space-y-1 text-center">
                <div className="flex items-center justify-center gap-1 text-muted-foreground font-bold text-[10px] uppercase">
                  <Wind className="h-3.5 w-3.5 text-amber-500" /> Wind & Gusts
                </div>
                <p className="text-lg font-black text-foreground">{weather.current.windSpeedMph} mph</p>
                <p className="text-[10px] font-bold text-amber-600 dark:text-amber-400">
                  Peak Gusts: {weather.current.peakGustsMph} mph
                </p>
              </div>

              <div className="p-3 rounded-xl border bg-muted/30 space-y-1 text-center">
                <div className="flex items-center justify-center gap-1 text-muted-foreground font-bold text-[10px] uppercase">
                  <Droplets className="h-3.5 w-3.5 text-sky-500" /> Conditions
                </div>
                <p className="text-sm font-black text-foreground pt-0.5 truncate">{weather.current.condition}</p>
                <p className="text-[10px] text-muted-foreground">
                  Rain today: {weather.current.dailyPrecipMm.toFixed(1)} mm
                </p>
              </div>
            </div>

            {/* Active Met Office Regional Warnings (if any) */}
            {weather.metWarnings && weather.metWarnings.length > 0 && (
              <div className="space-y-2">
                <p className="font-black text-xs uppercase tracking-wider text-muted-foreground">
                  Official Met Office Regional Warnings:
                </p>
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {weather.metWarnings.map((w, idx) => (
                    <div key={idx} className="p-3 rounded-xl border bg-muted/20 space-y-1">
                      <p className="font-bold text-foreground">{w.title}</p>
                      <p className="text-xs text-muted-foreground">{w.description}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Safety & Outage Reminder during Storm */}
            {hasAlert && (
              <div className="p-3 rounded-xl border bg-muted/30 flex items-start gap-2.5 text-xs">
                <PhoneCall className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                <div className="space-y-0.5">
                  <p className="font-bold text-foreground">Storm & Power Cut Preparedness</p>
                  <p className="text-muted-foreground">
                    If you experience a power cut or spot damaged power lines during high winds, call <strong>105</strong> (free national power outage helpline). For life-threatening emergencies call <strong>999</strong>.
                  </p>
                </div>
              </div>
            )}
          </div>

          <DialogFooter className="flex flex-col sm:flex-row gap-2 sm:justify-between">
            <Button asChild variant="outline" size="sm" className="text-xs font-bold gap-1.5">
              <a href={weather.externalUrl} target="_blank" rel="noopener noreferrer">
                Met Office UK Warnings <ExternalLink className="h-3.5 w-3.5" />
              </a>
            </Button>

            {communityId && (
              <Button asChild size="sm" className="text-xs font-bold gap-1.5">
                <Link
                  href={`${demoPrefix}/community/${communityId}/emergency`}
                  onClick={() => setIsModalOpen(false)}
                >
                  <ShieldAlert className="h-3.5 w-3.5" />
                  Community Emergency Portal
                </Link>
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
