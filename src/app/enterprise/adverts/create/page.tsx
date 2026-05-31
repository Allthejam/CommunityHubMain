"use client";

import * as React from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Upload, Loader2, Info, Save, X, Camera, Search, RefreshCw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { DatePicker } from "@/components/ui/date-picker";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { getPricingPlans, type Plan } from "@/lib/actions/pricingActions";
import { RichTextEditor } from "@/components/rich-text-editor";
import { useUser, useFirestore, useCollection, useMemoFirebase } from "@/firebase";
import { collection, query, where } from "firebase/firestore";
import { saveAdvertAsDraft } from "@/lib/actions/advertActions";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { uploadImageAction } from "@/lib/actions/storageActions";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

type Business = {
    id: string;
    businessName: string;
    status: "Pending Approval" | "Approved" | "Requires Amendment" | "Declined" | "Subscribed" | "Draft" | "Archived";
};


const CreateAdvertPageContent = () => {
    const { user, isUserLoading: authLoading } = useUser();
    const db = useFirestore();
    const router = useRouter();
    const { toast } = useToast();
    const searchParams = useSearchParams();
    const advertType = searchParams.get('type');

    const [selectedBusiness, setSelectedBusiness] = React.useState<string | null>(null);
    const [businessPlan, setBusinessPlan] = React.useState<Plan | null>(null);
    const [isUploading, setIsUploading] = React.useState(false);
    const [isSavingDraft, setIsSavingDraft] = React.useState(false);

    const [title, setTitle] = React.useState("");
    const [price, setPrice] = React.useState("");
    const [shortDescription, setShortDescription] = React.useState("");
    const [description, setDescription] = React.useState("");
    const [startDate, setStartDate] = React.useState<Date>();
    const [endDate, setEndDate] = React.useState<Date>();
    const [adImage, setAdImage] = React.useState<string | null>(null);
    const [isFamilyFriendly, setIsFamilyFriendly] = React.useState(true);
    const [metaTitle, setMetaTitle] = React.useState("");
    const [metaDescription, setMetaDescription] = React.useState("");
    
    const [primaryLinkType, setPrimaryLinkType] = React.useState('website');
    const [websiteLink, setWebsiteLink] = React.useState('');
    const [emailAddress, setEmailAddress] = React.useState('');

    const [isCameraOpen, setIsCameraOpen] = React.useState(false);
    const [hasCameraPermission, setHasCameraPermission] = React.useState<boolean | null>(null);
    const [facingMode, setFacingMode] = React.useState<'user' | 'environment'>('environment');
    const [videoDevices, setVideoDevices] = React.useState<MediaDeviceInfo[]>([]);
    const streamRef = React.useRef<MediaStream | null>(null);

    const fileInputRef = React.useRef<HTMLInputElement>(null);
    const videoRef = React.useRef<HTMLVideoElement>(null);
    const canvasRef = React.useRef<HTMLCanvasElement>(null);


    const ownedBusinessesQuery = useMemoFirebase(() => (user ? query(collection(db, "businesses"), where("ownerId", "==", user.uid), where("accountType", "==", "enterprise")) : null), [user, db]);

    const { data: availableBusinesses, isLoading: loadingOwned } = useCollection<Business>(ownedBusinessesQuery);
    
    const loading = authLoading || loadingOwned;

    
    React.useEffect(() => {
        const fetchPlans = async () => {
            const plans = await getPricingPlans();
            if (plans.business) {
                setBusinessPlan(plans.business);
            }
        };
        fetchPlans();
    }, []);
    
     const handleImageUpload = async (file: File) => {
        if (!user) return;
        setIsUploading(true);
        try {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            const base64Data = await new Promise<string>((resolve) => {
                reader.onloadend = () => resolve(reader.result as string);
            });
    
            const path = `advert_images/temp/${user.uid}_${Date.now()}_${file.name}`;
            const result = await uploadImageAction({ base64Data, path });
    
            if (result.success && result.url) {
                setAdImage(result.url);
                toast({ title: 'Image Uploaded' });
            } else {
                throw new Error(result.error || 'Image upload failed.');
            }
        } catch (error: any) {
            toast({ title: "Upload Failed", description: error.message, variant: "destructive" });
        } finally {
            setIsUploading(false);
        }
    };
    
    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;
        if (file.size > 2 * 1024 * 1024) {
            toast({ title: "Image too large", description: "Please upload an image smaller than 2MB.", variant: "destructive" });
            return;
        }
        handleImageUpload(file);
    };

    const handleCapture = async () => {
        if (videoRef.current && canvasRef.current) {
            const video = videoRef.current;
            const canvas = canvasRef.current;
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            canvas.getContext('2d')?.drawImage(video, 0, 0, video.videoWidth, video.videoHeight);
            const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
            setIsCameraOpen(false);

            // Convert dataURL to Blob/File to pass to handleImageUpload
            const blob = await (await fetch(dataUrl)).blob();
            const file = new File([blob], `capture-${Date.now()}.jpg`, { type: 'image/jpeg' });
            handleImageUpload(file);
        }
    };
    
    const handleSwitchCamera = () => {
        setFacingMode(prev => (prev === 'user' ? 'environment' : 'user'));
    };

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
    
    const handlePreview = () => {
        const adData = {
            businessId: selectedBusiness || '',
            businessName: availableBusinesses?.find(b => b.id === selectedBusiness)?.businessName || '',
            title: title,
            price: price,
            shortDescription: shortDescription,
            description: description,
            image: adImage,
            startDate: startDate?.toISOString(),
            endDate: endDate?.toISOString(),
            isFamilyFriendly: isFamilyFriendly,
            metaTitle: metaTitle,
            metaDescription: metaDescription,
            type: advertType,
            scope: advertType ? 'national' : 'community',
            primaryLinkType,
            websiteLink: primaryLinkType === 'website' ? websiteLink : '',
            emailAddress: primaryLinkType === 'email' ? emailAddress : '',
        };
        try {
            sessionStorage.setItem('advertPreviewData', JSON.stringify(adData));
            window.open(`/enterprise/adverts/create/preview?type=${advertType || 'local'}`, '_blank');
        } catch (error) {
             toast({
                title: "Could not prepare preview",
                description: "There was an error saving the data for preview.",
                variant: "destructive"
            });
        }
    };

    const handleSaveDraft = async () => {
        if (!user) {
            toast({ title: "Not Authenticated", description: "You must be logged in to save a draft.", variant: "destructive" });
            return;
        }
        if (!selectedBusiness || !title) {
            toast({ title: "Missing Information", description: "Please select a business and provide a title for the draft.", variant: "destructive" });
            return;
        }

        setIsSavingDraft(true);
        const adData = {
            businessId: selectedBusiness,
            businessName: availableBusinesses?.find(b => b.id === selectedBusiness)?.businessName,
            title: title,
            price: price,
            shortDescription: shortDescription,
            fullDescription: description,
            image: adImage,
            startDate: startDate,
            endDate: endDate,
            isFamilyFriendly: isFamilyFriendly,
            metaTitle: metaTitle,
            metaDescription: metaDescription,
            type: advertType,
            scope: advertType ? 'national' : 'community',
            primaryLinkType,
            websiteLink: primaryLinkType === 'website' ? websiteLink : '',
            emailAddress: primaryLinkType === 'email' ? emailAddress : '',
        };

        const result = await saveAdvertAsDraft({ userId: user.uid, advertData: adData });

        if (result.success) {
            toast({ title: "Draft Saved", description: "Your advert has been saved as a draft." });
            sessionStorage.removeItem('advertPreviewData');
            router.push('/enterprise/adverts');
        } else {
            toast({ title: "Error", description: result.error, variant: "destructive" });
        }
        setIsSavingDraft(false);
    };


    if (loading) {
        return (
            <div className="flex justify-center items-center h-96">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        )
    }

    return (
        <div className="space-y-8">
            <div>
                 <Button asChild variant="ghost" className="mb-4">
                    <Link href="/enterprise/adverts">
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Back to Adverts
                    </Link>
                </Button>
                <h1 className="text-3xl font-bold tracking-tight font-headline">
                    Create New Advert (Step 1 of 4)
                </h1>
                <p className="text-muted-foreground mt-2">
                   Fill in the details for your new advert.
                </p>
            </div>
            
            <Alert>
                <Info className="h-4 w-4" />
                <AlertTitle>Advert Information</AlertTitle>
                <AlertDescription>
                You are creating a {advertType ? `${advertType} advert` : 'local advert'}. Local adverts use your free slots first.
                </AlertDescription>
            </Alert>

            <Card>
                <CardHeader>
                    <CardTitle>Advert Details</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                     <div className="space-y-2">
                        <Label htmlFor="business-select">Group *</Label>
                            <Select onValueChange={setSelectedBusiness} value={selectedBusiness || ""}>
                            <SelectTrigger id="business-select">
                                <SelectValue placeholder="Select a group to associate the advert with." />
                            </SelectTrigger>
                            <SelectContent>
                                {availableBusinesses && availableBusinesses.length > 0 ? availableBusinesses.map(business => (
                                    <SelectItem key={business.id} value={business.id}>
                                        {business.businessName} ({business.status})
                                    </SelectItem>
                                )) : <p className="p-4 text-sm text-muted-foreground">No enterprise groups found. Please create one first.</p>}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className={cn("space-y-6 transition-opacity", !selectedBusiness && "opacity-50 pointer-events-none")}>
                        <div className="space-y-2">
                            <Label htmlFor="advert-title">Advert Title *</Label>
                            <Input id="advert-title" placeholder="e.g., 2-for-1 Tuesdays" value={title} onChange={(e) => setTitle(e.target.value)} />
                        </div>
                         <div className="space-y-2">
                            <Label htmlFor="short-description">Short Description *</Label>
                            <Textarea
                                id="short-description"
                                placeholder="A brief, one-sentence summary for the advert listing."
                                value={shortDescription}
                                onChange={(e) => setShortDescription(e.target.value)}
                                maxLength={150}
                            />
                             <p className="text-xs text-muted-foreground text-right">{shortDescription.length} / 150</p>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="price">Price (Optional)</Label>
                            <Input id="price" placeholder="e.g., £10.00" type="text" value={price} onChange={(e) => setPrice(e.target.value)} />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="advert-description">Full Description / Offer *</Label>
                            <RichTextEditor
                                value={description}
                                onChange={setDescription}
                                placeholder="Describe your offer or promotion..."
                            />
                        </div>
                        <Separator />
                        <div className="space-y-4">
                            <Label>Primary Link *</Label>
                            <RadioGroup value={primaryLinkType} onValueChange={setPrimaryLinkType} className="flex flex-col sm:flex-row gap-4">
                                <Label htmlFor="link-website" className="flex items-center gap-2 p-3 border rounded-md has-[:checked]:bg-primary/5 has-[:checked]:border-primary cursor-pointer flex-1">
                                    <RadioGroupItem value="website" id="link-website" />
                                    Website Link
                                </Label>
                                <Label htmlFor="link-email" className="flex items-center gap-2 p-3 border rounded-md has-[:checked]:bg-primary/5 has-[:checked]:border-primary cursor-pointer flex-1">
                                    <RadioGroupItem value="email" id="link-email" />
                                    Email Address
                                </Label>
                                 <Label htmlFor="link-profile" className="flex items-center gap-2 p-3 border rounded-md has-[:checked]:bg-primary/5 has-[:checked]:border-primary cursor-pointer flex-1">
                                    <RadioGroupItem value="profile" id="link-profile" />
                                    View Company Profile
                                </Label>
                            </RadioGroup>
                            {primaryLinkType === 'website' && (
                                <div className="space-y-2 pl-2">
                                    <Label htmlFor="website-link">Website URL</Label>
                                    <Input id="website-link" type="url" value={websiteLink} onChange={e => setWebsiteLink(e.target.value)} placeholder="https://your-brand.com" />
                                </div>
                            )}
                            {primaryLinkType === 'email' && (
                                <div className="space-y-2 pl-2">
                                    <Label htmlFor="email-address">Contact Email</Label>
                                    <Input id="email-address" type="email" value={emailAddress} onChange={e => setEmailAddress(e.target.value)} placeholder="contact@your-brand.com" />
                                </div>
                            )}
                             {primaryLinkType === 'profile' && (
                                <p className="text-xs text-muted-foreground pl-2">The button will link to your main enterprise group profile page.</p>
                            )}
                        </div>

                        <Separator />
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="start-date">Start Date *</Label>
                                <DatePicker date={startDate} setDate={setStartDate} />
                            </div>
                                <div className="space-y-2">
                                <Label htmlFor="end-date">End Date *</Label>
                                <DatePicker date={endDate} setDate={setEndDate} />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="image-upload">Advert Image</Label>
                             <p className="text-sm text-muted-foreground">Recommended size: 800px by 600px.</p>
                            {adImage ? (
                                <div className="relative w-48 h-32">
                                    <Image src={adImage} alt="Ad image preview" fill style={{objectFit:"cover"}} className="rounded-md border" />
                                    <Button
                                        type="button"
                                        variant="destructive"
                                        size="icon"
                                        className="absolute -top-2 -right-2 h-7 w-7 rounded-full"
                                        onClick={() => setAdImage(null)}
                                    >
                                        <X className="h-4 w-4" />
                                    </Button>
                                </div>
                            ) : (
                                <div className="flex gap-2">
                                    <Button type="button" variant="outline" onClick={() => fileInputRef.current?.click()} disabled={isUploading}>
                                        {isUploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
                                        Upload Image
                                    </Button>
                                    <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/*" className="hidden" />
                                     <Button type="button" variant="outline" onClick={() => setIsCameraOpen(true)} disabled={isUploading}><Camera className="mr-2 h-4 w-4" /> Take Picture</Button>
                                </div>
                            )}
                        </div>
                        <div className="space-y-2">
                            <Label>Marketing Preference</Label>
                            <div className="flex items-center space-x-2 rounded-lg border p-4">
                                <Switch id="family-friendly" checked={isFamilyFriendly} onCheckedChange={setIsFamilyFriendly} />
                                <div>
                                    <Label htmlFor="family-friendly">Suitable for younger viewers</Label>
                                    <p className="text-xs text-muted-foreground">If turned off, this advert will only be shown to users over 18 and displayed after 9 PM.</p>
                                </div>
                            </div>
                        </div>
                        <Separator />
                        <Card className="border-border/70">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2"><Search className="h-5 w-5" /> Search Engine Optimization</CardTitle>
                                <CardDescription>
                                Improve your ranking and how your advert page will appear in search engines results.
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-6">
                                <div className="p-4 border rounded-lg bg-muted/50">
                                    <p className="text-blue-800 dark:text-blue-400 text-lg font-medium group-hover:underline truncate">{metaTitle || title || 'Advert Title'}</p>
                                    <p className="text-green-700 dark:text-green-400 text-sm">https://my-community-hub.co.uk/adverts/{title?.toLowerCase().replace(/\s+/g, '-') || 'your-advert'}</p>
                                    <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{metaDescription || 'Your compelling meta description will appear here, helping you attract more visitors from search results.'}</p>
                                </div>
                                <div className="space-y-2">
                                    <div className="flex justify-between items-center">
                                        <Label htmlFor="metaTitle">Meta Title</Label>
                                        <span className="text-xs text-muted-foreground">{metaTitle.length} / 70</span>
                                    </div>
                                    <Input id="metaTitle" placeholder="Public title for the advert page..." value={metaTitle} onChange={(e) => setMetaTitle(e.target.value)} maxLength={70}/>
                                </div>
                                <div className="space-y-2">
                                    <div className="flex justify-between items-center">
                                        <Label htmlFor="metaDescription">Meta Description</Label>
                                        <span className="text-xs text-muted-foreground">{metaDescription.length} / 160</span>
                                    </div>
                                    <Textarea id="metaDescription" placeholder="This description will appear in search engines..." value={metaDescription} onChange={(e) => setMetaDescription(e.target.value)} maxLength={160} />
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </CardContent>
                 <CardFooter className="gap-2">
                    <Button onClick={handlePreview} disabled={!selectedBusiness || !title || !description || !startDate || !endDate}>
                        Preview Advert
                    </Button>
                     <Button variant="outline" onClick={handleSaveDraft} disabled={isSavingDraft}>
                        {isSavingDraft ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                        Save as Draft
                    </Button>
                </CardFooter>
            </Card>
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
        </div>
    )
}


export default function CreateAdvertPage() {
    return (
        <React.Suspense fallback={<div className="flex justify-center items-center h-96"><Loader2 className="h-8 w-8 animate-spin" /></div>}>
            <CreateAdvertPageContent />
        </React.Suspense>
    );
}
