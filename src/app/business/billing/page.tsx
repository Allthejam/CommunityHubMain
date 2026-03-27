
"use client";

import * as React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Receipt, Download, CreditCard, PlusCircle, Loader2, ExternalLink, RefreshCw, Store, Building2 } from "lucide-react";
import { collection, query, where } from "firebase/firestore";
import { useUser, useFirestore, useCollection, useMemoFirebase } from "@/firebase";
import { useToast } from "@/hooks/use-toast";
import { createCustomerPortalLink } from "@/lib/actions/stripeActions";
import { addMonths, format } from "date-fns";

type Invoice = {
    id: string;
    date: string;
    amount: string;
    status: "Paid" | "Pending" | "Failed";
    description: string;
};

type BusinessSubscription = {
    id: string;
    businessName: string;
    planName: string;
    status: 'Active' | 'Cancelled' | 'Past Due'; // Assuming these statuses
    renewalDate: string;
    storefront: boolean;
};

// In a real app, this data would be fetched from your payment provider (Stripe)
const savedCards: any[] = [];


export default function BillingPage() {
    const { user, isUserLoading: authLoading } = useUser();
    const db = useFirestore();
    const { toast } = useToast();
    const [isRedirecting, setIsRedirecting] = React.useState(false);

    const businessesQuery = useMemoFirebase(() => {
        if (!user) return null;
        return query(collection(db, "businesses"), where("ownerId", "==", user.uid));
    }, [user, db]);

    const { data: businesses, isLoading: businessesLoading } = useCollection<any>(businessesQuery);
    
    const invoicesQuery = useMemoFirebase(() => {
        if (!user || !db) return null;
        return query(collection(db, "invoices"), where("ownerId", "==", user.uid));
    }, [user, db]);

    const { data: invoices, isLoading: invoicesLoading } = useCollection<Invoice>(invoicesQuery);


    const subscriptions: BusinessSubscription[] = React.useMemo(() => {
        if (!businesses) return [];
        return businesses
            .filter(b => b.status === 'Subscribed')
            .map(b => {
                const subscribedAt = b.updatedAt?.toDate() || new Date();
                return {
                    id: b.id,
                    businessName: b.businessName,
                    planName: b.storefrontSubscription ? 'Storefront Plan' : 'Business Plan',
                    status: 'Active',
                    renewalDate: format(addMonths(subscribedAt, 1), 'PPP'),
                    storefront: b.storefrontSubscription || false,
                };
            });
    }, [businesses]);

    const loading = authLoading || businessesLoading || invoicesLoading;

    const handleManageBilling = async () => {
        if (!user) return;
        setIsRedirecting(true);
        const result = await createCustomerPortalLink({userId: user.uid, returnPath: '/business/billing'});
        if ('url' in result && result.url) {
            window.location.href = result.url;
        } else {
            toast({ title: "Error", description: 'url' in result ? "Could not create billing portal link." : result.error, variant: "destructive" });
            setIsRedirecting(false);
        }
    };


    return (
        <div className="space-y-8">
            <div>
                <h1 className="text-3xl font-bold tracking-tight font-headline flex items-center gap-2">
                    <Receipt className="h-8 w-8" />
                    Billing & Invoices
                </h1>
                <p className="text-muted-foreground">
                    View your invoices, manage payment methods, and update subscription details.
                </p>
            </div>

            <div className="grid lg:grid-cols-3 gap-8">
                <Card className="lg:col-span-1">
                    <CardHeader>
                        <CardTitle>Your Subscriptions</CardTitle>
                        <CardDescription>Details for your active business subscriptions.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {loading ? (
                            <div className="flex justify-center items-center h-24">
                                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                            </div>
                        ) : subscriptions.length > 0 ? (
                            subscriptions.map(sub => (
                                <div key={sub.id} className="p-3 border rounded-lg bg-background">
                                    <p className="font-semibold">{sub.businessName}</p>
                                    <div className="flex items-center gap-2 text-sm">
                                        {sub.storefront ? <Store className="h-4 w-4 text-primary" /> : <Building2 className="h-4 w-4 text-primary" />}
                                        {sub.planName}
                                    </div>
                                    <div className="flex items-center justify-between mt-2">
                                        <Badge className="bg-green-100 text-green-800">{sub.status}</Badge>
                                        <p className="text-xs text-muted-foreground">Renews: {sub.renewalDate}</p>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <p className="text-sm text-muted-foreground text-center py-8">No active subscriptions found.</p>
                        )}
                    </CardContent>
                    <CardFooter>
                        <Button onClick={handleManageBilling} disabled={isRedirecting}>
                            {isRedirecting ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <RefreshCw className="mr-2 h-4 w-4" />}
                            Manage Subscriptions & Billing
                        </Button>
                    </CardFooter>
                </Card>

                <div className="lg:col-span-2 space-y-8">
                     <Card>
                        <CardHeader>
                            <CardTitle>Payment Methods</CardTitle>
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
                                </div>
                            ))}
                            {savedCards.length === 0 && (
                                <div className="text-center py-8 border-2 border-dashed rounded-lg">
                                    <p className="text-sm text-muted-foreground">No payment methods saved.</p>
                                    <Button variant="outline" size="sm" className="mt-4" onClick={handleManageBilling} disabled={isRedirecting}>
                                        {isRedirecting ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <PlusCircle className="mr-2 h-4 w-4" />}
                                        Add Payment Method
                                    </Button>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Invoice History</CardTitle>
                    <CardDescription>A record of all your payments and subscriptions.</CardDescription>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Invoice ID</TableHead>
                                <TableHead>Date</TableHead>
                                <TableHead>Amount</TableHead>
                                <TableHead>Description</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead></TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {loading ? (
                                <TableRow>
                                    <TableCell colSpan={6} className="h-24 text-center">
                                        <Loader2 className="h-6 w-6 animate-spin mx-auto" />
                                    </TableCell>
                                </TableRow>
                            ) : invoices && invoices.length > 0 ? (
                                invoices.map((invoice) => (
                                    <TableRow key={invoice.id}>
                                        <TableCell className="font-mono text-xs">{invoice.id}</TableCell>
                                        <TableCell>{invoice.date}</TableCell>
                                        <TableCell>{invoice.amount}</TableCell>
                                        <TableCell>{invoice.description}</TableCell>
                                        <TableCell><Badge variant={invoice.status === 'Paid' ? 'default' : 'secondary'} className={invoice.status === 'Paid' ? "bg-green-100 text-green-800" : ""}>{invoice.status}</Badge></TableCell>
                                        <TableCell className="text-right">
                                            <Button variant="outline" size="sm">
                                                <Download className="mr-2 h-4 w-4" />
                                                Download
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))
                            ) : (
                                <TableRow>
                                    <TableCell colSpan={6} className="h-24 text-center">
                                        No invoices found.
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    )
}
