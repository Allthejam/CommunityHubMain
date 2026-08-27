'use client';

import * as React from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter,
} from "@/components/ui/card";
import {
  LayoutDashboard,
  PlusCircle,
  Loader2,
  Megaphone,
  CreditCard,
  Eye,
  Activity,
  AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import Image from "next/image";
import { useUser, useFirestore, useCollection, useMemoFirebase, useDoc } from "@/firebase";
import { doc, collection, query, where } from "firebase/firestore";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

type Advert = {
    id: string;
    title?: string;
    headline?: string;
    status: string;
    type: 'featured' | 'partner';
    image?: string;
    scope?: string;
    createdAt?: any;
    impressions?: number;
    clicks?: number;
};

export default function NationalDashboardPage() {
  const { user, isUserLoading: authLoading } = useUser();
  const db = useFirestore();

  const userProfileRef = useMemoFirebase(() => (user ? doc(db, 'users', user.uid) : null), [user, db]);
  const { data: userProfile, isLoading: profileLoading } = useDoc(userProfileRef, true);

  // Query adverts owned by this user
  const advertsQuery = useMemoFirebase(() => {
    if (!user || !db) return null;
    return query(
        collection(db, "adverts"), 
        where("ownerId", "==", user.uid)
    );
  }, [user, db]);

  const { data: rawAdverts, isLoading: advertsLoading, error: advertsError } = useCollection<Advert>(advertsQuery, undefined, true);

  // Aggregated Stats
  const { impressions, clicks, ctr } = React.useMemo(() => {
    if (!rawAdverts) return { impressions: 0, clicks: 0, ctr: 0 };
    const totals = rawAdverts.reduce((acc, ad) => {
        acc.impressions += (ad.impressions || 0);
        acc.clicks += (ad.clicks || 0);
        return acc;
    }, { impressions: 0, clicks: 0 });
    
    const calculatedCtr = totals.impressions > 0 ? (totals.clicks / totals.impressions) * 100 : 0;
    return { ...totals, ctr: calculatedCtr };
  }, [rawAdverts]);

  // Filter and sort client-side
  const recentAdverts = React.useMemo(() => {
    if (!rawAdverts) return [];
    return [...rawAdverts]
        .filter(ad => ad.scope === 'national' || ad.scope === 'community' || !ad.scope)
        .sort((a, b) => {
            const timeA = a.createdAt?.toMillis?.() || a.createdAt?.seconds || 0;
            const timeB = b.createdAt?.toMillis?.() || b.createdAt?.seconds || 0;
            return timeB - timeA;
        })
        .slice(0, 4);
  }, [rawAdverts]);

  const loading = authLoading || profileLoading || advertsLoading;
  const hasError = !!advertsError;

  if (loading) {
    return (
        <div className="space-y-8 p-8 max-w-7xl mx-auto">
            <Skeleton className="h-12 w-64" />
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
                <Skeleton className="h-32" />
                <Skeleton className="h-32" />
                <Skeleton className="h-32" />
                <Skeleton className="h-32" />
            </div>
            <Skeleton className="h-96" />
        </div>
    );
  }

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold tracking-tight font-headline flex items-center gap-2">
            <LayoutDashboard className="h-8 w-8 text-primary" />
            National Advertiser Dashboard
        </h1>
        <p className="text-muted-foreground">
          Welcome, {userProfile?.name || 'Advertiser'}! Manage your platform-wide campaigns and analytics.
        </p>
      </div>

      {hasError && (
          <Alert variant="default" className="bg-primary/5 border-primary/20">
              <AlertCircle className="h-4 w-4 text-primary" />
              <AlertTitle>Live Data Sync</AlertTitle>
              <AlertDescription>
                  We are currently synchronizing your campaign data. This usually takes a few seconds.
              </AlertDescription>
          </Alert>
      )}

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Active Ads</CardTitle>
            <Megaphone className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{rawAdverts?.filter(ad => ad.status === 'Active').length || 0}</div>
            <p className="text-xs text-muted-foreground">Across targeted regions</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Impressions</CardTitle>
            <Eye className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{impressions.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">Total views across hubs</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Average CTR</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{ctr.toFixed(2)}%</div>
            <p className="text-xs text-muted-foreground">Click-through performance</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Campaigns in Draft</CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{rawAdverts?.filter(ad => ad.status === 'Draft').length || 0}</div>
            <p className="text-xs text-muted-foreground">Ready to launch</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-7">
        <Card className="md:col-span-4">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Recent Campaigns</CardTitle>
              <CardDescription>Your latest advertisements submitted to the platform.</CardDescription>
            </div>
            <Button asChild>
                <Link href="/national/adverts/create">
                    <PlusCircle className="mr-2 h-4 w-4" />
                    New Campaign
                </Link>
            </Button>
          </CardHeader>
          <CardContent>
            {recentAdverts && recentAdverts.length > 0 ? (
                <div className="space-y-4">
                    {recentAdverts.map(ad => (
                        <div key={ad.id} className="flex items-center gap-4 p-3 border rounded-lg hover:bg-muted/50 transition-colors">
                            <div className="relative h-12 w-16 flex-shrink-0 bg-muted rounded overflow-hidden border">
                                {ad.image ? (
                                    <Image src={ad.image} alt={ad.title || ad.headline || ""} fill className="object-cover" />
                                ) : (
                                    <div className="flex items-center justify-center h-full text-[8px] uppercase text-muted-foreground">No Image</div>
                                )}
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="font-semibold truncate">{ad.title || ad.headline || 'Untitled Draft'}</p>
                                <p className="text-xs text-muted-foreground capitalize">{ad.type} Ad &bull; {ad.status}</p>
                            </div>
                            <Button variant="ghost" size="sm" asChild>
                                <Link href={`/national/adverts/create/content?id=${ad.id}&type=${ad.type}`}>
                                    Edit
                                </Link>
                            </Button>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="text-center py-8 text-muted-foreground">
                    <Megaphone className="mx-auto h-8 w-8 mb-2 opacity-50" />
                    <p>No advertisements created yet.</p>
                    <Button variant="outline" size="sm" asChild className="mt-4">
                        <Link href="/national/adverts/create">Create Your First Ad</Link>
                    </Button>
                </div>
            )}
          </CardContent>
          {recentAdverts && recentAdverts.length > 0 && (
              <CardFooter className="border-t px-6 py-4">
                  <Button variant="ghost" className="w-full" asChild>
                      <Link href="/national/adverts">View All Campaigns</Link>
                  </Button>
              </CardFooter>
          )}
        </Card>

        <Card className="md:col-span-3">
          <CardHeader>
            <CardTitle>Company Brand Profile</CardTitle>
            <CardDescription>Your public profile visible across community hubs.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-4">
                <Avatar className="h-16 w-16 border">
                    <AvatarImage src={userProfile?.companyProfile?.logoUrl || userProfile?.photoURL} />
                    <AvatarFallback>{userProfile?.name?.charAt(0) || 'C'}</AvatarFallback>
                </Avatar>
                <div className="space-y-1">
                    <h3 className="font-bold text-lg">{userProfile?.companyProfile?.companyName || userProfile?.name || 'Your Company'}</h3>
                    <p className="text-xs text-muted-foreground line-clamp-1">{userProfile?.companyProfile?.website || 'No website set'}</p>
                    <div className="inline-block px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                        {userProfile?.companyProfile?.status || 'Active Member'}
                    </div>
                </div>
            </div>
            <p className="text-xs text-muted-foreground line-clamp-3">
                {userProfile?.companyProfile?.shortDescription || 'Set up your complete brand biography, video showcase, and social links to build trust with local communities.'}
            </p>
          </CardContent>
          <CardFooter className="border-t px-6 py-4 flex gap-2">
            <Button variant="outline" className="flex-1" asChild>
                <Link href="/national/company-profile">View Profile</Link>
            </Button>
            <Button className="flex-1" asChild>
                <Link href="/national/company-profile/edit">Edit Details</Link>
            </Button>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
