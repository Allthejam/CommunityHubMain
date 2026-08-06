'use client';

import * as React from 'react';
import { useUser, useFirestore, useDoc, useCollection, useMemoFirebase } from '@/firebase';
import { doc, collection, query, where } from 'firebase/firestore';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { 
  Truck, 
  Store, 
  Phone, 
  Save, 
  Loader2, 
  ShieldCheck, 
  CreditCard, 
  Image as ImageIcon, 
  Info, 
  ArrowLeft,
  DollarSign,
  FileText,
  Upload,
  Trash2,
  Users,
  Plus,
  Building,
  Mail,
  Globe,
  Camera,
  Search,
  MapPin
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useActiveCommunityId } from '@/hooks/use-active-community-id';
import { updateCourierFullProfileAction } from '@/lib/actions/courierActions';
import { RichTextEditor } from '@/components/rich-text-editor';
import Link from 'next/link';

type TeamMember = {
  id: string;
  name: string;
  role: string;
  phone?: string;
  photoUrl?: string;
  text?: string;
};

type AddressItem = {
  addressLine1?: string;
  addressLine2?: string;
  city?: string;
  county?: string;
  postcode?: string;
  country?: string;
};

type CourierBusinessDoc = {
  id: string;
  businessName?: string;
  shortDescription?: string;
  longDescription?: string;
  vehicleDetails?: string;
  contactPhone?: string;
  contactNumber?: string;
  contactEmail?: string;
  stripeAccountId?: string;
  logoImage?: string;
  bannerImage?: string;
  primaryCommunityId?: string;
  ownerId?: string;
  team?: TeamMember[];
  pageTwoIntro?: string;
  pageTwoContent?: Array<{ id?: string; text?: string; image?: string; name?: string; role?: string }>;
  pageThreeContent?: string;
  addresses?: AddressItem[];
  dispatchPhone?: string;
  supportEmail?: string;
  depotAddress?: string;
  websiteUrl?: string;
  metaTitle?: string;
  metaDescription?: string;
  keywords?: string;
};

const MAX_FILE_SIZE_MB = 5;

// Helper to strip HTML tags from raw strings
const stripHtml = (html: string | undefined): string => {
  if (!html) return '';
  return html.replace(/<[^>]*>?/gm, '').trim();
};

