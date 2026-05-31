
'use client';

import * as React from 'react';
import {
  ShoppingCart,
  PlusCircle,
  Clock,
  Loader2,
  Store,
  ArrowRight,
  ArrowLeft,
  CheckCircle,
  Landmark,
  Circle,
  AlertTriangle,
  Info,
  Package,
  Truck,
  Trash2,
  Lock,
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import NextLink from 'next/link';
import NextImage from 'next/image';
import { useUser, useFirestore, useCollection, useMemoFirebase, useDoc } from '@/firebase';
import { collection, query, where, doc, limit } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { format, isValid } from 'date-fns';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Switch } from '@/components/ui/switch';
import { useRouter } from 'next/navigation';
import { CurrencyConverter } from '@/components/currency-converter';
import { createStripeConnectAccountLinkForBusiness } from '@/lib/actions/stripeActions';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { getBusinessOrdersAction } from '@/lib/actions/orderActions';
import { saveOpeningHoursAction, saveStoreSettingsAction } from '@/lib/actions/productActions';
import { Separator } from '@/components/ui/separator';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

type Business = {
  id: string;
  businessName: string;
  openingHours?: any;
  storeSettings?: any;
  stripeAccountId?: string;
  primaryCommunityId?: string;
  storefrontSubscription?: boolean;
  accountType?: string;
  status: string;
  sellsRestrictedProducts?: boolean;
};

type StoreSettings = {
    deliveryType: 'click_and_collect' | 'shop_delivery' | 'local_courier';
    catalogueMode: boolean;
    showPricesInCatalogue: boolean;
};

