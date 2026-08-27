'use client';

import * as React from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft, FileText, ArrowRight, Upload, X, Loader2, Info, Save, Globe, LayoutDashboard } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { RichTextEditor } from '@/components/rich-text-editor';
import { useToast } from '@/hooks/use-toast';
import { useUser, useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';
import Image from 'next/image';
import Link from 'next/link';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { saveAdvertAsDraft } from '@/lib/actions/advertActions';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';

function AdvertContentPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const advertType = searchParams.get('type') || 'featured';
  const advertId = searchParams.get('id');
  const { toast } = useToast();
  const { user } = useUser();
  const db = useFirestore();

  const [headline, setHeadline] = React.useState('');
  const [shortDescription, setShortDescription] = React.useState('');
  const [fullDescription, setFullDescription] = React.useState('');
  const [primaryLinkType, setPrimaryLinkType] = React.useState<'website' | 'profile'>('website');
  const [websiteLink, setWebsiteLink] = React.useState('');
  const [emailAddress, setEmailAddress] = React.useState('');
  const [image, setImage] = React.useState<string | null>(null);
  const [isSaving, setIsSaving] = React.useState(false);
  const [isLoaded, setIsLoaded] = React.useState(false);
  const [isDirty, setIsDirty] = React.useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const advertRef = useMemoFirebase(() => (advertId ? doc(db, 'adverts', advertId) : null), [advertId, db]);
  const { data: existingAdvert, isLoading } = useDoc(advertRef);

  // Load logic: Prioritize DB if we have an ID, otherwise fall back to session
  React.useEffect(() => {
    if (advertId && isLoading) return;

    const stored = sessionStorage.getItem('advertPreviewData');
    const storedData = stored ? JSON.parse(stored) : null;

    if (existingAdvert) {
      // Use DB data
      setHeadline(existingAdvert.headline || existingAdvert.title || '');
      setShortDescription(existingAdvert.shortDescription || '');
      setFullDescription(existingAdvert.fullDescription || existingAdvert.description || '');
      setPrimaryLinkType(existingAdvert.primaryLinkType || 'website');
      setWebsiteLink(existingAdvert.websiteLink || existingAdvert.link || '');
      setEmailAddress(existingAdvert.emailAddress || existingAdvert.email || '');
      setImage(existingAdvert.image || null);
      setIsLoaded(true);
    } else if (storedData && (!advertId || storedData.id === advertId)) {
      // Use session data
      setHeadline(storedData.headline || '');
      setShortDescription(storedData.shortDescription || '');
      setFullDescription(storedData.fullDescription || '');
      setPrimaryLinkType(storedData.primaryLinkType || 'website');
      setWebsiteLink(storedData.websiteLink || '');
      setEmailAddress(storedData.emailAddress || '');
      setImage(storedData.image || null);
      setIsLoaded(true);
    } else {
      setIsLoaded(true);
    }
  }, [existingAdvert, isLoading, advertId]);

  // Persistent browser save on every change
  React.useEffect(() => {
    if (isLoaded) {
      const data = {
        id: advertId,
        type: advertType,
        headline,
        shortDescription,
        fullDescription,
        primaryLinkType,
        websiteLink,
        emailAddress,
        image,
        status: existingAdvert?.status || 'Draft',
      };
      sessionStorage.setItem('advertPreviewData', JSON.stringify(data));
    }
  }, [headline, shortDescription, fullDescription, primaryLinkType, websiteLink, emailAddress, image, advertType, advertId, isLoaded, existingAdvert]);

  // Unsaved changes warning
  React.useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isDirty) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isDirty]);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        toast({ title: "File too large", description: "Image must be under 2MB.", variant: "destructive" });
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setImage(reader.result as string);
        setIsDirty(true);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSaveDraft = async () => {
    if (!user) {
      toast({ title: "Authentication required", variant: "destructive" });
      return;
    }
    setIsSaving(true);
    try {
      const payload = {
        id: advertId || undefined,
        type: advertType,
        headline: headline.trim() || 'Untitled Draft',
        shortDescription,
        fullDescription,
        primaryLinkType,
        websiteLink,
        emailAddress,
        image,
        scope: 'national',
      };

      const res = await saveAdvertAsDraft({ userId: user.uid, advertData: payload });
      if (res.success) {
        setIsDirty(false);
        toast({ title: "Progress Saved", description: "Your campaign draft has been securely updated in the database." });
        if (res.id && !advertId) {
          router.replace(`/national/adverts/create/content?type=${advertType}&id=${res.id}`);
        }
      } else {
        toast({ title: "Save Failed", description: res.error, variant: "destructive" });
      }
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  const handleNext = () => {
    if (!headline.trim()) {
      toast({ title: "Validation Error", description: "Please enter a compelling headline for your campaign.", variant: "destructive" });
      return;
    }
    if (!shortDescription.trim()) {
      toast({ title: "Validation Error", description: "Please enter a short description.", variant: "destructive" });
      return;
    }
    if (!image) {
      toast({ title: "Validation Error", description: "Please upload an image asset for your advert.", variant: "destructive" });
      return;
    }

    setIsDirty(false);
    router.push(`/national/adverts/create/preview?type=${advertType}${advertId ? `&id=${advertId}` : ''}`);
  };

  if (!isLoaded || isLoading) {
    return <div className="flex justify-center items-center h-96"><Loader2 className="animate-spin text-primary" /></div>;
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-16">
      <div className="flex flex-col sm:flex-row justify-between sm:items-start gap-4">
        <div>
          <Button variant="ghost" asChild className="mb-4">
            <Link href="/national/adverts/create">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Change Ad Format
            </Link>
          </Button>
          <h1 className="text-3xl font-bold tracking-tight font-headline flex items-center gap-2">
            <FileText className="h-8 w-8 text-primary" />
            Ad Copy & Creative Asset (Step 2 of 4)
          </h1>
          <p className="text-muted-foreground mt-2">
            Craft the text, visual imagery, and destination links for your <span className="font-bold capitalize">{advertType} Advert</span>.
          </p>
        </div>
        <Button variant="outline" onClick={handleSaveDraft} disabled={isSaving} className="shadow-sm shrink-0">
          {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
          Save Progress
        </Button>
      </div>

      <Card className="border-2 shadow-sm">
        <CardHeader>
          <CardTitle>Creative Content</CardTitle>
          <CardDescription>All fields are formatted specifically for platform-wide high visual fidelity.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Main Headline */}
          <div className="space-y-2">
            <Label htmlFor="headline">Campaign Headline / Title *</Label>
            <Input
              id="headline"
              placeholder="e.g., Transform Your Home With Solar Energy Solutions"
              value={headline}
              onChange={(e) => {
                setHeadline(e.target.value);
                setIsDirty(true);
              }}
              maxLength={80}
            />
            <p className="text-xs text-muted-foreground text-right">{headline.length}/80 characters</p>
          </div>

          {/* Short Teaser / Card Description */}
          <div className="space-y-2">
            <Label htmlFor="shortDescription">Short Card Summary *</Label>
            <Input
              id="shortDescription"
              placeholder="e.g., Get £1,000 off standard residential installations this month across the UK."
              value={shortDescription}
              onChange={(e) => {
                setShortDescription(e.target.value);
                setIsDirty(true);
              }}
              maxLength={140}
            />
            <p className="text-xs text-muted-foreground text-right">{shortDescription.length}/140 characters</p>
          </div>

          {/* Image Asset Upload */}
          <div className="space-y-3">
            <Label>Visual Creative Asset * ({advertType === 'partner' ? 'Logo or Emblem (1:1 / 4:3)' : 'Hero Banner (16:9 Landscape)'})</Label>
            <div className="flex flex-col sm:flex-row items-start gap-4">
              <div className="relative aspect-video w-full sm:w-64 rounded-xl border-2 overflow-hidden bg-muted flex items-center justify-center">
                {image ? (
                  <Image src={image} alt="Creative Preview" fill className="object-cover" />
                ) : (
                  <div className="text-center p-4 text-xs text-muted-foreground">No image uploaded</div>
                )}
              </div>
              <div className="space-y-2">
                <Button type="button" variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}>
                  <Upload className="mr-2 h-4 w-4" />
                  {image ? 'Change Image Asset' : 'Upload Image Asset'}
                </Button>
                {image && (
                  <Button type="button" variant="ghost" size="sm" onClick={() => { setImage(null); setIsDirty(true); }} className="text-destructive">
                    Remove Image
                  </Button>
                )}
                <p className="text-xs text-muted-foreground">PNG, JPG, or WebP up to 2MB.</p>
              </div>
              <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageChange} />
            </div>
          </div>

          <Separator />

          {/* Primary Action Destination */}
          <div className="space-y-4">
            <Label className="text-base font-semibold">Primary Click Action</Label>
            <RadioGroup
              value={primaryLinkType}
              onValueChange={(val: 'website' | 'profile') => {
                setPrimaryLinkType(val);
                setIsDirty(true);
              }}
              className="grid grid-cols-1 sm:grid-cols-2 gap-4"
            >
              <div className="flex items-start space-x-3 p-4 border rounded-xl bg-card hover:bg-muted/30 cursor-pointer">
                <RadioGroupItem value="website" id="action-website" />
                <Label htmlFor="action-website" className="cursor-pointer">
                  <span className="font-bold block text-sm">Direct External Website</span>
                  <span className="text-xs text-muted-foreground">Send users directly to your landing page or web shop.</span>
                </Label>
              </div>

              <div className="flex items-start space-x-3 p-4 border rounded-xl bg-card hover:bg-muted/30 cursor-pointer">
                <RadioGroupItem value="profile" id="action-profile" />
                <Label htmlFor="action-profile" className="cursor-pointer">
                  <span className="font-bold block text-sm">Community Brand Profile</span>
                  <span className="text-xs text-muted-foreground">Open your verified hub company page with video showcase.</span>
                </Label>
              </div>
            </RadioGroup>

            {primaryLinkType === 'website' && (
              <div className="space-y-2 pt-2">
                <Label htmlFor="websiteLink">Website URL</Label>
                <Input
                  id="websiteLink"
                  placeholder="https://yourcompany.com/offer"
                  value={websiteLink}
                  onChange={(e) => {
                    setWebsiteLink(e.target.value);
                    setIsDirty(true);
                  }}
                />
              </div>
            )}

            <div className="space-y-2 pt-2">
              <Label htmlFor="emailAddress">Direct Customer Enquiries Email (Optional)</Label>
              <Input
                id="emailAddress"
                type="email"
                placeholder="contact@yourcompany.com"
                value={emailAddress}
                onChange={(e) => {
                  setEmailAddress(e.target.value);
                  setIsDirty(true);
                }}
              />
            </div>
          </div>

          <Separator />

          {/* Rich Detailed Modal Description */}
          <div className="space-y-3">
            <div>
              <Label className="text-base font-semibold">Expanded Detail Modal Copy</Label>
              <p className="text-xs text-muted-foreground">
                When users click &quot;Learn More&quot; on your advert card, this rich formatted copy will be shown inside the full-screen interactive reader.
              </p>
            </div>
            <RichTextEditor
              value={fullDescription}
              onChange={(val) => {
                setFullDescription(val);
                setIsDirty(true);
              }}
              placeholder="Include full product specifications, redemption codes, company background..."
            />
          </div>
        </CardContent>
        <CardFooter className="flex justify-between border-t p-6 bg-muted/10">
          <Button variant="ghost" asChild>
            <Link href="/national/adverts/create">Back</Link>
          </Button>
          <Button onClick={handleNext} className="shadow-lg">
            Review Preview
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}

export default function NationalAdvertContentPage() {
  return (
    <React.Suspense fallback={<div className="flex justify-center items-center h-96"><Loader2 className="animate-spin text-primary" /></div>}>
      <AdvertContentPageContent />
    </React.Suspense>
  );
}
