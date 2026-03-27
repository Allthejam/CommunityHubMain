

'use client';

import * as React from 'react';
import {
  Store,
  ShoppingCart,
  Package,
  PlusCircle,
  MoreHorizontal,
  Loader2,
  FileEdit,
  Trash2,
  Clock,
  Save,
  Truck,
  Eye,
  EyeOff,
  DollarSign,
  Landmark,
  ArrowRight,
  ArrowLeft,
  BadgeCheck,
  AlertCircle,
  Youtube,
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
import { collection, query, where, doc, orderBy, limit } from 'firebase/firestore';
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
import { deleteProductAction, saveOpeningHoursAction, saveStoreSettingsAction } from '@/lib/actions/productActions';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Switch } from '@/components/ui/switch';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { CurrencyConverter } from '@/components/currency-converter';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { ProductForm } from '@/components/product-form';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { createStripeDashboardLinkForBusiness, createStripeConnectAccountLinkForBusiness, createCheckoutSession } from '@/lib/actions/stripeActions';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Separator } from '../ui/separator';
import { AspectRatio } from '../ui/aspect-ratio';
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from '../ui/carousel';
import { ScrollArea } from '../ui/scroll-area';
import { type ProductConfig, type StockData } from '../product-variation-manager';
import { Plus, Minus } from 'lucide-react';

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
  openingHours?: OpeningHours;
  storeSettings?: StoreSettings;
  stripeAccountId?: string;
};

type StoreSettings = {
    deliveryAvailable: boolean;
    deliveryType?: 'free' | 'flat_rate';
    deliveryPrice?: number;
    catalogueMode: boolean;
    showPricesInCatalogue: boolean;
    storeAvailability: 'instore_online' | 'instore_only' | 'online_only';
};

type DayHours = {
    morningOpen: string;
    morningClose: string;
    afternoonOpen: string;
    afternoonClose: string;
    closed: boolean;
};

type OpeningHours = {
    monday: DayHours;
    tuesday: DayHours;
    wednesday: DayHours;
    thursday: DayHours;
    friday: DayHours;
    saturday: DayHours;
    sunday: DayHours;
};

type Order = {
    id: string;
    customerName?: string;
    shippingAddress: string;
    createdAt: { toDate: () => Date };
    totalAmount: number;
    status: 'Received' | 'Awaiting Payment' | 'Packed' | 'Shipped' | 'Ready for Collection' | 'Delivered/Collected' | 'Refunded' | 'Return to Stock';
};


const initialDayState: DayHours = { morningOpen: '', morningClose: '', afternoonOpen: '', afternoonClose: '', closed: false };
const initialHoursState: OpeningHours = {
    monday: { ...initialDayState },
    tuesday: { ...initialDayState },
    wednesday: { ...initialDayState },
    thursday: { ...initialDayState },
    friday: { ...initialDayState },
    saturday: { ...initialDayState },
    sunday: { ...initialDayState },
};

