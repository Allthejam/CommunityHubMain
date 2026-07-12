'use client';

import * as React from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, ChevronRight, Loader2, Save, Send, MapPin, Landmark, User as UserIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { LegalDocumentDisplay } from "@/components/legal-document-display";
import { useToast } from "@/hooks/use-toast";
import { useUser, useFirestore, useDoc, useMemoFirebase } from "@/firebase";
import { doc } from "firebase/firestore";
import { saveLeaderProfile } from "@/lib/actions/leaderActions";
import { acceptTermsAction } from "@/lib/actions/userActions";
import dynamic from 'next/dynamic';
import { Skeleton } from "@/components/ui/skeleton";

const CommunityBoundaryMap = dynamic(() => import("@/components/community-boundary-map"), {
  ssr: false,
  loading: () => <Skeleton className="h-[400px] w-full" />,
});

const steps = [
    { id: 1, title: 'Leader Profile', icon: UserIcon },
    { id: 2, title: 'Financial Terms', icon: Landmark },
    { id: 3, title: 'Community Boundary', icon: MapPin },
];

export default function LeaderOnboardingPage() {
    const { user, isUserLoading } = useUser();
    const db = useFirestore();
    const { toast } = useToast();
    const router = useRouter();

    const [currentStep, setCurrentStep] = React.useState(1);
    const [isSaving, setIsSaving] = React.useState(false);

    const userProfileRef = useMemoFirebase(() => (user ? doc(db, 'users', user.uid) : null), [user, db]);
    const { data: userProfile, isLoading: profileLoading } = useDoc(userProfileRef);

    const communityId = userProfile?.communityId;
    const leaderProfileRef = useMemoFirebase(() => (user && communityId ? doc(db, `communities/${communityId}/leader_profiles`, user.uid) : null), [user, communityId, db]);
    const { data: leaderProfile, isLoading: leaderProfileLoading } = useDoc(leaderProfileRef);

    // Profile form state
    const [contactPhone, setContactPhone] = React.useState('');
    const [preferredContactMethod, setPreferredContactMethod] = React.useState('');
    const [intendedCommunityCount, setIntendedCommunityCount] = React.useState(1);
    const [communityIntent, setCommunityIntent] = React.useState('');
    const [communityIntentDescription, setCommunityIntentDescription] = React.useState('');
    const [refName, setRefName] = React.useState('');
    const [refEmail, setRefEmail] = React.useState('');
    const [refPhone, setRefPhone] = React.useState('');
    const [refRelationship, setRefRelationship] = React.useState('');
    const [agreedToLeaderTerms, setAgreedToLeaderTerms] = React.useState(false);

    // Financial terms state
    const [agreedToFinancialTerms, setAgreedToFinancialTerms] = React.useState(false);
    const [hasAcceptedFinancialTermsBackend, setHasAcceptedFinancialTermsBackend] = React.useState(false);

    React.useEffect(() => {
        if (leaderProfile) {
            setContactPhone(leaderProfile.contactPhone || '');
            setPreferredContactMethod(leaderProfile.preferredContactMethod || '');
            setIntendedCommunityCount(leaderProfile.intendedCommunityCount || 1);
            setCommunityIntent(leaderProfile.communityIntent || '');
            setCommunityIntentDescription(leaderProfile.communityIntentDescription || '');
            setRefName(leaderProfile.refName || '');
            setRefEmail(leaderProfile.refEmail || '');
            setRefPhone(leaderProfile.refPhone || '');
            setRefRelationship(leaderProfile.refRelationship || '');
            setAgreedToLeaderTerms(leaderProfile.agreedToTerms || false);
        }
        if (userProfile?.financialTermsAcceptedAt) {
            setHasAcceptedFinancialTermsBackend(true);
            setAgreedToFinancialTerms(true);
        }
    }, [leaderProfile, userProfile]);

    const handleNextStep = () => {
        if (currentStep === 1) {
             if (!contactPhone || !preferredContactMethod || !communityIntent || !agreedToLeaderTerms) {
                toast({ title: 'Missing Info', description: 'Please complete all required fields and accept the terms before continuing.', variant: 'destructive' });
                return;
             }
        }
        if (currentStep === 2) {
             if (!agreedToFinancialTerms) {
                toast({ title: 'Financial Terms', description: 'You must accept the financial terms before continuing.', variant: 'destructive' });
                return;
             }
        }
        setCurrentStep((prev) => Math.min(prev + 1, steps.length));
    };

    const handlePreviousStep = () => {
        setCurrentStep((prev) => Math.max(prev - 1, 1));
    };

    const handleSaveAndSubmit = async () => {
        if (!user || !communityId) {
            toast({ title: 'Error', description: 'User or community not found.', variant: 'destructive'});
            return;
        }

        setIsSaving(true);
        
        try {
            // Ensure financial terms are accepted on the backend if not already done
            if (agreedToFinancialTerms && !hasAcceptedFinancialTermsBackend) {
                const termsResult = await acceptTermsAction({ userId: user.uid, termsField: 'financialTermsAcceptedAt' });
                if (!termsResult.success) throw new Error("Failed to save financial terms acceptance");
            }

            // Save leader profile and submit application
            const result = await saveLeaderProfile({
                userId: user.uid,
                profileData: {
                    communityId,
                    contactPhone,
                    preferredContactMethod,
                    intendedCommunityCount,
                    communityIntent,
                    communityIntentDescription,
                    refName,
                    refEmail,
                    refPhone,
                    refRelationship,
                    agreedToTerms: agreedToLeaderTerms,
                    onboardingCompleted: true // Mark onboarding as completed
                },
                status: 'pending'
            });

            if (result.success) {
                toast({ title: 'Application Submitted', description: 'Your application has been submitted for verification. Welcome!'});
                router.push('/leader/dashboard');
            } else {
                toast({ title: 'Save Failed', description: result.error, variant: 'destructive'});
            }
        } catch (e: any) {
             toast({ title: 'Error', description: e.message || 'An error occurred', variant: 'destructive'});
        } finally {
            setIsSaving(false);
        }
    };

    const handleSkip = () => {
        sessionStorage.setItem('hasSkippedOnboarding', 'true');
        router.push('/leader/dashboard');
    };

    const isLoading = isUserLoading || profileLoading || leaderProfileLoading;
    
    if (isLoading) {
        return <div className="flex justify-center items-center h-screen"><Loader2 className="h-8 w-8 animate-spin" /></div>
    }

    return (
        <div className="min-h-[80vh] py-8 px-4 sm:px-6 lg:px-8">
            <div className="max-w-4xl mx-auto space-y-8">
                <div className="text-center space-y-2">
                    <h1 className="text-3xl font-bold tracking-tight">Leader Onboarding</h1>
                    <p className="text-muted-foreground">Complete these steps to access your back office.</p>
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
                        )
                    })}
                </div>

                <div className="mt-8">
                    {currentStep === 1 && (
                        <div className="space-y-6">
                            <Card>
                                <CardHeader>
                                    <CardTitle>Leader Profile Details</CardTitle>
                                    <CardDescription>Fill out your contact details and community intent.</CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-6">
                                     <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                         <div className="space-y-2">
                                            <Label htmlFor="contact-phone">Contact Phone Number *</Label>
                                            <Input id="contact-phone" value={contactPhone} onChange={(e) => setContactPhone(e.target.value)} />
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
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div className="space-y-2">
                                            <Label>How many communities do you intend to run?</Label>
                                            <Input type="number" min="1" max="10" value={intendedCommunityCount} onChange={e => setIntendedCommunityCount(Number(e.target.value))} />
                                        </div>
                                        <div className="space-y-2">
                                            <Label>Primary goal for your revenue share? *</Label>
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
                                    </div>
                                     <div className="space-y-2">
                                        <Label>Please briefly describe your plans for the community hub.</Label>
                                        <Textarea value={communityIntentDescription} onChange={e => setCommunityIntentDescription(e.target.value)} placeholder="e.g., I plan to use the funds to install new playground equipment at the park..."/>
                                    </div>
                                </CardContent>
                            </Card>

                             <Card>
                                <CardHeader>
                                    <CardTitle>Professional Reference</CardTitle>
                                    <CardDescription>Please provide one professional reference we can contact if needed.</CardDescription>
                                </CardHeader>
                                <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                     <div className="space-y-2">
                                        <Label htmlFor="ref-name">Reference's Full Name</Label>
                                        <Input id="ref-name" value={refName} onChange={e => setRefName(e.target.value)} />
                                     </div>
                                     <div className="space-y-2">
                                        <Label htmlFor="ref-relationship">Relationship to You</Label>
                                        <Input id="ref-relationship" placeholder="e.g., Former Manager, Colleague" value={refRelationship} onChange={e => setRefRelationship(e.target.value)} />
                                     </div>
                                     <div className="space-y-2">
                                        <Label htmlFor="ref-email">Reference's Email</Label>
                                        <Input id="ref-email" type="email" value={refEmail} onChange={e => setRefEmail(e.target.value)} />
                                     </div>
                                     <div className="space-y-2">
                                        <Label htmlFor="ref-phone">Reference's Phone Number</Label>
                                        <Input id="ref-phone" type="tel" value={refPhone} onChange={e => setRefPhone(e.target.value)} />
                                     </div>
                                </CardContent>
                            </Card>

                            <div className="flex items-center space-x-2 bg-background p-4 rounded-md border">
                                <Checkbox id="leader-terms" checked={agreedToLeaderTerms} onCheckedChange={(checked) => setAgreedToLeaderTerms(checked as boolean)} />
                                <Label htmlFor="leader-terms" className="text-sm font-medium">
                                    I have read and agree to the Leader Terms & Conditions. *
                                </Label>
                            </div>
                        </div>
                    )}

                    {currentStep === 2 && (
                        <div className="space-y-6">
                             <Card>
                                <CardHeader>
                                    <CardTitle>Financial Terms & Conditions</CardTitle>
                                    <CardDescription>You must accept our financial terms to be eligible for payouts.</CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                     <div className="border rounded-md h-[400px]">
                                        <ScrollArea className="h-full w-full">
                                            <div className="p-6">
                                                <LegalDocumentDisplay documentId="lOCe1cvuw9ZMsoUCPlZQ" />
                                            </div>
                                        </ScrollArea>
                                     </div>
                                     <div className="flex items-center space-x-2 bg-muted p-4 rounded-md">
                                        <Checkbox id="financial-terms" checked={agreedToFinancialTerms} onCheckedChange={(checked) => setAgreedToFinancialTerms(checked as boolean)} disabled={hasAcceptedFinancialTermsBackend} />
                                        <Label htmlFor="financial-terms" className="text-sm font-medium">
                                            I have read and agree to the Financial Terms and Conditions. *
                                        </Label>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                    )}

                    {currentStep === 3 && (
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
                </div>

                <div className="flex justify-between items-center pt-6">
                    <div className="flex space-x-2">
                        <Button variant="outline" onClick={handlePreviousStep} disabled={currentStep === 1 || isSaving}>
                            Previous
                        </Button>
                        <Button variant="ghost" onClick={handleSkip} disabled={isSaving}>
                            Do it later
                        </Button>
                    </div>
                    
                    {currentStep < steps.length ? (
                        <Button onClick={handleNextStep}>
                            Next Step <ChevronRight className="ml-2 h-4 w-4" />
                        </Button>
                    ) : (
                         <Button onClick={handleSaveAndSubmit} disabled={isSaving}>
                            {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}
                            <Send className="mr-2 h-4 w-4" />
                            Save & Submit for Verification
                        </Button>
                    )}
                </div>
            </div>
        </div>
    );
}
