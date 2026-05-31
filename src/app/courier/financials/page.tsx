'use client';

import * as React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Landmark, Info, DollarSign, TrendingUp, Loader2, Truck, Save } from 'lucide-react';
import { useUser, useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { saveCourierDeliveryFeeAction } from '@/lib/actions/communityActions';

export default function CourierFinancialsPage() {
    const { user, isUserLoading } = useUser();
    const db = useFirestore();
    const { toast } = useToast();
    
    const userProfileRef = useMemoFirebase(() => (user ? doc(db, 'users', user.uid) : null), [user, db]);
    const { data: userProfile, isLoading: profileLoading } = useDoc(userProfileRef);

    const communityId = userProfile?.communityId;
    const communityRef = useMemoFirebase(() => (communityId ? doc(db, 'communities', communityId) : null), [communityId, db]);
    const { data: communityData, isLoading: communityLoading } = useDoc(communityRef);

    const [deliveryFee, setDeliveryFee] = React.useState<string>('0.00');
    const [isSavingFee, setIsSavingFee] = React.useState(false);

    React.useEffect(() => {
        if (communityData?.courierDeliveryFee !== undefined) {
            setDeliveryFee(communityData.courierDeliveryFee.toFixed(2));
        }
    }, [communityData]);

    const handleSaveFee = async () => {
        if (!communityId) return;
        const feeNum = parseFloat(deliveryFee);
        if (isNaN(feeNum) || feeNum < 0) {
            toast({ title: "Invalid Fee", description: "Please enter a valid positive number.", variant: "destructive" });
            return;
        }

        setIsSavingFee(true);
        const result = await saveCourierDeliveryFeeAction({
            communityId,
            fee: feeNum
        });

        if (result.success) {
            toast({ title: "Settings Saved", description: "Your delivery fee has been updated." });
        } else {
            toast({ title: "Error", description: result.error, variant: "destructive" });
        }
        setIsSavingFee(false);
    };

    if (isUserLoading || profileLoading || communityLoading) {
        return <div className="flex justify-center items-center h-96"><Loader2 className="h-8 w-8 animate-spin" /></div>;
    }

    return (
        <div className="space-y-8">
            <div>
                <h1 className="text-3xl font-bold tracking-tight font-headline flex items-center gap-2">
                    <Landmark className="h-8 w-8 text-primary" />
                    Financial Overview
                </h1>
                <p className="text-muted-foreground">
                    Track your delivery earnings and manage your service settings.
                </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 space-y-8">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">Delivery Fees (Pending)</CardTitle>
                                <Truck className="h-4 w-4 text-muted-foreground" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">£0.00</div>
                                <p className="text-xs text-muted-foreground">Earnings from completed local deliveries.</p>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">Community Revenue Share (40%)</CardTitle>
                                <TrendingUp className="h-4 w-4 text-muted-foreground" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">£0.00</div>
                                <p className="text-xs text-muted-foreground">Your share of storefront subscriptions this month.</p>
                            </CardContent>
                        </Card>
                    </div>

                    <Card>
                        <CardHeader>
                            <CardTitle>History</CardTitle>
                            <CardDescription>A record of your past delivery earnings and community payouts will appear here.</CardDescription>
                        </CardHeader>
                        <CardContent className="h-48 flex items-center justify-center text-muted-foreground italic border-2 border-dashed rounded-md">
                            No transaction history yet.
                        </CardContent>
                    </Card>
                </div>

                <div className="space-y-8">
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Truck className="h-5 w-5" />
                                Delivery Settings
                            </CardTitle>
                            <CardDescription>Configure your service for the local community.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="delivery-fee">Standard Delivery Fee (£)</Label>
                                <div className="relative">
                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">£</span>
                                    <Input 
                                        id="delivery-fee" 
                                        type="number" 
                                        step="0.01" 
                                        className="pl-7"
                                        value={deliveryFee}
                                        onChange={(e) => setDeliveryFee(e.target.value)}
                                    />
                                </div>
                                <p className="text-xs text-muted-foreground">This fee is automatically applied to any "Local Courier" orders in {userProfile?.communityName}.</p>
                            </div>
                        </CardContent>
                        <CardFooter>
                            <Button onClick={handleSaveFee} disabled={isSavingFee} className="w-full">
                                {isSavingFee ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                                Save Delivery Settings
                            </Button>
                        </CardFooter>
                    </Card>

                    <Alert>
                        <Info className="h-4 w-4" />
                        <AlertTitle>Stripe Payouts</AlertTitle>
                        <AlertDescription className="text-xs">
                            All payments are handled securely via Stripe. Your earnings will be automatically paid out to your connected bank account according to your Stripe payout schedule.
                        </AlertDescription>
                    </Alert>
                </div>
            </div>
        </div>
    );
}
