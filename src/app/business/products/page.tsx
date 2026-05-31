
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
  Save,
  ArrowUp,
  ArrowDown,
  Info,
  ShieldAlert,
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
  DropdownMenuLabel,
} from '@/components/ui/dropdown-menu';
import Image from 'next/image';
import { useToast } from '@/hooks/use-toast';
import { deleteProductAction, updateProductStockAction, bulkUpdateProductStockAction } from '@/lib/actions/productActions';
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
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuLabel,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from '@/components/ui/context-menu';
import { Separator } from '@/components/ui/separator';
import { AspectRatio } from '@/components/ui/aspect-ratio';
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from '@/components/ui/carousel';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useCart } from '@/contexts/cart-context';
import { type ProductConfig, type StockData } from '@/components/product-variation-manager';
import { ProductDialogContent } from '@/components/product-dialog-content';
import { cn } from '@/lib/utils';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';


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
  status: string;
  storefrontSubscription?: boolean;
  sellsRestrictedProducts?: boolean;
};

const ProductRow = ({ 
    product, 
    selectedBusinessId, 
    businesses, 
    pendingValue, 
    onPendingChange 
}: { 
    product: Product; 
    selectedBusinessId: string, 
    businesses: Business[],
    pendingValue?: number,
    onPendingChange: (id: string, newVal: number) => void;
}) => {
    const router = useRouter();
    const { toast } = useToast();
    const db = useFirestore();
    const business = businesses.find(b => b.id === selectedBusinessId);
    const businessName = business?.businessName || '';
    const canAcceptPayments = !!business?.stripeAccountId;

    const variationDocRef = useMemoFirebase(() => {
        if (!product.hasVariations || !db) return null;
        return doc(db, `businesses/${product.businessId}/products/${product.id}/product_data/variations`);
    }, [db, product.hasVariations, product.businessId, product.id]);

    const { data: variationData, isLoading: variationsLoading } = useDoc(variationDocRef);
    
    const displayStock = pendingValue !== undefined ? pendingValue : product.stock;

    const totalStockFromDb = React.useMemo(() => {
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
            return displayStock > 0 && displayStock < 5;
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
    }, [product, variationData, displayStock]);
    
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
        <Dialog>
            <ContextMenu>
                <ContextMenuTrigger asChild>
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
                            <div className="flex items-center gap-3">
                                {!product.hasVariations ? (
                                    <div className="flex items-center gap-1">
                                        <div className={cn(
                                            "w-12 h-10 flex items-center justify-center rounded-md border text-sm font-bold bg-background",
                                            pendingValue !== undefined && "border-primary text-primary bg-primary/5"
                                        )}>
                                            {displayStock}
                                        </div>
                                        <div className="flex flex-col">
                                            <Button 
                                                variant="ghost" 
                                                size="icon" 
                                                className="h-5 w-5 rounded-sm hover:bg-primary/10 hover:text-primary"
                                                onClick={() => onPendingChange(product.id, displayStock + 1)}
                                            >
                                                <ArrowUp className="h-3.5 w-3.5" />
                                            </Button>
                                            <Button 
                                                variant="ghost" 
                                                size="icon" 
                                                className="h-5 w-5 rounded-sm hover:bg-primary/10 hover:text-primary"
                                                onClick={() => onPendingChange(product.id, Math.max(0, displayStock - 1))}
                                            >
                                                <ArrowDown className="h-3.5 w-3.5" />
                                            </Button>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="text-sm">
                                        {variationsLoading ? <Loader2 className="h-4 w-4 animate-spin"/> : <span className="font-semibold">{totalStockFromDb}</span>}
                                        <span className="text-[10px] text-muted-foreground block uppercase font-bold tracking-tighter">Varied</span>
                                    </div>
                                )}
                                
                                {isLowStock && !variationsLoading && (
                                    <TooltipProvider>
                                        <Tooltip>
                                            <TooltipTrigger>
                                                <AlertTriangle className="h-4 w-4 text-amber-500"/>
                                            </TooltipTrigger>
                                            <TooltipContent>
                                                <p>Stock is low.</p>
                                            </TooltipContent>
                                        </Tooltip>
                                    </TooltipProvider>
                                )}
                            </div>
                        </TableCell>
                        <TableCell className="text-right">
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
                        </TableCell>
                    </TableRow>
                </ContextMenuTrigger>
                <ContextMenuContent>
                    <ContextMenuLabel>Actions for {product.name}</ContextMenuLabel>
                    <ContextMenuItem onSelect={handleEdit}><FileEdit className="mr-2 h-4 w-4"/>Edit</ContextMenuItem>
                    <DialogTrigger asChild>
                        <ContextMenuItem onSelect={(e) => e.preventDefault()}><Eye className="mr-2 h-4 w-4"/>Preview</ContextMenuItem>
                    </DialogTrigger>
                    <ContextMenuSeparator />
                    <ContextMenuItem className="text-destructive" onSelect={handleDelete}><Trash2 className="mr-2 h-4 w-4"/>Delete</ContextMenuItem>
                </ContextMenuContent>
            </ContextMenu>
             <ProductDialogContent product={product} businessName={businessName} business={business} canAcceptPayments={canAcceptPayments} />
        </Dialog>
    );
};


