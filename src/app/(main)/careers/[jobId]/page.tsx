
'use client';

import * as React from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';
import { Loader2, ArrowLeft, Briefcase, MapPin, Clock, Calendar, Mail, Share2, Linkedin, Facebook, Twitter } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import { Separator } from '@/components/ui/separator';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger, DialogClose } from "@/components/ui/dialog";

type Career = {
    id: string;
    title: string;
    department: string;
    description: string;
    employmentType: string;
    location: string;
    reportsTo: string;
    salary: string;
    status: 'Open' | 'Closed' | 'Filled';
    closingDate: { toDate: () => Date };
};

const ApplicationDialog = ({ applicationEmail, emailSubject, children }: { applicationEmail: string, emailSubject: string, children: React.ReactNode }) => (
    <Dialog>
        <DialogTrigger asChild>
            {children}
        </DialogTrigger>
        <DialogContent>
            <DialogHeader>
                <DialogTitle>Application Instructions</DialogTitle>
                <DialogDescription>
                    You are about to open your default email client to apply for this position.
                </DialogDescription>
            </DialogHeader>
            <div className="py-4 space-y-4">
                <p className="text-sm">Please ensure your application to <strong className="text-primary">{applicationEmail}</strong> includes the following:</p>
                <ul className="list-disc pl-5 space-y-2 text-sm text-muted-foreground">
                    <li>Your current CV.</li>
                    <li>A cover letter explaining why you are a good fit for this role.</li>
                    <li>Any relevant supporting documents, such as:
                        <ul className="list-disc pl-5 mt-1">
                            <li>Disclosure Scotland certificate (if applicable).</li>
                            <li>Proof of your right to work in the UK.</li>
                            <li>Professional references.</li>
                        </ul>
                    </li>
                </ul>
            </div>
            <DialogFooter>
                <DialogClose asChild>
                    <Button variant="outline">Go Back</Button>
                </DialogClose>
                <Button asChild>
                    <a href={`mailto:${applicationEmail}?subject=${encodeURIComponent(emailSubject)}`}>
                        Continue to Apply
                    </a>
                </Button>
            </DialogFooter>
        </DialogContent>
    </Dialog>
);


export default function CareerDetailPage() {
    const params = useParams();
    const jobId = params.jobId as string;
    const db = useFirestore();
    const router = useRouter();
    const { toast } = useToast();

    const jobRef = useMemoFirebase(() => (jobId ? doc(db, 'careers', jobId) : null), [jobId, db]);
    const { data: job, isLoading } = useDoc<Career>(jobRef);

    const handleShare = (platform: 'linkedin' | 'twitter' | 'facebook') => {
        const url = window.location.href;
        const text = `Check out this job opening at Community Hub: ${job?.title}`;
        let shareUrl = '';

        switch(platform) {
            case 'linkedin':
                shareUrl = `https://www.linkedin.com/shareArticle?mini=true&url=${encodeURIComponent(url)}&title=${encodeURIComponent(text)}`;
                break;
            case 'twitter':
                shareUrl = `https://twitter.com/intent/tweet?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`;
                break;
            case 'facebook':
                shareUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`;
                break;
        }
        window.open(shareUrl, '_blank', 'noopener,noreferrer');
    }

    if (isLoading) {
        return (
            <div className="flex justify-center items-center h-96">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        );
    }

    if (!job) {
        return (
            <div className="text-center py-12">
                <h1 className="text-2xl font-bold">Job Not Found</h1>
                <p className="text-muted-foreground">This job listing could not be found or has been removed.</p>
                <Button asChild variant="link" className="mt-4">
                    <Link href="/careers"><ArrowLeft className="mr-2 h-4 w-4" />Back to Careers</Link>
                </Button>
            </div>
        );
    }

    const applicationEmail = 'careers@communityhub.example.com';
    const emailSubject = `Application for ${job.title} Position`;

    return (
        <div className="max-w-4xl mx-auto py-8">
            <Button variant="ghost" className="mb-4" onClick={() => router.back()}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Listings
            </Button>
            <Card>
                <CardHeader>
                    <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
                        <div className="flex-1">
                            <Badge variant="secondary" className="mb-2">{job.department}</Badge>
                            <CardTitle className="text-3xl font-bold font-headline">{job.title}</CardTitle>
                            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-muted-foreground mt-2">
                                <span className="flex items-center gap-1.5"><Briefcase className="h-4 w-4" /> {job.employmentType}</span>
                                <span className="flex items-center gap-1.5"><MapPin className="h-4 w-4" /> {job.location}</span>
                                {job.closingDate && <span className="flex items-center gap-1.5"><Clock className="h-4 w-4" /> Closes: {format(job.closingDate.toDate(), "PPP")}</span>}
                            </div>
                        </div>
                         <ApplicationDialog applicationEmail={applicationEmail} emailSubject={emailSubject}>
                            <Button size="lg">
                                <Mail className="mr-2 h-4 w-4" /> Apply Now
                            </Button>
                        </ApplicationDialog>
                    </div>
                </CardHeader>
                <CardContent>
                    <Separator className="my-6" />
                    <div className="prose dark:prose-invert max-w-none" dangerouslySetInnerHTML={{ __html: job.description }}/>
                </CardContent>
                <CardFooter className="flex-wrap gap-4">
                     <ApplicationDialog applicationEmail={applicationEmail} emailSubject={emailSubject}>
                        <Button>
                            <Mail className="mr-2 h-4 w-4" /> Apply Now
                        </Button>
                    </ApplicationDialog>
                     <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold">Share:</span>
                         <Button variant="outline" size="icon" onClick={() => handleShare('linkedin')}><Linkedin className="h-4 w-4" /></Button>
                         <Button variant="outline" size="icon" onClick={() => handleShare('twitter')}><Twitter className="h-4 w-4" /></Button>
                         <Button variant="outline" size="icon" onClick={() => handleShare('facebook')}><Facebook className="h-4 w-4" /></Button>
                     </div>
                </CardFooter>
            </Card>
        </div>
    );
}
