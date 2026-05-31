'use client';

import * as React from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { useUser, useFirestore, useDoc, useCollection, useMemoFirebase } from '@/firebase';
import { doc, collection, query, where, limit } from 'firebase/firestore';
import { Loader2, ArrowLeft, Store, Lock } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { useCart } from '@/contexts/cart-context';
import { useToast } from '@/hooks/use-toast';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import Link from 'next/link';
import {
  Dialog,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ProductDialogContent } from '@/components/product-dialog-content';
import { AspectRatio } from '@/components/ui/aspect-ratio';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

type Business = {
  id: string;
  businessName: string;
  slug?: string;
  storeSettings?: any;
  stripeAccountId?: string;
  logoImage?: string;
  bannerImage?: string;
  shortDescription?: string;
  primaryCommunityId?: string;
};

const getDisplayPrice = (product: any, business: Business | undefined) => {
    if (business?.storeSettings?.catalogueMode && !business.storeSettings.showPricesInCatalogue) {
        return <span className="text-sm font-semibold text-muted-foreground">Price available in-store</span>;
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

    return (
        <Dialog>
            <DialogTrigger asChild>
                <Card className="overflow-hidden group flex flex-col cursor-pointer h-full hover:shadow-lg transition-shadow">
                    <div className='flex-grow flex flex-col'>
                        <CardHeader className="p-0">
                            <AspectRatio ratio={1 / 1} className="bg-muted">
                                <Image src={product.images?.[0]?.url || 'https://picsum.photos/seed/product/400'} alt={product.name} fill className="object-cover" />
                            </AspectRatio>
                        </CardHeader>
                        <CardContent className="p-2 flex-grow flex flex-col">
                            <h4 className="font-semibold text-sm truncate flex-grow">{product.name}</h4>
                            <p className="text-xs text-muted-foreground truncate">{product.businessName}</p>
                        </CardContent>
                    </div>
                    <CardFooter className="p-2 pt-0 flex items-center justify-between">
                         <div className="pt-1">{getDisplayPrice(product, business)}</div>
                    </CardFooter>
                </Card>
            </DialogTrigger>
            <ProductDialogContent product={product} businessName={business?.businessName || ''} business={business} canAcceptPayments={canAcceptPayments} showVisitStoreButton={false}/>
        </Dialog>
    );
};


function StorefrontPageContent() {
    const params = useParams();
    const businessId = params.businessId as string;
    const db = useFirestore();
    const searchParams = useSearchParams();
    const { userProfile, isLoading: profileLoading } = useUser();

    const [dialogOpenFor, setDialogOpenFor] = React.useState<string | null>(null);
    
    const businessRef = useMemoFirebase(() => {
        if (!db || !businessId) return null;
        return doc(db, 'businesses', businessId);
    }, [db, businessId]);

    const { data: business, isLoading: businessLoading } = useDoc<Business>(businessRef);

    const communityRef = useMemoFirebase(() => {
        if (!business?.primaryCommunityId || !db) return null;
        return doc(db, 'communities', business.primaryCommunityId);
    }, [business?.primaryCommunityId, db]);
    const { data: communityData } = useDoc<any>(communityRef);

    const productsQuery = useMemoFirebase(() => {
        if (!businessId || !db) return null;
        return query(collection(db, `businesses/${businessId}/products`));
    }, [businessId, db]);

    const { data: rawProducts, isLoading: productsLoading } = useCollection(productsQuery);
    
    const userAgeRange = userProfile?.ageRange;

    const products = React.useMemo(() => {
        if (!rawProducts) return [];

        const userIsUnder18 = userAgeRange === 'Under 18';
        
        const filteredProducts = rawProducts.filter(p => {
            if (userIsUnder18 && (p.audience === 'adults' || (Array.isArray(p.audience) && p.audience.includes('adults')))) {
                return false;
            }
            return true;
        });

        return filteredProducts.map((p: any) => {
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
    }, [rawProducts, userAgeRange]);


    const [categoryFilter, setCategoryFilter] = React.useState('all');
    const [sortOption, setSortOption] = React.useState('featured');

    const productCategories = React.useMemo(() => {
        if (!products) return [];
        const categories = new Set(products.map(p => p.category).filter(Boolean));
        return ['all', ...Array.from(categories)];
    }, [products]);

    const filteredAndSortedProducts = React.useMemo(() => {
        let filtered = products || [];

        if (categoryFilter !== 'all') {
            filtered = filtered.filter(p => p.category === categoryFilter);
        }

        switch (sortOption) {
            case 'price-asc':
                return filtered.sort((a, b) => a.price - b.price);
            case 'price-desc':
                return filtered.sort((a, b) => b.price - a.price);
            case 'newest':
                return filtered.sort((a, b) => (b.createdAt?.toMillis() || 0) - (a.createdAt?.toMillis() || 0));
            default:
                return filtered;
        }
    }, [products, categoryFilter, sortOption]);

    React.useEffect(() => {
        const productIdFromQuery = searchParams.get('productId');
        if (productIdFromQuery && products) {
            const productExists = products.some(p => p.id === productIdFromQuery);
            if (productExists) {
                setDialogOpenFor(productIdFromQuery);
            }
        }
    }, [searchParams, products]);

    const isLoading = businessLoading || productsLoading || profileLoading;
    const canAcceptPayments = !!business?.stripeAccountId;
    
    // ENFORCEMENT: Transactions are only allowed if 'transactionsEnabled' is true on the community.
    const isTransactionsEnabled = communityData?.transactionsEnabled === true;
    const isUnavailableForPurchase = !isTransactionsEnabled || business?.storeSettings?.catalogueMode || !canAcceptPayments;
    
    const unavailabilityReason = !isTransactionsEnabled 
        ? "Shopping is currently disabled for this community hub. This item is for display only."
        : !canAcceptPayments 
        ? "This store is not currently accepting online orders."
        : "This item is available in-store only.";

    if (isLoading) {
        return (
            <div className="flex justify-center items-center h-96">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        );
    }

    if (!business) {
        return <p>Business not found.</p>;
    }
    
    return (
        <div className="space-y-8 relative">
             <div className="fixed top-24 left-4 z-10 hidden lg:block">
                <Button asChild size="lg" className="shadow-lg">
                    <Link href="/shopping/highstreet">
                        <ArrowLeft className="mr-2 h-5 w-5" />
                        Back to Highstreet
                    </Link>
                </Button>
            </div>

             <Card className="overflow-hidden">
                 <div className="relative">
                    <div className="relative h-48 md:h-64 w-full bg-muted">
                        {business.bannerImage && (
                            <Image src={business.bannerImage} alt={`${business.businessName} banner`} fill className="object-cover" />
                        )}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
                    </div>
                    <div className="absolute bottom-0 left-0 p-6 flex items-end gap-4">
                        <div className="relative w-24 h-24 md:w-32 md:h-32 rounded-lg border-4 border-background overflow-hidden -mb-12 md:-mb-16 bg-card shadow-lg">
                            {business.logoImage ? (
                                <Image src={business.logoImage} alt={`${business.businessName} logo`} fill className="object-contain p-2" />
                            ) : (
                                <div className="flex h-full w-full items-center justify-center bg-secondary text-4xl font-bold text-secondary-foreground">
                                    {(business.businessName || 'B').charAt(0)}
                                </div>
                            )}
                        </div>
                        <div>
                             <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-white font-headline drop-shadow-md">
                                {business.businessName}
                            </h1>
                             <p className="text-white/90 text-lg line-clamp-1">{business.shortDescription}</p>
                        </div>
                    </div>
                </div>

                <div className="p-6 pt-20">
                    {isUnavailableForPurchase && (
                        <Alert variant={(!canAcceptPayments || !isTransactionsEnabled) ? "destructive" : "default"} className="mb-8">
                            <Lock className="h-4 w-4" />
                            <AlertTitle>
                                {!isTransactionsEnabled ? 'Transactions Disabled' : !canAcceptPayments ? 'Store Currently Unavailable' : 'Catalogue Mode Active'}
                            </AlertTitle>
                            <AlertDescription>
                                {!isTransactionsEnabled 
                                    ? 'Online transactions are currently disabled for this community hub. Items are for display only.'
                                    : !canAcceptPayments 
                                    ? 'This business has not completed their payment setup and cannot accept online orders at this time.'
                                    : 'This store is in catalogue mode. Items are for viewing only and cannot be purchased online.'
                                }
                            </AlertDescription>
                        </Alert>
                    )}

                    <Card>
                        <CardHeader>
                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                                <CardTitle>Products</CardTitle>
                                <div className="flex wrap items-center gap-4">
                                    <div className="flex items-center gap-2">
                                        <Label>Category</Label>
                                        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                                            <SelectTrigger className="w-[180px]">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {productCategories.map(cat => (
                                                    <SelectItem key={cat} value={cat}>{cat === 'all' ? 'All Categories' : cat}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Label>Sort by</Label>
                                        <Select value={sortOption} onValueChange={setSortOption}>
                                            <SelectTrigger className="w-[180px]">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="featured">Featured</SelectItem>
                                                <SelectItem value="price-asc">Price: Low to High</SelectItem>
                                                <SelectItem value="price-desc">Price: High to Low</SelectItem>
                                                <SelectItem value="newest">Newest</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent>
                            {filteredAndSortedProducts && filteredAndSortedProducts.length > 0 ? (
                                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                                    {filteredAndSortedProducts.map(product => (
                                        <ProductCard key={product.id} product={product} business={business} />
                                    ))}
                                </div>
                            ) : (
                                <p className="text-muted-foreground text-center py-10">This business has not added any products yet.</p>
                            )}
                        </CardContent>
                    </Card>
                </div>
             </Card>
        </div>
    );
}

export default function StorefrontPage() {
    return (
        <React.Suspense fallback={<div className="h-screen w-full flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin" /></div>}>
            <StorefrontPageContent />
        </React.Suspense>
    )
}
