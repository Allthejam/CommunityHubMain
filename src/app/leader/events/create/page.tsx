
"use client";

import * as React from "react";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { CreateEventForm } from "@/components/create-event-form";

export default function CreateEventPage() {
  return (
    <div className="space-y-8">
       <div>
        <Button asChild variant="ghost" className="mb-4">
            <Link href="/leader/events">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to My Events
            </Link>
        </Button>
        <h1 className="text-3xl font-bold tracking-tight font-headline">
          Create New Event
        </h1>
        <p className="text-muted-foreground">
          Set up a new event for your business.
        </p>
      </div>
        <Card className="w-full">
            <CardHeader>
                <CardTitle>New Event Details</CardTitle>
                <CardDescription>Fill out the form below to create a new event. It will be submitted for review.</CardDescription>
            </CardHeader>
            <CardContent>
                <CreateEventForm />
            </CardContent>
        </Card>
    </div>
  );
}
