'use client';

import React, { useEffect, useState } from 'react';
import { format } from 'date-fns';
import {
  GraduationCap,
  AlertTriangle,
  CheckCircle2,
  Calendar,
  ExternalLink,
  Plus,
  Loader2,
  Trash2,
  RefreshCw,
  ShieldCheck,
} from 'lucide-react';
import { doc } from 'firebase/firestore';
import { useUser, useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  createSchoolAlertAction,
  clearSchoolAlertAction,
  createSchoolHolidayAction,
  deleteSchoolHolidayAction,
  listCommunityMembersForSchoolPermsAction,
  setSchoolClosurePosterPermissionAction,
} from '@/lib/actions/schoolActions';

type SchoolAlertItem = {
  id: string;
  schoolName: string;
  status: 'Closed' | 'Partial Closure' | 'Delayed Opening';
  reason: string;
  expectedReopen?: string;
  createdAt: string;
};

type SchoolHolidayItem = {
  id: string;
  title: string;
  startDate: string;
  endDate?: string;
  notes?: string;
};

function formatDateSafe(dateStr?: string) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return dateStr;
  return format(d, 'dd MMM yyyy');
}

export function SchoolClosuresCard({ communityId }: { communityId: string }) {
  const { user } = useUser();
  const db = useFirestore();
  const { toast } = useToast();

  const userProfileRef = useMemoFirebase(() => (user && db ? doc(db, 'users', user.uid) : null), [user, db]);
  const { data: userProfile } = useDoc<any>(userProfileRef);

  const isLeader = React.useMemo(() => {
    if (!userProfile || !communityId) return false;
    const role = String(userProfile.role || '').toLowerCase();
    const acc = String(userProfile.accountType || '').toLowerCase();
    const commRole = String(userProfile.communityRoles?.[communityId]?.role || '').toLowerCase();
    const siteAdminRoles = ['admin', 'administrator', 'superadmin', 'owner'];
    const commLeaderRoles = ['president', 'leader', 'vice-president', 'admin', 'administrator', 'owner', 'moderator'];
    const isSiteAdmin =
      siteAdminRoles.includes(role) ||
      siteAdminRoles.includes(acc) ||
      userProfile.isAdmin === true ||
      userProfile.isStaff === true;
    const isThisCommunityLeader =
      commLeaderRoles.includes(commRole) ||
      userProfile.communityRoles?.[communityId]?.permissions?.hasBackOfficeAccess === true;
    const isLegacyPrimaryLeader =
      !userProfile.communityRoles &&
      (userProfile.primaryCommunityId === communityId || userProfile.communityId === communityId) &&
      (commLeaderRoles.includes(role) || commLeaderRoles.includes(acc) || userProfile.permissions?.hasBackOfficeAccess === true);

    return isSiteAdmin || isThisCommunityLeader || isLegacyPrimaryLeader;
  }, [userProfile, communityId]);

  const canPost = React.useMemo(() => {
    if (isLeader) return true;
    if (!userProfile || !communityId) return false;
    return (
      userProfile.communityRoles?.[communityId]?.permissions?.canPostSchoolClosures === true ||
      (Array.isArray(userProfile.schoolClosureCommunities) && userProfile.schoolClosureCommunities.includes(communityId))
    );
  }, [isLeader, userProfile, communityId]);

  const [loading, setLoading] = useState(true);
  const [councilName, setCouncilName] = useState('Local Council');
  const [councilUrl, setCouncilUrl] = useState('https://www.gov.uk/check-school-closure');
  const [alerts, setAlerts] = useState<SchoolAlertItem[]>([]);
  const [holidays, setHolidays] = useState<SchoolHolidayItem[]>([]);
  const [bankHolidays, setBankHolidays] = useState<Array<{ title: string; date: string }>>([]);

  // Quick Leader / Authorized Poster Modal state
  const [modalMode, setModalMode] = useState<'alert' | 'holiday' | 'posters' | null>(null);
  const [saving, setSaving] = useState(false);

  const [schoolName, setSchoolName] = useState('');
  const [alertStatus, setAlertStatus] = useState<'Closed' | 'Partial Closure' | 'Delayed Opening'>('Closed');
  const [alertReason, setAlertReason] = useState('');
  const [expectedReopen, setExpectedReopen] = useState('');
  const [durationHours, setDurationHours] = useState<'24' | '48' | '168'>('24');

  const [posterMembers, setPosterMembers] = useState<Array<{ id: string; name: string; email: string; canPostSchoolClosures: boolean }>>([]);
  const [loadingPosters, setLoadingPosters] = useState(false);
  const [posterSearch, setPosterSearch] = useState('');
  const [togglingUid, setTogglingUid] = useState<string | null>(null);

  const [holidayTitle, setHolidayTitle] = useState('');
  const [holidayStart, setHolidayStart] = useState('');
  const [holidayEnd, setHolidayEnd] = useState('');
  const [holidayNotes, setHolidayNotes] = useState('');

  const loadData = React.useCallback(async (signal?: AbortSignal) => {
    if (!communityId) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/school-closures?communityId=${encodeURIComponent(communityId)}`, {
        cache: 'no-store',
        signal,
      });
      if (res.ok) {
        const data = await res.json();
        if (data.councilName) setCouncilName(data.councilName);
        if (data.councilUrl) setCouncilUrl(data.councilUrl);
        setAlerts(data.alerts || []);
        setHolidays(data.holidays || []);
        setBankHolidays(data.upcomingBankHolidays || []);
      }
    } catch (err: any) {
      if (err?.name === 'AbortError') return;
      console.warn('Could not load school closures:', err?.message || err);
    } finally {
      if (!signal?.aborted) {
        setLoading(false);
      }
    }
  }, [communityId]);

  useEffect(() => {
    const controller = new AbortController();
    loadData(controller.signal);
    return () => controller.abort();
  }, [loadData]);

  const handleOpenManagePosters = async () => {
    setModalMode('posters');
    if (!user?.uid || !communityId) return;
    setLoadingPosters(true);
    const res = await listCommunityMembersForSchoolPermsAction({ communityId, uid: user.uid });
    setLoadingPosters(false);
    if (res.success) {
      setPosterMembers(res.members || []);
    } else {
      toast({ variant: 'destructive', title: 'Error', description: res.error });
    }
  };

  const handleTogglePosterPerm = async (targetUid: string, allowed: boolean) => {
    if (!user?.uid || !communityId) return;
    setTogglingUid(targetUid);
    const res = await setSchoolClosurePosterPermissionAction({
      communityId,
      uid: user.uid,
      targetUid,
      allowed,
    });
    setTogglingUid(null);
    if (res.success) {
      setPosterMembers((prev) =>
        prev.map((m) => (m.id === targetUid ? { ...m, canPostSchoolClosures: allowed } : m))
      );
      toast({
        title: allowed ? 'School poster permission granted' : 'School poster permission removed',
      });
    } else {
      toast({ variant: 'destructive', title: 'Error', description: res.error });
    }
  };

  const handlePostAlert = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.uid || !communityId) return;
    setSaving(true);
    const res = await createSchoolAlertAction({
      communityId,
      uid: user.uid,
      schoolName,
      status: alertStatus,
      reason: alertReason,
      expectedReopen,
      durationHours: Number(durationHours),
    });
    setSaving(false);
    if (res.success) {
      toast({ title: 'School alert posted & sent to members' });
      setSchoolName('');
      setAlertReason('');
      setExpectedReopen('');
      setDurationHours('24');
      setModalMode(null);
      loadData();
    } else {
      toast({ variant: 'destructive', title: 'Error', description: res.error });
    }
  };

  const handleAddHoliday = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.uid || !communityId) return;
    setSaving(true);
    const res = await createSchoolHolidayAction({
      communityId,
      uid: user.uid,
      title: holidayTitle,
      startDate: holidayStart,
      endDate: holidayEnd,
      notes: holidayNotes,
    });
    setSaving(false);
    if (res.success) {
      toast({ title: 'School holiday / term date added' });
      setHolidayTitle('');
      setHolidayStart('');
      setHolidayEnd('');
      setHolidayNotes('');
      setModalMode(null);
      loadData();
    } else {
      toast({ variant: 'destructive', title: 'Error', description: res.error });
    }
  };

  return (
    <Card className="border-2 border-indigo-200/70 dark:border-indigo-900/50 shadow-sm overflow-hidden">
      <CardHeader className="bg-gradient-to-r from-indigo-500/10 via-sky-500/5 to-transparent pb-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <CardTitle className="text-lg sm:text-xl flex items-center gap-2">
              <GraduationCap className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
              Local School Closures &amp; Term Dates
            </CardTitle>
            <CardDescription className="text-xs mt-0.5">
              Weather disruptions, power outages, local school holidays, and direct {councilName} status link.
            </CardDescription>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="ghost" size="sm" onClick={() => loadData()} disabled={loading} className="h-8 px-2.5 text-xs">
              <RefreshCw className={`h-3.5 w-3.5 mr-1 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            {canPost && (
              <>
                <Button size="sm" variant="outline" onClick={() => setModalMode('alert')} className="h-8 text-xs">
                  <Plus className="h-3.5 w-3.5 mr-1" /> Post Closure
                </Button>
                <Button size="sm" variant="outline" onClick={() => setModalMode('holiday')} className="h-8 text-xs">
                  <Calendar className="h-3.5 w-3.5 mr-1" /> Add Holiday
                </Button>
              </>
            )}
            {isLeader && (
              <Button size="sm" variant="outline" onClick={handleOpenManagePosters} className="h-8 text-xs">
                <ShieldCheck className="h-3.5 w-3.5 mr-1" /> School Posters
              </Button>
            )}
            <Button asChild size="sm" variant="secondary" className="h-8 text-xs font-semibold">
              <a href={councilUrl} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="h-3.5 w-3.5 mr-1.5" />
                {councilName} Closures
              </a>
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-4 space-y-4">
        {loading ? (
          <div className="flex items-center justify-center py-6">
            <Loader2 className="h-5 w-5 animate-spin text-indigo-600" />
          </div>
        ) : (
          <>
            {/* Active School Closures */}
            {alerts.length > 0 ? (
              <div className="space-y-2.5">
                {alerts.map((alert) => (
                  <div
                    key={alert.id}
                    className="rounded-xl border border-red-300 bg-red-50/80 dark:bg-red-950/30 p-3.5 flex flex-wrap items-start justify-between gap-3"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant="destructive" className="text-[10px] font-bold">
                          <AlertTriangle className="h-3 w-3 mr-1" />
                          {alert.status}
                        </Badge>
                        <span className="font-bold text-sm text-red-950 dark:text-red-100">
                          {alert.schoolName}
                        </span>
                      </div>
                      <p className="text-xs text-red-900 dark:text-red-200">{alert.reason}</p>
                      {alert.expectedReopen && (
                        <p className="text-[11px] font-medium text-red-800 dark:text-red-300">
                          Expected update / reopen: {alert.expectedReopen}
                        </p>
                      )}
                    </div>
                    {canPost && user?.uid && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 text-xs border-red-300 text-red-800"
                        onClick={async () => {
                          await clearSchoolAlertAction({ communityId, uid: user.uid, alertId: alert.id });
                          loadData();
                        }}
                      >
                        Mark Reopened
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-xl border border-emerald-200 bg-emerald-50/70 dark:bg-emerald-950/20 px-4 py-3 flex flex-wrap items-center justify-between gap-2 text-xs">
                <span className="flex items-center gap-2 font-semibold text-emerald-900 dark:text-emerald-200">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                  No school issues or closures reported locally.
                </span>
                <span className="text-[11px] text-muted-foreground">
                  For live council-wide updates, check {councilName}.
                </span>
              </div>
            )}

            {/* Upcoming School Holidays & UK Public Holidays */}
            {(holidays.length > 0 || bankHolidays.length > 0) && (
              <div className="pt-2 border-t space-y-2">
                <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <Calendar className="h-3.5 w-3.5 text-indigo-600" />
                  Upcoming School Holidays &amp; Public Holidays
                </p>
                <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  {holidays.map((h) => (
                    <div key={h.id} className="rounded-lg border bg-muted/30 p-2.5 text-xs flex items-start justify-between gap-2">
                      <div>
                        <p className="font-semibold text-foreground">{h.title}</p>
                        <p className="text-[11px] text-muted-foreground">
                          {formatDateSafe(h.startDate)}
                          {h.endDate && h.endDate !== h.startDate ? ` – ${formatDateSafe(h.endDate)}` : ''}
                        </p>
                        {h.notes && <p className="text-[11px] text-muted-foreground italic mt-0.5">{h.notes}</p>}
                      </div>
                      {canPost && user?.uid && (
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-6 w-6 text-destructive shrink-0"
                          onClick={async () => {
                            await deleteSchoolHolidayAction({ communityId, uid: user.uid, holidayId: h.id });
                            loadData();
                          }}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                  ))}
                  {bankHolidays.map((bh, i) => (
                    <div key={`${bh.date}-${i}`} className="rounded-lg border bg-indigo-50/40 dark:bg-indigo-950/20 p-2.5 text-xs">
                      <p className="font-semibold text-foreground">{bh.title}</p>
                      <p className="text-[11px] text-indigo-700 dark:text-indigo-300">
                        {formatDateSafe(bh.date)} &bull; Public / Bank Holiday
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </CardContent>

      {/* Post Closure Modal */}
      <Dialog open={modalMode === 'alert'} onOpenChange={(o) => !o && setModalMode(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Post Local School Closure / Alert</DialogTitle>
            <DialogDescription>
              Alert parents and residents immediately about weather, heating, or power disruptions.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handlePostAlert} className="space-y-3">
            <div>
              <Label>School Name</Label>
              <Input
                required
                placeholder="e.g. Grantown Grammar School"
                value={schoolName}
                onChange={(e) => setSchoolName(e.target.value)}
              />
            </div>
            <div>
              <Label>Status</Label>
              <Select value={alertStatus} onValueChange={(v: any) => setAlertStatus(v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Closed">Closed</SelectItem>
                  <SelectItem value="Partial Closure">Partial Closure</SelectItem>
                  <SelectItem value="Delayed Opening">Delayed Opening</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Reason</Label>
              <Input
                required
                placeholder="e.g. Heavy snow / Power outage / Heating failure"
                value={alertReason}
                onChange={(e) => setAlertReason(e.target.value)}
              />
            </div>
            <div>
              <Label>Expected Reopen / Update (optional)</Label>
              <Input
                placeholder="e.g. Review at 7:30am tomorrow"
                value={expectedReopen}
                onChange={(e) => setExpectedReopen(e.target.value)}
              />
            </div>
            <div>
              <Label>Auto-Clear Notice After</Label>
              <Select value={durationHours} onValueChange={(v: any) => setDurationHours(v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="24">24 Hours (Single-day / Snow closure)</SelectItem>
                  <SelectItem value="48">48 Hours (2 Days)</SelectItem>
                  <SelectItem value="168">7 Days (Extended closure)</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-[11px] text-muted-foreground mt-1">
                Immediately sends an in-app &amp; push alert to community members and auto-cleans once expired.
              </p>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setModalMode(null)}>
                Cancel
              </Button>
              <Button type="submit" disabled={saving}>
                {saving && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />}
                Publish Alert
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Add School Holiday Modal */}
      <Dialog open={modalMode === 'holiday'} onOpenChange={(o) => !o && setModalMode(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add School Holiday / Term Date</DialogTitle>
            <DialogDescription>
              Add local school holidays, half-term breaks, or in-service days.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleAddHoliday} className="space-y-3">
            <div>
              <Label>Holiday / Term Event</Label>
              <Input
                required
                placeholder="e.g. Christmas Holidays / In-Service Day"
                value={holidayTitle}
                onChange={(e) => setHolidayTitle(e.target.value)}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Start Date</Label>
                <Input
                  type="date"
                  required
                  value={holidayStart}
                  onChange={(e) => setHolidayStart(e.target.value)}
                />
              </div>
              <div>
                <Label>End Date (optional)</Label>
                <Input
                  type="date"
                  value={holidayEnd}
                  onChange={(e) => setHolidayEnd(e.target.value)}
                />
              </div>
            </div>
            <div>
              <Label>Notes (optional)</Label>
              <Input
                placeholder="e.g. Schools return Monday 6 Jan"
                value={holidayNotes}
                onChange={(e) => setHolidayNotes(e.target.value)}
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setModalMode(null)}>
                Cancel
              </Button>
              <Button type="submit" disabled={saving}>
                {saving && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />}
                Save Date
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Manage Authorized School Posters Modal (Leader Only) */}
      <Dialog open={modalMode === 'posters'} onOpenChange={(o) => !o && setModalMode(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-indigo-600" />
              Authorized School Closure Posters
            </DialogTitle>
            <DialogDescription>
              Grant trusted members (such as teachers or headteachers) permission to post urgent school closures and holidays without giving them Leader Dashboard access.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <Input
              placeholder="Search community members by name or email..."
              value={posterSearch}
              onChange={(e) => setPosterSearch(e.target.value)}
            />
            {loadingPosters ? (
              <div className="flex items-center justify-center py-6">
                <Loader2 className="h-5 w-5 animate-spin text-indigo-600" />
              </div>
            ) : (
              <div className="max-h-64 overflow-y-auto space-y-2 pr-1">
                {posterMembers
                  .filter((m) => {
                    const q = posterSearch.trim().toLowerCase();
                    if (!q) return true;
                    return m.name.toLowerCase().includes(q) || m.email.toLowerCase().includes(q);
                  })
                  .slice(0, 30)
                  .map((m) => (
                    <div key={m.id} className="flex items-center justify-between gap-2 p-2 rounded-lg border text-xs">
                      <div className="min-w-0">
                        <p className="font-semibold truncate">{m.name}</p>
                        {m.email && <p className="text-[11px] text-muted-foreground truncate">{m.email}</p>}
                      </div>
                      <Button
                        size="sm"
                        variant={m.canPostSchoolClosures ? 'destructive' : 'secondary'}
                        disabled={togglingUid === m.id}
                        className="h-7 text-xs shrink-0"
                        onClick={() => handleTogglePosterPerm(m.id, !m.canPostSchoolClosures)}
                      >
                        {togglingUid === m.id ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : m.canPostSchoolClosures ? (
                          'Revoke'
                        ) : (
                          'Allow'
                        )}
                      </Button>
                    </div>
                  ))}
                {posterMembers.length === 0 && (
                  <p className="text-xs text-muted-foreground text-center py-4">
                    No members found for this community.
                  </p>
                )}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setModalMode(null)}>
              Done
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
