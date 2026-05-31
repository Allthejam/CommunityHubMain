
'use client';
import * as React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from './ui/card';
import Image from 'next/image';
import Link from 'next/link';
import { ShoppingCart, Loader2, ArrowRight } from 'lucide-react';
import { useUser, useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, where, getDocs, limit } from 'firebase/firestore';
import { useIsMobile } from '@/hooks/use-mobile';
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ui/carousel";
import Autoplay from "embla-carousel-autoplay";
import { Button } from './ui/button';
import { mockProducts } from '@/lib/mock-data';
import { Badge } from './ui/badge';
import { Dialog, DialogTrigger } from './ui/dialog';
import { ProductDialogContent } from './product-dialog-content';
import { useToast } from '@/hooks/use-toast';

type Business = {
  id: string;
  businessName: string;
  storeSettings?: any;
  stripeAccountId?: string;
  sellsRestrictedProducts?: boolean;
};

type Product = {
  id: string;
  name: string;
  price: number;
  images: { url: string }[];
  businessId: string;
  businessName?: string;
  onSale?: boolean;
  salePrice?: number;
  discountType?: 'amount' | 'percentage';
  discountValue?: number;
  audience?: string | string[];
};

const ProductCard = ({ item: product }: { item: Product }) => {
    const getDisplayPrice = (p: Product) => {
        if (p.onSale) {
            if (p.discountType === 'percentage' && p.discountValue) {
                const salePrice = p.price * (1 - p.discountValue / 100);
                return <span className="text-destructive font-bold">£{salePrice.toFixed(2)}</span>;
            }
             if (p.discountType === 'amount' && p.salePrice) {
                return <span className="text-destructive font-bold">£{p.salePrice.toFixed(2)}</span>
            }
        }
        return `£${p.price.toFixed(2)}`;
    };

  return (
    <Card className="overflow-hidden h-full flex flex-col group cursor-pointer hover:shadow-lg transition-shadow">
        <div className="relative aspect-square w-full">
            {product.images && product.images.length > 0 && (
                <Image
                    src={product.images[0].url}
                    alt={product.name}
                    fill
                    className="object-cover transition-transform duration-300 group-hover:scale-105"
                    data-ai-hint="product photo"
                />
            )}
            {product.onSale && (
                <Badge variant="destructive" className="absolute top-2 left-2">SALE</Badge>
            )}
        </div>
        <div className="p-2 flex-grow flex flex-col">
            <h3 className="font-semibold text-sm truncate flex-grow">{product.name}</h3>
            <div className="text-lg font-bold">{getDisplayPrice(product)}</div>
        </div>
    </Card>
  );
};


