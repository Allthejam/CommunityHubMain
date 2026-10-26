'use client';

import * as React from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Calendar,
  ExternalLink,
  Loader2,
  MapPin,
  Navigation,
  Plus,
  ShieldAlert,
  Construction,
  Clock,
  Trash2,
  Pencil,
  Flag,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { useUser, useFirestore, useCollection, useMemoFirebase, useDoc } from '@/firebase';
import { collection, addDoc, updateDoc, deleteDoc, doc, query, orderBy, limit, serverTimestamp } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import type { RoadworkItem } from '@/app/api/roadworks/route';
import {
  dispatchRoadAlertNotificationAction,
  syncOfficialRoadClosureNotificationsAction,
  flagRoadAlertToLeadersAction,
} from '@/lib/actions/announcementActions';

function getCenterFromBoundary(boundary?: any): { lat: number; lng: number } | null {
  if (!boundary) return null;
  try {
    const geo = typeof boundary === 'string' ? JSON.parse(boundary) : boundary;
    const coords: [number, number][] = [];
    const collect = (arr: any) => {
      if (!Array.isArray(arr)) return;
      if (arr.length >= 2 && typeof arr[0] === 'number' && typeof arr[1] === 'number') {
        coords.push([arr[0], arr[1]]);
      } else {
        arr.forEach(collect);
      }
    };
    if (geo.type === 'FeatureCollection' && Array.isArray(geo.features)) {
      geo.features.forEach((f: any) => collect(f.geometry?.coordinates));
    } else if (geo.type === 'Feature') {
      collect(geo.geometry?.coordinates);
    } else {
      collect(geo.coordinates);
    }
    if (coords.length === 0) return null;
    let minLng = Infinity,
      maxLng = -Infinity,
      minLat = Infinity,
      maxLat = -Infinity;
    coords.forEach(([lng, lat]) => {
      if (lng < minLng) minLng = lng;
      if (lng > maxLng) maxLng = lng;
      if (lat < minLat) minLat = lat;
      if (lat > maxLat) maxLat = lat;
    });
    if (minLat === Infinity) return null;
    return {
      lat: (minLat + maxLat) / 2,
      lng: (minLng + maxLng) / 2,
    };
  } catch {
    return null;
  }
}

