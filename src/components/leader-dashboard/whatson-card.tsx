'use client';

import * as React from 'react';
import { Tv, Loader2, ChevronRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "../ui/card";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import Link from "next/link";
import { useUser, useFirestore, useCollection, useMemoFirebase, useDoc } from "@/firebase";
import { collection, query, where, doc } from "firebase/firestore";

export function WhatsonCard() {
    const { user } = useUser();
    const db = useFirestore();

    const userProfileRef = useMemoFirebase(() => (user ? doc(db, 'users', user.uid) : null), [user, db]);
    const { data: userProfile, isLoading: profileLoading } = useDoc(userProfileRef);
    const isDemo = typeof window !== 'undefined' && (sessionStorage.getItem('isDemoMode') === 'true' || window.location.pathname.startsWith('/demo'));
    const demoPrefix = isDemo ? '/demo' : '';
    const communityId = isDemo ? '9ayHMyZf4SRw2gof1AM9' : ((typeof window !== 'undefined' ? sessionStorage.getItem('visitedCommunityId') : null) || userProfile?.communityId || 'N3SarfGXPLxBI7XcsinX');

    const whatsonQuery = useMemoFirebase(() => {
        if (!communityId || !db) return null;
        return query(
            collection(db, 'whatson'), 
            where('communityId', '==', communityId)
        );
    }, [communityId, db]);

    const { data: dbItems, isLoading: itemsLoading } = useCollection<any>(whatsonQuery);

    const [demoItems, setDemoItems] = React.useState<any[]>([]);

    React.useEffect(() => {
        if (isDemo && typeof window !== 'undefined') {
            try {
                const stored = JSON.parse(
                    sessionStorage.getItem(`demo_whatson_${communityId}`) || 
                    localStorage.getItem(`demo_whatson_${communityId}`) || '[]'
                );
                setDemoItems(stored);
            } catch (e) {
                setDemoItems([]);
            }
        }
    }, [isDemo, communityId]);

    const allItems = React.useMemo(() => {
        const firestoreList = dbItems || [];
        if (!isDemo) return firestoreList;
        const combined = [...demoItems, ...firestoreList.filter(d => !demoItems.some(l => l.id === d.id))];
        return combined;
    }, [dbItems, demoItems, isDemo]);

    const loading = profileLoading || itemsLoading;

    const activeCount = React.useMemo(() => {
        return allItems.filter(item => item.status === 'Active' || !item.status).length;
    }, [allItems]);

    const closedCount = React.useMemo(() => {
        return allItems.filter(item => item.status === 'Temporarily Closed').length;
    }, [allItems]);

    return (
        <Card className="border-t-4 border-t-teal-500 shadow-sm hover:shadow-md transition-shadow bg-gradient-to-br from-card via-card to-teal-50/20 dark:to-teal-950/10">
            <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                        <div className="p-2 rounded-xl bg-teal-100 dark:bg-teal-950/60 text-teal-600 dark:text-teal-400 border border-teal-200 dark:border-teal-800 shadow-xs">
                            <Tv className="h-5 w-5" />
                        </div>
                        <div>
                            <CardTitle className="text-base font-bold">What&apos;s On</CardTitle>
                            <CardDescription className="text-xs">Venues, attractions & activities</CardDescription>
                        </div>
                    </div>
                    {closedCount > 0 ? (
                        <Badge variant="outline" className="bg-amber-50 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border-amber-300 dark:border-amber-700 text-[10px] font-semibold">
                            {closedCount} Temp Closed
                        </Badge>
                    ) : (
                        <Badge variant="outline" className="bg-teal-50 text-teal-700 dark:bg-teal-950/40 dark:text-teal-300 border-teal-200 dark:border-teal-800 text-[10px] font-semibold">
                            {activeCount} Active Listings
                        </Badge>
                    )}
                </div>
            </CardHeader>
            <CardContent className="space-y-3 pb-3">
                {loading ? (
                    <div className="flex justify-center items-center h-20">
                        <Loader2 className="h-7 w-7 animate-spin text-teal-600" />
                    </div>
                ) : (
                    <div className="grid grid-cols-2 gap-3">
                        <div className="p-3 rounded-xl bg-teal-50/60 dark:bg-teal-950/30 border border-teal-100 dark:border-teal-900/40 text-center">
                            <p className="text-2xl font-black text-teal-800 dark:text-teal-200 tracking-tight">{activeCount}</p>
                            <p className="text-xs font-semibold text-teal-600 dark:text-teal-400">Active Listings</p>
                        </div>
                        <div className="p-3 rounded-xl bg-muted/50 border text-center">
                            <p className="text-2xl font-black text-foreground tracking-tight">{closedCount}</p>
                            <p className="text-xs font-medium text-muted-foreground">Temp Closed</p>
                        </div>
                    </div>
                )}
            </CardContent>
            <CardFooter className="pt-0">
                <Button asChild size="sm" variant="outline" className="w-full text-xs font-semibold border-teal-200 dark:border-teal-800 hover:bg-teal-50 dark:hover:bg-teal-950/40 text-teal-700 dark:text-teal-300 justify-between">
                    <Link href={`${demoPrefix}/leader/whatson`}>
                        <span>Manage What&apos;s On</span>
                        <ChevronRight className="h-3.5 w-3.5" />
                    </Link>
                </Button>
            </CardFooter>
        </Card>
    );
}
