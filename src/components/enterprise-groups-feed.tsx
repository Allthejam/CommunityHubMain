
'use client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from './ui/card';
import { mockEnterpriseGroups } from '@/lib/mock-data';
import Image from 'next/image';
import { Button } from './ui/button';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from './ui/select';
import * as React from 'react';
import Link from 'next/link';
import { Building, Loader2, ArrowRight } from 'lucide-react';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, where } from 'firebase/firestore';
import { differenceInDays } from 'date-fns';
import { Badge } from './ui/badge';

type EnterpriseGroup = {
    id: string;
    name: string;
    description: string;
    logoImage?: string;
    logo?: {
        imageUrl: string;
        imageHint: string;
    };
    businessName?: string;
    listingSubscriptionExpiresAt?: { toDate: () => Date };
    status: "Pending Approval" | "Approved" | "Requires Amendment" | "Declined" | "Subscribed" | "Draft";
    createdAt?: { toDate: () => Date };
    accountType?: string;
};


export function EnterpriseGroupsFeed({ communityId }: { communityId: string | null }) {
    const [displayCount, setDisplayCount] = React.useState(2);
    const db = useFirestore();

    const groupsQuery = useMemoFirebase(() => {
        if (!communityId || !db) return null;
        return query(
            collection(db, "businesses"),
            where("primaryCommunityId", "==", communityId),
            where("accountType", "==", "enterprise")
        );
    }, [db, communityId]);

    const { data: liveGroups, isLoading: groupsLoading } = useCollection<EnterpriseGroup>(groupsQuery);
    
    const now = new Date();
    const groupsToDisplay = React.useMemo(() => {
        const sourceData = (liveGroups && liveGroups.length > 0)
            ? liveGroups.map(g => {
                let isExpired = false;
                if (g.status === 'Subscribed' && g.listingSubscriptionExpiresAt) {
                    isExpired = now > g.listingSubscriptionExpiresAt.toDate();
                } else if (g.status === 'Approved' && g.createdAt) {
                    isExpired = differenceInDays(now, g.createdAt.toDate()) > 14;
                }

                return {
                    id: g.id,
                    name: g.businessName || g.name,
                    description: (g as any).shortDescription || '',
                    logo: {
                        imageUrl: g.logoImage || 'https://picsum.photos/seed/enterprise/400/200',
                        imageHint: 'enterprise logo',
                    },
                    isExpired: isExpired,
                }
            })
            : mockEnterpriseGroups.map(g => ({ ...g, isExpired: false }));
        
        return sourceData;
    }, [liveGroups]);
        
    const loading = groupsLoading;

    if (loading) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2"><Building className="h-6 w-6"/>Enterprise Groups</CardTitle>
                    <CardDescription>Partnerships with larger organizations.</CardDescription>
                </CardHeader>
                <CardContent className="flex justify-center items-center h-48">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </CardContent>
            </Card>
        );
    }
    
    if (groupsToDisplay.length === 0) return null;


  return (
    <Card>
      <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
        <div>
            <CardTitle className="flex items-center gap-2"><Building className="h-6 w-6"/>Enterprise Groups</CardTitle>
            <CardDescription>Partnerships with larger organizations.</CardDescription>
        </div>
        <div className="w-full sm:w-auto">
            <Select value={String(displayCount)} onValueChange={(value) => setDisplayCount(Number(value))}>
                <SelectTrigger className="w-full sm:w-[120px]">
                    <SelectValue placeholder="Show..." />
                </SelectTrigger>
                <SelectContent>
                    {[2, 4, 6, 8, 10].map(num => (
                        <SelectItem key={num} value={String(num)}>Show {num}</SelectItem>
                    ))}
                </SelectContent>
            </Select>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {groupsToDisplay.slice(0, displayCount).map(group => (
            <Card key={group.id} className="flex flex-col sm:flex-row items-start gap-4 p-4">
              <div className="relative h-24 w-24 flex-shrink-0">
                {group.logo && (
                  <Image
                    src={group.logo.imageUrl}
                    alt={`${group.name} logo`}
                    fill
                    className="object-contain"
                    data-ai-hint={group.logo.imageHint}
                  />
                )}
              </div>
              <div className="flex flex-col justify-between h-full flex-grow">
                <div>
                  <h3 className="font-semibold text-lg">{group.name}</h3>
                  <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{group.description}</p>
                   {group.isExpired && <Badge variant="destructive" className="mt-2">Temporary Listing</Badge>}
                </div>
                {!group.isExpired && (
                    <Button asChild variant="secondary" size="sm" className="mt-4 w-full sm:w-auto">
                        <Link href={`/businesses/${group.id}`}>View Group</Link>
                    </Button>
                )}
              </div>
            </Card>
          ))}
        </div>
      </CardContent>
      <CardFooter>
        <Button asChild variant="outline">
            <Link href="/enterprise-partners">
                See All Groups <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
        </Button>
      </CardFooter>
    </Card>
  );
}
