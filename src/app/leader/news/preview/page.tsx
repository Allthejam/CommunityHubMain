
"use client";

import * as React from "react";
import Image from "next/image";
import Link from "next/link";
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
import { useRouter } from "next/navigation";

type NewsStoryPreview = {
    title: string;
    category: string;
    shortDescription: string;
    content: string;
    image: string | null;
    authorName: string;
    authorAvatar?: string;
    date: string;
};

export default function NewsPreviewPage() {
    const [story, setStory] = React.useState<NewsStoryPreview | null>(null);
    const [loading, setLoading] = React.useState(true);
    const router = useRouter();

    React.useEffect(() => {
        try {
            const storedStory = sessionStorage.getItem('newsStoryPreview');
            if (storedStory) {
                setStory(JSON.parse(storedStory));
            }
        } catch (error) {
            console.error("Failed to parse story data from sessionStorage", error);
        } finally {
            setLoading(false);
        }
    }, []);

    if (loading) {
        return (
            <div className="flex justify-center items-center h-96">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        );
    }

    if (!story) {
        return (
            <div className="text-center">
                <h1 className="text-2xl font-bold">No Preview Data Found</h1>
                <p className="text-muted-foreground">Please go back to the editor and click "Preview" again.</p>
                <Button asChild variant="link" className="mt-4">
                    <Link href="/leader/news/create"><ArrowLeft className="mr-2 h-4 w-4" />Back to Editor</Link>
                </Button>
            </div>
        );
    }
    
    return (
         <div className="max-w-4xl mx-auto py-8">
            <Button variant="ghost" className="mb-4" onClick={() => router.back()}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Editor
            </Button>
            <main>
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
                                <span>Published on {format(new Date(story.date), "PPP")}</span>
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
                    <div 
                        className="prose dark:prose-invert max-w-none"
                        dangerouslySetInnerHTML={{ __html: story.content }}
                    />
                </article>
            </main>
        </div>
    )
}
