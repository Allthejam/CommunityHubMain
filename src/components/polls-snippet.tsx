'use client';

import * as React from 'react';
import Link from 'next/link';
import { collection, query, orderBy, limit, where } from 'firebase/firestore';
import { useFirestore, useMemoFirebase, useCollection } from '@/firebase';
import { Poll } from '@/lib/types/polls';
import { BarChart3, ArrowRight, CheckCircle2, Trophy, Loader2 } from 'lucide-react';

interface PollsSnippetProps {
  communityId: string;
}

function PulseDot() {
  return (
    <span className="relative flex h-2 w-2 shrink-0">
      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
      <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
    </span>
  );
}

// Mini result bar shown for closed polls
function MiniResultBar({ poll }: { poll: Poll }) {
  const totalVotes = poll.options.reduce((s, o) => s + o.votes, 0);
  const winner = totalVotes > 0 ? [...poll.options].sort((a, b) => b.votes - a.votes)[0] : null;
  const pct = winner && totalVotes > 0 ? Math.round((winner.votes / totalVotes) * 100) : 0;

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-[11px]">
        <span className="font-semibold text-slate-700 flex items-center gap-1 truncate max-w-[70%]">
          <Trophy className="h-3 w-3 text-amber-500 shrink-0" />
          {winner?.text ?? 'No votes yet'}
        </span>
        <span className="font-extrabold text-slate-800 ml-2">{pct}%</span>
      </div>
      <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
        <div
          className="bg-emerald-500 h-full rounded-full transition-all duration-700"
          style={{ width: `${pct}%` }}
        />
      </div>
      <p className="text-[10px] text-slate-400">{totalVotes} total votes</p>
    </div>
  );
}

export function PollsSnippet({ communityId }: PollsSnippetProps) {
  const db = useFirestore();

  // Active polls — grab up to 2
  const activeQuery = useMemoFirebase(
    () =>
      communityId
        ? query(
            collection(db, 'communities', communityId, 'polls'),
            where('status', '==', 'active'),
            orderBy('createdAt', 'desc'),
            limit(2)
          )
        : null,
    [db, communityId]
  );

  // Closed polls — grab up to 2 for results
  const closedQuery = useMemoFirebase(
    () =>
      communityId
        ? query(
            collection(db, 'communities', communityId, 'polls'),
            where('status', '==', 'closed'),
            orderBy('createdAt', 'desc'),
            limit(2)
          )
        : null,
    [db, communityId]
  );

  const { data: activePolls, isLoading: loadingActive } = useCollection<Poll>(activeQuery);
  const { data: closedPolls, isLoading: loadingClosed } = useCollection<Poll>(closedQuery);

  const isLoading = loadingActive || loadingClosed;
  const active = (activePolls ?? []) as Poll[];
  const closed = (closedPolls ?? []) as Poll[];

  // Don't render the card at all if there's nothing to show
  if (!isLoading && active.length === 0 && closed.length === 0) return null;

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-[0_4px_20px_-2px_rgba(0,0,0,0.06)] overflow-hidden">

      {/* Header */}
      <div className="bg-gradient-to-r from-emerald-600 to-teal-700 px-5 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="bg-white/20 rounded-xl p-2">
            <BarChart3 className="h-4 w-4 text-white" />
          </div>
          <div>
            <h2 className="text-white font-extrabold text-sm tracking-tight">Have Your Say!</h2>
            <p className="text-emerald-100 text-[11px]">Community consultations &amp; results</p>
          </div>
        </div>
        <Link
          href="/polls"
          className="flex items-center gap-1 text-[11px] font-bold text-white bg-white/20 hover:bg-white/30 px-3 py-1.5 rounded-full transition-all"
        >
          See All <ArrowRight className="h-3 w-3" />
        </Link>
      </div>

      <div className="p-5 space-y-5">
        {isLoading && (
          <div className="flex items-center justify-center py-6">
            <Loader2 className="h-5 w-5 animate-spin text-emerald-500" />
          </div>
        )}

        {/* Active polls */}
        {!isLoading && active.length > 0 && (
          <div>
            <p className="text-[10px] font-extrabold uppercase tracking-widest text-emerald-700 mb-3 flex items-center gap-1.5">
              <PulseDot /> Open Consultations
            </p>
            <div className="space-y-2">
              {active.map((poll) => {
                const totalVotes = poll.options.reduce((s, o) => s + o.votes, 0);
                return (
                  <Link
                    key={poll.id}
                    href="/polls"
                    className="flex items-center justify-between bg-slate-50 hover:bg-emerald-50 border border-slate-100 hover:border-emerald-200 rounded-xl px-4 py-3 transition-all group"
                  >
                    <div className="flex-1 min-w-0 mr-3">
                      <p className="text-xs font-bold text-slate-800 truncate">{poll.title}</p>
                      <p className="text-[10px] text-slate-400 mt-0.5">{totalVotes} vote{totalVotes !== 1 ? 's' : ''} cast so far</p>
                    </div>
                    <span className="text-[10px] font-extrabold text-emerald-700 bg-emerald-100 border border-emerald-200 px-2.5 py-1 rounded-full whitespace-nowrap shrink-0 group-hover:bg-emerald-600 group-hover:text-white transition-all">
                      Vote Now →
                    </span>
                  </Link>
                );
              })}
            </div>
          </div>
        )}

        {/* Divider between sections if both exist */}
        {!isLoading && active.length > 0 && closed.length > 0 && (
          <div className="border-t border-slate-100" />
        )}

        {/* Recent results */}
        {!isLoading && closed.length > 0 && (
          <div>
            <p className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400 mb-3 flex items-center gap-1.5">
              <CheckCircle2 className="h-3 w-3" /> Recent Results
            </p>
            <div className="space-y-4">
              {closed.map((poll) => (
                <div key={poll.id} className="space-y-1.5">
                  <p className="text-xs font-bold text-slate-700 line-clamp-1">{poll.title}</p>
                  <MiniResultBar poll={poll} />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* CTA footer */}
        <div className="pt-1">
          <Link
            href="/polls"
            className="flex items-center justify-center gap-2 w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-extrabold transition-all shadow-sm"
          >
            <BarChart3 className="h-3.5 w-3.5" />
            Go to Community Polls &amp; Have Your Say
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </div>
    </div>
  );
}
