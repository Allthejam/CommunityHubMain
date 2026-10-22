'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import {
  WifiOff,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  Users,
  Store,
  ShieldAlert,
  Truck,
  Heart,
  ChevronRight,
  Layers,
  PhoneCall,
  Calendar,
  Compass,
  Crown
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { OFFLINE_SHOWCASE_PERSONAS, OFFLINE_CIVIC_PILLARS } from '@/lib/offline-showcase-data';
import { useOnlineStatus } from '@/hooks/use-online-status';

export default function OfflinePage() {
  const isOnline = useOnlineStatus();
  const [selectedPersona, setSelectedPersona] = useState(OFFLINE_SHOWCASE_PERSONAS[0]);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 selection:bg-primary selection:text-white">
      {/* Top Banner */}
      <div className="bg-amber-500/10 border-b border-amber-500/20 px-4 py-3">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 text-xs sm:text-sm">
          <div className="flex items-center gap-2.5">
            <span className="p-1.5 rounded-full bg-amber-500/20 text-amber-300">
              <WifiOff className="h-4 w-4 animate-pulse" />
            </span>
            <span className="text-amber-200">
              <strong className="text-amber-100 font-semibold">Offline Showcase Mode Active.</strong>{' '}
              {isOnline
                ? 'Your device has internet connectivity, but you are viewing the offline presentation deck.'
                : 'No network connection detected. All features and media on this screen are running 100% locally from your device cache.'}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <Link href="/showcase">
              <Button size="sm" variant="ghost" className="h-7 text-xs text-amber-200 hover:text-white hover:bg-amber-500/20">
                <span>Interactive Showcase</span>
                <ChevronRight className="h-3 w-3 ml-1" />
              </Button>
            </Link>
            <Link href="/home">
              <Button size="sm" className="h-7 text-xs bg-amber-500 hover:bg-amber-600 text-slate-950 font-semibold">
                Return to Live App
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Hero Section */}
      <section className="relative overflow-hidden py-16 px-4 sm:px-6 lg:px-8 border-b border-slate-800">
        <div className="max-w-6xl mx-auto text-center space-y-6">
          <Badge className="bg-amber-500/15 text-amber-300 border-amber-500/30 px-3 py-1 text-xs tracking-wider uppercase">
            Emergency & Offline Civic Readiness
          </Badge>
          <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-white max-w-4xl mx-auto leading-tight">
            The Hyperlocal Community Platform Designed to Work{' '}
            <span className="bg-gradient-to-r from-amber-400 to-orange-400 bg-clip-text text-transparent">
              Everywhere, Even Offline
            </span>
          </h1>
          <p className="text-base sm:text-lg text-slate-400 max-w-2xl mx-auto leading-relaxed">
            Community Hub is architected for zero-signal rural emergencies and public demonstrations. Explore civic personas, emergency plans, high street commerce, and town council value propositions with zero internet lag.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <Link href="/showcase/leader-value">
              <Button size="lg" className="bg-primary hover:bg-primary/90 text-white font-medium flex items-center gap-2">
                <Crown className="h-4 w-4" />
                <span>Council Financial Value Model</span>
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
            <Link href="/demo">
              <Button size="lg" variant="outline" className="border-slate-700 hover:bg-slate-900 text-slate-200 flex items-center gap-2">
                <Compass className="h-4 w-4" />
                <span>Interactive Persona Sandbox</span>
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Interactive Persona Showcase Deck */}
      <section className="py-12 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="text-center space-y-2 mb-8">
          <h2 className="text-2xl sm:text-3xl font-bold text-white">Interactive Stakeholder Personas</h2>
          <p className="text-sm text-slate-400">Select any role below to review how Community Hub transforms town operations.</p>
        </div>

        {/* Persona Selectors */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
          {OFFLINE_SHOWCASE_PERSONAS.map((persona) => {
            const isSelected = selectedPersona.id === persona.id;
            return (
              <button
                key={persona.id}
                onClick={() => setSelectedPersona(persona)}
                className={`p-4 rounded-xl border text-left transition-all duration-200 ${
                  isSelected
                    ? 'border-amber-500 bg-amber-500/10 shadow-lg shadow-amber-500/5'
                    : 'border-slate-800 bg-slate-900/60 hover:border-slate-700 hover:bg-slate-900'
                }`}
              >
                <div className="flex items-center gap-3 mb-2">
                  <div className="relative h-10 w-10 rounded-full overflow-hidden border border-slate-700 shrink-0">
                    <Image src={persona.avatar} alt={persona.name} fill className="object-cover" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-white truncate">{persona.name}</h3>
                    <Badge variant="outline" className="text-[10px] py-0 h-4 border-slate-700 text-slate-300">
                      {persona.badge}
                    </Badge>
                  </div>
                </div>
                <p className="text-xs text-slate-400 line-clamp-1">{persona.role}</p>
              </button>
            );
          })}
        </div>

        {/* Active Persona Deep-Dive Card */}
        <Card className="bg-slate-900/90 border-slate-800 text-slate-200 overflow-hidden">
          <CardHeader className="border-b border-slate-800/80 bg-slate-900/50 pb-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="relative h-16 w-16 rounded-full overflow-hidden border-2 border-amber-500/40 shrink-0">
                  <Image src={selectedPersona.avatar} alt={selectedPersona.name} fill className="object-cover" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <CardTitle className="text-xl sm:text-2xl text-white">{selectedPersona.name}</CardTitle>
                    <Badge className="bg-amber-500/20 text-amber-300 border-amber-500/30 text-xs">
                      {selectedPersona.badge}
                    </Badge>
                  </div>
                  <CardDescription className="text-sm text-slate-400 mt-0.5">
                    {selectedPersona.role}
                  </CardDescription>
                </div>
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-3 gap-3 bg-slate-950/60 p-3 rounded-lg border border-slate-800">
                {selectedPersona.stats.map((s, idx) => (
                  <div key={idx} className="text-center px-2">
                    <div className="text-base sm:text-lg font-bold text-amber-400">{s.value}</div>
                    <div className="text-[10px] text-slate-400 uppercase tracking-wider">{s.label}</div>
                  </div>
                ))}
              </div>
            </div>
          </CardHeader>

          <CardContent className="pt-6 space-y-6">
            <p className="text-sm sm:text-base text-slate-300 leading-relaxed">
              {selectedPersona.description}
            </p>

            <div className="space-y-3">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400">Core Platform Superpowers:</h4>
              <div className="grid sm:grid-cols-3 gap-3">
                {selectedPersona.highlights.map((h, i) => (
                  <div key={i} className="flex items-start gap-2.5 p-3 rounded-lg bg-slate-950/40 border border-slate-800/60 text-xs text-slate-300">
                    <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
                    <span>{h}</span>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </section>

      {/* 4 Core Pillars of Community Hub */}
      <section className="py-12 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto border-t border-slate-900">
        <div className="text-center space-y-2 mb-10">
          <Badge variant="outline" className="text-xs border-slate-800 text-slate-400">
            Offline Media Showcase
          </Badge>
          <h2 className="text-2xl sm:text-3xl font-bold text-white">The Four Civic Pillars</h2>
          <p className="text-sm text-slate-400 max-w-2xl mx-auto">
            Cached high-resolution photography and verified operational blueprints accessible without waiting on cellular signal.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {OFFLINE_CIVIC_PILLARS.map((pillar, index) => (
            <Card key={index} className="bg-slate-900/60 border-slate-800 overflow-hidden flex flex-col justify-between">
              <div className="relative h-48 w-full bg-slate-950">
                <Image
                  src={pillar.image}
                  alt={pillar.title}
                  fill
                  className="object-cover brightness-90 hover:brightness-100 transition-all duration-300"
                />
                <Badge className="absolute top-3 left-3 bg-slate-950/80 backdrop-blur-md text-slate-200 border-slate-700 text-xs">
                  {pillar.tag}
                </Badge>
              </div>
              <CardHeader>
                <CardTitle className="text-lg text-white">{pillar.title}</CardTitle>
                <CardDescription className="text-xs text-slate-400 leading-relaxed">
                  {pillar.desc}
                </CardDescription>
              </CardHeader>
            </Card>
          ))}
        </div>
      </section>

      {/* Offline Emergency Readiness SOP Card */}
      <section className="py-12 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="p-6 rounded-2xl bg-gradient-to-br from-red-950/40 to-slate-900 border border-red-900/40 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="flex items-center gap-2">
              <ShieldAlert className="h-5 w-5 text-red-400" />
              <h3 className="text-lg font-bold text-white">Zero-Connectivity Crisis Resilience</h3>
            </div>
            <p className="text-xs sm:text-sm text-slate-300">
              When severe weather strikes and regional power networks fail, local parish residents can still view emergency muster points, safe warming shelters, flood sandbag depots, and community contact logs directly from their device.
            </p>
          </div>
          <Link href="/showcase/leader-value">
            <Button className="bg-red-600 hover:bg-red-700 text-white text-xs font-semibold shrink-0">
              Review ISO 22301 Playbooks
            </Button>
          </Link>
        </div>
      </section>
    </div>
  );
}
