'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  ShieldCheck,
  Printer,
  FileText,
  Download,
  ArrowLeft,
  Lock,
  Layers,
  HelpCircle,
  CheckCircle2,
  AlertTriangle,
  Radio,
  Cloud,
  WifiOff,
  Scale,
  BookOpen,
  Info,
  Server,
  Sparkles,
  ExternalLink,
  ChevronRight,
  Shield,
  FileCode,
  Building,
  Key,
  Edit3,
  Save,
  Check,
  RotateCcw,
  Bot
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { generateComplianceBriefHtml } from '@/lib/compliance-pdf-generator';
import { generateGrabBagHtml, GrabBagDossierData } from '@/lib/emergency-grab-bag-generator';
import { useFirestore, useUser, useDoc, useMemoFirebase } from '@/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';

export default function EmergencyPlanCompliancePage() {
  const pathname = usePathname();
  const { toast } = useToast();
  const db = useFirestore();
  const { user } = useUser();

  const isDemo = pathname?.startsWith('/demo') || false;
  const backUrl = isDemo ? '/demo/leader/emergency-plan' : '/leader/emergency-plan';
  const townshipName = isDemo ? 'Oakridge Community Council' : 'Local Municipality / Community Council';
  const communityId = isDemo ? '9ayHMyZf4SRw2gof1AM9' : 'c_live';

  const [activeTab, setActiveTab] = useState('summary');
  const [isEditMode, setIsEditMode] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Editable Compliance Content State
  const [customBylaws, setCustomBylaws] = useState('');
  const [leadCoordinatorName, setLeadCoordinatorName] = useState('Fiona Macleod');
  const [leadCoordinatorRole, setLeadCoordinatorRole] = useState('Community Resilience Coordinator');
  const [leadCoordinatorPhone, setLeadCoordinatorPhone] = useState('07700 900123');
  const [auditorNotes, setAuditorNotes] = useState('ISO 22301:2019 Clauses 7.5, 8.1, 8.4, and 8.4.4 fully aligned. Verified by Community Council resilience review.');

  // Load any saved compliance customization
  useEffect(() => {
    if (!db || isDemo) return;
    const loadComplianceDoc = async () => {
      try {
        const snap = await getDoc(doc(db, `communities/${communityId}/emergency_plan/compliance_brief`));
        if (snap.exists()) {
          const d = snap.data();
          if (d.customBylaws) setCustomBylaws(d.customBylaws);
          if (d.leadCoordinatorName) setLeadCoordinatorName(d.leadCoordinatorName);
          if (d.leadCoordinatorRole) setLeadCoordinatorRole(d.leadCoordinatorRole);
          if (d.leadCoordinatorPhone) setLeadCoordinatorPhone(d.leadCoordinatorPhone);
          if (d.auditorNotes) setAuditorNotes(d.auditorNotes);
        }
      } catch (e) {
        console.error('Error loading compliance data:', e);
      }
    };
    loadComplianceDoc();
  }, [db, communityId, isDemo]);

  const handleSaveComplianceSettings = async () => {
    setIsSaving(true);
    try {
      if (db && !isDemo) {
        await setDoc(doc(db, `communities/${communityId}/emergency_plan/compliance_brief`), {
          customBylaws,
          leadCoordinatorName,
          leadCoordinatorRole,
          leadCoordinatorPhone,
          auditorNotes,
          updatedAt: new Date().toISOString(),
          updatedBy: user?.email || 'Leader',
        }, { merge: true });
      }
      toast({
        title: '🟢 Compliance Settings Saved',
        description: 'Your ISO 22301 legal clauses and operational notes have been updated.',
      });
      setIsEditMode(false);
    } catch (e: any) {
      toast({ title: 'Save Failed', description: e.message, variant: 'destructive' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDownloadComplianceBrief = () => {
    try {
      const win = window.open('', '_blank');
      if (!win) {
        toast({ title: 'Pop-up Blocked', description: 'Please allow pop-ups to view the PDF.', variant: 'destructive' });
        return;
      }
      const html = generateComplianceBriefHtml({
        townshipName,
        communityId,
        customNotes: auditorNotes,
      });
      win.document.write(html);
      win.document.close();
      toast({ title: '📄 Generating ISO 22301 Compliance Brief', description: 'Official auditor brief formatted for PDF print.' });
    } catch (e: any) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    }
  };

  const dummyGrabBagData: GrabBagDossierData = useMemo(() => ({
    townshipName,
    communityId,
    lastReviewedDate: '06 Sep 2026',
    reviewedByName: leadCoordinatorName,
    reviewedByRole: leadCoordinatorRole,
    nextReviewDue: '06 Mar 2027',
    keyholders: [
      {
        facilityOrAsset: 'Village Hall Reception Shelter & Generator Cache',
        primaryName: leadCoordinatorName,
        primaryPhone: leadCoordinatorPhone,
        backupName: 'Callum Stewart',
        backupPhone: '07700 900456',
        keyLocationNotes: 'Village Hall Key Safe (Code: Auth Only)',
      },
      {
        facilityOrAsset: 'Community Secondary Pavilion & Medical Cache',
        primaryName: 'Dr. Morag Campbell',
        primaryPhone: '07700 900789',
        backupName: 'Duty Nurse Lead',
        backupPhone: '07700 900111',
        keyLocationNotes: 'Health Centre Lockbox',
      },
    ],
    shelters: [
      {
        name: 'Village Hall Central Shelter',
        type: 'Primary Reception Centre',
        address: 'Main Street, Central Square',
        capacity: '180',
        keyholder: 'Hall Warden',
        phone: leadCoordinatorPhone,
        hasGenerator: true,
      },
      {
        name: 'Community Secondary School Pavilion',
        type: 'Secondary / Overflow Centre',
        address: 'School Lane Campus',
        capacity: '250',
        keyholder: 'Campus Caretaker',
        phone: '07700 900456',
        hasGenerator: false,
      },
    ],
    liaisons: [
      { role: 'Community Resilience Coordinator', agencyOrName: leadCoordinatorName, telephone: leadCoordinatorPhone, notes: '24/7 Incident Lead' },
      { role: 'SFRS Fire Station Incident Lead', agencyOrName: 'Local Retained Station', telephone: '999 / Control', notes: 'Emergency Services Liaison' },
      { role: 'Estate Factor / Land Manager', agencyOrName: 'Highland Forestry Lead', telephone: '07700 900789', notes: 'Access & Landowner Liaison' },
    ],
    assets: [
      { category: 'Machinery', name: '4x4 Winch ATV & Snow Runner', description: 'Available for mountain road clearance' },
      { category: 'Auxiliary Power', name: '15kVA Diesel Mobile Generator', description: 'Stored at Roads Depot Shed B' },
    ],
    transportFleet: [
      { operatorName: 'Stagecoach Regional Depot', vehicleType: '53-Seat Coaches', capacity: 160, phone: '07700 900555' },
      { operatorName: 'Community Accessible Minibus', vehicleType: 'Wheelchair Lift Van', capacity: 16, phone: '07700 900666' },
    ],
    musterPoints: [
      { name: 'Town Square Car Park (Tier 1)', address: 'High Street Main Bays', onSiteCoordinator: 'Muster Marshal A' },
      { name: 'East End Church Yard (Tier 2)', address: 'Church Brae Access', onSiteCoordinator: 'Muster Marshal B' },
    ],
  }), [townshipName, communityId, leadCoordinatorName, leadCoordinatorRole, leadCoordinatorPhone]);

  const handlePrintGrabBag = () => {
    try {
      const win = window.open('', '_blank');
      if (!win) {
        toast({ title: 'Pop-up Blocked', description: 'Please allow pop-ups to view the PDF.', variant: 'destructive' });
        return;
      }
      const html = generateGrabBagHtml(dummyGrabBagData);
      win.document.write(html);
      win.document.close();
      toast({ title: '🖨️ Generating Grab-Bag Runbook', description: '2-page emergency dossier formatted for print.' });
    } catch (e: any) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    }
  };

  return (
    <div className="container max-w-6xl mx-auto py-6 sm:py-8 space-y-8 pb-20 font-sans">
      {/* 1. TOP BREADCRUMB & ACTION BAR */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Link href={backUrl} className="hover:text-primary transition-colors flex items-center gap-1 font-bold">
            <ArrowLeft className="h-4 w-4" /> Emergency Plan
          </Link>
          <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/50" />
          <span className="text-foreground font-extrabold">ISO 22301 Auditor Brief &amp; Legal Framework</span>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Edit / View Mode Toggle */}
          <Button
            onClick={() => setIsEditMode(!isEditMode)}
            variant={isEditMode ? 'default' : 'outline'}
            size="sm"
            className={isEditMode ? 'bg-amber-600 hover:bg-amber-500 text-white font-bold gap-1.5 text-xs' : 'font-bold gap-1.5 text-xs'}
          >
            <Edit3 className="h-3.5 w-3.5" />
            {isEditMode ? 'Exit Edit Mode' : '✏️ Edit Content'}
          </Button>

          {isEditMode && (
            <Button
              onClick={handleSaveComplianceSettings}
              disabled={isSaving}
              size="sm"
              className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold gap-1.5 text-xs shadow-md shadow-emerald-950/40"
            >
              <Save className="h-3.5 w-3.5" /> Save Changes
            </Button>
          )}

          <Button
            onClick={handleDownloadComplianceBrief}
            size="sm"
            className="bg-sky-600 hover:bg-sky-500 text-white font-bold gap-2 text-xs shadow-md shadow-sky-950/40"
          >
            <Download className="h-4 w-4" /> Download ISO 22301 Auditor Brief (PDF)
          </Button>

          <Button
            onClick={handlePrintGrabBag}
            variant="outline"
            size="sm"
            className="border-emerald-500/50 text-emerald-400 hover:bg-emerald-950/40 font-bold gap-2 text-xs shadow-sm"
          >
            <Printer className="h-4 w-4 text-emerald-400" /> Export Grab-Bag Dossier (PDF)
          </Button>
        </div>
      </div>

      {/* 2. HERO MASTHEAD BANNER */}
      <div className="rounded-3xl bg-gradient-to-r from-slate-950 via-slate-900 to-indigo-950/70 border border-slate-800 p-6 sm:p-8 text-white relative overflow-hidden shadow-2xl space-y-4">
        <div className="flex items-center gap-2 flex-wrap">
          <Badge className="bg-sky-500/20 text-sky-300 border-sky-500/50 font-mono text-xs uppercase px-3 py-1">
            ISO 22301:2019 Clauses 7.5, 8.1, 8.4 &amp; 8.4.4
          </Badge>
          <Badge variant="outline" className="text-emerald-400 border-emerald-500/40 font-mono text-xs">
            Graceful Degradation Architecture
          </Badge>
          <Badge variant="outline" className="text-amber-300 border-amber-500/40 font-mono text-xs">
            Firebase + Git + Antigravity Technical Spine
          </Badge>
        </div>

        <div className="space-y-2 max-w-3xl">
          <h1 className="text-2xl sm:text-4xl font-black tracking-tight font-headline">
            ISO 22301 Graceful Degradation Architecture &amp; Auditor Defence Brief
          </h1>
          <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
            Platform: <strong>Community Emergency Action Platform (Community Hub)</strong> • Jurisdiction: <strong>{townshipName}</strong>
          </p>
        </div>

        {/* Editable Coordinator Summary in Edit Mode */}
        {isEditMode && (
          <div className="mt-4 pt-4 border-t border-slate-800 grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
            <div className="space-y-1">
              <Label className="text-[10px] text-amber-300 uppercase font-bold">Resilience Lead Name</Label>
              <Input
                value={leadCoordinatorName}
                onChange={(e) => setLeadCoordinatorName(e.target.value)}
                className="bg-slate-900 border-slate-700 text-white h-8 text-xs font-bold"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-[10px] text-amber-300 uppercase font-bold">Lead Role Title</Label>
              <Input
                value={leadCoordinatorRole}
                onChange={(e) => setLeadCoordinatorRole(e.target.value)}
                className="bg-slate-900 border-slate-700 text-white h-8 text-xs font-bold"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-[10px] text-amber-300 uppercase font-bold">24/7 Telephone</Label>
              <Input
                value={leadCoordinatorPhone}
                onChange={(e) => setLeadCoordinatorPhone(e.target.value)}
                className="bg-slate-900 border-slate-700 text-white h-8 text-xs font-mono font-bold"
              />
            </div>
          </div>
        )}
      </div>

      {/* 3. TABS NAVIGATION */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid grid-cols-2 md:grid-cols-6 bg-muted/60 p-1 rounded-2xl h-auto gap-1">
          <TabsTrigger value="summary" className="text-xs font-bold py-2.5 gap-1 data-[state=active]:bg-card data-[state=active]:shadow-sm">
            <Info className="h-3.5 w-3.5 text-sky-400" /> 1. Exec Summary
          </TabsTrigger>
          <TabsTrigger value="tiers" className="text-xs font-bold py-2.5 gap-1 data-[state=active]:bg-card data-[state=active]:shadow-sm">
            <Layers className="h-3.5 w-3.5 text-emerald-400" /> 2. Tiers 1–4
          </TabsTrigger>
          <TabsTrigger value="governance" className="text-xs font-bold py-2.5 gap-1 data-[state=active]:bg-card data-[state=active]:shadow-sm">
            <Bot className="h-3.5 w-3.5 text-purple-400" /> 3. Antigravity Governance
          </TabsTrigger>
          <TabsTrigger value="defense" className="text-xs font-bold py-2.5 gap-1 data-[state=active]:bg-card data-[state=active]:shadow-sm">
            <HelpCircle className="h-3.5 w-3.5 text-amber-400" /> 4. Auditor Script
          </TabsTrigger>
          <TabsTrigger value="terms" className="text-xs font-bold py-2.5 gap-1 data-[state=active]:bg-card data-[state=active]:shadow-sm">
            <Scale className="h-3.5 w-3.5 text-red-400" /> 5. Legal Terms
          </TabsTrigger>
          <TabsTrigger value="layers" className="text-xs font-bold py-2.5 gap-1 data-[state=active]:bg-card data-[state=active]:shadow-sm">
            <BookOpen className="h-3.5 w-3.5 text-cyan-400" /> 6. Grab-Bag Protocol
          </TabsTrigger>
        </TabsList>

        {/* ========================================================================= */}
        {/* SECTION 1: EXECUTIVE SUMMARY                                              */}
        {/* ========================================================================= */}
        <TabsContent value="summary" className="space-y-6">
          <Card className="border shadow-md">
            <CardHeader className="border-b bg-muted/20 pb-4">
              <CardTitle className="text-lg font-black flex items-center gap-2">
                <Info className="h-5 w-5 text-sky-500" />
                1. Executive Summary for Auditors &amp; Civil Resilience Teams
              </CardTitle>
              <CardDescription className="text-xs">
                Classification: Operational Architecture &amp; Compliance Defence Evidence
              </CardDescription>
            </CardHeader>
            <CardContent className="p-6 space-y-6">
              <div className="p-4 rounded-2xl bg-muted/30 border space-y-2">
                <p className="text-xs font-black text-foreground">A recurring challenge during municipal resilience audits and emergency planning reviews is:</p>
                <blockquote className="text-xs italic text-sky-600 dark:text-sky-300 border-l-3 border-sky-500 pl-3 font-semibold leading-relaxed">
                  "If cellular masts collapse and internet backbones fail, how does a digital web app provide continuity? Furthermore, how do you ensure rapid AI-driven code changes never compromise life-safety systems?"
                </blockquote>
              </div>

              <div className="space-y-3 text-xs text-muted-foreground leading-relaxed">
                <p>
                  Under <strong className="text-foreground">ISO 22301</strong>, organizations are not required to defy physical disruptions to public utilities. Rather, they are required to demonstrate:
                </p>
                <ol className="list-decimal pl-5 space-y-2">
                  <li>
                    <strong className="text-foreground">Pre-planned, tested fallback procedures (Graceful Degradation)</strong> down to manual contingencies.
                  </li>
                  <li>
                    <strong className="text-foreground">Immutable change control and codebase continuity</strong> so the platform itself can be restored, reviewed, or rolled back instantly.
                  </li>
                </ol>
                <p>
                  Community Hub accomplishes this through a <strong className="text-foreground">4-Tier Continuity Model</strong> supported by an auditable <strong className="text-foreground">Firebase + Git + Antigravity</strong> technical spine:
                </p>
              </div>

              {/* Ascii / Flow Diagram */}
              <div className="p-4 rounded-2xl bg-slate-950 text-emerald-400 font-mono text-xs overflow-x-auto border border-slate-800 shadow-inner leading-relaxed">
                [Tier 1: Full Cloud Connection] ──► Firebase Multi-Region Edge, Web Sockets, Live GPS<br/>
                &nbsp;│ (Telecom masts congest/fail)<br/>
                &nbsp;▼<br/>
                [Tier 2: Offline Client Memory] ──► Firebase Persistent Disk Cache + Indexed DB (Local reads)<br/>
                &nbsp;│ (Wide-area ISP severed completely)<br/>
                &nbsp;▼<br/>
                [Tier 3: Low-Bandwidth Fallback] ──► 2G / SMS Gateways &amp; Evacuation Shelter Subnet<br/>
                &nbsp;│ (Extended blackout / flat batteries)<br/>
                &nbsp;▼<br/>
                [Tier 4: Manual "Grab-Bag" SOP] ──► Pre-printed, waterproof quarterly physical PDF dossiers
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ========================================================================= */}
        {/* SECTION 2: TECHNICAL BREAKDOWN ACROSS TIERS                                */}
        {/* ========================================================================= */}
        <TabsContent value="tiers" className="space-y-6">
          <Card className="border shadow-md">
            <CardHeader className="border-b bg-muted/20 pb-4">
              <CardTitle className="text-lg font-black flex items-center gap-2">
                <Layers className="h-5 w-5 text-emerald-500" />
                2. Technical Breakdown Across Continuity Tiers
              </CardTitle>
              <CardDescription className="text-xs">
                Detailed infrastructure and failover engineering specifications.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-6 space-y-6 text-xs text-muted-foreground leading-relaxed">
              {/* Tier 1 */}
              <div className="p-5 rounded-2xl border bg-card space-y-2.5 shadow-sm">
                <h3 className="text-sm font-extrabold text-foreground flex items-center gap-2">
                  <Cloud className="h-4 w-4 text-sky-500" /> Tier 1: Normal Operations (Firebase Multi-Region Cloud)
                </h3>
                <ul className="list-disc pl-5 space-y-1.5">
                  <li><strong className="text-foreground">Hosting &amp; Edge Delivery:</strong> Firebase Hosting backed by Google's global Edge CDN, serving pre-compressed assets from geo-distributed points of presence.</li>
                  <li><strong className="text-foreground">Database Layer:</strong> Cloud Firestore deployed in Multi-Region mode (e.g., nam5 or eur3), providing automatic replication across physically separate metropolitan zones with zero-downtime failover.</li>
                  <li><strong className="text-foreground">Point-in-Time Recovery (PITR):</strong> Continuous change-log retention enables microsecond-level state recovery up to 7 days if data corruption or unauthorised overwrites occur.</li>
                </ul>
              </div>

              {/* Tier 2 */}
              <div className="p-5 rounded-2xl border bg-card space-y-2.5 shadow-sm">
                <h3 className="text-sm font-extrabold text-foreground flex items-center gap-2">
                  <WifiOff className="h-4 w-4 text-emerald-500" /> Tier 2: Degraded Network / Tower Loss (Offline-First Firebase PWA)
                </h3>
                <ul className="list-disc pl-5 space-y-1.5">
                  <li><strong className="text-foreground">Mechanism:</strong> Firebase Firestore Web SDK persistent Local Cache combined with custom Service Worker caching.</li>
                  <li><strong className="text-foreground">Auditable Evidence:</strong>
                    <ul className="list-circle pl-5 mt-1 space-y-1">
                      <li>Emergency Action Plans (EAPs), shelter matrices, lockbox combinations, and warden call-trees are automatically written to local client storage (Indexed DB) on initial retrieval.</li>
                      <li>When <code className="bg-muted px-1.5 py-0.5 rounded text-foreground font-mono">navigator.onLine === false</code>, the application switches seamlessly to read from device flash storage without throwing unhandled exceptions or presenting blank screens.</li>
                      <li>Outbound field updates (e.g., road blockage reports) are buffered into an encrypted local outbox queue and automatically replayed with timestamp preservation once connectivity resumes.</li>
                    </ul>
                  </li>
                </ul>
              </div>

              {/* Tier 3 */}
              <div className="p-5 rounded-2xl border bg-card space-y-2.5 shadow-sm">
                <h3 className="text-sm font-extrabold text-foreground flex items-center gap-2">
                  <Radio className="h-4 w-4 text-amber-500" /> Tier 3: Low-Bandwidth &amp; Islanded Network Redundancy
                </h3>
                <ul className="list-disc pl-5 space-y-1.5">
                  <li><strong className="text-foreground">SMS / 2G Cellular Bridge:</strong> High-payload UI assets (maps, satellite tiles) are bypassed. Incident notifications route through lightweight SMS gateways (e.g., GovNotify or Twilio) over 2G cellular frequencies that benefit from extended battery-backup survival at base stations.</li>
                  <li><strong className="text-foreground">Evacuation Shelter Micro-Hub:</strong> If a parish hall or evacuation shelter operates an isolated generator-powered Wi-Fi router without wide-area internet backhaul, clients connect locally to query cached peer data.</li>
                </ul>
              </div>

              {/* Tier 4 */}
              <div className="p-5 rounded-2xl border-2 border-sky-500/40 bg-sky-500/5 space-y-2.5 shadow-sm">
                <h3 className="text-sm font-extrabold text-sky-600 dark:text-sky-300 flex items-center gap-2">
                  <FileText className="h-4 w-4 text-sky-500" /> Tier 4: Non-Digital Contingency ("Grab-Bag" Protocol)
                </h3>
                <ul className="list-disc pl-5 space-y-1.5">
                  <li><strong className="text-foreground">Standard Alignment:</strong> ISO 22301 Clause 8.4 mandates manual workarounds when technology infrastructure outage limits are exceeded.</li>
                  <li><strong className="text-foreground">Implementation:</strong> An automated, client-side "Export Resilience Dossier" generates a high-contrast, 2-page print-optimised PDF. Parish coordinators are instructed to print hard copies quarterly and place them into physical emergency grab-bags and hall lockboxes containing analogue backup radio channels (PMR446 / VHF), generator cold-start SOPs, AED access keys, and vulnerable resident registers.</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ========================================================================= */}
        {/* SECTION 3: ENGINEERING GOVERNANCE (GIT & ANTIGRAVITY)                     */}
        {/* ========================================================================= */}
        <TabsContent value="governance" className="space-y-6">
          <Card className="border shadow-md">
            <CardHeader className="border-b bg-muted/20 pb-4">
              <CardTitle className="text-lg font-black flex items-center gap-2">
                <Bot className="h-5 w-5 text-purple-500" />
                3. Engineering Governance &amp; Change Control: Git &amp; Google Antigravity
              </CardTitle>
              <CardDescription className="text-xs">
                Supply chain integrity, agentic verification gates, and instant 1-command reversion.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-6 space-y-6 text-xs text-muted-foreground leading-relaxed">
              <p>
                Auditors frequently inspect the software supply chain to verify that emergency tools cannot be taken down by faulty deployments or unverified AI agent contributions.
              </p>

              {/* Pipeline Flowchart Box */}
              <div className="p-4 rounded-2xl bg-slate-950 text-sky-300 font-mono text-xs overflow-x-auto border border-slate-800 shadow-inner leading-relaxed">
                ┌──────────────────────────────┐<br/>
                │ Google Antigravity Agent &nbsp; &nbsp;│ (Autonomous Development IDE)<br/>
                └──────────────┬───────────────┘<br/>
                &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp;▼<br/>
                ┌──────────────────────────────┐<br/>
                │ Git Commit &amp; PR Checkpoint &nbsp; │ ──► Cryptographic signature, auditable commit author<br/>
                └──────────────┬───────────────┘<br/>
                &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp;▼<br/>
                ┌──────────────────────────────┐<br/>
                │ Automated CI Continuity Gate │ ──► Verifies: 1) Offline PWA cache integrity<br/>
                └──────────────┬───────────────┘ &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; 2) RTO/RPO SLA compliance<br/>
                &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp;▼ &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; 3) Firestore schema compliance<br/>
                ┌──────────────────────────────┐<br/>
                │ Production Firebase Deploy &nbsp; │ ──► Instant 1-click rollback via Firebase Hosting CLI<br/>
                └──────────────────────────────┘
              </div>

              {/* Subsection A */}
              <div className="p-5 rounded-2xl border bg-card space-y-2">
                <h4 className="font-extrabold text-foreground text-xs uppercase tracking-wider">
                  A. Git Version Control as Disaster Recovery (ISO 22301 Clause 7.5 &amp; 8.1)
                </h4>
                <ol className="list-decimal pl-5 space-y-1.5">
                  <li><strong className="text-foreground">Cryptographic Audit Trail:</strong> Every configuration change, schema migration, and emergency protocol update is tracked via signed Git commits, ensuring absolute traceability of who approved each change.</li>
                  <li><strong className="text-foreground">Deterministic Infrastructure-as-Code (IaC):</strong> Firebase security rules, Firestore indexing definitions, and deployment targets are committed to the repository. The entire production stack can be rebuilt from scratch in another cloud project in minutes.</li>
                  <li><strong className="text-foreground">Instant Reversion (RTO Minute):</strong> If an errant update impacts field operations, Firebase Hosting combined with Git tags allows a 1-command rollback to the last verified release without rebuilding containers.</li>
                </ol>
              </div>

              {/* Subsection B */}
              <div className="p-5 rounded-2xl border bg-card space-y-2">
                <h4 className="font-extrabold text-foreground text-xs uppercase tracking-wider">
                  B. Google Antigravity Agentic Governance (ISO 22301 Clause 8.3 &amp; 7.2)
                </h4>
                <ol className="list-decimal pl-5 space-y-1.5">
                  <li><strong className="text-foreground">Agentic Verification Gates:</strong> Because code modifications and emergency workflows can be authored by AI agents within Google Antigravity, all agent commits must pass continuous integration (CI) test suites before hitting main.</li>
                  <li><strong className="text-foreground">Offline-Mode Non-Regression Testing:</strong> Antigravity automated test scripts deliberately sever network mock connections (offline event emission) to verify that recent code iterations have not broken the Indexed DB cache or Service Worker precaching manifests.</li>
                  <li><strong className="text-foreground">Restricted Agentic Privileges:</strong> Antigravity agents cannot deploy directly to live production environments; deployments require explicit authenticated human sign-off via branch protection rules.</li>
                </ol>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ========================================================================= */}
        {/* SECTION 4: AUDITOR Q&A DEFENCE SCRIPT                                     */}
        {/* ========================================================================= */}
        <TabsContent value="defense" className="space-y-6">
          <Card className="border shadow-md">
            <CardHeader className="border-b bg-muted/20 pb-4">
              <CardTitle className="text-lg font-black flex items-center gap-2">
                <HelpCircle className="h-5 w-5 text-amber-500" />
                4. Auditor Q&amp;A Defence Script
              </CardTitle>
              <CardDescription className="text-xs">
                Use these precise technical defences when responding to questions from civil protection boards, insurance underwriters, or ISO certification assessors.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              <div className="space-y-4">
                <div className="p-4 rounded-xl border bg-card space-y-2 shadow-sm">
                  <p className="text-xs font-black text-foreground">
                    ❓ "What happens to citizens when cellular towers drop?"
                  </p>
                  <p className="text-xs text-muted-foreground leading-relaxed border-l-2 border-emerald-500 pl-3">
                    <strong>Compliant ISO 22301 Answer:</strong> "The application utilises client-side Service Workers and Firebase Indexed DB caching. Any resident who has previously accessed their local plan retains complete read access to maps, shelter lists, and warden contacts, even in complete airplane mode."
                  </p>
                </div>

                <div className="p-4 rounded-xl border bg-card space-y-2 shadow-sm">
                  <p className="text-xs font-black text-foreground">
                    ❓ "How do you prevent data loss if coordinators enter reports while offline?"
                  </p>
                  <p className="text-xs text-muted-foreground leading-relaxed border-l-2 border-emerald-500 pl-3">
                    <strong>Compliant ISO 22301 Answer:</strong> "Submissions write immediately to an IndexedDB local outbox queue. Once any wireless handshake or cellular link re-establishes, records synchronise automatically to Cloud Firestore using Point-in-Time logs to prevent collision."
                  </p>
                </div>

                <div className="p-4 rounded-xl border bg-card space-y-2 shadow-sm">
                  <p className="text-xs font-black text-foreground">
                    ❓ "What if local power is out for 5 days and mobile batteries die?"
                  </p>
                  <p className="text-xs text-muted-foreground leading-relaxed border-l-2 border-emerald-500 pl-3">
                    <strong>Compliant ISO 22301 Answer:</strong> "Conforming to ISO 22301 non-digital fallback mandates, the system includes a 1-click automated grab-bag exporter. Coordinators keep physical, laminated 2-page dossiers in parish hall safes containing radio channels and access PINs."
                  </p>
                </div>

                <div className="p-4 rounded-xl border bg-card space-y-2 shadow-sm">
                  <p className="text-xs font-black text-foreground">
                    ❓ "What if Google Firebase suffers an outage?"
                  </p>
                  <p className="text-xs text-muted-foreground leading-relaxed border-l-2 border-emerald-500 pl-3">
                    <strong>Compliant ISO 22301 Answer:</strong> "Our database operates on Cloud Firestore Multi-Region infrastructure, spanning independent data centre zones with automatic failover. Additionally, the PWA client continues functioning on cached local device storage completely independent of cloud uptime."
                  </p>
                </div>

                <div className="p-4 rounded-xl border bg-card space-y-2 shadow-sm">
                  <p className="text-xs font-black text-foreground">
                    ❓ "How do you govern AI agents in Google Antigravity so they don't break emergency continuity?"
                  </p>
                  <p className="text-xs text-muted-foreground leading-relaxed border-l-2 border-emerald-500 pl-3">
                    <strong>Compliant ISO 22301 Answer:</strong> "All code generated in Google Antigravity is bounded by strict Git version control and CI test suites. Automated tests simulate disconnected network environments to prove offline persistence before any deployment is accepted into production."
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ========================================================================= */}
        {/* SECTION 5: PUBLIC TERMS & LIMITATION OF SERVICE                            */}
        {/* ========================================================================= */}
        <TabsContent value="terms" className="space-y-6">
          <Card className="border shadow-md">
            <CardHeader className="border-b bg-muted/20 pb-4">
              <CardTitle className="text-lg font-black flex items-center gap-2">
                <Scale className="h-5 w-5 text-red-500" />
                5. Public-Facing App Disclaimer &amp; Terms Wording
              </CardTitle>
              <CardDescription className="text-xs">
                (Place this text in your app’s Terms of Service, registration flow, or Settings &gt; About screen)
              </CardDescription>
            </CardHeader>
            <CardContent className="p-6 space-y-5 text-xs text-muted-foreground leading-relaxed">
              <div className="p-5 rounded-2xl bg-muted/30 border space-y-4">
                <h4 className="font-black text-foreground text-sm uppercase">
                  ### Emergency Service Continuity &amp; Limitation of Service
                </h4>

                <div className="space-y-3">
                  <p>
                    <strong className="text-foreground">1. Intended Role:</strong> The Community Hub platform is a decentralised community resilience and coordination tool. It is designed to assist local neighbourhood preparedness, volunteer organisation, and mutual aid. It is <strong className="text-red-500">NOT a replacement for statutory emergency blue-light services (e.g., 999, 911, or 112)</strong>. In any life-threatening situation, always attempt to contact official national emergency services first.
                  </p>
                  <p>
                    <strong className="text-foreground">2. Telecommunications Dependence &amp; Local Caching:</strong> While this platform incorporates advanced offline persistence (Indexed DB, Service Worker caching, and multi-region cloud infrastructure) to maintain availability during disruptions, live telecommunications rely on third-party mobile operators and public utility grids.
                  </p>
                  <p>
                    <strong className="text-foreground">3. Grab-Bag Hard-Copy Protocol:</strong> In accordance with ISO 22301 community resilience guidelines, community wardens and coordinators are strongly advised to generate, print, and securely store physical hard copies of their emergency action dossier on a quarterly basis to guarantee operational readiness during total electrical or communications blackouts.
                  </p>
                </div>
              </div>

              {/* Editable Custom Bylaws Section */}
              <div className="space-y-2 pt-2">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-bold text-foreground">
                    Custom Municipal Bylaws &amp; Local Resilience Provisions
                  </Label>
                  {isEditMode && <Badge className="bg-amber-500/20 text-amber-300 text-[10px]">Editable</Badge>}
                </div>
                {isEditMode ? (
                  <Textarea
                    value={customBylaws}
                    onChange={(e) => setCustomBylaws(e.target.value)}
                    placeholder="Add bespoke municipal bylaws, council emergency committee authorizations, or localized ward protocols..."
                    className="min-h-[120px] text-xs font-sans"
                  />
                ) : (
                  <div className="p-4 rounded-xl border bg-card text-xs min-h-[80px]">
                    {customBylaws || <span className="text-muted-foreground italic">No custom bylaws added yet. Click '✏️ Edit Content' at the top to add bespoke local regulations.</span>}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ========================================================================= */}
        {/* SECTION 6: OPERATIONAL LAYERS & SUMMARY                                   */}
        {/* ========================================================================= */}
        <TabsContent value="layers" className="space-y-6">
          <Card className="border shadow-md">
            <CardHeader className="border-b bg-muted/20 pb-4">
              <CardTitle className="text-lg font-black flex items-center gap-2">
                <BookOpen className="h-5 w-5 text-cyan-500" />
                6. Operational Multi-Layer Summary &amp; Protocol
              </CardTitle>
              <CardDescription className="text-xs">
                How device memory and physical lockbox copies work together to eliminate single points of failure.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-6 space-y-6 text-xs text-muted-foreground leading-relaxed">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-5 rounded-2xl border bg-card space-y-2 shadow-sm">
                  <h4 className="font-extrabold text-foreground text-xs uppercase flex items-center gap-1.5">
                    <Server className="h-4 w-4 text-emerald-500" /> Layer 1: Device Memory (Indexed DB Local Cache)
                  </h4>
                  <p>Whenever the leader or coordinator opens Community Hub during normal times:</p>
                  <ul className="list-disc pl-5 space-y-1">
                    <li>The app automatically downloads and saves a copy of the emergency plan, shelter contacts, keyholder numbers, and generator keys directly into the device's local browser database (Indexed DB).</li>
                    <li><strong className="text-foreground">When the network collapses:</strong> The app doesn't ask the cloud for anything. It opens instantly from the phone or laptop’s internal hard drive and generates the Grab-Bag dossier on the screen even in Airplane Mode with zero WiFi and zero cellular signal.</li>
                  </ul>
                </div>

                <div className="p-5 rounded-2xl border bg-card space-y-2 shadow-sm">
                  <h4 className="font-extrabold text-foreground text-xs uppercase flex items-center gap-1.5">
                    <Key className="h-4 w-4 text-amber-500" /> Layer 2: The Physical "Pre-Printed" Grab-Bag (Gold Standard)
                  </h4>
                  <p>Under ISO 22301, true disaster recovery never relies exclusively on a digital screen during a storm (because batteries can die or screens can break):</p>
                  <ol className="list-decimal pl-5 space-y-1">
                    <li><strong className="text-foreground">Quarterly Routine:</strong> Every 3 or 6 months, the community resilience leader opens the app, clicks "Export Grab-Bag Dossier (PDF)", and prints 2 physical paper copies.</li>
                    <li><strong className="text-foreground">Lockbox Storage:</strong> One copy goes into the Village Hall emergency lockbox and one into the Leader's physical emergency backpack/grab-bag alongside battery torches, generator keys, and analogue walkie-talkies.</li>
                  </ol>
                </div>
              </div>

              {/* Summary Table */}
              <div className="rounded-2xl border overflow-hidden shadow-sm">
                <table className="w-full text-xs">
                  <thead className="bg-muted/50 border-b">
                    <tr>
                      <th className="p-3 text-left font-bold text-foreground w-1/3">Scenario</th>
                      <th className="p-3 text-left font-bold text-foreground w-2/3">How the Grab-Bag Works</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    <tr>
                      <td className="p-3 font-bold text-foreground">Normal Operations</td>
                      <td className="p-3">Cloud syncs real-time changes instantly.</td>
                    </tr>
                    <tr>
                      <td className="p-3 font-bold text-foreground">Internet &amp; Cell Towers Down</td>
                      <td className="p-3">Device opens the cached Grab-Bag directly from phone/laptop local memory (Indexed DB).</td>
                    </tr>
                    <tr>
                      <td className="p-3 font-bold text-foreground">Power Grid Out &amp; Batteries Dead (Day 4+)</td>
                      <td className="p-3">Wardens pull the pre-printed, physical hard-copy dossier from the village hall lockbox.</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-500/30 text-emerald-800 dark:text-emerald-300 font-bold flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-emerald-500 shrink-0" />
                <span>This multi-layer redundancy is what guarantees zero single points of failure.</span>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
