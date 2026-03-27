

"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter, useParams } from "next/navigation";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { ArrowLeft, Upload, Camera, X, Loader2, Save } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { saveAdvertAsDraft } from "@/lib/actions/advertActions";
import { RichTextEditor } from "@/components/rich-text-editor";
import { doc } from "firebase/firestore";
import { useUser, useFirestore, useDoc, useMemoFirebase } from "@/firebase";
import { Textarea } from "@/components/ui/textarea";
import Image from "next/image";

const EditAdvertPageContent = () => {
    const router = useRouter();
    const params = useParams();
    const advertId = params.advertId as string;
    
    const { user } = useUser();
    const db = useFirestore();

    const [isSavingDraft, setIsSavingDraft] = React.useState(false);

    const [headline, setHeadline] = React.useState("");
    const [shortDescription, setShortDescription] = React.useState("");
    const [fullDescription, setFullDescription] = React.useState("");
    const [primaryLinkType, setPrimaryLinkType] = React.useState("website");
    const [websiteLink, setWebsiteLink] = React.useState("https://your-brand.com");
    const [emailAddress, setEmailAddress] = React.useState("");
    const [adImage, setAdImage] = React.useState<string | null>(null);
    const [advertType, setAdvertType] = React.useState<'featured' | 'partner'>('featured');


    const [isCameraOpen, setIsCameraOpen] = React.useState(false);
    const [hasCameraPermission, setHasCameraPermission] = React.useState<boolean | null>(null);

    const { toast } = useToast();
    const fileInputRef = React.useRef<HTMLInputElement>(null);
    const videoRef = React.useRef<HTMLVideoElement>(null);
    const canvasRef = React.useRef<HTMLCanvasElement>(null);

    const adTypeName = advertType === "featured" ? "Featured Ad" : "Partner Ad";
    const backLink = '/enterprise/adverts';

    const advertRef = useMemoFirebase(() => {
        if (!advertId || !db) return null;
        return doc(db, 'adverts', advertId as string);
    }, [advertId, db]);

    const { data: advertData, isLoading: advertLoading } = useDoc(advertRef);
    
    React.useEffect(() => {
        if (advertData) {
            setHeadline(advertData.headline || advertData.title || "");
            setShortDescription(advertData.shortDescription || "");
            setFullDescription(advertData.fullDescription || advertData.description || "");
            setPrimaryLinkType(advertData.primaryLinkType || "website");
            setWebsiteLink(advertData.websiteLink || "https://your-brand.com");
            setEmailAddress(advertData.emailAddress || "");
            setAdImage(advertData.image || null);
            setAdvertType(advertData.type || 'featured');
        }
    }, [advertData]);


    React.useEffect(() => {
        if (isCameraOpen) {
            const getCameraPermission = async () => {
                try {
                    const stream = await navigator.mediaDevices.getUserMedia({ video: true });
                    setHasCameraPermission(true);
                    if (videoRef.current) {
                        videoRef.current.srcObject = stream;
                    }
                } catch (error) {
                    console.error("Error accessing camera:", error);
                    setHasCameraPermission(false);
                    setIsCameraOpen(false);
                    toast({
                        variant: "destructive",
                        title: "Camera Access Denied",
                        description: "Please enable camera permissions in your browser settings to use this feature.",
                    });
                }
            };
            getCameraPermission();
        } else {
            if (videoRef.current && videoRef.current.srcObject) {
                const stream = videoRef.current.srcObject as MediaStream;
                stream.getTracks().forEach(track => track.stop());
                videoRef.current.srcObject = null;
            }
        }
    }, [isCameraOpen, toast]);

    const handleCapture = () => {
        if (videoRef.current && canvasRef.current) {
            const video = videoRef.current;
            const canvas = canvasRef.current;
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            const context = canvas.getContext('2d');
            context?.drawImage(video, 0, 0, video.videoWidth, video.videoHeight);
            const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
            setAdImage(dataUrl);
            setIsCameraOpen(false);
        }
    };

    const handleImageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            if (file.size > 2 * 1024 * 1024) { // 2MB limit
                toast({
                    title: "Image too large",
                    description: "Please upload an image smaller than 2MB.",
                    variant: "destructive"
                });
                return;
            }
            const reader = new FileReader();
            reader.onloadend = () => {
                setAdImage(reader.result as string);
            };
            reader.readAsDataURL(file);
        }
    };
    
    const handlePreview = () => {
        const adData = {
            id: advertId,
            type: advertType,
            headline: headline,
            shortDescription: shortDescription,
            fullDescription: fullDescription,
            primaryLinkType: primaryLinkType,
            websiteLink: websiteLink,
            emailAddress: emailAddress,
            image: adImage,
        };
        try {
            sessionStorage.setItem('advertPreviewData', JSON.stringify(adData));
            let previewUrl = `/enterprise/adverts/create/preview?type=${advertType}&id=${advertId}`;
            router.push(previewUrl);
        } catch (error) {
            toast({
                title: "Could not prepare preview",
                description: "There was an error saving the data for preview. The data might be too large.",
                variant: "destructive"
            });
            console.error("Error saving to sessionStorage:", error);
        }
    };

    const handleSaveDraft = async () => {
        if (!user) {
            toast({ title: "Not Authenticated", description: "You must be logged in to save a draft.", variant: "destructive" });
            return;
        }
        setIsSavingDraft(true);
        const adData = {
            id: advertId,
            type: advertType,
            title: headline,
            headline: headline,
            shortDescription: shortDescription,
            fullDescription: fullDescription,
            primaryLinkType: primaryLinkType,
            websiteLink: websiteLink,
            emailAddress: emailAddress,
            image: adImage,
        };

        const result = await saveAdvertAsDraft({ userId: user.uid, advertData: adData });

        if (result.success) {
            toast({ title: "Changes Saved", description: "Your advert has been saved." });
            sessionStorage.removeItem('advertPreviewData');
            router.push(backLink);
        } else {
            toast({ title: "Error", description: result.error, variant: "destructive" });
        }
        setIsSavingDraft(false);
    };

     if (advertLoading) {
        return (
            <div className="flex justify-center items-center h-96">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        );
    }


    return (
        <div className="space-y-8">
            <div>
                 <Button asChild variant="ghost" className="mb-4">
                    <Link href={backLink}>
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Back to Adverts
                    </Link>
                </Button>
                <h1 className="text-3xl font-bold tracking-tight font-headline">
                    Edit Campaign (Step 2 of 4)
                </h1>
                <p className="text-muted-foreground mt-2">
                    You are editing a <span className="font-semibold text-primary">'{adTypeName}'</span>. Please fill in the details.
                </p>
            </div>
            
            <Card>
                <CardContent className="pt-6 space-y-6">
                     <div className="grid gap-2">
                        <Label htmlFor="headline">Headline</Label>
                        <Input id="headline" value={headline} onChange={(e) => setHeadline(e.target.value)} placeholder="e.g., Your Business Name Here" />
                    </div>

                    <div className="grid gap-2">
                        <Label htmlFor="short-description">Short Description (On Card)</Label>
                        <Textarea id="short-description" value={shortDescription} onChange={(e) => setShortDescription(e.target.value)} placeholder="A very brief, one-sentence summary for the ad card..." maxLength={120} />
                         <p className={cn("text-sm text-right", shortDescription.length > 120 ? 'text-destructive' : 'text-muted-foreground')}>
                            {shortDescription.length} / 120
                        </p>
                    </div>

                    <div className="grid gap-2">
                        <Label htmlFor="full-description">Full Description (In Popup)</Label>
                        <RichTextEditor
                            value={fullDescription}
                            onChange={setFullDescription}
                            placeholder="The full, detailed description that appears when a user clicks 'Learn More'."
                        />
                    </div>

                    <div className="grid gap-3">
                        <Label>Primary Link</Label>
                        <RadioGroup value={primaryLinkType} onValueChange={setPrimaryLinkType} className="flex flex-wrap gap-4">
                            <div className="flex items-center space-x-2">
                                <RadioGroupItem value="website" id="website" />
                                <Label htmlFor="website" className="font-normal">Website Link</Label>
                            </div>
                            <div className="flex items-center space-x-2">
                                <RadioGroupItem value="email" id="email" />
                                <Label htmlFor="email" className="font-normal">Email Address</Label>
                            </div>
                            <div className="flex items-center space-x-2">
                                <RadioGroupItem value="profile" id="profile" />
                                <Label htmlFor="profile" className="font-normal">View Company Profile</Label>
                            </div>
                        </RadioGroup>
                         {primaryLinkType === 'website' && (
                            <div className="grid gap-2 pl-2">
                                <Label htmlFor="website-link" className="text-xs text-muted-foreground">Website Link</Label>
                                <Input id="website-link" type="url" value={websiteLink} onChange={(e) => setWebsiteLink(e.target.value)} placeholder="https://your-brand.com" />
                            </div>
                        )}
                        {primaryLinkType === 'email' && (
                            <div className="grid gap-2 pl-2">
                                <Label htmlFor="email-address" className="text-xs text-muted-foreground">Email Address</Label>
                                <Input id="email-address" type="email" value={emailAddress} onChange={(e) => setEmailAddress(e.target.value)} placeholder="contact@your-brand.com" />
                            </div>
                        )}
                    </div>
                    
                     <div className="grid gap-2">
                        <Label>Ad Image</Label>
                        <p className="text-sm text-muted-foreground">Attach an image. Please use a compressed image format (like JPG) to save space. Recommended size: 600x400 pixels.</p>
                        {isCameraOpen ? (
                            <div className="space-y-2">
                                <video ref={videoRef} className="w-full aspect-video rounded-md bg-muted" autoPlay muted playsInline />
                                {hasCameraPermission === false && (
                                    <Alert variant="destructive">
                                        <AlertTitle>Camera Access Required</AlertTitle>
                                        <AlertDescription>
                                            Please allow camera access in your browser to use this feature.
                                        </AlertDescription>
                                    </Alert>
                                )}
                                <div className="flex gap-2">
                                    <Button type="button" onClick={handleCapture} disabled={hasCameraPermission !== true}>
                                        <Camera className="mr-2" /> Capture
                                    </Button>
                                    <Button type="button" variant="outline" onClick={() => setIsCameraOpen(false)}>Cancel</Button>
                                </div>
                            </div>
                        ) : adImage ? (
                            <div className="relative w-48 h-32">
                                <Image src={adImage} alt="Ad image preview" layout="fill" objectFit="cover" className="rounded-md border" />
                                <Button
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
                                <Button type="button" variant="outline" onClick={() => fileInputRef.current?.click()}>
                                    <Upload className="mr-2" /> Upload Image
                                </Button>
                                <Button type="button" variant="outline" onClick={() => setIsCameraOpen(true)}>
                                    <Camera className="mr-2" /> Take Picture
                                </Button>
                                 <input type="file" ref={fileInputRef} onChange={handleImageChange} accept="image/*" className="hidden" />
                            </div>
                        )}
                         <canvas ref={canvasRef} className="hidden" />
                    </div>
                </CardContent>
                 <CardFooter className="flex-wrap gap-2">
                    <Button onClick={handlePreview}>
                        Preview Ad Campaign
                    </Button>
                     <Button variant="outline" onClick={handleSaveDraft} disabled={isSavingDraft}>
                        {isSavingDraft ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                        Save Changes
                    </Button>
                </CardFooter>
            </Card>
        </div>
    )
}

const SuspenseFallback = () => (
    <div className="flex justify-center items-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
    </div>
);

export default function EditAdvertPage() {
    return (
        <React.Suspense fallback={<SuspenseFallback />}>
            <EditAdvertPageContent />
        </React.Suspense>
    );
}