export function ProductsFeed({ communityId }: { communityId: string | null }) {
  const db = useFirestore();
  const { user, userProfile, isUserLoading, profileLoading } = useUser();
  const { toast } = useToast();
  const [products, setProducts] = React.useState<Product[]>([]);
  const [loadingProducts, setLoadingProducts] = React.useState(true);
  const [dialogOpenFor, setDialogOpenFor] = React.useState<string | null>(null);

  const businessesQuery = useMemoFirebase(() => {
    if (!communityId || !db) return null;
    return query(
      collection(db, "businesses"),
      where("primaryCommunityId", "==", communityId),
      where("storefrontSubscription", "==", true),
      where("status", "in", ["Approved", "Subscribed"])
    );
  }, [db, communityId]);

  const { data: businesses, isLoading: businessesLoading } = useCollection<Business>(businessesQuery);
  
  React.useEffect(() => {
    if (!businesses) {
      if(!businessesLoading) setLoadingProducts(false);
      return;
    }

    const fetchProducts = async () => {
      setLoadingProducts(true);
      const productPromises: Promise<Product[]>[] = [];
      const userIsUnder21 = userProfile?.ageRange === 'Under 18' || userProfile?.ageRange === '18-24';
      
      businesses.forEach(businessDoc => {
        // Skip if business is restricted and user is under 21
        if (userIsUnder21 && businessDoc.sellsRestrictedProducts) return;

        const productsRef = collection(db, `businesses/${businessDoc.id}/products`);
        const productsQuery = query(productsRef, where("status", "==", "online"), limit(10));
        productPromises.push(
            getDocs(productsQuery).then(snapshot => 
              snapshot.docs.map(doc => ({ 
                id: doc.id,
                businessId: businessDoc.id,
                businessName: businessDoc.businessName,
                ...doc.data() 
              } as Product))
            )
        );
      });
      
      try {
        const allProductsArrays = await Promise.all(productPromises);
        const allProducts = allProductsArrays.flat();
        
        const mappedProducts = allProducts.map(p => ({
            ...p,
            images: Array.isArray(p.images) 
                ? p.images.map(img => (typeof img === 'string' ? { url: img } : img)) 
                : [],
        }));

        setProducts(mappedProducts);
      } catch (error) {
        console.error("Error fetching products:", error);
        toast({ title: 'Error', description: 'Could not fetch products.', variant: 'destructive' });
      } finally {
        setLoadingProducts(false);
      }
    };
    
    fetchProducts();
  }, [businesses, businessesLoading, db, toast, userProfile]);

  const loading = businessesLoading || loadingProducts || isUserLoading || profileLoading;

  const randomProducts = React.useMemo(() => {
    const sourceData = products.length > 0 ? products : mockProducts.map(p => {
      const imageUrl = (p.image as any)?.imageUrl || `https://picsum.photos/seed/${p.id}/400/300`;
      return {
        ...p,
        id: String(p.id),
        images: [{ url: imageUrl }],
        price: parseFloat(p.price.replace('£', '')),
        onSale: !!p.originalPrice,
        businessId: 'mock-business-id',
      } as Product;
    });

    const userIsUnder18 = userProfile?.ageRange === 'Under 18';
    const filteredSource = sourceData.filter(p => {
        if(userIsUnder18 && (p.audience === 'adults' || (Array.isArray(p.audience) && p.audience.includes('adults')))) {
            return false;
        }
        return true;
    })

    return [...filteredSource].sort(() => 0.5 - Math.random());
  }, [products, userProfile]);
  
  const plugin = React.useRef(Autoplay({ delay: 4000, stopOnInteraction: true }));

  if (loading) {
    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <ShoppingCart className="h-6 w-6" />
                    From Your Highstreet
                </CardTitle>
            </CardHeader>
            <CardContent className="h-48 flex justify-center items-center">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </CardContent>
        </Card>
    );
  }

  if (randomProducts.length === 0) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
            <ShoppingCart className="h-6 w-6" />
            From Your Highstreet
        </CardTitle>
        <CardDescription>A selection of products from businesses in your community.</CardDescription>
      </CardHeader>
      <CardContent>
        <Carousel
            opts={{
                align: "start",
                loop: randomProducts.length > 5, // A reasonable number to start looping
            }}
            plugins={[plugin.current]}
            onMouseEnter={plugin.current.stop}
            onMouseLeave={plugin.current.reset}
            className="w-full"
        >
            <CarouselContent className="-ml-4">
            {randomProducts.map((product) => {
                const business = businesses?.find(b => b.id === product.businessId);
                const canAcceptPayments = !!business?.stripeAccountId;
                return (
                <CarouselItem key={product.id} className="pl-4 basis-1/2 sm:basis-1/3 md:basis-1/4 lg:basis-1/5">
                    <Dialog open={dialogOpenFor === product.id} onOpenChange={(isOpen) => setDialogOpenFor(isOpen ? product.id : null)}>
                        <DialogTrigger asChild>
                            <div>
                                <ProductCard item={product} />
                            </div>
                        </DialogTrigger>
                        <ProductDialogContent product={product} businessName={product.businessName || ''} business={business} canAcceptPayments={canAcceptPayments} />
                    </Dialog>
                </CarouselItem>
                )
            })}
            </CarouselContent>
            <CarouselPrevious className="hidden sm:flex" />
            <CarouselNext className="hidden sm:flex" />
        </Carousel>
      </CardContent>
      <CardFooter>
        <Button variant="outline" asChild>
            <Link href="/shopping">
                See All Products <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
        </Button>
      </CardFooter>
    </Card>
  );
}
