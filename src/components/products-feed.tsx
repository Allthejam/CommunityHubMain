

'use client';
import * as React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from './ui/card';
import Image from 'next/image';
import Link from 'next/link';
import { ShoppingCart, Loader2, ArrowRight } from 'lucide-react';
import { useUser, useFirestore, useDoc, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, where, doc, getDocs, limit } from 'firebase/firestore';
import { useIsMobile } from '@/hooks/use-mobile';
import { Carousel, CarouselContent, CarouselItem, CarouselPrevious, CarouselNext } from "@/components/ui/carousel";
import Autoplay from "embla-carousel-autoplay";
import { Button } from './ui/button';
import { mockProducts } from '@/lib/mock-data';
import { Badge } from './ui/badge';
import { differenceInDays } from 'date-fns';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { ProductDialogContent } from './product-dialog-content';

type Business = {
  id: string;
  createdAt?: { toDate: () => Date };
  status: "Pending Approval" | "Approved" | "Subscribed";
};

type Product = {
  id: string;
  name: string;
  price: number;
  images: { url: string }[];
  businessId: string;
  onSale?: boolean;
  salePrice?: number;
  discountType?: 'amount' | 'percentage';
  discountValue?: number;
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
        <CardFooter className="p-2 pt-0 flex justify-end">
            <Button size="sm" variant="ghost" asChild>
                <Link href={`/shopping/store/${product.businessId}?productId=${product.id}`}>
                    View
                </Link>
            </Button>
        </CardFooter>
    </Card>
  );
};


export function ProductsFeed() {
  const { user, isUserLoading: authLoading } = useUser();
  const db = useFirestore();
  const [products, setProducts] = React.useState<Product[]>([]);
  const [loadingProducts, setLoadingProducts] = React.useState(true);

  const userProfileRef = useMemoFirebase(() => (user && db ? doc(db, 'users', user.uid) : null), [user, db]);
  const { data: userProfile, isLoading: profileLoading } = useDoc(userProfileRef);

  const businessesQuery = useMemoFirebase(() => {
    if (!userProfile?.communityId || !db) return null;
    return query(
      collection(db, "businesses"),
      where("primaryCommunityId", "==", userProfile.communityId),
      where("storefrontSubscription", "==", true),
      where("status", "in", ["Approved", "Subscribed"])
    );
  }, [db, userProfile?.communityId]);

  const { data: businesses, isLoading: businessesLoading } = useCollection<Business>(businessesQuery);
  
  React.useEffect(() => {
    if (!businesses) {
      if(!businessesLoading) setLoadingProducts(false);
      return;
    }

    const fetchProducts = async () => {
      setLoadingProducts(true);
      const productPromises: Promise<Product[]>[] = [];
      
      businesses.forEach(businessDoc => {
        const productsRef = collection(db, `businesses/${businessDoc.id}/products`);
        const productsQuery = query(productsRef, where("status", "==", "online"), limit(10));
        productPromises.push(
            getDocs(productsQuery).then(snapshot => 
              snapshot.docs.map(doc => ({ 
                id: doc.id,
                businessId: businessDoc.id,
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
      } finally {
        setLoadingProducts(false);
      }
    };
    
    fetchProducts();
  }, [businesses, businessesLoading, db]);

  const loading = authLoading || profileLoading || loadingProducts;

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

    return [...sourceData].sort(() => 0.5 - Math.random());
  }, [products]);
  
  const isMobile = useIsMobile();
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
        {isMobile ? (
             <Carousel
                opts={{ align: "start", loop: randomProducts.length > 2 }}
                plugins={[plugin.current]}
                onMouseEnter={plugin.current.stop}
                onMouseLeave={plugin.current.reset}
                className="w-full"
            >
                <CarouselContent className="-ml-2">
                {randomProducts.slice(0, 8).map((product) => (
                    <CarouselItem key={product.id} className="pl-2 basis-1/2">
                       <ProductCard item={product} />
                    </CarouselItem>
                ))}
                </CarouselContent>
            </Carousel>
        ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {randomProducts.slice(0, 5).map(product => (
                <ProductCard key={product.id} item={product} />
              ))}
            </div>
        )}
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

    