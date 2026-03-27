'use client';

import * as React from 'react';
import {
  Package,
  PlusCircle,
  MoreHorizontal,
  Loader2,
  FileEdit,
  Trash2,
  ArrowLeft,
  Eye,
  CheckCircle,
  XCircle,
  AlertTriangle,
  ShoppingCart,
  Store,
  Minus,
  Plus,
} from 'lucide-react';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useUser, useFirestore, useCollection, useMemoFirebase, useDoc } from '@/firebase';
import { collection, query, where, doc } from 'firebase/firestore';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import Image from 'next/image';
import { useToast } from '@/hooks/use-toast';
import { deleteProductAction, updateProductStockAction } from '@/lib/actions/productActions';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import { AspectRatio } from '@/components/ui/aspect-ratio';
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from '@/components/ui/carousel';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useCart } from '@/contexts/cart-context';
import { type ProductConfig, type StockData } from '@/components/product-variation-manager';


type ProductImage = {
    url: string;
    description?: string;
};

type Product = {
  id: string;
  name: string;
  price: number;
  stock: number;
  images: ProductImage[];
  businessId: string;
  onSale?: boolean;
  salePrice?: number;
  discountType?: 'amount' | 'percentage';
  discountValue?: number;
  hasVariations?: boolean;
};

type Business = {
  id: string;
  businessName: string;
  storeSettings?: any;
  stripeAccountId?: string;
};

