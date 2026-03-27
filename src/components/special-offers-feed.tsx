

'use client';
import * as React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from './ui/card';
import Image from 'next/image';
import { Button } from './ui/button';
import Link from 'next/link';
import { ArrowRight, Loader2, Tag } from 'lucide-react';
import { useUser, useFirestore, useDoc, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, where, doc, getDocs, Timestamp } from 'firebase/firestore';
import { differenceInDays } from 'date-fns';
import { Badge } from './ui/badge';
import { mockProducts } from '@/lib/mock-data';

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
    saleStartDate?: Timestamp;
    saleEndDate?: Timestamp;
};


export function SpecialOffersFeed() {
  const { user, isUserLoading: authLoading } = useUser();
  const db = useFirestore();
  
  const userProfileRef = useMemoFirebase(() => (user && db ? doc(db, 'users', user.uid) : null), [user, db]);
  const { data: userProfile, isLoading: profileLoading } = useDoc(userProfileRef);

  const [products, setProducts] = React.useState<Product[]>([]);
  const [loadingProducts, setLoadingProducts] = React.useState(true);

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

    const fetchOnSaleProducts = async () => {
      setLoadingProducts(true);
      const productPromises: Promise<Product[]>[] = [];
      const now = new Date();

      businesses.forEach(businessDoc => {
          const productsRef = collection(db, `businesses/${businessDoc.id}/products`);
          const productsQuery = query(productsRef, where("status", "==", "online"), where("onSale", "==", true));
          productPromises.push(
            getDocs(productsQuery).then(snapshot => 
              snapshot.docs.map(doc => ({ id: doc.id, businessId: businessDoc.id, ...doc.data() } as Product))
            )
          );
      });
      
      try {
        const allProductsArrays = await Promise.all(productPromises);
        const allProducts = allProductsArrays.flat();
        
        const validSaleProducts = allProducts.filter(p => {
          if (!p.saleStartDate) return true; // if no start date, it's on sale indefinitely
          const startDate = p.saleStartDate.toDate();
          const endDate = p.saleEndDate?.toDate();
          if (startDate > now) return false; // sale hasn't started
          if (endDate && endDate < now) return false; // sale has ended
          return true;
        });
        
        if (validSaleProducts.length > 0) {
            setProducts(validSaleProducts);
        } else {
            const formattedMockProducts = mockProducts.filter(p => p.originalPrice).map(p => ({
                id: p.id.toString(),
                name: p.name,
                price: parseFloat(p.price.replace('£', '')),
                onSale: true,
                salePrice: parseFloat(p.price.replace('£', '')),
                originalPrice: parseFloat(p.originalPrice!.replace('£','')),
                images: p.image?.imageUrl ? [{ url: p.image.imageUrl }] : [],
                businessId: 'mock-business-id',
                stock: 10,
            })) as Product[];
            setProducts(formattedMockProducts);
        }

      } catch (error) {
        console.error("Error fetching on-sale products:", error);
      } finally {
        setLoadingProducts(false);
      }
    };
    
    fetchOnSaleProducts();
  }, [businesses, businessesLoading, db]);

  const getDisplayPrice = (product: Product) => {
      if (product.onSale) {
          if (product.discountType === 'percentage' && product.discountValue) {
              const salePrice = product.price * (1 - product.discountValue / 100);
              return `£${salePrice.toFixed(2)}`;
          }
          if (product.discountType === 'amount' && product.salePrice) {
              return `£${product.salePrice.toFixed(2)}`;
          }
      }
      return `£${product.price.toFixed(2)}`;
  };

  const loading = authLoading || profileLoading || loadingProducts;

  if (loading) {
    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2"><Tag /> Special Offers</CardTitle>
            </CardHeader>
            <CardContent className="h-48 flex justify-center items-center">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </CardContent>
        </Card>
    );
  }
  
  if (products.length === 0) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><Tag /> Special Offers</CardTitle>
        <CardDescription>Limited-time deals from businesses in your community.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {products.slice(0, 5).map(product => (
            <Link key={product.id} href={`/shopping/store/${product.businessId}?productId=${product.id}`}>
              <Card className="overflow-hidden group h-full flex flex-col">
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
                  <Badge variant="destructive" className="absolute top-2 left-2">SALE</Badge>
                </div>
                <div className="p-2 flex-grow flex flex-col">
                  <h3 className="font-semibold text-sm truncate flex-grow">{product.name}</h3>
                  <div className="text-lg font-bold">{getDisplayPrice(product)}</div>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      </CardContent>
      <CardFooter>
        <Button variant="outline" asChild>
            <Link href="/shopping/offers">
                See All Offers <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
        </Button>
      </CardFooter>
    </Card>
  );
}

    