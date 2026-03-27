

"use client";

import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Info, Save, Loader2, Upload, Camera, X, Eye, Search, Pencil, Trash2, PlusCircle, Users } from "lucide-react";
import { useUser, useFirestore, useDoc, useMemoFirebase } from "@/firebase";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RichTextEditor } from "@/components/rich-text-editor";
import { useToast } from "@/hooks/use-toast";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { doc, getDoc } from "firebase/firestore";
import { updateCommunityProfileAction } from "@/lib/actions/communityProfileActions";
import { useRouter } from "next/navigation";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";

type LeadershipItem = {
    id: string; // client-side id
    name: string;
    title: string;
    email: string;
    phone: string;
};

type CommunityProfileData = {
    headline?: string;
    introduction?: string;
    population?: string;
    area?: string;
    yearEstablished?: string;
    mainContent?: string;
    mapEmbedCode?: string;
    bannerImage?: string;
    bannerImageDescription?: string;
    imageOne?: string;
    imageOneDescription?: string;
    imageTwo?: string;
    imageTwoDescription?: string;
    metaTitle?: string;
    metaDescription?: string;
    usefulInformation?: { name: string; number: string; address: string }[];
    communityInformation?: {
        name: string;
        title: string;
        email: string;
        phone: string;
    }[];
    showLeadershipOnAboutPage?: boolean;
};

type UsefulInformationItem = {
    id: string;
    name: string;
    number: string;
    address: string;
};


