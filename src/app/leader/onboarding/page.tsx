'use client';

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
    CheckCircle2,
    ChevronRight,
    Loader2,
    MapPin,
    Landmark,
    AlertTriangle,
    User as UserIcon,
    Clock,
    ShieldCheck,
    ExternalLink,
    XCircle
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { useUser, useFirestore, useDoc, useMemoFirebase } from "@/firebase";
import { doc } from "firebase/firestore";
import {
    saveLeaderOnboardingStepAction,
    recordLeaderOnboardingSkipAction,
    revertExpiredOrCancelledLeaderAction,
    completeLeaderStripeVerificationAction,
} from "@/lib/actions/leaderActions";
import {
    createStripeConnectAccountLinkForCommunity,
    getCommunityStripeStatusAction,
} from "@/lib/actions/stripeActions";
import dynamic from 'next/dynamic';
import { Skeleton } from "@/components/ui/skeleton";

const CommunityBoundaryMap = dynamic(() => import("@/components/community-boundary-map"), {
  ssr: false,
  loading: () => <Skeleton className="h-[400px] w-full" />,
});

const steps = [
    { id: 1, title: 'Profile & Terms', icon: UserIcon },
    { id: 2, title: 'Community Boundary', icon: MapPin },
    { id: 3, title: 'Stripe Verification', icon: Landmark },
];

const MAX_SKIPS = 3;

