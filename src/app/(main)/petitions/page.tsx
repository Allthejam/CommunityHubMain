'use client';

import * as React from 'react';
import { Petition, PetitionCategory } from '@/lib/types/petitions';
import { PetitionCard } from '@/components/petitions/petition-card';
import { Sparkles, Users, Layers, Loader2, HelpCircle, Search, Filter } from 'lucide-react';
import { useFirestore, useUser, useMemoFirebase, useCollection, useDoc } from '@/firebase';
import { collection, query, orderBy, doc } from 'firebase/firestore';
import { useActiveCommunityId } from '@/hooks/use-active-community-id';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

// Helper to display category names nicely
const getPetitionCategoryLabel = (cat: any) => {
  if (!cat) return '✨ Other Cause';
  let catId = '';
  let catName = '';
  if (typeof cat === 'string') {
    catId = cat;
    catName = cat;
  } else if (typeof cat === 'object') {
    catId = cat.id || JSON.stringify(cat);
    catName = cat.name || cat.label || cat.title || catId;
  } else {
    catId = String(cat);
    catName = String(cat);
  }

  const normalized = catId.toLowerCase();
  if (normalized === 'council') return '🏛️ Council Decision';
  if (normalized === 'amenities') return '🌳 Public Amenities';
  if (normalized === 'safety') return '🛡️ Road & Safety';
  if (normalized === 'other') return '💬 Other Cause';
  return `✨ ${catName.charAt(0).toUpperCase() + catName.slice(1)}`;
};

