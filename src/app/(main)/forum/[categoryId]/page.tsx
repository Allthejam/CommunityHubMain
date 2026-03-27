
"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { MessageSquare, PlusCircle, ArrowLeft, Loader2 } from "lucide-react";
import Link from "next/link";
import { type ForumCategory, type Topic } from "@/lib/forum-data";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useParams } from "next/navigation";
import { doc, collection, query, where } from "firebase/firestore";
import { useFirestore, useDoc, useCollection, useMemoFirebase } from "@/firebase";
import * as React from "react";

export default function ForumCategoryPage() {
    const params = useParams();
    const categoryId = params.categoryId as string;
    const db = useFirestore();

    const categoryRef = useMemoFirebase(() => {
        if (!categoryId || !db) return null;
        return doc(db, "forum-categories", categoryId);
    }, [categoryId, db]);

    const topicsQuery = useMemoFirebase(() => {
        if (!categoryId || !db) return null;
        return query(collection(db, "forum-topics"), where("categoryId", "==", categoryId));
    }, [categoryId, db]);

    const { data: category, isLoading: categoryLoading, error: categoryError } = useDoc<ForumCategory>(categoryRef);
    const { data: topics, isLoading: topicsLoading, error: topicsError } = useCollection<Topic>(topicsQuery);
    
    const loading = categoryLoading || topicsLoading;
    const error = categoryError || topicsError;

    if (loading) {
        return (
            <div className="flex justify-center items-center h-96">
                <Loader2 className="h-8 w-8 animate-spin" />
            </div>
        );
    }
    
    if (error || !category) {
        return (
            <div className="text-center">
                <h1 className="text-2xl font-bold">Category Not Found</h1>
                <p className="text-muted-foreground">{error?.message || "This forum category does not exist."}</p>
                <Button asChild variant="link" className="mt-4">
                    <Link href="/forum">
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Return to Forum
                    </Link>
                </Button>
            </div>
        )
    }

    return (
        <div className="space-y-8">
            <div>
                 <Button asChild variant="ghost" className="mb-4">
                    <Link href="/forum">
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Back to Forum Categories
                    </Link>
                </Button>
                <h1 className="text-3xl font-bold tracking-tight font-headline flex items-center gap-2">
                    <MessageSquare className="h-8 w-8 text-primary" />
                    {category.name}
                </h1>
                <p className="text-muted-foreground">
                    {category.description}
                </p>
            </div>
            <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                    <div>
                        <CardTitle>Topics</CardTitle>
                        <CardDescription>Browse the discussions in this category.</CardDescription>
                    </div>
                     <Button asChild>
                        <Link href={`/forum/${categoryId}/new`}>
                            <PlusCircle className="mr-2 h-4 w-4" />
                            New Topic
                        </Link>
                    </Button>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="w-[60%]">Topic</TableHead>
                                <TableHead className="text-center">Replies</TableHead>
                                <TableHead>Last Post</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {topics && topics.map((topic) => (
                                <TableRow key={topic.id}>
                                    <TableCell>
                                        <div className="flex items-center gap-3">
                                            <Avatar>
                                                <AvatarImage src={topic.authorAvatar} alt={topic.authorName} />
                                                <AvatarFallback>{topic.authorName?.charAt(0)}</AvatarFallback>
                                            </Avatar>
                                            <div>
                                                 <Link href={`/forum/${categoryId}/${topic.id}`} className="font-medium hover:underline">{topic.title}</Link>
                                                <p className="text-sm text-muted-foreground">by {topic.authorName}</p>
                                            </div>
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-center">{topic.replies}</TableCell>
                                    <TableCell className="text-sm text-muted-foreground">{topic.lastPost ? new Date(topic.lastPost).toLocaleString() : 'N/A'}</TableCell>
                                </TableRow>
                            ))}
                             {(!topics || topics.length === 0) && (
                                <TableRow>
                                    <TableCell colSpan={3} className="h-24 text-center">
                                        No topics have been created in this category yet.
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    )
}
