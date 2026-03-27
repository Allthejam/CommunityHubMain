
'use client';
import * as React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from './ui/card';
import { mockNationalAdverts } from '@/lib/mock-data';
import Image from 'next/image';
import { Button } from './ui/button';
import Link from 'next/link';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from './ui/dialog';
import { ExternalLink, Loader2, Megaphone, ArrowRight } from 'lucide-react';
import { Carousel, CarouselContent, CarouselItem } from './ui/carousel';
import Autoplay from "embla-carousel-autoplay"
import { useFirestore, useCollection, useMemoFirebase, useUser, useDoc } from '@/firebase';
import { collection, query, where, doc, getDoc } from 'firebase/firestore';
import { ScrollArea } from './ui/scroll-area';

type Advert = {
  id: string;
  headline: string;
  shortDescription: string;
  fullDescription: string;
  image: string;
  link: string;
  type: 'featured' | 'partner';
  status: 'Active';
  brand?: string; // For mock data compatibility
  targetCountries?: string[];
  targetAgeRanges?: string[];
  targetGender?: 'all' | 'male' | 'female';
  targetCategories?: string[];
};

const FullWidthAdvertCard = ({ advert }: { advert: Advert }) => (
    <Card className="overflow-hidden">
        <div className="grid md:grid-cols-2 items-center">
            <div className="p-6 sm:p-8 lg:p-12 order-2 md:order-1">
                <CardHeader className="p-0">
                    <CardTitle className="text-2xl font-bold font-headline">{advert.headline}</CardTitle>
                    <CardDescription>{advert.shortDescription}</CardDescription>
                </CardHeader>
                <CardContent className="p-0 pt-4">
                    <div className="flex gap-2 mt-4">
                        <Dialog>
                            <DialogTrigger asChild>
                                <Button>Learn More</Button>
                            </DialogTrigger>
                            <DialogContent className="sm:max-w-xl">
                                <DialogHeader>
                                    <DialogTitle>{advert.headline}</DialogTitle>
                                </DialogHeader>
                                <ScrollArea className="max-h-[60vh] pr-6">
                                  <div className="py-4 space-y-4">
                                     <div className="relative w-full aspect-video rounded-md overflow-hidden bg-muted">
                                        <Image src={advert.image} alt={advert.headline} fill className="object-contain p-4" />
                                    </div>
                                    <div className="prose dark:prose-invert max-w-none" dangerouslySetInnerHTML={{ __html: advert.fullDescription || (advert as any).description }} />
                                  </div>
                                </ScrollArea>
                            </DialogContent>
                        </Dialog>
                        <Button asChild variant="outline">
                            <Link href={advert.link || '#'} target="_blank">
                                <ExternalLink className="mr-2 h-4 w-4" />
                                Visit Site
                            </Link>
                        </Button>
                    </div>
                </CardContent>
            </div>
            <div className="relative order-1 w-full aspect-video md:aspect-auto md:h-full">
                {advert.image &&
                <Image
                    src={advert.image}
                    alt={advert.headline}
                    fill
                    className="object-cover"
                />}
            </div>
        </div>
    </Card>
);

const FeedAdvertCard = ({ advert }: { advert: Advert }) => (
    <Dialog>
        <DialogTrigger asChild>
             <Card className="overflow-hidden cursor-pointer hover:shadow-md transition-shadow">
                <div className="relative w-full aspect-[4/3] bg-muted">
                    {advert.image && <Image
                        src={advert.image}
                        alt={advert.headline}
                        fill
                        className="object-cover"
                    />}
                </div>
                <CardContent className="p-3">
                    <h4 className="font-semibold text-sm truncate">{advert.headline}</h4>
                    <p className="text-xs text-muted-foreground line-clamp-2">{advert.shortDescription}</p>
                </CardContent>
            </Card>
        </DialogTrigger>
        <DialogContent className="sm:max-w-xl">
            <DialogHeader>
                <DialogTitle>{advert.headline}</DialogTitle>
            </DialogHeader>
            <ScrollArea className="max-h-[60vh] pr-6">
              <div className="py-4 space-y-4">
                 <div className="relative w-full aspect-video rounded-md overflow-hidden bg-muted">
                    <Image src={advert.image} alt={advert.headline} fill className="object-contain p-4" />
                </div>
                <div className="prose dark:prose-invert max-w-none" dangerouslySetInnerHTML={{ __html: advert.fullDescription || (advert as any).description }} />
              </div>
            </ScrollArea>
             <DialogFooter>
                <Button asChild variant="outline">
                    <Link href={advert.link || '#'} target="_blank">
                        <ExternalLink className="mr-2 h-4 w-4" />
                        Visit Site
                    </Link>
                </Button>
            </DialogFooter>
        </DialogContent>
    </Dialog>
);


