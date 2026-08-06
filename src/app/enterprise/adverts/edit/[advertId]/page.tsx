"use client";

import * as React from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter, useParams, useSearchParams } from "next/navigation";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Upload, Camera, X, Loader2, Save, Eye, Youtube, RefreshCw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { DatePicker } from "@/components/ui/date-picker";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { getPricingPlans, type Plan } from "@/lib/actions/pricingActions";
import { RichTextEditor } from "@/components/rich-text-editor";
import { useUser, useFirestore, useDoc, useCollection, useMemoFirebase } from "@/firebase";
import { collection, query, where, doc } from "firebase/firestore";
import { saveAdvertAsDraft, updateAdvertAction } from "@/lib/actions/advertActions";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { uploadImageAction } from "@/lib/actions/storageActions";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

type Business = {
    id: string;
    businessName: string;
    status: string;
};


const EditAdvertPageContent = () => {
    const { user, isUserLoading: authLoading } = useUser();
    const db = useFirestore();
    const router = useRouter();
    const params = useParams();
    const advertId = params.advertId as string;
    const searchParams = useSearchParams();
    const advertType = searchParams.get('type');

    const { toast } = useToast();

    const [isUploading, setIsUploading] = React.useState(false);
    const [isSavingDraft, setIsSavingDraft] = React.useState(false);
    
    const [selectedBusiness, setSelectedBusiness] = React.useState<string>("");
    const [title, setTitle] = React.useState("");
    const [price, setPrice] = React.useState("");
    const [shortDescription, setShortDescription] = React.useState("");
    const [description, setDescription] = React.useState("");
    const [startDate, setStartDate] = React.useState<Date>();
    const [endDate, setEndDate] = React.useState<Date>();
    const [adImage, setAdImage] = React.useState<string | null>(null);
    const [isFamilyFriendly, setIsFamilyFriendly] = React.useState(true);
    const [videoUrl, setVideoUrl] = React.useState("");
    
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
    
    const businessesQuery = useMemoFirebase(() => (user ? query(collection(db, "businesses"), where("ownerId", "==", user.uid), where("accountType", "==", "enterprise")) : null), [user, db]);
    const { data: businesses, isLoading: businessesLoading } = useCollection<Business>(businessesQuery);
    
    const advertRef = useMemoFirebase(() => (advertId ? doc(db, 'adverts', advertId) : null), [advertId, db]);
    const { data: advertData, isLoading: advertLoading } = useDoc(advertRef);
    
    React.useEffect(() => {
        if (advertData) {
            setSelectedBusiness(advertData.businessId || "");
            setTitle(advertData.title || "");
            setPrice(advertData.price || "");
            setShortDescription(advertData.shortDescription || "");
            setDescription(advertData.fullDescription || advertData.description || "");
            setStartDate(advertData.startDate?.toDate());
            setEndDate(advertData.endDate?.toDate());
            setAdImage(advertData.image || null);
            setIsFamilyFriendly(advertData.isFamilyFriendly ?? true);
            setPrimaryLinkType(advertData.primaryLinkType || 'website');
            setWebsiteLink(advertData.websiteLink || '');
            setEmailAddress(advertData.emailAddress || '');
            setVideoUrl(advertData.videoUrl || '');
        }
    }, [advertData]);

    const handleImageUpload = async (file: File) => {
        if (!user || !advertId) return;
        setIsUploading(true);
        try {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            const base64Data = await new Promise<string>((resolve) => {
                reader.onloadend = () => resolve(reader.result as string);
            });
    
            const path = `advert_images/${advertId}/${Date.now()}_${file.name}`;
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
                const constraints: MediaStreamConstraints = { video: { facingMode } };
                try {
                    const stream = await navigator.mediaDevices.getUserMedia(constraints);
                    if (videoRef.current) videoRef.current.srcObject = stream;
                    streamRef.current = stream;
                    setHasCameraPermission(true);
                    const devices = await navigator.mediaDevices.enumerateDevices();
                    setVideoDevices(devices.filter(d => d.kind === 'videoinput'));
                } catch (error) {
                    setHasCameraPermission(false);
                    setIsCameraOpen(false);
                    toast({ variant: "destructive", title: "Camera Access Error" });
                }
            } else if (streamRef.current) {
                streamRef.current.getTracks().forEach(track => track.stop());
            }
        };
        getCameraStream();
        return () => { if (streamRef.current) streamRef.current.getTracks().forEach(track => track.stop()); };
    }, [isCameraOpen, facingMode, toast]);

     const handlePreview = () => {
        const campaignData = {
            id: advertId,
            businessId: selectedBusiness,
            businessName: businesses?.find(b => b.id === selectedBusiness)?.businessName || '',
            title: title,
            price: price,
            shortDescription: shortDescription,
            description: description,
            image: adImage,
            videoUrl: videoUrl,
            startDate: startDate?.toISOString(),
            endDate: endDate?.toISOString(),
            isFamilyFriendly: isFamilyFriendly,
            primaryLinkType: primaryLinkType,
            websiteLink: websiteLink,
            emailAddress: emailAddress,
            type: advertData?.type,
            scope: advertData?.scope,
            targetCategories: advertData?.targetCategories,
            targetGender: advertData?.targetGender,
            targetAgeRanges: advertData?.targetAgeRanges,
            targetCountryIds: advertData?.targetCountryIds,
            targetStateIds: advertData?.targetStateIds,
            targetRegionIds: advertData?.targetRegionIds,
            campaignDurationMonths: advertData?.campaignDurationMonths,
            metaTitle: advertData?.metaTitle,
            metaDescription: advertData?.metaDescription,
        };
        
        sessionStorage.setItem('advertPreviewData', JSON.stringify(campaignData));
        router.push(`/enterprise/adverts/create/preview?type=${advertType || 'local'}&id=${advertId}`);
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
            id: advertId,
            businessId: selectedBusiness,
            businessName: businesses?.find(b => b.id === selectedBusiness)?.businessName,
            title: title,
            price: price,
            shortDescription: shortDescription,
            fullDescription: description,
            image: adImage,
            startDate: startDate,
            endDate: endDate,
            isFamilyFriendly: isFamilyFriendly,
            metaTitle: advertData?.metaTitle,
            metaDescription: advertData?.metaDescription,
            type: advertType,
            scope: advertData?.scope || (advertType ? 'national' : 'community'),
            primaryLinkType,
            websiteLink: primaryLinkType === 'website' ? websiteLink : '',
            emailAddress: primaryLinkType === 'email' ? emailAddress : '',
            targetCategories: advertData?.targetCategories,
            targetGender: advertData?.targetGender,
            targetAgeRanges: advertData?.targetAgeRanges,
            targetCountryIds: advertData?.targetCountryIds,
            targetStateIds: advertData?.targetStateIds,
            targetRegionIds: advertData?.targetRegionIds,
            campaignDurationMonths: advertData?.campaignDurationMonths,
        };

        const result = await saveAdvertAsDraft({ userId: user.uid, advertData: adData });

        if (result.success) {
            toast({ title: "Draft Saved", description: "Your advert draft has been updated." });
            sessionStorage.removeItem('advertPreviewData');
            router.push('/enterprise/adverts');
        } else {
            toast({ title: "Error", description: result.error, variant: "destructive" });
        }
        setIsSavingDraft(false);
    };

    const loading = authLoading || businessesLoading || advertLoading;

    if (loading) {
        return <div className="flex justify-center items-center h-96"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>;
    }
    
    if (!advertData) {
        return <div className="text-center py-10"><h2 className="text-2xl font-bold">Advert Not Found</h2><p className="text-muted-foreground">The advert you are trying to edit does not exist.</p><Button asChild variant="link" className="mt-4"><Link href="/enterprise/adverts"><ArrowLeft className="mr-2 h-4 w-4" />Back to Adverts</Link></Button></div>;
    }

    return (
        <>
            <div className="space-y-8">
                 <div>
                    <Button asChild variant="ghost" className="mb-4">
                        <Link href="/enterprise/adverts">
                            <ArrowLeft className="mr-2 h-4 w-4" />
                            Back to Adverts
                        </Link>
                    </Button>
                    <h1 className="text-3xl font-bold tracking-tight font-headline">
                        Edit Campaign (Step 1 of 4)
                    </h1>
                     <p className="text-muted-foreground mt-2">
                        You are editing a '{advertType || 'local'}' advert. Please fill in the details.
                    </p>
                </div>
                
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
                                    {businesses && businesses.map(business => (
                                        <SelectItem key={business.id} value={business.id}>
                                            {business.businessName} ({business.status})
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="advert-title">Advert Title *</Label>
                            <Input id="advert-title" value={title} onChange={(e) => setTitle(e.target.value)} />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="short-description">Short Description *</Label>
                            <Textarea id="short-description" placeholder="A brief, one-sentence summary for the advert listing." value={shortDescription} onChange={(e) => setShortDescription(e.target.value)} maxLength={150} />
                             <p className="text-xs text-muted-foreground text-right">{shortDescription.length} / 150</p>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="price">Price (Optional)</Label>
                            <Input id="price" type="text" value={price} onChange={(e) => setPrice(e.target.value)} />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="advert-description">Full Description / Offer *</Label>
                             <RichTextEditor value={description} onChange={setDescription} />
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
                                    <Image src={adImage} alt="Ad image preview" fill style={{ objectFit: "cover" }} className="rounded-md border" />
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
                    </CardContent>
                     <CardFooter className="gap-2">
                        <Button onClick={handlePreview} disabled={!selectedBusiness || !title || !description || !startDate || !endDate}>
                            <Eye className="mr-2 h-4 w-4" />
                            Preview & Continue
                        </Button>
                         <Button variant="outline" onClick={handleSaveDraft} disabled={isSavingDraft}>
                            {isSavingDraft ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                            Save as Draft
                        </Button>
                    </CardFooter>
                </Card>
            </div>
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


export default function EditAdvertPage() {
    return (
        <React.Suspense fallback={<div className="flex justify-center items-center h-96"><Loader2 className="h-8 w-8 animate-spin" /></div>}>
            <EditAdvertPageContent />
        </React.Suspense>
    );
}
