'use client';

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
    ArrowLeft,
    Save,
    Loader2,
    Lock,
    ShieldCheck,
    ArrowRight,
} from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger, DialogClose } from "@/components/ui/dialog";
import { LegalDocumentDisplay } from "@/components/legal-document-display";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { useUser, useFirestore, useDoc, useMemoFirebase } from "@/firebase";
import { doc } from "firebase/firestore";
import { saveLeaderProfile } from "@/lib/actions/leaderActions";

export default function LeaderProfilePage() {
    const { user, isUserLoading } = useUser();
    const db = useFirestore();
    const { toast } = useToast();
    const router = useRouter();

    const userProfileRef = useMemoFirebase(() => (user ? doc(db, 'users', user.uid) : null), [user, db]);
    const { data: userProfile, isLoading: profileLoading } = useDoc(userProfileRef);

    const communityId = userProfile?.communityId;
    const leaderProfileRef = useMemoFirebase(() => (user && communityId ? doc(db, `communities/${communityId}/leader_profiles`, user.uid) : null), [user, communityId, db]);
    const { data: leaderProfile, isLoading: leaderProfileLoading } = useDoc(leaderProfileRef);

    const [isSaving, setIsSaving] = React.useState(false);

    // Contact & terms fields
    const [contactPhone, setContactPhone] = React.useState('');
    const [preferredContactMethod, setPreferredContactMethod] = React.useState('');
    const [agreedToTerms, setAgreedToTerms] = React.useState(false);

    React.useEffect(() => {
        if (leaderProfile) {
            setContactPhone(leaderProfile.contactPhone || '');
            setPreferredContactMethod(leaderProfile.preferredContactMethod || '');
            setAgreedToTerms(leaderProfile.agreedToTerms || false);
        }
    }, [leaderProfile]);

    const isLocked = userProfile?.onboardingCompleted === true;
    const isLoading = isUserLoading || profileLoading || leaderProfileLoading;

    const handleSave = async (redirectToOnboarding: boolean) => {
        if (!user || !communityId) {
            toast({ title: 'Error', description: 'User or community not found.', variant: 'destructive' });
            return;
        }
        if (redirectToOnboarding && !agreedToTerms) {
            toast({ title: "Terms and Conditions", description: "Please agree to the Leadership Terms & Conditions to continue.", variant: "destructive" });
            return;
        }

        setIsSaving(true);
        const result = await saveLeaderProfile({
            userId: user.uid,
            profileData: {
                communityId,
                contactPhone,
                preferredContactMethod: preferredContactMethod as 'email' | 'phone' | 'chat',
                intendedCommunityCount: 1,
                agreedToTerms,
            },
            status: 'draft',
        });
        setIsSaving(false);

        if (result.success) {
            toast({ title: 'Profile Saved', description: 'Your leader contact details have been updated.' });
            if (redirectToOnboarding) {
                router.push('/leader/onboarding');
            }
        } else {
            toast({ title: 'Save Failed', description: result.error, variant: 'destructive' });
        }
    };

    if (isLoading) {
        return <div className="flex justify-center items-center h-64"><Loader2 className="h-8 w-8 animate-spin" /></div>;
    }

    return (
        <div className="space-y-8 max-w-4xl mx-auto">
            <div>
                <Button asChild variant="ghost" className="mb-4">
                    <Link href="/leader/settings">
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Back to Settings
                    </Link>
                </Button>
                <h1 className="text-3xl font-bold tracking-tight font-headline">Leader Profile</h1>
                <p className="text-muted-foreground">This information is used for administrative and verification purposes and is not displayed publicly.</p>
            </div>

            {isLocked && (
                <Alert className="border-blue-500 bg-blue-50/50 text-blue-900">
                    <Lock className="h-4 w-4" color="#3b82f6" />
                    <AlertTitle>Profile Verified &amp; Locked</AlertTitle>
                    <AlertDescription>
                        Your profile has been verified and locked to guarantee platform integrity. It cannot be edited unless community leadership is officially vacated or transferred.
                    </AlertDescription>
                </Alert>
            )}

            <Card>
                <CardHeader>
                    <CardTitle>Your Contact Information</CardTitle>
                    <CardDescription>Keep your primary contact details up to date.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <Label htmlFor="leader-name">Full Name</Label>
                            <Input id="leader-name" value={userProfile?.name || ''} disabled />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="leader-email">Account Email</Label>
                            <Input id="leader-email" value={userProfile?.email || ''} disabled />
                        </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <Label htmlFor="contact-phone">Contact Phone Number</Label>
                            <Input id="contact-phone" value={contactPhone} onChange={(e) => setContactPhone(e.target.value)} disabled={isLocked} />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="contact-method">Preferred Contact Method</Label>
                            <Select onValueChange={setPreferredContactMethod} value={preferredContactMethod} disabled={isLocked}>
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
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <ShieldCheck className="h-5 w-5 text-primary" />
                        Leadership Agreement &amp; Responsibilities
                    </CardTitle>
                    <CardDescription>
                        Important terms governing your role as a Community Leader.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4 text-sm text-muted-foreground leading-relaxed">
                    <p>
                        By agreeing to run this community, you confirm that you accept and will abide by all{' '}
                        <strong className="text-foreground">Platform &amp; Leader Terms and Conditions</strong>,{' '}
                        <strong className="text-foreground">Financial Terms</strong>, and{' '}
                        <strong className="text-foreground">Community Guidelines</strong>.
                    </p>
                    <ul className="list-disc pl-5 space-y-2">
                        <li>
                            <strong className="text-foreground">Single-Community Start:</strong> New leaders are limited to managing <strong>1 community</strong> initially. Eligibility to lead additional communities unlocks automatically after an established period of successful, compliant leadership.
                        </li>
                        <li>
                            <strong className="text-foreground">14-Day Registration &amp; Stripe Verification:</strong> To maintain leadership access, you must complete the 3-step registration (including automated identity and bank verification via Stripe) within <strong>14 days</strong> and within the 3 allowed &ldquo;Do Later&rdquo; skips.
                        </li>
                        <li>
                            <strong className="text-foreground">Account Reversion &amp; Work Handover:</strong> If registration is not completed in time or is cancelled, your account will automatically revert to a Personal account, Leader Dashboard access will be removed, and any community setup or content you created may be retained and handed over to a new leader.
                        </li>
                        <li>
                            <strong className="text-foreground">Good-Faith Stewardship &amp; Audits:</strong> Verified accounts are approved automatically, but remain subject to platform audit and review if content, financial activity, or conduct is reported.
                        </li>
                    </ul>
                </CardContent>
            </Card>

            {!isLocked && (
                <CardFooter className="flex-col items-start gap-4 px-0">
                    <div className="flex items-start space-x-2">
                        <Checkbox
                            id="terms"
                            checked={agreedToTerms}
                            onCheckedChange={(checked) => setAgreedToTerms(checked as boolean)}
                            className="mt-0.5"
                        />
                        <Label htmlFor="terms" className="text-sm font-normal leading-relaxed">
                            I have read and agree to the{' '}
                            <Dialog>
                                <DialogTrigger asChild>
                                    <span className="underline text-primary cursor-pointer">Leader Terms &amp; Conditions</span>
                                </DialogTrigger>
                                <DialogContent className="max-w-2xl grid-rows-[auto,1fr,auto] p-0 max-h-[85vh]">
                                    <DialogHeader className="p-6 pb-2 border-b">
                                        <DialogTitle>Leader Terms &amp; Conditions</DialogTitle>
                                    </DialogHeader>
                                    <ScrollArea className="h-full">
                                        <div className="p-6">
                                            <LegalDocumentDisplay documentId="leader-terms-doc-id" />
                                        </div>
                                    </ScrollArea>
                                    <DialogFooter className="p-6 pt-4 border-t">
                                        <DialogClose asChild><Button type="button">Close</Button></DialogClose>
                                    </DialogFooter>
                                </DialogContent>
                            </Dialog>
                            {' '}and accept the responsibilities outlined above.
                        </Label>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        <Button onClick={() => handleSave(true)} disabled={isSaving || !agreedToTerms}>
                            {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            <ArrowRight className="mr-2 h-4 w-4" />
                            Save &amp; Continue to Verification
                        </Button>
                        <Button variant="outline" onClick={() => handleSave(false)} disabled={isSaving}>
                            {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            <Save className="mr-2 h-4 w-4" />
                            Save Details
                        </Button>
                    </div>
                </CardFooter>
            )}
        </div>
    );
}
