
'use client';

import * as React from 'react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  ArrowLeft,
  CheckCircle,
  Loader2,
  Send,
  Shield,
  Search,
  UserPlus,
  Mail,
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useUser, useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { CommunitySelector, type CommunitySelection } from '@/components/community-selector';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { createLiaisonApplicationAction, inviteExistingMemberToApplyAction, inviteExternalPersonToApplyAction } from '@/lib/actions/liaisonActions';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { searchCommunityMembersAction } from '@/lib/actions/teamActions';
import { useDebouncedCallback } from 'use-debounce';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

type FoundUser = {
  id: string;
  name: string;
  email: string;
  avatar: string;
};

export default function ApplyForLiaisonPage() {
  const { user } = useUser();
  const db = useFirestore();
  const { toast } = useToast();
  const router = useRouter();

  const userProfileRef = useMemoFirebase(() => (user ? doc(db, 'users', user.uid) : null), [user, db]);
  const { data: userProfile } = useDoc(userProfileRef);

  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [showConfirmation, setShowConfirmation] = React.useState(false);

  // Form State
  const [applicationType, setApplicationType] = React.useState('self');
  const [applicantName, setApplicantName] = React.useState('');
  const [applicantTitle, setApplicantTitle] = React.useState('');
  const [communitySelection, setCommunitySelection] = React.useState<CommunitySelection | null>(null);
  const [justification, setJustification] = React.useState('');
  
  const [stationName, setStationName] = React.useState('');
  const [stationAddress, setStationAddress] = React.useState('');
  const [stationPhoneNumber, setStationPhoneNumber] = React.useState('');
  const [referenceName, setReferenceName] = React.useState('');
  const [referenceTitle, setReferenceTitle] = React.useState('');
  
  // Nomination State
  const [nomineeIsMember, setNomineeIsMember] = React.useState<'yes' | 'no' | null>(null);
  const [searchQuery, setSearchQuery] = React.useState('');
  const [searchResults, setSearchResults] = React.useState<FoundUser[]>([]);
  const [isSearching, setIsSearching] = React.useState(false);
  const [selectedNominee, setSelectedNominee] = React.useState<FoundUser | null>(null);
  const [externalNomineeName, setExternalNomineeName] = React.useState('');
  const [externalNomineeEmail, setExternalNomineeEmail] = React.useState('');

  const wordCount = justification.trim().split(/\s+/).filter(Boolean).length;
  
  React.useEffect(() => {
    if (userProfile) {
        if (applicationType === 'self') {
            setApplicantName(userProfile.name || '');
            setApplicantTitle(userProfile.title || '');
        } else {
            setApplicantName('');
            setApplicantTitle('');
        }
    }
  }, [userProfile, applicationType]);
  
  const debouncedSearch = useDebouncedCallback(async (query: string) => {
    if (query.length < 3 || !userProfile?.communityId) {
      setSearchResults([]);
      return;
    }
    setIsSearching(true);
    const result = await searchCommunityMembersAction({ communityId: userProfile.communityId, query });
    setSearchResults(result.users);
    setIsSearching(false);
  }, 500);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
    debouncedSearch(e.target.value);
  }

  const isSelfFormComplete = applicationType === 'self' && applicantName && applicantTitle && communitySelection?.community && justification && stationName && stationPhoneNumber && wordCount >= 20;

  const isNominationFormComplete = 
    applicationType === 'nominate' &&
    !!communitySelection?.community &&
    (
        (nomineeIsMember === 'yes' && !!selectedNominee) ||
        (nomineeIsMember === 'no' && !!externalNomineeName.trim() && !!externalNomineeEmail.trim())
    );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !userProfile || !communitySelection?.community || !communitySelection?.communityName) {
        toast({ title: 'Error', description: 'Missing user or community information.', variant: 'destructive' });
        return;
    }

    setIsSubmitting(true);

    if (applicationType === 'self') {
        if (!isSelfFormComplete) {
            toast({ title: 'Missing Fields', description: 'Please fill out all required fields for your application.', variant: 'destructive' });
            setIsSubmitting(false);
            return;
        }
        const result = await createLiaisonApplicationAction({
            applicantId: user.uid,
            applicantName,
            applicantTitle,
            communityId: communitySelection.community,
            communityName: communitySelection.communityName,
            justification,
            stationName,
            stationAddress,
            stationPhoneNumber,
            referenceName,
            referenceTitle,
        });
        if (result.success) setShowConfirmation(true);
        else toast({ title: "Submission Failed", description: result.error, variant: "destructive" });
        
    } else { // It's a nomination
        if (nomineeIsMember === 'yes') {
            if (!selectedNominee) {
                toast({ title: 'No Member Selected', description: 'Please select a member to nominate.', variant: 'destructive' });
                setIsSubmitting(false);
                return;
            }
            const result = await inviteExistingMemberToApplyAction({
                nomineeId: selectedNominee.id,
                communityId: communitySelection.community,
                communityName: communitySelection.communityName,
                inviterName: userProfile.name,
            });
            if (result.success) setShowConfirmation(true);
            else toast({ title: "Nomination Failed", description: result.error, variant: "destructive" });
        } else if (nomineeIsMember === 'no') {
            if (!externalNomineeName || !externalNomineeEmail) {
                toast({ title: 'Missing Information', description: "Please provide the nominee's name and email.", variant: 'destructive' });
                setIsSubmitting(false);
                return;
            }
            const result = await inviteExternalPersonToApplyAction({
                nomineeName: externalNomineeName,
                nomineeEmail: externalNomineeEmail,
                inviterName: userProfile.name,
                communityName: communitySelection.communityName,
            });
            if (result.success) setShowConfirmation(true);
            else toast({ title: "Invitation Failed", description: result.error, variant: "destructive" });
        }
    }
    setIsSubmitting(false);
  };
  
   const handleCloseDialog = () => {
        setShowConfirmation(false);
        router.push('/');
    }

  return (
    <>
      <div className="max-w-4xl mx-auto py-12 px-4">
        <Button asChild variant="ghost" className="mb-4">
            <Link href="/home"><ArrowLeft className="mr-2 h-4 w-4" /> Back to Home</Link>
        </Button>
        <div className="text-center mb-12">
           <div className="inline-block p-4 bg-primary/10 rounded-full mb-4">
               <Shield className="h-12 w-12 text-primary" />
           </div>
          <h1 className="text-4xl font-bold font-headline">
            Police Liaison Application
          </h1>
          <p className="mt-4 text-lg text-muted-foreground max-w-3xl mx-auto">
            Apply to become a designated police liaison for a community, or recommend someone you trust for the role.
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          <Card>
            <CardHeader>
              <CardTitle>Your Details</CardTitle>
              <CardDescription>
                Choose whether you are applying for yourself or recommending someone else.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                <RadioGroup value={applicationType} onValueChange={(val) => setApplicationType(val as string)} className="flex gap-4">
                    <div className="flex items-center space-x-2"><RadioGroupItem value="self" id="self" /><Label htmlFor="self" className="font-normal">I am applying for myself</Label></div>
                    <div className="flex items-center space-x-2"><RadioGroupItem value="nominate" id="nominate" /><Label htmlFor="nominate" className="font-normal">I am recommending someone else</Label></div>
                </RadioGroup>
                
                <Separator />

                {applicationType === 'self' ? (
                    <div className="space-y-6">
                        <div className="grid md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <Label htmlFor="applicant-name">Applicant's Full Name *</Label>
                                <Input id="applicant-name" value={applicantName} onChange={e => setApplicantName(e.target.value)} disabled />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="applicant-title">Official Title / Rank *</Label>
                                <Input id="applicant-title" placeholder="e.g., Police Constable, Sergeant" value={applicantTitle} onChange={e => setApplicantTitle(e.target.value)} />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label>Community to Represent *</Label>
                            <CommunitySelector selection={communitySelection} onSelectionChange={setCommunitySelection} />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="justification">Justification for Access *</Label>
                            <Textarea 
                                id="justification" 
                                placeholder="Explain why you or the nominee require liaison access for this community (min 20 words)." 
                                value={justification}
                                onChange={e => setJustification(e.target.value)}
                                className="min-h-32"
                            />
                            <p className="text-sm text-right text-muted-foreground">{wordCount} / 20 words</p>
                        </div>
                        <div className="space-y-4 pt-4 border-t">
                            <h3 className="font-medium text-lg">Station Details</h3>
                            <p className="text-sm text-muted-foreground">Please provide the details of your assigned police station for verification.</p>
                            <div className="grid md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <Label htmlFor="station-name">Station Name *</Label>
                                    <Input id="station-name" value={stationName} onChange={e => setStationName(e.target.value)} placeholder="e.g., Anytown Central Police Station" />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="station-phone">Station Phone Number *</Label>
                                    <Input id="station-phone" value={stationPhoneNumber} onChange={e => setStationPhoneNumber(e.target.value)} placeholder="e.g., 101" />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="station-address">Station Address</Label>
                                <Input id="station-address" value={stationAddress} onChange={e => setStationAddress(e.target.value)} placeholder="e.g., 123 Police Plaza, Anytown"/>
                            </div>
                            <div className="grid md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <Label htmlFor="ref-name">Reference Name (Optional)</Label>
                                    <Input id="ref-name" value={referenceName} onChange={e => setReferenceName(e.target.value)} placeholder="e.g., Sgt. John Smith" />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="ref-title">Reference Title (Optional)</Label>
                                    <Input id="ref-title" value={referenceTitle} onChange={e => setReferenceTitle(e.target.value)} placeholder="e.g., Desk Sergeant" />
                                </div>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="space-y-6">
                         <div className="space-y-2">
                            <Label>For which community are you making this recommendation?</Label>
                            <CommunitySelector selection={communitySelection} onSelectionChange={setCommunitySelection} />
                        </div>
                        <RadioGroup value={nomineeIsMember || ''} onValueChange={(val) => setNomineeIsMember(val as any)} className="flex gap-4">
                            <div className="flex items-center space-x-2"><RadioGroupItem value="yes" id="is-member" /><Label htmlFor="is-member" className="font-normal">They are a member of the hub</Label></div>
                            <div className="flex items-center space-x-2"><RadioGroupItem value="no" id="is-not-member" /><Label htmlFor="is-not-member" className="font-normal">They are not a member yet</Label></div>
                        </RadioGroup>

                        {nomineeIsMember === 'yes' && (
                            <div className="p-4 border rounded-md space-y-4">
                                <h3 className="font-semibold">Find Member</h3>
                                <div className="relative">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                    <Input placeholder="Search by name or email..." value={searchQuery} onChange={handleSearchChange} className="pl-10" />
                                </div>
                                {isSearching && <Loader2 className="animate-spin" />}
                                <div className="space-y-2 max-h-48 overflow-y-auto">
                                    {searchResults.map(u => (
                                        <Button key={u.id} variant={selectedNominee?.id === u.id ? "default" : "outline"} className="w-full justify-start h-auto p-2 text-left" onClick={() => setSelectedNominee(u)}>
                                            <Avatar className="h-9 w-9 mr-3">
                                                <AvatarImage src={u.avatar} alt={u.name} />
                                                <AvatarFallback>{u.name ? u.name.split(' ').map(n=>n[0]).join('') : 'U'}</AvatarFallback>
                                            </Avatar>
                                            <div>
                                                <p className="font-semibold">{u.name}</p>
                                                <p className="text-xs text-muted-foreground">{u.email}</p>
                                            </div>
                                        </Button>
                                    ))}
                                </div>
                            </div>
                        )}
                        {nomineeIsMember === 'no' && (
                            <div className="p-4 border rounded-md space-y-4">
                                <h3 className="font-semibold">Invite via Email</h3>
                                <div className="grid md:grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="nominee-name">Nominee's Name</Label>
                                        <Input id="nominee-name" value={externalNomineeName} onChange={e => setExternalNomineeName(e.target.value)} />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="nominee-email">Nominee's Email</Label>
                                        <Input id="nominee-email" type="email" value={externalNomineeEmail} onChange={e => setExternalNomineeEmail(e.target.value)} />
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </CardContent>
            <CardFooter>
                 <Button type="submit" disabled={isSubmitting || (applicationType === 'self' && !isSelfFormComplete) || (applicationType === 'nominate' && !isNominationFormComplete)}>
                    {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    <Send className="mr-2 h-4 w-4" />
                    {applicationType === 'self' ? 'Submit Application' : 'Send Nomination'}
                </Button>
            </CardFooter>
          </Card>
        </form>
      </div>

      <Dialog open={showConfirmation} onOpenChange={setShowConfirmation}>
            <DialogContent onEscapeKeyDown={(e) => e.preventDefault()} onInteractOutside={(e) => e.preventDefault()} className="sm:max-w-md">
                <DialogHeader className="items-center text-center">
                    <div className="p-3 bg-green-100 dark:bg-green-900/50 rounded-full inline-block mb-4">
                        <CheckCircle className="h-10 w-10 text-green-500" />
                    </div>
                    <DialogTitle className="text-2xl">{applicationType === 'self' ? 'Application Submitted' : 'Nomination Sent'}</DialogTitle>
                    <DialogDescription className="text-base text-muted-foreground !mt-4">
                       {applicationType === 'self' 
                            ? 'Thank you for your application. It will be sent to the Community Leader for review. You will be notified of the outcome.'
                            : nomineeIsMember === 'yes' 
                                ? `A notification has been sent to ${selectedNominee?.name} inviting them to apply.`
                                : `An email invitation has been sent to ${externalNomineeName} to join the community and apply.`
                       }
                    </DialogDescription>
                </DialogHeader>
                <DialogFooter className="justify-center">
                    <Button type="button" onClick={handleCloseDialog}>
                        Return to Home
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    </>
  );
}
