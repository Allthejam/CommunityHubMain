'use client';

import * as React from 'react';
import { 
  Building2, 
  Globe, 
  Mail, 
  Phone, 
  FileEdit, 
  ArrowLeft, 
  Loader2, 
  Info, 
  Youtube, 
  Music, 
  ExternalLink,
  Images,
  Play,
  Pause,
  Facebook,
  Linkedin,
  Instagram,
  User,
  Users
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useUser, useFirestore, useDoc, useMemoFirebase, useCollection } from '@/firebase';
import { doc, collection, query, orderBy } from 'firebase/firestore';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import Link from 'next/link';
import Image from 'next/image';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { BrandGalleryCarousel } from '@/components/brand-gallery-carousel';
import { cn } from '@/lib/utils';

export default function NationalProfileViewPage() {
  const { user } = useUser();
  const db = useFirestore();

  const userProfileRef = useMemoFirebase(() => (user ? doc(db, 'users', user.uid) : null), [user, db]);
  const { data: profile, isLoading: profileLoading } = useDoc(userProfileRef, true);

  // Audio Playback Logic
  const audioRef = React.useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = React.useState(false);

  const toggleAudio = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  // Fetch gallery images for the showcase carousel
  const galleryQuery = useMemoFirebase(() => {
    if (!user || !db) return null;
    return query(
      collection(db, 'users', user.uid, 'gallery'),
      orderBy('createdAt', 'desc')
    );
  }, [user, db]);

  const { data: galleryImages, isLoading: galleryLoading } = useCollection(galleryQuery);

  if (profileLoading) {
    return <div className="flex justify-center items-center h-96"><Loader2 className="animate-spin" /></div>;
  }

  const cp = profile?.companyProfile || {};
  const hasProfile = !!cp.companyName;

  const getYouTubeId = (url: string) => {
    if (!url) return null;
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
  };

  const youtubeId = getYouTubeId(cp.videoUrl);
  const socials = cp.socialLinks || {};
  const additionalContacts = cp.additionalContacts || [];

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-12">
      <div className="flex justify-between items-center px-4 sm:px-0">
        <Button variant="ghost" asChild>
          <Link href="/national/dashboard">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Dashboard
          </Link>
        </Button>
        <Button asChild className="shadow-lg">
          <Link href="/national/company-profile/edit">
            <FileEdit className="mr-2 h-4 w-4" />
            {hasProfile ? 'Edit Profile' : 'Complete Profile'}
          </Link>
        </Button>
      </div>

      {!hasProfile ? (
        <Alert className="bg-primary/5 border-primary/20">
          <Info className="h-4 w-4" />
          <AlertTitle>Profile Incomplete</AlertTitle>
          <AlertDescription className="mt-2 flex flex-col gap-4">
            <p>You haven&apos;t set up your public company profile yet. A complete profile is required to build trust and activate national campaigns.</p>
            <Button asChild className="w-fit">
              <Link href="/national/company-profile/edit">Set Up Company Profile Now</Link>
            </Button>
          </AlertDescription>
        </Alert>
      ) : (
        <div className="space-y-8">
          {/* Main Hero Card */}
          <Card className="overflow-hidden border-2 shadow-xl bg-card">
            {/* Banner */}
            <div className="relative h-48 sm:h-64 w-full bg-muted">
              {cp.bannerUrl ? (
                <Image src={cp.bannerUrl} alt="Company Banner" fill className="object-cover" priority />
              ) : (
                <div className="w-full h-full bg-gradient-to-r from-primary/20 via-primary/10 to-muted flex items-center justify-center text-muted-foreground text-sm font-medium">
                  No Banner Uploaded
                </div>
              )}
            </div>

            {/* Profile Header */}
            <CardHeader className="relative px-6 sm:px-8 pb-6 pt-0">
              <div className="flex flex-col sm:flex-row gap-6 items-start sm:items-end -mt-16 sm:-mt-20 mb-4">
                <Avatar className="h-28 w-28 sm:h-36 sm:w-36 border-4 border-background shadow-2xl rounded-2xl bg-card">
                  <AvatarImage src={cp.logoUrl || profile?.photoURL} className="object-cover" />
                  <AvatarFallback className="rounded-2xl text-2xl font-bold bg-primary text-primary-foreground">
                    {cp.companyName?.charAt(0) || 'C'}
                  </AvatarFallback>
                </Avatar>

                <div className="flex-1 space-y-1.5">
                  <div className="flex flex-wrap items-center gap-3">
                    <CardTitle className="text-2xl sm:text-3xl font-bold font-headline">{cp.companyName}</CardTitle>
                    <Badge variant="secondary" className="bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 font-semibold">
                      {cp.status || 'Verified Partner'}
                    </Badge>
                  </div>
                  {cp.website && (
                    <a href={cp.website} target="_blank" rel="noopener noreferrer" className="text-sm text-primary hover:underline flex items-center gap-1 w-fit">
                      <Globe className="h-3.5 w-3.5" />
                      {cp.website.replace(/^https?:\/\//, '')}
                      <ExternalLink className="h-3 w-3 ml-0.5" />
                    </a>
                  )}
                </div>
              </div>

              {cp.shortDescription && (
                <CardDescription className="text-base text-foreground/90 font-normal leading-relaxed pt-2">
                  {cp.shortDescription}
                </CardDescription>
              )}
            </CardHeader>

            {/* Social Links Bar */}
            {(socials.facebook || socials.x || socials.instagram || socials.linkedin || socials.youtube) && (
              <div className="px-6 sm:px-8 py-3 bg-muted/30 border-t border-b flex flex-wrap items-center gap-4 text-xs font-semibold text-muted-foreground">
                <span>Connect with us:</span>
                <div className="flex items-center gap-2">
                  {socials.facebook && (
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-[#1877F2]" asChild>
                      <a href={socials.facebook} target="_blank" rel="noreferrer"><Facebook className="h-4 w-4" /></a>
                    </Button>
                  )}
                  {socials.x && (
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-foreground" asChild>
                      <a href={socials.x} target="_blank" rel="noreferrer"><span className="font-bold text-sm">𝕏</span></a>
                    </Button>
                  )}
                  {socials.instagram && (
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-[#E4405F]" asChild>
                      <a href={socials.instagram} target="_blank" rel="noreferrer"><Instagram className="h-4 w-4" /></a>
                    </Button>
                  )}
                  {socials.linkedin && (
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-[#0A66C2]" asChild>
                      <a href={socials.linkedin} target="_blank" rel="noreferrer"><Linkedin className="h-4 w-4" /></a>
                    </Button>
                  )}
                  {socials.youtube && (
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-[#CD201F]" asChild>
                      <a href={socials.youtube} target="_blank" rel="noreferrer"><Youtube className="h-4 w-4" /></a>
                    </Button>
                  )}
                </div>
              </div>
            )}

            <CardContent className="p-6 sm:p-8 space-y-8">
              {/* Detailed Biography / Rich Text */}
              {cp.longDescription && (
                <div className="space-y-3">
                  <h3 className="text-lg font-bold font-headline flex items-center gap-2">
                    <Building2 className="h-5 w-5 text-primary" />
                    About Our Brand
                  </h3>
                  <div 
                    className="prose dark:prose-invert max-w-none text-sm leading-relaxed text-muted-foreground"
                    dangerouslySetInnerHTML={{ __html: cp.longDescription }}
                  />
                </div>
              )}

              {/* Audio Jingle / Message */}
              {cp.audioUrl && (
                <div className="space-y-3">
                  <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                    <Music className="h-4 w-4 text-primary" /> Brand Audio / Voice Message
                  </h3>
                  <div className="p-4 rounded-xl border bg-muted/20 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <Button size="icon" variant="outline" className="rounded-full h-10 w-10 shrink-0" onClick={toggleAudio}>
                        {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4 ml-0.5" />}
                      </Button>
                      <div>
                        <p className="font-semibold text-xs text-foreground">Official Audio Track</p>
                        <p className="text-[11px] text-muted-foreground">Click to listen to brand announcement</p>
                      </div>
                    </div>
                    <audio ref={audioRef} src={cp.audioUrl} onEnded={() => setIsPlaying(false)} className="hidden" />
                  </div>
                </div>
              )}

              {/* Video Showcase Embed */}
              {youtubeId && (
                <div className="space-y-3">
                  <h3 className="text-lg font-bold font-headline flex items-center gap-2 text-red-600 dark:text-red-400">
                    <Youtube className="h-5 w-5" /> Video Showcase
                  </h3>
                  <div className="relative aspect-video w-full rounded-2xl overflow-hidden shadow-xl border bg-black">
                    <iframe 
                      src={`https://www.youtube.com/embed/${youtubeId}`} 
                      title="Company Showcase Video"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                      className="absolute inset-0 w-full h-full"
                    />
                  </div>
                </div>
              )}

              {/* Visual Brand Gallery / Showcase Carousel */}
              {galleryImages && galleryImages.length > 0 && (
                <div className="space-y-4 pt-4 border-t">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-lg font-bold font-headline flex items-center gap-2">
                        <Images className="h-5 w-5 text-primary" /> Visual Brand Gallery
                      </h3>
                      <p className="text-xs text-muted-foreground">Swipe or drag to explore our image showcase</p>
                    </div>
                    <Button variant="outline" size="sm" asChild>
                      <Link href="/national/gallery">Manage Gallery</Link>
                    </Button>
                  </div>

                  <BrandGalleryCarousel images={galleryImages} />
                </div>
              )}

              {/* Additional Team Contacts Matrix */}
              {additionalContacts.length > 0 && (
                <div className="space-y-4 pt-4 border-t">
                  <h3 className="text-lg font-bold font-headline flex items-center gap-2">
                    <Users className="h-5 w-5 text-primary" /> Key Department Contacts
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {additionalContacts.map((contact: any, index: number) => (
                      <div key={index} className="p-4 rounded-xl border bg-muted/10 space-y-1.5 text-xs">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-sm text-foreground">{contact.name}</span>
                          <Badge variant="outline" className="text-[10px] uppercase font-mono">{contact.role}</Badge>
                        </div>
                        {contact.phone && (
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <Phone className="h-3.5 w-3.5" />
                            <span>{contact.phone}</span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>

            <CardFooter className="px-6 sm:px-8 py-4 bg-muted/20 border-t flex flex-col sm:flex-row justify-between items-center gap-4 text-xs text-muted-foreground">
              <div className="flex items-center gap-4">
                {cp.contactEmail && (
                  <span className="flex items-center gap-1.5">
                    <Mail className="h-3.5 w-3.5 text-primary" /> {cp.contactEmail}
                  </span>
                )}
              </div>
              <span>National Advertiser Account • Community Hub UK</span>
            </CardFooter>
          </Card>
        </div>
      )}
    </div>
  );
}
