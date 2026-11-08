
'use client';

import Image from "next/image";
import Link from "next/link";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { BusinessStatusBadge } from "./business-status-badge";
import { differenceInDays } from "date-fns";
import { Sparkles } from "lucide-react";

type Business = {
  id: string | number;
  businessName: string;
  businessCategory?: string;
  logoImage?: string;
  shortDescription: string;
  status: "Pending Approval" | "Approved" | "Requires Amendment" | "Declined" | "Subscribed" | "Draft" | "Hidden";
  createdAt?: { toDate: () => Date };
  listingSubscriptionExpiresAt?: { toDate: () => Date };
  leaderCount?: number;
};

export default function BusinessCard({ business }: { business: Business }) {
    const toDate = (timestamp: any): Date | null => {
        if (!timestamp) return null;
        if (typeof timestamp.toDate === 'function') return timestamp.toDate();
        if (timestamp.seconds) return new Date(timestamp.seconds * 1000);
        return null;
    };
    
    const now = new Date();
    const creationDate = toDate(business.createdAt);
    const expiryDate = toDate(business.listingSubscriptionExpiresAt);
    
    const freeExpiry = toDate((business as any).freeListingExpiresAt);
    const isFreeLive = (business as any).isFreeListing && (!freeExpiry || now <= freeExpiry);

    const isUnclaimed = Boolean((business as any).isUnclaimed || (business as any).ownerId === 'platform' || (business as any).claimed === false);

    const isLive = isUnclaimed ||
                   isFreeLive || 
                   (business.status === 'Subscribed' && (!expiryDate || now <= expiryDate)) ||
                   (business.status === 'Approved' && creationDate && differenceInDays(now, creationDate) <= 14);

    const categoryLabel = business.businessCategory
    ? business.businessCategory.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' & ')
    : null;
    
  const isMockCourier = business.id === 'mock-courier-99';
  const communityHasNoLeader = isMockCourier && business.leaderCount === 0;

  const href = isMockCourier ? '/courier/apply' : `/businesses/${business.id}`;
  
  const cardContent = (
      <Card className={cn(
          "overflow-hidden flex flex-col h-full transition-shadow",
          !isLive && !isMockCourier && "opacity-60 bg-muted/50",
          isLive && "hover:shadow-lg",
          isMockCourier && !communityHasNoLeader && "cursor-not-allowed"
      )}>
        <CardHeader className="p-0">
          <div className="relative aspect-video w-full flex items-center justify-center bg-transparent">
            <Image
              src={business.logoImage || "https://picsum.photos/seed/business/600/400"}
              alt={business.businessName || 'Business Logo'}
              fill
              className="object-contain p-4"
              data-ai-hint="company logo"
            />
            {isUnclaimed && (
              <div className="absolute top-2 left-2 z-10">
                <Badge className="bg-amber-500 hover:bg-amber-600 text-white font-bold text-[10px] gap-1 shadow-sm px-2 py-0.5">
                  <Sparkles className="h-3 w-3" /> Unclaimed
                </Badge>
              </div>
            )}
            {!isLive && !isMockCourier && (
              <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                  <BusinessStatusBadge status={business.status} createdAt={business.createdAt} listingSubscriptionExpiresAt={business.listingSubscriptionExpiresAt} />
              </div>
            )}
          </div>
        </CardHeader>
        <CardHeader className="p-4 pt-2">
          <CardTitle className="text-base truncate">{business.businessName}</CardTitle>
          {categoryLabel && <Badge variant="outline" className="w-fit">{categoryLabel}</Badge>}
        </CardHeader>
        <CardContent className="flex-grow p-4 pt-0">
          <p className="text-xs text-muted-foreground line-clamp-2">
            {business.shortDescription}
          </p>
        </CardContent>
        <CardFooter className="p-2 mt-auto">
          <div className="text-sm font-medium text-primary w-full text-center">
              {isMockCourier ? (communityHasNoLeader ? 'Apply Now' : 'Leader Required') 
                : isUnclaimed ? (
                  <span className="text-amber-600 dark:text-amber-400 font-bold flex items-center justify-center gap-1">
                    Claim Business <span aria-hidden="true">&rarr;</span>
                  </span>
                )
                : isLive ? 'View Info'
                : 'Subscription Expired'
              }
          </div>
        </CardFooter>
      </Card>
  );

  if (!isLive && !isMockCourier) {
      return <div className="block h-full cursor-not-allowed">{cardContent}</div>;
  }
  
  if (isMockCourier && !communityHasNoLeader) {
      return <div className="block h-full cursor-not-allowed">{cardContent}</div>;
  }
  
  return (
     <Link href={href} className="block h-full">
        {cardContent}
    </Link>
  );
}
