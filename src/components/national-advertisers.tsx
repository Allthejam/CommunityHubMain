'use client';

import * as React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  Loader2, 
  Megaphone, 
  ExternalLink, 
  ChevronDown, 
  FilterX, 
  X, 
  Star, 
  Handshake, 
  Store 
} from "lucide-react";
import { useFirestore, useCollection, useMemoFirebase, useUser, useDoc } from "@/firebase";
import { collection, query, where, doc } from "firebase/firestore";
import Link from 'next/link';
import Image from 'next/image';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { ScrollArea } from './ui/scroll-area';
import { DropdownMenu, DropdownMenuCheckboxItem, DropdownMenuContent, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { mockNationalAdverts } from '@/lib/mock-data';
import { Carousel, CarouselContent, CarouselItem } from './ui/carousel';
import Autoplay from "embla-carousel-autoplay";
import { cn } from '@/lib/utils';
import { AspectRatio } from './ui/aspect-ratio';

type Advert = {
  id: string;
  headline: string;
  brand?: string;
  tagline?: string;
  description?: string;
  image?: any;
  shortDescription: string;
  fullDescription: string;
  link: string;
  type: 'featured' | 'partner';
  targetCategories?: string[];
  targetCountries?: string[];
  status: 'Active' | 'Scheduled';
  startDate?: { toDate: () => Date };
  endDate?: { toDate: () => Date };
};

const AdvertCard = ({ advert, layout = 'full' }: { advert: Advert; layout?: 'full' | 'compact' | 'feed' }) => {
    if (layout === 'compact') {
        return (
            <Dialog>
                <DialogTrigger asChild>
                    <div className="flex items-center justify-between p-4 rounded-lg bg-background border cursor-pointer hover:bg-muted/50 transition-all h-[216px] group shadow-sm">
                        <div className="flex-1 pr-4 overflow-hidden flex flex-col justify-center">
                            <h4 className="font-bold text-base sm:text-lg line-clamp-1 mb-1 text-primary group-hover:underline">
                                {advert.headline}
                            </h4>
                            <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                                {advert.shortDescription}
                            </p>
                            <span className="text-[10px] font-bold text-primary mt-3 block uppercase tracking-widest opacity-80">
                                Premium Offer
                            </span>
                        </div>
                        <div className="relative h-full aspect-square flex-shrink-0 rounded-md overflow-hidden bg-muted border ml-2">
                            {advert.image && (
                                <Image
                                    src={advert.image}
                                    alt={advert.headline}
                                    fill
                                    className="object-cover transition-transform duration-700 group-hover:scale-110"
                                />
                            )}
                        </div>
                    </div>
                </DialogTrigger>
                <DialogContent className="sm:max-w-xl">
                    <DialogHeader>
                        <DialogTitle className="text-2xl font-bold font-headline">{advert.headline}</DialogTitle>
                    </DialogHeader>
                    <ScrollArea className="max-h-[60vh] pr-6">
                        <div className="py-4 space-y-4">
                             <div className="relative w-full aspect-video rounded-md overflow-hidden bg-muted">
                                <Image src={advert.image || ''} alt={advert.headline} fill className="object-contain p-4" />
                            </div>
                            <div className="prose dark:prose-invert max-w-none text-muted-foreground" dangerouslySetInnerHTML={{ __html: advert.fullDescription || advert.shortDescription || '' }} />
                        </div>
                    </ScrollArea>
                    <DialogFooter className="border-t pt-4">
                        <Button asChild variant="outline">
                            <a href={advert.link || '#'} target="_blank" rel="noopener noreferrer">
                                <ExternalLink className="mr-2 h-4 w-4" />
                                Visit Official Site
                            </a>
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        );
    }
    
    if (layout === 'feed') {
        return (
             <Dialog>
                <DialogTrigger asChild>
                    <Card className="overflow-hidden group cursor-pointer flex flex-col h-full hover:shadow-lg transition-shadow">
                        <CardHeader className="p-0">
                            <AspectRatio ratio={16 / 9} className="bg-muted">
                                {advert.image && (
                                    <Image
                                        src={advert.image}
                                        alt={advert.headline}
                                        fill
                                        className="object-cover transition-transform duration-500 group-hover:scale-105"
                                    />
                                )}
                            </AspectRatio>
                        </CardHeader>
                        <CardContent className="p-4 flex-grow">
                            <h4 className="font-bold text-lg line-clamp-1">{advert.headline}</h4>
                            <p className="text-sm text-muted-foreground line-clamp-2 mt-1">{advert.shortDescription}</p>
                        </CardContent>
                        <CardFooter className="p-4 pt-0">
                            <Button variant="outline" className="w-full">View Campaign</Button>
                        </CardFooter>
                    </Card>
                </DialogTrigger>
                <DialogContent className="sm:max-w-xl">
                    <DialogHeader>
                        <DialogTitle className="text-2xl font-bold font-headline">{advert.headline}</DialogTitle>
                    </DialogHeader>
                    <ScrollArea className="max-h-[60vh] pr-6">
                        <div className="py-4 space-y-4">
                            <div className="relative w-full aspect-video rounded-md overflow-hidden bg-muted">
                                <Image src={advert.image || ''} alt={advert.headline} fill className="object-contain p-4" />
                            </div>
                            <div className="prose dark:prose-invert max-w-none text-muted-foreground" dangerouslySetInnerHTML={{ __html: advert.fullDescription || advert.shortDescription || '' }} />
                        </div>
                    </ScrollArea>
                    <DialogFooter className="border-t pt-4">
                        <Button asChild variant="outline">
                            <a href={advert.link || '#'} target="_blank" rel="noopener noreferrer">
                                <ExternalLink className="mr-2 h-4 w-4" />
                                Visit Official Site
                            </a>
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        );
    }

    // Default 'full' layout for the main page
    return (
        <Dialog>
             <DialogTrigger asChild>
                <Card className="overflow-hidden group cursor-pointer flex flex-col h-full hover:shadow-lg transition-shadow">
                    <div className="relative w-full aspect-video bg-muted border-b">
                        {advert.image && (
                            <Image
                                src={advert.image}
                                alt={advert.headline}
                                fill
                                className="object-cover transition-transform duration-500 group-hover:scale-105"
                            />
                        )}
                    </div>
                    <CardHeader className="p-4">
                        <CardTitle className="text-lg line-clamp-1">{advert.headline}</CardTitle>
                    </CardHeader>
                    <CardContent className="flex-grow p-4 pt-0">
                        <p className="text-sm text-muted-foreground line-clamp-3">{advert.shortDescription}</p>
                    </CardContent>
                    <CardFooter className="p-4 pt-0 mt-auto border-t">
                        <div className="text-sm font-bold text-primary w-full text-center pt-3">
                            View Campaign
                        </div>
                    </CardFooter>
                </Card>
            </DialogTrigger>
             <DialogContent className="sm:max-w-xl">
                <DialogHeader>
                    <DialogTitle className="text-2xl font-bold font-headline">{advert.headline}</DialogTitle>
                </DialogHeader>
                <ScrollArea className="max-h-[60vh] pr-6">
                    <div className="py-4 space-y-4">
                        <div className="relative w-full aspect-video rounded-md overflow-hidden bg-muted">
                            <Image src={advert.image || ''} alt={advert.headline} fill className="object-contain p-4" />
                        </div>
                        <div className="prose dark:prose-invert max-w-none text-muted-foreground" dangerouslySetInnerHTML={{ __html: advert.fullDescription || advert.shortDescription }} />
                    </div>
                </ScrollArea>
                <DialogFooter className="border-t pt-4">
                    <Button asChild variant="outline">
                        <a href={advert.link || '#'} target="_blank" rel="noopener noreferrer">
                            <ExternalLink className="mr-2 h-4 w-4" />
                            Visit Site
                        </a>
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

const PartnerAdvertCard = ({ advert }: { advert: Advert }) => (
    <Dialog>
        <DialogTrigger asChild>
            <Card className="overflow-hidden group cursor-pointer flex flex-col h-full hover:shadow-md transition-shadow">
                <div className="relative aspect-square w-full bg-muted">
                    {advert.image && (
                        <Image
                            src={advert.image}
                            alt={advert.headline}
                            fill
                            className="object-cover transition-transform duration-300 group-hover:scale-105"
                        />
                    )}
                </div>
                <CardHeader className="p-3">
                    <CardTitle className="text-sm font-semibold truncate text-center">{advert.headline}</CardTitle>
                </CardHeader>
            </Card>
        </DialogTrigger>
        <DialogContent className="sm:max-w-xl">
            <DialogHeader>
                <DialogTitle className="text-2xl font-bold font-headline">{advert.headline}</DialogTitle>
            </DialogHeader>
            <ScrollArea className="max-h-[60vh] pr-6">
                <div className="py-4 space-y-4">
                    <div className="relative w-full aspect-video rounded-md overflow-hidden bg-muted">
                        <Image src={advert.image} alt={advert.headline} fill className="object-contain p-4" />
                    </div>
                    <div className="prose dark:prose-invert max-w-none text-muted-foreground" dangerouslySetInnerHTML={{ __html: advert.fullDescription || advert.shortDescription }} />
                </div>
            </ScrollArea>
            <DialogFooter className="border-t pt-4">
                <Button asChild variant="outline">
                    <a href={advert.link || '#'} target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="mr-2 h-4 w-4" />
                        Visit Official Site
                    </a>
                </Button>
            </DialogFooter>
        </DialogContent>
    </Dialog>
);

function NationalAdvertisers({ layout = 'full' }: { layout?: 'full' | 'compact' | 'feed' }) {
    const { user, isUserLoading } = useUser();
    const db = useFirestore();
    const userProfileRef = useMemoFirebase(() => (user ? doc(db, 'users', user.uid) : null), [user, db]);
    const { data: userProfile, isLoading: profileLoading } = useDoc(userProfileRef);

    const [activeFilters, setActiveFilters] = React.useState<string[]>([]);
    const [eligibleAds, setEligibleAds] = React.useState<Advert[]>([]);
    
    const advertsQuery = useMemoFirebase(() => {
        if (!db) return null;
        return query(
            collection(db, 'adverts'),
            where('scope', 'in', ['national', 'platform']),
            where('status', 'in', ['Active', 'Scheduled'])
        );
    }, [db]);
    
    const { data: activeAdverts, isLoading: advertsLoading } = useCollection<Advert>(advertsQuery);

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
        } as Advert));

        const now = new Date();
        const validDateAds = sourceAds.filter(ad => {
            const startDate = (ad as any).startDate?.toDate ? (ad as any).startDate.toDate() : null;
            const endDate = (ad as any).endDate?.toDate ? (ad as any).endDate.toDate() : null;

            if (ad.status === 'Active') {
                if (endDate && now > endDate) return false;
                return true;
            }
            
            if (ad.status === 'Scheduled') {
                if (startDate && now >= startDate) {
                    if (endDate && now > endDate) return false;
                    return true;
                }
                return false;
            }
            
            return false;
        });

        let adsToShow: Advert[] = [];
        
        if (user && userProfile && userProfile.settings?.adPersonalization) {
            const userCategories = userProfile.settings.selectedCategories || [];
            
            if (userCategories.length === 0) {
                 adsToShow = validDateAds;
            } else {
                 adsToShow = validDateAds.filter(ad => {
                    const categoryMatch = !ad.targetCategories || ad.targetCategories.length === 0 || ad.targetCategories.some(cat => userCategories.includes(cat));
                    return categoryMatch;
                });
            }
        } else {
             adsToShow = validDateAds;
        }
        
        if (adsToShow.length === 0 && validDateAds.length > 0) {
            adsToShow = validDateAds;
        }

        setEligibleAds(adsToShow);

    }, [activeAdverts, user, userProfile, advertsLoading, profileLoading]);

    const { categories } = React.useMemo(() => {
        if (!eligibleAds) return { categories: [] };
        const allCategories = [...new Set(eligibleAds.flatMap(ad => ad.targetCategories || []))].sort();
        return { categories: allCategories };
    }, [eligibleAds]);

    const handleFilterChange = (category: string) => {
        setActiveFilters(prev => 
            prev.includes(category) 
            ? prev.filter(c => c !== category)
            : [...prev, category]
        );
    };

    const filteredAdverts = React.useMemo(() => {
        let filtered = eligibleAds;
        if (activeFilters.length > 0) {
            filtered = filtered.filter(ad => 
                activeFilters.some(filter => ad.targetCategories?.includes(filter))
            );
        }
        return filtered.sort((a, b) => {
            if (a.type === 'featured' && b.type !== 'featured') return -1;
            if (a.type !== 'featured' && b.type === 'featured') return 1;
            return 0;
        });
    }, [eligibleAds, activeFilters]);
    
    const featuredAds = filteredAdverts.filter(ad => ad.type === 'featured');
    const partnerAds = filteredAdverts.filter(ad => ad.type === 'partner');
    const isLoading = isUserLoading || profileLoading || advertsLoading;
    
    const plugin = React.useRef(Autoplay({ delay: 5000, stopOnInteraction: true }));

    if (isLoading && (layout === 'compact' || layout === 'feed')) {
        return (
             <Card>
                <CardHeader>
                    <CardTitle>Featured Ads</CardTitle>
                </CardHeader>
                <CardContent className="h-48 flex justify-center items-center">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </CardContent>
            </Card>
        );
    }
    
    if (featuredAds.length === 0 && !isLoading) return null;

    if (layout === 'compact' || layout === 'feed') {
        return (
            <Card className="overflow-hidden h-full flex flex-col">
                <CardHeader className="pb-2">
                    <CardTitle className="flex items-center gap-2 text-primary">
                        <Megaphone className="h-5 w-5" />
                        Featured Ads
                    </CardTitle>
                    <CardDescription>Supporting our platform.</CardDescription>
                </CardHeader>
                <CardContent className="flex-grow p-4 pt-0">
                    <Carousel
                        opts={{ align: "start", loop: featuredAds.length > 1 }}
                        plugins={[plugin.current]}
                        onMouseEnter={plugin.current.stop}
                        onMouseLeave={plugin.current.reset}
                        className="w-full"
                    >
                        <CarouselContent className="-ml-0">
                            {featuredAds.map(advert => (
                                <CarouselItem key={advert.id} className="pl-0 basis-full">
                                    <AdvertCard advert={advert} layout={layout} />
                                </CarouselItem>
                            ))}
                        </CarouselContent>
                    </Carousel>
                </CardContent>
            </Card>
        )
    }

    return (
        <div className="space-y-8 container mx-auto px-4 py-8">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-center sm:text-left">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight font-headline">National Advertisers</h1>
                    <p className="text-muted-foreground">
                        Featured brands and partners supporting our communities.
                    </p>
                </div>
                <div className="flex items-center gap-2 self-center">
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="outline">
                                Categories {activeFilters.length > 0 && `(${activeFilters.length})`}
                                <ChevronDown className="ml-2 h-4 w-4" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent className="w-56">
                            <DropdownMenuLabel>Filter by Category</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <ScrollArea className="h-72">
                                {categories.map(category => (
                                    <DropdownMenuCheckboxItem
                                        key={category}
                                        checked={activeFilters.includes(category)}
                                        onCheckedChange={() => handleFilterChange(category)}
                                    >
                                        {category}
                                    </DropdownMenuCheckboxItem>
                                ))}
                            </ScrollArea>
                        </DropdownMenuContent>
                    </DropdownMenu>
                    {activeFilters.length > 0 && (
                        <Button variant="ghost" onClick={() => { setActiveFilters([]); }}>
                            Reset <FilterX className="ml-2 h-4 w-4" />
                        </Button>
                    )}
                </div>
            </div>
            
            {isLoading ? (
                <div className="flex justify-center items-center h-64">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
            ) : (
                <div className="space-y-12">
                    {featuredAds.length > 0 && (
                        <div>
                            <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
                                <Star className="h-6 w-6 text-primary fill-current" />
                                Featured Campaigns
                            </h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                                {featuredAds.map(advert => (
                                    <AdvertCard key={advert.id} advert={advert} layout="full" />
                                ))}
                            </div>
                        </div>
                    )}
                    {partnerAds.length > 0 && (
                        <div>
                             <h2 className="text-2xl font-bold mb-6 flex items-center gap-2 border-t pt-8">
                                <Handshake className="h-6 w-6 text-muted-foreground" />
                                Valued Partners
                             </h2>
                             <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6">
                                {partnerAds.map(advert => (
                                    <PartnerAdvertCard key={advert.id} advert={advert} />
                                ))}
                            </div>
                        </div>
                    )}
                    {filteredAdverts.length === 0 && (
                        <div className="text-center py-24 bg-muted/20 rounded-xl border-2 border-dashed">
                            <Megaphone className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-50" />
                            <h3 className="text-xl font-semibold">No Adverts Found</h3>
                            <p className="text-muted-foreground mt-2">Try adjusting your filters or checking back later.</p>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

export default NationalAdvertisers;
