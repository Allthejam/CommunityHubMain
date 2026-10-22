'use client';

import React from 'react';
import Link from 'next/link';
import { useOnlineStatus } from '@/hooks/use-online-status';
import { WifiOff, Sparkles, ArrowRight, Layers } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function OfflineIndicatorBanner() {
  const isOnline = useOnlineStatus();

  if (isOnline) {
    return null;
  }

  return (
    <div className="bg-amber-500/15 border-b border-amber-500/30 text-amber-200 px-4 py-2.5 backdrop-blur-md sticky top-0 z-50 flex items-center justify-between text-xs sm:text-sm">
      <div className="flex items-center gap-2 max-w-2xl">
        <WifiOff className="h-4 w-4 text-amber-400 shrink-0 animate-pulse" />
        <span>
          <strong className="text-amber-100 font-semibold">Offline Showcase Mode Active.</strong>{' '}
          Showing locally cached content and offline showcase assets.
        </span>
      </div>
      <div className="flex items-center gap-2">
        <Link href="/offline">
          <Button
            size="sm"
            variant="outline"
            className="h-7 text-[11px] bg-amber-500/20 border-amber-500/40 hover:bg-amber-500/30 text-amber-100 font-medium flex items-center gap-1"
          >
            <Layers className="h-3 w-3" />
            <span>Showcase Hub</span>
            <ArrowRight className="h-3 w-3" />
          </Button>
        </Link>
      </div>
    </div>
  );
}
