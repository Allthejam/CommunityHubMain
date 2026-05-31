'use client';

import * as React from "react";
import Link from 'next/link';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Handshake, Loader2, Globe, Mail, Phone, LayoutGrid, List, FilterX } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useUser, useFirestore, useCollection, useMemoFirebase, useDoc } from "@/firebase";
import { collection, query, where, doc } from "firebase/firestore";
import Image from 'next/image';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { differenceInDays } from "date-fns";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

type EnterpriseGroup = {
  id: string;
  businessName: string;
  logoImage?: string;
  shortDescription: string;
  longDescription: string;
  website?: string;
  contactEmail?: string;
  contactNumber?: string;
  status: "Pending Approval" | "Approved" | "Requires Amendment" | "Declined" | "Subscribed" | "Draft";
  listingSubscriptionExpiresAt?: { toDate: () => Date };
  createdAt?: { toDate: () => Date };
  primaryCommunityId: string;
  additionalCommunityIds?: string[];
};

const EnterpriseDialogContent = ({ group }: { group: any }) => (
    <>
        <DialogHeader className="p-6 pb-2">
            <div className="flex items-center gap-4">
                <div className="relative h-16 w-16 flex-shrink-0">
                    <Image
                        src={group.logoImage || "https://picsum.photos/seed/enterprise/400"}
                        alt={group.businessName || group.name}
                        fill
                        className="object-contain"
                    />
                </div>
                <div className="flex-1">
                    <DialogTitle className="text-2xl">{group.businessName || group.name}</DialogTitle>
                    <CardDescription>{group.shortDescription || group.description}</CardDescription>
                </div>
            </div>
        </DialogHeader>
        <div className="grid overflow-y-auto">
            <ScrollArea className="max-h-[60vh] px-6">
                <div className="space-y-4 pr-1 pb-4">
                    <div
                        className="text-sm text-muted-foreground prose dark:prose-invert max-w-none"
                        dangerouslySetInnerHTML={{ __html: group.longDescription || group.description || '' }}
                    />
                    
                    {(group.website || group.contactEmail || group.contactNumber) && <Separator />}
                    
                    {(group.website || group.contactEmail || group.contactNumber) && (
                        <div>
                            <h4 className="font-semibold text-md mb-2">Contact & Links</h4>
                            <div className="space-y-2 text-sm">
                                {group.website && <div className="flex items-center gap-2"><Globe className="h-4 w-4" /><a href={group.website} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">Visit Website</a></div>}
                                {group.contactEmail && <div className="flex items-center gap-2"><Mail className="h-4 w-4" /><a href={`mailto:${group.contactEmail}`} className="text-primary hover:underline">{group.contactEmail}</a></div>}
                                {group.contactNumber && <div className="flex items-center gap-2"><Phone className="h-4 w-4" /><a href={`tel:${group.contactNumber}`} className="text-primary hover:underline">{group.contactNumber}</a></div>}
                            </div>
                        </div>
                    )}
                </div>
            </ScrollArea>
        </div>
        <DialogFooter className="p-6 pt-4 border-t sm:justify-start">
             <Button asChild>
                <Link href={`/businesses/${group.id}`}>View Full Profile</Link>
            </Button>
        </DialogFooter>
    </>
);

export default function EnterprisePage() {
  const { user, isUserLoading: authLoading } = useUser();
  const db = useFirestore();
  const [view, setView] = React.useState('grid');
  const [locationFilter, setLocationFilter] = React.useState('All');

  const userProfileRef = useMemoFirebase(() => (user && db ? doc(db, "users", user.uid) : null), [user, db]);
  const { data: userProfile, isLoading: profileLoading } = useDoc(userProfileRef);
  const communityId = userProfile?.communityId;

  const primaryGroupsQuery = useMemoFirebase(() => {
    if (!communityId || !db) return null;
    return query(
      collection(db, "businesses"),
      where("primaryCommunityId", "==", communityId),
      where("accountType", "==", "enterprise"),
      where("status", "in", ["Approved", "Subscribed"])
    );
  }, [db, communityId]);

  const additionalGroupsQuery = useMemoFirebase(() => {
    if (!communityId || !db) return null;
    return query(
      collection(db, "businesses"),
      where("additionalCommunityIds", "array-contains", communityId),
      where("accountType", "==", "enterprise"),
      where("status", "in", ["Approved", "Subscribed"])
    );
  }, [db, communityId]);

  const { data: primaryGroups, isLoading: primaryLoading } = useCollection<EnterpriseGroup>(primaryGroupsQuery);
  const { data: additionalGroups, isLoading: additionalLoading } = useCollection<EnterpriseGroup>(additionalGroupsQuery);

  const [clientGroups, setClientGroups] = React.useState<{
    local: any[];
    visiting: any[];
    all: any[];
  } | null>(null);

  React.useEffect(() => {
    if (primaryLoading || additionalLoading || profileLoading) return;

    const toDate = (timestamp: any): Date | null => {
        if (!timestamp) return null;
        if (typeof timestamp.toDate === 'function') return timestamp.toDate();
        if (timestamp.seconds) return new Date(timestamp.seconds * 1000);
        return null;
    };

    const getIsLive = (g: EnterpriseGroup) => {
        const now = new Date();
        const creationDate = toDate(g.createdAt);
        const expiryDate = toDate(g.listingSubscriptionExpiresAt);
        return (g.status === 'Subscribed' && (!expiryDate || now <= expiryDate)) ||
               (g.status === 'Approved' && creationDate && differenceInDays(now, creationDate) <= 14);
    };

    const local = (primaryGroups || []).map(g => ({ ...g, isVisiting: false, isLive: getIsLive(g) }));
    const visiting = (additionalGroups || []).filter(g => g.primaryCommunityId !== communityId).map(g => ({ ...g, isVisiting: true, isLive: getIsLive(g) }));

    const combined = Array.from(new Map([...local, ...visiting].map(item => [item.id, item])).values());
    
    // Sort: Live first, then alphabetical
    const sorted = combined.sort((a, b) => {
        const liveA = a.isLive ? 1 : 0;
        const liveB = b.isLive ? 1 : 0;
        if (liveA !== liveB) return liveB - liveA;
        return a.businessName.localeCompare(b.businessName);
    });

    setClientGroups({
        local: sorted.filter(g => !g.isVisiting),
        visiting: sorted.filter(g => g.isVisiting),
        all: sorted
    });
  }, [primaryGroups, additionalGroups, primaryLoading, additionalLoading, profileLoading, communityId]);

  const groupsToDisplay = React.useMemo(() => {
    if (!clientGroups) return [];
    if (locationFilter === 'Local') return clientGroups.local;
    if (locationFilter === 'Visiting') return clientGroups.visiting;
    return clientGroups.all;
  }, [clientGroups, locationFilter]);

  const loading = authLoading || profileLoading || primaryLoading || additionalLoading;
    
  if (loading) {
      return (
          <div className="flex justify-center items-center h-96">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
      );
  }

  return (
    <div className="space-y-8 container mx-auto px-4 py-8">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
            <h1 className="text-3xl font-bold tracking-tight font-headline flex items-center gap-2">
                <Handshake className="h-8 w-8 text-primary" />
                Enterprise Groups
            </h1>
            <p className="text-muted-foreground">
              Discover our valued enterprise partners and groups operating in your community.
            </p>
        </div>
        <div className="flex w-full sm:w-auto flex-col sm:flex-row items-center gap-2">
            <Tabs value={locationFilter} onValueChange={setLocationFilter} className="w-full sm:w-auto">
                <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="All">All</TabsTrigger>
                    <TabsTrigger value="Local">Local</TabsTrigger>
                    <TabsTrigger value="Visiting">Visiting</TabsTrigger>
                </TabsList>
            </Tabs>
            <div className="flex items-center gap-1 rounded-md bg-muted p-1">
                <Button variant={view === 'grid' ? 'default' : 'ghost'} size="icon" onClick={() => setView('grid')}>
                    <LayoutGrid className="h-5 w-5" />
                </Button>
                <Button variant={view === 'list' ? 'default' : 'ghost'} size="icon" onClick={() => setView('list')}>
                    <List className="h-5 w-5" />
                </Button>
            </div>
        </div>
      </div>
        
    {view === 'grid' ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6">
            {groupsToDisplay.length > 0 ? (
                groupsToDisplay.map((group) => {
                    return (
                        <Dialog key={group.id}>
                            <DialogTrigger asChild>
                                <Card className={cn("flex flex-col overflow-hidden transition-shadow cursor-pointer hover:shadow-lg", !group.isLive && "opacity-60")}>
                                    <CardHeader className="p-0">
                                        <div className="relative w-full aspect-video bg-muted flex items-center justify-center p-2">
                                            <Image
                                                src={group.logoImage || "https://picsum.photos/seed/enterprise/600/400"}
                                                alt={group.businessName}
                                                fill
                                                className="object-contain"
                                            />
                                            {group.isVisiting && (
                                                <Badge className="absolute top-2 left-2 bg-blue-500/80 backdrop-blur-sm">Visiting</Badge>
                                            )}
                                        </div>
                                    </CardHeader>
                                    <CardContent className="p-3 flex-grow">
                                        <CardTitle className="text-base line-clamp-1">{group.businessName}</CardTitle>
                                    </CardContent>
                                    <CardFooter className="p-3 pt-0">
                                        {!group.isLive ? (
                                            <Badge variant="outline">Temporary Listing</Badge>
                                        ) : (
                                            <div className="text-xs font-medium text-primary w-full text-center">Learn More</div>
                                        )}
                                    </CardFooter>
                                </Card>
                            </DialogTrigger>
                            <DialogContent className="sm:max-w-xl p-0">
                                <EnterpriseDialogContent group={group} />
                            </DialogContent>
                        </Dialog>
                    );
                })
            ) : (
                <Card className="col-span-full h-48 flex items-center justify-center">
                    <p className="text-muted-foreground">No enterprise groups found matching your selection.</p>
                </Card>
            )}
        </div>
    ) : (
        <div className="space-y-4">
            {groupsToDisplay.length > 0 ? (
                groupsToDisplay.map((group) => {
                    return (
                        <Dialog key={group.id}>
                            <DialogTrigger asChild>
                                <Card className={cn("flex items-center p-4 transition-shadow cursor-pointer hover:shadow-md", !group.isLive && "opacity-60")}>
                                    <div className="relative h-16 w-16 flex-shrink-0 mr-4">
                                        <Image
                                            src={group.logoImage || "https://picsum.photos/seed/enterprise/400"}
                                            alt={group.businessName}
                                            fill
                                            className="object-contain"
                                        />
                                    </div>
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2">
                                            <h3 className="font-semibold">{group.businessName}</h3>
                                            {group.isVisiting && <Badge variant="secondary" className="text-[10px] h-4">Visiting</Badge>}
                                        </div>
                                        <p className="text-sm text-muted-foreground line-clamp-2">{group.shortDescription}</p>
                                    </div>
                                    {!group.isLive ? (
                                        <Badge variant="outline" className="ml-4">Temporary Listing</Badge>
                                    ) : (
                                        <Button variant="secondary" size="sm" className="ml-4">Learn More</Button>
                                    )}
                                </Card>
                            </DialogTrigger>
                            <DialogContent className="sm:max-w-xl p-0">
                                <EnterpriseDialogContent group={group} />
                            </DialogContent>
                        </Dialog>
                    );
                })
            ) : (
                 <Card className="col-span-full h-48 flex items-center justify-center">
                    <p className="text-muted-foreground">No enterprise groups found matching your selection.</p>
                </Card>
            )}
        </div>
    )}

    </div>
  );
}
