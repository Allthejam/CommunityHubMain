'use client';

import * as React from 'react';
import { format } from 'date-fns';
import {
  Sun,
  Calendar,
  Clock,
  Plus,
  Trash2,
  Loader2,
  Sparkles,
  Link2,
  CheckCircle2,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { useUser, useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import {
  listLeaderBriefingNoticesAction,
  createLeaderBriefingNoticeAction,
  deleteLeaderBriefingNoticeAction,
  type DailyBriefingNotice,
} from '@/lib/actions/dailyBriefingActions';

function getDefaultBriefingDate(): { todayIso: string; defaultDateIso: string } {
  const now = new Date();
  const todayIso = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/London',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now);
  const hour = Number(
    new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Europe/London',
      hour: '2-digit',
      hour12: false,
    }).format(now)
  );
  if (hour >= 8) {
    const tomorrow = new Date(Date.parse(`${todayIso}T00:00:00Z`) + 24 * 60 * 60 * 1000);
    return { todayIso, defaultDateIso: tomorrow.toISOString().slice(0, 10) };
  }
  return { todayIso, defaultDateIso: todayIso };
}

function formatDateNice(iso: string) {
  const d = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(d.getTime())) return iso;
  return format(d, 'EEE, dd MMM yyyy');
}

export default function LeaderDailyBriefingsPage() {
  const { user } = useUser();
  const db = useFirestore();
  const { toast } = useToast();

  const userProfileRef = useMemoFirebase(() => (user && db ? doc(db, 'users', user.uid) : null), [user, db]);
  const { data: userProfile } = useDoc<any>(userProfileRef);

  const communityId = React.useMemo(() => {
    if (!userProfile) return '';
    const impersonating = userProfile?.impersonating;
    const visitedId = typeof window !== 'undefined' ? sessionStorage.getItem('visitedCommunityId') : null;
    return impersonating?.communityId || visitedId || userProfile.communityId || userProfile.homeCommunityId || '';
  }, [userProfile]);

  const { todayIso, defaultDateIso } = React.useMemo(() => getDefaultBriefingDate(), []);

  const [notices, setNotices] = React.useState<DailyBriefingNotice[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);

  const [title, setTitle] = React.useState('');
  const [message, setMessage] = React.useState('');
  const [targetDate, setTargetDate] = React.useState(defaultDateIso);
  const [linkUrl, setLinkUrl] = React.useState('');

  const loadNotices = React.useCallback(async () => {
    if (!user?.uid || !communityId) return;
    setLoading(true);
    const res = await listLeaderBriefingNoticesAction({ communityId, uid: user.uid });
    setLoading(false);
    if (res.success) {
      setNotices(res.notices);
    } else if (res.error) {
      toast({ variant: 'destructive', title: 'Error', description: res.error });
    }
  }, [user?.uid, communityId, toast]);

  React.useEffect(() => {
    loadNotices();
  }, [loadNotices]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.uid || !communityId) return;
    setSaving(true);
    const res = await createLeaderBriefingNoticeAction({
      communityId,
      uid: user.uid,
      title,
      message,
      targetDate,
      linkUrl,
    });
    setSaving(false);
    if (res.success) {
      toast({
        title: 'Morning Briefing Notice Scheduled',
        description: `Included in the 8:00 AM briefing for ${formatDateNice(targetDate)} and auto-deletes after 20 hours.`,
      });
      setTitle('');
      setMessage('');
      setLinkUrl('');
      loadNotices();
    } else {
      toast({ variant: 'destructive', title: 'Failed to Save', description: res.error });
    }
  };

  const handleDelete = async (noticeId: string) => {
    if (!user?.uid || !communityId) return;
    const res = await deleteLeaderBriefingNoticeAction({ communityId, uid: user.uid, noticeId });
    if (res.success) {
      toast({ title: 'Briefing notice removed' });
      loadNotices();
    } else {
      toast({ variant: 'destructive', title: 'Error', description: res.error });
    }
  };

  return (
    <div className="container mx-auto max-w-4xl py-6 space-y-6">
      {/* Colourful Hero Banner */}
      <div className="rounded-2xl overflow-hidden border-2 border-amber-300/80 dark:border-amber-700/60 shadow-md bg-gradient-to-r from-amber-500 via-orange-500 to-sky-600 text-white p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="space-y-1.5 max-w-2xl">
            <Badge className="bg-white/20 text-white border-white/30 text-[10px] font-bold uppercase tracking-wider">
              <Sparkles className="h-3 w-3 mr-1" /> 8:00 AM Morning Bulletin
            </Badge>
            <h1 className="text-2xl sm:text-3xl font-black flex items-center gap-2.5">
              <Sun className="h-7 w-7 text-yellow-200 shrink-0" />
              Daily Briefings
            </h1>
            <p className="text-sm text-amber-50 leading-relaxed">
              Add everyday community reminders (like tonight&apos;s council meeting, hall events, or bin collection changes) directly into your town&apos;s 8:00 AM Morning Bulletin — without sending a separate urgent broadcast. Every notice automatically clears after 20 hours.
            </p>
          </div>
          <div className="rounded-xl bg-black/20 backdrop-blur-xs px-4 py-3 text-xs space-y-1 border border-white/15">
            <p className="font-bold flex items-center gap-1.5 text-yellow-100">
              <Clock className="h-3.5 w-3.5" /> Delivery &amp; Auto-Clean
            </p>
            <p className="text-amber-50">Sent daily at <strong>08:00 UK</strong></p>
            <p className="text-amber-50">Auto-deletes after <strong>20 hours</strong></p>
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-5">
        {/* Add Notice Form */}
        <Card className="lg:col-span-2 border-t-4 border-t-amber-500 shadow-sm h-fit">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg font-bold flex items-center gap-2">
              <Plus className="h-5 w-5 text-amber-500" />
              Add Briefing Notice
            </CardTitle>
            <CardDescription className="text-xs">
              Queue a short note for an upcoming 8:00 AM Morning Bulletin.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-3.5 text-xs">
              <div className="space-y-1">
                <Label htmlFor="briefing-date" className="font-bold">Morning Date (8:00 AM)</Label>
                <Input
                  id="briefing-date"
                  type="date"
                  min={todayIso}
                  required
                  value={targetDate}
                  onChange={(e) => setTargetDate(e.target.value)}
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="briefing-title" className="font-bold">Notice Title *</Label>
                <Input
                  id="briefing-title"
                  required
                  maxLength={90}
                  placeholder="e.g. Community Council Meeting Tonight at 7pm"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="briefing-msg" className="font-bold">Short Message *</Label>
                <Textarea
                  id="briefing-msg"
                  required
                  rows={3}
                  maxLength={280}
                  placeholder="e.g. Held in the Town Hall main room. Open to all residents — agenda covers winter gritting and high street lighting."
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="briefing-link" className="font-bold flex items-center gap-1">
                  <Link2 className="h-3.5 w-3.5 text-sky-600" /> Optional Link
                </Label>
                <Input
                  id="briefing-link"
                  placeholder="e.g. /events or /polls or https://..."
                  value={linkUrl}
                  onChange={(e) => setLinkUrl(e.target.value)}
                />
                <div className="flex flex-wrap gap-1 pt-0.5">
                  {[
                    { label: 'Events', path: '/events' },
                    { label: 'Polls', path: '/polls' },
                    { label: 'News', path: '/news' },
                    { label: 'Travel', path: '/travel' },
                  ].map((q) => (
                    <button
                      key={q.path}
                      type="button"
                      onClick={() => setLinkUrl(q.path)}
                      className="text-[10px] font-semibold px-2 py-0.5 rounded-full border bg-muted/40 hover:bg-amber-500/15 hover:border-amber-400 transition-colors"
                    >
                      {q.label}
                    </button>
                  ))}
                </div>
              </div>

              <Button
                type="submit"
                disabled={saving || !communityId}
                className="w-full bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-slate-950 font-bold"
              >
                {saving && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />}
                Schedule for 8:00 AM Briefing
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Scheduled Notices List */}
        <Card className="lg:col-span-3 border-t-4 border-t-sky-500 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg font-bold flex items-center gap-2">
              <Calendar className="h-5 w-5 text-sky-600" />
              Queued &amp; Active Notices ({notices.length})
            </CardTitle>
            <CardDescription className="text-xs">
              Notices automatically clear 20 hours after their 8:00 AM broadcast.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {loading ? (
              <div className="flex items-center justify-center py-10">
                <Loader2 className="h-6 w-6 animate-spin text-sky-600" />
              </div>
            ) : notices.length === 0 ? (
              <div className="rounded-xl border border-dashed border-sky-300/70 bg-sky-50/40 dark:bg-sky-950/20 p-6 text-center space-y-1.5">
                <CheckCircle2 className="h-6 w-6 text-sky-600 mx-auto" />
                <p className="text-sm font-bold text-foreground">No leader briefing notices queued yet</p>
                <p className="text-xs text-muted-foreground">
                  Add a notice on the left and it will automatically appear in your community&apos;s next 8:00 AM Morning Bulletin.
                </p>
              </div>
            ) : (
              notices.map((n) => {
                const isToday = n.targetDate === todayIso;
                return (
                  <div
                    key={n.id}
                    className={`rounded-xl border p-3.5 space-y-1.5 text-xs ${
                      isToday
                        ? 'border-emerald-300 bg-gradient-to-r from-emerald-50/80 to-teal-50/50 dark:from-emerald-950/30 dark:to-teal-950/20 border-l-4 border-l-emerald-500'
                        : 'border-amber-200 bg-gradient-to-r from-amber-50/70 to-sky-50/40 dark:from-amber-950/25 dark:to-sky-950/20 border-l-4 border-l-amber-500'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="space-y-1">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <Badge
                            className={
                              isToday
                                ? 'bg-emerald-600 text-white text-[10px] font-bold'
                                : 'bg-amber-500 text-slate-950 text-[10px] font-bold'
                            }
                          >
                            {isToday ? "Today's 8am Briefing" : formatDateNice(n.targetDate)}
                          </Badge>
                          <span className="text-[11px] text-muted-foreground">
                            by {n.authorName}
                          </span>
                        </div>
                        <h3 className="font-bold text-sm text-foreground">{n.title}</h3>
                      </div>
                      <Button
                        size="icon"
                        variant="ghost"
                        title="Delete notice"
                        className="h-7 w-7 text-destructive shrink-0"
                        onClick={() => handleDelete(n.id)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                    <p className="text-muted-foreground leading-relaxed">{n.message}</p>
                    {n.linkUrl && (
                      <p className="text-[11px] text-sky-700 dark:text-sky-300 font-medium">
                        Link: {n.linkUrl}
                      </p>
                    )}
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
