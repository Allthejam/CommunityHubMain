
"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter, useParams } from "next/navigation";
import { CreateEventForm } from "@/components/create-event-form";
import { useFirestore, useDoc, useMemoFirebase } from "@/firebase";
import { doc } from "firebase/firestore";
import { Loader2, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function EditEventPage() {
    const router = useRouter();
    const params = useParams();
    const eventId = params.eventId as string;
    const db = useFirestore();

    const eventRef = useMemoFirebase(() => (db && eventId ? doc(db, 'events', eventId) : null), [db, eventId]);
    const { data: eventData, isLoading } = useDoc(eventRef);

    if (isLoading) {
        return (
            <div className="flex justify-center items-center h-96">
                <Loader2 className="h-8 w-8 animate-spin" />
            </div>
        );
    }
    
    if (!eventData) {
        return (
            <div className="text-center py-10">
                <h2 className="text-2xl font-bold">Event not found</h2>
                <p className="text-muted-foreground">The event you are trying to edit does not exist.</p>
                <Button asChild variant="link" className="mt-4">
                    <Link href="/leader/events">
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Back to Events
                    </Link>
                </Button>
            </div>
        );
    }

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
                Edit Event
                </h1>
                <p className="text-muted-foreground">
                Update the details for your event.
                </p>
            </div>
            <CreateEventForm event={eventData} />
        </div>
    );
}
