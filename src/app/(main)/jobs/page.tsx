'use client';

import * as React from "react";
import {
    MoreHorizontal,
    UserPlus,
    Loader2,
    ChevronDown,
    AlertTriangle,
    FileText,
    Building2,
    PlusCircle,
    UserSearch,
    Banknote,
    HelpCircle,
    Trash2,
    Pencil,
    Sparkles,
} from "lucide-react"
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { collection, query, where } from "firebase/firestore";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuLabel,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import Link from "next/link";
import Image from "next/image";
import { useUser, useFirestore, useDoc, useCollection, useMemoFirebase } from "@/firebase";
import { doc } from 'firebase/firestore';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from "@/components/ui/dialog";
import {
  ScrollArea } from "@/components/ui/scroll-area";
import { LegalDocumentDisplay } from "@/components/legal-document-display";
import { addDays, isAfter } from "date-fns";
import { deleteJobVacancyAction, deleteJobSeekerProfileAction } from "@/lib/actions/jobActions";
import { useToast } from "@/hooks/use-toast";


type Job = {
  id: string;
  title: string;
  company: string;
  companyLogo?: string | null;
  shortDescription: string;
  ownerId: string;
  salary?: string;
  createdAt?: any;
  expiresAt?: any;
};

type Seeker = {
  id: string;
  name: string;
  summary: string;
  ownerId: string;
  createdAt?: any;
  expiresAt?: any;
};