export function NationalAdvertisers({ layout = 'full' }: { layout?: 'full' | 'compact' }) {
    const { user, isUserLoading } = useUser();
    const db = useFirestore();
    const userProfileRef = useMemoFirebase(() => (user ? doc(db, 'users', user.uid) : null), [user, db]);
    const { data: userProfile, isLoading: profileLoading } = useDoc(userProfileRef);

    const advertsQuery = useMemoFirebase(() => {
        if (!db) return null;
        return query(
            collection(db, 'adverts'),
            where('status', '==', 'Active')
        );
    }, [db]);

    const { data: activeAdverts, isLoading: advertsLoading } = useCollection<Advert>(advertsQuery);
    
    const [eligibleAds, setEligibleAds] = React.useState<Advert[]>([]);

    const plugin = React.useRef(
      Autoplay({ delay: 5000, stopOnInteraction: true })
    )

    React.useEffect(() => {
        if (advertsLoading || profileLoading) return;

        const sourceAds = (activeAdverts && activeAdverts.length > 0) ? activeAdverts : mockNationalAdverts.map(ad => ({
            ...ad, 
            headline: ad.brand,
            shortDescription: ad.tagline,
            fullDescription: ad.description,
            image: ad.image?.imageUrl || '',
            type: 'featured',
            status: 'Active'
        }));

        let eligibleAds: Advert[] = [];
        
        if (user && userProfile && userProfile.settings?.adPersonalization) {
            const userCategories = userProfile.settings.selectedCategories || [];
            
            if (userCategories.length === 0) {
                 eligibleAds = sourceAds;
            } else {
                 eligibleAds = sourceAds.filter(ad => {
                    const categoryMatch = !ad.targetCategories || ad.targetCategories.length === 0 || ad.targetCategories.some(cat => userCategories.includes(cat));
                    return categoryMatch;
                });
            }
        } else {
             eligibleAds = sourceAds;
        }
        
        // Fallback if filtering results in an empty list
        if (eligibleAds.length === 0 && sourceAds.length > 0) {
            eligibleAds = sourceAds;
        }

        setEligibleAds(eligibleAds.filter(ad => ad.type === 'featured'));

    }, [activeAdverts, user, userProfile, advertsLoading, profileLoading]);
    
    const isLoading = isUserLoading || profileLoading || advertsLoading;

    if (isLoading) {
        return (
             <Card>
                <CardHeader>
                    <CardTitle>Featured Advert</CardTitle>
                </CardHeader>
                <CardContent className="h-48 flex justify-center items-center">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </CardContent>
            </Card>
        )
    }
    
    if (eligibleAds.length === 0) return null;

    if (layout === 'compact') {
        return (
            <Card>
                <CardHeader>
                    <CardTitle>Featured Advert</CardTitle>
                </CardHeader>
                <CardContent>
                    <Carousel 
                        opts={{ loop: eligibleAds.length > 1 }} 
                        plugins={[plugin.current]}
                        onMouseEnter={plugin.current.stop}
                        onMouseLeave={plugin.current.reset}
                        className="w-full"
                    >
                        <CarouselContent>
                            {eligibleAds.map(advert => (
                                <CarouselItem key={advert.id}>
                                    <FeedAdvertCard advert={advert} />
                                </CarouselItem>
                            ))}
                        </CarouselContent>
                    </Carousel>
                </CardContent>
                <CardFooter>
                    <Button variant="outline" asChild>
                        <Link href="/national-advertisers">
                            See All <ArrowRight className="ml-2 h-4 w-4" />
                        </Link>
                    </Button>
                </CardFooter>
            </Card>
        );
    }
    
    return (
        <div className="space-y-4">
            <Carousel 
                opts={{ loop: eligibleAds.length > 1 }} 
                plugins={[plugin.current]}
                onMouseEnter={plugin.current.stop}
                onMouseLeave={plugin.current.reset}
                className="w-full"
            >
                <CarouselContent>
                    {eligibleAds.map(advert => (
                        <CarouselItem key={advert.id}>
                            <FullWidthAdvertCard advert={advert} />
                        </CarouselItem>
                    ))}
                </CarouselContent>
            </Carousel>
            <div className="text-center">
                <Button variant="outline" asChild>
                    <Link href="/national-advertisers">
                        See All National Adverts <ArrowRight className="ml-2 h-4 w-4" />
                    </Link>
                </Button>
            </div>
        </div>
    );
}
