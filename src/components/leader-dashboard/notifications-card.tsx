'use client';

import * as React from 'react';
import { Bell, Loader2, ChevronRight, Inbox, CheckCheck } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "../ui/card";
import { useUser, useFirestore, useCollection, useMemoFirebase } from "@/firebase";
import { collection, query, where } from "firebase/firestore";
import { Button } from '../ui/button';
import { Badge } from "../ui/badge";
import Link from 'next/link';
import { type Notification } from "@/lib/types/notifications";

export function NotificationsCard() {
    const { user, isUserLoading } = useUser();
    const db = useFirestore();

    const notificationsQuery = useMemoFirebase(() => {
        if (!user || !db) return null;
        return query(
            collection(db, 'notifications'), 
            where('recipientId', '==', user.uid)
        );
    }, [user, db]);

    const { data: rawNotifications, isLoading: notificationsLoading } = useCollection<Notification>(notificationsQuery);

    const newNotifications = React.useMemo(() => {
        if (!rawNotifications) return [];
        return rawNotifications.filter(n => {
            const targetApp = (n as any).targetApp;
            if (targetApp === 'admin') return false;
            const typeStr = (n as any).type || '';
            const subjectStr = (n.subject || '').toLowerCase();
            if (typeStr === 'Task Assignment' || typeStr === 'Development Task') return false;
            if (subjectStr.includes('development task')) return false;

            const statusLower = ((n as any).status || 'new').toLowerCase();
            return statusLower === 'new' || statusLower === 'unread';
        });
    }, [rawNotifications]);

    const loading = isUserLoading || notificationsLoading;
    const unreadCount = newNotifications.length;

    return (
        <Card className="border-t-4 border-t-indigo-500 shadow-sm hover:shadow-md transition-shadow bg-gradient-to-br from-card via-card to-indigo-50/20 dark:to-indigo-950/10">
            <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                        <div className="p-2 rounded-xl bg-indigo-100 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800 shadow-xs">
                            <Bell className="h-5 w-5" />
                        </div>
                        <div>
                            <CardTitle className="text-base font-bold">Notifications</CardTitle>
                            <CardDescription className="text-xs">Direct inbox & alerts</CardDescription>
                        </div>
                    </div>
                    {unreadCount > 0 ? (
                        <Badge variant="outline" className="bg-indigo-100 text-indigo-800 dark:bg-indigo-950/60 dark:text-indigo-300 border-indigo-300 dark:border-indigo-700 text-[10px] font-semibold animate-pulse">
                            {unreadCount} Unread
                        </Badge>
                    ) : (
                        <Badge variant="outline" className="bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-200 dark:border-slate-700 text-[10px] font-semibold gap-1">
                            <CheckCheck className="h-3 w-3" /> Caught Up
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
                    <div className="space-y-2">
                        {newNotifications && newNotifications.length > 0 ? (
                            newNotifications.slice(0, 2).map(n => (
                                <div key={n.id} className="p-2.5 rounded-lg bg-indigo-50/50 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/40 flex justify-between items-center gap-2">
                                    <div className="min-w-0 flex-1">
                                        <p className="font-semibold text-xs text-foreground truncate">{n.from || 'System'}</p>
                                        <p className="text-[10px] text-muted-foreground truncate">{n.subject}</p>
                                    </div>
                                    <Button asChild variant="secondary" size="sm" className="h-7 px-2.5 text-xs font-semibold bg-indigo-100 dark:bg-indigo-900/50 text-indigo-800 dark:text-indigo-200 hover:bg-indigo-200">
                                        <Link href="/leader/notifications">View</Link>
                                    </Button>
                                </div>
                            ))
                        ) : (
                            <div className="p-3 rounded-xl bg-muted/40 border text-center text-xs text-muted-foreground">
                                No unread notifications.
                            </div>
                        )}
                    </div>
                )}
            </CardContent>
            <CardFooter className="pt-0">
                <Button asChild size="sm" variant="outline" className="w-full text-xs font-semibold border-indigo-200 dark:border-indigo-800 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 justify-between">
                    <Link href="/leader/notifications">
                        <span>Open Notification Inbox</span>
                        <ChevronRight className="h-3.5 w-3.5" />
                    </Link>
                </Button>
            </CardFooter>
        </Card>
    );
}
