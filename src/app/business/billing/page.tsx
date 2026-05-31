'use client';

import * as React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Receipt, CreditCard, Loader2, RefreshCw, Store, Building2, Info, AlertTriangle, ShieldAlert, XCircle, CheckCircle } from "lucide-react";
import { collection, query, where, doc } from "firebase/firestore";
import { useUser, useFirestore, useCollection, useMemoFirebase, useDoc } from "@/firebase";
import { useToast } from "@/hooks/use-toast";
import { createCustomerPortalLink } from "@/lib/actions/stripeActions";
import { addMonths, format, isValid } from "date-fns";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { cn } from "@/lib/utils";

type BusinessSubscription = {
    id: string;
    businessName: string;
    planName: string;
    status: 'Active' | 'Cancelled' | 'Past Due' | 'Trial' | 'None';
    renewalDate: string;
    storefront: boolean;
    isPendingCancellation: boolean;
    isPaymentFailed: boolean;
};

export default function BillingPage() {
    const { user, isUserLoading: authLoading } = useUser();
    const db = useFirestore();
    const { toast } = useToast();
    const [isRedirecting, setIsRedirecting] = React.useState(false);

    const userProfileRef = useMemoFirebase(() => (user && db ? doc(db, 'users', user.uid) : null), [user, db]);
    const { data: userProfile, isLoading: profileLoading } = useDoc(userProfileRef);

    const businessesQuery = useMemoFirebase(() => {
        if (!user) return null;
        return query(collection(db, "businesses"), where("ownerId", "==", user.uid));
    }, [user, db]);

    const { data: businesses, isLoading: businessesLoading } = useCollection<any>(businessesQuery);
    
    const toDate = (val: any): Date | null => {
        if (!val) return null;
        if (typeof val.toDate === 'function') return val.toDate();
        if (val.seconds) return new Date(val.seconds * 1000);
        const d = new Date(val);
        return isValid(d) ? d : null;
    };

    const subscriptions: BusinessSubscription[] = React.useMemo(() => {
        if (!businesses) return [];
        const subs: BusinessSubscription[] = [];

        businesses.forEach(b => {
            // 1. LISTING TRACK
            const listingSubId = b.listingStripeSubscriptionId || b.stripeSubscriptionId;
            if (listingSubId || b.status === 'Subscribed') {
                const isPending = b.listingSubscriptionStatus === 'pending_cancellation';
                const isFailed = b.listingSubscriptionStatus === 'payment_failed';
                const dbExpiry = toDate(b.listingSubscriptionExpiresAt);
                const updated = toDate(b.updatedAt) || new Date();
                
                subs.push({
                    id: `${b.id}-listing`,
                    businessName: b.businessName,
                    planName: 'Business Listing',
                    status: isFailed ? 'Past Due' : (isPending ? 'Cancelled' : 'Active'),
                    renewalDate: dbExpiry ? format(dbExpiry, 'PPP') : format(addMonths(updated, 1), 'PPP'),
                    storefront: false,
                    isPendingCancellation: isPending,
                    isPaymentFailed: isFailed
                });
            }

            // 2. STOREFRONT TRACK
            const storefrontSubId = b.storefrontStripeSubscriptionId;
            if (storefrontSubId || b.storefrontSubscription === true) {
                const isPending = b.storefrontSubscriptionStatus === 'pending_cancellation';
                const isFailed = b.storefrontSubscriptionStatus === 'payment_failed';
                const dbExpiry = toDate(b.storefrontSubscriptionExpiresAt);
                const updated = toDate(b.updatedAt) || new Date();

                subs.push({
                    id: `${b.id}-storefront`,
                    businessName: b.businessName,
                    planName: 'Storefront Add-on',
                    status: isFailed ? 'Past Due' : (isPending ? 'Cancelled' : 'Active'),
                    renewalDate: dbExpiry ? format(dbExpiry, 'PPP') : format(addMonths(updated, 1), 'PPP'),
                    storefront: true,
                    isPendingCancellation: isPending,
                    isPaymentFailed: isFailed
                });
            }
        });

        return subs;
    }, [businesses]);

    const hasOrphanedStorefront = React.useMemo(() => {
        if (!businesses) return false;
        return businesses.some(b => {
            const listingCancelled = b.listingSubscriptionStatus === 'pending_cancellation';
            const storefrontActive = b.storefrontSubscription === true && b.storefrontSubscriptionStatus !== 'pending_cancellation';
            return listingCancelled && storefrontActive;
        });
    }, [businesses]);

    const loading = authLoading || businessesLoading || profileLoading;

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
                <p className="text-muted-foreground">Manage your payment methods and subscriptions.</p>
            </div>

            {hasOrphanedStorefront && (
                <Alert variant="destructive" className="animate-pulse shadow-lg border-2">
                    <ShieldAlert className="h-5 w-5" />
                    <AlertTitle className="font-bold text-lg">Action Required: Orphaned Storefront Detected</AlertTitle>
                    <AlertDescription className="mt-2 space-y-2">
                        <p>Our records show that you have cancelled a <strong>Business Listing</strong> while keeping a <strong>Storefront Add-on</strong> active.</p>
                        <p className="font-semibold">The Storefront is a dependent upgrade. It will NOT be displayed on the platform if the base Listing is cancelled.</p>
                        <p>To avoid being charged for a service that is not visible, please either reactivate your Listing or cancel the matching Storefront subscription immediately via the portal below.</p>
                    </AlertDescription>
                </Alert>
            )}

            <div className="grid lg:grid-cols-3 gap-8">
                <Card className="lg:col-span-1">
                    <CardHeader>
                        <CardTitle>Your Subscriptions</CardTitle>
                        <CardDescription>Details for your active services.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {loading ? (
                            <div className="flex justify-center items-center h-24">
                                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                            </div>
                        ) : subscriptions.length > 0 ? (
                            subscriptions.map(sub => (
                                <div key={sub.id} className={cn(
                                    "p-3 border rounded-lg bg-background shadow-sm transition-colors",
                                    sub.isPendingCancellation && "border-amber-200 bg-amber-50/30"
                                )}>
                                    <p className="font-semibold">{sub.businessName}</p>
                                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                        {sub.storefront ? <Store className="h-4 w-4 text-primary" /> : <Building2 className="h-4 w-4 text-primary" />}
                                        {sub.planName}
                                    </div>
                                    <div className="flex items-center justify-between mt-2">
                                        <Badge className={cn(
                                            sub.status === 'Active' ? "bg-green-100 text-green-800" : 
                                            sub.status === 'Cancelled' ? "bg-amber-100 text-amber-800" : "bg-red-100 text-red-800"
                                        )}>
                                            {sub.status}
                                        </Badge>
                                        <p className="text-[10px] text-muted-foreground">
                                            {sub.isPendingCancellation ? 'Expires' : 'Renews'}: {sub.renewalDate}
                                        </p>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <p className="text-sm text-muted-foreground text-center py-8">No active subscriptions found.</p>
                        )}
                    </CardContent>
                    <CardFooter>
                        <Button onClick={handleManageBilling} disabled={isRedirecting} className="w-full">
                            {isRedirecting ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <RefreshCw className="mr-2 h-4 w-4" />}
                            Open Stripe Portal
                        </Button>
                    </CardFooter>
                </Card>

                <div className="lg:col-span-2 space-y-8">
                     <Card className="border-amber-200 bg-amber-50/10">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2 text-amber-800">
                                <Info className="h-5 w-5" />
                                Important: Subscription Hierarchies
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4 text-sm text-amber-900/80 leading-relaxed">
                            <p>
                                1. <strong>Base Listing Required:</strong> The <strong>Business Listing</strong> subscription is the base requirement for your presence on this platform. The <strong>Storefront</strong> is an optional upgrade to that listing.
                            </p>
                            <p>
                                2. <strong>Dependent Visibility:</strong> If you choose to cancel your Business Listing but leave your Storefront active, your business and its products will <span className="font-bold">NOT be displayed</span> to the public. 
                            </p>
                            <p>
                                3. <strong>No Refund Policy:</strong> We do not provide refunds for Storefront subscriptions that are left active without a valid base Listing. Attempting to maintain a Storefront without a Listing is considered an circumvention of platform terms and will result in service suspension.
                            </p>
                            <p>
                                4. <strong>Managing Multiple Services:</strong> When cancelling, please ensure you select BOTH the Listing and the Storefront in the Stripe Portal if you wish to leave the platform entirely.
                            </p>
                        </CardContent>
                    </Card>

                     <Card>
                        <CardHeader>
                            <CardTitle>Security & Payouts</CardTitle>
                            <CardDescription>All billing data is handled securely by Stripe.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <Alert>
                                <CheckCircle className="h-4 w-4 text-green-600" />
                                <AlertTitle>Self-Service Payouts</AlertTitle>
                                <AlertDescription>
                                    You can update your card details, view past invoices, and manage your connected bank account for storefront payouts directly through the portal.
                                </AlertDescription>
                            </Alert>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    )
}
