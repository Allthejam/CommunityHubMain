'use client';

import * as React from 'react';
import { Calendar, CalendarDays, Loader2, ChevronRight, Sparkles } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "../ui/card";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import Link from "next/link";
import { useUser, useFirestore, useCollection, useMemoFirebase, useDoc } from "@/firebase";
import { collection, query, where, doc } from "firebase/firestore";

export function EventsCard() {
    const { user } = useUser();
    const db = useFirestore();

    const userProfileRef = useMemoFirebase(() => (user ? doc(db, 'users', user.uid) : null), [user, db]);
    const { data: userProfile, isLoading: profileLoading } = useDoc(userProfileRef);
    const isDemo = typeof window !== 'undefined' && (sessionStorage.getItem('isDemoMode') === 'true' || window.location.pathname.startsWith('/demo'));
    const demoPrefix = isDemo ? '/demo' : '';
    const communityId = isDemo ? '9ayHMyZf4SRw2gof1AM9' : ((typeof window !== 'undefined' ? sessionStorage.getItem('visitedCommunityId') : null) || userProfile?.communityId || 'N3SarfGXPLxBI7XcsinX');

    const eventsQuery = useMemoFirebase(() => {
        if (!communityId || !db) return null;
        return query(
            collection(db, 'events'), 
            where('communityId', '==', communityId),
            where('status', 'in', ['Live', 'Upcoming'])
        );
    }, [communityId, db]);

    const { data: events, isLoading: eventsLoading } = useCollection(eventsQuery);

    const loading = profileLoading || eventsLoading;

    const liveCount = React.useMemo(() => {
        if (!events) return 0;
        return events.filter(e => e.status === 'Live').length;
    }, [events]);

    const upcomingCount = React.useMemo(() => {
        if (!events) return 0;
        return events.filter(e => e.status === 'Upcoming').length;
    }, [events]);

    return (
        <Card className="border-t-4 border-t-indigo-500 shadow-sm hover:shadow-md transition-shadow bg-gradient-to-br from-card via-card to-indigo-50/20 dark:to-indigo-950/10">
            <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                        <div className="p-2 rounded-xl bg-indigo-100 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800 shadow-xs">
                            <CalendarDays className="h-5 w-5" />
                        </div>
                        <div>
                            <CardTitle className="text-base font-bold">Community Events</CardTitle>
                            <CardDescription className="text-xs">Live & scheduled events</CardDescription>
                        </div>
                    </div>
                    {liveCount > 0 ? (
                        <Badge variant="outline" className="bg-indigo-100 text-indigo-800 dark:bg-indigo-950/60 dark:text-indigo-300 border-indigo-300 dark:border-indigo-700 text-[10px] font-semibold">
                            <span className="h-1.5 w-1.5 rounded-full bg-indigo-500 mr-1 animate-pulse" />
                            {liveCount} Live Now
                        </Badge>
                    ) : (
                        <Badge variant="outline" className="bg-indigo-50 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800 text-[10px] font-semibold">
                            {upcomingCount} Scheduled
                        </Badge>
                    )}
                </div>
            </CardHeader>
            <CardContent className="space-y-3 pb-3">
                {loading ? (
                    <div className="flex justify-center items-center h-20">
                        <Loader2 className="h-7 w-7 animate-spin text-indigo-600" />
                    </div>
                ) : (
                    <div className="grid grid-cols-2 gap-3">
                        <div className="p-3 rounded-xl bg-indigo-50/60 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/40 text-center">
                            <p className="text-2xl font-black text-indigo-800 dark:text-indigo-200 tracking-tight">{liveCount}</p>
                            <p className="text-xs font-semibold text-indigo-600 dark:text-indigo-400">Happening Today</p>
                        </div>
                        <div className="p-3 rounded-xl bg-muted/50 border text-center">
                            <p className="text-2xl font-black text-foreground tracking-tight">{upcomingCount}</p>
                            <p className="text-xs font-medium text-muted-foreground">Upcoming</p>
                        </div>
                    </div>
                )}
            </CardContent>
            <CardFooter className="pt-0">
                <Button asChild size="sm" variant="outline" className="w-full text-xs font-semibold border-indigo-200 dark:border-indigo-800 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 justify-between">
                    <Link href={`${demoPrefix}/leader/events`}>
                        <span>Event Manager</span>
                        <ChevronRight className="h-3.5 w-3.5" />
                    </Link>
                </Button>
            </CardFooter>
        </Card>
    );
}
