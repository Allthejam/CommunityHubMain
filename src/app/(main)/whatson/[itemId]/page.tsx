"use client";

import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { doc } from "firebase/firestore";
import { useFirestore, useDoc, useMemoFirebase } from "@/firebase";
import {
  ArrowLeft,
  Loader2,
  Clock,
  MapPin,
  Phone,
  Mail,
  Globe,
  Share2,
  ExternalLink,
  Building2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

type WhatsonItem = {
  id: string;
  title: string;
  category: string;
  image?: string;
  dataAiHint?: string;
  description: string;
  openingHours?: any;
  address?: string;
  website?: string;
  social?: string;
  email?: string;
  phone?: string;
  businessName?: string;
};

const OpeningHoursDisplay = ({ hours }: { hours: any }) => {
  if (!hours) return null;
  const days = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];
  return (
    <div className="space-y-2">
      {days.map((day) => {
        const dayData = hours[day];
        if (!dayData) return null;
        const displayTime = dayData.closed ? "Closed" : `${dayData.open} - ${dayData.close}`;
        return (
          <div key={day} className="flex justify-between text-sm py-1 border-b border-border/40 last:border-0">
            <span className="capitalize font-medium text-foreground">{day}</span>
            <span className={dayData.closed ? "text-destructive font-medium" : "text-muted-foreground"}>
              {displayTime}
            </span>
          </div>
        );
      })}
    </div>
  );
};

export default function WhatsonDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { itemId } = params;
  const db = useFirestore();

  const itemRef = useMemoFirebase(() => {
    if (!itemId || !db) return null;
    return doc(db, "whatson", itemId as string);
  }, [itemId, db]);

  const { data: item, isLoading: loading } = useDoc<WhatsonItem>(itemRef);

  if (loading) {
    return (
      <div className="container max-w-4xl py-12 flex justify-center items-center min-h-[50vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!item) {
    return (
      <div className="container max-w-4xl py-12 text-center space-y-4">
        <h2 className="text-2xl font-bold">Listing Not Found</h2>
        <p className="text-muted-foreground">The What&apos;s On listing you are looking for may have been removed or is no longer available.</p>
        <Button asChild variant="outline">
          <Link href="/whatson">
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to What&apos;s On
          </Link>
        </Button>
      </div>
    );
  }

  const mapQuery = item.address || item.title;
  const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(mapQuery)}`;

  return (
    <div className="container max-w-4xl py-8 space-y-6">
      {/* Navigation Bar */}
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="sm" asChild className="gap-2">
          <Link href="/whatson">
            <ArrowLeft className="h-4 w-4" /> Back to What&apos;s On
          </Link>
        </Button>
        <Badge variant="secondary" className="text-sm px-3 py-1 font-medium">
          {item.category}
        </Badge>
      </div>

      {/* Hero Image */}
      {item.image && (
        <div className="relative w-full aspect-video md:aspect-[21/9] rounded-2xl overflow-hidden shadow-md bg-muted border">
          <Image
            src={item.image}
            alt={item.title}
            fill
            className="object-cover"
            priority
          />
        </div>
      )}

      {/* Main Content & Sidebar Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left / Main Column */}
        <div className="lg:col-span-8 space-y-6">
          <div className="space-y-2">
            <h1 className="text-3xl md:text-4xl font-bold tracking-tight font-headline">{item.title}</h1>
            {item.businessName && (
              <p className="text-muted-foreground flex items-center gap-1.5 text-sm">
                <Building2 className="h-4 w-4" /> Hosted by {item.businessName}
              </p>
            )}
          </div>

          <Separator />

          {/* Description */}
          <div className="space-y-3">
            <h3 className="text-xl font-semibold">About</h3>
            <div
              className="text-muted-foreground prose dark:prose-invert max-w-none leading-relaxed"
              dangerouslySetInnerHTML={{ __html: item.description || "" }}
            />
          </div>

          {/* Opening Hours Section if available */}
          {item.openingHours && (
            <>
              <Separator />
              <div className="space-y-4">
                <h3 className="text-xl font-semibold flex items-center gap-2">
                  <Clock className="h-5 w-5 text-primary" /> Opening Hours
                </h3>
                <Card className="bg-muted/30 border">
                  <CardContent className="p-4 md:p-6">
                    <OpeningHoursDisplay hours={item.openingHours} />
                  </CardContent>
                </Card>
              </div>
            </>
          )}
        </div>

        {/* Right / Sidebar Column */}
        <div className="lg:col-span-4 space-y-6">
          <Card className="shadow-sm border">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Location & Contact</CardTitle>
              <CardDescription>Get directions and contact details</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              {item.address && (
                <div className="space-y-2">
                  <div className="flex items-start gap-2.5">
                    <MapPin className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                    <span className="text-muted-foreground leading-snug">{item.address}</span>
                  </div>
                  <Button variant="outline" size="sm" asChild className="w-full gap-2 mt-1">
                    <a href={mapsUrl} target="_blank" rel="noopener noreferrer">
                      <MapPin className="h-4 w-4 text-primary" /> View on Google Maps
                    </a>
                  </Button>
                </div>
              )}

              {item.phone && (
                <div className="flex items-center gap-2.5 pt-2 border-t">
                  <Phone className="h-4 w-4 text-primary shrink-0" />
                  <a href={`tel:${item.phone}`} className="text-primary hover:underline font-medium">
                    {item.phone}
                  </a>
                </div>
              )}

              {item.email && (
                <div className="flex items-center gap-2.5 pt-2 border-t">
                  <Mail className="h-4 w-4 text-primary shrink-0" />
                  <a href={`mailto:${item.email}`} className="text-primary hover:underline font-medium truncate">
                    {item.email}
                  </a>
                </div>
              )}

              {item.website && (
                <div className="pt-2 border-t">
                  <Button variant="default" size="sm" asChild className="w-full gap-2">
                    <a href={item.website} target="_blank" rel="noopener noreferrer">
                      <Globe className="h-4 w-4" /> Visit Official Website
                    </a>
                  </Button>
                </div>
              )}

              {item.social && (
                <div className="pt-1">
                  <Button variant="secondary" size="sm" asChild className="w-full gap-2">
                    <a href={item.social} target="_blank" rel="noopener noreferrer">
                      <Share2 className="h-4 w-4" /> Social Media
                    </a>
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
