
'use client';

import * as React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../ui/card";
import { Loader2, LineChart as LineChartIcon } from "lucide-react";
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

export function ActivityChart({ communityId }: { communityId: string | null }) {
    const db = useFirestore();

    const [onlineUsers, setOnlineUsers] = React.useState<any[]>([]);
    const [loadingOnline, setLoadingOnline] = React.useState(true);
    
    // Get all online users in real-time
    React.useEffect(() => {
        if (!db) return;
        const q = query(collection(db, 'users'), where('isOnline', '==', true));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const users = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setOnlineUsers(users);
            setLoadingOnline(false);
        });
        return () => unsubscribe();
    }, [db]);

    const { onlineMembersCount, visitorsCount } = React.useMemo(() => {
        if (!communityId || onlineUsers.length === 0) {
            return { onlineMembersCount: 0, visitorsCount: 0 };
        }

        let members = 0;
        let visitors = 0;

        onlineUsers.forEach(user => {
            // Count users who are currently viewing this community
            if (user.communityId === communityId) {
                // If their home is this community, they are an "online member"
                if (user.homeCommunityId === communityId) {
                    members++;
                } else {
                // Otherwise, they are a "visitor"
                    visitors++;
                }
            }
        });
        return { onlineMembersCount: members, visitorsCount: visitors };
    }, [onlineUsers, communityId]);

    const chartData = React.useMemo(() => {
        const data = [];
        const currentHour = new Date().getHours();

        for (let hour = 0; hour < 24; hour++) {
            const ampm = hour >= 12 ? 'PM' : 'AM';
            let displayHour = hour % 12;
            displayHour = displayHour ? displayHour : 12; // the hour '0' should be '12'
            
            // We only show real-time data for the current hour.
            // Historical tracking is not yet implemented in the database, so past hours are set to 0.
            const isCurrentHour = hour === currentHour;
            
            data.push({
                time: `${displayHour} ${ampm}`,
                Online: isCurrentHour ? onlineMembersCount : 0,
                Visitors: isCurrentHour ? visitorsCount : 0,
            });
        }
        return data;
    }, [onlineMembersCount, visitorsCount]);

    return (
        <Card className="md:col-span-2 lg:col-span-3">
            <CardHeader>
                <CardTitle className="flex items-center gap-2"><LineChartIcon /> Community Activity</CardTitle>
                <CardDescription>Real-time presence in your community hub.</CardDescription>
            </CardHeader>
            <CardContent>
                {loadingOnline ? (
                    <div className="flex justify-center items-center h-64">
                        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                    </div>
                ) : (
                    <div className="h-64">
                         <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={chartData} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                                <XAxis dataKey="time" stroke="hsl(var(--muted-foreground))" fontSize={10} interval={2} />
                                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} allowDecimals={false} />
                                <Tooltip
                                    contentStyle={{
                                        background: "hsl(var(--background))",
                                        border: "1px solid hsl(var(--border))",
                                        borderRadius: "var(--radius)",
                                    }}
                                />
                                <Legend wrapperStyle={{fontSize: "0.8rem"}}/>
                                <Line type="monotone" dataKey="Online" stroke="hsl(var(--chart-1))" strokeWidth={2} dot={false} />
                                <Line type="monotone" dataKey="Visitors" stroke="hsl(var(--chart-2))" strokeWidth={2} dot={false} />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
