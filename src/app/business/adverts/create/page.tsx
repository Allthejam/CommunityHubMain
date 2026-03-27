
"use client";

import * as React from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Upload, Loader2, Info, Save, X, Camera, Search } from "lucide-react";
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

    const [selectedBusiness, setSelectedBusiness] = React.useState<string | null>(null);
    const [createdAdvertCount, setCreatedAdvertCount] = React.useState(0);
    const [businessPlan, setBusinessPlan] = React.useState<Plan | null>(null);
    const [isUploading, setIsUploading] = React.useState(false);
    const [isSavingDraft, setIsSavingDraft] = React.useState(false);

    const [title, setTitle] = React.useState("");
    const [price, setPrice] = React.useState("");
    const [description, setDescription] = React.useState("");
    const [startDate, setStartDate] = React.useState<Date>();
    const [endDate, setEndDate] = React.useState<Date>();
    const [adImage, setAdImage] = React.useState<string | null>(null);
    const [isFamilyFriendly, setIsFamilyFriendly] = React.useState(true);
    const [metaTitle, setMetaTitle] = React.useState("");
    const [metaDescription, setMetaDescription] = React.useState("");

    const fileInputRef = React.useRef<HTMLInputElement>(null);

    const businessesQuery = useMemoFirebase(() => {
        if (!user) return null;
        return query(collection(db, "businesses"), where("ownerId", "==", user.uid));
    }, [user, db]);

    const { data: businesses, isLoading: businessesLoading } = useCollection<Business>(businessesQuery);
    const loading = authLoading || businessesLoading;

    const availableBusinesses = businesses || [];
    
    React.useEffect(() => {
        const fetchPlans = async () => {
            const plans = await getPricingPlans();
            if (plans.business) {
                setBusinessPlan(plans.business);
            }
        };
        fetchPlans();
    }, []);
    
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
            reader.onloadstart = () => setIsUploading(true);
            reader.onloadend = () => {
                setAdImage(reader.result as string);
                setIsUploading(false);
            };
            reader.onerror = () => {
                toast({ title: "Error", description: "Failed to read image file.", variant: "destructive" });
                setIsUploading(false);
            };
            reader.readAsDataURL(file);
        }
    };
    
    const handlePreview = () => {
        const adData = {
            businessId: selectedBusiness || '',
            businessName: businesses?.find(b => b.id === selectedBusiness)?.businessName || '',
            title: title,
            price: price,
            description: description,
            image: adImage,
            startDate: startDate?.toISOString(),
            endDate: endDate?.toISOString(),
            isFamilyFriendly: isFamilyFriendly,
            metaTitle: metaTitle,
            metaDescription: metaDescription,
        };
        try {
            sessionStorage.setItem('businessAdvertPreview', JSON.stringify(adData));
            window.open('/business/adverts/create/preview', '_blank');
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
            businessName: businesses?.find(b => b.id === selectedBusiness)?.businessName,
            title: title,
            price: price,
            description: description,
            image: adImage,
            startDate: startDate,
            endDate: endDate,
            isFamilyFriendly: isFamilyFriendly,
            metaTitle: metaTitle,
            metaDescription: metaDescription,
        };

        const result = await saveAdvertAsDraft({ userId: user.uid, advertData: adData });

        if (result.success) {
            toast({ title: "Draft Saved", description: "Your advert has been saved as a draft." });
            sessionStorage.removeItem('businessAdvertPreview');
            router.push('/business/adverts');
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
                    <Link href="/business/adverts">
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Back to Adverts
                    </Link>
                </Button>
                <h1 className="text-3xl font-bold tracking-tight font-headline">
                    Create New Advert (Step 1 of 3)
                </h1>
                <p className="text-muted-foreground mt-2">
                   Fill in the details for your new advert.
                </p>
            </div>
            
            <Alert>
                <Info className="h-4 w-4" />
                <AlertTitle>Advert Listing Rules</AlertTitle>
                <AlertDescription>
                You can create up to {businessPlan?.adverts ?? 3} free adverts per business listing. Additional advert listings can be purchased for £{businessPlan?.additionalAdvertPrice ?? 5} each. Adverts can only be created for approved business listings.
                </AlertDescription>
            </Alert>

            <Card>
                <CardHeader>
                    <CardTitle>Advert Details</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                     <div className="space-y-2">
                        <Label htmlFor="business-select">Business *</Label>
                            <Select onValueChange={setSelectedBusiness} value={selectedBusiness || ""}>
                            <SelectTrigger id="business-select">
                                <SelectValue placeholder="Select a business to link the advert to." />
                            </SelectTrigger>
                            <SelectContent>
                                {availableBusinesses.length > 0 ? availableBusinesses.map(business => (
                                    <SelectItem key={business.id} value={business.id}>
                                        {business.businessName} ({business.status})
                                    </SelectItem>
                                )) : <p className="p-4 text-sm text-muted-foreground">No businesses found. Please create one first.</p>}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className={cn("space-y-6 transition-opacity", !selectedBusiness && "opacity-50 pointer-events-none")}>
                        <div className="space-y-2">
                            <Label htmlFor="advert-title">Advert Title *</Label>
                            <Input id="advert-title" placeholder="e.g., 2-for-1 Tuesdays" value={title} onChange={(e) => setTitle(e.target.value)} />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="price">Price (Optional)</Label>
                            <Input id="price" placeholder="e.g., £10.00" type="text" value={price} onChange={(e) => setPrice(e.target.value)} />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="advert-description">Description / Offer *</Label>
                            <RichTextEditor
                                value={description}
                                onChange={setDescription}
                                placeholder="Describe your offer or promotion..."
                            />
                        </div>
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
                                    <input type="file" ref={fileInputRef} onChange={handleImageChange} accept="image/*" className="hidden" />
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
