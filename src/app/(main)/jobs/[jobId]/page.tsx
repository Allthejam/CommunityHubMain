
"use client";

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { doc } from 'firebase/firestore';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Briefcase, Mail, Phone, ExternalLink, Globe, Pencil, Trash2, Loader2, Building2 } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import Link from "next/link";
import { useUser, useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import Image from 'next/image';

type JobData = {
    id: string;
    title: string;
    company: string;
    companyLogo?: string | null;
    businessId?: string;
    fullDescription: string;
    website: string;
    applicationEmail: string;
    applicationPhone: string;
    indeedApplyUrl: string;
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
        <div className="max-w-4xl mx-auto">
             <Button asChild variant="ghost" className="mb-4">
                <Link href="/jobs">
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Back to Job Board
                </Link>
            </Button>
            <Card>
                <CardHeader>
                    <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
                        <div className="flex-1">
                             <CardTitle className="text-3xl font-bold font-headline flex items-center gap-2">
                                {job.companyLogo && <Image src={job.companyLogo} alt={job.company} width={40} height={40} className="rounded-md" />}
                                {job.title}
                            </CardTitle>
                            <CardDescription className="text-lg flex items-center gap-2 mt-2">
                               <Building2 className="h-5 w-5" />
                               <span>at </span>
                               {job.businessId ? (
                                <Link href={`/businesses/${job.businessId}`} className="text-primary hover:underline font-semibold">
                                        {job.company}
                                </Link>
                               ) : (
                                <span className="font-semibold">{job.company}</span>
                               )}
                            </CardDescription>
                        </div>
                         <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                            {isOwner && (
                                <>
                                    <Button variant="outline"><Pencil className="mr-2 h-4 w-4" /> Edit</Button>
                                    <Button variant="destructive"><Trash2 className="mr-2 h-4 w-4" /> Remove Listing</Button>
                                </>
                            )}
                             {job.indeedApplyUrl && (
                                <Button asChild>
                                    <a href={job.indeedApplyUrl} target="_blank" rel="noopener noreferrer">
                                        <svg className="mr-2 h-4 w-4" width="24" height="24" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg"><path d="M15.84 6.204a2.23 2.23 0 0 0-3.15.019l-.03.03v-3.03h-2.1v9.6h2.1v-4.71c0-1.29.98-2.34 2.24-2.34a2.27 2.27 0 0 1 2.26 2.25v4.8h2.1v-4.93c0-2.4-1.92-4.62-4.42-4.62zM3.48 3.424c-1.08 0-1.92.84-1.92 1.92s.84 1.92 1.92 1.92c1.14 0 1.92-.84 1.92-1.92s-.78-1.92-1.92-1.92zm1.08 16.536h-2.1V9.244h2.1v10.716z"/></svg>
                                        Apply on Indeed
                                    </a>
                                </Button>
                            )}
                            {job.applicationEmail && (
                                <Button asChild>
                                    <a href={`mailto:${job.applicationEmail}`}>
                                        <Mail className="mr-2 h-4 w-4" /> Apply via Email
                                    </a>
                                </Button>
                            )}
                            {job.applicationPhone && (
                                <Button asChild>
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
                        <h2 className="text-xl font-semibold">Job Description</h2>
                        <p>{job.fullDescription}</p>
                        
                        <h3 className="text-lg font-semibold mt-6">Contact Information</h3>
                        <div className="flex flex-col gap-2">
                             {job.applicationEmail && (
                                <div className="flex items-center gap-3">
                                    <Mail className="h-4 w-4 text-muted-foreground" />
                                    <span>{job.applicationEmail}</span>
                                </div>
                            )}
                            {job.applicationPhone && (
                                <div className="flex items-center gap-3">
                                    <Phone className="h-4 w-4 text-muted-foreground" />
                                    <span>{job.applicationPhone}</span>
                                </div>
                            )}
                            {job.website && (
                                <div className="flex items-center gap-3">
                                    <Globe className="h-4 w-4 text-muted-foreground" />
                                    <a href={job.website} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">{job.website}</a>
                                </div>
                            )}
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}
