
'use client';

import Image from "next/image";
import Link from "next/link";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

type Business = {
  id: string | number;
  businessName: string;
  businessCategory?: string;
  logoImage?: string;
  shortDescription: string;
  status: "Pending Approval" | "Approved" | "Requires Amendment" | "Declined" | "Subscribed" | "Draft";
};

export default function BusinessCard({ business }: { business: Business }) {
  const isApproved = business.status === 'Approved' || business.status === 'Subscribed';
  const categoryLabel = business.businessCategory
    ? business.businessCategory.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' & ')
    : null;
    
  return (
    <Card className="overflow-hidden flex flex-col h-full cursor-pointer hover:shadow-lg transition-shadow">
      <CardHeader className="p-0">
        <div className="relative aspect-video w-full flex items-center justify-center bg-transparent">
          <Image
            src={business.logoImage || "https://picsum.photos/seed/business/600/400"}
            alt={business.businessName || 'Business Logo'}
            fill
            className="object-contain p-4"
            data-ai-hint="company logo"
          />
          {!isApproved && (
            <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                <Badge variant="secondary">Awaiting Approval</Badge>
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
            View Info
        </div>
      </CardFooter>
    </Card>
  );
}
