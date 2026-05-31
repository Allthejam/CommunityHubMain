'use client';

import * as React from 'react';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import {
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
import { updateCommunityProfileAction } from '@/lib/actions/communityProfileActions';
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

  const communityId = userProfile?.communityId;

  const communityProfileRef = useMemoFirebase(() => {
    if (!communityId || !db) return null;
    return doc(db, 'community_profiles', communityId);
  }, [communityId, db]);
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

  const [leadershipTeam, setLeadershipTeam] = React.useState<LeadershipItem[]>([]);
  const [isLeaderDialogOpen, setIsLeaderDialogOpen] = React.useState(false);
  const [currentLeaderItem, setCurrentLeaderItem] = React.useState<LeadershipItem | null>(null);

  const [usefulInfo, setUsefulInfo] = React.useState<UsefulInfoItem[]>([]);
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

  React.useEffect(() => {
    if (communityProfileData) {
      setHeadline(communityProfileData.headline || '');
      setIntroduction(communityProfileData.introduction || '');
      setPopulation(communityProfileData.population || '');
      setArea(communityProfileData.area || '');
      setYearEstablished(communityProfileData.yearEstablished || '');
      setMainContent(communityProfileData.mainContent || '');
      setMapEmbedCode(communityProfileData.mapEmbedCode || '');
      setBannerImage(communityProfileData.bannerImage || null);
      setBannerImageDescription(communityProfileData.bannerImageDescription || '');
      setImageOne(communityProfileData.imageOne || null);
      setImageOneDescription(communityProfileData.imageOneDescription || '');
      setImageTwo(communityProfileData.imageTwo || null);
      setImageTwoDescription(communityProfileData.imageTwoDescription || '');
      setMetaTitle(communityProfileData.metaTitle || '');
      setMetaDescription(communityProfileData.metaDescription || '');
      setShowLeadership(communityProfileData.showLeadershipOnAboutPage !== false);
      
      if (communityProfileData.communityInformation) {
        setLeadershipTeam(
          communityProfileData.communityInformation.map((item: any, index: number) => ({
            id: `db-leader-${index}-${Math.random()}`,
            ...item,
          }))
        );
      }

      if (communityProfileData.usefulInformation) {
        setUsefulInfo(
          communityProfileData.usefulInformation.map((item: any, index: number) => ({
            id: `db-useful-${index}-${Math.random()}`,
            ...item,
          }))
        );
      }

      if (communityProfileData.policeContact) {
        setPoliceContact(communityProfileData.policeContact);
      }
    }
  }, [communityProfileData]);

  const handleImageUpload = async (file: File, setImageCallback: (url: string | null) => void, fieldName: string) => {
    if (!user || !communityId) {
      toast({ title: 'Authentication Error', variant: 'destructive' });
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
        throw new Error(result.error);
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
      policeContact,
      showLeadershipOnAboutPage: showLeadership,
    };
    try {
      const result = await updateCommunityProfileAction({ communityId, data: aboutData });
      if (result.success) {
        toast({ title: 'Success', description: 'About page information has been saved.' });
      } else {
        throw new Error(result.error);
      }
    } catch (error: any) {
      toast({ title: 'Save Failed', description: error.message, variant: 'destructive' });
    } finally {
      setIsSaving(false);
    }
  };

  const handlePreview = () => {
    const dataToPreview = {
      headline, introduction, population, area, yearEstablished, mainContent, mapEmbedCode,
      bannerImage, bannerImageDescription, imageOne, imageOneDescription, imageTwo, imageTwoDescription,
      metaTitle, metaDescription, policeContact, usefulInformation: usefulInfo.map(({ id, ...rest }) => rest)
    };
    sessionStorage.setItem('aboutPagePreview', JSON.stringify(dataToPreview));
    window.open('/leader/about/preview', '_blank');
  };

  if (profileLoading || communityProfileLoading) {
    return (
      <div className="space-y-4 p-8">
        <Skeleton className="h-10 w-3/4" />
        <Skeleton className="h-6 w-1/2" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight font-headline flex items-center gap-2">
          <Info className="h-8 w-8" />
          About Our Community
        </h1>
        <h2 className="text-2xl font-semibold text-primary mt-4">Welcome to {userProfile?.communityName || 'Your Community'}</h2>
      </div>

      <div className="space-y-2">
        <Label>Banner Image</Label>
        <div className="relative group w-full h-64 rounded-lg overflow-hidden shadow-lg bg-muted">
          {bannerImage && <Image src={bannerImage} alt="Banner" fill className="object-cover" priority />}
          <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
            <Button
              variant="outline"
              size="sm"
              className="gap-2"
              onClick={() => bannerInputRef.current?.click()}
              disabled={!!isUploading}
            >
              {isUploading === 'bannerImage' ? <Loader2 className="animate-spin h-4 w-4" /> : <Camera />}
              {isUploading === 'bannerImage' ? 'Uploading...' : 'Edit Banner'}
            </Button>
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
        <Input
          placeholder="Banner image description (for SEO)"
          value={bannerImageDescription}
          onChange={(e) => setBannerImageDescription(e.target.value)}
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
    </div>
  );
}
