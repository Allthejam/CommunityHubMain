'use client';

import * as React from 'react';
import { ShieldAlert, Siren, ArrowRight, ShieldCheck, FileText, CheckCircle2, ChevronRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "../ui/card";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import Link from "next/link";
import { useUser, useFirestore, useMemoFirebase, useDoc } from "@/firebase";
import { doc } from "firebase/firestore";

export function EmergencyPlanCard() {
    const { user } = useUser();
    const db = useFirestore();

    const userProfileRef = useMemoFirebase(() => (user ? doc(db, 'users', user.uid) : null), [user, db]);
    const { data: userProfile } = useDoc(userProfileRef);
    const isDemo = typeof window !== 'undefined' && (sessionStorage.getItem('isDemoMode') === 'true' || window.location.pathname.startsWith('/demo'));
    const demoPrefix = isDemo ? '/demo' : '';
    const communityId = isDemo ? '9ayHMyZf4SRw2gof1AM9' : ((typeof window !== 'undefined' ? sessionStorage.getItem('visitedCommunityId') : null) || userProfile?.communityId || 'N3SarfGXPLxBI7XcsinX');

    const communityDocRef = useMemoFirebase(() => (communityId && db ? doc(db, 'communities', communityId) : null), [communityId, db]);
    const { data: communityData } = useDoc(communityDocRef);

    const ceapStatus = communityData?.emergencyPlan?.status || 'Active & Ready';
    const lastReviewed = communityData?.emergencyPlan?.lastReviewed;

    return (
        <Card className="border-t-4 border-t-red-500 shadow-sm hover:shadow-md transition-shadow bg-gradient-to-br from-card via-card to-red-50/20 dark:to-red-950/10">
            <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                        <div className="p-2 rounded-xl bg-red-100 dark:bg-red-950/60 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800 shadow-xs">
                            <Siren className="h-5 w-5" />
                        </div>
                        <div>
                            <CardTitle className="text-base font-bold">Emergency Resilience</CardTitle>
                            <CardDescription className="text-xs">Statutory CEAP & Crisis SOPs</CardDescription>
                        </div>
                    </div>
                    <Badge variant="outline" className="bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 border-red-200 dark:border-red-800 text-[10px] font-semibold gap-1">
                        <span className="h-1.5 w-1.5 rounded-full bg-red-500 animate-pulse" />
                        {ceapStatus}
                    </Badge>
                </div>
            </CardHeader>
            <CardContent className="space-y-3 pb-3">
                <div className="p-3 rounded-xl bg-red-50/50 dark:bg-red-950/20 border border-red-100 dark:border-red-900/40 space-y-1.5 text-xs text-muted-foreground">
                    <div className="flex items-center justify-between text-foreground font-semibold">
                        <span>Jurisdiction Area:</span>
                        <span className="text-red-700 dark:text-red-300 font-bold">{communityData?.name || 'Local Community'}</span>
                    </div>
                    <div className="flex items-center justify-between">
                        <span>Multi-Hazard SOPs:</span>
                        <span className="font-medium text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                            <CheckCircle2 className="h-3.5 w-3.5" /> 5 Hazards Configured
                        </span>
                    </div>
                </div>
            </CardContent>
            <CardFooter className="pt-0 flex gap-2">
                <Button asChild size="sm" variant="outline" className="flex-1 text-xs font-semibold border-red-200 dark:border-red-800 hover:bg-red-50 dark:hover:bg-red-950/40 text-red-700 dark:text-red-300">
                    <Link href={`${demoPrefix}/leader/emergency-plan`}>
                        Plan Master <ChevronRight className="ml-1 h-3 w-3" />
                    </Link>
                </Button>
                <Button asChild size="sm" className="flex-1 text-xs font-semibold bg-red-600 hover:bg-red-700 text-white shadow-xs">
                    <Link href={`${demoPrefix}/leader/emergency-plan/sop?hazard=wildfire`}>
                        Incident SOPs <ChevronRight className="ml-1 h-3 w-3" />
                    </Link>
                </Button>
            </CardFooter>
        </Card>
    );
}
