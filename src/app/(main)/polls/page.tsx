'use client';

import * as React from 'react';
import { Poll, PollCategory, PollStatus } from '@/lib/types/polls';
import { PollCard } from '@/components/polls/poll-card';
import { BarChart3, Users, Activity, CheckCircle2, Loader2 } from 'lucide-react';
import {
  useFirestore,
  useUser,
  useMemoFirebase,
  useCollection,
  useDoc,
} from '@/firebase';
import {
  collection,
  doc,
  updateDoc,
  arrayUnion,
  query,
  orderBy,
  serverTimestamp,
} from 'firebase/firestore';

// ─── Analytics sidebar ────────────────────────────────────────────────────────
function AnalyticsWidget({ polls }: { polls: Poll[] }) {
  const totalVotes = polls.reduce((t, p) => t + p.options.reduce((s, o) => s + o.votes, 0), 0);
  const activeCount = polls.filter((p) => p.status === 'active').length;
  const closedCount = polls.filter((p) => p.status === 'closed').length;

  return (
    <div className="bg-white rounded-2xl p-6 shadow-[0_4px_20px_-2px_rgba(0,0,0,0.05)] border border-slate-100 flex flex-col gap-5">
      <div className="flex items-center justify-between border-b border-slate-100 pb-3">
        <div className="flex items-center gap-2">
          <span className="bg-emerald-100 text-emerald-800 p-2 rounded-lg"><BarChart3 className="h-4 w-4" /></span>
          <div>
            <h3 className="font-bold text-slate-800 text-sm">Ward Analytics</h3>
            <p className="text-slate-400 text-[11px]">Real-time engagement breakdown</p>
          </div>
        </div>
        <span className="bg-slate-100 text-slate-600 text-[10px] font-bold px-2 py-0.5 rounded">Live</span>
      </div>

      <div className="grid grid-cols-3 gap-2 text-center">
        {[
          { label: 'Total Votes', value: totalVotes, color: 'text-emerald-700', Icon: Users },
          { label: 'Active Polls', value: activeCount, color: 'text-indigo-700', Icon: Activity },
          { label: 'Finalised', value: closedCount, color: 'text-slate-600', Icon: CheckCircle2 },
        ].map(({ label, value, color, Icon }) => (
          <div key={label} className="bg-slate-50 rounded-xl p-3 border border-slate-100">
            <Icon className={`h-4 w-4 mx-auto mb-1 ${color}`} />
            <p className={`text-xl font-black ${color}`}>{value}</p>
            <p className="text-[9px] uppercase font-bold tracking-widest text-slate-400 mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      <div>
        <p className="text-xs font-semibold text-slate-600 mb-2">Voter Engagement by Category</p>
        <div className="bg-slate-50 p-3 rounded-xl flex items-center justify-center">
          <svg className="w-36 h-36 -rotate-90" viewBox="0 0 100 100">
            <circle cx="50" cy="50" r="40" fill="transparent" stroke="#f1f5f9" strokeWidth="12" />
            <circle cx="50" cy="50" r="40" fill="transparent" stroke="#10b981" strokeWidth="12" strokeDasharray="251.2" strokeDashoffset="113.0" />
            <circle cx="50" cy="50" r="40" fill="transparent" stroke="#6366f1" strokeWidth="12" strokeDasharray="251.2" strokeDashoffset="188.4" transform="rotate(162 50 50)" />
            <circle cx="50" cy="50" r="40" fill="transparent" stroke="#eab308" strokeWidth="12" strokeDasharray="251.2" strokeDashoffset="200.9" transform="rotate(270 50 50)" />
          </svg>
        </div>
        <div className="grid grid-cols-3 gap-1 mt-3 text-[10px] font-bold text-center">
          <span className="text-emerald-600 bg-emerald-50 px-1 py-0.5 rounded border border-emerald-100">💰 Budget 45%</span>
          <span className="text-indigo-600 bg-indigo-50 px-1 py-0.5 rounded border border-indigo-100">📅 Events 30%</span>
          <span className="text-yellow-600 bg-yellow-50 px-1 py-0.5 rounded border border-yellow-100">📜 Other 25%</span>
        </div>
      </div>

      <div className="border-t border-slate-100 pt-4">
        <p className="text-xs font-bold text-slate-500 mb-2">Resident Turnout by Demographics</p>
        {[
          { label: 'Age 18–34', pct: 58, color: 'bg-indigo-500' },
          { label: 'Age 35–54', pct: 84, color: 'bg-emerald-500' },
          { label: 'Age 55+',   pct: 72, color: 'bg-yellow-500' },
        ].map(({ label, pct, color }) => (
          <div key={label} className="mb-1.5 text-[11px]">
            <div className="flex justify-between mb-0.5 font-medium text-slate-600">
              <span>{label}</span><span>{pct}% response rate</span>
            </div>
            <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
              <div className={`${color} h-full rounded-full`} style={{ width: `${pct}%` }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Filter bar ───────────────────────────────────────────────────────────────
const CATEGORIES: { value: PollCategory | 'all'; label: string }[] = [
  { value: 'all',         label: '✨ All Topics' },
  { value: 'budget',      label: '💰 Budget' },
  { value: 'events',      label: '📅 Events' },
  { value: 'feedback',    label: '💬 Feedback' },
  { value: 'regulations', label: '📜 Rules' },
];

// ─── Main page ─────────────────────────────────────────────────────────────────
export default function PollsPage() {
  const db = useFirestore();
  const { user } = useUser();
  const [catFilter, setCatFilter]       = React.useState<PollCategory | 'all'>('all');
  const [statusFilter, setStatusFilter] = React.useState<PollStatus | 'all'>('active');

  // Read the user's communityId from their Firestore profile
  const userDocRef = useMemoFirebase(() => ((user && db) ? doc(db, 'users', user.uid) : null), [user, db]);
  const { data: userProfile } = useDoc(userDocRef);
  const communityId: string | null = userProfile?.communityId ?? null;

  // Subscribe to the community's polls collection
  const pollsQuery = useMemoFirebase(
    () => (db && communityId) ? query(collection(db, 'communities', communityId, 'polls'), orderBy('createdAt', 'desc')) : null,
    [db, communityId]
  );
  const { data: rawPolls, isLoading } = useCollection<Poll>(pollsQuery);

  const polls: Poll[] = (rawPolls ?? []).map((p: any) => {
    const title = p.title || p.question || 'Untitled Consultation';
    const description = p.description || p.question || 'No description provided.';
    const category = p.category || 'feedback';
    let status = p.status || 'closed';
    if (status === 'archived') {
      status = 'closed';
    }
    const creator = p.creator || 'Community Leader';
    let createdOn = p.createdOn;
    if (!createdOn && p.createdAt) {
      try {
        const date = p.createdAt.toDate ? p.createdAt.toDate() : new Date(p.createdAt);
        createdOn = date.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
      } catch (e) {
        createdOn = 'Unknown Date';
      }
    }
    createdOn = createdOn || 'Unknown Date';

    const options = (p.options || []).map((opt: any, index: number) => ({
      id: opt.id || `opt-${index}`,
      text: opt.text || 'Option',
      votes: typeof opt.votes === 'number' ? opt.votes : 0
    }));

    const comments = p.comments || [];

    return {
      ...p,
      title,
      description,
      category,
      status,
      creator,
      createdOn,
      options,
      comments
    };
  }) as Poll[];

  // ── Voting ──────────────────────────────────────────────────────────────────
  async function handleVote(pollId: string, optId: string) {
    if (!communityId || !user) return;
    const poll = polls.find((p) => p.id === pollId);
    if (!poll || poll.votedBy?.includes(user.uid)) return;

    const updatedOptions = poll.options.map((o) =>
      o.id === optId ? { ...o, votes: o.votes + 1 } : o
    );

    const pollRef = doc(db, 'communities', communityId, 'polls', pollId);
    await updateDoc(pollRef, {
      options: updatedOptions,
      votedBy: arrayUnion(user.uid),
    });
  }

  // ── Commenting ──────────────────────────────────────────────────────────────
  async function handleComment(pollId: string, text: string) {
    if (!communityId || !user) return;
    const poll = polls.find((p) => p.id === pollId);
    if (!poll) return;

    const newComment = {
      id: `com-${Date.now()}`,
      author: userProfile?.displayName || userProfile?.name || user.email || 'Resident',
      role: 'Resident' as const,
      text,
      time: 'Just now',
    };

    const pollRef = doc(db, 'communities', communityId, 'polls', pollId);
    await updateDoc(pollRef, {
      comments: arrayUnion(newComment),
    });
  }

  // ── Filter ──────────────────────────────────────────────────────────────────
  const visible = polls.filter((p) => {
    if (p.status === 'draft') return false;
    if (catFilter !== 'all' && p.category !== catFilter) return false;
    if (statusFilter !== 'all' && p.status !== statusFilter) return false;
    return true;
  });

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Page header */}
      <div className="bg-white border-b border-slate-100 px-4 py-8 shadow-sm">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center gap-2 mb-1">
            <div className="bg-emerald-100 text-emerald-800 w-9 h-9 rounded-xl flex items-center justify-center text-lg shadow-sm">🗳️</div>
            <span className="text-xs uppercase tracking-wider text-emerald-700 font-bold">Community Polls</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight">
            Neighbourhood Consultation Centre
          </h1>
          <p className="text-slate-500 text-sm mt-0.5">
            Make your voice heard on local topics, funding decisions, and community events.
          </p>
        </div>
      </div>

      {/* Body */}
      <div className="max-w-7xl mx-auto px-4 py-8 grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Sidebar */}
        <aside className="lg:col-span-4 flex flex-col gap-6">
          <div className="bg-gradient-to-br from-emerald-600 to-teal-800 text-white rounded-2xl p-6 shadow-md relative overflow-hidden">
            <div className="absolute -right-8 -bottom-8 opacity-10 text-8xl">🗳️</div>
            <h2 className="text-lg font-bold mb-2 flex items-center gap-2">
              <Users className="h-5 w-5" /> Resident Mode
            </h2>
            <p className="text-emerald-50 text-xs leading-relaxed mb-4">
              Review local proposals, cast your anonymous vote, and join neighbour discussions. Your
              feedback directly shapes council funding and community schedules.
            </p>
            <span className="inline-block bg-white/20 backdrop-blur-sm text-[11px] font-bold py-1 px-3 rounded-full border border-white/20 uppercase tracking-wider">
              Community Citizen
            </span>
          </div>
          <AnalyticsWidget polls={polls} />
        </aside>

        {/* Main poll list */}
        <section className="lg:col-span-8 flex flex-col gap-6">
          {/* Filter bar */}
          <div className="bg-white p-3 rounded-2xl shadow-[0_4px_20px_-2px_rgba(0,0,0,0.05)] border border-slate-100 flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-3">
            <div className="flex gap-1 overflow-x-auto whitespace-nowrap pb-1 sm:pb-0">
              {CATEGORIES.map(({ value, label }) => (
                <button
                  key={value}
                  onClick={() => setCatFilter(value)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold tracking-wide transition-all border ${
                    catFilter === value
                      ? 'bg-emerald-100 text-emerald-800 border-emerald-200'
                      : 'text-slate-500 border-transparent hover:bg-slate-100'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider hidden sm:inline">Status:</span>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as PollStatus | 'all')}
                className="bg-slate-50 border border-slate-200 text-slate-700 text-xs font-bold rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="all">Show All</option>
                <option value="active">Active Consultations</option>
                <option value="closed">Closed Consultations</option>
              </select>
            </div>
          </div>

          {/* Loading */}
          {isLoading && (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
            </div>
          )}

          {/* No community */}
          {!isLoading && !communityId && (
            <div className="bg-white rounded-2xl p-12 text-center shadow-sm border border-slate-100">
              <div className="text-5xl mb-4">🏘️</div>
              <h3 className="text-lg font-bold text-slate-700 mb-1">No Community Found</h3>
              <p className="text-slate-400 text-sm max-w-sm mx-auto">
                You need to be a member of a community to view polls.
              </p>
            </div>
          )}

          {/* Poll cards */}
          {!isLoading && communityId && (
            visible.length === 0 ? (
              <div className="bg-white rounded-2xl p-12 text-center shadow-sm border border-slate-100">
                <div className="text-5xl mb-4">🔍</div>
                <h3 className="text-lg font-bold text-slate-700 mb-1">No Consultations Found</h3>
                <p className="text-slate-400 text-sm max-w-sm mx-auto">
                  Try changing your filters or check back later for new community polls.
                </p>
                <button
                  onClick={() => { setCatFilter('all'); setStatusFilter('active'); }}
                  className="mt-4 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-extrabold transition-all"
                >
                  Reset Filters
                </button>
              </div>
            ) : (
              <div className="space-y-6">
                {visible.map((poll) => (
                  <PollCard
                    key={poll.id}
                    poll={poll}
                    hasVoted={!!(user && poll.votedBy?.includes(user.uid))}
                    isAdmin={false}
                    onVote={handleVote}
                    onComment={handleComment}
                  />
                ))}
              </div>
            )
          )}
        </section>
      </div>
    </div>
  );
}
