
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
import { Crown, Sparkles, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Separator } from './ui/separator';
import { getShowHomeCommunityIdAction } from '@/lib/actions/communityActions';
import { updateUserCommunityAction } from '@/lib/actions/userActions';
import { useRouter } from 'next/navigation';

export function WelcomeDialog({ userProfile }: { userProfile: any }) {
  const { user } = useUser();
  const [isOpen, setIsOpen] = React.useState(false);
  const { toast } = useToast();
  const router = useRouter();

  const [isVisiting, setIsVisiting] = React.useState(false);

  React.useEffect(() => {
    if (!userProfile.hasSeenWelcome) {
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

  const handleVisitShowHome = async () => {
    if (!user) return;
    setIsVisiting(true);
    try {
        const result = await getShowHomeCommunityIdAction();
        if (result.id) {
            const switchResult = await updateUserCommunityAction({ userId: user.uid, communityId: result.id });
            if (switchResult.success) {
                toast({ title: "Welcome to the Show Home!", description: "You are now viewing the demo community." });
                await handleClose(); // Ensure hasSeenWelcome is set
                router.push('/home');
                setTimeout(() => window.location.reload(), 500); 
            } else {
                throw new Error(switchResult.error);
            }
        } else {
            throw new Error(result.error || "Could not find the show home community.");
        }
    } catch (error: any) {
        toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } finally {
        setIsVisiting(false);
    }
  };

  const ShowHomeInvite = () => (
      <div className="pt-4 mt-4 border-t">
          <h4 className="font-semibold text-foreground flex items-center gap-2"><Sparkles className="h-5 w-5 text-primary"/>Explore a Demo Community</h4>
          <p className="text-sm text-muted-foreground mt-2">To see what's possible with your new hub, we invite you to take a tour of our 'Show Home' community. It's packed with examples of content and features.</p>
          <Button size="sm" variant="outline" className="mt-3" onClick={handleVisitShowHome} disabled={isVisiting}>
              {isVisiting ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Sparkles className="mr-2 h-4 w-4" />}
              Visit the Show Home
          </Button>
      </div>
  );

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
              <ShowHomeInvite />
            </div>
          </>
        );
      case 'business':
      case 'enterprise':
        return (
          <>
            <DialogTitle className="flex items-center gap-2 text-2xl">
              <Sparkles className="h-6 w-6 text-primary" />
               {userProfile.accountType === 'business' ? 'Welcome to the Business Hub!' : 'Welcome to the Enterprise Hub!'}
            </DialogTitle>
            <DialogDescription>
              Let's get your business set up and ready to connect with the community.
            </DialogDescription>
            <div className="py-4 text-sm text-muted-foreground space-y-4">
               <p>
                Head over to the <Link href={userProfile.accountType === 'business' ? "/business/dashboard" : "/enterprise/dashboard"} className="text-primary font-semibold hover:underline" onClick={handleClose}>{userProfile.accountType === 'business' ? 'Business' : 'Enterprise'} Dashboard</Link> to create your listing, open a storefront, and start creating adverts and events.
              </p>
               <ShowHomeInvite />
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
