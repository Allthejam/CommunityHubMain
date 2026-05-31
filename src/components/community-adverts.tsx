
'use client';
import * as React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from './ui/card';
import { Button } from './ui/button';
import Link from 'next/link';
import { ArrowRight, Loader2, Megaphone, Store, ExternalLink } from 'lucide-react';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { Badge } from './ui/badge';
import Image from 'next/image';
import { mockCommunityAdverts } from '@/lib/mock-data';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ScrollArea } from './ui/scroll-area';
import { differenceInDays } from 'date-fns';


type Advert = {
  id: string | number;
  title: string;
  image?: string;
  business: string;
  businessName?: string;
  shortDescription?: string;
  fullDescription?: string;
  description?: string;
  link?: string;
  status: 'Active' | 'Scheduled' | 'Approved';
  startDate?: { toDate: () => Date };
  endDate?: { toDate: () => Date };
  businessId?: string;
};

const AdvertCard = ({ advert }: { advert: Advert }) => (
    <Dialog>
        <DialogTrigger asChild>
            <Card className="overflow-hidden group cursor-pointer flex flex-col h-full">
                <div className="relative aspect-video w-full bg-muted">
                    {advert.image && (
                        <Image
                            src={advert.image}
                            alt={advert.title}
                            fill
                            className="object-cover transition-transform duration-300 group-hover:scale-105"
                        />
                    )}
                </div>
                <CardHeader>
                    <CardTitle className="text-base truncate">{advert.title}</CardTitle>
                </CardHeader>
                <CardContent className="flex-grow p-4 pt-0">
                    <p className="text-xs text-muted-foreground line-clamp-2">{advert.shortDescription || advert.description}</p>
                </CardContent>
                <CardFooter className="p-4 pt-0 mt-auto">
                    <div className="text-sm font-medium text-primary w-full text-center">
                        Learn More
                    </div>
                </CardFooter>
            </Card>
        </DialogTrigger>
        <DialogContent className="sm:max-w-xl">
            <DialogHeader>
                <DialogTitle>{advert.title}</DialogTitle>
                <DialogDescription>From {advert.businessName || advert.business}</DialogDescription>
            </DialogHeader>
            <ScrollArea className="max-h-[60vh] pr-6">
                <div className="py-4 space-y-4">
                     <div className="relative w-full aspect-video rounded-md overflow-hidden bg-muted">
                        <Image src={advert.image || ''} alt={advert.title} fill className="object-contain p-4" />
                    </div>
                    <div className="prose dark:prose-invert max-w-none" dangerouslySetInnerHTML={{ __html: advert.fullDescription || advert.description || advert.shortDescription || '' }} />
                </div>
            </ScrollArea>
            <DialogFooter className="p-6 pt-4 border-t">
                {advert.businessId ? (
                    <Button asChild>
                        <Link href={`/businesses/${advert.businessId}`}>
                            <Store className="mr-2 h-4 w-4" />
                            Visit Business
                        </Link>
                    </Button>
                ) : (
                    <Button asChild variant="outline">
                        <a href={advert.link || '#'} target="_blank" rel="noopener noreferrer">
                            <ExternalLink className="mr-2 h-4 w-4" />
                            Visit Site
                        </a>
                    </Button>
                )}
            </DialogFooter>
        </DialogContent>
    </Dialog>
);

export function CommunityAdverts({ communityId }: { communityId: string | null }) {
  const db = useFirestore();

  const advertsQuery = useMemoFirebase(() => {
    if (!communityId || !db) return null;
    return query(
      collection(db, 'adverts'),
      where('communityId', '==', communityId),
      where('status', 'in', ['Active', 'Scheduled'])
    );
  }, [db, communityId]);

  const { data: liveAdverts, isLoading: advertsLoading } = useCollection<Advert>(advertsQuery);
  
  const businessesQuery = useMemoFirebase(() => {
      if (!communityId || !db) return null;
      return query(
          collection(db, "businesses"),
          where("primaryCommunityId", "==", communityId)
      );
  }, [db, communityId]);
  const { data: businesses, isLoading: businessesLoading } = useCollection(businessesQuery);


  const advertsToDisplay = React.useMemo(() => {
    if ((!liveAdverts || liveAdverts.length === 0) && (!businesses || businesses.length === 0)) {
      return mockCommunityAdverts;
    }

    const now = new Date();
    const liveBusinessIds = new Set();
    if (businesses) {
        businesses.forEach((business: any) => {
            const toDate = (timestamp: any): Date | null => {
                if (!timestamp) return null;
                if (typeof timestamp.toDate === 'function') return timestamp.toDate();
                if (timestamp.seconds) return new Date(timestamp.seconds * 1000);
                return null;
            };
            
            const creationDate = toDate(business.createdAt);
            const expiryDate = toDate(business.listingSubscriptionExpiresAt);
            
            const isLive = (business.status === 'Subscribed' && (!expiryDate || now <= expiryDate)) ||
                         (business.status === 'Approved' && creationDate && differenceInDays(now, creationDate) <= 14);
            
            if (isLive) {
                liveBusinessIds.add(business.id);
            }
        });
    }

    return (liveAdverts || []).filter(ad => {
        if (!ad.businessId || !liveBusinessIds.has(ad.businessId)) {
            return false;
        }
        
        const startDate = ad.startDate?.toDate ? ad.startDate.toDate() : null;
        const endDate = ad.endDate?.toDate ? ad.endDate.toDate() : null;

        if (ad.status === 'Active') {
            if (endDate && now > endDate) {
                return false; // Expired
            }
            return true;
        }
        
        if (ad.status === 'Scheduled') {
            if (startDate && now >= startDate) {
                if (endDate && now > endDate) {
                    return false; // Expired
                }
                return true; // It's now effectively active
            }
            return false; // Not yet started
        }

        return false;
    });
  }, [liveAdverts, businesses]);
  
  const loading = advertsLoading || businessesLoading;

  if (loading) {
    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2"><Megaphone className="h-6 w-6" /> Community Adverts</CardTitle>
                <CardDescription>Promotions from businesses in your area.</CardDescription>
            </CardHeader>
            <CardContent className="h-48 flex justify-center items-center">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </CardContent>
        </Card>
    );
  }

  if (advertsToDisplay.length === 0) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><Megaphone className="h-6 w-6" /> Community Adverts</CardTitle>
        <CardDescription>Promotions from businesses in your area.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
        {advertsToDisplay.slice(0, 5).map(advert => (
            <AdvertCard key={advert.id} advert={advert as Advert} />
        ))}
        </div>
      </CardContent>
    </Card>
  );
}