function OpeningTimesCard({ business, onSave, isSaving }: { business: Business | undefined, onSave: (hours: any) => void, isSaving: boolean }) {
    const [hours, setHours] = React.useState<any>({});
    const daysOfWeek = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

    React.useEffect(() => {
        if (business?.openingHours) {
            setHours(business.openingHours);
        }
    }, [business]);

    const handleTimeChange = (day: string, session: string, value: string) => {
        setHours((prev: any) => ({
            ...prev,
            [day]: { ...prev[day], [session]: value }
        }));
    };

    const handleClosedToggle = (day: string, isClosed: boolean) => {
        setHours((prev: any) => ({
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
                <CardDescription>Set your weekly opening hours.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                 {daysOfWeek.map((day) => (
                    <div key={day} className="grid grid-cols-1 md:grid-cols-[100px_1fr_1fr_auto] items-center gap-4 p-2 rounded-md hover:bg-muted/50">
                        <Label className="capitalize font-semibold">{day}</Label>
                        <Input type="time" value={hours[day]?.open || ''} onChange={(e) => handleTimeChange(day, 'open', e.target.value)} disabled={hours[day]?.closed} />
                        <Input type="time" value={hours[day]?.close || ''} onChange={(e) => handleTimeChange(day, 'close', e.target.value)} disabled={hours[day]?.closed} />
                        <div className="flex items-center gap-2">
                            <Checkbox id={`closed-${day}`} checked={hours[day]?.closed} onCheckedChange={(checked) => handleClosedToggle(day, !!checked)} />
                            <Label htmlFor={`closed-${day}`}>Closed</Label>
                        </div>
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

function StoreSettingsCard({ settings, onSettingsChange, onSave, isSaving, isCourierReady, canAcceptPayments, isTransactionsEnabled }: {
    settings: StoreSettings;
    onSettingsChange: (key: keyof StoreSettings, value: any) => void;
    onSave: () => void;
    isSaving: boolean;
    isCourierReady: boolean;
    canAcceptPayments: boolean;
    isTransactionsEnabled: boolean;
}) {
    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Store className="h-6 w-6" />
                    Storefront Settings
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
                <div className="space-y-6">
                    <div className="flex items-start justify-between gap-4">
                        <div className="space-y-1 flex-1">
                            <div className="flex items-center gap-2">
                                <Label htmlFor="catalogue-mode" className="text-base font-semibold">Catalogue Mode</Label>
                                {!isTransactionsEnabled && (
                                    <TooltipProvider>
                                        <Tooltip>
                                            <TooltipTrigger asChild>
                                                <Lock className="h-4 w-4 text-amber-500" />
                                            </TooltipTrigger>
                                            <TooltipContent>
                                                <p>Transactions are temporarily disabled for your community.</p>
                                            </TooltipContent>
                                        </Tooltip>
                                    </TooltipProvider>
                                )}
                            </div>
                            <p className="text-sm text-muted-foreground">
                                {settings.catalogueMode 
                                    ? "Customers can view items but the shopping cart is disabled." 
                                    : "Full storefront active. Customers can purchase items directly through the platform."}
                            </p>
                            {!isTransactionsEnabled && (
                                <Alert className="mt-4 bg-amber-50 border-amber-200">
                                    <Info className="h-4 w-4 text-amber-600" />
                                    <AlertDescription className="text-xs text-amber-800">
                                        The shopping cart is currently disabled for this community during optimization. You can still show prices in your catalogue.
                                    </AlertDescription>
                                </Alert>
                            )}
                        </div>
                        <Switch 
                            id="catalogue-mode" 
                            checked={settings.catalogueMode} 
                            onCheckedChange={(checked) => onSettingsChange('catalogueMode', checked)} 
                            disabled={!isTransactionsEnabled || !canAcceptPayments}
                        />
                    </div>

                    <div className="flex items-center justify-between p-4 bg-muted/30 border rounded-lg animate-in fade-in duration-300">
                             <div className="space-y-0.5">
                                <Label htmlFor="show-prices" className="font-semibold">Show Prices in Catalogue</Label>
                                <p className="text-xs text-muted-foreground">Toggle whether to display item prices when the cart is disabled.</p>
                            </div>
                            <Switch id="show-prices" checked={settings.showPricesInCatalogue} onCheckedChange={(checked) => onSettingsChange('showPricesInCatalogue', checked)} />
                    </div>

                    <Separator />

                    <div className="space-y-4">
                         <div className="space-y-1">
                            <div className="flex items-center gap-2">
                                <Label className="text-base font-semibold flex items-center gap-2">
                                    <Truck className="h-5 w-5" /> Delivery Options
                                </Label>
                                {settings.catalogueMode && (
                                    <TooltipProvider>
                                        <Tooltip>
                                            <TooltipTrigger asChild>
                                                <Lock className="h-4 w-4 text-muted-foreground" />
                                            </TooltipTrigger>
                                            <TooltipContent>
                                                <p>Delivery settings are hidden in Catalogue Mode.</p>
                                            </TooltipContent>
                                        </Tooltip>
                                    </TooltipProvider>
                                )}
                            </div>
                            <p className="text-sm text-muted-foreground">Choose how your customers receive their orders.</p>
                        </div>
                        <RadioGroup 
                            value={settings.deliveryType} 
                            onValueChange={(val) => onSettingsChange('deliveryType', val)}
                            className="space-y-3"
                            disabled={settings.catalogueMode}
                        >
                            <div className="flex items-start space-x-3 p-3 border rounded-lg cursor-pointer hover:bg-muted/30">
                                <RadioGroupItem value="click_and_collect" id="cc" className="mt-1" />
                                <Label htmlFor="cc" className="flex-1 cursor-pointer">
                                    <span className="font-bold">In Store Only / Click and Collect</span>
                                    <p className="text-xs text-muted-foreground mt-1">Customers will collect their orders from your store location.</p>
                                </Label>
                            </div>

                            <div className={cn(
                                "flex items-start space-x-3 p-3 border rounded-lg transition-opacity",
                                !canAcceptPayments ? "opacity-50" : "cursor-pointer hover:bg-muted/30"
                            )}>
                                <RadioGroupItem value="shop_delivery" id="sd" className="mt-1" disabled={!canAcceptPayments} />
                                <Label htmlFor="sd" className={cn("flex-1", canAcceptPayments ? "cursor-pointer" : "cursor-default")}>
                                    <span className="font-bold">Shop Delivery / Free Delivery</span>
                                    <p className="text-xs text-muted-foreground mt-1">The shop will arrange and handle local deliveries themselves at no cost to the customer.</p>
                                </Label>
                            </div>

                            <div className={cn(
                                "flex items-start space-x-3 p-3 border rounded-lg transition-opacity",
                                (!isCourierReady || !canAcceptPayments) ? "opacity-50" : "cursor-pointer hover:bg-muted/30"
                            )}>
                                <RadioGroupItem value="local_courier" id="lc" className="mt-1" disabled={!isCourierReady || !canAcceptPayments} />
                                <Label htmlFor="lc" className={cn("flex-1", (isCourierReady && canAcceptPayments) ? "cursor-pointer" : "cursor-default")}>
                                    <div className="flex items-center gap-2">
                                        <span className="font-bold">Local Courier</span>
                                        {!isCourierReady && canAcceptPayments && <Badge variant="destructive" className="text-[10px] h-4">Not Available</Badge>}
                                    </div>
                                    <p className="text-xs text-muted-foreground mt-1">
                                        Handled by the official community courier. A delivery fee (set by the courier) will be added at checkout.
                                    </p>
                                </Label>
                            </div>
                        </RadioGroup>
                    </div>
                </div>
            </CardContent>
            <CardFooter>
                <Button onClick={onSave} disabled={isSaving} className="w-full">
                    {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Save Storefront Settings
                </Button>
            </CardFooter>
        </Card>
    );
}

export default function StorefrontPage() {
  const { user, userProfile, isUserLoading, profileLoading } = useUser();
  const db = useFirestore();
  const { toast } = useToast();
  const router = useRouter();

  const [selectedBusinessId, setSelectedBusinessId] = React.useState<string | null>(null);
  const [recentOrders, setRecentOrders] = React.useState<any[]>([]);
  const [isSavingHours, setIsSavingHours] = React.useState(false);
  const [isSavingSettings, setIsSavingSettings] = React.useState(false);
  const [isRedirecting, setIsRedirecting] = React.useState(false);
  const [storeSettings, setStoreSettings] = React.useState<StoreSettings>({
      deliveryType: 'click_and_collect',
      catalogueMode: true,
      showPricesInCatalogue: true,
  });

  const ownedBusinessesQuery = useMemoFirebase(() => {
    if (!user) return null;
    return query(collection(db, 'businesses'), where('ownerId', '==', user.uid));
  }, [user, db]);

  const { data: businesses, isLoading: businessesLoading } = useCollection<Business>(ownedBusinessesQuery);
  
  const storefrontBusinesses = React.useMemo(() => 
    businesses?.filter(b => b.storefrontSubscription === true) || [], 
    [businesses]
  );

  const selectedBusiness = React.useMemo(() => 
    storefrontBusinesses.find(b => b.id === selectedBusinessId), 
    [storefrontBusinesses, selectedBusinessId]
  );
  
  const communityRef = useMemoFirebase(() => (selectedBusiness?.primaryCommunityId ? doc(db, 'communities', selectedBusiness.primaryCommunityId) : null), [selectedBusiness?.primaryCommunityId, db]);
  const { data: communityData } = useDoc(communityRef);
  
  const isCourierReady = !!communityData?.courierId;
  const isTransactionsEnabled = communityData?.transactionsEnabled === true;
  const canAcceptPayments = !!selectedBusiness?.stripeAccountId;

  const productsQuery = useMemoFirebase(() => {
      if (!selectedBusinessId || !db) return null;
      return query(collection(db, `businesses/${selectedBusinessId}/products`), limit(5));
  }, [db, selectedBusinessId]);
  const { data: products, isLoading: productsLoading } = useCollection(productsQuery);

  React.useEffect(() => {
    if (storefrontBusinesses.length > 0 && !selectedBusinessId) {
      setSelectedBusinessId(storefrontBusinesses[0].id);
    }
  }, [storefrontBusinesses, selectedBusinessId]);

  React.useEffect(() => {
      if (selectedBusiness) {
          const settings = selectedBusiness.storeSettings || {};
          
          setStoreSettings(prev => ({
              ...prev,
              ...settings,
              // Force catalogue mode if NOT enabled for this community
              catalogueMode: isTransactionsEnabled ? (settings.catalogueMode ?? true) : true,
              // Force in-store only delivery type if NOT enabled for this community
              deliveryType: isTransactionsEnabled ? (settings.deliveryType || 'click_and_collect') : 'click_and_collect'
          }));
      }
  }, [selectedBusiness, isTransactionsEnabled]);

  React.useEffect(() => {
    const fetchOrders = async () => {
        if (user) {
            try {
                const data = await getBusinessOrdersAction(user.uid);
                setRecentOrders(data.slice(0, 3));
            } catch (err) {
                console.error("Failed to fetch orders:", err);
            }
        }
    };
    fetchOrders();
  }, [user]);

  const handleSaveHours = async (hours: any) => {
    if (!selectedBusinessId) return;
    setIsSavingHours(true);
    const result = await saveOpeningHoursAction({ businessId: selectedBusinessId, openingHours: hours });
    if (result.success) toast({ title: 'Opening Hours Saved' });
    else toast({ title: 'Error', description: result.error, variant: 'destructive' });
    setIsSavingHours(false);
  };

  const handleSaveSettings = async () => {
    if (!selectedBusinessId) return;
    setIsSavingSettings(true);
    
    // Safety check: ensure catalogueMode is saved as true if transactions aren't enabled
    const finalSettings = {
        ...storeSettings,
        catalogueMode: isTransactionsEnabled ? storeSettings.catalogueMode : true,
    };

    const result = await saveStoreSettingsAction({ businessId: selectedBusinessId, settings: finalSettings });
    if (result.success) toast({ title: 'Store Settings Saved' });
    else toast({ title: 'Error', description: result.error, variant: 'destructive' });
    setIsSavingSettings(false);
  }
  
  const handleConnectStripe = async () => {
    if (!selectedBusinessId) return;
    setIsRedirecting(true);
    const result = await createStripeConnectAccountLinkForBusiness(selectedBusinessId);
    if (result.url) router.push(result.url);
    else toast({ title: "Error", description: result.error, variant: "destructive" });
    setIsRedirecting(false);
  };

  const isEnterprise = userProfile?.accountType === 'enterprise' || userProfile?.permissions?.isEnterpriseUser;

  if (businessesLoading || isUserLoading || profileLoading) {
    return <div className="flex justify-center items-center h-96"><Loader2 className="animate-spin h-8 w-8" /></div>;
  }

  if (!businessesLoading && storefrontBusinesses.length === 0) {
    return (
        <div className="flex flex-col items-center justify-center min-h-[400px] text-center space-y-4">
            <div className="p-4 bg-primary/10 rounded-full">
                <ShoppingCart className="h-12 w-12 text-primary" />
            </div>
            <h2 className="text-2xl font-bold font-headline">Storefront Management</h2>
            <p className="text-muted-foreground max-w-md">
                You have active {isEnterprise ? 'groups' : 'listings'}, but you haven't opened a storefront for any of them yet. A storefront subscription is required to manage products and orders.
            </p>
            <div className="flex gap-4">
                <Button asChild variant="outline">
                    <NextLink href={isEnterprise ? "/enterprise/groups" : "/business/listings"}>Manage My {isEnterprise ? 'Groups' : 'Listings'}</NextLink>
                </Button>
            </div>
        </div>
    );
  }

  return (
    <div className="space-y-8">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
                <h1 className="text-3xl font-bold tracking-tight font-headline flex items-center gap-2">
                    <Store className="h-8 w-8 text-primary" />
                    My Storefront
                </h1>
                <p className="text-muted-foreground">Manage your products, orders, and storefront settings.</p>
            </div>
            <div className="w-full sm:w-64">
                <Select value={selectedBusinessId || ''} onValueChange={setSelectedBusinessId}>
                    <SelectTrigger><SelectValue placeholder="Select Business..." /></SelectTrigger>
                    <SelectContent>
                        {storefrontBusinesses.map(biz => <SelectItem key={biz.id} value={biz.id}>{biz.businessName}</SelectItem>)}
                    </SelectContent>
                </Select>
            </div>
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

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-8">
                 <Card>
                    <CardHeader className="flex flex-row items-center justify-between">
                        <div>
                            <CardTitle>Recent Products</CardTitle>
                        </div>
                        <Button asChild variant="outline" size="sm">
                            <NextLink href="/business/products">Manage All <ArrowRight className="ml-2 h-4 w-4"/></NextLink>
                        </Button>
                    </CardHeader>
                    <CardContent>
                        {productsLoading ? <div className="flex justify-center p-4"><Loader2 className="animate-spin h-6 w-6"/></div> :
                        products && products.length > 0 ? (
                            <div className="space-y-3">
                                {products.map((p: any) => (
                                    <div key={p.id} className="flex items-center gap-4 p-2 border rounded-md">
                                        <div className="relative h-12 w-12 rounded bg-muted overflow-hidden">
                                            {p.images?.[0]?.url && <NextImage src={p.images[0].url} alt={p.name} fill className="object-cover"/>}
                                        </div>
                                        <div className="flex-1">
                                            <p className="font-medium text-sm">{p.name}</p>
                                            <p className="text-xs text-muted-foreground">£{p.price?.toFixed(2)} | Stock: {p.stock}</p>
                                        </div>
                                        <Button asChild variant="ghost" size="sm">
                                            <NextLink href={`/business/products/edit/${p.id}?businessId=${selectedBusinessId}`}>Edit</NextLink>
                                        </Button>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="text-center py-8 border-2 border-dashed rounded-lg">
                                <Package className="mx-auto h-8 w-8 text-muted-foreground mb-2" />
                                <p className="text-sm text-muted-foreground">No products added yet.</p>
                                <Button asChild variant="link" className="mt-2">
                                    <NextLink href={`/business/products/create?businessId=${selectedBusinessId}`}>Add your first product</NextLink>
                                </Button>
                            </div>
                        )}
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Recent Orders</CardTitle>
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
                                {recentOrders.length > 0 ? (
                                    recentOrders.map(order => (
                                        <TableRow key={order.id}>
                                            <TableCell>
                                                <div className="font-medium">{order.customerName}</div>
                                                <div className="text-xs text-muted-foreground">{isValid(new Date(order.createdAt)) ? format(new Date(order.createdAt), 'dd MMM yyyy') : 'N/A'}</div>
                                            </TableCell>
                                            <TableCell>£{order.totalAmount.toFixed(2)}</TableCell>
                                            <TableCell><Badge variant="secondary">{order.status}</Badge></TableCell>
                                        </TableRow>
                                    ))
                                ) : <TableRow><TableCell colSpan={3} className="text-center py-6">No recent orders.</TableCell></TableRow>}
                            </TableBody>
                        </Table>
                    </CardContent>
                    <CardFooter>
                        <Button asChild variant="outline" className="w-full">
                           <NextLink href="/business/orders">View All Orders</NextLink>
                        </Button>
                    </CardFooter>
                </Card>
                
                <OpeningTimesCard business={selectedBusiness} onSave={handleSaveHours} isSaving={isSavingHours} />
            </div>

            <div className="space-y-8">
                 <CurrencyConverter />
                <StoreSettingsCard 
                    settings={storeSettings}
                    onSettingsChange={(k, v) => setStoreSettings(s => ({...s, [k]: v}))}
                    onSave={handleSaveSettings}
                    isSaving={isSavingSettings}
                    isCourierReady={isCourierReady}
                    canAcceptPayments={canAcceptPayments}
                    isTransactionsEnabled={isTransactionsEnabled}
                />
                
                <Card>
                    <CardHeader>
                        <CardTitle>Payment Account</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {canAcceptPayments ? (
                            <Alert className="bg-green-50 border-green-200">
                                <CheckCircle className="h-4 w-4 text-green-600" />
                                <AlertTitle className="text-green-800">Stripe Connected</AlertTitle>
                            </Alert>
                        ) : (
                            <Alert variant="default" className="bg-amber-50 border-amber-200">
                                <Info className="h-4 w-4 text-amber-600" />
                                <AlertTitle className="text-amber-800">Payment Setup Pending</AlertTitle>
                                <AlertDescription>
                                    Your store is currently in <strong>Catalogue Mode</strong>. Connect Stripe to unlock the checkout and start accepting payments.
                                </AlertDescription>
                            </Alert>
                        )}
                    </CardContent>
                    <CardFooter>
                        <Button onClick={handleConnectStripe} disabled={isRedirecting || !selectedBusinessId} className="w-full">
                            {isRedirecting ? <Loader2 className="animate-spin h-4 w-4 mr-2" /> : null}
                            {canAcceptPayments ? 'Manage Stripe Account' : 'Connect with Stripe'}
                        </Button>
                    </CardFooter>
                </Card>
            </div>
        </div>
    </div>
  );
}
