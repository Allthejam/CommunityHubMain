
'use client';

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Pencil, Clock, CheckCircle, ShieldAlert, XCircle, EyeOff, Gift } from 'lucide-react';
import * as React from 'react';
import { differenceInDays, format } from 'date-fns';

export type BusinessStatus =
  | "Pending Approval"
  | "Approved"
  | "Requires Amendment"
  | "Declined"
  | "Subscribed"
  | "Draft"
  | "Hidden"
  | "Subscription Expired"
  | "Pending Cancellation";

const statusConfig: Record<BusinessStatus, { className: string; text: string; icon: React.ElementType }> = {
    "Draft": { icon: Pencil, text: "Draft", className: "border-dashed" },
    "Pending Approval": { icon: Clock, text: "Pending", className: "bg-yellow-100 text-yellow-800" },
    "Approved": { icon: CheckCircle, text: "Trial", className: "bg-blue-100 text-blue-800" },
    "Subscribed": { icon: CheckCircle, text: "Subscribed", className: "bg-green-100 text-green-800" },
    "Requires Amendment": { icon: ShieldAlert, text: "Amendment Req.", className: "bg-orange-100 text-orange-800" },
    "Declined": { icon: XCircle, text: "Declined", className: "bg-red-100 text-red-800" },
    "Hidden": { icon: EyeOff, text: "Hidden", className: "bg-gray-100 text-gray-800" },
    "Subscription Expired": { icon: XCircle, text: "Subscription Expired", className: "bg-red-100 text-red-800" },
    "Pending Cancellation": { icon: Clock, text: "Cancels on", className: "bg-amber-100 text-amber-800" },
};

export const BusinessStatusBadge = ({ 
    status, 
    listingSubscriptionStatus,
    storefrontSubscriptionStatus,
    listingSubscriptionExpiresAt,
    storefrontSubscriptionExpiresAt,
    createdAt,
    isFreeListing,
    freeListingExpiresAt,
}: { 
    status: BusinessStatus, 
    listingSubscriptionStatus?: 'pending_cancellation',
    storefrontSubscriptionStatus?: 'pending_cancellation',
    listingSubscriptionExpiresAt?: { toDate: () => Date },
    storefrontSubscriptionExpiresAt?: { toDate: () => Date },
    createdAt?: { toDate: () => Date },
    isFreeListing?: boolean,
    freeListingExpiresAt?: { toDate: () => Date },
}) => {
  let currentStatus = status;
  let config = statusConfig[status] || { className: "", text: status, icon: Clock };
  let displayText = config.text;
  
  if (isFreeListing) {
    let expiryText = '';
    if (freeListingExpiresAt) {
        const daysLeft = differenceInDays(freeListingExpiresAt.toDate(), new Date());
        if (daysLeft > 0) {
            expiryText = `(${daysLeft}d left)`;
        } else {
            expiryText = '(Expired)';
        }
    }
    config = { icon: Gift, text: `Free ${expiryText}`, className: "bg-teal-100 text-teal-800" };
    displayText = config.text;
  } else if (listingSubscriptionStatus === 'pending_cancellation' && listingSubscriptionExpiresAt) {
    displayText = `List: Cancels ${format(listingSubscriptionExpiresAt.toDate(), 'dd MMM')}`;
    config = statusConfig['Pending Cancellation'];
  } else if (storefrontSubscriptionStatus === 'pending_cancellation' && storefrontSubscriptionExpiresAt) {
    displayText = `Store: Cancels ${format(storefrontSubscriptionExpiresAt.toDate(), 'dd MMM')}`;
    config = statusConfig['Pending Cancellation'];
  } else if (status === 'Subscribed' && listingSubscriptionExpiresAt) {
    if (new Date() > listingSubscriptionExpiresAt.toDate()) {
        currentStatus = "Subscription Expired";
        displayText = "Expired";
        config = statusConfig[currentStatus];
    }
  } else if (status === 'Approved' && createdAt) {
    const now = new Date();
    const creationDate = createdAt.toDate();
    const daysSinceCreation = differenceInDays(now, creationDate);
    const trialDaysRemaining = 14 - daysSinceCreation;

    if (trialDaysRemaining > 0) {
      displayText = `Trial (${trialDaysRemaining}d left)`;
    } else {
      displayText = "Trial Expired";
      currentStatus = "Declined";
      config = statusConfig[currentStatus];
    }
  }

  const Icon = config.icon;

  return (
    <Badge variant="outline" className={cn("gap-1.5", config.className, "dark:bg-opacity-25", `dark:${config.className.replace('bg-', 'bg-opacity-25-')}`)}>
        <Icon className="h-3 w-3" />
        {displayText}
    </Badge>
  );
};
