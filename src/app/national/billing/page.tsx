'use client';

import * as React from 'react';
import { CreditCard, Landmark, DollarSign, History, Loader2, ArrowRight, ShieldCheck } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useUser, useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { getPricingPlans, type AdvertiserPlan } from '@/lib/actions/pricingActions';
import { createCustomerPortalLink } from '@/lib/actions/stripeActions';
import { useToast } from '@/hooks/use-toast';

export default function NationalBillingPage() {
  const { user } = useUser();
  const db = useFirestore();
  const { toast } = useToast();
  const [pricingPlan, setPricingPlan] = React.useState<AdvertiserPlan | null>(null);
  const [isPricingLoading, setIsPricingLoading] = React.useState(true);
  const [isPortalLoading, setIsPortalLoading] = React.useState(false);

  const userProfileRef = useMemoFirebase(() => (user ? doc(db, 'users', user.uid) : null), [user, db]);
  const { data: profile, isLoading: isProfileLoading } = useDoc(userProfileRef);

  React.useEffect(() => {
    const fetchPlans = async () => {
      try {
        const plans = await getPricingPlans();
        if (plans.advertiser) {
          setPricingPlan(plans.advertiser);
        }
      } catch (error) {
        console.error("Failed to fetch pricing plans:", error);
      } finally {
        setIsPricingLoading(false);
      }
    };
    fetchPlans();
  }, []);

  const handleManageBilling = async () => {
    if (!user) return;
    setIsPortalLoading(true);
    try {
      const result = await createCustomerPortalLink({
        userId: user.uid,
        returnPath: '/national/billing'
      });

      if (result.url) {
        window.location.href = result.url;
      } else {
        toast({
          title: "Portal Unavailable",
          description: result.error || "We couldn't open the billing portal. Ensure you have made at least one payment.",
          variant: "destructive"
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "An unexpected error occurred.",
        variant: "destructive"
      });
    } finally {
      setIsPortalLoading(false);
    }
  };

  if (isProfileLoading || isPricingLoading) {
    return <div className="flex justify-center items-center h-96"><Loader2 className="animate-spin text-primary" /></div>;
  }

  return (
    <div className="space-y-8 max-w-5xl mx-auto pb-16">
      <div>
        <h1 className="text-3xl font-bold tracking-tight font-headline flex items-center gap-2">
          <CreditCard className="h-8 w-8 text-primary" />
          Billing & Subscriptions
        </h1>
        <p className="text-muted-foreground">Manage your national advertiser plan and view payment history.</p>
      </div>

      <div className="grid gap-8 md:grid-cols-3">
        <Card className="md:col-span-2 border-2 shadow-sm">
          <CardHeader>
            <CardTitle>Payment Management</CardTitle>
            <CardDescription>Securely manage your credit cards and billing information via Stripe.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4 p-6 border rounded-xl bg-muted/10">
                <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center text-primary shrink-0">
                    <ShieldCheck className="h-6 w-6" />
                </div>
                <div className="flex-1">
                    <p className="font-semibold text-sm">Secure Billing Portal</p>
                    <p className="text-xs text-muted-foreground">Update payment methods, view invoices, and download receipts.</p>
                </div>
            </div>
          </CardContent>
          <CardFooter className="border-t pt-6 bg-muted/10">
            <Button onClick={handleManageBilling} disabled={isPortalLoading} variant="outline" className="w-full sm:w-auto">
                {isPortalLoading ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                    <Landmark className="mr-2 h-4 w-4" />
                )}
                Manage with Stripe Portal
            </Button>
          </CardFooter>
        </Card>

        <Card className="border-2 shadow-sm">
          <CardHeader>
            <CardTitle>Plan Summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-4 bg-primary/5 border rounded-xl border-primary/20 text-center">
                <p className="text-sm font-semibold uppercase text-primary">National Advertiser</p>
                <p className="text-3xl font-bold mt-1">Pay Per Campaign</p>
                <p className="text-xs text-muted-foreground mt-1">Multi-region performance pricing</p>
            </div>
            <div className="space-y-2 text-xs">
                <div className="flex justify-between py-1 border-b">
                    <span className="text-muted-foreground">Featured Ad Price:</span>
                    <span className="font-bold">
                      {pricingPlan ? `From £${pricingPlan.featuredAdPrice.toLocaleString()}` : '£149'}
                    </span>
                </div>
                <div className="flex justify-between py-1">
                    <span className="text-muted-foreground">Partner Ad Price:</span>
                    <span className="font-bold">
                      {pricingPlan ? `From £${pricingPlan.partnerAdPrice.toLocaleString()}` : '£49'}
                    </span>
                </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-2 shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <History className="h-5 w-5 text-primary" />
            Transaction History
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-xl border overflow-hidden">
            <Table>
              <TableHeader className="bg-muted/40">
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Invoice</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow>
                  <TableCell colSpan={5} className="text-center h-24 text-muted-foreground text-xs">
                    No transactions found for this account. Your history will appear here once your first campaign is active.
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
