'use client';

import * as React from 'react';
import Link from 'next/link';
import Image from 'next/image';
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
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Logo } from '@/components/icons';
import type { PublicBusinessDetail } from '@/lib/actions/publicDirectoryActions';

const DAYS_OF_WEEK = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'] as const;

export function PublicBusinessProfileView({ business }: { business: PublicBusinessDetail }) {
  const [copied, setCopied] = React.useState(false);

  const handleShare = () => {
    if (typeof window !== 'undefined') {
      navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
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
              className="text-xs gap-1.5"
            >
              <Share2 className="h-3.5 w-3.5" />
              <span>{copied ? 'Link Copied!' : 'Share'}</span>
            </Button>

            {business.isLive ? (
              <Button
                size="sm"
                asChild
                className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs gap-1.5"
              >
                <Link href={`/businesses/${business.id}`}>
                  <Store className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Open in App</span>
                  <span className="sm:hidden">App</span>
                </Link>
              </Button>
            ) : (
              <Button
                size="sm"
                asChild
                className="bg-amber-600 hover:bg-amber-700 text-white text-xs gap-1.5 font-semibold"
              >
                <Link href="/directory/advertise">
                  <Sparkles className="h-3.5 w-3.5" />
                  <span>Reactivate Listing</span>
                </Link>
              </Button>
            )}
          </div>
        </div>
      </header>

      {/* Prominent Inactive Subscription Notice Bar (if not live) */}
      {!business.isLive && (
        <div className="bg-amber-500/10 border-b border-amber-500/30 px-4 py-3.5">
          <div className="container max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 text-xs sm:text-sm">
            <div className="flex items-center gap-2 text-amber-800 dark:text-amber-300 font-medium">
              <Lock className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
              <span>
                <strong>Subscription Expired / Inactive:</strong> Direct contact links, opening hours schedule, and photo showcases are locked until renewed.
              </span>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Button asChild size="sm" className="bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold h-8">
                <Link href="/directory/advertise">
                  Owner? Reactivate for £20/mo &rarr;
                </Link>
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Hero Banner Section */}
      <div className="relative w-full bg-muted/40 border-b">
        <div className="h-48 sm:h-64 md:h-80 w-full relative overflow-hidden bg-gradient-to-r from-emerald-800/20 via-teal-800/20 to-slate-800/30">
          {business.bannerImage ? (
            <Image
              src={business.bannerImage}
              alt={business.businessName}
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
                    alt={business.businessName}
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
                  ) : (
                    <Badge variant="outline" className="border-amber-500/40 text-amber-700 dark:text-amber-400 bg-amber-500/10 text-xs">
                      <Lock className="h-3 w-3 mr-1 text-amber-600" />
                      Locked Listing &bull; Inactive
                    </Badge>
                  )}
                </div>

                <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold tracking-tight font-headline">
                  {business.businessName}
                </h1>

                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs sm:text-sm text-muted-foreground pt-0.5">
                  <div className="flex items-center gap-1.5">
                    <MapPin className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                    <span>
                      {business.primaryCommunityName || business.city || 'Local Community'}
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

            {/* Quick Action Buttons (Active vs Locked) */}
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
                      <Button asChild className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold shadow-md text-xs sm:text-sm">
                        <Link href="/directory/advertise">
                          <Sparkles className="mr-1.5 h-4 w-4" />
                          Are You The Business Owner? Reactivate For £20/mo
                        </Link>
                      </Button>
                      <Button asChild variant="outline" size="sm" className="text-xs">
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
                              alt={`Feature ${idx + 1}`}
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

            {/* Page 3 Content (Only for live businesses) */}
            {business.isLive && business.pageThreeContent && (
              <Card className="border shadow-sm">
                <CardHeader>
                  <CardTitle className="text-lg">Additional Information</CardTitle>
                </CardHeader>
                <CardContent>
                  <div
                    className="prose dark:prose-invert max-w-none text-sm text-muted-foreground leading-relaxed"
                    dangerouslySetInnerHTML={{ __html: business.pageThreeContent }}
                  />
                </CardContent>
              </Card>
            )}

            {/* Resident Conversion Banner in Main Feed */}
            <div className="p-6 rounded-2xl bg-gradient-to-r from-emerald-500/10 via-teal-500/10 to-transparent border border-emerald-500/30 space-y-3">
              <div className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                <h3 className="font-bold text-base">Are you a local resident?</h3>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Unlock exclusive member benefits for <strong>{business.businessName}</strong>, including local courier delivery,
                exclusive resident discounts, community notices, and direct messaging with store owners.
              </p>
              <div className="pt-1 flex flex-wrap items-center gap-3">
                <Button size="sm" asChild className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs">
                  <Link href="/signup/account-type">Join Community Hub (Free)</Link>
                </Button>
                {business.isLive && (
                  <Button variant="outline" size="sm" asChild className="text-xs">
                    <Link href={`/businesses/${business.id}`}>Open Full Profile in App</Link>
                  </Button>
                )}
                <Button variant="ghost" size="sm" asChild className="text-xs text-muted-foreground">
                  <Link href="/directory/advertise">Learn Why Businesses Advertise With Us</Link>
                </Button>
              </div>
            </div>
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

      {/* Footer */}
      <footer className="border-t bg-card py-8 mt-12">
        <div className="container max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-muted-foreground">
          <div className="flex items-center gap-2">
            <Logo className="h-5 w-5 text-emerald-600" />
            <span>&copy; {new Date().getFullYear()} Community Hub &bull; {business.businessName}</span>
          </div>

          <div className="flex items-center gap-4">
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
    </div>
  );
}
