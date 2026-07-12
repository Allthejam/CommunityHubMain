
'use client';

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
    ArrowLeft,
    Save,
    Loader2,
    Send,
    HelpCircle,
    Lock,
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
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger, DialogClose } from "@/components/ui/dialog";
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

    // Form fields
    const [contactPhone, setContactPhone] = React.useState('');
    const [preferredContactMethod, setPreferredContactMethod] = React.useState('');
    const [intendedCommunityCount, setIntendedCommunityCount] = React.useState(1);
    const [communityIntent, setCommunityIntent] = React.useState('');
    const [communityIntentDescription, setCommunityIntentDescription] = React.useState('');
    const [refName, setRefName] = React.useState('');
    const [refEmail, setRefEmail] = React.useState('');
    const [refPhone, setRefPhone] = React.useState('');
    const [refRelationship, setRefRelationship] = React.useState('');
    const [agreedToTerms, setAgreedToTerms] = React.useState(false);

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
            setAgreedToTerms(leaderProfile.agreedToTerms || false);
        }
    }, [leaderProfile]);

    const isLocked = userProfile?.onboardingCompleted === true;
    const isLoading = isUserLoading || profileLoading || leaderProfileLoading;
    
    const handleSave = async (status: 'draft' | 'pending') => {
        if (!user || !communityId) {
            toast({ title: 'Error', description: 'User or community not found.', variant: 'destructive'});
            return;
        }
         if (status === 'pending' && !agreedToTerms) {
            toast({ title: "Terms and Conditions", description: "You must agree to the terms to submit your profile.", variant: "destructive" });
            return;
        }

        setIsSaving(true);
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
                agreedToTerms,
            },
            status
        });
        setIsSaving(false);
        if (result.success) {
            toast({ title: 'Profile Saved', description: `Your profile has been saved as a ${status}.`});
            if (status === 'pending') {
                router.push('/leader/dashboard');
            }
        } else {
            toast({ title: 'Save Failed', description: result.error, variant: 'destructive'});
        }
    };
    
    if (isLoading) {
        return <div className="flex justify-center items-center h-64"><Loader2 className="h-8 w-8 animate-spin" /></div>
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
                    <AlertTitle>Profile Locked</AlertTitle>
                    <AlertDescription>
                        Your profile has been submitted and is now locked to guarantee platform integrity. It cannot be edited unless community leadership is officially vacated or transferred.
                    </AlertDescription>
                </Alert>
            )}

            <Card>
                <CardHeader>
                    <CardTitle>Your Information</CardTitle>
                    <CardDescription>Keep your contact and reference details up to date.</CardDescription>
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
                    <CardTitle>Community Intent</CardTitle>
                    <CardDescription>Help us understand your goals for the community.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <Label>How many communities do you intend to run?</Label>
                            <Input type="number" min="1" max="10" value={intendedCommunityCount} onChange={e => setIntendedCommunityCount(Number(e.target.value))} disabled={isLocked} />
                        </div>
                        <div className="space-y-2">
                            <Label>Primary goal for your revenue share?</Label>
                             <Select onValueChange={setCommunityIntent} value={communityIntent} disabled={isLocked}>
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
                        <Textarea value={communityIntentDescription} onChange={e => setCommunityIntentDescription(e.target.value)} placeholder="e.g., I plan to use the funds to install new playground equipment at the park..." disabled={isLocked} />
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
                        <Input id="ref-name" value={refName} onChange={e => setRefName(e.target.value)} disabled={isLocked} />
                     </div>
                     <div className="space-y-2">
                        <Label htmlFor="ref-relationship">Relationship to You</Label>
                        <Input id="ref-relationship" placeholder="e.g., Former Manager, Colleague" value={refRelationship} onChange={e => setRefRelationship(e.target.value)} disabled={isLocked} />
                     </div>
                     <div className="space-y-2">
                        <Label htmlFor="ref-email">Reference's Email</Label>
                        <Input id="ref-email" type="email" value={refEmail} onChange={e => setRefEmail(e.target.value)} disabled={isLocked} />
                     </div>
                     <div className="space-y-2">
                        <Label htmlFor="ref-phone">Reference's Phone Number</Label>
                        <Input id="ref-phone" type="tel" value={refPhone} onChange={e => setRefPhone(e.target.value)} disabled={isLocked} />
                     </div>
                </CardContent>
            </Card>

            {!isLocked && (
                <CardFooter className="flex-col items-start gap-4 px-0">
                    <div className="flex items-center space-x-2">
                        <Checkbox id="terms" checked={agreedToTerms} onCheckedChange={(checked) => setAgreedToTerms(checked as boolean)} />
                        <Label htmlFor="terms" className="text-sm font-normal">
                            I have read and agree to the{' '}
                            <Dialog>
                                <DialogTrigger asChild>
                                    <span className="underline text-primary cursor-pointer">Leader Terms & Conditions</span>
                                </DialogTrigger>
                                 <DialogContent className="max-w-2xl grid-rows-[auto,1fr,auto] p-0 max-h-[85vh]">
                                    <DialogHeader className="p-6 pb-2 border-b">
                                        <DialogTitle>Leader Terms & Conditions</DialogTitle>
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
                            .
                        </Label>
                    </div>
                     <div className="flex flex-wrap gap-2">
                        <Button onClick={() => handleSave('pending')} disabled={isSaving || !agreedToTerms}>
                            {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}
                            <Send className="mr-2 h-4 w-4" />
                            Save & Submit for Verification
                        </Button>
                         <Button variant="outline" onClick={() => handleSave('draft')} disabled={isSaving}>
                            {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}
                            <Save className="mr-2 h-4 w-4" />
                            Save as Draft
                        </Button>
                    </div>
                </CardFooter>
            )}
        </div>
    );
}

