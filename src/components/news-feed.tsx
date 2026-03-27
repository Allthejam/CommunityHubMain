
'use client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from './ui/card';
import { mockNews } from '@/lib/mock-data';
import Image from 'next/image';
import { Button } from './ui/button';
import Link from 'next/link';
import { Newspaper, ArrowRight, Loader2 } from 'lucide-react';
import { Badge } from './ui/badge';
import { format } from 'date-fns';
import { useUser, useFirestore, useDoc, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, where, doc } from 'firebase/firestore';
import React from 'react';
import { useIsMobile } from '@/hooks/use-mobile';
import { Carousel, CarouselContent, CarouselItem } from "@/components/ui/carousel";
import Autoplay from "embla-carousel-autoplay";

type NewsStory = {
    id: string;
    title: string;
    author: string;
    category: string;
    image?: string;
    dataAiHint?: string;
    date: { toDate: () => Date } | Date; // Allow both Timestamp and Date
};

type MappedNewsStory = {
    id: string;
    title: string;
    author: string;
    category: string;
    image?: {
        imageUrl: string;
        imageHint: string;
    };
    date: Date;
}

const NewsStoryCard = ({ story }: { story: MappedNewsStory }) => (
    <Card className="flex flex-col overflow-hidden h-full">
        <CardHeader className="p-0">
            <div className="relative w-full aspect-[4/3] bg-muted">
                {story.image && (
                    <Image
                        src={story.image.imageUrl}
                        alt={story.title}
                        fill
                        className="object-cover transition-transform duration-300 group-hover:scale-105"
                        data-ai-hint={story.image.imageHint}
                    />
                )}
            </div>
        </CardHeader>
        <CardContent className="p-4 flex-grow">
            <Badge variant="secondary" className="mb-2">{story.category}</Badge>
            <h3 className="font-semibold text-lg line-clamp-2">{story.title}</h3>
            <p className="text-sm text-muted-foreground mt-1">By {story.author} on {story.date instanceof Date ? format(story.date, "PPP") : format(new Date(story.date), "PPP")}</p>
        </CardContent>
        <CardFooter className="p-4 pt-0">
            <Button asChild size="sm" className="w-full">
                <Link href={`/news/${story.id}`}>
                    Read More <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
            </Button>
        </CardFooter>
    </Card>
);

export function NewsFeed() {
  const { user, isUserLoading: authLoading } = useUser();
  const db = useFirestore();

  const userProfileRef = useMemoFirebase(() => (user && db ? doc(db, 'users', user.uid) : null), [user, db]);
  const { data: userProfile, isLoading: profileLoading } = useDoc(userProfileRef);

  const newsQuery = useMemoFirebase(() => {
    if (!userProfile?.communityId || !db) return null;
    return query(
        collection(db, "news"),
        where("communityId", "==", userProfile.communityId),
        where("status", "==", "Published")
    );
  }, [db, userProfile?.communityId]);
  
  const { data: liveNews, isLoading: newsLoading } = useCollection<NewsStory>(newsQuery);
  
  const newsToDisplay: MappedNewsStory[] = React.useMemo(() => {
    const sourceData = (liveNews && liveNews.length > 0) ? liveNews : mockNews;
    
    return sourceData.map(story => {
        const storyDate = (story.date as any)?.toDate ? (story.date as any).toDate() : new Date(story.date);
        
        return {
            id: String(story.id),
            title: story.title,
            author: story.author,
            category: story.category,
            image: story.image 
                ? (typeof story.image === 'string' 
                    ? { imageUrl: story.image, imageHint: story.dataAiHint || 'news story' }
                    : (story.image as any))
                : undefined,
            date: storyDate,
        };
    });
  }, [liveNews]);

  const loading = authLoading || profileLoading || newsLoading;
  
  const isMobile = useIsMobile();
  const plugin = React.useRef(Autoplay({ delay: 5000, stopOnInteraction: true }));


  if (loading) {
     return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Newspaper className="h-6 w-6" />
                    Local News
                </CardTitle>
                <CardDescription>The latest headlines from your community.</CardDescription>
            </CardHeader>
            <CardContent className="h-48 flex justify-center items-center">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </CardContent>
        </Card>
    );
  }

  if (newsToDisplay.length === 0) return null;


  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
            <Newspaper className="h-6 w-6" />
            Local News
        </CardTitle>
        <CardDescription>The latest headlines from your community.</CardDescription>
      </CardHeader>
      <CardContent>
        {isMobile ? (
             <Carousel
                opts={{ align: "start", loop: newsToDisplay.length > 1 }}
                plugins={[plugin.current]}
                onMouseEnter={plugin.current.stop}
                onMouseLeave={plugin.current.reset}
                className="w-full"
            >
                <CarouselContent className="-ml-2">
                {newsToDisplay.slice(0, 5).map(story => (
                    <CarouselItem key={story.id} className="pl-2 basis-2/3">
                        <NewsStoryCard story={story} />
                    </CarouselItem>
                ))}
                </CarouselContent>
            </Carousel>
        ) : (
             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {newsToDisplay.slice(0, 3).map(story => <NewsStoryCard key={story.id} story={story} />)}
            </div>
        )}
      </CardContent>
       <CardFooter>
        <Button variant="outline" asChild>
          <Link href="/news">
            See All News Stories <ArrowRight className="ml-2 h-4 w-4" />
          </Link>
        </Button>
      </CardFooter>
    </Card>
  );
}
