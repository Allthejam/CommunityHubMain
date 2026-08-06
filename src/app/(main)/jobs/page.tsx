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
    Briefcase,
    Users,
} from "lucide-react"
import { useRouter } from "next/navigation";
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

  const communityId = (typeof window !== 'undefined' ? sessionStorage.getItem('visitedCommunityId') : null) || userProfile?.primaryHomeCommunityId || userProfile?.homeCommunityId || userProfile?.communityId;

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
  const [activeSeekersPagination, setActiveSeekersPagination] = React.useState({ pageIndex: 0, pageSize: 10 });

  const loading = isUserLoading || profileLoading || jobsLoading || seekersLoading;

  if (loading) {
    return (
      <div className="flex justify-center items-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Emerald Shimmering Hero Header */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-emerald-500/15 via-teal-500/15 to-cyan-500/15 border border-emerald-500/20 p-6 md:p-10 shadow-lg backdrop-blur-sm">
        <div className="absolute -top-24 -right-24 w-72 h-72 bg-emerald-500/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-72 h-72 bg-teal-500/20 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-8">
          <div className="space-y-3 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-background/80 backdrop-blur-md border border-emerald-500/30 text-xs font-semibold text-emerald-600 dark:text-emerald-400 shadow-xs">
              <Briefcase className="h-3.5 w-3.5" />
              <span>Local Employment Hub</span>
            </div>

            <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight font-headline">
              <span className="bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 dark:from-emerald-400 dark:via-teal-400 dark:to-cyan-400 bg-clip-text text-transparent">
                Jobs & Careers
              </span>
            </h1>

            <p className="text-sm md:text-base text-muted-foreground leading-relaxed">
              Find employment opportunities in your community or list job seeker profiles to get hired by local businesses.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 shrink-0">
            <div className="p-4 rounded-2xl bg-background/80 backdrop-blur-md border border-border/80 shadow-xs flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                <Building2 className="h-6 w-6" />
              </div>
              <div>
                <div className="text-xl font-bold">{jobs.length}</div>
                <div className="text-xs text-muted-foreground">Vacancies</div>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-background/80 backdrop-blur-md border border-border/80 shadow-xs flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-cyan-500/10 text-cyan-600 dark:text-cyan-400">
                <Users className="h-6 w-6" />
              </div>
              <div>
                <div className="text-xl font-bold">{seekers.length}</div>
                <div className="text-xs text-muted-foreground">Job Seekers</div>
              </div>
            </div>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button size="lg" className="gap-2 font-semibold shadow-md bg-emerald-600 hover:bg-emerald-700 text-white">
                  <PlusCircle className="h-5 w-5" />
                  Post to Job Board
                  <ChevronDown className="h-4 w-4 opacity-70" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuItem asChild className="cursor-pointer">
                  <Link href="/jobs/create-vacancy">
                    <FileText className="mr-2 h-4 w-4 text-emerald-600" />
                    Post a Job Vacancy
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild className="cursor-pointer">
                  <Link href="/jobs/create-seeker">
                    <UserPlus className="mr-2 h-4 w-4 text-teal-600" />
                    Post a Job Seeker Profile
                  </Link>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>

      <Alert className="border-amber-500/30 bg-amber-500/5">
        <AlertTriangle className="h-4 w-4 text-amber-600" />
        <AlertTitle className="text-amber-700 dark:text-amber-400">Please Note: 28-Day Listing Duration</AlertTitle>
        <AlertDescription className="text-amber-600/90 dark:text-amber-400/90 text-xs">
          To ensure the job board stays current, all job vacancies and job seeker profiles automatically expire after 28 days.
        </AlertDescription>
      </Alert>

      <Tabs defaultValue="vacancies" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="vacancies">
            <Building2 className="mr-2 h-4 w-4" />
            Job Vacancies
          </TabsTrigger>
          <TabsTrigger value="seekers">
            <UserSearch className="mr-2 h-4 w-4" />
            Job Seekers
          </TabsTrigger>
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
      </Tabs>
    </div>
  );
}