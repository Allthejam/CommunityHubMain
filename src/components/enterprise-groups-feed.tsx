
'use client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { mockEnterpriseGroups } from '@/lib/mock-data';
import Image from 'next/image';
import { Button } from './ui/button';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from './ui/select';
import * as React from 'react';
import Link from 'next/link';
import { Building, Loader2 } from 'lucide-react';
import { useUser, useFirestore, useCollection, useMemoFirebase, useDoc } from '@/firebase';
import { collection, query, where, doc } from 'firebase/firestore';

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
}


export function EnterpriseGroupsFeed() {
    const [displayCount, setDisplayCount] = React.useState(2);
    const { user, isUserLoading: authLoading } = useUser();
    const db = useFirestore();

    const userProfileRef = useMemoFirebase(() => (user && db ? doc(db, 'users', user.uid) : null), [user, db]);
    const { data: userProfile, isLoading: profileLoading } = useDoc(userProfileRef);

    const groupsQuery = useMemoFirebase(() => {
        if (!userProfile?.communityId || !db) return null;
        return query(
            collection(db, "businesses"),
            where("primaryCommunityId", "==", userProfile.communityId),
            where("accountType", "==", "enterprise")
        );
    }, [db, userProfile?.communityId]);

    const { data: liveGroups, isLoading: groupsLoading } = useCollection<EnterpriseGroup>(groupsQuery);
    
    const groupsToDisplay = (liveGroups && liveGroups.length > 0)
        ? liveGroups.map(g => ({
            id: g.id,
            name: g.businessName || g.name,
            description: (g as any).shortDescription || '',
            logo: {
                imageUrl: g.logoImage || 'https://picsum.photos/seed/enterprise/400/200',
                imageHint: 'enterprise logo',
            },
        }))
        : mockEnterpriseGroups;
        
    const loading = authLoading || profileLoading || groupsLoading;

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
                </div>
                <Button asChild variant="secondary" size="sm" className="mt-4 w-full sm:w-auto">
                  <Link href={`/businesses/${group.id}`}>View Group</Link>
                </Button>
              </div>
            </Card>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
