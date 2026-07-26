
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
  storefrontSubscription?: boolean;
  storefrontStripeSubscriptionId?: string;
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

    const isLive = isFreeLive || 
                   (business.status === 'Subscribed' && (!expiryDate || now <= expiryDate)) ||
                   (business.status === 'Approved' && creationDate && differenceInDays(now, creationDate) <= 14);

    const categoryLabel = business.businessCategory
    ? business.businessCategory.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' & ')
    : null;

    const isPremiumPartner = business.storefrontSubscription === true || !!(business as any).storefrontStripeSubscriptionId;
    const isStandardMerchant = business.status === 'Subscribed' && !isPremiumPartner;
    
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
            {!isLive && !isMockCourier && (
              <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                  <BusinessStatusBadge status={business.status} createdAt={business.createdAt} listingSubscriptionExpiresAt={business.listingSubscriptionExpiresAt} />
              </div>
            )}
          </div>
        </CardHeader>
        <CardHeader className="p-4 pt-2">
          <CardTitle className="text-base truncate">{business.businessName}</CardTitle>
          <div className="flex flex-wrap gap-1.5 pt-1">
            {categoryLabel && <Badge variant="outline" className="text-[10px] w-fit">{categoryLabel}</Badge>}
            {isPremiumPartner ? (
              <Badge className="bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white font-bold text-[9px] uppercase tracking-wider border-0 shadow-sm px-2 py-0.5">
                Premium Partner
              </Badge>
            ) : isStandardMerchant ? (
              <Badge className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-[9px] uppercase tracking-wider border-0 px-2 py-0.5">
                Local Merchant
              </Badge>
            ) : (
              <Badge variant="outline" className="bg-emerald-50/50 text-emerald-700 border-emerald-200 font-medium text-[9px] px-2 py-0.5">
                Approved
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="flex-grow p-4 pt-0">
          <p className="text-xs text-muted-foreground line-clamp-2">
            {business.shortDescription}
          </p>
        </CardContent>
        <CardFooter className="p-2 mt-auto">
          <div className="text-sm font-medium text-primary w-full text-center">
              {isMockCourier ? (communityHasNoLeader ? 'Apply Now' : 'Leader Required') 
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
