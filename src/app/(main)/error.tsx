'use client';

import React, { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardTitle, CardDescription } from '@/components/ui/card';
import { AlertCircle, RotateCcw, Home } from 'lucide-react';
import Link from 'next/link';

export default function MainSectionError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('[Main Section Error]:', error);

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
    <div className="container max-w-lg mx-auto py-12 px-4 flex items-center justify-center min-h-[50vh]">
      <Card className="w-full border-border/80 shadow-md text-center p-6 sm:p-8">
        <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-amber-500/10 flex items-center justify-center text-amber-600 dark:text-amber-400">
          <AlertCircle className="w-7 h-7" />
        </div>

        <CardTitle className="text-xl font-bold mb-2">Notice Something Missing?</CardTitle>
        <CardDescription className="text-sm text-muted-foreground mb-6 leading-relaxed">
          A new Community Hub update was just published. A quick refresh will load the latest page seamlessly.
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
              Go to Home
            </Link>
          </Button>
        </div>
      </Card>
    </div>
  );
}
