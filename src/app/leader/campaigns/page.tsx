'use client';

import * as React from 'react';
import { Campaign, CampaignCategory, CampaignStatus } from '@/lib/types/campaigns';
import { CampaignCard } from '@/components/campaigns/campaign-card';
import { Target, Users, Flame, Trophy, Loader2, Plus, Bus, Building2, Trees, Stethoscope, Megaphone, HelpCircle, Activity, CheckCircle2, Pin, MoreVertical, Pencil, Trash2, X } from 'lucide-react';
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
  query,
  orderBy,
  serverTimestamp,
} from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

// ─── Admin analytics widget (Calculates 100% Dynamic Real Data) ─────────────────
function AdminCampaignAnalyticsWidget({ campaigns }: { campaigns: Campaign[] }) {
  const totalSignatures = campaigns.reduce((t, c) => t + (c.currentSignatures || 0), 0);
  const activeCount = campaigns.filter((c) => c.status === 'active').length;
  const victoriesCount = campaigns.filter((c) => c.status === 'victory').length;
  const draftCount  = campaigns.filter((c) => c.status === 'draft').length;
  const totalCampaigns = campaigns.length;

  // Real Category Counts & Percentages
  const transportCount = campaigns.filter(c => c.category === 'transport').length;
  const bankingCount = campaigns.filter(c => c.category === 'banking_services').length;
  const environmentCount = campaigns.filter(c => c.category === 'environment').length;

  const transportPct = totalCampaigns > 0 ? Math.round((transportCount / totalCampaigns) * 100) : 0;
  const bankingPct = totalCampaigns > 0 ? Math.round((bankingCount / totalCampaigns) * 100) : 0;
  const environmentPct = totalCampaigns > 0 ? Math.round((environmentCount / totalCampaigns) * 100) : 0;

  // Dynamic Donut SVG Calculations (Circumference = 251.2)
  const CIRCUMFERENCE = 251.2;
  const offset1 = CIRCUMFERENCE * (1 - transportPct / 100);
  const offset2 = CIRCUMFERENCE * (1 - (transportPct + bankingPct) / 100);
  const offset3 = CIRCUMFERENCE * (1 - (transportPct + bankingPct + environmentPct) / 100);

  return (
    <div className="bg-white rounded-2xl p-6 shadow-[0_4px_20px_-2px_rgba(0,0,0,0.05)] border border-slate-100 flex flex-col gap-5">
      <div className="flex items-center justify-between border-b border-slate-100 pb-3">
        <div className="flex items-center gap-2">
          <span className="bg-amber-100 text-amber-800 p-2 rounded-lg"><Target className="h-4 w-4" /></span>
          <div>
            <h3 className="font-bold text-slate-800 text-sm">Campaign Analytics</h3>
            <p className="text-slate-400 text-[11px]">Full visibility across all campaigns</p>
          </div>
        </div>
        <span className="bg-amber-100 text-amber-700 text-[10px] font-bold px-2 py-0.5 rounded">Admin</span>
      </div>

      <div className="grid grid-cols-2 gap-2 text-center">
        {[
          { label: 'Total Signed',  value: totalSignatures, color: 'text-amber-700',   Icon: Users },
          { label: 'Active',        value: activeCount,     color: 'text-emerald-700', Icon: Flame },
          { label: 'Victories',     value: victoriesCount, color: 'text-purple-700',  Icon: Trophy },
          { label: 'Drafts',        value: draftCount,      color: 'text-slate-600',   Icon: Activity },
        ].map(({ label, value, color, Icon }) => (
          <div key={label} className="bg-slate-50 rounded-xl p-3 border border-slate-100">
            <Icon className={`h-4 w-4 mx-auto mb-1 ${color}`} />
            <p className={`text-xl font-black ${color}`}>{value}</p>
            <p className="text-[9px] uppercase font-bold tracking-widest text-slate-400 mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      <div>
        <p className="text-xs font-semibold text-slate-600 mb-2">Campaign Action Breakdown</p>
        <div className="bg-slate-50 p-3 rounded-xl flex items-center justify-center">
          <svg className="w-36 h-36 -rotate-90" viewBox="0 0 100 100">
            {/* Background ring */}
            <circle cx="50" cy="50" r="40" fill="transparent" stroke="#f1f5f9" strokeWidth="12" />
            
            {/* Transport Segment (Amber) */}
            {transportPct > 0 && (
              <circle 
                cx="50" cy="50" r="40" 
                fill="transparent" 
                stroke="#d97706" 
                strokeWidth="12" 
                strokeDasharray="251.2" 
                strokeDashoffset={offset1} 
              />
            )}

            {/* Banking Segment (Indigo) */}
            {bankingPct > 0 && (
              <circle 
                cx="50" cy="50" r="40" 
                fill="transparent" 
                stroke="#4f46e5" 
                strokeWidth="12" 
                strokeDasharray="251.2" 
                strokeDashoffset={offset2} 
                transform={`rotate(${transportPct * 3.6} 50 50)`} 
              />
            )}

            {/* Environment Segment (Emerald) */}
            {environmentPct > 0 && (
              <circle 
                cx="50" cy="50" r="40" 
                fill="transparent" 
                stroke="#10b981" 
                strokeWidth="12" 
                strokeDasharray="251.2" 
                strokeDashoffset={offset3} 
                transform={`rotate(${(transportPct + bankingPct) * 3.6} 50 50)`} 
              />
            )}
          </svg>
        </div>

        <div className="grid grid-cols-3 gap-1 mt-3 text-[10px] font-bold text-center">
          <span className="text-amber-700 bg-amber-50 px-1 py-0.5 rounded border border-amber-100">🚌 Transport {transportPct}%</span>
          <span className="text-indigo-700 bg-indigo-50 px-1 py-0.5 rounded border border-indigo-100">🏦 Banking {bankingPct}%</span>
          <span className="text-emerald-700 bg-emerald-50 px-1 py-0.5 rounded border border-emerald-100">🌳 Parks {environmentPct}%</span>
        </div>
      </div>
    </div>
  );
}

// ─── Create Campaign Form Widget (Sidebar Form matching Polls) ─────────────────
interface CreateCampaignFormProps {
  onCreate: (data: Omit<Campaign, 'id'>) => Promise<void>;
}

function CreateCampaignForm({ onCreate }: CreateCampaignFormProps) {
  const [title, setTitle] = React.useState('');
  const [description, setDescription] = React.useState('');
  const [category, setCategory] = React.useState<CampaignCategory>('transport');
  const [targetSignatures, setTargetSignatures] = React.useState(1000);
  const [status, setStatus] = React.useState<'active' | 'draft'>('active');
  const [organizerName, setOrganizerName] = React.useState('');
  const [saving, setSaving] = React.useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || !description.trim()) return;

    setSaving(true);
    try {
      await onCreate({
        communityId: '',
        title: title.trim(),
        description: description.trim(),
        category,
        status,
        targetSignatures: Number(targetSignatures),
        currentSignatures: 0,
        creatorName: organizerName || 'Community Leadership',
        signedUserIds: [],
        isPinned: true,
      });

      setTitle('');
      setDescription('');
      setCategory('transport');
      setTargetSignatures(1000);
      setOrganizerName('');
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-2xl p-6 shadow-[0_4px_20px_-2px_rgba(0,0,0,0.05)] border border-slate-100 flex flex-col gap-4">
      <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
        <span className="bg-amber-100 text-amber-800 p-2 rounded-lg"><Plus className="h-4 w-4" /></span>
        <div>
          <h3 className="font-bold text-slate-800 text-sm">Launch New Campaign</h3>
          <p className="text-slate-400 text-[11px]">Set out local action petitions for residents</p>
        </div>
      </div>

      <div className="space-y-1">
        <label className="text-xs font-bold text-slate-700">Campaign Title</label>
        <Input
          placeholder="e.g. Save Our Local Bus Route 42 / Stop Bank Closure"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
          className="rounded-xl text-xs bg-slate-50"
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <label className="text-xs font-bold text-slate-700">Category</label>
          <Select value={category} onValueChange={(val) => setCategory(val as CampaignCategory)}>
            <SelectTrigger className="rounded-xl text-xs bg-slate-50">
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="transport">🚌 Bus & Transport</SelectItem>
              <SelectItem value="banking_services">🏦 Banking & Services</SelectItem>
              <SelectItem value="community_facilities">🏛️ Facilities & Libraries</SelectItem>
              <SelectItem value="environment">🌳 Environment & Parks</SelectItem>
              <SelectItem value="healthcare">🏥 Healthcare & NHS</SelectItem>
              <SelectItem value="other">📣 Other Action</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1">
          <label className="text-xs font-bold text-slate-700">Target Signatures</label>
          <Input
            type="number"
            min={50}
            value={targetSignatures}
            onChange={(e) => setTargetSignatures(Number(e.target.value))}
            required
            className="rounded-xl text-xs bg-slate-50"
          />
        </div>
      </div>

      <div className="space-y-1">
        <label className="text-xs font-bold text-slate-700">Organizer / Authority Name</label>
        <Input
          placeholder="e.g. Town Council / Residents Action Group"
          value={organizerName}
          onChange={(e) => setOrganizerName(e.target.value)}
          className="rounded-xl text-xs bg-slate-50"
        />
      </div>

      <div className="space-y-1">
        <label className="text-xs font-bold text-slate-700">Full Cause Details</label>
        <Textarea
          placeholder="Explain why this service or facility is under threat and what action is required..."
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={4}
          required
          className="rounded-xl text-xs bg-slate-50 leading-relaxed"
        />
      </div>

      <div className="flex items-center justify-between pt-1">
        <span className="text-xs font-bold text-slate-500">Initial Status:</span>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setStatus('active')}
            className={`px-3 py-1 rounded-lg text-xs font-bold transition-all border ${
              status === 'active'
                ? 'bg-amber-100 text-amber-800 border-amber-300'
                : 'text-slate-400 border-slate-200'
            }`}
          >
            🔥 Publish Active
          </button>
          <button
            type="button"
            onClick={() => setStatus('draft')}
            className={`px-3 py-1 rounded-lg text-xs font-bold transition-all border ${
              status === 'draft'
                ? 'bg-slate-200 text-slate-700 border-slate-300'
                : 'text-slate-400 border-slate-200'
            }`}
          >
            Save Draft
          </button>
        </div>
      </div>

      <Button
        type="submit"
        disabled={saving}
        className="w-full bg-amber-600 hover:bg-amber-700 text-white rounded-xl font-bold text-xs py-2.5 shadow-sm mt-1"
      >
        {saving ? <Loader2 className="h-4 w-4 animate-spin mx-auto" /> : 'Create Local Campaign'}
      </Button>
    </form>
  );
}

// ─── Filter Categories ────────────────────────────────────────────────────────
const CATEGORIES: { value: CampaignCategory | 'all'; label: string }[] = [
  { value: 'all',                  label: '✨ All Topics' },
  { value: 'transport',            label: '🚌 Transport' },
  { value: 'banking_services',     label: '🏦 Services & Banking' },
  { value: 'community_facilities', label: '🏛️ Facilities' },
  { value: 'environment',          label: '🌳 Environment' },
  { value: 'healthcare',           label: '🏥 Healthcare' },
];

// ─── Main Leader Campaigns Management Page ───────────────────────────────────
export default function LeaderCampaignsPage() {
  const db = useFirestore();
  const { user } = useUser();
  const { toast } = useToast();

  const [catFilter, setCatFilter] = React.useState<CampaignCategory | 'all'>('all');
  const [statusFilter, setStatusFilter] = React.useState<CampaignStatus | 'all'>('all');
  const [deleteTargetId, setDeleteTargetId] = React.useState<string | null>(null);

  // Read user's communityId
  const userDocRef = useMemoFirebase(() => ((user && db) ? doc(db, 'users', user.uid) : null), [user, db]);
  const { data: userProfile } = useDoc(userDocRef);
  const communityId: string | null = userProfile?.primaryHomeCommunityId || userProfile?.homeCommunityId || (userProfile as any)?.communityId || null;

  // Subscribe to petitions (without restrictive orderBy to safely load all existing docs)
  const campaignsQuery = useMemoFirebase(
    () => (db && communityId) ? collection(db, 'communities', communityId, 'petitions') : null,
    [db, communityId]
  );
  const { data: rawCampaigns, isLoading } = useCollection<any>(campaignsQuery);

  const campaigns: Campaign[] = React.useMemo(() => {
    if (!rawCampaigns) return [];
    return rawCampaigns.map((c: any) => ({
      id: c.id,
      communityId: c.communityId || communityId,
      title: c.title || c.name || c.question || c.headline || c.topic || 'Untitled Petition',
      description: c.description || c.summary || c.content || c.details || 'No description provided.',
      category: (c.category as CampaignCategory) || 'transport',
      status: (c.status as CampaignStatus) || 'active',
      creatorName: c.creatorName || c.author || c.creator || c.userName || 'Community Leader',
      targetSignatures: c.targetSignatures || c.target || c.targetAmount || c.goal || 1000,
      currentSignatures: c.currentSignatures || c.signaturesCount || (c.signedUserIds?.length || 0),
      signedUserIds: c.signedUserIds || c.signatures || c.supporters || [],
      isPinned: Boolean(c.isPinned),
      createdAt: c.createdAt
    }));
  }, [rawCampaigns, communityId]);

  // Create Campaign Action
  async function handleCreate(data: Omit<Campaign, 'id'>) {
    if (!communityId || !db) return;
    await addDoc(collection(db, 'communities', communityId, 'petitions'), {
      ...data,
      communityId,
      createdAt: serverTimestamp(),
    });
    toast({ title: "Petition Created", description: "Your local petition is now live for residents." });
  }

  // Update Status Action
  async function handleUpdateStatus(campaignId: string, nextStatus: CampaignStatus) {
    if (!communityId || !db) return;
    await updateDoc(doc(db, 'communities', communityId, 'petitions', campaignId), { status: nextStatus });
    toast({ title: "Status Updated", description: `Petition set to ${nextStatus}.` });
  }

  // Pin / Unpin Action
  async function handleTogglePin(campaign: Campaign) {
    if (!communityId || !db) return;
    await updateDoc(doc(db, 'communities', communityId, 'petitions', campaign.id), { isPinned: !campaign.isPinned });
    toast({ title: campaign.isPinned ? "Unpinned" : "Pinned to Noticeboard", description: campaign.isPinned ? "Removed from noticeboard highlight." : "Pinned to Town Square Noticeboard." });
  }

  // Delete Action
  async function handleDeleteConfirmed() {
    if (!communityId || !db || !deleteTargetId) return;
    await deleteDoc(doc(db, 'communities', communityId, 'petitions', deleteTargetId));
    setDeleteTargetId(null);
    toast({ title: "Petition Deleted", description: "The petition has been removed." });
  }

  // Filter visible
  const visible = campaigns.filter((c) => {
    if (catFilter !== 'all' && c.category !== catFilter) return false;
    if (statusFilter !== 'all' && c.status !== statusFilter) return false;
    return true;
  });

  return (
    <div className="min-h-screen bg-slate-50 pb-20">
      {/* Page Header (Matching Back Office Polls header) */}
      <div className="bg-white border-b border-slate-100 px-4 py-8 shadow-sm">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center gap-2 mb-1">
            <div className="bg-amber-100 text-amber-800 w-9 h-9 rounded-xl flex items-center justify-center text-lg shadow-sm">📣</div>
            <span className="text-xs uppercase tracking-wider text-amber-700 font-bold">Back Office — Administration</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight">
            Local Petitions & Action Manager
          </h1>
          <p className="text-slate-500 text-sm mt-0.5">
            Create, manage, and monitor local petitions and community action across your community.
          </p>
        </div>
      </div>

      {/* Body Grid (Matching Back Office Polls col-span-4 / col-span-8 layout) */}
      <div className="max-w-7xl mx-auto px-4 py-8 grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Sidebar */}
        <aside className="lg:col-span-4 flex flex-col gap-6">
          <div className="bg-gradient-to-br from-amber-700 via-orange-800 to-slate-900 text-white rounded-2xl p-6 shadow-md relative overflow-hidden">
            <div className="absolute -right-8 -bottom-8 opacity-10 text-8xl">🛡️</div>
            <h2 className="text-lg font-bold mb-2 flex items-center gap-2">
              <Activity className="h-5 w-5" /> Admin Petitions Workspace
            </h2>
            <p className="text-amber-100 text-xs leading-relaxed mb-4">
              Set out local action petitions for your ward — save bus routes, protect bank branches, preserve libraries, or launch local campaigns.
            </p>
            <span className="inline-block bg-white/20 text-[11px] font-bold py-1 px-3 rounded-full border border-white/20 uppercase tracking-wider">
              Community Leader
            </span>
          </div>

          {communityId && <CreateCampaignForm onCreate={handleCreate} />}
          <AdminCampaignAnalyticsWidget campaigns={campaigns} />
        </aside>

        {/* Main List Section */}
        <section className="lg:col-span-8 flex flex-col gap-6">
          {/* Filter Bar (Matching Back Office Polls filter bar) */}
          <div className="bg-white p-3 rounded-2xl shadow-[0_4px_20px_-2px_rgba(0,0,0,0.05)] border border-slate-100 flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-3">
            <div className="flex gap-1 overflow-x-auto whitespace-nowrap pb-1 sm:pb-0">
              {CATEGORIES.map(({ value, label }) => (
                <button key={value} onClick={() => setCatFilter(value)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold tracking-wide transition-all border ${
                    catFilter === value
                      ? 'bg-amber-100 text-amber-800 border-amber-200'
                      : 'text-slate-500 border-transparent hover:bg-slate-100'
                  }`}>
                  {label}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider hidden sm:inline">Status:</span>
              <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as CampaignStatus | 'all')}
                className="bg-slate-50 border border-slate-200 text-slate-700 text-xs font-bold rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-amber-500">
                <option value="all">Show All</option>
                <option value="active">Active Campaigns</option>
                <option value="victory">Victories Won 🏆</option>
                <option value="closed">Closed Campaigns</option>
                <option value="draft">My Drafts</option>
              </select>
            </div>
          </div>

          {/* Loading */}
          {isLoading && (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-8 w-8 animate-spin text-amber-600" />
            </div>
          )}

          {/* Cards List */}
          {!isLoading && (
            visible.length === 0 ? (
              <div className="bg-white rounded-2xl p-12 text-center shadow-sm border border-slate-100">
                <div className="text-5xl mb-4">🔍</div>
                <h3 className="text-lg font-bold text-slate-700 mb-1">No Campaigns Found</h3>
                <p className="text-slate-400 text-sm max-w-sm mx-auto">
                  Adjust your filters or launch a new campaign using the form on the left.
                </p>
                <button onClick={() => { setCatFilter('all'); setStatusFilter('all'); }}
                  className="mt-4 px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-extrabold transition-all">
                  Reset Filters
                </button>
              </div>
            ) : (
              <div className="space-y-6">
                {visible.map((campaign) => (
                  <div key={campaign.id} className="relative group">
                    <CampaignCard
                      campaign={campaign}
                      hasSigned={false}
                      onSign={() => {}}
                    />

                    {/* Back Office Admin Action Overlay */}
                    <div className="mt-2 bg-slate-50 p-2.5 rounded-xl border border-slate-200 flex flex-wrap items-center justify-between gap-2 text-xs font-semibold">
                      <div className="flex items-center gap-2">
                        <span className="text-slate-500">Admin Actions:</span>
                        <Button 
                          size="sm" 
                          variant="outline" 
                          onClick={() => handleUpdateStatus(campaign.id, 'active')}
                          className="h-7 text-[11px] border-emerald-300 text-emerald-700 hover:bg-emerald-50"
                        >
                          🔥 Active
                        </Button>
                        <Button 
                          size="sm" 
                          variant="outline" 
                          onClick={() => handleUpdateStatus(campaign.id, 'victory')}
                          className="h-7 text-[11px] border-purple-300 text-purple-700 hover:bg-purple-50"
                        >
                          🏆 Victory Won
                        </Button>
                        <Button 
                          size="sm" 
                          variant="outline" 
                          onClick={() => handleUpdateStatus(campaign.id, 'closed')}
                          className="h-7 text-[11px] border-slate-300 text-slate-600 hover:bg-slate-100"
                        >
                          ⚪ Close
                        </Button>
                      </div>

                      <div className="flex items-center gap-2">
                        <Button 
                          size="sm" 
                          variant="ghost" 
                          onClick={() => handleTogglePin(campaign)}
                          className={cn("h-7 text-[11px] gap-1", campaign.isPinned ? "text-amber-700 font-bold" : "text-slate-500")}
                        >
                          <Pin className="h-3.5 w-3.5" />
                          <span>{campaign.isPinned ? 'Noticeboard Pinned' : 'Pin to Noticeboard'}</span>
                        </Button>

                        <Button 
                          size="sm" 
                          variant="ghost" 
                          onClick={() => setDeleteTargetId(campaign.id)}
                          className="h-7 text-[11px] text-rose-600 hover:bg-rose-50 hover:text-rose-700"
                        >
                          <Trash2 className="h-3.5 w-3.5" /> Delete
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )
          )}
        </section>
      </div>

      {/* Delete Modal */}
      {deleteTargetId && (
        <Dialog open={Boolean(deleteTargetId)} onOpenChange={() => setDeleteTargetId(null)}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="text-lg font-bold text-rose-600">Delete Campaign?</DialogTitle>
              <DialogDescription className="text-xs">
                Are you sure you want to delete this campaign? This cannot be undone.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="gap-2 sm:gap-0">
              <Button variant="outline" onClick={() => setDeleteTargetId(null)}>Cancel</Button>
              <Button onClick={handleDeleteConfirmed} className="bg-rose-600 hover:bg-rose-700 text-white">Delete Permanently</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
