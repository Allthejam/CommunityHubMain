
"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { MessageSquare, PlusCircle, ArrowLeft, Loader2 } from "lucide-react";
import Link from "next/link";
import { type ForumCategory, type Topic } from "@/lib/forum-data";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useParams } from "next/navigation";
import { doc, collection, query, where, getDoc } from "firebase/firestore";
import { useFirestore, useDoc, useCollection, useMemoFirebase } from "@/firebase";
import * as React from "react";
import { format, isValid } from "date-fns";
import { runSanitizeForumTopicsPrivacy } from "@/lib/actions/forumActions";

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
    
    const [privacyMap, setPrivacyMap] = React.useState<Record<string, { isPrivate: boolean; realName?: string }>>({});

    React.useEffect(() => {
        // Run database sanitization once in the background
        runSanitizeForumTopicsPrivacy().catch(console.error);
    }, []);

    React.useEffect(() => {
        if (!topics || !db) return;
        const authorIds = Array.from(new Set(topics.map(t => (t as any).authorId).filter(Boolean)));
        if (authorIds.length === 0) return;

        const fetchPrivacy = async () => {
            const newMap: Record<string, { isPrivate: boolean; realName?: string }> = {};
            for (const authorId of authorIds) {
                try {
                    const userRef = doc(db, 'users', authorId);
                    const userSnap = await getDoc(userRef);
                    if (userSnap.exists()) {
                        const userData = userSnap.data();
                        newMap[authorId] = {
                            isPrivate: userData?.settings?.publicProfile === false,
                            realName: userData?.name
                        };
                    }
                } catch (err) {
                    console.error("Error fetching author privacy:", err);
                }
            }
            setPrivacyMap(newMap);
        };

        fetchPrivacy();
    }, [topics, db]);

    const formatDate = (date: any) => {
        if (!date) return 'N/A';
        try {
            if (typeof date?.toDate === 'function') {
                const d = date.toDate();
                return isValid(d) ? format(d, "dd/MM/yyyy, HH:mm:ss") : 'N/A';
            }
            if (date?.seconds) {
                const d = new Date(date.seconds * 1000);
                return isValid(d) ? format(d, "dd/MM/yyyy, HH:mm:ss") : 'N/A';
            }
            const d = new Date(date);
            return isValid(d) ? format(d, "dd/MM/yyyy, HH:mm:ss") : 'N/A';
        } catch {
            return 'N/A';
        }
    };

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
                            {topics && topics.map((topic) => {
                                const userPrivacy = (topic as any).authorId ? privacyMap[(topic as any).authorId] : undefined;
                                const isAnon = (topic as any).isAnonymous || 
                                               userPrivacy?.isPrivate === true || 
                                               topic.authorName?.toLowerCase().includes('anonymous');
                                const authorDisplayName = isAnon ? 'Anonymous Member' : (userPrivacy?.realName || topic.authorName);
                                const authorAvatarSrc = isAnon ? '' : topic.authorAvatar;
                                return (
                                <TableRow key={topic.id}>
                                    <TableCell>
                                        <div className="flex items-center gap-3">
                                            <Avatar>
                                                <AvatarImage src={authorAvatarSrc} alt={authorDisplayName} />
                                                <AvatarFallback>{isAnon ? '👤' : (authorDisplayName?.charAt(0) || 'U')}</AvatarFallback>
                                            </Avatar>
                                            <div>
                                                 <Link href={`/forum/${categoryId}/${topic.id}`} className="font-medium hover:underline">{topic.title}</Link>
                                                <p className="text-sm text-muted-foreground">by {authorDisplayName}</p>
                                            </div>
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-center">{topic.replies}</TableCell>
                                    <TableCell className="text-sm text-muted-foreground">{formatDate(topic.lastPost)}</TableCell>
                                </TableRow>
                            )})}
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
