'use client';

import * as React from 'react';
import { Petition, PetitionCategory, PetitionStatus } from '@/lib/types/petitions';
import { PetitionCard } from '@/components/petitions/petition-card';
import { BarChart3, Users, Activity, CheckCircle2, Plus, X, Loader2, Play, Pause } from 'lucide-react';
import { useFirestore, useUser, useMemoFirebase, useCollection, useDoc } from '@/firebase';
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
  where,
  getDocs,
  documentId,
} from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';

// ─── Admin analytics widget ───────────────────────────────────────────────────
function AdminAnalyticsWidget({ petitions }: { petitions: Petition[] }) {
  const totalSignatures = petitions.reduce((sum, p) => sum + p.signaturesCount, 0);
  const activeCount = petitions.filter((p) => p.status === 'active').length;
  const pausedCount = petitions.filter((p) => p.status === 'paused').length;
  const draftCount  = petitions.filter((p) => p.status === 'draft').length;

  return (
    <div className="bg-white rounded-2xl p-6 shadow-[0_4px_20px_-2px_rgba(0,0,0,0.05)] border border-slate-100 flex flex-col gap-5">
      <div className="flex items-center justify-between border-b border-slate-100 pb-3">
        <div className="flex items-center gap-2">
          <span className="bg-indigo-100 text-indigo-800 p-2 rounded-lg"><BarChart3 className="h-4 w-4" /></span>
          <div>
            <h3 className="font-bold text-slate-800 text-sm">Petition Analytics</h3>
            <p className="text-slate-400 text-[11px]">Full visibility across all campaigns</p>
          </div>
        </div>
        <span className="bg-indigo-100 text-indigo-700 text-[10px] font-bold px-2 py-0.5 rounded">Leader</span>
      </div>

      <div className="grid grid-cols-2 gap-2 text-center">
        {[
          { label: 'Total Signatures', value: totalSignatures, color: 'text-indigo-700', Icon: Users },
          { label: 'Active',           value: activeCount, color: 'text-emerald-700',  Icon: Activity },
          { label: 'Paused',           value: pausedCount, color: 'text-amber-600',   Icon: Pause },
          { label: 'Drafts',           value: draftCount,  color: 'text-slate-500',   Icon: BarChart3 },
        ].map(({ label, value, color, Icon }) => (
          <div key={label} className="bg-slate-50 rounded-xl p-3 border border-slate-100">
            <Icon className={`h-4 w-4 mx-auto mb-1 ${color}`} />
            <p className={`text-xl font-black ${color}`}>{value}</p>
            <p className="text-[9px] uppercase font-bold tracking-widest text-slate-400 mt-0.5">{label}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

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

// ─── Create petition form ───────────────────────────────────────────────────────
interface CreatePetitionFormProps {
  onCreate: (data: Omit<Petition, 'id'>) => Promise<void>;
  categories: any[];
}

function CreatePetitionForm({ onCreate, categories }: CreatePetitionFormProps) {
  const [title, setTitle]       = React.useState('');
  const [desc, setDesc]         = React.useState('');
  const [category, setCategory] = React.useState<PetitionCategory>('other');
  const [status, setStatus]     = React.useState<'active' | 'draft'>('active');
  const [targetSignatures, setTargetSignatures] = React.useState<number>(100);
  const [endDateTime, setEndDateTime] = React.useState('');
  const [saving, setSaving]     = React.useState(false);

  React.useEffect(() => {
    if (categories && categories.length > 0) {
      const firstCat = categories[0];
      const val = typeof firstCat === 'string' ? firstCat : (firstCat.id || firstCat.name || JSON.stringify(firstCat));
      setCategory(val);
    }
  }, [categories]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || !desc.trim() || targetSignatures <= 0) return;

    const confirmPublish = window.confirm(
      "⚠️ IMPORTANT: Once published, the petition title and description are locked. Please review any spelling mistakes before publishing.\n\nAre you sure you want to publish this petition?"
    );
    if (!confirmPublish) return;

    setSaving(true);
    const endDate = endDateTime ? new Date(endDateTime) : null;

    await onCreate({
      communityId: '',
      title: title.trim(),
      description: desc.trim(),
      category,
      status,
      creator: 'Community Leader',
      createdOn: new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }),
      targetSignatures,
      signaturesCount: 0,
      signedBy: [],
      comments: [],
      endDate: endDate,
    });

    setTitle('');
    setDesc('');
    setTargetSignatures(100);
    setEndDateTime('');
    setSaving(false);
  }

  return (
    <div className="bg-white rounded-2xl p-6 shadow-[0_4px_20px_-2px_rgba(0,0,0,0.05)] border border-slate-100">
      <div className="flex items-center gap-2 mb-4 pb-3 border-b border-slate-100">
        <span className="bg-indigo-100 text-indigo-700 p-2 rounded-lg"><Plus className="h-4 w-4" /></span>
        <div>
          <h3 className="font-bold text-slate-800 text-sm">Create New Petition</h3>
          <p className="text-slate-400 text-[11px]">Start a digital campaign for your community</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Petition Title</label>
          <input
            type="text" value={title} onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Save the Local Royal British Legion" required
            className="w-full text-sm px-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
          />
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Campaign Description</label>
          <textarea
            value={desc} onChange={(e) => setDesc(e.target.value)} rows={4}
            placeholder="Explain why this petition exists, the target decision-makers, and how residents can help..." required
            className="w-full text-sm px-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all resize-none"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Category</label>
            <select value={category} onChange={(e) => setCategory(e.target.value)}
              className="w-full text-xs px-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500">
              {categories.map((cat) => {
                const val = typeof cat === 'string' ? cat : (cat.id || cat.name || JSON.stringify(cat));
                return (
                  <option key={val} value={val}>
                    {getPetitionCategoryLabel(cat)}
                  </option>
                );
              })}
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Initial Status</label>
            <select value={status} onChange={(e) => setStatus(e.target.value as 'active' | 'draft')}
              className="w-full text-xs px-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500">
              <option value="active">Active (Signable)</option>
              <option value="draft">Draft (Admin only)</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Signature Target</label>
            <input
              type="number"
              value={targetSignatures}
              onChange={(e) => setTargetSignatures(parseInt(e.target.value) || 100)}
              min={10}
              required
              className="w-full text-xs px-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Closing Date & Time</label>
            <input
              type="datetime-local"
              value={endDateTime}
              onChange={(e) => setEndDateTime(e.target.value)}
              className="w-full text-xs px-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
        </div>

        <button type="submit" disabled={saving}
          className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white rounded-lg text-xs font-extrabold shadow-md transition-all uppercase tracking-wider flex items-center justify-center gap-1.5">
          {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
          {saving ? 'Creating...' : 'Publish Petition'}
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
          <p className="text-xs text-slate-500 mt-1">Are you sure? This petition will be permanently removed.</p>
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

// ─── Edit Petition Settings modal ──────────────────────────────────────────────
function EditPetitionModal({
  currentCategory,
  currentEndDate,
  currentTarget,
  categories,
  onConfirm,
  onCancel,
}: {
  currentCategory: PetitionCategory;
  currentEndDate: any;
  currentTarget: number;
  categories: any[];
  onConfirm: (cat: PetitionCategory, target: number, end: Date | null) => void;
  onCancel: () => void;
}) {
  const [selected, setSelected] = React.useState<PetitionCategory>(currentCategory);
  const [target, setTarget] = React.useState<number>(currentTarget);
  const [endDateTime, setEndDateTime] = React.useState<string>(formatForDateTimeInput(currentEndDate));

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-xl flex flex-col gap-4">
        <div>
          <h4 className="font-extrabold text-slate-800 text-center">Edit Petition Settings</h4>
          <p className="text-xs text-slate-500 mt-1 text-center">
            Adjust the classification category, set signature goals, or change closing time.
          </p>
        </div>
        
        <div>
          <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Category</label>
          <select
            value={selected}
            onChange={(e) => setSelected(e.target.value)}
            className="w-full text-sm px-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            {categories.map((cat) => {
              const val = typeof cat === 'string' ? cat : (cat.id || cat.name || JSON.stringify(cat));
              return (
                <option key={val} value={val}>
                  {getPetitionCategoryLabel(cat)}
                </option>
              );
            })}
          </select>
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Signature Goal</label>
          <input
            type="number"
            value={target}
            onChange={(e) => setTarget(parseInt(e.target.value) || 100)}
            min={10}
            className="w-full text-sm px-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Select End Date & Time</label>
          <input
            type="datetime-local"
            value={endDateTime}
            onChange={(e) => setEndDateTime(e.target.value)}
            className="w-full text-xs px-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-slate-50 text-slate-700 font-medium"
          />
        </div>

        <div className="grid grid-cols-2 gap-3 mt-2">
          <button onClick={onCancel} className="py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-lg">
            Cancel
          </button>
          <button
            onClick={() => onConfirm(selected, target, endDateTime ? new Date(endDateTime) : null)}
            className="py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg"
          >
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Signatures modal ─────────────────────────────────────────────────────────
interface SignerInfo {
  uid: string;
  name: string;
  community: string;
}

function SignaturesModal({
  petition,
  db,
  onCancel,
}: {
  petition: Petition;
  db: any;
  onCancel: () => void;
}) {
  const [signers, setSigners] = React.useState<SignerInfo[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    async function loadSigners() {
      if (!db || !petition.signedBy || petition.signedBy.length === 0) {
        setSigners([]);
        setLoading(false);
        return;
      }
      try {
        const uids = petition.signedBy;
        const chunks: string[][] = [];
        for (let i = 0; i < uids.length; i += 30) {
          chunks.push(uids.slice(i, i + 30));
        }

        const results: SignerInfo[] = [];
        for (const chunk of chunks) {
          const q = query(collection(db, 'users'), where(documentId(), 'in', chunk));
          const snapshot = await getDocs(q);
          snapshot.docs.forEach((doc) => {
            const data = doc.data();
            results.push({
              uid: doc.id,
              name: data.displayName || data.name || 'Anonymous Resident',
              community: data.communityName || 'Unknown Community',
            });
          });
        }
        setSigners(results);
      } catch (err) {
        console.error('Failed to load signers:', err);
      } finally {
        setLoading(false);
      }
    }

    loadSigners();
  }, [petition.signedBy, db]);

  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const html = `
      <html>
        <head>
          <title>Petition Signatures - ${petition.title}</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; padding: 40px; color: #1e293b; }
            h1 { font-size: 22px; font-weight: 800; margin-bottom: 4px; }
            p { font-size: 13px; color: #64748b; margin-bottom: 24px; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th, td { text-align: left; padding: 10px 14px; border-bottom: 1px solid #e2e8f0; }
            th { background-color: #f8fafc; font-size: 11px; font-weight: 700; text-transform: uppercase; color: #475569; }
            td { font-size: 12px; font-weight: 500; }
            .total { font-weight: 700; margin-top: 30px; font-size: 14px; text-align: right; }
          </style>
        </head>
        <body>
          <h1>Petition Support List</h1>
          <h2 style="margin-top: 0; font-size: 16px; color: #334155;">Campaign: ${petition.title}</h2>
          <p>Generated on ${new Date().toLocaleDateString('en-GB')}</p>
          
          <table>
            <thead>
              <tr>
                <th style="width: 60px;">#</th>
                <th>Full Name</th>
                <th>Community</th>
              </tr>
            </thead>
            <tbody>
              ${signers.length > 0 ? signers.map((s, index) => `
                <tr>
                  <td>${index + 1}</td>
                  <td>${s.name}</td>
                  <td>${s.community}</td>
                </tr>
              `).join('') : `
                <tr>
                  <td colspan="3" style="text-align: center; color: #94a3b8;">No signatures found.</td>
                </tr>
              `}
            </tbody>
          </table>
          
          <div class="total">Total Signatures: ${signers.length}</div>
          
          <script>
            window.onload = function() {
              window.print();
            }
          </script>
        </body>
      </html>
    `;

    printWindow.document.write(html);
    printWindow.document.close();
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl p-6 max-w-lg w-full shadow-xl flex flex-col gap-4 max-h-[85vh]">
        <div className="flex justify-between items-center pb-3 border-b">
          <div>
            <h4 className="font-extrabold text-slate-800">Support Roster</h4>
            <p className="text-[11px] text-slate-400">View and export signees for this campaign</p>
          </div>
          <button onClick={onCancel} className="p-1 text-slate-400 hover:text-slate-600 rounded">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="overflow-y-auto flex-grow space-y-2 py-2 min-h-[250px] max-h-[400px]">
          {loading ? (
            <div className="flex justify-center items-center py-20">
              <Loader2 className="h-5 w-5 animate-spin text-indigo-600" />
            </div>
          ) : signers.length === 0 ? (
            <div className="text-center py-20 text-slate-400 text-xs">
              No signatures recorded yet.
            </div>
          ) : (
            <div className="border border-slate-100 rounded-xl overflow-hidden">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 text-slate-400 uppercase text-[9px] font-bold tracking-wider border-b">
                  <tr>
                    <th className="p-3 w-12 text-center">#</th>
                    <th className="p-3">Name</th>
                    <th className="p-3">Community</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {signers.map((s, index) => (
                    <tr key={s.uid} className="hover:bg-slate-50/50">
                      <td className="p-3 text-slate-400 text-center font-bold">{index + 1}</td>
                      <td className="p-3 font-extrabold text-slate-700">{s.name}</td>
                      <td className="p-3 text-slate-500 font-medium">🏡 {s.community}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3 pt-3 border-t">
          <button onClick={onCancel} className="py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-lg">
            Close
          </button>
          <button
            onClick={handlePrint}
            disabled={loading || signers.length === 0}
            className="py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white text-xs font-bold rounded-lg flex items-center justify-center gap-1.5"
          >
            🖨️ Print signatures
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main page ──────────────────────────────────────────────────────────────────
export default function LeaderPetitionsPage() {
  const db = useFirestore();
  const { user } = useUser();
  const { toast } = useToast();

  const [catFilter, setCatFilter]       = React.useState<PetitionCategory | 'all'>('all');
  const [statusFilter, setStatusFilter] = React.useState<PetitionStatus | 'all'>('all');
  const [deleteTarget, setDeleteTarget] = React.useState<string | null>(null);
  const [editingPetitionId, setEditingPetitionId] = React.useState<string | null>(null);
  const [signaturesPreviewPetition, setSignaturesPreviewPetition] = React.useState<Petition | null>(null);

  const dropdownRef = useMemoFirebase(() => (db ? doc(db, 'platform_settings', 'dropdowns') : null), [db]);
  const { data: dropdowns } = useDoc(dropdownRef);

  const petitionCategories = React.useMemo(() => {
    return dropdowns?.Petitions_Categories || ['council', 'amenities', 'safety', 'other'];
  }, [dropdowns]);

  const filterCategories = React.useMemo(() => {
    const list = [{ value: 'all', label: '✨ All Topics' }];
    petitionCategories.forEach((cat) => {
      const valStr = typeof cat === 'string' ? cat : (cat.id || cat.name || JSON.stringify(cat));
      list.push({ value: valStr, label: getPetitionCategoryLabel(cat) });
    });
    return list;
  }, [petitionCategories]);

  const userDocRef = useMemoFirebase(() => ((user && db) ? doc(db, 'users', user.uid) : null), [user, db]);
  const { data: userProfile } = useDoc(userDocRef);
  const communityId = userProfile?.communityId;

  const petitionsQuery = useMemoFirebase(
    () => (db && communityId) ? query(collection(db, 'communities', communityId, 'petitions'), orderBy('createdAt', 'desc')) : null,
    [db, communityId]
  );
  const { data: rawPetitions, isLoading } = useCollection<Petition>(petitionsQuery);

  const petitions: Petition[] = React.useMemo(() => {
    if (!rawPetitions) return [];
    return rawPetitions.map((p: any) => {
      const title = p.title || 'Untitled Campaign';
      const description = p.description || 'No details provided.';
      const category = p.category || 'other';
      const status = p.status || 'active';
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
    });
  }, [rawPetitions]);

  async function handleCreate(data: Omit<Petition, 'id'>) {
    if (!communityId || !db) return;
    try {
      await addDoc(collection(db, 'communities', communityId, 'petitions'), {
        ...data,
        communityId,
        createdAt: serverTimestamp(),
      });
      toast({ title: 'Success', description: 'New petition published successfully.' });
    } catch (err: any) {
      toast({ title: 'Failed to create', description: err.message, variant: 'destructive' });
    }
  }

  async function handleUpdateStatus(petitionId: string, nextStatus: PetitionStatus) {
    if (!communityId || !db) return;
    try {
      await updateDoc(doc(db, 'communities', communityId, 'petitions', petitionId), { status: nextStatus });
      toast({ title: 'Status Updated', description: `Petition is now ${nextStatus}.` });
    } catch (err: any) {
      toast({ title: 'Failed to update', description: err.message, variant: 'destructive' });
    }
  }

  async function handleDeleteConfirmed() {
    if (!communityId || !deleteTarget || !db) return;
    try {
      await deleteDoc(doc(db, 'communities', communityId, 'petitions', deleteTarget));
      toast({ title: 'Deleted', description: 'Petition has been permanently removed.' });
    } catch (err: any) {
      toast({ title: 'Failed to delete', description: err.message, variant: 'destructive' });
    } finally {
      setDeleteTarget(null);
    }
  }

  async function handleUpdatePetitionSettings(newCategory: PetitionCategory, newTarget: number, newEndDate: Date | null) {
    if (!communityId || !editingPetitionId || !db) return;
    try {
      await updateDoc(doc(db, 'communities', communityId, 'petitions', editingPetitionId), {
        category: newCategory,
        targetSignatures: newTarget,
        endDate: newEndDate,
      });
      toast({ title: 'Settings Updated', description: 'Changes saved successfully.' });
    } catch (err: any) {
      toast({ title: 'Failed to update settings', description: err.message, variant: 'destructive' });
    } finally {
      setEditingPetitionId(null);
    }
  }

  const visible = petitions.filter((p) => {
    if (catFilter !== 'all' && p.category !== catFilter) return false;
    if (statusFilter !== 'all' && p.status !== statusFilter) return false;
    return true;
  });

  const editingPetition = petitions.find((p) => p.id === editingPetitionId);

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-black text-slate-800">Petitions Control Room</h1>
          <p className="text-xs text-slate-400 mt-1">Configure signature campaigns and monitor resident engagement</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Side: Create Form & Analytics */}
        <div className="lg:col-span-1 space-y-6">
          <CreatePetitionForm onCreate={handleCreate} categories={petitionCategories} />
          <AdminAnalyticsWidget petitions={petitions} />
        </div>

        {/* Right Side: Campaigns Listing */}
        <div className="lg:col-span-2 space-y-6">
          {/* Controls Bar */}
          <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex flex-col md:flex-row justify-between items-center gap-3">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Category:</span>
              <select
                value={catFilter}
                onChange={(e) => setCatFilter(e.target.value)}
                className="text-xs px-2.5 py-1.5 rounded-lg border focus:outline-none focus:ring-1 focus:ring-indigo-500 bg-slate-50 font-bold"
              >
                {filterCategories.map((cat) => (
                  <option key={cat.value} value={cat.value}>
                    {cat.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Status:</span>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as PetitionStatus | 'all')}
                className="text-xs px-2.5 py-1.5 rounded-lg border focus:outline-none focus:ring-1 focus:ring-indigo-500 bg-slate-50 font-bold"
              >
                <option value="all">✨ All Statuses</option>
                <option value="active">🟢 Active</option>
                <option value="paused">⏸️ Paused</option>
                <option value="closed">🔴 Closed</option>
                <option value="draft">📝 Draft</option>
              </select>
            </div>
          </div>

          {/* List Grid */}
          {isLoading ? (
            <div className="flex justify-center items-center py-20">
              <Loader2 className="h-6 w-6 animate-spin text-indigo-600" />
            </div>
          ) : visible.length === 0 ? (
            <div className="text-center py-20 bg-slate-50 rounded-2xl border border-dashed text-slate-400 text-xs">
              No matching petitions found.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {visible.map((p) => (
                <PetitionCard
                  key={p.id}
                  petition={p}
                  isAdminView
                  onUpdateStatus={handleUpdateStatus}
                  onDelete={setDeleteTarget}
                  onEditSettings={setEditingPetitionId}
                  onViewSignatures={setSignaturesPreviewPetition}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {deleteTarget && (
        <DeleteModal
          onConfirm={handleDeleteConfirmed}
          onCancel={() => setDeleteTarget(null)}
        />
      )}

      {/* Edit Settings Modal */}
      {editingPetitionId && editingPetition && (
        <EditPetitionModal
          currentCategory={editingPetition.category}
          currentEndDate={editingPetition.endDate}
          currentTarget={editingPetition.targetSignatures}
          categories={petitionCategories}
          onConfirm={handleUpdatePetitionSettings}
          onCancel={() => setEditingPetitionId(null)}
        />
      )}

      {/* Signatures List & Export Modal */}
      {signaturesPreviewPetition && (
        <SignaturesModal
          petition={signaturesPreviewPetition}
          db={db}
          onCancel={() => setSignaturesPreviewPetition(null)}
        />
      )}
    </div>
  );
}
