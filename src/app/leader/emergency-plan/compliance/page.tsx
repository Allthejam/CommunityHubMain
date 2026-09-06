'use client';

import React, { useState, useMemo } from 'react';
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
  Key
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { generateComplianceBriefHtml } from '@/lib/compliance-pdf-generator';
import { generateGrabBagHtml, GrabBagDossierData } from '@/lib/emergency-grab-bag-generator';

export default function EmergencyPlanCompliancePage() {
  const pathname = usePathname();
  const { toast } = useToast();

  const isDemo = pathname?.startsWith('/demo') || false;
  const backUrl = isDemo ? '/demo/leader/emergency-plan' : '/leader/emergency-plan';
  const townshipName = isDemo ? 'Oakridge Community Council' : 'Local Municipality / Community Council';

  const [activeTab, setActiveTab] = useState('architecture');

  const dummyGrabBagData: GrabBagDossierData = useMemo(() => ({
    townshipName,
    communityId: isDemo ? '9ayHMyZf4SRw2gof1AM9' : 'c_live',
    lastReviewedDate: '06 Sep 2026',
    reviewedByName: 'Fiona Macleod',
    reviewedByRole: 'Community Resilience Coordinator',
    nextReviewDue: '06 Mar 2027',
    keyholders: [
      {
        facilityOrAsset: 'Village Hall Reception Shelter & Generator Cache',
        primaryName: 'Fiona Macleod',
        primaryPhone: '07700 900123',
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
        phone: '07700 900123',
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
      { role: 'Community Resilience Coordinator', agencyOrName: 'Fiona Macleod', telephone: '07700 900123', notes: '24/7 Incident Lead' },
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
  }), [townshipName, isDemo]);

  const handleDownloadComplianceBrief = () => {
    try {
      const win = window.open('', '_blank');
      if (!win) {
        toast({ title: 'Pop-up Blocked', description: 'Please allow pop-ups to view the PDF.', variant: 'destructive' });
        return;
      }
      const html = generateComplianceBriefHtml({ townshipName });
      win.document.write(html);
      win.document.close();
      toast({ title: '📄 Generating ISO 22301 Compliance Brief', description: 'Official auditor brief formatted for PDF print.' });
    } catch (e: any) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    }
  };

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
          <span className="text-foreground font-extrabold">ISO 22301 Compliance &amp; Legal Brief</span>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
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
      <div className="rounded-3xl bg-gradient-to-r from-slate-950 via-slate-900 to-indigo-950/60 border border-slate-800 p-6 sm:p-8 text-white relative overflow-hidden shadow-2xl space-y-4">
        <div className="flex items-center gap-2 flex-wrap">
          <Badge className="bg-sky-500/20 text-sky-300 border-sky-500/50 font-mono text-xs uppercase px-3 py-1">
            ISO 22301:2019 Clause 8.4 Aligned
          </Badge>
          <Badge variant="outline" className="text-emerald-400 border-emerald-500/40 font-mono text-xs">
            Graceful Degradation Specification
          </Badge>
          <Badge variant="outline" className="text-amber-300 border-amber-500/40 font-mono text-xs">
            Council Audit &amp; Legal Evidence
          </Badge>
        </div>

        <div className="space-y-2 max-w-3xl">
          <h1 className="text-2xl sm:text-4xl font-black tracking-tight font-headline">
            Disaster Recovery &amp; Civil Resilience Compliance
          </h1>
          <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
            Official operational architecture, auditor defense scripts, and statutory limitation of service disclosures for <strong>{townshipName}</strong>.
          </p>
        </div>
      </div>

      {/* 3. TABS NAVIGATION */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid grid-cols-2 md:grid-cols-4 bg-muted/60 p-1 rounded-2xl h-auto gap-1">
          <TabsTrigger value="architecture" className="text-xs font-bold py-2.5 gap-1.5 data-[state=active]:bg-card data-[state=active]:shadow-sm">
            <Layers className="h-3.5 w-3.5 text-sky-400" /> 4-Tier Architecture
          </TabsTrigger>
          <TabsTrigger value="defense" className="text-xs font-bold py-2.5 gap-1.5 data-[state=active]:bg-card data-[state=active]:shadow-sm">
            <HelpCircle className="h-3.5 w-3.5 text-emerald-400" /> Auditor Defense Q&amp;A
          </TabsTrigger>
          <TabsTrigger value="terms" className="text-xs font-bold py-2.5 gap-1.5 data-[state=active]:bg-card data-[state=active]:shadow-sm">
            <Scale className="h-3.5 w-3.5 text-amber-400" /> Terms &amp; Limitations
          </TabsTrigger>
          <TabsTrigger value="gdpr" className="text-xs font-bold py-2.5 gap-1.5 data-[state=active]:bg-card data-[state=active]:shadow-sm">
            <Lock className="h-3.5 w-3.5 text-purple-400" /> GDPR &amp; Privacy
          </TabsTrigger>
        </TabsList>

        {/* TAB 1: 4-TIER CONTINUITY ARCHITECTURE */}
        <TabsContent value="architecture" className="space-y-6">
          <Card className="border shadow-md">
            <CardHeader className="border-b bg-muted/20 pb-4">
              <CardTitle className="text-lg font-black flex items-center gap-2">
                <Layers className="h-5 w-5 text-sky-500" />
                The 4-Tier Graceful Degradation Model
              </CardTitle>
              <CardDescription className="text-xs">
                How Community Hub ensures zero single points of failure when public telecommunications or power infrastructure collapse.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Tier 1 */}
                <div className="p-5 rounded-2xl border bg-card space-y-3 shadow-sm">
                  <div className="flex items-center justify-between border-b pb-2">
                    <span className="font-extrabold text-sm text-sky-600 dark:text-sky-400">Tier 1: Cloud Connected</span>
                    <Cloud className="h-5 w-5 text-sky-500" />
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Under normal operations with active cellular 4G/5G and broadband networks, Community Hub provides sub-second emergency push dispatches, real-time map GPS tracking, and interactive community chat.
                  </p>
                  <div className="text-[11px] font-mono text-muted-foreground bg-muted/40 p-2 rounded-lg">
                    • Edge WebSocket Sync<br/>
                    • Live Geofenced Beacons
                  </div>
                </div>

                {/* Tier 2 */}
                <div className="p-5 rounded-2xl border bg-card space-y-3 shadow-sm">
                  <div className="flex items-center justify-between border-b pb-2">
                    <span className="font-extrabold text-sm text-emerald-600 dark:text-emerald-400">Tier 2: Offline Client Memory</span>
                    <WifiOff className="h-5 w-5 text-emerald-500" />
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    If local telecom masts or ISP fiber lines fail, the Progressive Web App (PWA) operates entirely from local device memory (IndexedDB). Stored shelter coordinates, keyholder phone numbers, and emergency SOPs open with 0ms latency in Airplane mode.
                  </p>
                  <div className="text-[11px] font-mono text-muted-foreground bg-muted/40 p-2 rounded-lg">
                    • IndexedDB Local Cache<br/>
                    • Queued Offline Outbox
                  </div>
                </div>

                {/* Tier 3 */}
                <div className="p-5 rounded-2xl border bg-card space-y-3 shadow-sm">
                  <div className="flex items-center justify-between border-b pb-2">
                    <span className="font-extrabold text-sm text-amber-600 dark:text-amber-400">Tier 3: Low-Bandwidth Fallback</span>
                    <Radio className="h-5 w-5 text-amber-500" />
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    During heavy network congestion, high-bandwidth elements are disabled. The system bridges into text-only SMS gateways (e.g. Twilio / GovNotify) over 2G cellular bands with backup battery power, and local generator-powered village hall WiFi subnets.
                  </p>
                  <div className="text-[11px] font-mono text-muted-foreground bg-muted/40 p-2 rounded-lg">
                    • 2G SMS Broadcast Bridges<br/>
                    • Generator Islanded Subnets
                  </div>
                </div>

                {/* Tier 4 */}
                <div className="p-5 rounded-2xl border-2 border-sky-500/40 bg-sky-500/5 space-y-3 shadow-sm">
                  <div className="flex items-center justify-between border-b border-sky-500/30 pb-2">
                    <span className="font-extrabold text-sm text-sky-600 dark:text-sky-300">Tier 4: Grab-Bag Runbook (Physical)</span>
                    <FileText className="h-5 w-5 text-sky-500" />
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    If power grid blackouts persist and mobile device batteries run flat (Day 4+), emergency wardens utilize the quarterly pre-printed, 2-page waterproof physical contingency dossier stored in village emergency lockboxes.
                  </p>
                  <div className="text-[11px] font-mono text-sky-600 dark:text-sky-300 bg-sky-500/10 p-2 rounded-lg">
                    • 100% Non-Digital Hardcopy<br/>
                    • Generator Keys &amp; PMR446 Channels
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB 2: AUDITOR DEFENSE Q&A SCRIPT */}
        <TabsContent value="defense" className="space-y-6">
          <Card className="border shadow-md">
            <CardHeader className="border-b bg-muted/20 pb-4">
              <CardTitle className="text-lg font-black flex items-center gap-2">
                <HelpCircle className="h-5 w-5 text-emerald-500" />
                Auditor Q&amp;A Defense Script
              </CardTitle>
              <CardDescription className="text-xs">
                Exact compliant responses for town council emergency planning officers, risk assessors, and ISO compliance auditors.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              <div className="space-y-4">
                <div className="p-4 rounded-xl border bg-muted/20 space-y-2">
                  <p className="text-xs font-black text-foreground">
                    ❓ Auditor: "What happens to residents when cell networks go down?"
                  </p>
                  <p className="text-xs text-muted-foreground leading-relaxed border-l-2 border-emerald-500 pl-3">
                    <strong>Compliant Answer:</strong> "The application utilizes client-side Service Workers and IndexedDB local caching. Any resident who has previously accessed their local plan retains complete read access to maps, warden contacts, and checklists even in airplane mode."
                  </p>
                </div>

                <div className="p-4 rounded-xl border bg-muted/20 space-y-2">
                  <p className="text-xs font-black text-foreground">
                    ❓ Auditor: "How do you prevent data loss if coordinators enter reports while offline?"
                  </p>
                  <p className="text-xs text-muted-foreground leading-relaxed border-l-2 border-emerald-500 pl-3">
                    <strong>Compliant Answer:</strong> "The application queues user submissions into an encrypted offline outbox within browser storage. Once any cellular or Wi-Fi handshake is detected, records sync automatically via Point-in-Time logs."
                  </p>
                </div>

                <div className="p-4 rounded-xl border bg-muted/20 space-y-2">
                  <p className="text-xs font-black text-foreground">
                    ❓ Auditor: "What if local power is out for 5 days and devices lose battery?"
                  </p>
                  <p className="text-xs text-muted-foreground leading-relaxed border-l-2 border-emerald-500 pl-3">
                    <strong>Compliant Answer:</strong> "In accordance with ISO 22301 manual fallback guidelines, our platform features an automated quarterly grab-bag export. Community wardens hold physical, printed dossiers in emergency lockboxes containing all critical procedures, radio protocols, and asset access keys."
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB 3: PUBLIC TERMS & LIMITATION OF SERVICE */}
        <TabsContent value="terms" className="space-y-6">
          <Card className="border shadow-md">
            <CardHeader className="border-b bg-muted/20 pb-4">
              <CardTitle className="text-lg font-black flex items-center gap-2">
                <Scale className="h-5 w-5 text-amber-500" />
                Statutory Limitation of Service &amp; Legal Disclaimers
              </CardTitle>
              <CardDescription className="text-xs">
                Legal boundaries protecting the platform and municipal coordinators while establishing clear emergency roles.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-6 space-y-4 text-xs text-muted-foreground leading-relaxed">
              <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-950/20 border border-amber-400/40 text-amber-950 dark:text-amber-100 space-y-1.5 mb-2">
                <p className="font-extrabold text-sm flex items-center gap-1.5">
                  <AlertTriangle className="h-4 w-4 text-amber-600" /> Core Legal Protection
                </p>
                <p>
                  These clauses are embedded across all emergency portals to ensure users understand that Community Hub facilitates mutual aid and is not a statutory 999/911 dispatch service.
                </p>
              </div>

              <div className="space-y-3">
                <div className="p-4 rounded-xl border bg-card space-y-1.5">
                  <h4 className="font-extrabold text-foreground text-xs">1. Intended Role &amp; Blue-Light Separation</h4>
                  <p>
                    The Community Hub platform is a decentralized community resilience and coordination aid. It is designed to support local planning and mutual aid. It is <strong>not</strong> a replacement for statutory blue-light emergency services (e.g., 999, 911, or 112). In any immediate life-safety emergency, always contact national emergency services first.
                  </p>
                </div>

                <div className="p-4 rounded-xl border bg-card space-y-1.5">
                  <h4 className="font-extrabold text-foreground text-xs">2. Telecommunications Dependence &amp; Offline Cache</h4>
                  <p>
                    While this platform incorporates offline caching (IndexedDB and Progressive Web App technology) and multi-region infrastructure to maximize availability during infrastructure disruptions, network delivery is dependent on public cellular networks and internet service providers.
                  </p>
                </div>

                <div className="p-4 rounded-xl border bg-card space-y-1.5">
                  <h4 className="font-extrabold text-foreground text-xs">3. Grab-Bag Protocol Recommendation</h4>
                  <p>
                    In accordance with community emergency management best practices, community coordinators and administrators are strongly advised to generate, print, and securely store physical copies of their localized Emergency Action Dossier on a quarterly basis to ensure operational readiness during complete electrical or telecommunications outages.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB 4: GDPR & PRIVACY SPECIFICATIONS */}
        <TabsContent value="gdpr" className="space-y-6">
          <Card className="border shadow-md">
            <CardHeader className="border-b bg-muted/20 pb-4">
              <CardTitle className="text-lg font-black flex items-center gap-2">
                <Lock className="h-5 w-5 text-purple-500" />
                Data Protection &amp; UK GDPR Adherence
              </CardTitle>
              <CardDescription className="text-xs">
                Civil protection privacy standards, data isolation, and cryptographic audit records.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-6 space-y-4 text-xs text-muted-foreground leading-relaxed">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 rounded-xl border bg-card space-y-2">
                  <h4 className="font-extrabold text-foreground text-xs">Zero Tracking Cookies</h4>
                  <p>
                    Community Hub operates strictly with zero advertising trackers, zero third-party behavioral telemetry, and zero cross-site analytics cookies.
                  </p>
                </div>

                <div className="p-4 rounded-xl border bg-card space-y-2">
                  <h4 className="font-extrabold text-foreground text-xs">Role-Based Access Control</h4>
                  <p>
                    Sensitive vulnerability lists, keyholder telephone numbers, and private property access codes are protected behind verified community leader credentials.
                  </p>
                </div>

                <div className="p-4 rounded-xl border bg-card space-y-2">
                  <h4 className="font-extrabold text-foreground text-xs">Immutable Audit Logs</h4>
                  <p>
                    Every threat level change, situation bulletin, and plan certification is recorded into an append-only audit trail with actor name, role, and UTC timestamps.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
