'use client';

import * as React from 'react';
import Image from 'next/image';
import { useParams } from 'next/navigation';
import { useFirestore, useDoc, useCollection, useMemoFirebase } from '@/firebase';
import { doc, collection, query, orderBy } from 'firebase/firestore';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Separator } from '@/components/ui/separator';
import {
  Info,
  Users,
  MapPin,
  Shield,
  Phone,
  Building,
  Calendar,
  Ruler,
  HelpCircle,
} from 'lucide-react';

export default function CommunityAboutPage() {
  const params = useParams();
  const communityId = params.communityId as string;
  const db = useFirestore();

  // Fetch community basic info
  const communityRef = useMemoFirebase(
    () => (communityId && db ? doc(db, 'communities', communityId) : null),
    [communityId, db]
  );
  const { data: community, isLoading: communityLoading } = useDoc(communityRef);

  // Fetch the leader-created about page content
  const profileRef = useMemoFirebase(
    () => (communityId && db ? doc(db, 'community_profiles', communityId) : null),
    [communityId, db]
  );
  const { data: profile, isLoading: profileLoading } = useDoc(profileRef);

  if (communityLoading || profileLoading) {
    return (
      <div className="space-y-6 p-4 md:p-0">
        <Skeleton className="h-64 w-full rounded-lg" />
        <Skeleton className="h-10 w-3/4" />
        <Skeleton className="h-6 w-1/2" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  const communityName = (community as any)?.name || 'Community';
  const hasProfile = profile && (profile.headline || profile.introduction || profile.mainContent);

  if (!hasProfile) {
    return (
      <div className="flex flex-col items-center justify-center py-20 px-4 text-center">
        <Info className="h-16 w-16 text-muted-foreground/40 mb-4" />
        <h1 className="text-2xl font-bold mb-2">About {communityName}</h1>
        <p className="text-muted-foreground max-w-md">
          The community leader hasn't set up the about page for this community yet. Check back later!
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8 px-4 md:px-0 pb-8">
      {/* Banner Image */}
      {profile.bannerImage && (
        <div className="relative w-full h-48 sm:h-64 md:h-80 rounded-xl overflow-hidden shadow-lg">
          <Image
            src={profile.bannerImage}
            alt={profile.bannerImageDescription || `${communityName} banner`}
            fill
            className="object-cover"
            priority
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
          <div className="absolute bottom-4 left-4 sm:bottom-6 sm:left-6">
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-white drop-shadow-lg">
              {communityName}
            </h1>
            {profile.headline && (
              <p className="text-white/90 text-sm sm:text-base mt-1 drop-shadow">
                {profile.headline}
              </p>
            )}
          </div>
        </div>
      )}

      {/* If no banner, show title normally */}
      {!profile.bannerImage && (
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{communityName}</h1>
          {profile.headline && (
            <p className="text-lg text-muted-foreground mt-1">{profile.headline}</p>
          )}
        </div>
      )}

      {/* Stats row */}
      {(profile.population || profile.area || profile.yearEstablished) && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {profile.population && (
            <Card>
              <CardContent className="flex items-center gap-3 p-4">
                <Users className="h-8 w-8 text-primary shrink-0" />
                <div>
                  <p className="text-sm text-muted-foreground">Population</p>
                  <p className="text-lg font-bold">{profile.population}</p>
                </div>
              </CardContent>
            </Card>
          )}
          {profile.area && (
            <Card>
              <CardContent className="flex items-center gap-3 p-4">
                <Ruler className="h-8 w-8 text-primary shrink-0" />
                <div>
                  <p className="text-sm text-muted-foreground">Area</p>
                  <p className="text-lg font-bold">{profile.area}</p>
                </div>
              </CardContent>
            </Card>
          )}
          {profile.yearEstablished && (
            <Card>
              <CardContent className="flex items-center gap-3 p-4">
                <Calendar className="h-8 w-8 text-primary shrink-0" />
                <div>
                  <p className="text-sm text-muted-foreground">Established</p>
                  <p className="text-lg font-bold">{profile.yearEstablished}</p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Introduction */}
      {profile.introduction && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Info className="h-5 w-5" /> About {communityName}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div
              className="prose prose-sm dark:prose-invert max-w-none"
              dangerouslySetInnerHTML={{ __html: profile.introduction }}
            />
          </CardContent>
        </Card>
      )}

      {/* Main Content */}
      {profile.mainContent && (
        <Card>
          <CardContent className="pt-6">
            <div
              className="prose prose-sm dark:prose-invert max-w-none"
              dangerouslySetInnerHTML={{ __html: profile.mainContent }}
            />
          </CardContent>
        </Card>
      )}

      {/* Content images */}
      {(profile.imageOne || profile.imageTwo) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {profile.imageOne && (
            <div className="relative h-64 rounded-lg overflow-hidden shadow">
              <Image
                src={profile.imageOne}
                alt={profile.imageOneDescription || `${communityName} image`}
                fill
                className="object-cover"
              />
            </div>
          )}
          {profile.imageTwo && (
            <div className="relative h-64 rounded-lg overflow-hidden shadow">
              <Image
                src={profile.imageTwo}
                alt={profile.imageTwoDescription || `${communityName} image`}
                fill
                className="object-cover"
              />
            </div>
          )}
        </div>
      )}

      {/* Useful Local Information */}
      {profile.usefulInformation && profile.usefulInformation.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Phone className="h-5 w-5" /> Useful Local Information
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {profile.usefulInformation.map((item: any, index: number) => (
                <div
                  key={index}
                  className="p-3 border rounded-lg bg-muted/30"
                >
                  <p className="font-semibold">{item.name}</p>
                  {item.number && (
                    <p className="text-sm text-muted-foreground">📞 {item.number}</p>
                  )}
                  {item.address && (
                    <p className="text-sm text-muted-foreground">📍 {item.address}</p>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Police / Emergency Contact */}
      {profile.policeContact &&
        (profile.policeContact.stationName ||
          profile.policeContact.officerName ||
          profile.policeContact.contactEmail ||
          profile.policeContact.contactPhone) && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" /> Police / Emergency Contact
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {profile.policeContact.stationName && (
                  <div>
                    <p className="text-sm text-muted-foreground">Station</p>
                    <p className="font-semibold">{profile.policeContact.stationName}</p>
                  </div>
                )}
                {profile.policeContact.officerName && (
                  <div>
                    <p className="text-sm text-muted-foreground">Lead Officer</p>
                    <p className="font-semibold">{profile.policeContact.officerName}</p>
                  </div>
                )}
                {profile.policeContact.contactEmail && (
                  <div>
                    <p className="text-sm text-muted-foreground">Email</p>
                    <p className="font-semibold">{profile.policeContact.contactEmail}</p>
                  </div>
                )}
                {profile.policeContact.contactPhone && (
                  <div>
                    <p className="text-sm text-muted-foreground">Phone</p>
                    <p className="font-semibold">{profile.policeContact.contactPhone}</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

      {/* Leadership Team */}
      {profile.showLeadershipOnAboutPage !== false &&
        profile.communityInformation &&
        profile.communityInformation.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" /> Leadership Team
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                {profile.communityInformation.map((member: any, index: number) => (
                  <div
                    key={index}
                    className="p-4 border rounded-lg bg-muted/30 text-center"
                  >
                    <p className="font-bold">{member.name}</p>
                    {member.title && (
                      <p className="text-sm text-primary">{member.title}</p>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

      {/* Embedded Map */}
      {profile.mapEmbedCode && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5" /> Location
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div
              className="aspect-video w-full rounded-md border overflow-hidden [&_iframe]:!w-full [&_iframe]:!h-full [&_iframe]:!border-0"
              dangerouslySetInnerHTML={{ __html: profile.mapEmbedCode }}
            />
          </CardContent>
        </Card>
      )}

      {/* FAQ Section */}
      {(community as any)?.faqPublished && <FaqSection communityId={communityId} />}
    </div>
  );
}

// Separate component so FAQ data fetching is independent
function FaqSection({ communityId }: { communityId: string }) {
  const db = useFirestore();

  const faqQuery = useMemoFirebase(
    () =>
      communityId && db
        ? query(
            collection(db, 'communities', communityId, 'faqs'),
            orderBy('order', 'asc')
          )
        : null,
    [communityId, db]
  );
  const { data: faqItems, isLoading } = useCollection(faqQuery);

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6 space-y-3">
          <Skeleton className="h-6 w-1/3" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (!faqItems || faqItems.length === 0) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <HelpCircle className="h-5 w-5" /> Frequently Asked Questions
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Accordion type="single" collapsible className="w-full">
          {faqItems.map((item: any) => (
            <AccordionItem key={item.id} value={item.id}>
              <AccordionTrigger className="hover:no-underline text-left">
                <span className="font-semibold">{item.question}</span>
              </AccordionTrigger>
              <AccordionContent>
                <div
                  className="prose prose-sm dark:prose-invert max-w-none"
                  dangerouslySetInnerHTML={{ __html: item.answer }}
                />
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </CardContent>
    </Card>
  );
}
