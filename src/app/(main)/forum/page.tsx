'use client';

import * as React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  MessagesSquare, 
  MessageSquare, 
  Wrench, 
  ShieldAlert, 
  ShoppingBag, 
  Sparkles, 
  ArrowRight, 
  Loader2, 
  FileText, 
  Users,
  Search,
  PlusCircle,
  TrendingUp,
  MessageCircleCode
} from "lucide-react";
import Link from "next/link";
import { useFirestore, useUser, useDoc, useMemoFirebase, useCollection } from "@/firebase";
import { collection, query, where, doc } from "firebase/firestore";
import { cn } from "@/lib/utils";

type ForumCategory = {
  id: string;
  name: string;
  description: string;
  topics: number;
  posts: number;
  communityId: string;
};

const defaultCategories: ForumCategory[] = [
    { id: 'cat-general', name: 'General Community Discussions', description: 'Chat about local events, general news, and community topics.', topics: 12, posts: 48, communityId: '' },
    { id: 'cat-services', name: 'Local Services & Recommendations', description: 'Recommend tradespeople, local businesses, or ask for recommendations.', topics: 8, posts: 29, communityId: '' },
    { id: 'cat-safety', name: 'Safety & Neighbourhood Watch', description: 'Share safety updates, neighborhood watch alerts, and local advice.', topics: 5, posts: 18, communityId: '' },
    { id: 'cat-marketplace', name: 'Buy, Sell & Swap Chat', description: 'Discuss items for sale, wanted items, and local swaps.', topics: 15, posts: 64, communityId: '' }
];

// Helper to get category color theme and icon
const getCategoryTheme = (id: string, name: string) => {
  const lowerName = (name || '').toLowerCase();
  const lowerId = (id || '').toLowerCase();

  if (lowerId.includes('general') || lowerName.includes('general') || lowerName.includes('discussion')) {
    return {
      icon: MessageSquare,
      iconBg: "bg-blue-100 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400",
      cardBorder: "border-blue-200/80 dark:border-blue-900/40 hover:border-blue-400 dark:hover:border-blue-600 hover:bg-blue-50/40 dark:hover:bg-blue-950/20",
      badgeClass: "bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800",
      accentBar: "bg-blue-500",
    };
  }

  if (lowerId.includes('service') || lowerName.includes('service') || lowerName.includes('recommendation') || lowerName.includes('trade')) {
    return {
      icon: Wrench,
      iconBg: "bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400",
      cardBorder: "border-emerald-200/80 dark:border-emerald-900/40 hover:border-emerald-400 dark:hover:border-emerald-600 hover:bg-emerald-50/40 dark:hover:bg-emerald-950/20",
      badgeClass: "bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800",
      accentBar: "bg-emerald-500",
    };
  }

  if (lowerId.includes('safety') || lowerName.includes('safety') || lowerName.includes('watch') || lowerName.includes('alert')) {
    return {
      icon: ShieldAlert,
      iconBg: "bg-amber-100 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400",
      cardBorder: "border-amber-200/80 dark:border-amber-900/40 hover:border-amber-400 dark:hover:border-amber-600 hover:bg-amber-50/40 dark:hover:bg-amber-950/20",
      badgeClass: "bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800",
      accentBar: "bg-amber-500",
    };
  }

  if (lowerId.includes('market') || lowerName.includes('buy') || lowerName.includes('sell') || lowerName.includes('swap')) {
    return {
      icon: ShoppingBag,
      iconBg: "bg-purple-100 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400",
      cardBorder: "border-purple-200/80 dark:border-purple-900/40 hover:border-purple-400 dark:hover:border-purple-600 hover:bg-purple-50/40 dark:hover:bg-purple-950/20",
      badgeClass: "bg-purple-50 dark:bg-purple-950/50 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800",
      accentBar: "bg-purple-500",
    };
  }

  return {
    icon: Sparkles,
    iconBg: "bg-primary/10 text-primary",
    cardBorder: "border-primary/20 hover:border-primary/50 hover:bg-primary/5",
    badgeClass: "bg-primary/10 text-primary border-primary/20",
    accentBar: "bg-primary",
  };
};

