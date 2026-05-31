
'use client';

import * as React from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useUser, useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';
import { Loader2, ArrowLeft, Send, AlertTriangle, Upload, Camera, X, RefreshCw, HelpCircle } from 'lucide-react';
import Link from 'next/link';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { createCourierApplicationAction } from '@/lib/actions/courierActions';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose, DialogTrigger } from '@/components/ui/dialog';
import { CheckCircle } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { LegalDocumentDisplay } from '@/components/legal-document-display';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import Image from 'next/image';
import { validateContactAction } from '@/lib/actions/accessActions';


export default function ApplyForCourierPage() {
    const { user, isUserLoading } = useUser();
    const db = useFirestore();
    const userProfileRef = useMemoFirebase(() => (user ? doc(db, 'users', user.uid) : null), [user, db]);
    const { data: userProfile, isLoading: profileLoading } = useDoc(userProfileRef);

    const communityRef = useMemoFirebase(() => (userProfile?.communityId ? doc(db, 'communities', userProfile.communityId) : null), [userProfile?.communityId, db]);
    const { data: communityData, isLoading: communityLoading } = useDoc(communityRef);

    const { toast } = useToast();
    const router = useRouter();

    const [statement, setStatement] = React.useState('');
    const [vehicleDetails, setVehicleDetails] = React.useState('');
    const [isSubmitting, setIsSubmitting] = React.useState(false);
    const [showConfirmation, setShowConfirmation] = React.useState(false);
    const [agreedToTerms, setAgreedToTerms] = React.useState(false);
    const [isTermsDialogOpen, setIsTermsDialogOpen] = React.useState(false);
    
    const [licenseImage, setLicenseImage] = React.useState<string | null>(null);
    const [selfieImage, setSelfieImage] = React.useState<string | null>(null);
    const [isCameraOpen, setIsCameraOpen] = React.useState(false);
    const [cameraFor, setCameraFor] = React.useState<'license' | 'selfie' | null>(null);
    const [hasCameraPermission, setHasCameraPermission] = React.useState<boolean | null>(null);
    
    const [contactEmail, setContactEmail] = React.useState("");
    const [isEmailVerifying, setIsEmailVerifying] = React.useState(false);
    const [isEmailVerified, setIsEmailVerified] = React.useState(false);

    const [contactPhone, setContactPhone] = React.useState("");
    const [isPhoneVerifying, setIsPhoneVerifying] = React.useState(false);
    const [isPhoneVerified, setIsPhoneVerified] = React.useState(false);

    const [refName, setRefName] = React.useState("");
    const [refRelationship, setRefRelationship] = React.useState("");
    const [refEmail, setRefEmail] = React.useState("");
    const [refPhone, setRefPhone] = React.useState("");


    const videoRef = React.useRef<HTMLVideoElement>(null);
    const canvasRef = React.useRef<HTMLCanvasElement>(null);
    const licenseFileInputRef = React.useRef<HTMLInputElement>(null);
    const selfieFileInputRef = React.useRef<HTMLInputElement>(null);
    const [facingMode, setFacingMode] = React.useState<'user' | 'environment'>('environment');
    const [videoDevices, setVideoDevices] = React.useState<MediaDeviceInfo[]>([]);
    const streamRef = React.useRef<MediaStream | null>(null);

     React.useEffect(() => {
        const getCameraStream = async () => {
            if (isCameraOpen) {
                if (streamRef.current) {
                    streamRef.current.getTracks().forEach(track => track.stop());
                }

                const constraints: MediaStreamConstraints = {
                    video: { facingMode }
                };

                try {
                    const stream = await navigator.mediaDevices.getUserMedia(constraints);
                    if (videoRef.current) {
                        videoRef.current.srcObject = stream;
                    }
                    streamRef.current = stream;
                    setHasCameraPermission(true);

                    const devices = await navigator.mediaDevices.enumerateDevices();
                    setVideoDevices(devices.filter(d => d.kind === 'videoinput'));

                } catch (error) {
                    console.error("Error accessing camera:", error);
                    setHasCameraPermission(false);
                    setIsCameraOpen(false);
                    toast({
                        variant: "destructive",
                        title: "Camera Access Error",
                        description: "Could not access the specified camera. Please check permissions."
                    });
                }
            } else {
                if (streamRef.current) {
                    streamRef.current.getTracks().forEach(track => track.stop());
                    streamRef.current = null;
                }
            }
        };

        getCameraStream();

        return () => {
            if (streamRef.current) {
                streamRef.current.getTracks().forEach(track => track.stop());
            }
        };
    }, [isCameraOpen, facingMode, toast]);


    const handleSwitchCamera = () => {
        setFacingMode(prev => (prev === 'user' ? 'environment' : 'user'));
    };

    const handleCapture = () => {
        if (videoRef.current && canvasRef.current) {
            const video = videoRef.current;
            const canvas = canvasRef.current;
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            canvas.getContext('2d')?.drawImage(video, 0, 0, video.videoWidth, video.videoHeight);
            const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
            
            if (cameraFor === 'license') setLicenseImage(dataUrl);
            if (cameraFor === 'selfie') setSelfieImage(dataUrl);

            setIsCameraOpen(false);
            setCameraFor(null);
        }
    };

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>, type: 'license' | 'selfie') => {
        const file = event.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                const result = reader.result as string;
                if (type === 'license') setLicenseImage(result);
                if (type === 'selfie') setSelfieImage(result);
            };
            reader.readAsDataURL(file);
        }
    };
    
     const handleContactVerification = async (
        type: 'email' | 'phone',
        value: string,
        setVerifying: (isVerifying: boolean) => void,
        setVerified: (isVerified: boolean) => void
    ) => {
        if (!value) {
            toast({ variant: "destructive", title: "Input Required", description: `Please enter a valid ${type}.` });
            return;
        }

        setVerifying(true);
        const result = await validateContactAction({
            email: type === 'email' ? value : undefined,
            phone: type === 'phone' ? value : undefined,
            country: userProfile?.country || 'United Kingdom' // Fallback to a default
        });
        setVerifying(false);

        if (result.isValid) {
            setVerified(true);
            toast({ 
                title: result.isWarning ? "Verification Notice" : "Validated", 
                description: result.reason || `This ${type} appears to be valid.`,
                variant: result.isWarning ? "default" : "default",
                className: result.isWarning ? "bg-amber-50 border-amber-200 dark:bg-amber-900/30 dark:border-amber-700" : ""
            });
        } else {
            setVerified(false);
            toast({ 
                variant: "destructive", 
                title: `Invalid ${type.charAt(0).toUpperCase() + type.slice(1)}`, 
                description: result.reason || `This ${type} is not valid.` 
            });
        }
    };


    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user || !userProfile?.communityId || !userProfile.name) {
            toast({ title: 'Error', description: 'You must be logged in to apply.', variant: 'destructive' });
            return;
        }
        if (!statement.trim() || !vehicleDetails.trim() || !licenseImage || !selfieImage || !isEmailVerified || !isPhoneVerified) {
            toast({ title: 'Missing Information', description: 'Please fill out all required fields and upload both required images, and verify your contact details.', variant: 'destructive' });
            return;
        }
        if (!agreedToTerms) {
            toast({ title: "Terms and Conditions", description: "You must agree to the financial terms and conditions.", variant: "destructive" });
            return;
        }

        setIsSubmitting(true);
        const result = await createCourierApplicationAction({
            applicantId: user.uid,
            applicantName: userProfile.name,
            communityId: userProfile.communityId,
            communityName: userProfile.communityName || "",
            statement,
            vehicleDetails,
            agreedToTerms: agreedToTerms,
            licenseImage,
            selfieImage,
            contactEmail,
            contactPhone,
            refName,
            refRelationship,
            refEmail,
            refPhone,
        });

        if (result.success) {
            setShowConfirmation(true);
        } else {
            toast({ title: 'Application Failed', description: result.error, variant: 'destructive' });
        }
        setIsSubmitting(false);
    };
    
    const handleDialogClose = () => {
        setShowConfirmation(false);
        router.push('/home');
    };

    const isLoading = isUserLoading || profileLoading || communityLoading;
    if (isLoading) {
        return <div className="flex items-center justify-center h-96"><Loader2 className="h-8 w-8 animate-spin" /></div>;
    }

    const isVisiting = userProfile?.homeCommunityId !== userProfile?.communityId;
    const courierRoleFilled = !!communityData?.courierId;
    let eligibilityErrorTitle = '';
    let eligibilityErrorDescription = '';

    if (isVisiting) {
        eligibilityErrorTitle = "Application Unavailable";
        eligibilityErrorDescription = "The Community Courier role is designed to generate local work within a user's home community. As you are currently visiting, you are not eligible to apply for this position.";
    } else if (courierRoleFilled) {
        eligibilityErrorTitle = "Position Filled";
        eligibilityErrorDescription = "This community already has an appointed courier. Thank you for your interest.";
    }

    if (eligibilityErrorTitle) {
        return (
            <div className="max-w-2xl mx-auto py-12 px-4">
                <Button asChild variant="ghost" className="mb-4">
                    <Link href="/home">
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Back Home
                    </Link>
                </Button>
                <Card>
                    <CardHeader>
                        <CardTitle>Become the Community Courier</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <Alert variant="destructive">
                            <AlertTriangle className="h-4 w-4" />
                            <AlertTitle>{eligibilityErrorTitle}</AlertTitle>
                            <AlertDescription>{eligibilityErrorDescription}</AlertDescription>
                        </Alert>
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <>
            <div className="max-w-2xl mx-auto py-12 px-4">
                <Button asChild variant="ghost" className="mb-4">
                    <Link href="/home">
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Back Home
                    </Link>
                </Button>
                <form onSubmit={handleSubmit}>
                    <Card>
                        <CardHeader>
                            <CardTitle>Become the Community Courier</CardTitle>
                            <CardDescription>
                                Apply to handle local deliveries for your community's Virtual Highstreet.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                             <div className="space-y-2">
                                <Label htmlFor="name">Full Name</Label>
                                <Input id="name" value={userProfile?.name || ''} disabled />
                             </div>
                             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="email">Contact Email Address *</Label>
                                    <div className="flex gap-2">
                                        <Input id="email" type="email" placeholder="e.g., jane.doe@example.com" value={contactEmail} onChange={(e) => {setContactEmail(e.target.value); setIsEmailVerified(false);}} disabled={isEmailVerified} />
                                        <Button type="button" variant="outline" onClick={() => handleContactVerification('email', contactEmail, setIsEmailVerifying, setIsEmailVerified)} disabled={isEmailVerifying || isEmailVerified}>
                                            {isEmailVerifying ? <Loader2 className="animate-spin" /> : isEmailVerified ? <CheckCircle className="text-green-500" /> : 'Verify'}
                                        </Button>
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="phone">Contact Phone Number *</Label>
                                    <div className="flex gap-2">
                                        <Input id="phone" placeholder="e.g., +447123456789" value={contactPhone} onChange={(e) => {setContactPhone(e.target.value); setIsPhoneVerified(false);}} disabled={isPhoneVerified} />
                                        <Button type="button" variant="outline" onClick={() => handleContactVerification('phone', contactPhone, setIsPhoneVerifying, setIsPhoneVerified)} disabled={isPhoneVerifying || isPhoneVerified}>
                                            {isPhoneVerifying ? <Loader2 className="animate-spin" /> : isPhoneVerified ? <CheckCircle className="text-green-500" /> : 'Verify'}
                                        </Button>
                                    </div>
                                </div>
                             </div>
                             <div className="space-y-2">
                                <div className="flex items-center gap-2">
                                    <Label htmlFor="statement">Why do you want to be the courier? *</Label>
                                    <Dialog>
                                        <DialogTrigger asChild>
                                            <Button type="button" variant="ghost" size="icon" className="h-5 w-5">
                                                <HelpCircle className="h-4 w-4 text-muted-foreground" />
                                            </Button>
                                        </DialogTrigger>
                                        <DialogContent>
                                            <DialogHeader>
                                                <DialogTitle>What to include in your statement</DialogTitle>
                                                <DialogDescription>
                                                    Your statement is your chance to tell the community leader why you're the best fit. Consider including:
                                                </DialogDescription>
                                            </DialogHeader>
                                            <ul className="list-disc space-y-2 pl-5 py-4 text-sm text-muted-foreground">
                                                <li>Your primary motivation for applying.</li>
                                                <li>Details about your business (if any), such as staff and vehicle numbers (including registrations).</li>
                                                <li>Your connection to the community and how long you've been a part of it.</li>
                                                <li>Confirmation that you have or will get appropriate 'Hire and Reward' insurance.</li>
                                                <li>Your planned operating days (a minimum of 5 per week is expected).</li>
                                                <li>Any other information that supports your application.</li>
                                            </ul>
                                        </DialogContent>
                                    </Dialog>
                                </div>
                                <Textarea
                                    id="statement"
                                    value={statement}
                                    onChange={(e) => setStatement(e.target.value)}
                                    placeholder="Tell us a bit about yourself and why you're a good fit for this role..."
                                    className="min-h-32"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="vehicle">Vehicle Details *</Label>
                                <Input
                                    id="vehicle"
                                    value={vehicleDetails}
                                    onChange={(e) => setVehicleDetails(e.target.value)}
                                    placeholder="e.g., Ford Transit Custom, Electric Cargo Bike"
                                />
                            </div>
                             <div className="space-y-4 pt-4 border-t">
                                <h3 className="font-medium">Reference Details (Optional)</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="ref-name">Reference Name</Label>
                                        <Input id="ref-name" placeholder="e.g., John Smith" value={refName} onChange={e => setRefName(e.target.value)} />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="ref-relationship">Relationship</Label>
                                        <Input id="ref-relationship" placeholder="e.g., Former Manager" value={refRelationship} onChange={e => setRefRelationship(e.target.value)} />
                                     </div>
                                     <div className="space-y-2">
                                        <Label htmlFor="ref-email">Reference Email</Label>
                                        <Input id="ref-email" type="email" placeholder="e.g., john.smith@example.com" value={refEmail} onChange={e => setRefEmail(e.target.value)} />
                                     </div>
                                     <div className="space-y-2">
                                        <Label htmlFor="ref-phone">Reference Phone</Label>
                                        <Input id="ref-phone" type="tel" placeholder="e.g., +447987654321" value={refPhone} onChange={e => setRefPhone(e.target.value)} />
                                    </div>
                                </div>
                            </div>
                            <div className="space-y-4 pt-4 border-t">
                                <h3 className="font-medium">2-Step Identity Verification</h3>
                                <div className="space-y-2">
                                    <Label>Driving License (Front Only) *</Label>
                                    <p className="text-xs text-muted-foreground">This is required for identity verification.</p>
                                    {licenseImage ? (
                                        <div className="relative w-48 h-32">
                                            <Image src={licenseImage} alt="License Preview" fill style={{objectFit:"cover"}} className="rounded-md" />
                                            <Button type="button" variant="destructive" size="icon" className="absolute -top-2 -right-2 h-7 w-7 rounded-full" onClick={() => setLicenseImage(null)}><X className="h-4 w-4" /></Button>
                                        </div>
                                    ) : (
                                        <div className="flex gap-2">
                                            <Button type="button" variant="outline" onClick={() => licenseFileInputRef.current?.click()}><Upload className="mr-2" /> Upload</Button>
                                            <input type="file" ref={licenseFileInputRef} onChange={(e) => handleFileChange(e, 'license')} accept="image/*" className="hidden" />
                                            <Button type="button" variant="outline" onClick={() => { setCameraFor('license'); setIsCameraOpen(true); }}><Camera className="mr-2" /> Take Picture</Button>
                                        </div>
                                    )}
                                </div>
                                 <div className="space-y-2">
                                    <Label>Identity Verification Photo (Selfie) *</Label>
                                    <p className="text-xs text-muted-foreground">Please take a clear photo of your face, preferably holding your licence or other form of ID.</p>
                                    {selfieImage ? (
                                        <div className="relative w-48 h-32">
                                            <Image src={selfieImage} alt="Selfie Preview" fill style={{objectFit:"cover"}} className="rounded-md" />
                                            <Button type="button" variant="destructive" size="icon" className="absolute -top-2 -right-2 h-7 w-7 rounded-full" onClick={() => setSelfieImage(null)}><X className="h-4 w-4" /></Button>
                                        </div>
                                    ) : (
                                        <div className="flex gap-2">
                                            <Button type="button" variant="outline" onClick={() => { setCameraFor('selfie'); setIsCameraOpen(true); }}><Camera className="mr-2" /> Take Picture</Button>
                                        </div>
                                    )}
                                </div>
                            </div>
                            <div className="flex items-center space-x-2 pt-4 border-t">
                                <Checkbox id="terms" checked={agreedToTerms} onCheckedChange={(checked) => setAgreedToTerms(checked as boolean)} />
                                <Label htmlFor="terms" className="text-sm font-normal">
                                    I agree to the{' '}
                                    <Dialog open={isTermsDialogOpen} onOpenChange={setIsTermsDialogOpen}>
                                        <DialogTrigger asChild>
                                            <span className="underline text-primary cursor-pointer">Courier Financial Terms & Conditions</span>
                                        </DialogTrigger>
                                        <DialogContent className="max-w-2xl grid-rows-[auto,minmax(0,1fr),auto] p-0 max-h-[85vh]">
                                            <DialogHeader className="p-6 pb-2 border-b">
                                                <DialogTitle>Courier Financial Terms</DialogTitle>
                                            </DialogHeader>
                                            <ScrollArea className="h-full">
                                                <div className="p-6">
                                                    <LegalDocumentDisplay documentId="SeR5wbQQneIQv9GKI2QM" />
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
                        </CardContent>
                        <CardFooter>
                            <Button type="submit" disabled={isSubmitting || !agreedToTerms || !isEmailVerified || !isPhoneVerified}>
                                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                <Send className="mr-2 h-4 w-4" />
                                Submit Application
                            </Button>
                        </CardFooter>
                    </Card>
                </form>
            </div>
             <Dialog open={showConfirmation} onOpenChange={handleDialogClose}>
                <DialogContent>
                    <DialogHeader className="items-center text-center">
                        <div className="p-3 bg-green-100 dark:bg-green-900/50 rounded-full inline-block mb-4">
                            <CheckCircle className="h-10 w-10 text-green-500" />
                        </div>
                        <DialogTitle className="text-2xl">Application Submitted!</DialogTitle>
                        <DialogDescription className="text-base text-muted-foreground !mt-4">
                            Your application has been sent to your community leader for review. You will receive a notification once a decision has been made.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter className="justify-center">
                        <Button type="button" onClick={handleDialogClose}>
                            Return to Home
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
            <Dialog open={isCameraOpen} onOpenChange={setIsCameraOpen}>
                <DialogContent>
                    <DialogHeader><DialogTitle>Take a Picture</DialogTitle></DialogHeader>
                    <video ref={videoRef} className="w-full aspect-video rounded-md bg-muted" autoPlay muted playsInline />
                    {hasCameraPermission === false && <Alert variant="destructive"><AlertTitle>Camera Access Required</AlertTitle><AlertDescription>Please allow camera access in your browser.</AlertDescription></Alert>}
                    <DialogFooter>
                        <Button onClick={handleCapture} disabled={hasCameraPermission !== true}><Camera className="mr-2" /> Capture</Button>
                        {videoDevices.length > 1 && (
                            <Button variant="outline" onClick={handleSwitchCamera}>
                                <RefreshCw className="mr-2 h-4 w-4" /> Switch Camera
                            </Button>
                        )}
                        <Button variant="outline" onClick={() => setIsCameraOpen(false)}>Cancel</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
            <canvas ref={canvasRef} className="hidden" />
        </>
    );
}