const ProductPreviewDialog = ({ product, businessName, business }: { product: Product, businessName: string, business: Business | undefined }) => {
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

    const getDisplayPrice = (p: Product) => {
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
                        {(p as any).showOriginalPrice && (
                            <span className="text-lg text-muted-foreground line-through">£{p.price.toFixed(2)}</span>
                        )}
                    </div>
                );
            }
        }
        return <span className="text-3xl font-bold">£{p.price.toFixed(2)}</span>;
    };

    return (
        <DialogContent className="sm:max-w-4xl grid grid-cols-1 md:grid-cols-2 gap-8 p-0">
             <div className="p-4">
                <Carousel className="w-full">
                    <CarouselContent>
                    {product.images && product.images.length > 0 ? (
                        product.images.map((image, index) => (
                        <CarouselItem key={index}>
                            <AspectRatio ratio={1 / 1}>
                            <Image
                                src={image.url}
                                alt={image.description || `${product.name} image ${index + 1}`}
                                fill
                                className="object-cover rounded-md"
                            />
                            </AspectRatio>
                            {image.description && (
                                <p className="text-xs text-center text-muted-foreground mt-2">{image.description}</p>
                            )}
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
                        dangerouslySetInnerHTML={{ __html: (product as any).description || ""}}
                    />
                </div>
                 <DialogFooter className="flex-col sm:flex-row sm:items-center gap-4 border-t pt-6">
                    {business?.storeSettings?.catalogueMode || business?.storeSettings?.storeAvailability === 'instore_only' ? (
                        <p className="text-sm font-semibold text-center w-full">This item is available in-store only.</p>
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


const ProductRow = ({ product, selectedBusinessId, businesses }: { product: Product; selectedBusinessId: string, businesses: Business[] }) => {
    const router = useRouter();
    const { toast } = useToast();
    const db = useFirestore();
    const business = businesses.find(b => b.id === selectedBusinessId);
    const businessName = business?.businessName || '';

    const variationDocRef = useMemoFirebase(() => {
        if (!product.hasVariations || !db) return null;
        return doc(db, `businesses/${product.businessId}/products/${product.id}/product_data/variations`);
    }, [db, product.hasVariations, product.businessId, product.id]);

    const { data: variationData, isLoading: variationsLoading } = useDoc(variationDocRef);
    
    const totalStock = React.useMemo(() => {
        if (!product.hasVariations) {
            return product.stock;
        }
        if (!variationData?.stock) {
            return 0;
        }
        return Object.values(variationData.stock).reduce((acc: number, category: any) => {
            const categoryTotal = Object.values(category as object).reduce((catAcc: number, size: any) => {
                const sizeTotal = Object.values(size).reduce((sAcc: number, qty: any) => sAcc + qty, 0);
                return catAcc + sizeTotal;
            }, 0);
            return acc + categoryTotal;
        }, 0);
    }, [product, variationData]);
    
    const isLowStock = React.useMemo(() => {
        if (!product.hasVariations) {
            return product.stock > 0 && product.stock < 5;
        }
        if (!variationData?.stock) {
            return false;
        }
        for (const category of Object.values(variationData.stock)) {
            for (const size of Object.values(category as object)) {
                for (const qty of Object.values(size)) {
                    if (qty > 0 && qty < 5) return true;
                }
            }
        }
        return false;
    }, [product, variationData]);
    
    const handleEdit = () => {
        router.push(`/business/products/edit/${product.id}?businessId=${selectedBusinessId}`);
    };

    const handleDelete = async () => {
        if (!window.confirm('Are you sure you want to delete this product?')) return;
        const result = await deleteProductAction({ businessId: selectedBusinessId, productId: product.id });
        if (result.success) {
        toast({ title: 'Product Deleted' });
        } else {
        toast({ title: 'Error', description: result.error, variant: 'destructive' });
        }
    };
    
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
      <TableRow key={product.id}>
        <TableCell>
          <div className="relative h-12 w-12 rounded-md overflow-hidden bg-muted">
            {product.images && product.images.length > 0 && product.images[0].url ? (
              <Image src={product.images[0].url} alt={product.name} fill className="object-cover" />
            ) : (
              <div className="h-full w-full bg-secondary" />
            )}
          </div>
        </TableCell>
        <TableCell className="font-medium">{product.name}</TableCell>
        <TableCell>{getDisplayPrice(product)}</TableCell>
        <TableCell>
            <div className="flex items-center gap-2">
                {variationsLoading ? <Loader2 className="h-4 w-4 animate-spin"/> : totalStock}
                {isLowStock && !variationsLoading && (
                    <TooltipProvider>
                        <Tooltip>
                            <TooltipTrigger>
                                <AlertTriangle className="h-4 w-4 text-amber-500"/>
                            </TooltipTrigger>
                            <TooltipContent>
                                <p>One or more variations are low on stock.</p>
                            </TooltipContent>
                        </Tooltip>
                    </TooltipProvider>
                )}
            </div>
        </TableCell>
        <TableCell className="text-right">
            <Dialog>
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon"><MoreHorizontal /></Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent>
                    <DropdownMenuItem onClick={handleEdit}><FileEdit className="mr-2 h-4 w-4"/>Edit</DropdownMenuItem>
                     <DialogTrigger asChild>
                        <DropdownMenuItem><Eye className="mr-2 h-4 w-4"/>Preview</DropdownMenuItem>
                    </DialogTrigger>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={handleDelete} className="text-destructive focus:text-destructive"><Trash2 className="mr-2 h-4 w-4"/>Delete</DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
                 <ProductPreviewDialog product={product} businessName={businessName} business={business} />
            </Dialog>
        </TableCell>
      </TableRow>
    );
};


export default function AllProductsPage() {
  const { user, isUserLoading } = useUser();
  const db = useFirestore();
  const router = useRouter();

  const [selectedBusinessId, setSelectedBusinessId] = React.useState<string | null>(null);

  const businessesQuery = useMemoFirebase(() => {
    if (!user) return null;
    return query(collection(db, 'businesses'), where('ownerId', '==', user.uid));
  }, [user, db]);
  const { data: businesses, isLoading: businessesLoading } = useCollection<Business>(businessesQuery);
  
  const selectedBusiness = businesses?.find(b => b.id === selectedBusinessId);
  const canAcceptPayments = !!selectedBusiness?.stripeAccountId;

  const productsQuery = useMemoFirebase(() => {
    if (!selectedBusinessId) return null;
    return query(collection(db, `businesses/${selectedBusinessId}/products`));
  }, [selectedBusinessId]);
  const { data: products, isLoading: productsLoading } = useCollection<Product>(productsQuery);

  React.useEffect(() => {
    if (businesses && businesses.length > 0 && !selectedBusinessId) {
      setSelectedBusinessId(businesses[0].id);
    }
  }, [businesses, selectedBusinessId]);

  const handleCreate = () => {
    if (selectedBusinessId) {
        router.push(`/business/products/create?businessId=${selectedBusinessId}`);
    }
  };
  
  const loading = isUserLoading || businessesLoading || productsLoading;

  return (
    <>
      <div className="space-y-8">
        <div>
            <Button asChild variant="ghost" className="mb-4">
                <Link href="/business/storefront">
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Back to Storefront
                </Link>
            </Button>
            <h1 className="text-3xl font-bold tracking-tight font-headline flex items-center gap-2">
                <Package className="h-8 w-8 text-primary" />
                My Products
            </h1>
            <p className="text-muted-foreground">Manage your entire product inventory for your businesses.</p>
        </div>

        <Card>
            <CardHeader>
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div>
                        <CardTitle>All Products</CardTitle>
                        <CardDescription>View, add, edit, or delete any product from your inventory.</CardDescription>
                    </div>
                    <div className="flex w-full sm:w-auto gap-4">
                        <Select
                            value={selectedBusinessId || ''}
                            onValueChange={setSelectedBusinessId}
                            disabled={!businesses || businesses.length === 0}
                        >
                            <SelectTrigger className="w-full sm:w-[250px]">
                            <SelectValue placeholder="Select a Business..." />
                            </SelectTrigger>
                            <SelectContent>
                            {businesses?.map(biz => (
                                <SelectItem key={biz.id} value={biz.id}>{biz.businessName}</SelectItem>
                            ))}
                            </SelectContent>
                        </Select>
                        <Button onClick={handleCreate} disabled={!selectedBusinessId || !canAcceptPayments}>
                            <PlusCircle className="mr-2 h-4 w-4" />
                            Add Product
                        </Button>
                    </div>
                </div>
            </CardHeader>
            <CardContent>
                {!canAcceptPayments && selectedBusinessId && (
                     <div className="text-center p-8 border-2 border-dashed rounded-lg mb-6">
                        <p className="font-semibold text-destructive">Payment Account Not Connected</p>
                        <p className="text-muted-foreground text-sm">Please connect a Stripe account on the Storefront page to add new products.</p>
                    </div>
                )}
                <div className="rounded-md border">
                    <Table>
                        <TableHeader>
                        <TableRow>
                            <TableHead className="w-[80px]">Image</TableHead>
                            <TableHead>Product Name</TableHead>
                            <TableHead>Price</TableHead>
                            <TableHead>Stock</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                        </TableHeader>
                        <TableBody>
                        {loading ? (
                            <TableRow>
                            <TableCell colSpan={5} className="h-24 text-center">
                                <Loader2 className="mx-auto h-6 w-6 animate-spin" />
                            </TableCell>
                            </TableRow>
                        ) : products && products.length > 0 ? (
                            products.map((product) => (
                                <ProductRow key={product.id} product={product} selectedBusinessId={selectedBusinessId!} businesses={businesses || []} />
                            ))
                        ) : (
                            <TableRow>
                            <TableCell colSpan={5} className="h-24 text-center">
                                {selectedBusinessId ? "No products found for this business." : "Please select a business."}
                            </TableCell>
                            </TableRow>
                        )}
                        </TableBody>
                    </Table>
                </div>
            </CardContent>
        </Card>
      </div>
    </>
  );
}