function OpeningTimesCard({ business, onSave, isSaving }: { business: Business | undefined, onSave: (hours: OpeningHours) => void, isSaving: boolean }) {
    const [hours, setHours] = React.useState<OpeningHours>(initialHoursState);
    const daysOfWeek: (keyof OpeningHours)[] = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

    React.useEffect(() => {
        if (business?.openingHours) {
            // Ensure all days are present, falling back to initial state if not
            const completeHours: OpeningHours = {
                monday: business.openingHours.monday || initialDayState,
                tuesday: business.openingHours.tuesday || initialDayState,
                wednesday: business.openingHours.wednesday || initialDayState,
                thursday: business.openingHours.thursday || initialDayState,
                friday: business.openingHours.friday || initialDayState,
                saturday: business.openingHours.saturday || initialDayState,
                sunday: business.openingHours.sunday || initialDayState,
            };
            setHours(completeHours);
        } else {
            setHours(initialHoursState);
        }
    }, [business]);

    const handleTimeChange = (day: keyof OpeningHours, session: keyof DayHours, value: string) => {
        setHours(prev => ({
            ...prev,
            [day]: { ...prev[day], [session]: value }
        }));
    };

    const handleClosedToggle = (day: keyof OpeningHours, isClosed: boolean) => {
        setHours(prev => ({
            ...prev,
            [day]: { ...prev[day], closed: isClosed }
        }));
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Clock className="h-6 w-6" />
                    Opening Times
                </CardTitle>
                <CardDescription>
                    Set your weekly opening hours, including lunch breaks. Leave times blank if not applicable.
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="hidden md:grid grid-cols-[100px_1fr_1fr_1fr_1fr_auto] items-center gap-x-4 gap-y-2 text-sm font-medium text-muted-foreground px-2">
                    <span></span>
                    <span>Morning Open</span>
                    <span>Morning Close</span>
                    <span>Afternoon Open</span>
                    <span>Afternoon Close</span>
                    <span>Closed</span>
                </div>
                 {daysOfWeek.map((day) => (
                    <div key={day} className="grid grid-cols-1 md:grid-cols-[100px_1fr_1fr_1fr_1fr_auto] items-center gap-x-4 gap-y-2 p-2 rounded-md hover:bg-muted/50">
                        <Label className="capitalize font-semibold">{day}</Label>
                        <Input type="time" aria-label={`${day} morning open time`} value={hours[day].morningOpen} onChange={(e) => handleTimeChange(day, 'morningOpen', e.target.value)} disabled={hours[day].closed} />
                        <Input type="time" aria-label={`${day} morning close time`} value={hours[day].morningClose} onChange={(e) => handleTimeChange(day, 'morningClose', e.target.value)} disabled={hours[day].closed} />
                        <Input type="time" aria-label={`${day} afternoon open time`} value={hours[day].afternoonOpen} onChange={(e) => handleTimeChange(day, 'afternoonOpen', e.target.value)} disabled={hours[day].closed} />
                        <Input type="time" aria-label={`${day} afternoon close time`} value={hours[day].afternoonClose} onChange={(e) => handleTimeChange(day, 'afternoonClose', e.target.value)} disabled={hours[day].closed} />
                        <Checkbox checked={hours[day].closed} onCheckedChange={(checked) => handleClosedToggle(day, !!checked)} />
                    </div>
                 ))}
            </CardContent>
            <CardFooter>
                <Button onClick={() => onSave(hours)} disabled={isSaving}>
                    {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Save Opening Times
                </Button>
            </CardFooter>
        </Card>
    );
}

export default function StorefrontPage() {
  const { user, isUserLoading } = useUser();
  const db = useFirestore();
  const { toast } = useToast();
  const router = useRouter();

  const [selectedBusinessId, setSelectedBusinessId] = React.useState<string | null>(null);
  const [editingProduct, setEditingProduct] = React.useState<Product | null>(null);
  const [isFormOpen, setIsFormOpen] = React.useState(false);
  const [isSavingHours, setIsSavingHours] = React.useState(false);
  const [isSavingSettings, setIsSavingSettings] = React.useState(false);
  const [isRedirecting, setIsRedirecting] = React.useState(false);
  const [isManaging, setIsManaging] = React.useState(false);
  const [storeSettings, setStoreSettings] = React.useState<StoreSettings>({
      deliveryAvailable: true,
      deliveryType: 'free',
      deliveryPrice: 0,
      catalogueMode: false,
      showPricesInCatalogue: true,
      storeAvailability: 'instore_online',
  });

  const businessesQuery = useMemoFirebase(() => {
    if (!user) return null;
    return query(collection(db, 'businesses'), where('ownerId', '==', user.uid));
  }, [user, db]);
  const { data: businesses, isLoading: businessesLoading } = useCollection<Business>(businessesQuery);

  const productsQuery = useMemoFirebase(() => {
    if (!selectedBusinessId) return null;
    return query(collection(db, `businesses/${selectedBusinessId}/products`));
  }, [selectedBusinessId]);
  const { data: products, isLoading: productsLoading } = useCollection<Product>(productsQuery);
  
  const recentOrdersQuery = useMemoFirebase(() => {
    if (!user) return null;
    return query(
        collection(db, 'orders'), 
        where('businessOwnerId', '==', user.uid)
    );
  }, [user, db]);

  const { data: allOrders, isLoading: ordersLoading } = useCollection<Order>(recentOrdersQuery);

  const recentOrders = React.useMemo(() => {
    if (!allOrders) return [];
    return allOrders
      .sort((a, b) => b.createdAt.toDate().getTime() - a.createdAt.toDate().getTime())
      .slice(0, 3);
  }, [allOrders]);
  
  const selectedBusiness = React.useMemo(() => businesses?.find(b => b.id === selectedBusinessId), [businesses, selectedBusinessId]);

  React.useEffect(() => {
    if (businesses && businesses.length > 0 && !selectedBusinessId) {
      setSelectedBusinessId(businesses[0].id);
    }
  }, [businesses, selectedBusinessId]);

  React.useEffect(() => {
    if (selectedBusiness?.storeSettings) {
        setStoreSettings(prev => ({...prev, ...selectedBusiness.storeSettings}));
    } else {
        setStoreSettings({
            deliveryAvailable: true,
            deliveryType: 'free',
            deliveryPrice: 0,
            catalogueMode: false,
            showPricesInCatalogue: true,
            storeAvailability: 'instore_online',
        });
    }
  }, [selectedBusiness]);

  const handleCreate = () => {
    if (selectedBusinessId) {
        router.push(`/business/products/create?businessId=${selectedBusinessId}`);
    }
  };

  const handleDelete = async (productId: string) => {
    if (!selectedBusinessId) return;
    if (!window.confirm('Are you sure you want to delete this product?')) return;

    const result = await deleteProductAction({ businessId: selectedBusinessId, productId });
    if (result.success) {
      toast({ title: 'Product Deleted' });
    } else {
      toast({ title: 'Error', description: result.error, variant: 'destructive' });
    }
  };
  
  const handleSaveHours = async (hours: OpeningHours) => {
    if (!selectedBusinessId) return;
    setIsSavingHours(true);
    const result = await saveOpeningHoursAction({ businessId: selectedBusinessId, openingHours: hours });
    if (result.success) {
      toast({ title: 'Opening Hours Saved' });
    } else {
      toast({ title: 'Error', description: result.error, variant: 'destructive' });
    }
    setIsSavingHours(false);
  };

  const handleSettingsChange = (key: keyof StoreSettings, value: boolean | string | number) => {
    setStoreSettings(prev => ({...prev, [key]: value}));
  }

  const handleSaveSettings = async () => {
    if (!selectedBusinessId) return;
    setIsSavingSettings(true);
    const result = await saveStoreSettingsAction({ businessId: selectedBusinessId, settings: storeSettings });
    if (result.success) {
      toast({ title: 'Store Settings Saved' });
    } else {
      toast({ title: 'Error', description: result.error, variant: 'destructive' });
    }
    setIsSavingSettings(false);
  }
  
  const handleFormClose = () => {
    setEditingProduct(null);
    setIsFormOpen(false);
  };
  
  const handleConnectStripe = async () => {
    if (!selectedBusinessId) {
        toast({ title: "Error", description: "Please select a business first.", variant: "destructive" });
        return;
    }
    setIsRedirecting(true);
    
    try {
        const result = await createStripeConnectAccountLinkForBusiness(selectedBusinessId);
        if (result.url) {
            router.push(result.url);
        } else {
            throw new Error(result.error || "An unknown error occurred.");
        }
    } catch (error: any) {
        toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
        setIsRedirecting(false);
    }
  };
  
  const handleManageStripeAccount = async () => {
    if (!selectedBusinessId) {
      toast({ title: "Error", description: "Please select a business first.", variant: "destructive" });
      return;
    }
    setIsManaging(true);
    const result = await createStripeDashboardLinkForBusiness(selectedBusinessId);
    if (result.url) {
        router.push(result.url);
    } else {
        toast({ title: "Error", description: result.error, variant: "destructive" });
    }
    setIsManaging(false);
  };


  const loading = isUserLoading || businessesLoading;
  const canAcceptPayments = !!selectedBusiness?.stripeAccountId;
  const isOnlineDisabled = storeSettings.storeAvailability === 'instore_only';
  const isCatalogueEffectivelyOn = storeSettings.catalogueMode || isOnlineDisabled;

  return (
    <>
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight font-headline flex items-center gap-2">
            <Store className="h-8 w-8 text-primary" />
            My Storefront
          </h1>
          <p className="text-muted-foreground">Manage your products, orders, and storefront settings.</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
            <div className="lg:col-span-2 space-y-8">
                <Card>
                    <CardHeader>
                        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                        <div>
                            <CardTitle className="flex items-center gap-2">
                            <Package className="h-6 w-6" />
                            Product Management
                            </CardTitle>
                            <CardDescription>Add, edit, and manage the products you sell.</CardDescription>
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
                                <p className="text-muted-foreground text-sm">Please connect a Stripe account on this page to add new products.</p>
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
                            {productsLoading ? (
                                <TableRow>
                                <TableCell colSpan={5} className="h-24 text-center">
                                    <Loader2 className="mx-auto h-6 w-6 animate-spin" />
                                </TableCell>
                                </TableRow>
                            ) : products && products.length > 0 ? (
                                products.slice(0, 5).map((product) => (
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
                                    <TableCell>£{product.price.toFixed(2)}</TableCell>
                                    <TableCell>{product.stock}</TableCell>
                                    <TableCell className="text-right">
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                        <Button variant="ghost" size="icon"><MoreHorizontal /></Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent>
                                        <DropdownMenuItem onClick={() => router.push(`/business/products/edit/${product.id}?businessId=${selectedBusinessId}`)}><FileEdit className="mr-2 h-4 w-4"/>Edit</DropdownMenuItem>
                                        <DropdownMenuItem onClick={() => handleDelete(product.id)} className="text-destructive"><Trash2 className="mr-2 h-4 w-4"/>Delete</DropdownMenuItem>
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                    </TableCell>
                                </TableRow>
                                ))
                            ) : (
                                <TableRow>
                                <TableCell colSpan={5} className="h-24 text-center">
                                    {selectedBusinessId ? "No products found for this business. Add your first product!" : "Please select a business."}
                                </TableCell>
                                </TableRow>
                            )}
                            </TableBody>
                        </Table>
                        </div>
                    </CardContent>
                    <CardFooter>
                        <Button asChild variant="outline">
                            <Link href="/business/products">View All Products <ArrowRight className="ml-2 h-4 w-4" /></Link>
                        </Button>
                    </CardFooter>
                </Card>
                
                <OpeningTimesCard business={selectedBusiness} onSave={handleSaveHours} isSaving={isSavingHours} />
            </div>

            <div className="lg:col-span-1 space-y-8">
                 <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                           <ShoppingCart className="h-6 w-6" />
                           Recent Orders
                        </CardTitle>
                        <CardDescription>A quick look at your most recent sales.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Customer</TableHead>
                                    <TableHead>Total</TableHead>
                                    <TableHead>Status</TableHead>
                                </TableRow>
                            </TableHeader>
                             <TableBody>
                                {ordersLoading ? (
                                     <TableRow>
                                        <TableCell colSpan={3} className="h-24 text-center">
                                            <Loader2 className="mx-auto h-6 w-6 animate-spin" />
                                        </TableCell>
                                    </TableRow>
                                ) : recentOrders && recentOrders.length > 0 ? (
                                    recentOrders.map(order => (
                                        <TableRow key={order.id}>
                                            <TableCell>
                                                <div className="font-medium">{order.customerName || order.shippingAddress.split(',')[0]}</div>
                                                <div className="text-xs text-muted-foreground">{format(order.createdAt.toDate(), 'dd MMM yyyy')}</div>
                                            </TableCell>
                                            <TableCell>£{order.totalAmount.toFixed(2)}</TableCell>
                                            <TableCell><Badge variant="secondary">{order.status}</Badge></TableCell>
                                        </TableRow>
                                    ))
                                ) : (
                                    <TableRow>
                                        <TableCell colSpan={3} className="h-24 text-center text-muted-foreground">
                                            No recent orders.
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </CardContent>
                    <CardFooter>
                        <Button asChild variant="outline" className="w-full">
                           <Link href="/business/orders">View All Orders</Link>
                        </Button>
                    </CardFooter>
                </Card>
                 <CurrencyConverter />

                {selectedBusinessId && (
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Landmark className="h-6 w-6" />
                                Payment Account
                            </CardTitle>
                            <CardDescription>Manage your Stripe connection to accept payments.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            {canAcceptPayments ? (
                                <div className="p-4 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 flex flex-col items-center text-center gap-2">
                                    <BadgeCheck className="h-8 w-8 text-green-600" />
                                    <h3 className="font-semibold text-green-800 dark:text-green-300">Stripe Account Connected</h3>
                                    <p className="text-sm text-green-700 dark:text-green-400">You are ready to accept online payments.</p>
                                </div>
                            ) : (
                                <div className="p-4 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 flex flex-col items-center text-center gap-2">
                                    <AlertCircle className="h-8 w-8 text-amber-600" />
                                    <h3 className="font-semibold text-amber-800 dark:text-amber-300">Connect to Stripe</h3>
                                    <p className="text-sm text-amber-700 dark:text-amber-400">Connect a Stripe account to this business to sell products and accept payments online.</p>
                                </div>
                            )}
                        </CardContent>
                        <CardFooter>
                            {canAcceptPayments ? (
                                <Button onClick={handleManageStripeAccount} disabled={isManaging} className="w-full">
                                    {isManaging && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                    Manage on Stripe
                                </Button>
                            ) : (
                                <Button onClick={handleConnectStripe} disabled={isRedirecting} className="w-full">
                                    {isRedirecting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                    Connect with Stripe
                                </Button>
                            )}
                        </CardFooter>
                    </Card>
                )}
            </div>
        </div>
      </div>

       <Dialog open={isFormOpen} onOpenChange={handleFormClose}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>{editingProduct ? 'Edit Product' : 'Add New Product'}</DialogTitle>
          </DialogHeader>
          <ProductForm businessId={selectedBusinessId} product={editingProduct} onSave={handleFormClose} />
        </DialogContent>
      </Dialog>
    </>
  );
}
