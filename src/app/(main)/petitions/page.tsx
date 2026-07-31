'use client';

import * as React from 'react';
import { Petition, PetitionCategory, PetitionStatus } from '@/lib/types/petitions';
import { PetitionCard } from '@/components/petitions/petition-card';
import { Sparkles, Users, Layers, Award, Loader2, HelpCircle } from 'lucide-react';
import { useFirestore, useUser, useMemoFirebase, useCollection, useDoc } from '@/firebase';
import { collection, query, orderBy, doc } from 'firebase/firestore';

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
  const [catFilter, setCatFilter] = React.useState<PetitionCategory | 'all'>('all');
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

import { useActiveCommunityId } from '@/hooks/use-active-community-id';

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
    return petitions.filter((p) => {
      if (p.status === 'draft') return false; // Hide drafts from public
      if (catFilter !== 'all' && p.category !== catFilter) return false;
      if (searchTerm.trim() && !p.title.toLowerCase().includes(searchTerm.toLowerCase()) && !p.description.toLowerCase().includes(searchTerm.toLowerCase())) {
        return false;
      }
      return true;
    });
  }, [petitions, catFilter, searchTerm]);

  // Signature analytics
  const totalSignatures = petitions.reduce((sum, p) => sum + p.signaturesCount, 0);
  const activeCount = petitions.filter((p) => p.status === 'active').length;

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

      {/* Filters & Search controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8 bg-slate-50/50 p-3 rounded-2xl border border-slate-100/50">
        
        {/* Search */}
        <div className="w-full md:w-72">
          <input
            type="text"
            placeholder="Search campaigns..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 bg-white"
          />
        </div>

        {/* Categories */}
        <div className="flex gap-1.5 overflow-x-auto pb-1 md:pb-0 scrollbar-none">
          {filterCategories.map((cat) => (
            <button
              key={cat.value}
              onClick={() => setCatFilter(cat.value)}
              className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all border ${
                catFilter === cat.value
                  ? 'bg-slate-800 text-white border-slate-850 shadow-sm'
                  : 'bg-white text-slate-600 hover:text-slate-900 border-slate-200 hover:bg-slate-50'
              }`}
            >
              {cat.label}
            </button>
          ))}
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
            {searchTerm ? "Try searching for a different keyword or topic." : "There are currently no active digital petitions in this community."}
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