export default function AllProductsPage() {
  const { user, isUserLoading } = useUser();
  const db = useFirestore();
  const router = useRouter();
  const { toast } = useToast();

  const [selectedBusinessId, setSelectedBusinessId] = React.useState<string | null>(null);
  const [pendingStockChanges, setPendingStockChanges] = React.useState<Record<string, number>>({});
  const [isBulkSaving, setIsBulkSaving] = React.useState(false);

  const ownedBusinessesQuery = useMemoFirebase(() => {
    if (!user) return null;
    return query(
      collection(db, 'businesses'),
      where('ownerId', '==', user.uid)
    );
  }, [user, db]);
  const { data: ownedBusinesses, isLoading: loadingOwned } = useCollection<Business>(ownedBusinessesQuery);

  const teamBusinessesQuery = useMemoFirebase(() => {
    if (!user) return null;
    return query(
      collection(db, 'businesses'),
      where('teamMemberIds', 'array-contains', user.uid)
    );
  }, [user, db]);
  const { data: teamBusinesses, isLoading: loadingTeam } = useCollection<Business>(teamBusinessesQuery);
  
  const businesses = React.useMemo(() => {
    const all = new Map<string, Business>();
    const source = [...(ownedBusinesses || []), ...(teamBusinesses || [])];
    source.forEach(b => {
        if (b.storefrontSubscription === true) {
            all.set(b.id, b);
        }
    });
    return Array.from(all.values());
  }, [ownedBusinesses, teamBusinesses]);

  const businessesLoading = loadingOwned || loadingTeam;
  
  const selectedBusiness = businesses?.find(b => b.id === selectedBusinessId);
  const canAcceptPayments = !!selectedBusiness?.stripeAccountId;

  const productsQuery = useMemoFirebase(() => {
    if (!selectedBusinessId) return null;
    return query(collection(db, `businesses/${selectedBusinessId}/products`));
  }, [selectedBusinessId, db]);
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

  const handlePendingStockChange = (id: string, newVal: number) => {
    setPendingStockChanges(prev => ({
        ...prev,
        [id]: newVal
    }));
  };

  const handleBulkSave = async () => {
    if (!selectedBusinessId || Object.keys(pendingStockChanges).length === 0) return;

    setIsBulkSaving(true);
    const updates = Object.entries(pendingStockChanges).map(([productId, newStock]) => ({
        productId,
        newStock
    }));

    const result = await bulkUpdateProductStockAction({
        businessId: selectedBusinessId,
        updates
    });

    if (result.success) {
        toast({ title: 'Stock Updated', description: 'All changes have been saved successfully.' });
        setPendingStockChanges({});
    } else {
        toast({ title: 'Update Failed', description: result.error, variant: 'destructive' });
    }
    setIsBulkSaving(false);
  };
  
  const loading = isUserLoading || businessesLoading || productsLoading;
  const hasPendingChanges = Object.keys(pendingStockChanges).length > 0;

  return (
    <>
      <div className="space-y-8">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
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
                <p className="text-muted-foreground">Manage your product inventory. Use the arrows for quick stock adjustments.</p>
            </div>
             {hasPendingChanges && (
                <Button onClick={handleBulkSave} disabled={isBulkSaving} className="shadow-lg animate-in fade-in slide-in-from-top-2 duration-300">
                    {isBulkSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Save className="mr-2 h-4 w-4" />}
                    Save All Changes ({Object.keys(pendingStockChanges).length})
                </Button>
            )}
        </div>

        {selectedBusiness?.sellsRestrictedProducts && (
            <Alert variant="destructive" className="bg-red-50 border-red-200 text-red-900 dark:bg-red-900/20 dark:border-red-800 dark:text-red-200">
                <ShieldAlert className="h-5 w-5 text-red-600" />
                <AlertTitle className="font-bold">Restricted Products Compliance</AlertTitle>
                <AlertDescription className="text-sm font-medium">
                    This business is marked as selling restricted products (Alcohol/Tobacco). You are strictly prohibited from selling these items to anyone under the age of 21 on this platform. Ensure all point-of-sale age verification procedures are followed correctly.
                </AlertDescription>
            </Alert>
        )}

        <Card>
            <CardHeader>
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div>
                        <CardTitle>Inventory List</CardTitle>
                        <CardDescription>View and manage all items for your selected storefront.</CardDescription>
                    </div>
                    <div className="flex w-full sm:w-auto gap-4">
                        <Select
                            value={selectedBusinessId || ''}
                            onValueChange={(val) => {
                                if (hasPendingChanges && !window.confirm('You have unsaved stock changes. Are you sure you want to switch stores and discard them?')) return;
                                setSelectedBusinessId(val);
                                setPendingStockChanges({});
                            }}
                            disabled={!businesses || businesses.length === 0}
                        >
                            <SelectTrigger className="w-full sm:w-[250px]">
                            <SelectValue placeholder="Select a Storefront..." />
                            </SelectTrigger>
                            <SelectContent>
                            {businesses?.map(biz => (
                                <SelectItem key={biz.id} value={biz.id}>{biz.businessName}</SelectItem>
                            ))}
                            </SelectContent>
                        </Select>
                        <Button onClick={handleCreate} disabled={!selectedBusinessId}>
                            <PlusCircle className="mr-2 h-4 w-4" />
                            Add Product
                        </Button>
                    </div>
                </div>
            </CardHeader>
            <CardContent>
                {!canAcceptPayments && selectedBusinessId && (
                     <Alert className="mb-6 bg-amber-50 border-amber-200">
                        <Info className="h-4 w-4 text-amber-600" />
                        <AlertTitle className="text-amber-800 font-bold">Catalogue Mode active</AlertTitle>
                        <AlertDescription className="text-amber-700">
                            Your store is currently limited to catalogue-only viewing. To enable the shopping cart and start accepting online orders, please connect your Stripe account on the Storefront page.
                        </AlertDescription>
                    </Alert>
                )}
                <div className="rounded-md border">
                    <Table>
                        <TableHeader>
                        <TableRow>
                            <TableHead className="w-[80px]">Image</TableHead>
                            <TableHead>Product Name</TableHead>
                            <TableHead>Price</TableHead>
                            <TableHead>Current Stock</TableHead>
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
                                <ProductRow 
                                    key={product.id} 
                                    product={product} 
                                    selectedBusinessId={selectedBusinessId!} 
                                    businesses={businesses || []} 
                                    pendingValue={pendingStockChanges[product.id]}
                                    onPendingChange={handlePendingStockChange}
                                />
                            ))
                        ) : (
                            <TableRow>
                            <TableCell colSpan={5} className="h-24 text-center">
                                {selectedBusinessId ? "No products found for this storefront." : "Please select a subscribed storefront."}
                            </TableCell>
                            </TableRow>
                        )}
                        </TableBody>
                    </Table>
                </div>
            </CardContent>
            {hasPendingChanges && (
                <CardFooter className="justify-center border-t bg-muted/5 p-6">
                    <Button onClick={handleBulkSave} disabled={isBulkSaving} size="lg" className="px-8 shadow-xl">
                        {isBulkSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Save className="mr-2 h-4 w-4" />}
                        Save All Inventory Changes
                    </Button>
                </CardFooter>
            )}
        </Card>
      </div>
    </>
  );
}
