'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ShoppingCart, Package, Loader2, AlertTriangle, Truck, MapPin, Info, MessageSquare, Phone, X } from "lucide-react";
import { useCart } from '@/contexts/cart-context';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { useUser, useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { useForm, FormProvider } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { createCheckoutSession } from '@/lib/actions/stripeActions';
import { getCourierDeliveryFeeAction } from '@/lib/actions/communityActions';
import { collection, query, where, getDocs, documentId, doc } from 'firebase/firestore';
import { Checkbox } from '@/components/ui/checkbox';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from '@/lib/utils';

const addressSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Invalid email address'),
  mobileNumber: z.string().optional(),
  addressLine1: z.string().min(1, 'Address is required'),
  addressLine2: z.string().optional(),
  city: z.string().min(1, 'City is required'),
  postcode: z.string().min(1, 'Postcode is required'),
  acknowledgedFulfillment: z.boolean().refine(val => val === true, {
    message: "You must acknowledge the fulfillment methods before proceeding."
  })
});

type AddressFormValues = z.infer<typeof addressSchema>;

type FulfillmentGroup = {
    businessId: string;
    businessName: string;
    deliveryType: string;
    items: any[];
}

export default function CheckoutPage() {
  const { cartItems, totalPrice, totalDeliveryFee, cartCount } = useCart();
  const { user } = useUser();
  const db = useFirestore();
  
  const userProfileRef = useMemoFirebase(() => (user ? doc(db, 'users', user.uid) : null), [user, db]);
  const { data: userProfile, isLoading: profileLoading } = useDoc(userProfileRef);

  const [isProcessing, setIsProcessing] = React.useState(false);
  const [isLoadingSettings, setIsLoadingLoadingSettings] = React.useState(true);
  const [fulfillmentGroups, setFulfillmentGroups] = React.useState<FulfillmentGroup[]>([]);
  const [totalCourierFee, setTotalCourierFee] = React.useState(0);
  const { toast } = useToast();
  const router = useRouter();

  const [isClient, setIsClient] = React.useState(false);

  React.useEffect(() => {
    setIsClient(true);
  }, []);

  const methods = useForm<AddressFormValues>({
    resolver: zodResolver(addressSchema),
    mode: 'onChange',
    defaultValues: {
      name: userProfile?.name || '',
      email: userProfile?.email || '',
      mobileNumber: '',
      addressLine1: '',
      addressLine2: '',
      city: '',
      postcode: '',
      acknowledgedFulfillment: false,
    },
  });

  const communityId = userProfile?.communityId;

  const resolveFulfillment = React.useCallback(async () => {
    if (!db || cartItems.length === 0 || !communityId) {
        setIsLoadingLoadingSettings(false);
        return;
    }

    setIsLoadingLoadingSettings(true);
    try {
        const businessIds = [...new Set(cartItems.map(item => item.businessId))].filter(Boolean);
        
        if (businessIds.length === 0) {
            setIsLoadingLoadingSettings(false);
            return;
        }

        // Fetch community to check if a courier exists
        const commDocRef = doc(db, 'communities', communityId);
        const commDocSnap = await getDoc(commDocRef);
        const hasCourier = !!commDocSnap.data()?.courierId;

        const bizQuery = query(collection(db, 'businesses'), where(documentId(), 'in', businessIds));
        const bizSnapshot = await getDocs(bizQuery);
        
        const bizMap = new Map();
        bizSnapshot.forEach(docSnap => bizMap.set(docSnap.id, { id: docSnap.id, ...docSnap.data() }));

        const groups: Record<string, FulfillmentGroup> = {};
        let usesCourier = false;

        cartItems.forEach(item => {
            const biz = bizMap.get(item.businessId);
            const canAcceptPayments = !!biz?.stripeAccountId;
            const deliveryType = canAcceptPayments 
                ? (biz?.storeSettings?.deliveryType || 'click_and_collect')
                : 'click_and_collect';

            const finalDeliveryType = (deliveryType === 'local_courier' && !hasCourier)
                ? 'click_and_collect'
                : deliveryType;

            if (finalDeliveryType === 'local_courier') {
                usesCourier = true;
            }

            if (!groups[item.businessId]) {
                groups[item.businessId] = {
                    businessId: item.businessId,
                    businessName: biz?.businessName || 'Local Store',
                    deliveryType: finalDeliveryType,
                    items: []
                };
            }
            groups[item.businessId].items.push(item);
        });

        setFulfillmentGroups(Object.values(groups));

        if (usesCourier) {
            const feeResult = await getCourierDeliveryFeeAction(communityId);
            const fee = feeResult?.fee || 0;
            setTotalCourierFee(fee);
        } else {
            setTotalCourierFee(0);
        }

    } catch (error) {
        console.error("Fulfillment resolve error:", error);
        toast({ title: 'Error', description: 'Could not load store delivery settings.', variant: 'destructive' });
    } finally {
        setIsLoadingLoadingSettings(false);
    }
  }, [cartItems, db, communityId, toast]);

  React.useEffect(() => {
    if (isClient && !profileLoading) {
        resolveFulfillment();
        if (userProfile) {
            methods.reset({
                name: userProfile.name || '',
                email: userProfile.email || '',
                addressLine1: '',
                addressLine2: '',
                city: '',
                postcode: '',
                acknowledgedFulfillment: false,
                mobileNumber: '',
            });
        }
    }
  }, [resolveFulfillment, isClient, profileLoading, userProfile, methods]);

  const total = totalPrice + totalDeliveryFee;

  async function onSubmit(data: AddressFormValues) {
    if (!user) {
        toast({ title: "Please sign in", description: "You must be logged in to place an order.", variant: "destructive" });
        return;
    }
    
    setIsProcessing(true);
    try {
        const shippingAddress = `${data.name}, ${data.addressLine1}, ${data.addressLine2 ? data.addressLine2 + ', ' : ''}${data.city}, ${data.postcode}${data.mobileNumber ? ' (Phone: ' + data.mobileNumber + ')' : ''}`;

        const result = await createCheckoutSession({
            uid: user.uid,
            email: user.email!,
            name: data.name,
            mode: 'payment',
            purchaseType: 'cart_checkout',
            cartItems: cartItems.map(item => ({
                id: item.id,
                name: item.name,
                price: item.price,
                quantity: item.quantity,
                businessId: item.businessId
            })),
            totalDeliveryFee,
            communityId,
            successUrlPath: '/shopping/basket?payment=success',
            cancelUrlPath: '/shopping/checkout',
            metadata: {
                sa: shippingAddress, // Short key for shippingAddress to save space
            }
        });

        if (result.url) {
            router.push(result.url);
        } else {
            throw new Error(result.error || "Payment failed to initialize.");
        }
    } catch (error: any) {
        toast({ title: "Error", description: error.message, variant: "destructive" });
        setIsProcessing(false);
    }
  }

  const getFulfillmentLabel = (type: string) => {
    switch (type) {
        case 'local_courier': return 'Local Courier';
        case 'shop_delivery': return 'Store Delivery (Free)';
        case 'click_and_collect': return 'Click and Collect Only';
        default: return 'Standard';
    }
  }

  if (!isClient || profileLoading) {
    return (
        <div className="flex h-screen items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
    );
  }

  return (
    <div className="container mx-auto max-w-6xl py-8 px-4">
      <h1 className="text-3xl font-bold font-headline mb-8 text-center sm:text-left">Checkout</h1>
      
      <FormProvider {...methods}>
        <form onSubmit={methods.handleSubmit(onSubmit)}>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
            <div className="lg:col-span-2 space-y-8">
              <Card shadow-md>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <MapPin className="h-5 w-5 text-primary" />
                    Shipping Details
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormField control={methods.control} name="name" render={({ field }) => (
                            <FormItem><FormLabel>Full Name *</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                        )} />
                        <FormField control={methods.control} name="email" render={({ field }) => (
                            <FormItem><FormLabel>Email Address *</FormLabel><FormControl><Input type="email" {...field} /></FormControl><FormMessage /></FormItem>
                        )} />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormField control={methods.control} name="mobileNumber" render={({ field }) => (
                            <FormItem>
                                <FormLabel>Mobile Number (Optional)</FormLabel>
                                <FormControl><Input type="tel" placeholder="e.g., 07123 456789" {...field} /></FormControl>
                                <FormDescription className="text-xs">Highly recommended for local deliveries.</FormDescription>
                                <FormMessage />
                            </FormItem>
                        )} />
                    </div>
                    <FormField control={methods.control} name="addressLine1" render={({ field }) => (
                        <FormItem><FormLabel>Address Line 1 *</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                    )} />
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormField control={methods.control} name="city" render={({ field }) => (
                            <FormItem><FormLabel>City *</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                        )} />
                        <FormField control={methods.control} name="postcode" render={({ field }) => (
                            <FormItem><FormLabel>Postcode *</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                        )} />
                    </div>
                </CardContent>
              </Card>

              <Card shadow-md>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Truck className="h-5 w-5 text-primary" />
                        Fulfillment Summary
                    </CardTitle>
                    <CardDescription>Review how each store will handle your items.</CardDescription>
                </CardHeader>
                <CardContent>
                    {isLoadingSettings ? (
                        <div className="flex flex-col items-center justify-center p-12 gap-4">
                            <Loader2 className="h-8 w-8 animate-spin text-primary" />
                            <p className="text-sm text-muted-foreground animate-pulse">Calculating delivery options...</p>
                        </div>
                    ) : (
                        <div className="space-y-6 animate-in fade-in duration-500">
                            {fulfillmentGroups.map((group) => (
                                <div key={group.businessId} className="p-4 border rounded-lg bg-muted/20">
                                    <div className="flex justify-between items-start mb-4">
                                        <div>
                                            <h4 className="font-bold text-lg">{group.businessName}</h4>
                                            <Badge variant="outline" className={cn(
                                                "mt-1",
                                                group.deliveryType === 'local_courier' ? "bg-blue-50 text-blue-700 border-blue-200" :
                                                group.deliveryType === 'shop_delivery' ? "bg-green-50 text-green-700 border-green-200" : "bg-gray-50 text-gray-700"
                                            )}>
                                                {getFulfillmentLabel(group.deliveryType)}
                                            </Badge>
                                        </div>
                                    </div>
                                    <ul className="space-y-2">
                                        {group.items.map(item => (
                                            <li key={item.id} className="text-sm flex justify-between">
                                                <span>{item.quantity}x {item.name}</span>
                                                <span>£{(item.price * item.quantity).toFixed(2)}</span>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
                <CardFooter className="flex-col items-start gap-4 border-t pt-6 bg-muted/5">
                    {totalCourierFee > 0 && (
                        <Alert className="bg-blue-50 border-blue-200 text-blue-900 dark:bg-blue-900/20 dark:border-blue-700 dark:text-blue-200">
                            <MessageSquare className="h-4 w-4 text-blue-600" />
                            <AlertTitle className="font-bold">Courier Communication</AlertTitle>
                            <AlertDescription className="text-xs">
                                Since you have chosen the Local Courier, they will contact you regarding your delivery via:
                                <ul className="list-disc pl-4 mt-1 space-y-1">
                                    <li className="flex items-center gap-1.5"><Phone className="h-3 w-3" /> The mobile number provided above</li>
                                    <li className="flex items-center gap-1.5"><MessageSquare className="h-3 w-3" /> The private chat feature built into our app</li>
                                </ul>
                            </AlertDescription>
                        </Alert>
                    )}
                    <Alert variant="default" className="bg-amber-50 border-amber-200">
                        <AlertTriangle className="h-4 w-4 text-amber-600" />
                        <AlertTitle className="text-amber-800 font-bold">Important Notice</AlertTitle>
                        <AlertDescription className="text-amber-700 text-xs">
                            Only items marked as "Local Courier" will be collected and delivered by the official community courier. Items marked "Click and Collect" must be picked up from the store directly.
                        </AlertDescription>
                    </Alert>
                    <FormField
                        control={methods.control}
                        name="acknowledgedFulfillment"
                        render={({ field }) => (
                            <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                                <FormControl>
                                    <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                                </FormControl>
                                <div className="space-y-1 leading-none">
                                    <FormLabel className="text-sm font-medium cursor-pointer">
                                        I understand and wish to proceed with the specified fulfillment methods for each store.
                                    </FormLabel>
                                    <FormMessage />
                                </div>
                            </FormItem>
                        )}
                    />
                </CardFooter>
              </Card>
            </div>

            <div className="space-y-8">
                <Card className="sticky top-24 shadow-lg">
                    <CardHeader>
                        <CardTitle>Order Summary</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2 text-sm">
                            <div className="flex justify-between">
                                <span>Subtotal ({cartCount} items)</span>
                                <span>£{totalPrice.toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="flex items-center gap-1.5">
                                    Delivery Fees
                                    <TooltipProvider>
                                        <Tooltip>
                                            <TooltipTrigger asChild>
                                                <Button variant="ghost" size="icon" className="h-4 w-4 p-0">
                                                    <Info className="h-3 w-3 text-muted-foreground cursor-help" />
                                                </Button>
                                            </TooltipTrigger>
                                            <TooltipContent className="z-[100]">
                                                <p className="text-xs">Includes the local courier service fee.</p>
                                            </TooltipContent>
                                        </Tooltip>
                                    </TooltipProvider>
                                </span>
                                <span>£{totalDeliveryFee.toFixed(2)}</span>
                            </div>
                            <Separator className="my-2" />
                            <div className="flex justify-between font-bold text-lg">
                                <span>Total</span>
                                <span className="text-primary">£{total.toFixed(2)}</span>
                            </div>
                        </div>
                    </CardContent>
                    <CardFooter>
                        <Button 
                            type="submit" 
                            className="w-full h-12 text-lg font-bold" 
                            disabled={isProcessing || !methods.formState.isValid || isLoadingSettings}
                        >
                            {isProcessing ? <Loader2 className="mr-2 h-5 w-5 animate-spin"/> : <ShoppingCart className="mr-2 h-5 w-5" />}
                            Confirm & Pay
                        </Button>
                    </CardFooter>
                </Card>
            </div>
          </div>
        </form>
      </FormProvider>
    </div>
  );
}
