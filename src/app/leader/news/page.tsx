
"use client";

import * as React from "react";
import {
    Newspaper,
    MoreHorizontal,
    User,
    BadgeCheck,
    FileEdit,
    Trash2,
    PlusCircle,
    UserX,
    Eye,
    FilterX,
    Archive,
    ThumbsDown,
    Clock,
    Info,
    Loader2,
    AlertTriangle,
    RotateCw,
    XCircle,
} from "lucide-react"
import { Button } from "@/components/ui/button";
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
  CardFooter,
} from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { add, differenceInDays, format } from "date-fns";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { collection, query, where, onSnapshot } from "firebase/firestore";
import { useFirestore, useUser, useDoc, useMemoFirebase } from "@/firebase";
import Link from "next/link";
import { useToast } from "@/hooks/use-toast";
import { updateNewsStoryStatus } from "@/lib/actions/newsActions";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { getPricingPlans, type Plan } from "@/lib/actions/pricingActions";
import { doc } from "firebase/firestore";
import { useIsMobile } from "@/hooks/use-mobile";
import { PaginationControls } from "@/components/ui/pagination";


type Reporter = {
    id: string;
    name: string;
    email: string;
    avatar: string;
};

type NewsStory = {
    id: string;
    title: string;
    author: string;
    category: string;
    status: "Published" | "Pending Approval" | "Draft" | "Archived" | "Requires Amendment" | "Declined";
    date: string;
    removalReason?: string;
    createdAt: { toDate: () => Date };
    submittedAt?: { toDate: () => Date };
}

