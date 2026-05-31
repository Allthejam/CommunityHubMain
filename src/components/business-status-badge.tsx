'use client';

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Pencil, Clock, CheckCircle, ShieldAlert, XCircle, EyeOff, Gift, AlertTriangle } from 'lucide-react';
import * as React from 'react';
import { differenceInDays, format, isValid } from "date-fns";
import { Tooltip, TooltipProvider, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";

export type BusinessStatus =
  | "Pending Approval"
  | "Approved"
  | "Requires Amendment"
  | "Declined"
  | "Subscribed"
  | "Draft"
  | "Hidden"
  | "Subscription Expired"
  | "Pending Cancellation"
  | "Payment Failed"
  | "Trial Expired"
  | "Orphaned"
  | "None";

const statusConfig: Record<string, { className: string; text: string; icon: React.ElementType }> = {
    "Draft": { icon: Pencil, text: "Draft", className: "border-dashed" },
    "Pending Approval": { icon: Clock, text: "Pending", className: "bg-yellow-100 text-yellow-800" },
    "Approved": { icon: CheckCircle, text: "Trial", className: "bg-blue-100 text-blue-800" },
    "Trial Expired": { icon: Clock, text: "Trial Expired", className: "bg-orange-100 text-orange-800" },
    "Subscribed": { icon: CheckCircle, text: "Subscribed", className: "bg-green-100 text-green-800" },
    "Requires Amendment": { icon: ShieldAlert, text: "Amendment Req.", className: "bg-orange-100 text-orange-800" },
    "Declined": { icon: XCircle, text: "Declined", className: "bg-red-100 text-red-800" },
    "Hidden": { icon: EyeOff, text: "Hidden", className: "bg-gray-100 text-gray-800" },
    "Subscription Expired": { icon: XCircle, text: "Subscription Expired", className: "bg-red-100 text-red-800" },
    "Pending Cancellation": { icon: Clock, text: "Cancels on", className: "bg-amber-100 text-amber-800" },
    "Payment Failed": { icon: AlertTriangle, text: "Payment Failed", className: "bg-red-100 text-red-800" },
    "Orphaned": { icon: AlertTriangle, text: "Orphaned", className: "bg-destructive text-destructive-foreground animate-pulse" },
    "None": { icon: XCircle, text: "None", className: "bg-muted text-muted-foreground opacity-50" },
};

const toDate = (val: any): Date | null => {
    if (!val) return null;
    if (typeof val.toDate === 'function') return val.toDate();
    if (val.seconds !== undefined) return new Date(val.seconds * 1000);
    const d = new Date(val);
    return isValid(d) ? d : null;
};

const safeFormat = (date: Date | null, formatStr: string) => {
    if (!date || !isValid(date)) return "N/A";
    return format(date, formatStr);
}

export const BusinessStatusBadge = ({ 
    status, 
    listingSubscriptionStatus,
    listingSubscriptionExpiresAt,
    createdAt,
    isFreeListing,
    freeListingExpiresAt,
    amendmentReason,
    now: nowProp
}: { 
    status: BusinessStatus, 
    listingSubscriptionStatus?: 'pending_cancellation' | 'payment_failed',
    listingSubscriptionExpiresAt?: any,
    createdAt?: any,
    isFreeListing?: boolean,
    freeListingExpiresAt?: any,
    amendmentReason?: string,
    now?: Date | null
}) => {
  if (!nowProp) {
      return null;
  }
  
  const now = nowProp;
  let configKey = status as string;
  let displayText = status as string;
  let secondaryText = "";

  if (status === 'Payment Failed') {
      configKey = 'Payment Failed';
      displayText = 'Payment Failed';
  } else if (status === 'Orphaned') {
      configKey = 'Orphaned';
      displayText = 'Orphaned';
  } else if (status === 'None') {
      configKey = 'None';
      displayText = 'None';
  } else if (isFreeListing) {
    let daysLeftText = '';
    const expiryDate = toDate(freeListingExpiresAt);
    if (expiryDate) {
        const daysLeft = differenceInDays(expiryDate, now);
        daysLeftText = daysLeft >= 0 ? `(${daysLeft}d left)` : '(Expired)';
    }
    return (
        <div className="flex flex-col items-start gap-1">
            <Badge variant="outline" className="gap-1.5 bg-teal-100 text-teal-800 border-teal-200">
                <Gift className="h-3 w-3" />
                Free {daysLeftText}
            </Badge>
        </div>
    );
  } else if (status === 'Pending Cancellation') {
    const expiryDate = toDate(listingSubscriptionExpiresAt);
    if (expiryDate) {
        configKey = 'Pending Cancellation';
        displayText = `Cancels ${safeFormat(expiryDate, 'dd MMM')}`;
    }
  } else if (status === 'Subscribed') {
    const expiryDate = toDate(listingSubscriptionExpiresAt);
    if (expiryDate && now > expiryDate) {
        configKey = "Subscription Expired";
        displayText = "Expired";
    } else if (expiryDate) {
        secondaryText = `Renews ${safeFormat(expiryDate, 'dd MMM')}`;
    }
  } else if (status === 'Approved') {
    const creationDate = toDate(createdAt);
    if (creationDate) {
        const daysSinceCreation = differenceInDays(now, creationDate);
        const trialDaysRemaining = 14 - daysSinceCreation;

        if (trialDaysRemaining > 0) {
          displayText = `Trial (${trialDaysRemaining}d left)`;
          configKey = "Approved";
        } else {
          displayText = "Trial Expired";
          configKey = "Trial Expired";
        }
    }
  }

  const config = statusConfig[configKey] || { className: "", text: displayText, icon: Clock };
  const Icon = config.icon;

  const badgeComponent = (
     <Badge variant="outline" className={cn("gap-1.5", config.className, "dark:bg-opacity-25 whitespace-nowrap")}>
        <Icon className="h-3 w-3" />
        {displayText}
    </Badge>
  );

  return (
    <div className="flex flex-col items-start gap-0.5">
        {status === 'Requires Amendment' && amendmentReason ? (
            <TooltipProvider>
                <Tooltip>
                    <TooltipTrigger asChild>{badgeComponent}</TooltipTrigger>
                    <TooltipContent><p className="max-w-xs text-xs">{amendmentReason}</p></TooltipContent>
                </Tooltip>
            </TooltipProvider>
        ) : badgeComponent}
        {secondaryText && (
            <span className="text-[10px] text-muted-foreground ml-1 font-medium">{secondaryText}</span>
        )}
    </div>
  );
};