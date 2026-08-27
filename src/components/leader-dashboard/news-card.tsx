'use client';

import * as React from 'react';
import { Newspaper, Loader2, ChevronRight, FileCheck } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "../ui/card";
import { useUser, useFirestore, useCollection, useMemoFirebase, useDoc } from "@/firebase";
import { collection, query, where, doc } from "firebase/firestore";
import { Button } from '../ui/button';
import { Badge } from "../ui/badge";
import Link from 'next/link';

type NewsStory = {
    id: string;
    title: string;
    author: string;
}

export function NewsCard() {
    const { user } = useUser();
    const db = useFirestore();

    const userProfileRef = useMemoFirebase(() => (user ? doc(db, 'users', user.uid) : null), [user, db]);
    const { data: userProfile, isLoading: profileLoading } = useDoc(userProfileRef);
    const communityId = userProfile?.communityId;

    const newsQuery = useMemoFirebase(() => {
        if (!communityId || !db) return null;
        return query(
            collection(db, 'news'), 
            where('communityId', '==', communityId),
            where('status', '==', 'Pending Approval')
        );
    }, [communityId, db]);

    const { data: pendingNews, isLoading: newsLoading } = useCollection<NewsStory>(newsQuery);

    const loading = profileLoading || newsLoading;
    const pendingCount = pendingNews?.length || 0;

    return (
        <Card className="border-t-4 border-t-purple-500 shadow-sm hover:shadow-md transition-shadow bg-gradient-to-br from-card via-card to-purple-50/20 dark:to-purple-950/10">
            <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                        <div className="p-2 rounded-xl bg-purple-100 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 border border-purple-200 dark:border-purple-800 shadow-xs">
                            <Newspaper className="h-5 w-5" />
                        </div>
                        <div>
                            <CardTitle className="text-base font-bold">News Editorial</CardTitle>
                            <CardDescription className="text-xs">Submissions & articles</CardDescription>
                        </div>
                    </div>
                    {pendingCount > 0 ? (
                        <Badge variant="outline" className="bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-300 border-purple-300 dark:border-purple-700 text-[10px] font-semibold animate-pulse">
                            {pendingCount} To Review
                        </Badge>
                    ) : (
                        <Badge variant="outline" className="bg-purple-50 text-purple-700 dark:bg-purple-950/40 dark:text-purple-300 border-purple-200 dark:border-purple-800 text-[10px] font-semibold">
                            All Caught Up
                        </Badge>
                    )}
                </div>
            </CardHeader>
            <CardContent className="space-y-3 pb-3">
                {loading ? (
                    <div className="flex justify-center items-center h-20">
                        <Loader2 className="h-7 w-7 animate-spin text-purple-600" />
                    </div>
                ) : (
                    <div className="space-y-2">
                        {pendingNews && pendingNews.length > 0 ? (
                            pendingNews.slice(0, 2).map(story => (
                                <div key={story.id} className="p-2.5 rounded-lg bg-purple-50/50 dark:bg-purple-950/30 border border-purple-100 dark:border-purple-900/40 flex justify-between items-center gap-2">
                                    <div className="min-w-0 flex-1">
                                        <p className="font-semibold text-xs text-foreground truncate">{story.title}</p>
                                        <p className="text-[10px] text-muted-foreground">by {story.author || 'Contributor'}</p>
                                    </div>
                                    <Button asChild variant="secondary" size="sm" className="h-7 px-2.5 text-xs font-semibold bg-purple-100 dark:bg-purple-900/50 text-purple-800 dark:text-purple-200 hover:bg-purple-200">
                                        <Link href="/leader/news">Review</Link>
                                    </Button>
                                </div>
                            ))
                        ) : (
                            <div className="p-3 rounded-xl bg-muted/40 border text-center text-xs text-muted-foreground">
                                No submitted stories waiting for moderation.
                            </div>
                        )}
                    </div>
                )}
            </CardContent>
            <CardFooter className="pt-0">
                <Button asChild size="sm" variant="outline" className="w-full text-xs font-semibold border-purple-200 dark:border-purple-800 hover:bg-purple-50 dark:hover:bg-purple-950/40 text-purple-700 dark:text-purple-300 justify-between">
                    <Link href="/leader/news">
                        <span>Publish & Manage Stories</span>
                        <ChevronRight className="h-3.5 w-3.5" />
                    </Link>
                </Button>
            </CardFooter>
        </Card>
    );
}
