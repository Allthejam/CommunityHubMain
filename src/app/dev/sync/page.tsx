
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { recalculateCommunityCounts, syncCommunityLocationIds } from '@/lib/actions/dataSyncActions';

export default function SyncPage() {
  const [isSyncingCounts, setIsSyncingCounts] = useState(false);
  const [isSyncingLocations, setIsSyncingLocations] = useState(false);
  const { toast } = useToast();

  const handleSyncCounts = async () => {
    setIsSyncingCounts(true);
    const result = await recalculateCommunityCounts();
    if (result.success) {
      toast({
        title: 'Sync Complete!',
        description: result.message || 'Community counts have been updated.',
      });
    } else {
      toast({
        title: 'Error Syncing Data',
        description: result.error || 'An unknown error occurred.',
        variant: 'destructive',
      });
    }
    setIsSyncingCounts(false);
  };

  const handleSyncLocations = async () => {
    setIsSyncingLocations(true);
    const result = await syncCommunityLocationIds();
    if (result.success) {
      toast({
        title: 'Location Sync Complete!',
        description: result.message || 'Community location IDs have been updated.',
      });
    } else {
      toast({
        title: 'Error Syncing Locations',
        description: result.error || 'An unknown error occurred.',
        variant: 'destructive',
      });
    }
    setIsSyncingLocations(false);
  };


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
            <CardTitle>Recalculate Community Counts</CardTitle>
            <CardDescription>
                This action will iterate through all communities and update their `memberCount` and `leaderCount` fields based on the current user data. Use this if you notice a data discrepancy.
            </CardDescription>
            </CardHeader>
            <CardFooter>
            <Button onClick={handleSyncCounts} disabled={isSyncingCounts}>
                {isSyncingCounts && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Run Member Count Sync
            </Button>
            </CardFooter>
        </Card>
        <Card>
            <CardHeader>
                <CardTitle>Sync Community Location IDs</CardTitle>
                <CardDescription>
                    This will iterate through all communities and backfill the `countryId`, `stateId`, and `regionId` fields based on their string names. This is necessary for new location-based features to work correctly.
                </CardDescription>
            </CardHeader>
            <CardFooter>
                <Button onClick={handleSyncLocations} disabled={isSyncingLocations}>
                    {isSyncingLocations && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Run Location ID Sync
                </Button>
            </CardFooter>
        </Card>
      </div>
    </div>
  );
}
