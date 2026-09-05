'use client';

import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Sparkles, Shield, User, Briefcase, Crown, Building, Globe, Map } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import SignUpForm from '@/components/signup-form';
import { useToast } from '@/hooks/use-toast';

interface DemoSignupCardProps {
  accountType: 'personal' | 'business' | 'leader' | 'enterprise' | 'national' | 'regional';
  title: string;
  description: string;
}

const PERSONA_ROLE_MAP: Record<string, string> = {
  personal: 'personal',
  business: 'business',
  leader: 'leader',
  enterprise: 'business',
  national: 'advertiser',
  regional: 'regional',
};

export function DemoSignupCard({ accountType, title, description }: DemoSignupCardProps) {
  const router = useRouter();
  const { toast } = useToast();

  const handleTestDriveRole = () => {
    const role = PERSONA_ROLE_MAP[accountType] || 'leader';
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('sandboxPersona', role);
      sessionStorage.setItem('visitedCommunityId', '9ayHMyZf4SRw2gof1AM9');
      sessionStorage.setItem('isDemoMode', 'true');
    }
    toast({
      title: `Switched to ${role.toUpperCase()} Persona! ⚡`,
      description: 'Entering the isolated demo hub...',
    });
    if (role === 'leader') router.push('/demo/leader/dashboard');
    else if (role === 'business') router.push('/demo/business/dashboard');
    else if (role === 'advertiser') router.push('/demo/national/dashboard');
    else if (role === 'regional') router.push('/demo/regional/dashboard');
    else router.push('/demo/home');
  };

  return (
    <div className="flex min-h-[90vh] flex-col items-center justify-center bg-background p-4 sm:p-6">
      <div className="w-full max-w-xl space-y-4">
        {/* TOP DEMO INTERACTIVE BANNER */}
        <div className="bg-gradient-to-r from-emerald-950/80 via-slate-900 to-teal-950/80 border border-emerald-500/40 rounded-2xl p-4 text-white shadow-lg flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <Sparkles className="h-5 w-5 text-emerald-400 shrink-0" />
            <div>
              <p className="text-xs font-bold text-emerald-300">Interactive Registration Card • Display Only</p>
              <p className="text-[11px] text-slate-300">Explore actual form fields. Database writes are disabled in demo mode.</p>
            </div>
          </div>
          <Button
            onClick={handleTestDriveRole}
            size="sm"
            className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shrink-0 shadow-sm gap-1"
          >
            <Sparkles className="h-3.5 w-3.5" /> Test Drive This Role →
          </Button>
        </div>

        {/* ACTUAL SIGNUP CARD */}
        <Card className="border-border shadow-xl">
          <CardHeader>
            <Button variant="ghost" size="sm" className="justify-start p-0 h-auto mb-3 text-xs gap-1.5 text-muted-foreground hover:text-foreground" asChild>
              <Link href="/demo/register">
                <ArrowLeft className="h-3.5 w-3.5" /> Back to Account Selection
              </Link>
            </Button>
            <div className="flex items-center justify-between">
              <CardTitle className="text-2xl font-bold font-headline">{title}</CardTitle>
              <Badge variant="outline" className="bg-emerald-500/10 text-emerald-500 border-emerald-500/30 text-[10px] uppercase font-mono font-bold">
                Preview Mode
              </Badge>
            </div>
            <CardDescription className="text-xs">{description}</CardDescription>
          </CardHeader>
          <CardContent>
            <SignUpForm accountType={accountType} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
