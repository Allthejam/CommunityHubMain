'use client';

import * as React from 'react';
import { AlertCircle, ShieldAlert, Loader2, ChevronRight, CheckCircle2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "../ui/card";
import { useUser, useFirestore, useCollection, useMemoFirebase, useDoc } from "@/firebase";
import { collection, query, where, doc } from "firebase/firestore";
import { Button } from '../ui/button';
import { Badge } from "../ui/badge";
import Link from 'next/link';

type Report = {
  id: string;
  subject: string;
  reporterName: string;
};

export function ReportsCard() {
    const { user } = useUser();
    const db = useFirestore();

    const userProfileRef = useMemoFirebase(() => (user ? doc(db, 'users', user.uid) : null), [user, db]);
    const { data: userProfile, isLoading: profileLoading } = useDoc(userProfileRef);
    const isDemo = typeof window !== 'undefined' && (sessionStorage.getItem('isDemoMode') === 'true' || window.location.pathname.startsWith('/demo'));
    const demoPrefix = isDemo ? '/demo' : '';
    const communityId = isDemo ? '9ayHMyZf4SRw2gof1AM9' : ((typeof window !== 'undefined' ? sessionStorage.getItem('visitedCommunityId') : null) || userProfile?.communityId || 'N3SarfGXPLxBI7XcsinX');

    const reportsQuery = useMemoFirebase(() => {
        if (!communityId || !db) return null;
        return query(
            collection(db, 'community_reports'),
            where('communityId', '==', communityId),
            where('status', '==', 'New')
        );
    }, [communityId, db]);

    const { data: newReports, isLoading: reportsLoading } = useCollection<Report>(reportsQuery);

    const loading = profileLoading || reportsLoading;
    const reportCount = newReports?.length || 0;

    return (
        <Card className="border-t-4 border-t-rose-500 shadow-sm hover:shadow-md transition-shadow bg-gradient-to-br from-card via-card to-rose-50/20 dark:to-rose-950/10">
            <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                        <div className="p-2 rounded-xl bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-800 shadow-xs">
                            <AlertCircle className="h-5 w-5" />
                        </div>
                        <div>
                            <CardTitle className="text-base font-bold">Safety & Reports</CardTitle>
                            <CardDescription className="text-xs">Community moderation issues</CardDescription>
                        </div>
                    </div>
                    {reportCount > 0 ? (
                        <Badge variant="destructive" className="text-[10px] font-semibold animate-pulse">
                            {reportCount} Urgent
                        </Badge>
                    ) : (
                        <Badge variant="outline" className="bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800 text-[10px] font-semibold gap-1">
                            <CheckCircle2 className="h-3 w-3" /> All Clear
                        </Badge>
                    )}
                </div>
            </CardHeader>
            <CardContent className="space-y-3 pb-3">
                {loading ? (
                    <div className="flex justify-center items-center h-20">
                        <Loader2 className="h-7 w-7 animate-spin text-rose-600" />
                    </div>
                ) : (
                    <div className="space-y-2">
                        {newReports && newReports.length > 0 ? (
                            newReports.slice(0, 2).map(report => (
                                <div key={report.id} className="p-2.5 rounded-lg bg-rose-50/50 dark:bg-rose-950/30 border border-rose-100 dark:border-rose-900/40 flex justify-between items-center gap-2">
                                    <div className="min-w-0 flex-1">
                                        <p className="font-semibold text-xs text-foreground truncate">{report.subject}</p>
                                        <p className="text-[10px] text-muted-foreground">Reported by {report.reporterName || 'Resident'}</p>
                                    </div>
                                    <Button asChild variant="secondary" size="sm" className="h-7 px-2.5 text-xs font-semibold bg-rose-100 dark:bg-rose-900/50 text-rose-800 dark:text-rose-200 hover:bg-rose-200">
                                        <Link href={`${demoPrefix}/leader/reports`}>Review</Link>
                                    </Button>
                                </div>
                            ))
                        ) : (
                            <div className="p-3 rounded-xl bg-muted/40 border text-center text-xs text-muted-foreground">
                                No unresolved community reports.
                            </div>
                        )}
                    </div>
                )}
            </CardContent>
            <CardFooter className="pt-0">
                <Button asChild size="sm" variant="outline" className="w-full text-xs font-semibold border-rose-200 dark:border-rose-800 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-rose-700 dark:text-rose-300 justify-between">
                    <Link href={`${demoPrefix}/leader/reports`}>
                        <span>Moderation Center</span>
                        <ChevronRight className="h-3.5 w-3.5" />
                    </Link>
                </Button>
            </CardFooter>
        </Card>
    );
}
