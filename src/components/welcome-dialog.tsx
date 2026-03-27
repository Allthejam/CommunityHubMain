'use client';

import * as React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from './ui/button';
import { useUser } from '@/firebase';
import { updateWelcomeStatusAction } from '@/lib/actions/userActions';
import Link from 'next/link';
import { Crown, Sparkles } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export function WelcomeDialog({ userProfile }: { userProfile: any }) {
  const { user } = useUser();
  const [isOpen, setIsOpen] = React.useState(false);
  const { toast } = useToast();

  React.useEffect(() => {
    // Only show if hasSeenWelcome is falsy (false or undefined)
    if (!userProfile.hasSeenWelcome) {
      // A small delay can make the welcome feel less abrupt on first load.
      const timer = setTimeout(() => {
        setIsOpen(true);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [userProfile.hasSeenWelcome]);

  const handleClose = async () => {
    setIsOpen(false);
    if (user) {
      const result = await updateWelcomeStatusAction(user.uid);
      if (!result.success) {
        toast({
          title: "Couldn't save preferences",
          description: 'The welcome message may appear again.',
          variant: 'destructive',
        });
      }
    }
  };

  const renderContent = () => {
    switch (userProfile.accountType) {
      case 'leader':
      case 'president':
        return (
          <>
            <DialogTitle className="flex items-center gap-2 text-2xl">
              <Crown className="h-6 w-6 text-primary" />
              Welcome, Community Leader!
            </DialogTitle>
            <DialogDescription>
              Here are a few steps to get your community hub up and running.
            </DialogDescription>
            <div className="py-4 text-sm text-muted-foreground space-y-4">
              <p>
                We're excited to have you lead the <strong>{userProfile.communityName || 'community'}</strong> hub.
              </p>
              <p>
                To ensure your community can receive revenue and is properly defined on the map, please complete the following onboarding steps:
              </p>
              <ul className="list-disc pl-5 space-y-2">
                <li>Visit the <Link href="/leader/financials" className="text-primary font-semibold hover:underline" onClick={handleClose}>Financials</Link> page to connect your Stripe account for payouts.</li>
                <li>Go to the <Link href="/leader/settings" className="text-primary font-semibold hover:underline" onClick={handleClose}>Settings</Link> page to draw your community's geographical boundary.</li>
              </ul>
            </div>
          </>
        );
      case 'business':
        return (
          <>
            <DialogTitle className="flex items-center gap-2 text-2xl">
              <Sparkles className="h-6 w-6 text-primary" />
              Welcome to the Business Hub!
            </DialogTitle>
            <DialogDescription>
              Let's get your business set up and ready to connect with the community.
            </DialogDescription>
            <div className="py-4 text-sm text-muted-foreground space-y-4">
               <p>
                Head over to the <Link href="/business/dashboard" className="text-primary font-semibold hover:underline" onClick={handleClose}>Business Dashboard</Link> to create your business listing, open a storefront, and start creating adverts and events.
              </p>
            </div>
          </>
        );
      default: // Personal, Reporter, etc.
        return (
          <>
            <DialogTitle className="flex items-center gap-2 text-2xl">
              <Sparkles className="h-6 w-6 text-primary" />
              Welcome to Community Hub!
            </DialogTitle>
            <DialogDescription>
              We're thrilled to have you here.
            </DialogDescription>
            <div className="py-4 text-sm text-muted-foreground space-y-4">
              <p>
                You've joined the <strong>{userProfile.communityName || 'community'}</strong> hub. Take a look around to discover local news, events, and businesses.
              </p>
            </div>
          </>
        );
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) handleClose(); }}>
      <DialogContent>
        <DialogHeader>
          {renderContent()}
        </DialogHeader>
        <DialogFooter>
          <Button onClick={handleClose}>Get Started</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
