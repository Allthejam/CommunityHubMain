'use client';

import * as React from "react";
import Link from "next/link";
import { useRouter, useParams } from "next/navigation";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Building2, ArrowLeft, Info, PlusCircle, Trash2, Loader2, Save, Eye, ShieldAlert, Search, ImagePlus, X, Upload } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { CommunitySelector, type CommunitySelection } from "@/components/community-selector";
import { useUser, useFirestore, useDoc, useMemoFirebase } from "@/firebase";
import { runCreateBusiness, updatePageTwoBlock, deletePageTwoBlock } from "@/lib/actions/businessActions";
import { uploadImageAction } from "@/lib/actions/storageActions";
import { doc } from "firebase/firestore";
import { Textarea } from "@/components/ui/textarea";
import { RichTextEditor } from "@/components/rich-text-editor";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Checkbox } from "@/components/ui/checkbox";
import Image from 'next/image';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from "@/lib/utils";
import { Switch } from "@/components/ui/switch";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

const businessCategories = [
    { value: 'accounting', label: 'Accounting' },
    { value: 'automotive', label: 'Automotive' },
    { value: 'beauty-salon', label: 'Beauty Salon' },
    { value: 'bike-shop', label: 'Bike Shop' },
    { value: 'bookstore', label: 'Bookstore' },
    { value: 'charity', label: 'Charity' },
    { value: 'clothing', label: 'Clothing' },
    { value: 'community-group', label: 'Community Group' },
    { value: 'electronics', label: 'Electronics' },
    { value: 'entertainment', label: 'Entertainment' },
    { value: 'fitness', label: 'Fitness' },
    { value: 'florist', label: 'Florist' },
    { value: 'food', label: 'Food & Drink' },
    { value: 'furniture', label: 'Furniture' },
    { value: 'housing-association', label: 'Housing Association' },
    { value: 'jewellery', label: 'Jewellery' },
    { value: 'music-store', label: 'Music Store' },
    { value: 'optician', label: 'Optician' },
    { value: 'outdoors', label: 'Outdoors' },
    { value: 'pet-services', label: 'Pet Services' },
    { value: 'photography', label: 'Photography' },
    { value: 'professional-services', label: 'Professional Services' },
    { value: 'shoe-store', label: 'Shoe Store' },
    { value: 'stationery', label: 'Stationery' },
    { value: 'toys-hobbies', label: 'Toys & Hobbies' },
    { value: 'other', label: 'Other' },
];

type Block = {
    id: string;
    text: string;
    image: string | null;
};

