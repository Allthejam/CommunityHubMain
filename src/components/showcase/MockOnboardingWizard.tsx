'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import {
  MapPin,
  Sparkles,
  Building2,
  CheckCircle2,
  ArrowRight,
  ShieldCheck,
  Store,
  Calendar,
  Radio,
  Trees,
  Search
} from 'lucide-react';

interface MockOnboardingWizardProps {
  isOpen: boolean;
  onClose: () => void;
}

export function MockOnboardingWizard({ isOpen, onClose }: MockOnboardingWizardProps) {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [townName, setTownName] = useState('Oakridge');
  const [postcode, setPostcode] = useState('DE1 4MO');
  const [region, setRegion] = useState('DemoVille / Regional District');

  // Selected modules in demo
  const [modules, setModules] = useState({
    resilience: true,
    highstreet: true,
    events: true,
    regional: true,
    marketplace: true,
  });

  const handleNext = () => {
    if (step === 1) setStep(2);
    else if (step === 2) setStep(3);
  };

  const handleReset = () => {
    setStep(1);
    setTownName('Oakridge');
    setPostcode('DE1 4MO');
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => (!open ? handleReset() : null)}>
      <DialogContent className="sm:max-w-xl bg-slate-950 border-slate-800 text-white shadow-2xl">
        <DialogHeader>
          <div className="flex items-center justify-between gap-2">
            <Badge className="bg-sky-500/20 text-sky-300 border-sky-500/40 text-[10px] font-mono uppercase">
              ✨ Interactive Setup Simulator
            </Badge>
            <span className="text-xs font-mono text-slate-400">Step {step} of 3</span>
          </div>
          <DialogTitle className="text-xl font-black text-white font-headline pt-1 flex items-center gap-2">
            <Building2 className="h-5 w-5 text-sky-400" />
            {step === 1 && 'Find or Create Your Community Hub'}
            {step === 2 && 'Select Your Town’s Active Features'}
            {step === 3 && '🎉 Community Hub Generated!'}
          </DialogTitle>
          <DialogDescription className="text-xs text-slate-300">
            {step === 1 && 'Test how postal code geofencing automatically matches residents to their local parish.'}
            {step === 2 && 'Choose which civic, merchant, and emergency modules will power your town.'}
            {step === 3 && 'Your customized community hub structure is ready to launch in the live app.'}
          </DialogDescription>
        </DialogHeader>

        <div className="py-4 space-y-4 text-xs">
          {/* STEP 1: TOWN LOOKUP & GEOFENCE */}
          {step === 1 && (
            <div className="space-y-4">
              <div className="p-3.5 rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
                <div className="space-y-1.5">
                  <Label className="text-slate-300 font-bold text-[11px]">Township / Parish Name</Label>
                  <div className="relative">
                    <MapPin className="h-4 w-4 absolute left-3 top-2.5 text-sky-400" />
                    <Input
                      value={townName}
                      onChange={(e) => setTownName(e.target.value)}
                      placeholder="e.g. Oakridge, Northfield, Westpark"
                      className="pl-9 bg-slate-950 border-slate-700 text-white text-xs h-9 font-semibold"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-slate-300 font-bold text-[11px]">Central Postcode</Label>
                    <Input
                      value={postcode}
                      onChange={(e) => setPostcode(e.target.value)}
                      placeholder="e.g. PH26 3HG"
                      className="bg-slate-950 border-slate-700 text-white text-xs h-9 font-mono"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-slate-300 font-bold text-[11px]">Regional Council / Authority</Label>
                    <Input
                      value={region}
                      onChange={(e) => setRegion(e.target.value)}
                      placeholder="e.g. Highlands"
                      className="bg-slate-950 border-slate-700 text-white text-xs h-9"
                    />
                  </div>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-emerald-950/30 border border-emerald-500/30 text-emerald-200 text-[11px] space-y-1">
                <p className="font-bold flex items-center gap-1.5">
                  <ShieldCheck className="h-4 w-4 text-emerald-400" /> GPS Geofence & Boundary Auto-Detected:
                </p>
                <p className="text-emerald-300/80 leading-relaxed">
                  Verified boundary matched to {townName} Community Council catchment area (approx. 2,400 households).
                </p>
              </div>
            </div>
          )}

          {/* STEP 2: MODULE SELECTION */}
          {step === 2 && (
            <div className="space-y-3">
              <p className="font-bold text-slate-300 text-xs">Configure Core Civic Modules for {townName}:</p>
              <div className="grid grid-cols-1 gap-2.5">
                {[
                  {
                    key: 'resilience',
                    title: 'Statutory Resilience & Emergency Plan',
                    desc: 'Live incident beacon, muster hubs, keyholders register, and mass transport dispatcher.',
                    icon: ShieldCheck,
                    color: 'text-emerald-400',
                  },
                  {
                    key: 'highstreet',
                    title: 'Digital High Street & Merchant Showcase',
                    desc: 'Local shopfronts, flash offers, and independent business discovery.',
                    icon: Store,
                    color: 'text-amber-400',
                  },
                  {
                    key: 'events',
                    title: 'Community Events & Village Noticeboard',
                    desc: 'Ceilidhs, farmers shows, community hall bookings, and chronological news.',
                    icon: Calendar,
                    color: 'text-sky-400',
                  },
                  {
                    key: 'regional',
                    title: 'Regional Park / Network Uplink',
                    desc: 'Multi-town coordination with regional parks and emergency services.',
                    icon: Trees,
                    color: 'text-teal-400',
                  },
                ].map((mod) => {
                  const Icon = mod.icon;
                  const isChecked = (modules as any)[mod.key];
                  return (
                    <div
                      key={mod.key}
                      onClick={() =>
                        setModules((prev) => ({ ...prev, [mod.key]: !isChecked }))
                      }
                      className={`p-3 rounded-2xl border transition-all cursor-pointer flex items-start gap-3 ${
                        isChecked
                          ? 'bg-slate-900 border-sky-500/60 shadow-sm'
                          : 'bg-slate-950 border-slate-800 opacity-60'
                      }`}
                    >
                      <Checkbox checked={isChecked} className="mt-0.5" />
                      <div className="space-y-0.5 flex-1">
                        <p className="font-bold text-white text-xs flex items-center gap-1.5">
                          <Icon className={`h-3.5 w-3.5 ${mod.color}`} /> {mod.title}
                        </p>
                        <p className="text-[11px] text-slate-400">{mod.desc}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* STEP 3: CELEBRATORY SUMMARY & LIVE CLAIM CTA */}
          {step === 3 && (
            <div className="space-y-4 text-center py-2">
              <div className="h-14 w-14 rounded-2xl bg-gradient-to-tr from-emerald-500 to-sky-400 text-slate-950 flex items-center justify-center mx-auto shadow-xl">
                <Sparkles className="h-7 w-7" />
              </div>

              <div className="space-y-1">
                <h3 className="text-lg font-black text-white font-headline">
                  {townName} Community Hub is Ready!
                </h3>
                <p className="text-xs text-slate-300 max-w-md mx-auto">
                  Your customized hub configuration has been simulated with all 4 active modules enabled.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 text-left space-y-2">
                <p className="text-[10px] font-mono uppercase text-sky-400 font-bold">Simulated Community Specs:</p>
                <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-300">
                  <div>• Town: <strong className="text-white">{townName}</strong></div>
                  <div>• Postcode: <strong className="text-white">{postcode}</strong></div>
                  <div>• Catchment: <strong className="text-white">{region}</strong></div>
                  <div>• Status: <strong className="text-emerald-400">Ready to Claim</strong></div>
                </div>
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2 sm:justify-between">
          {step < 3 ? (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={handleReset}
                className="bg-slate-900 border-slate-700 text-slate-300"
              >
                Cancel Demo
              </Button>
              <Button
                onClick={handleNext}
                size="sm"
                className="bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold text-xs gap-1.5"
              >
                Continue Setup <ArrowRight className="h-4 w-4" />
              </Button>
            </>
          ) : (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={handleReset}
                className="bg-slate-900 border-slate-700 text-slate-300 text-xs"
              >
                Close Simulator
              </Button>
              <Link href="/signup/account-type" className="w-full sm:w-auto">
                <Button
                  size="sm"
                  className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs gap-1.5 shadow-lg shadow-emerald-950/60 px-5"
                >
                  <CheckCircle2 className="h-4 w-4" /> Claim & Create This Town for Real →
                </Button>
              </Link>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