export default function LeaderOnboardingPage() {
    const { user, isUserLoading } = useUser();
    const db = useFirestore();
    const { toast } = useToast();
    const router = useRouter();
    const searchParams = useSearchParams();

    const [currentStep, setCurrentStep] = React.useState(1);
    const [hasInitializedStep, setHasInitializedStep] = React.useState(false);
    const [isSaving, setIsSaving] = React.useState(false);
    const [isSkipping, setIsSkipping] = React.useState(false);
    const [isReverting, setIsReverting] = React.useState(false);
    const [showCancelConfirm, setShowCancelConfirm] = React.useState(false);

    // Stripe verification state
    const [isLaunchingStripe, setIsLaunchingStripe] = React.useState(false);
    const [isCheckingStripe, setIsCheckingStripe] = React.useState(false);
    const [stripeStatus, setStripeStatus] = React.useState<{
        hasAccount: boolean;
        connected: boolean;
        detailsSubmitted: boolean;
    } | null>(null);

    const userProfileRef = useMemoFirebase(() => (user ? doc(db, 'users', user.uid) : null), [user, db]);
    const { data: userProfile, isLoading: profileLoading } = useDoc(userProfileRef);

    const communityId = userProfile?.communityId;
    const leaderProfileRef = useMemoFirebase(
        () => (user && communityId ? doc(db, `communities/${communityId}/leader_profiles`, user.uid) : null),
        [user, communityId, db]
    );
    const { data: leaderProfile, isLoading: leaderProfileLoading } = useDoc(leaderProfileRef);

    const communityRef = useMemoFirebase(() => (communityId && db ? doc(db, 'communities', communityId) : null), [communityId, db]);
    const { data: communityData } = useDoc(communityRef);

    const isCommunityOccupied = React.useMemo(() => {
        if (!communityData) return false;
        const isApprovedActive = communityData.status === 'active' && (communityData.leaderCount || 0) > 0;
        const isCurrentUserTheLeader =
            userProfile?.role === 'president' ||
            userProfile?.communityRoles?.[communityId]?.role === 'president';
        return isApprovedActive && !isCurrentUserTheLeader;
    }, [communityData, userProfile, communityId]);

    // Trial / skip metadata (only present on new trial signups)
    const isTrialLeader = Boolean(userProfile?.leaderTrialExpiresAt);
    const skipCount = Number(userProfile?.onboardingSkipCount || 0);
    const skipsRemaining = Math.max(0, MAX_SKIPS - skipCount);
    const daysRemaining = React.useMemo(() => {
        const rawExpiry = userProfile?.leaderTrialExpiresAt;
        if (!rawExpiry) return null;
        const expiresMs = typeof rawExpiry?.toDate === 'function'
            ? rawExpiry.toDate().getTime()
            : typeof rawExpiry?.seconds === 'number'
                ? rawExpiry.seconds * 1000
                : new Date(rawExpiry).getTime();
        if (Number.isNaN(expiresMs)) return null;
        return Math.max(0, Math.ceil((expiresMs - Date.now()) / (1000 * 60 * 60 * 24)));
    }, [userProfile?.leaderTrialExpiresAt]);

    // Step 1 form state (reference fields & multi-community selector removed)
    const [contactPhone, setContactPhone] = React.useState('');
    const [preferredContactMethod, setPreferredContactMethod] = React.useState('');
    const [communityIntent, setCommunityIntent] = React.useState('');
    const [communityIntentDescription, setCommunityIntentDescription] = React.useState('');
    const [agreedToLeaderTerms, setAgreedToLeaderTerms] = React.useState(false);

    React.useEffect(() => {
        if (leaderProfile) {
            setContactPhone(leaderProfile.contactPhone || '');
            setPreferredContactMethod(leaderProfile.preferredContactMethod || '');
            setCommunityIntent(leaderProfile.communityIntent || '');
            setCommunityIntentDescription(leaderProfile.communityIntentDescription || '');
            setAgreedToLeaderTerms(leaderProfile.agreedToTerms || false);
        }
    }, [leaderProfile]);

    React.useEffect(() => {
        if (hasInitializedStep || !userProfile) return;
        const isStripeReturn = searchParams?.get('stripe_return') === 'true' || searchParams?.get('reauth') === 'true';
        if (isStripeReturn) {
            setCurrentStep(3);
            setHasInitializedStep(true);
            return;
        }
        const savedStep = Number(userProfile.onboardingStep || 1);
        setCurrentStep(Math.min(Math.max(savedStep, 1), steps.length));
        setHasInitializedStep(true);
    }, [userProfile, searchParams, hasInitializedStep]);

    const refreshStripeStatus = React.useCallback(async () => {
        if (!communityId) return;
        setIsCheckingStripe(true);
        try {
            const status = await getCommunityStripeStatusAction(communityId);
            setStripeStatus({
                hasAccount: status.hasAccount,
                connected: status.connected,
                detailsSubmitted: status.detailsSubmitted,
            });
        } finally {
            setIsCheckingStripe(false);
        }
    }, [communityId]);

    React.useEffect(() => {
        if (currentStep === 3 && communityId) {
            refreshStripeStatus();
        }
    }, [currentStep, communityId, refreshStripeStatus]);

    // Auto-complete verification if returning from Stripe with details submitted
    React.useEffect(() => {
        const isStripeReturn = searchParams?.get('stripe_return') === 'true';
        if (!isStripeReturn || !user || !communityId || !stripeStatus?.detailsSubmitted) return;

        let cancelled = false;
        (async () => {
            setIsSaving(true);
            const res = await completeLeaderStripeVerificationAction({ userId: user.uid, communityId });
            if (cancelled) return;
            setIsSaving(false);
            if (res.success && res.verified) {
                if (typeof window !== 'undefined') {
                    sessionStorage.setItem('hasSkippedOnboarding', 'true');
                }
                toast({
                    title: 'Leader Account Verified!',
                    description: 'Stripe verification confirmed. Your community hub is now live!',
                });
                router.replace('/leader/dashboard');
            }
        })();
        return () => { cancelled = true; };
    }, [searchParams, user, communityId, stripeStatus?.detailsSubmitted, router, toast]);

    const handleNextStep = async () => {
        if (!user || !communityId) return;

        if (currentStep === 1) {
            if (!contactPhone.trim() || !preferredContactMethod || !communityIntent || !agreedToLeaderTerms) {
                toast({
                    title: 'Missing Info',
                    description: 'Please complete all required fields and accept the Leader Terms & Conditions.',
                    variant: 'destructive',
                });
                return;
            }
            setIsSaving(true);
            const res = await saveLeaderOnboardingStepAction({
                userId: user.uid,
                communityId,
                step: 2,
                profileData: {
                    contactPhone: contactPhone.trim(),
                    preferredContactMethod: preferredContactMethod as 'email' | 'phone' | 'chat',
                    communityIntent: communityIntent as 'project' | 'revenue',
                    communityIntentDescription,
                    agreedToTerms: agreedToLeaderTerms,
                },
            });
            setIsSaving(false);
            if (!res.success) {
                toast({ title: 'Save Failed', description: res.error, variant: 'destructive' });
                return;
            }
            setCurrentStep(2);
            return;
        }

        if (currentStep === 2) {
            setIsSaving(true);
            const res = await saveLeaderOnboardingStepAction({
                userId: user.uid,
                communityId,
                step: 3,
            });
            setIsSaving(false);
            if (!res.success) {
                toast({ title: 'Save Failed', description: res.error, variant: 'destructive' });
                return;
            }
            setCurrentStep(3);
        }
    };

    const handlePreviousStep = () => {
        setCurrentStep((prev) => Math.max(prev - 1, 1));
    };

    const handleStartStripeOnboarding = async () => {
        if (!user || !communityId) return;
        setIsLaunchingStripe(true);
        try {
            const origin = typeof window !== 'undefined' ? window.location.origin : undefined;
            const res = await createStripeConnectAccountLinkForCommunity({
                communityId,
                userId: user.uid,
                origin,
                returnPath: '/leader/onboarding?stripe_return=true',
                refreshPath: '/leader/onboarding?reauth=true',
            });
            if (res.success && res.url) {
                window.location.href = res.url;
            } else {
                toast({ title: 'Stripe Setup Error', description: res.error || 'Could not start Stripe verification.', variant: 'destructive' });
            }
        } finally {
            setIsLaunchingStripe(false);
        }
    };

    const handleCompleteVerification = async () => {
        if (!user || !communityId) return;
        if (isCommunityOccupied) {
            toast({
                title: 'Applications Closed',
                description: `"${communityData?.name || 'This community'}" already has an active President.`,
                variant: 'destructive',
            });
            return;
        }

        setIsSaving(true);
        try {
            const res = await completeLeaderStripeVerificationAction({ userId: user.uid, communityId });
            if (res.success && res.verified) {
                if (typeof window !== 'undefined') {
                    sessionStorage.setItem('hasSkippedOnboarding', 'true');
                }
                toast({
                    title: 'Leader Account Verified!',
                    description: 'Your Stripe verification is complete and your community is now active!',
                });
                router.replace('/leader/dashboard');
            } else {
                toast({
                    title: 'Verification Incomplete',
                    description: res.error || 'Please complete your Stripe verification first.',
                    variant: 'destructive',
                });
                await refreshStripeStatus();
            }
        } finally {
            setIsSaving(false);
        }
    };

    const handleSkip = async () => {
        if (!user) return;
        if (isTrialLeader && skipsRemaining <= 0) {
            setShowCancelConfirm(true);
            return;
        }

        if (isTrialLeader) {
            setIsSkipping(true);
            const res = await recordLeaderOnboardingSkipAction({ userId: user.uid });
            setIsSkipping(false);
            if (!res.success) {
                toast({ title: 'Error', description: res.error, variant: 'destructive' });
                return;
            }
            const left = Math.max(0, MAX_SKIPS - (res.skipCount || 0));
            toast({
                title: 'Saved for Later',
                description: left > 0
                    ? `You have ${left} "Do Later" skip${left === 1 ? '' : 's'} remaining.`
                    : 'That was your final "Do Later" skip. Please complete registration next time.',
            });
        }

        if (typeof window !== 'undefined') {
            sessionStorage.setItem('hasSkippedOnboarding', 'true');
        }
        router.push('/leader/dashboard');
    };

    const handleConfirmCancelAndRevert = async () => {
        if (!user) return;
        setIsReverting(true);
        try {
            const res = await revertExpiredOrCancelledLeaderAction({ userId: user.uid, reason: 'cancelled' });
            if (res.success) {
                if (typeof window !== 'undefined') {
                    sessionStorage.removeItem('hasSkippedOnboarding');
                }
                toast({
                    title: 'Reverted to Personal Account',
                    description: 'Your leader setup was cancelled and your account has been switched back to Personal.',
                });
                router.replace('/home');
            } else {
                toast({ title: 'Error', description: res.error || 'Failed to revert account.', variant: 'destructive' });
            }
        } finally {
            setIsReverting(false);
            setShowCancelConfirm(false);
        }
    };

    const isLoading = isUserLoading || profileLoading || leaderProfileLoading;

    if (isLoading) {
        return <div className="flex justify-center items-center h-screen"><Loader2 className="h-8 w-8 animate-spin" /></div>;
    }

    const isOutOfSkips = isTrialLeader && skipsRemaining <= 0;

    return (
        <div className="min-h-[80vh] py-8 px-4 sm:px-6 lg:px-8">
            <div className="max-w-4xl mx-auto space-y-8">
                {isCommunityOccupied && (
                    <Alert variant="destructive" className="border-2 shadow-sm">
                        <AlertTriangle className="h-5 w-5" />
                        <AlertTitle className="font-bold">Community Leadership Applications Closed</AlertTitle>
                        <AlertDescription className="text-xs mt-1">
                            <strong>{communityData?.name || "This community"}</strong> already has an active, approved President.
                        </AlertDescription>
                    </Alert>
                )}

                {isTrialLeader && (
                    <Alert className="border-amber-500/60 bg-amber-50/70 dark:bg-amber-950/30">
                        <Clock className="h-4 w-4 text-amber-600" />
                        <AlertTitle className="font-bold text-amber-900 dark:text-amber-200">
                            Complete Your Leader Registration ({daysRemaining ?? 14} day{daysRemaining === 1 ? '' : 's'} left)
                        </AlertTitle>
                        <AlertDescription className="text-xs text-amber-800 dark:text-amber-300 mt-1">
                            You have full back-office access while completing these 3 steps. You have{' '}
                            <strong>{skipsRemaining} of {MAX_SKIPS}</strong> &ldquo;Do Later&rdquo; skips remaining. If not completed within 14 days, your account automatically reverts to a Personal account.
                        </AlertDescription>
                    </Alert>
                )}

                <div className="text-center space-y-2">
                    <h1 className="text-3xl font-bold tracking-tight">Leader Registration</h1>
                    <p className="text-muted-foreground">Complete these 3 quick steps to auto-verify your community leadership.</p>
                </div>

                <div className="flex justify-between items-center mb-8 relative">
                    <div className="absolute left-0 top-1/2 -translate-y-1/2 w-full h-1 bg-muted -z-10 rounded"></div>
                    <div className="absolute left-0 top-1/2 -translate-y-1/2 h-1 bg-primary -z-10 transition-all duration-300" style={{ width: `${((currentStep - 1) / (steps.length - 1)) * 100}%` }}></div>
                    {steps.map((step) => {
                        const Icon = step.icon;
                        const isCompleted = currentStep > step.id;
                        const isCurrent = currentStep === step.id;
                        return (
                            <div key={step.id} className="flex flex-col items-center space-y-2 bg-background p-2 rounded-full px-4">
                                <div className={`h-10 w-10 rounded-full flex items-center justify-center border-2 ${isCompleted ? 'bg-primary border-primary text-primary-foreground' : isCurrent ? 'border-primary text-primary' : 'border-muted text-muted-foreground bg-muted'}`}>
                                    {isCompleted ? <CheckCircle2 className="h-6 w-6" /> : <Icon className="h-5 w-5" />}
                                </div>
                                <span className={`text-sm font-medium ${isCurrent || isCompleted ? 'text-foreground' : 'text-muted-foreground'}`}>{step.title}</span>
                            </div>
                        );
                    })}
                </div>

                <div className="mt-8">
                    {currentStep === 1 && (
                        <div className="space-y-6">
                            <Card>
                                <CardHeader>
                                    <CardTitle>Leader Profile &amp; Community Plan</CardTitle>
                                    <CardDescription>
                                        New leaders start with <strong>1 community</strong>. Additional communities unlock automatically after an established track record.
                                    </CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-6">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div className="space-y-2">
                                            <Label htmlFor="contact-phone">Contact Phone Number *</Label>
                                            <Input id="contact-phone" value={contactPhone} onChange={(e) => setContactPhone(e.target.value)} placeholder="e.g., 07700 900123" />
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="contact-method">Preferred Contact Method *</Label>
                                            <Select onValueChange={setPreferredContactMethod} value={preferredContactMethod}>
                                                <SelectTrigger id="contact-method">
                                                    <SelectValue placeholder="Select a method..." />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="email">Email</SelectItem>
                                                    <SelectItem value="phone">Phone</SelectItem>
                                                    <SelectItem value="chat">Platform Chat</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Primary goal for your community hub? *</Label>
                                        <Select onValueChange={setCommunityIntent} value={communityIntent}>
                                            <SelectTrigger>
                                                <SelectValue placeholder="Select a goal..." />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="project">Fund community projects</SelectItem>
                                                <SelectItem value="revenue">Generate personal income</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Briefly describe your plans for this community hub</Label>
                                        <Textarea
                                            value={communityIntentDescription}
                                            onChange={e => setCommunityIntentDescription(e.target.value)}
                                            placeholder="e.g., Local events, supporting high street businesses, and community news..."
                                        />
                                    </div>
                                </CardContent>
                            </Card>

                            <div className="flex items-start space-x-3 bg-background p-4 rounded-md border">
                                <Checkbox
                                    id="leader-terms"
                                    checked={agreedToLeaderTerms}
                                    onCheckedChange={(checked) => setAgreedToLeaderTerms(checked as boolean)}
                                    className="mt-0.5"
                                />
                                <Label htmlFor="leader-terms" className="text-sm font-medium leading-relaxed">
                                    I agree to the Leader Terms &amp; Conditions. I understand I have <strong>14 days</strong> (and up to 3 &ldquo;Do Later&rdquo; skips) to complete registration, and that if I fail to complete it, my account will revert to Personal and any community work I started may be handed over to a new leader. *
                                </Label>
                            </div>
                        </div>
                    )}

                    {currentStep === 2 && (
                        <div className="space-y-6">
                            <Card>
                                <CardHeader>
                                    <CardTitle>Community Boundary</CardTitle>
                                    <CardDescription>Define the geographical area for your community. This helps residents find you.</CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <CommunityBoundaryMap disabled={false} />
                                </CardContent>
                            </Card>
                        </div>
                    )}

                    {currentStep === 3 && (
                        <div className="space-y-6">
                            <Card>
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2">
                                        <ShieldCheck className="h-5 w-5 text-primary" />
                                        Verify Identity &amp; Payouts with Stripe
                                    </CardTitle>
                                    <CardDescription>
                                        We use Stripe&apos;s secure verification to confirm every community leader&apos;s identity and bank details automatically—no photo uploads or manual waiting required.
                                    </CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-6">
                                    <div className="rounded-lg border p-4 bg-muted/30 space-y-2 text-sm">
                                        <p className="font-semibold">What happens next:</p>
                                        <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
                                            <li>Click <strong>Verify with Stripe</strong> below to complete Stripe&apos;s quick identity &amp; bank check.</li>
                                            <li>Once submitted, you&apos;ll be returned here and your Leader account will be <strong>auto-verified immediately</strong>.</li>
                                            <li>Your community will also be ready for event tickets, fundraising, and revenue payouts.</li>
                                        </ul>
                                    </div>

                                    {isCheckingStripe ? (
                                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                            <Loader2 className="h-4 w-4 animate-spin" />
                                            Checking Stripe verification status...
                                        </div>
                                    ) : stripeStatus?.detailsSubmitted ? (
                                        <Alert className="border-emerald-500/60 bg-emerald-50/70 dark:bg-emerald-950/30">
                                            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                                            <AlertTitle className="font-bold text-emerald-900 dark:text-emerald-200">
                                                Stripe Details Submitted
                                            </AlertTitle>
                                            <AlertDescription className="text-xs text-emerald-800 dark:text-emerald-300">
                                                Your Stripe verification is submitted. Click &ldquo;Complete &amp; Auto-Verify&rdquo; below to activate your Leader account.
                                            </AlertDescription>
                                        </Alert>
                                    ) : (
                                        <div className="flex flex-wrap items-center gap-3">
                                            <Button
                                                onClick={handleStartStripeOnboarding}
                                                disabled={isLaunchingStripe || isSaving}
                                                size="lg"
                                            >
                                                {isLaunchingStripe ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ExternalLink className="mr-2 h-4 w-4" />}
                                                {stripeStatus?.hasAccount ? 'Continue Stripe Verification' : 'Verify with Stripe'}
                                            </Button>
                                            <Button
                                                variant="outline"
                                                onClick={refreshStripeStatus}
                                                disabled={isCheckingStripe}
                                            >
                                                Refresh Status
                                            </Button>
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        </div>
                    )}
                </div>

                <div className="flex flex-wrap justify-between items-center gap-3 pt-6">
                    <div className="flex flex-wrap items-center gap-2">
                        <Button variant="outline" onClick={handlePreviousStep} disabled={currentStep === 1 || isSaving}>
                            Previous
                        </Button>
                        {isOutOfSkips ? (
                            <Button
                                variant="destructive"
                                onClick={() => setShowCancelConfirm(true)}
                                disabled={isSaving || isReverting}
                            >
                                <XCircle className="mr-2 h-4 w-4" />
                                Cancel &amp; Revert to Personal
                            </Button>
                        ) : (
                            <Button variant="ghost" onClick={handleSkip} disabled={isSaving || isSkipping}>
                                {isSkipping && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                {isTrialLeader ? `Do Later (${skipsRemaining} left)` : 'Do it later'}
                            </Button>
                        )}
                    </div>

                    {currentStep < steps.length ? (
                        <Button onClick={handleNextStep} disabled={isSaving}>
                            {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Save &amp; Continue <ChevronRight className="ml-2 h-4 w-4" />
                        </Button>
                    ) : (
                        <Button
                            onClick={handleCompleteVerification}
                            disabled={isSaving || !stripeStatus?.detailsSubmitted}
                        >
                            {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            <ShieldCheck className="mr-2 h-4 w-4" />
                            Complete &amp; Auto-Verify
                        </Button>
                    )}
                </div>
            </div>

            <AlertDialog open={showCancelConfirm} onOpenChange={setShowCancelConfirm}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Cancel Leader Registration?</AlertDialogTitle>
                        <AlertDialogDescription>
                            You&apos;ve used all {MAX_SKIPS} &ldquo;Do Later&rdquo; skips. Cancelling will immediately revert your account to a <strong>Personal</strong> account, remove the Leader Dashboard from your menu, and open the community for another leader (any content you started may be handed over).
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={isReverting}>Stay &amp; Finish Setup</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleConfirmCancelAndRevert}
                            disabled={isReverting}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                            {isReverting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Yes, Revert to Personal
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
