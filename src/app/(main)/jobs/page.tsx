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
    Briefcase,
    Search,
    ArrowRight,
    Calendar,
    Users,
    MapPin
} from "lucide-react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { collection, query, where } from "firebase/firestore";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { LegalDocumentDisplay } from "@/components/legal-document-display";
import { addDays, isAfter, formatDistanceToNow } from "date-fns";
import { deleteJobVacancyAction, deleteJobSeekerProfileAction } from "@/lib/actions/jobActions";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";

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

import { useActiveCommunityId } from "@/hooks/use-active-community-id";

export default function JobsPage() {
  const { user, isUserLoading } = useUser();
  const db = useFirestore();
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = React.useState('');
  const { communityId, userProfile, isLoading: activeCommunityLoading } = useActiveCommunityId();

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

  const filteredJobs = React.useMemo(() => {
    if (!jobs) return [];
    if (!searchQuery.trim()) return jobs;
    const q = searchQuery.toLowerCase();
    return jobs.filter(j => 
      j.title.toLowerCase().includes(q) || 
      j.company.toLowerCase().includes(q) ||
      j.shortDescription.toLowerCase().includes(q) ||
      (j.salary && j.salary.toLowerCase().includes(q))
    );
  }, [jobs, searchQuery]);

  const filteredSeekers = React.useMemo(() => {
    if (!seekers) return [];
    if (!searchQuery.trim()) return seekers;
    const q = searchQuery.toLowerCase();
    return seekers.filter(s => 
      s.name.toLowerCase().includes(q) || 
      s.summary.toLowerCase().includes(q)
    );
  }, [seekers, searchQuery]);

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

  const loading = jobsLoading || seekersLoading || isUserLoading || profileLoading;

  return (
    <div className="space-y-8 pb-12">
      {/* Vibrant Hero Header Banner */}
      <div className="p-6 md:p-8 rounded-2xl bg-gradient-to-r from-emerald-500/15 via-teal-500/15 to-indigo-500/15 border border-emerald-200/50 dark:border-emerald-900/40 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2.5">
              <div className="p-2.5 rounded-xl bg-emerald-600 text-white shadow-xs">
                <Briefcase className="h-6 w-6" />
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight font-headline">
                Community Job Board
              </h1>
            </div>
            <p className="text-sm text-muted-foreground pt-1">
              Discover local career opportunities or connect with available talent in {userProfile?.communityName || 'your community'}.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <Dialog>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="h-9 text-xs font-semibold bg-background">
                  <HelpCircle className="mr-1.5 h-3.5 w-3.5 text-emerald-600 shrink-0" />
                  Why Advertise?
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-3xl grid-rows-[auto,1fr,auto] p-0 max-h-[85vh]">
                <DialogHeader className="p-6 pb-2 border-b">
                  <DialogTitle>Job Board Advertising Info</DialogTitle>
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
                <Button size="sm" className="h-9 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm gap-1.5">
                  <PlusCircle className="h-3.5 w-3.5" />
                  <span>Post to Job Board</span>
                  <ChevronDown className="h-3.5 w-3.5 opacity-80" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem asChild>
                  <Link href="/jobs/create-vacancy">
                    <Building2 className="mr-2 h-4 w-4 text-emerald-600" />
                    Post a Job Vacancy
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/jobs/create-seeker">
                    <UserPlus className="mr-2 h-4 w-4 text-indigo-600" />
                    Post a Job Seeker Profile
                  </Link>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Live Search Bar */}
        <div className="relative max-w-md pt-2">
          <Search className="absolute left-3.5 top-5 h-4 w-4 text-muted-foreground" />
          <Input 
            type="text" 
            placeholder="Search job titles, companies, salary or skills..." 
            className="pl-10 h-10 bg-background/80 backdrop-blur-xs border-emerald-200 dark:border-emerald-900"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* Expiry Notice Banner */}
      <Alert className="border-amber-200 bg-amber-50/60 dark:bg-amber-950/30 text-amber-900 dark:text-amber-200">
        <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0" />
        <AlertTitle className="font-bold text-xs">📅 28-Day Freshness Guarantee</AlertTitle>
        <AlertDescription className="text-xs text-amber-800 dark:text-amber-300">
          All job vacancies and candidate profiles are active for 28 days to keep the board fresh and relevant.
        </AlertDescription>
      </Alert>

      {/* Main Tabs Component */}
      <Tabs defaultValue="vacancies" className="w-full">
        <TabsList className={cn("grid w-full h-11 p-1 bg-muted/60", user ? "grid-cols-3" : "grid-cols-2")}>
          <TabsTrigger value="vacancies" className="text-xs font-bold gap-1.5 data-[state=active]:bg-background">
            <Building2 className="h-4 w-4 text-emerald-600 shrink-0" />
            <span>Job Vacancies ({filteredJobs.length})</span>
          </TabsTrigger>
          <TabsTrigger value="seekers" className="text-xs font-bold gap-1.5 data-[state=active]:bg-background">
            <UserSearch className="h-4 w-4 text-indigo-600 shrink-0" />
            <span>Job Seekers ({filteredSeekers.length})</span>
          </TabsTrigger>
          {user && (
            <TabsTrigger value="matches" className="text-xs font-bold gap-1.5 data-[state=active]:bg-background text-purple-700 dark:text-purple-300">
              <Sparkles className="h-4 w-4 text-purple-600 fill-purple-600 animate-pulse shrink-0" />
              <span>Matches for You ({recommendedJobs.length})</span>
            </TabsTrigger>
          )}
        </TabsList>

        {/* Tab 1: Job Vacancies Cards List (Whole Card Clickable) */}
        <TabsContent value="vacancies" className="mt-6 space-y-4">
          {loading ? (
            <div className="h-48 flex items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : filteredJobs && filteredJobs.length > 0 ? (
            <div className="grid grid-cols-1 gap-4">
              {filteredJobs.map((job) => {
                const isOwner = user?.uid === job.ownerId;
                return (
                  <Link key={job.id} href={`/jobs/${job.id}`} className="block group transition-all duration-200">
                    <Card className="overflow-hidden border-2 border-border/80 hover:border-emerald-500/80 dark:hover:border-emerald-400/80 transition-all duration-200 cursor-pointer shadow-xs group-hover:shadow-md">
                      <CardContent className="p-5 sm:p-6">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                          
                          {/* Logo & Info */}
                          <div className="flex items-start gap-4 flex-1">
                            <div className="relative h-12 w-12 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 flex items-center justify-center shrink-0 mt-0.5 overflow-hidden group-hover:scale-105 transition-transform">
                              {job.companyLogo ? (
                                <Image src={job.companyLogo} alt={job.company} fill className="object-contain p-1" />
                              ) : (
                                <Building2 className="h-6 w-6 text-emerald-600" />
                              )}
                            </div>

                            <div className="space-y-1.5 flex-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <h3 className="text-base sm:text-lg font-bold text-foreground group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                                  {job.title}
                                </h3>
                                <Badge variant="outline" className="text-[11px] bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border-emerald-200 font-semibold">
                                  {job.company}
                                </Badge>
                              </div>
                              <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                                {job.shortDescription}
                              </p>
                            </div>
                          </div>

                          {/* Salary & Action */}
                          <div className="flex items-center justify-between sm:justify-end gap-3 pt-3 sm:pt-0 border-t sm:border-t-0 border-border/50 shrink-0">
                            {job.salary && (
                              <Badge className="bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-200 border-emerald-300 text-xs font-bold px-2.5 py-1 gap-1">
                                <Banknote className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                                {job.salary}
                              </Badge>
                            )}

                            {isOwner && (
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-8 w-8 text-destructive hover:bg-destructive/10"
                                onClick={(e) => {
                                  e.preventDefault();
                                  handleDeleteJob(job.id);
                                }}
                                title="Delete Vacancy"
                              >
                                {isDeleting === job.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                              </Button>
                            )}

                            <Button 
                              size="sm" 
                              className="h-9 px-4 text-xs font-semibold gap-1.5 shadow-xs shrink-0 bg-emerald-600 hover:bg-emerald-700 text-white group-hover:translate-x-0.5 transition-transform"
                            >
                              <span>View Vacancy</span>
                              <ArrowRight className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                );
              })}
            </div>
          ) : (
            <Card className="p-8 text-center border-dashed">
              <Building2 className="h-12 w-12 text-muted-foreground/40 mx-auto mb-3" />
              <h3 className="text-lg font-bold">No Job Vacancies Found</h3>
              <p className="text-sm text-muted-foreground mt-1 max-w-sm mx-auto">
                {searchQuery ? `No vacancies matched "${searchQuery}".` : "No job vacancies have been posted in this community hub yet."}
              </p>
              <Button asChild size="sm" className="mt-4 bg-emerald-600 hover:bg-emerald-700 text-white">
                <Link href="/jobs/create-vacancy">
                  <PlusCircle className="mr-1.5 h-4 w-4" /> Post a Vacancy
                </Link>
              </Button>
            </Card>
          )}
        </TabsContent>

        {/* Tab 2: Job Seekers Cards List */}
        <TabsContent value="seekers" className="mt-6 space-y-4">
          {loading ? (
            <div className="h-48 flex items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : filteredSeekers && filteredSeekers.length > 0 ? (
            <div className="grid grid-cols-1 gap-4">
              {filteredSeekers.map((seeker) => {
                const isOwner = user?.uid === seeker.ownerId;
                return (
                  <Link key={seeker.id} href={`/jobs/seeker/${seeker.id}`} className="block group transition-all duration-200">
                    <Card className="overflow-hidden border-2 border-border/80 hover:border-indigo-500/80 dark:hover:border-indigo-400/80 transition-all duration-200 cursor-pointer shadow-xs group-hover:shadow-md">
                      <CardContent className="p-5 sm:p-6">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                          
                          {/* Candidate Avatar & Details */}
                          <div className="flex items-start gap-4 flex-1">
                            <div className="p-3 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 border border-indigo-200 dark:border-indigo-800 text-indigo-600 shrink-0 mt-0.5 group-hover:scale-105 transition-transform">
                              <UserSearch className="h-6 w-6" />
                            </div>

                            <div className="space-y-1.5 flex-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <h3 className="text-base sm:text-lg font-bold text-foreground group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                                  {seeker.name}
                                </h3>
                                <Badge variant="outline" className="text-[11px] bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 border-indigo-200 font-semibold">
                                  Available Candidate
                                </Badge>
                              </div>
                              <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                                {seeker.summary}
                              </p>
                            </div>
                          </div>

                          {/* Action Button */}
                          <div className="flex items-center justify-between sm:justify-end gap-3 pt-3 sm:pt-0 border-t sm:border-t-0 border-border/50 shrink-0">
                            {isOwner && (
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-8 w-8 text-destructive hover:bg-destructive/10"
                                onClick={(e) => {
                                  e.preventDefault();
                                  handleDeleteSeeker(seeker.id);
                                }}
                                title="Delete Profile"
                              >
                                {isDeleting === seeker.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                              </Button>
                            )}

                            <Button 
                              size="sm" 
                              className="h-9 px-4 text-xs font-semibold gap-1.5 shadow-xs shrink-0 bg-indigo-600 hover:bg-indigo-700 text-white group-hover:translate-x-0.5 transition-transform"
                            >
                              <span>View Profile</span>
                              <ArrowRight className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                );
              })}
            </div>
          ) : (
            <Card className="p-8 text-center border-dashed">
              <UserSearch className="h-12 w-12 text-muted-foreground/40 mx-auto mb-3" />
              <h3 className="text-lg font-bold">No Job Seekers Found</h3>
              <p className="text-sm text-muted-foreground mt-1 max-w-sm mx-auto">
                {searchQuery ? `No candidates matched "${searchQuery}".` : "No job seeker profiles posted in this community yet."}
              </p>
              <Button asChild size="sm" className="mt-4 bg-indigo-600 hover:bg-indigo-700 text-white">
                <Link href="/jobs/create-seeker">
                  <UserPlus className="mr-1.5 h-4 w-4" /> Post Candidate Profile
                </Link>
              </Button>
            </Card>
          )}
        </TabsContent>

        {/* Tab 3: Recommended Matches for User */}
        {user && (
          <TabsContent value="matches" className="mt-6 space-y-4">
            {recommendedJobs.length > 0 ? (
              <div className="grid grid-cols-1 gap-4">
                {recommendedJobs.map((job) => (
                  <Link key={job.id} href={`/jobs/${job.id}`} className="block group transition-all duration-200">
                    <Card className="overflow-hidden border-2 border-purple-300 dark:border-purple-800 bg-gradient-to-r from-purple-50/50 via-background to-indigo-50/50 dark:from-purple-950/20 dark:to-indigo-950/20 cursor-pointer shadow-xs group-hover:shadow-md">
                      <CardContent className="p-5 sm:p-6">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                          <div className="flex items-start gap-4 flex-1">
                            <div className="p-3 rounded-xl bg-purple-600 text-white shadow-xs shrink-0 mt-0.5">
                              <Sparkles className="h-6 w-6" />
                            </div>
                            <div className="space-y-1.5 flex-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <h3 className="text-base sm:text-lg font-bold text-foreground group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors">
                                  {job.title}
                                </h3>
                                <Badge className="bg-purple-600 text-white text-[11px] font-bold gap-1">
                                  <Sparkles className="h-3 w-3" /> Recommended Match
                                </Badge>
                              </div>
                              <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                                {job.shortDescription}
                              </p>
                            </div>
                          </div>

                          <Button 
                            size="sm" 
                            className="h-9 px-4 text-xs font-semibold gap-1.5 shadow-xs shrink-0 bg-purple-600 hover:bg-purple-700 text-white group-hover:translate-x-0.5 transition-transform"
                          >
                            <span>View Match</span>
                            <ArrowRight className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                ))}
              </div>
            ) : (
              <Card className="p-8 text-center border-dashed">
                <Sparkles className="h-12 w-12 text-purple-400 mx-auto mb-3" />
                <h3 className="text-lg font-bold">No Matches Yet</h3>
                <p className="text-sm text-muted-foreground mt-1 max-w-sm mx-auto">
                  Create a Job Seeker Profile or add bio details to receive automated job recommendations matched to your background!
                </p>
                <Button asChild size="sm" className="mt-4 bg-purple-600 hover:bg-purple-700 text-white">
                  <Link href="/jobs/create-seeker">
                    <UserPlus className="mr-1.5 h-4 w-4" /> Create Seeker Profile
                  </Link>
                </Button>
              </Card>
            )}
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}