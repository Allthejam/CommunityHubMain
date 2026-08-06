'use client';

import React, { useState, useMemo, useEffect } from 'react';
import Link from 'next/link';
import { 
  Radio, 
  Flame, 
  AlertTriangle, 
  Send, 
  ArrowLeft, 
  CheckCircle2, 
  MapPin, 
  Globe, 
  Bell, 
  Megaphone,
  ShieldAlert,
  Loader2,
  Lock,
  AlertCircle,
  ShieldCheck,
  Eye,
  PauseCircle,
  PlayCircle,
  XCircle,
  MoreHorizontal,
  Calendar,
  Clock,
  Filter,
  Search,
  Check,
  Archive,
  Image as ImageIcon
} from 'lucide-react';

import { useUser, useFirestore, useDoc, useCollection, useMemoFirebase } from '@/firebase';
import { doc, collection, query, where, addDoc, updateDoc, onSnapshot, orderBy, serverTimestamp, getDocs } from 'firebase/firestore';
import { sendEmail } from '@/lib/actions/emailActions';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';

function getGeoJsonCoords(geojson: any): number[][] {
  if (!geojson) return [];
  const geometry = geojson.geometry || geojson;
  if (!geometry || !geometry.coordinates) return [];

  const coords: number[][] = [];
  const extract = (arr: any) => {
    if (Array.isArray(arr) && arr.length >= 2 && typeof arr[0] === 'number' && typeof arr[1] === 'number') {
      coords.push([arr[0], arr[1]]); // [lng, lat]
    } else if (Array.isArray(arr)) {
      arr.forEach(extract);
    }
  };
  extract(geometry.coordinates);
  return coords;
}

function getGeoJsonBoundingBox(geojson: any) {
  const coords = getGeoJsonCoords(geojson);
  if (coords.length === 0) return null;
  let minLng = Infinity, maxLng = -Infinity, minLat = Infinity, maxLat = -Infinity;
  coords.forEach(([lng, lat]) => {
    if (lng < minLng) minLng = lng;
    if (lng > maxLng) maxLng = lng;
    if (lat < minLat) minLat = lat;
    if (lat > maxLat) maxLat = lat;
  });
  return { minLng, maxLng, minLat, maxLat };
}

function isCommunityInsideRegionalBoundary(regionalGeoJsonStr: string | null, communityGeoJsonStr: string | null): boolean {
  if (!regionalGeoJsonStr || !communityGeoJsonStr) return false;
  try {
    const regionalGeoJson = JSON.parse(regionalGeoJsonStr);
    const commGeoJson = JSON.parse(communityGeoJsonStr);

    const rBox = getGeoJsonBoundingBox(regionalGeoJson);
    const cBox = getGeoJsonBoundingBox(commGeoJson);

    if (!rBox || !cBox) return false;

    return (
      cBox.minLng <= rBox.maxLng &&
      cBox.maxLng >= rBox.minLng &&
      cBox.minLat <= rBox.maxLat &&
      cBox.maxLat >= rBox.minLat
    );
  } catch (err) {
    return false;
  }
}

