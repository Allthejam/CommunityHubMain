

'use client';

import { useState, useEffect, useMemo, Suspense } from "react";
import Image from "next/image";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { collection, query, where, doc } from "firebase/firestore";
import { Loader2, ChevronDown, LayoutGrid, List, FilterX } from "lucide-react";
import { useUser, useFirestore, useDoc, useCollection, useMemoFirebase } from "@/firebase";
import Link from "next/link";
import MainAppLayout from "../(main)/layout";
import { businesses as mockBusinesses } from "@/lib/mock-data";
import { DropdownMenu, DropdownMenuCheckboxItem, DropdownMenuContent, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useRouter, useSearchParams } from "next/navigation";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { differenceInDays } from "date-fns";

type Business = {
  id: string;
  businessName: string;
  businessCategory?: string;
  logoImage?: string;
  shortDescription: string;
  status: "Pending Approval" | "Approved" | "Requires Amendment" | "Declined" | "Subscribed" | "Draft";
  additionalCommunityIds?: string[];
  additionalCommunities?: any[];
  createdAt?: { toDate: () => Date };
  listingSubscriptionExpiresAt?: { toDate: () => Date };
};

const BusinessRow = ({ business }: { business: Business }) => {
    const router = useRouter();
    
    const handleCardClick = () => {
        router.push(`/businesses/${business.id}`);
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
            <Button variant="secondary" size="sm" className="ml-4">View Profile</Button>
        </Card>
    );
    
    return (
        <div onClick={handleCardClick} className="cursor-pointer">
            {cardContent}
        </div>
    )
};


