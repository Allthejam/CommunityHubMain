
"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function BusinessTermsPage() {
    return (
        <div className="space-y-8 max-w-4xl mx-auto">
             <div>
                <Button asChild variant="ghost" className="mb-4">
                    <Link href="/business/dashboard">
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Back to Dashboard
                    </Link>
                </Button>
                <h1 className="text-3xl font-bold tracking-tight font-headline">
                    Business Terms & Conditions
                </h1>
                <p className="text-muted-foreground mt-2">
                   Legal terms related to your business account.
                </p>
            </div>
            <Card>
                <CardHeader>
                    <CardTitle>Under Construction</CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-muted-foreground">This page is currently under construction. The full business terms and conditions will be available here soon.</p>
                </CardContent>
            </Card>
        </div>
    );
}