export default function CourierProfilePage() {
  const { user, isUserLoading } = useUser();
  const db = useFirestore();
  const { toast } = useToast();
  const { communityId, userProfile, isLoading: activeCommunityLoading } = useActiveCommunityId();

  const logoInputRef = React.useRef<HTMLInputElement | null>(null);
  const bannerInputRef = React.useRef<HTMLInputElement | null>(null);

  // Location 1: /communities/{communityId}
  const communityRef = useMemoFirebase(
    () => (communityId ? doc(db, 'communities', communityId) : null),
    [communityId, db]
  );
  const { data: communityData, isLoading: communityLoading } = useDoc(communityRef);

  // Location 2: /businesses where accountType == "courier" & primaryCommunityId == communityId & ownerId == user.uid
  const businessQuery = useMemoFirebase(
    () =>
      user && communityId
        ? query(
            collection(db, 'businesses'),
            where('ownerId', '==', user.uid),
            where('accountType', '==', 'courier'),
            where('primaryCommunityId', '==', communityId)
          )
        : null,
    [user, communityId, db]
  );
  const { data: courierBusinesses, isLoading: businessLoading } = useCollection<CourierBusinessDoc>(businessQuery);
  const existingBiz = courierBusinesses?.[0];

  // Tab State
  const [activeTab, setActiveTab] = React.useState('identity');

  // Form State
  const [businessName, setBusinessName] = React.useState('');
  const [shortDescription, setShortDescription] = React.useState('');
  const [longDescription, setLongDescription] = React.useState('');
  const [vehicleDetails, setVehicleDetails] = React.useState('');
  const [contactPhone, setContactPhone] = React.useState('');
  const [contactEmail, setContactEmail] = React.useState('');
  const [deliveryFee, setDeliveryFee] = React.useState('0.20');
  const [stripeAccountId, setStripeAccountId] = React.useState('');
  const [logoImage, setLogoImage] = React.useState('');
  const [bannerImage, setBannerImage] = React.useState('');

  // Team & Additional Contact State
  const [team, setTeam] = React.useState<TeamMember[]>([]);
  const [pageThreeContent, setPageThreeContent] = React.useState('');
  const [dispatchPhone, setDispatchPhone] = React.useState('');
  const [supportEmail, setSupportEmail] = React.useState('');
  const [depotAddress, setDepotAddress] = React.useState('');
  const [depotCity, setDepotCity] = React.useState('');
  const [depotPostcode, setDepotPostcode] = React.useState('');
  const [websiteUrl, setWebsiteUrl] = React.useState('');

  // SEO State
  const [metaTitle, setMetaTitle] = React.useState('');
  const [metaDescription, setMetaDescription] = React.useState('');
  const [keywords, setKeywords] = React.useState('');

  const [isSaving, setIsSaving] = React.useState(false);
  const [isUploadingLogo, setIsUploadingLogo] = React.useState(false);
  const [isUploadingBanner, setIsUploadingBanner] = React.useState(false);

  // Populate form from 3 Firestore locations when loaded
  React.useEffect(() => {
    if (communityData) {
      if (communityData.courierDeliveryFee !== undefined) {
        setDeliveryFee(String(communityData.courierDeliveryFee));
      }
    }

    if (existingBiz) {
      setBusinessName(existingBiz.businessName || `${communityData?.name || 'Local'} Local Courier`);
      setShortDescription(existingBiz.pageTwoIntro || existingBiz.shortDescription || '');
      setLongDescription(existingBiz.longDescription || '<p>As your official community courier, I am dedicated to providing fast, safe, and friendly delivery services for all your local purchases.</p>');
      setVehicleDetails(existingBiz.vehicleDetails || 'Mercedes');
      setContactPhone(existingBiz.contactNumber || existingBiz.contactPhone || '');
      setContactEmail(existingBiz.contactEmail || user?.email || '');
      setStripeAccountId(existingBiz.stripeAccountId || communityData?.stripeAccountId || '');
      setLogoImage(existingBiz.logoImage || '');
      setBannerImage(existingBiz.bannerImage || '');
      
      // Parse team members from team array or pageTwoContent
      if (existingBiz.team && existingBiz.team.length > 0) {
        setTeam(existingBiz.team.map(m => ({
          ...m,
          name: stripHtml(m.name),
          role: stripHtml(m.role),
          phone: stripHtml(m.phone),
          text: m.text || `<p><strong>${stripHtml(m.name)}</strong> - ${stripHtml(m.role)}</p>`,
        })));
      } else if (existingBiz.pageTwoContent && existingBiz.pageTwoContent.length > 0) {
        const parsedTeam: TeamMember[] = existingBiz.pageTwoContent.map((item, idx) => {
          const rawText = item.text || '';
          const cleanText = stripHtml(rawText);
          const cleanName = stripHtml(item.name || cleanText.split('-')[0]?.trim() || `Team Member ${idx + 1}`);
          const cleanRole = stripHtml(item.role || cleanText.split('-')[1]?.trim() || 'Courier Driver');
          return {
            id: item.id || `member-${idx}`,
            name: cleanName,
            role: cleanRole,
            photoUrl: item.image || '',
            text: rawText && rawText.includes('<') ? rawText : `<p><strong>${cleanName}</strong> - ${cleanRole}</p>`,
          };
        });
        setTeam(parsedTeam);
      }

      setPageThreeContent(existingBiz.pageThreeContent || '<p>Detailed operating guidelines, support contacts, and depot access details for our courier service.</p>');
      
      if (existingBiz.addresses && existingBiz.addresses.length > 0) {
        const addr = existingBiz.addresses[0];
        setDepotAddress(addr.addressLine1 || existingBiz.depotAddress || '');
        setDepotCity(addr.city || '');
        setDepotPostcode(addr.postcode || '');
      } else {
        setDepotAddress(existingBiz.depotAddress || '');
      }

      setDispatchPhone(existingBiz.dispatchPhone || '');
      setSupportEmail(existingBiz.supportEmail || '');
      setWebsiteUrl(existingBiz.websiteUrl || '');
      setMetaTitle(existingBiz.metaTitle || `${communityData?.name || 'Local'} Courier Service | Virtual Highstreet`);
      setMetaDescription(stripHtml(existingBiz.metaDescription || existingBiz.shortDescription || 'Fast, reliable local community courier delivery service.'));
      setKeywords(existingBiz.keywords || 'courier, delivery, local logistics, virtual highstreet');
    } else if (userProfile) {
      setBusinessName(`${userProfile.communityName || 'Community'} Local Courier`);
      setShortDescription(userProfile.courierBio || 'Official local community courier providing fast, eco-friendly deliveries.');
      setLongDescription('<p>As your official community courier, I am dedicated to providing fast, safe, and friendly delivery services for all your local purchases from the Virtual Highstreet.</p>');
      setVehicleDetails(userProfile.vehicleType || 'Mercedes');
      setContactPhone(userProfile.phone || userProfile.contactPhone || '');
      setContactEmail(user?.email || '');
      setPageThreeContent('<p>Detailed operating guidelines, support contacts, and depot access details for our courier service.</p>');
      setMetaTitle(`${userProfile.communityName || 'Community'} Courier Service | Virtual Highstreet`);
      setMetaDescription('Fast, reliable local community courier delivery service.');
      setKeywords('courier, delivery, local logistics, virtual highstreet');
    }
  }, [communityData, existingBiz, userProfile, user]);

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
      toast({ title: 'File too large', description: `Logo must be smaller than ${MAX_FILE_SIZE_MB}MB.`, variant: 'destructive' });
      return;
    }
    setIsUploadingLogo(true);
    try {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      const dataUrl = await new Promise<string>((resolve, reject) => {
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = (err) => reject(err);
      });
      setLogoImage(dataUrl);
      toast({ title: 'Logo Selected', description: 'Logo image ready to save.' });
    } catch (err: any) {
      toast({ title: 'Upload Failed', description: err.message, variant: 'destructive' });
    } finally {
      setIsUploadingLogo(false);
      if (logoInputRef.current) logoInputRef.current.value = '';
    }
  };

  const handleBannerUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
      toast({ title: 'File too large', description: `Banner must be smaller than ${MAX_FILE_SIZE_MB}MB.`, variant: 'destructive' });
      return;
    }
    setIsUploadingBanner(true);
    try {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      const dataUrl = await new Promise<string>((resolve, reject) => {
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = (err) => reject(err);
      });
      setBannerImage(dataUrl);
      toast({ title: 'Banner Selected', description: 'Banner image ready to save.' });
    } catch (err: any) {
      toast({ title: 'Upload Failed', description: err.message, variant: 'destructive' });
    } finally {
      setIsUploadingBanner(false);
      if (bannerInputRef.current) bannerInputRef.current.value = '';
    }
  };

  const handleMemberPhotoUploadInline = async (memberId: string, file: File) => {
    try {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      const dataUrl = await new Promise<string>((resolve, reject) => {
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = (err) => reject(err);
      });
      setTeam((prev) =>
        prev.map((m) => (m.id === memberId ? { ...m, photoUrl: dataUrl } : m))
      );
      toast({ title: 'Photo Uploaded', description: 'Team member photo updated.' });
    } catch (err: any) {
      toast({ title: 'Upload Failed', description: err.message, variant: 'destructive' });
    }
  };

  const handleAddInlineTeamMember = () => {
    const newMember: TeamMember = {
      id: `member-${Date.now()}`,
      name: 'New Courier Member',
      role: 'Courier Driver',
      phone: '',
      photoUrl: '',
      text: '<p>Dedicated community delivery courier.</p>',
    };
    setTeam((prev) => [...prev, newMember]);
    toast({ title: 'Team Member Added', description: 'New team card added to page.' });
  };

  const handleUpdateTeamMemberField = (memberId: string, field: keyof TeamMember, value: string) => {
    setTeam((prev) =>
      prev.map((m) => (m.id === memberId ? { ...m, [field]: value } : m))
    );
  };

  const handleRemoveTeamMember = (memberId: string) => {
    setTeam((prev) => prev.filter((m) => m.id !== memberId));
    toast({ title: 'Member Removed', description: 'Team member removed.' });
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !communityId) return;

    const feeNum = parseFloat(deliveryFee);
    if (isNaN(feeNum) || feeNum < 0) {
      toast({ title: 'Invalid Delivery Fee', description: 'Please enter a valid positive number.', variant: 'destructive' });
      return;
    }

    setIsSaving(true);
    try {
      const addressesArray: AddressItem[] = [
        {
          addressLine1: depotAddress.trim(),
          city: depotCity.trim(),
          postcode: depotPostcode.trim(),
          country: 'United Kingdom',
        }
      ];

      const res = await updateCourierFullProfileAction({
        userId: user.uid,
        communityId,
        businessName: businessName.trim(),
        shortDescription: shortDescription.trim(),
        longDescription: longDescription.trim(),
        vehicleDetails: vehicleDetails.trim(),
        contactPhone: contactPhone.trim(),
        contactNumber: contactPhone.trim(),
        contactEmail: contactEmail.trim(),
        deliveryFee: feeNum,
        stripeAccountId: stripeAccountId.trim(),
        logoImage: logoImage.trim(),
        bannerImage: bannerImage.trim(),
        team,
        pageTwoIntro: pageTwoIntro.trim(),
        pageThreeContent: pageThreeContent.trim(),
        addresses: addressesArray,
        dispatchPhone: dispatchPhone.trim(),
        supportEmail: supportEmail.trim(),
        depotAddress: depotAddress.trim(),
        websiteUrl: websiteUrl.trim(),
        metaTitle: metaTitle.trim(),
        metaDescription: stripHtml(metaDescription),
        keywords: keywords.trim(),
      });

      if (res.success) {
        toast({
          title: 'Courier Profile Saved!',
          description: 'Your courier settings have been updated across Firestore (/communities, /businesses, /users).',
        });
      } else {
        throw new Error(res.error);
      }
    } catch (err: any) {
      toast({ title: 'Save Failed', description: err.message, variant: 'destructive' });
    } finally {
      setIsSaving(false);
    }
  };

  if (isUserLoading || activeCommunityLoading || communityLoading || businessLoading) {
    return (
      <div className="flex justify-center items-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-4xl mx-auto pb-16">
      {/* Header & Navigation */}
      <div>
        <Button variant="ghost" size="sm" asChild className="mb-4 text-muted-foreground">
          <Link href="/courier/dashboard">
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to Courier Dashboard
          </Link>
        </Button>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight font-headline flex items-center gap-2">
              <Truck className="h-8 w-8 text-primary" />
              Manage Courier Profile
            </h1>
            <p className="text-muted-foreground mt-1">
              Create and edit your official courier service profile for {communityData?.name || userProfile?.communityName || 'your community'}.
            </p>
          </div>
          <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 self-start sm:self-center px-3 py-1 text-xs">
            <ShieldCheck className="mr-1.5 h-4 w-4" />
            Active Community Courier
          </Badge>
        </div>
      </div>

      <Alert className="bg-blue-50/50 border-blue-200 text-blue-900">
        <Info className="h-4 w-4 text-blue-600" />
        <AlertTitle className="text-sm font-semibold">Unified Database Structure</AlertTitle>
        <AlertDescription className="text-xs text-blue-800 mt-1">
          Saving updates your delivery fee in <strong>/communities/{communityId}</strong>, your business listing in <strong>/businesses</strong>, and your permissions in <strong>/users/{user?.uid}</strong>.
        </AlertDescription>
      </Alert>

      {/* Main Profile Editor Form wrapped in Shadcn Tabs */}
      <form onSubmit={handleSaveProfile} className="space-y-8">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid grid-cols-2 md:grid-cols-5 w-full bg-muted/60 p-1 h-auto gap-1">
            <TabsTrigger value="identity" className="text-xs py-2 flex items-center justify-center gap-1.5">
              <Store className="h-3.5 w-3.5" /> Identity & Bio
            </TabsTrigger>
            <TabsTrigger value="team" className="text-xs py-2 flex items-center justify-center gap-1.5">
              <Users className="h-3.5 w-3.5" /> Our Team
            </TabsTrigger>
            <TabsTrigger value="contact" className="text-xs py-2 flex items-center justify-center gap-1.5">
              <Building className="h-3.5 w-3.5" /> Contact & Depot
            </TabsTrigger>
            <TabsTrigger value="fees" className="text-xs py-2 flex items-center justify-center gap-1.5">
              <CreditCard className="h-3.5 w-3.5" /> Fees & Payouts
            </TabsTrigger>
            <TabsTrigger value="seo" className="text-xs py-2 flex items-center justify-center gap-1.5">
              <Search className="h-3.5 w-3.5" /> SEO
            </TabsTrigger>
          </TabsList>

          {/* TAB 1: Business Identity & Overview */}
          <TabsContent value="identity" className="space-y-6 pt-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Store className="h-5 w-5 text-primary" />
                  Courier Business Identity
                </CardTitle>
                <CardDescription>
                  Configure your business name and upload visible logo & banner images.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="business-name">Official Business Name</Label>
                  <Input
                    id="business-name"
                    value={businessName}
                    onChange={(e) => setBusinessName(e.target.value)}
                    placeholder="e.g. Highstreet Local Courier"
                    required
                  />
                  <p className="text-xs text-muted-foreground">Standard format: "{communityData?.name || 'Community'} Local Courier"</p>
                </div>

                {/* Visual Image Uploaders for Logo and Banner */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2 border-t">
                  {/* Logo Uploader */}
                  <div className="space-y-3">
                    <Label className="text-sm font-semibold flex items-center justify-between">
                      <span>Courier Logo Image</span>
                      {logoImage && <Badge variant="secondary" className="text-[10px]">Image Active</Badge>}
                    </Label>

                    <div className="flex flex-col items-center justify-center p-4 border-2 border-dashed rounded-lg bg-muted/20 relative group min-h-[160px]">
                      {logoImage ? (
                        <div className="relative flex flex-col items-center gap-2">
                          <img src={logoImage} alt="Courier Logo" className="h-24 w-24 object-cover rounded-full border-2 border-primary shadow-sm" />
                          <Button
                            type="button"
                            variant="destructive"
                            size="xs"
                            onClick={() => setLogoImage('')}
                            className="mt-1 text-xs"
                          >
                            <Trash2 className="mr-1 h-3 w-3" /> Remove Logo
                          </Button>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center justify-center text-center text-muted-foreground text-xs space-y-2">
                          <div className="p-3 bg-muted rounded-full">
                            <Camera className="h-6 w-6 text-muted-foreground/70" />
                          </div>
                          <span>No logo uploaded</span>
                        </div>
                      )}
                    </div>

                    <input
                      type="file"
                      accept="image/*"
                      ref={logoInputRef}
                      onChange={handleLogoUpload}
                      className="hidden"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => logoInputRef.current?.click()}
                      disabled={isUploadingLogo}
                      className="w-full"
                    >
                      {isUploadingLogo ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
                      {logoImage ? 'Change Logo Image File' : 'Upload Logo Image File'}
                    </Button>
                  </div>

                  {/* Banner Uploader */}
                  <div className="space-y-3">
                    <Label className="text-sm font-semibold flex items-center justify-between">
                      <span>Courier Banner Image</span>
                      {bannerImage && <Badge variant="secondary" className="text-[10px]">Image Active</Badge>}
                    </Label>

                    <div className="flex flex-col items-center justify-center p-4 border-2 border-dashed rounded-lg bg-muted/20 relative group min-h-[160px]">
                      {bannerImage ? (
                        <div className="relative flex flex-col items-center gap-2 w-full">
                          <img src={bannerImage} alt="Courier Banner" className="h-24 w-full object-cover rounded-md border shadow-sm" />
                          <Button
                            type="button"
                            variant="destructive"
                            size="xs"
                            onClick={() => setBannerImage('')}
                            className="mt-1 text-xs"
                          >
                            <Trash2 className="mr-1 h-3 w-3" /> Remove Banner
                          </Button>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center justify-center text-center text-muted-foreground text-xs space-y-2">
                          <div className="p-3 bg-muted rounded-full">
                            <ImageIcon className="h-6 w-6 text-muted-foreground/70" />
                          </div>
                          <span>No banner image uploaded</span>
                        </div>
                      )}
                    </div>

                    <input
                      type="file"
                      accept="image/*"
                      ref={bannerInputRef}
                      onChange={handleBannerUpload}
                      className="hidden"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => bannerInputRef.current?.click()}
                      disabled={isUploadingBanner}
                      className="w-full"
                    >
                      {isUploadingBanner ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
                      {bannerImage ? 'Change Banner Image File' : 'Upload Banner Image File'}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <FileText className="h-5 w-5 text-primary" />
                  Service Overview & Bio (Rich Text)
                </CardTitle>
                <CardDescription>
                  Format your courier bio, operating hours, and service coverage using rich formatting without raw HTML tags.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="short-desc" className="font-semibold flex items-center gap-1">
                    Short Catchphrase <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="short-desc"
                    value={shortDescription}
                    onChange={(e) => setShortDescription(e.target.value)}
                    placeholder="Your friendly and reliable community courier service."
                  />
                  <p className="text-xs text-muted-foreground">
                    A short tagline displayed under your business name across directory cards and hero banner.
                  </p>
                </div>

                <div className="space-y-2">
                  <Label>Full Service Bio & Operating Details (Rich Text)</Label>
                  <div className="border rounded-md overflow-hidden bg-background">
                    <RichTextEditor
                      value={longDescription}
                      onChange={setLongDescription}
                      placeholder="Describe your delivery coverage, operating hours, special handling care, etc."
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* TAB 2: Our Team (Inline Editor on Page with RichTextEditor - NO Popups!) */}
          <TabsContent value="team" className="space-y-6 pt-4">
            {/* Team Introduction Box (pageTwoIntro - Rich Text Editor) */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <FileText className="h-5 w-5 text-primary" />
                  Introduction to your Team (Rich Text)
                </CardTitle>
                <CardDescription>
                  Write a comprehensive intro to introduce your courier team, company values, operating standards, and staff to customers.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                <Label>Team Introduction Text (Rich Text)</Label>
                <div className="border rounded-md overflow-hidden bg-background">
                  <RichTextEditor
                    value={shortDescription}
                    onChange={setShortDescription}
                    placeholder="Write a detailed introduction for your courier team..."
                  />
                </div>
                <p className="text-xs text-muted-foreground">Saved to <strong>pageTwoIntro</strong> in Firestore and expands dynamically to accommodate detailed text and formatting.</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-3">
                <div>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Users className="h-5 w-5 text-primary" />
                    Our Team Members
                  </CardTitle>
                  <CardDescription>
                    Edit courier drivers and team details directly on this page using rich text without popups.
                  </CardDescription>
                </div>
                <Button type="button" onClick={handleAddInlineTeamMember} size="sm">
                  <Plus className="mr-2 h-4 w-4" /> Add Team Member
                </Button>
              </CardHeader>
              <CardContent className="space-y-6">
                {team.length > 0 ? (
                  team.map((member, index) => (
                    <Card key={member.id} className="border bg-muted/20 relative overflow-hidden">
                      <CardHeader className="py-3 bg-muted/40 flex flex-row items-center justify-between border-b">
                        <div className="flex items-center gap-2">
                          <Badge variant="secondary" className="font-mono text-xs">Member #{index + 1}</Badge>
                          <span className="font-semibold text-sm">{member.name || 'Team Member'}</span>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveTeamMember(member.id)}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50 h-8 px-2 text-xs"
                        >
                          <Trash2 className="mr-1 h-3.5 w-3.5" /> Remove Member
                        </Button>
                      </CardHeader>
                      <CardContent className="p-4 space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div className="space-y-2">
                            <Label className="text-xs">Member Name</Label>
                            <Input
                              value={member.name}
                              onChange={(e) => handleUpdateTeamMemberField(member.id, 'name', e.target.value)}
                              placeholder="e.g. Alex Smith"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label className="text-xs">Role / Title</Label>
                            <Input
                              value={member.role}
                              onChange={(e) => handleUpdateTeamMemberField(member.id, 'role', e.target.value)}
                              placeholder="e.g. Lead Dispatcher, Cargo Bike Driver"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label className="text-xs">Phone Number</Label>
                            <Input
                              value={member.phone || ''}
                              onChange={(e) => handleUpdateTeamMemberField(member.id, 'phone', e.target.value)}
                              placeholder="+447123456789"
                            />
                          </div>
                        </div>

                        {/* Inline Photo Uploader */}
                        <div className="flex items-center gap-4 pt-2 border-t">
                          <Avatar className="h-14 w-14 border-2 border-primary/20">
                            <AvatarImage src={member.photoUrl} />
                            <AvatarFallback><Users className="h-7 w-7 text-muted-foreground" /></AvatarFallback>
                          </Avatar>
                          <div className="space-y-1">
                            <Label className="text-xs">Team Member Photo</Label>
                            <div>
                              <label className="cursor-pointer inline-flex items-center justify-center rounded-md text-xs font-medium border border-input bg-background hover:bg-accent hover:text-accent-foreground h-8 px-3 py-1">
                                <Upload className="mr-1.5 h-3.5 w-3.5" />
                                {member.photoUrl ? 'Change Member Photo' : 'Upload Member Photo'}
                                <input
                                  type="file"
                                  accept="image/*"
                                  className="hidden"
                                  onChange={(e) => {
                                    const file = e.target.files?.[0];
                                    if (file) handleMemberPhotoUploadInline(member.id, file);
                                  }}
                                />
                              </label>
                            </div>
                          </div>
                        </div>

                        {/* Rich Text Editor for Team Member Bio/Text */}
                        <div className="space-y-2 pt-2 border-t">
                          <Label className="text-xs font-semibold">Team Member Bio & Details (Rich Text)</Label>
                          <div className="border rounded-md overflow-hidden bg-background">
                            <RichTextEditor
                              value={member.text || ''}
                              onChange={(val) => handleUpdateTeamMemberField(member.id, 'text', val)}
                              placeholder="Write a bio or description for this team member..."
                            />
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                ) : (
                  <div className="p-8 text-center border-2 border-dashed rounded-lg text-muted-foreground text-xs italic space-y-2">
                    <Users className="h-8 w-8 mx-auto text-muted-foreground/50 mb-1" />
                    <p>No team members added yet.</p>
                    <Button type="button" onClick={handleAddInlineTeamMember} variant="outline" size="sm">
                      <Plus className="mr-1.5 h-3.5 w-3.5" /> Add First Team Member
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* TAB 3: Additional Contact Details */}
          <TabsContent value="contact" className="space-y-6 pt-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Phone className="h-5 w-5 text-primary" />
                  Public Contact Numbers & Email
                </CardTitle>
                <CardDescription>
                  Public email, phone number, vehicle type, and website URL (saved to <strong>contactEmail</strong> and <strong>contactNumber</strong>).
                </CardDescription>
              </CardHeader>
              <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="contact-phone">Public Phone Number (contactNumber)</Label>
                  <Input
                    id="contact-phone"
                    value={contactPhone}
                    onChange={(e) => setContactPhone(e.target.value)}
                    placeholder="+447368412083"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="contact-email">Public Email (contactEmail)</Label>
                  <Input
                    id="contact-email"
                    type="email"
                    value={contactEmail}
                    onChange={(e) => setContactEmail(e.target.value)}
                    placeholder="courier@example.com"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="vehicle-details">Vehicle Specification</Label>
                  <Input
                    id="vehicle-details"
                    value={vehicleDetails}
                    onChange={(e) => setVehicleDetails(e.target.value)}
                    placeholder="e.g. Mercedes, Electric Cargo Bike, Van"
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <MapPin className="h-5 w-5 text-primary" />
                  Physical Depot Location (addresses Array)
                </CardTitle>
                <CardDescription>
                  Physical depot address saved into the <strong>addresses</strong> array in Firestore.
                </CardDescription>
              </CardHeader>
              <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2 md:col-span-3">
                  <Label htmlFor="depot-address">Street Address (addressLine1)</Label>
                  <Input
                    id="depot-address"
                    value={depotAddress}
                    onChange={(e) => setDepotAddress(e.target.value)}
                    placeholder="Unit 4, Highstreet Logistics Hub"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="depot-city">Town / City</Label>
                  <Input
                    id="depot-city"
                    value={depotCity}
                    onChange={(e) => setDepotCity(e.target.value)}
                    placeholder="Inverness"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="depot-postcode">Postcode</Label>
                  <Input
                    id="depot-postcode"
                    value={depotPostcode}
                    onChange={(e) => setDepotPostcode(e.target.value)}
                    placeholder="IV1 1AA"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="website-url">Website URL</Label>
                  <Input
                    id="website-url"
                    value={websiteUrl}
                    onChange={(e) => setWebsiteUrl(e.target.value)}
                    placeholder="https://www.my-courier-service.co.uk"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Extended Info (Rich Text - pageThreeContent) */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <FileText className="h-5 w-5 text-primary" />
                  Extended Info & Instructions (pageThreeContent - Rich Text)
                </CardTitle>
                <CardDescription>
                  Write extended contact info, emergency dispatch instructions, and depot access guidelines in rich text.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                <Label>Extended Info Content (Rich Text)</Label>
                <div className="border rounded-md overflow-hidden bg-background">
                  <RichTextEditor
                    value={pageThreeContent}
                    onChange={setPageThreeContent}
                    placeholder="Write detailed depot operating instructions, emergency contacts, or additional support guidelines..."
                  />
                </div>
                <p className="text-xs text-muted-foreground">Saved to <strong>pageThreeContent</strong> in Firestore.</p>
              </CardContent>
            </Card>
          </TabsContent>

          {/* TAB 4: Fees & Payouts */}
          <TabsContent value="fees" className="space-y-6 pt-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <CreditCard className="h-5 w-5 text-emerald-600" />
                  Delivery Fee & Stripe Payout Settings
                </CardTitle>
                <CardDescription>
                  Set the delivery fee for orders in {communityData?.name || 'this community'} and manage payout credentials.
                </CardDescription>
              </CardHeader>
              <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="delivery-fee">Community Delivery Fee (£)</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-semibold">£</span>
                    <Input
                      id="delivery-fee"
                      type="number"
                      step="0.01"
                      value={deliveryFee}
                      onChange={(e) => setDeliveryFee(e.target.value)}
                      className="pl-8"
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">Stored directly on <strong>/communities/{communityId}</strong> and applied to local courier orders.</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="stripe-account">Stripe Payout Account ID</Label>
                  <Input
                    id="stripe-account"
                    value={stripeAccountId}
                    onChange={(e) => setStripeAccountId(e.target.value)}
                    placeholder="acct_1TV6ntBixxuRl55a"
                  />
                  <p className="text-xs text-muted-foreground">Stored on <strong>/businesses</strong> for automatic payout transfers.</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* TAB 5: SEO & Search Optimization */}
          <TabsContent value="seo" className="space-y-6 pt-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Search className="h-5 w-5 text-primary" />
                  SEO & Search Optimization
                </CardTitle>
                <CardDescription>
                  Optimize how your courier business appears in search engines and social sharing cards.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="meta-title">SEO Meta Title</Label>
                  <Input
                    id="meta-title"
                    value={metaTitle}
                    onChange={(e) => setMetaTitle(e.target.value)}
                    placeholder="e.g. Show Home Community Courier Service | Fast Local Delivery"
                  />
                  <p className="text-xs text-muted-foreground">Recommended length: 50–60 characters.</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="meta-desc">SEO Meta Description</Label>
                  <Input
                    id="meta-desc"
                    value={metaDescription}
                    onChange={(e) => setMetaDescription(e.target.value)}
                    placeholder="Official local community courier providing fast, friendly, same-day delivery for local highstreet purchases."
                  />
                  <p className="text-xs text-muted-foreground">Recommended length: 120–160 characters snippet previewed on search results.</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="keywords">Search Keywords (Comma-separated)</Label>
                  <Input
                    id="keywords"
                    value={keywords}
                    onChange={(e) => setKeywords(e.target.value)}
                    placeholder="courier, delivery, local logistics, virtual highstreet"
                  />
                </div>

                {/* Live Search Result Preview */}
                <div className="p-4 rounded-lg bg-muted/40 border space-y-1">
                  <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground block mb-1">Google Search Snippet Preview</span>
                  <div className="text-blue-700 font-medium text-base hover:underline cursor-pointer truncate">
                    {metaTitle || `${businessName || 'Community Courier'} | Local Delivery`}
                  </div>
                  <div className="text-emerald-700 text-xs truncate">
                    https://www.my-community-hub.co.uk/courier/{communityId}
                  </div>
                  <p className="text-xs text-muted-foreground line-clamp-2">
                    {metaDescription || shortDescription || 'Official local community courier service providing fast, friendly, same-day delivery.'}
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Global Save Button at bottom of form */}
        <div className="sticky bottom-4 z-10 flex justify-end">
          <Button type="submit" size="lg" disabled={isSaving} className="min-w-[220px] shadow-lg">
            {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
            Save Courier Profile
          </Button>
        </div>
      </form>
    </div>
  );
}
