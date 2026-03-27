
"use client";

import * as React from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter, useParams } from "next/navigation";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Upload, Camera, X, Loader2, Save } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { DatePicker } from "@/components/ui/date-picker";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useUser, useFirestore, useDoc, useCollection, useMemoFirebase } from "@/firebase";
import { collection, query, where, doc } from "firebase/firestore";
import { RichTextEditor } from "@/components/rich-text-editor";
import { updateAdvertAction } from "@/lib/actions/advertActions";
import { Switch } from "@/components/ui/switch";


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
    const { toast } = useToast();

    const [isSubmitting, setIsSubmitting] = React.useState(false);
    
    const [selectedBusiness, setSelectedBusiness] = React.useState<string>("");
    const [title, setTitle] = React.useState("");
    const [price, setPrice] = React.useState("");
    const [description, setDescription] = React.useState("");
    const [startDate, setStartDate] = React.useState<Date>();
    const [endDate, setEndDate] = React.useState<Date>();
    const [adImage, setAdImage] = React.useState<string | null>(null);
    const [isFamilyFriendly, setIsFamilyFriendly] = React.useState(true);

    const fileInputRef = React.useRef<HTMLInputElement>(null);
    
    const businessesQuery = useMemoFirebase(() => {
        if (!user) return null;
        return query(collection(db, "businesses"), where("ownerId", "==", user.uid));
    }, [user, db]);

    const { data: businesses, isLoading: businessesLoading } = useCollection<Business>(businessesQuery);
    
    const advertRef = useMemoFirebase(() => {
        if (!advertId) return null;
        return doc(db, 'adverts', advertId);
    }, [advertId, db]);

    const { data: advertData, isLoading: advertLoading } = useDoc(advertRef);
    
    React.useEffect(() => {
        if (advertData) {
            setSelectedBusiness(advertData.businessId);
            setTitle(advertData.title);
            setPrice(advertData.price || "");
            setDescription(advertData.description);
            setStartDate(advertData.startDate?.toDate());
            setEndDate(advertData.endDate?.toDate());
            setAdImage(advertData.image || null);
            setIsFamilyFriendly(advertData.isFamilyFriendly ?? true);
        }
    }, [advertData]);

    const handleImageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => setAdImage(reader.result as string);
            reader.readAsDataURL(file);
        }
    };
    
    const handleUpdate = async () => {
        if (!advertId) return;
        
        setIsSubmitting(true);
        
        const advertData = {
            id: advertId,
            businessId: selectedBusiness,
            businessName: businesses?.find(b => b.id === selectedBusiness)?.businessName || '',
            title,
            price,
            description,
            startDate,
            endDate,
            image: adImage,
            isFamilyFriendly,
            status: "Pending Approval", // Re-submit for approval after edit
        };

        const result = await updateAdvertAction(advertData);

        if (result.success) {
            toast({ title: "Advert Updated", description: "Your advert has been updated and resubmitted for approval."});
            router.push('/business/adverts');
        } else {
            console.error("Error updating advert:", result.error);
            toast({ title: "Update Failed", description: "Could not update your advert.", variant: "destructive"});
        }
        setIsSubmitting(false);
    }

    if (authLoading || businessesLoading || advertLoading) {
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
                    Edit Advert
                </h1>
                <p className="text-muted-foreground mt-2">
                   Update the details for your advert.
                </p>
            </div>
            
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
                        <Label htmlFor="price">Price (Optional)</Label>
                        <Input id="price" type="text" value={price} onChange={(e) => setPrice(e.target.value)} />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="advert-description">Description / Offer *</Label>
                         <RichTextEditor value={description} onChange={setDescription} />
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
                                <Button type="button" variant="outline" onClick={() => fileInputRef.current?.click()}>
                                    <Upload className="mr-2 h-4 w-4" /> Upload Image
                                </Button>
                                <Button type="button" variant="outline" disabled>
                                    <Camera className="mr-2 h-4 w-4" /> Take Picture
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
                </CardContent>
                 <CardFooter>
                    <Button onClick={handleUpdate} disabled={isSubmitting}>
                        {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        <Save className="mr-2 h-4 w-4" />
                        Save Changes
                    </Button>
                </CardFooter>
            </Card>
        </div>
    )
}


export default function EditAdvertPage() {
    return (
        <React.Suspense fallback={<div className="flex justify-center items-center h-96"><Loader2 className="h-8 w-8 animate-spin" /></div>}>
            <EditAdvertPageContent />
        </React.Suspense>
    );
}
