

'use client'

import React, { useState, useEffect, useTransition, useCallback } from "react";
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createUserWithEmailAndPassword, sendEmailVerification, signOut } from "firebase/auth";
import { useFirestore, useAuth, useDoc, useMemoFirebase } from "@/firebase";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
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
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, User, Building, Crown, HeartHandshake, Globe, Loader2, HelpCircle, EyeOff, Eye, Mic, Play, Pause, Briefcase } from "lucide-react";
import { collection, doc, setDoc, addDoc, serverTimestamp, getDoc, writeBatch, query, where, getDocs, limit, FieldValue, increment } from "firebase/firestore";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger, DialogClose } from "@/components/ui/dialog";
import { checkCommunityLeaderAction } from "@/lib/actions/communityActions";
import { CommunitySelector, type CommunitySelection } from "@/components/community-selector";
import { checkAndCreateMailingListsAction } from "@/lib/actions/userActions";
import { LegalDocumentDisplay } from "@/components/legal-document-display";
import { ScrollArea } from "@/components/ui/scroll-area";


type SignUpFormProps = {
  accountType: 'personal' | 'business' | 'leader' | 'enterprise' | 'national' | 'advertiser';
}

const ageRanges = ["Under 18", "18-24", "25-34", "35-44", "45-54", "55-64", "65+"];
const genders = ["Male", "Female", "Other", "Prefer not to say"];