export default function JobsPage() {
  const { user, isUserLoading } = useUser();
  const db = useFirestore();
  const { toast } = useToast();
  const userProfileRef = useMemoFirebase(() => {
    if (!user || !db) return null;
    return doc(db, 'users', user.uid);
  }, [user, db]);
  const { data: userProfile, isLoading: profileLoading } = useDoc(userProfileRef);

  const communityId = userProfile?.communityId;

  const [isDeleting, setIsDeleting] = React.useState<string | null>(null);

  // Data queries
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

  const getMatchScore = React.useCallback((textA: string, textB: string): number => {
    const clean = (t: string) => t.toLowerCase().replace(/[^\w\s]/g, '').split(/\s+/).filter(w => w.length > 3);
    const wordsA = new Set(clean(textA));
    const wordsB = clean(textB);
    let intersection = 0;
    for (const w of wordsB) {
        if (wordsA.has(w)) {
            intersection++;
        }
    }
    return intersection;
  }, []);

  const mySeekerProfile = React.useMemo(() => {
    if (!user || !seekers) return null;
    return seekers.find(s => s.ownerId === user.uid);
  }, [user, seekers]);

  const recommendedJobs = React.useMemo(() => {
    if (!user || !jobs) return [];
    const seekerProfileText = (mySeekerProfile as any)?.profile || '';
    const userTargetText = `${mySeekerProfile?.summary || ''} ${seekerProfileText} ${userProfile?.bio || ''}`;
    if (!userTargetText.trim()) return [];

    return jobs
      .map(job => {
        const jobText = `${job.title} ${job.shortDescription} ${job.company}`;
        const score = getMatchScore(userTargetText, jobText);
        return { job, score };
      })
      .filter(item => item.score > 0)
      .sort((a, b) => b.score - a.score)
      .map(item => item.job);
  }, [user, jobs, mySeekerProfile, userProfile, getMatchScore]);

  const myVacancies = React.useMemo(() => {
    if (!user || !jobs) return [];
    return jobs.filter(j => j.ownerId === user.uid);
  }, [user, jobs]);

  const recommendedSeekers = React.useMemo(() => {
    if (!user || !seekers || myVacancies.length === 0) return [];
    const vacancyText = myVacancies.map(v => `${v.title} ${v.shortDescription}`).join(' ');
    
    return seekers
      .map(seeker => {
        const seekerProfileText = (seeker as any).profile || '';
        const seekerText = `${seeker.name} ${seeker.summary} ${seekerProfileText}`;
        const score = getMatchScore(vacancyText, seekerText);
        return { seeker, score };
      })
      .filter(item => item.score > 0)
      .sort((a, b) => b.score - a.score)
      .map(item => item.seeker);
  }, [user, seekers, myVacancies, getMatchScore]);

  const handleDeleteJob = async (id: string) => {
    setIsDeleting(id);
    const result = await deleteJobVacancyAction(id);
    if (result.success) {
        toast({ title: "Vacancy Removed" });
    } else {
        toast({ title: "Error", description: result.error, variant: "destructive" });
    }
    setIsDeleting(null);
  };

  const handleDeleteSeeker = async (id: string) => {
    setIsDeleting(id);
    const result = await deleteJobSeekerProfileAction(id);
    if (result.success) {
        toast({ title: "Profile Removed" });
    } else {
        toast({ title: "Error", description: result.error, variant: "destructive" });
    }
    setIsDeleting(null);
  };

  const [activePagination, setActivePagination] = React.useState({ pageIndex: 0, pageSize: 10 });
  const [archivedPagination, setArchivedPagination] = React.useState({ pageIndex: 0, pageSize: 10 });

  const loading = jobsLoading || seekersLoading || isUserLoading || profileLoading;

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight font-headline">
            Job Board
          </h1>
          <p className="text-muted-foreground">
            Find your next career opportunity within the community.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Dialog>
            <DialogTrigger asChild>
                <Button variant="outline">
                    <HelpCircle className="mr-2 h-4 w-4" />
                    Why advertise with us?
                </Button>
            </DialogTrigger>
            <DialogContent className="max-w-3xl grid-rows-[auto,1fr,auto] p-0 max-h-[85vh]">
                <DialogHeader className="p-6 pb-2 border-b">
                    <DialogTitle>Job Board Advertising</DialogTitle>
                </DialogHeader>
                <ScrollArea className="h-full">
                    <div className="p-6">
                        <LegalDocumentDisplay documentId="o3uy29r0GrixYN2iwv8D" />
                    </div>
                </ScrollArea>
                <DialogFooter className="p-6 pt-4 border-t">
                    <DialogClose asChild>
                        <Button type="button">Close</Button>
                    </DialogClose>
                </DialogFooter>
            </DialogContent>
          </Dialog>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button>
                <PlusCircle className="mr-2 h-4 w-4" />
                Post to Job Board
                <ChevronDown className="ml-2 h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
                <DropdownMenuItem asChild>
                    <Link href="/jobs/create-vacancy">
                        <FileText className="mr-2 h-4 w-4" />
                        Post a Job Vacancy
                    </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                    <Link href="/jobs/create-seeker">
                        <UserPlus className="mr-2 h-4 w-4" />
                        Post a Job Seeker Profile
                    </Link>
                </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <Alert>
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>Please Note: 28-Day Listing Duration</AlertTitle>
        <AlertDescription>
          To ensure the job board stays current, all job vacancies and job
          seeker profiles will be automatically hidden after 28 days from their
          date of posting.
        </AlertDescription>
      </Alert>

      <Tabs defaultValue="vacancies" className="w-full">
        <TabsList className={cn("grid w-full", user ? "grid-cols-3" : "grid-cols-2")}>
          <TabsTrigger value="vacancies">
            <Building2 className="mr-2 h-4 w-4" />
            Job Vacancies
          </TabsTrigger>
          <TabsTrigger value="seekers">
            <UserSearch className="mr-2 h-4 w-4" />
            Job Seekers
          </TabsTrigger>
          {user && (
            <TabsTrigger value="matches">
              <Sparkles className="mr-2 h-4 w-4 text-indigo-500 fill-indigo-500 animate-pulse" />
              Matches for You
            </TabsTrigger>
          )}
        </TabsList>
        <TabsContent value="vacancies">
          <Card className="mt-6">
            <CardHeader>
              <CardTitle>Current Vacancies</CardTitle>
              <CardDescription>
                Browse job openings from local businesses.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="h-24 flex items-center justify-center">
                  <Loader2 className="h-6 w-6 animate-spin" />
                </div>
              ) : (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[60px]"></TableHead>
                        <TableHead>Job Title</TableHead>
                        <TableHead>Company</TableHead>
                        <TableHead>Salary / Pay</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {jobs && jobs.length > 0 ? (
                        jobs.map((job) => {
                          const isOwner = user?.uid === job.ownerId;
                          return (
                            <ContextMenu key={job.id}>
                                <ContextMenuTrigger asChild>
                                    <TableRow className="block md:table-row">
                                    <TableCell className="block md:table-cell" data-label="Logo">
                                        <div className="relative h-10 w-10 rounded-md overflow-hidden bg-muted border flex-shrink-0">
                                            {job.companyLogo ? (
                                                <Image src={job.companyLogo} alt={job.company} fill className="object-contain p-1" />
                                            ) : (
                                                <div className="flex h-full w-full items-center justify-center">
                                                    <Building2 className="h-5 w-5 text-muted-foreground" />
                                                </div>
                                            )}
                                        </div>
                                    </TableCell>
                                    <TableCell className="block md:table-cell" data-label="Job Title">
                                        <span className="font-medium">{job.title}</span>
                                    </TableCell>
                                    <TableCell className="block md:table-cell" data-label="Company">{job.company}</TableCell>
                                    <TableCell className="block md:table-cell" data-label="Salary">
                                        {job.salary ? (
                                            <span className="flex items-center gap-1.5 text-xs font-medium text-green-600">
                                                <Banknote className="h-3.5 w-3.5" />
                                                {job.salary}
                                            </span>
                                        ) : 'Not specified'}
                                    </TableCell>
                                    <TableCell className="block md:table-cell text-muted-foreground truncate max-w-[200px]" data-label="Description">
                                        {job.shortDescription}
                                    </TableCell>
                                    <TableCell className="block md:table-cell text-right" data-label="Actions">
                                        {isOwner ? (
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                            <Button variant="ghost" className="h-8 w-8 p-0" disabled={isDeleting === job.id}>
                                                {isDeleting === job.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <MoreHorizontal className="h-4 w-4" />}
                                            </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end">
                                            <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                            <DropdownMenuItem asChild>
                                                <Link href={`/jobs/${job.id}`}>View Listing</Link>
                                            </DropdownMenuItem>
                                            <DropdownMenuItem asChild>
                                                <Link href={`/jobs/edit/${job.id}`}><Pencil className="mr-2 h-4 w-4" /> Edit Listing</Link>
                                            </DropdownMenuItem>
                                            <DropdownMenuSeparator />
                                            <DropdownMenuItem className="text-destructive" onClick={() => handleDeleteJob(job.id)}>
                                                <Trash2 className="mr-2 h-4 w-4" /> Remove Listing
                                            </DropdownMenuItem>
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                        ) : (
                                        <Button asChild variant="outline" size="sm">
                                            <Link href={`/jobs/${job.id}`}>View Listing</Link>
                                        </Button>
                                        )}
                                    </TableCell>
                                    </TableRow>
                                </ContextMenuTrigger>
                                 <ContextMenuContent>
                                    <ContextMenuLabel>Job: {job.title}</ContextMenuLabel>
                                    <ContextMenuSeparator />
                                    <ContextMenuItem asChild><Link href={`/jobs/${job.id}`}>View Listing</Link></ContextMenuItem>
                                    {isOwner && (
                                    <>
                                        <ContextMenuItem asChild><Link href={`/jobs/edit/${job.id}`}><Pencil className="mr-2 h-4 w-4" /> Edit Listing</Link></ContextMenuItem>
                                        <ContextMenuSeparator />
                                        <ContextMenuItem className="text-destructive" onSelect={() => handleDeleteJob(job.id)}><Trash2 className="mr-2 h-4 w-4" /> Remove Listing</ContextMenuItem>
                                    </>
                                    )}
                                </ContextMenuContent>
                            </ContextMenu>
                          );
                        })
                      ) : (
                        <TableRow>
                          <TableCell colSpan={6} className="h-24 text-center">
                            No job vacancies posted yet.
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="seekers">
          <Card className="mt-6">
            <CardHeader>
              <CardTitle>Available Talent</CardTitle>
              <CardDescription>
                Find talented individuals in your community.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="h-24 flex items-center justify-center">
                  <Loader2 className="h-6 w-6 animate-spin" />
                </div>
              ) : (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Profile Summary</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {seekers && seekers.length > 0 ? (
                        seekers.map((seeker) => {
                          const isOwner = user?.uid === seeker.ownerId;
                          return (
                            <ContextMenu key={seeker.id}>
                                <ContextMenuTrigger asChild>
                                <TableRow className="block md:table-row">
                                <TableCell className="block md:table-cell font-medium" data-label="Name">
                                    {seeker.name}
                                </TableCell>
                                <TableCell className="block md:table-cell text-muted-foreground" data-label="Profile Summary">
                                    {seeker.summary}
                                </TableCell>
                                <TableCell className="block md:table-cell text-right" data-label="Actions">
                                    {isOwner ? (
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                        <Button variant="ghost" className="h-8 w-8 p-0" disabled={isDeleting === seeker.id}>
                                            {isDeleting === seeker.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <MoreHorizontal className="h-4 w-4" />}
                                        </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end">
                                        <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                        <DropdownMenuItem asChild>
                                            <Link href={`/jobs/seeker/${seeker.id}`}>View Profile</Link>
                                        </DropdownMenuItem>
                                        <DropdownMenuItem asChild>
                                            <Link href={`/jobs/seeker/edit/${seeker.id}`}><Pencil className="mr-2 h-4 w-4" /> Edit Profile</Link>
                                        </DropdownMenuItem>
                                        <DropdownMenuSeparator />
                                        <DropdownMenuItem className="text-destructive" onClick={() => handleDeleteSeeker(seeker.id)}>
                                            <Trash2 className="mr-2 h-4 w-4" /> Remove Profile
                                        </DropdownMenuItem>
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                    ) : (
                                    <Button asChild variant="outline" size="sm">
                                        <Link href={`/jobs/seeker/${seeker.id}`}>View Profile</Link>
                                    </Button>
                                    )}
                                </TableCell>
                                </TableRow>
                                </ContextMenuTrigger>
                                 <ContextMenuContent>
                                    <ContextMenuLabel>Seeker: {seeker.name}</ContextMenuLabel>
                                    <ContextMenuSeparator />
                                    <ContextMenuItem asChild>
                                        <Link href={`/jobs/seeker/${seeker.id}`}>View Profile</Link>
                                    </ContextMenuItem>
                                    {isOwner && (
                                    <>
                                        <ContextMenuItem asChild><Link href={`/jobs/seeker/edit/${seeker.id}`}><Pencil className="mr-2 h-4 w-4" /> Edit Profile</Link></ContextMenuItem>
                                        <ContextMenuSeparator />
                                        <ContextMenuItem className="text-destructive" onSelect={() => handleDeleteSeeker(seeker.id)}><Trash2 className="mr-2 h-4 w-4" /> Remove Profile</ContextMenuItem>
                                    </>
                                    )}
                                </ContextMenuContent>
                            </ContextMenu>
                          );
                        })
                      ) : (
                        <TableRow>
                          <TableCell colSpan={3} className="h-24 text-center">
                            No job seekers have created a profile yet.
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {user && (
          <TabsContent value="matches">
            <Card className="mt-6">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-indigo-500 fill-indigo-500" />
                  Intelligent Matchmaking
                </CardTitle>
                <CardDescription>
                  AI-assisted matchmaking connecting local opportunities and talent based on skills overlap.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-8">
                {/* Resident Matches */}
                <div>
                  <h3 className="font-bold text-sm mb-4 text-indigo-600 flex items-center gap-2">
                    <Building2 className="h-4 w-4" /> Recommended Jobs for You
                  </h3>
                  {recommendedJobs.length > 0 ? (
                    <div className="rounded-md border">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="w-[60px]"></TableHead>
                            <TableHead>Job Title</TableHead>
                            <TableHead>Company</TableHead>
                            <TableHead>Salary / Pay</TableHead>
                            <TableHead>Description</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {recommendedJobs.map((job) => {
                            return (
                              <TableRow key={job.id}>
                                <TableCell>
                                  <div className="relative h-10 w-10 rounded-md overflow-hidden bg-muted border flex items-center justify-center">
                                    {job.companyLogo ? (
                                      <Image src={job.companyLogo} alt={job.company} fill className="object-contain p-1" />
                                    ) : (
                                      <Building2 className="h-5 w-5 text-muted-foreground" />
                                    )}
                                  </div>
                                </TableCell>
                                <TableCell className="font-semibold">{job.title}</TableCell>
                                <TableCell>{job.company}</TableCell>
                                <TableCell>
                                  {job.salary ? (
                                    <span className="flex items-center gap-1.5 text-xs font-semibold text-green-600">
                                      <Banknote className="h-3.5 w-3.5" />
                                      {job.salary}
                                    </span>
                                  ) : 'Not specified'}
                                </TableCell>
                                <TableCell className="text-muted-foreground truncate max-w-[200px]">{job.shortDescription}</TableCell>
                                <TableCell className="text-right">
                                  <Button asChild variant="outline" size="sm">
                                    <Link href={`/jobs/${job.id}`}>View & Apply</Link>
                                  </Button>
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </div>
                  ) : (
                    <div className="text-sm text-muted-foreground bg-slate-50 border border-dashed rounded-lg p-6 text-center">
                      <p className="font-medium text-slate-700 mb-1">No Recommended Jobs Yet</p>
                      <p className="text-xs">Create a Job Seeker Profile or add detail to your bio to see matching vacancies.</p>
                      <Button asChild variant="link" size="sm" className="mt-2 text-indigo-600">
                        <Link href="/jobs/create-seeker">Create Profile Now →</Link>
                      </Button>
                    </div>
                  )}
                </div>

                {/* Business Matches */}
                <div className="border-t pt-8">
                  <h3 className="font-bold text-sm mb-4 text-indigo-600 flex items-center gap-2">
                    <UserSearch className="h-4 w-4" /> Recommended Candidates for Your Vacancies
                  </h3>
                  {myVacancies.length === 0 ? (
                    <div className="text-sm text-muted-foreground bg-slate-50 border border-dashed rounded-lg p-6 text-center">
                      <p className="font-medium text-slate-700 mb-1">Post a Vacancy to Find Talent</p>
                      <p className="text-xs">Once you post a job vacancy, local candidates matching your job requirements will appear here.</p>
                      <Button asChild variant="link" size="sm" className="mt-2 text-indigo-600">
                        <Link href="/jobs/create-vacancy">Post a Job Vacancy →</Link>
                      </Button>
                    </div>
                  ) : recommendedSeekers.length > 0 ? (
                    <div className="rounded-md border">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Candidate Name</TableHead>
                            <TableHead>Profile Summary</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {recommendedSeekers.map((seeker) => (
                            <TableRow key={seeker.id}>
                              <TableCell className="font-semibold">{seeker.name}</TableCell>
                              <TableCell className="text-muted-foreground">{seeker.summary}</TableCell>
                              <TableCell className="text-right">
                                <Button asChild variant="outline" size="sm">
                                  <Link href={`/jobs/seeker/${seeker.id}`}>View Profile</Link>
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  ) : (
                    <div className="text-sm text-muted-foreground bg-slate-50 border border-dashed rounded-lg p-6 text-center">
                      <p className="text-xs">No matching local candidates found for your posted vacancies yet.</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}