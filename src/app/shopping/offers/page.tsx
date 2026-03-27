
'use client';

import * as React from 'react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ShoppingFilters, type ShoppingFiltersState } from '@/components/shopping-filters';
import { NationalAdvertisers } from '@/components/national-advertisers';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { Filter, Loader2, ShoppingCart, Minus, Plus, Store, Youtube } from 'lucide-react';
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
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from '@/components/ui/carousel';
import { AspectRatio } from '@/components/ui/aspect-ratio';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  type ProductConfig,
  type StockData,
} from '@/components/product-variation-manager';
import { differenceInDays, isValid } from 'date-fns';
import { useSearchParams } from 'next/navigation';

const ProductDialogContent = ({ product, businessName, business }: { product: any, businessName: string, business: Business | undefined }) => {
    const { addItem } = useCart();
    const { toast } = useToast();
    const [quantity, setQuantity] = React.useState(1);
    
    const db = useFirestore();
    const variationDocRef = useMemoFirebase(() => 
        (db && product.businessId && product.id) ? doc(db, `businesses/${product.businessId}/products/${product.id}/product_data/variations`) : null
    , [db, product.businessId, product.id]);
    const { data: variationData } = useDoc(variationDocRef);

    const config: ProductConfig = variationData?.config || {};
    const stock: StockData = variationData?.stock || {};

    const [selectedCategory, setSelectedCategory] = React.useState<string | null>(null);
    const [selectedSize, setSelectedSize] = React.useState<string | null>(null);
    const [selectedColour, setSelectedColour] = React.useState<string | null>(null);

    const getYouTubeEmbedUrl = (url: string) => {
        if (!url) return null;
        let videoId;
        if (url.includes('youtu.be/')) {
            videoId = url.split('youtu.be/')[1].split('?')[0];
        } else if (url.includes('watch?v=')) {
            videoId = url.split('watch?v=')[1].split('&')[0];
        } else {
            return null;
        }
        return `https://www.youtube.com/embed/${videoId}`;
    };
    
    const embedUrl = getYouTubeEmbedUrl(product.videoUrl);

    React.useEffect(() => {
        if (config.categories?.length > 0) setSelectedCategory(config.categories[0]);
        if (config.sizes?.length > 0) setSelectedSize(config.sizes[0]);
        if (config.colours?.length > 0) setSelectedColour(config.colours[0].name);
    }, [config]);

    const getVariantStock = () => {
        if (!product.hasVariations || !selectedCategory || !selectedSize || !selectedColour) {
            return product.stock;
        }
        return stock?.[selectedCategory]?.[selectedSize]?.[selectedColour] || 0;
    };

    const currentStock = getVariantStock();


    const handleAddToCart = () => {
        let variantName = product.name;
        if (product.hasVariations) {
            variantName += ` (${[selectedCategory, selectedSize, selectedColour].filter(Boolean).join(' / ')})`;
        }
        const productToAdd = {
            ...product,
            name: variantName,
            id: product.hasVariations ? `${product.id}-${selectedCategory}-${selectedSize}-${selectedColour}` : product.id,
            image: product.images?.[0]?.url || '',
            store: businessName,
            businessId: product.businessId,
        };
        addItem(productToAdd, quantity);
        toast({
            title: "Added to Basket",
            description: `${quantity} x ${variantName} has been added.`
        });
    };

    const getDisplayPrice = (p: any) => {
        if (business?.storeSettings?.catalogueMode && !business.storeSettings.showPricesInCatalogue) {
            return <span className="text-lg font-semibold text-muted-foreground">Price available in-store</span>;
        }
        if (p.onSale) {
            if (p.discountType === 'percentage' && p.discountValue) {
                const salePrice = p.price * (1 - p.discountValue / 100);
                return (
                    <div className="flex items-baseline gap-2">
                        <span className="text-3xl font-bold text-destructive">£{salePrice.toFixed(2)}</span>
                        {(p as any).showOriginalPrice && (
                             <span className="text-lg text-muted-foreground line-through">£{p.price.toFixed(2)}</span>
                        )}
                    </div>
                );
            }
            if (p.discountType === 'amount' && p.salePrice) {
                 return (
                    <div className="flex items-baseline gap-2">
                        <span className="text-3xl font-bold text-destructive">£{p.salePrice.toFixed(2)}</span>
                        {p.showOriginalPrice && (
                            <span className="text-lg text-muted-foreground line-through">£{p.price.toFixed(2)}</span>
                        )}
                    </div>
                );
            }
        }
        return <span className="text-3xl font-bold">£{p.price.toFixed(2)}</span>;
    };
    
    const mediaItems = React.useMemo(() => {
        const items = [];
        if (embedUrl) {
            items.push({ type: 'video', url: embedUrl });
        }
        if (product.images && product.images.length > 0) {
            product.images.forEach((img: any) => items.push({ type: 'image', ...img }));
        }
        return items;
    }, [embedUrl, product.images]);

    const canAcceptPayments = !!business?.stripeAccountId;
    const isUnavailableForPurchase = business?.storeSettings?.catalogueMode || business?.storeSettings?.storeAvailability === 'instore_only' || !canAcceptPayments;
    const unavailabilityReason = !canAcceptPayments 
        ? "This store is not currently accepting online orders."
        : "This item is available in-store only.";

    return (
        <DialogContent className="sm:max-w-4xl grid grid-cols-1 md:grid-cols-2 gap-8 p-0">
             <div className="p-4">
                <Carousel className="w-full">
                    <CarouselContent>
                        {mediaItems.length > 0 ? (
                            mediaItems.map((media, index) => (
                                <CarouselItem key={index}>
                                    {media.type === 'video' ? (
                                        <AspectRatio ratio={16 / 9}>
                                            <iframe
                                                className="w-full h-full rounded-md"
                                                src={media.url}
                                                title="YouTube video player"
                                                frameBorder="0"
                                                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                                allowFullScreen
                                            ></iframe>
                                        </AspectRatio>
                                    ) : (
                                        <>
                                            <AspectRatio ratio={1 / 1}>
                                                <Image
                                                    src={media.url}
                                                    alt={media.description || `${product.name} image ${index + 1}`}
                                                    fill
                                                    className="object-cover rounded-md"
                                                />
                                            </AspectRatio>
                                            {media.description && (
                                                <p className="text-xs text-center text-muted-foreground mt-2">{media.description}</p>
                                            )}
                                        </>
                                    )}
                                </CarouselItem>
                            ))
                        ) : (
                            <CarouselItem>
                                <AspectRatio ratio={1 / 1}>
                                    <div className="bg-muted h-full w-full flex items-center justify-center rounded-md">
                                        <span className="text-muted-foreground">No Image or Video</span>
                                    </div>
                                </AspectRatio>
                            </CarouselItem>
                        )}
                    </CarouselContent>
                    {mediaItems.length > 1 && (
                    <>
                        <CarouselPrevious className="left-2" />
                        <CarouselNext className="right-2" />
                    </>
                    )}
                </Carousel>
             </div>
            <div className="p-6 flex flex-col">
                <DialogHeader className="text-left">
                    <DialogTitle className="text-3xl font-bold font-headline mb-2">{product.name}</DialogTitle>
                    {product.onSale && <Badge variant="destructive" className="w-fit">SALE</Badge>}
                </DialogHeader>
                <div className="py-4 flex-grow">
                    <div className="my-4">{getDisplayPrice(product)}</div>
                    <Separator />
                     {product.hasVariations && (
                        <div className="my-4 space-y-4">
                            {config.categories?.length > 0 && (
                                <div>
                                    <Label className="font-semibold">Category</Label>
                                    <div className="flex flex-wrap gap-2 mt-2">
                                        {config.categories.map((cat: string) => (
                                            <Button key={cat} variant={selectedCategory === cat ? 'default' : 'outline'} onClick={() => setSelectedCategory(cat)}>{cat}</Button>
                                        ))}
                                    </div>
                                </div>
                            )}
                            {config.sizes?.length > 0 && (
                                <div>
                                    <Label className="font-semibold">Size</Label>
                                    <div className="flex flex-wrap gap-2 mt-2">
                                        {config.sizes.map((size: string) => (
                                            <Button key={size} variant={selectedSize === size ? 'default' : 'outline'} onClick={() => setSelectedSize(size)}>{size}</Button>
                                        ))}
                                    </div>
                                </div>
                            )}
                            {config.colours?.length > 0 && (
                                <div>
                                    <Label className="font-semibold">Colour</Label>
                                    <div className="flex flex-wrap gap-2 mt-2">
                                        {config.colours.map((colour: {name: string, hex: string}) => (
                                            <Button key={colour.name} variant={selectedColour === colour.name ? 'default' : 'outline'} onClick={() => setSelectedColour(colour.name)} className="flex items-center gap-2">
                                                 <span className="h-4 w-4 rounded-full border" style={{ backgroundColor: colour.hex }}></span>
                                                {colour.name}
                                            </Button>
                                        ))}
                                    </div>
                                </div>
                            )}
                            <p className="text-sm text-muted-foreground">Stock: {currentStock}</p>
                        </div>
                    )}
                    <div 
                        className="prose dark:prose-invert max-w-none text-sm text-muted-foreground mt-4"
                        dangerouslySetInnerHTML={{ __html: product.description || ""}}
                    />
                </div>
                 <DialogFooter className="flex-col sm:flex-row sm:items-center gap-4 border-t pt-6">
                    {isUnavailableForPurchase ? (
                        <p className="text-sm font-semibold text-center w-full">{unavailabilityReason}</p>
                    ) : (
                        <>
                            <div className="flex items-center gap-2">
                                <Button variant="outline" size="icon" onClick={() => setQuantity(q => Math.max(1, q - 1))}><Minus className="h-4 w-4"/></Button>
                                <Input type="number" value={quantity} readOnly className="w-16 text-center" />
                                <Button variant="outline" size="icon" onClick={() => setQuantity(q => q + 1)} disabled={quantity >= currentStock}><Plus className="h-4 w-4"/></Button>
                            </div>
                            <Button size="lg" className="w-full sm:w-auto" onClick={handleAddToCart} disabled={currentStock === 0}>
                                <ShoppingCart className="mr-2 h-5 w-5" />
                                {currentStock > 0 ? 'Add to Basket' : 'Out of Stock'}
                            </Button>
                        </>
                    )}
                </DialogFooter>
            </div>
        </DialogContent>
    );
};

