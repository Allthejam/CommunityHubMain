'use client';
import * as React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from './ui/card';
import { mockCharities } from '@/lib/mock-data';
import Image from 'next/image';
import { HeartHandshake, Loader2, ArrowRight } from 'lucide-react';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from './ui/select';
import { Button } from './ui/button';
import Link from 'next/link';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { ScrollArea } from './ui/scroll-area';
import { useUser, useFirestore, useDoc, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, where, doc } from 'firebase/firestore';
import { useIsMobile } from '@/hooks/use-mobile';
import { Carousel, CarouselContent, CarouselItem } from "@/components/ui/carousel";
import Autoplay from "embla-carousel-autoplay";

type Charity = {
  id: string;
  title: string;
  category: string;
  description: string;
  image?: string;
  dataAiHint?: string;
  website?: string;
};

// This is the structure for the mock data
type MockCharity = {
    id: number;
    title: string;
    category: string;
    description: string;
    image?: {
        imageUrl: string;
        imageHint: string;
    };
};

const CharityDialogContent = ({ charity }: { charity: Charity }) => (
    <>
        <DialogHeader className="p-6 pb-2">
            <DialogTitle>{charity.title}</DialogTitle>
            <DialogDescription>
               Local Charity
            </DialogDescription>
        </DialogHeader>
        <div className="grid overflow-y-auto">
          <ScrollArea className="max-h-[60vh] px-6">
              <div className="space-y-4 pr-1 pb-4">
                  {charity.image && (
                      <div className="relative w-full aspect-video rounded-md overflow-hidden">
                          <Image src={charity.image} alt={charity.title} fill className="object-cover" />
                      </div>
                  )}
                  <div 
                    className="text-sm text-muted-foreground prose dark:prose-invert max-w-none"
                    dangerouslySetInnerHTML={{ __html: charity.description }}
                  />
              </div>
          </ScrollArea>
        </div>
         <DialogFooter className="p-6 pt-4 border-t sm:justify-start">
            {charity.website ? (
                <Button asChild>
                    <Link href={!charity.website.startsWith('http') ? `https://${charity.website}` : charity.website} target="_blank" rel="noopener noreferrer">
                        Donate or Volunteer
                    </Link>
                </Button>
            ) : (
                <Button disabled>No Website Provided</Button>
            )}
        </DialogFooter>
    </>
);

const CharityCard = ({ charity }: { charity: Charity }) => (
     <Dialog>
        <DialogTrigger asChild>
            <Card className="flex flex-col overflow-hidden group cursor-pointer hover:shadow-lg transition-shadow h-full">
                <CardHeader className="p-0">
                    <div className="relative w-full aspect-square bg-muted">
                        {charity.image && (
                            <Image
                                src={charity.image}
                                alt={charity.title}
                                fill
                                className="object-cover transition-transform duration-300 group-hover:scale-105"
                                data-ai-hint={charity.dataAiHint || 'charity'}
                            />
                        )}
                    </div>
                </CardHeader>
                <CardContent className="p-4 flex-grow">
                    <h3 className="font-semibold text-lg line-clamp-2 h-14">{charity.title}</h3>
                </CardContent>
                <CardFooter className="p-4 pt-0 mt-auto">
                    <div className="text-sm font-medium text-primary w-full text-center">Learn More</div>
                </CardFooter>
            </Card>
        </DialogTrigger>
        <DialogContent className="sm:max-w-lg grid grid-rows-[auto_minmax(0,1fr)_auto] p-0 max-h-[90vh]">
           <CharityDialogContent charity={charity} />
        </DialogContent>
     </Dialog>
);


export function LocalCharitiesFeed() {
  const [displayCount, setDisplayCount] = React.useState(3);
  const { user, isUserLoading: authLoading } = useUser();
  const db = useFirestore();
  const isMobile = useIsMobile();
  const plugin = React.useRef(Autoplay({ delay: 5000, stopOnInteraction: true }));

  const userProfileRef = useMemoFirebase(() => (user && db ? doc(db, 'users', user.uid) : null), [user, db]);
  const { data: userProfile, isLoading: profileLoading } = useDoc(userProfileRef);

  const charitiesQuery = useMemoFirebase(() => {
    if (!userProfile?.communityId || !db) return null;
    return query(
        collection(db, "charities"),
        where("communityId", "==", userProfile.communityId),
        where("status", "==", "Active")
    );
  }, [db, userProfile?.communityId]);

  const { data: liveCharities, isLoading: charitiesLoading } = useCollection<Charity>(charitiesQuery);

  const charitiesToDisplay = (liveCharities && liveCharities.length > 0)
    ? liveCharities
    : mockCharities.map(c => ({
        ...c,
        id: String(c.id),
        image: c.image?.imageUrl,
        dataAiHint: c.image?.imageHint
    }));
    
  const loading = authLoading || profileLoading || charitiesLoading;

  if (loading) {
    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <HeartHandshake className="h-6 w-6" />
                    Support Local Charities
                </CardTitle>
                <CardDescription>Get involved with organizations making a difference.</CardDescription>
            </CardHeader>
            <CardContent className="h-48 flex justify-center items-center">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </CardContent>
        </Card>
    );
  }

  if (charitiesToDisplay.length === 0) return null;

  return (
    <Card>
      <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
        <div>
          <CardTitle className="flex items-center gap-2">
            <HeartHandshake className="h-6 w-6" />
            Support Local Charities
          </CardTitle>
          <CardDescription>Get involved with organizations making a difference.</CardDescription>
        </div>
        <div className="w-full sm:w-auto">
            <Select value={String(displayCount)} onValueChange={(value) => setDisplayCount(Number(value))}>
                <SelectTrigger className="w-full sm:w-[120px]">
                    <SelectValue placeholder="Show..." />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="3">Show 3</SelectItem>
                    <SelectItem value="6">Show 6</SelectItem>
                    <SelectItem value="9">Show 9</SelectItem>
                </SelectContent>
            </Select>
        </div>
      </CardHeader>
      <CardContent>
        {isMobile ? (
             <Carousel
                opts={{ align: "start", loop: charitiesToDisplay.length > 1 }}
                plugins={[plugin.current]}
                onMouseEnter={plugin.current.stop}
                onMouseLeave={plugin.current.reset}
                className="w-full"
            >
                <CarouselContent className="-ml-2">
                {charitiesToDisplay.slice(0, 5).map((charity) => (
                    <CarouselItem key={charity.id} className="pl-2 basis-2/3">
                       <CharityCard charity={charity} />
                    </CarouselItem>
                ))}
                </CarouselContent>
            </Carousel>
        ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {charitiesToDisplay.slice(0, displayCount).map(charity => (
                <CharityCard key={charity.id} charity={charity} />
              ))}
            </div>
        )}
      </CardContent>
       <CardFooter>
        <Button variant="outline" asChild>
            <Link href="/charities">See All Charities <ArrowRight className="ml-2 h-4 w-4" /></Link>
        </Button>
      </CardFooter>
    </Card>
  );
}
