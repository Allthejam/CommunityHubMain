'use client';

import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { 
  MessagesSquare, 
  MessageSquare, 
  Loader2, 
  ArrowRight, 
  Search, 
  MessageCircle, 
  Sparkles, 
  Compass, 
  HelpCircle, 
  Flame,
  Users
} from "lucide-react";
import Link from "next/link";
import { useFirestore, useUser, useDoc, useMemoFirebase, useCollection } from "@/firebase";
import { collection, query, where, doc, updateDoc } from "firebase/firestore";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { type Topic } from "@/lib/forum-data";

type ForumCategory = {
  id: string;
  name: string;
  description: string;
  topics: number;
  posts: number;
  communityId: string;
};

// Vibrant color accents to make the forum pop visually
const CATEGORY_ACCENTS = [
  {
    bg: 'bg-indigo-500/10 dark:bg-indigo-950/40',
    border: 'border-indigo-200 dark:border-indigo-800 hover:border-indigo-500 dark:hover:border-indigo-400',
    iconBg: 'bg-indigo-600 text-white',
    badgeBg: 'bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 border-indigo-200',
    btnBg: 'bg-indigo-600 hover:bg-indigo-700 text-white',
    icon: MessageSquare,
  },
  {
    bg: 'bg-emerald-500/10 dark:bg-emerald-950/40',
    border: 'border-emerald-200 dark:border-emerald-800 hover:border-emerald-500 dark:hover:border-emerald-400',
    iconBg: 'bg-emerald-600 text-white',
    badgeBg: 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border-emerald-200',
    btnBg: 'bg-emerald-600 hover:bg-emerald-700 text-white',
    icon: Flame,
  },
  {
    bg: 'bg-amber-500/10 dark:bg-amber-950/40',
    border: 'border-amber-200 dark:border-amber-800 hover:border-amber-500 dark:hover:border-amber-400',
    iconBg: 'bg-amber-600 text-white',
    badgeBg: 'bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 border-amber-200',
    btnBg: 'bg-amber-600 hover:bg-amber-700 text-white',
    icon: Compass,
  },
  {
    bg: 'bg-purple-500/10 dark:bg-purple-950/40',
    border: 'border-purple-200 dark:border-purple-800 hover:border-purple-500 dark:hover:border-purple-400',
    iconBg: 'bg-purple-600 text-white',
    badgeBg: 'bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300 border-purple-200',
    btnBg: 'bg-purple-600 hover:bg-purple-700 text-white',
    icon: Sparkles,
  },
  {
    bg: 'bg-rose-500/10 dark:bg-rose-950/40',
    border: 'border-rose-200 dark:border-rose-800 hover:border-rose-500 dark:hover:border-rose-400',
    iconBg: 'bg-rose-600 text-white',
    badgeBg: 'bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300 border-rose-200',
    btnBg: 'bg-rose-600 hover:bg-rose-700 text-white',
    icon: HelpCircle,
  },
];

import { useActiveCommunityId } from '@/hooks/use-active-community-id';

