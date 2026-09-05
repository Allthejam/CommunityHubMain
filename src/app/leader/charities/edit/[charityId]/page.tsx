"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter, useParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardFooter, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Loader2, Save, Upload, Camera, X, Search } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useUser, useFirestore, useDoc, useMemoFirebase } from "@/firebase";
import { doc } from "firebase/firestore";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { updateCharityAction } from "@/lib/actions/charityActions";
import { RichTextEditor } from "@/components/rich-text-editor";
import Image from "next/image";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";

const charityCategories = [
    "Community Support", "Animal Welfare", "Environment", "Youth Development", 
    "Health & Wellness", "Arts & Culture", "Education", "Other",
];

export default function EditCharityPage() {
    const { user } = useUser();
    const db = useFirestore();
    const router = useRouter();
    const params = useParams();
    const charityId = params?.charityId as string;
    const { toast } = useToast();

    const isDemo = typeof window !== 'undefined' && (sessionStorage.getItem('isDemoMode') === 'true' || window.location.pathname.startsWith('/demo'));
    const demoPrefix = isDemo ? '/demo' : '';
    const communityId = isDemo ? '9ayHMyZf4SRw2gof1AM9' : ((typeof window !== 'undefined' ? sessionStorage.getItem('visitedCommunityId') : null) || 'N3SarfGXPLxBI7XcsinX');

    const [isSubmitting, setIsSubmitting] = React.useState(false);
    const [title, setTitle] = React.useState('');
    const [category, setCategory] = React.useState('');
    const [description, setDescription] = React.useState('');
    const [address, setAddress] = React.useState('');
    const [website, setWebsite] = React.useState('');
    const [email, setEmail] = React.useState('');
    const [phone, setPhone] = React.useState('');
    const [registrationNumber, setRegistrationNumber] = React.useState('');
    const [image, setImage] = React.useState<string | null>(null);
    const [isCameraOpen, setIsCameraOpen] = React.useState(false);
    const [hasCameraPermission, setHasCameraPermission] = React.useState<boolean | null>(null);
    const [metaTitle, setMetaTitle] = React.useState("");
    const [metaDescription, setMetaDescription] = React.useState("");

    const videoRef = React.useRef<HTMLVideoElement>(null);
    const canvasRef = React.useRef<HTMLCanvasElement>(null);
    const fileInputRef = React.useRef<HTMLInputElement>(null);

    const charityRef = useMemoFirebase(() => (db && charityId && !charityId.startsWith('demo_') ? doc(db, 'charities', charityId) : null), [db, charityId]);
    const { data: charityData, isLoading: isDocLoading } = useDoc(charityRef);

    React.useEffect(() => {
        if (charityId?.startsWith('demo_') || (isDemo && typeof window !== 'undefined')) {
            try {
                const stored = JSON.parse(
                    sessionStorage.getItem(`demo_charities_${communityId}`) || 
                    localStorage.getItem(`demo_charities_${communityId}`) || '[]'
                );
                const found = stored.find((c: any) => c.id === charityId);
                if (found) {
                    setTitle(found.title || '');
                    setCategory(found.category || '');
                    setDescription(found.description || '');
                    setAddress(found.address || '');
                    setWebsite(found.website || '');
                    setEmail(found.email || '');
                    setPhone(found.phone || '');
                    setRegistrationNumber(found.registrationNumber || '');
                    setImage(found.image || null);
                    setMetaTitle(found.metaTitle || "");
                    setMetaDescription(found.metaDescription || "");
                    return;
                }
            } catch {}
        }

        if (charityData) {
            setTitle(charityData.title || '');
            setCategory(charityData.category || '');
            setDescription(charityData.description || '');
            setAddress(charityData.address || '');
            setWebsite(charityData.website || '');
            setEmail(charityData.email || '');
            setPhone(charityData.phone || '');
            setRegistrationNumber(charityData.registrationNumber || '');
            setImage(charityData.image || null);
            setMetaTitle(charityData.metaTitle || "");
            setMetaDescription(charityData.metaDescription || "");
        }
    }, [charityData, charityId, isDemo, communityId]);

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

    const handleSave = async () => {
        if (!charityId) return;

        setIsSubmitting(true);

        if (charityId.startsWith('demo_') || !user) {
            try {
                const stored = JSON.parse(
                    sessionStorage.getItem(`demo_charities_${communityId}`) || 
                    localStorage.getItem(`demo_charities_${communityId}`) || '[]'
                );
                const updated = stored.map((c: any) => c.id === charityId ? {
                    ...c,
                    title, category, description, address, website, email, phone, registrationNumber, image, metaTitle, metaDescription,
                    updatedAt: new Date().toISOString()
                } : c);
                sessionStorage.setItem(`demo_charities_${communityId}`, JSON.stringify(updated));
                localStorage.setItem(`demo_charities_${communityId}`, JSON.stringify(updated));
                toast({ title: "Listing Updated", description: "The charity information has been saved." });
                if (typeof window !== 'undefined') {
                    window.dispatchEvent(new CustomEvent('demo_charities_updated'));
                }
                router.push(`${demoPrefix}/leader/charities`);
            } catch (e: any) {
                toast({ title: "Error", description: e.message, variant: "destructive" });
            }
            setIsSubmitting(false);
            return;
        }

        const result = await updateCharityAction(charityId, {
            title, category, description, address, website, email, phone, registrationNumber, image, metaTitle, metaDescription
        }, communityId);

        if (result.success) {
            toast({ title: "Listing Updated", description: "The charity information has been saved." });
            if (typeof window !== 'undefined') {
                window.dispatchEvent(new CustomEvent('demo_charities_updated'));
            }
            router.push(`${demoPrefix}/leader/charities`);
        } else {
            toast({ title: "Error", description: result.error, variant: "destructive" });
        }
        setIsSubmitting(false);
    };
    
    if (isDocLoading && !charityId?.startsWith('demo_')) {
        return <div className="flex items-center justify-center h-96"><Loader2 className="h-8 w-8 animate-spin"/></div>;
    }

    return (
        <>
            <div className="space-y-8">
                <div>
                    <Button asChild variant="ghost" className="mb-4">
                        <Link href={`${demoPrefix}/leader/charities`}>
                            <ArrowLeft className="mr-2 h-4 w-4" />
                            Back to Charities
                        </Link>
                    </Button>
                    <h1 className="text-3xl font-bold tracking-tight font-headline">Edit Charity Listing</h1>
                    <p className="text-muted-foreground">Update the details for this charity.</p>
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
                                <Select value={category} onValueChange={setCategory}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select a category" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {charityCategories.map(cat => (
                                            <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="registrationNumber">Charity Registration Number (Optional)</Label>
                            <Input id="registrationNumber" value={registrationNumber} onChange={(e) => setRegistrationNumber(e.target.value)} />
                        </div>

                        <div className="space-y-2">
                            <Label>Description *</Label>
                            <RichTextEditor value={description} onChange={setDescription} />
                        </div>

                        <Separator />

                        <div className="grid md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <Label htmlFor="address">Address / Area Served</Label>
                                <Input id="address" value={address} onChange={(e) => setAddress(e.target.value)} />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="website">Website URL</Label>
                                <Input id="website" type="url" value={website} onChange={(e) => setWebsite(e.target.value)} />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="email">Public Contact Email</Label>
                                <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="phone">Contact Phone</Label>
                                <Input id="phone" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} />
                            </div>
                        </div>

                        <Separator />

                        <div className="space-y-2">
                            <Label>Charity Logo / Image</Label>
                            {image ? (
                                <div className="relative w-48 h-32 rounded-lg overflow-hidden border">
                                    <Image src={image} alt="Charity" fill className="object-cover" />
                                    <Button size="icon" variant="destructive" className="absolute top-1 right-1 h-6 w-6" onClick={() => setImage(null)}>
                                        <X className="h-3 w-3" />
                                    </Button>
                                </div>
                            ) : (
                                <div className="flex gap-2">
                                    <Button type="button" variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}>
                                        <Upload className="mr-2 h-4 w-4" /> Upload Image
                                    </Button>
                                    <Button type="button" variant="outline" size="sm" onClick={() => setIsCameraOpen(true)}>
                                        <Camera className="mr-2 h-4 w-4" /> Take Photo
                                    </Button>
                                    <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
                                </div>
                            )}
                        </div>
                    </CardContent>
                    <CardFooter className="flex justify-between border-t p-6">
                        <Button variant="outline" onClick={() => router.push(`${demoPrefix}/leader/charities`)}>Cancel</Button>
                        <Button onClick={handleSave} disabled={isSubmitting}>
                            {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                            Save Changes
                        </Button>
                    </CardFooter>
                </Card>
            </div>

            <Dialog open={isCameraOpen} onOpenChange={setIsCameraOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Take Photo</DialogTitle>
                    </DialogHeader>
                    <div className="relative aspect-video bg-black rounded-lg overflow-hidden">
                        <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover" />
                        <canvas ref={canvasRef} className="hidden" />
                    </div>
                    <div className="flex justify-end gap-2">
                        <Button variant="outline" onClick={() => setIsCameraOpen(false)}>Cancel</Button>
                        <Button onClick={handleCapture}>Capture</Button>
                    </div>
                </DialogContent>
            </Dialog>
        </>
    );
}
