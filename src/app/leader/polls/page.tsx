'use client';

import * as React from 'react';
import { Poll, PollCategory, PollStatus } from '@/lib/types/polls';
import { PollCard } from '@/components/polls/poll-card';
import { BarChart3, Users, Activity, CheckCircle2, Plus, X, Loader2 } from 'lucide-react';
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
  addDoc,
  updateDoc,
  deleteDoc,
  arrayUnion,
  query,
  orderBy,
  serverTimestamp,
} from 'firebase/firestore';

// ─── Admin analytics widget ───────────────────────────────────────────────────
function AdminAnalyticsWidget({ polls }: { polls: Poll[] }) {
  const totalVotes = polls.reduce((t, p) => t + p.options.reduce((s, o) => s + o.votes, 0), 0);
  const activeCount = polls.filter((p) => p.status === 'active').length;
  const closedCount = polls.filter((p) => p.status === 'closed').length;
  const draftCount  = polls.filter((p) => p.status === 'draft').length;

  return (
    <div className="bg-white rounded-2xl p-6 shadow-[0_4px_20px_-2px_rgba(0,0,0,0.05)] border border-slate-100 flex flex-col gap-5">
      <div className="flex items-center justify-between border-b border-slate-100 pb-3">
        <div className="flex items-center gap-2">
          <span className="bg-indigo-100 text-indigo-800 p-2 rounded-lg"><BarChart3 className="h-4 w-4" /></span>
          <div>
            <h3 className="font-bold text-slate-800 text-sm">Admin Analytics</h3>
            <p className="text-slate-400 text-[11px]">Full visibility across all polls</p>
          </div>
        </div>
        <span className="bg-indigo-100 text-indigo-700 text-[10px] font-bold px-2 py-0.5 rounded">Admin</span>
      </div>

      <div className="grid grid-cols-2 gap-2 text-center">
        {[
          { label: 'Total Votes', value: totalVotes, color: 'text-emerald-700', Icon: Users },
          { label: 'Active',      value: activeCount, color: 'text-indigo-700',  Icon: Activity },
          { label: 'Finalised',   value: closedCount, color: 'text-slate-600',   Icon: CheckCircle2 },
          { label: 'Drafts',      value: draftCount,  color: 'text-amber-600',   Icon: BarChart3 },
        ].map(({ label, value, color, Icon }) => (
          <div key={label} className="bg-slate-50 rounded-xl p-3 border border-slate-100">
            <Icon className={`h-4 w-4 mx-auto mb-1 ${color}`} />
            <p className={`text-xl font-black ${color}`}>{value}</p>
            <p className="text-[9px] uppercase font-bold tracking-widest text-slate-400 mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      <div>
        <p className="text-xs font-semibold text-slate-600 mb-2">Engagement by Category</p>
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
    </div>
  );
}

// ─── Create poll form ─────────────────────────────────────────────────────────
interface CreatePollFormProps {
  onCreate: (data: Omit<Poll, 'id'>) => Promise<void>;
}

function CreatePollForm({ onCreate }: CreatePollFormProps) {
  const [title, setTitle]       = React.useState('');
  const [desc, setDesc]         = React.useState('');
  const [category, setCategory] = React.useState<PollCategory>('budget');
  const [status, setStatus]     = React.useState<'active' | 'draft'>('active');
  const [options, setOptions]   = React.useState(['', '']);
  const [endDateTime, setEndDateTime] = React.useState('');
  const [saving, setSaving]     = React.useState(false);

  function addOption() { if (options.length < 6) setOptions([...options, '']); }
  function removeOption(i: number) { if (options.length > 2) setOptions(options.filter((_, idx) => idx !== i)); }
  function updateOption(i: number, val: string) { setOptions(options.map((o, idx) => (idx === i ? val : o))); }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const validOptions = options.filter((o) => o.trim());
    if (validOptions.length < 2) return;

    const confirmPublish = window.confirm(
      "⚠️ IMPORTANT: Once published, the consultation name and voting options are permanently locked and cannot be edited. If there is a spelling mistake, you will have to delete this poll and create a new one.\n\nAre you sure you want to publish this consultation?"
    );
    if (!confirmPublish) return;

    setSaving(true);
    const endDate = endDateTime ? new Date(endDateTime) : null;

    await onCreate({
      communityId: '',           // filled in by parent
      title: title.trim(),
      description: desc.trim(),
      category,
      status,
      creator: 'Community Leader',
      createdOn: new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }),
      options: validOptions.map((text, i) => ({ id: `opt-${Date.now()}-${i}`, text, votes: 0 })),
      comments: [],
      votedBy: [],
      endDate: endDate,
    });
    setTitle(''); setDesc(''); setOptions(['', '']); setEndDateTime(''); setSaving(false);
  }

  return (
    <div className="bg-white rounded-2xl p-6 shadow-[0_4px_20px_-2px_rgba(0,0,0,0.05)] border border-slate-100">
      <div className="flex items-center gap-2 mb-4 pb-3 border-b border-slate-100">
        <span className="bg-indigo-100 text-indigo-700 p-2 rounded-lg"><Plus className="h-4 w-4" /></span>
        <div>
          <h3 className="font-bold text-slate-800 text-sm">Create New Consultation</h3>
          <p className="text-slate-400 text-[11px]">Publish a poll instantly to your community</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Consultation Title</label>
          <input
            type="text" value={title} onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Funding for the New Playpark" required
            className="w-full text-sm px-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all"
          />
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Description / Rationale</label>
          <textarea
            value={desc} onChange={(e) => setDesc(e.target.value)} rows={3}
            placeholder="Explain how this decision impacts the community..." required
            className="w-full text-sm px-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all resize-none"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Category</label>
            <select value={category} onChange={(e) => setCategory(e.target.value as PollCategory)}
              className="w-full text-xs px-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500">
              <option value="budget">💰 Budget Spend</option>
              <option value="events">📅 Events / Recaps</option>
              <option value="feedback">💬 Community Feedback</option>
              <option value="regulations">📜 Local Rules</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Initial Status</label>
            <select value={status} onChange={(e) => setStatus(e.target.value as 'active' | 'draft')}
              className="w-full text-xs px-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500">
              <option value="active">Active (Live Voting)</option>
              <option value="draft">Draft (Admin eyes only)</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Select End Date & Time</label>
          <input
            type="datetime-local"
            value={endDateTime}
            onChange={(e) => setEndDateTime(e.target.value)}
            className="w-full text-xs px-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all bg-slate-50 text-slate-700 font-medium"
          />
          <p className="text-[9px] text-slate-400 mt-1 uppercase tracking-wider font-bold">Optional — leave blank to keep open indefinitely</p>
        </div>

        <div>
          <div className="flex justify-between items-center mb-1">
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">Voting Options (2–6)</label>
            {options.length < 6 && (
              <button type="button" onClick={addOption} className="text-emerald-600 hover:text-emerald-700 font-bold text-xs flex items-center gap-1">
                <Plus className="h-3 w-3" /> Add Choice
              </button>
            )}
          </div>
          <div className="space-y-2">
            {options.map((opt, i) => (
              <div key={i} className="flex items-center gap-2">
                <input
                  type="text" value={opt} onChange={(e) => updateOption(i, e.target.value)}
                  placeholder={`Option ${i + 1}`} required
                  className="w-full text-xs px-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
                {options.length > 2 && (
                  <button type="button" onClick={() => removeOption(i)}
                    className="w-6 h-6 flex items-center justify-center text-rose-500 hover:bg-rose-50 rounded-full transition-colors">
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        <button type="submit" disabled={saving}
          className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white rounded-lg text-xs font-extrabold shadow-md transition-all uppercase tracking-wider flex items-center justify-center gap-1.5">
          {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
          {saving ? 'Publishing...' : 'Publish Consultation'}
        </button>
      </form>
    </div>
  );
}

// ─── Delete modal ─────────────────────────────────────────────────────────────
function DeleteModal({ onConfirm, onCancel }: { onConfirm: () => void; onCancel: () => void }) {
  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-xl flex flex-col gap-4">
        <div className="text-rose-500 text-3xl text-center">⚠️</div>
        <div className="text-center">
          <h4 className="font-extrabold text-slate-800">Confirm Delete</h4>
          <p className="text-xs text-slate-500 mt-1">Are you sure? This consultation will be permanently removed.</p>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <button onClick={onCancel} className="py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-lg">Cancel</button>
          <button onClick={onConfirm} className="py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-lg">Delete</button>
        </div>
      </div>
    </div>
  );
}

// Helper to convert Firestore timestamp/Date to string for datetime-local input value
function formatForDateTimeInput(endDate: any): string {
  if (!endDate) return '';
  const date = endDate.toDate ? endDate.toDate() : new Date(endDate);
  if (isNaN(date.getTime())) return '';
  
  const pad = (num: number) => String(num).padStart(2, '0');
  const yyyy = date.getFullYear();
  const MM = pad(date.getMonth() + 1);
  const dd = pad(date.getDate());
  const hh = pad(date.getHours());
  const mm = pad(date.getMinutes());
  
  return `${yyyy}-${MM}-${dd}T${hh}:${mm}`;
}

// ─── Edit Poll Settings modal ──────────────────────────────────────────────────
function EditPollModal({
  currentCategory,
  currentEndDate,
  onConfirm,
  onCancel,
}: {
  currentCategory: PollCategory;
  currentEndDate: any;
  onConfirm: (cat: PollCategory, end: Date | null) => void;
  onCancel: () => void;
}) {
  const [selected, setSelected] = React.useState<PollCategory>(currentCategory);
  const [endDateTime, setEndDateTime] = React.useState<string>(formatForDateTimeInput(currentEndDate));

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-xl flex flex-col gap-4">
        <div>
          <h4 className="font-extrabold text-slate-800 text-center">Edit Consultation Settings</h4>
          <p className="text-xs text-slate-500 mt-1 text-center">
            Adjust the classification category or set/change the closing time.
          </p>
        </div>
        
        <div>
          <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Category</label>
          <select
            value={selected}
            onChange={(e) => setSelected(e.target.value as PollCategory)}
            className="w-full text-sm px-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="budget">💰 Budget Spend</option>
            <option value="events">📅 Events / Recaps</option>
            <option value="feedback">💬 Community Feedback</option>
            <option value="regulations">📜 Local Rules</option>
          </select>
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Select End Date & Time</label>
          <input
            type="datetime-local"
            value={endDateTime}
            onChange={(e) => setEndDateTime(e.target.value)}
            className="w-full text-xs px-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-slate-50 text-slate-700 font-medium"
          />
          <p className="text-[9px] text-slate-400 mt-1 uppercase tracking-wider font-bold">Optional — leave blank to keep open indefinitely</p>
        </div>

        <div className="grid grid-cols-2 gap-3 mt-2">
          <button onClick={onCancel} className="py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-lg">
            Cancel
          </button>
          <button
            onClick={() => onConfirm(selected, endDateTime ? new Date(endDateTime) : null)}
            className="py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg"
          >
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Filter categories ────────────────────────────────────────────────────────
const CATEGORIES: { value: PollCategory | 'all'; label: string }[] = [
  { value: 'all',         label: '✨ All Topics' },
  { value: 'budget',      label: '💰 Budget' },
  { value: 'events',      label: '📅 Events' },
  { value: 'feedback',    label: '💬 Feedback' },
  { value: 'regulations', label: '📜 Rules' },
];

// ─── Main page ─────────────────────────────────────────────────────────────────
export default function LeaderPollsPage() {
  const db = useFirestore();
  const { user } = useUser();
  const [catFilter, setCatFilter]       = React.useState<PollCategory | 'all'>('all');
  const [statusFilter, setStatusFilter] = React.useState<PollStatus | 'all'>('all');
  const [deleteTarget, setDeleteTarget] = React.useState<string | null>(null);
  const [editingCategoryPollId, setEditingCategoryPollId] = React.useState<string | null>(null);

  // Read user's communityId
  const userDocRef = useMemoFirebase(() => ((user && db) ? doc(db, 'users', user.uid) : null), [user, db]);
  const { data: userProfile } = useDoc(userDocRef);
  const communityId: string | null = userProfile?.communityId ?? null;

  // Subscribe to polls
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

  // ── Create ──────────────────────────────────────────────────────────────────
  async function handleCreate(data: Omit<Poll, 'id'>) {
    if (!communityId) return;
    await addDoc(collection(db, 'communities', communityId, 'polls'), {
      ...data,
      communityId,
      createdAt: serverTimestamp(),
    });
  }

  // ── Toggle status ────────────────────────────────────────────────────────────
  async function handleToggleStatus(pollId: string) {
    if (!communityId) return;
    const poll = polls.find((p) => p.id === pollId);
    if (!poll) return;
    const next: PollStatus =
      poll.status === 'active' ? 'closed' : poll.status === 'closed' ? 'active' : 'active';
    await updateDoc(doc(db, 'communities', communityId, 'polls', pollId), { status: next });
  }

  // ── Delete ───────────────────────────────────────────────────────────────────
  async function handleDeleteConfirmed() {
    if (!communityId || !deleteTarget) return;
    await deleteDoc(doc(db, 'communities', communityId, 'polls', deleteTarget));
    setDeleteTarget(null);
  }

  // ── Comment ──────────────────────────────────────────────────────────────────
  async function handleComment(pollId: string, text: string) {
    if (!communityId || !user) return;
    const newComment = {
      id: `com-${Date.now()}`,
      author: userProfile?.displayName || userProfile?.name || user.email || 'Community Leader',
      role: 'Admin' as const,
      text,
      time: 'Just now',
    };
    await updateDoc(doc(db, 'communities', communityId, 'polls', pollId), {
      comments: arrayUnion(newComment),
    });
  }

  // ── Update Poll Settings ──────────────────────────────────────────────────────
  async function handleUpdatePollSettings(newCategory: PollCategory, newEndDate: Date | null) {
    if (!communityId || !editingCategoryPollId) return;
    await updateDoc(doc(db, 'communities', communityId, 'polls', editingCategoryPollId), {
      category: newCategory,
      endDate: newEndDate,
    });
    setEditingCategoryPollId(null);
  }

  // ── Filter ───────────────────────────────────────────────────────────────────
  const visible = polls.filter((p) => {
    if (catFilter !== 'all' && p.category !== catFilter) return false;
    if (statusFilter !== 'all' && p.status !== statusFilter) return false;
    return true;
  });

  return (
    <div className="min-h-screen bg-slate-50 -m-4 sm:-m-6 lg:-m-8">
      {deleteTarget && <DeleteModal onConfirm={handleDeleteConfirmed} onCancel={() => setDeleteTarget(null)} />}
      
      {editingCategoryPollId && (
        <EditPollModal
          currentCategory={polls.find((p) => p.id === editingCategoryPollId)?.category || 'feedback'}
          currentEndDate={polls.find((p) => p.id === editingCategoryPollId)?.endDate || null}
          onConfirm={handleUpdatePollSettings}
          onCancel={() => setEditingCategoryPollId(null)}
        />
      )}

      {/* Page header */}
      <div className="bg-white border-b border-slate-100 px-4 py-8 shadow-sm">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center gap-2 mb-1">
            <div className="bg-indigo-100 text-indigo-800 w-9 h-9 rounded-xl flex items-center justify-center text-lg shadow-sm">🗳️</div>
            <span className="text-xs uppercase tracking-wider text-indigo-700 font-bold">Back Office — Polls</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight">
            Community Consultation Manager
          </h1>
          <p className="text-slate-500 text-sm mt-0.5">
            Create, manage, and analyse all community polls from one place.
          </p>
        </div>
      </div>

      {/* Body */}
      <div className="max-w-7xl mx-auto px-4 py-8 grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Sidebar */}
        <aside className="lg:col-span-4 flex flex-col gap-6">
          <div className="bg-gradient-to-br from-indigo-700 to-slate-900 text-white rounded-2xl p-6 shadow-md relative overflow-hidden">
            <div className="absolute -right-8 -bottom-8 opacity-10 text-8xl">🛡️</div>
            <h2 className="text-lg font-bold mb-2 flex items-center gap-2">
              <Activity className="h-5 w-5" /> Admin Workspace
            </h2>
            <p className="text-indigo-100 text-xs leading-relaxed mb-4">
              You have full control to draft proposals, publish consultations, freeze voting, and
              review resident engagement statistics across all community polls.
            </p>
            <span className="inline-block bg-white/20 text-[11px] font-bold py-1 px-3 rounded-full border border-white/20 uppercase tracking-wider">
              Community Leader
            </span>
          </div>

          {communityId && <CreatePollForm onCreate={handleCreate} />}
          <AdminAnalyticsWidget polls={polls} />
        </aside>

        {/* Main polls list */}
        <section className="lg:col-span-8 flex flex-col gap-6">
          {/* Filter bar */}
          <div className="bg-white p-3 rounded-2xl shadow-[0_4px_20px_-2px_rgba(0,0,0,0.05)] border border-slate-100 flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-3">
            <div className="flex gap-1 overflow-x-auto whitespace-nowrap pb-1 sm:pb-0">
              {CATEGORIES.map(({ value, label }) => (
                <button key={value} onClick={() => setCatFilter(value)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold tracking-wide transition-all border ${
                    catFilter === value
                      ? 'bg-indigo-100 text-indigo-800 border-indigo-200'
                      : 'text-slate-500 border-transparent hover:bg-slate-100'
                  }`}>
                  {label}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider hidden sm:inline">Status:</span>
              <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as PollStatus | 'all')}
                className="bg-slate-50 border border-slate-200 text-slate-700 text-xs font-bold rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-500">
                <option value="all">Show All</option>
                <option value="active">Active Consultations</option>
                <option value="closed">Closed Consultations</option>
                <option value="draft">My Drafts</option>
              </select>
            </div>
          </div>

          {/* Loading */}
          {isLoading && (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
            </div>
          )}

          {/* Poll cards */}
          {!isLoading && (
            visible.length === 0 ? (
              <div className="bg-white rounded-2xl p-12 text-center shadow-sm border border-slate-100">
                <div className="text-5xl mb-4">🔍</div>
                <h3 className="text-lg font-bold text-slate-700 mb-1">No Consultations Found</h3>
                <p className="text-slate-400 text-sm max-w-sm mx-auto">
                  Adjust your filters or create a new consultation using the form on the left.
                </p>
                <button onClick={() => { setCatFilter('all'); setStatusFilter('all'); }}
                  className="mt-4 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-extrabold transition-all">
                  Reset Filters
                </button>
              </div>
            ) : (
              <div className="space-y-6">
                {visible.map((poll) => (
                  <PollCard
                    key={poll.id}
                    poll={poll}
                    hasVoted={false}
                    isAdmin={true}
                    onVote={() => {}}
                    onComment={handleComment}
                    onToggleStatus={handleToggleStatus}
                    onDelete={setDeleteTarget}
                    onEditCategory={setEditingCategoryPollId}
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
