
'use client';

import * as React from 'react';
import { useCart } from '@/contexts/cart-context';
import { useToast } from '@/hooks/use-toast';
import { useDoc, useFirestore, useMemoFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';
import { DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription, DialogClose } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import NextImage from 'next/image';
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from '@/components/ui/carousel';
import { AspectRatio } from '@/components/ui/aspect-ratio';
import { ShoppingCart, Minus, Plus, Youtube, Store, X, Info, Lock } from 'lucide-react';
import { ScrollArea } from './ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import Link from 'next/link';
import { Alert, AlertDescription } from '@/components/ui/alert';

type Business = {
  id: string;
  businessName: string;
  storeSettings?: any;
  stripeAccountId?: string;
  primaryCommunityId?: string;
};

type VariationOption = {
    name: string;
    values: string[];
};

export type ProductConfig = VariationOption[];

export type StockData = {
    [key: string]: { price?: number; stock?: number };
};

export const ProductDialogContent = ({ product, businessName, business, canAcceptPayments, showVisitStoreButton = true }: { 
    product: any, 
    businessName: string, 
    business: Business | undefined, 
    canAcceptPayments: boolean,
    showVisitStoreButton?: boolean
}) => {
    const { addItem } = useCart();
    const { toast } = useToast();
    const [quantity, setQuantity] = React.useState(1);
    
    const db = useFirestore();
    const variationDocRef = useMemoFirebase(() => 
        (db && product.businessId && product.id) ? doc(db, `businesses/${product.businessId}/products/${product.id}/product_data/variations`) : null
    , [db, product.businessId, product.id]);
    const { data: stockData } = useDoc<any>(variationDocRef);

    const communityRef = useMemoFirebase(() => (business?.primaryCommunityId && db ? doc(db, 'communities', business.primaryCommunityId) : null), [business?.primaryCommunityId, db]);
    const { data: communityData } = useDoc(communityRef);

    const [selectedCategory, setSelectedCategory] = React.useState<string | null>(null);
    const [selectedSize, setSelectedSize] = React.useState<string | null>(null);
    const [selectedColor, setSelectedColor] = React.useState<string | null>(null);

    const availableCategories = React.useMemo(() => stockData?.stock ? Object.keys(stockData.stock) : [], [stockData]);
    const availableSizes = React.useMemo(() => selectedCategory && stockData?.stock?.[selectedCategory] ? Object.keys(stockData.stock[selectedCategory]) : [], [stockData, selectedCategory]);
    const availableColors = React.useMemo(() => selectedCategory && selectedSize && stockData?.stock?.[selectedCategory]?.[selectedSize] ? Object.keys(stockData.stock[selectedCategory][selectedSize]) : [], [stockData, selectedCategory, selectedSize]);

    // Set initial selections
    React.useEffect(() => {
        if (product.hasVariations) {
            if (availableCategories.length > 0 && !selectedCategory) setSelectedCategory(availableCategories[0]);
            if (availableSizes.length > 0 && !selectedSize) setSelectedSize(availableSizes[0]);
            if (availableColors.length > 0 && !selectedColor) setSelectedColor(availableColors[0]);
        }
    }, [product.hasVariations, availableCategories, availableSizes, availableColors, selectedCategory, selectedSize, selectedColor]);
    
    // Reset selections when a higher-level option changes
    React.useEffect(() => {
        setSelectedSize(null);
        setSelectedColor(null);
        if (availableSizes.length > 0) setSelectedSize(availableSizes[0]);
    }, [selectedCategory, availableSizes]);

    React.useEffect(() => {
        setSelectedColor(null);
        if (availableColors.length > 0) setSelectedColor(availableColors[0]);
    }, [selectedSize, availableColors]);

    const { currentStock, currentPrice } = React.useMemo(() => {
        if (product.hasVariations && selectedCategory && selectedSize && selectedColor && stockData?.stock) {
            const variantInfo = stockData.stock[selectedCategory]?.[selectedSize]?.[selectedColor];
            return {
                currentStock: variantInfo?.stock || 0,
                currentPrice: variantInfo?.price || 0,
            };
        }
        return {
            currentStock: product.stock,
            currentPrice: product.price,
        };
    }, [product, stockData, selectedCategory, selectedSize, selectedColor]);


    const handleAddToCart = () => {
        let variantId = product.id;
        let variantName = product.name;
        
        if (product.hasVariations) {
            const variantParts = [selectedCategory, selectedSize, selectedColor].filter(Boolean);
            if (variantParts.length > 0) {
                 variantId = `${product.id}::${variantParts.join('::')}`;
                 variantName = `${product.name} - ${variantParts.join(' / ')}`;
            }
        }
        
        const productToAdd = {
            ...product,
            id: variantId,
            name: variantName,
            price: currentPrice,
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
    
    const getDisplayPrice = () => {
        const priceToDisplay = currentPrice;
        if (business?.storeSettings?.catalogueMode && !business.storeSettings.showPricesInCatalogue) {
            return <span className="text-lg font-semibold text-muted-foreground">Price available in-store</span>;
        }
         if (product.onSale && !product.hasVariations) {
            const salePrice = product.salePrice || (product.price * (1 - (product.discountValue || 0) / 100));
            return (
                <div className="flex items-baseline gap-2">
                    <span className="text-3xl font-bold text-destructive">£{salePrice.toFixed(2)}</span>
                    {product.showOriginalPrice && (
                        <span className="text-lg text-muted-foreground line-through">£{product.price.toFixed(2)}</span>
                    )}
                </div>
            );
        }
        return <span className="text-3xl font-bold">£{priceToDisplay.toFixed(2)}</span>;
    };
    
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
    
    const mediaItems = React.useMemo(() => {
        const items: { type: 'video' | 'image'; url: string; description?: string }[] = [];
        if (embedUrl) {
            items.push({ type: 'video', url: embedUrl });
        }
        const imagesSource = product.images || [];

        if (Array.isArray(imagesSource)) {
             imagesSource.forEach((img: any) => {
                const imageUrl = typeof img === 'string' ? img : img?.url;
                if (imageUrl) {
                    items.push({ type: 'image', url: imageUrl, description: img?.description || '' });
                }
            });
        }
        return items;
    }, [embedUrl, product.images]);
    
    // ENFORCEMENT: Transactions are only allowed if 'transactionsEnabled' is true on the community.
    const isTransactionsEnabled = communityData?.transactionsEnabled === true;
    const isUnavailableForPurchase = !isTransactionsEnabled || business?.storeSettings?.catalogueMode || !canAcceptPayments;
    
    const unavailabilityReason = !isTransactionsEnabled 
        ? "Shopping is currently disabled for this community hub. This item is for display only."
        : !canAcceptPayments 
        ? "This store is not currently accepting online orders."
        : "This item is available in-store only.";

    return (
        <DialogContent className="max-w-4xl grid-rows-[auto,1fr,auto] p-0 max-h-[90vh]">
          <DialogHeader className="p-4 sm:p-6 pb-2 border-b flex-row justify-between items-center">
            <div>
              <DialogTitle className="text-2xl font-bold font-headline">{product.name}</DialogTitle>
              <DialogDescription>From {businessName}</DialogDescription>
            </div>
            <div className='flex items-center gap-2'>
                {showVisitStoreButton && (
                    <Button asChild variant="secondary">
                      <Link href={`/shopping/store/${product.businessId}`}>
                        <Store className="mr-2 h-4 w-4" />
                        Visit Store
                      </Link>
                    </Button>
                )}
                <DialogClose asChild>
                    <Button variant="ghost" size="icon">
                        <X className="h-5 w-5" />
                    </Button>
                </DialogClose>
            </div>
          </DialogHeader>
    
          <div className="grid md:grid-cols-2 gap-6 overflow-y-auto">
            <ScrollArea className="h-full px-4 sm:px-6">
                <Carousel className="w-full">
                <CarouselContent>
                  {mediaItems.length > 0 ? (
                    mediaItems.map((media, index) => (
                      <CarouselItem key={index}>
                        <AspectRatio ratio={1 / 1}>
                          {media.type === 'video' ? (
                            <iframe
                                className="w-full h-full rounded-md"
                                src={media.url}
                                title="YouTube video player"
                                frameBorder="0"
                                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                allowFullScreen
                            ></iframe>
                          ) : (
                            <NextImage
                                src={media.url}
                                alt={media.description || `${product.name} image ${index + 1}`}
                                fill
                                className="object-contain rounded-md"
                            />
                          )}
                        </AspectRatio>
                      </CarouselItem>
                    ))
                  ) : (
                    <CarouselItem>
                      <AspectRatio ratio={1 / 1} className="bg-muted flex items-center justify-center rounded-md">
                        <span className="text-muted-foreground">No Image</span>
                      </AspectRatio>
                    </CarouselItem>
                  )}
                </CarouselContent>
                {mediaItems.length > 1 && (
                  <>
                    <CarouselPrevious className="absolute left-2 top-1/2 -translate-y-1/2 z-10" />
                    <CarouselNext className="absolute right-2 top-1/2 -translate-y-1/2 z-10" />
                  </>
                )}
              </Carousel>
            </ScrollArea>
             <ScrollArea className="h-full px-4 sm:px-6">
                <div className="space-y-4">
                  <div className="space-y-4 rounded-lg border p-4">
                    {product.onSale && !product.hasVariations && <Badge variant="destructive" className="mb-2">SALE</Badge>}
                    {getDisplayPrice()}

                    {product.hasVariations && (
                      <div className="pt-4 space-y-4">
                        {availableCategories.length > 0 && (
                          <div>
                            <Label className="font-semibold">{stockData?.config?.[0]?.name || 'Category'}</Label>
                            <div className="flex flex-wrap gap-2 mt-2">
                              {availableCategories.map((cat: string) => (
                                <Button key={cat} variant={selectedCategory === cat ? 'default' : 'outline'} onClick={() => setSelectedCategory(cat)}>{cat}</Button>
                              ))}
                            </div>
                          </div>
                        )}
                         {availableSizes.length > 0 && (
                          <div>
                            <Label className="font-semibold">{stockData?.config?.[1]?.name || 'Size'}</Label>
                            <div className="flex flex-wrap gap-2 mt-2">
                              {availableSizes.map((size: string) => (
                                <Button key={size} variant={selectedSize === size ? 'default' : 'outline'} onClick={() => setSelectedSize(size)}>{size}</Button>
                              ))}
                            </div>
                          </div>
                        )}
                         {availableColors.length > 0 && (
                          <div>
                            <Label className="font-semibold">{stockData?.config?.[2]?.name || 'Colour'}</Label>
                            <div className="flex flex-wrap gap-2 mt-2">
                              {availableColors.map((color: string) => (
                                <Button key={color} variant={selectedColor === color ? 'default' : 'outline'} onClick={() => setSelectedColor(color)}>{color}</Button>
                              ))}
                            </div>
                          </div>
                        )}
                        <p className="text-sm text-muted-foreground">Stock: {currentStock}</p>
                      </div>
                    )}
                    
                    {isUnavailableForPurchase ? (
                        <div className="pt-4 space-y-2">
                           <Alert className="bg-amber-50 border-amber-200">
                                <Lock className="h-4 w-4 text-amber-600" />
                                <AlertDescription className="text-xs text-amber-800 font-medium">
                                    {unavailabilityReason}
                                </AlertDescription>
                            </Alert>
                        </div>
                    ) : (
                        <div className="flex items-center gap-2 pt-4">
                            <div className="flex items-center gap-2">
                                <Button variant="outline" size="icon" onClick={() => setQuantity(q => Math.max(1, q - 1))}><Minus className="h-4 w-4"/></Button>
                                <Input type="number" value={quantity} readOnly className="w-16 text-center" />
                                <Button variant="outline" size="icon" onClick={() => setQuantity(q => q + 1)} disabled={quantity >= currentStock}><Plus className="h-4 w-4"/></Button>
                            </div>
                            <Button size="lg" className="w-full" onClick={handleAddToCart} disabled={currentStock === 0}>
                                <ShoppingCart className="mr-2 h-5 w-5" />
                                {currentStock > 0 ? 'Add to Basket' : 'Out of Stock'}
                            </Button>
                        </div>
                    )}
                  </div>
                  
                  <Separator />
                  <div 
                      className="prose dark:prose-invert max-w-none text-sm text-muted-foreground"
                      dangerouslySetInnerHTML={{ __html: product.description || ""}}
                    />
                </div>
            </ScrollArea>
          </div>
        </DialogContent>
    );
};
