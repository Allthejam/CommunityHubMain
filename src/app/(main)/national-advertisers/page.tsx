
'use client';

import * as React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, Megaphone, ArrowLeft, FilterX, ChevronDown } from "lucide-react";
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
import { ExternalLink } from "lucide-react";
import { ScrollArea } from '@/components/ui/scroll-area';
import { DropdownMenu, DropdownMenuCheckboxItem, DropdownMenuContent, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { mockNationalAdverts } from '@/lib/mock-data';

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
};

// Main card for Featured Adverts
const AdvertCard = ({ advert }: { advert: Advert }) => (
    <Dialog>
        <DialogTrigger asChild>
            <Card className="overflow-hidden group cursor-pointer flex flex-col h-full">
                <div className="relative aspect-video w-full bg-muted">
                    {advert.image && (
                        <Image
                            src={advert.image}
                            alt={advert.headline}
                            fill
                            className="object-cover transition-transform duration-300 group-hover:scale-105"
                        />
                    )}
                </div>
                <CardHeader>
                    <CardTitle className="text-base truncate">{advert.headline}</CardTitle>
                </CardHeader>
                <CardContent className="flex-grow p-4 pt-0">
                    <p className="text-xs text-muted-foreground line-clamp-2">{advert.shortDescription}</p>
                </CardContent>
                <CardFooter className="p-4 pt-0 mt-auto">
                    <div className="text-sm font-medium text-primary w-full text-center">
                        Learn More
                    </div>
                </CardFooter>
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
                    <div className="prose dark:prose-invert max-w-none" dangerouslySetInnerHTML={{ __html: advert.fullDescription || advert.shortDescription }} />
                </div>
            </ScrollArea>
            <DialogFooter>
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

// Smaller card for Partner Adverts
const PartnerAdvertCard = ({ advert }: { advert: Advert }) => (
    <Dialog>
        <DialogTrigger asChild>
            <Card className="overflow-hidden group cursor-pointer flex flex-col h-full">
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
                    <CardTitle className="text-sm truncate">{advert.headline}</CardTitle>
                </CardHeader>
            </Card>
        </DialogTrigger>
        {/* Re-using the same detailed dialog content */}
        <DialogContent className="sm:max-w-xl">
            <DialogHeader>
                <DialogTitle>{advert.headline}</DialogTitle>
            </DialogHeader>
            <ScrollArea className="max-h-[60vh] pr-6">
                <div className="py-4 space-y-4">
                    <div className="relative w-full aspect-video rounded-md overflow-hidden bg-muted">
                        <Image src={advert.image} alt={advert.headline} fill className="object-contain p-4" />
                    </div>
                    <div className="prose dark:prose-invert max-w-none" dangerouslySetInnerHTML={{ __html: advert.fullDescription || advert.shortDescription }} />
                </div>
            </ScrollArea>
            <DialogFooter>
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


export default function NationalAdvertisersPage() {
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
            where('status', '==', 'Active')
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
        }));

        let adsToShow: Advert[] = [];
        
        if (user && userProfile && userProfile.settings?.adPersonalization) {
            const userCategories = userProfile.settings.selectedCategories || [];
            
            if (userCategories.length === 0) {
                 adsToShow = sourceAds;
            } else {
                 adsToShow = sourceAds.filter(ad => {
                    const categoryMatch = !ad.targetCategories || ad.targetCategories.length === 0 || ad.targetCategories.some(cat => userCategories.includes(cat));
                    return categoryMatch;
                });
            }
        } else {
             adsToShow = sourceAds;
        }
        
        // Fallback if filtering results in an empty list
        if (adsToShow.length === 0 && sourceAds.length > 0) {
            adsToShow = sourceAds;
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

        // Return sorted with featured first
        return filtered.sort((a, b) => {
            if (a.type === 'featured' && b.type !== 'featured') return -1;
            if (a.type !== 'featured' && b.type === 'featured') return 1;
            return 0;
        });

    }, [eligibleAds, activeFilters]);
    
    const featuredAds = filteredAdverts.filter(ad => ad.type === 'featured');
    const partnerAds = filteredAdverts.filter(ad => ad.type === 'partner');
    const isLoading = isUserLoading || profileLoading || advertsLoading;

    return (
        <div className="space-y-8 container mx-auto px-4 py-8">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight font-headline">National Advertisers</h1>
                    <p className="text-muted-foreground">
                        Featured brands and partners supporting our communities.
                    </p>
                </div>
                <div className="flex items-center gap-2">
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
                            <h2 className="text-2xl font-bold mb-4">Featured Adverts</h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {featuredAds.map(advert => (
                                    <AdvertCard key={advert.id} advert={advert} />
                                ))}
                            </div>
                        </div>
                    )}
                    {partnerAds.length > 0 && (
                        <div>
                             <h2 className="text-2xl font-bold mb-4">Valued Partners</h2>
                             <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                                {partnerAds.map(advert => (
                                    <PartnerAdvertCard key={advert.id} advert={advert} />
                                ))}
                            </div>
                        </div>
                    )}
                    {filteredAdverts.length === 0 && (
                        <div className="text-center py-16">
                            <p className="text-muted-foreground">No adverts match the selected filters.</p>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
