

"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CreateEventForm } from "@/components/create-event-form";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function CreateEventPage() {
    const router = useRouter();
    
    return (
        <div className="space-y-8">
            <div>
                <Button asChild variant="ghost" className="mb-4">
                    <Link href="/business/dashboard">
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Back to Dashboard
                    </Link>
                </Button>
                <h1 className="text-3xl font-bold tracking-tight font-headline">
                Create New Event
                </h1>
                <p className="text-muted-foreground">
                Set up a new event for your business.
                </p>
            </div>
            <Card>
                <CardHeader>
                    <CardTitle>New Event Details</CardTitle>
                    <CardDescription>Fill out the form below to create a new event. It will be submitted for review.</CardDescription>
                </CardHeader>
                <CardContent>
                    <CreateEventForm onSaveSuccess={() => router.push('/business/events')} />
                </CardContent>
            </Card>
        </div>
    );
}
