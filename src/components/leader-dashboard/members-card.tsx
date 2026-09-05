'use client';

import * as React from 'react';
import { Users, UserPlus, Loader2, ChevronRight, TrendingUp } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "../ui/card";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import Link from "next/link";
import { useUser, useFirestore, useCollection, useMemoFirebase, useDoc } from "@/firebase";
import { collection, query, where, doc, Timestamp } from "firebase/firestore";
import { subDays } from "date-fns";

export function MembersCard() {
    const { user } = useUser();
    const db = useFirestore();

    const userProfileRef = useMemoFirebase(() => (user ? doc(db, 'users', user.uid) : null), [user, db]);
    const { data: userProfile, isLoading: profileLoading } = useDoc(userProfileRef);
    const isDemo = typeof window !== 'undefined' && (sessionStorage.getItem('isDemoMode') === 'true' || window.location.pathname.startsWith('/demo'));
    const demoPrefix = isDemo ? '/demo' : '';
    const communityId = isDemo ? '9ayHMyZf4SRw2gof1AM9' : ((typeof window !== 'undefined' ? sessionStorage.getItem('visitedCommunityId') : null) || userProfile?.communityId || 'N3SarfGXPLxBI7XcsinX');

    const membersQuery = useMemoFirebase(() => {
        if (!communityId || !db) return null;
        return query(collection(db, 'users'), where('memberOf', 'array-contains', communityId));
    }, [communityId, db]);

    const { data: members, isLoading: membersLoading } = useCollection(membersQuery);

    const loading = profileLoading || membersLoading;

    const actualMembers = React.useMemo(() => {
        if (!members || !communityId) return [];
        return members.filter(member => 
            member.homeCommunityId === communityId || 
            (member.communityRoles && member.communityRoles[communityId])
        );
    }, [members, communityId]);

    const newMembersCount = React.useMemo(() => {
        if (!actualMembers) return 0;
        const sevenDaysAgo = subDays(new Date(), 7);
        return actualMembers.filter(member => {
            const joinedDate = (member.joined as Timestamp)?.toDate();
            return joinedDate && joinedDate >= sevenDaysAgo;
        }).length;
    }, [actualMembers]);

    return (
        <Card className="border-t-4 border-t-emerald-500 shadow-sm hover:shadow-md transition-shadow bg-gradient-to-br from-card via-card to-emerald-50/20 dark:to-emerald-950/10">
            <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                        <div className="p-2 rounded-xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 shadow-xs">
                            <Users className="h-5 w-5" />
                        </div>
                        <div>
                            <CardTitle className="text-base font-bold">Community Members</CardTitle>
                            <CardDescription className="text-xs">Resident & member directory</CardDescription>
                        </div>
                    </div>
                    {newMembersCount > 0 && (
                        <Badge variant="outline" className="bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800 text-[10px] font-semibold gap-1">
                            <TrendingUp className="h-3 w-3" /> +{newMembersCount} new
                        </Badge>
                    )}
                </div>
            </CardHeader>
            <CardContent className="space-y-3 pb-3">
                {loading ? (
                    <div className="flex justify-center items-center h-20">
                        <Loader2 className="h-7 w-7 animate-spin text-emerald-600" />
                    </div>
                ) : (
                    <div className="grid grid-cols-2 gap-3">
                        <div className="p-3 rounded-xl bg-emerald-50/60 dark:bg-emerald-950/30 border border-emerald-100 dark:border-emerald-900/40 text-center">
                            <p className="text-2xl font-black text-emerald-800 dark:text-emerald-200 tracking-tight">{actualMembers?.length || 0}</p>
                            <p className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">Total Residents</p>
                        </div>
                        <div className="p-3 rounded-xl bg-muted/50 border text-center">
                            <p className="text-2xl font-black text-foreground tracking-tight">{newMembersCount}</p>
                            <p className="text-xs font-medium text-muted-foreground">Joined (7d)</p>
                        </div>
                    </div>
                )}
            </CardContent>
            <CardFooter className="pt-0">
                <Button asChild size="sm" variant="outline" className="w-full text-xs font-semibold border-emerald-200 dark:border-emerald-800 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 justify-between">
                    <Link href={`${demoPrefix}/leader/members`}>
                        <span>Manage Member Roster</span>
                        <ChevronRight className="h-3.5 w-3.5" />
                    </Link>
                </Button>
            </CardFooter>
        </Card>
    );
}
