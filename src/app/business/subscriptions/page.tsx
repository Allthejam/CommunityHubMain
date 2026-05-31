
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
import { WalletCards, BadgeCheck, XCircle, Loader2, ExternalLink } from "lucide-react";
import { collection, query, where } from "firebase/firestore";
import { useUser, useFirestore, useCollection, useMemoFirebase } from "@/firebase";
import { useToast } from "@/hooks/use-toast";
import { createCustomerPortalLink } from "@/lib/actions/stripeActions";

type Subscription = {
    id: string;
    name: string;
    status: "Active" | "Cancelled" | "Past Due";
    price: string;
    nextPayment: string;
};

const StatusIcon = ({ status }: { status: Subscription['status'] }) => {
    if (status === 'Active') return <BadgeCheck className="h-5 w-5 text-green-500" />;
    if (status === 'Cancelled') return <XCircle className="h-5 w-5 text-muted-foreground" />;
    if (status === 'Past Due') return <XCircle className="h-5 w-5 text-destructive" />;
    return null;
}

export default function SubscriptionsPage() {
    const { user, isUserLoading: authLoading } = useUser();
    const db = useFirestore();
    const { toast } = useToast();
    const [isRedirecting, setIsRedirecting] = React.useState(false);

    const subscriptionsQuery = useMemoFirebase(() => {
        if (!user || !db) return null;
        return query(collection(db, "subscriptions"), where("ownerId", "==", user.uid));
    }, [user, db]);

    const { data: subscriptions, isLoading: subscriptionsLoading } = useCollection<Subscription>(subscriptionsQuery);

    const loading = authLoading || subscriptionsLoading;
    
    const handleManageBilling = async () => {
        if (!user) return;
        setIsRedirecting(true);
        const result = await createCustomerPortalLink({userId: user.uid});
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
                    <WalletCards className="h-8 w-8" />
                    My Subscriptions
                </h1>
                <p className="text-muted-foreground">
                    Manage your active and past subscriptions.
                </p>
            </div>

            <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                    <div>
                        <CardTitle>Active & Past Subscriptions</CardTitle>
                        <CardDescription>All your subscriptions are managed securely via our payment provider.</CardDescription>
                    </div>
                    <Button onClick={handleManageBilling} disabled={isRedirecting}>
                        {isRedirecting ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <ExternalLink className="mr-2 h-4 w-4" />}
                        Manage Billing
                    </Button>
                </CardHeader>
                <CardContent className="space-y-4">
                     {loading ? (
                        <div className="flex justify-center items-center h-40">
                            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                        </div>
                    ) : subscriptions && subscriptions.length > 0 ? (
                        subscriptions.map((sub) => (
                             <div key={sub.id} className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 border rounded-lg gap-4">
                                <div className="flex items-center gap-4">
                                    <StatusIcon status={sub.status} />
                                    <div>
                                        <p className="font-medium">{sub.name}</p>
                                        <p className="text-sm text-muted-foreground">
                                            {sub.price}
                                            {sub.status === 'Active' && ` (Next payment: ${sub.nextPayment})`}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        ))
                     ) : (
                        <div className="flex justify-center items-center h-40 text-muted-foreground">
                            You have no active or past subscriptions.
                        </div>
                     )}
                </CardContent>
            </Card>
        </div>
    )
}
