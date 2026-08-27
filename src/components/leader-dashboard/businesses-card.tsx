'use client';

import * as React from 'react';
import { Building2, Store, Loader2, ChevronRight, Sparkles } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "../ui/card";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import Link from "next/link";
import { useUser, useFirestore, useCollection, useMemoFirebase, useDoc } from "@/firebase";
import { collection, query, where, doc } from "firebase/firestore";

export function BusinessesCard() {
    const { user } = useUser();
    const db = useFirestore();

    const userProfileRef = useMemoFirebase(() => (user ? doc(db, 'users', user.uid) : null), [user, db]);
    const { data: userProfile, isLoading: profileLoading } = useDoc(userProfileRef);
    const communityId = userProfile?.communityId;

    const businessesQuery = useMemoFirebase(() => {
        if (!communityId || !db) return null;
        return query(collection(db, 'businesses'), where('primaryCommunityId', '==', communityId));
    }, [communityId, db]);

    const { data: businesses, isLoading: businessesLoading } = useCollection(businessesQuery);

    const loading = profileLoading || businessesLoading;

    const liveCount = React.useMemo(() => {
        if (!businesses) return 0;
        return businesses.filter(b => b.status === 'Approved' || b.status === 'Subscribed').length;
    }, [businesses]);

    const pendingCount = React.useMemo(() => {
        if (!businesses) return 0;
        return businesses.filter(b => b.status === 'Pending Approval').length;
    }, [businesses]);

    return (
        <Card className="border-t-4 border-t-amber-500 shadow-sm hover:shadow-md transition-shadow bg-gradient-to-br from-card via-card to-amber-50/20 dark:to-amber-950/10">
            <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                        <div className="p-2 rounded-xl bg-amber-100 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-800 shadow-xs">
                            <Store className="h-5 w-5" />
                        </div>
                        <div>
                            <CardTitle className="text-base font-bold">Local Businesses</CardTitle>
                            <CardDescription className="text-xs">High street shops & directory</CardDescription>
                        </div>
                    </div>
                    {pendingCount > 0 ? (
                        <Badge variant="outline" className="bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border-amber-300 dark:border-amber-700 text-[10px] font-semibold animate-pulse">
                            {pendingCount} Pending
                        </Badge>
                    ) : (
                        <Badge variant="outline" className="bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 border-amber-200 dark:border-amber-800 text-[10px] font-semibold">
                            40% Rev Share
                        </Badge>
                    )}
                </div>
            </CardHeader>
            <CardContent className="space-y-3 pb-3">
                {loading ? (
                    <div className="flex justify-center items-center h-20">
                        <Loader2 className="h-7 w-7 animate-spin text-amber-600" />
                    </div>
                ) : (
                    <div className="grid grid-cols-2 gap-3">
                        <div className="p-3 rounded-xl bg-amber-50/60 dark:bg-amber-950/30 border border-amber-100 dark:border-amber-900/40 text-center">
                            <p className="text-2xl font-black text-amber-800 dark:text-amber-200 tracking-tight">{liveCount}</p>
                            <p className="text-xs font-semibold text-amber-700 dark:text-amber-300">Live Stores</p>
                        </div>
                        <div className="p-3 rounded-xl bg-muted/50 border text-center">
                            <p className="text-2xl font-black text-foreground tracking-tight">{pendingCount}</p>
                            <p className="text-xs font-medium text-muted-foreground">Pending Review</p>
                        </div>
                    </div>
                )}
            </CardContent>
            <CardFooter className="pt-0">
                <Button asChild size="sm" variant="outline" className="w-full text-xs font-semibold border-amber-200 dark:border-amber-800 hover:bg-amber-50 dark:hover:bg-amber-950/40 text-amber-800 dark:text-amber-200 justify-between">
                    <Link href="/leader/businesses">
                        <span>Directory & Subscriptions</span>
                        <ChevronRight className="h-3.5 w-3.5" />
                    </Link>
                </Button>
            </CardFooter>
        </Card>
    );
}
