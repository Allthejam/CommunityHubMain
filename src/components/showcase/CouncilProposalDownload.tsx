'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { FileDown, Printer, FileText, CheckCircle2, Sparkles, Building2, ExternalLink } from 'lucide-react';
import { triggerCouncilProposalPdf, CouncilProposalData } from '@/lib/council-proposal-generator';

interface CouncilProposalDownloadProps {
  defaultTownName?: string;
  defaultDirectoryCount?: number;
  defaultStorefrontCount?: number;
  className?: string;
}

export function CouncilProposalDownload({
  defaultTownName = 'Oakridge & DemoVille',
  defaultDirectoryCount = 35,
  defaultStorefrontCount = 12,
  className = '',
}: CouncilProposalDownloadProps) {
  const [townName, setTownName] = useState<string>(defaultTownName);
  const [directoryCount, setDirectoryCount] = useState<number>(defaultDirectoryCount);
  const [storefrontCount, setStorefrontCount] = useState<number>(defaultStorefrontCount);

  const handleDownload = () => {
    const data: CouncilProposalData = {
      townshipName: townName.trim() || 'Your Community',
      directoryCount: Number(directoryCount) || 35,
      storefrontCount: Number(storefrontCount) || 12,
      meetingDate: new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }),
    };
    triggerCouncilProposalPdf(data);
  };

  return (
    <Card className={`border-2 border-emerald-500/30 bg-gradient-to-r from-emerald-500/10 via-emerald-500/5 to-card shadow-xl overflow-hidden ${className}`}>
      <CardHeader className="p-6 pb-4 border-b bg-background/50">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <Badge className="bg-emerald-600 text-white font-bold text-xs gap-1.5 shadow-xs">
            <FileText className="h-3.5 w-3.5" />
            1-Click Council Meeting Pack
          </Badge>
          <span className="text-xs text-slate-800 dark:text-slate-200 font-bold flex items-center gap-1">
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
            Auditor-Ready 2-Page A4 Brief
          </span>
        </div>
        <CardTitle className="text-2xl sm:text-3xl font-extrabold font-headline text-foreground mt-1">
          Download Your Council Presentation Brief (PDF)
        </CardTitle>
        <CardDescription className="text-sm text-slate-800 dark:text-slate-200 font-medium mt-1">
          Presenting to your Community Council, Parish meeting, or Business Chamber? Generate a customized 2-page briefing pack with your town name, financial forecast, and draft adoption motion ready to vote on.
        </CardDescription>
      </CardHeader>

      <CardContent className="p-6 space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="space-y-1.5 sm:col-span-1">
            <label className="text-xs font-bold text-foreground">Town / Parish Name:</label>
            <Input
              type="text"
              value={townName}
              onChange={(e) => setTownName(e.target.value)}
              placeholder="e.g. Grantown-on-Spey"
              className="text-sm bg-background font-semibold"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-foreground">Estimated Businesses:</label>
            <Input
              type="number"
              min={1}
              max={250}
              value={directoryCount}
              onChange={(e) => setDirectoryCount(Number(e.target.value))}
              className="text-sm bg-background font-semibold"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-foreground">Estimated Storefronts:</label>
            <Input
              type="number"
              min={0}
              max={100}
              value={storefrontCount}
              onChange={(e) => setStorefrontCount(Number(e.target.value))}
              className="text-sm bg-background font-semibold"
            />
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 rounded-xl bg-background border">
          <div className="space-y-0.5 text-xs text-slate-800 dark:text-slate-200 font-medium">
            <p className="font-extrabold text-foreground flex items-center gap-1.5">
              <Sparkles className="h-4 w-4 text-emerald-600" />
              What is included in the briefing pack:
            </p>
            <p className="text-slate-700 dark:text-slate-300">
              • Executive Summary • 4 Civic Pillars • Traditional vs Community Hub Table • 2-Year Financial Forecast • Official Draft Council Resolution Motion
            </p>
          </div>

          <Button
            type="button"
            size="lg"
            onClick={handleDownload}
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold shadow-md shrink-0 gap-2 h-11 px-6 w-full sm:w-auto"
          >
            <FileDown className="h-4 w-4" />
            <span>Generate & Print Pack (PDF)</span>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
