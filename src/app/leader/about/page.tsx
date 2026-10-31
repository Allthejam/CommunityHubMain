'use client';

import * as React from 'react';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import dynamic from 'next/dynamic';
import {
  HeartPulse,
  Info,
  Save,
  Loader2,
  Upload,
  Camera,
  X,
  Users,
  Eye,
  Pencil,
  Trash2,
  PlusCircle,
  MapPin,
  Shield,
  Phone,
} from 'lucide-react';
import { useUser, useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { RichTextEditor } from '@/components/rich-text-editor';
import { useToast } from '@/hooks/use-toast';
import { Separator } from '@/components/ui/separator';
import { doc } from 'firebase/firestore';
import { updateCommunityProfileAction, getCommunityProfileAction } from '@/lib/actions/communityProfileActions';
import { type DefibrillatorItem, DEFAULT_DEMO_DEFIBRILLATORS as defaultDemoDefibrillators } from '@/lib/types/defibrillators';
import { useRouter } from 'next/navigation';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { uploadImageAction } from '@/lib/actions/storageActions';
import { ScrollArea } from '@/components/ui/scroll-area';

type LeadershipItem = {
  id: string;
  name: string;
  title: string;
  email: string;
  phone: string;
};

type UsefulInfoItem = {
  id: string;
  name: string;
  number: string;
  address: string;
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
  defibrillators?: DefibrillatorItem[];
  communityInformation?: {
    name: string;
    title: string;
    email: string;
    phone: string;
  }[];
  policeContact?: {
    stationName: string;
    officerName: string;
    contactEmail: string;
    contactPhone: string;
  };
  showLeadershipOnAboutPage?: boolean;
};


const DefibrillatorMap = dynamic(() => import('@/components/defibrillator-map'), {
  ssr: false,
  loading: () => (
    <div className="h-64 flex items-center justify-center bg-muted rounded-xl border">
      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
    </div>
  ),
});

export default function LeaderAboutPage() {
  const { toast } = useToast();
  const { user } = useUser();
  const db = useFirestore();
  const router = useRouter();

  const userProfileRef = useMemoFirebase(
    () => (user ? doc(db, 'users', user.uid) : null),
    [user, db]
  );
  const { data: userProfile, isLoading: profileLoading } = useDoc(userProfileRef);

  const isDemo = typeof window !== 'undefined' && (sessionStorage.getItem('isDemoMode') === 'true' || window.location.pathname.startsWith('/demo'));
  const demoPrefix = isDemo ? '/demo' : '';
  const communityId = isDemo ? '9ayHMyZf4SRw2gof1AM9' : ((typeof window !== 'undefined' ? sessionStorage.getItem('visitedCommunityId') : null) || (userProfile as any)?.impersonating?.communityId || (userProfile as any)?.communityId || 'N3SarfGXPLxBI7XcsinX');

  const communityProfileRef = useMemoFirebase(() => {
    if (!communityId || !db || isDemo) return null;
    return doc(db, 'community_profiles', communityId);
  }, [communityId, db, isDemo]);
  const { data: communityProfileData, isLoading: communityProfileLoading } =
    useDoc(communityProfileRef);

  const [headline, setHeadline] = React.useState('');
  const [introduction, setIntroduction] = React.useState('');
  const [population, setPopulation] = React.useState('');
  const [area, setArea] = React.useState('');
  const [yearEstablished, setYearEstablished] = React.useState('');
  const [mainContent, setMainContent] = React.useState('');
  const [mapEmbedCode, setMapEmbedCode] = React.useState('');
  const [isSaving, setIsSaving] = React.useState(false);
  const [isLoadingInitial, setIsLoadingInitial] = React.useState(true);

  const [leadershipTeam, setLeadershipTeam] = React.useState<LeadershipItem[]>([]);
  const [isLeaderDialogOpen, setIsLeaderDialogOpen] = React.useState(false);
  const [currentLeaderItem, setCurrentLeaderItem] = React.useState<LeadershipItem | null>(null);

  const [usefulInfo, setUsefulInfo] = React.useState<UsefulInfoItem[]>([]);
  const [defibrillators, setDefibrillators] = React.useState<DefibrillatorItem[]>([]);
  const [isDefibDialogOpen, setIsDefibDialogOpen] = React.useState(false);
  const [currentDefib, setCurrentDefib] = React.useState<DefibrillatorItem | null>(null);
  const [isUsefulInfoDialogOpen, setIsUsefulInfoDialogOpen] = React.useState(false);
  const [currentUsefulItem, setCurrentUsefulItem] = React.useState<UsefulInfoItem | null>(null);

  const [policeContact, setPoliceContact] = React.useState({
    stationName: '',
    officerName: '',
    contactEmail: '',
    contactPhone: '',
  });

  const [bannerImage, setBannerImage] = React.useState<string | null>(null);
  const [bannerImageDescription, setBannerImageDescription] = React.useState('');
  const [imageOne, setImageOne] = React.useState<string | null>(null);
  const [imageOneDescription, setImageOneDescription] = React.useState('');
  const [imageTwo, setImageTwo] = React.useState<string | null>(null);
  const [imageTwoDescription, setImageTwoDescription] = React.useState('');

  const [isUploading, setIsUploading] = React.useState<string | null>(null);

  const [metaTitle, setMetaTitle] = React.useState('');
  const [metaDescription, setMetaDescription] = React.useState('');

  const [showLeadership, setShowLeadership] = React.useState(true);

  const bannerInputRef = React.useRef<HTMLInputElement>(null);
  const imageOneInputRef = React.useRef<HTMLInputElement>(null);
  const imageTwoInputRef = React.useRef<HTMLInputElement>(null);

  const populateFields = React.useCallback((data: CommunityProfileData) => {
    if (!data) return;
    setHeadline(data.headline || '');
    setIntroduction(data.introduction || '');
    setPopulation(data.population || '');
    setArea(data.area || '');
    setYearEstablished(data.yearEstablished || '');
    setMainContent(data.mainContent || '');
    setMapEmbedCode(data.mapEmbedCode || '');
    setBannerImage(data.bannerImage || null);
    setBannerImageDescription(data.bannerImageDescription || '');
    setImageOne(data.imageOne || null);
    setImageOneDescription(data.imageOneDescription || '');
    setImageTwo(data.imageTwo || null);
    setImageTwoDescription(data.imageTwoDescription || '');
    setMetaTitle(data.metaTitle || '');
    setMetaDescription(data.metaDescription || '');
    setShowLeadership(data.showLeadershipOnAboutPage !== false);
    
    if (data.communityInformation && Array.isArray(data.communityInformation)) {
      setLeadershipTeam(
        data.communityInformation.map((item: any, index: number) => ({
          id: item.id || `db-leader-${index}-${Math.random()}`,
          name: item.name || '',
          title: item.title || '',
          email: item.email || '',
          phone: item.phone || '',
        }))
      );
    }

    if (data.defibrillators && Array.isArray(data.defibrillators)) {
      setDefibrillators(data.defibrillators);
    } else if (isDemo) {
      setDefibrillators(defaultDemoDefibrillators);
    }

    if (data.usefulInformation && Array.isArray(data.usefulInformation)) {
      setUsefulInfo(
        data.usefulInformation.map((item: any, index: number) => ({
          id: item.id || `db-useful-${index}-${Math.random()}`,
          name: item.name || '',
          number: item.number || '',
          address: item.address || '',
        }))
      );
    }

    if (data.policeContact) {
      setPoliceContact({
        stationName: data.policeContact.stationName || '',
        officerName: data.policeContact.officerName || '',
        contactEmail: data.policeContact.contactEmail || '',
        contactPhone: data.policeContact.contactPhone || '',
      });
    }
  }, []);

  React.useEffect(() => {
    if (communityProfileData) {
      populateFields(communityProfileData);
    }
  }, [communityProfileData, populateFields]);

  React.useEffect(() => {
    if (!communityId) return;

    let isMounted = true;
    setIsLoadingInitial(true);

    // 1. Check local / session storage first
    if (typeof window !== 'undefined') {
      const cached = sessionStorage.getItem(`demo_about_${communityId}`) || localStorage.getItem(`demo_about_${communityId}`);
      if (cached) {
        try {
          populateFields(JSON.parse(cached));
        } catch (e) {}
      }
    }

    // 2. Fetch from server action
    getCommunityProfileAction(communityId).then((res) => {
      if (!isMounted) return;
      if (res.success && res.data) {
        populateFields(res.data);
      } else if (isDemo && !sessionStorage.getItem(`demo_about_${communityId}`) && !localStorage.getItem(`demo_about_${communityId}`)) {
        // Fallback default for demo if none exists yet
        populateFields({
          headline: "About Oakridge & DemoVille",
          introduction: "Welcome to Oakridge & DemoVille — our model demonstration community showcasing the future of connected towns and local business support.",
          population: "14,850",
          area: "18.4 sq km",
          yearEstablished: "1842",
          mainContent: "<p>Oakridge & DemoVille combines historic market town charm with modern digital civic infrastructure. Our community hub provides real-time emergency coordination, a thriving virtual high street, active community discussions, and comprehensive visitor guides.</p>",
          usefulInformation: [
            { name: "Town Council Hall", number: "01632 960001", address: "1 High Street, Oakridge, DE1 4MO" },
            { name: "Community Medical Centre", number: "01632 960002", address: "Oakridge Health Park, Station Road" },
            { name: "Tourist Information & Heritage", number: "01632 960003", address: "Market Place, Oakridge" }
          ],
          communityInformation: [
            { name: "Fiona Macleod", title: "Community Council President & Hub Leader", email: "leader@oakridge-community.co.uk", phone: "07700 900123" }
          ],
          policeContact: {
            stationName: "Oakridge Neighbourhood Police Station",
            officerName: "Inspector Dave Campbell",
            contactEmail: "neighbourhood@demo-police.pnn.police.uk",
            contactPhone: "101 (Non-Emergency) / 999 (Emergency)"
          },
          showLeadershipOnAboutPage: true,
        });
      }
      setIsLoadingInitial(false);
    }).catch(() => {
      if (isMounted) setIsLoadingInitial(false);
    });

    return () => {
      isMounted = false;
    };
  }, [communityId, isDemo, populateFields]);

  const handleImageUpload = async (file: File, setImageCallback: (url: string | null) => void, fieldName: string) => {
    if (!communityId) {
      toast({ title: 'Error', description: 'No community selected', variant: 'destructive' });
      return;
    }
    setIsUploading(fieldName);
    try {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      const base64Data = await new Promise<string>((resolve, reject) => {
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = (error) => reject(error);
      });
      const path = `community_assets/${communityId}/${fieldName}_${Date.now()}`;
      const result = await uploadImageAction({ base64Data, path });
      if (result.success && result.url) {
        setImageCallback(result.url);
        toast({ title: 'Image Uploaded' });
      } else {
        // In local/demo mode if GCS upload fails, fallback to base64
        setImageCallback(base64Data);
        toast({ title: 'Image Added' });
      }
    } catch (error: any) {
      toast({ title: 'Upload Failed', description: error.message, variant: 'destructive' });
    } finally {
      setIsUploading(null);
    }
  };

  const handleSave = async () => {
    if (!communityId) return;
    setIsSaving(true);
    const aboutData: CommunityProfileData = {
      headline,
      introduction,
      population,
      area,
      yearEstablished,
      mainContent,
      mapEmbedCode,
      bannerImage,
      bannerImageDescription,
      imageOne,
      imageOneDescription,
      imageTwo,
      imageTwoDescription,
      metaTitle,
      metaDescription,
      communityInformation: leadershipTeam.map(({ id, ...rest }) => rest),
      usefulInformation: usefulInfo.map(({ id, ...rest }) => rest),
      defibrillators,
      policeContact,
      showLeadershipOnAboutPage: showLeadership,
    };

    // Save to local / session storage for immediate demo reactivity
    if (typeof window !== 'undefined') {
      sessionStorage.setItem(`demo_about_${communityId}`, JSON.stringify(aboutData));
      localStorage.setItem(`demo_about_${communityId}`, JSON.stringify(aboutData));
      window.dispatchEvent(new CustomEvent('demo_about_updated', { detail: aboutData }));
    }

    try {
      const result = await updateCommunityProfileAction({ communityId, data: aboutData });
      if (result.success) {
        toast({ title: 'Success', description: 'About page information has been saved.' });
      } else {
        throw new Error(result.error);
      }
    } catch (error: any) {
      // In demo mode, if server action threw an error but local storage was updated, we still notify
      if (isDemo) {
        toast({ title: 'Saved for Session', description: 'About page information has been saved for your demo session.' });
      } else {
        toast({ title: 'Save Failed', description: error.message, variant: 'destructive' });
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handlePreview = () => {
    const dataToPreview = {
      headline, introduction, population, area, yearEstablished, mainContent, mapEmbedCode,
      bannerImage, bannerImageDescription, imageOne, imageOneDescription, imageTwo, imageTwoDescription,
      metaTitle, metaDescription, policeContact, usefulInformation: usefulInfo.map(({ id, ...rest }) => rest),
      communityInformation: leadershipTeam.map(({ id, ...rest }) => rest),
      showLeadershipOnAboutPage: showLeadership,
      defibrillators,
    };
    sessionStorage.setItem('aboutPagePreview', JSON.stringify(dataToPreview));
    window.open(`${demoPrefix}/community/${communityId}/about`, '_blank');
  };

  if ((profileLoading && !isDemo) || (isLoadingInitial && !headline)) {
    return (
      <div className="space-y-4 p-8">
        <Skeleton className="h-10 w-3/4" />
        <Skeleton className="h-6 w-1/2" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  const displayName = isDemo ? "Oakridge & DemoVille" : (userProfile?.communityName || 'Your Community');

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight font-headline flex items-center gap-2">
          <Info className="h-8 w-8" />
          About Our Community
        </h1>
        <h2 className="text-2xl font-semibold text-primary mt-4">Welcome to {displayName}</h2>
      </div>

      <div className="space-y-2">
        <Label>Banner Image (Recommended ~600px wide × 200px high)</Label>
        <div className="flex flex-col items-center">
          <div className="relative group w-full max-w-[600px] h-[200px] rounded-xl overflow-hidden shadow-md bg-muted border">
            {bannerImage ? (
              <Image src={bannerImage} alt="Banner" fill className="object-cover object-center" priority />
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-muted-foreground gap-2">
                <Camera className="h-8 w-8" />
                <span className="text-xs">No banner image uploaded (600 × 200)</span>
              </div>
            )}
            <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity gap-2">
              <Button
                variant="secondary"
                size="sm"
                className="gap-2"
                onClick={() => bannerInputRef.current?.click()}
                disabled={!!isUploading}
              >
                {isUploading === 'bannerImage' ? <Loader2 className="animate-spin h-4 w-4" /> : <Camera className="h-4 w-4" />}
                {isUploading === 'bannerImage' ? 'Uploading...' : (bannerImage ? 'Change Banner' : 'Upload Banner')}
              </Button>
              {bannerImage && (
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => setBannerImage(null)}
                  disabled={!!isUploading}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
              <input
                type="file"
                ref={bannerInputRef}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleImageUpload(file, setBannerImage, 'bannerImage');
                }}
                className="hidden"
                accept="image/*"
              />
            </div>
          </div>
        </div>
        <Input
          placeholder="Banner image description (for SEO)"
          value={bannerImageDescription}
          onChange={(e) => setBannerImageDescription(e.target.value)}
          className="max-w-[600px] mx-auto"
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Core Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="headline">Welcome Headline</Label>
            <Input id="headline" placeholder="e.g. A vibrant place to live and work" value={headline} onChange={(e) => setHeadline(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="introduction">Introduction</Label>
            <RichTextEditor value={introduction} onChange={setIntroduction} />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="population">Population</Label>
              <Input id="population" placeholder="e.g. 5,000" value={population} onChange={(e) => setPopulation(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="area">Area</Label>
              <Input id="area" placeholder="e.g. 12 sq miles" value={area} onChange={(e) => setArea(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="year-established">Year Established</Label>
              <Input id="year-established" placeholder="e.g. 1892" value={yearEstablished} onChange={(e) => setYearEstablished(e.target.value)} />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="main-content">Main Page Content</Label>
            <RichTextEditor value={mainContent} onChange={setMainContent} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Camera className="h-5 w-5" /> Additional Community Images</CardTitle>
          <CardDescription>Upload up to 2 showcase photos (Recommended ~600px wide × 200px high).</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid md:grid-cols-2 gap-6">
            {/* Image One */}
            <div className="space-y-2 flex flex-col items-center">
              <Label className="self-start">Feature Photo 1</Label>
              <div className="relative group w-full max-w-[600px] h-[200px] rounded-xl overflow-hidden shadow-md bg-muted border">
                {imageOne ? (
                  <Image src={imageOne} alt="Photo 1" fill className="object-cover object-center" />
                ) : (
                  <div className="flex flex-col items-center justify-center h-full text-muted-foreground gap-2">
                    <Camera className="h-8 w-8" />
                    <span className="text-xs">No image uploaded (600 × 200)</span>
                  </div>
                )}
                <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity gap-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    className="gap-2"
                    onClick={() => imageOneInputRef.current?.click()}
                    disabled={!!isUploading}
                  >
                    {isUploading === 'imageOne' ? <Loader2 className="animate-spin h-4 w-4" /> : <Camera className="h-4 w-4" />}
                    {isUploading === 'imageOne' ? 'Uploading...' : (imageOne ? 'Change Photo' : 'Upload Photo')}
                  </Button>
                  {imageOne && (
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => setImageOne(null)}
                      disabled={!!isUploading}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                  <input
                    type="file"
                    ref={imageOneInputRef}
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleImageUpload(file, setImageOne, 'imageOne');
                    }}
                    className="hidden"
                    accept="image/*"
                  />
                </div>
              </div>
              <Input
                placeholder="Description for Photo 1"
                value={imageOneDescription}
                onChange={(e) => setImageOneDescription(e.target.value)}
                className="w-full text-xs"
              />
            </div>

            {/* Image Two */}
            <div className="space-y-2 flex flex-col items-center">
              <Label className="self-start">Feature Photo 2</Label>
              <div className="relative group w-full max-w-[600px] h-[200px] rounded-xl overflow-hidden shadow-md bg-muted border">
                {imageTwo ? (
                  <Image src={imageTwo} alt="Photo 2" fill className="object-cover object-center" />
                ) : (
                  <div className="flex flex-col items-center justify-center h-full text-muted-foreground gap-2">
                    <Camera className="h-8 w-8" />
                    <span className="text-xs">No image uploaded (600 × 200)</span>
                  </div>
                )}
                <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity gap-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    className="gap-2"
                    onClick={() => imageTwoInputRef.current?.click()}
                    disabled={!!isUploading}
                  >
                    {isUploading === 'imageTwo' ? <Loader2 className="animate-spin h-4 w-4" /> : <Camera className="h-4 w-4" />}
                    {isUploading === 'imageTwo' ? 'Uploading...' : (imageTwo ? 'Change Photo' : 'Upload Photo')}
                  </Button>
                  {imageTwo && (
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => setImageTwo(null)}
                      disabled={!!isUploading}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                  <input
                    type="file"
                    ref={imageTwoInputRef}
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleImageUpload(file, setImageTwo, 'imageTwo');
                    }}
                    className="hidden"
                    accept="image/*"
                  />
                </div>
              </div>
              <Input
                placeholder="Description for Photo 2"
                value={imageTwoDescription}
                onChange={(e) => setImageTwoDescription(e.target.value)}
                className="w-full text-xs"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><MapPin className="h-5 w-5" /> Location Map</CardTitle>
          <CardDescription>Paste a Google Maps embed code to show your community location.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="map-embed">Google Maps Embed HTML</Label>
            <Textarea
              id="map-embed"
              placeholder='<iframe src="..." ...></iframe>'
              value={mapEmbedCode}
              onChange={(e) => setMapEmbedCode(e.target.value)}
              className="font-mono text-xs h-32"
            />
          </div>
          {mapEmbedCode && (
            <div className="aspect-video w-full rounded-md border bg-muted overflow-hidden">
               <div className="w-full h-full" dangerouslySetInnerHTML={{ __html: mapEmbedCode }} />
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Shield className="h-5 w-5" /> Police / Emergency Contact</CardTitle>
          <CardDescription>Direct contact for local law enforcement or community safety.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="station-name">Station Name</Label>
              <Input
                id="station-name"
                value={policeContact.stationName}
                onChange={e => setPoliceContact(prev => ({ ...prev, stationName: e.target.value }))}
                placeholder="e.g. Anytown Central Station"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="officer-name">Lead Officer (Optional)</Label>
              <Input
                id="officer-name"
                value={policeContact.officerName}
                onChange={e => setPoliceContact(prev => ({ ...prev, officerName: e.target.value }))}
                placeholder="e.g. Sgt. Jane Doe"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="police-email">Contact Email</Label>
              <Input
                id="police-email"
                type="email"
                value={policeContact.contactEmail}
                onChange={e => setPoliceContact(prev => ({ ...prev, contactEmail: e.target.value }))}
                placeholder="police@anytown.uk"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="police-phone">Contact Number</Label>
              <Input
                id="police-phone"
                value={policeContact.contactPhone}
                onChange={e => setPoliceContact(prev => ({ ...prev, contactPhone: e.target.value }))}
                placeholder="e.g. 101 or 01234 567890"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Phone className="h-5 w-5" /> Useful Local Information</CardTitle>
          <CardDescription>Emergency numbers, hospitals, dentists, and other essential services.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
             {usefulInfo.map((info) => (
                <div key={info.id} className="flex items-center justify-between p-3 border rounded-md bg-muted/30">
                  <div>
                    <p className="font-semibold">{info.name}</p>
                    <p className="text-xs text-muted-foreground">{info.number} | {info.address}</p>
                  </div>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => {
                        setCurrentUsefulItem(info);
                        setIsUsefulInfoDialogOpen(true);
                      }}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive hover:text-destructive"
                      onClick={() => setUsefulInfo(prev => prev.filter(i => i.id !== info.id))}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
              <Button
                variant="outline"
                className="w-full"
                onClick={() => {
                  setCurrentUsefulItem({ id: `new-useful-${Date.now()}`, name: '', number: '', address: '' });
                  setIsUsefulInfoDialogOpen(true);
                }}
              >
                <PlusCircle className="mr-2 h-4 w-4" /> Add Local Resource
              </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="border-t-4 border-t-red-600 shadow-sm">
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <CardTitle className="flex items-center gap-2 text-xl font-bold tracking-tight">
                <HeartPulse className="h-5 w-5 text-red-600" />
                Emergency Defibrillators (AED Locations)
              </CardTitle>
              <CardDescription className="text-xs sm:text-sm mt-1">
                Life-saving Automated External Defibrillators (AEDs) available in the community.
              </CardDescription>
            </div>
            <Button
              type="button"
              onClick={() => {
                setCurrentDefib({
                  id: `new-defib-${Date.now()}`,
                  name: '',
                  address: '',
                  locationNotes: '',
                  accessType: '24_7',
                  cabinetType: 'locked_keypad',
                  cabinetCodeInstructions: 'Call 999 for ambulance keypad code',
                  what3words: '',
                  lat: 57.3308,
                  lng: -3.6120,
                  custodianContact: '',
                });
                setIsDefibDialogOpen(true);
              }}
              size="sm"
              className="bg-red-600 hover:bg-red-700 text-white font-semibold gap-1.5 shrink-0 shadow-xs"
            >
              <PlusCircle className="h-4 w-4" /> Add Defibrillator
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {defibrillators.length === 0 ? (
            <div className="text-center py-8 border border-dashed rounded-xl bg-muted/20">
              <HeartPulse className="h-8 w-8 text-muted-foreground/60 mx-auto mb-2" />
              <p className="text-sm font-medium text-muted-foreground">No defibrillators registered yet.</p>
              <p className="text-xs text-muted-foreground/80 mt-1">Click "Add Defibrillator" to register public AEDs in your town.</p>
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {defibrillators.map((defib) => (
                <div key={defib.id} className="p-3.5 border rounded-xl bg-card hover:bg-muted/30 transition-colors flex flex-col justify-between space-y-3">
                  <div className="space-y-1.5">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {defib.accessType === '24_7' ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
                            ● 24/7 Public Access
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300">
                            ● Restricted Hours
                          </span>
                        )}
                        {defib.lat && defib.lng ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-sky-100 text-sky-800 dark:bg-sky-950/60 dark:text-sky-300">
                            📍 Pin Placed
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                            Address Only
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => {
                            setCurrentDefib(defib);
                            setIsDefibDialogOpen(true);
                          }}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-destructive hover:text-destructive"
                          onClick={() => setDefibrillators(prev => prev.filter(d => d.id !== defib.id))}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                    <p className="font-bold text-sm leading-tight text-foreground">{defib.name}</p>
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <MapPin className="h-3 w-3 shrink-0 text-red-600" />
                      <span className="truncate">{defib.address}</span>
                    </p>
                    {defib.locationNotes && (
                      <p className="text-xs text-muted-foreground italic line-clamp-2">
                        &quot;{defib.locationNotes}&quot;
                      </p>
                    )}
                    {defib.what3words && (
                      <p className="text-[11px] font-mono font-medium text-red-600 dark:text-red-400">
                        {defib.what3words}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle className="flex items-center gap-2"><Users className="h-5 w-5" /> Leadership Team</CardTitle>
            <div className="flex items-center gap-2">
              <Label htmlFor="show-leadership" className="text-sm font-medium">Show on Page</Label>
              <Switch id="show-leadership" checked={showLeadership} onCheckedChange={setShowLeadership} />
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            {leadershipTeam.map((item) => (
              <div key={item.id} className="flex items-center justify-between p-3 border rounded-md bg-muted/50">
                <div>
                  <p className="font-semibold">{item.name} - <span className="text-sm font-normal text-muted-foreground">{item.title}</span></p>
                </div>
                <div className="flex gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => {
                      setCurrentLeaderItem(item);
                      setIsLeaderDialogOpen(true);
                    }}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-destructive hover:text-destructive"
                    onClick={() => setLeadershipTeam(prev => prev.filter(l => l.id !== item.id))}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
            <Button
              variant="outline"
              onClick={() => {
                setCurrentLeaderItem({ id: `new-${Date.now()}`, name: '', title: '', email: '', phone: '' });
                setIsLeaderDialogOpen(true);
              }}
            >
              <PlusCircle className="mr-2 h-4 w-4" /> Add Team Member
            </Button>
          </div>
        </CardContent>
        <CardFooter className="gap-2 border-t pt-6">
          <Button disabled={isSaving || !!isUploading} onClick={handleSave}>
            {isSaving || !!isUploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
            Save All Changes
          </Button>
          <Button variant="outline" onClick={handlePreview}><Eye className="mr-2 h-4 w-4" /> Preview About Page</Button>
        </CardFooter>
      </Card>

      {/* Dialogs */}
      <Dialog open={isLeaderDialogOpen} onOpenChange={setIsLeaderDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{currentLeaderItem?.id.startsWith('new') ? 'Add' : 'Edit'} Team Member</DialogTitle>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <div className="space-y-2">
              <Label>Name</Label>
              <Input
                value={currentLeaderItem?.name || ''}
                onChange={e => setCurrentLeaderItem(p => p ? { ...p, name: e.target.value } : null)}
              />
            </div>
            <div className="space-y-2">
              <Label>Title (e.g. Secretary, Treasurer)</Label>
              <Input
                value={currentLeaderItem?.title || ''}
                onChange={e => setCurrentLeaderItem(p => p ? { ...p, title: e.target.value } : null)}
              />
            </div>
            <div className="space-y-2">
              <Label>Email (Optional)</Label>
              <Input
                type="email"
                value={currentLeaderItem?.email || ''}
                onChange={e => setCurrentLeaderItem(p => p ? { ...p, email: e.target.value } : null)}
              />
            </div>
            <div className="space-y-2">
              <Label>Phone (Optional)</Label>
              <Input
                value={currentLeaderItem?.phone || ''}
                onChange={e => setCurrentLeaderItem(p => p ? { ...p, phone: e.target.value } : null)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button onClick={() => {
              if (currentLeaderItem) {
                setLeadershipTeam(prev => {
                  const idx = prev.findIndex(l => l.id === currentLeaderItem.id);
                  if (idx > -1) {
                    const n = [...prev];
                    n[idx] = currentLeaderItem;
                    return n;
                  }
                  return [...prev, currentLeaderItem];
                });
                setIsLeaderDialogOpen(false);
              }
            }}>
              Confirm
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isUsefulInfoDialogOpen} onOpenChange={setIsUsefulInfoDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{currentUsefulItem?.id.startsWith('new') ? 'Add' : 'Edit'} Local Resource</DialogTitle>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <div className="space-y-2">
              <Label>Resource Name (e.g. St. Judes Hospital)</Label>
              <Input
                value={currentUsefulItem?.name || ''}
                onChange={e => setCurrentUsefulItem(p => p ? { ...p, name: e.target.value } : null)}
              />
            </div>
            <div className="space-y-2">
              <Label>Contact Number</Label>
              <Input
                value={currentUsefulItem?.number || ''}
                onChange={e => setCurrentUsefulItem(p => p ? { ...p, number: e.target.value } : null)}
              />
            </div>
             <div className="space-y-2">
              <Label>Address</Label>
              <Input
                value={currentUsefulItem?.address || ''}
                onChange={e => setCurrentUsefulItem(p => p ? { ...p, address: e.target.value } : null)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button onClick={() => {
              if (currentUsefulItem) {
                setUsefulInfo(prev => {
                  const idx = prev.findIndex(l => l.id === currentUsefulItem.id);
                  if (idx > -1) {
                    const n = [...prev];
                    n[idx] = currentUsefulItem;
                    return n;
                  }
                  return [...prev, currentUsefulItem];
                });
                setIsUsefulInfoDialogOpen(false);
              }
            }}>
              Confirm
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isDefibDialogOpen} onOpenChange={setIsDefibDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col p-0">
          <DialogHeader className="p-6 pb-2">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-full bg-red-100 dark:bg-red-950/60 text-red-600">
                <HeartPulse className="h-5 w-5" />
              </div>
              <div>
                <DialogTitle className="text-xl">
                  {currentDefib?.id?.startsWith('new') ? 'Register Public Defibrillator (AED)' : 'Edit Defibrillator (AED)'}
                </DialogTitle>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Provide accurate details and pin the exact location to guide first responders and citizens in an emergency.
                </p>
              </div>
            </div>
          </DialogHeader>

          <ScrollArea className="flex-1 px-6 py-2 overflow-y-auto">
            <div className="space-y-4 py-2">
              {/* AED Name */}
              <div className="space-y-1.5">
                <Label htmlFor="defib-name" className="text-xs font-semibold">
                  Location / Landmark Name <span className="text-red-600">*</span>
                </Label>
                <Input
                  id="defib-name"
                  placeholder="e.g. The Square - Heritage Red Telephone Kiosk"
                  value={currentDefib?.name || ''}
                  onChange={e => setCurrentDefib(p => p ? { ...p, name: e.target.value } : null)}
                />
              </div>

              {/* Physical Address */}
              <div className="space-y-1.5">
                <Label htmlFor="defib-address" className="text-xs font-semibold">
                  Physical Address / Postcode <span className="text-red-600">*</span>
                </Label>
                <Input
                  id="defib-address"
                  placeholder="e.g. The Square, High Street, Grantown-on-Spey PH26 3HG"
                  value={currentDefib?.address || ''}
                  onChange={e => setCurrentDefib(p => p ? { ...p, address: e.target.value } : null)}
                />
              </div>

              {/* Exact Location Notes */}
              <div className="space-y-1.5">
                <Label htmlFor="defib-notes" className="text-xs font-semibold">
                  Exact Position & Mounting Notes
                </Label>
                <Input
                  id="defib-notes"
                  placeholder="e.g. Mounted on exterior brick wall to the left of main entrance door"
                  value={currentDefib?.locationNotes || ''}
                  onChange={e => setCurrentDefib(p => p ? { ...p, locationNotes: e.target.value } : null)}
                />
                <p className="text-[11px] text-muted-foreground">
                  Give visual clues to help someone find it rapidly in the dark or under panic.
                </p>
              </div>

              {/* Access Hours: 24/7 Switch */}
              <div className="p-3 border rounded-xl bg-muted/20 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="defib-access" className="text-xs font-semibold block">
                      24/7 Unrestricted Public Access
                    </Label>
                    <span className="text-[11px] text-muted-foreground">
                      Can the public reach this device at all hours, every day?
                    </span>
                  </div>
                  <Switch
                    id="defib-access"
                    checked={currentDefib?.accessType === '24_7'}
                    onCheckedChange={(checked) => {
                      setCurrentDefib(p => p ? {
                        ...p,
                        accessType: checked ? '24_7' : 'restricted',
                        accessHours: checked ? '' : (p.accessHours || 'Mon - Fri 09:00 - 17:00')
                      } : null);
                    }}
                  />
                </div>

                {currentDefib?.accessType === 'restricted' && (
                  <div className="space-y-1.5 pt-2 border-t">
                    <Label htmlFor="defib-hours" className="text-xs font-semibold text-amber-700 dark:text-amber-400">
                      Restricted Opening / Access Hours
                    </Label>
                    <Input
                      id="defib-hours"
                      placeholder="e.g. Mon - Fri 08:00 - 21:00, Sat - Sun 09:00 - 17:00"
                      value={currentDefib?.accessHours || ''}
                      onChange={e => setCurrentDefib(p => p ? { ...p, accessHours: e.target.value } : null)}
                    />
                  </div>
                )}
              </div>

              {/* Cabinet Security & Keypad Instructions */}
              <div className="p-3 border rounded-xl bg-muted/20 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="defib-cabinet" className="text-xs font-semibold block">
                      Locked Keypad Cabinet
                    </Label>
                    <span className="text-[11px] text-muted-foreground">
                      Is the cabinet locked with a digital keypad?
                    </span>
                  </div>
                  <Switch
                    id="defib-cabinet"
                    checked={currentDefib?.cabinetType !== 'unlocked'}
                    onCheckedChange={(checked) => {
                      setCurrentDefib(p => p ? {
                        ...p,
                        cabinetType: checked ? 'locked_keypad' : 'unlocked',
                        cabinetCodeInstructions: checked ? (p.cabinetCodeInstructions || 'Call 999 for ambulance keypad code') : 'Unlocked cabinet / Pull handle firmly'
                      } : null);
                    }}
                  />
                </div>

                <div className="space-y-1.5 pt-2 border-t">
                  <Label htmlFor="defib-instructions" className="text-xs font-semibold">
                    Cabinet Access Instructions
                  </Label>
                  <Input
                    id="defib-instructions"
                    placeholder="e.g. Call 999 for ambulance keypad code"
                    value={currentDefib?.cabinetCodeInstructions || ''}
                    onChange={e => setCurrentDefib(p => p ? { ...p, cabinetCodeInstructions: e.target.value } : null)}
                  />
                </div>
              </div>

              {/* What3Words & Custodian */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="defib-w3w" className="text-xs font-semibold">
                    what3words Address (Optional)
                  </Label>
                  <Input
                    id="defib-w3w"
                    placeholder="e.g. ///reminds.stages.bounty"
                    value={currentDefib?.what3words || ''}
                    onChange={e => setCurrentDefib(p => p ? { ...p, what3words: e.target.value } : null)}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="defib-custodian" className="text-xs font-semibold">
                    Custodian / Contact (Optional)
                  </Label>
                  <Input
                    id="defib-custodian"
                    placeholder="e.g. Community Council / NHS Trust"
                    value={currentDefib?.custodianContact || ''}
                    onChange={e => setCurrentDefib(p => p ? { ...p, custodianContact: e.target.value } : null)}
                  />
                </div>
              </div>

              {/* Interactive Pin-Drop Leaflet Map */}
              <div className="space-y-2 pt-2 border-t">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-semibold flex items-center gap-1.5">
                    <MapPin className="h-4 w-4 text-red-600" /> Drop Exact GPS Pin on Map
                  </Label>
                  {currentDefib?.lat && currentDefib?.lng && (
                    <span className="text-[11px] font-mono text-muted-foreground bg-muted px-2 py-0.5 rounded">
                      {currentDefib.lat.toFixed(5)}, {currentDefib.lng.toFixed(5)}
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-muted-foreground">
                  Use the search box on the map or click/drag the red heart pin to pinpoint the exact physical location.
                </p>

                <DefibrillatorMap
                  mode="picker"
                  initialLat={currentDefib?.lat || 57.3308}
                  initialLng={currentDefib?.lng || -3.6120}
                  onLocationSelect={(lat, lng) => {
                    setCurrentDefib(p => p ? { ...p, lat, lng } : null);
                  }}
                  height="260px"
                />
              </div>
            </div>
          </ScrollArea>

          <DialogFooter className="p-4 border-t bg-muted/10 gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsDefibDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              className="bg-red-600 hover:bg-red-700 text-white font-semibold gap-1.5"
              onClick={() => {
                if (!currentDefib) return;
                if (!currentDefib.name?.trim() || !currentDefib.address?.trim()) {
                  toast({
                    title: 'Missing Required Fields',
                    description: 'Please enter both an AED Location Name and Address.',
                    variant: 'destructive',
                  });
                  return;
                }
                setDefibrillators(prev => {
                  const idx = prev.findIndex(d => d.id === currentDefib.id);
                  if (idx > -1) {
                    const next = [...prev];
                    next[idx] = currentDefib;
                    return next;
                  }
                  return [...prev, currentDefib];
                });
                setIsDefibDialogOpen(false);
                toast({
                  title: 'Defibrillator Added',
                  description: `${currentDefib.name} has been added. Click 'Save All Changes' to persist.`,
                });
              }}
            >
              <HeartPulse className="h-4 w-4" /> Save Defibrillator
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
