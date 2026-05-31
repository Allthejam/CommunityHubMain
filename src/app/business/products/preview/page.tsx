
"use client";

import * as React from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Loader2, Minus, Plus, ShoppingCart } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { useCart } from "@/contexts/cart-context";
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ui/carousel";
import { AspectRatio } from "@/components/ui/aspect-ratio";
import { Input } from "@/components/ui/input";

type ProductPreview = {
  id: string;
  name: string;
  price: number;
  description: string;
  images: string[];
  stock: number;
  onSale?: boolean;
  salePrice?: number;
  discountType?: 'amount' | 'percentage';
  discountValue?: number;
  showOriginalPrice?: boolean;
};

const PreviewPageContent = () => {
    const router = useRouter();
    const { toast } = useToast();
    const [product, setProduct] = React.useState<ProductPreview | null>(null);
    const [loading, setLoading] = React.useState(true);
    const { addItem } = useCart();
    const [quantity, setQuantity] = React.useState(1);

    React.useEffect(() => {
        try {
            const storedProduct = sessionStorage.getItem('productPreviewData');
            if (storedProduct) {
                setProduct(JSON.parse(storedProduct));
            }
        } catch (error) {
            console.error("Failed to parse product data from sessionStorage", error);
            toast({
                title: "Could Not Load Preview",
                description: "There was an error reading the preview data.",
                variant: "destructive"
            });
        } finally {
            setLoading(false);
        }
    }, [toast]);
    
    const handleAddToCart = () => {
        if (!product) return;
        const productToAdd = {
            ...product,
            image: product.images?.[0] || '',
            store: 'Your Store', // This could be dynamic in a real app
        };
        addItem(productToAdd, quantity);
        toast({
            title: "Added to Basket",
            description: `${quantity} x ${product.name} has been added.`
        });
    };
    
    const getDisplayPrice = (product: ProductPreview) => {
        let finalPrice = product.price;
        if (product.onSale) {
            if (product.discountType === 'percentage' && product.discountValue) {
                finalPrice = product.price * (1 - product.discountValue / 100);
            } else if (product.discountType === 'amount' && product.salePrice) {
                finalPrice = product.salePrice;
            }
        }

        return (
            <div className="flex items-baseline gap-2">
                <span className={`text-3xl font-bold ${product.onSale ? 'text-destructive' : ''}`}>
                    £{finalPrice.toFixed(2)}
                </span>
                {product.onSale && product.showOriginalPrice && (
                    <span className="text-lg text-muted-foreground line-through">
                        £{product.price.toFixed(2)}
                    </span>
                )}
            </div>
        );
    };

    if (loading) {
        return (
            <div className="flex justify-center items-center h-96">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        );
    }
    
    if (!product) {
        return (
             <div className="text-center">
                <h1 className="text-2xl font-bold">No Preview Data Found</h1>
                <p className="text-muted-foreground">Please go back and click "Preview" again.</p>
                <Button asChild variant="link" className="mt-4">
                    <Link href="/business/products">
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Back to Products
                    </Link>
                </Button>
            </div>
        )
    }

    return (
        <div className="max-w-4xl mx-auto">
             <Button asChild variant="ghost" className="mb-4">
                <Link href="/business/products">
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Back to Product List
                </Link>
            </Button>
            <Card className="overflow-hidden">
                <div className="grid md:grid-cols-2">
                     <div className="p-4">
                        <Carousel className="w-full">
                          <CarouselContent>
                            {product.images && product.images.length > 0 ? (
                              product.images.map((image, index) => (
                                <CarouselItem key={index}>
                                  <AspectRatio ratio={1 / 1}>
                                    <Image
                                      src={image}
                                      alt={`${product.name} image ${index + 1}`}
                                      fill
                                      className="object-cover rounded-md"
                                    />
                                  </AspectRatio>
                                </CarouselItem>
                              ))
                            ) : (
                              <CarouselItem>
                                <AspectRatio ratio={1 / 1}>
                                  <div className="bg-muted h-full w-full flex items-center justify-center rounded-md">
                                    <span className="text-muted-foreground">No Image</span>
                                  </div>
                                </AspectRatio>
                              </CarouselItem>
                            )}
                          </CarouselContent>
                          {product.images && product.images.length > 1 && (
                            <>
                              <CarouselPrevious className="left-2" />
                              <CarouselNext className="right-2" />
                            </>
                          )}
                        </Carousel>
                      </div>
                    <div className="p-6 flex flex-col">
                        <h1 className="text-3xl font-bold font-headline mb-2">{product.name}</h1>
                        <div className="mb-4">
                            {product.onSale && <Badge variant="destructive">SALE</Badge>}
                        </div>
                        {getDisplayPrice(product)}
                        <div 
                          className="prose dark:prose-invert max-w-none text-sm text-muted-foreground mt-4 flex-grow"
                          dangerouslySetInnerHTML={{ __html: product.description || ""}}
                        />
                        
                        <Separator className="my-6" />

                        <div className="flex flex-col sm:flex-row items-center gap-4">
                             <div className="flex items-center gap-2">
                                <Button variant="outline" size="icon" onClick={() => setQuantity(q => Math.max(1, q - 1))}><Minus className="h-4 w-4"/></Button>
                                <Input type="number" value={quantity} readOnly className="w-16 text-center" />
                                <Button variant="outline" size="icon" onClick={() => setQuantity(q => q + 1)}><Plus className="h-4 w-4"/></Button>
                            </div>
                            <Button size="lg" className="w-full sm:w-auto" onClick={handleAddToCart} disabled={product.stock === 0}>
                                <ShoppingCart className="mr-2 h-5 w-5" />
                                {product.stock > 0 ? 'Add to Basket' : 'Out of Stock'}
                            </Button>
                        </div>
                    </div>
                </div>
            </Card>
        </div>
    )
}

export default function ProductPreviewPage() {
    return (
        <React.Suspense fallback={<div className="flex justify-center items-center h-screen"><Loader2 className="h-8 w-8 animate-spin" /></div>}>
            <PreviewPageContent />
        </React.Suspense>
    );
}
