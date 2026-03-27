'use client';

import * as React from 'react';
import { BarChart, BadgeHelp } from 'lucide-react';

export default function LeaderPollsPage() {
    return (
        <div className="space-y-8">
            <div>
                <h1 className="text-3xl font-bold tracking-tight font-headline flex items-center gap-2">
                    <BarChart className="h-8 w-8" />
                    Community Polls
                </h1>
                <p className="text-muted-foreground">Create and manage polls for your community members to vote on.</p>
            </div>

            <div className="text-center py-16">
                <BadgeHelp className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-2xl font-semibold">Coming Soon!</h3>
                <p className="text-muted-foreground mt-2 max-w-md mx-auto">This feature is currently under construction. Please check back later to create and manage community polls.</p>
            </div>
        </div>
    );
}
