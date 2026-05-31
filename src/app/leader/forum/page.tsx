
'use client';

import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { MessagesSquare, MessageSquare, Loader2, PlusCircle, ArrowLeft, MoreHorizontal, FileEdit, Trash2 } from "lucide-react";
import Link from "next/link";
import { type ForumCategory, type Topic } from "@/lib/forum-data";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useParams } from "next/navigation";
import { doc, collection, query, where } from "firebase/firestore";
import { useFirestore, useDoc, useCollection, useMemoFirebase, useUser } from "@/firebase";
import * as React from "react";
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
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
    DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { runCreateForumCategory, runUpdateForumCategory, runDeleteForumCategory } from "@/lib/actions/forumActions";
import { Separator } from "@/components/ui/separator";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";

export default function LeaderForumPage() {
    const params = useParams();
    const categoryId = params.categoryId as string;
    const { user, isUserLoading } = useUser();
    const db = useFirestore();
    const isMobile = useIsMobile();

    const [isDialogOpen, setIsDialogOpen] = React.useState(false);
    const [isSaving, setIsSaving] = React.useState(false);
    const [editingCategory, setEditingCategory] = React.useState<
        Partial<ForumCategory> | null
    >(null);
    const [categoryName, setCategoryName] = React.useState("");
    const [categoryDescription, setCategoryDescription] = React.useState("");
    const { toast } = useToast();
    
    const userProfileRef = useMemoFirebase(() => user ? doc(db, 'users', user.uid) : null, [user, db]);
    const { data: userProfile, isLoading: profileLoading } = useDoc(userProfileRef);
    const communityId = userProfile?.communityId;


    const categoriesQuery = useMemoFirebase(() => {
        if (!db || !communityId) return null;
        return query(collection(db, "forum-categories"), where("communityId", "==", communityId));
    }, [db, communityId]);

    const { data: categories, isLoading: dataLoading, error: categoryError } = useCollection<ForumCategory>(categoriesQuery);
    
    const loading = isUserLoading || profileLoading || dataLoading;
    const error = categoryError;

    const handleOpenDialog = (category: Partial<ForumCategory> | null = null) => {
        setEditingCategory(category);
        setCategoryName(category?.name || "");
        setCategoryDescription(category?.description || "");
        setIsDialogOpen(true);
    };
  
    const handleSaveCategory = async () => {
        if (!communityId) {
            toast({ title: "Error", description: "Community not found.", variant: "destructive" });
            return;
        }
        if (!categoryName.trim() || !categoryDescription.trim()) {
            toast({ title: "Missing Information", description: "Please provide a name and description.", variant: "destructive" });
            return;
        }

        setIsSaving(true);
        try {
            const result = editingCategory?.id 
                ? await runUpdateForumCategory(editingCategory.id, { name: categoryName, description: categoryDescription })
                : await runCreateForumCategory({ name: categoryName, description: categoryDescription, communityId: communityId });

            if (result.success) {
                toast({ title: "Success", description: "Category saved successfully." });
                setIsDialogOpen(false);
            } else {
                throw new Error(result.error);
            }
        } catch(error) {
            toast({ title: "Error", description: (error as Error).message, variant: "destructive" });
        } finally {
            setIsSaving(false);
        }
    }
    
    const handleDeleteCategory = async (categoryId: string) => {
        if (!window.confirm("Are you sure you want to delete this category? All topics within it will also be deleted.")) {
            return;
        }
        try {
            await runDeleteForumCategory(categoryId);
            toast({ title: "Success", description: "Category deleted." });
        } catch (error) {
            toast({ title: "Error", description: (error as Error).message, variant: "destructive" });
        }
    }

    const sortedCategories = React.useMemo(() => {
        return categories ? [...categories].sort((a,b) => a.name.localeCompare(b.name)) : [];
    }, [categories]);

    if (loading) {
        return (
            <div className="flex justify-center items-center h-96">
                <Loader2 className="h-8 w-8 animate-spin" />
            </div>
        );
    }
    
    if (error) {
        return (
            <div className="text-center">
                <h1 className="text-2xl font-bold">Error</h1>
                <p className="text-muted-foreground">{error?.message || "Could not load categories."}</p>
                <Button asChild variant="link" className="mt-4">
                    <Link href="/leader/dashboard">
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Return to Dashboard
                    </Link>
                </Button>
            </div>
        )
    }

    return (
        <>
        <div className="space-y-8">
            <div>
                <h1 className="text-3xl font-bold tracking-tight font-headline flex items-center gap-2">
                    <MessagesSquare className="h-8 w-8 text-primary" />
                    Manage Forum
                </h1>
                <p className="text-muted-foreground">
                    Create, edit, and manage the categories for your community's discussion forum.
                </p>
            </div>
            <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                    <div>
                        <CardTitle>Forum Categories</CardTitle>
                        <CardDescription>
                        A list of all discussion categories in your community.
                        </CardDescription>
                    </div>
                    <Button onClick={() => handleOpenDialog()}>
                        <PlusCircle className="mr-2 h-4 w-4" />
                        Create Category
                    </Button>
                </CardHeader>
                <CardContent>
                    {/* Mobile View */}
                     <div className="md:hidden space-y-3">
                        {sortedCategories.length > 0 ? (
                            sortedCategories.map(category => (
                                <Card key={category.id}>
                                    <CardContent className="p-4 flex items-start justify-between gap-4">
                                        <div className="flex-1 min-w-0">
                                            <Link href={`/leader/forum/${category.id}`} className="font-semibold hover:underline text-base leading-tight">
                                                {category.name}
                                            </Link>
                                            <p className="text-xs text-muted-foreground mt-1 line-clamp-4">
                                                {category.description}
                                            </p>
                                        </div>
                                        <div className="flex items-start gap-4">
                                            <div className="flex items-center gap-4 text-xs text-center">
                                                <div>
                                                    <p className="font-semibold text-sm">{category.topics || 0}</p>
                                                    <p className="text-muted-foreground">Topics</p>
                                                </div>
                                                <div>
                                                    <p className="font-semibold text-sm">{category.posts || 0}</p>
                                                    <p className="text-muted-foreground">Posts</p>
                                                </div>
                                            </div>
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button variant="ghost" className="h-8 w-8 p-0 shrink-0">
                                                        <MoreHorizontal className="h-4 w-4" />
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end">
                                                    <DropdownMenuItem onClick={() => handleOpenDialog(category)}>
                                                        <FileEdit className="mr-2 h-4 w-4" /> Edit
                                                    </DropdownMenuItem>
                                                    <DropdownMenuSeparator />
                                                    <DropdownMenuItem className="text-destructive" onClick={() => handleDeleteCategory(category.id)}>
                                                        <Trash2 className="mr-2 h-4 w-4" /> Delete
                                                    </DropdownMenuItem>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </div>
                                    </CardContent>
                                </Card>
                            ))
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
                                {loading ? (
                                    <TableRow>
                                    <TableCell colSpan={4} className="h-24 text-center">
                                        <Loader2 className="mx-auto h-6 w-6 animate-spin text-muted-foreground" />
                                    </TableCell>
                                    </TableRow>
                                ) : sortedCategories.length > 0 ? (
                                    sortedCategories.map((category) => (
                                    <TableRow key={category.id}>
                                        <TableCell className="font-medium w-[60%]">
                                            <Link href={`/leader/forum/${category.id}`} className="hover:underline">
                                                {category.name}
                                            </Link>
                                            <p className="text-sm text-muted-foreground mt-1 font-normal">{category.description}</p>
                                        </TableCell>
                                        <TableCell className="text-center">
                                        {category.topics || 0}
                                        </TableCell>
                                        <TableCell className="text-center">
                                        {category.posts || 0}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button variant="ghost" className="h-8 w-8 p-0">
                                                        <MoreHorizontal className="h-4 w-4" />
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end">
                                                    <DropdownMenuItem onClick={() => handleOpenDialog(category)}>
                                                        <FileEdit className="mr-2 h-4 w-4" /> Edit
                                                    </DropdownMenuItem>
                                                    <DropdownMenuSeparator />
                                                    <DropdownMenuItem className="text-destructive" onClick={() => handleDeleteCategory(category.id)}>
                                                        <Trash2 className="mr-2 h-4 w-4" /> Delete
                                                    </DropdownMenuItem>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </TableCell>
                                    </TableRow>
                                    ))
                                ) : (
                                    <TableRow>
                                    <TableCell colSpan={4} className="h-24 text-center">
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
                        <Input id="category-name" value={categoryName} onChange={(e) => setCategoryName(e.target.value)} />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="category-description">Description</Label>
                        <Textarea id="category-description" value={categoryDescription} onChange={(e) => setCategoryDescription(e.target.value)} />
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
