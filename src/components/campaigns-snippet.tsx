'use client';

import * as React from 'react';
import Link from 'next/link';
import { collection } from 'firebase/firestore';
import { useFirestore, useMemoFirebase, useCollection } from '@/firebase';
import { Petition } from '@/lib/types/petitions';
import { Target, ArrowRight, Loader2, Bus, Building2, Trees, Stethoscope, Megaphone, HelpCircle } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface CampaignsSnippetProps {
  communityId: string;
}

function PulseDot() {
  return (
    <span className="relative flex h-2 w-2 shrink-0">
      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
      <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500" />
    </span>
  );
}

export function CampaignsSnippet({ communityId }: CampaignsSnippetProps) {
  const db = useFirestore();

  // Query petitions subcollection directly
  const petitionsQuery = useMemoFirebase(
    () => (db && communityId) ? collection(db, 'communities', communityId, 'petitions') : null,
    [db, communityId]
  );
  const { data: rawPetitions, isLoading } = useCollection<any>(petitionsQuery);

  const petitions: Petition[] = React.useMemo(() => {
    if (!rawPetitions) return [];
    return rawPetitions.map((p: any) => ({
      id: p.id,
      communityId: p.communityId || communityId,
      title: p.title || p.name || p.question || p.headline || p.topic || 'Untitled Petition',
      description: p.description || p.summary || p.content || p.details || 'No description provided.',
      category: p.category || 'council',
      status: p.status || 'active',
      authorName: p.authorName || p.creatorName || p.author || 'Community Leader',
      authorRole: p.authorRole || 'Leader',
      targetSignatures: p.targetSignatures || p.target || p.goal || 1000,
      signaturesCount: p.signaturesCount || p.currentSignatures || (p.signedUserIds?.length || 0),
      signedUserIds: p.signedUserIds || p.signatures || [],
      isPinned: Boolean(p.isPinned),
      createdAt: p.createdAt
    }));
  }, [rawPetitions, communityId]);

  // Display top 3 active petitions
  const visiblePetitions = petitions.filter(p => p.status === 'active').slice(0, 3);

  return (
    <section className="w-full my-6">
      <div className="w-full bg-gradient-to-br from-amber-500/10 via-orange-500/10 to-amber-600/15 dark:from-amber-950/40 dark:via-orange-950/30 dark:to-amber-900/30 border border-amber-300/70 dark:border-amber-800/70 rounded-2xl p-5 md:p-6 shadow-xs flex flex-col justify-between gap-5">
        {/* Full Width Card Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-amber-200/60 dark:border-amber-800/50 pb-4">
          <div className="flex items-start sm:items-center gap-3">
            <div className="p-2.5 rounded-xl bg-amber-500 text-white shadow-sm shrink-0">
              <Target className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg md:text-xl font-extrabold tracking-tight text-foreground">
                  Local Action & Petitions
                </h2>
                <Badge variant="outline" className="bg-amber-100 text-amber-900 border-amber-300 text-[10px] font-bold">
                  Civic Action
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5 max-w-2xl leading-relaxed">
                Support petitions set out by community leaders to protect bus routes, retain local bank branches, and preserve essential neighborhood services.
              </p>
            </div>
          </div>

          <Button asChild size="sm" className="bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs shadow-xs shrink-0 self-start sm:self-center">
            <Link href="/petitions" className="flex items-center gap-1.5">
              <span>View All Petitions</span>
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>

        {/* Content Section */}
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-amber-600" />
          </div>
        ) : visiblePetitions.length === 0 ? (
          <div className="py-4 text-center space-y-1">
            <p className="text-xs font-semibold text-foreground">No active community petitions at present.</p>
            <p className="text-[11px] text-muted-foreground">Community leaders set out local petitions here when council plans or service changes affect your ward.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {visiblePetitions.map((p) => {
              const percent = Math.min(100, Math.round(((p.signaturesCount || 0) / (p.targetSignatures || 1000)) * 100));

              return (
                <div
                  key={p.id}
                  className="bg-card/90 dark:bg-card/70 backdrop-blur-xs rounded-xl p-4 border border-amber-200/50 dark:border-amber-900/40 shadow-2xs hover:shadow-sm transition-all flex flex-col justify-between space-y-3"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <Badge variant="outline" className="text-[10px] font-bold px-2 py-0.5 bg-amber-100 text-amber-900 border-amber-300">
                        <span>🏛️ {p.category}</span>
                      </Badge>
                      <span className="flex items-center gap-1 text-[10px] font-bold text-amber-700 dark:text-amber-400">
                        <PulseDot /> Active
                      </span>
                    </div>

                    <h3 className="font-bold text-xs md:text-sm text-foreground line-clamp-2 leading-snug">
                      {p.title}
                    </h3>
                    <p className="text-[11px] text-muted-foreground line-clamp-2 leading-relaxed">
                      {p.description}
                    </p>
                  </div>

                  {/* Signature Progress */}
                  <div className="space-y-1.5 pt-2 border-t border-amber-200/40 dark:border-amber-900/30">
                    <div className="flex justify-between items-center text-[11px] font-semibold">
                      <span className="text-muted-foreground">Signatures</span>
                      <span className="text-amber-700 dark:text-amber-400 font-bold">{p.signaturesCount} / {p.targetSignatures}</span>
                    </div>
                    <Progress value={percent} className="h-1.5 bg-amber-500/20" />
                    <div className="flex justify-between items-center text-[10px] font-bold pt-0.5">
                      <span className="text-muted-foreground">{percent}% Supported</span>
                      <Link href="/petitions" className="text-amber-700 dark:text-amber-400 hover:underline">
                        Sign Petition ✍️
                      </Link>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
