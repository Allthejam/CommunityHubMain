'use client';

import * as React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../ui/card";
import { Badge } from "../ui/badge";
import { Loader2, Activity, Users, Eye } from "lucide-react";
import { useFirestore } from "@/firebase";
import { collection, query, where, onSnapshot } from "firebase/firestore";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';

// Realistic diurnal activity distribution for Demo Sandbox
const DEMO_HOURLY_CURVE = [
  { hour: 0, online: 6, visitors: 2 },
  { hour: 1, online: 4, visitors: 1 },
  { hour: 2, online: 3, visitors: 1 },
  { hour: 3, online: 2, visitors: 1 },
  { hour: 4, online: 4, visitors: 2 },
  { hour: 5, online: 8, visitors: 4 },
  { hour: 6, online: 16, visitors: 9 },
  { hour: 7, online: 28, visitors: 18 },
  { hour: 8, online: 42, visitors: 26 },
  { hour: 9, online: 51, visitors: 35 },
  { hour: 10, online: 58, visitors: 44 },
  { hour: 11, online: 62, visitors: 52 },
  { hour: 12, online: 68, visitors: 61 },
  { hour: 13, online: 64, visitors: 56 },
  { hour: 14, online: 59, visitors: 49 },
  { hour: 15, online: 63, visitors: 46 },
  { hour: 16, online: 71, visitors: 48 },
  { hour: 17, online: 79, visitors: 42 },
  { hour: 18, online: 84, visitors: 39 },
  { hour: 19, online: 78, visitors: 34 },
  { hour: 20, online: 67, visitors: 28 },
  { hour: 21, online: 52, visitors: 19 },
  { hour: 22, online: 34, visitors: 12 },
  { hour: 23, online: 18, visitors: 6 },
];

export function ActivityChart({ communityId }: { communityId: string | null }) {
    const db = useFirestore();

    const isDemo = typeof window !== 'undefined' && window.location.pathname.startsWith('/demo');

    const [onlineUsers, setOnlineUsers] = React.useState<any[]>([]);
    const [loadingOnline, setLoadingOnline] = React.useState(!isDemo);
    
    // Purge leftover demo flags on live routes
    React.useEffect(() => {
        if (!isDemo && typeof window !== 'undefined') {
            sessionStorage.removeItem('isDemoMode');
        }
    }, [isDemo]);
    
    // Get all online users in real-time
    React.useEffect(() => {
        if (isDemo) {
            setLoadingOnline(false);
        }
        if (!db) return;
        const q = query(collection(db, 'users'), where('isOnline', '==', true));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const users = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setOnlineUsers(users);
            setLoadingOnline(false);
        }, () => {
            setLoadingOnline(false);
        });
        return () => unsubscribe();
    }, [db, isDemo]);

    const { onlineMembersCount, visitorsCount } = React.useMemo(() => {
        const currentHour = new Date().getHours();
        const demoBase = DEMO_HOURLY_CURVE[currentHour] || { online: 48, visitors: 26 };

        if (!communityId || onlineUsers.length === 0) {
            if (isDemo) {
                return { onlineMembersCount: demoBase.online, visitorsCount: demoBase.visitors };
            }
            return { onlineMembersCount: 0, visitorsCount: 0 };
        }

        let members = 0;
        let visitors = 0;

        onlineUsers.forEach(user => {
            if (user.communityId === communityId) {
                if (user.homeCommunityId === communityId) {
                    members++;
                } else {
                    visitors++;
                }
            }
        });

        if (isDemo) {
            return {
                onlineMembersCount: members > 0 ? members + demoBase.online : demoBase.online,
                visitorsCount: visitors > 0 ? visitors + demoBase.visitors : demoBase.visitors,
            };
        }

        return { onlineMembersCount: members, visitorsCount: visitors };
    }, [onlineUsers, communityId, isDemo]);

    const chartData = React.useMemo(() => {
        const data = [];
        const currentHour = new Date().getHours();

        for (let hour = 0; hour < 24; hour++) {
            const ampm = hour >= 12 ? 'PM' : 'AM';
            let displayHour = hour % 12;
            displayHour = displayHour ? displayHour : 12;
            
            const isCurrentHour = hour === currentHour;
            
            if (isDemo) {
                const base = DEMO_HOURLY_CURVE[hour];
                data.push({
                    time: `${displayHour} ${ampm}`,
                    Online: isCurrentHour ? onlineMembersCount : base.online,
                    Visitors: isCurrentHour ? visitorsCount : base.visitors,
                });
            } else {
                data.push({
                    time: `${displayHour} ${ampm}`,
                    Online: isCurrentHour ? onlineMembersCount : 0,
                    Visitors: isCurrentHour ? visitorsCount : 0,
                });
            }
        }
        return data;
    }, [onlineMembersCount, visitorsCount, isDemo]);

    return (
        <Card className="md:col-span-2 lg:col-span-3 border-t-4 border-t-blue-600 shadow-sm hover:shadow-md transition-shadow bg-gradient-to-br from-card via-card to-blue-50/10 dark:to-blue-950/10">
            <CardHeader className="pb-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                        <div className="p-2 rounded-xl bg-blue-100 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800 shadow-xs">
                            <Activity className="h-5 w-5" />
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <CardTitle className="text-base font-bold">Community Activity & Presence</CardTitle>
                                {isDemo && (
                                    <Badge className="bg-sky-500/20 text-sky-400 border-sky-500/30 text-[10px] font-mono">
                                        Demo Simulation
                                    </Badge>
                                )}
                            </div>
                            <CardDescription className="text-xs">Live visitor traffic and resident engagement</CardDescription>
                        </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                        <Badge variant="outline" className="bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800 text-xs font-semibold gap-1.5 py-1 px-2.5">
                            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                            <Users className="h-3 w-3" /> {onlineMembersCount} Members Live
                        </Badge>
                        <Badge variant="outline" className="bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300 border-blue-200 dark:border-blue-800 text-xs font-semibold gap-1.5 py-1 px-2.5">
                            <Eye className="h-3 w-3" /> {visitorsCount} Visitors
                        </Badge>
                    </div>
                </div>
            </CardHeader>
            <CardContent>
                {loadingOnline ? (
                    <div className="flex justify-center items-center h-56">
                        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
                    </div>
                ) : (
                    <div className="h-56">
                         <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={chartData} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.6} />
                                <XAxis dataKey="time" stroke="hsl(var(--muted-foreground))" fontSize={10} interval={2} />
                                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} allowDecimals={false} />
                                <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))', borderRadius: '0.75rem', fontSize: '12px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
                                <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
                                <Line type="monotone" dataKey="Online" stroke="#10b981" strokeWidth={3} dot={{ r: 4, fill: '#10b981' }} name="Local Members" />
                                <Line type="monotone" dataKey="Visitors" stroke="#3b82f6" strokeWidth={3} dot={{ r: 4, fill: '#3b82f6' }} name="Visitors" />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