export default function ForumPage() {
    const { user, isUserLoading: authLoading } = useUser();
    const db = useFirestore();
    const [searchQuery, setSearchQuery] = React.useState('');
    const { communityId, userProfile, isLoading: activeCommunityLoading } = useActiveCommunityId();

    const categoriesQuery = useMemoFirebase(() => {
        if (!communityId || !db) return null;
        return query(collection(db, "forum-categories"), where("communityId", "==", communityId));
    }, [db, communityId]);

    const { data: categories, isLoading: dataLoading } = useCollection<ForumCategory>(categoriesQuery);
    
    // Query all live topics to dynamically compute real-time topic and post counts
    const topicsQuery = useMemoFirebase(() => {
        if (!communityId || !db) return null;
        return query(collection(db, "forum-topics"), where("communityId", "==", communityId));
    }, [db, communityId]);
    const { data: allTopics } = useCollection<Topic>(topicsQuery);

    const loading = authLoading || activeCommunityLoading || dataLoading;

    // Auto-reconcile and compute live topic and post counts for each category
    const categoryStats = React.useMemo(() => {
      const statsMap = new Map<string, { topicsCount: number; postsCount: number }>();
      if (!allTopics) return statsMap;

      for (const topic of allTopics) {
        const catId = (topic as any).categoryId;
        if (!catId) continue;
        const current = statsMap.get(catId) || { topicsCount: 0, postsCount: 0 };
        const repliesCount = Number((topic as any).replies) || 0;
        statsMap.set(catId, {
          topicsCount: current.topicsCount + 1,
          postsCount: current.postsCount + 1 + repliesCount,
        });
      }
      return statsMap;
    }, [allTopics]);

    // Auto-sync category docs in Firestore background if cached counts were outdated
    React.useEffect(() => {
      if (!categories || !db || !allTopics) return;
      for (const category of categories) {
        const stats = categoryStats.get(category.id);
        const actualTopics = stats?.topicsCount ?? 0;
        const actualPosts = stats?.postsCount ?? 0;

        if (category.topics !== actualTopics || category.posts !== actualPosts) {
          try {
            updateDoc(doc(db, "forum-categories", category.id), {
              topics: actualTopics,
              posts: actualPosts,
            });
          } catch (e) {}
        }
      }
    }, [categories, categoryStats, db, allTopics]);

    const filteredCategories = React.useMemo(() => {
      if (!categories) return [];
      if (!searchQuery.trim()) return categories;
      const q = searchQuery.toLowerCase();
      return categories.filter(c => 
        c.name.toLowerCase().includes(q) || 
        c.description?.toLowerCase().includes(q)
      );
    }, [categories, searchQuery]);

    if (loading) {
      return (
          <div className="flex justify-center items-center h-96">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
      );
    }

    return (
        <div className="space-y-8 pb-12">
            {/* Colorful Hero Header Banner */}
            <div className="p-6 md:p-8 rounded-2xl bg-gradient-to-r from-indigo-500/15 via-purple-500/15 to-amber-500/15 border border-indigo-200/50 dark:border-indigo-900/40 shadow-xs space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="space-y-1">
                        <div className="flex items-center gap-2.5">
                            <div className="p-2.5 rounded-xl bg-indigo-600 text-white shadow-xs">
                                <MessagesSquare className="h-6 w-6" />
                            </div>
                            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight font-headline">
                                Community Forum
                            </h1>
                        </div>
                        <p className="text-sm text-muted-foreground pt-1">
                            Connect, discuss, ask questions, and share knowledge with fellow members of your community.
                        </p>
                    </div>
                    <Badge variant="secondary" className="w-fit bg-indigo-100 dark:bg-indigo-900/60 text-indigo-700 dark:text-indigo-200 border-indigo-300 font-semibold px-3 py-1 text-xs">
                      <Users className="h-3.5 w-3.5 mr-1" />
                      {userProfile?.communityName || 'Local Hub'}
                    </Badge>
                </div>

                {/* Search Bar */}
                <div className="relative max-w-md pt-2">
                  <Search className="absolute left-3.5 top-5 h-4 w-4 text-muted-foreground" />
                  <Input 
                    type="text" 
                    placeholder="Search discussion categories..." 
                    className="pl-10 h-10 bg-background/80 backdrop-blur-xs border-indigo-200 dark:border-indigo-900"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
            </div>

            {/* Category Cards List - Whole Card Clickable */}
            <div className="space-y-4">
                <div className="flex items-center justify-between px-1">
                  <h2 className="text-lg font-bold tracking-tight text-foreground flex items-center gap-2">
                    <span>Discussion Categories</span>
                    <Badge variant="outline" className="text-xs font-semibold">
                      {filteredCategories.length}
                    </Badge>
                  </h2>
                  <p className="text-xs text-muted-foreground hidden sm:block">
                    Click anywhere on a category card to open topics
                  </p>
                </div>

                {filteredCategories && filteredCategories.length > 0 ? (
                    <div className="grid grid-cols-1 gap-4">
                        {filteredCategories.map((category, index) => {
                            const accent = CATEGORY_ACCENTS[index % CATEGORY_ACCENTS.length];
                            const IconComponent = accent.icon;
                            
                            const stats = categoryStats.get(category.id);
                            const topicCount = allTopics ? (stats?.topicsCount ?? 0) : (category.topics || 0);
                            const postCount = allTopics ? (stats?.postsCount ?? 0) : (category.posts || 0);

                            return (
                                <Link 
                                    key={category.id} 
                                    href={`/forum/${category.id}`} 
                                    className="block group transition-all duration-200 transform hover:-translate-y-0.5"
                                >
                                    <Card className={`overflow-hidden border-2 transition-all duration-200 cursor-pointer ${accent.border} shadow-xs group-hover:shadow-md`}>
                                        <CardContent className="p-5 sm:p-6">
                                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                                
                                                {/* Left Icon & Text */}
                                                <div className="flex items-start gap-4 flex-1">
                                                    <div className={`p-3 rounded-xl ${accent.iconBg} shadow-xs shrink-0 mt-0.5 group-hover:scale-105 transition-transform`}>
                                                        <IconComponent className="h-6 w-6" />
                                                    </div>
                                                    <div className="space-y-1.5 flex-1">
                                                        <h3 className="text-lg font-bold text-foreground group-hover:text-primary transition-colors flex items-center gap-2">
                                                            <span>{category.name}</span>
                                                        </h3>
                                                        <p className="text-sm text-muted-foreground line-clamp-2 leading-relaxed">
                                                            {category.description || "Join the conversation and discuss local topics with your community."}
                                                        </p>
                                                    </div>
                                                </div>

                                                {/* Right Stats & Action Button */}
                                                <div className="flex items-center justify-between sm:justify-end gap-3 pt-3 sm:pt-0 border-t sm:border-t-0 border-border/50 shrink-0">
                                                    <div className="flex items-center gap-2">
                                                        <Badge variant="outline" className={`text-xs px-2.5 py-1 ${accent.badgeBg}`}>
                                                            💬 <strong className="ml-1">{topicCount}</strong> {topicCount === 1 ? 'Topic' : 'Topics'}
                                                        </Badge>
                                                        <Badge variant="outline" className="text-xs px-2.5 py-1 bg-muted/60 text-muted-foreground border-border">
                                                            ✉️ <strong className="ml-1 text-foreground">{postCount}</strong> {postCount === 1 ? 'Post' : 'Posts'}
                                                        </Badge>
                                                    </div>

                                                    <Button 
                                                        size="sm" 
                                                        className={`h-9 px-4 text-xs font-semibold gap-1.5 shadow-xs shrink-0 ${accent.btnBg} group-hover:translate-x-0.5 transition-transform`}
                                                    >
                                                        <span>Browse</span>
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
                        <h3 className="text-lg font-bold">No Categories Found</h3>
                        <p className="text-sm text-muted-foreground mt-1 max-w-sm mx-auto">
                            {searchQuery ? `No categories matched "${searchQuery}". Try a different keyword.` : "No forum categories have been created for this community yet."}
                        </p>
                        {searchQuery && (
                          <Button variant="outline" size="sm" className="mt-4" onClick={() => setSearchQuery('')}>
                            Clear Search
                          </Button>
                        )}
                    </Card>
                )}
            </div>
        </div>
    );
}
