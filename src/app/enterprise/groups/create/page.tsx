'use client';

import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Building2, ArrowLeft, Info, RefreshCcw, PlusCircle, Trash2, Loader2, Save, Eye, ShieldAlert, Search, ImagePlus, X, Upload } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { CommunitySelector, type CommunitySelection } from "@/components/community-selector";
import { useUser, useFirestore, useDoc, useMemoFirebase } from "@/firebase";
import { runCreateBusiness, saveBusinessAsDraft } from "@/lib/actions/businessActions";
import { uploadImageAction } from "@/lib/actions/storageActions";
import { Textarea } from "@/components/ui/textarea";
import { RichTextEditor } from "@/components/rich-text-editor";
import { doc } from "firebase/firestore";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Checkbox } from "@/components/ui/checkbox";
import Image from 'next/image';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from "@/lib/utils";
import { Switch } from "@/components/ui/switch";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

type Block = {
    id: string;
    text: string;
    image: string | null;
};

const BlockEditor = ({
    block,
    index,
    onUpdate,
    onDelete,
    onImageUpload,
    isUploading
}: {
    block: Block;
    index: number;
    onUpdate: (updatedBlock: Block) => void;
    onDelete: () => void;
    onImageUpload: (file: File) => void;
    isUploading?: boolean;
}) => {
    const isReversed = index % 2 !== 0;
    const fileInputRef = React.useRef<HTMLInputElement>(null);

    const textContent = (
        <div className="w-full">
            <RichTextEditor value={block.text} onChange={(val) => onUpdate({ ...block, text: val })} />
        </div>
    );

    const imageContent = (
        <div className="w-full">
            {block.image ? (
                <div className="relative aspect-video">
                    <Image src={block.image} alt="Block image" fill className="object-cover rounded-md border" />
                    <Button variant="destructive" size="icon" className="absolute -top-2 -right-2 h-6 w-6" onClick={() => onUpdate({ ...block, image: null })}>
                        <X className="h-4 w-4" />
                    </Button>
                </div>
            ) : (
                <div className="aspect-video border-2 border-dashed rounded-md flex flex-col items-center justify-center text-muted-foreground">
                    <ImagePlus className="h-12 w-12 mb-2" />
                    <Button type="button" variant="outline" onClick={() => fileInputRef.current?.click()} disabled={isUploading}>
                        {isUploading ? <Loader2 className="animate-spin" /> : 'Upload Image'}
                    </Button>
                    <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={(e) => e.target.files && onImageUpload(e.target.files[0])}/>
                </div>
            )}
        </div>
    );

    return (
        <Card>
            <CardContent className="p-4 space-y-4">
                 <div className="grid md:grid-cols-2 gap-4 items-center">
                    {isReversed ? (
                        <>
                            {imageContent}
                            {textContent}
                        </>
                    ) : (
                        <>
                            {textContent}
                            {imageContent}
                        </>
                    )}
                </div>
                 <div className="flex justify-end gap-2">
                     <Button variant="destructive" size="sm" onClick={onDelete}>
                        <Trash2 className="h-4 w-4" />
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
};


const initialAddressState = {
    addressLine1: "",
    addressLine2: "",
    city: "",
    stateCounty: "",
    postcode: "",
};

const initialDayState = { morningOpen: '', morningClose: '', afternoonOpen: '', afternoonClose: '', closed: false };
const initialHoursState = {
    monday: { ...initialDayState },
    tuesday: { ...initialDayState },
    wednesday: { ...initialDayState },
    thursday: { ...initialDayState },
    friday: { ...initialDayState },
    saturday: { ...initialDayState },
    sunday: { ...initialDayState },
};

const initialFormState = {
    businessName: "",
    businessCategory: "",
    website: "",
    socialMedia: "",
    contactEmail: "",
    contactNumber: "",
    shortDescription: "",
    longDescription: "",
    pageTwoContent: [] as Block[],
    pageThreeContent: "",
    addresses: [{...initialAddressState}],
    bannerImage: null as string | null,
    logoImage: null as string | null,
    additionalCommunities: [] as CommunitySelection[],
    openingHours: initialHoursState,
    metaTitle: "",
    metaDescription: "",
    showPageTwo: true,
    showPageThree: true,
};

export default function CreateEnterpriseGroupPage() {
    const { user } = useUser();
    const db = useFirestore();
     const userProfileRef = useMemoFirebase(() => (user ? doc(db, 'users', user.uid) : null), [user, db]);
    const { data: userProfile } = useDoc(userProfileRef);

    const [businessName, setBusinessName] = React.useState(initialFormState.businessName);
    const [businessCategory, setBusinessCategory] = React.useState(initialFormState.businessCategory);
    const [website, setWebsite] = React.useState(initialFormState.website);
    const [socialMedia, setSocialMedia] = React.useState(initialFormState.socialMedia);
    const [contactEmail, setContactEmail] = React.useState(initialFormState.contactEmail);
    const [contactNumber, setContactNumber] = React.useState(initialFormState.contactNumber);
    const [shortDescription, setShortDescription] = React.useState(initialFormState.shortDescription);
    const [longDescription, setLongDescription] = React.useState(initialFormState.longDescription);
    const [pageTwoContent, setPageTwoContent] = React.useState<Block[]>(initialFormState.pageTwoContent);
    const [pageThreeContent, setPageThreeContent] = React.useState<string>(initialFormState.pageThreeContent);
    const [showPageTwo, setShowPageTwo] = React.useState(initialFormState.showPageTwo);
    const [showPageThree, setShowPageThree] = React.useState(initialFormState.showPageThree);
    const [addresses, setAddresses] = React.useState(initialFormState.addresses);
    const [bannerImage, setBannerImage] = React.useState<string | null>(initialFormState.bannerImage);
    const [logoImage, setLogoImage] = React.useState<string | null>(initialFormState.logoImage);
    const [additionalCommunities, setAdditionalCommunities] = React.useState<CommunitySelection[]>(initialFormState.additionalCommunities);
    const [openingHours, setOpeningHours] = React.useState(initialFormState.openingHours);
    const [metaTitle, setMetaTitle] = React.useState(initialFormState.metaTitle);
    const [metaDescription, setMetaDescription] = React.useState(initialFormState.metaDescription);
    const [isSubmitting, setIsSubmitting] = React.useState(false);
    const [uploadingStates, setUploadingStates] = React.useState<Record<string, boolean>>({});
    
    const [pageThreeType, setPageThreeType] = React.useState<'custom' | 'minutes'>('custom');
    const [meetingMinutes, setMeetingMinutes] = React.useState<any[]>([]);

    const { toast } = useToast();
    const router = useRouter();

    const handleImageUpload = async (file: File, id: string, setImageCallback: (url: string | null) => void) => {
        if (!user) {
            toast({ title: "Authentication Error", description: "You must be logged in to upload images.", variant: "destructive" });
            return;
        }

        setUploadingStates(prev => ({...prev, [id]: true}));
        
        try {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            const base64Data = await new Promise<string>((resolve) => {
                reader.onloadend = () => resolve(reader.result as string);
            });
            const path = `business_assets/temp_${user.uid}_${Date.now()}_${file.name}`;
            const result = await uploadImageAction({ base64Data, path });

            if (result.success && result.url) {
                setImageCallback(result.url);
                toast({ title: 'Image Uploaded', description: 'Your image is ready to be saved.' });
            } else {
                throw new Error(result.error || 'Image upload failed.');
            }
        } catch (error: any) {
            toast({ title: "Upload Failed", description: error.message, variant: "destructive" });
        } finally {
            setUploadingStates(prev => ({...prev, [id]: false}));
        }
    };
    
    const handleAddressChange = (index: number, field: string, value: string) => {
        const newAddresses = [...addresses];
        newAddresses[index] = { ...newAddresses[index], [field]: value };
        setAddresses(newAddresses);
    };

    const addAddress = () => {
        setAddresses([...addresses, initialAddressState]);
    };

    const removeAddress = (index: number) => {
        if (addresses.length > 1) {
            const newAddresses = addresses.filter((_, i) => i !== index);
            setAddresses(newAddresses);
        }
    };
    
    const addAdditionalCommunity = () => {
        if (additionalCommunities.length < 4) {
            setAdditionalCommunities([...additionalCommunities, { country: null, state: null, region: null, community: null, id: String(Date.now()) }]);
        } else {
            toast({
                title: "Limit Reached",
                description: "You can add a maximum of 4 additional communities.",
                variant: "destructive"
            })
        }
    };

    const removeAdditionalCommunity = (id: string) => {
        setAdditionalCommunities(additionalCommunities.filter(c => c.id !== id));
    };
    
    const handleAdditionalCommunityChange = (id: string, newSelection: CommunitySelection) => {
        setAdditionalCommunities(additionalCommunities.map(c => c.id === id ? newSelection : c));
    };

    const handleHourChange = (day: keyof typeof openingHours, session: 'morningOpen' | 'morningClose' | 'afternoonOpen' | 'afternoonClose', value: string) => {
        setOpeningHours(prev => ({
            ...prev,
            [day]: { ...prev[day], [session]: value }
        }));
    };

    const handleClosedToggle = (day: keyof typeof openingHours, isClosed: boolean) => {
        setOpeningHours(prev => ({
            ...prev,
            [day]: { ...prev[day], closed: isClosed }
        }));
    };

    const getFormData = () => ({
        businessName, businessCategory, website, socialMedia, contactEmail, contactNumber,
        shortDescription, longDescription, pageTwoContent, addresses, bannerImage, logoImage, additionalCommunities,
        showPageTwo, showPageThree,
        primaryCommunityId: userProfile?.communityId,
        primaryCommunityName: userProfile?.communityName,
        openingHours,
        metaTitle,
        metaDescription,
        ownerId: user?.uid,
        ownerName: userProfile?.name,
        accountType: 'enterprise',
        pageThreeType,
        pageThreeContent: pageThreeType === 'custom' ? pageThreeContent : "",
        meetingMinutes: pageThreeType === 'minutes' ? meetingMinutes : [],
        pageThreeTypeLocked: false,
    });


    const handleSave = async (status: 'Pending Approval' | 'Draft') => {
        if (!user || !userProfile?.communityId) {
             toast({ title: "Not Authenticated", description: "You must be logged in to create a group.", variant: "destructive" });
             return;
        }
        if (status === 'Pending Approval' && (!businessName || !longDescription || !shortDescription || !contactEmail)) {
            toast({
                title: "Missing Information",
                description: "Please fill out all required fields marked with an asterisk (*).",
                variant: "destructive",
            });
            return;
        }
        
        setIsSubmitting(true);
        try {
            const businessData = { ...getFormData(), status };
            const result = status === 'Draft' 
                ? await saveBusinessAsDraft({ userId: user.uid, businessData })
                : await runCreateBusiness(businessData);

            if (result.success) {
                toast({
                    title: status === 'Draft' ? "Draft Saved!" : "Group Submitted!",
                    description: `${businessName} has been successfully ${status === 'Draft' ? 'saved as a draft' : 'submitted for approval'}.`,
                });
                router.push("/enterprise/groups");
            } else {
                throw new Error(result.error || "An unknown error occurred.");
            }
        } catch (error) {
             toast({ title: "Save Failed", description: (error as Error).message, variant: "destructive" });
        } finally {
             setIsSubmitting(false);
        }
    };
    
    const handlePreviewProfile = () => {
        const profileData = {
            businessName,
            businessCategory,
            website,
            socialMedia,
            contactEmail,
            contactNumber,
            shortDescription,
            longDescription,
            addresses,
            bannerImage,
            logoImage,
            primaryCommunityName: userProfile?.communityName,
            openingHours,
            metaTitle,
            metaDescription,
        };
        try {
            sessionStorage.setItem('businessProfilePreview', JSON.stringify(profileData));
            window.open('/business/businesses/create/preview', '_blank');
        } catch (error) {
            toast({
                title: "Could Not Open Preview",
                description: "There was an error saving the data for preview. It might be too large.",
                variant: "destructive"
            });
            console.error("Error saving to sessionStorage for preview:", error);
        }
    };

    const handleResetForm = () => {
        setBusinessName(initialFormState.businessName);
        setBusinessCategory(initialFormState.businessCategory);
        setWebsite(initialFormState.website);
        setSocialMedia(initialFormState.socialMedia);
        setContactEmail(initialFormState.contactEmail);
        setContactNumber(initialFormState.contactNumber);
        setShortDescription(initialFormState.shortDescription);
        setLongDescription(initialFormState.longDescription);
        setAddresses(initialFormState.addresses);
        setBannerImage(initialFormState.bannerImage);
        setLogoImage(initialFormState.logoImage);
        setAdditionalCommunities(initialFormState.additionalCommunities);
        setOpeningHours(initialFormState.openingHours);
        setMetaTitle(initialFormState.metaTitle);
        setMetaDescription(initialFormState.metaDescription);
        setPageTwoContent(initialFormState.pageTwoContent);
        setPageThreeContent(initialFormState.pageThreeContent);
        setPageThreeType('custom');
        setMeetingMinutes([]);
        setShowPageTwo(initialFormState.showPageTwo);
        setShowPageThree(initialFormState.showPageThree);

        const bannerInput = document.getElementById("banner-image") as HTMLInputElement;
        if (bannerInput) bannerInput.value = "";
        const logoInput = document.getElementById("logo-image") as HTMLInputElement;
        if (logoInput) logoInput.value = "";
        toast({
            title: "Form Reset",
            description: "All fields have been cleared."
        });
    };

  return (
    <div className="space-y-8">
        <div>
            <Button asChild variant="ghost" className="mb-4">
                <Link href="/enterprise/groups">
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Back to My Groups
                </Link>
            </Button>
            <h1 className="text-3xl font-bold tracking-tight font-headline flex items-center gap-2">
                <Building2 className="h-8 w-8" />
                Create Enterprise Group
            </h1>
            <p className="text-muted-foreground">
                Fill in the details below to submit your new enterprise group for approval.
            </p>
        </div>
      <Alert>
        <Info className="h-4 w-4" />
        <AlertTitle>14-Day Free Trial</AlertTitle>
        <AlertDescription>
          All new business listings include a 14-day free trial period, which begins after approval. This gives our community leaders time to vet your submission without any cost to you.
        </AlertDescription>
      </Alert>
      <Alert variant="destructive">
        <ShieldAlert className="h-4 w-4" />
        <AlertTitle>Your Advertising Responsibility</AlertTitle>
        <AlertDescription>
          You are solely responsible for the content of your adverts and for ensuring they comply with all applicable laws and advertising standards, including age-appropriateness. We reserve the right to remove any content we deem misleading, inappropriate, or in violation of our terms without notice. This is a key part of our terms and conditions.
        </AlertDescription>
      </Alert>
      <Card>
        <CardHeader>
            <CardTitle>Group Details</CardTitle>
            <CardDescription>
                Fields marked with an asterisk (*) are required.
            </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
            <div className="space-y-4 pt-4">
                <h3 className="font-medium text-lg">Page Visibility</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="flex items-center space-x-2 rounded-lg border p-4">
                        <Switch id="showPageTwo" checked={showPageTwo} onCheckedChange={setShowPageTwo} />
                        <div>
                            <Label htmlFor="showPageTwo">Show Page Two</Label>
                            <p className="text-xs text-muted-foreground">Display the custom content blocks on your profile.</p>
                        </div>
                    </div>
                    <div className="flex items-center space-x-2 rounded-lg border p-4">
                        <Switch id="showPageThree" checked={showPageThree} onCheckedChange={setShowPageThree} />
                        <div>
                            <Label htmlFor="showPageThree">Show Page Three (Contact Page)</Label>
                            <p className="text-xs text-muted-foreground">Display your custom contact/info page.</p>
                        </div>
                    </div>
                </div>
            </div>

            <Separator />
            <div className="grid md:grid-cols-2 gap-6">
                <div className="grid gap-2">
                    <Label htmlFor="name">
                        Group Name *
                    </Label>
                    <Input id="name" value={businessName} onChange={(e) => setBusinessName(e.target.value)} placeholder="e.g., Acme Corporation" />
                </div>
                <div className="grid gap-2">
                    <Label htmlFor="category">
                        Category (Optional)
                    </Label>
                    <Input id="category" value={businessCategory} onChange={(e) => setBusinessCategory(e.target.value)} placeholder="e.g., Housing Association" />
                </div>
            </div>

             <div className="grid md:grid-cols-2 gap-6">
                <div className="grid gap-2">
                    <Label htmlFor="website">
                        Website
                    </Label>
                    <Input id="website" type="url" value={website} onChange={(e) => setWebsite(e.target.value)} placeholder="https://example.com" />
                </div>
                <div className="grid gap-2">
                    <Label htmlFor="social-media">
                        Social Media URL
                    </Label>
                    <Input id="social-media" type="url" value={socialMedia} onChange={(e) => setSocialMedia(e.target.value)} placeholder="https://social.com/mybusiness" />
                </div>
            </div>

             <div className="grid md:grid-cols-2 gap-6">
                <div className="grid gap-2">
                    <Label htmlFor="contact-email">
                        Contact Email *
                    </Label>
                    <Input id="contact-email" type="email" value={contactEmail} onChange={(e) => setContactEmail(e.target.value)} placeholder="contact@example.com" />
                </div>
                <div className="grid gap-2">
                    <Label htmlFor="contact-number">
                        Contact Number
                    </Label>
                    <Input id="contact-number" type="tel" value={contactNumber} onChange={(e) => setContactNumber(e.target.value)} placeholder="e.g., +44 1234 567890" />
                </div>
            </div>

            <Separator />
            
             <div className="space-y-4">
                <h3 className="text-lg font-medium">Group Address(es)</h3>
                {addresses.map((address, index) => (
                    <div key={index} className="grid gap-4 p-4 border rounded-md relative">
                        {addresses.length > 1 && (
                            <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="absolute top-2 right-2 h-7 w-7"
                                onClick={() => removeAddress(index)}
                            >
                                <Trash2 className="h-4 w-4 text-destructive" />
                                <span className="sr-only">Remove address</span>
                            </Button>
                        )}
                        <div className="grid gap-2">
                            <Label htmlFor={`address-1-${index}`}>Address Line 1</Label>
                            <Input id={`address-1-${index}`} value={address.addressLine1} onChange={(e) => handleAddressChange(index, 'addressLine1', e.target.value)} placeholder="e.g., 123 Main Street" />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor={`address-2-${index}`}>Address Line 2 (Optional)</Label>
                            <Input id={`address-2-${index}`} value={address.addressLine2} onChange={(e) => handleAddressChange(index, 'addressLine2', e.target.value)} placeholder="e.g., Suite 100" />
                        </div>
                        <div className="grid md:grid-cols-3 gap-4">
                            <div className="grid gap-2">
                                <Label htmlFor={`city-${index}`}>City</Label>
                                <Input id={`city-${index}`} value={address.city} onChange={(e) => handleAddressChange(index, 'city', e.target.value)} placeholder="e.g., Sunnyvale" />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor={`state-${index}`}>State / County</Label>
                                <Input id={`state-${index}`} value={address.stateCounty} onChange={(e) => handleAddressChange(index, 'stateCounty', e.target.value)} placeholder="e.g., California" />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor={`postcode-${index}`}>Postcode / ZIP</Label>
                                <Input id={`postcode-${index}`} value={address.postcode} onChange={(e) => handleAddressChange(index, 'postcode', e.target.value)} placeholder="e.g., 90210" />
                            </div>
                        </div>
                    </div>
                ))}
                 <Button type="button" variant="outline" onClick={addAddress}>
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Add Another Address
                </Button>
            </div>
            
            <Separator />
            
            <div className="grid gap-2">
                <Label htmlFor="short-description">
                    Short Description (for listings) *
                </Label>
                <Textarea id="short-description" value={shortDescription} onChange={(e) => setShortDescription(e.target.value)} placeholder="A brief summary for business listings..." maxLength={150} />
                <p className="text-sm text-muted-foreground text-right">{shortDescription.length} / 150</p>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="long-description">Long Description (for profile page) *</Label>
              <RichTextEditor
                value={longDescription}
                onChange={setLongDescription}
                placeholder="A full description of your business for your dedicated profile page..."
              />
            </div>
            
            <Separator />
            
            <div className="grid md:grid-cols-2 gap-6">
                <div className="grid gap-2">
                    <Label htmlFor="banner-image">
                       Banner Image (for profile page)
                    </Label>
                     {uploadingStates['bannerImage'] ? <Loader2 className="animate-spin h-6 w-6"/> : bannerImage ? <Image src={bannerImage} alt="Banner Preview" width={200} height={100} className="rounded-md border object-cover" /> : null}
                    <Input 
                        id="banner-image" 
                        type="file" 
                        accept="image/*" 
                        onChange={(e) => {
                            const file = e.target.files?.[0];
                            if(file) handleImageUpload(file, 'bannerImage', setBannerImage);
                        }}
                        className="h-auto p-0 border-0 file:h-10 file:px-4 file:py-2 file:border-0 file:rounded-md file:bg-primary file:text-primary-foreground file:cursor-pointer hover:file:bg-primary/90"
                    />
                     <p className="text-sm text-muted-foreground">Recommended size: 1200px by 400px.</p>
                </div>
                <div className="grid gap-2">
                    <Label htmlFor="logo-image">
                        Logo Image (Square)
                    </Label>
                    {uploadingStates['logoImage'] ? <Loader2 className="animate-spin h-6 w-6"/> : logoImage ? <Image src={logoImage} alt="Logo Preview" width={100} height={100} className="rounded-md border object-cover" /> : null}
                    <Input 
                        id="logo-image" 
                        type="file" 
                        accept="image/*" 
                        onChange={(e) => {
                             const file = e.target.files?.[0];
                            if(file) handleImageUpload(file, 'logoImage', setLogoImage);
                        }}
                         className="h-auto p-0 border-0 file:h-10 file:px-4 file:py-2 file:border-0 file:rounded-md file:bg-primary file:text-primary-foreground file:cursor-pointer hover:file:bg-primary/90"
                    />
                    <p className="text-sm text-muted-foreground">Recommended size: 400px by 400px.</p>
                </div>
            </div>

            <Separator />

             <div className="space-y-4">
                <h3 className="text-lg font-medium">Registered Community *</h3>
                <p className="text-sm text-muted-foreground">Your group will be primarily listed in your registered community. Revenue share is attributed here.</p>
                <Input value={userProfile?.communityName || "Loading..."} readOnly disabled />
            </div>
            
             <Separator />

             <div className="space-y-4">
                 <div className="flex justify-between items-start">
                    <div>
                        <h3 className="text-lg font-medium">Additional Advertising Communities</h3>
                        <p className="text-sm text-muted-foreground">Advertise in up to 4 additional communities to broaden your reach.</p>
                    </div>
                    <Button type="button" variant="outline" onClick={addAdditionalCommunity} disabled={additionalCommunities.length >= 4}>
                        <PlusCircle className="mr-2 h-4 w-4" />
                        Add Community
                    </Button>
                 </div>

                <Alert>
                    <Info className="h-4 w-4" />
                    <AlertTitle>Boost Your Visibility!</AlertTitle>
                    <AlertDescription>
                    Listings in additional communities appear on their home page, business directory, and are included in their search results. A small fee applies per additional community.
                    </AlertDescription>
                </Alert>

                <div className="space-y-4">
                    {additionalCommunities.map((community, index) => (
                        <div key={community.id} className="p-4 border rounded-md relative">
                             <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="absolute top-2 right-2 h-7 w-7"
                                onClick={() => removeAdditionalCommunity(community.id!)}
                            >
                                <Trash2 className="h-4 w-4 text-destructive" />
                                <span className="sr-only">Remove community</span>
                            </Button>
                            <h4 className="text-md font-medium mb-4">Additional Community #{index + 1}</h4>
                            <CommunitySelector
                                selection={community}
                                onSelectionChange={(newSelection) => handleAdditionalCommunityChange(community.id!, newSelection)}
                             />
                        </div>
                    ))}
                </div>
            </div>

            <Separator />
            
            <Accordion type="multiple" className="w-full">
                <AccordionItem value="page-two">
                    <AccordionTrigger>Page Two Content Blocks</AccordionTrigger>
                    <AccordionContent className="pt-4">
                         <div className="space-y-4">
                            {pageTwoContent.map((block, index) => (
                                <BlockEditor 
                                    key={block.id}
                                    block={block} 
                                    index={index}
                                    onUpdate={(updatedBlock) => {
                                        const newBlocks = [...pageTwoContent];
                                        newBlocks[index] = updatedBlock;
                                        setPageTwoContent(newBlocks);
                                    }}
                                    onDelete={() => {
                                        setPageTwoContent(prev => prev.filter(b => b.id !== block.id));
                                    }}
                                    isUploading={uploadingStates[block.id]}
                                    onImageUpload={(file) => {
                                        handleImageUpload(file, block.id, (url) => {
                                            const newBlocks = [...pageTwoContent];
                                            newBlocks[index].image = url;
                                            setPageTwoContent(newBlocks);
                                        });
                                    }}
                                />
                            ))}
                            <Button onClick={() => setPageTwoContent(prev => [...prev, { id: `new-${Date.now()}`, text: '', image: null }])} variant="outline">
                                <PlusCircle className="mr-2 h-4 w-4" /> Add Section
                            </Button>
                        </div>
                    </AccordionContent>
                </AccordionItem>
                <AccordionItem value="page-three">
                    <AccordionTrigger>Page Three Content (Contact Page)</AccordionTrigger>
                     <AccordionContent className="pt-4">
                         <div className="space-y-2">
                            <Label htmlFor="page-three-content">Content</Label>
                            <RichTextEditor
                                value={pageThreeContent}
                                onChange={setPageThreeContent}
                                placeholder="Enter content for your contact page. You can include email addresses, phone numbers, contact forms (using HTML), etc."
                            />
                        </div>
                    </AccordionContent>
                </AccordionItem>
                 <AccordionItem value="opening-hours">
                    <AccordionTrigger>Opening Hours</AccordionTrigger>
                    <AccordionContent className="pt-4">
                        <div className="space-y-4">
                            <div className="hidden md:grid grid-cols-[100px_1fr_1fr_1fr_1fr_auto] items-center gap-x-4 gap-y-2 text-sm font-medium text-muted-foreground px-2">
                                <span></span>
                                <span>Morning Open</span>
                                <span>Morning Close</span>
                                <span>Afternoon Open</span>
                                <span>Afternoon Close</span>
                                <span>Closed</span>
                            </div>
                            {Object.keys(openingHours).map((day) => (
                                <div key={day} className="grid grid-cols-1 md:grid-cols-[100px_1fr_1fr_1fr_1fr_auto] items-center gap-x-4 gap-y-2 p-2 rounded-md hover:bg-muted/50">
                                    <Label className="capitalize font-semibold">{day}</Label>
                                    <Input type="time" aria-label={`${day} morning open time`} value={openingHours[day as keyof typeof openingHours].morningOpen} onChange={(e) => handleHourChange(day as keyof typeof openingHours, 'morningOpen', e.target.value)} disabled={openingHours[day as keyof typeof openingHours].closed} />
                                    <Input type="time" aria-label={`${day} morning close time`} value={openingHours[day as keyof typeof openingHours].morningClose} onChange={(e) => handleHourChange(day as keyof typeof openingHours, 'morningClose', e.target.value)} disabled={openingHours[day as keyof typeof openingHours].closed} />
                                    <Input type="time" aria-label={`${day} afternoon open time`} value={openingHours[day as keyof typeof openingHours].afternoonOpen} onChange={(e) => handleHourChange(day as keyof typeof openingHours, 'afternoonOpen', e.target.value)} disabled={openingHours[day as keyof typeof openingHours].closed} />
                                    <Input type="time" aria-label={`${day} afternoon close time`} value={openingHours[day as keyof typeof openingHours].afternoonClose} onChange={(e) => handleHourChange(day as keyof typeof openingHours, 'afternoonClose', e.target.value)} disabled={openingHours[day as keyof typeof openingHours].closed} />
                                    <div className="flex items-center gap-2 justify-self-start md:justify-self-center pt-2 md:pt-0">
                                        <Checkbox id={`closed-${day}`} checked={openingHours[day as keyof typeof openingHours].closed} onCheckedChange={(checked) => handleClosedToggle(day as keyof typeof openingHours, !!checked)} />
                                        <Label htmlFor={`closed-${day}`}>Closed</Label>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </AccordionContent>
                </AccordionItem>
                <AccordionItem value="seo">
                    <AccordionTrigger>Search Engine Optimization</AccordionTrigger>
                    <AccordionContent className="pt-4 space-y-6">
                        <div className="p-4 border rounded-lg bg-muted/50">
                            <p className="text-blue-800 dark:text-blue-400 text-lg font-medium group-hover:underline truncate">{metaTitle || businessName || 'Business Profile'}</p>
                            <p className="text-green-700 dark:text-green-400 text-sm">https://my-community-hub.co.uk/businesses/[ID will appear here]</p>
                            <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{metaDescription || 'Your compelling meta description will appear here, helping you attract more visitors from search results.'}</p>
                        </div>
                        <div className="space-y-2">
                            <div className="flex justify-between items-center">
                                <Label htmlFor="metaTitle">Meta Title</Label>
                                <span className="text-xs text-muted-foreground">{metaTitle.length} / 70</span>
                            </div>
                            <Input id="metaTitle" placeholder="Public title for the business page..." value={metaTitle} onChange={(e) => setMetaTitle(e.target.value)} maxLength={70}/>
                        </div>
                        <div className="space-y-2">
                            <div className="flex justify-between items-center">
                                <Label htmlFor="metaDescription">Meta Description</Label>
                                <span className="text-xs text-muted-foreground">{metaDescription.length} / 160</span>
                            </div>
                            <Textarea id="metaDescription" placeholder="This description will appear in search engines..." value={metaDescription} onChange={(e) => setMetaDescription(e.target.value)} maxLength={160} />
                        </div>
                    </AccordionContent>
                </AccordionItem>
            </Accordion>
        </CardContent>
        <CardFooter className="flex-wrap items-center gap-2">
            <Button onClick={() => handleSave('Pending Approval')} disabled={isSubmitting || !!Object.values(uploadingStates).some(s => s)}>
                {isSubmitting || Object.values(uploadingStates).some(s => s) ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Submit for Approval
            </Button>
            <Button variant="outline" onClick={handlePreviewProfile}>
                <Eye className="mr-2 h-4 w-4" /> Preview Profile
            </Button>
            <Button variant="outline" onClick={() => handleSave('Draft')} disabled={isSubmitting || !!Object.values(uploadingStates).some(s => s)}>
                 {isSubmitting || Object.values(uploadingStates).some(s => s) ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                Save Draft
            </Button>
            <Button variant="ghost" onClick={handleResetForm}>
                <RefreshCcw className="mr-2 h-4 w-4" /> Reset Form
            </Button>
            <Button variant="destructive" asChild>
                <Link href="/enterprise/groups">Cancel</Link>
            </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
