
'use client';

import * as React from "react";
import Image from "next/image";
import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { collection, query, where, doc, documentId, limit } from "firebase/firestore";
import { Loader2, ChevronDown, LayoutGrid, List, FilterX, Truck } from "lucide-react";
import { useUser, useFirestore, useDoc, useCollection, useMemoFirebase } from "@/firebase";
import Link from "next/link";
import MainAppLayout from "../(main)/layout";
import { businesses as mockBusinesses, mockCourierBusiness } from "@/lib/mock-data";
import { DropdownMenu, DropdownMenuCheckboxItem, DropdownMenuContent, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useRouter, useSearchParams } from "next/navigation";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { differenceInDays } from "date-fns";
import BusinessCard from '@/components/business-card';
import { Skeleton } from "@/components/ui/skeleton";
import { accommodationCategories } from "@/lib/categories";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";


type Business = {
  id: string;
  businessName: string;
  businessCategory?: string;
  logoImage?: string;
  shortDescription: string;
  status: "Pending Approval" | "Approved" | "Requires Amendment" | "Declined" | "Subscribed" | "Draft" | "Hidden";
  additionalCommunityIds?: string[];
  additionalCommunities?: any[];
  createdAt?: { toDate: () => Date };
  listingSubscriptionExpiresAt?: { toDate: () => Date };
  primaryCommunityId?: string;
  accountType?: string;
  leaderCount?: number;
  sellsRestrictedProducts?: boolean;
};

const BusinessRow = ({ business }: { business: Business }) => {
    const router = useRouter();
    
    const toDate = (timestamp: any): Date | null => {
        if (!timestamp) return null;
        if (typeof timestamp.toDate === 'function') return timestamp.toDate();
        if (timestamp.seconds) return new Date(timestamp.seconds * 1000);
        return null;
    };
    
    const now = new Date();
    const creationDate = toDate(business.createdAt);
    const expiryDate = toDate(business.listingSubscriptionExpiresAt);

    const freeExpiry = toDate((business as any).freeListingExpiresAt);
    const isFreeLive = (business as any).isFreeListing && (!freeExpiry || now <= freeExpiry);

    const isLive = isFreeLive || 
                   (business.status === 'Subscribed' && (!expiryDate || now <= expiryDate)) ||
                   (business.status === 'Approved' && creationDate && differenceInDays(now, creationDate) <= 14);

    const handleCardClick = () => {
        if(isLive) {
            router.push(`/businesses/${business.id}`);
        }
    };

    const cardContent = (
        <Card className="flex items-center p-4 hover:shadow-md transition-shadow">
            <div className="relative h-16 w-16 flex-shrink-0 mr-4 rounded-md overflow-hidden bg-muted p-1">
                <Image
                    src={business.logoImage || "https://picsum.photos/seed/business-list/400"}
                    alt={business.businessName || 'Business Logo'}
                    fill
                    className="object-contain"
                    data-ai-hint="company logo"
                />
            </div>
            <div className="flex-1">
                <h3 className="font-semibold">{business.businessName}</h3>
                <p className="text-sm text-muted-foreground">{business.businessCategory?.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' & ')}</p>
            </div>
            <Button variant="secondary" size="sm" className="ml-4" disabled={!isLive}>
                {isLive ? 'View Profile' : 'Subscription Expired'}
            </Button>
        </Card>
    );
    
    return (
        <div onClick={handleCardClick} className={cn(isLive ? "cursor-pointer" : "cursor-not-allowed opacity-70")}>
            {cardContent}
        </div>
    )
};


