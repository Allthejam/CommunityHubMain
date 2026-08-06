'use client';

import * as React from 'react';
import { Campaign, CampaignCategory, CampaignStatus } from '@/lib/types/campaigns';
import { CampaignCard } from '@/components/campaigns/campaign-card';
import { Target, Users, Flame, Trophy, Loader2, Bus, Building2, Trees, Stethoscope, Megaphone, HelpCircle } from 'lucide-react';
import {
  useFirestore,
  useUser,
  useMemoFirebase,
  useCollection,
  useDoc,
} from '@/firebase';
import { collection, doc, updateDoc, arrayUnion, increment, serverTimestamp } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';

// ─── Analytics sidebar widget (Calculates 100% Dynamic Real Data) ───────────
function CampaignAnalyticsWidget({ campaigns }: { campaigns: Campaign[] }) {
  const totalSignatures = campaigns.reduce((t, c) => t + (c.currentSignatures || 0), 0);
  const activeCount = campaigns.filter((c) => c.status === 'active').length;
  const victoriesCount = campaigns.filter((c) => c.status === 'victory').length;
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

  // Top 3 Real Active Campaigns
  const topCampaigns = campaigns.slice(0, 3);

  return (
    <div className="bg-white rounded-2xl p-6 shadow-[0_4px_20px_-2px_rgba(0,0,0,0.05)] border border-slate-100 flex flex-col gap-5">
      <div className="flex items-center justify-between border-b border-slate-100 pb-3">
        <div className="flex items-center gap-2">
          <span className="bg-amber-100 text-amber-800 p-2 rounded-lg"><Target className="h-4 w-4" /></span>
          <div>
            <h3 className="font-bold text-slate-800 text-sm">Campaign Analytics</h3>
            <p className="text-slate-400 text-[11px]">Real-time civic engagement</p>
          </div>
        </div>
        <span className="bg-emerald-100 text-emerald-700 text-[10px] font-bold px-2 py-0.5 rounded">Live Data</span>
      </div>

      <div className="grid grid-cols-3 gap-2 text-center">
        {[
          { label: 'Signatures', value: totalSignatures, color: 'text-amber-700', Icon: Users },
          { label: 'Active', value: activeCount, color: 'text-emerald-700', Icon: Flame },
          { label: 'Victories', value: victoriesCount, color: 'text-purple-700', Icon: Trophy },
        ].map(({ label, value, color, Icon }) => (
          <div key={label} className="bg-slate-50 rounded-xl p-3 border border-slate-100">
            <Icon className={`h-4 w-4 mx-auto mb-1 ${color}`} />
            <p className={`text-xl font-black ${color}`}>{value}</p>
            <p className="text-[9px] uppercase font-bold tracking-widest text-slate-400 mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      <div>
        <p className="text-xs font-bold text-slate-700 mb-2">Campaign Action Breakdown</p>
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

      {/* Real Campaign Progress Breakdown */}
      <div className="border-t border-slate-100 pt-4">
        <p className="text-xs font-bold text-slate-700 mb-2">Live Support Goal Progress</p>
        {topCampaigns.length === 0 ? (
          <p className="text-xs text-slate-400 text-center py-2">No active campaigns in progress.</p>
        ) : (
          topCampaigns.map((c) => {
            const pct = Math.min(100, Math.round(((c.currentSignatures || 0) / (c.targetSignatures || 1000)) * 100));
            return (
              <div key={c.id} className="mb-2 text-[11px]">
                <div className="flex justify-between mb-0.5 font-semibold text-slate-700">
                  <span className="truncate pr-2">{c.title}</span>
                  <span className="font-bold text-amber-700 shrink-0">{pct}%</span>
                </div>
                <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                  <div 
                    className="bg-amber-600 h-full rounded-full transition-all duration-500" 
                    style={{ width: `${pct}%` }} 
                  />
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
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

// ─── Main Public Campaigns Page ───────────────────────────────────────────────
export default function CampaignsPage() {
  const db = useFirestore();
  const { user } = useUser();
  const { toast } = useToast();

  const [catFilter, setCatFilter] = React.useState<CampaignCategory | 'all'>('all');
  const [statusFilter, setStatusFilter] = React.useState<CampaignStatus | 'all'>('all');

  // Read user's communityId
  const userDocRef = useMemoFirebase(() => ((user && db) ? doc(db, 'users', user.uid) : null), [user, db]);
  const { data: userProfile } = useDoc(userDocRef);

  const communityId: string | null = (typeof window !== 'undefined' ? sessionStorage.getItem('visitedCommunityId') : null) || userProfile?.primaryHomeCommunityId || userProfile?.homeCommunityId || userProfile?.communityId || null;

  // Subscribe to the community's petitions collection in Firestore
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
      creatorName: c.creatorName || c.author || c.creator || c.userName || 'Community Leadership',
      targetSignatures: c.targetSignatures || c.target || c.targetAmount || c.goal || 1000,
      currentSignatures: c.currentSignatures || c.signaturesCount || (c.signedUserIds?.length || 0),
      signedUserIds: c.signedUserIds || c.signatures || c.supporters || [],
      isPinned: Boolean(c.isPinned),
      createdAt: c.createdAt
    }));
  }, [rawCampaigns, communityId]);

  // Handle resident petition signing
  async function handleSign(campaignId: string) {
    if (!user) {
      toast({ title: "Sign In Required", description: "Please sign in to support this local campaign.", variant: "destructive" });
      return;
    }
    if (!db || !communityId) return;

    try {
      const campRef = doc(db, 'communities', communityId, 'petitions', campaignId);
      await updateDoc(campRef, {
        signedUserIds: arrayUnion(user.uid),
        currentSignatures: increment(1),
        updatedAt: serverTimestamp()
      });
      toast({ title: "Petition Signed! ✍️", description: "Your signature has been recorded." });
    } catch (err: any) {
      toast({ title: "Error", description: err.message || "Failed to sign petition.", variant: "destructive" });
    }
  }

  // Filter visible campaigns
  const visible = campaigns.filter((c) => {
    if (c.status === 'draft') return false;
    if (catFilter !== 'all' && c.category !== catFilter) return false;
    if (statusFilter !== 'all' && c.status !== statusFilter) return false;
    return true;
  });

  return (
    <div className="min-h-screen bg-slate-50 pb-20">
      {/* Page Header */}
      <div className="bg-white border-b border-slate-100 px-4 py-8 shadow-sm">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center gap-2 mb-1">
            <div className="bg-amber-100 text-amber-800 w-9 h-9 rounded-xl flex items-center justify-center text-lg shadow-sm">📣</div>
            <span className="text-xs uppercase tracking-wider text-amber-700 font-bold">Local Action Campaigns</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight">
            Neighbourhood Action & Petition Centre
          </h1>
          <p className="text-slate-500 text-sm mt-0.5">
            Sign petitions set out by local community leaders to save bus routes, keep bank branches open, preserve libraries, and protect green spaces.
          </p>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="max-w-7xl mx-auto px-4 py-8 grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Sidebar */}
        <aside className="lg:col-span-4 flex flex-col gap-6">
          <div className="bg-gradient-to-br from-amber-600 via-orange-600 to-rose-700 text-white rounded-2xl p-6 shadow-md relative overflow-hidden">
            <div className="absolute -right-8 -bottom-8 opacity-10 text-8xl">📣</div>
            <h2 className="text-lg font-bold mb-2 flex items-center gap-2">
              <Target className="h-5 w-5" /> Resident Action Centre
            </h2>
            <p className="text-amber-50 text-xs leading-relaxed">
              Action campaigns and petitions set out by your local community leaders to protect local bus routes, retain bank branches, and preserve essential neighborhood services. Click below to add your signature!
            </p>
          </div>

          <CampaignAnalyticsWidget campaigns={campaigns} />
        </aside>

        {/* Main Campaign List Section */}
        <section className="lg:col-span-8 flex flex-col gap-6">
          {/* Filter Bar */}
          <div className="bg-white p-3 rounded-2xl shadow-[0_4px_20px_-2px_rgba(0,0,0,0.05)] border border-slate-100 flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-3">
            <div className="flex gap-1 overflow-x-auto whitespace-nowrap pb-1 sm:pb-0">
              {CATEGORIES.map(({ value, label }) => (
                <button
                  key={value}
                  onClick={() => setCatFilter(value)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold tracking-wide transition-all border ${
                    catFilter === value
                      ? 'bg-amber-100 text-amber-800 border-amber-200'
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
                onChange={(e) => setStatusFilter(e.target.value as CampaignStatus | 'all')}
                className="bg-slate-50 border border-slate-200 text-slate-700 text-xs font-bold rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-amber-500"
              >
                <option value="all">Show All</option>
                <option value="active">Active Campaigns</option>
                <option value="victory">Victories Won 🏆</option>
                <option value="closed">Closed Campaigns</option>
              </select>
            </div>
          </div>

          {/* Loading */}
          {isLoading && (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-8 w-8 animate-spin text-amber-600" />
            </div>
          )}

          {/* No community selected */}
          {!isLoading && !communityId && (
            <div className="bg-white rounded-2xl p-12 text-center shadow-sm border border-slate-100">
              <div className="text-5xl mb-4">🏘️</div>
              <h3 className="text-lg font-bold text-slate-700 mb-1">No Community Found</h3>
              <p className="text-slate-400 text-sm max-w-sm mx-auto">
                You need to be a member of a community to view and sign local campaigns.
              </p>
            </div>
          )}

          {/* Campaign Cards List */}
          {!isLoading && communityId && (
            visible.length === 0 ? (
              <div className="bg-white rounded-2xl p-12 text-center shadow-sm border border-slate-100">
                <div className="text-5xl mb-4">📣</div>
                <h3 className="text-lg font-bold text-slate-700 mb-1">No Action Campaigns Found</h3>
                <p className="text-slate-400 text-sm max-w-sm mx-auto">
                  There are no campaigns matching your current filter settings. Check back soon for new local leader petitions.
                </p>
              </div>
            ) : (
              <div className="space-y-6">
                {visible.map((campaign) => (
                  <CampaignCard
                    key={campaign.id}
                    campaign={campaign}
                    hasSigned={!!(user && campaign.signedUserIds?.includes(user.uid))}
                    onSign={handleSign}
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