export default function SignUpForm({ accountType }: SignUpFormProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [gender, setGender] = useState("");
  const [ageRange, setAgeRange] = useState("");
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  
  const [businessName, setBusinessName] = useState("");

  const [communitySelection, setCommunitySelection] = useState<CommunitySelection | null>({
    id: null, country: null, state: null, region: null, community: null,
  });
  
  const [isLocationVerified, setIsLocationVerified] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [isFinalizing, setIsFinalizing] = useState(false);
  const [showNoLeaderDialog, setShowNoLeaderDialog] = useState(false);
  const [showLeaderExistsDialog, setShowLeaderExistsDialog] = useState(false);
  const [isCheckingLeader, setIsCheckingLeader] = useState(false);
  const [selectedCommunityInfo, setSelectedCommunityInfo] = useState<{id: string; name: string} | null>(null);

  const [otherStateName, setOtherStateName] = React.useState('');
  const [otherRegionName, setOtherRegionName] = React.useState('');
  const [otherCommunityName, setOtherCommunityName] = React.useState('');

  const router = useRouter();
  const { toast } = useToast();
  const auth = useAuth();
  const db = useFirestore();

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth || !db) {
        toast({
            title: "Initialization Error",
            description: "Services are not available. Please try again later.",
            variant: "destructive",
        });
        return;
    }
    if (password !== confirmPassword) {
      toast({
        title: "Passwords do not match",
        description: "Please check your passwords and try again.",
        variant: "destructive",
      });
      return;
    }
    if (!agreedToTerms) {
      toast({
        title: "Terms and Conditions",
        description: "You must agree to the terms and conditions to sign up.",
        variant: "destructive",
      });
      return;
    }
    if (accountType === 'leader' && ageRange === 'Under 18') {
        toast({
            title: "Age Requirement Not Met",
            description: "You must be 18 or older to register as a Community Leader.",
            variant: "destructive",
        });
        return;
    }

    startTransition(async () => {
      try {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;

        const { country, state, region, community } = communitySelection || {};
        
        const batch = writeBatch(db);
        
        let finalCountryId = country;
        let finalStateId = state;
        let finalRegionId = region;
        let finalCommunityId = community;
        
        let finalCountryName: string | null = null;
        let finalStateName: string | null = null;
        let finalRegionName: string | null = null;
        let finalCommunityName: string | null = null;
        
        const getDocName = async (collectionName: string, docId: string) => {
            const docRef = doc(db, collectionName, docId);
            const docSnap = await getDoc(docRef);
            return docSnap.exists() ? docSnap.data().name : null;
        };

        const requiresCommunity = accountType && !['advertiser', 'national'].includes(accountType);

        if (requiresCommunity) {
            const countryNameRes = country ? await getDocName('locations', country) : null;
            if (!countryNameRes) throw new Error("Country selection is required.");
            finalCountryName = countryNameRes;

            const isCreatingNewState = state === 'new';
            const isCreatingNewRegion = region === 'new';
            const isCreatingNewCommunity = community === 'other';

            const isNewLeader = accountType === 'leader';
            const newCommunityLeaderCount = isNewLeader ? 1 : 0;
            const newCommunityMemberCount = isNewLeader ? 1 : 0; // A new leader is also a member.

            if (isCreatingNewState) {
                if (!otherStateName || !otherRegionName || !otherCommunityName) throw new Error("New state, region, and community names are all required.");
                finalStateName = otherStateName;
                finalRegionName = otherRegionName;
                finalCommunityName = otherCommunityName;

                const newStateRef = doc(collection(db, "locations"));
                batch.set(newStateRef, { name: finalStateName, type: 'state', parent: finalCountryId });
                finalStateId = newStateRef.id;

                const newRegionRef = doc(collection(db, "locations"));
                batch.set(newRegionRef, { name: finalRegionName, type: 'region', parent: finalStateId });
                finalRegionId = newRegionRef.id;

                const newCommunityRef = doc(collection(db, "communities"));
                batch.set(newCommunityRef, { name: finalCommunityName, country: finalCountryName, state: finalStateName, region: finalRegionName, createdAt: serverTimestamp(), status: 'pending', type: 'geographic', visibility: 'public', profileId: newCommunityRef.id, leaderCount: newCommunityLeaderCount, memberCount: newCommunityMemberCount });
                finalCommunityId = newCommunityRef.id;
            } else {
                if (!state) throw new Error("State selection is required.");
                finalStateName = await getDocName('locations', state);

                if (isCreatingNewRegion) {
                    if (!otherRegionName || !otherCommunityName) throw new Error("New region and community names are required.");
                    finalRegionName = otherRegionName;
                    finalCommunityName = otherCommunityName;

                    const newRegionRef = doc(collection(db, "locations"));
                    batch.set(newRegionRef, { name: finalRegionName, type: 'region', parent: finalStateId });
                    finalRegionId = newRegionRef.id;
                    
                    const newCommunityRef = doc(collection(db, "communities"));
                    batch.set(newCommunityRef, { name: finalCommunityName, country: finalCountryName, state: finalStateName, region: finalRegionName, createdAt: serverTimestamp(), status: 'pending', type: 'geographic', visibility: 'public', profileId: newCommunityRef.id, leaderCount: newCommunityLeaderCount, memberCount: newCommunityMemberCount });
                    finalCommunityId = newCommunityRef.id;
                } else {
                    if (!region) throw new Error("Region selection is required.");
                    finalRegionName = await getDocName('locations', region);

                    if (isCreatingNewCommunity) {
                        if (!otherCommunityName) throw new Error("New community name is required.");
                        finalCommunityName = otherCommunityName;
                        
                        const newCommunityRef = doc(collection(db, "communities"));
                        batch.set(newCommunityRef, { name: finalCommunityName, country: finalCountryName, state: finalStateName, region: finalRegionName, createdAt: serverTimestamp(), status: 'pending', type: 'geographic', visibility: 'public', profileId: newCommunityRef.id, leaderCount: newCommunityLeaderCount, memberCount: newCommunityMemberCount });
                        finalCommunityId = newCommunityRef.id;
                    } else {
                        if (!community) throw new Error("Community selection is required.");
                        finalCommunityName = await getDocName('communities', community);
                         // Handle joining an existing community
                        const communityRef = doc(db, 'communities', community);
                        const updates: { memberCount: FieldValue; leaderCount?: FieldValue } = {
                            memberCount: increment(1)
                        };
                        if (accountType === 'leader') {
                            updates.leaderCount = increment(1);
                        }
                        batch.update(communityRef, updates);
                    }
                }
            }
        }
        
        const permissions = {
            isLeader: accountType === 'leader',
            isBusinessOwner: accountType === 'business',
            isEnterpriseUser: accountType === 'enterprise',
            isNationalAdvertiser: accountType === 'national' || accountType === 'advertiser',
            isReporter: false,
            hasBroadcastAccess: false,
            isAdmin: false,
        };
        
        let finalRole = accountType;
        let finalTitle = accountType ? accountType.charAt(0).toUpperCase() + accountType.slice(1) : "Personal";
        if (accountType === 'leader') {
          finalRole = 'president';
          finalTitle = 'President';
        }

        const userProfileData: any = {
          uid: user.uid,
          name: `${firstName} ${lastName}`,
          firstName,
          lastName,
          email: user.email,
          role: finalRole,
          title: finalTitle,
          accountType: accountType,
          permissions,
          businessName: ['business', 'advertiser', 'enterprise', 'national'].includes(accountType!) ? businessName : null,
          gender: ['advertiser', 'national'].includes(accountType!) ? null : gender,
          ageRange: ['advertiser', 'national'].includes(accountType!) ? null : ageRange,
          homeCommunityId: finalCommunityId,
          communityId: finalCommunityId,
          communityName: finalCommunityName,
          country: finalCountryName,
          state: finalStateName,
          region: finalRegionName,
          status: 'active',
          joined: serverTimestamp(),
          memberOf: finalCommunityId ? [finalCommunityId] : [],
          termsAcceptedAt: serverTimestamp(),
        };
        
        if (accountType === 'leader') {
            userProfileData.communityRoles = {
                [finalCommunityId!]: { role: 'president', title: 'President' }
            };
        }

        const userRef = doc(db, "users", user.uid);
        batch.set(userRef, userProfileData);

        await batch.commit();

        await checkAndCreateMailingListsAction(user.uid);

        setIsFinalizing(true);
        await sendEmailVerification(user);
        
        toast({
            title: "Verification Email Sent",
            description: "Please check your inbox to verify your email address.",
        });

        await signOut(auth);
        router.push("/?status=unverified");

      } catch (error: any) {
        let errorMessage = 'An unknown error occurred during signup.';
        if (error.code === 'auth/email-already-in-use') {
            errorMessage = 'This email address is already in use by another account.';
        } else if (error.code === 'auth/weak-password') {
            errorMessage = 'The password is too weak. It must be at least 6 characters long.';
        } else if (error.code) {
            errorMessage = error.message;
        } else {
            errorMessage = error.message;
        }
        toast({
          title: "Sign-up Failed",
          description: errorMessage,
          variant: "destructive",
        });
      }
    });
  };
  
  const handleCommunitySelection = useCallback(async (selection: CommunitySelection) => {
    if (!db) return;
    setIsLocationVerified(false); // Reset verification state on any change
    setCommunitySelection(selection);
    setShowLeaderExistsDialog(false); // Reset this on change
    setSelectedCommunityInfo(null); // Reset this on change

    if (selection.community && selection.community !== 'other') {
        const communityDocRef = doc(db, 'communities', selection.community);
        const communitySnap = await getDoc(communityDocRef);

        if (communitySnap.exists()) {
            setIsLocationVerified(true);
            const communityId = communitySnap.id;
            const communityName = communitySnap.data().name;
            setSelectedCommunityInfo({ id: communityId, name: communityName });

            setIsCheckingLeader(true);
            const leaderCheckResult = await checkCommunityLeaderAction(communityId);
            setIsCheckingLeader(false);
            
            if (accountType === 'leader' && leaderCheckResult.hasLeader) {
                // Block leader signup if a leader already exists
                setShowLeaderExistsDialog(true);
            } else if (['personal', 'business', 'enterprise'].includes(accountType) && !leaderCheckResult.hasLeader) {
                // Prompt other types to become a leader if none exists
                setShowNoLeaderDialog(true);
            }
        }
    }
  }, [db, accountType]);

  const isSubmitting = isPending;
  const requiresCommunity = accountType && !['advertiser', 'national'].includes(accountType);
  const isCreatingNewLocation = communitySelection?.state === 'new' || communitySelection?.region === 'new' || communitySelection?.community === 'other';
  const communitySelectionComplete = !requiresCommunity || 
    (communitySelection?.community && communitySelection.community !== 'other') ||
    (isCreatingNewLocation && isLocationVerified);
  
  useEffect(() => {
    // If a user is creating a new community and their account type isn't 'leader',
    // prompt them to become the leader since the new community will be leaderless.
    if (isCreatingNewLocation && isLocationVerified && ['personal', 'business', 'enterprise'].includes(accountType)) {
        const newCommunityDisplayName = otherCommunityName || otherRegionName || otherStateName;
        setSelectedCommunityInfo({ id: 'new', name: newCommunityDisplayName });
        setShowNoLeaderDialog(true);
    }
  }, [isLocationVerified, isCreatingNewLocation, accountType, otherCommunityName, otherRegionName, otherStateName]);
  
  if (isFinalizing) {
    return (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-background/80 backdrop-blur-sm">
            <Loader2 className="h-16 w-16 animate-spin text-primary" />
            <p className="mt-4 text-lg font-semibold">Finalizing account setup...</p>
            <p className="text-muted-foreground">Sending verification email. Please wait.</p>
        </div>
    )
  }

  return (
    <>
      <form onSubmit={handleSignUp} className="space-y-6">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
            <Label htmlFor="first-name">First name</Label>
            <Input
                id="first-name"
                placeholder="Max"
                required
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
            />
            </div>
            <div className="space-y-2">
            <Label htmlFor="last-name">Last name</Label>
            <Input
                id="last-name"
                placeholder="Robinson"
                required
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
            />
            </div>
        </div>
        
        {(accountType === 'business' || accountType === 'enterprise' || accountType === 'national' || accountType === 'advertiser') && (
            <div className="grid grid-cols-1 gap-4">
                <div className="space-y-2">
                    <Label htmlFor="business-name">Business / Organization Name</Label>
                    <Input 
                        id="business-name" 
                        placeholder="e.g., Global Tech Inc." 
                        required 
                        value={businessName}
                        onChange={(e) => setBusinessName(e.target.value)}
                    />
                </div>
            </div>
        )}
        
        {accountType !== 'national' && accountType !== 'advertiser' && (
            <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                <Label htmlFor="gender">Gender</Label>
                <Select onValueChange={setGender} value={gender}>
                    <SelectTrigger id="gender">
                        <SelectValue placeholder="Select..." />
                    </SelectTrigger>
                    <SelectContent>
                        {genders.map(g => <SelectItem key={g} value={g}>{g}</SelectItem>)}
                    </SelectContent>
                </Select>
                </div>
                <div className="grid gap-2">
                    <div className="flex items-center">
                        <Label htmlFor="age-range">Age Range</Label>
                        {accountType === 'leader' && (
                            <Dialog>
                                <DialogTrigger asChild>
                                    <Button variant="ghost" size="icon" className="h-5 w-5 ml-1" onClick={(e) => e.preventDefault()}>
                                        <HelpCircle className="h-4 w-4 text-muted-foreground" />
                                    </Button>
                                </DialogTrigger>
                                <DialogContent>
                                    <DialogHeader>
                                        <DialogTitle>Leadership Age Requirement</DialogTitle>
                                    </DialogHeader>
                                    <div className="py-4 space-y-4">
                                        <p>To ensure a safe and responsible environment, all Community Leaders must be 18 years of age or older.</p>
                                        <p>All leadership applications undergo a verification check by platform administrators before approval. We reserve the right to reject any application and, in cases of misrepresentation, may block the associated email from future registrations.</p>
                                    </div>
                                    <DialogFooter>
                                        <DialogClose asChild>
                                            <Button type="button">I Understand</Button>
                                        </DialogClose>
                                    </DialogFooter>
                                </DialogContent>
                            </Dialog>
                        )}
                    </div>
                    <Select onValueChange={setAgeRange} value={ageRange}>
                        <SelectTrigger id="age-range">
                            <SelectValue placeholder="Select..." />
                        </SelectTrigger>
                        <SelectContent>
                             {ageRanges.map(ar => (
                                <SelectItem 
                                    key={ar} 
                                    value={ar} 
                                    disabled={accountType === 'leader' && ar === 'Under 18'}
                                >
                                    {ar}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
            </div>
        )}


        <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
            id="email"
            type="email"
            placeholder="m@example.com"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            />
        </div>

        <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                    <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    />
                    <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="absolute right-1 top-1/2 h-7 w-7 -translate-y-1/2 text-muted-foreground"
                        onClick={() => setShowPassword(!showPassword)}
                    >
                        {showPassword ? <EyeOff /> : <Eye />}
                        <span className="sr-only">{showPassword ? 'Hide password' : 'Show password'}</span>
                    </Button>
                </div>
            </div>
            <div className="space-y-2">
                <Label htmlFor="confirm-password">Confirm Password</Label>
                <Input
                id="confirm-password"
                type={showPassword ? "text" : "password"}
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                />
            </div>
        </div>
        
        {requiresCommunity && (
            <div className="space-y-4 pt-4 border-t">
                <h3 className="text-lg font-medium">Community Selection</h3>
                <CommunitySelector 
                    selection={communitySelection} 
                    onSelectionChange={handleCommunitySelection} 
                    isLocationVerified={isLocationVerified} 
                    onVerificationChange={setIsLocationVerified}
                    allowCreation={true}
                    otherStateName={otherStateName}
                    onOtherStateNameChange={setOtherStateName}
                    otherRegionName={otherRegionName}
                    onOtherRegionNameChange={setOtherRegionName}
                    otherCommunityName={otherCommunityName}
                    onOtherCommunityNameChange={setOtherCommunityName}
                />
            </div>
        )}
    
        <div className="flex items-center space-x-2 pt-4 border-t">
            <Checkbox id="terms" checked={agreedToTerms} onCheckedChange={(checked) => setAgreedToTerms(checked as boolean)} />
            <label
                htmlFor="terms"
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
            >
                I agree to the{" "}
                    <Dialog>
                        <DialogTrigger asChild>
                            <span className="underline text-primary cursor-pointer">Terms and Conditions</span>
                        </DialogTrigger>
                        <DialogContent className="max-w-2xl grid grid-rows-[auto,1fr,auto] p-0 max-h-[85vh]">
                            <DialogHeader className="p-6 pb-2 border-b">
                                <DialogTitle>Terms and Conditions</DialogTitle>
                            </DialogHeader>
                            <ScrollArea className="h-full">
                                <div className="p-6">
                                    <LegalDocumentDisplay documentId="0gcYGgZ39llhfQ9G4NNw" />
                                </div>
                            </ScrollArea>
                            <DialogFooter className="p-6 pt-4 border-t">
                                <DialogClose asChild><Button type="button">Close</Button></DialogClose>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>
                .
            </label>
        </div>

        <Button 
            type="submit" 
            className="w-full" 
            disabled={!agreedToTerms || isCheckingLeader || isSubmitting || !communitySelectionComplete || showLeaderExistsDialog}
        >
            {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Create an account
        </Button>
      </form>
      <div className="text-center text-sm mt-4">
            Already have an account?{" "}
            <Link href="/" className="underline text-primary">
            Sign in
            </Link>
      </div>

        <Dialog open={showNoLeaderDialog} onOpenChange={setShowNoLeaderDialog}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Community Leader Needed!</DialogTitle>
                    <DialogDescription>
                         The community of <span className="font-bold">{selectedCommunityInfo?.name}</span> does not currently have a leader. This is a great opportunity to get involved!
                    </DialogDescription>
                </DialogHeader>
                <div className="py-4">
                    <p className="text-sm text-muted-foreground">
                        As a Community Leader, you can manage content, approve businesses, and earn a 40% share of the revenue generated from your community hub. Would you like to be considered for this role?
                    </p>
                </div>
                <DialogFooter className="justify-between">
                    <Button variant="outline" onClick={() => setShowNoLeaderDialog(false)}>
                        No, continue with my {accountType} account
                    </Button>
                        <Button onClick={() => {
                            router.push('/signup/leader');
                        }}>
                        Yes, I want to be a Leader
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
        <Dialog open={showLeaderExistsDialog} onOpenChange={setShowLeaderExistsDialog}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Community Already Managed</DialogTitle>
                    <DialogDescription>
                        The community of <span className="font-bold">{selectedCommunityInfo?.name}</span> already has a designated leader.
                    </DialogDescription>
                </DialogHeader>
                <div className="py-4">
                    <p className="text-sm text-muted-foreground">
                        You cannot register as a leader for a community that is already being managed. Please select a different community, or go back and choose a different account type (e.g., 'Personal' or 'Business') to join this community as a member.
                    </p>
                </div>
                <DialogFooter className="justify-between">
                    <Button variant="outline" asChild>
                       <Link href="/signup/account-type">
                           <ArrowLeft className="mr-2 h-4 w-4" /> Back to Account Types
                       </Link>
                    </Button>
                    <Button onClick={() => setShowLeaderExistsDialog(false)}>
                        Choose a Different Community
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    </>
  )
}
