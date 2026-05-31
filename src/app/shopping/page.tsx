'use client';

import * as React from 'react';
import { useSearchParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from '@/components/ui/button';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { ShoppingFilters, type ShoppingFiltersState } from '@/components/shopping-filters';
import NationalAdvertisers from '@/components/national-advertisers';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Filter, Loader2, ShoppingCart, Store, ArrowRight, Search, Settings } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ValuedPartners } from '@/components/valued-partners';
import { HighstreetFeed } from '@/components/highstreet-feed';
import { useCart } from '@/contexts/cart-context';
import { useToast } from '@/hooks/use-toast';
import {
  useUser,
  useFirestore,
  useDoc,
  useMemoFirebase,
  useCollection,
} from '@/firebase';
import { doc, collection, query, where, getDocs } from 'firebase/firestore';
import { Dialog, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import NextImage from 'next/image';
import { mockProducts } from '@/lib/mock-data';
import { ProductDialogContent } from '@/components/product-dialog-content';
import { AspectRatio } from '@/components/ui/aspect-ratio';
import { Input } from '@/components/ui/input';

type Business = {
  id: string;
  businessName: string;
  storeSettings?: any;
  stripeAccountId?: string;
  sellsRestrictedProducts?: boolean;
};

const initialFilters: ShoppingFiltersState = {
  deals: 'all-deals',
  delivery: 'all',
  price: 'all-price',
  availability: 'in-stock',
};


const getDisplayPrice = (product: any, business: Business | undefined) => {
    if (business?.storeSettings?.catalogueMode && !business.storeSettings.showPricesInCatalogue) {
        return <span className="text-sm font-semibold text-muted-foreground">Price in-store</span>;
    }
    if (product.onSale) {
        let salePrice, originalPrice = product.price;
        if (product.discountType === 'percentage' && product.discountValue) {
            salePrice = product.price * (1 - product.discountValue / 100);
        } else if (product.discountType === 'amount' && product.salePrice) {
            salePrice = product.salePrice;
        }
        
        if (salePrice !== undefined) {
            return (
                <div className="flex items-baseline gap-1">
                    <span className={`text-lg font-bold text-destructive`}>£{salePrice.toFixed(2)}</span>
                    {product.showOriginalPrice && (
                        <span className="text-sm text-muted-foreground line-through">£{product.price.toFixed(2)}</span>
                    )}
                </div>
            );
        }
    }
    return <div className="text-lg font-bold">£{product.price.toFixed(2)}</div>;
};

const ProductCard = ({ product, business }: { product: any, business: Business | undefined }) => {
    const { addItem } = useCart();
    const { toast } = useToast();
    const canAcceptPayments = !!business?.stripeAccountId;

    const handleAddToCart = (e: React.MouseEvent) => {
        e.stopPropagation();
        const productToAdd = {
            ...product,
            image: product.images?.[0]?.url,
            store: product.businessName || 'Local Store'
        };
        addItem(productToAdd);
        toast({
            title: "Added to Basket",
            description: `${product.name} has been added to your basket.`
        })
    };

    return (
        <Dialog>
            <Card className="overflow-hidden group flex flex-col cursor-pointer h-full hover:shadow-lg transition-shadow">
                <DialogTrigger asChild>
                    <div className='flex-grow flex flex-col'>
                        <CardHeader className="p-0">
                            <AspectRatio ratio={1 / 1} className="bg-muted">
                                <NextImage src={product.images?.[0]?.url || 'https://picsum.photos/seed/product/400'} alt={product.name} fill className="object-cover" />
                            </AspectRatio>
                        </CardHeader>
                        <CardContent className="p-2 flex-grow flex flex-col">
                            <h4 className="font-semibold text-sm truncate flex-grow">{product.name}</h4>
                            <p className="text-xs text-muted-foreground truncate">{product.businessName}</p>
                        </CardContent>
                    </div>
                </DialogTrigger>
                <CardFooter className="p-2 pt-0 flex items-center justify-between">
                    <div className="pt-1">{getDisplayPrice(product, business)}</div>
                    {product.hasVariations ? (
                        <DialogTrigger asChild>
                            <Button variant="outline" size="sm" className="h-8 text-xs">
                                 Select Options
                            </Button>
                        </DialogTrigger>
                    ) : (
                        <Button
                            variant="outline"
                            size="icon"
                            className="h-8 w-8"
                            onClick={handleAddToCart}
                            disabled={!canAcceptPayments || business?.storeSettings?.catalogueMode || business?.storeSettings?.storeAvailability === 'instore_only' || product.stock === 0}
                        >
                            <ShoppingCart className="h-4 w-4" />
                        </Button>
                    )}
                </CardFooter>
            </Card>
            <ProductDialogContent product={product} businessName={product.businessName || ''} business={business} canAcceptPayments={canAcceptPayments} />
        </Dialog>
    );
};


function ShoppingContent() {
  const [sortOption, setSortOption] = React.useState("featured");
  const [searchQuery, setSearchQuery] = React.useState("");
  
  const { user, isUserLoading } = useUser();
  const db = useFirestore();
  const { toast } = useToast();
  const userProfileRef = useMemoFirebase(() => (user ? doc(db, 'users', user.uid) : null), [user, db]);
  const { data: userProfile, isLoading: profileLoading } = useDoc(userProfileRef);

  const [products, setProducts] = React.useState<any[]>([]);
  const [loadingProducts, setLoadingProducts] = React.useState(true);
  const [visibleProductsCount, setVisibleProductsCount] = React.useState(12);
  const [filters, setFilters] = React.useState<ShoppingFiltersState>(initialFilters);

  const [dialogOpenFor, setDialogOpenFor] = React.useState<string | null>(null);
  const searchParams = useSearchParams();
  const [activeCommunityId, setActiveCommunityId] = React.useState<string | null>(null);

  const userCommunityId = userProfile?.communityId;
  const userAgeRange = userProfile?.ageRange;

  React.useEffect(() => {
    if (profileLoading) return;
    const visitedId = sessionStorage.getItem('visitedCommunityId');
    if (visitedId) {
      setActiveCommunityId(visitedId);
    } else if (userCommunityId) {
      setActiveCommunityId(userCommunityId);
    } else {
      setActiveCommunityId(null);
    }
  }, [userCommunityId, profileLoading]);

  const businessesQuery = useMemoFirebase(() => {
    if (!activeCommunityId || !db) return null;
    return query(
      collection(db, "businesses"),
      where("primaryCommunityId", "==", activeCommunityId),
      where("storefrontSubscription", "==", true),
      where("status", "in", ["Approved", "Subscribed"])
    );
  }, [db, activeCommunityId]);
  
  const { data: businesses, isLoading: businessesLoading } = useCollection<Business>(businessesQuery);
  
  React.useEffect(() => {
    if (!businesses) {
      if(!businessesLoading) setLoadingProducts(false);
      return;
    }

    const fetchAllProducts = async () => {
      setLoadingProducts(true);
      
      const productPromises: Promise<any[]>[] = [];
      const userIsUnder21 = userAgeRange === 'Under 18' || userAgeRange === '18-24';

      businesses.forEach(businessDoc => {
        // Enforce restricted products age gate
        if (userIsUnder21 && businessDoc.sellsRestrictedProducts) return;

        const productsRef = collection(db, `businesses/${businessDoc.id}/products`);
        const productsQuery = query(productsRef, where("status", "==", "online"));
        productPromises.push(
          getDocs(productsQuery).then(snapshot => 
            snapshot.docs.map(doc => ({ 
              id: doc.id,
              businessName: businessDoc.businessName,
              businessId: businessDoc.id,
              storeSettings: businessDoc.storeSettings, 
              ...doc.data() 
            }))
          )
        );
      });

      try {
        const allProductsArrays = await Promise.all(productPromises);
        const allProducts = allProductsArrays.flat();
        
        const mappedProducts = allProducts.map(p => {
          const images = (Array.isArray(p.images) ? p.images : [])
            .map((img: any) => {
              if (typeof img === 'string') return { url: img };
              if (img && typeof img.url === 'string') return img;
              if (img && typeof img.imageUrl === 'string') return { url: img.imageUrl, description: img.imageHint };
              return null;
            })
            .filter((img): img is { url: string; description?: string } => img !== null);
          return { ...p, images };
        });

        if (mappedProducts.length > 0) {
          setProducts(mappedProducts);
        } else {
           const formattedMockProducts = mockProducts.map(p => ({
            id: p.id.toString(),
            name: p.name,
            price: parseFloat(p.price.replace('£', '')),
            onSale: !!p.originalPrice,
            salePrice: p.originalPrice ? parseFloat(p.price.replace('£', '')) : undefined,
            originalPrice: p.originalPrice ? parseFloat(p.originalPrice!.replace('£','')) : undefined,
            images: p.image?.imageUrl ? [{ url: p.image.imageUrl, description: p.image.imageHint }] : [],
            businessName: 'Mock Store',
            businessId: 'mock-business-id',
            stock: 10,
            storeSettings: { catalogueMode: false, storeAvailability: 'instore_online' },
            hasVariations: false,
          }));
          setProducts(formattedMockProducts);
        }
      } catch(error) {
        console.error("Error fetching products:", error);
        toast({ title: 'Error', description: 'Could not fetch products.', variant: 'destructive' });
      } finally {
        setLoadingProducts(false);
      }
    };

    fetchAllProducts();
  }, [businesses, businessesLoading, db, toast, userAgeRange]);


  const sortedProducts = React.useMemo(() => {
    const userIsUnder18 = userAgeRange === 'Under 18';

    let filtered = products.filter(p => {
        if (userIsUnder18 && (p.audience === 'adults' || (Array.isArray(p.audience) && p.audience.includes('adults')))) {
            return false;
        }
        return true;
    });

    switch (sortOption) {
      case "price-asc":
        return filtered.sort((a, b) => a.price - b.price);
      case "price-desc":
        return filtered.sort((a, b) => b.price - a.price);
      case "newest":
        return filtered.sort((a, b) => (b.createdAt?.toMillis() || 0) - (a.createdAt?.toMillis() || 0));
      case "featured":
      default:
        return filtered;
    }
  }, [sortOption, products, userAgeRange]);
  
  const handleFilterChange = <K extends keyof ShoppingFiltersState>(key: K, value: ShoppingFiltersState[K]) => {
      setFilters(prev => ({...prev, [key]: value}));
  };

  const handleResetFilters = () => {
    setFilters(initialFilters);
  };

  const filteredProducts = React.useMemo(() => {
    let productsToFilter = sortedProducts;

    if (searchQuery) {
      const lowercasedQuery = searchQuery.toLowerCase();
      productsToFilter = productsToFilter.filter(product => {
        const nameMatch = product.name && product.name.toLowerCase().includes(lowercasedQuery);
        const tagMatch = product.tags && Array.isArray(product.tags) && product.tags.some((tag: string) => tag.toLowerCase().includes(lowercasedQuery));
        return nameMatch || tagMatch;
      });
    }

    if (!filters) return productsToFilter;
    
    return productsToFilter.filter(product => {
        // Simple filter placeholder logic
        return true;
    });
  }, [sortedProducts, filters, searchQuery]);

  React.useEffect(() => {
    const productIdFromQuery = searchParams.get('productId');
    if (productIdFromQuery && filteredProducts.length > 0) {
        const productExists = filteredProducts.some(p => p.id === productIdFromQuery);
        if (productExists) {
            setDialogOpenFor(productIdFromQuery);
        }
    }
  }, [searchParams, filteredProducts]);
  
  
  const loading = isUserLoading || profileLoading || loadingProducts;

  const topRowProducts = filteredProducts.slice(0, 6);
  const mainGridProducts = filteredProducts;
  
  const handleShowMore = () => {
    setVisibleProductsCount(prevCount => prevCount + 12);
  };

  const handleShowLess = () => {
    setVisibleProductsCount(12);
    const cardElement = document.getElementById('bottom-products-card');
    if (cardElement) {
        cardElement.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div className="space-y-8">
      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                  <h1 className="text-3xl font-bold tracking-tight font-headline flex items-center gap-2">
                    <ShoppingCart className="h-8 w-8" />
                    Local Shopping
                  </h1>
                  <p className="text-muted-foreground mt-2">
                    Browse products from businesses in your community.
                  </p>
              </div>
              <div className="flex w-full md:w-auto items-center gap-2">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input placeholder="Search products..." className="pl-10" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
                </div>
                <Sheet>
                    <SheetTrigger asChild>
                        <Button variant="outline">
                            <Filter className="mr-2 h-4 w-4" />
                            Filters
                        </Button>
                    </SheetTrigger>
                    <SheetContent>
                        <SheetHeader>
                            <SheetTitle>Filter Products</SheetTitle>
                        </SheetHeader>
                        <ScrollArea className="h-[calc(100vh-8rem)]">
                            <ShoppingFilters filters={filters} onFilterChange={handleFilterChange} onReset={handleResetFilters} className="border-none shadow-none" />
                        </ScrollArea>
                    </SheetContent>
                </Sheet>
              </div>
          </div>
        </CardHeader>
      </Card>
      
      <div className="space-y-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Featured Products</CardTitle>
                <Select value={sortOption} onValueChange={setSortOption}>
                    <SelectTrigger className="w-[180px]">
                        <SelectValue placeholder="Sort by" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="featured">Featured</SelectItem>
                        <SelectItem value="price-asc">Price: Low to High</SelectItem>
                        <SelectItem value="price-desc">Price: High to Low</SelectItem>
                        <SelectItem value="newest">Newest</SelectItem>
                    </SelectContent>
                </Select>
            </CardHeader>
            <CardContent>
                {loading ? (
                    <div className="flex justify-center items-center h-40"><Loader2 className="h-8 w-8 animate-spin" /></div>
                ) : topRowProducts.length > 0 ? (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                        {topRowProducts.map((product) => {
                            const business = businesses?.find(b => b.id === product.businessId);
                            return (
                                <ProductCard key={product.id} product={product} business={business} />
                            )
                        })}
                    </div>
                ) : (
                    <p className="text-center text-muted-foreground py-8">No featured products available right now.</p>
                )}
            </CardContent>
          </Card>
          
          <NationalAdvertisers layout="compact" />

          <Card id="bottom-products-card">
             <CardHeader>
                <CardTitle>All Products</CardTitle>
                <CardDescription>Browse all available products in your community.</CardDescription>
            </CardHeader>
            <CardContent>
                {loading ? (
                     <div className="flex justify-center items-center h-40"><Loader2 className="h-8 w-8 animate-spin" /></div>
                ) : mainGridProducts.length > 0 ? (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                        {mainGridProducts.slice(0, visibleProductsCount).map((product) => {
                            const business = businesses?.find(b => b.id === product.businessId);
                            return (
                               <ProductCard key={product.id} product={product} business={business} />
                            )
                        })}
                    </div>
                ) : (
                     <p className="text-center text-muted-foreground py-8">No products found.</p>
                )}
            </CardContent>
             {mainGridProducts.length > visibleProductsCount && (
                <CardFooter className="justify-center">
                    <Button onClick={handleShowMore}>Show More</Button>
                </CardFooter>
            )}
            {visibleProductsCount > 12 && (
                 <CardFooter className="justify-center">
                    <Button variant="outline" onClick={handleShowLess}>Show Less</Button>
                </CardFooter>
            )}
          </Card>

          <HighstreetFeed communityId={activeCommunityId} />
          <ValuedPartners layout="carousel" />
        </div>
    </div>
  );
}

function ShoppingPage() {
    return (
        <React.Suspense fallback={<div className="flex h-screen w-full items-center justify-center"><Loader2 className="h-8 w-8 animate-spin" /></div>}>
            <ShoppingContent />
        </React.Suspense>
    )
}
export default ShoppingPage;