export default function LeaderAboutPage() {
  const { user, isUserLoading } = useUser();
  const db = useFirestore();
  const userProfileRef = useMemoFirebase(() => (user ? doc(db, 'users', user.uid) : null), [user, db]);
  const { data: userProfile, isLoading: profileLoading } = useDoc(userProfileRef);

  const router = useRouter();
  const { toast } = useToast();
  
  const [headline, setHeadline] = React.useState("");
  const [introduction, setIntroduction] = React.useState("");
  const [population, setPopulation] = React.useState("");
  const [area, setArea] = React.useState("");
  const [yearEstablished, setYearEstablished] = React.useState("");
  const [mainContent, setMainContent] = React.useState("");
  const [isSaving, setIsSaving] = React.useState(false);
  const [mapEmbedCode, setMapEmbedCode] = React.useState("");

  const [leadershipTeam, setLeadershipTeam] = React.useState<LeadershipItem[]>([]);
  const [isLeaderDialogOpen, setIsLeaderDialogOpen] = React.useState(false);
  const [currentLeaderItem, setCurrentLeaderItem] = React.useState<LeadershipItem | null>(null);

  const [bannerImage, setBannerImage] = React.useState<string | null>(null);
  const [bannerImageDescription, setBannerImageDescription] = React.useState("");
  const [imageOne, setImageOne] = React.useState<string | null>(null);
  const [imageOneDescription, setImageOneDescription] = React.useState("");
  const [imageTwo, setImageTwo] = React.useState<string | null>(null);
  const [imageTwoDescription, setImageTwoDescription] = React.useState("");
  
  const [isUploading, setIsUploading] = React.useState<string | null>(null);

  const [metaTitle, setMetaTitle] = React.useState("");
  const [metaDescription, setMetaDescription] = React.useState("");
  
  const [usefulInformation, setUsefulInformation] = React.useState<UsefulInformationItem[]>([]);
  const [isInfoDialogOpen, setIsInfoDialogOpen] = React.useState(false);
  const [currentInfoItem, setCurrentInfoItem] = React.useState<UsefulInformationItem | null>(null);
  const [showLeadership, setShowLeadership] = React.useState(true);

  const bannerInputRef = React.useRef<HTMLInputElement>(null);
  const fileInputRefOne = React.useRef<HTMLInputElement>(null);
  const fileInputRefTwo = React.useRef<HTMLInputElement>(null);
  
  const communityId = userProfile?.communityId;

  const communityProfileRef = useMemoFirebase(() => {
    if (!communityId || !db) return null;
    return doc(db, 'community_profiles', communityId);
  }, [communityId, db]);
  const { data: communityProfileData, isLoading: communityProfileLoading } = useDoc(communityProfileRef);


  React.useEffect(() => {
    if (communityProfileData) {
        const data = communityProfileData;
        setHeadline(data.headline || "");
        setIntroduction(data.introduction || "");
        setPopulation(data.population || "");
        setArea(data.area || "");
        setYearEstablished(data.yearEstablished || "");
        setMainContent(data.mainContent || "");
        setMapEmbedCode(data.mapEmbedCode || "");
        setBannerImage(data.bannerImage || null);
        setBannerImageDescription(data.bannerImageDescription || "");
        setImageOne(data.imageOne || null);
        setImageOneDescription(data.imageOneDescription || "");
        setImageTwo(data.imageTwo || null);
        setImageTwoDescription(data.imageTwoDescription || "");
        setMetaTitle(data.metaTitle || "");
        setMetaDescription(data.metaDescription || "");
        setShowLeadership(data.showLeadershipOnAboutPage !== false);
        if (data.usefulInformation) {
            setUsefulInformation(data.usefulInformation.map((item: any, index: number) => ({ id: `db-${index}-${Math.random()}`, ...item })));
        } else {
            setUsefulInformation([]);
        }
        if (data.communityInformation && Array.isArray(data.communityInformation)) {
            setLeadershipTeam(data.communityInformation.map((item: any, index: number) => ({ id: `db-leader-${index}-${Math.random()}`, ...item })));
        } else {
            setLeadershipTeam([]);
        }
    }
  }, [communityProfileData]);

  const handleImageUpload = (file: File, setImage: React.Dispatch<React.SetStateAction<string | null>>) => {
    if (!file) return;
    setIsUploading('true');
    const reader = new FileReader();
    reader.onload = (e) => {
        const result = e.target?.result;
        if (typeof result === 'string') {
            setImage(result);
            toast({ title: "Image ready for upload." });
        }
        setIsUploading(null);
    };
    reader.onerror = () => {
        setIsUploading(null);
        toast({ variant: 'destructive', title: "Error", description: "Failed to read file."});
    };
    reader.readAsDataURL(file);
};


  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, setImage: React.Dispatch<React.SetStateAction<string | null>>, fieldName: string) => {
    const file = e.target.files?.[0];
    if (file) {
        handleImageUpload(file, setImage);
    }
  };

  const handleSave = async () => {
    if (!communityId) {
        toast({ title: "Error", description: "Cannot find community to save to.", variant: "destructive" });
        return;
    }
    setIsSaving(true);
    const aboutData: CommunityProfileData = {
        headline, introduction, population, area, yearEstablished, mainContent,
        mapEmbedCode, bannerImage, bannerImageDescription, imageOne, imageOneDescription, imageTwo, imageTwoDescription,
        metaTitle, metaDescription,
        usefulInformation: usefulInformation.map(({ id, ...rest }) => rest),
        communityInformation: leadershipTeam.map(({ id, ...rest }) => rest),
        showLeadershipOnAboutPage: showLeadership,
    };
    try {
        const result = await updateCommunityProfileAction({ communityId, data: aboutData });
        if (result.success) {
            toast({ title: "Success", description: "About page information has been saved." });
        } else {
            throw new Error(result.error);
        }
    } catch (error: any) {
        toast({ title: "Save Failed", description: error.message, variant: "destructive" });
    } finally {
        setIsSaving(false);
    }
  };

  const handlePreview = () => {
    const dataToPreview = {
        headline, introduction, population, area, yearEstablished, mainContent,
        mapEmbedCode, bannerImage, bannerImageDescription, imageOne, imageOneDescription, imageTwo, imageTwoDescription,
        metaTitle, metaDescription
    };
    sessionStorage.setItem('aboutPagePreview', JSON.stringify(dataToPreview));
    window.open('/leader/about/preview', '_blank');
  };
  
  const handleOpenInfoDialog = (item: UsefulInformationItem | null) => {
    if (item) {
        setCurrentInfoItem(item);
    } else {
        setCurrentInfoItem({ id: `new-${Date.now()}`, name: '', number: '', address: '' });
    }
    setIsInfoDialogOpen(true);
  };
  
  const handleSaveInfoItem = () => {
    if (!currentInfoItem) return;
    
    setUsefulInformation(prev => {
        const existingIndex = prev.findIndex(item => item.id === currentInfoItem.id);
        if (existingIndex > -1) {
            // Update
            const newItems = [...prev];
            newItems[existingIndex] = currentInfoItem;
            return newItems;
        } else {
            // Add
            return [...prev, currentInfoItem];
        }
    });
    setIsInfoDialogOpen(false);
    setCurrentInfoItem(null);
  };
  
  const handleDeleteInfoItem = (id: string) => {
    setUsefulInformation(prev => prev.filter(item => item.id !== id));
  };
  
  const handleOpenLeaderDialog = (item: LeadershipItem | null) => {
    if (item) {
        setCurrentLeaderItem(item);
    } else {
        setCurrentLeaderItem({ id: `new-leader-${Date.now()}`, name: '', title: '', email: '', phone: '' });
    }
    setIsLeaderDialogOpen(true);
  };

  const handleSaveLeaderItem = () => {
      if (!currentLeaderItem) return;
      setLeadershipTeam(prev => {
          const existingIndex = prev.findIndex(item => item.id === currentLeaderItem.id);
          if (existingIndex > -1) {
              const newItems = [...prev];
              newItems[existingIndex] = currentLeaderItem;
              return newItems;
          } else {
              return [...prev, currentLeaderItem];
          }
      });
      setIsLeaderDialogOpen(false);
      setCurrentLeaderItem(null);
  };

  const handleDeleteLeaderItem = (id: string) => {
      setLeadershipTeam(prev => prev.filter(item => item.id !== id));
  };


  const loading = isUserLoading || profileLoading || communityProfileLoading;

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-3/4" />
        <Skeleton className="h-6 w-1/2" />
        <Skeleton className="h-5 w-3/4 mt-2" />
      </div>
    );
  }
  
  const ImageUploader = ({
    id,
    label,
    image,
    setImage,
    description,
    setDescription,
    fileInputRef,
    fieldName,
  }: {
    id: string;
    label: string;
    image: string | null;
    setImage: React.Dispatch<React.SetStateAction<string | null>>;
    description: string;
    setDescription: React.Dispatch<React.SetStateAction<string>>;
    fileInputRef: React.RefObject<HTMLInputElement>;
    fieldName: string;
  }) => (
    <div className="space-y-2">
      <Label>{label}</Label>
      <div className="relative group w-full aspect-video rounded-lg overflow-hidden shadow-sm bg-muted">
        {image ? (
            <Image src={image} alt={`${label} preview`} layout="fill" objectFit="cover" />
        ) : (
            <div className="flex items-center justify-center h-full text-muted-foreground">
                No Image
            </div>
        )}
        <div className="absolute inset-0 bg-black/40 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
            <div className="flex gap-2">
                <Button variant="outline" size="sm" className="gap-2" onClick={() => fileInputRef.current?.click()}>
                    <Upload /> Change
                </Button>
            </div>
        </div>
      </div>
      <Input
        id={`desc-${id}`}
        placeholder="Image description (for SEO)"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
      />
      <input type="file" ref={fileInputRef} onChange={(e) => handleFileChange(e, setImage, fieldName)} accept="image/*" className="hidden" />
      {isUploading === fieldName && <Loader2 className="animate-spin mt-2" />}
    </div>
  );

  return (
    <>
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight font-headline flex items-center gap-2">
          <Info className="h-8 w-8" />
          About Our Community
        </h1>
        <h2 className="text-2xl font-semibold text-primary mt-4">
          Welcome to {userProfile?.communityName || 'Your Community'}
        </h2>
      </div>

      <div className="space-y-2">
        <Label>Banner Image</Label>
        <div className="relative group w-full h-64 rounded-lg overflow-hidden shadow-lg bg-muted">
            {bannerImage && (
                <Image 
                    src={bannerImage} 
                    alt="Community banner image"
                    fill
                    className="object-cover"
                    data-ai-hint="community landscape"
                    priority
                />
            )}
            <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <Button
                variant="outline"
                size="sm"
                className="gap-2"
                onClick={() => bannerInputRef.current?.click()}
                >
                <Camera />
                Edit Banner
                </Button>
                <input
                type="file"
                ref={bannerInputRef}
                onChange={(e) => handleFileChange(e, setBannerImage, 'bannerImage')}
                className="hidden"
                accept="image/*"
                />
            </div>
        </div>
        <Input
            placeholder="Banner image description (for SEO)"
            value={bannerImageDescription}
            onChange={(e) => setBannerImageDescription(e.target.value)}
        />
        {isUploading === 'bannerImage' && <Loader2 className="animate-spin mt-2 text-primary" />}
      </div>

      <Card>
        <CardHeader>
            <CardTitle>Edit Community Information</CardTitle>
            <CardDescription>
                This information will be displayed on the public "About" page for your community. Fill it with interesting facts, historical details, and guides to local attractions.
            </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
            <div className="space-y-2">
                <Label htmlFor="headline">Welcome Headline</Label>
                <Input id="headline" placeholder="e.g., The Heart of the Highlands" value={headline} onChange={(e) => setHeadline(e.target.value)} />
            </div>
             <div className="space-y-2">
                <Label htmlFor="introduction">Introduction</Label>
                <RichTextEditor id="introduction" placeholder="A short, welcoming paragraph about your community." value={introduction} onChange={setIntroduction} />
            </div>
             <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-2">
                    <Label htmlFor="population">Population</Label>
                    <Input id="population" placeholder="e.g., 12,345" value={population} onChange={(e) => setPopulation(e.target.value)} />
                </div>
                 <div className="space-y-2">
                    <Label htmlFor="area">Area</Label>
                    <Input id="area" placeholder="e.g., 50 km²" value={area} onChange={(e) => setArea(e.target.value)} />
                </div>
                 <div className="space-y-2">
                    <Label htmlFor="year-established">Year Established</Label>
                    <Input id="year-established" placeholder="e.g., 1888" value={yearEstablished} onChange={(e) => setYearEstablished(e.target.value)} />
                </div>
            </div>
             <div className="space-y-2">
                <Label htmlFor="main-content">Main Content</Label>
                <RichTextEditor 
                    value={mainContent} 
                    onChange={setMainContent}
                    placeholder="Share the history, notable landmarks, and unique aspects of your community here."
                />
            </div>
            
            <Separator />

             <Card>
                <CardHeader>
                    <div className="flex justify-between items-center">
                        <div>
                            <CardTitle className="flex items-center gap-2"><Users className="h-5 w-5" /> Leadership Team</CardTitle>
                            <CardDescription>
                                Manage your community's leadership contacts. This will be displayed on the public "About" page.
                            </CardDescription>
                        </div>
                        <div className="flex items-center gap-2">
                            <Label htmlFor="show-leadership" className="text-sm font-medium">Show on Page</Label>
                            <Switch
                                id="show-leadership"
                                checked={showLeadership}
                                onCheckedChange={setShowLeadership}
                            />
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="space-y-2">
                        {leadershipTeam.map((item) => (
                            <div key={item.id} className="flex items-center justify-between p-3 border rounded-md bg-muted/50">
                                <div>
                                    <p className="font-semibold">{item.name} - <span className="text-sm font-normal text-muted-foreground">{item.title}</span></p>
                                    <p className="text-xs text-muted-foreground">{item.email}</p>
                                    <p className="text-xs text-muted-foreground">{item.phone}</p>
                                </div>
                                <div className="flex gap-1">
                                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleOpenLeaderDialog(item)}>
                                        <Pencil className="h-4 w-4" />
                                    </Button>
                                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => handleDeleteLeaderItem(item.id)}>
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </div>
                            </div>
                        ))}
                        {leadershipTeam.length === 0 && (
                            <p className="text-sm text-muted-foreground text-center py-4">No leadership contacts added yet.</p>
                        )}
                    </div>
                    <Button variant="outline" onClick={() => handleOpenLeaderDialog(null)}>
                        <PlusCircle className="mr-2 h-4 w-4" />
                        Add Leader Contact
                    </Button>
                </CardContent>
            </Card>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-6 border-t">
              <ImageUploader
                id="one"
                label="Image One"
                image={imageOne}
                setImage={setImageOne}
                description={imageOneDescription}
                setDescription={setImageOneDescription}
                fileInputRef={fileInputRefOne}
                fieldName="imageOne"
              />
              <ImageUploader
                id="two"
                label="Image Two"
                image={imageTwo}
                setImage={setImageTwo}
                description={imageTwoDescription}
                setDescription={setImageTwoDescription}
                fileInputRef={fileInputRefTwo}
                fieldName="imageTwo"
              />
            </div>

            <Separator />
            
            <div className="space-y-4">
                <h3 className="text-lg font-medium">Community Location</h3>
                <p className="text-sm text-muted-foreground">Go to Google Maps, find your location, click "Share", then "Embed a map", and copy the HTML code into the box below.</p>
                <div className="space-y-2">
                    <Label htmlFor="map-embed-code">Google Maps Embed Code</Label>
                    <Textarea 
                        id="map-embed-code" 
                        placeholder='<iframe src="https://www.google.com/maps/embed?pb=..." ></iframe>'
                        value={mapEmbedCode}
                        onChange={(e) => setMapEmbedCode(e.target.value)}
                        className="font-mono text-xs"
                    />
                </div>
                {mapEmbedCode && (
                    <div className="space-y-2">
                        <Label>Map Preview</Label>
                         <Alert variant="destructive">
                            <AlertTitle>Security Warning</AlertTitle>
                            <AlertDescription>
                                You are embedding raw HTML. Ensure the code is from a trusted source like Google Maps.
                            </AlertDescription>
                        </Alert>
                        <div 
                            className="aspect-video w-full rounded-md border bg-muted map-embed-container"
                            dangerouslySetInnerHTML={{ __html: mapEmbedCode }} 
                        />
                    </div>
                )}
            </div>

            <Separator />
            
             <Card className="border-border/70">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2"><Search className="h-5 w-5" /> Search engine optimization</CardTitle>
                    <CardDescription>
                    Improve your ranking and how your community page will appear in search engines results.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="p-4 border rounded-lg bg-muted/50">
                        <p className="text-blue-800 dark:text-blue-400 text-lg font-medium group-hover:underline truncate">{metaTitle || headline || 'About Your Community'}</p>
                        <p className="text-green-700 dark:text-green-400 text-sm">https://my-community-hub.co.uk/community/{communityId}/about</p>
                        <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{metaDescription || 'Your compelling meta description will appear here, helping you attract more visitors from search results.'}</p>
                    </div>

                    <div className="space-y-2">
                        <div className="flex justify-between items-center">
                            <Label htmlFor="metaTitle">Meta title</Label>
                            <span className="text-xs text-muted-foreground">{metaTitle.length} / 70</span>
                        </div>
                        <Input id="metaTitle" placeholder="Public title for the about page..." value={metaTitle} onChange={(e) => setMetaTitle(e.target.value)} maxLength={70}/>
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
            <Separator />

             <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Info className="h-5 w-5" />
                        Useful Information
                    </CardTitle>
                    <CardDescription>
                        Add and manage a list of useful local contacts like hospitals, dentists, and council offices. This will be displayed on the public "About" page.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="space-y-2">
                        {usefulInformation.map((item) => (
                            <div key={item.id} className="flex items-center justify-between p-3 border rounded-md bg-muted/50">
                                <div>
                                    <p className="font-semibold">{item.name}</p>
                                    <p className="text-sm text-muted-foreground">{item.number}</p>
                                    <p className="text-xs text-muted-foreground">{item.address}</p>
                                </div>
                                <div className="flex gap-1">
                                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleOpenInfoDialog(item)}>
                                        <Pencil className="h-4 w-4" />
                                    </Button>
                                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => handleDeleteInfoItem(item.id)}>
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </div>
                            </div>
                        ))}
                        {usefulInformation.length === 0 && (
                            <p className="text-sm text-muted-foreground text-center py-4">No useful contacts added yet.</p>
                        )}
                    </div>
                    <Button variant="outline" onClick={() => handleOpenInfoDialog(null)}>
                        <PlusCircle className="mr-2 h-4 w-4" />
                        Add Contact
                    </Button>
                </CardContent>
            </Card>
            
        </CardContent>
        <CardFooter className="gap-2">
            <Button disabled={isSaving || !!isUploading} onClick={handleSave}>
                {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                Save Changes
            </Button>
            <Button variant="outline" onClick={handlePreview}>
                <Eye className="mr-2 h-4 w-4" />
                Preview
            </Button>
        </CardFooter>
      </Card>
    </div>
    <Dialog open={isInfoDialogOpen} onOpenChange={setIsInfoDialogOpen}>
        <DialogContent>
            <DialogHeader>
                <DialogTitle>{currentInfoItem?.id.startsWith('new-') ? 'Add New Contact' : 'Edit Contact'}</DialogTitle>
            </DialogHeader>
            <div className="py-4 space-y-4">
                <div className="space-y-2">
                    <Label htmlFor="info-name">Name</Label>
                    <Input id="info-name" value={currentInfoItem?.name || ''} onChange={(e) => setCurrentInfoItem(prev => prev ? {...prev, name: e.target.value} : null)} />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="info-number">Phone Number</Label>
                    <Input id="info-number" value={currentInfoItem?.number || ''} onChange={(e) => setCurrentInfoItem(prev => prev ? {...prev, number: e.target.value} : null)} />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="info-address">Address</Label>
                    <Input id="info-address" value={currentInfoItem?.address || ''} onChange={(e) => setCurrentInfoItem(prev => prev ? {...prev, address: e.target.value} : null)} />
                </div>
            </div>
            <DialogFooter>
                <Button variant="outline" onClick={() => setIsInfoDialogOpen(false)}>Cancel</Button>
                <Button onClick={handleSaveInfoItem}>Save Contact</Button>
            </DialogFooter>
        </DialogContent>
    </Dialog>
    <Dialog open={isLeaderDialogOpen} onOpenChange={setIsLeaderDialogOpen}>
        <DialogContent>
            <DialogHeader>
                <DialogTitle>{currentLeaderItem?.id.startsWith('new-') ? 'Add New Leader' : 'Edit Leader Contact'}</DialogTitle>
            </DialogHeader>
            <div className="py-4 space-y-4">
                <div className="space-y-2">
                    <Label htmlFor="leader-item-name">Name</Label>
                    <Input id="leader-item-name" value={currentLeaderItem?.name || ''} onChange={(e) => setCurrentLeaderItem(prev => prev ? {...prev, name: e.target.value} : null)} />
                </div>
                 <div className="space-y-2">
                    <Label htmlFor="leader-item-title">Title</Label>
                    <Input id="leader-item-title" value={currentLeaderItem?.title || ''} onChange={(e) => setCurrentLeaderItem(prev => prev ? {...prev, title: e.target.value} : null)} />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="leader-item-email">Email</Label>
                    <Input id="leader-item-email" type="email" value={currentLeaderItem?.email || ''} onChange={(e) => setCurrentLeaderItem(prev => prev ? {...prev, email: e.target.value} : null)} />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="leader-item-phone">Phone</Label>
                    <Input id="leader-item-phone" type="tel" value={currentLeaderItem?.phone || ''} onChange={(e) => setCurrentLeaderItem(prev => prev ? {...prev, phone: e.target.value} : null)} />
                </div>
            </div>
            <DialogFooter>
                <Button variant="outline" onClick={() => setIsLeaderDialogOpen(false)}>Cancel</Button>
                <Button onClick={handleSaveLeaderItem}>Save Contact</Button>
            </DialogFooter>
        </DialogContent>
    </Dialog>
    </>
  );
}
