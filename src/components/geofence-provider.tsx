'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { useUser, useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';
import { useGeofence } from '@/hooks/use-geofence';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Sparkles, BellOff, X } from 'lucide-react';
import { muteCommunityGeofenceAction } from '@/lib/actions/geofenceActions';

export function GeofenceProvider({ children }: { children: React.ReactNode }) {
  const { user } = useUser();
  const db = useFirestore();
  const router = useRouter();
  const { toast } = useToast();

  const userProfileRef = useMemoFirebase(() => {
    if (!user || !db) return null;
    return doc(db, 'users', user.uid);
  }, [user, db]);

  const { data: userProfile } = useDoc(userProfileRef);

  const [currentCommunityId, setCurrentCommunityId] = React.useState<string | null>(null);
  const [localMutedGeofences, setLocalMutedGeofences] = React.useState<string[]>([]);
  const [dismissedGeofences, setDismissedGeofences] = React.useState<string[]>(() => {
    if (typeof window !== 'undefined') {
      try {
        const stored = sessionStorage.getItem('dismissedGeofences');
        return stored ? JSON.parse(stored) : [];
      } catch (e) {
        return [];
      }
    }
    return [];
  });

  const dismissCommunityGeofence = React.useCallback((commId: string) => {
    setDismissedGeofences(prev => {
      if (prev.includes(commId)) return prev;
      const next = [...prev, commId];
      if (typeof window !== 'undefined') {
        sessionStorage.setItem('dismissedGeofences', JSON.stringify(next));
      }
      return next;
    });
  }, []);

  // Synchronize active community ID from session storage or profile
  React.useEffect(() => {
    if (typeof window !== 'undefined') {
      const storedId = sessionStorage.getItem('visitedCommunityId');
      setCurrentCommunityId(storedId || userProfile?.communityId || null);

      // Load local muted geofences from LocalStorage
      const localMuted = localStorage.getItem('mutedGeofences');
      if (localMuted) {
        try {
          setLocalMutedGeofences(JSON.parse(localMuted));
        } catch (e) {
          console.error('Error parsing local muted geofences:', e);
        }
      }
    }
  }, [userProfile]);

  const isGeofenceEnabled = userProfile?.settings?.geofenceEnabled !== false;
  const { enteredCommunity, setEnteredCommunity } = useGeofence(currentCommunityId, isGeofenceEnabled);

  // Determine if the detected entry community has been muted or dismissed
  const isMuted = React.useMemo(() => {
    if (!enteredCommunity) return false;
    const profileMuted = userProfile?.mutedGeofences || [];
    return profileMuted.includes(enteredCommunity.id) || localMutedGeofences.includes(enteredCommunity.id) || dismissedGeofences.includes(enteredCommunity.id);
  }, [enteredCommunity, userProfile, localMutedGeofences, dismissedGeofences]);

  // Trigger a device notification if system notifications are allowed
  React.useEffect(() => {
    if (enteredCommunity && !isMuted) {
      if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
        try {
          new Notification(`Welcome to ${enteredCommunity.name}!`, {
            body: `You've entered the ${enteredCommunity.name} community. Tap to view local updates or switch view.`,
            icon: 'https://i.postimg.cc/HnhWpVyt/HubLogo192x192.png',
            tag: `geofence-${enteredCommunity.id}`,
          });
        } catch (e) {
          console.error('System notification error:', e);
        }
      }
    }
  }, [enteredCommunity, isMuted]);

  const handleSwitchCommunity = () => {
    if (!enteredCommunity) return;

    const targetId = enteredCommunity.id;
    const targetName = enteredCommunity.name;

    // Immediately mark as dismissed for this session so popups stop
    dismissCommunityGeofence(targetId);

    if (typeof window !== 'undefined') {
      sessionStorage.setItem('visitedCommunityId', targetId);
    }
    
    setEnteredCommunity(null);
    setCurrentCommunityId(targetId);

    toast({
      title: 'Community Switched',
      description: `Welcome to the ${targetName} community page!`,
    });

    router.push('/home');
    router.refresh();
  };

  const handleMuteCommunity = async () => {
    if (!enteredCommunity) return;

    const targetId = enteredCommunity.id;
    const targetName = enteredCommunity.name;

    dismissCommunityGeofence(targetId);

    // Save to LocalStorage immediately
    const updatedLocal = [...localMutedGeofences, targetId];
    setLocalMutedGeofences(updatedLocal);
    localStorage.setItem('mutedGeofences', JSON.stringify(updatedLocal));

    // Save to Firestore if logged in
    if (user) {
      try {
        await muteCommunityGeofenceAction({ userId: user.uid, communityId: targetId });
      } catch (err) {
        console.error('Failed to sync geofence mute to database:', err);
      }
    }

    toast({
      title: 'Notifications Muted',
      description: `You will no longer receive entry alerts for ${targetName}.`,
    });

    setEnteredCommunity(null);
  };

  const handleDismiss = () => {
    if (enteredCommunity) {
      dismissCommunityGeofence(enteredCommunity.id);
    }
    setEnteredCommunity(null);
  };

  // Only open the dialog if we have a detected community and it's not muted
  const isOpen = !!enteredCommunity && !isMuted;

  return (
    <>
      {children}

      <Dialog open={isOpen} onOpenChange={(open) => { if (!open) handleDismiss(); }}>
        <DialogContent className="max-w-md p-6">
          <DialogHeader className="space-y-3">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-indigo-50 text-indigo-600">
              <Sparkles className="h-6 w-6 animate-pulse" />
            </div>
            <DialogTitle className="text-center text-xl font-bold tracking-tight">
              Welcome to {enteredCommunity?.name}!
            </DialogTitle>
            <DialogDescription className="text-center text-sm leading-relaxed text-muted-foreground">
              You've entered the mapped boundary of the <strong>{enteredCommunity?.name}</strong> community. Would you like to switch to this community to see what's happening here today?
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="flex flex-col sm:flex-row gap-2 mt-4">
            <Button onClick={handleSwitchCommunity} className="w-full sm:flex-1 bg-indigo-600 hover:bg-indigo-700 text-white">
              Yes, Show Me
            </Button>
            <Button variant="outline" onClick={handleDismiss} className="w-full sm:flex-1">
              No, Thanks
            </Button>
          </DialogFooter>

          <div className="mt-4 pt-3 border-t text-center">
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={handleMuteCommunity}
              className="text-xs text-muted-foreground hover:text-destructive flex items-center gap-1.5 mx-auto"
            >
              <BellOff className="h-3.5 w-3.5" />
              Don't show this again for {enteredCommunity?.name}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
