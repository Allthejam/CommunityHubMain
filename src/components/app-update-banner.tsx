'use client';

import * as React from 'react';
import { RefreshCw, X, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';

const CHECK_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes
const MIN_CHECK_GAP_MS = 60 * 1000; // Throttle focus checks to at most once per minute

export function AppUpdateBanner() {
  const [updateAvailable, setUpdateAvailable] = React.useState(false);
  const [dismissed, setDismissed] = React.useState(false);
  const [isReloading, setIsReloading] = React.useState(false);

  const initialBuildIdRef = React.useRef<string | null>(null);
  const lastCheckRef = React.useRef<number>(0);

  const checkForUpdate = React.useCallback(async (force = false) => {
    if (typeof window === 'undefined' || !navigator.onLine) return;

    const now = Date.now();
    if (!force && now - lastCheckRef.current < MIN_CHECK_GAP_MS) return;
    lastCheckRef.current = now;

    try {
      const res = await fetch(`/api/version?t=${now}`, { cache: 'no-store' });
      if (!res.ok) return;
      const data = await res.json();
      const latestBuildId = data?.buildId;
      if (!latestBuildId || latestBuildId === 'dev') return;

      if (!initialBuildIdRef.current) {
        initialBuildIdRef.current = latestBuildId;
        return;
      }

      if (latestBuildId !== initialBuildIdRef.current) {
        setUpdateAvailable(true);
        setDismissed(false);
      }
    } catch {
      // Ignore transient network errors
    }
  }, []);

  React.useEffect(() => {
    checkForUpdate(true);

    const interval = setInterval(() => {
      checkForUpdate(false);
    }, CHECK_INTERVAL_MS);

    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        checkForUpdate(false);
      }
    };

    const handleOnline = () => {
      checkForUpdate(false);
    };

    document.addEventListener('visibilitychange', handleVisibility);
    window.addEventListener('online', handleOnline);

    // Also listen for a new Service Worker taking control after initial load
    let hadController = typeof navigator !== 'undefined' && Boolean(navigator.serviceWorker?.controller);
    const handleControllerChange = () => {
      if (hadController) {
        setUpdateAvailable(true);
        setDismissed(false);
      } else {
        hadController = true;
      }
    };

    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('controllerchange', handleControllerChange);
    }

    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('online', handleOnline);
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.removeEventListener('controllerchange', handleControllerChange);
      }
    };
  }, [checkForUpdate]);

  const handleRefresh = async () => {
    setIsReloading(true);
    try {
      if ('caches' in window) {
        const keys = await caches.keys();
        await Promise.all(keys.map((k) => caches.delete(k)));
      }
      if ('serviceWorker' in navigator) {
        const reg = await navigator.serviceWorker.getRegistration();
        await reg?.update();
      }
    } catch {
      // Proceed with reload even if cache cleanup fails
    }
    window.location.reload();
  };

  if (!updateAvailable || dismissed) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed bottom-4 right-4 left-4 sm:left-auto sm:max-w-sm z-50 rounded-xl border border-primary/30 bg-background/95 backdrop-blur-md shadow-xl p-4 flex items-start gap-3 animate-in fade-in slide-in-from-bottom-4"
    >
      <div className="h-9 w-9 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0 mt-0.5">
        <Sparkles className="h-4 w-4" />
      </div>
      <div className="flex-1 min-w-0 space-y-2">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="text-sm font-bold leading-tight">Update Available</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              A new version of Community Hub is ready. Refresh to load the latest updates.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setDismissed(true)}
            aria-label="Dismiss update notification"
            className="text-muted-foreground hover:text-foreground p-0.5 rounded"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" onClick={handleRefresh} disabled={isReloading} className="h-8 text-xs font-semibold">
            <RefreshCw className={`mr-1.5 h-3.5 w-3.5 ${isReloading ? 'animate-spin' : ''}`} />
            {isReloading ? 'Refreshing...' : 'Refresh Now'}
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setDismissed(true)} className="h-8 text-xs">
            Later
          </Button>
        </div>
      </div>
    </div>
  );
}
