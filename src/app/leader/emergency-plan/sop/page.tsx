'use client';

import React, { useState, useEffect, useMemo, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useUser, useFirestore, useDoc, useMemoFirebase, useCollection } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import {
  ListChecks,
  Flame,
  Building,
  Waves,
  Zap,
  Droplets,
  ShieldCheck,
  Award,
  Printer,
  Save,
  RotateCcw,
  PlusCircle,
  Plus,
  Trash2,
  CheckSquare2,
  Square,
  Megaphone,
  ShieldAlert,
  Send,
  Key,
  Truck,
  ArrowLeft,
  Loader2,
  Radio,
  Clock,
  Sparkles,
  ExternalLink,
  Edit3
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { doc, getDoc, setDoc, serverTimestamp, collection } from 'firebase/firestore';
import {
  publishCommunityEmergencyBroadcastAction,
  updateLiveThreatStatusAction,
  standDownEmergencyAndArchiveBulletinsAction,
  logEmergencyAuditAction,
  KeyholderItem,
  WildfireAssetItem
} from '@/lib/actions/emergencyPlanActions';
import {
  IncidentSopPhase,
  IncidentSopTask,
  ScenarioSopsMap,
  DEFAULT_SCENARIO_SOPS,
  EvacuationTransportPartner,
  EvacuationCollectionPoint,
  EvacuationDepartureLog,
  DEFAULT_EVACUATION_PARTNERS,
  DEFAULT_COLLECTION_POINTS,
  TransportReadinessStatus,
  TransportVehicleType
} from '@/lib/types/emergencySop';
import { Bus, Car, Phone, Navigation, MapPin, Users, CheckCircle2 } from 'lucide-react';

const HAZARDS: { id: string; title: string; icon: any; color: string; bg: string }[] = [
  { id: 'wildfire', title: 'Wildfire', icon: Flame, color: 'text-red-400', bg: 'bg-red-600' },
  { id: 'urbanfire', title: 'Urban Fire', icon: Building, color: 'text-orange-400', bg: 'bg-orange-600' },
  { id: 'flood', title: 'Flood & Surge', icon: Waves, color: 'text-cyan-400', bg: 'bg-cyan-600' },
  { id: 'power', title: 'Power Outage', icon: Zap, color: 'text-amber-400', bg: 'bg-amber-600' },
  { id: 'drought', title: 'Water Shortage', icon: Droplets, color: 'text-blue-400', bg: 'bg-blue-600' },
  { id: 'unrest', title: 'Civil Unrest', icon: ShieldCheck, color: 'text-purple-400', bg: 'bg-purple-600' },
  { id: 'defence', title: 'Civil Defence', icon: Award, color: 'text-emerald-400', bg: 'bg-emerald-600' }
];

function IncidentSopPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const rawHazard = searchParams.get('hazard') || 'wildfire';
  const activeHazard = HAZARDS.some((h) => h.id === rawHazard) ? rawHazard : 'wildfire';

  const { user } = useUser();
  const db = useFirestore();
  const { toast } = useToast();

  const userDocRef = useMemoFirebase(() => {
    if (!db || !user) return null;
    return doc(db, 'users', user.uid);
  }, [db, user]);
  const { data: userProfile } = useDoc(userDocRef);

  const activeCommunityId = (userProfile as any)?.impersonating?.communityId || (userProfile as any)?.primaryCommunityId || (userProfile as any)?.communityId || '9ayHMyZf4SRw2gof1AM9';

  const communityDocRef = useMemoFirebase(() => {
    if (!db || !activeCommunityId) return null;
    return doc(db, 'communities', activeCommunityId);
  }, [db, activeCommunityId]);
  const { data: communityData } = useDoc(communityDocRef);

  const [townshipName, setTownshipName] = useState('Local Community');
  const [sopsMap, setSopsMap] = useState<ScenarioSopsMap>(DEFAULT_SCENARIO_SOPS);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const [keyholdersList, setKeyholdersList] = useState<KeyholderItem[]>([]);
  const [wfStationTel, setWfStationTel] = useState('');
  const [commsHamFreq, setCommsHamFreq] = useState('');
  const [commsNoticeboards, setCommsNoticeboards] = useState('');
  const [primaryShelter, setPrimaryShelter] = useState('');
  const [secondaryShelter, setSecondaryShelter] = useState('');

  const [isPocketPrintModalOpen, setIsPocketPrintModalOpen] = useState(false);
  const [isQuickAnnouncementModalOpen, setIsQuickAnnouncementModalOpen] = useState(false);
  const [quickAnnounceTitle, setQuickAnnounceTitle] = useState('');
  const [quickAnnounceBody, setQuickAnnounceBody] = useState('');
  const [isDispatchingAnnouncement, setIsDispatchingAnnouncement] = useState(false);

  // Evacuation Transport Fleet & Live Dispatcher State
  const [evacuationPartners, setEvacuationPartners] = useState<EvacuationTransportPartner[]>(DEFAULT_EVACUATION_PARTNERS);
  const [collectionPoints, setCollectionPoints] = useState<EvacuationCollectionPoint[]>(DEFAULT_COLLECTION_POINTS);
  const [departureLogs, setDepartureLogs] = useState<EvacuationDepartureLog[]>([]);
  const [isLogDepartureModalOpen, setIsLogDepartureModalOpen] = useState(false);
  const [departureFormData, setDepartureFormData] = useState({
    operator: 'Stagecoach North Scotland (Coach #1)',
    vehicleType: 'coach' as TransportVehicleType,
    headcount: 52,
    fromPoint: 'The Square & Burnfield Coach Park',
    toShelter: 'Aviemore Community & Sports Complex (Shelter Alpha)'
  });

  // Stand Down & Bulk Bulletin Archive State
  const [isStandDownDialogOpen, setIsStandDownDialogOpen] = useState(false);
  const [isStandingDown, setIsStandingDown] = useState(false);
  const [standDownIssueAllClear, setStandDownIssueAllClear] = useState(true);
  const [standDownAllClearTitle, setStandDownAllClearTitle] = useState('🟢 ALL CLEAR: Emergency Incident Stood Down');
  const [standDownAllClearBody, setStandDownAllClearBody] = useState('Official incident stand-down. Emergency response services have stood down. Road cordons are open and community facilities have returned to regular schedule.');

  const totalEvacuatedHeadcount = useMemo(() => {
    return departureLogs.reduce((acc, log) => acc + (log.headcount || 0), 0);
  }, [departureLogs]);

  const handleSetAllFleetStatus = async (newStatus: TransportReadinessStatus) => {
    const updated = evacuationPartners.map(p => ({ ...p, status: newStatus }));
    setEvacuationPartners(updated);
    toast({
      title: 'Fleet Status Updated',
      description: `All ${updated.length} evacuation transport partners set to ${newStatus.toUpperCase()}`
    });
    if (db && activeCommunityId) {
      try {
        const planDocRef = doc(db, 'communities', activeCommunityId, 'emergency_plan', 'main');
        await setDoc(planDocRef, { evacuationPartners: updated }, { merge: true });
      } catch (e) {
        console.error(e);
      }
    }
  };

  const handleSetPartnerStatus = async (id: string, newStatus: TransportReadinessStatus) => {
    const updated = evacuationPartners.map(p => p.id === id ? { ...p, status: newStatus } : p);
    setEvacuationPartners(updated);
    if (db && activeCommunityId) {
      try {
        const planDocRef = doc(db, 'communities', activeCommunityId, 'emergency_plan', 'main');
        await setDoc(planDocRef, { evacuationPartners: updated }, { merge: true });
      } catch (e) {
        console.error(e);
      }
    }
  };

  const handleLogDeparture = async () => {
    if (!departureFormData.operator || !departureFormData.headcount) {
      toast({ title: 'Validation Error', description: 'Operator and passenger headcount required.', variant: 'destructive' });
      return;
    }
    const newLog: EvacuationDepartureLog = {
      id: `dep-${Date.now()}`,
      timestamp: new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }),
      operator: departureFormData.operator,
      vehicleType: departureFormData.vehicleType,
      headcount: Number(departureFormData.headcount) || 0,
      fromPoint: departureFormData.fromPoint,
      toShelter: departureFormData.toShelter,
      status: 'en_route',
      loggedBy: userProfile?.displayName || 'Incident Dispatcher'
    };
    const updatedLogs = [newLog, ...departureLogs];
    setDepartureLogs(updatedLogs);
    setIsLogDepartureModalOpen(false);
    toast({
      title: 'Departure Logged',
      description: `${newLog.headcount} passengers departed via ${newLog.operator} ➔ ${newLog.toShelter}`
    });
    if (db && activeCommunityId) {
      try {
        const planDocRef = doc(db, 'communities', activeCommunityId, 'emergency_plan', 'main');
        await setDoc(planDocRef, { departureLogs: updatedLogs }, { merge: true });
      } catch (e) {
        console.error(e);
      }
    }
  };

  const handleDeleteDepartureLog = async (id: string) => {
    const updatedLogs = departureLogs.filter(l => l.id !== id);
    setDepartureLogs(updatedLogs);
    if (db && activeCommunityId) {
      try {
        const planDocRef = doc(db, 'communities', activeCommunityId, 'emergency_plan', 'main');
        await setDoc(planDocRef, { departureLogs: updatedLogs }, { merge: true });
      } catch (e) {
        console.error(e);
      }
    }
  };

  // Sync townshipName if communityData loads and not custom saved
  
  const isDemo = typeof window !== 'undefined' && (sessionStorage.getItem('isDemoMode') === 'true' || window.location.pathname.startsWith('/demo'));
  const demoPrefix = isDemo ? '/demo' : '';
  const communityId = isDemo ? '9ayHMyZf4SRw2gof1AM9' : ((typeof window !== 'undefined' ? sessionStorage.getItem('visitedCommunityId') : null) || (userProfile as any)?.impersonating?.communityId || (userProfile as any)?.communityId || 'N3SarfGXPLxBI7XcsinX');

  useEffect(() => {
    if (communityData?.name) {
      setTownshipName((prev) => (!prev || prev === 'Local Community' || prev === 'Grantown-on-Spey' || prev === 'Oakridge & DemoVille') ? communityData.name : prev);
    }
  }, [communityData?.name]);

  // Load from Firestore
  useEffect(() => {
    if (!db || !activeCommunityId) {
      setIsLoading(false);
      return;
    }

    const fetchPlan = async () => {
      setIsLoading(true);
      try {
        const planDocRef = doc(db, 'communities', activeCommunityId, 'emergency_plan', 'main');
        const planSnap = await getDoc(planDocRef);
        if (planSnap.exists()) {
          const data = planSnap.data() as any;
          if (data.townshipName) setTownshipName(data.townshipName);
          if (data.keyholdersList && Array.isArray(data.keyholdersList)) setKeyholdersList(data.keyholdersList);
          if (data.wildfireContacts?.fireStationTel) setWfStationTel(data.wildfireContacts.fireStationTel);
          if (data.comms?.hamPmrFreq) setCommsHamFreq(data.comms.hamPmrFreq);
          if (data.comms?.noticeboardLocs) setCommsNoticeboards(data.comms.noticeboardLocs);
          if (data.scenarioFacilities?.[activeHazard]?.f1?.primary) {
            setPrimaryShelter(data.scenarioFacilities[activeHazard].f1.primary);
          }
          if (data.scenarioFacilities?.[activeHazard]?.f1?.secondary) {
            setSecondaryShelter(data.scenarioFacilities[activeHazard].f1.secondary);
          }

          if (Array.isArray(data.evacuationPartners) && data.evacuationPartners.length > 0) {
            setEvacuationPartners(data.evacuationPartners);
          }
          if (Array.isArray(data.collectionPoints) && data.collectionPoints.length > 0) {
            setCollectionPoints(data.collectionPoints);
          }
          if (Array.isArray(data.departureLogs)) {
            setDepartureLogs(data.departureLogs);
          }

          if (data.incidentSops && typeof data.incidentSops === 'object') {
            setSopsMap((prev) => ({
              ...DEFAULT_SCENARIO_SOPS,
              ...data.incidentSops
            }));
          } else if (Array.isArray(data.incidentSop) && data.incidentSop.length > 0) {
            // Legacy single sop migration
            setSopsMap((prev) => ({
              ...prev,
              [activeHazard]: data.incidentSop
            }));
          }
        }
      } catch (err) {
        console.error('Error loading incident SOPs:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchPlan();
  }, [db, activeCommunityId, activeHazard]);

  const currentHazardConfig = useMemo(() => {
    return HAZARDS.find((h) => h.id === activeHazard) || HAZARDS[0];
  }, [activeHazard]);

  const currentPhases = useMemo(() => {
    return sopsMap[activeHazard] || DEFAULT_SCENARIO_SOPS[activeHazard] || DEFAULT_SCENARIO_SOPS.wildfire;
  }, [sopsMap, activeHazard]);

  const totalTasks = useMemo(() => {
    return currentPhases.reduce((acc, p) => acc + (p.tasks?.length || 0), 0);
  }, [currentPhases]);

  const completedTasks = useMemo(() => {
    return currentPhases.reduce((acc, p) => acc + (p.tasks?.filter((t) => t.isCompleted)?.length || 0), 0);
  }, [currentPhases]);

  const progressPercent = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  // Toggle SOP Task Checkbox
  const handleToggleTask = async (phaseId: string, taskId: string) => {
    let updatedTaskTitle = '';
    let willBeCompleted = false;

    setSopsMap((prev) => {
      const current = prev[activeHazard] || DEFAULT_SCENARIO_SOPS[activeHazard];
      const updated = current.map((phase) => {
        if (phase.id !== phaseId) return phase;
        return {
          ...phase,
          tasks: phase.tasks.map((task) => {
            if (task.id !== taskId) return task;
            willBeCompleted = !task.isCompleted;
            updatedTaskTitle = task.title;
            return {
              ...task,
              isCompleted: willBeCompleted,
              completedAt: willBeCompleted ? new Date().toISOString() : null,
              completedBy: willBeCompleted ? ((userProfile as any)?.name || user?.displayName || 'Commander') : null
            };
          })
        };
      });
      return { ...prev, [activeHazard]: updated };
    });

    if (activeCommunityId && willBeCompleted) {
      try {
        await logEmergencyAuditAction({
          communityId: activeCommunityId,
          actionType: 'PLAN_SAVE',
          category: `${activeHazard.toUpperCase()} SOP Checklist`,
          actorName: (userProfile as any)?.name || user?.displayName || 'Incident Commander',
          actorEmail: user?.email || '',
          actorRole: (userProfile as any)?.role || 'Community Resilience Leader',
          actorId: user?.uid || 'leader',
          summary: `Executed ${currentHazardConfig.title} Action: "${updatedTaskTitle}"`,
          details: { hazard: activeHazard, phaseId, taskId, taskTitle: updatedTaskTitle }
        });
      } catch (e) {
        console.error('Audit log error:', e);
      }
    }
  };

  const handleUpdatePhase = (phaseId: string, field: keyof IncidentSopPhase, value: any) => {
    setSopsMap((prev) => {
      const current = prev[activeHazard] || DEFAULT_SCENARIO_SOPS[activeHazard];
      const updated = current.map((p) => (p.id === phaseId ? { ...p, [field]: value } : p));
      return { ...prev, [activeHazard]: updated };
    });
  };

  const handleUpdateTask = (phaseId: string, taskId: string, field: keyof IncidentSopTask, value: any) => {
    setSopsMap((prev) => {
      const current = prev[activeHazard] || DEFAULT_SCENARIO_SOPS[activeHazard];
      const updated = current.map((phase) => {
        if (phase.id !== phaseId) return phase;
        return {
          ...phase,
          tasks: phase.tasks.map((t) => (t.id === taskId ? { ...t, [field]: value } : t))
        };
      });
      return { ...prev, [activeHazard]: updated };
    });
  };

  const handleAddTask = (phaseId: string) => {
    const newTask: IncidentSopTask = {
      id: `task-${Date.now()}`,
      title: 'New Incident Operational Action',
      desc: 'Operational direction for assigned team member or volunteer...',
      role: 'Team Lead',
      shortcutAction: 'none',
      isCompleted: false
    };

    setSopsMap((prev) => {
      const current = prev[activeHazard] || DEFAULT_SCENARIO_SOPS[activeHazard];
      const updated = current.map((phase) => {
        if (phase.id !== phaseId) return phase;
        return { ...phase, tasks: [...phase.tasks, newTask] };
      });
      return { ...prev, [activeHazard]: updated };
    });
  };

  const handleDeleteTask = (phaseId: string, taskId: string) => {
    setSopsMap((prev) => {
      const current = prev[activeHazard] || DEFAULT_SCENARIO_SOPS[activeHazard];
      const updated = current.map((phase) => {
        if (phase.id !== phaseId) return phase;
        return { ...phase, tasks: phase.tasks.filter((t) => t.id !== taskId) };
      });
      return { ...prev, [activeHazard]: updated };
    });
  };

  const handleAddPhase = () => {
    const nextIdx = currentPhases.length + 1;
    const newPhase: IncidentSopPhase = {
      id: `phase-${Date.now()}`,
      timeTag: `PHASE ${nextIdx} (CUSTOM MILESTONE)`,
      title: 'Additional Community Operational Milestone',
      desc: 'Bespoke tactical steps tailored to local community layout.',
      tasks: [
        {
          id: `task-${Date.now()}-1`,
          title: 'Initial Phase Action Task',
          desc: 'Specific instruction for team members.',
          role: 'Team Member',
          shortcutAction: 'none',
          isCompleted: false
        }
      ]
    };

    setSopsMap((prev) => ({
      ...prev,
      [activeHazard]: [...currentPhases, newPhase]
    }));
  };

  const handleDeletePhase = (phaseId: string) => {
    setSopsMap((prev) => ({
      ...prev,
      [activeHazard]: currentPhases.filter((p) => p.id !== phaseId)
    }));
  };

  const handleResetToDefault = () => {
    if (window.confirm(`Reset ${currentHazardConfig.title} SOP to the standard Scottish Resilience template?`)) {
      setSopsMap((prev) => ({
        ...prev,
        [activeHazard]: DEFAULT_SCENARIO_SOPS[activeHazard]
      }));
      toast({
        title: 'SOP Reset to Template',
        description: `Standard ${currentHazardConfig.title} 5-phase protocol restored.`
      });
    }
  };

  // Save All SOPs to Firestore
  const handleSaveSop = async () => {
    if (!db || !activeCommunityId) return;
    setIsSaving(true);
    try {
      const planDocRef = doc(db, 'communities', activeCommunityId, 'emergency_plan', 'main');
      await setDoc(
        planDocRef,
        {
          incidentSops: sopsMap,
          updatedAt: serverTimestamp(),
          updatedBy: user?.uid || 'leader'
        },
        { merge: true }
      );

      await logEmergencyAuditAction({
        communityId: activeCommunityId,
        actionType: 'PLAN_SAVE',
        category: `${activeHazard.toUpperCase()} Incident SOP`,
        actorName: (userProfile as any)?.name || user?.displayName || 'Community Leader',
        actorEmail: user?.email || '',
        actorRole: (userProfile as any)?.role || 'Community Resilience Leader',
        actorId: user?.uid || 'leader',
        summary: `Saved Statutory ${currentHazardConfig.title} Incident SOP & Action Checklist`,
        details: { activeHazard, townshipName }
      });

      toast({
        title: 'Incident SOP Saved',
        description: `${currentHazardConfig.title} action checklist saved successfully.`
      });
    } catch (e: any) {
      console.error('Error saving SOP:', e);
      toast({ title: 'Error', description: e.message || 'Failed to save SOP.', variant: 'destructive' });
    } finally {
      setIsSaving(false);
    }
  };

  // Dedicated Isolated Print Engine (Opens clean, 1-page document with zero blank pages)
  const handlePrintPocketCard = () => {
    const printWindow = window.open('', '_blank', 'width=900,height=1100');
    if (!printWindow) {
      toast({
        title: 'Popup Blocked',
        description: 'Please allow popups in your browser to print the pocket incident card.',
        variant: 'destructive'
      });
      return;
    }

    const phasesHtml = currentPhases
      .map(
        (phase) => `
        <div class="phase-card">
          <div class="phase-header">
            <span class="phase-tag">${phase.timeTag}</span> — <span class="phase-title">${phase.title}</span>
          </div>
          <div class="phase-desc">${phase.desc}</div>
          <div class="tasks-list">
            ${phase.tasks
              .map(
                (task) => `
              <div class="task-row">
                <div class="checkbox-box"></div>
                <div class="task-content">
                  <strong>${task.title}:</strong> ${task.desc}
                  ${task.role ? `<span class="role-badge">[${task.role}]</span>` : ''}
                </div>
              </div>
            `
              )
              .join('')}
          </div>
        </div>
      `
      )
      .join('');

    const keyholdersHtml = keyholdersList
      .slice(0, 6)
      .map(
        (kh) => `
        <div class="contact-box">
          <div class="contact-title">${kh.facilityOrAsset}</div>
          <div class="contact-detail">Lead: <strong>${kh.primaryName || 'Designated Keyholder'}</strong> (${kh.primaryPhone || 'On Call'})</div>
          ${kh.keyLocationNotes ? `<div class="contact-notes">Access: ${kh.keyLocationNotes}</div>` : ''}
        </div>
      `
      )
      .join('');

    printWindow.document.write(`
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="utf-8" />
        <title>${townshipName.toUpperCase()} - ${currentHazardConfig.title.toUpperCase()} ACTION CARD</title>
        <style>
          @page {
            size: A4 portrait;
            margin: 8mm;
          }
          * {
            box-sizing: border-box;
            margin: 0;
            padding: 0;
          }
          body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif;
            color: #0f172a;
            background: #ffffff;
            font-size: 10px;
            line-height: 1.3;
            padding: 0;
          }
          .header-bar {
            border-bottom: 2.5px solid #0f172a;
            padding-bottom: 5px;
            margin-bottom: 8px;
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
          }
          .framework-tag {
            font-size: 8.5px;
            font-weight: 900;
            color: #dc2626;
            letter-spacing: 0.08em;
            text-transform: uppercase;
          }
          .headline {
            font-size: 15px;
            font-weight: 900;
            text-transform: uppercase;
            letter-spacing: -0.02em;
            margin-top: 1px;
            color: #0f172a;
          }
          .subheadline {
            font-size: 9.5px;
            font-weight: 600;
            color: #475569;
          }
          .meta-box {
            text-align: right;
            font-family: monospace;
            font-size: 9px;
            font-weight: bold;
            color: #334155;
          }
          .section-heading {
            font-size: 10px;
            font-weight: 900;
            text-transform: uppercase;
            letter-spacing: 0.05em;
            color: #0f172a;
            border-bottom: 1.5px solid #cbd5e1;
            padding-bottom: 2px;
            margin-top: 6px;
            margin-bottom: 5px;
            page-break-after: avoid;
            break-after: avoid;
          }
          .grid-4 {
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            gap: 5px;
            margin-bottom: 6px;
            page-break-inside: avoid;
            break-inside: avoid;
          }
          .grid-2 {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 5px;
            margin-bottom: 6px;
            page-break-inside: avoid;
            break-inside: avoid;
          }
          .contact-box {
            border: 1px solid #cbd5e1;
            border-radius: 5px;
            padding: 4px 6px;
            background: #f8fafc;
            page-break-inside: avoid;
            break-inside: avoid;
          }
          .contact-title {
            font-weight: bold;
            font-size: 9.5px;
            color: #0f172a;
          }
          .contact-title.red {
            color: #dc2626;
          }
          .contact-detail {
            font-size: 9px;
            color: #334155;
          }
          .contact-notes {
            font-size: 8px;
            color: #64748b;
            font-style: italic;
          }
          .phase-card {
            border: 1px solid #cbd5e1;
            border-radius: 5px;
            padding: 5px 7px;
            background: #f8fafc;
            margin-bottom: 5px;
            page-break-inside: avoid;
            break-inside: avoid;
          }
          .phase-header {
            font-size: 10px;
            border-bottom: 1px solid #e2e8f0;
            padding-bottom: 2px;
            margin-bottom: 2px;
          }
          .phase-tag {
            font-weight: 900;
            color: #0369a1;
            text-transform: uppercase;
          }
          .phase-title {
            font-weight: 700;
            color: #0f172a;
          }
          .phase-desc {
            font-size: 8.5px;
            color: #64748b;
            margin-bottom: 3px;
          }
          .tasks-list {
            display: flex;
            flex-direction: column;
            gap: 3px;
          }
          .task-row {
            display: flex;
            align-items: flex-start;
            gap: 5px;
            font-size: 9px;
            line-height: 1.2;
          }
          .checkbox-box {
            width: 9px;
            height: 9px;
            border: 1.5px solid #0f172a;
            border-radius: 2px;
            margin-top: 1px;
            flex-shrink: 0;
          }
          .task-content {
            flex-grow: 1;
            color: #1e293b;
          }
          .role-badge {
            font-size: 8px;
            font-weight: bold;
            color: #0284c7;
            margin-left: 2px;
          }
          .footer-note {
            border-top: 1px solid #cbd5e1;
            padding-top: 4px;
            margin-top: 6px;
            text-align: center;
            font-size: 8px;
            font-family: monospace;
            color: #64748b;
            page-break-inside: avoid;
            break-inside: avoid;
          }
        </style>
      </head>
      <body>
        <div class="header-bar">
          <div>
            <div class="framework-tag">SCOTTISH CIVIL RESILIENCE FRAMEWORK</div>
            <div class="headline">${townshipName.toUpperCase()} ${currentHazardConfig.title.toUpperCase()} ACTION CARD</div>
            <div class="subheadline">Commander Standard Operating Procedure (SOP) & Fast Grab-Bag Reference</div>
          </div>
          <div class="meta-box">
            <div>PLAN: STATUTORY ACTIVE</div>
            <div>HAZARD: ${currentHazardConfig.title.toUpperCase()}</div>
            <div>DATE: ${new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</div>
          </div>
        </div>

        <div class="section-heading">📞 STATUTORY BLUE-LIGHT & MULTI-AGENCY CONTACTS</div>
        <div class="grid-4">
          <div class="contact-box">
            <div class="contact-title red">EMERGENCY (999)</div>
            <div class="contact-detail">Fire, Police, Ambulance, Coastguard</div>
          </div>
          <div class="contact-box">
            <div class="contact-title">SFRS Local Station</div>
            <div class="contact-detail">${wfStationTel || '01463 723000'}</div>
          </div>
          <div class="contact-box">
            <div class="contact-title">SEPA Floodline</div>
            <div class="contact-detail">0345 988 1188</div>
          </div>
          <div class="contact-box">
            <div class="contact-title">SSEN Power (105)</div>
            <div class="contact-detail">0800 300 999</div>
          </div>
        </div>

        <div class="section-heading">🔑 KEYHOLDERS & EMERGENCY REST CENTRE ACCESS</div>
        <div class="grid-2">
          ${keyholdersHtml || '<div class="contact-box">No keyholders specified</div>'}
        </div>

        <div class="section-heading">📋 5-PHASE ${currentHazardConfig.title.toUpperCase()} OPERATIONAL ACTION CHECKLIST</div>
        ${phasesHtml}

        <div class="section-heading">📻 COMMUNICATIONS & EVACUATION REFUGE</div>
        <div class="grid-2">
          <div class="contact-box">
            <div class="contact-title">📻 Blackout Comms Net</div>
            <div class="contact-detail">Frequency: <strong>${commsHamFreq || '_____________________'}</strong></div>
            <div class="contact-notes">Noticeboards: ${commsNoticeboards || '_____________________'}</div>
          </div>
          <div class="contact-box">
            <div class="contact-title">📍 Primary Evacuation Refuge</div>
            <div class="contact-detail">Primary: <strong>${primaryShelter || '_____________________'}</strong></div>
            <div class="contact-notes">Secondary: ${secondaryShelter || '_____________________'}</div>
          </div>
        </div>

        <div class="footer-note">
          Community Resilience Emergency Planning Document • Statutory ${currentHazardConfig.title} Incident SOP • Keep in Vehicle Grab-Bag / Glovebox
        </div>

        <script>
          window.onload = function() {
            setTimeout(function() {
              window.print();
            }, 300);
          };
        </script>
      </body>
      </html>
    `);
    printWindow.document.close();
  };

  // Action Shortcut Trigger
  const handleExecuteShortcut = (actionType?: string) => {
    if (actionType === 'announcement') {
      setQuickAnnounceTitle(`🚨 EMERGENCY BROADCAST: ${currentHazardConfig.title.toUpperCase()} WARNING`);
      setQuickAnnounceBody(`An emergency ${currentHazardConfig.title} incident has occurred in ${townshipName}. Please check the Live Community Emergency Page immediately for verified shelter status and road directions.\n\nLive Emergency Portal: /community/${activeCommunityId}/emergency`);
      setIsQuickAnnouncementModalOpen(true);
    } else if (actionType === 'threat') {
      updateLiveThreatStatusAction({
        communityId: activeCommunityId,
        threatStatus: 'incident',
        activeHazardScenario: activeHazard as any,
        userId: user?.uid || 'leader'
      }).then(() => {
        toast({ title: 'Threat Elevated 🔴', description: `Threat readiness set to Incident Active for ${currentHazardConfig.title}.` });
      });
    } else if (actionType === 'bulletin') {
      router.push('/leader/emergency-plan');
    } else if (actionType === 'standdown') {
      setIsStandDownDialogOpen(true);
    } else if (actionType === 'keyholders') {
      handlePrintPocketCard();
    } else if (actionType === 'volunteers') {
      router.push('/leader/emergency-plan');
    }
  };

  const handleStandDownIncident = async () => {
    if (!activeCommunityId || !user) {
      toast({ title: 'Error', description: 'Leader authentication required.', variant: 'destructive' });
      return;
    }

    setIsStandingDown(true);
    try {
      const author = (userProfile as any)?.name || user.displayName || 'Incident Commander';
      const role = (userProfile as any)?.role || 'Community Resilience Leader';

      const res = await standDownEmergencyAndArchiveBulletinsAction({
        communityId: activeCommunityId,
        authorName: author,
        authorRole: role,
        authorId: user.uid,
        authorEmail: user.email || '',
        issueAllClearNotice: standDownIssueAllClear,
        allClearTitle: standDownAllClearTitle.trim(),
        allClearBody: standDownAllClearBody.trim(),
        hazardCategory: activeHazard,
      });

      if (res.success) {
        toast({
          title: 'Incident Stood Down & Archived 🟢',
          description: `All ${res.archivedCount || 0} active bulletins were archived to the audit log. Threat status restored to Normal (Green).`
        });
        setIsStandDownDialogOpen(false);
      } else {
        toast({ title: 'Stand Down Failed', description: res.error, variant: 'destructive' });
      }
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setIsStandingDown(false);
    }
  };

  const handleDispatchQuickAnnouncement = async () => {
    if (!activeCommunityId || !user) return;
    if (!quickAnnounceTitle.trim() || !quickAnnounceBody.trim()) return;

    setIsDispatchingAnnouncement(true);
    try {
      const res = await publishCommunityEmergencyBroadcastAction({
        communityId: activeCommunityId,
        broadcastHeadline: quickAnnounceTitle.trim(),
        broadcastMessage: quickAnnounceBody.trim(),
        hazardScenario: activeHazard,
        userId: user.uid
      });

      if (res.success) {
        toast({
          title: '🚨 Emergency Broadcast Dispatched!',
          description: `Live alert broadcast to all members in ${townshipName}.`
        });
        setIsQuickAnnouncementModalOpen(false);
      } else {
        toast({ title: 'Dispatch Failed', description: res.error || 'Could not send announcement.', variant: 'destructive' });
      }
    } catch (e: any) {
      toast({ title: 'Error', description: e.message || 'Failed to dispatch broadcast.', variant: 'destructive' });
    } finally {
      setIsDispatchingAnnouncement(false);
    }
  };

  const CurrentHazardIcon = currentHazardConfig.icon;

  return (
    <div className="container max-w-7xl mx-auto py-8 px-4 sm:px-6 space-y-6">
      {/* TOP NAVIGATION BAR */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div className="flex items-center gap-3">
          <Link href={`${demoPrefix}/leader/emergency-plan`}>
            <Button variant="outline" size="sm" className="bg-slate-900 border-slate-700 text-slate-300 hover:text-white text-xs h-9 gap-1.5">
              <ArrowLeft className="h-4 w-4" /> Back to Statutory Plan
            </Button>
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <Badge className="bg-slate-800 text-slate-300 border-slate-700 text-[10px] font-mono uppercase">
                {townshipName}
              </Badge>
              <Badge className="bg-sky-500/20 text-sky-300 border-sky-500/40 text-[10px] font-mono uppercase font-bold">
                ✓ {completedTasks} / {totalTasks} Tasks Done ({progressPercent}%)
              </Badge>
            </div>
            <h1 className="text-xl md:text-2xl font-black text-white flex items-center gap-2.5 font-headline pt-0.5">
              <CurrentHazardIcon className={`h-6 w-6 ${currentHazardConfig.color}`} />
              {currentHazardConfig.title} Incident Response SOP & Checklist
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <Button
            onClick={() => setIsStandDownDialogOpen(true)}
            variant="outline"
            size="sm"
            className="bg-emerald-950/60 border-emerald-500/60 text-emerald-300 hover:bg-emerald-900/60 font-bold text-xs h-9 gap-1.5 shadow-sm"
          >
            <CheckCircle2 className="h-4 w-4 text-emerald-400" /> 🟢 Stand Down & Archive
          </Button>

          <Button
            onClick={handlePrintPocketCard}
            variant="outline"
            size="sm"
            className="bg-slate-900 border-sky-500/40 text-sky-300 hover:bg-sky-950/60 font-bold text-xs h-9 gap-1.5 shadow-sm"
          >
            <Printer className="h-4 w-4 text-sky-400" /> Print Pocket Incident Card
          </Button>

          <Button
            onClick={handleSaveSop}
            disabled={isSaving}
            size="sm"
            className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs h-9 gap-1.5 shadow-lg shadow-emerald-950/60 px-4"
          >
            {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Save Incident SOP
          </Button>
        </div>
      </div>

      {/* HAZARD SCENARIO SWITCHER PILLS */}
      <div className="space-y-1.5">
        <Label className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
          Switch Disaster Scenario SOP:
        </Label>
        <div className="flex items-center gap-1.5 overflow-x-auto pb-2">
          {HAZARDS.map((h) => {
            const Icon = h.icon;
            const isSelected = h.id === activeHazard;
            return (
              <button
                key={h.id}
                type="button"
                onClick={() => router.push(`/leader/emergency-plan/sop?hazard=${h.id}`)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 shrink-0 border ${
                  isSelected
                    ? `${h.bg} text-white border-white/20 shadow-md ring-2 ring-white/20`
                    : 'bg-slate-900/80 border-slate-800 text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                {h.title}
              </button>
            );
          })}
        </div>
      </div>

      {/* HEADER BANNER */}
      <div className="p-5 rounded-3xl border bg-gradient-to-r from-slate-900 via-slate-950 to-slate-900 border-slate-800 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <p className="text-xs text-slate-300 max-w-3xl leading-relaxed">
            Standard Operating Procedure for <strong>{currentHazardConfig.title}</strong> events in <strong>{townshipName}</strong>. Check off tasks live during active incidents or customize time tags, instructions, and role assignments below.
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Button
            onClick={handleResetToDefault}
            variant="outline"
            size="sm"
            className="bg-slate-900 border-slate-700 text-slate-300 hover:text-white text-xs h-8 gap-1.5"
          >
            <RotateCcw className="h-3.5 w-3.5 text-slate-400" /> Reset to Template
          </Button>
          <Button
            onClick={handleAddPhase}
            variant="outline"
            size="sm"
            className="bg-slate-900 border-sky-500/40 text-sky-300 hover:bg-sky-950/60 font-bold text-xs h-8 gap-1.5"
          >
            <PlusCircle className="h-4 w-4 text-sky-400" /> Add Custom Phase
          </Button>
        </div>
      </div>

      {/* CIVIC MASS EVACUATION & TRANSPORT DISPATCH CONSOLE */}
      <Card className="border-2 border-teal-500/40 bg-gradient-to-br from-teal-950/40 via-slate-950 to-slate-900 shadow-2xl rounded-3xl overflow-hidden">
        <CardHeader className="p-5 border-b border-teal-500/30 bg-teal-500/10">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-2xl bg-teal-500/20 text-teal-400 border border-teal-500/40 shrink-0">
                <Bus className="h-6 w-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <Badge className="bg-teal-500/30 text-teal-300 border-teal-500/50 text-[10px] uppercase font-bold">
                    Incident Transport Command
                  </Badge>
                  <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-500/40 text-[10px] font-mono font-bold">
                    {totalEvacuatedHeadcount} Passengers Evacuated to Date
                  </Badge>
                </div>
                <CardTitle className="text-lg font-bold text-white mt-1 flex items-center gap-2 font-headline">
                  Transport Partner Mobilisation & Evacuation Dispatcher
                </CardTitle>
                <CardDescription className="text-xs text-slate-300 max-w-2xl mt-0.5">
                  Coordinate Stagecoach arterial buses, accessible dial-a-ride vans, and rural 4x4 taxis in real time during active incidents.
                </CardDescription>
              </div>
            </div>

            {/* Quick Action Dial Buttons */}
            <div className="flex items-center gap-2 flex-wrap">
              <Button
                onClick={() => handleSetAllFleetStatus('standby')}
                size="sm"
                className="bg-amber-400 hover:bg-amber-300 text-slate-950 text-xs font-black h-8 border-2 border-amber-500 shadow-sm"
              >
                🟡 Standby All Fleet
              </Button>
              <Button
                onClick={() => handleSetAllFleetStatus('mobilised')}
                size="sm"
                className="bg-orange-500 hover:bg-orange-400 text-slate-950 text-xs font-black h-8 border-2 border-orange-600 shadow-sm"
              >
                🟠 Mobilise to Points
              </Button>
              <Button
                onClick={() => handleSetAllFleetStatus('active_evacuation')}
                size="sm"
                className="bg-red-600 hover:bg-red-500 text-white text-xs font-black h-8 gap-1.5 border-2 border-red-700 shadow-md animate-pulse"
              >
                🔴 Active Evac Net
              </Button>
              <Button
                onClick={() => setIsLogDepartureModalOpen(true)}
                size="sm"
                className="bg-teal-600 hover:bg-teal-500 text-white text-xs font-black h-8 gap-1.5 shadow-md"
              >
                <Plus className="h-3.5 w-3.5" /> Log Departure
              </Button>
              <Link href={`${demoPrefix}/leader/emergency-plan`}>
                <Button
                  variant="outline"
                  size="sm"
                  className="bg-slate-900 border-teal-500/40 text-teal-300 hover:bg-teal-950/60 text-xs font-bold h-8 gap-1.5"
                >
                  <Edit3 className="h-3.5 w-3.5" /> Edit Fleet & Muster Points
                </Button>
              </Link>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-5 space-y-4">
          
          {/* Active Fleet Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
            {evacuationPartners.map((partner) => (
              <div 
                key={partner.id} 
                className={`p-3.5 rounded-2xl border-2 transition-all flex flex-col justify-between gap-2.5 ${
                  partner.status === 'active_evacuation' 
                    ? 'border-red-500 bg-red-950/40 ring-1 ring-red-500' 
                    : partner.status === 'mobilised'
                    ? 'border-orange-500/60 bg-orange-950/30'
                    : partner.status === 'standby'
                    ? 'border-amber-500/50 bg-amber-950/20'
                    : 'border-slate-800 bg-slate-900/90'
                }`}
              >
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between gap-1">
                    <Badge variant="outline" className="text-[9px] uppercase font-bold border-slate-600 text-slate-200">
                      {partner.vehicleType.replace('_', ' ')}
                    </Badge>
                    <Badge 
                      className={`text-[9px] font-black uppercase tracking-wider ${
                        partner.status === 'standby' ? 'bg-amber-400 text-slate-950 border border-amber-500' :
                        partner.status === 'mobilised' ? 'bg-orange-400 text-slate-950 border border-orange-500' :
                        partner.status === 'active_evacuation' ? 'bg-red-600 text-white border border-red-700 animate-pulse' :
                        'bg-emerald-400 text-slate-950 border border-emerald-500'
                      }`}
                    >
                      {partner.status.replace('_', ' ')}
                    </Badge>
                  </div>

                  <p className="font-black text-sm text-white line-clamp-1">{partner.operator}</p>
                  <p className="text-xs text-slate-200 font-bold">
                    {partner.vehicleCount} unit(s) • <span className="text-teal-300">{partner.totalSeats} seats</span>
                  </p>
                  <p className="text-xs text-slate-300 font-medium line-clamp-2">
                    📍 {partner.assignedSector}
                  </p>
                </div>

                <div className="pt-2 border-t border-slate-800 flex items-center justify-between gap-2">
                  <a 
                    href={`tel:${partner.dispatchContact.replace(/[^0-9+]/g, '')}`} 
                    className="inline-flex items-center gap-1 text-xs font-mono font-bold text-teal-300 hover:underline"
                  >
                    <Phone className="h-3.5 w-3.5" /> Call Dispatch
                  </a>

                  <Select 
                    value={partner.status} 
                    onValueChange={(val: TransportReadinessStatus) => handleSetPartnerStatus(partner.id, val)}
                  >
                    <SelectTrigger className="h-7 text-xs font-bold w-24 bg-slate-950 border-slate-700 text-white">
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-950 border-slate-800 text-white">
                      <SelectItem value="standby" className="font-bold">🟡 Standby</SelectItem>
                      <SelectItem value="mobilised" className="font-bold">🟠 Mobilised</SelectItem>
                      <SelectItem value="active_evacuation" className="font-bold">🔴 Active</SelectItem>
                      <SelectItem value="completed" className="font-bold">🟢 Done</SelectItem>
                      <SelectItem value="off_duty" className="font-bold">⚪ Off</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            ))}
          </div>

          {/* Recent Departures Stream */}
          {departureLogs.length > 0 && (
            <div className="p-3.5 rounded-2xl border border-slate-800 bg-slate-950/60 space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-xs font-bold text-white flex items-center gap-1.5">
                  <Navigation className="h-3.5 w-3.5 text-teal-400" />
                  Recent Evacuation Departures Stream ({departureLogs.length})
                </p>
                <span className="text-[10px] text-slate-400 font-mono">Live Incident Log</span>
              </div>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2">
                {departureLogs.slice(0, 6).map((log) => (
                  <div key={log.id} className="p-2.5 rounded-xl border border-slate-800/80 bg-slate-900/60 text-xs flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <Badge className="bg-teal-500/20 text-teal-300 font-black text-[10px] px-1.5 py-0">
                          {log.headcount} pax
                        </Badge>
                        <span className="font-bold text-white text-[11px] truncate">{log.operator}</span>
                      </div>
                      <p className="text-[10px] text-slate-400 truncate mt-0.5">
                        {log.fromPoint} ➔ {log.toShelter}
                      </p>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <span className="text-[10px] font-mono text-slate-400">{log.timestamp}</span>
                      <Button onClick={() => handleDeleteDepartureLog(log.id)} variant="ghost" size="sm" className="h-5 w-5 p-0 text-slate-500 hover:text-red-400">
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

        </CardContent>
      </Card>

      {/* 5-PHASE INTERACTIVE CHECKLIST */}
      <div className="space-y-6">
        {currentPhases.map((phase, pIdx) => {
          const phaseCompletedCount = phase.tasks.filter((t) => t.isCompleted).length;
          const phaseTotalCount = phase.tasks.length;
          const isPhaseAllDone = phaseTotalCount > 0 && phaseCompletedCount === phaseTotalCount;

          return (
            <Card
              key={phase.id || pIdx}
              className={`border-2 transition-all shadow-md overflow-hidden ${
                isPhaseAllDone
                  ? 'border-emerald-500/50 bg-slate-950/70'
                  : 'border-slate-800 bg-slate-950/90 hover:border-sky-500/30'
              }`}
            >
              <CardHeader className="p-4 md:p-5 bg-muted/20 border-b border-slate-800">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3 flex-grow">
                    <div className={`h-8 w-8 rounded-xl flex items-center justify-center font-black text-xs shrink-0 ${
                      isPhaseAllDone
                        ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                        : 'bg-sky-500/20 text-sky-300 border border-sky-500/30'
                    }`}>
                      {pIdx + 1}
                    </div>
                    <div className="space-y-1 flex-grow">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Input
                          value={phase.timeTag}
                          onChange={(e) => handleUpdatePhase(phase.id, 'timeTag', e.target.value)}
                          className="h-6 text-[11px] font-mono font-black uppercase tracking-wider text-sky-400 bg-transparent border-none p-0 focus-visible:ring-0 w-auto min-w-[160px]"
                        />
                        <Badge variant="outline" className={`text-[10px] font-mono ${
                          isPhaseAllDone ? 'border-emerald-500/40 text-emerald-400 bg-emerald-950/30' : 'border-slate-700 text-slate-400'
                        }`}>
                          {phaseCompletedCount} / {phaseTotalCount} Tasks Done
                        </Badge>
                      </div>
                      <Input
                        value={phase.title}
                        onChange={(e) => handleUpdatePhase(phase.id, 'title', e.target.value)}
                        placeholder="Phase Title"
                        className="font-bold text-sm text-white bg-transparent border-none p-0 h-auto focus-visible:ring-0 focus-visible:bg-slate-900/60 rounded"
                      />
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <Button
                      onClick={() => handleAddTask(phase.id)}
                      size="sm"
                      variant="ghost"
                      className="text-sky-300 hover:text-white hover:bg-sky-950/40 text-xs h-7 px-2.5 gap-1"
                    >
                      <Plus className="h-3.5 w-3.5" /> Add Task
                    </Button>
                    {currentPhases.length > 1 && (
                      <Button
                        onClick={() => handleDeletePhase(phase.id)}
                        size="sm"
                        variant="ghost"
                        className="text-slate-400 hover:text-red-400 hover:bg-red-950/40 text-xs h-7 px-2"
                        title="Delete Phase"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>
                </div>

                <Input
                  value={phase.desc}
                  onChange={(e) => handleUpdatePhase(phase.id, 'desc', e.target.value)}
                  placeholder="Phase operational overview..."
                  className="text-xs text-slate-400 bg-transparent border-none p-0 h-auto focus-visible:ring-0 focus-visible:bg-slate-900/60 rounded pt-1"
                />
              </CardHeader>

              <CardContent className="p-4 md:p-5 space-y-3">
                {phase.tasks.map((task, tIdx) => (
                  <div
                    key={task.id || tIdx}
                    className={`p-3.5 rounded-2xl border transition-all text-xs space-y-2.5 ${
                      task.isCompleted
                        ? 'bg-emerald-950/15 border-emerald-500/30'
                        : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3 flex-grow">
                        <button
                          type="button"
                          onClick={() => handleToggleTask(phase.id, task.id)}
                          className="mt-0.5 shrink-0 focus:outline-none transition-transform hover:scale-110"
                          title={task.isCompleted ? "Mark Incomplete" : "Mark Completed"}
                        >
                          {task.isCompleted ? (
                            <CheckSquare2 className="h-5 w-5 text-emerald-400 fill-emerald-500/20" />
                          ) : (
                            <Square className="h-5 w-5 text-slate-400 hover:text-sky-400" />
                          )}
                        </button>

                        <div className="space-y-1.5 flex-grow">
                          <Input
                            value={task.title}
                            onChange={(e) => handleUpdateTask(phase.id, task.id, 'title', e.target.value)}
                            placeholder="Task Title"
                            className={`font-bold text-xs h-7 p-1 bg-transparent border-none focus-visible:ring-1 focus-visible:bg-slate-950/80 ${
                              task.isCompleted ? 'line-through text-slate-400' : 'text-white'
                            }`}
                          />
                          <Textarea
                            value={task.desc}
                            onChange={(e) => handleUpdateTask(phase.id, task.id, 'desc', e.target.value)}
                            placeholder="Task operational details..."
                            rows={2}
                            className="text-xs text-slate-300 bg-slate-950/50 border-slate-800 resize-y min-h-[45px]"
                          />
                        </div>
                      </div>

                      <Button
                        onClick={() => handleDeleteTask(phase.id, task.id)}
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0 text-slate-500 hover:text-red-400 hover:bg-red-950/40 rounded shrink-0"
                        title="Remove Task"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>

                    {/* Meta Bar */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pt-1.5 border-t border-slate-800/60">
                      <div className="flex items-center gap-2 flex-wrap">
                        <div className="flex items-center gap-1.5">
                          <span className="text-[10px] text-slate-400 font-bold uppercase">Role:</span>
                          <Input
                            value={task.role || ''}
                            onChange={(e) => handleUpdateTask(phase.id, task.id, 'role', e.target.value)}
                            placeholder="Assigned Role"
                            className="h-6 text-[11px] font-semibold text-sky-300 bg-slate-950 border-slate-800 w-44 px-2"
                          />
                        </div>

                        <div className="flex items-center gap-1.5">
                          <span className="text-[10px] text-slate-400 font-bold uppercase">Action Link:</span>
                          <Select
                            value={task.shortcutAction || 'none'}
                            onValueChange={(val: any) => handleUpdateTask(phase.id, task.id, 'shortcutAction', val)}
                          >
                            <SelectTrigger className="h-6 text-[11px] font-semibold bg-slate-950 border-slate-800 text-slate-200 w-36 px-2">
                              <SelectValue placeholder="Action Shortcut" />
                            </SelectTrigger>
                            <SelectContent className="bg-slate-950 border-slate-800 text-white text-xs">
                              <SelectItem value="none">None</SelectItem>
                              <SelectItem value="announcement">📢 Broadcast Alert</SelectItem>
                              <SelectItem value="threat">🔴 Elevate Threat</SelectItem>
                              <SelectItem value="bulletin">📝 Post Bulletin</SelectItem>
                              <SelectItem value="standdown">🟢 Stand Down & Archive</SelectItem>
                              <SelectItem value="keyholders">🔑 View Keyholders</SelectItem>
                              <SelectItem value="volunteers">🚜 Volunteer Assets</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 flex-wrap justify-end">
                        {task.shortcutAction && task.shortcutAction !== 'none' && (
                          <Button
                            type="button"
                            size="sm"
                            onClick={() => handleExecuteShortcut(task.shortcutAction)}
                            className={`h-6 text-[11px] font-bold gap-1 px-2.5 shadow-sm ${
                              task.shortcutAction === 'announcement'
                                ? 'bg-sky-600 hover:bg-sky-500 text-white'
                                : task.shortcutAction === 'threat'
                                ? 'bg-red-600 hover:bg-red-500 text-white'
                                : task.shortcutAction === 'bulletin'
                                ? 'bg-pink-600 hover:bg-pink-500 text-white'
                                : task.shortcutAction === 'standdown'
                                ? 'bg-emerald-600 hover:bg-emerald-500 text-white'
                                : task.shortcutAction === 'keyholders'
                                ? 'bg-amber-600 hover:bg-amber-500 text-white'
                                : 'bg-teal-600 hover:bg-teal-500 text-white'
                            }`}
                          >
                            {task.shortcutAction === 'announcement' && <Megaphone className="h-3 w-3" />}
                            {task.shortcutAction === 'threat' && <ShieldAlert className="h-3 w-3" />}
                            {task.shortcutAction === 'bulletin' && <Send className="h-3 w-3" />}
                            {task.shortcutAction === 'standdown' && <CheckCircle2 className="h-3 w-3" />}
                            {task.shortcutAction === 'keyholders' && <Key className="h-3 w-3" />}
                            {task.shortcutAction === 'volunteers' && <Truck className="h-3 w-3" />}
                            {task.shortcutAction === 'standdown' ? '🟢 Stand Down & Archive' : 'Trigger Action Shortcut'}
                          </Button>
                        )}

                        {task.isCompleted && task.completedAt && (
                          <span className="text-[10px] text-emerald-400 font-mono">
                            ✓ Done {new Date(task.completedAt).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })} by {task.completedBy || 'Commander'}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* QUICK ANNOUNCEMENT BROADCAST MODAL */}
      <Dialog open={isQuickAnnouncementModalOpen} onOpenChange={setIsQuickAnnouncementModalOpen}>
        <DialogContent className="sm:max-w-lg bg-slate-950 border-slate-800 text-white">
          <DialogHeader>
            <div className="flex items-center gap-2">
              <Badge className="bg-red-600 text-white font-bold uppercase font-mono text-[10px]">
                Emergency Broadcast
              </Badge>
            </div>
            <DialogTitle className="text-base font-bold text-white pt-1 flex items-center gap-2">
              <Megaphone className="h-5 w-5 text-sky-400" /> Dispatch Community Emergency Broadcast
            </DialogTitle>
            <DialogDescription className="text-slate-400 text-xs">
              Instantly publishes a high-priority announcement to all registered community members in <strong>{townshipName}</strong> directing them to the live emergency portal.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2 text-xs">
            <div className="space-y-1.5">
              <Label className="font-bold text-slate-200">Broadcast Headline *</Label>
              <Input
                value={quickAnnounceTitle}
                onChange={(e) => setQuickAnnounceTitle(e.target.value)}
                className="bg-slate-900 border-slate-700 text-white font-bold text-xs h-9"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="font-bold text-slate-200">Broadcast Message & Instructions *</Label>
              <Textarea
                value={quickAnnounceBody}
                onChange={(e) => setQuickAnnounceBody(e.target.value)}
                rows={5}
                className="bg-slate-900 border-slate-700 text-white text-xs leading-relaxed resize-y"
              />
            </div>
          </div>

          <DialogFooter className="gap-2 sm:justify-between">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsQuickAnnouncementModalOpen(false)}
              className="bg-slate-900 border-slate-700 text-slate-300 hover:bg-slate-800"
            >
              Cancel
            </Button>
            <Button
              onClick={handleDispatchQuickAnnouncement}
              disabled={isDispatchingAnnouncement}
              size="sm"
              className="bg-sky-600 hover:bg-sky-500 text-white font-bold gap-2 text-xs shadow-lg shadow-sky-950/60"
            >
              {isDispatchingAnnouncement ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              📢 Dispatch Live Alert Now
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* POCKET INCIDENT RESPONSE CARD (PRINT MODAL & REFERENCE VIEW) */}
      <Dialog open={isPocketPrintModalOpen} onOpenChange={setIsPocketPrintModalOpen}>
        <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto bg-white text-slate-950 border-slate-300 print:max-h-none print:overflow-visible print:border-none print:shadow-none print:p-0 print:m-0 print:static">
          <style dangerouslySetInnerHTML={{ __html: `
            @media print {
              body * {
                visibility: hidden !important;
              }
              #pocket-incident-card, #pocket-incident-card * {
                visibility: visible !important;
              }
              #pocket-incident-card {
                position: absolute !important;
                left: 0 !important;
                top: 0 !important;
                width: 100% !important;
                margin: 0 !important;
                padding: 10px !important;
                background: white !important;
                color: #0f172a !important;
                overflow: visible !important;
                box-shadow: none !important;
                border: none !important;
              }
              @page {
                size: A4 portrait;
                margin: 8mm;
              }
            }
          `}} />

          <DialogHeader className="print:hidden border-b pb-3">
            <div className="flex items-center justify-between">
              <div>
                <DialogTitle className="text-base font-bold flex items-center gap-2 text-slate-900">
                  <Printer className="h-4 w-4 text-sky-600" />
                  {currentHazardConfig.title} Pocket Incident Card
                </DialogTitle>
                <DialogDescription className="text-xs text-slate-600">
                  Formatted for 1-2 page laminated grab-bag, car glovebox, or community hall emergency store reference.
                </DialogDescription>
              </div>
              <Button
                onClick={handlePrintPocketCard}
                size="sm"
                className="bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs gap-1.5 h-8 cursor-pointer"
              >
                <Printer className="h-3.5 w-3.5" /> Print Pocket Card Now
              </Button>
            </div>
          </DialogHeader>

          {/* PRINTABLE CARD CONTENT */}
          <div id="pocket-incident-card" className="p-4 md:p-6 space-y-4 text-slate-900 bg-white font-sans text-xs print:p-0 print:space-y-3">
            {/* Header */}
            <div className="border-b-2 border-slate-900 pb-2.5 flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-black text-xs uppercase tracking-widest text-red-600">
                    SCOTTISH CIVIL RESILIENCE FRAMEWORK
                  </span>
                </div>
                <h1 className="text-lg font-black uppercase tracking-tight text-slate-900 font-headline">
                  {townshipName.toUpperCase()} {currentHazardConfig.title.toUpperCase()} ACTION CARD
                </h1>
                <p className="text-[11px] font-semibold text-slate-600">
                  Commander Pocket Standard Operating Procedure (SOP) & Fast Grab-Bag Reference
                </p>
              </div>
              <div className="text-right text-[10px] font-mono font-bold text-slate-700">
                <p>HAZARD: {currentHazardConfig.title.toUpperCase()}</p>
                <p>DATE: {new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
              </div>
            </div>

            {/* Statutory Multi-Agency Quick Contacts */}
            <div className="space-y-1.5 break-inside-avoid">
              <h2 className="font-black text-[11px] uppercase tracking-wider text-slate-900 border-b border-slate-300 pb-0.5 flex items-center gap-1.5">
                <span>📞</span> STATUTORY BLUE-LIGHT & MULTI-AGENCY CONTACTS
              </h2>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px]">
                <div className="p-2 border border-slate-300 rounded-lg bg-slate-50">
                  <p className="font-bold text-red-600">EMERGENCY (999)</p>
                  <p className="text-[10px] text-slate-600">Fire, Police, Ambulance, Coastguard</p>
                </div>
                <div className="p-2 border border-slate-300 rounded-lg bg-slate-50">
                  <p className="font-bold text-slate-900">SFRS Local Station</p>
                  <p className="font-mono text-slate-700">{wfStationTel || '01463 723000'}</p>
                </div>
                <div className="p-2 border border-slate-300 rounded-lg bg-slate-50">
                  <p className="font-bold text-slate-900">SEPA Floodline</p>
                  <p className="font-mono text-slate-700">0345 988 1188</p>
                </div>
                <div className="p-2 border border-slate-300 rounded-lg bg-slate-50">
                  <p className="font-bold text-slate-900">SSEN Power (105)</p>
                  <p className="font-mono text-slate-700">0800 300 999</p>
                </div>
              </div>
            </div>

            {/* Keyholders & Emergency Access */}
            <div className="space-y-1.5 break-inside-avoid">
              <h2 className="font-black text-[11px] uppercase tracking-wider text-slate-900 border-b border-slate-300 pb-0.5 flex items-center gap-1.5">
                <span>🔑</span> KEYHOLDERS & EMERGENCY REST CENTRE ACCESS
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
                {keyholdersList.slice(0, 4).map((kh, idx) => (
                  <div key={kh.id || idx} className="p-2 border border-slate-300 rounded-lg bg-slate-50 space-y-0.5">
                    <p className="font-bold text-slate-900">{kh.facilityOrAsset}</p>
                    <p className="text-slate-700">Lead: <strong>{kh.primaryName || 'Designated Keyholder'}</strong> ({kh.primaryPhone || 'On Call'})</p>
                    {kh.keyLocationNotes && (
                      <p className="text-[10px] text-slate-600 italic">Access: {kh.keyLocationNotes}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* 5-Phase Response Action Checklist */}
            <div className="space-y-2.5 break-inside-avoid">
              <h2 className="font-black text-[11px] uppercase tracking-wider text-slate-900 border-b border-slate-300 pb-0.5 flex items-center gap-1.5">
                <span>📋</span> 5-PHASE {currentHazardConfig.title.toUpperCase()} ACTION CHECKLIST
              </h2>
              <div className="space-y-2">
                {currentPhases.map((phase, pIdx) => (
                  <div key={phase.id || pIdx} className="space-y-1 border border-slate-300 rounded-lg p-2 bg-slate-50 break-inside-avoid">
                    <div className="flex items-center justify-between border-b border-slate-200 pb-0.5">
                      <span className="font-black text-[11px] text-sky-900 uppercase tracking-wide">
                        {phase.timeTag} — {phase.title}
                      </span>
                    </div>
                    <div className="grid grid-cols-1 gap-1 pt-0.5">
                      {phase.tasks.map((task, tIdx) => (
                        <div key={task.id || tIdx} className="flex items-start gap-1.5 text-[10.5px] leading-tight">
                          <div className="h-3 w-3 border-2 border-slate-900 rounded-sm mt-0.5 shrink-0" />
                          <div>
                            <span className="font-bold text-slate-900">{task.title}:</span>{' '}
                            <span className="text-slate-700">{task.desc}</span>
                            {task.role && (
                              <span className="ml-1 text-[9.5px] font-bold text-sky-800">[{task.role}]</span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Blackout Communications & Meeting Points */}
            <div className="space-y-1 pt-1 border-t border-slate-300 break-inside-avoid">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
                <div className="p-2 border border-slate-300 rounded-lg bg-slate-50 space-y-0.5">
                  <p className="font-bold uppercase tracking-wider text-slate-900">📻 Blackout Comms Net</p>
                  <p className="text-slate-700">HAM/PMR Frequency: <strong>{commsHamFreq}</strong></p>
                  <p className="text-slate-600 text-[10px]">Noticeboards: {commsNoticeboards}</p>
                </div>

                <div className="p-2 border border-slate-300 rounded-lg bg-slate-50 space-y-0.5">
                  <p className="font-bold uppercase tracking-wider text-slate-900">📍 Primary Evacuation Refuge</p>
                  <p className="text-slate-700">Rest Centre: <strong>{primaryShelter}</strong></p>
                  <p className="text-slate-600 text-[10px]">Secondary: {secondaryShelter}</p>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="pt-1.5 border-t text-[9.5px] text-slate-500 text-center font-mono">
              <p>Community Resilience Emergency Planning Document • Statutory {currentHazardConfig.title} Incident SOP • Keep in Grab-Bag / Glovebox</p>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* DIALOG: LOG PASSENGER DEPARTURE */}
      <Dialog open={isLogDepartureModalOpen} onOpenChange={setIsLogDepartureModalOpen}>
        <DialogContent className="sm:max-w-md bg-slate-950 border-slate-800 text-white">
          <DialogHeader>
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-teal-500/20 text-teal-400">
                <Bus className="h-5 w-5" />
              </div>
              <DialogTitle className="text-base font-bold text-white">
                Log Evacuation Departure Run
              </DialogTitle>
            </div>
            <DialogDescription className="text-xs text-slate-400">
              Record coach, minibus, or taxi departure headcount and destination shelter.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2 text-xs">
            <div className="space-y-1.5">
              <Label className="text-slate-300 font-bold">Transport Operator / Vehicle</Label>
              <Select
                value={departureFormData.operator}
                onValueChange={(val) => {
                  const partner = evacuationPartners.find(p => p.operator === val);
                  setDepartureFormData(prev => ({
                    ...prev,
                    operator: val,
                    vehicleType: partner?.vehicleType || 'coach',
                    fromPoint: partner?.pickupMusterPoint || prev.fromPoint,
                    toShelter: partner?.dropoffDestination || prev.toShelter
                  }));
                }}
              >
                <SelectTrigger className="bg-slate-900 border-slate-700 text-white h-9 text-xs">
                  <SelectValue placeholder="Select Vehicle" />
                </SelectTrigger>
                <SelectContent className="bg-slate-950 border-slate-800 text-white">
                  {evacuationPartners.map((p) => (
                    <SelectItem key={p.id} value={p.operator}>
                      [{p.vehicleType.toUpperCase()}] {p.operator} ({p.totalSeats} seats)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-slate-300 font-bold">Passenger Headcount Boarded</Label>
              <Input
                type="number"
                min={1}
                value={departureFormData.headcount}
                onChange={(e) => setDepartureFormData(prev => ({ ...prev, headcount: Number(e.target.value) }))}
                className="bg-slate-900 border-slate-700 text-white h-9 text-xs font-bold"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-slate-300 font-bold">Pickup Muster Point</Label>
              <Select
                value={departureFormData.fromPoint}
                onValueChange={(val) => setDepartureFormData(prev => ({ ...prev, fromPoint: val }))}
              >
                <SelectTrigger className="bg-slate-900 border-slate-700 text-white h-9 text-xs">
                  <SelectValue placeholder="Select Collection Point" />
                </SelectTrigger>
                <SelectContent className="bg-slate-950 border-slate-800 text-white">
                  {collectionPoints.map((pt) => (
                    <SelectItem key={pt.id} value={pt.name}>
                      {pt.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-slate-300 font-bold">Designated Drop-Off Reception Shelter</Label>
              <Input
                value={departureFormData.toShelter}
                onChange={(e) => setDepartureFormData(prev => ({ ...prev, toShelter: e.target.value }))}
                className="bg-slate-900 border-slate-700 text-white h-9 text-xs"
              />
            </div>
          </div>

          <DialogFooter className="gap-2 sm:justify-between">
            <Button variant="outline" size="sm" onClick={() => setIsLogDepartureModalOpen(false)} className="bg-slate-900 border-slate-700 text-white">
              Cancel
            </Button>
            <Button onClick={handleLogDeparture} size="sm" className="bg-teal-600 hover:bg-teal-500 text-white font-bold gap-1.5">
              <CheckCircle2 className="h-4 w-4" /> Commit Departure Log
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Stand Down & Bulk Archive Wizard Dialog */}
      <Dialog open={isStandDownDialogOpen} onOpenChange={setIsStandDownDialogOpen}>
        <DialogContent className="sm:max-w-lg bg-slate-950 border-slate-800 text-white">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2 text-emerald-400">
              <CheckCircle2 className="h-5 w-5" /> Stand Down Incident & Archive All Bulletins
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-400">
              Executes official emergency stand-down. All active warning bulletins will be archived to the compliance log and threat status returned to Normal (Green).
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2 text-xs">
            <div className="p-3 rounded-xl bg-emerald-950/40 border border-emerald-500/40 text-emerald-200 space-y-1">
              <p className="font-bold">Incident Recovery Protocol:</p>
              <p className="text-[11px] text-emerald-300">
                Standing down will archive all active public notices for {currentHazardConfig.title} and log the completion in the statutory audit register.
              </p>
            </div>

            {/* Option to Issue Final All-Clear Notice */}
            <div className="p-3.5 rounded-xl border border-slate-800 bg-slate-900/60 space-y-3">
              <div className="flex items-start gap-2.5">
                <Checkbox
                  id="sopIssueAllClear"
                  checked={standDownIssueAllClear}
                  onCheckedChange={(checked) => setStandDownIssueAllClear(Boolean(checked))}
                  className="mt-0.5"
                />
                <label htmlFor="sopIssueAllClear" className="font-bold text-white text-xs cursor-pointer">
                  Publish Final Official 🟢 All-Clear Notice on Public Portal
                </label>
              </div>

              {standDownIssueAllClear && (
                <div className="space-y-2 pt-2 border-t border-slate-800">
                  <div className="space-y-1">
                    <Label className="text-[11px] font-bold text-slate-300">All-Clear Headline</Label>
                    <Input
                      value={standDownAllClearTitle}
                      onChange={(e) => setStandDownAllClearTitle(e.target.value)}
                      className="bg-slate-900 border-slate-700 text-white text-xs h-8 font-semibold"
                    />
                  </div>

                  <div className="space-y-1">
                    <Label className="text-[11px] font-bold text-slate-300">All-Clear Public Message</Label>
                    <Textarea
                      value={standDownAllClearBody}
                      onChange={(e) => setStandDownAllClearBody(e.target.value)}
                      rows={3}
                      className="bg-slate-900 border-slate-700 text-white text-xs resize-y"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>

          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsStandDownDialogOpen(false)}
              className="bg-slate-900 border-slate-700 text-slate-300"
            >
              Cancel
            </Button>
            <Button
              onClick={handleStandDownIncident}
              disabled={isStandingDown}
              size="sm"
              className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs gap-1.5"
            >
              {isStandingDown ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
              Confirm Incident Stand-Down & Archive
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function IncidentSopPage() {
  return (
    <Suspense fallback={<div className="container max-w-7xl mx-auto py-12 text-center text-slate-400">Loading Incident SOP Protocol...</div>}>
      <IncidentSopPageContent />
    </Suspense>
  );
}