export default function PublicPetitionsPage() {
  const db = useFirestore();
  const { user } = useUser();
  const [catFilter, setCatFilter] = React.useState<string>('all');
  const [statusFilter, setStatusFilter] = React.useState<string>('all');
  const [searchTerm, setSearchTerm] = React.useState('');

  const dropdownRef = useMemoFirebase(() => (db ? doc(db, 'platform_settings', 'dropdowns') : null), [db]);
  const { data: dropdowns } = useDoc(dropdownRef);

  const petitionCategories = React.useMemo(() => {
    return dropdowns?.Petitions_Categories || ['council', 'amenities', 'safety', 'other'];
  }, [dropdowns]);

  const filterCategories = React.useMemo(() => {
    const list = [{ value: 'all', label: '✨ All Causes' }];
    petitionCategories.forEach((cat) => {
      const valStr = typeof cat === 'string' ? cat : (cat.id || cat.name || JSON.stringify(cat));
      list.push({ value: valStr, label: getPetitionCategoryLabel(cat) });
    });
    return list;
  }, [petitionCategories]);

  const { communityId, userProfile, isLoading: profileLoading } = useActiveCommunityId();

  const petitionsQuery = useMemoFirebase(
    () =>
      db && communityId
        ? query(collection(db, 'communities', communityId, 'petitions'), orderBy('createdAt', 'desc'))
        : null,
    [db, communityId]
  );
  const { data: rawPetitions, isLoading } = useCollection<Petition>(petitionsQuery);

  const petitions = React.useMemo(() => {
    if (!rawPetitions) return [];
    return rawPetitions.map((p: any) => {
      const title = p.title || 'Untitled Campaign';
      const description = p.description || 'No details provided.';
      const category = p.category || 'other';
      const status = p.status || 'active';
      const creator = p.creator || 'Resident Advocate';
      
      let createdOn = p.createdOn;
      if (!createdOn && p.createdAt) {
        try {
          const date = p.createdAt.toDate ? p.createdAt.toDate() : new Date(p.createdAt);
          createdOn = date.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
        } catch (e) {
          createdOn = 'Recent Date';
        }
      }
      createdOn = createdOn || 'Recent Date';

      return {
        ...p,
        title,
        description,
        category,
        status,
        creator,
        createdOn,
        signedBy: p.signedBy || [],
        signaturesCount: typeof p.signaturesCount === 'number' ? p.signaturesCount : 0,
        comments: p.comments || [],
      };
    }) as Petition[];
  }, [rawPetitions]);

  const filtered = React.useMemo(() => {
    const now = Date.now();
    return petitions.filter((p) => {
      if (p.status === 'draft') return false; // Hide drafts from public
      
      const isExpired = p.endDate ? (p.endDate.toDate ? p.endDate.toDate() : new Date(p.endDate)).getTime() < now : false;
      const effectiveStatus = isExpired ? 'closed' : p.status;

      if (catFilter !== 'all' && p.category !== catFilter) return false;
      
      if (statusFilter === 'active' && effectiveStatus !== 'active') return false;
      if (statusFilter === 'closed' && effectiveStatus !== 'closed') return false;

      if (searchTerm.trim()) {
        const queryLower = searchTerm.toLowerCase();
        const matchesTitle = p.title.toLowerCase().includes(queryLower);
        const matchesDesc = p.description.toLowerCase().includes(queryLower);
        if (!matchesTitle && !matchesDesc) return false;
      }
      return true;
    });
  }, [petitions, catFilter, statusFilter, searchTerm]);

  // Signature analytics
  const totalSignatures = petitions.reduce((sum, p) => sum + p.signaturesCount, 0);
  const activeCount = petitions.filter((p) => {
    if (p.status !== 'active') return false;
    if (p.endDate) {
      const targetDate = p.endDate.toDate ? p.endDate.toDate() : new Date(p.endDate);
      if (targetDate.getTime() < Date.now()) return false;
    }
    return true;
  }).length;

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      
      {/* Premium Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
        <div>
          <div className="flex items-center gap-2 mb-2 text-indigo-600 font-extrabold text-sm uppercase tracking-wider">
            <Sparkles className="h-4 w-4 text-indigo-500 animate-pulse" /> Community Campaigns
          </div>
          <h1 className="text-3xl md:text-4xl font-black text-slate-800 tracking-tight">
            Digital Petitions
          </h1>
          <p className="text-sm text-slate-500 mt-2 max-w-xl leading-relaxed">
            Support local causes, gather community signatures, and collaborate on important changes directly with your local representatives.
          </p>
        </div>

        {/* Analytics box */}
        <div className="flex gap-4 shrink-0 bg-slate-50 border border-slate-100 p-4 rounded-2xl">
          <div className="text-center px-4 border-r border-slate-200">
            <span className="text-2xl font-black text-indigo-600 flex items-center justify-center gap-1">
              <Users className="h-5 w-5 text-indigo-500" />
              {totalSignatures}
            </span>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-1">Signatures Cast</p>
          </div>
          <div className="text-center px-4">
            <span className="text-2xl font-black text-emerald-600 flex items-center justify-center gap-1">
              <Layers className="h-5 w-5 text-emerald-500" />
              {activeCount}
            </span>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-1">Active Causes</p>
          </div>
        </div>
      </div>

      {/* Filters & Search controls (Dropdowns replacing horizontal scrolling bar) */}
      <div className="bg-slate-50/80 p-4 rounded-2xl border border-slate-200/70 mb-8 shadow-[0_2px_10px_-3px_rgba(0,0,0,0.03)]">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-12 gap-3">
          
          {/* Search bar */}
          <div className="relative md:col-span-6">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search petitions and causes..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full text-xs pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-200 bg-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-medium"
            />
          </div>

          {/* Category Dropdown */}
          <div className="md:col-span-3">
            <Select value={catFilter} onValueChange={(val) => setCatFilter(val)}>
              <SelectTrigger className="w-full bg-white text-xs font-semibold rounded-xl border border-slate-200 h-[38px] px-3.5">
                <div className="flex items-center gap-2 truncate">
                  <Filter className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                  <SelectValue placeholder="Filter by Cause" />
                </div>
              </SelectTrigger>
              <SelectContent>
                {filterCategories.map((cat) => (
                  <SelectItem key={cat.value} value={cat.value} className="text-xs font-medium cursor-pointer">
                    {cat.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Status Dropdown */}
          <div className="md:col-span-3">
            <Select value={statusFilter} onValueChange={(val) => setStatusFilter(val)}>
              <SelectTrigger className="w-full bg-white text-xs font-semibold rounded-xl border border-slate-200 h-[38px] px-3.5">
                <SelectValue placeholder="All Statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all" className="text-xs font-medium cursor-pointer">
                  🌐 All Statuses
                </SelectItem>
                <SelectItem value="active" className="text-xs font-medium cursor-pointer">
                  🟢 Active Petitions
                </SelectItem>
                <SelectItem value="closed" className="text-xs font-medium cursor-pointer">
                  🔒 Closed / Ended
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

        </div>
      </div>

      {/* Petitions list grid */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
          <p className="text-xs text-slate-500 font-bold uppercase tracking-widest">Loading petitions board...</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20 bg-slate-50/50 border border-dashed rounded-3xl p-8 max-w-md mx-auto">
          <HelpCircle className="h-10 w-10 text-slate-300 mx-auto mb-3" />
          <h3 className="font-extrabold text-slate-700">No Petitions Found</h3>
          <p className="text-xs text-slate-400 mt-1">
            {searchTerm || catFilter !== 'all' || statusFilter !== 'all'
              ? "Try adjusting your search keywords or filter dropdowns."
              : "There are currently no active digital petitions in this community."}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map((petition) => (
            <PetitionCard key={petition.id} petition={petition} />
          ))}
        </div>
      )}

    </div>
  );
}

