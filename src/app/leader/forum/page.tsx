'use client';

import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { MessagesSquare, MessageSquare, Loader2, PlusCircle, ArrowLeft, MoreHorizontal, FileEdit, Trash2, Sparkles } from "lucide-react";
import Link from "next/link";
import { type ForumCategory, type Topic } from "@/lib/forum-data";
import { doc, collection, query, where } from "firebase/firestore";
import { useFirestore, useDoc, useCollection, useMemoFirebase, useUser } from "@/firebase";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { runCreateForumCategory, runUpdateForumCategory, runDeleteForumCategory, runSanitizeForumTopicsPrivacy } from "@/lib/actions/forumActions";
import { useIsMobile } from "@/hooks/use-mobile";

export default function LeaderForumPage() {
    const { user, isUserLoading } = useUser();
    const db = useFirestore();
    const isMobile = useIsMobile();
    const { toast } = useToast();

    const [isDialogOpen, setIsDialogOpen] = React.useState(false);
    const [isSaving, setIsSaving] = React.useState(false);
    const [editingCategory, setEditingCategory] = React.useState<Partial<ForumCategory> | null>(null);
    const [categoryName, setCategoryName] = React.useState("");
    const [categoryDescription, setCategoryDescription] = React.useState("");

    React.useEffect(() => {
        runSanitizeForumTopicsPrivacy().catch(console.error);
    }, []);
    
    const userProfileRef = useMemoFirebase(() => user && db ? doc(db, 'users', user.uid) : null, [user, db]);
    const { data: userProfile, isLoading: profileLoading } = useDoc(userProfileRef);

    const isDemo = typeof window !== 'undefined' && (sessionStorage.getItem('isDemoMode') === 'true' || window.location.pathname.startsWith('/demo'));
    const demoPrefix = isDemo ? '/demo' : '';

    const activeCommunityId = (typeof window !== 'undefined' ? sessionStorage.getItem('visitedCommunityId') : null) || userProfile?.primaryHomeCommunityId || userProfile?.homeCommunityId || userProfile?.communityId;

    const categoriesQuery = useMemoFirebase(() => {
        if (!activeCommunityId || !db) return null;
        return query(collection(db, "forum-categories"), where("communityId", "==", activeCommunityId));
    }, [db, activeCommunityId]);

    const allTopicsQuery = useMemoFirebase(() => {
        if (!db) return null;
        return query(collection(db, "forum-topics"));
    }, [db]);

    const { data: categories, isLoading: categoriesLoading, error } = useCollection<ForumCategory>(categoriesQuery);
    const { data: allTopics } = useCollection<Topic>(allTopicsQuery);

    // Live statistics map calculated from actual topics & replies in real time
    const categoryStatsMap = React.useMemo(() => {
        const map = new Map<string, { topics: number; posts: number }>();
        if (!allTopics) return map;
        for (const t of allTopics) {
            const catId = (t as any).categoryId;
            if (!catId) continue;
            const current = map.get(catId) || { topics: 0, posts: 0 };
            const replies = Number((t as any).replies || 0);
            map.set(catId, {
                topics: current.topics + 1,
                posts: current.posts + 1 + replies,
            });
        }
        return map;
    }, [allTopics]);

    const handleOpenDialog = (category?: ForumCategory) => {
        if (category) {
            setEditingCategory(category);
            setCategoryName(category.name);
            setCategoryDescription(category.description);
        } else {
            setEditingCategory(null);
            setCategoryName("");
            setCategoryDescription("");
        }
        setIsDialogOpen(true);
    };

    const handleSaveCategory = async () => {
        if (!categoryName.trim()) {
            toast({ title: "Error", description: "Category name is required.", variant: "destructive" });
            return;
        }

        setIsSaving(true);
        try {
            if (editingCategory?.id) {
                await runUpdateForumCategory(editingCategory.id, {
                    name: categoryName.trim(),
                    description: categoryDescription.trim(),
                });
                toast({ title: "Success", description: "Category updated successfully." });
            } else {
                await runCreateForumCategory({
                    name: categoryName.trim(),
                    description: categoryDescription.trim(),
                    communityId: activeCommunityId || 'default-community',
                });
                toast({ title: "Success", description: "Category created successfully." });
            }
            setIsDialogOpen(false);
            runSanitizeForumTopicsPrivacy().catch(console.error);
        } catch (err) {
            toast({ title: "Error", description: (err as Error).message || "Failed to save category.", variant: "destructive" });
        } finally {
            setIsSaving(false);
        }
    };

    const handleDeleteCategory = async (catId: string) => {
        if (!confirm("Are you sure you want to delete this category? All topics within may be orphaned.")) {
            return;
        }
        try {
            await runDeleteForumCategory(catId);
            toast({ title: "Success", description: "Category deleted." });
            runSanitizeForumTopicsPrivacy().catch(console.error);
        } catch (err) {
            toast({ title: "Error", description: (err as Error).message, variant: "destructive" });
        }
    };

    const sortedCategories = React.useMemo(() => {
        return categories ? [...categories].sort((a, b) => a.name.localeCompare(b.name)) : [];
    }, [categories]);

    const loading = isUserLoading || profileLoading || categoriesLoading;

    if (loading) {
        return (
            <div className="flex justify-center items-center h-96">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }
    
    if (error) {
        return (
            <div className="text-center py-12">
                <h1 className="text-2xl font-bold">Error</h1>
                <p className="text-muted-foreground mt-2">{error?.message || "Could not load categories."}</p>
                <Button asChild variant="link" className="mt-4">
                    <Link href={`${demoPrefix}/leader/dashboard`}>
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Return to Dashboard
                    </Link>
                </Button>
            </div>
        );
    }

    return (
        <>
            <div className="space-y-8">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight font-headline flex items-center gap-2">
                            <MessagesSquare className="h-8 w-8 text-primary" />
                            Manage Forum
                        </h1>
                        <p className="text-muted-foreground mt-1">
                            Create, edit, and manage the discussion categories for your community.
                        </p>
                    </div>
                    <Button onClick={() => handleOpenDialog()} className="shadow-sm">
                        <PlusCircle className="mr-2 h-4 w-4" />
                        Create Category
                    </Button>
                </div>

                <Card className="shadow-sm border-slate-200 dark:border-slate-800">
                    <CardHeader className="flex flex-row items-center justify-between">
                        <div>
                            <CardTitle>Forum Categories</CardTitle>
                            <CardDescription>
                                A list of all active discussion categories in your community.
                            </CardDescription>
                        </div>
                    </CardHeader>
                    <CardContent>
                        {/* Mobile View */}
                        <div className="md:hidden space-y-3">
                            {sortedCategories.length > 0 ? (
                                sortedCategories.map(category => {
                                    const liveStats = categoryStatsMap.get(category.id);
                                    const topicCount = liveStats !== undefined ? liveStats.topics : (category.topics || 0);
                                    const postCount = liveStats !== undefined ? liveStats.posts : (category.posts || 0);

                                    return (
                                        <Card key={category.id} className="border shadow-none">
                                            <CardContent className="p-4 flex items-start justify-between gap-4">
                                                <div className="flex-1 min-w-0">
                                                    <Link href={`${demoPrefix}/leader/forum/${category.id}`} className="font-semibold hover:underline text-base leading-tight text-foreground">
                                                        {category.name}
                                                    </Link>
                                                    <p className="text-xs text-muted-foreground mt-1 line-clamp-3">
                                                        {category.description}
                                                    </p>
                                                    <div className="flex items-center gap-3 mt-3 text-xs text-muted-foreground">
                                                        <span className="font-medium text-foreground">{topicCount} {topicCount === 1 ? 'Topic' : 'Topics'}</span>
                                                        <span>•</span>
                                                        <span className="font-medium text-foreground">{postCount} {postCount === 1 ? 'Post' : 'Posts'}</span>
                                                    </div>
                                                </div>
                                                <DropdownMenu>
                                                    <DropdownMenuTrigger asChild>
                                                        <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0">
                                                            <MoreHorizontal className="h-4 w-4" />
                                                        </Button>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent align="end">
                                                        <DropdownMenuItem onClick={() => handleOpenDialog(category)}>
                                                            <FileEdit className="mr-2 h-4 w-4" /> Edit
                                                        </DropdownMenuItem>
                                                        <DropdownMenuSeparator />
                                                        <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => handleDeleteCategory(category.id)}>
                                                            <Trash2 className="mr-2 h-4 w-4" /> Delete
                                                        </DropdownMenuItem>
                                                    </DropdownMenuContent>
                                                </DropdownMenu>
                                            </CardContent>
                                        </Card>
                                    );
                                })
                            ) : (
                                <div className="text-center py-10 text-muted-foreground">
                                    <p>No forum categories created yet.</p>
                                </div>
                            )}
                        </div>

                        {/* Desktop View */}
                        <div className="hidden md:block rounded-md border">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead className="w-[60%]">Category</TableHead>
                                        <TableHead className="text-center">Topics</TableHead>
                                        <TableHead className="text-center">Posts</TableHead>
                                        <TableHead className="text-right">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {sortedCategories.length > 0 ? (
                                        sortedCategories.map((category) => {
                                            const liveStats = categoryStatsMap.get(category.id);
                                            const topicCount = liveStats !== undefined ? liveStats.topics : (category.topics || 0);
                                            const postCount = liveStats !== undefined ? liveStats.posts : (category.posts || 0);

                                            return (
                                                <TableRow key={category.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-900/40">
                                                    <TableCell className="font-medium w-[60%]">
                                                        <Link href={`${demoPrefix}/leader/forum/${category.id}`} className="hover:underline text-base font-semibold text-primary">
                                                            {category.name}
                                                        </Link>
                                                        <p className="text-sm text-muted-foreground mt-1 font-normal">{category.description}</p>
                                                    </TableCell>
                                                    <TableCell className="text-center font-medium">
                                                        {topicCount}
                                                    </TableCell>
                                                    <TableCell className="text-center font-medium">
                                                        {postCount}
                                                    </TableCell>
                                                    <TableCell className="text-right">
                                                        <DropdownMenu>
                                                            <DropdownMenuTrigger asChild>
                                                                <Button variant="ghost" size="icon" className="h-8 w-8">
                                                                    <MoreHorizontal className="h-4 w-4" />
                                                                </Button>
                                                            </DropdownMenuTrigger>
                                                            <DropdownMenuContent align="end">
                                                                <DropdownMenuItem onClick={() => handleOpenDialog(category)}>
                                                                    <FileEdit className="mr-2 h-4 w-4" /> Edit
                                                                </DropdownMenuItem>
                                                                <DropdownMenuSeparator />
                                                                <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => handleDeleteCategory(category.id)}>
                                                                    <Trash2 className="mr-2 h-4 w-4" /> Delete
                                                                </DropdownMenuItem>
                                                            </DropdownMenuContent>
                                                        </DropdownMenu>
                                                    </TableCell>
                                                </TableRow>
                                            );
                                        })
                                    ) : (
                                        <TableRow>
                                            <TableCell colSpan={4} className="h-24 text-center text-muted-foreground">
                                                No forum categories created yet.
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </div>
                    </CardContent>
                </Card>
            </div>

            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{editingCategory ? "Edit" : "Create"} Category</DialogTitle>
                        <DialogDescription>
                            {editingCategory ? "Update the details for this category." : "Fill in the details for your new category."}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="space-y-2">
                            <Label htmlFor="category-name">Category Name</Label>
                            <Input id="category-name" value={categoryName} onChange={(e) => setCategoryName(e.target.value)} placeholder="e.g., General Discussions" />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="category-description">Description</Label>
                            <Textarea id="category-description" value={categoryDescription} onChange={(e) => setCategoryDescription(e.target.value)} placeholder="What should members discuss in this category?" />
                        </div>
                    </div>
                    <DialogFooter>
                        <DialogClose asChild>
                            <Button variant="outline">Cancel</Button>
                        </DialogClose>
                        <Button onClick={handleSaveCategory} disabled={isSaving}>
                            {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Save Category
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}
