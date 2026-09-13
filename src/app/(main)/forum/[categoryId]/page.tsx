
"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MessageSquare, PlusCircle, ArrowLeft, Loader2, Clock, ChevronRight, MessageCircle } from "lucide-react";
import Link from "next/link";
import { type ForumCategory, type Topic } from "@/lib/forum-data";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useParams, useRouter } from "next/navigation";
import { doc, collection, query, where, getDoc } from "firebase/firestore";
import { useFirestore, useDoc, useCollection, useMemoFirebase } from "@/firebase";
import * as React from "react";
import { format, isValid } from "date-fns";
import { runSanitizeForumTopicsPrivacy } from "@/lib/actions/forumActions";

export default function ForumCategoryPage() {
    const params = useParams();
    const router = useRouter();
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
                return isValid(d) ? format(d, "dd/MM/yyyy, HH:mm") : 'N/A';
            }
            if (date?.seconds) {
                const d = new Date(date.seconds * 1000);
                return isValid(d) ? format(d, "dd/MM/yyyy, HH:mm") : 'N/A';
            }
            const d = new Date(date);
            return isValid(d) ? format(d, "dd/MM/yyyy, HH:mm") : 'N/A';
        } catch {
            return 'N/A';
        }
    };

    const loading = categoryLoading || topicsLoading;
    const error = categoryError || topicsError;

    if (loading) {
        return (
            <div className="flex justify-center items-center h-96">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }
    
    if (error || !category) {
        return (
            <div className="text-center py-12">
                <h1 className="text-2xl font-bold">Category Not Found</h1>
                <p className="text-muted-foreground mt-2">{error?.message || "This forum category does not exist."}</p>
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
        <div className="space-y-6">
            <div className="bg-gradient-to-r from-primary/10 via-primary/5 to-background border border-primary/20 rounded-2xl p-6 shadow-sm">
                <Button asChild variant="ghost" size="sm" className="mb-3 hover:bg-primary/10">
                    <Link href="/forum">
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Back to Forum Categories
                    </Link>
                </Button>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight font-headline flex items-center gap-3">
                            <span className="p-2 rounded-xl bg-primary/10 text-primary">
                                <MessageSquare className="h-6 w-6 sm:h-7 sm:w-7" />
                            </span>
                            {category.name}
                        </h1>
                        <p className="text-muted-foreground mt-1.5 text-sm sm:text-base max-w-2xl">
                            {category.description}
                        </p>
                    </div>
                    <Button asChild className="shrink-0 shadow-sm gap-2">
                        <Link href={`/forum/${categoryId}/new`}>
                            <PlusCircle className="h-4 w-4" />
                            New Topic
                        </Link>
                    </Button>
                </div>
            </div>

            <Card className="border shadow-sm overflow-hidden">
                <CardHeader className="bg-muted/30 border-b py-4 px-6 flex flex-row items-center justify-between">
                    <div>
                        <CardTitle className="text-lg">Topics</CardTitle>
                        <CardDescription>Click any topic below to view the discussion or post a reply.</CardDescription>
                    </div>
                    <Badge variant="secondary" className="bg-primary/10 text-primary font-semibold px-3 py-1">
                        {topics?.length || 0} {topics?.length === 1 ? 'Topic' : 'Topics'}
                    </Badge>
                </CardHeader>
                <CardContent className="p-0">
                    {topics && topics.length > 0 ? (
                        <div className="divide-y divide-border">
                            {topics.map((topic) => {
                                const userPrivacy = (topic as any).authorId ? privacyMap[(topic as any).authorId] : undefined;
                                const isAnon = (topic as any).isAnonymous || 
                                               userPrivacy?.isPrivate === true || 
                                               topic.authorName?.toLowerCase().includes('anonymous');
                                const authorDisplayName = isAnon ? 'Anonymous Member' : (userPrivacy?.realName || topic.authorName);
                                const authorAvatarSrc = isAnon ? '' : topic.authorAvatar;
                                const replyCount = (topic.replies !== undefined && topic.replies !== null) ? Number(topic.replies) : 0;
                                
                                return (
                                    <div
                                        key={topic.id}
                                        onClick={() => router.push(`/forum/${categoryId}/${topic.id}`)}
                                        className="flex items-center justify-between p-4 sm:p-5 hover:bg-primary/[0.04] active:bg-primary/[0.08] cursor-pointer transition-all duration-150 group"
                                    >
                                        <div className="flex items-start sm:items-center gap-3.5 sm:gap-4 flex-1 min-w-0 pr-4">
                                            <Avatar className="h-10 w-10 shrink-0 border-2 border-primary/20 ring-2 ring-transparent group-hover:ring-primary/20 transition-all shadow-sm">
                                                <AvatarImage src={authorAvatarSrc} alt={authorDisplayName} />
                                                <AvatarFallback className="bg-primary/10 text-primary font-bold text-sm">
                                                    {isAnon ? '👤' : (authorDisplayName?.charAt(0)?.toUpperCase() || 'U')}
                                                </AvatarFallback>
                                            </Avatar>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex flex-wrap items-center gap-2">
                                                    <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors text-base truncate">
                                                        {topic.title}
                                                    </h3>
                                                    {isAnon && (
                                                        <Badge variant="outline" className="text-[11px] px-2 py-0 h-5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-300">
                                                            Anonymous
                                                        </Badge>
                                                    )}
                                                </div>
                                                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 text-xs text-muted-foreground">
                                                    <span>by <strong className="text-foreground font-medium">{authorDisplayName}</strong></span>
                                                    <span className="hidden sm:inline opacity-40">•</span>
                                                    <span className="flex items-center gap-1 font-medium">
                                                        <MessageCircle className="h-3.5 w-3.5 text-primary" />
                                                        <span className={replyCount > 0 ? "text-primary font-semibold" : "text-muted-foreground"}>
                                                            {replyCount} {replyCount === 1 ? 'reply' : 'replies'}
                                                        </span>
                                                    </span>
                                                    <span className="hidden sm:inline opacity-40">•</span>
                                                    <span className="flex items-center gap-1">
                                                        <Clock className="h-3.5 w-3.5 text-muted-foreground/70" />
                                                        {formatDate(topic.lastPost)}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                        
                                        <div className="flex items-center gap-3 sm:gap-4 shrink-0">
                                            {replyCount > 0 ? (
                                                <Badge 
                                                    variant="secondary" 
                                                    className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30 group-hover:bg-emerald-600 group-hover:text-white transition-colors font-semibold px-3 py-1 flex items-center gap-1.5 text-xs rounded-full shadow-xs"
                                                >
                                                    <MessageCircle className="h-3.5 w-3.5" />
                                                    <span>{replyCount}</span>
                                                    <span className="hidden sm:inline">{replyCount === 1 ? 'reply' : 'replies'}</span>
                                                </Badge>
                                            ) : (
                                                <Badge 
                                                    variant="secondary" 
                                                    className="bg-muted text-muted-foreground border border-border group-hover:bg-primary/10 group-hover:text-primary group-hover:border-primary/30 transition-colors font-medium px-2.5 py-1 flex items-center gap-1.5 text-xs rounded-full shadow-xs"
                                                >
                                                    <MessageCircle className="h-3.5 w-3.5 opacity-60" />
                                                    <span>0 replies</span>
                                                </Badge>
                                            )}
                                            <ChevronRight className="h-5 w-5 text-muted-foreground/40 group-hover:text-primary group-hover:translate-x-1 transition-all" />
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    ) : (
                        <div className="py-16 text-center px-4">
                            <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 text-primary flex items-center justify-center mb-3">
                                <MessageSquare className="h-6 w-6" />
                            </div>
                            <h3 className="text-base font-semibold text-foreground">No topics yet</h3>
                            <p className="text-sm text-muted-foreground mt-1 max-w-sm mx-auto">
                                Be the first one to start a discussion in this category!
                            </p>
                            <Button asChild size="sm" className="mt-4 gap-2">
                                <Link href={`/forum/${categoryId}/new`}>
                                    <PlusCircle className="h-4 w-4" />
                                    Start a Topic
                                </Link>
                            </Button>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
