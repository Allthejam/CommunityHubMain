"use client";

import * as React from "react";
import {
  MessageSquare,
  ThumbsUp,
  ThumbsDown,
  Archive,
  ArrowUpDown,
  ChevronsLeft,
  ChevronLeft,
  ChevronRight,
  ChevronsRight,
  Loader2,
} from "lucide-react";
import { useUser, useFirestore, useDoc, useMemoFirebase } from "@/firebase";
import { collection, onSnapshot, query, where, doc } from "firebase/firestore";
import { format } from "date-fns";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { updateFeedbackStatusAction } from "@/lib/actions/feedbackActions";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

type FeedbackItem = {
  id: string;
  feedbackText: string;
  authorName: string;
  createdAt: { toDate: () => Date };
  status: 'New' | 'Read' | 'Actioned' | 'Archived';
  category: string;
};


const PaginationControls = ({ pagination, setPagination, pageCount, totalRows }: {
    pagination: { pageIndex: number; pageSize: number; };
    setPagination: React.Dispatch<React.SetStateAction<{ pageIndex: number; pageSize: number; }>>;
    pageCount: number;
    totalRows: number;
}) => (
       <div className="flex flex-col sm:flex-row items-center justify-between gap-4 py-4">
            <div className="flex-1 text-sm text-muted-foreground">
                {totalRows} total row(s).
            </div>
            <div className="flex flex-col sm:flex-row items-center gap-4 sm:gap-6 lg:gap-8">
                <div className="flex items-center space-x-2">
                    <p className="text-sm font-medium">Rows per page</p>
                    <Select
                        value={`${pagination.pageSize}`}
                        onValueChange={(value) => {
                            setPagination({ pageIndex: 0, pageSize: Number(value) });
                        }}
                        >
                        <SelectTrigger className="h-8 w-[70px]">
                            <SelectValue placeholder={`${pagination.pageSize}`} />
                        </SelectTrigger>
                        <SelectContent side="top">
                            {[10, 20, 30, 40, 50].map((pageSize) => (
                            <SelectItem key={pageSize} value={`${pageSize}`}>
                                {pageSize}
                            </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
                <div className="flex w-full sm:w-[100px] items-center justify-center text-sm font-medium">
                    Page {pagination.pageIndex + 1} of{" "}
                    {pageCount || 1}
                </div>
                <div className="flex items-center space-x-2">
                    <Button variant="outline" className="hidden h-8 w-8 p-0 lg:flex" onClick={() => setPagination(p => ({ ...p, pageIndex: 0 }))} disabled={pagination.pageIndex === 0}><span className="sr-only">Go to first page</span><ChevronsLeft className="h-4 w-4" /></Button>
                    <Button variant="outline" className="h-8 w-8 p-0" onClick={() => setPagination(p => ({ ...p, pageIndex: p.pageIndex - 1 }))} disabled={pagination.pageIndex === 0}><span className="sr-only">Go to previous page</span><ChevronLeft className="h-4 w-4" /></Button>
                    <Button variant="outline" className="h-8 w-8 p-0" onClick={() => setPagination(p => ({ ...p, pageIndex: p.pageIndex + 1 }))} disabled={pagination.pageIndex >= pageCount - 1}><span className="sr-only">Go to next page</span><ChevronRight className="h-4 w-4" /></Button>
                    <Button variant="outline" className="hidden h-8 w-8 p-0 lg:flex" onClick={() => setPagination(p => ({ ...p, pageIndex: pageCount - 1 }))} disabled={pagination.pageIndex >= pageCount - 1}><span className="sr-only">Go to last page</span><ChevronsRight className="h-4 w-4" /></Button>
                </div>
            </div>
        </div>
);


export default function LeaderFeedbackPage() {
  const { user, isUserLoading } = useUser();
  const db = useFirestore();
  const userProfileRef = useMemoFirebase(() => (user ? doc(db, 'users', user.uid) : null), [user, db]);
  const { data: userProfile, isLoading: profileLoading } = useDoc(userProfileRef);

  const [allFeedback, setAllFeedback] = React.useState<FeedbackItem[]>([]);
  const [loading, setLoading] = React.useState(true);
  const { toast } = useToast();

  const [pendingPagination, setPendingPagination] = React.useState({ pageIndex: 0, pageSize: 10 });
  const [pendingSorting, setPendingSorting] = React.useState<{ key: keyof FeedbackItem; order: 'asc' | 'desc' }>({ key: 'createdAt', order: 'desc' });
  
  const [livePagination, setLivePagination] = React.useState({ pageIndex: 0, pageSize: 10 });
  const [liveSorting, setLiveSorting] = React.useState<{ key: keyof FeedbackItem; order: 'asc' | 'desc' }>({ key: 'createdAt', order: 'desc' });
  
  const [archivedPagination, setArchivedPagination] = React.useState({ pageIndex: 0, pageSize: 10 });
  const [archivedSorting, setArchivedSorting] = React.useState<{ key: keyof FeedbackItem; order: 'asc' | 'desc' }>({ key: 'createdAt', order: 'desc' });


  React.useEffect(() => {
    if (isUserLoading || profileLoading || !userProfile?.communityId || !db) {
      setLoading(false);
      return;
    }
    setLoading(true);

    const q = query(collection(db, "communities", userProfile.communityId, "feedback"));

    const unsubscribe = onSnapshot(q, (snapshot) => {
        const feedbackItems = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        } as FeedbackItem));
        setAllFeedback(feedbackItems);
        setLoading(false);
    }, (error) => {
        console.error("Error fetching feedback:", error);
        toast({ title: "Error", description: "Could not fetch feedback data.", variant: "destructive" });
        setLoading(false);
    });

    return () => unsubscribe();
  }, [userProfile, isUserLoading, profileLoading, toast, db]);

  const handleAction = async (id: string, status: 'Read' | 'Archived') => {
      const result = await updateFeedbackStatusAction({ id, communityId: userProfile?.communityId || "", status });
      if (result.success) {
          toast({
              title: "Moderation Successful",
              description: `The feedback has been marked as ${status}.`
          });
      } else {
           toast({
              title: "Error",
              description: result.error,
              variant: "destructive"
          });
      }
  }

  const createSortHandler = (setter: React.Dispatch<React.SetStateAction<{ key: keyof FeedbackItem; order: 'asc' | 'desc' }>>) => (key: keyof FeedbackItem) => {
    setter(prev => ({
        key,
        order: prev.key === key && prev.order === 'asc' ? 'desc' : 'asc'
    }));
  };

  const sortAndPaginate = (data: FeedbackItem[], sorting: { key: keyof FeedbackItem; order: 'asc' | 'desc' }, pagination: { pageIndex: number; pageSize: number; }) => {
    const sorted = [...data].sort((a,b) => {
        const valA = a[sorting.key as keyof FeedbackItem] ?? '';
        const valB = b[sorting.key as keyof FeedbackItem] ?? '';
        const order = sorting.order === 'asc' ? 1 : -1;
        if (typeof valA === 'string' && typeof valB === 'string') return valA.localeCompare(valB) * order;
        if (valA < valB) return -1 * order;
        if (valA > valB) return 1 * order;
        return 0;
     });
     const start = pagination.pageIndex * pagination.pageSize;
     return sorted.slice(start, start + pagination.pageSize);
  };

  const pendingFeedback = React.useMemo(() => allFeedback.filter(item => item.status === 'New'), [allFeedback]);
  const paginatedPending = sortAndPaginate(pendingFeedback, pendingSorting, pendingPagination);
  const pendingPageCount = Math.ceil(pendingFeedback.length / pendingPagination.pageSize);
  
  const readFeedback = React.useMemo(() => allFeedback.filter(item => item.status === 'Read'), [allFeedback]);
  const paginatedLive = sortAndPaginate(readFeedback, liveSorting, livePagination);
  const livePageCount = Math.ceil(readFeedback.length / livePagination.pageSize);
  
  const archivedItems = React.useMemo(() => allFeedback.filter(item => item.status === 'Archived' || item.status === 'Actioned'), [allFeedback]);
  const paginatedArchived = sortAndPaginate(archivedItems, archivedSorting, archivedPagination);
  const archivedPageCount = Math.ceil(archivedItems.length / archivedPagination.pageSize);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight font-headline flex items-center gap-2">
          <MessageSquare className="h-8 w-8" />
          Feedback Moderation
        </h1>
        <p className="text-muted-foreground">
          Review and archive feedback from your community.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>New Feedback</CardTitle>
          <CardDescription>
            These are new, unread feedback submissions from community members.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead><Button variant="ghost" onClick={() => createSortHandler(setPendingSorting)('feedbackText')}>Feedback <ArrowUpDown className="ml-2 h-4 w-4" /></Button></TableHead>
                  <TableHead><Button variant="ghost" onClick={() => createSortHandler(setPendingSorting)('category')}>Category <ArrowUpDown className="ml-2 h-4 w-4" /></Button></TableHead>
                  <TableHead><Button variant="ghost" onClick={() => createSortHandler(setPendingSorting)('createdAt')}>Date <ArrowUpDown className="ml-2 h-4 w-4" /></Button></TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                    <TableRow>
                        <TableCell colSpan={4} className="h-24 text-center">
                            <Loader2 className="h-6 w-6 animate-spin mx-auto" />
                        </TableCell>
                    </TableRow>
                ) : paginatedPending.length > 0 ? (
                    paginatedPending.map(item => (
                        <TableRow key={item.id}>
                            <TableCell className="max-w-md whitespace-pre-wrap">{item.feedbackText}</TableCell>
                            <TableCell className="capitalize">{item.category?.replace('_', ' ')}</TableCell>
                            <TableCell>{item.createdAt ? format(item.createdAt.toDate(), "PPP") : 'N/A'}</TableCell>
                            <TableCell className="text-right space-x-2">
                                <Button size="sm" variant="outline" onClick={() => handleAction(item.id, 'Read')}>
                                    <ThumbsUp className="mr-2 h-4 w-4" /> Mark as Read
                                </Button>
                                <Button size="sm" variant="destructive" onClick={() => handleAction(item.id, 'Archived')}>
                                    <Archive className="mr-2 h-4 w-4" /> Archive
                                </Button>
                            </TableCell>
                        </TableRow>
                    ))
                ) : (
                    <TableRow>
                        <TableCell colSpan={4} className="h-24 text-center">
                            No new feedback to review.
                        </TableCell>
                    </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
           <PaginationControls pagination={pendingPagination} setPagination={setPendingPagination} pageCount={pendingPageCount} totalRows={pendingFeedback.length} />
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader>
          <CardTitle>Read Feedback</CardTitle>
          <CardDescription>
            Feedback you have reviewed but not yet archived.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                   <TableHead><Button variant="ghost" onClick={() => createSortHandler(setLiveSorting)('feedbackText')}>Feedback <ArrowUpDown className="ml-2 h-4 w-4" /></Button></TableHead>
                  <TableHead><Button variant="ghost" onClick={() => createSortHandler(setLiveSorting)('category')}>Category <ArrowUpDown className="ml-2 h-4 w-4" /></Button></TableHead>
                  <TableHead><Button variant="ghost" onClick={() => createSortHandler(setLiveSorting)('createdAt')}>Date <ArrowUpDown className="ml-2 h-4 w-4" /></Button></TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                    <TableRow>
                        <TableCell colSpan={4} className="h-24 text-center">
                            <Loader2 className="h-6 w-6 animate-spin mx-auto" />
                        </TableCell>
                    </TableRow>
                ) : paginatedLive.length > 0 ? (
                    paginatedLive.map(item => (
                        <TableRow key={item.id}>
                            <TableCell className="max-w-md whitespace-pre-wrap">{item.feedbackText}</TableCell>
                            <TableCell className="capitalize">{item.category?.replace('_', ' ')}</TableCell>
                            <TableCell>{item.createdAt ? format(item.createdAt.toDate(), "PPP") : 'N/A'}</TableCell>
                            <TableCell className="text-right space-x-2">
                                <Button size="sm" variant="outline" onClick={() => handleAction(item.id, 'Archived')}>
                                    <Archive className="mr-2 h-4 w-4" /> Archive
                                </Button>
                            </TableCell>
                        </TableRow>
                    ))
                ) : (
                    <TableRow>
                        <TableCell colSpan={4} className="h-24 text-center">
                            No read feedback found.
                        </TableCell>
                    </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
          <PaginationControls pagination={livePagination} setPagination={setLivePagination} pageCount={livePageCount} totalRows={readFeedback.length} />
        </CardContent>
      </Card>
      
      <Accordion type="single" collapsible className="w-full">
            <AccordionItem value="item-1">
                <AccordionTrigger>
                    <div className="flex items-center gap-2">
                        <Archive className="h-5 w-5" />
                        <h3 className="text-lg font-medium">Archived Feedback</h3>
                    </div>
                </AccordionTrigger>
                <AccordionContent>
                    <Card>
                        <CardHeader>
                            <CardDescription>A historical log of older and actioned feedback items.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="rounded-md border">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead><Button variant="ghost" onClick={() => createSortHandler(setArchivedSorting)('feedbackText')}>Feedback <ArrowUpDown className="ml-2 h-4 w-4" /></Button></TableHead>
                                            <TableHead><Button variant="ghost" onClick={() => createSortHandler(setArchivedSorting)('category')}>Category <ArrowUpDown className="ml-2 h-4 w-4" /></Button></TableHead>
                                            <TableHead><Button variant="ghost" onClick={() => createSortHandler(setArchivedSorting)('createdAt')}>Date <ArrowUpDown className="ml-2 h-4 w-4" /></Button></TableHead>
                                            <TableHead className="text-right">Status</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {loading ? (
                                            <TableRow>
                                                <TableCell colSpan={4} className="h-24 text-center">
                                                    <Loader2 className="h-6 w-6 animate-spin mx-auto" />
                                                </TableCell>
                                            </TableRow>
                                        ) : paginatedArchived.length > 0 ? (
                                            paginatedArchived.map(item => (
                                                <TableRow key={item.id}>
                                                    <TableCell className="max-w-md whitespace-pre-wrap">{item.feedbackText}</TableCell>
                                                    <TableCell className="capitalize">{item.category?.replace('_', ' ')}</TableCell>
                                                    <TableCell>{item.createdAt ? format(item.createdAt.toDate(), "PPP") : 'N/A'}</TableCell>
                                                    <TableCell className="text-right">
                                                        <Badge variant={item.status === 'Actioned' ? 'default' : 'outline'}>
                                                            {item.status}
                                                        </Badge>
                                                    </TableCell>
                                                </TableRow>
                                            ))
                                        ) : (
                                            <TableRow>
                                                <TableCell colSpan={4} className="h-24 text-center">
                                                    No archived feedback found.
                                                </TableCell>
                                            </TableRow>
                                        )}
                                    </TableBody>
                                </Table>
                            </div>
                           <PaginationControls pagination={archivedPagination} setPagination={setArchivedPagination} pageCount={archivedPageCount} totalRows={archivedItems.length} />
                        </CardContent>
                    </Card>
                </AccordionContent>
            </AccordionItem>
        </Accordion>
    </div>
  );
}
