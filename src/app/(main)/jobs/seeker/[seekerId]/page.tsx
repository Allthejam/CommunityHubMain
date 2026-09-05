
"use client";

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { doc } from 'firebase/firestore';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Briefcase, Mail, Phone, ExternalLink, Linkedin, Calendar, Loader2 } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import Link from "next/link";
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { format } from 'date-fns';
import { useUser, useFirestore, useDoc, useMemoFirebase } from '@/firebase';

import { getJobSeekerAction, deleteJobSeekerProfileAction } from '@/lib/actions/jobActions';

type SeekerData = {
    id: string;
    name: string;
    summary: string;
    profile: string;
    availableFrom?: any;
    linkedin?: string;
    portfolio?: string;
    email?: string;
    phone?: string;
    ownerId: string;
    avatar?: string;
};

export default function SeekerProfilePage() {
    const params = useParams();
    const router = useRouter();
    const { seekerId } = params;
    const { user } = useUser();
    const db = useFirestore();

    const isDemo = typeof window !== 'undefined' && (
        window.location.pathname.startsWith('/demo') ||
        sessionStorage.getItem('visitedCommunityId') === '9ayHMyZf4SRw2gof1AM9' ||
        sessionStorage.getItem('visitedCommunityId') === 'c_showhome' ||
        sessionStorage.getItem('isDemoMode') === 'true'
    );
    const demoPrefix = isDemo ? '/demo' : '';

    const seekerRef = useMemoFirebase(() => {
        if (isDemo || !seekerId || !db) return null;
        return doc(db, 'jobSeekers', seekerId as string);
    }, [seekerId, db, isDemo]);

    const { data: firestoreSeeker, isLoading: firestoreLoading } = useDoc<SeekerData>(seekerRef);
    const [demoSeeker, setDemoSeeker] = useState<SeekerData | null>(null);
    const [isDemoLoading, setIsDemoLoading] = useState(false);

    useEffect(() => {
        if (seekerId) {
            const cid = typeof window !== 'undefined' ? sessionStorage.getItem('visitedCommunityId') || '9ayHMyZf4SRw2gof1AM9' : '9ayHMyZf4SRw2gof1AM9';
            const localKey = `demo_job_seekers_${cid}`;
            const localSeekers = typeof window !== 'undefined' ? JSON.parse(sessionStorage.getItem(localKey) || '[]') : [];
            const found = localSeekers.find((s: any) => s.id === seekerId);
            if (found) {
                setDemoSeeker(found);
            } else {
                setIsDemoLoading(true);
                getJobSeekerAction(seekerId as string, cid).then(res => {
                    if (res.success && res.data) {
                        setDemoSeeker(res.data);
                    }
                }).finally(() => setIsDemoLoading(false));
            }
        }
    }, [seekerId]);

    const seeker = isDemo ? (demoSeeker || firestoreSeeker) : (firestoreSeeker || demoSeeker);
    const loading = isDemo ? (isDemoLoading && !seeker) : (firestoreLoading && !seeker);

    const isOwner = user?.uid === seeker?.ownerId || (isDemo && seeker?.ownerId === 'demo-personal');
    
    if (loading) {
        return (
            <div className="flex justify-center items-center h-96">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        )
    }
    
    if (!seeker) {
         return (
            <div className="text-center">
                <h1 className="text-2xl font-bold">Job Seeker Not Found</h1>
                <p className="text-muted-foreground">The profile you are looking for does not exist or has been removed.</p>
                <Button asChild variant="link" className="mt-4">
                    <Link href={`${demoPrefix}/jobs`}>
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Back to Job Board
                    </Link>
                </Button>
            </div>
        )
    }

    const formattedAvailableFrom = () => {
        if (!seeker.availableFrom) return null;
        try {
            if (seeker.availableFrom?.toDate) {
                return format(seeker.availableFrom.toDate(), 'PPP');
            }
            if (typeof seeker.availableFrom === 'string') {
                return format(new Date(seeker.availableFrom), 'PPP');
            }
            if (seeker.availableFrom instanceof Date) {
                return format(seeker.availableFrom, 'PPP');
            }
        } catch (e) {}
        return null;
    };

    return (
        <div className="max-w-4xl mx-auto py-8 px-4">
             <Button asChild variant="ghost" className="mb-4">
                <Link href={`${demoPrefix}/jobs`}>
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Back to Job Board
                </Link>
            </Button>
            <Card>
                <CardHeader>
                    <div className="flex flex-col sm:flex-row items-start gap-4">
                        <Avatar className="h-24 w-24">
                           <AvatarImage src={seeker.avatar} alt={seeker.name} />
                           <AvatarFallback>{seeker.name.charAt(0)}</AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                             <CardTitle className="text-3xl font-bold font-headline flex items-center gap-2">
                                {seeker.name}
                            </CardTitle>
                            <CardDescription className="text-lg mt-2">
                               {seeker.summary}
                            </CardDescription>
                             {formattedAvailableFrom() && (
                                <div className="text-sm text-muted-foreground mt-2 flex items-center gap-2">
                                    <Calendar className="h-4 w-4" />
                                    Available from {formattedAvailableFrom()}
                                </div>
                            )}
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    <Separator className="my-6" />
                    <div className="prose dark:prose-invert max-w-none">
                        <h2 className="text-xl font-semibold">Profile & Experience</h2>
                        <div className="text-foreground/90 leading-relaxed" dangerouslySetInnerHTML={{ __html: seeker.profile || "<p>No detailed profile provided.</p>" }} />
                        
                        <h3 className="text-lg font-semibold mt-8">Contact & Links</h3>
                        <div className="flex flex-col gap-2 not-prose">
                            {seeker.email && (
                                <div className="flex items-center gap-3">
                                    <Mail className="h-4 w-4 text-muted-foreground" />
                                    <a href={`mailto:${seeker.email}`} className="text-primary hover:underline">{seeker.email}</a>
                                </div>
                            )}
                            {seeker.phone && (
                                <div className="flex items-center gap-3">
                                    <Phone className="h-4 w-4 text-muted-foreground" />
                                    <a href={`tel:${seeker.phone}`} className="text-primary hover:underline">{seeker.phone}</a>
                                </div>
                            )}
                            {seeker.linkedin && (
                                <div className="flex items-center gap-3">
                                    <Linkedin className="h-4 w-4 text-muted-foreground" />
                                    <a href={seeker.linkedin} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">LinkedIn Profile</a>
                                </div>
                            )}
                             {seeker.portfolio && (
                                <div className="flex items-center gap-3">
                                    <ExternalLink className="h-4 w-4 text-muted-foreground" />
                                    <a href={seeker.portfolio} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">Portfolio / Website</a>
                                </div>
                            )}
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}
