'use client';

import * as React from 'react';
import { useSearchParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { ShoppingFilters, type ShoppingFiltersState } from '@/components/shopping-filters';
import NationalAdvertisers from '@/components/national-advertisers';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Filter, Loader2, ShoppingCart, Store, ArrowRight, Tag } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ValuedPartners } from '@/components/valued-partners';
import { HighstreetFeed } from '@/components/highstreet-feed';
import { useCart } from '@/contexts/cart-context';
import { useToast } from '@/hooks/use-toast';
import {
  useUser,
  useFirestore,
  useDoc,
  useCollection,
  useMemoFirebase,
} from '@/firebase';
import { doc, collection, query, where, getDocs } from 'firebase/firestore';
import Image from 'next/image';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { isValid } from 'date-fns';
import { mockProducts } from '@/lib/mock-data';
import { ProductDialogContent } from '@/components/product-dialog-content';
import { AspectRatio } from '@/components/ui/aspect-ratio';


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


function OffersPageContent() {
    const [sortOption, setSortOption] = React.useState("featured");
    const { addItem } = useCart();
    const { toast } = useToast();
    
    const { user, isUserLoading } = useUser();
    const db = useFirestore();
    const userProfileRef = useMemoFirebase(() => (user ? doc(db, 'users', user.uid) : null), [user, db]);
    const { data: userProfile, isLoading: profileLoading } = useDoc(userProfileRef);

    const [products, setProducts] = React.useState<any[]>([]);
    const [loadingProducts, setLoadingProducts] = React.useState(true);
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

        const fetchAllOnSaleProducts = async () => {
          setLoadingProducts(true);
      
          const productPromises: Promise<any[]>[] = [];
          const now = new Date();
          const userIsUnder21 = userAgeRange === 'Under 18' || userAgeRange === '18-24';

          businesses.forEach(businessDoc => {
            // Enforce restricted products age gate
            if (userIsUnder21 && businessDoc.sellsRestrictedProducts) return;

            const productsRef = collection(db, `businesses/${businessDoc.id}/products`);
            const productsQuery = query(productsRef, where("status", "==", "online"), where("onSale", "==", true));
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
            
            const validSaleProducts = allProducts.filter(p => {
              const startDate = p.saleStartDate?.toDate();
              const endDate = p.saleEndDate?.toDate();
              if (startDate && startDate > now) return false;
              if (endDate && endDate < now) return false;
              // Additional safety audience check
              if (userAgeRange === 'Under 18' && (p.audience === 'adults' || (Array.isArray(p.audience) && p.audience.includes('adults')))) {
                return false;
              }
              return true;
            });
            
            if (validSaleProducts.length > 0) {
                const mappedProducts = validSaleProducts.map(p => {
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
                setProducts(mappedProducts);
            } else {
               const formattedMockProducts = mockProducts.filter(p => p.originalPrice).map(p => ({
                id: p.id.toString(),
                name: p.name,
                price: parseFloat(p.price.replace('£', '')),
                onSale: true,
                salePrice: parseFloat(p.price.replace('£', '')),
                originalPrice: parseFloat(p.originalPrice!.replace('£','')),
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
            console.error("Error fetching on-sale products:", error);
            toast({ title: 'Error', description: 'Could not fetch products.', variant: 'destructive' });
          } finally {
            setLoadingProducts(false);
          }
        };
        
        fetchAllOnSaleProducts();
    }, [businesses, db, toast, userAgeRange, businessesLoading]);
    
    const loading = isUserLoading || profileLoading || loadingProducts;

    const getDisplayPrice = (product: any) => {
        let finalPrice = product.price;
        let originalPrice = null;
        if (product.onSale) {
            if (product.discountType === 'percentage' && product.discountValue) {
                finalPrice = product.price * (1 - product.discountValue / 100);
                originalPrice = product.price;
            } else if (product.discountType === 'amount' && product.salePrice) {
                finalPrice = product.salePrice;
                originalPrice = product.price;
            }
        }

        const business = businesses?.find(b => b.id === product.businessId);

        if (business?.storeSettings?.catalogueMode && !business.storeSettings.showPricesInCatalogue) {
            return <span className="text-sm font-semibold text-muted-foreground">Price in-store</span>;
        }

        return (
            <div className="flex items-baseline gap-1">
                <span className={`font-bold ${product.onSale ? 'text-destructive' : 'text-lg'}`}>£{finalPrice.toFixed(2)}</span>
                {originalPrice && product.showOriginalPrice && (
                    <span className="text-sm text-muted-foreground line-through">£{product.price.toFixed(2)}</span>
                )}
            </div>
        );
    };

  return (
    <div className="space-y-8">
      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                  <h1 className="text-3xl font-bold tracking-tight font-headline flex items-center gap-2">
                    <Tag className="h-8 w-8" />
                    Special Offers
                  </h1>
                  <p className="text-muted-foreground mt-2">
                    Browse special offers from businesses in your community.
                  </p>
              </div>
          </div>
        </CardHeader>
        <CardContent>
            {loading ? (
                <div className="flex justify-center items-center h-48"><Loader2 className="h-8 w-8 animate-spin" /></div>
            ) : products.length > 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                    {products.map((product) => {
                        const business = businesses?.find(b => b.id === product.businessId);
                        const canAcceptPayments = !!business?.stripeAccountId;
                        return (
                          <Dialog key={product.id} open={dialogOpenFor === product.id} onOpenChange={(isOpen) => setDialogOpenFor(isOpen ? product.id : null)}>
                            <DialogTrigger asChild>
                              <Card className="overflow-hidden group cursor-pointer flex flex-col h-full">
                                <CardHeader className="p-0">
                                    <AspectRatio ratio={1 / 1} className="bg-muted">
                                        <Image src={product.images?.[0]?.url || 'https://picsum.photos/seed/product/400'} alt={product.name} fill className="object-cover" />
                                    </AspectRatio>
                                </CardHeader>
                                <CardContent className="p-2 flex-grow flex flex-col">
                                    <h4 className="font-semibold text-sm truncate flex-grow">{product.name}</h4>
                                    <p className="text-xs text-muted-foreground truncate">{product.businessName}</p>
                                </CardContent>
                                <CardFooter className="p-2 pt-0">
                                    {getDisplayPrice(product)}
                                </CardFooter>
                              </Card>
                            </DialogTrigger>
                            <ProductDialogContent product={product} businessName={product.businessName} business={business} canAcceptPayments={canAcceptPayments} />
                          </Dialog>
                        )
                    })}
                </div>
            ) : (
                <p className="text-center text-muted-foreground py-16">There are no special offers in your community right now. Check back soon!</p>
            )}
        </CardContent>
      </Card>
    </div>
  );
}


export default function OffersPage() {
    return (
        <React.Suspense fallback={<div className="flex h-screen w-full items-center justify-center"><Loader2 className="h-8 w-8 animate-spin"/></div>}>
            <OffersPageContent />
        </React.Suspense>
    )
}