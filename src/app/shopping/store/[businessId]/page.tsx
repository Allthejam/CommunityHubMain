
'use client';

import * as React from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { useFirestore, useDoc, useCollection, useMemoFirebase } from '@/firebase';
import { doc, collection, query } from 'firebase/firestore';
import { Loader2, ShoppingCart, Info, Star, ArrowLeft, Store, Youtube, AlertCircle } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent, CardFooter, CardDescription } from '@/components/ui/card';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { useCart } from '@/contexts/cart-context';
import { useToast } from '@/hooks/use-toast';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
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
import { Separator } from '@/components/ui/separator';
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from '@/components/ui/carousel';
import { AspectRatio } from '@/components/ui/aspect-ratio';
import { Input } from '@/components/ui/input';
import { Plus, Minus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Label } from '@/components/ui/label';
import { type ProductConfig, type StockData } from '@/components/product-variation-manager';
import { ScrollArea } from '@/components/ui/scroll-area';


const ProductDialogContent = ({ product, businessName, business, canAcceptPayments }: { product: any, businessName: string, business: Business | undefined, canAcceptPayments: boolean }) => {
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
  stripeAccountId?: string;
};

function StorefrontPageContent() {
    const params = useParams();
    const { businessId } = params;
    const db = useFirestore();
    const { addItem } = useCart();
    const { toast } = useToast();
    const searchParams = useSearchParams();

    const [dialogOpenFor, setDialogOpenFor] = React.useState<string | null>(null);

    const businessRef = useMemoFirebase(() => {
        if (!businessId || !db) return null;
        return doc(db, 'businesses', businessId as string);
    }, [businessId, db]);

    const productsQuery = useMemoFirebase(() => {
        if (!businessId || !db) return null;
        return query(collection(db, `businesses/${businessId}/products`));
    }, [businessId, db]);

    const { data: business, isLoading: businessLoading } = useDoc<Business>(businessRef);
    const { data: products, isLoading: productsLoading } = useCollection(productsQuery);

    React.useEffect(() => {
        const productIdFromQuery = searchParams.get('productId');
        if (productIdFromQuery && products) {
            const productExists = products.some(p => p.id === productIdFromQuery);
            if (productExists) {
                setDialogOpenFor(productIdFromQuery);
            }
        }
    }, [searchParams, products]);

    const isLoading = businessLoading || productsLoading;
    const canAcceptPayments = !!business?.stripeAccountId;
    
    const handleAddToCart = (product: any) => {
        const productToAdd = {
            ...product,
            image: product.images?.[0]?.url,
            store: business?.businessName || 'Local Store'
        };
        addItem(productToAdd);
        toast({
            title: "Added to Basket",
            description: `${product.name} has been added to your basket.`
        });
    };

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
    
    const getDisplayPrice = (product: any) => {
        if (business?.storeSettings?.catalogueMode && !business.storeSettings.showPricesInCatalogue) {
            return <span className="text-sm font-semibold text-muted-foreground">Price in-store</span>;
        }
        if (product.onSale) {
            if (product.discountType === 'percentage' && product.discountValue) {
                const salePrice = product.price * (1 - product.discountValue / 100);
                return (
                    <div className="flex items-baseline gap-1">
                        <span className="text-destructive font-bold">£{salePrice.toFixed(2)}</span>
                        <span className="text-xs text-muted-foreground line-through">£{product.price.toFixed(2)}</span>
                    </div>
                );
            }
            if (product.discountType === 'amount' && product.salePrice) {
                return (
                    <div className="flex items-baseline gap-1">
                        <span className="text-destructive font-bold">£{product.salePrice.toFixed(2)}</span>
                        <span className="text-xs text-muted-foreground line-through">£{product.price.toFixed(2)}</span>
                    </div>
                );
            }
        }
        return `£${product.price.toFixed(2)}`;
    };

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
                <div className="relative h-48 md:h-64 w-full bg-muted">
                    {(business as any).bannerImage && (
                        <Image src={(business as any).bannerImage} alt={`${business.businessName} banner`} fill className="object-cover" />
                    )}
                </div>
                <div className="relative p-6 pt-0 -mt-16 z-10">
                    <div className="flex items-end gap-4">
                        <div className="relative w-32 h-32 rounded-lg border-4 border-background overflow-hidden bg-card shadow-lg">
                             {(business as any).logoImage && (
                                <Image src={(business as any).logoImage} alt={`${business.businessName} logo`} fill className="object-contain p-2" />
                            )}
                        </div>
                        <div>
                             <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-foreground font-headline">
                                {business.businessName}
                            </h1>
                             <p className="text-muted-foreground text-lg">{(business as any).shortDescription}</p>
                        </div>
                    </div>
                </div>
             </Card>

            {(!canAcceptPayments || business.storeSettings?.catalogueMode || business.storeSettings?.storeAvailability === 'instore_only') && (
                 <Alert variant={!canAcceptPayments ? "destructive" : "default"}>
                    <Info className="h-4 w-4" />
                    <AlertTitle>
                        {!canAcceptPayments ? 'Store Currently Unavailable' : 'Store Information'}
                    </AlertTitle>
                    <AlertDescription>
                        {!canAcceptPayments 
                            ? 'This business has not completed their payment setup and cannot accept online orders at this time. Please check back later.'
                            : 'This store is in catalogue mode or is in-store only. Items are for viewing only and cannot be purchased online.'
                        }
                    </AlertDescription>
                </Alert>
            )}

             <Card>
                <CardHeader>
                    <CardTitle>Products</CardTitle>
                </CardHeader>
                <CardContent>
                    {products && products.length > 0 ? (
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                            {products.map(product => (
                                 <Dialog key={product.id} open={dialogOpenFor === product.id} onOpenChange={(isOpen) => setDialogOpenFor(isOpen ? product.id : null)}>
                                     <DialogTrigger asChild>
                                        <Card className="overflow-hidden group flex flex-col cursor-pointer">
                                            <CardHeader className="p-0 relative">
                                                <div className="aspect-square w-full">
                                                    {product.images && product.images.length > 0 ? (
                                                        <Image src={product.images[0].url} alt={product.name} fill className="object-cover transition-transform duration-300 group-hover:scale-105" />
                                                    ) : (
                                                        <div className="bg-muted w-full h-full"></div>
                                                    )}
                                                    {product.onSale && (
                                                        <Badge variant="destructive" className="absolute top-2 left-2">SALE</Badge>
                                                    )}
                                                </div>
                                            </CardHeader>
                                            <CardContent className="p-4 flex-grow">
                                                <h3 className="font-semibold text-base truncate">{product.name}</h3>
                                                <div className="text-lg font-bold">{getDisplayPrice(product)}</div>
                                            </CardContent>
                                            <CardFooter className="p-4 pt-0 mt-auto">
                                                {(business.storeSettings?.catalogueMode || business.storeSettings?.storeAvailability === 'instore_only' || !canAcceptPayments) ? (
                                                    <div className="text-xs text-center text-muted-foreground w-full">View details to see more.</div>
                                                ) : (
                                                    <>
                                                        {!product.hasVariations ? (
                                                            <Button size="sm" className="w-full" onClick={(e) => { e.stopPropagation(); handleAddToCart(product); }} disabled={product.stock === 0}>
                                                                {product.stock > 0 ? <><ShoppingCart className="mr-2 h-4 w-4" /> Add to Basket</> : 'Out of Stock'}
                                                            </Button>
                                                        ) : (
                                                            <Button size="sm" variant="outline" className="w-full text-xs">Select Options</Button>
                                                        )}
                                                    </>
                                                )}
                                            </CardFooter>
                                        </Card>
                                    </DialogTrigger>
                                     <ProductDialogContent product={{...product, storeSettings: business.storeSettings}} businessName={business.businessName} business={business} canAcceptPayments={canAcceptPayments} />
                                </Dialog>
                            ))}
                        </div>
                    ) : (
                        <p className="text-muted-foreground text-center py-10">This business has not added any products yet.</p>
                    )}
                </CardContent>
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
