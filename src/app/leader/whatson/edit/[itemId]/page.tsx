
"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter, useParams } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Loader2, Save, Upload, Camera, X, Search } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useUser, useFirestore, useDoc, useMemoFirebase } from "@/firebase";
import { doc } from "firebase/firestore";
import { RichTextEditor } from "@/components/rich-text-editor";
import { updateWhatsonItemAction } from "@/lib/actions/whatsonActions";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import Image from "next/image";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { getDropdownOptions } from "@/lib/actions/dropdownActions";

export default function EditWhatsonItemPage() {
    const { user } = useUser();
    const db = useFirestore();
    const router = useRouter();
    const params = useParams();
    const itemId = params.itemId as string;
    const userProfileRef = useMemoFirebase(() => (user ? doc(db, 'users', user.uid) : null), [user, db]);
    const { data: userProfile } = useDoc(userProfileRef);
    const { toast } = useToast();

    const [title, setTitle] = React.useState('');
    const [category, setCategory] = React.useState('');
    const [description, setDescription] = React.useState('');
    const [address, setAddress] = React.useState('');
    const [website, setWebsite] = React.useState('');
    const [phone, setPhone] = React.useState('');
    const [email, setEmail] = React.useState('');
    const [social, setSocial] = React.useState('');
    const [openingHours, setOpeningHours] = React.useState({
        monday: { open: '', close: '', closed: false },
        tuesday: { open: '', close: '', closed: false },
        wednesday: { open: '', close: '', closed: false },
        thursday: { open: '', close: '', closed: false },
        friday: { open: '', close: '', closed: false },
        saturday: { open: '', close: '', closed: false },
        sunday: { open: '', close: '', closed: false },
    });
    const [image, setImage] = React.useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = React.useState(false);
    const [isUploading, setIsUploading] = React.useState(false);
    const fileInputRef = React.useRef<HTMLInputElement>(null);
    const [showOtherCategory, setShowOtherCategory] = React.useState(false);
    const [customCategory, setCustomCategory] = React.useState('');
    const [showOpeningHours, setShowOpeningHours] = React.useState(true);
    const [isCameraOpen, setIsCameraOpen] = React.useState(false);
    const [hasCameraPermission, setHasCameraPermission] = React.useState<boolean | null>(null);

    const [metaTitle, setMetaTitle] = React.useState("");
    const [metaDescription, setMetaDescription] = React.useState("");

    const videoRef = React.useRef<HTMLVideoElement>(null);
    const canvasRef = React.useRef<HTMLCanvasElement>(null);
    
    const [itemCategories, setItemCategories] = React.useState<any[]>([]);
    const [loadingCategories, setLoadingCategories] = React.useState(true);

    const itemRef = useMemoFirebase(() => (userProfile?.communityId && itemId ? doc(db, 'whatson', itemId) : null), [userProfile?.communityId, itemId, db]);
    const { data: itemData, isLoading } = useDoc(itemRef);

    React.useEffect(() => {
        async function fetchCategories() {
            setLoadingCategories(true);
            const options = await getDropdownOptions();
            setItemCategories(options.whatsonCategories || []);
            setLoadingCategories(false);
        }
        fetchCategories();
    }, []);

    React.useEffect(() => {
        if (itemData && itemCategories.length > 0) {
            setTitle(itemData.title || '');
            const initialCategory = itemData.category || '';
            const categoryExists = itemCategories.some(cat => 
                (typeof cat === 'string' && cat === initialCategory) ||
                (typeof cat === 'object' && cat.name === initialCategory)
            );

            if (categoryExists) {
                setCategory(initialCategory);
                setShowOtherCategory(false);
            } else if (initialCategory) {
                setShowOtherCategory(true);
                setCategory('Other');
                setCustomCategory(initialCategory);
            }
            setDescription(itemData.description || '');
            setAddress(itemData.address || '');
            setWebsite(itemData.website || '');
            setPhone(itemData.phone || '');
            setEmail(itemData.email || '');
            setSocial(itemData.social || '');
            if (itemData.openingHours && Object.keys(itemData.openingHours).length > 0) {
                setOpeningHours(itemData.openingHours);
                setShowOpeningHours(true);
            } else {
                setShowOpeningHours(false);
            }
            setImage(itemData.image || null);
            setMetaTitle(itemData.metaTitle || "");
            setMetaDescription(itemData.metaDescription || "");
        }
    }, [itemData, itemCategories]);

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


    const handleHourChange = (day: keyof typeof openingHours, field: 'open' | 'close', value: string) => {
        setOpeningHours(prev => ({ ...prev, [day]: { ...prev[day], [field]: value } }));
    };
    const handleClosedToggle = (day: keyof typeof openingHours, isClosed: boolean) => {
        setOpeningHours(prev => ({
            ...prev,
            [day]: { ...prev[day], closed: isClosed }
        }));
    };
    
    const handleImageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            setIsUploading(true);
            const reader = new FileReader();
            reader.onloadend = () => {
                setImage(reader.result as string);
                setIsUploading(false);
            };
            reader.readAsDataURL(file);
        }
    };
    
    const handleCategoryChange = (value: string) => {
        if (value === 'Other') {
            setShowOtherCategory(true);
            setCategory('Other');
        } else {
            setShowOtherCategory(false);
            setCategory(value);
            setCustomCategory(''); 
        }
    };

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            setIsUploading(true);
            const reader = new FileReader();
            reader.onloadend = () => {
                setImage(reader.result as string);
                setIsUploading(false);
            };
            reader.readAsDataURL(file);
        }
    };


    const handleSave = async () => {
        if (!userProfile?.communityId || !itemId) {
            toast({ variant: 'destructive', title: 'Error', description: 'Could not determine community or item.' });
            return;
        }
        const finalCategory = category === 'Other' ? customCategory : category;

        if (!title || !finalCategory || !description) {
            toast({ variant: 'destructive', title: 'Missing Fields', description: 'Title, category, and description are required.' });
            return;
        }
        
        setIsSubmitting(true);
        const result = await updateWhatsonItemAction({
            communityId: userProfile.communityId,
            itemId,
            data: { 
                title, 
                category: finalCategory, 
                description, 
                address, 
                website, 
                phone, 
                email, 
                social, 
                openingHours: showOpeningHours ? openingHours : {}, 
                image,
                metaTitle,
                metaDescription,
            },
        });
        setIsSubmitting(false);

        if (result.success) {
            toast({ title: "Item Updated", description: "The item has been successfully updated." });
            router.push('/leader/whatson');
        } else {
            toast({ title: "Error", description: result.error, variant: 'destructive' });
        }
    };
    
    if (isLoading) {
        return <div className="flex items-center justify-center h-96"><Loader2 className="h-8 w-8 animate-spin"/></div>;
    }

    return (
        <>
            <div className="space-y-8">
                <div>
                    <Button asChild variant="ghost" className="mb-4">
                        <Link href="/leader/whatson">
                            <ArrowLeft className="mr-2 h-4 w-4" />
                            Back to What's On
                        </Link>
                    </Button>
                    <h1 className="text-3xl font-bold tracking-tight font-headline">Edit "What's On" Item</h1>
                    <p className="text-muted-foreground">Update the details for this item.</p>
                </div>
                <Card>
                    <CardHeader>
                        <CardTitle>Item Details</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="grid md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <Label htmlFor="title">Title *</Label>
                                <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="category">Category *</Label>
                                <Select onValueChange={handleCategoryChange} value={showOtherCategory ? 'Other' : category} disabled={loadingCategories}>
                                    <SelectTrigger id="category"><SelectValue placeholder={loadingCategories ? "Loading..." : "Select a category..."} /></SelectTrigger>
                                    <SelectContent>
                                        {itemCategories.map((cat, index) => {
                                            const key = typeof cat === 'object' ? cat.id || index : cat;
                                            const value = typeof cat === 'object' ? cat.name : cat;
                                            return (
                                                <SelectItem key={key} value={value}>
                                                    {value}
                                                </SelectItem>
                                            );
                                        })}
                                        <SelectItem value="Other">Other...</SelectItem>
                                    </SelectContent>
                                </Select>
                                {showOtherCategory && (
                                    <Input 
                                        className="mt-2"
                                        placeholder="Please specify other category"
                                        value={customCategory}
                                        onChange={(e) => setCustomCategory(e.target.value)}
                                    />
                                )}
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="description">Description *</Label>
                            <RichTextEditor value={description} onChange={setDescription} />
                        </div>
                         <div className="space-y-2">
                            <Label>Image</Label>
                            {image ? (
                                <div className="relative w-48 h-32">
                                    <Image src={image} alt="Preview" fill style={{objectFit:"cover"}} className="rounded-md" />
                                    <Button type="button" variant="destructive" size="icon" className="absolute -top-2 -right-2 h-7 w-7 rounded-full" onClick={() => setImage(null)}><X className="h-4 w-4" /></Button>
                                </div>
                            ) : (
                                <div className="flex gap-2">
                                    <Button type="button" variant="outline" onClick={() => fileInputRef.current?.click()} disabled={isUploading}>
                                        {isUploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Upload className="mr-2 h-4 w-4"/>}
                                        Upload Image
                                    </Button>
                                    <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept="image/*" />
                                    <Button type="button" variant="outline" onClick={() => setIsCameraOpen(true)} disabled={isUploading}><Camera className="mr-2 h-4 w-4"/> Take Picture</Button>
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
                                <Label htmlFor="social">Social Media</Label>
                                <Input id="social" type="url" value={social} onChange={(e) => setSocial(e.target.value)} />
                            </div>
                             <div className="space-y-2">
                                <Label htmlFor="phone">Phone</Label>
                                <Input id="phone" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} />
                            </div>
                             <div className="space-y-2">
                                <Label htmlFor="email">Email</Label>
                                <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
                            </div>
                        </div>
                        <Separator />
                         <div className="space-y-4">
                            <div className="flex items-center space-x-2">
                                <Switch id="show-hours" checked={showOpeningHours} onCheckedChange={setShowOpeningHours} />
                                <Label htmlFor="show-hours">Display Opening Hours</Label>
                            </div>
                            {showOpeningHours && (
                            <div className="space-y-4">
                                <div className="hidden md:grid grid-cols-[100px_1fr_1fr_1fr_1fr_auto] items-center gap-x-4 gap-y-2 text-sm font-medium text-muted-foreground px-2">
                                    <span></span>
                                    <span>Morning Open</span>
                                    <span>Morning Close</span>
                                    <span>Afternoon Open</span>
                                    <span>Afternoon Close</span>
                                    <span>Closed</span>
                                </div>
                                {Object.keys(openingHours).map(day => (
                                    <div key={day} className="grid grid-cols-1 md:grid-cols-[100px_1fr_1fr_1fr_1fr_auto] items-center gap-x-4 gap-y-2 p-2 rounded-md hover:bg-muted/50">
                                        <Label className="capitalize font-semibold">{day}</Label>
                                        <Input type="time" aria-label={`${day} open time`} value={openingHours[day as keyof typeof openingHours].morningOpen} onChange={(e) => handleHourChange(day as keyof typeof openingHours, 'morningOpen', e.target.value)} disabled={openingHours[day as keyof typeof openingHours].closed} />
                                        <Input type="time" aria-label={`${day} close time`} value={openingHours[day as keyof typeof openingHours].morningClose} onChange={(e) => handleHourChange(day as keyof typeof openingHours, 'morningClose', e.target.value)} disabled={openingHours[day as keyof typeof openingHours].closed} />
                                        <Input type="time" aria-label={`${day} afternoon open time`} value={openingHours[day as keyof typeof openingHours].afternoonOpen} onChange={(e) => handleHourChange(day as keyof typeof openingHours, 'afternoonOpen', e.target.value)} disabled={openingHours[day as keyof typeof openingHours].closed} />
                                        <Input type="time" aria-label={`${day} afternoon close time`} value={openingHours[day as keyof typeof openingHours].afternoonClose} onChange={(e) => handleHourChange(day as keyof typeof openingHours, 'afternoonClose', e.target.value)} disabled={openingHours[day as keyof typeof openingHours].closed} />
                                        <div className="flex items-center gap-2 justify-self-start md:justify-self-center pt-2 md:pt-0">
                                            <Checkbox id={`closed-${day}`} checked={openingHours[day as keyof typeof openingHours].closed} onCheckedChange={(checked) => handleClosedToggle(day as keyof typeof openingHours, !!checked)} />
                                            <Label htmlFor={`closed-${day}`}>Closed</Label>
                                        </div>
                                    </div>
                                ))}
                            </div>
                            )}
                         </div>
                         <Separator />

                        <Card className="border-border/70">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2"><Search className="h-5 w-5" /> Search engine optimization</CardTitle>
                                <CardDescription>
                                Improve your ranking and how your item page will appear in search engines results.
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-6">
                                <div className="p-4 border rounded-lg bg-muted/50">
                                    <p className="text-blue-800 dark:text-blue-400 text-lg font-medium group-hover:underline truncate">{metaTitle || title || 'Item Page Title'}</p>
                                    <p className="text-green-700 dark:text-green-400 text-sm">https://my-community-hub.co.uk/whatson/{itemId}</p>
                                    <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{metaDescription || 'Your compelling meta description will appear here, helping you attract more visitors from search results.'}</p>
                                </div>

                                <div className="space-y-2">
                                    <div className="flex justify-between items-center">
                                        <Label htmlFor="metaTitle">Meta title</Label>
                                        <span className="text-xs text-muted-foreground">{metaTitle.length} / 70</span>
                                    </div>
                                    <Input id="metaTitle" placeholder="Public title for the item page..." value={metaTitle} onChange={(e) => setMetaTitle(e.target.value)} maxLength={70}/>
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
                        <Button onClick={handleSave} disabled={isSubmitting}>
                            {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Save className="mr-2 h-4 w-4" />}
                            Save Changes
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