const BlockEditor = ({
    block,
    index,
    onUpdate,
    onSave,
    onDelete,
    isSaving,
    isDeleting,
    isUploading,
    handleImageUpload,
}: {
    block: Block;
    index: number;
    onUpdate: (updatedBlock: Block) => void;
    onSave?: () => void;
    onDelete: () => void;
    isSaving?: boolean;
    isDeleting?: boolean;
    isUploading?: boolean;
    handleImageUpload: (file: File) => void;
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
                    <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={(e) => e.target.files && handleImageUpload(e.target.files[0])}/>
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
                 {onSave && (
                    <div className="flex justify-end gap-2">
                         <Button variant="destructive" size="sm" onClick={onDelete} disabled={isDeleting}>
                            {isDeleting ? <Loader2 className="animate-spin" /> : <Trash2 className="h-4 w-4" />}
                        </Button>
                        <Button size="sm" onClick={onSave} disabled={isSaving}>
                            {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                            Save Section
                        </Button>
                    </div>
                )}
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


export default function EditEnterpriseGroupPage() {
    const { user } = useUser();
    const db = useFirestore();
    const params = useParams();
    const groupId = params.groupId as string;
    const router = useRouter();
    const { toast } = useToast();

    const groupDocRef = useMemoFirebase(() => db ? doc(db, 'businesses', groupId) : null, [db, groupId]);
    const { data: groupData, isLoading } = useDoc(groupDocRef);
    
    const userProfileRef = useMemoFirebase(() => user ? doc(db, 'users', user.uid) : null, [user, db]);
    const { data: userProfile } = useDoc(userProfileRef);

    const [businessName, setBusinessName] = React.useState("");
    const [businessCategory, setBusinessCategory] = React.useState("");
    const [website, setWebsite] = React.useState("");
    const [socialMedia, setSocialMedia] = React.useState("");
    const [contactEmail, setContactEmail] = React.useState("");
    const [contactNumber, setContactNumber] = React.useState("");
    const [shortDescription, setShortDescription] = React.useState("");
    const [longDescription, setLongDescription] = React.useState("");
    const [pageTwoContent, setPageTwoContent] = React.useState<Block[]>([]);
    const [pageThreeContent, setPageThreeContent] = React.useState('');
    const [showPageTwo, setShowPageTwo] = React.useState(true);
    const [showPageThree, setShowPageThree] = React.useState(true);
    const [addresses, setAddresses] = React.useState([{...initialAddressState}]);
    const [bannerImage, setBannerImage] = React.useState<string | null>(null);
    const [logoImage, setLogoImage] = React.useState<string | null>(null);
    const [additionalCommunities, setAdditionalCommunities] = React.useState<CommunitySelection[]>([]);
    const [openingHours, setOpeningHours] = React.useState(initialHoursState);
    const [metaTitle, setMetaTitle] = React.useState("");
    const [metaDescription, setMetaDescription] = React.useState("");
    const [isSubmitting, setIsSubmitting] = React.useState(false);
    const [uploadingStates, setUploadingStates] = React.useState<Record<string, boolean>>({});
    
    const [pageThreeType, setPageThreeType] = React.useState<'custom' | 'minutes'>('custom');
    const [pageThreeTypeLocked, setPageThreeTypeLocked] = React.useState(false);
    const [meetingMinutes, setMeetingMinutes] = React.useState<any[]>([]);

    const [primaryCommunityId, setPrimaryCommunityId] = React.useState<string | null>(null);
    const [primaryCommunityName, setPrimaryCommunityName] = React.useState<string | null>(null);
    const [isCommunityDialogOpen, setIsCommunityDialogOpen] = React.useState(false);
    const [tempCommunitySelection, setTempCommunitySelection] = React.useState<CommunitySelection | null>(null);

    const [savingStates, setSavingStates] = React.useState<Record<string, boolean>>({});
    const [deletingStates, setDeletingStates] = React.useState<Record<string, boolean>>({});

    React.useEffect(() => {
        if (groupData) {
            setBusinessName(groupData.businessName || groupData.name || "");
            setBusinessCategory(groupData.businessCategory || '');
            setWebsite(groupData.website || '');
            setSocialMedia(groupData.socialMedia || '');
            setContactEmail(groupData.contactEmail || '');
            setContactNumber(groupData.contactNumber || '');
            setShortDescription(groupData.shortDescription || '');
            setLongDescription(groupData.longDescription || '');
            setPageTwoContent(groupData.pageTwoContent || []);
            setPageThreeContent(groupData.pageThreeContent || '');
            setShowPageTwo(groupData.showPageTwo !== false);
            setShowPageThree(groupData.showPageThree !== false);
            setPageThreeType(groupData.pageThreeType || 'custom');
            setMeetingMinutes(groupData.meetingMinutes || []);
            setPageThreeTypeLocked(groupData.pageThreeTypeLocked || false);
            setAddresses(groupData.addresses && groupData.addresses.length > 0 ? groupData.addresses : [{...initialAddressState}]);
            setBannerImage(groupData.bannerImage || null);
            setLogoImage(groupData.logoImage || null);
            setAdditionalCommunities(groupData.additionalCommunities || []);
            setOpeningHours(groupData.openingHours || initialHoursState);
            setMetaTitle(groupData.metaTitle || "");
            setMetaDescription(groupData.metaDescription || "");
            setPrimaryCommunityId(groupData.primaryCommunityId || null);
            setPrimaryCommunityName(groupData.primaryCommunityName || null);
        }
    }, [groupData]);

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
            const path = `business_assets/${groupId}/${id}/${file.name}`;
            const result = await uploadImageAction({ base64Data, path });
            if (result.success && result.url) {
                setImageCallback(result.url);
                toast({ title: 'Image Uploaded'});
            } else {
                throw new Error(result.error);
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

    const addAddress = () => setAddresses([...addresses, initialAddressState]);
    const removeAddress = (index: number) => {
        if (addresses.length > 1) setAddresses(addresses.filter((_, i) => i !== index));
    };
    
    const addAdditionalCommunity = () => {
        if (additionalCommunities.length < 4) {
            setAdditionalCommunities([...additionalCommunities, { country: null, state: null, region: null, community: null, id: String(Date.now()) }]);
        } else {
            toast({ title: "Limit Reached", description: "You can add a maximum of 4 additional communities.", variant: "destructive" })
        }
    };
    const removeAdditionalCommunity = (id: string) => setAdditionalCommunities(additionalCommunities.filter(c => c.id !== id));
    const handleAdditionalCommunityChange = (id: string, newSelection: CommunitySelection) => setAdditionalCommunities(additionalCommunities.map(c => c.id === id ? newSelection : c));

    const handleHourChange = (day: keyof typeof openingHours, session: 'morningOpen' | 'morningClose' | 'afternoonOpen' | 'afternoonClose', value: string) => {
        setOpeningHours(prev => ({...prev, [day]: { ...prev[day], [session]: value }}));
    };
    const handleClosedToggle = (day: keyof typeof openingHours, isClosed: boolean) => {
        setOpeningHours(prev => ({...prev, [day]: { ...prev[day], closed: isClosed }}));
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
            primaryCommunityName: primaryCommunityName,
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

    const handleSave = async (status: 'Pending Approval' | 'Draft') => {
        if (!user || !primaryCommunityId) {
             toast({ title: "Not Authenticated", description: "You must be logged in to save changes.", variant: "destructive" });
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
            const result = await runCreateBusiness({
                businessId: groupId,
                businessName, businessCategory, website, socialMedia, contactEmail, contactNumber,
                shortDescription, longDescription, pageTwoContent, 
                pageThreeContent: pageThreeType === 'custom' ? pageThreeContent : "",
                meetingMinutes: pageThreeType === 'minutes' ? meetingMinutes : [],
                pageThreeType, pageThreeTypeLocked, addresses, bannerImage, logoImage, additionalCommunities,
                openingHours, metaTitle, metaDescription,
                showPageTwo, showPageThree,
                ownerId: user.uid,
                ownerName: userProfile?.name,
                accountType: 'enterprise',
                primaryCommunityId,
                primaryCommunityName,
                status,
            });

            if (result.success) {
                toast({
                    title: `Group ${status === 'Draft' ? 'Saved' : 'Updated'}!`,
                    description: `Your changes have been ${status === 'Draft' ? 'saved' : 're-submitted for approval'}.`,
                });
                router.push("/enterprise/groups");
            } else {
                throw new Error(result.error || "An unknown error occurred.");
            }
        } catch (error: any) {
             toast({ title: "Save Failed", description: error.message, variant: "destructive" });
        } finally {
             setIsSubmitting(false);
        }
    };
    
    const handlePageTwoBlockUpdate = (index: number, updatedBlock: Block) => {
        const newBlocks = [...pageTwoContent];
        newBlocks[index] = updatedBlock;
        setPageTwoContent(newBlocks);
    };

    const handlePageTwoBlockSave = async (block: Block) => {
        setSavingStates(prev => ({...prev, [block.id]: true}));
        const result = await updatePageTwoBlock(groupId, block);
        if (result.success) {
            toast({ title: 'Section Saved' });
        } else {
            toast({ title: 'Error', description: result.error, variant: 'destructive' });
        }
        setSavingStates(prev => ({...prev, [block.id]: false}));
    };
    
    const handleDeletePageTwoBlock = async (blockId: string) => {
        setDeletingStates(prev => ({...prev, [blockId]: true}));
        const result = await deletePageTwoBlock(groupId, blockId);
        if (result.success) {
            setPageTwoContent(prev => prev.filter(b => b.id !== blockId));
            toast({ title: 'Section Deleted' });
        } else {
            toast({ title: 'Error', description: result.error, variant: 'destructive' });
        }
        setDeletingStates(prev => ({...prev, [blockId]: false}));
    };
    
    if (isLoading) {
        return <div className="flex justify-center items-center h-96"><Loader2 className="h-8 w-8 animate-spin" /></div>
    }

  return (
    <>
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
                Edit Enterprise Group
            </h1>
        </div>
      <Card>
        <Tabs defaultValue="page1">
            <CardHeader>
                <CardTitle>Group Content</CardTitle>
                <CardDescription>Update the details for your enterprise group. Re-submitting will require leader approval.</CardDescription>
                <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="page1">Page 1 (Main Profile)</TabsTrigger>
                    <TabsTrigger value="page2">Page 2 (Custom Content)</TabsTrigger>
                    <TabsTrigger value="page3">Page 3 (Contact)</TabsTrigger>
                </TabsList>
            </CardHeader>
            <TabsContent value="page1">
                <CardContent className="space-y-6">
                     <div className="space-y-4 pt-4">
                        <h3 className="font-medium text-lg">Page Visibility</h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="flex items-center space-x-2 rounded-lg border p-4">
                                <Switch id="showPageTwo" checked={showPageTwo} onCheckedChange={setShowPageTwo} />
                                <div>
                                    <Label htmlFor="showPageTwo">Show Page Two</Label>
                                    <p className="text-xs text-muted-foreground">Display the custom content blocks page.</p>
                                </div>
                            </div>
                            <div className="flex items-center space-x-2 rounded-lg border p-4">
                                <Switch id="showPageThree" checked={showPageThree} onCheckedChange={setShowPageThree} />
                                <div>
                                    <Label htmlFor="showPageThree">Show Page Three (Contact)</Label>
                                    <p className="text-xs text-muted-foreground">Display your custom contact/info page.</p>
                                </div>
                            </div>
                        </div>
                    </div>
                    <Separator />
                    <div className="grid md:grid-cols-2 gap-6">
                        <div className="grid gap-2">
                            <Label htmlFor="name">Group Name *</Label>
                            <Input id="name" value={businessName} onChange={(e) => setBusinessName(e.target.value)} />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="category">Category (Optional)</Label>
                            <Input id="category" value={businessCategory} onChange={(e) => setBusinessCategory(e.target.value)} placeholder="e.g., Housing Association" />
                        </div>
                    </div>
                    <div className="grid md:grid-cols-2 gap-6">
                        <div className="grid gap-2"><Label htmlFor="website">Website</Label><Input id="website" type="url" value={website} onChange={(e) => setWebsite(e.target.value)} /></div>
                        <div className="grid gap-2"><Label htmlFor="social-media">Social Media URL</Label><Input id="social-media" type="url" value={socialMedia} onChange={(e) => setSocialMedia(e.target.value)} /></div>
                    </div>
                    <div className="grid md:grid-cols-2 gap-6">
                        <div className="grid gap-2"><Label htmlFor="contact-email">Contact Email *</Label><Input id="contact-email" type="email" value={contactEmail} onChange={(e) => setContactEmail(e.target.value)} /></div>
                        <div className="grid gap-2"><Label htmlFor="contact-number">Contact Number</Label><Input id="contact-number" type="tel" value={contactNumber} onChange={(e) => setContactNumber(e.target.value)} /></div>
                    </div>
                    <Separator />
                    <div className="grid gap-2"><Label htmlFor="short-description">Short Description *</Label><Textarea id="short-description" value={shortDescription} onChange={(e) => setShortDescription(e.target.value)} maxLength={150} /><p className="text-sm text-right text-muted-foreground">{shortDescription.length} / 150</p></div>
                    <div className="grid gap-2"><Label htmlFor="long-description">Long Description *</Label><RichTextEditor value={longDescription} onChange={setLongDescription} /></div>
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
                    <div className="space-y-4">
                        <h3 className="text-lg font-medium">Registered Community *</h3>
                        <p className="text-sm text-muted-foreground">Your group is primarily listed in this community. To change this, you must create a new group listing.</p>
                        <Input value={primaryCommunityName || "Loading..."} readOnly disabled />
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
                            Listings in additional communities appear on their home page and search results. A small fee applies per additional community.
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
                </CardContent>
            </TabsContent>
            <TabsContent value="page2">
                 <CardContent>
                    <div className="space-y-4">
                        {pageTwoContent.map((block, index) => (
                            <BlockEditor 
                                key={block.id}
                                block={block} 
                                index={index}
                                onUpdate={(updatedBlock) => handlePageTwoBlockUpdate(index, updatedBlock)}
                                onSave={() => handlePageTwoBlockSave(block)}
                                onDelete={() => handleDeletePageTwoBlock(block.id)}
                                isSaving={savingStates[block.id]}
                                isDeleting={deletingStates[block.id]}
                                isUploading={uploadingStates[block.id]}
                                handleImageUpload={(file) => handleImageUpload(file, block.id, (url) => {
                                    const newBlocks = [...pageTwoContent];
                                    newBlocks[index].image = url;
                                    setPageTwoContent(newBlocks);
                                })}
                            />
                        ))}
                         <Button onClick={() => setPageTwoContent(prev => [...prev, { id: `new-${Date.now()}`, text: '', image: null }])} variant="outline">
                            <PlusCircle className="mr-2 h-4 w-4" /> Add Section
                        </Button>
                    </div>
                </CardContent>
            </TabsContent>
             <TabsContent value="page3">
                <CardContent>
                    <div className="space-y-2">
                        <Label htmlFor="page-three-content">Page 3 / Contact Us Content</Label>
                        <RichTextEditor
                            value={pageThreeContent}
                            onChange={setPageThreeContent}
                            placeholder="Enter content for your contact page. You can include email addresses, phone numbers, contact forms (using HTML), etc."
                        />
                    </div>
                </CardContent>
            </TabsContent>
        </Tabs>
        <CardFooter className="flex-wrap items-center gap-2">
            <Button onClick={() => handleSave('Pending Approval')} disabled={isSubmitting || !!Object.values(uploadingStates).some(s => s)}>
                {isSubmitting || Object.values(uploadingStates).some(s => s) ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Update & Resubmit
            </Button>
            <Button variant="outline" onClick={handlePreviewProfile}>
                <Eye className="mr-2 h-4 w-4" /> Preview Profile
            </Button>
            <Button variant="outline" onClick={() => handleSave('Draft')} disabled={isSubmitting || !!Object.values(uploadingStates).some(s => s)}>
                 {isSubmitting || Object.values(uploadingStates).some(s => s) ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                Save Changes to Draft
            </Button>
            <Button variant="destructive" asChild>
                <Link href="/enterprise/groups">Cancel</Link>
            </Button>
        </CardFooter>
      </Card>
    </div>
    </>
  );
}
