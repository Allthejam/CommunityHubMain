
"use client";

import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { doc } from "firebase/firestore";
import { useFirestore, useDoc, useMemoFirebase } from "@/firebase";
import { format } from "date-fns";
import {
    ArrowLeft,
    Loader2,
    Calendar,
    User,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

type NewsStory = {
    title: string;
    category: string;
    shortDescription: string;
    content: string;
    image: string | null;
    authorName: string;
    authorAvatar?: string;
    date: { toDate: () => Date };
};

export default function NewsArticlePage() {
    const params = useParams();
    const router = useRouter();
    const { storyId } = params;
    const db = useFirestore();
    
    const storyRef = useMemoFirebase(() => {
        if (!storyId || !db) return null;
        return doc(db, 'news', storyId as string);
    }, [storyId, db]);

    const { data: story, isLoading: loading } = useDoc<NewsStory>(storyRef);

    if (loading) {
        return (
            <div className="flex justify-center items-center h-96">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        );
    }

    if (!story) {
        return (
            <div className="text-center py-12">
                <h1 className="text-2xl font-bold">Story Not Found</h1>
                <p className="text-muted-foreground">This news story could not be found or has been removed.</p>
                <Button asChild variant="link" className="mt-4">
                    <Link href="/news"><ArrowLeft className="mr-2 h-4 w-4" />Back to News</Link>
                </Button>
            </div>
        );
    }
    
    return (
         <div className="max-w-4xl mx-auto py-8">
            <Button variant="ghost" className="mb-4" onClick={() => router.back()}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to News
            </Button>
            <main className="space-y-8">
                <article>
                    <header className="mb-8 text-center">
                        <Badge variant="secondary" className="mb-4">{story.category}</Badge>
                        <h1 className="text-4xl md:text-5xl font-bold tracking-tight font-headline mb-4">
                            {story.title}
                        </h1>
                        {story.shortDescription && (
                             <p className="text-lg text-muted-foreground mt-2 max-w-2xl mx-auto">{story.shortDescription}</p>
                        )}
                        <div className="flex items-center justify-center gap-4 text-sm text-muted-foreground mt-4">
                             <div className="flex items-center gap-2">
                                <Avatar className="h-8 w-8">
                                    <AvatarImage src={story.authorAvatar} alt={story.authorName} />
                                    <AvatarFallback>{story.authorName?.[0]}</AvatarFallback>
                                </Avatar>
                                <span>By {story.authorName}</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <Calendar className="h-4 w-4" />
                                <span>Published on {format(story.date.toDate(), "PPP")}</span>
                            </div>
                        </div>
                    </header>
                    
                    {story.image && (
                         <div className="relative w-full max-w-[600px] mx-auto aspect-video rounded-lg overflow-hidden mb-8 flex justify-center bg-transparent">
                            <Image
                                src={story.image}
                                alt={story.title}
                                width={600}
                                height={400}
                                className="object-contain"
                                priority
                            />
                        </div>
                    )}
                    <Card>
                        <CardContent className="p-6">
                            <div 
                                className="prose dark:prose-invert max-w-none"
                                dangerouslySetInnerHTML={{ __html: story.content }}
                            />
                            <Separator className="my-8" />
                            <div className="text-right text-sm text-muted-foreground">
                                Written by {story.authorName}
                            </div>
                        </CardContent>
                    </Card>
                </article>
            </main>
        </div>
    )
}