function BusinessDirectoryContent() {
  const [activeFilters, setActiveFilters] = useState<string[]>([]);
  const [listingTypeFilter, setListingTypeFilter] = useState('All');
  const { user, isUserLoading: authLoading } = useUser();
  const db = useFirestore();
  const [view, setView] = useState('grid');
  const router = useRouter();
  const searchParams = useSearchParams();

  const userProfileRef = useMemoFirebase(() => (user && db ? doc(db, 'users', user.uid) : null), [user, db]);
  const { data: userProfile, isLoading: profileLoading } = useDoc(userProfileRef);
  const communityId = userProfile?.communityId;

  // Query for businesses where this is the primary community
  const primaryBusinessesQuery = useMemoFirebase(() => {
    if (!communityId || !db) return null;
    return query(
      collection(db, "businesses"),
      where("primaryCommunityId", "==", communityId),
      where("status", "in", ["Approved", "Subscribed"])
    );
  }, [db, communityId]);

  // Query for businesses that advertise here additionally
  const additionalBusinessesQuery = useMemoFirebase(() => {
    if (!communityId || !db) return null;
    return query(
      collection(db, "businesses"),
      where("additionalCommunityIds", "array-contains", communityId),
      where("status", "in", ["Approved", "Subscribed"])
    );
  }, [db, communityId]);

  const { data: primaryBusinesses, isLoading: primaryLoading } = useCollection<Business>(primaryBusinessesQuery);
  const { data: additionalBusinesses, isLoading: additionalLoading } = useCollection<Business>(additionalBusinessesQuery);

  const loading = authLoading || profileLoading || primaryLoading || additionalLoading;
  
  const { localBusinesses, visitingBusinesses, allBusinesses } = useMemo(() => {
    const now = new Date();

    const filterLive = (business: Business) => {
        if (business.status === 'Subscribed') {
            const expiryDate = business.listingSubscriptionExpiresAt?.toDate();
            // If expiry date exists, it must be in the future.
            // If it doesn't exist, we assume it's active (older data model).
            return !expiryDate || now <= expiryDate;
        }
        if (business.status === 'Approved' && business.createdAt) {
            const creationDate = business.createdAt.toDate();
            // Show if within 14-day trial period
            return differenceInDays(now, creationDate) <= 14;
        }
        return false;
    };

    const livePrimary = (primaryBusinesses || []).filter(filterLive);
    const localIds = new Set(livePrimary.map(b => b.id));
    const liveAdditional = (additionalBusinesses || []).filter(filterLive);
    const visiting = liveAdditional.filter(b => !localIds.has(b.id));
    
    const all = [...livePrimary, ...visiting];

    // Only fallback to mock data if there were absolutely no businesses fetched from the DB.
    const allFetched = [...(primaryBusinesses || []), ...(additionalBusinesses || [])];
    if (all.length === 0 && allFetched.length === 0) {
      return { allBusinesses: mockBusinesses, localBusinesses: mockBusinesses, visitingBusinesses: [] };
    }

    return { localBusinesses: livePrimary, visitingBusinesses: visiting, allBusinesses: all };
  }, [primaryBusinesses, additionalBusinesses]);

  const businessesToDisplay = useMemo(() => {
    switch (listingTypeFilter) {
      case 'Local':
        return localBusinesses;
      case 'Visiting':
        return visitingBusinesses;
      default:
        return allBusinesses;
    }
  }, [listingTypeFilter, localBusinesses, visitingBusinesses, allBusinesses]);

  const categories = useMemo(() => {
    const uniqueCategories = new Set(allBusinesses.map(b => b.businessCategory?.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' & ')));
    return Array.from(uniqueCategories).filter(Boolean).sort() as string[];
  }, [allBusinesses]);

  useEffect(() => {
    const categoryFromUrl = searchParams.get('category');
    if (categoryFromUrl && categories.length > 0) {
      const categoryLabel = categoryFromUrl.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' & ');
      if (categories.includes(categoryLabel) && !activeFilters.includes(categoryLabel)) {
        setActiveFilters([categoryLabel]);
      }
    }
  // This dependency array intentionally ignores activeFilters to only set the initial state from the URL.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams, categories]);

  const handleFilterChange = (category: string) => {
    setActiveFilters(prev => 
        prev.includes(category) 
        ? prev.filter(c => c !== category)
        : [...prev, category]
    );
  }

  const filteredBusinesses = useMemo(() => {
    if (activeFilters.length === 0) return businessesToDisplay;
    return businessesToDisplay.filter(business => activeFilters.includes(business.businessCategory?.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' & ') || ''));
  }, [businessesToDisplay, activeFilters]);
    
  const isFiltered = activeFilters.length > 0 || listingTypeFilter !== 'All';

  if (loading) {
      return (
          <div className="flex justify-center items-center h-96">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
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
                <DropdownMenuContent>
                    <DropdownMenuLabel>Filter by Category</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    {categories.map(category => (
                        <DropdownMenuCheckboxItem
                            key={category}
                            checked={activeFilters.includes(category)}
                            onCheckedChange={() => handleFilterChange(category)}
                        >
                            {category}
                        </DropdownMenuCheckboxItem>
                    ))}
                </DropdownMenuContent>
            </DropdownMenu>
            {isFiltered && (
                <Button
                    variant="ghost"
                    onClick={() => {
                        setActiveFilters([]);
                        setListingTypeFilter('All');
                    }}
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
                    <Link key={business.id} href={`/businesses/${business.id}`} className="block h-full">
                        <Card className="overflow-hidden flex flex-col h-full cursor-pointer hover:shadow-lg transition-shadow">
                            <CardHeader className="p-0">
                                <div className="relative aspect-square w-full flex items-center justify-center bg-transparent">
                                <Image
                                    src={business.logoImage || "https://picsum.photos/seed/business/600/400"}
                                    alt={business.businessName || 'Business Logo'}
                                    fill
                                    className="object-contain p-4"
                                    data-ai-hint="company logo"
                                />
                                </div>
                            </CardHeader>
                            <CardHeader className="p-4 pt-2">
                                <CardTitle className="text-base truncate">{business.businessName}</CardTitle>
                            </CardHeader>
                            <CardContent className="flex-grow p-4 pt-0">
                                <p className="text-xs text-muted-foreground line-clamp-2">
                                {business.shortDescription}
                                </p>
                            </CardContent>
                            <CardFooter className="p-2 mt-auto">
                                <div className="text-sm font-medium text-primary w-full text-center">
                                    View Profile
                                </div>
                            </CardFooter>
                        </Card>
                    </Link>
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
           <Suspense fallback={<div className="flex h-screen items-center justify-center"><Loader2 className="h-8 w-8 animate-spin" /></div>}>
                <BusinessDirectoryContent />
            </Suspense>
        </MainAppLayout>
    )
}
