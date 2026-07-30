"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  MessageSquare, 
  PlusCircle, 
  ArrowLeft, 
  Loader2, 
  ArrowRight, 
  MessageCircle, 
  Clock, 
  User, 
  Search,
  Sparkles,
  Flame
} from "lucide-react";
import Link from "next/link";
import { type ForumCategory, type Topic } from "@/lib/forum-data";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useParams } from "next/navigation";
import { doc, collection, query, where } from "firebase/firestore";
import { useFirestore, useDoc, useCollection, useMemoFirebase } from "@/firebase";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import * as React from "react";

export default function ForumCategoryPage() {
    const params = useParams();
    const categoryId = params.categoryId as string;
    const db = useFirestore();
    const [searchQuery, setSearchQuery] = React.useState('');

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

    const filteredTopics = React.useMemo(() => {
        if (!topics) return [];
        if (!searchQuery.trim()) return topics;
        const q = searchQuery.toLowerCase();
        return topics.filter(t => 
            t.title?.toLowerCase().includes(q) || 
            t.authorName?.toLowerCase().includes(q)
        );
    }, [topics, searchQuery]);

    if (loading) {
        return (
            <div className="flex justify-center items-center h-96">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        );
    }
    
    if (error || !category) {
        return (
            <div className="text-center py-16 space-y-4">
                <h1 className="text-2xl font-bold">Category Not Found</h1>
                <p className="text-muted-foreground">{error?.message || "This forum category does not exist."}</p>
                <Button asChild variant="default" className="mt-4">
                    <Link href="/forum">
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Return to Forum
                    </Link>
                </Button>
            </div>
        )
    }

    return (
        <div className="space-y-8 pb-12">
            {/* Header Navigation */}
            <div>
                <Button asChild variant="ghost" size="sm" className="mb-2 text-xs hover:bg-muted font-medium">
                    <Link href="/forum">
                        <ArrowLeft className="mr-1.5 h-3.5 w-3.5" />
                        Back to Forum Categories
                    </Link>
                </Button>

                {/* Vibrant Category Banner */}
                <div className="p-6 md:p-8 rounded-2xl bg-gradient-to-r from-purple-500/15 via-indigo-500/15 to-emerald-500/15 border border-purple-200/50 dark:border-purple-900/40 shadow-xs space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div className="space-y-1">
                            <div className="flex items-center gap-2.5">
                                <div className="p-2.5 rounded-xl bg-purple-600 text-white shadow-xs">
                                    <MessageSquare className="h-6 w-6" />
                                </div>
                                <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight font-headline">
                                    {category.name}
                                </h1>
                            </div>
                            <p className="text-sm text-muted-foreground pt-1">
                                {category.description || "Browse and join discussions in this category."}
                            </p>
                        </div>

                        <Button asChild size="default" className="bg-purple-600 hover:bg-purple-700 text-white font-semibold shadow-sm shrink-0">
                            <Link href={`/forum/${categoryId}/new`}>
                                <PlusCircle className="mr-2 h-4 w-4" />
                                Start New Topic
                            </Link>
                        </Button>
                    </div>

                    {/* Topic Search Input */}
                    <div className="relative max-w-md pt-2">
                        <Search className="absolute left-3.5 top-5 h-4 w-4 text-muted-foreground" />
                        <Input 
                            type="text" 
                            placeholder={`Search topics in ${category.name}...`} 
                            className="pl-10 h-10 bg-background/80 backdrop-blur-xs border-purple-200 dark:border-purple-900"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                </div>
            </div>

            {/* Topics Cards List - Whole Card Clickable */}
            <div className="space-y-4">
                <div className="flex items-center justify-between px-1">
                    <h2 className="text-lg font-bold tracking-tight text-foreground flex items-center gap-2">
                        <span>Topics & Discussions</span>
                        <Badge variant="outline" className="text-xs font-semibold">
                            {filteredTopics.length}
                        </Badge>
                    </h2>
                    <p className="text-xs text-muted-foreground hidden sm:block">
                        Click anywhere on a topic card to read discussion
                    </p>
                </div>

                {filteredTopics && filteredTopics.length > 0 ? (
                    <div className="grid grid-cols-1 gap-4">
                        {filteredTopics.map((topic) => {
                            const formattedDate = topic.lastPost 
                                ? new Date(topic.lastPost).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
                                : 'Recent';

                            return (
                                <Link 
                                    key={topic.id} 
                                    href={`/forum/${categoryId}/${topic.id}`}
                                    className="block group transition-all duration-200 transform hover:-translate-y-0.5"
                                >
                                    <Card className="overflow-hidden border-2 border-border/70 hover:border-purple-500/80 dark:hover:border-purple-400/80 transition-all duration-200 cursor-pointer shadow-xs group-hover:shadow-md">
                                        <CardContent className="p-5 sm:p-6">
                                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                                
                                                {/* Author Avatar & Title */}
                                                <div className="flex items-start gap-4 flex-1">
                                                    <Avatar className="h-10 w-10 border-2 border-purple-200 dark:border-purple-900 shrink-0 mt-0.5 group-hover:scale-105 transition-transform">
                                                        <AvatarImage src={topic.authorAvatar} alt={topic.authorName} />
                                                        <AvatarFallback className="bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300 font-bold">
                                                            {topic.authorName?.charAt(0) || 'U'}
                                                        </AvatarFallback>
                                                    </Avatar>

                                                    <div className="space-y-1 flex-1">
                                                        <h3 className="text-base sm:text-lg font-bold text-foreground group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors line-clamp-2">
                                                            {topic.title}
                                                        </h3>
                                                        <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
                                                            <span className="flex items-center gap-1 font-medium text-foreground">
                                                                <User className="h-3 w-3 text-purple-500" />
                                                                {topic.authorName || 'Community Member'}
                                                            </span>
                                                            <span>•</span>
                                                            <span className="flex items-center gap-1">
                                                                <Clock className="h-3 w-3" />
                                                                {formattedDate}
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Replies Badge & Action Button */}
                                                <div className="flex items-center justify-between sm:justify-end gap-3 pt-3 sm:pt-0 border-t sm:border-t-0 border-border/50 shrink-0">
                                                    <Badge 
                                                        variant="outline" 
                                                        className="text-xs px-3 py-1 bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border-purple-200 font-semibold"
                                                    >
                                                        💬 <strong className="ml-1 text-purple-900 dark:text-purple-100">{topic.replies || 0}</strong> {topic.replies === 1 ? 'Reply' : 'Replies'}
                                                    </Badge>

                                                    <Button 
                                                        size="sm" 
                                                        className="h-9 px-4 text-xs font-semibold gap-1.5 shadow-xs shrink-0 bg-purple-600 hover:bg-purple-700 text-white group-hover:translate-x-0.5 transition-transform"
                                                    >
                                                        <span>View Topic</span>
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
                        <MessageSquare className="h-12 w-12 text-muted-foreground/40 mx-auto mb-3" />
                        <h3 className="text-lg font-bold">No Topics Found</h3>
                        <p className="text-sm text-muted-foreground mt-1 max-w-sm mx-auto">
                            {searchQuery ? `No topics matched "${searchQuery}".` : "Be the first to start a conversation in this category!"}
                        </p>
                        <Button asChild variant="default" size="sm" className="mt-4 bg-purple-600 hover:bg-purple-700 text-white">
                            <Link href={`/forum/${categoryId}/new`}>
                                <PlusCircle className="mr-1.5 h-4 w-4" />
                                Start a Topic
                            </Link>
                        </Button>
                    </Card>
                )}
            </div>
        </div>
    );
}
