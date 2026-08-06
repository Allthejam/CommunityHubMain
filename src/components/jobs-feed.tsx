
'use client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { Button } from './ui/button';
import Link from 'next/link';
import { Briefcase, Loader2, UserSearch } from 'lucide-react';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, where } from 'firebase/firestore';
import React from 'react';
import { addDays, isAfter } from 'date-fns';

type Job = {
  id: string;
  title: string;
  company: string;
  type: string;
  createdAt?: any;
  expiresAt?: any;
};

type Seeker = {
  id: string;
  name: string;
  summary: string;
  createdAt?: any;
  expiresAt?: any;
};


export function JobsFeed({ communityId }: { communityId: string | null }) {
  const db = useFirestore();

  const jobsQuery = useMemoFirebase(() => {
      if (!db || !communityId) return null;
      return query(collection(db, "jobs"), where("communityId", "==", communityId));
  }, [db, communityId]);
  
  const seekersQuery = useMemoFirebase(() => {
      if (!db || !communityId) return null;
      return query(collection(db, "jobSeekers"), where("communityId", "==", communityId));
  }, [db, communityId]);

  const { data: rawJobs, isLoading: jobsLoading } = useCollection<Job>(jobsQuery);
  const { data: rawSeekers, isLoading: seekersLoading } = useCollection<Seeker>(seekersQuery);

  const filterExpired = React.useCallback((item: any) => {
    const now = new Date();
    const createdDate = item.createdAt?.toDate ? item.createdAt.toDate() : new Date(item.createdAt || now);
    const expiryDate = item.expiresAt?.toDate ? item.expiresAt.toDate() : addDays(createdDate, 28);
    return isAfter(expiryDate, now);
  }, []);

  const jobs = React.useMemo(() => rawJobs?.filter(filterExpired) || [], [rawJobs, filterExpired]);
  const seekers = React.useMemo(() => rawSeekers?.filter(filterExpired) || [], [rawSeekers, filterExpired]);

  const loading = jobsLoading || seekersLoading;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Jobs Board</CardTitle>
        <CardDescription>Opportunities and talent within your community.</CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
            <div className="flex justify-center items-center h-24">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        ) : (
        <div className="grid md:grid-cols-2 gap-8">
            <div>
                <h3 className="font-semibold mb-4 flex items-center gap-2">
                    <Briefcase className="h-5 w-5" />
                    Latest Job Vacancies
                </h3>
                <div className="space-y-4">
                    {jobs && jobs.length > 0 ? jobs.slice(0, 3).map(job => (
                        <div key={job.id} className="flex items-center justify-between">
                            <div>
                                <p className="font-medium">{job.title}</p>
                                <p className="text-sm text-muted-foreground">{job.company} - {job.type}</p>
                            </div>
                            <Button asChild variant="secondary" size="sm">
                                <Link href={`/jobs/${job.id}`}>View</Link>
                            </Button>
                        </div>
                    )) : (
                        <p className="text-sm text-muted-foreground">No job vacancies posted yet.</p>
                    )}
                </div>
            </div>
            <div>
                <h3 className="font-semibold mb-4 flex items-center gap-2">
                    <UserSearch className="h-5 w-5" />
                    Available Talent
                </h3>
                 <div className="space-y-4">
                    {seekers && seekers.length > 0 ? seekers.slice(0, 3).map(seeker => (
                        <div key={seeker.id} className="flex items-center justify-between">
                            <div>
                                <p className="font-medium">{seeker.name}</p>
                                <p className="text-sm text-muted-foreground line-clamp-1">{seeker.summary}</p>
                            </div>
                             <Button asChild variant="secondary" size="sm">
                                <Link href={`/jobs/seeker/${seeker.id}`}>View Profile</Link>
                            </Button>
                        </div>
                    )) : (
                        <p className="text-sm text-muted-foreground">No job seekers have posted a profile yet.</p>
                    )}
                </div>
            </div>
        </div>
        )}
      </CardContent>
    </Card>
  );
}
