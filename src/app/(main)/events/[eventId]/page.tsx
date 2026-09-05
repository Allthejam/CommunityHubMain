
"use client";

import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { doc } from "firebase/firestore";
import { useFirestore, useUser, useDoc, useMemoFirebase } from "@/firebase";
import { format } from "date-fns";
import {
    ArrowLeft,
    Loader2,
    Calendar,
    User,
    Clock,
    CalendarPlus,
    Download,
    Globe,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { addEventToUserCalendar } from "@/lib/actions/calendarActions";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { downloadIcsFile, openGoogleCalendarUrl } from "@/lib/utils/calendar-export";
import { parseEventDate } from "@/lib/utils/event-utils";


type CommunityEvent = {
    id: string;
    title: string;
    category: string;
    startDate: any;
    endDate?: any;
    repeat?: string | null;
    startTime?: string;
    description: string;
    image?: string;
    authorName?: string;
    businessName?: string;
};

export default function EventDetailPage() {
    const params = useParams();
    const router = useRouter();
    const { eventId } = params;
    const db = useFirestore();
    
    const [isAdding, setIsAdding] = React.useState(false);
    const { user } = useUser();
    const { toast } = useToast();

    const isDemo = typeof window !== 'undefined' && (sessionStorage.getItem('isDemoMode') === 'true' || window.location.pathname.startsWith('/demo'));
    const demoPrefix = isDemo ? '/demo' : '';

    const eventRef = useMemoFirebase(() => {
        if (!eventId || !db) return null;
        return doc(db, 'events', eventId as string);
    }, [eventId, db]);

    const { data: event, isLoading: loading } = useDoc<CommunityEvent>(eventRef);
    
    const startDateObj = event ? parseEventDate(event.startDate) : null;
    const endDateObj = event ? parseEventDate(event.endDate) : null;
    const isMultiDay = startDateObj && endDateObj && format(startDateObj, "yyyy-MM-dd") !== format(endDateObj, "yyyy-MM-dd");

    const formatRepeatLabel = (rep?: string | null) => {
        if (!rep || rep === 'none') return null;
        if (rep === 'yearly') return 'Repeats Yearly (Annual event)';
        if (rep === 'monthly') return 'Repeats Monthly';
        if (rep === 'weekly') return 'Repeats Weekly';
        if (rep === 'bi-weekly') return 'Repeats Every 2 Weeks';
        return `Repeats ${rep}`;
    };

    const handleAddToCalendar = async () => {
        if (!user || !event) {
            toast({ title: "Please log in", description: "You must be logged in to add events to your calendar.", variant: "destructive"});
            return;
        }
        setIsAdding(true);
        const result = await addEventToUserCalendar({
            userId: user.uid,
            event: {
                title: event.title,
                date: startDateObj ? startDateObj.toISOString() : new Date().toISOString(),
                time: event.startTime || "All Day",
                type: event.category,
            },
        });
        setIsAdding(false);
        if (result.success) {
            toast({ title: "Event Added!", description: `${event.title} has been added to your calendar.`});
        } else {
            toast({ title: "Error", description: result.error, variant: "destructive"});
        }
    };


    if (loading) {
        return (
            <div className="flex justify-center items-center h-96">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        );
    }

    if (!event) {
        return (
            <div className="text-center py-12">
                <h1 className="text-2xl font-bold">Event Not Found</h1>
                <p className="text-muted-foreground">This event could not be found.</p>
                <Button asChild variant="link" className="mt-4">
                    <Link href={`${demoPrefix}/events`}><ArrowLeft className="mr-2 h-4 w-4" />Back to Events</Link>
                </Button>
            </div>
        );
    }

    return (
         <div className="max-w-4xl mx-auto py-8">
            <Button variant="ghost" className="mb-4" onClick={() => router.back()}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back
            </Button>
            <main>
                <article>
                     {event.image && (
                         <div className="relative w-full aspect-video rounded-lg overflow-hidden mb-8 bg-muted">
                            <Image
                                src={event.image}
                                alt={event.title}
                                fill
                                className="object-cover"
                                priority
                            />
                        </div>
                    )}
                    <header className="mb-8">
                        <div className="flex items-center gap-2 mb-4 flex-wrap">
                            <Badge variant="secondary">{event.category}</Badge>
                            {event.repeat && event.repeat !== 'none' && (
                                <Badge variant="outline" className="border-primary/40 text-primary bg-primary/5">
                                    {formatRepeatLabel(event.repeat)}
                                </Badge>
                            )}
                        </div>
                        <h1 className="text-4xl md:text-5xl font-bold tracking-tight font-headline mb-4">
                            {event.title}
                        </h1>
                        <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-muted-foreground mt-4">
                             <div className="flex items-center gap-2">
                                <Calendar className="h-4 w-4 text-primary" />
                                <span className="font-medium text-foreground">
                                    {startDateObj ? format(startDateObj, "PPP") : ""}
                                    {isMultiDay && endDateObj && ` - ${format(endDateObj, "PPP")}`}
                                </span>
                            </div>
                            {event.startTime && (
                                <div className="flex items-center gap-2">
                                    <Clock className="h-4 w-4" />
                                    <span>Starts at {event.startTime}</span>
                                </div>
                            )}
                            <div className="flex items-center gap-2">
                                <User className="h-4 w-4" />
                                <span>Hosted by {event.businessName && event.businessName !== 'Community' ? event.businessName : 'Community'}</span>
                            </div>
                        </div>
                    </header>
                   
                    <div 
                        className="prose dark:prose-invert max-w-none"
                        dangerouslySetInnerHTML={{ __html: event.description }}
                    />

                    <div className="mt-8 pt-8 border-t">

                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button disabled={isAdding}>
                                    {isAdding ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CalendarPlus className="mr-2 h-4 w-4" />}
                                    Add to Calendar
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="start" className="w-64">
                                <DropdownMenuLabel>Add / Sync Options</DropdownMenuLabel>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={handleAddToCalendar}>
                                  <Calendar className="mr-2 h-4 w-4" /> Save to Profile Calendar
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => {
                                  downloadIcsFile({
                                    title: event.title,
                                    description: event.description,
                                    startDate: event.startDate,
                                    endDate: event.endDate,
                                    businessName: event.businessName,
                                  });
                                  toast({ title: "Calendar File Downloaded", description: "Import .ics into Apple Calendar, Outlook, or mobile." });
                                }}>
                                  <Download className="mr-2 h-4 w-4" /> Download .ics File (Apple / Outlook)
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => {
                                  openGoogleCalendarUrl({
                                    title: event.title,
                                    description: event.description,
                                    startDate: event.startDate,
                                    endDate: event.endDate,
                                  });
                                }}>
                                  <Globe className="mr-2 h-4 w-4" /> Open in Google Calendar
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>

                </article>
            </main>
        </div>
    )
}
