
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { seedDatabase, seedBusinesses } from '@/lib/actions/seed';
import { Loader2 } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useUser, useDoc, useMemoFirebase, useFirestore } from '@/firebase';
import { doc } from 'firebase/firestore';

export default function SeedPage() {
  const [isSeeding, setIsSeeding] = useState(false);
  const [isSeedingBusinesses, setIsSeedingBusinesses] = useState(false);
  const { toast } = useToast();
  const { user } = useUser();
  const db = useFirestore();

  const userProfileRef = useMemoFirebase(() => (user ? doc(db, 'users', user.uid) : null), [user, db]);
  const { data: userProfile } = useDoc(userProfileRef);

  const handleSeed = async () => {
    setIsSeeding(true);
    const result = await seedDatabase();
    if (result.success) {
      toast({
        title: 'Database Seeded!',
        description: 'Initial pricing plans have been populated.',
      });
    } else {
      toast({
        title: 'Error Seeding Database',
        description: result.error || 'An unknown error occurred.',
        variant: 'destructive',
      });
    }
    setIsSeeding(false);
  };
  
  const handleSeedBusinesses = async () => {
    if (!userProfile?.communityId) {
        toast({
            title: 'Community Not Found',
            description: 'Could not find your home community to seed businesses into.',
            variant: 'destructive',
        });
        return;
    }
    setIsSeedingBusinesses(true);
    const result = await seedBusinesses({ communityId: userProfile.communityId });
     if (result.success) {
      toast({
        title: 'Businesses Seeded!',
        description: 'Mock business data has been added to your community.',
      });
    } else {
      toast({
        title: 'Error Seeding Businesses',
        description: result.error || 'An unknown error occurred.',
        variant: 'destructive',
      });
    }
    setIsSeedingBusinesses(false);
  }

  if (process.env.NODE_ENV === 'production') {
      return (
          <div className="flex h-screen w-full items-center justify-center">
                <Alert variant="destructive" className="max-w-lg">
                    <AlertTitle>Access Denied</AlertTitle>
                    <AlertDescription>
                        This page is for development purposes only and cannot be accessed in a production environment.
                    </AlertDescription>
                </Alert>
          </div>
      )
  }

  return (
    <div className="flex h-screen w-full items-center justify-center bg-muted/40">
      <div className="max-w-md w-full space-y-4">
        <Card>
            <CardHeader>
            <CardTitle>Seed Pricing Plans</CardTitle>
            <CardDescription>
                This will create the `pricing_plans` collection with default values. This should only be run once.
            </CardDescription>
            </CardHeader>
            <CardFooter>
            <Button onClick={handleSeed} disabled={isSeeding}>
                {isSeeding && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Seed Pricing
            </Button>
            </CardFooter>
        </Card>
         <Card>
            <CardHeader>
            <CardTitle>Seed Businesses</CardTitle>
            <CardDescription>
                Click to populate the Firestore `businesses` collection with 50 mock businesses for your current community ({userProfile?.communityName || '...'})
            </CardDescription>
            </CardHeader>
            <CardFooter>
            <Button onClick={handleSeedBusinesses} disabled={isSeedingBusinesses || !userProfile}>
                {isSeedingBusinesses && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Seed Businesses
            </Button>
            </CardFooter>
        </Card>
      </div>
    </div>
  );
}
