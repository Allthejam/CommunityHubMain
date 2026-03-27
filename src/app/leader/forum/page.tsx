
"use client";

import * as React from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter,
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
import {
  MessagesSquare,
  MessageSquare,
  Loader2,
  PlusCircle,
  MoreHorizontal,
  FileEdit,
  Trash2,
} from "lucide-react";
import type { ForumCategory } from "@/lib/forum-data";
import Link from "next/link";
import { useUser, useFirestore, useCollection, useMemoFirebase, useDoc } from "@/firebase";
import { collection, query, where, doc } from "firebase/firestore";
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


export default function LeaderForumPage() {
  const { user, isUserLoading: authLoading } = useUser();
  const db = useFirestore();
  const { toast } = useToast();

  const userProfileRef = useMemoFirebase(() => (user ? doc(db, 'users', user.uid) : null), [user, db]);
  const { data: userProfile, isLoading: profileLoading } = useDoc(userProfileRef);

  const [isDialogOpen, setIsDialogOpen] = React.useState(false);
  const [isSaving, setIsSaving] = React.useState(false);
  const [editingCategory, setEditingCategory] = React.useState<
    Partial<ForumCategory> | null
  >(null);
  const [categoryName, setCategoryName] = React.useState("");
  const [categoryDescription, setCategoryDescription] = React.useState("");

  const communityId = userProfile?.communityId;

  const categoriesQuery = useMemoFirebase(() => {
    if (!db || !communityId) return null;
    return query(
      collection(db, "forum-categories"),
      where("communityId", "==", communityId)
    );
  }, [db, communityId]);

  const { data: categories, isLoading: dataLoading } =
    useCollection<ForumCategory>(categoriesQuery);

  const loading = authLoading || profileLoading || dataLoading;

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
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Category</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead className="text-center">Topics</TableHead>
                    <TableHead className="text-center">Posts</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={5} className="h-24 text-center">
                        <Loader2 className="mx-auto h-6 w-6 animate-spin text-muted-foreground" />
                      </TableCell>
                    </TableRow>
                  ) : sortedCategories.length > 0 ? (
                    sortedCategories.map((category) => (
                      <TableRow key={category.id}>
                        <TableCell className="font-medium">
                          <Link href={`/leader/forum/${category.id}`} className="hover:underline">
                            {category.name}
                          </Link>
                        </TableCell>
                        <TableCell className="text-muted-foreground max-w-sm truncate">
                          {category.description}
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
                      <TableCell colSpan={5} className="h-24 text-center">
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
                    <DialogTitle>{editingCategory?.id ? "Edit" : "Create"} Category</DialogTitle>
                    <DialogDescription>
                        {editingCategory?.id ? "Update the details for this category." : "Fill in the details for your new category."}
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
