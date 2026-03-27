
'use client';

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Megaphone } from "lucide-react";
import { BroadcastComposer } from "@/components/broadcast-composer";

export default function BroadcastDashboard() {
    return (
        <div className="space-y-8">
             <div>
                <h1 className="text-3xl font-bold tracking-tight font-headline flex items-center gap-2">
                    <Megaphone className="h-8 w-8" />
                    Broadcast System
                </h1>
                <p className="text-muted-foreground">
                    Create and send high-priority announcements based on your approved scope.
                </p>
            </div>
            <BroadcastComposer />
        </div>
    );
}
