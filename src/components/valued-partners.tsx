
'use client';
import * as React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from './ui/card';
import { mockPartners } from '@/lib/mock-data';
import Image from 'next/image';
import { Button } from './ui/button';
import Link from 'next/link';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from './ui/dialog';
import { ExternalLink, Loader2, ArrowRight } from 'lucide-react';
import { Carousel, CarouselContent, CarouselItem } from './ui/carousel';
import Autoplay from "embla-carousel-autoplay"
import { useFirestore, useCollection, useMemoFirebase, useUser, useDoc } from '@/firebase';
import { collection, query, where, doc, getDoc } from 'firebase/firestore';
import { ScrollArea } from './ui/scroll-area';

type PartnerAd = {
  id: string;
  headline: string;
  image?: string;
  link?: string;
  fullDescription?: string;
  description?: string; // for mock data
  logo?: { imageUrl: string; imageHint: string; }; // for mock data
  name?: string; // for mock data
  targetCountries?: string[];
  targetAgeRanges?: string[];
  targetGender?: 'all' | 'male' | 'female';
  type: 'featured' | 'partner';
  targetCategories?: string[];
};

export function ValuedPartners({ layout = 'fade' }: { layout?: 'fade' | 'carousel' }) {
    const { user, isUserLoading } = useUser();
    const db = useFirestore();
    const userProfileRef = useMemoFirebase(() => (user ? doc(db, 'users', user.uid) : null), [user, db]);
    const { data: userProfile, isLoading: profileLoading } = useDoc(userProfileRef);

    const partnersQuery = useMemoFirebase(() => {
        if (!db) return null;
        return query(
            collection(db, 'adverts'),
            where('status', '==', 'Active')
        );
    }, [db]);

    const { data: activeAdverts, isLoading: partnersLoading } = useCollection<PartnerAd>(partnersQuery);
    
    const partners = React.useMemo(() => {
        if (!activeAdverts) return [];
        return activeAdverts.filter(ad => ad.type === 'partner');
    }, [activeAdverts]);

    const [randomPartners, setRandomPartners] = React.useState<any[]>([]);
    const [currentIndex, setCurrentIndex] = React.useState(0);
    const plugin = React.useRef(
      Autoplay({ delay: 3000, stopOnInteraction: true })
    )

    React.useEffect(() => {
        if (partnersLoading || profileLoading) return;

        const sourceAds = (partners && partners.length > 0) ? partners : mockPartners.map(p => ({
            id: p.id,
            headline: p.name,
            image: p.logo?.imageUrl,
            link: '#',
            fullDescription: p.description,
        }));

        let eligibleAds: PartnerAd[] = [];
        
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

        const shuffled = [...eligibleAds].sort(() => 0.5 - Math.random());
        setRandomPartners(shuffled);

    }, [partners, user, userProfile, partnersLoading, profileLoading]);
    
     React.useEffect(() => {
        if (layout === 'fade' && randomPartners.length > 1) {
            const timer = setInterval(() => {
                setCurrentIndex(prevIndex => (prevIndex + 1) % randomPartners.length);
            }, 3000); // Change image every 3 seconds

            return () => clearInterval(timer);
        }
    }, [randomPartners.length, layout]);

    const isLoading = isUserLoading || profileLoading || partnersLoading;

    if (isLoading) {
        return (
             <Card>
                <CardHeader>
                    <CardTitle>Our Valued Partners</CardTitle>
                    <CardDescription>Organizations we work with to improve our communities.</CardDescription>
                </CardHeader>
                <CardContent className="h-24 flex justify-center items-center">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </CardContent>
            </Card>
        );
    }
    
    if (randomPartners.length === 0) return null;

    if (layout === 'carousel') {
        return (
            <Card>
                <CardHeader>
                    <CardTitle>Our Valued Partners</CardTitle>
                    <CardDescription>Organizations we work with to improve our communities.</CardDescription>
                </CardHeader>
                <CardContent>
                    <Carousel
                        opts={{
                            align: "start",
                            loop: randomPartners.length > 2,
                        }}
                        plugins={[plugin.current]}
                        onMouseEnter={plugin.current.stop}
                        onMouseLeave={plugin.current.reset}
                        className="w-full"
                    >
                        <CarouselContent className="-ml-4">
                            {randomPartners.map((partner, index) => (
                                <CarouselItem key={`${partner.id}-${index}`} className="pl-4 basis-1/2 md:basis-1/3 lg:basis-1/4">
                                     <Dialog>
                                        <DialogTrigger asChild>
                                            <div className="block group w-full flex-shrink-0 cursor-pointer p-4 border rounded-lg hover:shadow-md h-full">
                                                <div className="flex flex-col items-center text-center gap-2 h-full justify-between">
                                                    {partner.image && (
                                                        <div className="relative h-16 w-32">
                                                            <Image
                                                                src={partner.image}
                                                                alt={partner.headline}
                                                                fill
                                                                className="object-contain"
                                                            />
                                                        </div>
                                                    )}
                                                    <p className="text-xs font-medium text-muted-foreground group-hover:text-primary transition-colors truncate w-full">{partner.headline}</p>
                                                </div>
                                            </div>
                                        </DialogTrigger>
                                        <DialogContent className="sm:max-w-xl">
                                            <DialogHeader>
                                                <DialogTitle>{partner.headline}</DialogTitle>
                                            </DialogHeader>
                                            <ScrollArea className="max-h-[60vh] pr-6">
                                                <div className="py-4 space-y-4">
                                                    <div className="relative w-full aspect-video rounded-md overflow-hidden bg-muted">
                                                        <Image src={partner.image} alt={partner.headline} fill className="object-contain p-4" />
                                                    </div>
                                                    <div className="prose dark:prose-invert max-w-none" dangerouslySetInnerHTML={{ __html: partner.fullDescription || partner.description }} />
                                                </div>
                                            </ScrollArea>
                                            <DialogFooter>
                                                <Button asChild variant="outline">
                                                    <Link href={partner.link || '#'} target="_blank">
                                                        <ExternalLink className="mr-2 h-4 w-4" />
                                                        Visit Site
                                                    </Link>
                                                </Button>
                                            </DialogFooter>
                                        </DialogContent>
                                    </Dialog>
                                </CarouselItem>
                            ))}
                        </CarouselContent>
                    </Carousel>
                </CardContent>
                <CardFooter>
                    <Button variant="outline" asChild>
                        <Link href="/national-advertisers">
                            See All Partners <ArrowRight className="ml-2 h-4 w-4" />
                        </Link>
                    </Button>
                </CardFooter>
            </Card>
        );
    }

    return (
        <Card className="overflow-hidden">
        <CardHeader>
            <CardTitle>Our Valued Partners</CardTitle>
            <CardDescription>Organizations we work with to improve our communities.</CardDescription>
        </CardHeader>
        <CardContent>
             <div className="relative h-24 w-full">
                {randomPartners.map((partner, index) => (
                    <Dialog key={`${partner.id}-${index}`}>
                        <DialogTrigger asChild>
                            <div
                                className="absolute inset-0 flex items-center justify-center transition-opacity duration-1000"
                                style={{ opacity: index === currentIndex ? 1 : 0, pointerEvents: index === currentIndex ? 'auto' : 'none' }}
                            >
                                <div className="block group w-full flex-shrink-0 cursor-pointer p-4">
                                    <div className="flex flex-col items-center text-center gap-2">
                                        {partner.image && (
                                            <div className="relative h-16 w-32">
                                                <Image
                                                    src={partner.image}
                                                    alt={partner.headline}
                                                    fill
                                                    className="object-contain"
                                                />
                                            </div>
                                        )}
                                        <p className="text-xs font-medium text-muted-foreground group-hover:text-primary transition-colors truncate w-full">{partner.headline}</p>
                                    </div>
                                </div>
                            </div>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-xl">
                            <DialogHeader>
                                <DialogTitle>{partner.headline}</DialogTitle>
                            </DialogHeader>
                            <ScrollArea className="max-h-[60vh] pr-6">
                                <div className="py-4 space-y-4">
                                     <div className="relative w-full aspect-video rounded-md overflow-hidden bg-muted">
                                        <Image src={partner.image} alt={partner.headline} fill className="object-contain p-4" />
                                    </div>
                                    <div className="prose dark:prose-invert max-w-none" dangerouslySetInnerHTML={{ __html: partner.fullDescription || partner.description }} />
                                </div>
                            </ScrollArea>
                            <DialogFooter>
                                <Button asChild variant="outline">
                                    <Link href={partner.link || '#'} target="_blank">
                                        <ExternalLink className="mr-2 h-4 w-4" />
                                        Visit Site
                                    </Link>
                                </Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>
                ))}
            </div>
        </CardContent>
        </Card>
    );
}
