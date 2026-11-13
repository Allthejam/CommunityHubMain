'use client';

import * as React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Building2,
  Calendar,
  CheckCircle2,
  Clock,
  Compass,
  ExternalLink,
  Globe,
  Heart,
  Mail,
  MapPin,
  Megaphone,
  Phone,
  Share2,
  Sparkles,
  Store,
  UserCheck,
  ChevronRight,
  ShieldCheck,
  Lock,
  AlertTriangle,
  Loader2,
  HelpCircle,
  Pencil,
  Upload,
  Save,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Logo } from '@/components/icons';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useUser, useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import {
  claimBusinessAction,
  updatePlatformUnclaimedBusinessAction,
  type PublicBusinessDetail,
} from '@/lib/actions/publicDirectoryActions';
import { uploadImageAction } from '@/lib/actions/storageActions';
import { useIsSeoManager } from '@/components/about/seo-editor-controls';

const DAYS_OF_WEEK = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'] as const;

export function PublicBusinessProfileView({ business: initialBusiness }: { business: PublicBusinessDetail }) {
  const [business, setBusiness] = React.useState<PublicBusinessDetail>(initialBusiness);
  const router = useRouter();
  const { toast } = useToast();
  const [copied, setCopied] = React.useState(false);
  const { isSeoManager } = useIsSeoManager();

  // Edit Seeded Unclaimed Listing Modal state (ONLY for platform-seeded unclaimed listings)
  const canEditSeededListing = Boolean(
    isSeoManager &&
      business.isUnclaimed === true &&
      (business.isPlatformCreated === true || business.ownerId === 'platform')
  );
  const [isEditModalOpen, setIsEditModalOpen] = React.useState(false);
  const [isSavingEdit, setIsSavingEdit] = React.useState(false);
  const [isUploadingEditCover, setIsUploadingEditCover] = React.useState(false);
  const [editName, setEditName] = React.useState(initialBusiness.businessName || '');
  const [editCategory, setEditCategory] = React.useState(initialBusiness.businessCategory || '');
  const [editPostcode, setEditPostcode] = React.useState(initialBusiness.postcode || '');
  const [editCoverUrl, setEditCoverUrl] = React.useState(initialBusiness.bannerImage || initialBusiness.logoImage || '');
  const [editImageAlt, setEditImageAlt] = React.useState(initialBusiness.imageAlt || initialBusiness.coverImageAlt || '');
  const [editMetaTitle, setEditMetaTitle] = React.useState(initialBusiness.metaTitle || '');
  const [editMetaDesc, setEditMetaDesc] = React.useState(initialBusiness.metaDescription || initialBusiness.shortDescription || '');
  const [editH1, setEditH1] = React.useState(initialBusiness.seoHeadings?.h1 || initialBusiness.businessName || '');
  const [editH2, setEditH2] = React.useState(initialBusiness.seoHeadings?.h2 || '');
  const [editH3, setEditH3] = React.useState(initialBusiness.seoHeadings?.h3 || '');
  const [editH4, setEditH4] = React.useState(initialBusiness.seoHeadings?.h4 || '');
  const [editH5, setEditH5] = React.useState(initialBusiness.seoHeadings?.h5 || '');
  const [editH6, setEditH6] = React.useState(initialBusiness.seoHeadings?.h6 || '');

  const openEditModal = () => {
    setEditName(business.businessName || '');
    setEditCategory(business.businessCategory || '');
    setEditPostcode(business.postcode || '');
    setEditCoverUrl(business.bannerImage || business.logoImage || '');
    setEditImageAlt(business.imageAlt || business.coverImageAlt || '');
    setEditMetaTitle(business.metaTitle || '');
    setEditMetaDesc(business.metaDescription || business.shortDescription || '');
    setEditH1(business.seoHeadings?.h1 || business.businessName || '');
    setEditH2(business.seoHeadings?.h2 || '');
    setEditH3(business.seoHeadings?.h3 || '');
    setEditH4(business.seoHeadings?.h4 || '');
    setEditH5(business.seoHeadings?.h5 || '');
    setEditH6(business.seoHeadings?.h6 || '');
    setIsEditModalOpen(true);
  };

  const handleEditCoverUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploadingEditCover(true);
    try {
      const reader = new FileReader();
      reader.onload = async () => {
        const base64Data = reader.result as string;
        const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
        const res = await uploadImageAction({
          base64Data,
          path: `public-directory/${business.id}-${Date.now()}-${safeName}`,
        });
        if (res.success && res.url) {
          setEditCoverUrl(res.url);
          toast({ title: 'Cover uploaded', description: 'Image URL updated.' });
        } else {
          toast({ variant: 'destructive', title: 'Upload failed', description: res.error || 'Could not upload image.' });
        }
        setIsUploadingEditCover(false);
      };
      reader.readAsDataURL(file);
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Upload error', description: err?.message });
      setIsUploadingEditCover(false);
    }
  };

  const handleSaveUnclaimedEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setIsSavingEdit(true);
    try {
      const idToken = await user.getIdToken();
      const res = await updatePlatformUnclaimedBusinessAction({
        idToken,
        businessId: business.id,
        businessName: editName,
        businessCategory: editCategory,
        postcode: editPostcode,
        coverImage: editCoverUrl,
        imageAlt: editImageAlt,
        metaTitle: editMetaTitle,
        metaDescription: editMetaDesc,
        seoHeadings: {
          h1: editH1,
          h2: editH2,
          h3: editH3,
          h4: editH4,
          h5: editH5,
          h6: editH6,
        },
      });
      if (res.success && res.business) {
        setBusiness(res.business);
        setIsEditModalOpen(false);
        toast({ title: 'Listing Updated', description: 'Unclaimed listing & SEO metadata saved.' });
        router.refresh();
      } else {
        toast({ variant: 'destructive', title: 'Update Failed', description: res.error || 'Could not update listing.' });
      }
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Error', description: err?.message || 'Unexpected error saving changes.' });
    } finally {
      setIsSavingEdit(false);
    }
  };

  // Claim Business Modal state
  const [isClaimModalOpen, setIsClaimModalOpen] = React.useState(false);
  const [claimName, setClaimName] = React.useState('');
  const [claimEmail, setClaimEmail] = React.useState('');
  const [claimPhone, setClaimPhone] = React.useState('');
  const [claimRole, setClaimRole] = React.useState('Owner');
  const [isClaiming, setIsClaiming] = React.useState(false);

  // Check viewer authentication and community
  const { user } = useUser();
  const db = useFirestore();
  const userProfileRef = useMemoFirebase(() => (user && db ? doc(db, 'users', user.uid) : null), [user, db]);
  const { data: userProfile } = useDoc<any>(userProfileRef);

  // Pre-fill claim details from user profile when available
  React.useEffect(() => {
    if (userProfile) {
      if (userProfile.name && !claimName) setClaimName(userProfile.name);
      if (userProfile.email && !claimEmail) setClaimEmail(userProfile.email);
      if (userProfile.phone && !claimPhone) setClaimPhone(userProfile.phone);
    } else if (user) {
      if (user.displayName && !claimName) setClaimName(user.displayName);
      if (user.email && !claimEmail) setClaimEmail(user.email);
    }
  }, [user, userProfile, claimName, claimEmail, claimPhone]);

  const isCourier =
    business.accountType === 'courier' ||
    business.businessCategory?.toLowerCase() === 'courier' ||
    (typeof business.businessCategory === 'string' && business.businessCategory.toLowerCase().includes('courier'));

  const loggedInCommunityName = userProfile?.communityName || null;
  const loggedInCommunityId = userProfile?.primaryHomeCommunityId || userProfile?.homeCommunityId || userProfile?.communityId || null;

  const matchesCourierCommunity =
    user && (
      (loggedInCommunityId && business.primaryCommunityId && loggedInCommunityId === business.primaryCommunityId) ||
      (loggedInCommunityName && business.primaryCommunityName && loggedInCommunityName.trim().toLowerCase() === business.primaryCommunityName.trim().toLowerCase())
    );

  const isCourierLockedToViewer = isCourier && (!user || !matchesCourierCommunity);

  // Business Owner Status for Inactive / Reactivation controls
  const isOwner = Boolean(user && business.ownerId && user.uid === business.ownerId && business.ownerId !== 'platform');
  const isGuest = !user;

  const handleShare = () => {
    if (typeof window !== 'undefined') {
      navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  const handleClaimSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      router.push(`/?redirect=/public-directory/${business.id}`);
      return;
    }

    if (!claimName.trim() || !claimEmail.trim()) {
      toast({
        title: 'Missing information',
        description: 'Please provide your full name and contact email to claim this business.',
        variant: 'destructive',
      });
      return;
    }

    setIsClaiming(true);
    const result = await claimBusinessAction({
      businessId: business.id,
      claimantUserId: user.uid,
      claimantName: claimName.trim(),
      claimantEmail: claimEmail.trim(),
      claimantPhone: claimPhone.trim(),
      claimantRole: claimRole,
    });
    setIsClaiming(false);

    if (result.success) {
      setIsClaimModalOpen(false);
      toast({
        title: 'Business Claimed Successfully!',
        description: `Congratulations! You now manage ${business.businessName}. Your 14-day free live trial is active.`,
      });
      if (typeof window !== 'undefined') {
        window.location.reload();
      }
    } else {
      toast({
        title: 'Claim Failed',
        description: result.error || 'Could not claim this business. Please try again.',
        variant: 'destructive',
      });
    }
  };

  const primaryAddress = business.addresses?.[0];
  const addressQuery = [
    primaryAddress?.addressLine1,
    primaryAddress?.city || business.city || business.primaryCommunityName,
    primaryAddress?.postcode || business.postcode,
    business.country,
  ]
    .filter(Boolean)
    .join(', ');

  const googleMapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
    business.businessName + ' ' + addressQuery
  )}`;

  // Determine current day for hours highlight
  const currentDay = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'][
    new Date().getDay()
  ] as (typeof DAYS_OF_WEEK)[number];

  // Rich descriptive alt tags for Google Image Search
  const imageAltDescription =
    business.imageAlt ||
    business.coverImageAlt ||
    `${business.businessName} - ${business.businessCategory} in ${business.primaryCommunityName || business.city || 'Local Community'}, UK`;

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-muted/20 to-background text-foreground flex flex-col">
      {/* Top Bar */}
      <header className="sticky top-0 z-40 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" asChild className="gap-1.5 text-xs sm:text-sm">
              <Link href="/public-directory">
                <ArrowLeft className="h-4 w-4" />
                <span className="hidden sm:inline">Back to</span> Directory
              </Link>
            </Button>

            <Separator orientation="vertical" className="h-5 hidden sm:block" />

            <div className="hidden md:flex items-center gap-1.5 text-xs text-muted-foreground">
              {business.isLive ? (
                <>
                  <span className="text-emerald-600 dark:text-emerald-400 font-semibold">No Login Required</span>
                  <span>&bull; Public Google Listing</span>
                </>
              ) : business.isUnclaimed ? (
                <span className="text-emerald-700 dark:text-emerald-400 font-semibold flex items-center gap-1">
                  <Store className="h-3 w-3" />
                  Unclaimed Listing &bull; Available to Claim
                </span>
              ) : (
                <span className="text-amber-600 dark:text-amber-400 font-semibold flex items-center gap-1">
                  <Lock className="h-3 w-3" />
                  Listing Locked &bull; Subscription Inactive
                </span>
              )}
            </div>
          </div>

          {/* Action Links */}
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleShare}
              className="gap-1.5 text-xs sm:text-sm"
            >
              <Share2 className="h-3.5 w-3.5" />
              <span>{copied ? 'Copied Link!' : 'Share'}</span>
            </Button>

            <Button variant="ghost" size="sm" asChild className="text-xs sm:text-sm">
              <Link href="/directory/advertise">Advertise</Link>
            </Button>

            <Button size="sm" asChild className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs sm:text-sm">
              <Link href="/">Sign In</Link>
            </Button>
          </div>
        </div>
      </header>

      {/* Courier Protection Guard: If viewer is unauthenticated or not a resident of this courier's community */}
      {isCourierLockedToViewer ? (
        <main className="container max-w-4xl mx-auto px-4 py-16 flex-1 flex flex-col items-center justify-center text-center">
          <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-700 dark:text-amber-400 mb-6">
            <ShieldCheck className="h-12 w-12" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight mb-3 font-headline">
            Local Community Courier Service
          </h1>
          <p className="text-muted-foreground text-sm sm:text-base max-w-lg mb-6 leading-relaxed">
            Community couriers are official local logistics partners reserved exclusively for verified residents of <strong>{business.primaryCommunityName || 'this community'}</strong>.
            Sign in with an account registered to this community to view delivery schedules and book local courier requests.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <Button asChild size="lg" className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold">
              <Link href={`/?redirect=/public-directory/${business.id}`}>
                Sign In to View Courier
              </Link>
            </Button>
            <Button asChild variant="outline" size="lg">
              <Link href="/public-directory">Back to Directory</Link>
            </Button>
          </div>
        </main>
      ) : (
        <>
      {/* Prominent Banner (if unclaimed or inactive) */}
      {business.isUnclaimed ? (
        <div className="bg-gradient-to-r from-emerald-500/15 via-teal-500/10 to-amber-500/10 border-b border-emerald-500/30 px-4 py-3.5">
          <div className="container max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 text-xs sm:text-sm">
            <div className="flex items-center gap-2 text-emerald-950 dark:text-emerald-200 font-medium">
              <Store className="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
              <span>
                <strong>Unclaimed Community Listing:</strong> Created by Community Hub to support local discovery. Do you own or manage <strong>{business.businessName}</strong>?
              </span>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Button
                onClick={() => setIsClaimModalOpen(true)}
                size="sm"
                className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold h-8 shadow-xs animate-pulse ring-2 ring-emerald-400/50"
              >
                <UserCheck className="mr-1.5 h-3.5 w-3.5" />
                Claim This Business &rarr;
              </Button>
            </div>
          </div>
        </div>
      ) : !business.isLive ? (
        <div className="bg-amber-500/10 border-b border-amber-500/30 px-4 py-3.5">
          <div className="container max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 text-xs sm:text-sm">
            <div className="flex items-center gap-2 text-amber-800 dark:text-amber-300 font-medium">
              <Lock className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
              <span>
                {isOwner ? (
                  <>
                    <strong>Your Business Subscription is Inactive:</strong> Direct contact links and schedules are locked until renewed.
                  </>
                ) : (
                  <>
                    <strong>Subscription Expired / Inactive:</strong> Direct contact links, opening hours schedule, and photo showcases are locked until renewed.
                  </>
                )}
              </span>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {isOwner ? (
                <Button asChild size="sm" className="bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold h-8 animate-pulse shadow-xs ring-1 ring-amber-400">
                  <Link href="/directory/advertise">
                    Renew Listing for £20/mo &rarr;
                  </Link>
                </Button>
              ) : isGuest ? (
                <Button asChild size="sm" className="bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold h-8">
                  <Link href="/directory/advertise">
                    Owner? Reactivate for £20/mo &rarr;
                  </Link>
                </Button>
              ) : (
                <Button asChild variant="outline" size="sm" className="border-amber-500/40 text-amber-800 dark:text-amber-300 hover:bg-amber-500/10 text-xs font-medium h-8">
                  <Link href="/directory/advertise">
                    Advertise for £20/mo &rarr;
                  </Link>
                </Button>
              )}
            </div>
          </div>
        </div>
      ) : null}

      {/* Hero Banner Section */}
      <div className="relative w-full bg-muted/40 border-b">
        <div className="h-48 sm:h-64 md:h-80 w-full relative overflow-hidden bg-gradient-to-r from-emerald-800/20 via-teal-800/20 to-slate-800/30">
          {business.bannerImage ? (
            <Image
              src={business.bannerImage}
              alt={imageAltDescription}
              fill
              className={`object-cover ${!business.isLive ? 'grayscale-[35%]' : ''}`}
              priority
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-muted-foreground/30">
              <Building2 className="h-20 w-20" />
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-background/90 via-background/40 to-transparent" />
        </div>

        {/* Business Title & Details Box */}
        <div className="container max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="relative -mt-16 sm:-mt-20 pb-6 flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-end gap-4 sm:gap-6">
              {/* Logo Avatar */}
              <div className="h-28 w-28 sm:h-32 sm:w-32 rounded-2xl bg-card border-4 border-background shadow-xl overflow-hidden relative flex items-center justify-center shrink-0">
                {business.logoImage ? (
                  <Image
                    src={business.logoImage}
                    alt={`${business.businessName} logo - ${business.businessCategory} in ${business.primaryCommunityName || business.city || 'Local Community'}, UK`}
                    fill
                    className={`object-cover ${!business.isLive ? 'grayscale-[30%]' : ''}`}
                    priority
                  />
                ) : (
                  <Store className="h-12 w-12 text-muted-foreground" />
                )}
              </div>

              {/* Business Name, Badges & Location */}
              <div className="space-y-1.5">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="secondary" className="capitalize text-xs font-semibold">
                    {business.businessCategory.replace(/-/g, ' ')}
                  </Badge>

                  {business.isAccommodation && (
                    <Badge className="bg-amber-500 text-white text-xs font-semibold">
                      Accommodation / Stay
                    </Badge>
                  )}

                  {business.isLive ? (
                    <Badge variant="outline" className="border-emerald-500/40 text-emerald-700 dark:text-emerald-400 bg-emerald-500/10 text-xs">
                      <CheckCircle2 className="h-3 w-3 mr-1 text-emerald-500" />
                      Verified Active Business
                    </Badge>
                  ) : business.isUnclaimed ? (
                    <>
                      <Badge variant="outline" className="border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 text-xs font-semibold flex items-center gap-1">
                        <Building2 className="h-3 w-3 text-slate-500" />
                        Unclaimed Community Listing
                      </Badge>
                      {canEditSeededListing && (
                        <Button
                          type="button"
                          size="sm"
                          onClick={openEditModal}
                          className="h-7 px-2.5 text-xs bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold gap-1.5 shadow-sm"
                        >
                          <Pencil className="h-3 w-3" />
                          Edit Unclaimed Listing &amp; SEO
                        </Button>
                      )}
                    </>
                  ) : (
                    <Badge variant="outline" className="border-amber-500/40 text-amber-700 dark:text-amber-400 bg-amber-500/10 text-xs">
                      <Lock className="h-3 w-3 mr-1 text-amber-600" />
                      Locked Listing &bull; Inactive
                    </Badge>
                  )}
                </div>

                <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold tracking-tight font-headline">
                  {business.seoHeadings?.h1 || business.businessName}
                </h1>

                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs sm:text-sm text-muted-foreground pt-0.5">
                  <div className="flex items-center gap-1.5">
                    <MapPin className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                    <span>
                      {business.primaryCommunityName || business.city || 'Local Community'}
                      {business.postcode ? ` (${business.postcode})` : ''}
                      {business.country ? `, ${business.country}` : ''}
                    </span>
                  </div>

                  {business.isLive && business.phone && (
                    <div className="flex items-center gap-1.5">
                      <Phone className="h-4 w-4 text-muted-foreground/70 shrink-0" />
                      <span>{business.phone}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Quick Action Buttons (Active vs Unclaimed vs Locked) */}
            <div className="flex flex-wrap items-center gap-2 pt-2 md:pt-0">
              {business.isLive ? (
                <>
                  {business.phone && (
                    <Button variant="outline" size="sm" asChild className="gap-1.5">
                      <a href={`tel:${business.phone}`}>
                        <Phone className="h-4 w-4 text-emerald-600" />
                        <span>Call Store</span>
                      </a>
                    </Button>
                  )}

                  {business.website && (
                    <Button variant="outline" size="sm" asChild className="gap-1.5">
                      <a href={business.website} target="_blank" rel="noopener noreferrer">
                        <Globe className="h-4 w-4 text-emerald-600" />
                        <span>Website</span>
                        <ExternalLink className="h-3 w-3 text-muted-foreground ml-0.5" />
                      </a>
                    </Button>
                  )}

                  <Button variant="outline" size="sm" asChild className="gap-1.5">
                    <a href={googleMapsUrl} target="_blank" rel="noopener noreferrer">
                      <Compass className="h-4 w-4 text-emerald-600" />
                      <span>Directions</span>
                    </a>
                  </Button>
                </>
              ) : business.isUnclaimed ? (
                <Button
                  onClick={() => setIsClaimModalOpen(true)}
                  size="sm"
                  className="gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold animate-pulse shadow-sm"
                >
                  <UserCheck className="h-4 w-4" />
                  <span>Claim This Business</span>
                </Button>
              ) : (
                <Button variant="outline" size="sm" asChild className="gap-1.5 border-amber-500/40 text-amber-700 dark:text-amber-400 hover:bg-amber-500/10">
                  <Link href="/directory/advertise">
                    <Lock className="h-4 w-4 text-amber-600" />
                    <span>Interactive Links Locked</span>
                  </Link>
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <main className="container max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10 flex-1">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column (2 cols): Details & Content Blocks */}
          <div className="lg:col-span-2 space-y-8">
            {/* Overview / About */}
            <Card className="border shadow-sm">
              <CardHeader>
                <CardTitle className="text-xl">About {business.businessName}</CardTitle>
                {business.shortDescription && (
                  <CardDescription className="text-base text-foreground/80 font-normal leading-relaxed pt-1">
                    {business.shortDescription}
                  </CardDescription>
                )}
              </CardHeader>

              {business.isLive ? (
                business.longDescription && (
                  <CardContent className="pt-0">
                    <Separator className="mb-4" />
                    <div
                      className="prose dark:prose-invert max-w-none text-sm text-muted-foreground leading-relaxed space-y-4"
                      dangerouslySetInnerHTML={{ __html: business.longDescription }}
                    />
                  </CardContent>
                )
              ) : business.isUnclaimed ? (
                <CardContent className="pt-0">
                  <Separator className="mb-4" />
                  <div className="rounded-xl border border-emerald-500/30 bg-gradient-to-br from-emerald-500/10 via-card to-card p-6 text-center space-y-3">
                    <div className="p-3 bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 rounded-full inline-block">
                      <Store className="h-6 w-6" />
                    </div>
                    <h2 className="font-bold text-base text-foreground">
                      {business.seoHeadings?.h2 || `About ${business.businessName}`}
                    </h2>
                    {business.seoHeadings?.h3 && (
                      <h3 className="text-sm font-semibold text-emerald-700 dark:text-emerald-300">
                        {business.seoHeadings.h3}
                      </h3>
                    )}
                    {business.seoHeadings?.h4 && (
                      <h4 className="text-xs font-medium text-muted-foreground">
                        {business.seoHeadings.h4}
                      </h4>
                    )}
                    <h5 className="font-semibold text-sm text-foreground">
                      {business.seoHeadings?.h5 || `Are You The Owner or Manager of ${business.businessName}?`}
                    </h5>
                    <p className="text-xs sm:text-sm text-muted-foreground max-w-md mx-auto leading-relaxed">
                      This listing was seeded by Community Hub to help local residents find you. Claim your profile today to publish direct contact numbers, opening hours, customer direct messaging, photo galleries, and receive official Verified Partner status.
                    </p>
                    {business.seoHeadings?.h6 && (
                      <h6 className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">
                        {business.seoHeadings.h6}
                      </h6>
                    )}
                    <div className="pt-2 flex flex-wrap items-center justify-center gap-3">
                      <Button
                        onClick={() => setIsClaimModalOpen(true)}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold shadow-md text-xs sm:text-sm animate-pulse ring-2 ring-emerald-400 ring-offset-2"
                      >
                        <UserCheck className="mr-1.5 h-4 w-4" />
                        Claim This Listing (14-Day Free Trial)
                      </Button>
                      <Button asChild variant="outline" size="sm" className="text-xs">
                        <Link href="/directory/advertise">
                          Why Become a Partner for £20/mo &rarr;
                        </Link>
                      </Button>
                    </div>
                  </div>
                </CardContent>
              ) : (
                <CardContent className="pt-0">
                  <Separator className="mb-4" />
                  {/* High-Converting Locked State Notice */}
                  <div className="rounded-xl border border-amber-500/30 bg-gradient-to-br from-amber-500/10 via-card to-card p-6 text-center space-y-3">
                    <div className="p-3 bg-amber-500/15 text-amber-600 dark:text-amber-400 rounded-full inline-block">
                      <Lock className="h-6 w-6" />
                    </div>
                    <h3 className="font-bold text-base text-foreground">
                      Detailed Business Showcase & Direct Links Are Locked
                    </h3>
                    <p className="text-xs sm:text-sm text-muted-foreground max-w-md mx-auto leading-relaxed">
                      This listing is currently inactive awaiting subscription renewal. Active Community Partners enjoy click-to-call phone buttons, website backlinks, photo showcases, weekly opening hours, and direct customer messaging.
                    </p>
                    <div className="pt-2 flex flex-wrap items-center justify-center gap-3">
                      {isOwner ? (
                        <Button asChild className="bg-amber-600 hover:bg-amber-700 text-white font-bold shadow-md text-xs sm:text-sm animate-pulse ring-2 ring-amber-400 ring-offset-2">
                          <Link href="/directory/advertise">
                            <Sparkles className="mr-1.5 h-4 w-4" />
                            You Own This Listing &bull; Reactivate For £20/mo
                          </Link>
                        </Button>
                      ) : isGuest ? (
                        <>
                          <Button asChild className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold shadow-md text-xs sm:text-sm">
                            <Link href={`/?redirect=/public-directory/${business.id}`}>
                              <UserCheck className="mr-1.5 h-4 w-4" />
                              Are You The Owner? Sign In to Reactivate
                            </Link>
                          </Button>
                          <Button asChild variant="outline" size="sm" className="text-xs">
                            <Link href="/directory/advertise">
                              Why Advertise for £20/mo &rarr;
                            </Link>
                          </Button>
                        </>
                      ) : (
                        <Button asChild variant="outline" size="sm" className="text-xs">
                          <Link href="/directory/advertise">
                            Advertise Your Business for £20/mo &rarr;
                          </Link>
                        </Button>
                      )}
                      <Button asChild variant="ghost" size="sm" className="text-xs text-muted-foreground">
                        <Link href="/public-directory">
                          Browse Active Listings &rarr;
                        </Link>
                      </Button>
                    </div>
                  </div>
                </CardContent>
              )}
            </Card>

            {/* Page 2 Custom Content Blocks (Only for live businesses) */}
            {business.isLive && business.pageTwoContent && business.pageTwoContent.length > 0 && (
              <div className="space-y-4">
                <h2 className="text-xl font-bold tracking-tight">
                  {business.pageTwoIntro || 'Specialities & Features'}
                </h2>

                <div className="space-y-4">
                  {business.pageTwoContent.map((block, idx) => (
                    <Card key={block.id || idx} className="overflow-hidden border shadow-sm">
                      <div className={`grid ${block.image ? 'md:grid-cols-2' : 'grid-cols-1'} gap-4 p-5 items-center`}>
                        {block.image && (
                          <div className="relative h-48 sm:h-56 w-full rounded-lg overflow-hidden border">
                            <Image
                              src={block.image}
                              alt={`${business.businessName} feature photo ${idx + 1}`}
                              fill
                              className="object-cover"
                            />
                          </div>
                        )}
                        <div
                          className="prose dark:prose-invert max-w-none text-sm text-muted-foreground leading-relaxed"
                          dangerouslySetInnerHTML={{ __html: block.text }}
                        />
                      </div>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            {/* Page 3 Content Block (Only for live businesses) */}
            {business.isLive && business.pageThreeContent && (
              <Card className="border shadow-sm">
                <CardHeader>
                  <CardTitle className="text-lg">Additional Information</CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <div
                    className="prose dark:prose-invert max-w-none text-sm text-muted-foreground leading-relaxed"
                    dangerouslySetInnerHTML={{ __html: business.pageThreeContent }}
                  />
                </CardContent>
              </Card>
            )}
          </div>

          {/* Right Column (1 col): Location, Opening Hours, Contact Info */}
          <div className="space-y-6">
            {/* Opening Hours Card */}
            {business.isLive && business.openingHours ? (
              <Card className="border shadow-sm">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Clock className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                    Opening Hours
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0 space-y-2">
                  <div className="divide-y divide-border/60 text-xs">
                    {DAYS_OF_WEEK.map((day) => {
                      const dayHours = business.openingHours?.[day];
                      const isToday = day === currentDay;

                      let hoursText = 'Closed';
                      if (dayHours && !dayHours.closed) {
                        const openStr = dayHours.morningOpen || dayHours.open || '';
                        const closeStr = dayHours.afternoonClose || dayHours.afternoonOpen || dayHours.close || '';
                        if (openStr || closeStr) {
                          hoursText = `${openStr || '09:00'} - ${closeStr || '17:30'}`;
                        } else {
                          hoursText = 'Open';
                        }
                      }

                      return (
                        <div
                          key={day}
                          className={`flex items-center justify-between py-2 px-1 rounded transition-colors ${
                            isToday ? 'bg-emerald-500/10 font-bold text-emerald-700 dark:text-emerald-300' : ''
                          }`}
                        >
                          <span className="capitalize">
                            {day} {isToday && <span className="text-[10px] uppercase ml-1">(Today)</span>}
                          </span>
                          <span className={hoursText === 'Closed' ? 'text-muted-foreground' : 'font-medium'}>
                            {hoursText}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            ) : business.isUnclaimed ? (
              <Card className="border border-dashed border-emerald-500/40 bg-muted/20">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center gap-2 text-muted-foreground">
                    <Clock className="h-4 w-4 text-emerald-500" />
                    Opening Hours (Unclaimed)
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0 text-xs text-muted-foreground space-y-2">
                  <p className="italic">
                    Opening hours have not yet been submitted by the business owner.
                  </p>
                  <Button
                    onClick={() => setIsClaimModalOpen(true)}
                    variant="link"
                    size="sm"
                    className="p-0 h-auto text-xs text-emerald-600 font-semibold"
                  >
                    Claim this business to set weekly hours &rarr;
                  </Button>
                </CardContent>
              </Card>
            ) : !business.isLive ? (
              <Card className="border border-dashed border-amber-500/40 bg-muted/20">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center gap-2 text-muted-foreground">
                    <Lock className="h-4 w-4 text-amber-500" />
                    Opening Hours (Locked)
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0 text-xs text-muted-foreground space-y-2">
                  <p className="italic">
                    Weekly opening times schedule is locked until business owner subscription is renewed.
                  </p>
                </CardContent>
              </Card>
            ) : null}

            {/* Location & Contact Card */}
            {business.isLive ? (
              <Card className="border shadow-sm">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                    Address & Contact
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0 space-y-4 text-xs">
                  {primaryAddress && (
                    <div className="space-y-1">
                      <p className="font-semibold text-foreground">Physical Address</p>
                      <p className="text-muted-foreground leading-relaxed">
                        {primaryAddress.addressLine1}
                        {primaryAddress.addressLine2 ? `, ${primaryAddress.addressLine2}` : ''}
                        <br />
                        {primaryAddress.city || business.city || business.primaryCommunityName}
                        {primaryAddress.postcode ? ` ${primaryAddress.postcode}` : ''}
                        <br />
                        {business.country}
                      </p>
                      <Button variant="link" size="sm" asChild className="p-0 h-auto text-xs text-emerald-600">
                        <a href={googleMapsUrl} target="_blank" rel="noopener noreferrer">
                          Get Directions on Google Maps &rarr;
                        </a>
                      </Button>
                    </div>
                  )}

                  <Separator />

                  <div className="space-y-2.5">
                    {business.phone && (
                      <div className="flex items-center gap-2">
                        <Phone className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                        <a href={`tel:${business.phone}`} className="hover:underline font-medium">
                          {business.phone}
                        </a>
                      </div>
                    )}

                    {business.contactEmail && (
                      <div className="flex items-center gap-2 truncate">
                        <Mail className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                        <a href={`mailto:${business.contactEmail}`} className="hover:underline truncate">
                          {business.contactEmail}
                        </a>
                      </div>
                    )}

                    {business.website && (
                      <div className="flex items-center gap-2 truncate">
                        <Globe className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                        <a
                          href={business.website}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="hover:underline text-emerald-600 dark:text-emerald-400 truncate"
                        >
                          {business.website.replace(/^https?:\/\//, '')}
                        </a>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ) : business.isUnclaimed ? (
              <Card className="border border-dashed border-emerald-500/40 bg-muted/20">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center gap-2 text-muted-foreground">
                    <Store className="h-4 w-4 text-emerald-500" />
                    Town &amp; Area
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0 text-xs text-muted-foreground space-y-2">
                  <p className="font-semibold text-foreground text-sm">
                    {business.primaryCommunityName || business.city || 'Local Community'}
                    {business.postcode ? ` (${business.postcode})` : ''}
                  </p>
                  <p className="italic text-[11px]">
                    Direct phone and contact links will appear once claimed by the business owner.
                  </p>
                  <Button
                    onClick={() => setIsClaimModalOpen(true)}
                    size="sm"
                    className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs mt-1"
                  >
                    Claim &bull; Add Official Contact
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <Card className="border border-dashed border-amber-500/40 bg-muted/20">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center gap-2 text-muted-foreground">
                    <Lock className="h-4 w-4 text-amber-500" />
                    Direct Contact Locked
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0 text-xs text-muted-foreground space-y-2">
                  <p className="italic">
                    Click-to-call phone numbers, direct website links, and Google directions are locked.
                  </p>
                  <p className="font-medium text-foreground pt-1">
                    Town: {business.primaryCommunityName || business.city || 'Local Community'}
                  </p>
                </CardContent>
              </Card>
            )}

            {/* Business Owner / Advertising Callout */}
            <Card className="border border-border/80 bg-muted/30">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Megaphone className="h-4 w-4 text-emerald-600" />
                  Are you a local business owner?
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-xs text-muted-foreground">
                <p>
                  List or unlock your business in the Community Hub public directory and app.
                  Up to 80% of listing fees go right back into local community repairs, defibrillators, and tourism events.
                </p>
                <Button variant="outline" size="sm" asChild className="w-full text-xs font-semibold">
                  <Link href="/directory/advertise">Learn Why to Advertise With Us &rarr;</Link>
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>

        </>
      )}

      {/* Footer */}
      <footer className="border-t bg-card py-8 mt-12">
        <div className="container max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-muted-foreground">
          <div className="flex items-center gap-2">
            <Logo className="h-5 w-5 text-emerald-600" />
            <span>&copy; {new Date().getFullYear()} Community Hub &bull; {business.businessName}</span>
          </div>

          <div className="flex items-center gap-4">
            {business.isUnclaimed && (
              <button
                onClick={() => setIsClaimModalOpen(true)}
                className="text-emerald-600 dark:text-emerald-400 font-semibold hover:underline"
              >
                Claim This Listing
              </button>
            )}
            <Link href="/public-directory" className="hover:underline">
              Public Directory
            </Link>
            <Link href="/" className="hover:underline">
              Sign In
            </Link>
            <Link href="/signup/account-type" className="hover:underline">
              Join Free
            </Link>
          </div>
        </div>
      </footer>

      {/* Claim Business Modal */}
      <Dialog open={isClaimModalOpen} onOpenChange={setIsClaimModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg">
              <Store className="h-5 w-5 text-emerald-600" />
              Claim {business.businessName}
            </DialogTitle>
            <DialogDescription className="text-xs">
              Take ownership of this business profile in <strong>{business.primaryCommunityName || business.city || 'your community'}</strong>.
            </DialogDescription>
          </DialogHeader>

          {!user ? (
            <div className="space-y-4 py-3">
              <div className="p-4 rounded-xl border bg-muted/40 text-xs text-muted-foreground space-y-2">
                <p>
                  To protect business owners from unauthorized claims, you must be signed in with an authorized account.
                </p>
                <p className="font-medium text-foreground">
                  Create a free business account or sign in to verify your ownership.
                </p>
              </div>
              <div className="flex flex-col gap-2 pt-2">
                <Button asChild className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold">
                  <Link href={`/?redirect=/public-directory/${business.id}`}>
                    Sign In to Claim Listing
                  </Link>
                </Button>
                <Button asChild variant="outline" className="w-full font-semibold">
                  <Link href={`/signup/business?redirect=/public-directory/${business.id}`}>
                    Register Free Business Account
                  </Link>
                </Button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleClaimSubmit} className="space-y-4 py-2">
              <div className="space-y-1.5">
                <Label htmlFor="claim-name" className="text-xs font-semibold">Your Full Name</Label>
                <Input
                  id="claim-name"
                  value={claimName}
                  onChange={(e) => setClaimName(e.target.value)}
                  placeholder="e.g. John MacDonald"
                  required
                  className="h-9 text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="claim-email" className="text-xs font-semibold">Business / Contact Email</Label>
                <Input
                  id="claim-email"
                  type="email"
                  value={claimEmail}
                  onChange={(e) => setClaimEmail(e.target.value)}
                  placeholder="e.g. owner@business.co.uk"
                  required
                  className="h-9 text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="claim-phone" className="text-xs font-semibold">Contact Phone Number</Label>
                <Input
                  id="claim-phone"
                  type="tel"
                  value={claimPhone}
                  onChange={(e) => setClaimPhone(e.target.value)}
                  placeholder="e.g. 01479 000000"
                  required
                  className="h-9 text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="claim-role" className="text-xs font-semibold">Your Relationship to this Business</Label>
                <select
                  id="claim-role"
                  value={claimRole}
                  onChange={(e) => setClaimRole(e.target.value)}
                  className="w-full h-9 rounded-md border border-input bg-background px-3 text-xs shadow-xs focus:outline-none focus:ring-1 focus:ring-ring"
                  required
                >
                  <option value="Business Owner">Business Owner</option>
                  <option value="General Manager">General Manager / Director</option>
                  <option value="Authorized Representative">Authorized Marketing / PR Representative</option>
                </select>
              </div>

              <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-[11px] text-emerald-800 dark:text-emerald-300 space-y-1">
                <div className="font-semibold flex items-center gap-1.5">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                  Includes Instant 14-Day Free Live Trial
                </div>
                <p className="text-[10px] text-muted-foreground leading-normal">
                  Your listing will be instantly activated. You can edit your opening hours, upload photos, and update contact info immediately.
                </p>
              </div>

              <DialogFooter className="pt-2 gap-2 sm:gap-0">
                <Button type="button" variant="outline" size="sm" onClick={() => setIsClaimModalOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" size="sm" disabled={isClaiming} className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold">
                  {isClaiming ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <UserCheck className="mr-1.5 h-3.5 w-3.5" />}
                  Confirm Ownership &amp; Activate
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Seeded Unclaimed Listing & SEO Dialog (Only visible for platform-seeded unclaimed listings) */}
      {canEditSeededListing && (
        <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Pencil className="h-5 w-5 text-amber-500" />
                Edit Unclaimed Listing &amp; SEO
              </DialogTitle>
              <DialogDescription>
                Only platform-seeded unclaimed listings can be edited here. Once claimed by its owner, this editor is locked.
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleSaveUnclaimedEdit} className="space-y-4 py-2">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1">
                  <Label htmlFor="edit-biz-name" className="text-xs font-semibold">Business Name</Label>
                  <Input id="edit-biz-name" value={editName} onChange={(e) => setEditName(e.target.value)} required className="h-9 text-xs" />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="edit-biz-cat" className="text-xs font-semibold">Category</Label>
                  <Input id="edit-biz-cat" value={editCategory} onChange={(e) => setEditCategory(e.target.value)} required className="h-9 text-xs" />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="edit-biz-pc" className="text-xs font-semibold">Postcode</Label>
                  <Input id="edit-biz-pc" value={editPostcode} onChange={(e) => setEditPostcode(e.target.value)} required className="h-9 text-xs uppercase" />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label htmlFor="edit-biz-cover" className="text-xs font-semibold">Cover Image URL</Label>
                  <div className="flex gap-2">
                    <Input id="edit-biz-cover" value={editCoverUrl} onChange={(e) => setEditCoverUrl(e.target.value)} className="h-9 text-xs" />
                    <label className="inline-flex items-center justify-center rounded-md border px-3 text-xs font-medium cursor-pointer hover:bg-muted shrink-0">
                      {isUploadingEditCover ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
                      <input type="file" accept="image/*" className="hidden" onChange={handleEditCoverUpload} disabled={isUploadingEditCover} />
                    </label>
                  </div>
                </div>
                <div className="space-y-1">
                  <Label htmlFor="edit-biz-alt" className="text-xs font-semibold">Cover Image ALT Tag</Label>
                  <Input id="edit-biz-alt" value={editImageAlt} onChange={(e) => setEditImageAlt(e.target.value)} className="h-9 text-xs" />
                </div>
              </div>

              <div className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <Label htmlFor="edit-biz-mtitle" className="font-semibold">Meta Title</Label>
                  <span className="text-[10px] text-muted-foreground">{editMetaTitle.length}/60 chars</span>
                </div>
                <Input id="edit-biz-mtitle" value={editMetaTitle} onChange={(e) => setEditMetaTitle(e.target.value)} className="h-9 text-xs" />
              </div>

              <div className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <Label htmlFor="edit-biz-mdesc" className="font-semibold">Meta Description</Label>
                  <span className="text-[10px] text-muted-foreground">{editMetaDesc.length}/160 chars</span>
                </div>
                <Textarea id="edit-biz-mdesc" rows={2} value={editMetaDesc} onChange={(e) => setEditMetaDesc(e.target.value)} className="text-xs" />
              </div>

              <div className="space-y-2 pt-2 border-t">
                <Label className="text-xs font-semibold">Page Headings (H1 to H6)</Label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <Label htmlFor="edit-h1" className="text-[11px] text-muted-foreground">H1 (Main Title)</Label>
                    <Input id="edit-h1" value={editH1} onChange={(e) => setEditH1(e.target.value)} className="h-8 text-xs" />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="edit-h2" className="text-[11px] text-muted-foreground">H2 (About Section)</Label>
                    <Input id="edit-h2" value={editH2} onChange={(e) => setEditH2(e.target.value)} className="h-8 text-xs" />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="edit-h3" className="text-[11px] text-muted-foreground">H3 (Services / Category)</Label>
                    <Input id="edit-h3" value={editH3} onChange={(e) => setEditH3(e.target.value)} className="h-8 text-xs" />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="edit-h4" className="text-[11px] text-muted-foreground">H4 (Location / Area)</Label>
                    <Input id="edit-h4" value={editH4} onChange={(e) => setEditH4(e.target.value)} className="h-8 text-xs" />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="edit-h5" className="text-[11px] text-muted-foreground">H5 (Claim / Contact)</Label>
                    <Input id="edit-h5" value={editH5} onChange={(e) => setEditH5(e.target.value)} className="h-8 text-xs" />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="edit-h6" className="text-[11px] text-muted-foreground">H6 (Directory Label)</Label>
                    <Input id="edit-h6" value={editH6} onChange={(e) => setEditH6(e.target.value)} className="h-8 text-xs" />
                  </div>
                </div>
              </div>

              <DialogFooter className="pt-2">
                <Button type="button" variant="outline" onClick={() => setIsEditModalOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={isSavingEdit} className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold gap-1.5">
                  {isSavingEdit ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  Save Changes
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
