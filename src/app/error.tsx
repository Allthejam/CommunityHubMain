'use client';

import React, { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardTitle, CardDescription } from '@/components/ui/card';
import { AlertCircle, RotateCcw, Home } from 'lucide-react';
import Link from 'next/link';

export default function RootError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('[Application Client Error]:', error);

    // Auto-recover if it's a chunk load or dynamic import error caused by a recent deployment
    const msg = error?.message?.toLowerCase() || '';
    if (
      msg.includes('chunkloaderror') ||
      msg.includes('loading chunk') ||
      msg.includes('failed to fetch dynamically imported module') ||
      msg.includes('error loading dynamically imported module') ||
      msg.includes('importing a module script failed')
    ) {
      const lastReload = sessionStorage.getItem('chunk_load_error_reload');
      const now = Date.now();
      if (!lastReload || now - parseInt(lastReload, 10) > 20000) {
        sessionStorage.setItem('chunk_load_error_reload', String(now));
        window.location.reload();
      }
    }
  }, [error]);

  return (
    <div className="min-h-[60vh] flex items-center justify-center p-4">
      <Card className="max-w-md w-full border-border/80 shadow-lg text-center p-6">
        <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-rose-500/10 flex items-center justify-center text-rose-500">
          <AlertCircle className="w-7 h-7" />
        </div>

        <CardTitle className="text-xl font-bold mb-2">We Hit a Brief Hiccup</CardTitle>
        <CardDescription className="text-sm text-muted-foreground mb-6">
          A new version of Community Hub was deployed or your connection briefly dipped. A quick refresh will load the latest version.
        </CardDescription>

        <div className="flex flex-col sm:flex-row gap-2.5 justify-center">
          <Button
            onClick={() => window.location.reload()}
            className="gap-2 font-semibold bg-primary text-primary-foreground"
          >
            <RotateCcw className="w-4 h-4" />
            Refresh Page
          </Button>

          <Button variant="outline" asChild className="gap-2">
            <Link href="/home">
              <Home className="w-4 h-4" />
              Return Home
            </Link>
          </Button>
        </div>
      </Card>
    </div>
  );
}
