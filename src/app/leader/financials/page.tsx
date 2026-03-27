
'use client';

import * as React from "react";
import { format, differenceInDays, addDays } from "date-fns";
import { DateRange } from "react-day-picker";
import {
    Landmark,
    Download,
    Calendar as CalendarIcon,
    BadgeCheck,
    AlertCircle,
    XCircle,
    Clock,
    HelpCircle,
    DollarSign,
    CheckCircle,
    Circle,
    Loader2,
    Percent,
    ArrowUpDown,
    TrendingUp,
    Building2,
    Handshake,
    Info,
    ShieldAlert,
} from "lucide-react";
import { collection, query, where, onSnapshot, getDoc, doc } from "firebase/firestore";
import { useFirestore, useUser, useDoc, useMemoFirebase } from "@/firebase";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import { cn } from "@/lib/utils"
import Link from "next/link";
import { useToast } from "@/hooks/use-toast";
import { createStripeConnectAccountLinkForCommunity, createStripeDashboardLinkForCommunity } from "@/lib/actions/stripeActions";
import { getPricingPlans, type Plan } from "@/lib/actions/pricingActions";
import { Tooltip, TooltipProvider, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { PaginationControls } from "@/components/ui/pagination";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger, DialogClose } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { LegalDocumentDisplay } from "@/components/legal-document-display";
import { acceptTermsAction } from '@/lib/actions/userActions';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";


export type Payout = {
  transactionId: string
  date: string
  amount: number
  status: "Paid" | "In transit" | "Failed" | "Pending"
  community: string;
  communityId: string;
  isEligible: boolean;
}

const PayoutStatusBadge = ({ status }: { status: Payout['status'] }) => {
  const statusConfig = {
    "Paid": {
      icon: <BadgeCheck className="h-4 w-4" />,
      variant: "default",
      className: "bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300",
    },
    "In transit": {
      icon: <Clock className="h-4 w-4" />,
      variant: "secondary",
      className: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-300",
    },
     "Pending": {
      icon: <Clock className="h-4 w-4" />,
      variant: "secondary",
      className: "bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300",
    },
    "Failed": {
      icon: <XCircle className="h-4 w-4" />,
      variant: "destructive",
      className: "",
    },
  } as const;
  const config = statusConfig[status];

  return (
    <Badge variant={config.variant} className={cn("gap-1.5", config.className)}>
        {config.icon}
        {status}
    </Badge>
  )
}

const RequirementItem = ({ step, title, isMet, children }: { step: number, title: string, isMet: boolean, children: React.ReactNode }) => (
    <div className="flex items-start gap-4">
        <div className={cn(
            "flex h-8 w-8 items-center justify-center rounded-full border-2",
            isMet ? "border-green-500 bg-green-100 text-green-600" : "border-muted-foreground bg-muted text-muted-foreground"
        )}>
            {isMet ? <CheckCircle className="h-5 w-5" /> : <span className="font-bold">{step}</span>}
        </div>
        <div className="flex-1">
            <h4 className="font-semibold">{title}</h4>
            <div className="text-sm text-muted-foreground mt-1">
                {children}
            </div>
        </div>
    </div>
);


