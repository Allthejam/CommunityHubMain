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