function BusinessDirectoryContent() {
  const [activeFilters, setActiveFilters] = React.useState<string[]>([]);
  const [listingTypeFilter, setListingTypeFilter] = React.useState('All');
  const { user, isUserLoading: authLoading } = useUser();
  const db = useFirestore();
  const [view, setView] = React.useState('grid');
  const router = useRouter();
  const searchParams = useSearchParams();

  const userProfileRef = useMemoFirebase(() => (user && db ? doc(db, 'users', user.uid) : null), [user, db]);
  const { data: userProfile, isLoading: profileLoading } = useDoc(userProfileRef);
  const communityId = userProfile?.communityId;
  const communityName = userProfile?.communityName;

  const communityRef = useMemoFirebase(() => (communityId ? doc(db, 'communities', communityId) : null), [communityId, db]);
  const { data: communityData, isLoading: communityLoading } = useDoc(communityRef);

  // Query for businesses where this is the primary community
  const primaryBusinessesQuery = useMemoFirebase(() => {
    if (!communityId || !db) return null;
    return query(
      collection(db, "businesses"),
      where("primaryCommunityId", "==", communityId)
    );
  }, [db, communityId]);

  // Query for businesses that advertise here additionally
  const additionalBusinessesQuery = useMemoFirebase(() => {
    if (!communityId || !db) return null;
    return query(
      collection(db, "businesses"),
      where("additionalCommunityIds", "array-contains", communityId)
    );
  }, [db, communityId]);
  
  const courierId = communityData?.courierId;
  const couriersQuery = useMemoFirebase(() => {
    if (!courierId || !db) return null;
    return query(
      collection(db, "businesses"),
      where("ownerId", "==", courierId),
      where("accountType", "==", "courier"),
      limit(1)
    );
  }, [db, courierId]);

  const { data: primaryBusinesses, isLoading: primaryLoading } = useCollection<Business>(primaryBusinessesQuery);
  const { data: additionalBusinesses, isLoading: additionalLoading } = useCollection<Business>(additionalBusinessesQuery);
  const { data: realCourierBusinesses, isLoading: couriersLoading } = useCollection<Business>(couriersQuery);

  const [clientBusinesses, setClientBusinesses] = React.useState<{
    localBusinesses: Business[];
    visitingBusinesses: Business[];
    allBusinesses: Business[];
  } | null>(null);
  
  const [isClient, setIsClient] = React.useState(false);
  React.useEffect(() => setIsClient(true), []);

  const dataIsLoading = authLoading || profileLoading || primaryLoading || additionalLoading || couriersLoading || communityLoading;
  
  React.useEffect(() => {
    if (dataIsLoading || !isClient) return;

    const toDate = (timestamp: any): Date | null => {
        if (!timestamp) return null;
        if (typeof timestamp.toDate === 'function') return timestamp.toDate();
        if (timestamp.seconds) return new Date(timestamp.seconds * 1000);
        return null;
    };
    
    const getIsLive = (business: Business) => {
        const now = new Date();
        const creationDate = toDate(business.createdAt);
        const expiryDate = toDate(business.listingSubscriptionExpiresAt);
        
        // Age restricted visibility logic
        const userIsUnder21 = userProfile?.ageRange === 'Under 18' || userProfile?.ageRange === '18-24';
        if (userIsUnder21 && business.sellsRestrictedProducts) {
            return false;
        }

        const freeExpiry = toDate((business as any).freeListingExpiresAt);
        const isFreeLive = (business as any).isFreeListing && (!freeExpiry || now <= freeExpiry);

        return isFreeLive ||
               (business.status === 'Subscribed' && (!expiryDate || now <= expiryDate)) ||
               (business.status === 'Approved' && creationDate && differenceInDays(now, creationDate) <= 14);
    };

    let livePrimary = (primaryBusinesses || []).filter(b => b.accountType !== 'enterprise');
    let liveAdditional = (additionalBusinesses || []).filter(b => b.accountType !== 'enterprise');
    
    const couriers = realCourierBusinesses && realCourierBusinesses.length > 0
        ? realCourierBusinesses
        : [];
    
    const showMockCourier = (communityData?.leaderCount || 0) === 0 && !communityData?.courierId;

    let combinedLocal = [...livePrimary, ...couriers];

    if(livePrimary.length === 0 && couriers.length === 0) {
        combinedLocal.push(...mockBusinesses.filter(b => (b as any).accountType !== 'enterprise') as Business[]);
    }
    
    if (showMockCourier) {
      combinedLocal.unshift({ ...mockCourierBusiness, leaderCount: communityData?.leaderCount || 0 } as any);
    }
    
    const localBusinessesUnsorted = Array.from(new Map(combinedLocal.map(item => [item.id, item])).values());
    const localIds = new Set(localBusinessesUnsorted.map(b => b.id));
    
    const visitingBusinessesUnsorted = liveAdditional.filter(b => !localIds.has(b.id));

    const sortBusinesses = (a: Business, b: Business) => {
        const isLiveA = getIsLive(a);
        const isLiveB = getIsLive(b);

        if (isLiveA && !isLiveB) return -1;
        if (!isLiveA && isLiveB) return 1;

        return (a.businessName || '').localeCompare(b.businessName || '');
    };
    
    const localBusinesses = localBusinessesUnsorted.sort((a,b) => {
        const isMockA = a.id === 'mock-courier-99';
        const isMockB = b.id === 'mock-courier-99';
        if (isMockA && !isMockB) return -1;
        if (!isMockA && isMockB) return 1;
        return sortBusinesses(a, b);
    });

    const visitingBusinesses = visitingBusinessesUnsorted.sort(sortBusinesses);
    const allBusinesses = [...localBusinesses, ...visitingBusinesses].sort(sortBusinesses);
    
    setClientBusinesses({ localBusinesses, visitingBusinesses, allBusinesses });

  }, [primaryBusinesses, additionalBusinesses, realCourierBusinesses, dataIsLoading, communityId, communityName, isClient, communityData, userProfile]);


  const businessesToDisplay = React.useMemo(() => {
    if (!clientBusinesses) return [];
    switch (listingTypeFilter) {
      case 'Local':
        return clientBusinesses.localBusinesses;
      case 'Visiting':
        return clientBusinesses.visitingBusinesses;
      default:
        return clientBusinesses.allBusinesses;
    }
  }, [listingTypeFilter, clientBusinesses]);

  const categories = React.useMemo(() => {
    if (!clientBusinesses) return [];
    const uniqueCategories = new Set(clientBusinesses.allBusinesses.map(b => b.businessCategory?.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' & ')));
    return Array.from(uniqueCategories).filter(Boolean).sort() as string[];
  }, [clientBusinesses]);

  React.useEffect(() => {
    const categoryFromUrl = searchParams.get('category');
    if (categoryFromUrl && categories.length > 0) {
      if (categoryFromUrl === 'accommodation') {
          const accommodationLabels = accommodationCategories.map(c => c.label);
          setActiveFilters(prev => [...new Set([...prev, ...accommodationLabels])]);
      } else {
        const categoryLabel = categoryFromUrl.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' & ');
        if (categories.includes(categoryLabel) && !activeFilters.includes(categoryLabel)) {
          setActiveFilters([categoryLabel]);
        }
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams, categories]);

  const handleFilterChange = (category: string) => {
    setActiveFilters(prev => 
        prev.includes(category) 
        ? prev.filter(c => c !== category)
        : [...prev, category]
    );
  }

  const filteredBusinesses = React.useMemo(() => {
    if (activeFilters.length === 0) return businessesToDisplay;
    return businessesToDisplay.filter(business => activeFilters.includes(business.businessCategory?.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' & ') || ''));
  }, [businessesToDisplay, activeFilters]);
    
  const isFiltered = activeFilters.length > 0 || listingTypeFilter !== 'All';

  const handleResetFilters = () => {
    setActiveFilters([]);
    setListingTypeFilter('All');
  };
  
  const loading = dataIsLoading || !clientBusinesses || !isClient;

  if (loading) {
      return (
          <div className="space-y-8 container mx-auto px-4 py-8">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <Skeleton className="h-12 w-64" />
              <div className="flex w-full flex-col items-stretch gap-2 sm:w-auto sm:flex-row sm:flex-wrap sm:items-center sm:justify-end">
                <Skeleton className="h-10 w-full sm:w-48" />
                <Skeleton className="h-10 w-32" />
                <Skeleton className="h-10 w-24" />
              </div>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6">
              {Array.from({ length: 12 }).map((_, i) => (
                <Skeleton key={i} className="h-[300px] w-full" />
              ))}
            </div>
          </div>
      );
  }

  return (
    <div className="space-y-8 container mx-auto px-4 py-8">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
            <h1 className="text-3xl font-bold tracking-tight font-headline">Business Directory</h1>
            <p className="text-muted-foreground">
            Discover and support local businesses in your community.
            </p>
        </div>
        <div className="flex w-full flex-col items-stretch gap-2 sm:w-auto sm:flex-row sm:flex-wrap sm:items-center sm:justify-end">
            {(!communityData?.courierId && (communityData?.leaderCount || 0) === 0) && (
                <Button asChild>
                    <Link href="/courier/apply">
                        <Truck className="mr-2 h-4 w-4" />
                        Become a Courier
                    </Link>
                </Button>
            )}
            <Tabs value={listingTypeFilter} onValueChange={setListingTypeFilter} className="w-full sm:w-auto">
                <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="All">All</TabsTrigger>
                    <TabsTrigger value="Local">Local</TabsTrigger>
                    <TabsTrigger value="Visiting">Visiting</TabsTrigger>
                </TabsList>
            </Tabs>
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
            {isFiltered && (
                <Button
                    variant="ghost"
                    onClick={handleResetFilters}
                >
                    Reset
                    <FilterX className="ml-2 h-4 w-4" />
                </Button>
            )}
            <div className="flex items-center gap-1 rounded-md bg-muted p-1">
                <Button variant={view === 'grid' ? 'default' : 'ghost'} size="sm" onClick={() => setView('grid')}>
                    <LayoutGrid className="h-5 w-5" />
                    <span className="hidden sm:inline ml-2">Grid</span>
                </Button>
                <Button variant={view === 'list' ? 'default' : 'ghost'} size="sm" onClick={() => setView('list')}>
                    <List className="h-5 w-5" />
                     <span className="hidden sm:inline ml-2">List</span>
                </Button>
            </div>
        </div>
      </div>
      
       {view === 'grid' ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6">
                {filteredBusinesses.map((business) => (
                    <BusinessCard key={business.id} business={business as any} />
                ))}
                {filteredBusinesses.length === 0 && !loading && (
                    <p className="col-span-full text-muted-foreground text-center py-10">No businesses found for the selected filters.</p>
                )}
            </div>
       ) : (
        <div className="space-y-4">
            {filteredBusinesses.map((business) => (
                <BusinessRow key={business.id} business={business as any} />
            ))}
             {filteredBusinesses.length === 0 && !loading && (
                <p className="col-span-full text-muted-foreground text-center py-10">No businesses found for the selected filters.</p>
            )}
        </div>
       )}
    </div>
  );
}

export default function BusinessesPage() {
    return (
        <MainAppLayout>
           <React.Suspense fallback={<div className="flex h-screen items-center justify-center"><Loader2 className="h-8 w-8 animate-spin" /></div>}>
                <BusinessDirectoryContent />
            </React.Suspense>
        </MainAppLayout>
    )
}
