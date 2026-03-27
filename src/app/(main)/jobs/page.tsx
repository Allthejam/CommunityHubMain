
"use client";

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
} from "lucide-react"
import { useRouter } from "next/navigation";
import { collection, query, where } from "firebase/firestore";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
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
import { useUser, useFirestore, useDoc, useCollection, useMemoFirebase } from "@/firebase";
import { doc } from 'firebase/firestore';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";


type Job = {
  id: string;
  title: string;
  company: string;
  shortDescription: string;
  ownerId: string;
};

type Seeker = {
  id: string;
  name: string;
  summary: string;
  ownerId: string;
};


export default function JobsPage() {
  const { user, isUserLoading } = useUser();
  const db = useFirestore();
  const userProfileRef = useMemoFirebase(() => {
    if (!user || !db) return null;
    return doc(db, 'users', user.uid);
  }, [user, db]);
  const { data: userProfile, isLoading: profileLoading } = useDoc(userProfileRef);

  const communityId = userProfile?.communityId;

  // Data queries
  const jobsQuery = useMemoFirebase(() => {
      if (!db || !communityId) return null;
      return query(collection(db, "jobs"), where("communityId", "==", communityId));
  }, [db, communityId]);
  
  const seekersQuery = useMemoFirebase(() => {
      if (!db || !communityId) return null;
      return query(collection(db, "jobSeekers"), where("communityId", "==", communityId));
  }, [db, communityId]);

  const { data: jobs, isLoading: jobsLoading } = useCollection<Job>(jobsQuery);
  const { data: seekers, isLoading: seekersLoading } = useCollection<Seeker>(seekersQuery);

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
        <div className="flex gap-2">
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
          seeker profiles will be automatically removed after 28 days from their
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
                  <Table className="responsive-table">
                    <TableHeader>
                      <TableRow>
                        <TableHead>Job Title</TableHead>
                        <TableHead>Company</TableHead>
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
                                    <TableCell className="block md:table-cell" data-label="Job Title">
                                        <span className="font-medium">{job.title}</span>
                                    </TableCell>
                                    <TableCell className="block md:table-cell" data-label="Company">{job.company}</TableCell>
                                    <TableCell className="block md:table-cell text-muted-foreground" data-label="Description">
                                        {job.shortDescription}
                                    </TableCell>
                                    <TableCell className="block md:table-cell text-right" data-label="Actions">
                                        {isOwner ? (
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                            <Button variant="ghost" className="h-8 w-8 p-0">
                                                <span className="sr-only">Open menu</span>
                                                <MoreHorizontal className="h-4 w-4" />
                                            </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end">
                                            <DropdownMenuItem asChild>
                                                <Link href={`/jobs/${job.id}`}>View Listing</Link>
                                            </DropdownMenuItem>
                                            <DropdownMenuItem>Edit Listing</DropdownMenuItem>
                                            <DropdownMenuSeparator />
                                            <DropdownMenuItem className="text-destructive">
                                                Remove Listing
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
                                        <ContextMenuItem>Edit Listing</ContextMenuItem>
                                        <ContextMenuSeparator />
                                        <ContextMenuItem className="text-destructive">Remove Listing</ContextMenuItem>
                                    </>
                                    )}
                                </ContextMenuContent>
                            </ContextMenu>
                          );
                        })
                      ) : (
                        <TableRow>
                          <TableCell colSpan={4} className="h-24 text-center">
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
                  <Table className="responsive-table">
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
                                        <Button variant="ghost" className="h-8 w-8 p-0">
                                            <span className="sr-only">Open menu</span>
                                            <MoreHorizontal className="h-4 w-4" />
                                        </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end">
                                        <DropdownMenuItem asChild>
                                            <Link href={`/jobs/seeker/${seeker.id}`}>View Profile</Link>
                                        </DropdownMenuItem>
                                        <DropdownMenuItem>Edit Profile</DropdownMenuItem>
                                        <DropdownMenuSeparator />
                                        <DropdownMenuItem className="text-destructive">
                                            Remove Profile
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
                                        <ContextMenuItem>Edit Profile</ContextMenuItem>
                                        <ContextMenuSeparator />
                                        <ContextMenuItem className="text-destructive">Remove Profile</ContextMenuItem>
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
