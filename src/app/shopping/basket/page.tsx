
'use client';

import * as React from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ShoppingCart, CheckCircle, Minus, Plus, Trash2, Package, Loader2 } from "lucide-react";
import { useCart } from '@/contexts/cart-context';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { Separator } from '@/components/ui/separator';
import Image from 'next/image';
import { Input } from '@/components/ui/input';

function BasketPageContent() {
  const searchParams = useSearchParams();
  const { cartItems, updateQuantity, removeItem, cartCount, totalPrice, totalDeliveryFee, clearCart } = useCart();
  const [isSuccess, setIsSuccess] = React.useState(false);
  const [isClient, setIsClient] = React.useState(false);

  React.useEffect(() => {
    setIsClient(true);
    if (searchParams.get('payment') === 'success') {
      setIsSuccess(true);
      clearCart();
    }
  }, [searchParams, clearCart]);
  
  const total = totalPrice + totalDeliveryFee;

  if (!isClient) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (isSuccess) {
    return (
      <div className="flex flex-col items-center justify-center text-center py-16">
        <CheckCircle className="h-20 w-20 text-green-500 mb-4" />
        <h1 className="text-3xl font-bold font-headline">Thank You!</h1>
        <p className="text-lg text-muted-foreground mt-2">Your order has been placed successfully.</p>
        <p className="mt-4">You will receive a confirmation email shortly.</p>
        <div className="mt-8 flex gap-4">
          <Button asChild>
            <Link href="/shopping">Continue Shopping</Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href="/orders">View My Orders</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight font-headline flex items-center gap-2">
          <ShoppingCart className="h-8 w-8" />
          My Basket
        </h1>
        <p className="text-muted-foreground">
          Review your items and proceed to checkout.
        </p>
      </div>
      {cartItems.length > 0 ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
            <Card className="lg:col-span-2">
                <CardHeader>
                    <CardTitle>Your Items ({cartCount})</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    {cartItems.map(item => (
                        <div key={item.id} className="flex items-start gap-4 border-b pb-4 last:border-b-0">
                             <div className="relative h-24 w-24 flex-shrink-0 overflow-hidden rounded-md border bg-secondary">
                                {item.image ? (
                                    <Image src={item.image} alt={item.name} fill className="object-cover" />
                                ) : (
                                    <div className="flex h-full w-full items-center justify-center">
                                        <Package className="h-8 w-8 text-muted-foreground" />
                                    </div>
                                )}
                            </div>
                            <div className="flex-1">
                                <h4 className="font-semibold">{item.name}</h4>
                                <p className="text-sm text-muted-foreground">From: {item.store}</p>
                                <p className="font-semibold mt-2">£{item.price.toFixed(2)}</p>
                            </div>
                            <div className="flex flex-col items-end gap-2">
                                <div className="flex items-center gap-2">
                                    <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => updateQuantity(item.id, item.quantity - 1)}>
                                        <Minus className="h-4 w-4" />
                                    </Button>
                                    <Input
                                        type="number"
                                        value={item.quantity}
                                        onChange={(e) => updateQuantity(item.id, Number(e.target.value))}
                                        className="h-8 w-14 text-center p-0 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                    />
                                    <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => updateQuantity(item.id, item.quantity + 1)}>
                                        <Plus className="h-4 w-4" />
                                    </Button>
                                </div>
                                 <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-destructive" onClick={() => removeItem(item.id)}>
                                    <Trash2 className="h-4 w-4 mr-1" />
                                    Remove
                                </Button>
                            </div>
                        </div>
                    ))}
                </CardContent>
            </Card>
             <Card className="sticky top-24">
                <CardHeader>
                    <CardTitle>Order Summary</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
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
                    <Button size="lg" className="w-full" asChild>
                        <Link href="/shopping/checkout">Proceed to Checkout</Link>
                    </Button>
                </CardFooter>
            </Card>
        </div>
      ) : (
        <Card className="py-24 flex flex-col items-center justify-center text-center">
            <ShoppingCart className="h-16 w-16 text-muted-foreground mb-4" />
            <CardTitle>Your Basket is Empty</CardTitle>
            <CardDescription className="mt-2">Looks like you haven't added anything yet.</CardDescription>
            <Button asChild className="mt-6">
                <Link href="/shopping">Start Shopping</Link>
            </Button>
        </Card>
      )}
    </div>
  );
}

export default function BasketPage() {
    return (
        <React.Suspense fallback={<div className="flex h-screen items-center justify-center"><Loader2 className="h-8 w-8 animate-spin" /></div>}>
            <BasketPageContent />
        </React.Suspense>
    )
}