export default function FinancialsPage() {
  const { toast } = useToast();
  const router = useRouter();
  const [date, setDate] = React.useState<DateRange | undefined>({
    from: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
    to: new Date(),
  })
  
  const { user, isUserLoading } = useUser();
  const db = useFirestore();
  const userProfileRef = useMemoFirebase(() => (user ? doc(db, 'users', user.uid) : null), [user, db]);
  const { data: userProfile, isLoading: profileLoading } = useDoc(userProfileRef);
  
  const [payouts, setPayouts] = React.useState<Payout[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [businessPlan, setBusinessPlan] = React.useState<Plan | null>(null);
  const [enterprisePlan, setEnterprisePlan] = React.useState<Plan | null>(null);
  const [isStripeConnected, setIsStripeConnected] = React.useState(false);

  const [sorting, setSorting] = React.useState<{ key: keyof Payout; order: 'asc' | 'desc' }>({ key: 'date', order: 'desc' });
  const [pagination, setPagination] = React.useState({ pageIndex: 0, pageSize: 10 });
  
  const [totalMonthlyIncome, setTotalMonthlyIncome] = React.useState(0);
  const [ownerShare, setOwnerShare] = React.useState(0);
  const [communityShare, setCommunityShare] = React.useState(0);
  const [pendingPayouts, setPendingPayouts] = React.useState(0);
  const [paidPayouts, setPaidPayouts] = React.useState(0);
  const [businessSubscriptionCount, setBusinessSubscriptionCount] = React.useState(0);
  const [enterpriseSubscriptionCount, setEnterpriseSubscriptionCount] = React.useState(0);
  const [freeListingCount, setFreeListingCount] = React.useState(0);
  const [businessSubscriptionRevenue, setBusinessSubscriptionRevenue] = React.useState(0);
  const [enterpriseSubscriptionRevenue, setEnterpriseSubscriptionRevenue] = React.useState(0);

  const communityId = userProfile?.communityId;
  const [eligibility, setEligibility] = React.useState({
    isProfileComplete: false,
    termsAccepted: false,
  });
  const [loadingEligibility, setLoadingEligibility] = React.useState(true);
  const [isRedirecting, setIsRedirecting] = React.useState(false);

  const [currentRevenueShare, setCurrentRevenueShare] = React.useState<number | null>(null);
  const [revenueShareReason, setRevenueShareReason] = React.useState<string | null>(null);
  const [revenueShareHistory, setRevenueShareHistory] = React.useState<any[]>([]);

  const communityRef = useMemoFirebase(() => (communityId && db ? doc(db, 'communities', communityId) : null), [communityId, db]);
  const { data: communityData, isLoading: communityLoading } = useDoc(communityRef);
  
  const [isTermsDialogOpen, setIsTermsDialogOpen] = React.useState(false);
  const [agreed, setAgreed] = React.useState(false);
  const [isAccepting, setIsAccepting] = React.useState(false);


  React.useEffect(() => {
    if (isUserLoading || profileLoading || communityLoading) return;
    
    let complete = false;
    if (communityData) {
        setIsStripeConnected(!!communityData.stripeAccountId);
        setCurrentRevenueShare(communityData.revenueShare ?? 40);
        setRevenueShareReason(communityData.revenueShareReason);
        setRevenueShareHistory(communityData.revenueShareHistory?.sort((a: any, b: any) => b.effectiveDate.toDate() - a.effectiveDate.toDate()) || []);
        complete = communityData.status === 'active';
    }

    const accepted = !!userProfile?.financialTermsAcceptedAt;

    setEligibility({
        isProfileComplete: complete,
        termsAccepted: accepted,
    });
    setLoadingEligibility(false);

  }, [isUserLoading, profileLoading, communityLoading, userProfile, communityData]);

  React.useEffect(() => {
    if (userProfile?.role !== 'owner') {
        const fetchPlans = async () => {
            const plans = await getPricingPlans();
            if (plans.business) {
                setBusinessPlan(plans.business);
            }
             if (plans.enterprise) {
                setEnterprisePlan(plans.enterprise);
            }
        };
        fetchPlans();
    }
  }, [userProfile?.role]);

  React.useEffect(() => {
    if (!communityId || !db || !user || !businessPlan || !enterprisePlan || !communityData) {
        setLoading(false);
        return;
    }

    setLoading(true);
    
    const businessesQuery = query(
        collection(db, 'businesses'),
        where('primaryCommunityId', '==', communityId),
        where('status', '==', 'Subscribed')
    );

    const businessesUnsubscribe = onSnapshot(businessesQuery, (businessesSnapshot) => {
        let paidBizCount = 0;
        let paidEntCount = 0;
        let freeCount = 0;
        let totalBusinessRevenue = 0;
        let totalEnterpriseRevenue = 0;
        const stripeFeePercentage = 0.025;
        let currentTotalNetIncome = 0;

        businessesSnapshot.docs.forEach(doc => {
            const data = doc.data();
            
            if (data.isFreeListing) {
                freeCount++;
            } else {
                let price = 0;
                if (data.accountType === 'enterprise') {
                    price = enterprisePlan.monthlyPrice;
                    paidEntCount++;
                    totalEnterpriseRevenue += price;
                } else {
                    price = businessPlan.monthlyPrice;
                    paidBizCount++;
                    totalBusinessRevenue += price;
                }
                const netPricePerSub = price * (1 - stripeFeePercentage);
                currentTotalNetIncome += netPricePerSub;
            }
        });

        const revenueSharePercentage = (communityData?.revenueShare ?? 40) / 100;
        const totalCommunityShare = currentTotalNetIncome * revenueSharePercentage;
        
        setBusinessSubscriptionCount(paidBizCount);
        setEnterpriseSubscriptionCount(paidEntCount);
        setFreeListingCount(freeCount);

        setTotalMonthlyIncome(currentTotalNetIncome);
        setCommunityShare(totalCommunityShare);

        const generatedPayouts: Payout[] = [{
            transactionId: `payout_${communityId}_${new Date().getMonth() + 1}_${new Date().getFullYear()}`,
            date: new Date().toISOString(),
            amount: totalCommunityShare,
            status: "Pending",
            community: communityData.name,
            communityId: communityId,
            isEligible: eligibility.isProfileComplete && isStripeConnected && eligibility.termsAccepted,
        }];
        
        setPayouts(generatedPayouts);
        
        const pending = generatedPayouts.filter(p => p.status === 'Pending').reduce((acc, p) => acc + p.amount, 0);
        const paid = generatedPayouts.filter(p => p.status === 'Paid').reduce((acc, p) => acc + p.amount, 0);
        setPendingPayouts(pending);
        setPaidPayouts(paid);
        
        setLoading(false);
    });

    return () => businessesUnsubscribe();

  }, [userProfile, businessPlan, enterprisePlan, communityId, db, user, communityData, eligibility, isStripeConnected]);
  
  const handleSort = (key: keyof Payout) => {
    setSorting(prev => ({
        key,
        order: prev.key === key && prev.order === 'asc' ? 'desc' : 'asc'
    }));
  };

  const filteredPayouts = React.useMemo(() => {
      let filtered = payouts;
      if (date?.from) {
          const fromDate = date.from;
          const toDate = date.to || new Date();
          filtered = payouts.filter(payout => {
              const payoutDate = new Date(payout.date);
              return payoutDate >= fromDate && payoutDate <= toDate;
          });
      }

      return filtered.sort((a,b) => {
          const valA = a[sorting.key] ?? '';
          const valB = b[sorting.key] ?? '';
          const order = sorting.order === 'asc' ? 1 : -1;
          
          if (sorting.key === 'date') return (new Date(valA as string).getTime() - new Date(valB as string).getTime()) * order;
          if (typeof valA === 'string' && typeof valB === 'string') return valA.localeCompare(valB) * order;
          if (typeof valA === 'number' && typeof valB === 'number') return (valA - valB) * order;
          if (typeof valA === 'boolean' && typeof valB === 'boolean') return (valA === valB ? 0 : valA ? -1 : 1) * order;

          return 0;
      });
  }, [payouts, date, sorting]);

  const paginatedPayouts = React.useMemo(() => {
    const start = pagination.pageIndex * pagination.pageSize;
    const end = start + pagination.pageSize;
    return filteredPayouts.slice(start, end);
  }, [filteredPayouts, pagination]);

  const pageCount = Math.ceil(filteredPayouts.length / pagination.pageSize);

  const handleConnectStripe = async () => {
    if (!communityId) {
        toast({ title: "Error", description: "Community ID not found.", variant: "destructive" });
        return;
    }
    setIsRedirecting(true);
    const result = await createStripeConnectAccountLinkForCommunity(communityId);
    if (result.url) {
      router.push(result.url);
    } else {
      toast({ title: "Error", description: result.error, variant: "destructive" });
      setIsRedirecting(false);
    }
  };

  const handleManagePayouts = async () => {
    if (!communityId) {
        toast({ title: "Error", description: "Community ID not found.", variant: "destructive" });
        return;
    }
    setIsRedirecting(true);
    const result = await createStripeDashboardLinkForCommunity(communityId);
    if (result.url) {
        router.push(result.url);
    } else {
        toast({ title: "Error", description: result.error, variant: "destructive" });
        setIsRedirecting(false);
    }
  }
  
  const handleAcceptTerms = async () => {
    if (!user) return;
    setIsAccepting(true);
    const result = await acceptTermsAction({ userId: user.uid, termsField: 'financialTermsAcceptedAt' });
    if (result.success) {
      toast({
        title: "Terms Accepted",
        description: "Your acceptance has been recorded.",
      });
      setIsTermsDialogOpen(false); // Close the dialog
    } else {
      toast({
        title: "Error",
        description: "Could not record your acceptance. Please try again.",
        variant: 'destructive',
      });
    }
    setIsAccepting(false);
  };
  
  const canConnectStripe = eligibility.isProfileComplete && eligibility.termsAccepted;
  const allRequirementsMet = canConnectStripe && isStripeConnected;

  if (userProfile?.role !== 'president' && userProfile?.role !== 'leader') {
    return null; 
  }
  
  return (
    <div className="space-y-8">
        <div>
            <h1 className="text-3xl font-bold tracking-tight font-headline flex items-center gap-2">
                <Landmark className="h-8 w-8" />
                Financials
            </h1>
            <p className="text-muted-foreground">
                View and manage your community's earnings and Stripe connection.
            </p>
        </div>

        <Accordion type="multiple" className="w-full space-y-4">
            <AccordionItem value="item-1" className="border-0">
                <Alert variant="destructive" className="p-0 rounded-lg">
                    <AccordionTrigger className="flex w-full items-center justify-between p-4 hover:no-underline [&_svg.lucide-chevron-down]:text-destructive">
                        <div className="flex items-center gap-2">
                            <ShieldAlert className="h-4 w-4" />
                            <AlertTitle>Important: Revenue Share Activation</AlertTitle>
                        </div>
                    </AccordionTrigger>
                    <AccordionContent className="px-4 pb-4">
                        <AlertDescription className="pl-[2.1rem]">
                            Your {currentRevenueShare ?? 40}% community revenue share is only activated once your Stripe account is successfully connected and verified. Until this step is complete, 100% of the revenue generated from your community will be retained by the platform. This is to prevent communities from being held indefinitely without an active leader to receive funds.
                        </AlertDescription>
                    </AccordionContent>
                </Alert>
            </AccordionItem>

            <AccordionItem value="item-2" className="border-0">
                <Alert className="p-0 rounded-lg">
                     <AccordionTrigger className="flex w-full items-center justify-between p-4 hover:no-underline">
                        <div className="flex items-center gap-2">
                            <DollarSign className="h-4 w-4" />
                            <AlertTitle>How Payouts Work</AlertTitle>
                        </div>
                    </AccordionTrigger>
                    <AccordionContent className="px-4 pb-4">
                        <AlertDescription className="pl-[2.1rem]">
                            The "Community Revenue Share" total shows your real-time estimated earnings for the current month after Stripe fees. Your Stripe account balance will show £0.00 until Stripe processes and sends a payout to your connected bank account. Payouts are typically made on a rolling schedule (e.g., daily, weekly, or monthly).
                        </AlertDescription>
                    </AccordionContent>
                </Alert>
            </AccordionItem>
        </Accordion>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
             <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Total Monthly Net Income (from your community)</CardTitle>
                    <DollarSign className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">{new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP" }).format(totalMonthlyIncome)}</div>
                    <p className="text-xs text-muted-foreground">
                        {businessSubscriptionCount} Business & {enterpriseSubscriptionCount} Enterprise subscribers
                        {freeListingCount > 0 && ` & ${freeListingCount} Free Listing${freeListingCount > 1 ? 's' : ''}`}
                    </p>
                </CardContent>
            </Card>
             <Card>
                <CardHeader>
                    <CardTitle className="flex items-center justify-between text-sm font-medium">
                        <span className="flex items-center gap-2">
                            <Percent className="h-4 w-4 text-muted-foreground" />
                            Community Revenue Share
                        </span>
                        <span className="text-2xl font-bold text-primary">{currentRevenueShare ?? '40'}%</span>
                    </CardTitle>
                    {revenueShareReason && (
                        <CardDescription className="pt-2">{revenueShareReason}</CardDescription>
                    )}
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">{new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP" }).format(communityShare)}</div>
                    <p className="text-xs text-muted-foreground">This is an estimate for the current month after Stripe processing fees (approx 2.5%).</p>
                </CardContent>
                {revenueShareHistory && revenueShareHistory.length > 0 && (
                    <CardFooter className="p-4 border-t">
                        <Accordion type="single" collapsible className="w-full">
                            <AccordionItem value="history" className="border-b-0">
                                <AccordionTrigger className="p-0 hover:no-underline text-xs justify-start">View Change History</AccordionTrigger>
                                <AccordionContent>
                                    <ul className="space-y-2 pt-4">
                                        {revenueShareHistory.map((entry, index) => (
                                            <li key={index} className="text-sm text-muted-foreground flex justify-between items-center">
                                                <span>{entry.reason}</span>
                                                <Badge variant="secondary">{entry.share}% on {format(entry.effectiveDate.toDate(), 'dd MMM yyyy')}</Badge>
                                            </li>
                                        ))}
                                    </ul>
                                </AccordionContent>
                            </AccordionItem>
                        </Accordion>
                    </CardFooter>
                )}
            </Card>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
             <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <DollarSign className="h-5 w-5" />
                        Payout Eligibility Requirements
                    </CardTitle>
                    <CardDescription>
                        To receive revenue share, your community must meet these criteria in order.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {loadingEligibility ? (
                        <div className="flex justify-center items-center h-24">
                            <Loader2 className="h-6 w-6 animate-spin" />
                        </div>
                    ) : (
                        <div className="space-y-6">
                             <RequirementItem step={1} title="Accept Financial Terms" isMet={eligibility.termsAccepted}>
                                {eligibility.termsAccepted ? (
                                    "You have accepted the platform's financial terms and conditions."
                                ) : (
                                    <Dialog open={isTermsDialogOpen} onOpenChange={setIsTermsDialogOpen}>
                                        <DialogTrigger asChild>
                                            <Button variant="link" className="p-0 h-auto text-primary font-medium text-left">
                                                Click here to review and accept the Financial Terms.
                                            </Button>
                                        </DialogTrigger>
                                        <DialogContent className="max-w-3xl grid-rows-[auto,1fr,auto] p-0 max-h-[85vh]">
                                            <DialogHeader className="p-6 pb-2 border-b">
                                                <DialogTitle>Financial Terms & Conditions</DialogTitle>
                                                <DialogDescription>Legal terms related to revenue sharing and payouts.</DialogDescription>
                                            </DialogHeader>
                                            <ScrollArea className="h-full">
                                                <div className="p-6">
                                                    <LegalDocumentDisplay documentId="IFfaA0lcSJKIxjLxTeDG" />
                                                </div>
                                            </ScrollArea>
                                            <DialogFooter className="p-6 pt-4 border-t flex-col items-start gap-4">
                                                <div className="flex items-center space-x-2">
                                                    <Checkbox id="terms-agree" checked={agreed} onCheckedChange={(checked) => setAgreed(checked as boolean)} />
                                                    <Label htmlFor="terms-agree" className="text-sm font-normal">I have read and agree to the Financial Terms and Conditions.</Label>
                                                </div>
                                                <div className="flex justify-end w-full space-x-2">
                                                    <DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose>
                                                    <Button onClick={handleAcceptTerms} disabled={!agreed || isAccepting}>
                                                        {isAccepting && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}
                                                        Accept & Continue
                                                    </Button>
                                                </div>
                                            </DialogFooter>
                                        </DialogContent>
                                    </Dialog>
                                )}
                            </RequirementItem>
                            <RequirementItem step={2} title="Community Status: Active" isMet={eligibility.isProfileComplete}>
                                {
                                    eligibility.isProfileComplete
                                        ? "Your community has been approved by the platform administrators."
                                        : (
                                            <>
                                                Your community must be active to earn revenue. Please{' '}
                                                <Link href="/leader/profile" className="text-primary underline">
                                                    complete your leader profile
                                                </Link>
                                                {' '}to begin the review process. This status is set by platform admins.
                                            </>
                                        )
                                }
                            </RequirementItem>
                            <RequirementItem step={3} title="Connect Stripe Account" isMet={isStripeConnected}>
                                {isStripeConnected ? (
                                    "Your Stripe account is connected and ready to receive payouts."
                                ) : (
                                    <>
                                        Connect your bank account via Stripe to enable automatic payouts.
                                        <span className="mt-2 block font-semibold text-destructive/90">
                                            Revenue sharing is inactive until this step is complete.
                                        </span>
                                    </>
                                )}
                            </RequirementItem>
                        </div>
                    )}
                </CardContent>
            </Card>
             <Card>
                <CardHeader>
                    <div className="flex justify-between items-start">
                        <div>
                            <CardTitle className="flex items-center gap-2">
                                <Landmark className="h-6 w-6" />
                                Payment Account
                            </CardTitle>
                            <CardDescription>Manage your Stripe connection to accept payments.</CardDescription>
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    {isStripeConnected ? (
                         <div className="p-6 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 flex flex-col items-center text-center gap-2">
                            <BadgeCheck className="h-8 w-8 text-green-600" />
                            <h3 className="font-semibold text-green-800 dark:text-green-300">Account Connected &amp; Verified</h3>
                            <p className="text-sm text-green-700 dark:text-green-400">Ready to receive payouts.</p>
                        </div>
                    ) : (
                        <div className={cn(
                            "p-6 rounded-lg flex items-center justify-between transition-colors",
                            canConnectStripe 
                                ? "bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800"
                                : "bg-muted border"
                            )}>
                            <div className="flex items-center gap-4">
                                <AlertCircle className={cn(
                                    "h-10 w-10",
                                    canConnectStripe ? "text-amber-600" : "text-muted-foreground"
                                )} />
                                <div>
                                    <h3 className={cn(
                                        "font-semibold",
                                        canConnectStripe ? "text-amber-800 dark:text-amber-300" : "text-muted-foreground"
                                    )}>Account Not Connected</h3>
                                    <p className={cn(
                                        "text-sm",
                                        canConnectStripe ? "text-amber-700 dark:text-amber-400" : "text-muted-foreground"
                                    )}>Connect to Stripe to begin receiving payouts.</p>
                                </div>
                            </div>
                        </div>
                    )}
                     <p className="text-xs text-muted-foreground mt-4">
                        We use Stripe for secure payouts.
                        <Link href="/leader/financials/stripe-instructions" className="text-primary underline ml-1">Click here for instructions.</Link>
                    </p>
                </CardContent>
                <CardFooter>
                    {isStripeConnected ? (
                        <Button onClick={handleManagePayouts} disabled={isRedirecting} className="w-full">
                            {isRedirecting && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}
                            Manage Payouts
                        </Button>
                    ) : (
                        <TooltipProvider>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <div className="w-full">
                                        <Button onClick={handleConnectStripe} disabled={isRedirecting || !canConnectStripe} className="w-full">
                                            {isRedirecting && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}
                                            Connect with Stripe
                                        </Button>
                                    </div>
                                </TooltipTrigger>
                                {!canConnectStripe && (
                                   <TooltipContent className="max-w-xs">
                                      <p className="font-bold mb-2">Complete previous steps first</p>
                                      <p className="text-sm">You must accept the terms and have an approved community before connecting Stripe.</p>
                                   </TooltipContent>
                                )}
                            </Tooltip>
                        </TooltipProvider>
                    )}
                </CardFooter>
            </Card>
        </div>

        <Card>
            <CardHeader>
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div>
                        <CardTitle>Community Payout History</CardTitle>
                        <CardDescription>View your financial records in your secure Stripe dashboard.</CardDescription>
                    </div>
                </div>
            </CardHeader>
            <CardContent>
                <Alert>
                    <Info className="h-4 w-4" />
                    <AlertTitle>View Your Payout History in Stripe</AlertTitle>
                    <AlertDescription>
                        Your complete payout history, including dates and amounts for all past transactions, is available in your Stripe dashboard. Click the "Manage Payouts" button to securely view your full financial records.
                    </AlertDescription>
                </Alert>
            </CardContent>
        </Card>
    </div>
  )
}