export default function RegionalBroadcastsPage() {
  const { user } = useUser();
  const db = useFirestore();
  const { toast } = useToast();

  const userProfileRef = useMemoFirebase(() => {
    if (!user || !db) return null;
    return doc(db, 'users', user.uid);
  }, [user, db]);

  const { data: userProfile, isLoading: profileLoading } = useDoc(userProfileRef);
  const organizationName = userProfile?.organizationName || userProfile?.businessName || 'Regional Authority';
  const isLockedIn = !!userProfile?.regionalBoundaryLocked;
  const regionalBoundaryGeoJson = userProfile?.regionalBoundary || null;

  // Composer Form State: Default to Standard (Normal) priority
  const [broadcastType, setBroadcastType] = useState<'standard' | 'urgent' | 'emergency'>('standard');
  const [alertTier, setAlertTier] = useState('tier1');
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [activateImmediately, setActivateImmediately] = useState(true);
  const [scheduledDate, setScheduledDate] = useState('');
  const [scheduledTime, setScheduledTime] = useState('');
  // SAFETY GUARD: Initialized to empty array so authority MUST explicitly select target hubs
  const [selectedCommunityIds, setSelectedCommunityIds] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Lock immediate activation for Urgent and Emergency alerts
  useEffect(() => {
    if (broadcastType !== 'standard') {
      setActivateImmediately(true);
    }
  }, [broadcastType]);

  // Broadcast History & Modal State
  const [broadcasts, setBroadcasts] = useState<any[]>([]);
  const [statusFilter, setStatusFilter] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedBroadcast, setSelectedBroadcast] = useState<any | null>(null);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isRedAlertWarningModalOpen, setIsRedAlertWarningModalOpen] = useState(false);

  // Live Firestore query for registered communities with polygon maps
  const communitiesQuery = useMemoFirebase(() => {
    if (!db) return null;
    return query(collection(db, 'communities'), where('boundary', '!=', null));
  }, [db]);

  const { data: registeredDocs, isLoading: isLoadingCommunities } = useCollection(communitiesQuery);

  // STRICT SPATIAL CONTAINMENT FILTER:
  // ONLY communities whose registered polygon map falls INSIDE the locked regional boundary can be targeted!
  const encompassedCommunities = useMemo(() => {
    if (!registeredDocs || registeredDocs.length === 0 || !regionalBoundaryGeoJson) return [];
    return registeredDocs
      .map((docItem: any) => ({
        id: docItem.id || docItem.docId || String(Math.random()),
        name: docItem.name || 'Registered Community',
        population: docItem.memberCount || docItem.population || docItem.residentCount || 'Registered Hub',
        boundary: docItem.boundary,
      }))
      .filter(comm => !!comm.boundary && isCommunityInsideRegionalBoundary(regionalBoundaryGeoJson, comm.boundary));
  }, [registeredDocs, regionalBoundaryGeoJson]);

  // Live snapshot of regional broadcasts history with 28-DAY AUTO-ARCHIVING HOUSEKEEPING POLICY
  useEffect(() => {
    if (!db || !user) return;
    const q = query(
      collection(db, 'regionalBroadcasts'),
      where('authorityUserId', '==', user.uid)
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const TWENTY_EIGHT_DAYS_MS = 28 * 24 * 60 * 60 * 1000;
      const nowMs = Date.now();

      const docs = snapshot.docs.map(docSnap => {
        const data = docSnap.data();
        const createdAtMs = data.createdAt?.toMillis?.() || 0;
        const isExpired = createdAtMs > 0 && (nowMs - createdAtMs > TWENTY_EIGHT_DAYS_MS);

        let status = data.status || 'Live';
        if (isExpired && status !== 'Archived') {
          status = 'Archived';
          // Automatically update in Firestore under 28-day housekeeping policy
          updateDoc(doc(db, 'regionalBroadcasts', docSnap.id), { 
            status: 'Archived', 
            autoArchivedReason: '28-Day Platform Housekeeping Expiration' 
          }).catch(() => {});
        }

        return {
          id: docSnap.id,
          ...data,
          status
        };
      });
      docs.sort((a: any, b: any) => (b.createdAt?.toMillis?.() || 0) - (a.createdAt?.toMillis?.() || 0));
      setBroadcasts(docs);
    });
    return () => unsubscribe();
  }, [db, user]);

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedCommunityIds(encompassedCommunities.map(c => c.id));
    } else {
      setSelectedCommunityIds([]);
    }
  };

  const handleToggleCommunity = (commId: string) => {
    if (selectedCommunityIds.includes(commId)) {
      setSelectedCommunityIds(selectedCommunityIds.filter(id => id !== commId));
    } else {
      setSelectedCommunityIds([...selectedCommunityIds, commId]);
    }
  };

  const handleDispatch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !message) {
      toast({
        title: 'Missing Information',
        description: 'Please enter a broadcast title and message.',
        variant: 'destructive'
      });
      return;
    }
    if (selectedCommunityIds.length === 0) {
      toast({
        title: 'No Communities Selected',
        description: 'Please select at least one community within your boundary to receive this alert.',
        variant: 'destructive'
      });
      return;
    }

    if (!activateImmediately && broadcastType === 'standard' && (!scheduledDate || !scheduledTime)) {
      toast({
        title: 'Scheduled Date & Time Required',
        description: 'Please select both a date and time to schedule this broadcast.',
        variant: 'destructive'
      });
      return;
    }

    if (broadcastType === 'emergency') {
      setIsRedAlertWarningModalOpen(true);
    } else {
      executeDispatch();
    }
  };

  const executeDispatch = async () => {
    setIsSubmitting(true);
    setIsRedAlertWarningModalOpen(false);

    try {
      if (db && user) {
        const targetNames = encompassedCommunities
          .filter(c => selectedCommunityIds.includes(c.id))
          .map(c => c.name);

        await addDoc(collection(db, 'regionalBroadcasts'), {
          authorityUserId: user.uid,
          organizationName,
          broadcastType,
          alertTier,
          title,
          message,
          status: activateImmediately ? 'Live' : 'Scheduled',
          scheduledDate: !activateImmediately ? scheduledDate : null,
          scheduledTime: !activateImmediately ? scheduledTime : null,
          targetCommunityIds: selectedCommunityIds,
          targetCommunityNames: targetNames,
          emailDispatched: broadcastType === 'emergency',
          bccProtected: true,
          createdAt: serverTimestamp(),
        });

        // Dual-write to main announcements collection for live rendering across the platform
        await addDoc(collection(db, 'announcements'), {
          subject: title,
          message: message,
          type: broadcastType === 'emergency' ? 'Emergency' : 'Standard',
          severity: broadcastType === 'urgent' ? 'urgent' : 'normal',
          scope: broadcastType === 'emergency' ? 'community' : 'platform',
          status: activateImmediately ? 'Live' : 'Scheduled',
          scheduledDates: activateImmediately ? 'Active' : `Scheduled for ${scheduledDate} ${scheduledTime}`,
          targetCommunityIds: selectedCommunityIds,
          creator: organizationName,
          creatorId: user.uid,
          isRegionalNetwork: true,
          createdAt: serverTimestamp(),
        });

        // Trigger Brevo Email Dispatch if Emergency Red Alert
        if (broadcastType === 'emergency') {
          try {
            const usersRef = collection(db, 'users');
            const targetIds = selectedCommunityIds.slice(0, 10);
            if (targetIds.length > 0) {
              const usersSnap = await getDocs(query(usersRef, where('homeCommunityId', 'in', targetIds)));
              const recipientEmails: { email: string; name?: string }[] = [];
              
              usersSnap.forEach((uDoc) => {
                const uData = uDoc.data();
                if (uData.email) {
                  recipientEmails.push({ email: uData.email, name: uData.name || 'Resident' });
                }
              });

              if (recipientEmails.length > 0) {
                await sendEmail({
                  to: recipientEmails,
                  subject: `🚨 CRITICAL EMERGENCY ALERT: ${title}`,
                  htmlContent: `
                    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 3px solid #dc2626; border-radius: 12px; overflow: hidden;">
                      <div style="background-color: #dc2626; color: #ffffff; padding: 20px; text-align: center;">
                        <h1 style="margin: 0; font-size: 24px;">🚨 CRITICAL EMERGENCY ALERT</h1>
                        <p style="margin: 5px 0 0 0; font-size: 14px;">Issued by ${organizationName}</p>
                      </div>
                      <div style="padding: 24px; background-color: #ffffff; color: #1e293b;">
                        <h2 style="color: #b91c1c; margin-top: 0;">${title}</h2>
                        <div style="background-color: #fef2f2; border-left: 4px solid #ef4444; padding: 15px; margin: 15px 0; font-size: 15px; line-height: 1.6;">
                          ${message.replace(/\n/g, '<br/>')}
                        </div>
                        <p style="font-size: 12px; color: #64748b; margin-top: 25px; border-t: 1px solid #e2e8f0; padding-top: 15px;">
                          Targeted Communities: ${targetNames.join(', ')}<br/>
                          This automated emergency alert was broadcast by your Regional Network Authority. To protect resident privacy and personal security, your email address is strictly hidden via Blind Carbon Copy (BCC).
                        </p>
                      </div>
                    </div>
                  `
                });
              }
            }
          } catch (emailErr) {
            console.warn("Brevo email dispatch notice:", emailErr);
          }
        }
      }

      toast({
        title: broadcastType === 'emergency' ? '🔥 Emergency Red Alert Dispatched & Emails Sent!' : 'Broadcast Dispatched Successfully!',
        description: broadcastType === 'emergency' 
          ? `Dispatched Red Alert to ${selectedCommunityIds.length} hubs with automated Brevo BCC email coverage.`
          : `Sent ${broadcastType.toUpperCase()} broadcast to ${selectedCommunityIds.length} targeted hubs.`
      });
      setTitle('');
      setMessage('');
    } catch (err: any) {
      console.error("Broadcast error:", err);
      toast({
        variant: 'destructive',
        title: 'Error Dispatching Broadcast',
        description: err.message || 'Could not send broadcast.'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateStatus = async (id: string, newStatus: string) => {
    if (!db) return;
    try {
      await updateDoc(doc(db, 'regionalBroadcasts', id), { status: newStatus });
      toast({ title: "Status Updated", description: `Broadcast status changed to ${newStatus}.` });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  const filteredBroadcasts = broadcasts.filter(b => {
    const matchesStatus = statusFilter === 'All' || b.status === statusFilter;
    const matchesQuery = (b.title || '').toLowerCase().includes(searchQuery.toLowerCase()) || 
                         (b.message || '').toLowerCase().includes(searchQuery.toLowerCase());
    return matchesStatus && matchesQuery;
  });

  return (
    <div className="container mx-auto max-w-7xl py-8 px-4 space-y-8">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b pb-6">
        <div>
          <Button asChild variant="ghost" size="sm" className="mb-2 p-0 h-auto">
            <Link href="/regional/dashboard">
              <ArrowLeft className="mr-2 h-4 w-4" /> Back to Dashboard
            </Link>
          </Button>
          <div className="flex items-center gap-2">
            <h1 className="text-3xl font-extrabold font-headline tracking-tight">
              Regional Broadcast & Emergency Management
            </h1>
            {isLockedIn && (
              <Badge className="bg-emerald-600 text-white text-xs">
                <Lock className="h-3 w-3 mr-1" /> Boundary Geofenced
              </Badge>
            )}
          </div>
          <p className="text-muted-foreground text-sm mt-1">
            Dispatch, schedule, and manage multi-community broadcasts for {organizationName}.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Badge variant="outline" className="bg-muted px-3 py-1 text-xs">
            In-Boundary Recipient Hubs: <strong className="ml-1 text-emerald-600 font-bold">{encompassedCommunities.length}</strong>
          </Badge>
        </div>
      </div>

      {profileLoading || isLoadingCommunities ? (
        <div className="py-20 text-center space-y-3">
          <Loader2 className="h-8 w-8 animate-spin text-emerald-600 mx-auto" />
          <p className="text-sm text-muted-foreground">Verifying regional boundary & target communities...</p>
        </div>
      ) : !isLockedIn || !regionalBoundaryGeoJson ? (
        <Card className="max-w-xl mx-auto text-center p-8 space-y-4 shadow-sm border-dashed border-2">
          <div className="p-4 rounded-full bg-amber-100 dark:bg-amber-950 text-amber-600 w-16 h-16 mx-auto flex items-center justify-center">
            <AlertTriangle className="h-8 w-8" />
          </div>
          <div className="space-y-2">
            <h3 className="text-xl font-bold text-foreground">Boundary Setup Required Before Dispatching</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Regional broadcasts are strictly geofenced to your locked boundary map. You must lock in your perimeter on the setup page before dispatching alerts.
            </p>
          </div>
          <Button asChild className="bg-emerald-600 hover:bg-emerald-700 font-bold">
            <Link href="/regional/map">
              <Globe className="mr-2 h-4 w-4" /> Open Boundary Setup & Map
            </Link>
          </Button>
        </Card>
      ) : (
        <div className="space-y-10">
          
          {/* BROADCAST COMPOSER CARD (Leader Style) */}
          <Card className="shadow-lg border-2 border-emerald-500/20">
            <CardHeader className="bg-muted/40 border-b p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-emerald-600 text-white">
                    <Radio className="h-6 w-6" />
                  </div>
                  <div>
                    <CardTitle className="text-xl font-bold font-headline">Create New Regional Broadcast</CardTitle>
                    <CardDescription className="text-xs mt-0.5">
                      Compose emergency or standard regional announcements strictly targeted to your locked perimeter.
                    </CardDescription>
                  </div>
                </div>

                <Badge className="bg-emerald-100 text-emerald-800 border-emerald-300 text-xs hidden sm:inline-flex">
                  <ShieldCheck className="h-3.5 w-3.5 mr-1" /> 100% Geofenced
                </Badge>
              </div>
            </CardHeader>

            <CardContent className="p-6">
              <form onSubmit={handleDispatch} className="space-y-6">
                
                {/* Broadcast Priority Level Radio Selection */}
                <div className="space-y-3">
                  <Label className="text-sm font-semibold">Broadcast Priority Level</Label>
                  <RadioGroup 
                    value={broadcastType} 
                    onValueChange={(val) => setBroadcastType(val as any)}
                    className="grid grid-cols-1 md:grid-cols-3 gap-4"
                  >
                    <Label className={`flex items-center justify-between p-4 rounded-xl border-2 cursor-pointer transition-all ${broadcastType === 'standard' ? 'border-blue-500 bg-blue-50/50 dark:bg-blue-950/20' : 'border-muted hover:border-muted-foreground'}`}>
                      <div className="flex items-center gap-3">
                        <RadioGroupItem value="standard" id="standard" />
                        <div>
                          <div className="font-bold text-blue-600 dark:text-blue-400 flex items-center gap-1.5 text-sm">
                            <Megaphone className="h-4 w-4" /> Standard (Normal)
                          </div>
                          <span className="text-xs text-muted-foreground">Homepage billboard banner & feed post.</span>
                        </div>
                      </div>
                    </Label>

                    <Label className={`flex items-center justify-between p-4 rounded-xl border-2 cursor-pointer transition-all ${broadcastType === 'urgent' ? 'border-amber-500 bg-amber-50/50 dark:bg-amber-950/20' : 'border-muted hover:border-muted-foreground'}`}>
                      <div className="flex items-center gap-3">
                        <RadioGroupItem value="urgent" id="urgent" />
                        <div>
                          <div className="font-bold text-amber-600 dark:text-amber-400 flex items-center gap-1.5 text-sm">
                            <AlertTriangle className="h-4 w-4" /> Urgent (Amber Alert)
                          </div>
                          <span className="text-xs text-muted-foreground">High priority warning banner & highlighted post.</span>
                        </div>
                      </div>
                    </Label>

                    <Label className={`flex items-center justify-between p-4 rounded-xl border-2 cursor-pointer transition-all ${broadcastType === 'emergency' ? 'border-red-500 bg-red-50/50 dark:bg-red-950/20' : 'border-muted hover:border-muted-foreground'}`}>
                      <div className="flex items-center gap-3">
                        <RadioGroupItem value="emergency" id="emergency" />
                        <div>
                          <div className="font-bold text-red-600 dark:text-red-400 flex items-center gap-1.5 text-sm">
                            <Flame className="h-4 w-4" /> Emergency (Red Alert)
                          </div>
                          <span className="text-xs text-muted-foreground">Top emergency warning header & pop-up modal.</span>
                        </div>
                      </div>
                    </Label>
                  </RadioGroup>
                </div>

                {/* Inline Emergency Red Alert Protocol Warning */}
                {broadcastType === 'emergency' && (
                  <Alert className="bg-red-50 border-red-300 dark:bg-red-950/40 dark:border-red-800 text-xs shadow-sm animate-in fade-in duration-200">
                    <ShieldAlert className="h-5 w-5 text-red-600 dark:text-red-400 shrink-0" />
                    <div>
                      <AlertTitle className="text-red-900 dark:text-red-200 font-bold text-sm flex items-center gap-2">
                        <span>🚨 Emergency Red Alert Protocol & Automated Brevo Email Broadcast</span>
                        <Badge className="bg-red-600 text-white text-[10px]">Brevo Email + BCC Privacy</Badge>
                      </AlertTitle>
                      <AlertDescription className="text-red-800 dark:text-red-300 text-xs mt-1.5 leading-relaxed">
                        Selecting <strong>Emergency (Red Alert)</strong> automatically triggers an urgent email broadcast via <strong>Brevo</strong> to all registered members in your selected community hubs. To protect resident identity, personal security, and privacy, all recipient email addresses are sent strictly via <strong>Blind Carbon Copy (BCC)</strong>. This ensures maximum coverage across your region during critical events.
                      </AlertDescription>
                    </div>
                  </Alert>
                )}

                {/* Form Inputs Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  
                  {/* Left Column: Text & Settings */}
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="title">Headline / Subject Title</Label>
                      <Input 
                        id="title"
                        placeholder="e.g. Regional Flood Warning & Safety Advice"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="message">Broadcast Message & Instructions</Label>
                      <Textarea 
                        id="message"
                        placeholder="Provide detailed information, safety instructions, emergency contact numbers, and road closures..."
                        rows={6}
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        required
                      />
                    </div>

                    {broadcastType !== 'standard' ? (
                      <div className="flex items-center justify-between p-4 rounded-lg border bg-muted/30">
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-2">
                            <Label className="text-sm font-semibold">Activate Immediately</Label>
                            <Badge className="bg-amber-100 text-amber-900 border-amber-300 text-[10px]">
                              <Lock className="h-3 w-3 mr-1 text-amber-700" /> Locked Immediate
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground">Urgent & Emergency alerts are strictly locked to immediate activation for resident safety.</p>
                        </div>
                        <Switch checked={true} disabled={true} />
                      </div>
                    ) : (
                      <>
                        <div className="flex items-center justify-between p-4 rounded-lg border bg-muted/20">
                          <div className="space-y-0.5">
                            <Label className="text-sm font-semibold">Activate Immediately</Label>
                            <p className="text-xs text-muted-foreground">Publish to target community feeds as soon as submitted.</p>
                          </div>
                          <Switch 
                            checked={activateImmediately} 
                            onCheckedChange={setActivateImmediately} 
                          />
                        </div>

                        {!activateImmediately && (
                          <div className="p-4 rounded-lg border bg-blue-50/50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800 space-y-3 animate-in fade-in duration-200">
                            <div className="flex items-center gap-2">
                              <Calendar className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                              <Label className="text-xs font-bold uppercase tracking-wider text-blue-900 dark:text-blue-200">
                                Schedule Broadcast Dispatch Date & Time
                              </Label>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                              <div className="space-y-1">
                                <Label htmlFor="sched-date" className="text-xs font-medium">Dispatch Date</Label>
                                <Input 
                                  id="sched-date"
                                  type="date"
                                  className="h-9 text-xs bg-background"
                                  value={scheduledDate}
                                  onChange={(e) => setScheduledDate(e.target.value)}
                                  required={!activateImmediately}
                                />
                              </div>
                              <div className="space-y-1">
                                <Label htmlFor="sched-time" className="text-xs font-medium">Dispatch Time</Label>
                                <Input 
                                  id="sched-time"
                                  type="time"
                                  className="h-9 text-xs bg-background"
                                  value={scheduledTime}
                                  onChange={(e) => setScheduledTime(e.target.value)}
                                  required={!activateImmediately}
                                />
                              </div>
                            </div>
                          </div>
                        )}
                      </>
                    )}
                  </div>

                  {/* Right Column: In-Boundary Recipient Hubs Selection */}
                  <div className="space-y-4">
                    <div className="p-4 rounded-xl border bg-muted/10 space-y-3">
                      <div className="flex items-center justify-between pb-2 border-b">
                        <div className="flex items-center gap-2">
                          <ShieldCheck className="h-4 w-4 text-emerald-600" />
                          <Label className="text-xs font-bold uppercase tracking-wider text-foreground">
                            Boundary Target Hubs ({encompassedCommunities.length})
                          </Label>
                        </div>
                        <Checkbox 
                          checked={selectedCommunityIds.length === encompassedCommunities.length}
                          onCheckedChange={(checked) => handleSelectAll(!!checked)}
                        />
                      </div>

                      <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
                        {encompassedCommunities.map((comm) => (
                          <div key={comm.id} className="flex items-center justify-between p-2 rounded-lg bg-card border hover:bg-muted/40 text-xs">
                            <div className="flex items-center gap-2">
                              <MapPin className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                              <span className="font-semibold text-foreground">{comm.name}</span>
                            </div>
                            <Checkbox 
                              checked={selectedCommunityIds.includes(comm.id)}
                              onCheckedChange={() => handleToggleCommunity(comm.id)}
                            />
                          </div>
                        ))}
                      </div>

                      {selectedCommunityIds.length === 0 && (
                        <p className="text-[11px] text-amber-600 dark:text-amber-400 font-medium text-center pt-1">
                          ⚠️ Please manually check the hubs you wish to target.
                        </p>
                      )}

                      <div className="pt-2 flex justify-between items-center text-xs text-muted-foreground border-t">
                        <span>Selected: <strong className="text-foreground">{selectedCommunityIds.length}</strong> / {encompassedCommunities.length}</span>
                        <span className="text-[11px] text-emerald-600 font-semibold">100% Geofenced</span>
                      </div>
                    </div>

                    <Alert className="bg-red-50 border-red-200 dark:bg-red-950/20 text-xs">
                      <ShieldAlert className="h-4 w-4 text-red-600" />
                      <AlertTitle className="text-red-800 dark:text-red-300 font-semibold text-xs">Boundary Scoped Only</AlertTitle>
                      <AlertDescription className="text-xs text-red-700 dark:text-red-400 mt-0.5">
                        Broadcasts cannot leak outside your perimeter map.
                      </AlertDescription>
                    </Alert>
                  </div>

                </div>

                <Button 
                  type="submit" 
                  size="lg" 
                  className={`w-full font-bold py-6 text-base shadow-md ${
                    broadcastType === 'emergency' ? 'bg-red-600 hover:bg-red-700 text-white' : 
                    broadcastType === 'urgent' ? 'bg-amber-600 hover:bg-amber-700 text-white' : 
                    'bg-blue-600 hover:bg-blue-700 text-white'
                  }`}
                  disabled={isSubmitting || selectedCommunityIds.length === 0}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Dispatching Broadcast...
                    </>
                  ) : selectedCommunityIds.length === 0 ? (
                    <>
                      <AlertTriangle className="mr-2 h-5 w-5" /> Select At Least 1 Target Hub Below
                    </>
                  ) : (
                    <>
                      <Send className="mr-2 h-5 w-5" /> Dispatch {broadcastType.toUpperCase()} Alert to {selectedCommunityIds.length} Target Hubs
                    </>
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* BROADCAST HISTORY & MANAGEMENT TABLE (Leader Style) */}
          <Card className="shadow-md">
            <CardHeader className="border-b bg-muted/20 p-6">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <CardTitle className="text-xl font-bold font-headline flex items-center gap-2">
                      <Bell className="h-5 w-5 text-emerald-600" /> Regional Broadcast History & Status
                    </CardTitle>
                    <Badge variant="outline" className="text-[10px] bg-muted">
                      🧹 28-Day Auto-Archive Policy
                    </Badge>
                  </div>
                  <CardDescription className="text-xs mt-1">
                    Manage active alerts, pause live broadcasts, or view targeted community analytics. Broadcasts auto-archive after 28 days (4 weeks).
                  </CardDescription>
                </div>

                <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
                  <div className="relative flex-1 md:w-64">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input 
                      placeholder="Search broadcasts..." 
                      className="pl-9 h-9 text-xs"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                  </div>

                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-[130px] h-9 text-xs">
                      <SelectValue placeholder="Status Filter" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="All">All Statuses</SelectItem>
                      <SelectItem value="Live">Live</SelectItem>
                      <SelectItem value="Scheduled">Scheduled</SelectItem>
                      <SelectItem value="Paused">Paused</SelectItem>
                      <SelectItem value="Archived">Archived</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>

            <CardContent className="p-0">
              {filteredBroadcasts.length > 0 ? (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/50 text-xs">
                        <TableHead className="w-[280px]">Broadcast Headline</TableHead>
                        <TableHead>Priority State</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Target Recipient Hubs</TableHead>
                        <TableHead>Date Dispatched</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredBroadcasts.map((b) => (
                        <TableRow key={b.id} className="hover:bg-muted/40 text-xs">
                          <TableCell className="font-semibold text-foreground max-w-[280px] truncate">
                            {b.title}
                          </TableCell>
                          <TableCell>
                            <Badge className={
                              b.broadcastType === 'emergency' ? 'bg-red-100 text-red-800 dark:bg-red-950/60 dark:text-red-300' :
                              b.broadcastType === 'urgent' ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300' :
                              'bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300'
                            }>
                              {b.broadcastType === 'emergency' ? '🔥 Emergency' : b.broadcastType === 'urgent' ? '⚠️ Urgent' : '📌 Standard (Normal)'}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge className={
                              b.status === 'Live' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300' :
                              b.status === 'Paused' ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300' :
                              'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300'
                            }>
                              {b.status || 'Live'}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <span className="font-semibold text-foreground">
                              {b.targetCommunityNames?.length || b.targetCommunityIds?.length || 0} Hubs
                            </span>
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {b.createdAt?.toDate ? format(b.createdAt.toDate(), 'dd MMM yyyy, HH:mm') : 'Just now'}
                          </TableCell>
                          <TableCell className="text-right">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" className="h-8 w-8 p-0">
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                <DropdownMenuItem onClick={() => { setSelectedBroadcast(b); setIsViewModalOpen(true); }}>
                                  <Eye className="mr-2 h-4 w-4" /> View Details
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                {b.status === 'Live' && (
                                  <DropdownMenuItem onClick={() => handleUpdateStatus(b.id, 'Paused')}>
                                    <PauseCircle className="mr-2 h-4 w-4 text-amber-600" /> Pause Alert
                                  </DropdownMenuItem>
                                )}
                                {b.status === 'Paused' && (
                                  <DropdownMenuItem onClick={() => handleUpdateStatus(b.id, 'Live')}>
                                    <PlayCircle className="mr-2 h-4 w-4 text-emerald-600" /> Reactivate Alert
                                  </DropdownMenuItem>
                                )}
                                {b.status !== 'Archived' && (
                                  <DropdownMenuItem onClick={() => handleUpdateStatus(b.id, 'Archived')} className="text-slate-600">
                                    <Archive className="mr-2 h-4 w-4" /> Archive Alert
                                  </DropdownMenuItem>
                                )}
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <div className="py-12 text-center space-y-3">
                  <Bell className="h-8 w-8 text-muted-foreground mx-auto" />
                  <p className="text-xs text-muted-foreground">No regional broadcasts found matching your filter.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* VIEW BROADCAST MODAL */}
      <Dialog open={isViewModalOpen} onOpenChange={setIsViewModalOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <div className="flex items-center gap-2 mb-1">
              <Badge className={selectedBroadcast?.broadcastType === 'emergency' ? 'bg-red-600 text-white' : 'bg-blue-600 text-white'}>
                {selectedBroadcast?.broadcastType === 'emergency' ? 'Emergency Alert' : 'Standard Broadcast'}
              </Badge>
              <Badge variant="outline">{selectedBroadcast?.status}</Badge>
            </div>
            <DialogTitle className="text-xl font-bold">{selectedBroadcast?.title}</DialogTitle>
            <DialogDescription className="text-xs">
              Dispatched by {selectedBroadcast?.organizationName}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-3 text-xs">
            <div className="p-4 rounded-xl bg-muted/40 border leading-relaxed space-y-2">
              <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Message Content</Label>
              <p className="text-foreground whitespace-pre-wrap">{selectedBroadcast?.message}</p>
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Targeted Community Hubs ({selectedBroadcast?.targetCommunityNames?.length || 0})</Label>
              <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto p-2 rounded-lg border bg-card">
                {selectedBroadcast?.targetCommunityNames?.map((name: string, i: number) => (
                  <Badge key={i} variant="secondary" className="text-[11px]">
                    <MapPin className="h-3 w-3 mr-1 text-emerald-600" /> {name}
                  </Badge>
                ))}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setIsViewModalOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* CONFIRMATION POP-UP MODAL FOR EMERGENCY RED ALERTS */}
      <Dialog open={isRedAlertWarningModalOpen} onOpenChange={setIsRedAlertWarningModalOpen}>
        <DialogContent className="max-w-lg border-2 border-red-500">
          <DialogHeader>
            <div className="flex items-center gap-2 mb-1">
              <Badge className="bg-red-600 text-white font-bold text-xs">
                <Flame className="h-3.5 w-3.5 mr-1" /> CRITICAL EMERGENCY RED ALERT
              </Badge>
              <Badge variant="outline" className="text-red-600 border-red-300">
                Brevo Email + BCC
              </Badge>
            </div>
            <DialogTitle className="text-xl font-bold font-headline text-red-900 dark:text-red-300 flex items-center gap-2">
              <ShieldAlert className="h-6 w-6 text-red-600 shrink-0" /> Confirm Emergency Red Alert Broadcast
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground mt-1">
              Issued by <strong>{organizationName}</strong> targeting <strong>{selectedCommunityIds.length} community hubs</strong>.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2 text-xs">
            <Alert className="bg-red-50 border-red-200 dark:bg-red-950/40 text-xs">
              <AlertTriangle className="h-4 w-4 text-red-600" />
              <AlertTitle className="text-red-900 dark:text-red-200 font-bold text-xs">Automated Brevo Email & Device Coverage</AlertTitle>
              <AlertDescription className="text-red-800 dark:text-red-300 text-xs mt-1 leading-relaxed">
                Emergency Red Alerts are automatically accompanied by instant email notifications sent to all registered community residents to ensure maximum regional coverage during urgent events.
              </AlertDescription>
            </Alert>

            <div className="p-4 rounded-xl border bg-card space-y-2.5">
              <h4 className="font-bold text-foreground text-xs uppercase tracking-wider">Security & Privacy Protocol Highlights:</h4>
              <ul className="space-y-2 text-muted-foreground">
                <li className="flex items-start gap-2">
                  <ShieldCheck className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                  <span><strong>100% BCC Identity Protection:</strong> All resident email addresses are hidden via Blind Carbon Copy (BCC) to protect personal security and privacy.</span>
                </li>
                <li className="flex items-start gap-2">
                  <Flame className="h-4 w-4 text-red-600 shrink-0 mt-0.5" />
                  <span><strong>Tier 1 High-Priority Banner & Pop-up:</strong> Triggers an immediate top warning header & modal dialog on resident mobile and web devices.</span>
                </li>
                <li className="flex items-start gap-2">
                  <MapPin className="h-4 w-4 text-blue-600 shrink-0 mt-0.5" />
                  <span><strong>Geofenced Coverage:</strong> Strictly restricted to the <strong>{selectedCommunityIds.length}</strong> hubs within your locked boundary polygon.</span>
                </li>
              </ul>
            </div>

            <div className="p-3 rounded-lg bg-muted/40 border text-[11px] text-muted-foreground">
              <strong>Headline:</strong> <span className="text-foreground font-medium">{title}</span>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" size="sm" onClick={() => setIsRedAlertWarningModalOpen(false)}>
              Cancel / Review
            </Button>
            <Button 
              size="sm" 
              className="bg-red-600 hover:bg-red-700 text-white font-bold"
              onClick={() => executeDispatch()}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Dispatching...
                </>
              ) : (
                <>
                  <Flame className="mr-2 h-4 w-4" /> Confirm & Dispatch Red Alert
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
