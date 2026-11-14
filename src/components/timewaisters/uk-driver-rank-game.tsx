'use client';

import React from 'react';
import { ExternalLink, Car } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function UkDriverRankGame() {
  return (
    <div className="flex flex-col gap-3 w-full">
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border bg-card px-4 py-2.5 text-sm">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Car className="h-4 w-4 text-primary shrink-0" />
          <span>
            Assess your UK driving skills, vehicle familiarity, and roadcraft to generate an official-style Driver Rank Certificate.
          </span>
        </div>
        <Button asChild variant="outline" size="sm" className="shrink-0">
          <a
            href="/games/uk-driver-rank.html"
            target="_blank"
            rel="noopener noreferrer"
          >
            <ExternalLink className="mr-1.5 h-3.5 w-3.5" />
            Open Full Screen
          </a>
        </Button>
      </div>

      <div className="w-full overflow-hidden rounded-xl border bg-slate-950 shadow-sm">
        <iframe
          src="/games/uk-driver-rank.html"
          title="UK Driver Rank Calculator & Certificate"
          className="w-full h-[78vh] min-h-[680px] border-0"
          loading="lazy"
        />
      </div>
    </div>
  );
}
