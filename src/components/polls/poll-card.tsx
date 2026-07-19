'use client';

import * as React from 'react';
import { Poll, PollOption, PollComment } from '@/lib/types/polls';
import { Trophy, Lock, Send, Trash2, Play, StopCircle, CheckCircle2, MessageSquare, Pause } from 'lucide-react';

// ─── Category helpers ────────────────────────────────────────────────────────
const CATEGORY_META: Record<string, { label: string; color: string }> = {
  budget:      { label: '💰 Ward Budget',       color: 'bg-emerald-50 text-emerald-800 border-emerald-200' },
  events:      { label: '📅 Events Consult',    color: 'bg-indigo-50  text-indigo-800  border-indigo-200'  },
  feedback:    { label: '💬 Feedback Cycle',     color: 'bg-yellow-50  text-yellow-800  border-yellow-200'  },
  regulations: { label: '📜 Parks & Rules',      color: 'bg-rose-50    text-rose-800    border-rose-200'    },
};

// ─── Tiny sub-components ─────────────────────────────────────────────────────

function PulseDot() {
  return (
    <span className="relative flex h-2 w-2">
      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
      <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
    </span>
  );
}

function PollCountdown({ endDate }: { endDate: any }) {
  const [timeLeft, setTimeLeft] = React.useState<string>('');

  React.useEffect(() => {
    if (!endDate) return;
    const targetDate = endDate.toDate ? endDate.toDate() : new Date(endDate);

    const updateTimer = () => {
      const now = new Date();
      const diff = targetDate.getTime() - now.getTime();

      if (diff <= 0) {
        setTimeLeft('Finished');
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

  if (timeLeft === 'Finished') {
    return (
      <span className="text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200 px-2 py-0.5 rounded-full uppercase tracking-wider">
        Ended
      </span>
    );
  }

  return (
    <span className="text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200 px-2.5 py-0.5 rounded-full flex items-center gap-1 uppercase tracking-wider">
      ⏳ {timeLeft} left
    </span>
  );
}

function StatusBadge({ status }: { status: Poll['status'] }) {
  if (status === 'active')
    return (
      <span className="flex items-center gap-1 text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded-full uppercase tracking-wider">
        <PulseDot /> Open Consult
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
      Consultation Finished
    </span>
  );
}

function OptionBar({ opt, totalVotes, isWinner, isAdmin }: { opt: PollOption; totalVotes: number; isWinner: boolean; isAdmin: boolean }) {
  const pct = totalVotes > 0 ? Math.round((opt.votes / totalVotes) * 100) : 0;
  return (
    <div className="relative">
      <div className="flex justify-between items-center text-xs font-bold mb-1 px-1">
        <span className="text-slate-700 flex items-center gap-1.5 max-w-[75%]">
          {isWinner && totalVotes > 0 && <Trophy className="h-3 w-3 text-indigo-500 shrink-0" />}
          {opt.text}
          {isWinner && totalVotes > 0 && (
            <span className="text-[9px] bg-indigo-100 text-indigo-800 px-1.5 py-0.5 rounded-md">Consensus Leader</span>
          )}
        </span>
        <span className="text-slate-800 font-extrabold bg-slate-100 rounded-md px-1.5 py-0.5 text-[10px]">
          {pct}% ({opt.votes})
        </span>
      </div>
      <div className="w-full bg-slate-100 h-8 rounded-xl overflow-hidden border border-slate-200/50">
        <div
          className={`h-full rounded-xl transition-all duration-700 ease-out ${
            isWinner && totalVotes > 0
              ? 'bg-indigo-500/20 border-r-2 border-indigo-500'
              : 'bg-emerald-500/10 border-r-2 border-emerald-400'
          }`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

function VoteButton({ opt, pollId, onVote }: { opt: PollOption; pollId: string; onVote: (pollId: string, optId: string) => void }) {
  return (
    <button
      onClick={() => onVote(pollId, opt.id)}
      className="w-full p-4 text-left border border-slate-200 rounded-xl hover:border-emerald-500 hover:bg-emerald-50/40 text-xs font-semibold text-slate-700 flex justify-between items-center transition-all duration-200 group active:scale-[0.99] shadow-sm"
    >
      <span>{opt.text}</span>
      <span className="h-6 w-6 rounded-full border border-slate-300 group-hover:border-emerald-500 group-hover:bg-emerald-500 group-hover:text-white flex items-center justify-center text-transparent text-[10px] transition-all">
        <CheckCircle2 className="h-3.5 w-3.5" />
      </span>
    </button>
  );
}

function CommentThread({ comments }: { comments: PollComment[] }) {
  return (
    <div className="space-y-2.5 max-h-64 overflow-y-auto pr-1">
      {comments.length === 0 ? (
        <p className="text-xs text-slate-400 italic text-center py-4">
          No comments yet. Start the neighbourhood discussion below!
        </p>
      ) : (
        comments.map((com) => {
          const isAdmin = com.role === 'Admin';
          return (
            <div key={com.id} className="bg-slate-50 border border-slate-100 p-3 rounded-xl text-xs flex flex-col gap-1">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-1.5">
                  <strong className="text-slate-800 font-bold">{com.author}</strong>
                  <span className={`text-[9px] px-1.5 py-0.5 border rounded-md font-semibold ${isAdmin ? 'bg-indigo-100 text-indigo-700 border-indigo-200' : 'bg-slate-100 text-slate-600 border-slate-200'}`}>
                    {com.role}
                  </span>
                </div>
                <span className="text-[10px] text-slate-400 font-medium">{com.time}</span>
              </div>
              <p className="text-slate-600 leading-relaxed">{com.text}</p>
            </div>
          );
        })
      )}
    </div>
  );
}

// ─── Admin control bar ───────────────────────────────────────────────────────
function AdminControls({
  poll,
  onUpdateStatus,
  onDelete,
  onEditCategory,
}: {
  poll: Poll;
  onUpdateStatus?: (id: string, next: Poll['status']) => void;
  onDelete: (id: string) => void;
  onEditCategory?: (id: string) => void;
}) {
  const isDraft = poll.status === 'draft';
  const isActive = poll.status === 'active';
  const isPaused = poll.status === 'paused';
  const isClosed = poll.status === 'closed';

  return (
    <div className="flex gap-2 mb-4 bg-slate-50 p-2.5 rounded-xl border border-slate-100 flex-wrap items-center">
      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center mr-auto">
        Admin Controls:
      </span>
      {onEditCategory && (
        <button
          onClick={() => onEditCategory(poll.id)}
          className="flex items-center gap-1 px-3 py-1 bg-white hover:bg-slate-50 border border-slate-200 text-[11px] text-slate-700 font-bold rounded-lg transition-colors shadow-sm"
        >
          ⚙️ Edit Settings
        </button>
      )}

      {isDraft && onUpdateStatus && (
        <button
          onClick={() => onUpdateStatus(poll.id, 'active')}
          className="flex items-center gap-1 px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold rounded-lg transition-colors shadow-sm"
        >
          <Play className="h-3 w-3" />
          Publish Now
        </button>
      )}

      {isActive && onUpdateStatus && (
        <>
          <button
            onClick={() => onUpdateStatus(poll.id, 'paused')}
            className="flex items-center gap-1 px-3 py-1 bg-white hover:bg-amber-50 border border-slate-200 text-[11px] text-amber-700 font-bold rounded-lg transition-colors shadow-sm"
          >
            <Pause className="h-3 w-3" />
            Pause/Freeze
          </button>
          <button
            onClick={() => {
              if (window.confirm("⚠️ Are you sure you want to PERMANENTLY close this consultation? Once closed, it cannot be reopened.")) {
                onUpdateStatus(poll.id, 'closed');
              }
            }}
            className="flex items-center gap-1 px-3 py-1 bg-white hover:bg-rose-50 border border-slate-200 text-[11px] text-rose-700 font-bold rounded-lg transition-colors shadow-sm"
          >
            <StopCircle className="h-3 w-3" />
            Close Permanently
          </button>
        </>
      )}

      {isPaused && onUpdateStatus && (
        <>
          <button
            onClick={() => onUpdateStatus(poll.id, 'active')}
            className="flex items-center gap-1 px-3 py-1 bg-white hover:bg-emerald-50 border border-slate-200 text-[11px] text-emerald-700 font-bold rounded-lg transition-colors shadow-sm"
          >
            <Play className="h-3 w-3" />
            Resume/Unpause
          </button>
          <button
            onClick={() => {
              if (window.confirm("⚠️ Are you sure you want to PERMANENTLY close this consultation? Once closed, it cannot be reopened.")) {
                onUpdateStatus(poll.id, 'closed');
              }
            }}
            className="flex items-center gap-1 px-3 py-1 bg-white hover:bg-rose-50 border border-slate-200 text-[11px] text-rose-700 font-bold rounded-lg transition-colors shadow-sm"
          >
            <StopCircle className="h-3 w-3" />
            Close Permanently
          </button>
        </>
      )}

      <button
        onClick={() => onDelete(poll.id)}
        className="flex items-center gap-1 px-3 py-1 bg-white hover:bg-rose-50 border border-slate-200 text-[11px] text-rose-600 font-bold rounded-lg transition-colors shadow-sm"
      >
        <Trash2 className="h-3 w-3" />
        Delete
      </button>
    </div>
  );
}

// ─── Main PollCard export ────────────────────────────────────────────────────
export interface PollCardProps {
  poll: Poll;
  hasVoted: boolean;
  isAdmin?: boolean;
  onVote: (pollId: string, optId: string) => void;
  onComment: (pollId: string, text: string) => void;
  onUpdateStatus?: (pollId: string, nextStatus: Poll['status']) => void;
  onDelete?: (pollId: string) => void;
  onEditCategory?: (pollId: string) => void;
}

export function PollCard({
  poll,
  hasVoted,
  isAdmin = false,
  onVote,
  onComment,
  onUpdateStatus,
  onDelete,
  onEditCategory,
}: PollCardProps) {
  const [commentText, setCommentText] = React.useState('');
  const totalVotes = poll.options.reduce((s, o) => s + o.votes, 0);

  const isExpired = React.useMemo(() => {
    if (!poll.endDate) return false;
    const targetDate = poll.endDate.toDate ? poll.endDate.toDate() : new Date(poll.endDate);
    return new Date() > targetDate;
  }, [poll.endDate]);

  const isClosed = poll.status === 'closed' || poll.status === 'paused' || isExpired;
  const isDraft = poll.status === 'draft';
  const showResults = hasVoted || isClosed || isDraft || isAdmin;

  const winnerOptId =
    totalVotes > 0
      ? [...poll.options].sort((a, b) => b.votes - a.votes)[0].id
      : null;

  const catMeta = CATEGORY_META[poll.category] ?? { label: '📝 General', color: 'bg-slate-100 text-slate-700 border-slate-200' };

  function handleCommentSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!commentText.trim()) return;
    onComment(poll.id, commentText.trim());
    setCommentText('');
  }

  return (
    <div className="bg-white rounded-2xl p-6 shadow-[0_4px_20px_-2px_rgba(0,0,0,0.05),0_2px_8px_-1px_rgba(0,0,0,0.03)] hover:shadow-[0_10px_30px_-4px_rgba(0,0,0,0.08)] border border-slate-100 transition-all duration-300">

      {/* Header badges */}
      <div className="flex flex-wrap justify-between items-center gap-2 mb-3">
        <div className="flex items-center gap-2">
          <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full border ${catMeta.color}`}>
            {catMeta.label}
          </span>
          <StatusBadge status={isExpired ? 'closed' : poll.status} />
          {poll.endDate && !isClosed && <PollCountdown endDate={poll.endDate} />}
        </div>
        <span className="text-[11px] text-slate-400 font-medium">Published: {poll.createdOn}</span>
      </div>

      {/* Title & description */}
      <h3 className="text-lg font-bold text-slate-800 leading-snug tracking-tight mb-2">{poll.title}</h3>
      <p className="text-slate-500 text-xs leading-relaxed mb-4">{poll.description}</p>

      {/* Admin controls (leader view only) */}
      {isAdmin && onUpdateStatus && onDelete && (
        <AdminControls poll={poll} onUpdateStatus={onUpdateStatus} onDelete={onDelete} onEditCategory={onEditCategory} />
      )}

      {/* Voting options / results */}
      <div className="space-y-3 mt-2">
        {poll.options.map((opt) =>
          showResults ? (
            <OptionBar
              key={opt.id}
              opt={opt}
              totalVotes={totalVotes}
              isWinner={opt.id === winnerOptId}
              isAdmin={isAdmin}
            />
          ) : (
            <VoteButton key={opt.id} opt={opt} pollId={poll.id} onVote={onVote} />
          )
        )}
      </div>

      {/* Footer: organiser + total */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-t border-slate-100 mt-5 pt-4 gap-2 text-xs">
        <span className="text-slate-400">
          Organiser: <strong className="text-slate-500">{poll.creator}</strong>
        </span>
        <span className="text-slate-500 font-semibold">
          ✉️ {totalVotes} Total community participants
        </span>
      </div>

      {/* Comments section */}
      {showResults ? (
        <div className="mt-6 border-t border-slate-100 pt-4">
          <h4 className="text-xs uppercase font-extrabold tracking-wider text-slate-400 mb-3 flex items-center gap-1.5">
            <MessageSquare className="h-3.5 w-3.5 text-indigo-500" />
            Local Comments ({poll.comments.length})
          </h4>
          <CommentThread comments={poll.comments} />
          <form onSubmit={handleCommentSubmit} className="flex gap-2 mt-4">
            <input
              type="text"
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              placeholder="Write a constructive neighbour response..."
              className="flex-grow text-xs px-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-400 transition-all bg-slate-50"
            />
            <button
              type="submit"
              className="flex items-center gap-1 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold transition-all shadow-sm"
            >
              <Send className="h-3 w-3" />
              Send
            </button>
          </form>
        </div>
      ) : (
        <div className="mt-4 bg-slate-50 border border-slate-100 p-3 rounded-xl text-center">
          <p className="text-xs text-slate-500 italic flex items-center justify-center gap-1.5">
            <Lock className="h-3 w-3 text-slate-400" />
            Please vote to reveal voting analytics &amp; neighbour discussion boards.
          </p>
        </div>
      )}
    </div>
  );
}