export function RoadworksNoticeboard({
  communityId,
  communityName,
  boundary,
  compact = false,
}: {
  communityId?: string | null;
  communityName: string;
  boundary?: any;
  compact?: boolean;
}) {
  const { user } = useUser();
  const db = useFirestore();
  const { toast } = useToast();

  const [officialItems, setOfficialItems] = React.useState<RoadworkItem[]>([]);
  const [noBoundary, setNoBoundary] = React.useState(false);
  const [loading, setLoading] = React.useState(true);
  const [isBoardModalOpen, setIsBoardModalOpen] = React.useState(false);
  const [isReportModalOpen, setIsReportModalOpen] = React.useState(false);
  const [activeTab, setActiveTab] = React.useState('all');

  const boundaryCenter = React.useMemo(() => getCenterFromBoundary(boundary), [boundary]);
  const oneNetworkUrl = boundaryCenter
    ? `https://www.one.network/?tm=GB#13/${boundaryCenter.lat}/${boundaryCenter.lng}`
    : 'https://www.one.network/';

  // Form state for local popup roadwork / closure report (and Creator/Leader editing)
  const [editingAlertId, setEditingAlertId] = React.useState<string | null>(null);
  const [roadName, setRoadName] = React.useState('');
  const [alertType, setAlertType] = React.useState<'closure' | 'active_works' | 'event'>('closure');
  const [description, setDescription] = React.useState('');
  const [durationText, setDurationText] = React.useState('');
  const [removalPreset, setRemovalPreset] = React.useState<'24h' | '3d' | '7d' | '14d' | '28d' | 'custom'>('28d');
  const [customRemovalDate, setCustomRemovalDate] = React.useState('');
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  // State for public "Report to Leader" dialog
  const [flaggingItem, setFlaggingItem] = React.useState<{ id: string; road: string } | null>(null);
  const [flagReason, setFlagReason] = React.useState('Road has now reopened / clear');
  const [isFlagging, setIsFlagging] = React.useState(false);

  const effectiveCommId = communityId || '9ayHMyZf4SRw2gof1AM9';

  const userProfileRef = useMemoFirebase(
    () => (user && db ? doc(db, 'users', user.uid) : null),
    [user, db]
  );
  const { data: userProfile } = useDoc<any>(userProfileRef);

  const isLeaderOrAdmin = React.useMemo(() => {
    if (!user) return false;
    const rawRole = userProfile?.role;
    const role =
      typeof rawRole === 'string'
        ? rawRole.toLowerCase()
        : String(rawRole?.role || '').toLowerCase();
    const rawCommRole = userProfile?.communityRoles?.[effectiveCommId];
    const commRole =
      typeof rawCommRole === 'string'
        ? rawCommRole.toLowerCase()
        : String(rawCommRole?.role || '').toLowerCase();
    return (
      role.includes('admin') ||
      role.includes('leader') ||
      role.includes('coordinator') ||
      role.includes('owner') ||
      role.includes('president') ||
      commRole.includes('leader') ||
      commRole.includes('admin') ||
      commRole.includes('coordinator') ||
      commRole.includes('president') ||
      userProfile?.isLeader === true ||
      userProfile?.isAdmin === true ||
      userProfile?.isStaff === true
    );
  }, [user, userProfile, effectiveCommId]);

  // Real-time listener on local community popup road alerts
  const localAlertsQuery = useMemoFirebase(() => {
    if (!db || !effectiveCommId) return null;
    return query(
      collection(db, `communities/${effectiveCommId}/road_alerts`),
      orderBy('createdAt', 'desc'),
      limit(15)
    );
  }, [db, effectiveCommId]);

  const { data: localRoadAlerts } = useCollection<any>(localAlertsQuery);

  const getAlertExpiryMs = React.useCallback((a: any): number => {
    if (typeof a.expiresAtMs === 'number' && a.expiresAtMs > 0) {
      return a.expiresAtMs;
    }
    if (a.expiresAt) {
      const parsed = new Date(a.expiresAt).getTime();
      if (!Number.isNaN(parsed)) return parsed;
    }
    // Fallback: 28 days (4 weeks) from createdAt
    let createdMs = Date.now();
    if (typeof a.createdAt?.toMillis === 'function') {
      createdMs = a.createdAt.toMillis();
    } else if (typeof a.createdAt?._seconds === 'number') {
      createdMs = a.createdAt._seconds * 1000;
    } else if (a.createdAt) {
      const parsed = new Date(a.createdAt).getTime();
      if (!Number.isNaN(parsed)) createdMs = parsed;
    }
    return createdMs + 28 * 24 * 60 * 60 * 1000;
  }, []);

  // Automatically purge any expired user-reported notices from Firestore
  React.useEffect(() => {
    if (!db || !user || !localRoadAlerts || localRoadAlerts.length === 0) return;
    const now = Date.now();
    localRoadAlerts.forEach((a: any) => {
      const expMs = getAlertExpiryMs(a);
      if (expMs <= now && (a.authorId === user.uid || isLeaderOrAdmin)) {
        deleteDoc(doc(db, `communities/${effectiveCommId}/road_alerts`, a.id)).catch(() => {});
      }
    });
  }, [db, user, localRoadAlerts, effectiveCommId, isLeaderOrAdmin, getAlertExpiryMs]);

  const activeLocalRoadAlerts = React.useMemo(() => {
    const now = Date.now();
    return (localRoadAlerts || []).filter((a: any) => getAlertExpiryMs(a) > now);
  }, [localRoadAlerts, getAlertExpiryMs]);

  React.useEffect(() => {
    let cancelled = false;
    const loadRoadworks = async () => {
      const center = getCenterFromBoundary(boundary);
      if (!center) {
        if (!cancelled) {
          setOfficialItems([]);
          setNoBoundary(true);
          setLoading(false);
        }
        return;
      }

      setNoBoundary(false);
      setLoading(true);
      try {
        const params = new URLSearchParams();
        params.set('name', communityName || 'Local Community');
        params.set('lat', String(center.lat));
        params.set('lng', String(center.lng));
        const res = await fetch(`/api/roadworks?${params.toString()}`);
        if (res.ok) {
          const data = await res.json();
          if (!cancelled && data.success && Array.isArray(data.items)) {
            setOfficialItems(data.items);
            const activeClosures = data.items.filter((i: RoadworkItem) => i.severity === 'closure');
            if (activeClosures.length > 0 && effectiveCommId) {
              syncOfficialRoadClosureNotificationsAction({
                communityId: effectiveCommId,
                communityName: communityName || 'Local Community',
                closures: activeClosures.map((c: RoadworkItem) => ({
                  id: c.id,
                  road: c.road,
                  title: c.title,
                  summary: c.summary,
                  milesAway: c.milesAway,
                })),
              }).catch(() => {});
            }
          }
        }
      } catch (err) {
        console.warn('Error loading roadworks feed:', err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    loadRoadworks();
    const interval = setInterval(loadRoadworks, 10 * 60 * 1000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [effectiveCommId, communityName, boundary]);

  const combinedItems = React.useMemo(() => {
    const localMapped: (RoadworkItem & {
      isLocalPopup?: boolean;
      authorId?: string;
      authorName?: string;
      autoRemoveLabel?: string;
      rawAlertType?: 'closure' | 'active_works' | 'event';
      rawDurationText?: string;
      flaggedForLeader?: boolean;
      flagReason?: string;
    })[] = activeLocalRoadAlerts.map((a: any) => {
      const expMs = getAlertExpiryMs(a);
      const expDateStr = new Date(expMs).toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      });
      return {
        id: a.id,
        title: `${a.roadName || 'Local Road'} — ${
          a.alertType === 'closure'
            ? 'Road Closed / Diversion'
            : a.alertType === 'event'
            ? 'Event Road Closure / Traffic Notice'
            : 'Popup Works / Temporary Lights'
        }`,
        road: a.roadName || 'Local Street',
        category: a.alertType === 'closure' ? 'incident' : 'current_works',
        severity: a.alertType === 'closure' ? 'closure' : 'active_works',
        summary: a.description || '',
        startDate: a.durationText || 'Live Local Report',
        endDate: `Auto-removes ${expDateStr}`,
        link: 'https://www.one.network/',
        lat: null,
        lng: null,
        milesAway: 0,
        pubDate: '',
        isLocalPopup: true,
        authorId: a.authorId,
        authorName: a.authorName,
        autoRemoveLabel: expDateStr,
        rawAlertType: a.alertType || 'closure',
        rawDurationText: a.durationText || '',
        flaggedForLeader: Boolean(a.flaggedForLeader),
        flagReason: a.flagReason || '',
      };
    });

    return [...localMapped, ...officialItems];
  }, [activeLocalRoadAlerts, officialItems, getAlertExpiryMs]);

  const filteredItems = React.useMemo(() => {
    if (activeTab === 'live') {
      return combinedItems.filter(
        (i) => i.category === 'incident' || i.category === 'current_works' || (i as any).isLocalPopup
      );
    }
    if (activeTab === 'planned') {
      return combinedItems.filter((i) => i.category === 'planned_works');
    }
    if (activeTab === 'local') {
      return combinedItems.filter((i) => (i as any).isLocalPopup);
    }
    return combinedItems;
  }, [combinedItems, activeTab]);

  const handleSubmitLocalAlert = async () => {
    if (!user || !db) {
      toast({
        title: 'Sign In Required',
        description: 'Please log in to post a local road closure or popup roadwork alert.',
        variant: 'destructive',
      });
      return;
    }
    if (!roadName.trim() || !description.trim()) {
      toast({
        title: 'Missing Details',
        description: 'Please enter the road/street name and details of the closure or diversion.',
        variant: 'destructive',
      });
      return;
    }

    const now = Date.now();
    const DAY_MS = 24 * 60 * 60 * 1000;
    let expiresAtMs = now + 28 * DAY_MS; // Default 28-day (4-week) rule

    if (removalPreset === '24h') {
      expiresAtMs = now + 1 * DAY_MS;
    } else if (removalPreset === '3d') {
      expiresAtMs = now + 3 * DAY_MS;
    } else if (removalPreset === '7d') {
      expiresAtMs = now + 7 * DAY_MS;
    } else if (removalPreset === '14d') {
      expiresAtMs = now + 14 * DAY_MS;
    } else if (removalPreset === 'custom' && customRemovalDate.trim()) {
      const parsedCustom = new Date(`${customRemovalDate.trim()}T23:59:59`).getTime();
      if (!Number.isNaN(parsedCustom) && parsedCustom > now) {
        expiresAtMs = parsedCustom;
      }
    }

    setIsSubmitting(true);
    try {
      const formattedRemovalDate = new Date(expiresAtMs).toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      });

      if (editingAlertId) {
        // Only the original author or Community Leader/Admin can update this notice
        await updateDoc(doc(db, `communities/${effectiveCommId}/road_alerts`, editingAlertId), {
          roadName: roadName.trim(),
          alertType,
          description: description.trim(),
          durationText: durationText.trim() || 'Live Local Notice',
          expiresAtMs,
          expiresAt: new Date(expiresAtMs).toISOString(),
          flaggedForLeader: false,
          flagReason: '',
          updatedAt: serverTimestamp(),
        });
        toast({
          title: 'Road Notice Updated',
          description: `Changes saved for ${roadName.trim()}. Auto-removes ${formattedRemovalDate}.`,
        });
      } else {
        const createdRef = await addDoc(collection(db, `communities/${effectiveCommId}/road_alerts`), {
          roadName: roadName.trim(),
          alertType,
          description: description.trim(),
          durationText: durationText.trim() || 'Live Local Notice',
          authorId: user.uid,
          authorName: userProfile?.name || user.displayName || 'Community Member',
          expiresAtMs,
          expiresAt: new Date(expiresAtMs).toISOString(),
          createdAt: serverTimestamp(),
        });

        // Dispatch Notifications Bell + Web Push to community members' devices
        dispatchRoadAlertNotificationAction({
          communityId: effectiveCommId,
          communityName: communityName || 'Local Community',
          alertId: createdRef.id,
          roadName: roadName.trim(),
          alertType,
          description: description.trim(),
          autoRemoveDateLabel: formattedRemovalDate,
          creatorUid: user.uid,
        }).catch((err) => console.warn('Could not dispatch road alert notifications:', err));

        toast({
          title: 'Road Alert Posted & Broadcasted',
          description: `Live for ${communityName} & sent to member notifications. Auto-removes ${formattedRemovalDate}.`,
        });
      }

      setEditingAlertId(null);
      setRoadName('');
      setDescription('');
      setDurationText('');
      setRemovalPreset('28d');
      setCustomRemovalDate('');
      setIsReportModalOpen(false);
    } catch (e: any) {
      toast({
        title: 'Failed to Save',
        description: e.message || 'Only the post creator or Community Leader can modify this notice.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenEditAlert = (item: any) => {
    if (!user || (item.authorId !== user.uid && !isLeaderOrAdmin)) {
      toast({
        title: 'Permission Denied',
        description: 'Only the person who created this post or a Community Leader can edit it.',
        variant: 'destructive',
      });
      return;
    }
    setEditingAlertId(item.id);
    setRoadName(item.road || '');
    setAlertType(item.rawAlertType || 'closure');
    setDescription(item.summary || '');
    setDurationText(item.rawDurationText || '');
    setRemovalPreset('28d');
    setIsReportModalOpen(true);
  };

  const handleDeleteLocalAlert = async (item: any) => {
    if (!db || !user || (item.authorId !== user.uid && !isLeaderOrAdmin)) {
      toast({
        title: 'Permission Denied',
        description: 'Only the person who created this post or a Community Leader can remove it.',
        variant: 'destructive',
      });
      return;
    }
    try {
      await deleteDoc(doc(db, `communities/${effectiveCommId}/road_alerts`, item.id));
      toast({ title: 'Road Alert Removed' });
    } catch (e: any) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    }
  };

  const handleFlagToLeader = async () => {
    if (!flaggingItem || !flagReason.trim()) return;
    setIsFlagging(true);
    try {
      const res = await flagRoadAlertToLeadersAction({
        communityId: effectiveCommId,
        communityName: communityName || 'Local Community',
        alertId: flaggingItem.id,
        roadName: flaggingItem.road,
        reason: flagReason.trim(),
        reporterUid: user?.uid,
      });
      if (res.success) {
        toast({
          title: 'Reported to Community Leader',
          description: 'Thank you. Your Community Leader has been notified to review or remove this post.',
        });
        setFlaggingItem(null);
        setFlagReason('Road has now reopened / clear');
      } else {
        throw new Error(res.error || 'Could not send report');
      }
    } catch (e: any) {
      toast({
        title: 'Report Failed',
        description: e.message || 'Could not report notice to leaders.',
        variant: 'destructive',
      });
    } finally {
      setIsFlagging(false);
    }
  };

  const closureCount = combinedItems.filter((i) => i.severity === 'closure').length;
  const activeWorksCount = combinedItems.filter((i) => i.category === 'current_works').length;
  const plannedCount = combinedItems.filter((i) => i.category === 'planned_works').length;

  const renderItemCard = (item: RoadworkItem & { isLocalPopup?: boolean; authorId?: string; authorName?: string }) => {
    const isClosure = item.severity === 'closure';
    const isCurrent = item.category === 'current_works';

    return (
      <div
        key={item.id}
        className={cn(
          'p-3 rounded-xl border-2 space-y-1.5 text-xs transition-all',
          isClosure
            ? 'bg-red-50/80 dark:bg-red-950/30 border-red-400/60'
            : isCurrent
            ? 'bg-amber-50/80 dark:bg-amber-950/30 border-amber-400/60'
            : 'bg-card border-border'
        )}
      >
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-1.5 flex-wrap">
            <Badge
              className={cn(
                'text-[10px] font-black uppercase px-2 py-0.5',
                isClosure
                  ? 'bg-red-600 text-white'
                  : isCurrent
                  ? 'bg-amber-500 text-slate-950'
                  : 'bg-sky-600 text-white'
              )}
            >
              {isClosure
                ? '🔴 Closure / Incident'
                : isCurrent
                ? '🟠 Active Roadworks'
                : '📅 Planned Works'}
            </Badge>
            <Badge variant="outline" className="font-mono font-bold text-[10px]">
              {item.road}
            </Badge>
            {item.isLocalPopup && (
              <Badge className="bg-purple-600 text-white text-[10px] font-bold">
                📍 Local Popup Report
              </Badge>
            )}
            {item.isLocalPopup && isLeaderOrAdmin && (item as any).flaggedForLeader && (
              <Badge className="bg-red-700 text-white text-[10px] font-black">
                🚩 Flagged: {(item as any).flagReason || 'Leader Review Requested'}
              </Badge>
            )}
          </div>

          <div className="flex items-center gap-1.5">
            {item.milesAway !== null && item.milesAway > 0 && (
              <span className="text-[10px] font-mono font-bold text-muted-foreground">
                ~{item.milesAway} mi away
              </span>
            )}
            {item.isLocalPopup && user && (item.authorId === user.uid || isLeaderOrAdmin) ? (
              <>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 text-muted-foreground hover:text-foreground"
                  onClick={() => handleOpenEditAlert(item)}
                  title="Edit Road Notice (Creator / Leader Only)"
                >
                  <Pencil className="h-3.5 w-3.5" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 text-destructive"
                  onClick={() => handleDeleteLocalAlert(item)}
                  title="Remove Road Notice (Creator / Leader Only)"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </>
            ) : item.isLocalPopup ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-6 px-2 text-[10px] font-semibold text-muted-foreground hover:text-amber-700 dark:hover:text-amber-300 gap-1"
                onClick={() => setFlaggingItem({ id: item.id, road: item.road })}
                title="Report an update or issue to the Community Leader"
              >
                <Flag className="h-3 w-3" /> Report to Leader
              </Button>
            ) : null}
          </div>
        </div>

        <p className="font-black text-xs sm:text-sm text-foreground">{item.title}</p>
        <p className="text-xs text-muted-foreground leading-relaxed">{item.summary}</p>

        {(item.startDate || item.endDate || item.delayInfo) && (
          <div className="pt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] font-medium text-slate-700 dark:text-slate-300">
            {item.startDate && (
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3 text-amber-600 shrink-0" />
                <strong>Starts:</strong> {item.startDate}
              </span>
            )}
            {item.endDate && (
              <span className="flex items-center gap-1">
                <Calendar className="h-3 w-3 text-sky-600 shrink-0" />
                <strong>Ends:</strong> {item.endDate}
              </span>
            )}
            {item.delayInfo && (
              <span className="text-amber-700 dark:text-amber-400 font-bold">
                ⚠️ {item.delayInfo}
              </span>
            )}
          </div>
        )}

        <div className="pt-1 flex items-center justify-between">
          {item.isLocalPopup ? (
            isLeaderOrAdmin ? (
              <span className="text-[10px] text-muted-foreground font-medium">
                🔒 Leader View — Reported by: {item.authorName || 'Community Member'}
              </span>
            ) : (
              <span className="text-[10px] text-muted-foreground">
                Community Noticeboard Report
              </span>
            )
          ) : (
            <a
              href={item.link}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-[11px] font-bold text-primary hover:underline"
            >
              Official Traffic Scotland Notice <ExternalLink className="h-3 w-3" />
            </a>
          )}
        </div>
      </div>
    );
  };

  const renderReportDialog = () => (
    <>
      <Dialog
        open={isReportModalOpen}
        onOpenChange={(open) => {
          setIsReportModalOpen(open);
          if (!open) setEditingAlertId(null);
        }}
      >
        <DialogContent className="sm:max-w-md bg-card border text-card-foreground max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-base font-black flex items-center gap-2">
              <Construction className="h-5 w-5 text-amber-500" />
              {editingAlertId
                ? 'Edit Local Road Closure or Popup Notice'
                : 'Report Local Road Closure or Popup Works'}
            </DialogTitle>
            <DialogDescription className="text-xs">
              {editingAlertId
                ? 'Only the original post creator or a Community Leader can edit or remove this notice.'
                : `Spot a fallen tree, temporary traffic lights, utility trench, or event road closure in ${communityName}? Post it to the community noticeboard.`}
            </DialogDescription>
          </DialogHeader>

          {/* 28-Day Auto-Removal Rule Notice */}
          <div className="p-3 rounded-xl bg-amber-500/15 border border-amber-500/40 text-[11px] space-y-1 text-foreground">
            <p className="font-black text-amber-900 dark:text-amber-300 flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5 text-amber-600 shrink-0" />
              4-Week (28-Day) Auto-Removal Rule & Author Protection
            </p>
            <p className="text-muted-foreground leading-relaxed">
              All user-reported posts are <strong>automatically removed after 28 days</strong> unless you choose a shorter duration or specific removal date below. Only <strong>you (the post creator)</strong> and your <strong>Community Leader</strong> can edit or remove your post.
            </p>
          </div>

          <div className="space-y-3 py-1 text-xs">
            <div className="space-y-1">
              <Label className="text-xs font-bold">Road / Street Name *</Label>
              <Input
                value={roadName}
                onChange={(e) => setRoadName(e.target.value)}
                placeholder="e.g. High Street, B9102 Dava Road, A95 Spey Bridge"
                className="h-9 text-xs"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-bold">Disruption Type *</Label>
              <Select value={alertType} onValueChange={(v: any) => setAlertType(v)}>
                <SelectTrigger className="h-9 text-xs font-semibold">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="closure">🔴 Road Closed / Blocked / Diversion</SelectItem>
                  <SelectItem value="active_works">🟠 Popup Roadworks / Temporary Traffic Lights</SelectItem>
                  <SelectItem value="event">🎪 Local Event Road Closure / Parade</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-bold">What&apos;s Happening & Diversion Info *</Label>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="e.g. Temporary 2-way lights outside the Co-op for Scottish Water pipe repair, or fallen tree blocking northbound lane."
                rows={3}
                className="text-xs"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-bold">Auto-Remove Notice After *</Label>
              <Select value={removalPreset} onValueChange={(v: any) => setRemovalPreset(v)}>
                <SelectTrigger className="h-9 text-xs font-semibold">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="24h">⏱️ 24 Hours (Fallen Tree / Burst Pipe / 1-Day Incident)</SelectItem>
                  <SelectItem value="3d">📅 3 Days (Short Utility Works / Weekend Event)</SelectItem>
                  <SelectItem value="7d">📅 7 Days (1 Week Roadworks)</SelectItem>
                  <SelectItem value="14d">📅 14 Days (2 Weeks Roadworks)</SelectItem>
                  <SelectItem value="28d">🛡️ 28 Days (4 Weeks — Standard Default Rule)</SelectItem>
                  <SelectItem value="custom">🗓️ Set Specific Removal Date (Short or Long Term)...</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {removalPreset === 'custom' && (
              <div className="space-y-1 p-2.5 rounded-lg border bg-muted/30">
                <Label className="text-xs font-bold">Select Date to Automatically Remove Post *</Label>
                <Input
                  type="date"
                  min={new Date().toISOString().split('T')[0]}
                  value={customRemovalDate}
                  onChange={(e) => setCustomRemovalDate(e.target.value)}
                  className="h-9 text-xs"
                />
                <p className="text-[10px] text-muted-foreground">
                  If left blank, the post will automatically be removed after 28 days (4 weeks).
                </p>
              </div>
            )}

            <div className="space-y-1">
              <Label className="text-xs font-bold">Display Hours / Notes (Optional)</Label>
              <Input
                value={durationText}
                onChange={(e) => setDurationText(e.target.value)}
                placeholder="e.g. Daily 8am–5pm, or Overnight closure"
                className="h-9 text-xs"
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setIsReportModalOpen(false);
                setEditingAlertId(null);
              }}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleSubmitLocalAlert}
              disabled={isSubmitting}
              className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold"
            >
              {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
              {editingAlertId ? 'Save Changes' : 'Agree & Post to Noticeboard'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Public "Report to Community Leader" Dialog */}
      <Dialog open={Boolean(flaggingItem)} onOpenChange={(open) => !open && setFlaggingItem(null)}>
        <DialogContent className="sm:max-w-md bg-card border text-card-foreground">
          <DialogHeader>
            <DialogTitle className="text-base font-black flex items-center gap-2">
              <Flag className="h-4 w-4 text-amber-500" />
              Report Notice to Community Leader
            </DialogTitle>
            <DialogDescription className="text-xs">
              Only the original poster or a Community Leader can edit or remove a roadworks notice. Send a quick note to the Community Leader if <strong>{flaggingItem?.road}</strong> has reopened or needs attention.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2 text-xs">
            <div className="space-y-1">
              <Label className="text-xs font-bold">Reason for Reporting to Leader *</Label>
              <Select value={flagReason} onValueChange={setFlagReason}>
                <SelectTrigger className="h-9 text-xs font-semibold">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Road has now reopened / clear">🟢 Road has now reopened / clear</SelectItem>
                  <SelectItem value="Dates or diversion details need updating">🟠 Dates or diversion details need updating</SelectItem>
                  <SelectItem value="Duplicate or inaccurate post">⚠️ Duplicate or inaccurate post</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setFlaggingItem(null)}>
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleFlagToLeader}
              disabled={isFlagging}
              className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold"
            >
              {isFlagging ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
              Send to Community Leader
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );

  if (compact) {
    const topPreview = combinedItems.slice(0, 2);

    return (
      <>
        <div className="p-3 rounded-xl border-2 border-amber-500/40 bg-amber-50/40 dark:bg-amber-950/20 space-y-2.5 text-xs">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-1.5 font-extrabold text-amber-950 dark:text-amber-200">
              <Construction className="h-4 w-4 text-amber-600 shrink-0" />
              <span>Roadworks, Closures & Diversions</span>
            </div>
            <div className="flex items-center gap-1">
              {closureCount > 0 ? (
                <Badge className="bg-red-600 text-white text-[10px] font-black">
                  {closureCount} Closure{closureCount > 1 ? 's' : ''}
                </Badge>
              ) : activeWorksCount > 0 ? (
                <Badge className="bg-amber-500 text-slate-950 text-[10px] font-black">
                  {activeWorksCount} Active Works
                </Badge>
              ) : (
                <Badge className="bg-emerald-600 text-white text-[10px] font-bold">
                  🟢 Roads Clear
                </Badge>
              )}
            </div>
          </div>

          {loading ? (
            <div className="flex items-center gap-2 text-muted-foreground py-1">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              <span>Checking local roadworks & alerts...</span>
            </div>
          ) : topPreview.length > 0 ? (
            <div className="space-y-1.5">
              {topPreview.map((item) => (
                <div
                  key={item.id}
                  className="p-2 rounded-lg bg-card border flex items-start justify-between gap-2"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <span className="font-mono font-black text-[10px] px-1.5 py-0.2 bg-amber-500/20 text-amber-900 dark:text-amber-200 rounded">
                        {item.road}
                      </span>
                      <span className="font-bold text-foreground truncate text-xs">{item.title}</span>
                    </div>
                    <p className="text-[11px] text-muted-foreground line-clamp-1 mt-0.5">
                      {item.summary}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : noBoundary ? (
            <p className="text-[11px] text-muted-foreground">
              Automated roadworks & closure feeds will be available when this community has active leadership and a mapped boundary. Residents can still post local popup road closures below.
            </p>
          ) : (
            <p className="text-[11px] text-muted-foreground">
              No active road closures reported nearby. Have popup works or a blocked road in {communityName}? Post a notice below.
            </p>
          )}

          <div className="flex items-center gap-2 pt-0.5">
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => setIsBoardModalOpen(true)}
              className="h-7 text-xs font-bold flex-1 border-amber-500/50 hover:bg-amber-100/60 dark:hover:bg-amber-950/50"
            >
              View Noticeboard ({combinedItems.length})
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={() => setIsReportModalOpen(true)}
              className="h-7 text-xs font-bold bg-amber-500 hover:bg-amber-600 text-slate-950 gap-1"
            >
              <Plus className="h-3 w-3" /> Report Popup Works
            </Button>
          </div>
        </div>

        {/* Full Roadworks Noticeboard Dialog */}
        <Dialog open={isBoardModalOpen} onOpenChange={setIsBoardModalOpen}>
          <DialogContent className="sm:max-w-2xl bg-card border text-card-foreground max-h-[85vh] flex flex-col">
            <DialogHeader>
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <Badge className="bg-amber-500 text-slate-950 font-black text-[10px] uppercase">
                  🚧 Live Roadworks & Diversions Noticeboard
                </Badge>
                <Button
                  type="button"
                  size="sm"
                  onClick={() => {
                    setIsBoardModalOpen(false);
                    setIsReportModalOpen(true);
                  }}
                  className="h-7 text-xs font-bold bg-amber-500 hover:bg-amber-600 text-slate-950 gap-1"
                >
                  <Plus className="h-3.5 w-3.5" /> Post Local Closure / Popup Works
                </Button>
              </div>
              <DialogTitle className="text-lg font-black">
                Roadworks, Closures & Diversions — {communityName}
              </DialogTitle>
              <DialogDescription className="text-xs">
                Combined live feed from Traffic Scotland (trunk roads within 35 miles) and local community popup road reports.
              </DialogDescription>
            </DialogHeader>

            <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col min-h-0">
              <TabsList className="grid grid-cols-4 h-9">
                <TabsTrigger value="all" className="text-xs font-bold">
                  All ({combinedItems.length})
                </TabsTrigger>
                <TabsTrigger value="live" className="text-xs font-bold">
                  Live Now ({closureCount + activeWorksCount})
                </TabsTrigger>
                <TabsTrigger value="planned" className="text-xs font-bold">
                  Planned ({plannedCount})
                </TabsTrigger>
                <TabsTrigger value="local" className="text-xs font-bold">
                  Popup Local ({activeLocalRoadAlerts.length})
                </TabsTrigger>
              </TabsList>

              <div className="overflow-y-auto space-y-2.5 pr-1 mt-3 max-h-[50vh]">
                {filteredItems.length > 0 ? (
                  filteredItems.map(renderItemCard)
                ) : noBoundary ? (
                  <div className="p-8 text-center text-xs text-muted-foreground border border-dashed rounded-xl space-y-1">
                    <p className="font-bold text-foreground">Awaiting Community Leadership Boundary</p>
                    <p>Automated regional roadworks & closure feeds will activate once a Community Leader has mapped the boundary polygon for {communityName}. Local popup reports can still be posted above.</p>
                  </div>
                ) : (
                  <div className="p-8 text-center text-xs text-muted-foreground border rounded-xl">
                    No roadworks or closures in this category right now.
                  </div>
                )}
              </div>
            </Tabs>

            <DialogFooter className="flex flex-col sm:flex-row gap-2 sm:justify-between pt-2 border-t">
              <div className="flex items-center gap-2 flex-wrap">
                <Button asChild variant="outline" size="sm" className="text-xs font-bold gap-1">
                  <a href="https://www.traffic.gov.scot/" target="_blank" rel="noopener noreferrer">
                    Traffic Scotland Map <ExternalLink className="h-3 w-3" />
                  </a>
                </Button>
                <Button asChild variant="outline" size="sm" className="text-xs font-bold gap-1">
                  <a href={oneNetworkUrl} target="_blank" rel="noopener noreferrer">
                    One.Network Street Works <ExternalLink className="h-3 w-3" />
                  </a>
                </Button>
              </div>
              <Button type="button" size="sm" onClick={() => setIsBoardModalOpen(false)}>
                Close
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {renderReportDialog()}
      </>
    );
  }

  // Full Card Mode (for /travel page)
  return (
    <Card className="border-2 border-amber-500/40 shadow-md">
      <CardHeader className="p-4 sm:p-5 pb-3 border-b bg-amber-500/10">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-500/30 shrink-0">
              <Construction className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <Badge className="bg-amber-500 text-slate-950 font-black text-[10px] uppercase">
                  Live Traffic Scotland + Local Noticeboard
                </Badge>
                {closureCount > 0 && (
                  <Badge className="bg-red-600 text-white text-[10px] font-black animate-pulse">
                    🔴 {closureCount} Active Closure{closureCount > 1 ? 's' : ''}
                  </Badge>
                )}
              </div>
              <CardTitle className="text-base sm:text-lg font-black mt-0.5">
                Roadworks, Road Closures & Diversions ({communityName})
              </CardTitle>
              <CardDescription className="text-xs">
                Live trunk roadworks, scheduled closures, and community-reported popup road alerts.
              </CardDescription>
            </div>
          </div>

          <Button
            type="button"
            size="sm"
            onClick={() => setIsReportModalOpen(true)}
            className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs gap-1.5 shrink-0"
          >
            <Plus className="h-4 w-4" /> Report Local Closure / Popup Works
          </Button>
        </div>
      </CardHeader>

      <CardContent className="p-4 sm:p-5 space-y-4">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid grid-cols-4 h-9 max-w-md">
            <TabsTrigger value="all" className="text-xs font-bold">
              All ({combinedItems.length})
            </TabsTrigger>
            <TabsTrigger value="live" className="text-xs font-bold">
              Live Now ({closureCount + activeWorksCount})
            </TabsTrigger>
            <TabsTrigger value="planned" className="text-xs font-bold">
              Planned ({plannedCount})
            </TabsTrigger>
            <TabsTrigger value="local" className="text-xs font-bold">
              Popup Local ({activeLocalRoadAlerts.length})
            </TabsTrigger>
          </TabsList>

          <div className="mt-4 space-y-2.5 max-h-96 overflow-y-auto pr-1">
            {loading ? (
              <div className="flex items-center justify-center py-8 gap-2 text-xs text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Loading live local roadworks & community road alerts...</span>
              </div>
            ) : filteredItems.length > 0 ? (
              filteredItems.map(renderItemCard)
            ) : noBoundary ? (
              <div className="p-6 text-center text-xs text-muted-foreground border border-dashed rounded-xl space-y-1">
                <p className="font-bold text-foreground">Awaiting Community Leadership Boundary</p>
                <p>Automated regional roadworks & closure feeds will activate once a Community Leader has mapped the boundary polygon for {communityName}. Local popup reports can still be posted above.</p>
              </div>
            ) : (
              <div className="p-6 text-center text-xs text-muted-foreground border rounded-xl">
                No roadworks or closures in this category right now.
              </div>
            )}
          </div>
        </Tabs>
      </CardContent>

      <CardFooter className="p-4 pt-0 flex flex-wrap items-center justify-between gap-2 text-xs">
        <div className="flex items-center gap-2 flex-wrap">
          <Button asChild variant="outline" size="sm" className="h-8 text-xs font-bold gap-1">
            <a href="https://www.traffic.gov.scot/" target="_blank" rel="noopener noreferrer">
              Traffic Scotland Live Map <ExternalLink className="h-3 w-3" />
            </a>
          </Button>
          <Button asChild variant="outline" size="sm" className="h-8 text-xs font-bold gap-1">
            <a href={oneNetworkUrl} target="_blank" rel="noopener noreferrer">
              One.Network Council Street Works <ExternalLink className="h-3 w-3" />
            </a>
          </Button>
        </div>
      </CardFooter>

      {renderReportDialog()}
    </Card>
  );
}
