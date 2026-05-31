"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Loader2, Save, Upload, Camera, X, Search } from "lucide-react";
import Image from "next/image";

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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useUser, useDoc, useMemoFirebase, useFirestore } from "@/firebase";
import { doc } from 'firebase/firestore';
import { createCharityAction } from "@/lib/actions/charityActions";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { RichTextEditor } from "@/components/rich-text-editor";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";


const charityCategories = [
    "Community Support",
    "Animal Welfare",
    "Environment",
    "Youth Development",
    "Health & Wellness",
    "Arts & Culture",
    "Education",
    "Other",
];

export default function CreateCharityPage() {
    const { user } = useUser();
    const db = useFirestore();
    const userProfileRef = useMemoFirebase(() => (user ? doc(db, 'users', user.uid) : null), [user, db]);
    const { data: userProfile } = useDoc(userProfileRef);

    const router = useRouter();
    const { toast } = useToast();

    const [isSubmitting, setIsSubmitting] = React.useState(false);
    const [title, setTitle] = React.useState('');
    const [category, setCategory] = React.useState('');
    const [description, setDescription] = React.useState('');
    const [address, setAddress] = React.useState('');
    const [website, setWebsite] = React.useState('');
    const [email, setEmail] = React.useState('');
    const [phone, setPhone] = React.useState('');
    const [image, setImage] = React.useState<string | null>(null);
    const [registrationNumber, setRegistrationNumber] = React.useState('');
    const [isCameraOpen, setIsCameraOpen] = React.useState(false);
    const [hasCameraPermission, setHasCameraPermission] = React.useState<boolean | null>(null);
    const [metaTitle, setMetaTitle] = React.useState("");
    const [metaDescription, setMetaDescription] = React.useState("");

    const videoRef = React.useRef<HTMLVideoElement>(null);
    const canvasRef = React.useRef<HTMLCanvasElement>(null);
    const fileInputRef = React.useRef<HTMLInputElement>(null);

     React.useEffect(() => {
        if (isCameraOpen) {
            const getCameraPermission = async () => {
                try {
                    const stream = await navigator.mediaDevices.getUserMedia({ video: true });
                    setHasCameraPermission(true);
                    if (videoRef.current) videoRef.current.srcObject = stream;
                } catch (error) {
                    setHasCameraPermission(false);
                    setIsCameraOpen(false);
                    toast({ variant: "destructive", title: "Camera Access Denied", description: "Please enable camera permissions in your browser settings." });
                }
            };
            getCameraPermission();
        } else if (videoRef.current?.srcObject) {
            (videoRef.current.srcObject as MediaStream).getTracks().forEach(track => track.stop());
        }
    }, [isCameraOpen, toast]);

    const handleCapture = () => {
        if (videoRef.current && canvasRef.current) {
            const video = videoRef.current;
            const canvas = canvasRef.current;
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            canvas.getContext('2d')?.drawImage(video, 0, 0, video.videoWidth, video.videoHeight);
            setImage(canvas.toDataURL('image/jpeg', 0.9));
            setIsCameraOpen(false);
        }
    };

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => setImage(reader.result as string);
            reader.readAsDataURL(file);
        }
    };

    const handleSubmit = async () => {
        if (!userProfile?.communityId || !title || !description || !category) {
            toast({ title: "Missing Fields", description: "Please fill in title, category, and description.", variant: "destructive" });
            return;
        }
        setIsSubmitting(true);
        const result = await createCharityAction({
            communityId: userProfile.communityId,
            title, category, description, address, website, email, phone, image, registrationNumber, metaTitle, metaDescription
        });

        if (result.success) {
            toast({ title: "Listing Created", description: "The charity has been submitted for review." });
            router.push("/leader/charities");
        } else {
            toast({ title: "Error", description: result.error, variant: "destructive" });
        }

        setIsSubmitting(false);
    };
    
    return (
        <>
        <div className="space-y-8">
            <div>
                <Button asChild variant="ghost" className="mb-4">
                    <Link href="/leader/charities">
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Back to Charities
                    </Link>
                </Button>
                <h1 className="text-3xl font-bold tracking-tight font-headline">Create Charity Listing</h1>
                <p className="text-muted-foreground">Add a new charity or non-profit to your community's directory.</p>
            </div>
            <Card>
                <CardHeader>
                    <CardTitle>Charity Details</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="grid md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <Label htmlFor="title">Charity Name *</Label>
                            <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} />
                        </div>
                         <div className="space-y-2">
                            <Label htmlFor="category">Category *</Label>
                            <Select onValueChange={setCategory} value={category}>
                                <SelectTrigger id="category"><SelectValue placeholder="Select a category..." /></SelectTrigger>
                                <SelectContent>
                                    {charityCategories.map(cat => <SelectItem key={cat} value={cat}>{cat}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="description">Description *</Label>
                        <RichTextEditor
                            value={description}
                            onChange={setDescription}
                            placeholder="Describe the charity's mission and work..."
                        />
                    </div>
                     <div className="space-y-2">
                        <Label htmlFor="registration-number">Registration Number (Optional)</Label>
                        <Input id="registration-number" value={registrationNumber} onChange={(e) => setRegistrationNumber(e.target.value)} />
                    </div>
                    <div className="space-y-2">
                        <Label>Image</Label>
                        {image ? (
                             <div className="relative w-48 h-36">
                                <Image src={image} alt="Preview" fill style={{objectFit:"cover"}} className="rounded-md" />
                                <Button type="button" variant="destructive" size="icon" className="absolute -top-2 -right-2 h-7 w-7 rounded-full" onClick={() => setImage(null)}><X className="h-4 w-4" /></Button>
                            </div>
                        ) : (
                            <div className="flex gap-2">
                                <Button type="button" variant="outline" onClick={() => fileInputRef.current?.click()}><Upload className="mr-2" /> Upload</Button>
                                <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/*" className="hidden" />
                                <Button type="button" variant="outline" onClick={() => setIsCameraOpen(true)}><Camera className="mr-2" /> Take Picture</Button>
                            </div>
                        )}
                        <canvas ref={canvasRef} className="hidden" />
                    </div>
                     <div className="space-y-2">
                        <Label htmlFor="address">Address</Label>
                        <Input id="address" value={address} onChange={(e) => setAddress(e.target.value)} />
                    </div>
                    <div className="grid md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <Label htmlFor="website">Website</Label>
                            <Input id="website" type="url" value={website} onChange={(e) => setWebsite(e.target.value)} />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="email">Public Email</Label>
                            <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="phone">Public Phone</Label>
                            <Input id="phone" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} />
                        </div>
                    </div>
                    <Separator />

                    <Card className="border-border/70">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2"><Search className="h-5 w-5" /> Search engine optimization</CardTitle>
                            <CardDescription>
                            Improve your ranking and how your charity page will appear in search engines results.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="p-4 border rounded-lg bg-muted/50">
                                <p className="text-blue-800 dark:text-blue-400 text-lg font-medium group-hover:underline truncate">{metaTitle || title || 'Charity Page Title'}</p>
                                <p className="text-green-700 dark:text-green-400 text-sm">https://my-community-hub.co.uk/charities/[ID will appear here]</p>
                                <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{metaDescription || 'Your compelling meta description will appear here, helping you attract more supporters from search results.'}</p>
                            </div>

                            <div className="space-y-2">
                                <div className="flex justify-between items-center">
                                    <Label htmlFor="metaTitle">Meta title</Label>
                                    <span className="text-xs text-muted-foreground">{metaTitle.length} / 70</span>
                                </div>
                                <Input id="metaTitle" placeholder="Public title for the charity page..." value={metaTitle} onChange={(e) => setMetaTitle(e.target.value)} maxLength={70}/>
                            </div>
                            <div className="space-y-2">
                                <div className="flex justify-between items-center">
                                    <Label htmlFor="metaDescription">Meta description</Label>
                                    <span className="text-xs text-muted-foreground">{metaDescription.length} / 160</span>
                                </div>
                                <Textarea id="metaDescription" placeholder="This description will appear in search engines..." value={metaDescription} onChange={(e) => setMetaDescription(e.target.value)} maxLength={160} />
                            </div>
                        </CardContent>
                    </Card>
                </CardContent>
                <CardFooter>
                    <Button onClick={handleSubmit} disabled={isSubmitting}>
                        {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                        Save & Submit for Review
                    </Button>
                </CardFooter>
            </Card>
        </div>
         <Dialog open={isCameraOpen} onOpenChange={setIsCameraOpen}>
            <DialogContent>
                <DialogHeader><DialogTitle>Take a Picture</DialogTitle></DialogHeader>
                <video ref={videoRef} className="w-full aspect-video rounded-md bg-muted" autoPlay muted playsInline />
                {hasCameraPermission === false && <Alert variant="destructive"><AlertTitle>Camera Access Required</AlertTitle><AlertDescription>Please allow camera access in your browser.</AlertDescription></Alert>}
                <div className="flex gap-2"><Button onClick={handleCapture} disabled={hasCameraPermission !== true}><Camera className="mr-2" /> Capture</Button><Button variant="outline" onClick={() => setIsCameraOpen(false)}>Cancel</Button></div>
            </DialogContent>
        </Dialog>
        </>
    );
}