export default function ForumPage() {
    const { user, isUserLoading: authLoading } = useUser();
    const db = useFirestore();
    const [searchQuery, setSearchQuery] = React.useState("");

    const userProfileRef = useMemoFirebase(() => {
        if (!user || !db) return null;
        return doc(db, 'users', user.uid);
    }, [user, db]);

    const { data: userProfile, isLoading: profileLoading } = useDoc(userProfileRef);

    const activeCommunityId = (typeof window !== 'undefined' ? sessionStorage.getItem('visitedCommunityId') : null) || userProfile?.primaryHomeCommunityId || userProfile?.homeCommunityId || userProfile?.communityId;

    const categoriesQuery = useMemoFirebase(() => {
        if (!activeCommunityId || !db) return null;
        return query(collection(db, "forum-categories"), where("communityId", "==", activeCommunityId));
    }, [db, activeCommunityId]);

    const { data: rawCategories, isLoading: dataLoading } = useCollection<ForumCategory>(categoriesQuery);

    const categories = React.useMemo(() => {
        if (rawCategories && rawCategories.length > 0) return rawCategories;
        return defaultCategories;
    }, [rawCategories]);
    
    const filteredCategories = React.useMemo(() => {
      if (!searchQuery.trim()) return categories;
      const q = searchQuery.toLowerCase();
      return categories.filter(c => c.name.toLowerCase().includes(q) || c.description.toLowerCase().includes(q));
    }, [categories, searchQuery]);

    const totalTopics = React.useMemo(() => categories.reduce((sum, c) => sum + (c.topics || 0), 0), [categories]);
    const totalPosts = React.useMemo(() => categories.reduce((sum, c) => sum + (c.posts || 0), 0), [categories]);

    const loading = authLoading || profileLoading || dataLoading;

    if (loading) {
      return (
          <div className="flex justify-center items-center h-96">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
      );
    }

    return (
        <div className="space-y-8">
            {/* Premium Shimmer Hero Header */}
            <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-sky-500/15 via-indigo-500/15 to-purple-500/15 border border-primary/20 p-6 md:p-10 shadow-lg backdrop-blur-sm">
                {/* Decorative Ambient Glow Orbs */}
                <div className="absolute -top-24 -right-24 w-72 h-72 bg-primary/20 rounded-full blur-3xl pointer-events-none" />
                <div className="absolute -bottom-24 -left-24 w-72 h-72 bg-purple-500/20 rounded-full blur-3xl pointer-events-none" />

                <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-8">
                    <div className="space-y-3 max-w-2xl">
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-background/80 backdrop-blur-md border border-primary/30 text-xs font-semibold text-primary shadow-xs">
                            <Sparkles className="h-3.5 w-3.5 animate-spin" style={{ animationDuration: '4s' }} />
                            <span>Community Hub Discussions</span>
                        </div>
                        
                        <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight font-headline">
                            <span className="bg-gradient-to-r from-sky-600 via-primary to-purple-600 dark:from-sky-400 dark:via-primary dark:to-purple-400 bg-clip-text text-transparent">
                                Community Forum
                            </span>
                        </h1>
                        
                        <p className="text-sm md:text-base text-muted-foreground leading-relaxed">
                            Share ideas, recommend local trades, discuss neighborhood safety, and connect with fellow residents in your community.
                        </p>

                        {/* Search Input Bar */}
                        <div className="relative pt-2 max-w-md">
                          <Search className="absolute left-3.5 top-5 h-4 w-4 text-muted-foreground" />
                          <Input 
                            placeholder="Search categories or discussion topics..." 
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-10 h-11 bg-background/90 backdrop-blur-md border-primary/30 focus-visible:ring-primary shadow-xs rounded-xl text-sm"
                          />
                        </div>
                    </div>

                    {/* Stats & Quick Action Pill */}
                    <div className="flex flex-col sm:flex-row lg:flex-col gap-3 shrink-0">
                        <div className="p-4 rounded-2xl bg-background/80 backdrop-blur-md border border-border/80 shadow-xs flex items-center gap-4">
                            <div className="p-2.5 rounded-xl bg-primary/10 text-primary">
                                <MessageCircleCode className="h-6 w-6" />
                            </div>
                            <div>
                                <div className="text-xl font-bold">{totalTopics}</div>
                                <div className="text-xs text-muted-foreground">Active Topics</div>
                            </div>
                        </div>

                        <div className="p-4 rounded-2xl bg-background/80 backdrop-blur-md border border-border/80 shadow-xs flex items-center gap-4">
                            <div className="p-2.5 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400">
                                <TrendingUp className="h-6 w-6" />
                            </div>
                            <div>
                                <div className="text-xl font-bold">{totalPosts}</div>
                                <div className="text-xs text-muted-foreground">Total Messages</div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Categories Section */}
            <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-bold tracking-tight flex items-center gap-2">
                    <MessagesSquare className="h-5 w-5 text-primary" />
                    Discussion Categories
                  </h2>
                  <span className="text-xs text-muted-foreground">{filteredCategories.length} categories available</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {filteredCategories.map((category) => {
                        const theme = getCategoryTheme(category.id, category.name);
                        const IconComponent = theme.icon;

                        return (
                            <Link 
                                key={category.id} 
                                href={`/forum/${category.id}`} 
                                className="block group focus:outline-none focus:ring-2 focus:ring-primary rounded-xl"
                            >
                                <Card className={cn(
                                  "h-full relative overflow-hidden transition-all duration-200 cursor-pointer shadow-xs hover:shadow-md border",
                                  theme.cardBorder
                                )}>
                                    {/* Left Accent Bar */}
                                    <div className={cn("absolute left-0 top-0 bottom-0 w-1.5 transition-colors", theme.accentBar)} />

                                    <CardContent className="p-5 pl-6 flex flex-col justify-between h-full gap-4">
                                        <div className="flex items-start gap-4">
                                            <div className={cn("p-3 rounded-xl shrink-0 transition-transform group-hover:scale-105", theme.iconBg)}>
                                                <IconComponent className="h-6 w-6" />
                                            </div>
                                            <div className="space-y-1.5 flex-1 min-w-0">
                                                <div className="flex items-center justify-between gap-2">
                                                    <h3 className="font-semibold text-lg text-foreground group-hover:text-primary transition-colors line-clamp-1">
                                                        {category.name}
                                                    </h3>
                                                    <ArrowRight className="h-4 w-4 text-muted-foreground/60 shrink-0 group-hover:text-primary group-hover:translate-x-1 transition-all" />
                                                </div>
                                                <p className="text-xs md:text-sm text-muted-foreground leading-relaxed line-clamp-2">
                                                    {category.description}
                                                </p>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-3 pt-3 border-t border-border/50 text-xs font-medium text-muted-foreground">
                                            <Badge variant="outline" className={cn("gap-1 py-0.5 px-2 font-medium text-xs", theme.badgeClass)}>
                                                <FileText className="h-3.5 w-3.5" />
                                                {category.topics || 0} {category.topics === 1 ? 'Topic' : 'Topics'}
                                            </Badge>
                                            <Badge variant="outline" className="gap-1 py-0.5 px-2 font-medium text-xs bg-muted/30">
                                                <Users className="h-3.5 w-3.5" />
                                                {category.posts || 0} {category.posts === 1 ? 'Post' : 'Posts'}
                                            </Badge>
                                        </div>
                                    </CardContent>
                                </Card>
                            </Link>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
