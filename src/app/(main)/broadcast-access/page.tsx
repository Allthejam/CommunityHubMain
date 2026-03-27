
"use client";

import { useState, useTransition, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ArrowLeft, ShieldAlert, Globe, Users, ListChecks, CheckSquare, Send, Check, Loader2, XCircle, CheckCircle } from "lucide-react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { countries } from "@/lib/location-data";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { validateContactAction, validateJustificationAction, createAccessRequestAction } from "@/lib/actions/accessActions";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useFirestore, useUser, useDoc, useMemoFirebase } from "@/firebase";
import { collection, query, where, onSnapshot, doc } from "firebase/firestore";


const governmentLevels = [
    { value: "national", label: "National / Federal" },
    { value: "regional", label: "Regional / State / Provincial" },
    { value: "local", label: "Local / Municipal" },
];


export default function BroadcastAccessPage() {
    const { user, isUserLoading } = useUser();
    const db = useFirestore();
    const userProfileRef = useMemoFirebase(() => (user ? doc(db, 'users', user.uid) : null), [user, db]);
    const { data: userProfile, isLoading: profileLoading } = useDoc(userProfileRef);

    const [applicantName, setApplicantName] = useState("");
    const [applicantTitle, setApplicantTitle] = useState("");
    const [displayName, setDisplayName] = useState("");
    const [agency, setAgency] = useState("");
    const [country, setCountry] = useState("");
    const [govLevel, setGovLevel] = useState("");
    
    const [phone, setPhone] = useState("");
    const [isPhoneVerifying, setIsPhoneVerifying] = useState(false);
    const [isPhoneVerified, setIsPhoneVerified] = useState(false);
    
    const [email, setEmail] = useState("");
    const [isEmailVerifying, setIsEmailVerifying] = useState(false);
    const [isEmailVerified, setIsEmailVerified] = useState(false);

    const [refName, setRefName] = useState("");
    const [refTitle, setRefTitle] = useState("");

    const [refEmail, setRefEmail] = useState("");
    const [isRefEmailVerifying, setIsRefEmailVerifying] = useState(false);
    const [isRefEmailVerified, setIsRefEmailVerified] = useState(false);

    const [refPhone, setRefPhone] = useState("");
    const [isRefPhoneVerifying, setIsRefPhoneVerifying] = useState(false);
    const [isRefPhoneVerified, setIsRefPhoneVerified] = useState(false);

    const [justification, setJustification] = useState("");
    const [isJustificationVerifying, setIsJustificationVerifying] = useState(false);
    const [isJustificationVerified, setIsJustificationVerified] = useState(false);
    
    const [agreedToTerms, setAgreedToTerms] = useState(false);

    const [isSubmitting, startTransition] = useTransition();
    const [showConfirmation, setShowConfirmation] = useState(false);

    const [countryCount, setCountryCount] = useState<number | null>(null);
    const [communityCount, setCommunityCount] = useState<number | null>(null);

    const { toast } = useToast();
    const router = useRouter();

    const wordCount = justification.trim().split(/\s+/).filter(Boolean).length;
    
    useEffect(() => {
        if (!db) return;

        const countriesQuery = query(collection(db, "locations"), where("type", "==", "country"));
        const communitiesQuery = query(collection(db, "communities"));

        const unsubCountries = onSnapshot(countriesQuery, (snapshot) => {
            setCountryCount(snapshot.size);
        });

        const unsubCommunities = onSnapshot(communitiesQuery, (snapshot) => {
            setCommunityCount(snapshot.size);
        });

        return () => {
            unsubCountries();
            unsubCommunities();
        };
    }, [db]);


    const handleEmailVerification = async (
        emailToVerify: string,
        setVerifying: (isVerifying: boolean) => void,
        setVerified: (isVerified: boolean) => void
    ) => {
        if (!emailToVerify || !emailToVerify.includes('@')) {
            toast({ variant: "destructive", title: "Invalid Email", description: "Please enter a valid email address." });
            return;
        }
        if (!country) {
            toast({ variant: "destructive", title: "Country Required", description: "Please select a country before verifying." });
            return;
        }

        setVerifying(true);
        const result = await validateContactAction({ email: emailToVerify, country });
        setVerifying(false);

        if (result.isValid) {
            setVerified(true);
            toast({ title: "Email Validated", description: "This email address appears to be valid." });
        } else {
            setVerified(false);
            toast({ variant: "destructive", title: "Invalid Email", description: result.reason || "This email address is not valid." });
        }
    };

    const handlePhoneVerification = async (
        phoneToVerify: string,
        setVerifying: (isVerifying: boolean) => void,
        setVerified: (isVerified: boolean) => void
    ) => {
        if (!phoneToVerify) {
            toast({ variant: "destructive", title: "Invalid Phone Number", description: "Please enter a valid phone number." });
            return;
        }
         if (!country) {
            toast({ variant: "destructive", title: "Country Required", description: "Please select a country before verifying." });
            return;
        }
        setVerifying(true);
        const result = await validateContactAction({ phone: phoneToVerify, country });
        setVerifying(false);

        if (result.isValid) {
             setVerified(true);
            toast({ title: "Phone Number Validated", description: "This phone number appears to be valid." });
        } else {
             setVerified(false);
             toast({ variant: "destructive", title: "Invalid Phone Number", description: result.reason || "This phone number is not valid." });
        }
    };

    const handleJustificationVerification = async () => {
        if (wordCount < 100 || wordCount > 500) {
            toast({ variant: "destructive", title: "Word Count Issue", description: "Justification must be between 100 and 500 words." });
            return;
        }
        setIsJustificationVerifying(true);
        const result = await validateJustificationAction({ justificationText: justification });
        setIsJustificationVerifying(false);

        if (result.isMeaningful) {
            setIsJustificationVerified(true);
            toast({ title: "Justification Validated", description: "The justification text appears to be meaningful." });
        } else {
            setIsJustificationVerified(false);
            toast({ variant: "destructive", title: "Justification Invalid", description: result.reason || "The justification text seems to be gibberish or irrelevant." });
        }
    };
    
    const isFormComplete =
        applicantName &&
        applicantTitle &&
        displayName &&
        agency &&
        country &&
        govLevel &&
        isPhoneVerified &&
        isEmailVerified &&
        refName &&
        refTitle &&
        isRefEmailVerified &&
        isRefPhoneVerified &&
        justification &&
        isJustificationVerified &&
        wordCount >= 100 &&
        wordCount <= 500 &&
        agreedToTerms;
        
    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!isFormComplete || !user) return;

        startTransition(async () => {
            const result = await createAccessRequestAction({
                userId: user.uid,
                applicantName, applicantTitle, displayName, agency, country, govLevel, phone, email,
                refName, refTitle, refEmail, refPhone, justification, agreedToTerms,
            });

            if (result.success) {
                setShowConfirmation(true);
            } else {
                 toast({
                    title: "Submission Failed",
                    description: result.error,
                    variant: "destructive",
                });
            }
        });
    };

    const handleCloseDialog = () => {
        setShowConfirmation(false);
        router.push('/');
    }

    if (isUserLoading || profileLoading) {
        return (
            <div className="flex justify-center items-center h-screen">
                <Loader2 className="h-8 w-8 animate-spin" />
            </div>
        );
    }
    
    if (!user || !userProfile) {
        return (
              <div className="flex flex-col items-center justify-center min-h-[calc(100vh-200px)] text-center">
                <Card className="w-full max-w-lg">
                  <CardHeader>
                    <CardTitle>Application Required</CardTitle>
                    <CardDescription>To apply for the National Emergency Broadcast System, you must have an account.</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground">Please sign in or create an account to proceed with your application. This ensures we can securely associate broadcast permissions with a verified user.</p>
                  </CardContent>
                  <CardFooter className="flex-col gap-4">
                    <Button asChild className="w-full">
                      <Link href="/">Sign In or Create Account</Link>
                    </Button>
                  </CardFooter>
                </Card>
              </div>
        )
    }


  return (
    <>
      <div className="flex flex-col items-center justify-start text-center w-full min-h-screen pt-16 px-4 pb-24">
         <div className="mb-8 bg-destructive/10 p-6 rounded-full inline-block">
             <ShieldAlert className="h-24 w-24 text-destructive" />
          </div>
        <h1 className="text-6xl font-bold text-destructive whitespace-nowrap">National Emergency Broadcast System</h1>
        <p className="pt-2 text-xl max-w-4xl text-muted-foreground">A high-priority communication channel reserved for official government and emergency service use.</p>
      
        <div className="mt-12 grid grid-cols-1 md:grid-cols-2 gap-8 max-w-7xl w-full text-left">
            <Card className="flex flex-col">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <ListChecks className="h-6 w-6 text-primary" />
                        System Capabilities
                    </CardTitle>
                    <CardDescription>Apply for access to our powerful, platform-wide alerting system.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4 flex-grow">
                    <div className="flex justify-around text-center">
                        <div className="flex flex-col items-center gap-1">
                            <Globe className="h-8 w-8 text-muted-foreground" />
                            <p className="text-2xl font-bold">{countryCount === null ? <Loader2 className="animate-spin h-6 w-6" /> : countryCount}</p>
                            <p className="text-sm text-muted-foreground">Countries</p>
                        </div>
                         <div className="flex flex-col items-center gap-1">
                            <Users className="h-8 w-8 text-muted-foreground" />
                            <p className="text-2xl font-bold">{communityCount === null ? <Loader2 className="animate-spin h-6 w-6" /> : communityCount}</p>
                            <p className="text-sm text-muted-foreground">Communities</p>
                        </div>
                    </div>
                    <Separator />
                    <div>
                        <h4 className="font-semibold mb-2">Functionality:</h4>
                        <p className="text-sm text-muted-foreground">
                            This system allows for instant, non-dismissible alerts to be sent to all users across the platform or targeted to specific countries or regions, bypassing all user-level notification settings.
                        </p>
                    </div>
                </CardContent>
            </Card>

            <Card className="flex flex-col">
                 <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <CheckSquare className="h-6 w-6 text-primary" />
                        Access Protocol
                    </CardTitle>
                    <CardDescription>Access to this system is strictly controlled and manually verified.</CardDescription>
                </CardHeader>
                 <CardContent className="space-y-4 flex-grow">
                    <p className="text-sm text-muted-foreground">It is intended for use by authorised personnel from:</p>
                    <ul className="list-disc pl-5 space-y-2 text-sm text-muted-foreground">
                        <li>National government agencies</li>
                        <li>Regional emergency services (Police, Fire, Ambulance)</li>
                        <li>Official meteorological services</li>
                        <li>Other official agencies</li>
                    </ul>
                     <p className="text-sm font-semibold pt-2">
                        All applications are subject to a rigorous vetting process by the Platform administrators.
                    </p>
                </CardContent>
            </Card>
        </div>

        <div className="w-full max-w-7xl">
            <form onSubmit={handleSubmit} className="w-full">
                <Card className="mt-8 w-full text-left">
                    <CardHeader>
                        <CardTitle>Application for Access</CardTitle>
                        <CardDescription>Please complete the form below. All information will be verified. Fields marked with an asterisk (*) are required.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <Label htmlFor="registered-name">Registered Account Name</Label>
                                <Input id="registered-name" value={userProfile.name || ''} disabled />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="registered-email">Registered Account Email</Label>
                                <Input id="registered-email" value={userProfile.email || ''} disabled />
                            </div>
                        </div>
                        <Separator />
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <Label htmlFor="full-name">Applicant's Full Name *</Label>
                                <Input id="full-name" placeholder="e.g., Jane Doe" value={applicantName} onChange={(e) => setApplicantName(e.target.value)} />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="title">Official Title / Position *</Label>
                                <Input id="title" placeholder="e.g., Emergency Planning Officer" value={applicantTitle} onChange={(e) => setApplicantTitle(e.target.value)} />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="display-name">Display Name (for announcements) *</Label>
                            <Input id="display-name" placeholder="e.g., National Weather Service" value={displayName} onChange={(e) => setDisplayName(e.target.value)} />
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div className="space-y-2">
                                <Label htmlFor="agency">Agency / Department *</Label>
                                <Input id="agency" placeholder="e.g., National Weather Service" value={agency} onChange={(e) => setAgency(e.target.value)} />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="country">Country *</Label>
                                <Select onValueChange={setCountry} value={country}>
                                    <SelectTrigger id="country">
                                        <SelectValue placeholder="Select country..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {countries.map(country => <SelectItem key={country.value} value={country.value}>{country.label}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="gov-level">Government Level *</Label>
                                <Select onValueChange={setGovLevel} value={govLevel}>
                                    <SelectTrigger id="gov-level">
                                        <SelectValue placeholder="Select level..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {governmentLevels.map(level => <SelectItem key={level.value} value={level.value}>{level.label}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <Label htmlFor="phone">Contact Phone Number *</Label>
                                <div className="flex gap-2">
                                    <Input id="phone" placeholder="e.g., +1-202-555-0125" value={phone} onChange={(e) => {setPhone(e.target.value); setIsPhoneVerified(false);}} disabled={isPhoneVerified} />
                                    <Button type="button" variant="outline" onClick={() => handlePhoneVerification(phone, setIsPhoneVerifying, setIsPhoneVerified)} disabled={isPhoneVerifying || isPhoneVerified || !country}>
                                        {isPhoneVerifying ? <Loader2 className="animate-spin" /> : isPhoneVerified ? <Check /> : null}
                                        {isPhoneVerified ? 'Verified' : 'Verify'}
                                    </Button>
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="email">Official Email Address *</Label>
                                <div className="flex gap-2">
                                    <Input id="email" type="email" placeholder="e.g., jane.doe@agency.gov" value={email} onChange={(e) => {setEmail(e.target.value); setIsEmailVerified(false);}} disabled={isEmailVerified} />
                                    <Button type="button" variant="outline" onClick={() => handleEmailVerification(email, setIsEmailVerifying, setIsEmailVerified)} disabled={isEmailVerifying || isEmailVerified || !country}>
                                        {isEmailVerifying ? <Loader2 className="animate-spin" /> : isEmailVerified ? <Check /> : null}
                                        {isEmailVerified ? 'Verified' : 'Verify'}
                                    </Button>
                                </div>
                            </div>
                        </div>

                        <Separator />
                        
                        <div>
                            <h3 className="text-lg font-medium">Reference Contact</h3>
                            <p className="text-sm text-muted-foreground">Please provide a professional reference who can verify your position and need for access.</p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <Label htmlFor="ref-full-name">Reference Full Name *</Label>
                                <Input id="ref-full-name" placeholder="e.g., John Smith" value={refName} onChange={(e) => setRefName(e.target.value)} />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="ref-title">Reference Title / Position *</Label>
                                <Input id="ref-title" placeholder="e.g., Department Head" value={refTitle} onChange={(e) => setRefTitle(e.target.value)} />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <Label htmlFor="ref-email">Reference Email Address *</Label>
                                <div className="flex gap-2">
                                    <Input id="ref-email" type="email" placeholder="e.g., john.smith@agency.gov" value={refEmail} onChange={(e) => {setRefEmail(e.target.value); setIsRefEmailVerified(false);}} disabled={isRefEmailVerified} />
                                    <Button type="button" variant="outline" onClick={() => handleEmailVerification(refEmail, setIsRefEmailVerifying, setIsRefEmailVerified)} disabled={isRefEmailVerifying || isRefEmailVerified || !country}>
                                        {isRefEmailVerifying ? <Loader2 className="animate-spin" /> : isRefEmailVerified ? <Check /> : null}
                                        {isRefEmailVerified ? 'Verified' : 'Verify'}
                                    </Button>
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="ref-phone">Reference Phone Number *</Label>
                                <div className="flex gap-2">
                                    <Input id="ref-phone" placeholder="e.g., +1-202-555-0126" value={refPhone} onChange={(e) => {setRefPhone(e.target.value); setIsRefPhoneVerified(false);}} disabled={isRefPhoneVerified} />
                                    <Button type="button" variant="outline" onClick={() => handlePhoneVerification(refPhone, setIsRefPhoneVerifying, setIsRefPhoneVerified)} disabled={isRefPhoneVerifying || isRefPhoneVerified || !country}>
                                        {isRefPhoneVerifying ? <Loader2 className="animate-spin" /> : isRefPhoneVerified ? <Check /> : null}
                                        {isRefPhoneVerified ? 'Verified' : 'Verify'}
                                    </Button>
                                </div>
                            </div>
                        </div>
                        
                        <Separator />

                        <div className="space-y-2">
                            <Label htmlFor="justification">Justification for Access *</Label>
                            <div className="relative">
                                <Textarea
                                    id="justification"
                                    placeholder="Briefly explain why your agency requires access to this system and the types of alerts you anticipate sending."
                                    className="min-h-32 pr-24"
                                    value={justification}
                                    onChange={(e) => { setJustification(e.target.value); setIsJustificationVerified(false); }}
                                    onBlur={handleJustificationVerification}
                                    maxLength={3500}
                                />
                                <div className="absolute top-3 right-3 flex items-center">
                                    {isJustificationVerifying ? 
                                        <Loader2 className="animate-spin" /> :
                                        isJustificationVerified ? 
                                        <CheckCircle className="text-green-500" /> :
                                        justification && wordCount >= 100 ?
                                        <XCircle className="text-destructive" /> : null
                                    }
                                </div>
                            </div>
                            <p className={cn(
                                "text-sm text-right",
                                wordCount < 100 || wordCount > 500 ? "text-destructive" : "text-green-600"
                            )}>
                                {wordCount} / 500 words (min 100)
                            </p>
                        </div>

                    </CardContent>
                    <CardFooter className="flex-col items-start gap-4">
                        <div className="flex items-center space-x-2">
                            <Checkbox id="terms" checked={agreedToTerms} onCheckedChange={(checked) => setAgreedToTerms(checked as boolean)} />
                            <Label htmlFor="terms" className="text-sm font-normal">
                                I agree to the <Link href="/terms" className="underline text-primary" target="_blank">Terms and Conditions</Link> for using the National Emergency Broadcast System.
                            </Label>
                        </div>
                        <Button type="submit" disabled={!isFormComplete || isSubmitting}>
                            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            <Send className="mr-2 h-4 w-4" />
                            Submit Secure Application
                        </Button>
                    </CardFooter>
                </Card>
            </form>
        </div>
      
      </div>
      <div className="fixed bottom-8 right-8">
        <Button variant="outline" asChild>
          <Link href="/">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Login
          </Link>
        </Button>
      </div>

       <Dialog open={showConfirmation} onOpenChange={setShowConfirmation}>
            <DialogContent onEscapeKeyDown={(e) => e.preventDefault()} onInteractOutside={(e) => e.preventDefault()} className="sm:max-w-md">
                <DialogHeader className="items-center text-center">
                    <div className="p-3 bg-green-100 dark:bg-green-900/50 rounded-full inline-block mb-4">
                        <CheckCircle className="h-10 w-10 text-green-500" />
                    </div>
                    <DialogTitle className="text-2xl">Application Submitted</DialogTitle>
                    <DialogDescription className="text-base text-muted-foreground !mt-4">
                        Thank you for your application. It will be reviewed within 5 working days. You will be notified by email of the result and sent your unique login details if approved.
                    </DialogDescription>
                </DialogHeader>
                <DialogFooter className="justify-center">
                    <Button type="button" onClick={handleCloseDialog}>
                        Close
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    </>
  );
}

