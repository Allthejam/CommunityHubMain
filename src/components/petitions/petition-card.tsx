'use client';

import * as React from 'react';
import { Petition, PetitionComment } from '@/lib/types/petitions';
import { Shield, Lock, Send, Trash2, Play, StopCircle, CheckCircle2, MessageSquare, Pause, Users } from 'lucide-react';
import { useUser, useFirestore } from '@/firebase';
import { doc, updateDoc, arrayUnion } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { signPetitionAction } from '@/lib/actions/petitionActions';

const CATEGORY_META: Record<string, { label: string; color: string }> = {
  council:   { label: '🏛️ Council Decision',   color: 'bg-emerald-50 text-emerald-800 border-emerald-200' },
  amenities: { label: '🌳 Public Amenities',  color: 'bg-indigo-50  text-indigo-800  border-indigo-200'  },
  safety:    { label: '🛡️ Road & Safety',      color: 'bg-rose-50    text-rose-800    border-rose-200'    },
  other:     { label: '✨ Other Cause',        color: 'bg-slate-50   text-slate-800   border-slate-200'   },
};

function PulseDot() {
  return (
    <span className="relative flex h-2 w-2">
      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
      <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
    </span>
  );
}

function PetitionCountdown({ endDate }: { endDate: any }) {
  const [timeLeft, setTimeLeft] = React.useState<string>('');

  React.useEffect(() => {
    if (!endDate) return;
    const targetDate = endDate.toDate ? endDate.toDate() : new Date(endDate);

    const updateTimer = () => {
      const now = new Date();
      const diff = targetDate.getTime() - now.getTime();

      if (diff <= 0) {
        setTimeLeft('Ended');
        return;
      }

      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      let parts = [];
      if (days > 0) parts.push(`${days}d`);
      if (hours > 0 || days > 0) parts.push(`${hours}h`);
      parts.push(`${minutes}m`);
      parts.push(`${seconds}s`);

      setTimeLeft(parts.join(' '));
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [endDate]);

  if (!timeLeft) return null;

  if (timeLeft === 'Ended') {
    return (
      <span className="text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200 px-2 py-0.5 rounded-full uppercase tracking-wider">
        Closed
      </span>
    );
  }

  return (
    <span className="text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200 px-2.5 py-0.5 rounded-full flex items-center gap-1 uppercase tracking-wider">
      ⏳ {timeLeft} left
    </span>
  );
}

function StatusBadge({ status }: { status: Petition['status'] }) {
  if (status === 'active')
    return (
      <span className="flex items-center gap-1 text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded-full uppercase tracking-wider">
        <PulseDot /> Active Petition
      </span>
    );
  if (status === 'paused')
    return (
      <span className="text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200 px-2 py-0.5 rounded-full uppercase tracking-wider">
        ⏸️ Paused
      </span>
    );
  if (status === 'draft')
    return (
      <span className="text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200 px-2 py-0.5 rounded-full uppercase tracking-wider">
        Unpublished Draft
      </span>
    );
  return (
    <span className="text-[10px] font-bold bg-slate-100 text-slate-500 border border-slate-200 px-2 py-0.5 rounded-full uppercase tracking-wider">
      Closed & Finalised
    </span>
  );
}

interface PetitionCardProps {
  petition: Petition;
  isAdminView?: boolean;
  onUpdateStatus?: (id: string, next: Petition['status']) => void;
  onDelete?: (id: string) => void;
  onEditSettings?: (id: string) => void;
}

export function PetitionCard({
  petition,
  isAdminView = false,
  onUpdateStatus,
  onDelete,
  onEditSettings,
}: PetitionCardProps) {
  const { user } = useUser();
  const db = useFirestore();
  const { toast } = useToast();

  const [commentText, setCommentText] = React.useState('');
  const [showComments, setShowComments] = React.useState(false);
  const [signing, setSigning] = React.useState(false);

  const meta = CATEGORY_META[petition.category] || CATEGORY_META.other;
  const isSigned = user && petition.signedBy?.includes(user.uid);
  const isActive = petition.status === 'active';
  const isPaused = petition.status === 'paused';
  const isClosed = petition.status === 'closed';

  const progressPct = Math.min(
    100,
    Math.round((petition.signaturesCount / petition.targetSignatures) * 100)
  );

  async function handleSign() {
    if (!user) {
      toast({ title: 'Sign In Required', description: 'Please sign in to support this petition.', variant: 'destructive' });
      return;
    }
    if (isSigned) return;

    setSigning(true);
    try {
      const res = await signPetitionAction({
        communityId: petition.communityId,
        petitionId: petition.id,
        userId: user.uid,
      });

      if (!res.success) {
        throw new Error(res.error);
      }

      toast({ title: 'Petition Signed!', description: 'Thank you for supporting this local campaign.' });
    } catch (err: any) {
      toast({ title: 'Failed to Sign', description: err.message || 'Error occurred.', variant: 'destructive' });
    } finally {
      setSigning(false);
    }
  }

  async function handleAddComment(e: React.FormEvent) {
    e.preventDefault();
    if (!commentText.trim() || !user || !db) return;

    const newComment: PetitionComment = {
      id: `com-${Date.now()}`,
      author: user.displayName || user.email?.split('@')[0] || 'Resident',
      role: isAdminView ? 'Admin' : 'Resident',
      text: commentText.trim(),
      time: 'Just now',
    };

    try {
      const petitionRef = doc(db, 'communities', petition.communityId, 'petitions', petition.id);
      await updateDoc(petitionRef, {
        comments: arrayUnion(newComment),
      });
      setCommentText('');
    } catch (err: any) {
      toast({ title: 'Failed to comment', description: err.message, variant: 'destructive' });
    }
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-[0_4px_20px_-2px_rgba(0,0,0,0.03)] overflow-hidden flex flex-col justify-between h-full transition-all hover:shadow-[0_8px_30px_rgb(0,0,0,0.05)]">
      
      {/* Admin control strip */}
      {isAdminView && (
        <div className="flex gap-2 bg-slate-50 p-2.5 border-b border-slate-100 flex-wrap items-center">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mr-auto">Controls:</span>
          {onEditSettings && (
            <button
              onClick={() => onEditSettings(petition.id)}
              className="px-2 py-1 bg-white hover:bg-slate-100 border text-slate-600 text-[10px] font-bold rounded-md flex items-center gap-1 shadow-sm"
            >
              ⚙️ Adjust Target
            </button>
          )}
          {onUpdateStatus && (
            <>
              {petition.status === 'draft' && (
                <button
                  onClick={() => onUpdateStatus(petition.id, 'active')}
                  className="px-2 py-1 bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-bold rounded-md flex items-center gap-1 shadow-sm"
                >
                  <Play className="h-3 w-3" /> Go Live
                </button>
              )}
              {isActive && (
                <button
                  onClick={() => onUpdateStatus(petition.id, 'paused')}
                  className="px-2 py-1 bg-amber-500 hover:bg-amber-600 text-white text-[10px] font-bold rounded-md flex items-center gap-1 shadow-sm"
                >
                  <Pause className="h-3 w-3" /> Pause
                </button>
              )}
              {isPaused && (
                <button
                  onClick={() => onUpdateStatus(petition.id, 'active')}
                  className="px-2 py-1 bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-bold rounded-md flex items-center gap-1 shadow-sm"
                >
                  <Play className="h-3 w-3" /> Resume
                </button>
              )}
              {!isClosed && (
                <button
                  onClick={() => onUpdateStatus(petition.id, 'closed')}
                  className="px-2 py-1 bg-slate-800 hover:bg-slate-950 text-white text-[10px] font-bold rounded-md flex items-center gap-1 shadow-sm"
                >
                  <StopCircle className="h-3 w-3" /> Close
                </button>
              )}
            </>
          )}
          {onDelete && (
            <button
              onClick={() => onDelete(petition.id)}
              className="px-2 py-1 bg-rose-50 hover:bg-rose-100 text-rose-600 text-[10px] font-bold rounded-md flex items-center gap-1 border border-rose-200"
            >
              <Trash2 className="h-3 w-3" /> Delete
            </button>
          )}
        </div>
      )}

      {/* Main card body */}
      <div className="p-6 flex-grow flex flex-col justify-between">
        
        {/* Header tags */}
        <div className="flex justify-between items-start gap-2 mb-3">
          <span className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded-full border uppercase tracking-wider ${meta.color}`}>
            {meta.label}
          </span>
          <div className="flex items-center gap-1.5 shrink-0">
            <PetitionCountdown endDate={petition.endDate} />
            <StatusBadge status={petition.status} />
          </div>
        </div>

        {/* Title & Description */}
        <div className="mb-5">
          <h3 className="text-base font-extrabold text-slate-800 leading-snug tracking-tight mb-2">
            {petition.title}
          </h3>
          <p className="text-xs text-slate-500 leading-relaxed line-clamp-4">
            {petition.description}
          </p>
        </div>

        {/* Signatures Goal Progress */}
        <div className="space-y-2 mb-6">
          <div className="flex justify-between items-center text-xs font-bold text-slate-600">
            <span className="flex items-center gap-1">
              <Users className="h-4 w-4 text-indigo-500" />
              {petition.signaturesCount} Signed
            </span>
            <span className="text-[10px] bg-slate-100 rounded-md px-1.5 py-0.5 font-extrabold">
              Goal: {petition.targetSignatures}
            </span>
          </div>

          <div className="w-full bg-slate-100 h-3 rounded-full overflow-hidden border border-slate-200/50">
            <div
              className="h-full rounded-full transition-all duration-700 ease-out bg-gradient-to-r from-indigo-500 to-emerald-500"
              style={{ width: `${progressPct}%` }}
            />
          </div>
          <div className="text-[10px] text-slate-400 font-bold text-right uppercase tracking-wider">
            {progressPct}% towards consensus goal
          </div>
        </div>

        {/* Signing Actions */}
        {!isAdminView && (
          <div className="mb-4">
            {isSigned ? (
              <Button disabled className="w-full bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-50 text-xs font-extrabold py-2.5 shadow-none flex items-center justify-center gap-1.5">
                <CheckCircle2 className="h-4 w-4" />
                You signed this petition
              </Button>
            ) : isClosed ? (
              <Button disabled className="w-full bg-slate-100 text-slate-400 text-xs font-bold py-2.5 shadow-none flex items-center justify-center gap-1">
                <Lock className="h-3.5 w-3.5" />
                This petition is closed
              </Button>
            ) : isPaused ? (
              <Button disabled className="w-full bg-amber-50 text-amber-600 text-xs font-bold py-2.5 shadow-none flex items-center justify-center gap-1">
                ⏸️ Campaign paused by leader
              </Button>
            ) : (
              <Button
                onClick={handleSign}
                disabled={signing}
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-extrabold py-2.5 shadow-md flex items-center justify-center gap-1.5 transition-all"
              >
                🖋️ Sign this Petition
              </Button>
            )}
          </div>
        )}

        {/* Collapsible Comment Feed toggler */}
        <div className="border-t border-slate-100 pt-3">
          <button
            onClick={() => setShowComments(!showComments)}
            className="text-xs font-bold text-slate-500 hover:text-slate-700 flex items-center gap-1.5"
          >
            <MessageSquare className="h-4 w-4" />
            <span>Discussion ({petition.comments?.length || 0})</span>
          </button>
        </div>

      </div>

      {/* Comment section container */}
      {showComments && (
        <div className="bg-slate-50/70 border-t border-slate-100 p-4 space-y-4 max-h-[350px] overflow-y-auto">
          {/* Thread list */}
          <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
            {(petition.comments || []).length === 0 ? (
              <p className="text-[11px] text-slate-400 italic text-center py-4">
                No discussion comments yet. Be the first to express your view!
              </p>
            ) : (
              petition.comments.map((com) => (
                <div key={com.id} className="bg-white border border-slate-100 p-2.5 rounded-xl text-[11px] flex flex-col gap-1 shadow-sm">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-1">
                      <strong className="text-slate-700 font-bold">{com.author}</strong>
                      <span className={`text-[8px] px-1 py-0.2 border rounded-md font-semibold ${com.role === 'Admin' ? 'bg-indigo-100 text-indigo-700 border-indigo-200' : 'bg-slate-100 text-slate-500 border-slate-200'}`}>
                        {com.role}
                      </span>
                    </div>
                    <span className="text-[9px] text-slate-400">{com.time}</span>
                  </div>
                  <p className="text-slate-600 leading-relaxed">{com.text}</p>
                </div>
              ))
            )}
          </div>

          {/* Form */}
          {user && !isClosed && !isPaused && (
            <form onSubmit={handleAddComment} className="flex gap-2">
              <Input
                type="text"
                placeholder="Share your thoughts..."
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                required
                className="text-xs bg-white focus-visible:ring-1 focus-visible:ring-indigo-500 h-8"
              />
              <Button type="submit" size="sm" className="h-8 px-3 bg-slate-800 hover:bg-slate-900">
                <Send className="h-3 w-3" />
              </Button>
            </form>
          )}
        </div>
      )}

    </div>
  );
}
