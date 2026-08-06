'use client';

import * as React from 'react';
import { Campaign, CampaignCategory } from '@/lib/types/campaigns';
import { Trophy, Lock, Send, CheckCircle2, MessageSquare, Target, Share2, Bus, Building2, Trees, Stethoscope, HelpCircle, Megaphone, Flame, User } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

const CATEGORY_META: Record<CampaignCategory, { label: string; color: string; icon: any }> = {
  transport: { label: '🚌 Bus & Transport', color: 'bg-amber-50 text-amber-800 border-amber-200', icon: Bus },
  banking_services: { label: '🏦 Services & Banking', color: 'bg-indigo-50 text-indigo-800 border-indigo-200', icon: Building2 },
  community_facilities: { label: '🏛️ Facilities & Libraries', color: 'bg-sky-50 text-sky-800 border-sky-200', icon: Megaphone },
  environment: { label: '🌳 Environment & Parks', color: 'bg-emerald-50 text-emerald-800 border-emerald-200', icon: Trees },
  healthcare: { label: '🏥 Healthcare & NHS', color: 'bg-rose-50 text-rose-800 border-rose-200', icon: Stethoscope },
  other: { label: '📣 Community Action', color: 'bg-purple-50 text-purple-800 border-purple-200', icon: HelpCircle },
};

function PulseDot() {
  return (
    <span className="relative flex h-2 w-2">
      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
      <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500" />
    </span>
  );
}

interface CampaignCardProps {
  campaign: Campaign;
  hasSigned: boolean;
  onSign: (campaignId: string) => void;
  onComment?: (campaignId: string, text: string) => void;
}

export function CampaignCard({ campaign, hasSigned, onSign, onComment }: CampaignCardProps) {
  const { toast } = useToast();
  const [commentText, setCommentText] = React.useState('');
  const [showComments, setShowComments] = React.useState(false);

  const categoryMeta = CATEGORY_META[campaign.category] || CATEGORY_META.other;
  const currentSignatures = campaign.currentSignatures || 0;
  const targetSignatures = campaign.targetSignatures || 1000;
  const percent = Math.min(100, Math.round((currentSignatures / targetSignatures) * 100));

  const handleShare = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(window.location.href);
      toast({ title: "Link Copied!", description: "Campaign link copied to clipboard." });
    }
  };

  const handleAddComment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentText.trim()) return;
    if (onComment) {
      onComment(campaign.id, commentText);
    } else {
      toast({ title: "Comment Posted", description: "Your message has been added to the campaign discussion." });
    }
    setCommentText('');
  };

  return (
    <div className={cn(
      "bg-white rounded-2xl p-6 shadow-[0_4px_20px_-2px_rgba(0,0,0,0.05)] border transition-all space-y-5",
      campaign.status === 'victory' 
        ? "border-purple-200 bg-gradient-to-b from-purple-50/30 to-white" 
        : "border-slate-100 hover:border-amber-200"
    )}>
      {/* Header Meta */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
        <div className="flex items-center gap-2">
          <span className={cn("text-xs font-extrabold px-3 py-1 rounded-lg border", categoryMeta.color)}>
            {categoryMeta.label}
          </span>
          {campaign.status === 'active' && (
            <span className="flex items-center gap-1.5 text-[11px] font-bold text-amber-700 bg-amber-50 px-2.5 py-0.5 rounded-full border border-amber-200">
              <PulseDot /> Active Petition
            </span>
          )}
          {campaign.status === 'victory' && (
            <span className="flex items-center gap-1.5 text-[11px] font-extrabold text-purple-700 bg-purple-100 px-2.5 py-0.5 rounded-full border border-purple-200">
              🏆 Victory Won!
            </span>
          )}
        </div>

        <div className="flex items-center gap-2 text-xs text-slate-400 font-medium">
          <User className="h-3.5 w-3.5 text-slate-400" />
          <span>By {campaign.creatorName || 'Local Action Group'}</span>
        </div>
      </div>

      {/* Campaign Content */}
      <div className="space-y-2">
        <h3 className="text-lg font-black text-slate-900 leading-snug">
          {campaign.title}
        </h3>
        <p className="text-slate-600 text-xs leading-relaxed">
          {campaign.description}
        </p>
      </div>

      {/* Signature Goal Progress Box */}
      <div className="p-4 rounded-xl bg-slate-50 border border-slate-100 space-y-2.5">
        <div className="flex items-center justify-between text-xs font-bold">
          <span className="text-slate-600 flex items-center gap-1.5">
            <Flame className="h-4 w-4 text-amber-500" /> Signature Goal
          </span>
          <span className="text-amber-700 font-black text-sm">{currentSignatures} / {targetSignatures}</span>
        </div>

        <Progress value={percent} className="h-2.5 bg-slate-200" />

        <div className="flex justify-between text-[11px] font-bold text-slate-400">
          <span>{percent}% Goal Reached</span>
          <span>{targetSignatures - currentSignatures > 0 ? `${targetSignatures - currentSignatures} signatures needed` : 'Goal Reached!'}</span>
        </div>
      </div>

      {/* Action Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-1 border-t border-slate-100">
        <div className="flex items-center gap-2">
          <Button
            onClick={() => onSign(campaign.id)}
            disabled={hasSigned || campaign.status === 'victory'}
            className={cn(
              "px-5 py-2 rounded-xl text-xs font-black shadow-sm gap-2 transition-all",
              hasSigned 
                ? "bg-emerald-600 text-white hover:bg-emerald-600" 
                : "bg-amber-600 hover:bg-amber-700 text-white"
            )}
          >
            {hasSigned ? (
              <>
                <CheckCircle2 className="h-4 w-4" />
                <span>Petition Signed!</span>
              </>
            ) : campaign.status === 'victory' ? (
              <>
                <Trophy className="h-4 w-4" />
                <span>Campaign Successful</span>
              </>
            ) : (
              <>
                <Target className="h-4 w-4" />
                <span>Sign Petition ✍️</span>
              </>
            )}
          </Button>

          <Button
            variant="outline"
            size="icon"
            onClick={handleShare}
            className="h-9 w-9 rounded-xl border-slate-200 text-slate-600 hover:bg-slate-50"
            title="Share Campaign"
          >
            <Share2 className="h-4 w-4" />
          </Button>
        </div>

        <button
          onClick={() => setShowComments(!showComments)}
          className="text-xs font-bold text-slate-500 hover:text-amber-700 flex items-center gap-1.5 transition-colors"
        >
          <MessageSquare className="h-4 w-4 text-amber-500" />
          <span>Discussion ({campaign.signedUserIds?.length || 0})</span>
        </button>
      </div>

      {/* Resident Comments Section */}
      {showComments && (
        <div className="pt-3 border-t border-slate-100 space-y-3 animate-in fade-in duration-200">
          <form onSubmit={handleAddComment} className="flex gap-2">
            <input
              type="text"
              placeholder="Leave a message of support for this campaign..."
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-700 font-medium focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
            <Button type="submit" size="sm" className="bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold px-4">
              <Send className="h-3.5 w-3.5" />
            </Button>
          </form>

          <div className="text-xs text-slate-500 font-medium p-3 rounded-xl bg-slate-50 border border-slate-100">
            💬 Join local neighbors in supporting this cause on the campaign page.
          </div>
        </div>
      )}
    </div>
  );
}
