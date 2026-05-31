
"use client";

import * as React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CreditCard, PlusCircle, Loader2, ExternalLink } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { createCustomerPortalLink } from "@/lib/actions/stripeActions";
import { useUser } from "@/firebase";

// In a real app, this data would be fetched from your payment provider (Stripe)
const savedCards = [
    { id: "card_1", brand: "Visa", last4: "4242", expiry: "08/26" },
];

export default function PaymentMethodsPage() {
    const { toast } = useToast();
    const { user } = useUser();
    const [isRedirecting, setIsRedirecting] = React.useState(false);
    
    const handleManageBilling = async () => {
        if (!user) return;
        setIsRedirecting(true);
        const result = await createCustomerPortalLink({ userId: user.uid });
        if ('url' in result && result.url) {
            window.location.href = result.url;
        } else {
            toast({ title: "Error", description: 'url' in result ? "Could not create billing portal link." : result.error, variant: "destructive" });
        }
        setIsRedirecting(false);
    };


    return (
        <div className="space-y-8">
            <div>
                <h1 className="text-3xl font-bold tracking-tight font-headline flex items-center gap-2">
                    <CreditCard className="h-8 w-8" />
                    Payment Methods
                </h1>
                <p className="text-muted-foreground">
                    Manage your payment details. Securely handled by Stripe.
                </p>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Your Saved Cards</CardTitle>
                    <CardDescription>Add, remove, or update your payment methods via our secure Stripe portal.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    {savedCards.map((card) => (
                         <div key={card.id} className="flex items-center justify-between p-4 border rounded-lg">
                            <div className="flex items-center gap-4">
                                <CreditCard className="h-8 w-8 text-muted-foreground" />
                                <div>
                                    <p className="font-medium">{card.brand} ending in {card.last4}</p>
                                    <p className="text-sm text-muted-foreground">Expires {card.expiry}</p>
                                </div>
                            </div>
                            <Button variant="outline" size="sm" onClick={handleManageBilling} disabled={isRedirecting}>
                                {isRedirecting ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <ExternalLink className="mr-2 h-4 w-4" />}
                                Manage
                            </Button>
                        </div>
                    ))}
                    {savedCards.length === 0 && (
                        <p className="text-sm text-muted-foreground text-center py-8">No payment methods saved.</p>
                    )}
                </CardContent>
                <CardFooter>
                    <Button onClick={handleManageBilling} disabled={isRedirecting}>
                        {isRedirecting ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <PlusCircle className="mr-2 h-4 w-4" />}
                        Add New Payment Method
                    </Button>
                </CardFooter>
            </Card>
        </div>
    )
}
