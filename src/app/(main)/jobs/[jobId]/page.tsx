
"use client";

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { doc } from 'firebase/firestore';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Briefcase, Mail, Phone, ExternalLink, Globe, Pencil, Trash2, Loader2, Building2, Banknote, Linkedin } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import Link from "next/link";
import { useUser, useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import Image from 'next/image';
import { Badge } from '@/components/ui/badge';

type JobData = {
    id: string;
    title: string;
    company: string;
    companyLogo?: string | null;
    businessId?: string;
    jobType: string;
    salary?: string;
    fullDescription: string;
    website: string;
    applicationEmail: string;
    applicationPhone: string;
    indeedApplyUrl: string;
    linkedinApplyUrl?: string;
    ownerId: string;
};


export default function JobListingPage() {
    const params = useParams();
    const router = useRouter();
    const { jobId } = params;
    const { user } = useUser();
    const db = useFirestore();

    const jobRef = useMemoFirebase(() => {
        if (!jobId || !db) return null;
        return doc(db, 'jobs', jobId as string);
    }, [jobId, db]);

    const { data: job, isLoading: loading } = useDoc<JobData>(jobRef);
    
    const isOwner = user?.uid === job?.ownerId;
    
    if (loading) {
        return (
            <div className="flex justify-center items-center h-96">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        )
    }
    
    if (!job) {
         return (
            <div className="text-center">
                <h1 className="text-2xl font-bold">Job Not Found</h1>
                <p className="text-muted-foreground">The job listing you are looking for does not exist or has been removed.</p>
                <Button asChild variant="link" className="mt-4">
                    <Link href="/jobs">
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Back to Job Board
                    </Link>
                </Button>
            </div>
        )
    }

    return (
        <div className="max-w-4xl mx-auto py-8 px-4">
             <Button asChild variant="ghost" className="mb-4">
                <Link href="/jobs">
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Back to Job Board
                </Link>
            </Button>
            <Card>
                <CardHeader>
                    <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
                        <div className="flex-1 space-y-4">
                             <CardTitle className="text-3xl font-bold font-headline flex items-center gap-3">
                                {job.companyLogo && (
                                    <div className="relative h-16 w-16 flex-shrink-0">
                                        <Image src={job.companyLogo} alt={job.company} fill className="rounded-md object-contain border bg-muted" />
                                    </div>
                                )}
                                {job.title}
                            </CardTitle>
                            <CardDescription className="text-lg flex flex-wrap items-center gap-x-4 gap-y-2">
                               <span className="flex items-center gap-2">
                                    <Building2 className="h-5 w-5 text-primary" />
                                    {job.businessId ? (
                                        <Link href={`/businesses/${job.businessId}`} className="text-primary hover:underline font-semibold">
                                                {job.company}
                                        </Link>
                                    ) : (
                                        <span className="font-semibold">{job.company}</span>
                                    )}
                               </span>
                               <Badge variant="secondary" className="capitalize">{job.jobType?.replace('-', ' ')}</Badge>
                               {job.salary && (
                                   <span className="flex items-center gap-2 text-foreground font-medium">
                                       <Banknote className="h-5 w-5 text-green-600" />
                                       {job.salary}
                                   </span>
                               )}
                            </CardDescription>
                        </div>
                         <div className="flex flex-col gap-2 w-full sm:w-auto">
                            {isOwner && (
                                <div className="flex gap-2 mb-2">
                                    <Button variant="outline" className="flex-1" size="sm"><Pencil className="mr-2 h-4 w-4" /> Edit</Button>
                                    <Button variant="destructive" className="flex-1" size="sm"><Trash2 className="mr-2 h-4 w-4" /> Remove</Button>
                                </div>
                            )}
                             {job.linkedinApplyUrl && (
                                <Button asChild className="w-full bg-[#0a66c2] hover:bg-[#004182]">
                                    <a href={job.linkedinApplyUrl} target="_blank" rel="noopener noreferrer">
                                        <Linkedin className="mr-2 h-4 w-4" />
                                        Apply on LinkedIn
                                    </a>
                                </Button>
                            )}
                             {job.indeedApplyUrl && (
                                <Button asChild className="w-full">
                                    <a href={job.indeedApplyUrl} target="_blank" rel="noopener noreferrer">
                                        <svg className="mr-2 h-4 w-4" width="24" height="24" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg"><path d="M15.84 6.204a2.23 2.23 0 0 0-3.15.019l-.03.03v-3.03h-2.1v9.6h2.1v-4.71c0-1.29.98-2.34 2.24-2.34a2.27 2.27 0 0 1 2.26 2.25v4.8h2.1v-4.93c0-2.4-1.92-4.62-4.42-4.62zM3.48 3.424c-1.08 0-1.92.84-1.92 1.92s.84 1.92 1.92 1.92c1.14 0 1.92-.84 1.92-1.92s-.78-1.92-1.92-1.92zm1.08 16.536h-2.1V9.244h2.1v10.716z"/></svg>
                                        Apply on Indeed
                                    </a>
                                </Button>
                            )}
                            {job.applicationEmail && (
                                <Button asChild className="w-full" variant="outline">
                                    <a href={`mailto:${job.applicationEmail}?subject=Application for ${job.title}`}>
                                        <Mail className="mr-2 h-4 w-4" /> Apply via Email
                                    </a>
                                </Button>
                            )}
                            {job.applicationPhone && (
                                <Button asChild variant="ghost" className="w-full">
                                    <a href={`tel:${job.applicationPhone}`}>
                                        <Phone className="mr-2 h-4 w-4" /> Call to Apply
                                    </a>
                                </Button>
                            )}
                         </div>
                    </div>
                </CardHeader>
                <CardContent>
                    <Separator className="my-6" />
                    <div className="prose dark:prose-invert max-w-none">
                        <h2 className="text-xl font-semibold mb-4">Job Description</h2>
                        <div className="text-foreground/90 leading-relaxed" dangerouslySetInnerHTML={{ __html: job.fullDescription }} />
                        
                        {(job.applicationEmail || job.applicationPhone || job.website) && (
                            <>
                                <Separator className="my-8" />
                                <h3 className="text-lg font-semibold mb-4">Employer Links</h3>
                                <div className="flex flex-col gap-3 not-prose">
                                    {job.applicationEmail && (
                                        <div className="flex items-center gap-3">
                                            <div className="p-2 bg-muted rounded-full"><Mail className="h-4 w-4 text-primary" /></div>
                                            <span className="text-sm">{job.applicationEmail}</span>
                                        </div>
                                    )}
                                    {job.applicationPhone && (
                                        <div className="flex items-center gap-3">
                                            <div className="p-2 bg-muted rounded-full"><Phone className="h-4 w-4 text-primary" /></div>
                                            <span className="text-sm">{job.applicationPhone}</span>
                                        </div>
                                    )}
                                    {job.website && (
                                        <div className="flex items-center gap-3">
                                            <div className="p-2 bg-muted rounded-full"><Globe className="h-4 w-4 text-primary" /></div>
                                            <a href={job.website} target="_blank" rel="noopener noreferrer" className="text-sm text-primary hover:underline font-medium">{job.website}</a>
                                        </div>
                                    )}
                                </div>
                            </>
                        )}
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}
