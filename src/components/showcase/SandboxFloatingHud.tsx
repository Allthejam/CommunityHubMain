'use client';

import React from 'react';
import Link from 'next/link';
import {
  Users,
  Store,
  ShieldAlert,
  Megaphone,
  Trees,
  RotateCcw,
  Sparkles,
  ArrowRight,
  ExternalLink,
  Info,
  CheckCircle2,
  SlidersHorizontal,
  ChevronDown
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import {
  ShowcasePersonaKey,
  SHOWCASE_PERSONAS
} from '@/components/showcase/ShowcaseTabContent';

interface SandboxFloatingHudProps {
  activePersona: ShowcasePersonaKey;
  onSelectPersona: (persona: ShowcasePersonaKey) => void;
  onResetData: () => void;
  onOpenWizard: () => void;
}

export function SandboxFloatingHud({
  activePersona,
  onSelectPersona,
  onResetData,
  onOpenWizard
}: SandboxFloatingHudProps) {
  const current = SHOWCASE_PERSONAS[activePersona];
  const Icon = current.icon;

  return (
    <div className="sticky top-0 z-50 backdrop-blur-md bg-slate-950/90 border-b border-sky-500/30 shadow-2xl px-4 py-2.5">
      <div className="container max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-3">
        {/* Left Side: Sandbox Status Badge & Persona Selector */}
        <div className="flex items-center gap-3 w-full md:w-auto justify-between md:justify-start">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
            </span>
            <Badge className="bg-sky-500/20 text-sky-300 border-sky-500/40 text-[10px] font-mono uppercase font-bold tracking-wider">
              ⚡ In-Browser Sandbox Mode
            </Badge>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="text-[11px] text-slate-400 font-bold hidden sm:inline">Active Persona:</span>
            <Select
              value={activePersona}
              onValueChange={(val) => onSelectPersona(val as ShowcasePersonaKey)}
            >
              <SelectTrigger className="h-8 text-xs font-bold bg-slate-900 border-slate-700 text-white w-48 sm:w-56 shadow-sm">
                <SelectValue placeholder="Select Persona" />
              </SelectTrigger>
              <SelectContent className="bg-slate-950 border-slate-800 text-white text-xs">
                <SelectItem value="personal">
                  <span className="flex items-center gap-2">
                    <Users className="h-3.5 w-3.5 text-sky-400" /> 👤 Personal (Resident)
                  </span>
                </SelectItem>
                <SelectItem value="business">
                  <span className="flex items-center gap-2">
                    <Store className="h-3.5 w-3.5 text-amber-400" /> 🏪 Business / Enterprise
                  </span>
                </SelectItem>
                <SelectItem value="leader">
                  <span className="flex items-center gap-2">
                    <ShieldAlert className="h-3.5 w-3.5 text-emerald-400" /> 🛡️ Community Leader
                  </span>
                </SelectItem>
                <SelectItem value="advertiser">
                  <span className="flex items-center gap-2">
                    <Megaphone className="h-3.5 w-3.5 text-purple-400" /> 📢 National Advertiser
                  </span>
                </SelectItem>
                <SelectItem value="regional">
                  <span className="flex items-center gap-2">
                    <Trees className="h-3.5 w-3.5 text-teal-400" /> 🌲 Regional Authority
                  </span>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Right Side: Quick Actions & Live Exit CTA */}
        <div className="flex items-center gap-2 w-full md:w-auto justify-end flex-wrap">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onOpenWizard}
            className="h-8 text-[11px] font-bold bg-slate-900 border-slate-700 text-slate-300 hover:text-white gap-1.5"
          >
            <Sparkles className="h-3.5 w-3.5 text-sky-400" /> Demo Town Setup
          </Button>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onResetData}
            className="h-8 text-[11px] font-bold bg-slate-900 border-slate-700 text-slate-300 hover:text-white gap-1.5"
            title="Reset sandbox test state back to baseline"
          >
            <RotateCcw className="h-3.5 w-3.5 text-amber-400" /> Reset Demo
          </Button>

          <Link href="/showcase">
            <Button
              variant="outline"
              size="sm"
              className="h-8 text-[11px] font-bold bg-slate-900 border-slate-700 text-slate-300 hover:text-white gap-1"
            >
              Exit Sandbox
            </Button>
          </Link>

          <Link href="/signup/account-type">
            <Button
              size="sm"
              className="h-8 text-[11px] font-black bg-emerald-600 hover:bg-emerald-500 text-white px-3.5 gap-1.5 shadow-md shadow-emerald-950/60"
            >
              <CheckCircle2 className="h-3.5 w-3.5" /> Claim Real Town
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
