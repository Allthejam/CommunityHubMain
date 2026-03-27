'use client';

import * as React from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { ShoppingCart, CheckCircle, Minus, Plus, Trash2, Package, Loader2 } from "lucide-react";
import { useCart } from '@/contexts/cart-context';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { Separator } from '@/components/ui/separator';
import { useUser } from '@/firebase';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import Image from 'next/image';
import { useToast } from '@/hooks/use-toast';
import { createCheckoutSession } from '@/lib/actions/stripeActions';

const addressSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Invalid email address'),
  mobileNumber: z.string().optional(),
  addressLine1: z.string().min(1, 'Address is required'),
  addressLine2: z.string().optional(),
  city: z.string().min(1, 'City is required'),
  postcode: z.string().min(1, 'Postcode is required'),
});

type AddressFormValues = z.infer<typeof addressSchema>;

export default function CheckoutPage() {
  const { cartItems, totalPrice, cartCount, clearCart, totalDeliveryFee } = useCart();
  const { user } = useUser();
  const [isProcessing, setIsProcessing] = React.useState(false);
  const { toast } = useToast();
  const router = useRouter();

  const form = useForm<AddressFormValues>({
    resolver: zodResolver(addressSchema),
    defaultValues: {
      name: user?.displayName || '',
      email: user?.email || '',
      mobileNumber: '',
      addressLine1: '',
      addressLine2: '',
      city: '',
      postcode: '',
    },
  });

  const total = totalPrice + totalDeliveryFee;

  async function onSubmit(data: AddressFormValues) {
    if (!user) {
        toast({ title: "Please sign in", description: "You must be logged in to place an order.", variant: "destructive" });
        return;
    }
    
    setIsProcessing(true);
    
    try {
        const shippingAddress = `${data.name}, ${data.addressLine1}, ${data.addressLine2 ? data.addressLine2 + ', ' : ''}${data.city}, ${data.postcode}`;

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
            totalDeliveryFee: totalDeliveryFee,
            successUrlPath: '/shopping/basket?payment=success',
            cancelUrlPath: '/shopping/checkout',
            metadata: {
                userId: user.uid,
                purchaseType: 'cart_checkout',
                shippingAddress: shippingAddress,
            }
        });

        if (result.url) {
            router.push(result.url);
        } else {
            throw new Error(result.error || "Could not initiate payment process.");
        }

    } catch (error: any) {
        toast({ title: "Error", description: error.message, variant: "destructive" });
        setIsProcessing(false);
    }
  }

  return (
    <div className="container mx-auto max-w-4xl py-8">
      <h1 className="text-3xl font-bold font-headline mb-8">Checkout</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
        <div>
          <Card>
            <CardHeader>
              <CardTitle>Shipping Details</CardTitle>
            </CardHeader>
             <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4" id="shipping-form">
                    <CardContent>
                      <FormField
                        control={form.control}
                        name="name"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Full Name</FormLabel>
                            <FormControl>
                              <Input {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="email"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Email Address</FormLabel>
                            <FormControl>
                              <Input type="email" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                       <FormField
                        control={form.control}
                        name="mobileNumber"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Mobile Number (Optional)</FormLabel>
                            <FormControl>
                              <Input type="tel" {...field} value={field.value || ''} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="addressLine1"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Address Line 1</FormLabel>
                            <FormControl>
                              <Input {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                       <FormField
                        control={form.control}
                        name="addressLine2"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Address Line 2 (Optional)</FormLabel>
                            <FormControl>
                              <Input {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                       <div className="grid grid-cols-2 gap-4">
                         <FormField
                            control={form.control}
                            name="city"
                            render={({ field }) => (
                            <FormItem>
                                <FormLabel>City</FormLabel>
                                <FormControl>
                                <Input {...field} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="postcode"
                            render={({ field }) => (
                            <FormItem>
                                <FormLabel>Postcode</FormLabel>
                                <FormControl>
                                <Input {...field} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                            )}
                        />
                       </div>
                    </CardContent>
                </form>
            </Form>
          </Card>
        </div>
        <div>
          <Card>
            <CardHeader>
              <CardTitle>Order Summary ({cartCount} {cartCount > 1 ? 'items' : 'item'})</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="max-h-64 overflow-y-auto space-y-4 pr-2">
                {cartItems.map(item => (
                   <div key={item.id} className="flex items-center gap-4">
                        <div className="relative h-16 w-16 flex-shrink-0 overflow-hidden rounded-md border">
                            <Image src={item.image || ''} alt={item.name} fill className="object-cover" />
                        </div>
                        <div className="flex-1">
                            <p className="font-semibold">{item.name}</p>
                            <p className="text-sm text-muted-foreground">{item.quantity} x £{item.price.toFixed(2)}</p>
                        </div>
                        <p className="font-semibold">£{(item.price * item.quantity).toFixed(2)}</p>
                   </div>
                ))}
              </div>
              <Separator />
               <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                        <span>Subtotal</span>
                        <span>£{totalPrice.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                        <span>Delivery</span>
                        <span>£{totalDeliveryFee.toFixed(2)}</span>
                    </div>
                    <Separator />
                    <div className="flex justify-between font-bold text-base">
                        <span>Total</span>
                        <span>£{total.toFixed(2)}</span>
                    </div>
                </div>
            </CardContent>
            <CardFooter>
                 <Button type="submit" form="shipping-form" className="w-full" size="lg" disabled={isProcessing}>
                    {isProcessing ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : null}
                    Place Order & Pay
                </Button>
            </CardFooter>
          </Card>
        </div>
      </div>
    </div>
  );
}
