
'use client';

import * as React from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from './ui/button';
import { useUser, useAuth } from '@/firebase';
import { signOut } from 'firebase/auth';
import { acceptTermsAction } from '@/lib/actions/userActions';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';
import Link from 'next/link';

export function CookieConsentDialog() {
  const { user, userProfile, isUserLoading, profileLoading } = useUser();
  const auth = useAuth();
  const { toast } = useToast();

  const [isOpen, setIsOpen] = React.useState(false);
  const [isAccepting, setIsAccepting] = React.useState(false);

  React.useEffect(() => {
    // Show the dialog if the user is loaded, logged in, their profile is loaded,
    // and they have not accepted the terms.
    if (!isUserLoading && !profileLoading && user && userProfile && !userProfile.termsAcceptedAt) {
      setIsOpen(true);
    }
  }, [user, userProfile, isUserLoading, profileLoading]);

  const handleDecline = async () => {
    if (!auth) return;
    setIsOpen(false);
    await signOut(auth);
    // No need to redirect, Firebase auth state change will handle it.
  };

  const handleAccept = async () => {
    if (!user) return;
    setIsAccepting(true);
    const result = await acceptTermsAction({ userId: user.uid, termsField: 'termsAcceptedAt' });
    if (result.success) {
      setIsOpen(false);
      toast({
        title: 'Thank You!',
        description: 'You have accepted the terms and conditions.',
      });
    } else {
      toast({
        title: 'Error',
        description: 'Could not save your preferences. Please try again.',
        variant: 'destructive',
      });
    }
    setIsAccepting(false);
  };

  return (
    <AlertDialog open={isOpen}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Welcome to Community Hub!</AlertDialogTitle>
          <AlertDialogDescription>
            Before you continue, please review and accept our updated Terms of Service and Privacy Policy. Our platform uses cookies to ensure you get the best experience.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <div className="text-sm text-muted-foreground">
            <p>By clicking "Accept", you agree to our use of cookies and our <Link href="/terms" className="underline text-primary">Terms of Service</Link> and <Link href="/privacy" className="underline text-primary">Privacy Policy</Link>. If you decline, you will be logged out.</p>
        </div>
        <AlertDialogFooter>
          <AlertDialogCancel asChild>
            <Button variant="outline" onClick={handleDecline}>Decline & Log Out</Button>
          </AlertDialogCancel>
          <AlertDialogAction asChild>
            <Button onClick={handleAccept} disabled={isAccepting}>
                {isAccepting && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}
                Accept & Continue
            </Button>
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
