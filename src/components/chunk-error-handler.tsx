'use client';

import { useEffect } from 'react';

/**
 * Handles ChunkLoadError and deployment version mismatches during client-side navigation.
 * When a new deployment is pushed to production, users who are actively navigating may request
 * chunks from the previous build that no longer exist on the server (resulting in ChunkLoadError).
 * This component catches that error globally and triggers a clean reload to seamlessly fetch the latest version.
 */
export function ChunkErrorHandler() {
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const isChunkError = (message: string) => {
      const lower = message.toLowerCase();
      return (
        lower.includes('chunkloaderror') ||
        lower.includes('loading chunk') ||
        lower.includes('failed to fetch dynamically imported module') ||
        lower.includes('error loading dynamically imported module') ||
        lower.includes('importing a module script failed') ||
        lower.includes('error: application error: a client-side exception')
      );
    };

    const handleReload = () => {
      const lastReload = sessionStorage.getItem('chunk_load_error_reload');
      const now = Date.now();
      // Allow auto-reload once every 20 seconds to prevent reload loops
      if (!lastReload || now - parseInt(lastReload, 10) > 20000) {
        sessionStorage.setItem('chunk_load_error_reload', String(now));
        window.location.reload();
      }
    };

    const onError = (event: ErrorEvent) => {
      if (event?.message && isChunkError(event.message)) {
        event.preventDefault();
        handleReload();
      }
    };

    const onUnhandledRejection = (event: PromiseRejectionEvent) => {
      const reason = event?.reason;
      const message = typeof reason === 'string' ? reason : reason?.message || '';
      if (isChunkError(message)) {
        event.preventDefault();
        handleReload();
      }
    };

    window.addEventListener('error', onError);
    window.addEventListener('unhandledrejection', onUnhandledRejection);

    return () => {
      window.removeEventListener('error', onError);
      window.removeEventListener('unhandledrejection', onUnhandledRejection);
    };
  }, []);

  return null;
}
