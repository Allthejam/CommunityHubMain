'use client';

import React from 'react';
import {
  ShieldAlert,
  Printer,
  FileText,
  Radio,
  WifiOff,
  Cloud,
  CheckCircle2,
  AlertTriangle,
  Info,
  Layers,
  Sparkles,
  ExternalLink,
  ShieldCheck,
  Lock,
  Flame,
  Waves,
  Zap,
  PhoneCall
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { generateGrabBagHtml, GrabBagDossierData } from '@/lib/emergency-grab-bag-generator';
import { useToast } from '@/hooks/use-toast';

interface EmergencyContinuityCardProps {
  data: GrabBagDossierData;
  isLeader?: boolean;
}

export function EmergencyContinuityCard({ data, isLeader = false }: EmergencyContinuityCardProps) {
  const { toast } = useToast();

  const handlePrintGrabBag = () => {
    try {
      const printWindow = window.open('', '_blank');
      if (!printWindow) {
        toast({
          title: 'Pop-up Blocked',
          description: 'Please allow pop-ups for this site to generate the Emergency Grab-Bag Dossier.',
          variant: 'destructive',
        });
        return;
      }

      const html = generateGrabBagHtml(data);
      printWindow.document.write(html);
      printWindow.document.close();

      toast({
        title: '🖨️ Generating Grab-Bag Runbook',
        description: 'ISO 22301 physical emergency dossier is formatted for 2-page A4 print.',
      });
    } catch (e: any) {
      console.error('Error printing grab-bag dossier:', e);
      toast({
        title: 'Export Failed',
        description: e.message || 'Could not generate print runbook.',
        variant: 'destructive',
      });
    }
  };

  return (
    <Card className="border-2 border-sky-500/30 shadow-xl bg-gradient-to-br from-slate-950 via-slate-900 to-sky-950/40 overflow-hidden text-white">
      <CardHeader className="p-5 sm:p-6 pb-4 border-b border-slate-800 bg-slate-950/70">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <Badge className="bg-sky-500/20 text-sky-300 border-sky-500/50 font-mono text-[11px] uppercase tracking-wider px-2.5 py-0.5">
                ISO 22301:2019 Clause 8.4 Aligned
              </Badge>
              <Badge variant="outline" className="text-emerald-400 border-emerald-500/40 text-[11px] font-mono">
                Graceful Degradation Architecture
              </Badge>
            </div>
            <CardTitle className="text-lg sm:text-xl font-black tracking-tight text-white flex items-center gap-2 pt-1">
              <ShieldCheck className="h-5 w-5 text-sky-400" />
              Offline Resilience &amp; 1-Click "Grab-Bag" Contingency Runbook
            </CardTitle>
            <CardDescription className="text-xs text-slate-300">
              Structured multi-tier fallback protocol ensuring community life-safety data survives total cell tower collapse or power blackouts.
            </CardDescription>
          </div>

          <Button
            onClick={handlePrintGrabBag}
            size="lg"
            className="bg-gradient-to-r from-sky-500 to-emerald-500 hover:from-sky-400 hover:to-emerald-400 text-slate-950 font-black text-xs sm:text-sm h-11 px-5 gap-2 shadow-lg shadow-sky-950/60 shrink-0"
          >
            <Printer className="h-4 w-4 text-slate-950" />
            Export 1-Click Grab-Bag Dossier (PDF)
          </Button>
        </div>
      </CardHeader>

      <CardContent className="p-5 sm:p-6 space-y-6">
        {/* 4-Tier Continuity Model Grid */}
        <div className="space-y-2.5">
          <h4 className="text-xs font-black uppercase tracking-wider text-slate-300 flex items-center gap-2">
            <Layers className="h-4 w-4 text-sky-400" /> 4-Tier Civil Continuity Framework
          </h4>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-3 text-xs">
            {/* Tier 1 */}
            <div className="p-3.5 rounded-xl border border-slate-800 bg-slate-950/80 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-black text-sky-400 text-[11px] uppercase">Tier 1: Cloud Connected</span>
                <Cloud className="h-4 w-4 text-sky-400" />
              </div>
              <p className="text-slate-300 text-[11px] leading-relaxed">
                Full-speed real-time push beacons, interactive GPS evacuation mapping, and instant resident check-ins via edge infrastructure.
              </p>
              <div className="text-[10px] font-mono text-slate-400 pt-1 border-t border-slate-800">
                Latency: Sub-second sync
              </div>
            </div>

            {/* Tier 2 */}
            <div className="p-3.5 rounded-xl border border-slate-800 bg-slate-950/80 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-black text-emerald-400 text-[11px] uppercase">Tier 2: Offline Memory</span>
                <WifiOff className="h-4 w-4 text-emerald-400" />
              </div>
              <p className="text-slate-300 text-[11px] leading-relaxed">
                PWA Service Worker &amp; IndexedDB caching. Stored shelter lists, warden rosters, and emergency plans open instantly in Airplane mode.
              </p>
              <div className="text-[10px] font-mono text-slate-400 pt-1 border-t border-slate-800">
                Storage: Encrypted Local Cache
              </div>
            </div>

            {/* Tier 3 */}
            <div className="p-3.5 rounded-xl border border-slate-800 bg-slate-950/80 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-black text-amber-400 text-[11px] uppercase">Tier 3: Low-Bandwidth</span>
                <Radio className="h-4 w-4 text-amber-400" />
              </div>
              <p className="text-slate-300 text-[11px] leading-relaxed">
                2G SMS broadcast gateway triggers and local generator-powered village hall WiFi subnets when wide-area ISP lines are severed.
              </p>
              <div className="text-[10px] font-mono text-slate-400 pt-1 border-t border-slate-800">
                Channels: SMS + Local Mesh
              </div>
            </div>

            {/* Tier 4 */}
            <div className="p-3.5 rounded-xl border border-sky-500/40 bg-sky-950/30 space-y-2 ring-1 ring-sky-500/30">
              <div className="flex items-center justify-between">
                <span className="font-black text-cyan-300 text-[11px] uppercase">Tier 4: Grab-Bag SOP</span>
                <FileText className="h-4 w-4 text-cyan-300" />
              </div>
              <p className="text-slate-200 text-[11px] leading-relaxed">
                Quarterly 1-click printable 2-page physical dossier stored in village emergency lockboxes with keys, generator codes, and radio channels.
              </p>
              <div className="text-[10px] font-mono text-cyan-300 pt-1 border-t border-slate-800">
                Contingency: 100% Non-Digital
              </div>
            </div>
          </div>
        </div>

        {/* Section 4: Public Terms & Limitation of Service Notice */}
        <div className="p-4 sm:p-5 rounded-2xl bg-slate-950/90 border border-slate-800 space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-black uppercase tracking-wider text-slate-200 flex items-center gap-2">
              <Lock className="h-3.5 w-3.5 text-amber-400" /> Statutory Limitation of Service &amp; Emergency Notice
            </h4>
            <Badge variant="outline" className="text-[10px] font-mono text-slate-400 border-slate-700">
              Public Safety Disclosure
            </Badge>
          </div>

          <div className="space-y-2.5 text-xs text-slate-300 leading-relaxed">
            <p>
              <strong className="text-white">1. Intended Role:</strong> The Community Hub platform is a decentralized community resilience and coordination aid designed to support local mutual aid and civil emergency planning. It is <strong className="text-amber-300">not a replacement for statutory blue-light emergency services (e.g. 999, 911, or 112)</strong>. In any immediate life-safety emergency, always contact national emergency services first.
            </p>
            <p>
              <strong className="text-white">2. Telecommunications Dependence &amp; Offline Cache:</strong> While this platform incorporates offline caching (IndexedDB and Progressive Web App technology) to maximize availability during infrastructure disruptions, real-time sync and push delivery are dependent on public cellular networks and internet service providers.
            </p>
            <p>
              <strong className="text-white">3. Grab-Bag Protocol Recommendation:</strong> In accordance with community emergency management best practices (ISO 22301 Clause 8.4), community coordinators and administrators are strongly advised to generate, print, and securely store physical copies of their localized Emergency Action Dossier on a quarterly basis to ensure operational readiness during complete electrical or telecommunications outages.
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
