
'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { LayoutDashboard } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function ReporterDashboardPage() {
    return (
        <div className="space-y-8">
            <div>
                <h1 className="text-3xl font-bold tracking-tight font-headline flex items-center gap-2">
                    <LayoutDashboard className="h-8 w-8" />
                    Reporter Dashboard
                </h1>
                <p className="text-muted-foreground">
                    Welcome! Manage your news stories and view community information.
                </p>
            </div>
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                <Card>
                    <CardHeader>
                        <CardTitle>News Management</CardTitle>
                        <CardDescription>Create, edit, and view your submitted news articles.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <p className="text-muted-foreground">You can manage all your news stories from the 'News Management' page.</p>
                    </CardContent>
                    <CardFooter>
                        <Button asChild>
                            <Link href="/leader/news">Go to News Management</Link>
                        </Button>
                    </CardFooter>
                </Card>
            </div>
        </div>
    );
}
