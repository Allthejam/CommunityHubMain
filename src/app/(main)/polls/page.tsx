
'use client';

import * as React from 'react';
import { BarChart3, BadgeHelp } from 'lucide-react';

export default function PollsPage() {
    return (
        <div className="space-y-8">
            <div>
                <h1 className="text-3xl font-bold tracking-tight font-headline flex items-center gap-2">
                    <BarChart3 className="h-8 w-8" />
                    Community Polls
                </h1>
                <p className="text-muted-foreground">Make your voice heard on local topics.</p>
            </div>

            <div className="text-center py-16">
                <BadgeHelp className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-2xl font-semibold">Coming Soon!</h3>
                <p className="text-muted-foreground mt-2 max-w-md mx-auto">The community polls feature is currently under construction. Please check back later to make your voice heard!</p>
            </div>
        </div>
    );
}