const ReporterRow = React.memo(({ reporter, onAuthorClick }: { reporter: Reporter, onAuthorClick: (authorName: string) => void }) => {
    return (
         <TableRow className="block md:table-row border-b md:border-b-0">
            <TableCell className="block md:table-cell" data-label="Reporter">
                 <div className="flex items-center gap-4">
                    <Avatar>
                        <AvatarImage src={reporter.avatar} alt={reporter.name} />
                        <AvatarFallback>{reporter.name.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <div>
                        <Button variant="link" className="p-0 h-auto font-medium" onClick={() => onAuthorClick(reporter.name)}>
                            {reporter.name}
                        </Button>
                        <div className="text-sm text-muted-foreground">{reporter.email}</div>
                    </div>
                </div>
            </TableCell>
            <TableCell className="block md:table-cell text-right" data-label="Actions">
                <Button variant="outline" size="sm">
                    <UserX className="mr-2 h-4 w-4" />
                    Remove
                </Button>
            </TableCell>
        </TableRow>
    )
});
ReporterRow.displayName = 'ReporterRow';

const ReporterCard = ({ reporter, onAuthorClick }: { reporter: Reporter, onAuthorClick: (authorName: string) => void }) => (
    <Card className="flex items-center p-3">
        <Avatar className="h-10 w-10 mr-3">
            <AvatarImage src={reporter.avatar} alt={reporter.name} />
            <AvatarFallback>{reporter.name.charAt(0)}</AvatarFallback>
        </Avatar>
        <div className="flex-1 truncate">
             <Button variant="link" className="p-0 h-auto font-medium truncate" onClick={() => onAuthorClick(reporter.name)}>
                {reporter.name}
            </Button>
            <p className="text-xs text-muted-foreground truncate">{reporter.email}</p>
        </div>
        <Button variant="outline" size="sm" className="ml-2">
            <UserX className="mr-2 h-4 w-4" />
            Remove
        </Button>
    </Card>
);



const NewsStoryRow = React.memo(({ story, onAction, canEdit, canApprove }: { story: NewsStory, onAction: (story: NewsStory, action: 'archive' | 'delete' | 'decline' | 'request-edit' | 'approve') => void, canEdit: boolean, canApprove: boolean}) => {
    return (
        <TableRow className="block md:table-row border-b md:border-b-0">
            <TableCell className="block md:table-cell" data-label="Title">{story.title}</TableCell>
            <TableCell className="block md:table-cell" data-label="Author">{story.author}</TableCell>
            <TableCell className="block md:table-cell" data-label="Category">{story.category}</TableCell>
            <TableCell className="block md:table-cell" data-label="Date">{story.date}</TableCell>
            <TableCell className="block md:table-cell" data-label="Status">{story.status}</TableCell>
            <TableCell className="block md:table-cell text-right" data-label="Actions">
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0">
                            <span className="sr-only">Open menu</span>
                            <MoreHorizontal className="h-4 w-4" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Actions</DropdownMenuLabel>
                        <DropdownMenuItem asChild>
                            <Link href={`/news/${story.id}`}><Eye className="mr-2 h-4 w-4" /> View Story</Link>
                        </DropdownMenuItem>
                        
                        {canEdit && story.status !== "Archived" && <DropdownMenuItem asChild><Link href={`/leader/news/edit/${story.id}`}><FileEdit className="mr-2 h-4 w-4" /> Edit Story</Link></DropdownMenuItem>}
                        
                        {(story.status !== "Archived" && story.status !== "Published") && canEdit && <DropdownMenuSeparator />}

                        {story.status === "Pending Approval" && canApprove && (
                            <>
                                <DropdownMenuItem onClick={() => onAction(story, 'approve')}><BadgeCheck className="mr-2 h-4 w-4" /> Approve</DropdownMenuItem>
                                <DropdownMenuItem onClick={() => onAction(story, 'request-edit')}><FileEdit className="mr-2 h-4 w-4" /> Request Edit</DropdownMenuItem>
                                <DropdownMenuItem className="text-destructive focus:bg-destructive/10 focus:text-destructive" onClick={() => onAction(story, 'decline')}>
                                    <ThumbsDown className="mr-2 h-4 w-4" /> Decline Story
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                            </>
                        )}
                         {story.status !== "Archived" && canEdit && (
                            <DropdownMenuItem onClick={() => onAction(story, 'archive')}>
                                <Archive className="mr-2 h-4 w-4" />
                                Archive Story
                            </DropdownMenuItem>
                        )}

                        {story.status === "Archived" && canEdit &&(
                            <DropdownMenuItem className="text-destructive focus:bg-destructive/10 focus:text-destructive" onClick={() => onAction(story, 'delete')}>
                                <Trash2 className="mr-2 h-4 w-4" />
                                Delete Permanently
                            </DropdownMenuItem>
                        )}
                    </DropdownMenuContent>
                </DropdownMenu>
            </TableCell>
        </TableRow>
    )
});
NewsStoryRow.displayName = 'NewsStoryRow';

const NewsStoryCard = React.memo(({ story, onAction, canEdit, canApprove }: { story: NewsStory, onAction: (story: NewsStory, action: 'archive' | 'delete' | 'decline' | 'request-edit' | 'approve') => void, canEdit: boolean, canApprove: boolean}) => (
    <Card>
        <CardHeader>
            <CardTitle className="text-base">{story.title}</CardTitle>
            <CardDescription>{story.author} - {story.date}</CardDescription>
        </CardHeader>
        <CardContent>
             <p className="text-sm text-muted-foreground">Category: {story.category}</p>
             <p className="text-sm text-muted-foreground">Status: {story.status}</p>
        </CardContent>
        <CardFooter>
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm">Actions</Button>
                </DropdownMenuTrigger>
                 <DropdownMenuContent align="end">
                    <DropdownMenuLabel>Actions</DropdownMenuLabel>
                    <DropdownMenuItem asChild>
                        <Link href={`/news/${story.id}`}><Eye className="mr-2 h-4 w-4" /> View Story</Link>
                    </DropdownMenuItem>
                    
                    {canEdit && story.status !== "Archived" && <DropdownMenuItem asChild><Link href={`/leader/news/edit/${story.id}`}><FileEdit className="mr-2 h-4 w-4" /> Edit Story</Link></DropdownMenuItem>}
                    
                    {(story.status !== "Archived" && story.status !== "Published") && canEdit && <DropdownMenuSeparator />}

                    {story.status === "Pending Approval" && canApprove && (
                        <>
                            <DropdownMenuItem onClick={() => onAction(story, 'approve')}><BadgeCheck className="mr-2 h-4 w-4" /> Approve</DropdownMenuItem>
                            <DropdownMenuItem onClick={() => onAction(story, 'request-edit')}><FileEdit className="mr-2 h-4 w-4" /> Request Edit</DropdownMenuItem>
                            <DropdownMenuItem className="text-destructive focus:bg-destructive/10 focus:text-destructive" onClick={() => onAction(story, 'decline')}>
                                <ThumbsDown className="mr-2 h-4 w-4" /> Decline Story
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                        </>
                    )}
                        {story.status !== "Archived" && canEdit && (
                        <DropdownMenuItem onClick={() => onAction(story, 'archive')}>
                            <Archive className="mr-2 h-4 w-4" />
                            Archive Story
                        </DropdownMenuItem>
                    )}

                    {story.status === "Archived" && canEdit &&(
                        <DropdownMenuItem className="text-destructive focus:bg-destructive/10 focus:text-destructive" onClick={() => onAction(story, 'delete')}>
                            <Trash2 className="mr-2 h-4 w-4" />
                            Delete Permanently
                        </DropdownMenuItem>
                    )}
                </DropdownMenuContent>
            </DropdownMenu>
        </CardFooter>
    </Card>
));
NewsStoryCard.displayName = 'NewsStoryCard';


export default function LeaderNewsPage() {
    const { user, isUserLoading: authLoading } = useUser();
    const { toast } = useToast();
    const db = useFirestore();
    
    const [storyToAction, setStoryToAction] = React.useState<NewsStory | null>(null);
    const [actionType, setActionType] = React.useState<'archive' | 'delete' | 'decline' | 'request-edit' | 'approve' | null>(null);
    const [removalReason, setRemovalReason] = React.useState("");
    const [authorFilter, setAuthorFilter] = React.useState<string | null>(null);
    const [reportersData, setReportersData] = React.useState<Reporter[]>([]);
    const [newsData, setNewsData] = React.useState<NewsStory[]>([]);
    const [loading, setLoading] = React.useState(true);
    const [enterprisePlan, setEnterprisePlan] = React.useState<Plan | null>(null);
    const isMobile = useIsMobile();
    const [archivedPagination, setArchivedPagination] = React.useState({ pageIndex: 0, pageSize: 10 });


    const userProfileRef = useMemoFirebase(() => (user ? doc(db, 'users', user.uid) : null), [user, db]);
    const { data: userProfile, isLoading: profileLoading } = useDoc(userProfileRef);

    const permissions = (userProfile as any)?.permissions || {};
    const canManageNews = userProfile?.role === 'president' || permissions.actionApproveNews;
    const canEditNews = userProfile?.role === 'president' || permissions.actionEditNews;


    React.useEffect(() => {
        if (authLoading || !userProfile?.communityId || !db) {
            setLoading(false);
            return;
        };

        const reportersQuery = query(collection(db, "users"), where("communityId", "==", userProfile.communityId), where("role", "==", "reporter"));
        const newsQuery = query(collection(db, "news"), where("communityId", "==", userProfile.communityId));

        const unsubscribeReporters = onSnapshot(reportersQuery, (snapshot) => {
            setReportersData(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Reporter)));
        });

        const unsubscribeNews = onSnapshot(newsQuery, (snapshot) => {
            setNewsData(snapshot.docs.map(doc => ({ 
                id: doc.id, 
                ...doc.data(), 
                date: doc.data().date?.toDate ? format(doc.data().date.toDate(), "yyyy-MM-dd") : format(new Date(), "yyyy-MM-dd") 
            } as NewsStory)));
            setLoading(false);
        });

        const fetchPlans = async () => {
            const plans = await getPricingPlans();
            if (plans.enterprise) {
                setEnterprisePlan(plans.enterprise);
            }
        };
        fetchPlans();
        
        return () => {
            unsubscribeReporters();
            unsubscribeNews();
        };
    }, [userProfile?.communityId, authLoading, db]);

    const handleAction = (story: NewsStory, action: 'archive' | 'delete' | 'decline' | 'request-edit' | 'approve') => {
        if (action === 'approve') {
            handleConfirmAction(story.id, 'Published');
        } else {
            setStoryToAction(story);
            setActionType(action);
        }
    };

    const handleConfirmAction = async (storyId?: string, status?: NewsStory['status']) => {
        const id = storyId || storyToAction?.id;
        const finalStatus = status || (actionType === 'archive' ? 'Archived' : actionType === 'delete' ? 'Archived' : actionType === 'decline' ? 'Declined' : 'Requires Amendment');
        
        if (!id) return;
        
        const result = await updateNewsStoryStatus({
            storyId: id,
            status: finalStatus,
            amendmentReason: (actionType === 'request-edit' || actionType === 'decline') ? removalReason : undefined
        });

        if (result.success) {
            toast({
                title: "Success",
                description: `The story has been successfully ${finalStatus.toLowerCase()}.`,
            });
        } else {
             toast({
                title: "Error",
                description: result.error,
                variant: "destructive",
            });
        }
        
        // Reset state
        setStoryToAction(null);
        setActionType(null);
        setRemovalReason("");
    };
    
    const activeNews = newsData.filter(story => story.status !== "Archived" && (!authorFilter || story.author === authorFilter));
    const archivedNews = newsData.filter(story => story.status === "Archived");
    
    const paginatedArchived = React.useMemo(() => {
        const start = archivedPagination.pageIndex * archivedPagination.pageSize;
        return archivedNews.slice(start, start + archivedPagination.pageSize);
    }, [archivedNews, archivedPagination]);
    
    const archivedPageCount = Math.ceil(archivedNews.length / archivedPagination.pageSize);


    const getDialogDescription = () => {
        if (!storyToAction || !actionType) return "";
        const baseText = `You are about to ${actionType} the story: "${storyToAction.title}".`;
        switch(actionType) {
            case 'archive': return `${baseText} This will remove it from the public view. Please provide a reason for archiving.`;
            case 'delete': return `${baseText} This action is permanent and cannot be undone. Provide a reason for deletion.`;
            case 'decline': return `${baseText} This will reject the submission. Please provide feedback for the author.`;
            case 'request-edit': return `${baseText} This will send it back to the author with your notes. Please provide clear feedback on what needs to be changed.`;
            default: return baseText;
        }
    };
    
    const yearlyArticleLimit = 12;
    const additionalCost = 5;
    const currentYearlyCount = newsData.filter(story => story.createdAt && story.createdAt.toDate().getFullYear() === new Date().getFullYear()).length;


  return (
    <>
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight font-headline flex items-center gap-2">
          <Newspaper className="h-8 w-8" />
          News Management
        </h1>
        <p className="text-muted-foreground">
          Appoint community reporters and manage news stories for your community.
        </p>
      </div>

       {userProfile?.role === 'enterprise' && (
          <Alert>
            <Info className="h-4 w-4" />
            <AlertTitle>News Article Rules for Private Hubs</AlertTitle>
            <AlertDescription>
              Your account includes {yearlyArticleLimit} free news articles per year. Additional articles can be purchased for £{additionalCost} each.
            </AlertDescription>
          </Alert>
      )}

        <div className="grid lg:grid-cols-3 gap-8">
            <div className="lg:col-span-1">
                 <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2"><User className="h-5 w-5" /> Community Reporters</CardTitle>
                        <CardDescription>Members who can create and submit news stories. Click a reporter to filter stories.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        {loading ? <div className="flex justify-center items-center h-24"><Loader2 className="mx-auto h-6 w-6 animate-spin"/></div>
                        : reportersData.length > 0 ? (
                            isMobile ? (
                                <div className="space-y-2">
                                    {reportersData.map(reporter => <ReporterCard key={reporter.id} reporter={reporter} onAuthorClick={setAuthorFilter} />)}
                                </div>
                            ) : (
                                <Table className="responsive-table">
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Reporter</TableHead>
                                        <TableHead className="text-right">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                    <TableBody>
                                        {reportersData.map(reporter => <ReporterRow key={reporter.id} reporter={reporter} onAuthorClick={setAuthorFilter} />)}
                                    </TableBody>
                                </Table>
                            )
                        ) : (
                            <p className="text-sm text-muted-foreground text-center py-4">No reporters assigned.</p>
                        )}
                    </CardContent>
                </Card>
            </div>
            <div className="lg:col-span-2">
                <Card>
                    <CardHeader>
                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                            <div>
                                <CardTitle>News Stories</CardTitle>
                                <CardDescription>
                                    {(userProfile as any)?.isPrivateCommunity 
                                        ? `You have used ${currentYearlyCount} of your ${yearlyArticleLimit} free news articles this year.`
                                        : 'All news stories submitted for your community.'
                                    }
                                </CardDescription>
                            </div>
                           <div className="flex items-center gap-2">
                                {authorFilter && (
                                    <Button variant="ghost" onClick={() => setAuthorFilter(null)}>
                                        <FilterX className="mr-2 h-4 w-4" />
                                        Clear Filter
                                    </Button>
                                )}
                                <Button asChild disabled={!canEditNews}>
                                    <Link href="/leader/news/create">
                                        <PlusCircle className="mr-2 h-4 w-4" />
                                        Create Story
                                    </Link>
                                </Button>
                           </div>
                        </div>
                    </CardHeader>
                    <CardContent>
                        {isMobile ? (
                            loading ? <div className="h-48 flex items-center justify-center"><Loader2 className="mx-auto h-6 w-6 animate-spin"/></div> :
                            activeNews.length > 0 ? (
                                <div className="space-y-4">
                                {activeNews.map(story => (
                                    <NewsStoryCard key={story.id} story={story} onAction={handleAction} canEdit={canEditNews} canApprove={canManageNews} />
                                ))}
                                </div>
                            ) : (<p className="text-center py-8 text-muted-foreground">No news stories yet.</p>)
                        ) : (
                         <div className="rounded-md border">
                            <Table className="responsive-table">
                                <TableHeader>
                                   <TableRow>
                                        <TableHead className="w-[40%]">Title</TableHead>
                                        <TableHead>Author</TableHead>
                                        <TableHead>Category</TableHead>
                                        <TableHead>Date</TableHead>
                                        <TableHead>Status</TableHead>
                                        <TableHead className="text-right">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                     {loading ? <TableRow><TableCell colSpan={6} className="h-24 text-center"><Loader2 className="mx-auto h-6 w-6 animate-spin"/></TableCell></TableRow>
                                     : activeNews.length > 0 ? (
                                        activeNews.map((row) => (
                                            <NewsStoryRow key={row.id} story={row} onAction={handleAction} canEdit={canEditNews} canApprove={canManageNews} />
                                        ))
                                    ) : (
                                    <TableRow>
                                        <TableCell
                                        colSpan={6}
                                        className="h-24 text-center"
                                        >
                                        No news stories yet.
                                        </TableCell>
                                    </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>

        <div className="mt-8">
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2"><Archive className="h-5 w-5" /> Archived Stories</CardTitle>
                    <CardDescription>Stories that have been published and then removed. These are permanently deleted after 6 months.</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="rounded-md border">
                            <Table className="responsive-table">
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Title</TableHead>
                                    <TableHead>Category</TableHead>
                                    <TableHead>Date Archived</TableHead>
                                    <TableHead>Reason</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {loading ? <TableRow><TableCell colSpan={5} className="h-24 text-center"><Loader2 className="mx-auto h-6 w-6 animate-spin"/></TableCell></TableRow>
                                : paginatedArchived.length > 0 ? (
                                paginatedArchived.map((story) => {
                                     const archiveDate = new Date(story.date);
                                    const deletionDate = add(archiveDate, { months: 6 });
                                    const daysRemaining = differenceInDays(deletionDate, new Date());
                                    const isDeletable = daysRemaining <= 0;
                                    return (
                                        <TableRow key={story.id} className="block md:table-row border-b md:border-b-0">
                                            <TableCell className="block md:table-cell" data-label="Title">
                                                <span>{story.title}</span>
                                                <div className="text-xs text-muted-foreground flex items-center gap-1.5 mt-1">
                                                    <Clock className="h-3 w-3" />
                                                    {isDeletable
                                                        ? 'Eligible for deletion'
                                                        : `Deletable in ${daysRemaining} days`
                                                    }
                                                    (on {format(deletionDate, "PPP")})
                                                </div>
                                            </TableCell>
                                            <TableCell className="block md:table-cell" data-label="Category">{story.category}</TableCell>
                                            <TableCell className="block md:table-cell" data-label="Date Archived">{story.date}</TableCell>
                                            <TableCell className="block md:table-cell" data-label="Reason">
                                                 <TooltipProvider>
                                                    <Tooltip>
                                                        <TooltipTrigger asChild>
                                                            <Button variant="ghost" size="icon" className="h-8 w-8">
                                                                <Info className="h-4 w-4" />
                                                            </Button>
                                                        </TooltipTrigger>
                                                        <TooltipContent>
                                                            <p className="max-w-xs">{story.removalReason}</p>
                                                        </TooltipContent>
                                                    </Tooltip>
                                                </TooltipProvider>
                                            </TableCell>
                                            <TableCell className="block md:table-cell text-right" data-label="Actions">
                                                <DropdownMenu>
                                                    <DropdownMenuTrigger asChild>
                                                        <Button variant="ghost" className="h-8 w-8 p-0">
                                                            <span className="sr-only">Open menu</span>
                                                            <MoreHorizontal className="h-4 w-4" />
                                                        </Button>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent align="end">
                                                        <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                                        <DropdownMenuItem><Eye className="mr-2 h-4 w-4" /> View Original Story</DropdownMenuItem>
                                                        <DropdownMenuSeparator />
                                                        <DropdownMenuItem className="text-destructive focus:bg-destructive/10 focus:text-destructive" onClick={() => handleAction(story, 'delete')}>
                                                            <Trash2 className="mr-2 h-4 w-4" />
                                                            Delete Permanently
                                                        </DropdownMenuItem>
                                                    </DropdownMenuContent>
                                                </DropdownMenu>
                                            </TableCell>
                                        </TableRow>
                                    )
                                })
                                ) : (
                                <TableRow>
                                    <TableCell
                                    colSpan={5}
                                    className="h-24 text-center"
                                    >
                                    No archived stories.
                                    </TableCell>
                                </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </div>
                     <PaginationControls pagination={archivedPagination} setPagination={setArchivedPagination} pageCount={archivedPageCount} totalRows={archivedNews.length} />
                </CardContent>
            </Card>
        </div>
    </div>
    <Dialog open={!!storyToAction} onOpenChange={() => setStoryToAction(null)}>
        <DialogContent>
            <DialogHeader>
                <DialogTitle>Confirm Action: {actionType ? (actionType.charAt(0).toUpperCase() + actionType.slice(1)) : ''}</DialogTitle>
                <DialogDescription>
                  {getDialogDescription()}
                </DialogDescription>
            </DialogHeader>
             {(actionType === 'decline' || actionType === 'request-edit' || actionType === 'archive') && (
                <div className="py-4">
                    <div className="space-y-2">
                        <Label htmlFor="removal-reason">Reason for Action (Optional)</Label>
                        <Textarea
                            id="removal-reason"
                            placeholder={`Provide a brief reason...`}
                            value={removalReason}
                            onChange={(e) => setRemovalReason(e.target.value)}
                            className="min-h-[120px]"
                        />
                    </div>
                </div>
            )}
            <DialogFooter>
                <Button variant="outline" onClick={() => setStoryToAction(null)}>Cancel</Button>
                <Button variant={actionType === 'archive' || actionType === 'delete' || actionType === 'decline' ? 'destructive' : 'default'} onClick={() => handleConfirmAction()}>Confirm {actionType ? (actionType.charAt(0).toUpperCase() + actionType.slice(1).replace('-', ' ')) : ''}</Button>
            </DialogFooter>
        </DialogContent>
    </Dialog>
    </>
  );
}

