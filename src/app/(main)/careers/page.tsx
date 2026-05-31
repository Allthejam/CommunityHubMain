
'use client';

import * as React from 'react';
import { Briefcase, Building, Code, BarChart, Mail, Loader2 } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Separator } from "@/components/ui/separator";
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, query, where } from 'firebase/firestore';

type Career = {
    id: string;
    title: string;
    department: string;
    location: string;
    status: 'Open' | 'Closed' | 'Filled';
};

const departmentIcons: { [key: string]: React.ElementType } = {
    Management: Building,
    Administration: Briefcase,
    "Information Technology": Code,
    "Sales & Marketing": BarChart,
};

export default function CareersPage() {
    const db = useFirestore();
    
    const careersQuery = useMemoFirebase(() => {
        if (!db) return null;
        return query(
            collection(db, 'careers'),
            where('isInternalOnly', '==', false),
            where('status', '==', 'Open')
        );
    }, [db]);
    
    const { data: jobOpenings, isLoading } = useCollection<Career>(careersQuery);

    const jobsByDepartment = React.useMemo(() => {
        if (!jobOpenings) return {};
        const sortedJobs = [...jobOpenings].sort((a, b) => a.title.localeCompare(b.title));
        const departments = [...new Set(sortedJobs.map(job => job.department))].sort();
        
        const grouped: Record<string, Career[]> = {};
        departments.forEach(dept => {
            grouped[dept] = sortedJobs.filter(job => job.department === dept);
        });

        return grouped;
    }, [jobOpenings]);

    return (
        <div className="space-y-16 py-12">
            <section className="text-center">
                <h1 className="text-4xl md:text-5xl font-bold tracking-tight font-headline">
                    Join Our Mission
                </h1>
                <p className="mt-4 max-w-3xl mx-auto text-lg text-muted-foreground">
                    We're building a team of passionate individuals dedicated to reconnecting communities. If you believe in the power of local, we want to hear from you.
                </p>
            </section>

            <section>
                <h2 className="text-3xl font-bold font-headline text-center mb-8">Current Openings</h2>
                {isLoading ? (
                     <div className="flex justify-center items-center h-64">
                        <Loader2 className="h-12 w-12 animate-spin text-muted-foreground" />
                    </div>
                ) : Object.keys(jobsByDepartment).length > 0 ? (
                    <div className="space-y-8">
                        {Object.entries(jobsByDepartment).map(([department, jobs]) => {
                            const Icon = departmentIcons[department] || Briefcase;
                            return (
                                <Card key={department}>
                                    <CardHeader>
                                        <CardTitle className="flex items-center gap-3">
                                            <Icon className="h-6 w-6 text-primary" />
                                            {department}
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent className="space-y-4">
                                        {jobs.map(role => (
                                            <div key={role.id} className="flex justify-between items-center p-3 rounded-lg bg-secondary">
                                                <div>
                                                    <p className="font-semibold">{role.title}</p>
                                                    <p className="text-sm text-muted-foreground">{role.location}</p>
                                                </div>
                                                <Button asChild>
                                                    <Link href={`/careers/${role.id}`}>View Details</Link>
                                                </Button>
                                            </div>
                                        ))}
                                    </CardContent>
                                </Card>
                            )
                        })}
                    </div>
                ) : (
                    <Card>
                        <CardContent className="p-12 text-center text-muted-foreground">
                            <p>There are currently no open positions. Please check back later!</p>
                        </CardContent>
                    </Card>
                )}
            </section>
            
            <Separator />

            <section className="text-center">
                 <h2 className="text-3xl font-bold font-headline">Don't See a Fit?</h2>
                 <p className="mt-2 max-w-3xl mx-auto text-muted-foreground">
                    We're always looking for talented people. If you're passionate about our mission, send us your resume and let us know how you can make a difference.
                </p>
                <div className="mt-6">
                    <Button asChild size="lg">
                        <Link href="mailto:careers@communityhub.example.com">
                            <Mail className="mr-2 h-5 w-5" />
                            Contact Us
                        </Link>
                    </Button>
                </div>
            </section>
        </div>
    );
}
