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
    const communityId = userProfile?.communityId;

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
        <Card className="border-t-4 border-t-sky-500 shadow-sm hover:shadow-md transition-shadow bg-gradient-to-br from-card via-card to-sky-50/20 dark:to-sky-950/10">
            <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                        <div className="p-2 rounded-xl bg-sky-100 dark:bg-sky-950/60 text-sky-600 dark:text-sky-400 border border-sky-200 dark:border-sky-800 shadow-xs">
                            <CalendarDays className="h-5 w-5" />
                        </div>
                        <div>
                            <CardTitle className="text-base font-bold">What&apos;s On & Events</CardTitle>
                            <CardDescription className="text-xs">Live & upcoming activities</CardDescription>
                        </div>
                    </div>
                    {liveCount > 0 ? (
                        <Badge variant="outline" className="bg-sky-100 text-sky-800 dark:bg-sky-950/60 dark:text-sky-300 border-sky-300 dark:border-sky-700 text-[10px] font-semibold">
                            <span className="h-1.5 w-1.5 rounded-full bg-sky-500 mr-1 animate-pulse" />
                            {liveCount} Live Now
                        </Badge>
                    ) : (
                        <Badge variant="outline" className="bg-sky-50 text-sky-700 dark:bg-sky-950/40 dark:text-sky-300 border-sky-200 dark:border-sky-800 text-[10px] font-semibold">
                            {upcomingCount} Scheduled
                        </Badge>
                    )}
                </div>
            </CardHeader>
            <CardContent className="space-y-3 pb-3">
                {loading ? (
                    <div className="flex justify-center items-center h-20">
                        <Loader2 className="h-7 w-7 animate-spin text-sky-600" />
                    </div>
                ) : (
                    <div className="grid grid-cols-2 gap-3">
                        <div className="p-3 rounded-xl bg-sky-50/60 dark:bg-sky-950/30 border border-sky-100 dark:border-sky-900/40 text-center">
                            <p className="text-2xl font-black text-sky-800 dark:text-sky-200 tracking-tight">{liveCount}</p>
                            <p className="text-xs font-semibold text-sky-600 dark:text-sky-400">Happening Today</p>
                        </div>
                        <div className="p-3 rounded-xl bg-muted/50 border text-center">
                            <p className="text-2xl font-black text-foreground tracking-tight">{upcomingCount}</p>
                            <p className="text-xs font-medium text-muted-foreground">Upcoming</p>
                        </div>
                    </div>
                )}
            </CardContent>
            <CardFooter className="pt-0">
                <Button asChild size="sm" variant="outline" className="w-full text-xs font-semibold border-sky-200 dark:border-sky-800 hover:bg-sky-50 dark:hover:bg-sky-950/40 text-sky-700 dark:text-sky-300 justify-between">
                    <Link href="/leader/events">
                        <span>Event Manager</span>
                        <ChevronRight className="h-3.5 w-3.5" />
                    </Link>
                </Button>
            </CardFooter>
        </Card>
    );
}
