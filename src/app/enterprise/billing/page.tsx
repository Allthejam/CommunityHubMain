'use client';

import * as React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Receipt, Landmark, CheckCircle, Loader2, RefreshCw, Store, Building2, Info, AlertTriangle, ShieldAlert } from "lucide-react";
import { collection, query, where, doc } from "firebase/firestore";
import { useUser, useFirestore, useCollection, useMemoFirebase, useDoc } from "@/firebase";
import { useToast } from "@/hooks/use-toast";
import { createCustomerPortalLink, createStripeConnectAccountLinkForBusiness } from "@/lib/actions/stripeActions";
import { addMonths, format, isValid } from "date-fns";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useRouter } from "next/navigation";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

type BusinessSubscription = {
    id: string;
    businessName: string;
    planName: string;
    status: 'Active' | 'Cancelled' | 'Past Due' | 'Trial' | 'None';
    renewalDate: string;
    storefront: boolean;
    isPendingCancellation: boolean;
};

export default function EnterpriseBillingPage() {
    const { user, isUserLoading: authLoading } = useUser();
    const db = useFirestore();
    const { toast } = useToast();
    const router = useRouter();
    const [isRedirecting, setIsRedirecting] = React.useState<string | null>(null);
    const [selectedBusinessId, setSelectedBusinessId] = React.useState<string | null>(null);

    const userProfileRef = useMemoFirebase(() => (user && db ? doc(db, 'users', user.uid) : null), [user, db]);
    const { data: userProfile, isLoading: profileLoading } = useDoc(userProfileRef);

    const businessesQuery = useMemoFirebase(() => {
        if (!user) return null;
        return query(collection(db, "businesses"), where("ownerId", "==", user.uid), where("accountType", "==", "enterprise"));
    }, [user, db]);

    const { data: businesses, isLoading: businessesLoading } = useCollection<any>(businessesQuery);
    
    const selectedBusiness = React.useMemo(() => 
        businesses?.find(b => b.id === selectedBusinessId)
    , [businesses, selectedBusinessId]);

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
            // Enterprise Listing check
            if (b.status === 'Subscribed' || b.listingStripeSubscriptionId || b.stripeSubscriptionId) {
                const isPending = b.listingSubscriptionStatus === 'pending_cancellation';
                const expiry = toDate(b.listingSubscriptionExpiresAt);
                const updated = toDate(b.updatedAt) || new Date();

                subs.push({
                    id: `${b.id}-ent`,
                    businessName: b.businessName,
                    planName: 'Enterprise Group',
                    status: b.listingSubscriptionStatus === 'payment_failed' ? 'Past Due' : (isPending ? 'Cancelled' : 'Active'),
                    renewalDate: expiry ? format(expiry, 'PPP') : format(addMonths(updated, 1), 'PPP'),
                    storefront: false,
                    isPendingCancellation: isPending
                });
            }

            // Storefront Sub
            if (b.storefrontSubscription === true || b.storefrontStripeSubscriptionId) {
                const isPending = b.storefrontSubscriptionStatus === 'pending_cancellation';
                const expiry = toDate(b.storefrontSubscriptionExpiresAt);
                const updated = toDate(b.updatedAt) || new Date();

                subs.push({
                    id: `${b.id}-sf`,
                    businessName: b.businessName,
                    planName: 'Storefront Add-on',
                    status: b.storefrontSubscriptionStatus === 'payment_failed' ? 'Past Due' : (isPending ? 'Cancelled' : 'Active'),
                    renewalDate: expiry ? format(expiry, 'PPP') : format(addMonths(updated, 1), 'PPP'),
                    storefront: true,
                    isPendingCancellation: isPending
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

    React.useEffect(() => {
        if (businesses && businesses.length > 0 && !selectedBusinessId) {
            setSelectedBusinessId(businesses[0].id);
        }
    }, [businesses, selectedBusinessId]);

    const loading = authLoading || businessesLoading || profileLoading;

    const handleManageBilling = async () => {
        if (!user) return;
        setIsRedirecting('portal');
        const result = await createCustomerPortalLink({userId: user.uid, returnPath: '/enterprise/billing'});
        if ('url' in result && result.url) {
            window.location.href = result.url;
        } else {
            toast({ title: "Error", description: 'url' in result ? "Could not create billing portal link." : result.error, variant: "destructive" });
            setIsRedirecting(null);
        }
    };

    const handleConnectStripe = async () => {
        if (!selectedBusinessId) return;
        setIsRedirecting('connect');
        const result = await createStripeConnectAccountLinkForBusiness(selectedBusinessId, '/enterprise/billing');
        if (result.url) router.push(result.url);
        else toast({ title: "Error", description: result.error, variant: "destructive" });
        setIsRedirecting(null);
    };

    return (
        <div className="space-y-8">
            <div>
                <h1 className="text-3xl font-bold tracking-tight font-headline flex items-center gap-2">
                    <Receipt className="h-8 w-8" />
                    Enterprise Billing & Payouts
                </h1>
                <p className="text-muted-foreground">Manage your group subscriptions and financial connections.</p>
            </div>

            {hasOrphanedStorefront && (
                <Alert variant="destructive" className="animate-pulse shadow-lg border-2">
                    <ShieldAlert className="h-5 w-5" />
                    <AlertTitle className="font-bold text-lg">Action Required: Orphaned Storefront Detected</AlertTitle>
                    <AlertDescription className="mt-2 space-y-2">
                        <p>One or more of your <strong>Enterprise Groups</strong> has a cancelled base listing but an active Storefront.</p>
                        <p className="font-semibold">Groups will NOT be displayed on the platform if the base subscription is cancelled, regardless of Storefront status.</p>
                        <p>Please resolve this in the Stripe Portal below to avoid paying for invisible services.</p>
                    </AlertDescription>
                </Alert>
            )}

            <div className="grid lg:grid-cols-3 gap-8">
                <Card className="lg:col-span-1">
                    <CardHeader>
                        <CardTitle>Subscriptions</CardTitle>
                        <CardDescription>Status for each of your enterprise groups.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {loading ? (
                            <div className="flex justify-center items-center h-24">
                                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                            </div>
                        ) : subscriptions.length > 0 ? (
                            <ScrollArea className="h-[400px] pr-4">
                                <div className="space-y-3">
                                    {subscriptions.map(sub => (
                                        <div key={sub.id} className={cn(
                                            "p-3 border rounded-lg bg-background shadow-sm",
                                            sub.isPendingCancellation && "border-amber-200 bg-amber-50/30"
                                        )}>
                                            <p className="font-semibold text-sm truncate">{sub.businessName}</p>
                                            <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                                                {sub.storefront ? <Store className="h-3 w-3 text-primary" /> : <Building2 className="h-3 w-3 text-primary" />}
                                                {sub.planName}
                                            </div>
                                            <div className="flex items-center justify-between mt-3">
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
                                    ))}
                                </div>
                            </ScrollArea>
                        ) : (
                            <p className="text-sm text-muted-foreground text-center py-8">No subscriptions found.</p>
                        )}
                    </CardContent>
                    <CardFooter>
                        <Button onClick={handleManageBilling} disabled={isRedirecting === 'portal'} className="w-full">
                            {isRedirecting === 'portal' ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <RefreshCw className="mr-2 h-4 w-4" />}
                            Open Stripe Portal
                        </Button>
                    </CardFooter>
                </Card>

                <div className="lg:col-span-2 space-y-8">
                     <Card className="border-amber-200 bg-amber-50/10">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2 text-amber-800 text-base">
                                <Info className="h-5 w-5" />
                                Enterprise Subscription Hierarchy
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4 text-xs text-amber-900/80">
                            <p>
                                <strong>Dependent Services:</strong> The Storefront is an add-on to your base Enterprise Group listing. 
                            </p>
                            <p>
                                <strong>Visibility Enforcement:</strong> If a Group Listing is cancelled or expires, that group and all its storefront products will be hidden from the platform immediately. 
                            </p>
                            <p className="font-bold text-destructive/80">
                                <strong>Refund Policy:</strong> No refunds are issued for active Storefront add-ons if the base Group Listing is allowed to lapse. Users are responsible for managing both tracks in the Stripe Portal.
                            </p>
                        </CardContent>
                    </Card>

                     <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2"><Landmark className="h-6 w-6" /> Storefront Payouts</CardTitle>
                            <CardDescription>Connect each group to Stripe to receive funds from storefront sales.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="space-y-2">
                                <Label>Group</Label>
                                <Select value={selectedBusinessId || ''} onValueChange={setSelectedBusinessId}>
                                    <SelectTrigger><SelectValue placeholder="Select group..." /></SelectTrigger>
                                    <SelectContent>
                                        {businesses?.map((biz: any) => (
                                            <SelectItem key={biz.id} value={biz.id}>{biz.businessName}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            {selectedBusiness && (
                                <div className="p-6 border rounded-xl bg-muted/20 flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        {selectedBusiness.stripeAccountId ? <CheckCircle className="h-10 w-10 text-green-500" /> : <AlertTriangle className="h-10 w-10 text-amber-500" />}
                                        <div>
                                            <h3 className="font-bold">{selectedBusiness.businessName}</h3>
                                            <p className="text-sm text-muted-foreground">{selectedBusiness.stripeAccountId ? 'Stripe Connected' : 'Not Connected'}</p>
                                        </div>
                                    </div>
                                    <Button onClick={handleConnectStripe} disabled={isRedirecting === 'connect'} variant={selectedBusiness.stripeAccountId ? 'outline' : 'default'}>
                                        {isRedirecting === 'connect' && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                        {selectedBusiness.stripeAccountId ? 'Manage Stripe' : 'Connect Stripe'}
                                    </Button>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    )
}