type Business = {
  id: string;
  businessName: string;
  storeSettings?: any;
  createdAt?: { toDate: () => Date };
  status: "Pending Approval" | "Approved" | "Requires Amendment" | "Declined" | "Subscribed" | "Draft";
  stripeAccountId?: string;
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

    const fetchAllOnSaleProducts = async () => {
      setLoadingProducts(true);
      const productPromises: Promise<any[]>[] = [];
      const now = new Date();

      businesses.forEach(businessDoc => {
          const productsRef = collection(db, `businesses/${businessDoc.id}/products`);
          const productsQuery = query(productsRef, where("status", "==", "online"), where("onSale", "==", true));
          productPromises.push(getDocs(productsQuery).then(snapshot => 
            snapshot.docs.map(doc => ({ 
              id: doc.id,
              businessName: businessDoc.businessName,
              businessId: businessDoc.id,
              storeSettings: businessDoc.storeSettings,
              ...doc.data() 
            }))
          ));
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
        
        setProducts(validSaleProducts);
      } catch (error) {
        console.error("Error fetching on-sale products:", error);
        toast({ title: 'Error', description: 'Could not fetch special offers.', variant: 'destructive' });
      } finally {
        setLoadingProducts(false);
      }
    };
    
    fetchAllOnSaleProducts();
  }, [businesses, db, toast]);

  const sortedProducts = React.useMemo(() => {
    let productsToSort = [...products];
    switch (sortOption) {
      case "price-asc":
        return productsToSort.sort((a, b) => a.price - b.price);
      case "price-desc":
        return productsToSort.sort((a, b) => b.price - a.price);
      case "newest":
        return productsToSort.sort((a, b) => (b.createdAt?.toMillis() || 0) - (a.createdAt?.toMillis() || 0));
      case "featured":
      default:
        // Could add a featured flag later
        return productsToSort;
    }
  }, [sortOption, products]);
  
  const handleFilterChange = <K extends keyof ShoppingFiltersState>(key: K, value: ShoppingFiltersState[K]) => {
      setFilters(prev => ({...prev, [key]: value}));
  };

  const handleResetFilters = () => {
    setFilters(initialFilters);
  };

  const filteredProducts = React.useMemo(() => {
    if (!filters) return sortedProducts;
    return sortedProducts.filter(product => {
        // Deals filter
        if (filters.deals === 'all-discounts' && !product.onSale) {
            return false;
        }
        if (filters.deals === 'todays-deals') {
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const saleStart = product.saleStartDate;
            const saleEnd = product.saleEndDate;
            if (!product.onSale || !saleStart) return false;
            const saleStartDate = saleStart.toDate ? saleStart.toDate() : new Date(saleStart);
            const saleEndDate = saleEnd ? (saleEnd.toDate ? saleEnd.toDate() : new Date(saleEnd)) : saleStartDate;
            
            if (!isValid(saleStartDate)) return false;

            if (today < saleStartDate || today > saleEndDate) {
                return false;
            }
        }
        
        // Delivery filter
        if (filters.delivery === 'offers-delivery' && product.storeSettings?.storeAvailability === 'instore_only') {
            return false;
        }
        if (filters.delivery === 'instore_only' && product.storeSettings?.storeAvailability !== 'instore_only') {
            return false;
        }

        // Price filter
        const price = product.price;
        if (filters.price === 'under-25' && price >= 25) return false;
        if (filters.price === 'under-50' && price >= 50) return false;
        if (filters.price === 'under-100' && price >= 100) return false;
        if (filters.price === 'under-200' && price >= 200) return false;
        
        // Availability filter
        if (filters.availability === 'in-stock' && product.stock === 0) {
            return false;
        }

        return true;
    });
  }, [sortedProducts, filters]);
  
  const handleAddToCart = (product: any) => {
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
  }
  
  const isProductOnSale = (product: any): boolean => {
    return !!product.onSale;
  };

  const loading = isUserLoading || profileLoading || loadingProducts;

    const getDisplayPrice = (product: any) => {
        if (product.storeSettings?.catalogueMode && !product.storeSettings.showPricesInCatalogue) {
            return <span className="text-sm font-semibold text-muted-foreground">Price in-store</span>;
        }
        if (product.onSale) {
            if (product.discountType === 'percentage' && product.discountValue) {
                const salePrice = product.price * (1 - product.discountValue / 100);
                return (
                    <div className="flex items-baseline gap-1">
                        <span className="text-lg font-bold text-destructive">£{salePrice.toFixed(2)}</span>
                        <span className="text-xs text-muted-foreground line-through">£{product.price.toFixed(2)}</span>
                    </div>
                );
            }
             if (product.discountType === 'amount' && product.salePrice) {
                return (
                    <div className="flex items-baseline gap-1">
                        <span className="text-lg font-bold text-destructive">£{product.salePrice.toFixed(2)}</span>
                        <span className="text-xs text-muted-foreground line-through">£{product.price.toFixed(2)}</span>
                    </div>
                );
            }
        }
        return `£${product.price.toFixed(2)}`;
    };

  return (
    <div className="space-y-8">
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <CardTitle>Special Offers</CardTitle>
              <CardDescription>A selection of the latest deals from local businesses.</CardDescription>
            </div>
            <div className="flex w-full sm:w-auto items-center gap-4">
                 <Sheet>
                    <SheetTrigger asChild>
                        <Button variant="outline" className="lg:hidden w-full">
                            <Filter className="mr-2 h-4 w-4" />
                            Filters
                        </Button>
                    </SheetTrigger>
                    <SheetContent side="left" className="w-full max-w-sm flex flex-col">
                        <SheetHeader>
                            <SheetTitle>Filter Products</SheetTitle>
                        </SheetHeader>
                        <ScrollArea className="-mx-6 flex-1">
                          <div className="px-6">
                            <ShoppingFilters filters={filters} onFilterChange={handleFilterChange} onReset={handleResetFilters} />
                          </div>
                        </ScrollArea>
                    </SheetContent>
                </Sheet>
                <Select value={sortOption} onValueChange={setSortOption}>
                    <SelectTrigger className="w-full sm:w-[180px]">
                    <SelectValue placeholder="Sort by..." />
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
        </CardHeader>
        <CardContent>
            {loading ? (
                <div className="flex justify-center items-center h-48"><Loader2 className="h-8 w-8 animate-spin" /></div>
            ) : filteredProducts.length > 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                    {filteredProducts.map((product) => {
                        const business = businesses?.find(b => b.id === product.businessId);
                        const canAcceptPayments = !!business?.stripeAccountId;
                        return (
                          <Dialog key={product.id}>
                            <DialogTrigger asChild>
                              <Card className="overflow-hidden group cursor-pointer flex flex-col">
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
                                  <div className="p-2 pt-0 flex gap-1">
                                    {(product.storeSettings?.catalogueMode || product.storeSettings?.storeAvailability === 'instore_only' || !canAcceptPayments) ? (
                                        <Button size="sm" variant="outline" className="w-full h-8 text-xs">View Details</Button>
                                    ) : (
                                        <>
                                            {!product.hasVariations ? (
                                                <Button size="icon" className="w-full h-8" onClick={(e) => { e.stopPropagation(); handleAddToCart(product); }} disabled={product.stock === 0}>
                                                    {product.stock > 0 ? <ShoppingCart className="h-4 w-4" /> : <span className="text-xs">Out</span>}
                                                </Button>
                                            ) : (
                                                <Button size="sm" variant="outline" className="w-full h-8 text-xs">Select Options</Button>
                                            )}
                                        </>
                                    )}
                                    <Button size="icon" variant="outline" className="h-8" asChild onClick={(e) => e.stopPropagation()}>
                                        <Link href={`/shopping/store/${product.businessId}`}>
                                            <Store className="h-4 w-4" />
                                        </Link>
                                    </Button>
                                  </div>
                              </Card>
                            </DialogTrigger>
                            <ProductDialogContent product={product} businessName={product.businessName} business={business} />
                          </Dialog>
                        )
                    })}
                </div>
            ) : (
                <p className="text-center text-muted-foreground py-16">There are no special offers in your community right now. Check back soon!</p>
            )}
        </CardContent>
      </Card>
      
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
          <aside className="hidden lg:block lg:col-span-1 relative">
              <div className="sticky top-28 space-y-8">
                  <ShoppingFilters filters={filters} onFilterChange={handleFilterChange} onReset={handleResetFilters} />
              </div>
          </aside>
          <main className="lg:col-span-4 space-y-8">
              <NationalAdvertisers />
          </main>
        </div>
      
       <div className="py-4 space-y-8">
          <ValuedPartners />
          <HighstreetFeed />
      </div>
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
