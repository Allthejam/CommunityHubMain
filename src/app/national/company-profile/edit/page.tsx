'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { 
  Building2, 
  Globe, 
  Mail, 
  ArrowLeft, 
  Save, 
  Loader2, 
  Upload, 
  X, 
  Image as ImageIcon,
  Sparkles,
  Youtube,
  Music,
  Facebook,
  Linkedin,
  Instagram,
  Plus,
  Trash2,
  Users
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RichTextEditor } from '@/components/rich-text-editor';
import { useUser, useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { saveNationalAdvertiserProfile } from '@/lib/actions/businessActions';
import Image from 'next/image';
import { Separator } from '@/components/ui/separator';
import Link from 'next/link';

export default function NationalProfileEditPage() {
  const router = useRouter();
  const { user } = useUser();
  const db = useFirestore();
  const { toast } = useToast();

  const userProfileRef = useMemoFirebase(() => (user ? doc(db, 'users', user.uid) : null), [user, db]);
  const { data: profile, isLoading } = useDoc(userProfileRef);

  const [companyName, setCompanyName] = React.useState('');
  const [website, setWebsite] = React.useState('');
  const [contactEmail, setContactEmail] = React.useState('');
  const [shortDescription, setShortDescription] = React.useState('');
  const [longDescription, setLongDescription] = React.useState('');
  const [videoUrl, setVideoUrl] = React.useState('');
  const [audioUrl, setAudioUrl] = React.useState('');
  const [logoUrl, setLogoUrl] = React.useState<string | null>(null);
  const [bannerUrl, setBannerUrl] = React.useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  // Social Links
  const [facebook, setFacebook] = React.useState('');
  const [x, setX] = React.useState('');
  const [instagram, setInstagram] = React.useState('');
  const [linkedin, setLinkedin] = React.useState('');
  const [youtube, setYoutube] = React.useState('');

  // Additional Contacts
  const [additionalContacts, setAdditionalContacts] = React.useState<{ name: string; phone: string; role: string }[]>([]);

  const logoInputRef = React.useRef<HTMLInputElement>(null);
  const bannerInputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    if (profile?.companyProfile) {
      const cp = profile.companyProfile;
      setCompanyName(cp.companyName || '');
      setWebsite(cp.website || '');
      setContactEmail(cp.contactEmail || profile.email || '');
      setShortDescription(cp.shortDescription || '');
      setLongDescription(cp.longDescription || '');
      setVideoUrl(cp.videoUrl || '');
      setAudioUrl(cp.audioUrl || '');
      setLogoUrl(cp.logoUrl || null);
      setBannerUrl(cp.bannerUrl || null);
      
      const socials = cp.socialLinks || {};
      setFacebook(socials.facebook || '');
      setX(socials.x || '');
      setInstagram(socials.instagram || '');
      setLinkedin(socials.linkedin || '');
      setYoutube(socials.youtube || '');

      setAdditionalContacts(cp.additionalContacts || []);
    } else if (profile) {
      setContactEmail(profile.email || '');
    }
  }, [profile]);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>, type: 'logo' | 'banner') => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        toast({ title: 'Image too large', description: 'Please select an image smaller than 2MB.', variant: 'destructive' });
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        if (type === 'logo') setLogoUrl(reader.result as string);
        if (type === 'banner') setBannerUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAddContact = () => {
    setAdditionalContacts([...additionalContacts, { name: '', phone: '', role: 'Press & Media' }]);
  };

  const handleRemoveContact = (index: number) => {
    setAdditionalContacts(additionalContacts.filter((_, i) => i !== index));
  };

  const handleUpdateContact = (index: number, field: string, value: string) => {
    const updated = [...additionalContacts];
    (updated[index] as any)[field] = value;
    setAdditionalContacts(updated);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    if (!companyName.trim()) {
      toast({ title: 'Validation Error', description: 'Company name is required.', variant: 'destructive' });
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await saveNationalAdvertiserProfile({
        userId: user.uid,
        profileData: {
          companyName,
          website,
          contactEmail,
          shortDescription,
          longDescription,
          videoUrl,
          audioUrl,
          logoUrl: logoUrl || '',
          bannerUrl: bannerUrl || '',
          socialLinks: {
            facebook,
            x,
            instagram,
            linkedin,
            youtube,
          },
          additionalContacts,
        }
      });

      if (result.success) {
        toast({ title: 'Profile Saved', description: 'Your company profile has been updated successfully.' });
        router.push('/national/company-profile');
      } else {
        toast({ title: 'Save Failed', description: result.error, variant: 'destructive' });
      }
    } catch (err: any) {
      toast({ title: 'Error', description: err.message || 'An unexpected error occurred.', variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return <div className="flex justify-center items-center h-96"><Loader2 className="animate-spin text-primary" /></div>;
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-16">
      <div className="flex items-center justify-between">
        <Button variant="ghost" asChild>
          <Link href="/national/company-profile">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Cancel & View Profile
          </Link>
        </Button>
        <Button onClick={handleSave} disabled={isSubmitting} className="shadow-lg">
          {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
          Save Profile
        </Button>
      </div>

      <form onSubmit={handleSave} className="space-y-8">
        {/* Core Details & Branding Card */}
        <Card className="border-2 shadow-sm">
          <CardHeader>
            <CardTitle className="text-xl font-bold font-headline flex items-center gap-2">
              <Building2 className="h-5 w-5 text-primary" /> Brand Identity & Basic Info
            </CardTitle>
            <CardDescription>Configure how your business is identified across the network.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="companyName">Company / Brand Name *</Label>
                <Input 
                  id="companyName" 
                  value={companyName} 
                  onChange={(e) => setCompanyName(e.target.value)} 
                  placeholder="e.g. Acme Corporation UK" 
                  required 
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="website">Official Website</Label>
                <Input 
                  id="website" 
                  value={website} 
                  onChange={(e) => setWebsite(e.target.value)} 
                  placeholder="https://example.com" 
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="contactEmail">Public Contact / Media Email</Label>
              <Input 
                id="contactEmail" 
                type="email"
                value={contactEmail} 
                onChange={(e) => setContactEmail(e.target.value)} 
                placeholder="press@example.com" 
              />
            </div>

            {/* Logo and Banner Upload */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-4 border-t">
              {/* Logo */}
              <div className="space-y-3">
                <Label>Brand Logo (Square / Avatar)</Label>
                <div className="flex items-center gap-4">
                  <div className="relative h-20 w-20 rounded-2xl border-2 overflow-hidden bg-muted flex items-center justify-center">
                    {logoUrl ? (
                      <Image src={logoUrl} alt="Logo Preview" fill className="object-cover" />
                    ) : (
                      <ImageIcon className="h-8 w-8 text-muted-foreground" />
                    )}
                  </div>
                  <div className="space-y-2">
                    <Button type="button" variant="outline" size="sm" onClick={() => logoInputRef.current?.click()}>
                      <Upload className="mr-1.5 h-3.5 w-3.5" /> Upload Logo
                    </Button>
                    {logoUrl && (
                      <Button type="button" variant="ghost" size="sm" onClick={() => setLogoUrl(null)} className="text-destructive">
                        Remove
                      </Button>
                    )}
                  </div>
                  <input ref={logoInputRef} type="file" accept="image/*" className="hidden" onChange={(e) => handleImageUpload(e, 'logo')} />
                </div>
              </div>

              {/* Banner */}
              <div className="space-y-3">
                <Label>Profile Banner Image (Wide 16:9)</Label>
                <div className="space-y-2">
                  <div className="relative h-20 w-full rounded-2xl border-2 overflow-hidden bg-muted flex items-center justify-center">
                    {bannerUrl ? (
                      <Image src={bannerUrl} alt="Banner Preview" fill className="object-cover" />
                    ) : (
                      <ImageIcon className="h-8 w-8 text-muted-foreground" />
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <Button type="button" variant="outline" size="sm" onClick={() => bannerInputRef.current?.click()}>
                      <Upload className="mr-1.5 h-3.5 w-3.5" /> Upload Banner
                    </Button>
                    {bannerUrl && (
                      <Button type="button" variant="ghost" size="sm" onClick={() => setBannerUrl(null)} className="text-destructive">
                        Remove
                      </Button>
                    )}
                  </div>
                  <input ref={bannerInputRef} type="file" accept="image/*" className="hidden" onChange={(e) => handleImageUpload(e, 'banner')} />
                </div>
              </div>
            </div>

            <div className="space-y-2 pt-2">
              <Label htmlFor="shortDescription">Short Tagline / Bio (Shown in Directory and Marquees)</Label>
              <Input 
                id="shortDescription" 
                value={shortDescription} 
                onChange={(e) => setShortDescription(e.target.value)} 
                placeholder="e.g. Britain's leading eco-friendly home improvement supplier." 
                maxLength={200}
              />
            </div>
          </CardContent>
        </Card>

        {/* Rich Biography / Narrative */}
        <Card className="border-2 shadow-sm">
          <CardHeader>
            <CardTitle className="text-xl font-bold font-headline flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" /> Comprehensive Brand Biography
            </CardTitle>
            <CardDescription>Tell the story of your brand, ethos, and offerings to local community residents.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <RichTextEditor
              value={longDescription}
              onChange={setLongDescription}
              placeholder="Write a comprehensive overview of your products, mission, community support initiatives..."
            />
          </CardContent>
        </Card>

        {/* Rich Media & Video Showcase */}
        <Card className="border-2 shadow-sm">
          <CardHeader>
            <CardTitle className="text-xl font-bold font-headline flex items-center gap-2 text-red-600 dark:text-red-400">
              <Youtube className="h-5 w-5" /> Video & Audio Media
            </CardTitle>
            <CardDescription>Embed your promotional videos or brand audio messages.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="videoUrl">YouTube Video Link</Label>
              <Input 
                id="videoUrl" 
                value={videoUrl} 
                onChange={(e) => setVideoUrl(e.target.value)} 
                placeholder="https://www.youtube.com/watch?v=..." 
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="audioUrl">Audio Track / Jingle URL (MP3 stream)</Label>
              <Input 
                id="audioUrl" 
                value={audioUrl} 
                onChange={(e) => setAudioUrl(e.target.value)} 
                placeholder="https://example.com/audio/jingle.mp3" 
              />
            </div>
          </CardContent>
        </Card>

        {/* Social Media Links */}
        <Card className="border-2 shadow-sm">
          <CardHeader>
            <CardTitle className="text-xl font-bold font-headline flex items-center gap-2">
              <Globe className="h-5 w-5 text-primary" /> Social Channels
            </CardTitle>
            <CardDescription>Link your official company social accounts.</CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="facebook">Facebook URL</Label>
              <Input id="facebook" value={facebook} onChange={(e) => setFacebook(e.target.value)} placeholder="https://facebook.com/yourpage" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="x">X / Twitter URL</Label>
              <Input id="x" value={x} onChange={(e) => setX(e.target.value)} placeholder="https://x.com/yourhandle" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="instagram">Instagram URL</Label>
              <Input id="instagram" value={instagram} onChange={(e) => setInstagram(e.target.value)} placeholder="https://instagram.com/yourbrand" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="linkedin">LinkedIn URL</Label>
              <Input id="linkedin" value={linkedin} onChange={(e) => setLinkedin(e.target.value)} placeholder="https://linkedin.com/company/yourbiz" />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="youtube">YouTube Channel URL</Label>
              <Input id="youtube" value={youtube} onChange={(e) => setYoutube(e.target.value)} placeholder="https://youtube.com/@yourchannel" />
            </div>
          </CardContent>
        </Card>

        {/* Key Department Contacts */}
        <Card className="border-2 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-xl font-bold font-headline flex items-center gap-2">
                <Users className="h-5 w-5 text-primary" /> Department Contacts
              </CardTitle>
              <CardDescription>Add direct telephone contacts for PR, partnerships, or customer service.</CardDescription>
            </div>
            <Button type="button" variant="outline" size="sm" onClick={handleAddContact}>
              <Plus className="mr-1.5 h-4 w-4" /> Add Contact
            </Button>
          </CardHeader>
          <CardContent className="space-y-4">
            {additionalContacts.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">No additional contacts specified.</p>
            ) : (
              additionalContacts.map((contact, index) => (
                <div key={index} className="flex items-center gap-3 p-3 rounded-xl border bg-muted/10">
                  <Input 
                    placeholder="Contact Name" 
                    value={contact.name} 
                    onChange={(e) => handleUpdateContact(index, 'name', e.target.value)} 
                    className="flex-1"
                  />
                  <Input 
                    placeholder="Phone Number" 
                    value={contact.phone} 
                    onChange={(e) => handleUpdateContact(index, 'phone', e.target.value)} 
                    className="flex-1"
                  />
                  <Input 
                    placeholder="Role (e.g. Media Enquiries)" 
                    value={contact.role} 
                    onChange={(e) => handleUpdateContact(index, 'role', e.target.value)} 
                    className="flex-1"
                  />
                  <Button type="button" variant="ghost" size="icon" onClick={() => handleRemoveContact(index)} className="text-destructive">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <div className="flex justify-end gap-4 pt-4">
          <Button type="button" variant="outline" asChild>
            <Link href="/national/company-profile">Cancel</Link>
          </Button>
          <Button type="submit" disabled={isSubmitting} size="lg" className="shadow-xl">
            {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
            Save & Publish Profile
          </Button>
        </div>
      </form>
    </div>
  );
}
