
'use client';

import { useMemo, useState } from 'react';
import { useFirestore, useDoc, useMemoFirebase, useUser } from '@/firebase';
import { collection, query, where, limit, doc } from 'firebase/firestore';
import { Alert, AlertDescription, AlertTitle } from './ui/alert';
import { Button } from './ui/button';
import { Crown, DollarSign, TrendingUp, Sparkles, CheckCircle, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger, DialogClose } from './ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { claimCommunityLeadershipAction } from '@/lib/actions/communityActions';
import { useRouter } from 'next/navigation';

type NoLeaderAlertProps = {
  communityId: string | null | undefined;
  userProfile?: any;
};

export function NoLeaderAlert({ communityId, userProfile }: NoLeaderAlertProps) {
  const db = useFirestore();
  const { user } = useUser();
  const { toast } = useToast();
  const router = useRouter();
  const [isClaiming, setIsClaiming] = useState(false);

  const communityRef = useMemoFirebase(() => {
    if (!communityId || !db) return null;
    return doc(db, 'communities', communityId);
  }, [communityId, db]);
  
  const { data: community, isLoading } = useDoc(communityRef);

  const handleClaimLeadership = async () => {
    if (!user || !communityId) {
        toast({ title: "Error", description: "You must be logged in to claim a community.", variant: "destructive"});
        return;
    }
    setIsClaiming(true);
    const result = await claimCommunityLeadershipAction({ userId: user.uid, communityId });
    if (result.success) {
        toast({ title: "Congratulations!", description: "You are now the leader of this community. Redirecting to your new dashboard..." });
        router.push('/leader/dashboard');
    } else {
        toast({ title: "Error", description: result.error, variant: "destructive" });
    }
    setIsClaiming(false);
  }

  // Determine if the current user is a leader of the specific community being viewed.
  const isLeaderOfThisCommunity = userProfile && communityId && (
    (userProfile.role === 'president' && userProfile.homeCommunityId === communityId) || 
    (userProfile.communityRoles && userProfile.communityRoles[communityId]?.role === 'president')
  );

  // Don't show the alert if data is loading, the community doesn't exist, it already has a leader,
  // or if the current user is already the leader of this community.
  if (isLoading || !community || (community.leaderCount || 0) > 0 || isLeaderOfThisCommunity) {
    return null;
  }
  
  // Also don't show to national advertisers who might be viewing the community.
  if (userProfile?.accountType === 'national' || userProfile?.accountType === 'advertiser') {
      return null;
  }

  return (
    <Alert className="mb-6 bg-primary/5 border-primary/20">
        <Crown className="h-4 w-4 text-primary" />
        <AlertTitle className="font-bold text-primary">This Community Needs a Leader!</AlertTitle>
        <AlertDescription className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
           <p>This community hub is currently without a designated leader. Step up to manage content, guide discussions, and help your community thrive.</p>
           <div className="flex gap-2 self-end sm:self-center flex-shrink-0">
             <Dialog>
                <DialogTrigger asChild>
                    <Button variant="outline" size="sm">Learn More</Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-lg">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-2xl"><Sparkles className="h-6 w-6 text-primary" /> Become a Community Leader</DialogTitle>
                        <DialogDescription>A unique opportunity to build a digital town square and a sustainable local business.</DialogDescription>
                    </DialogHeader>
                    <div className="py-4 space-y-6">
                        <div className="flex items-start gap-4">
                            <div className="flex-shrink-0 w-10 h-10 rounded-full bg-green-100 text-green-600 flex items-center justify-center">
                                <DollarSign className="h-5 w-5" />
                            </div>
                            <div>
                                <h4 className="font-semibold">Earn Real Revenue</h4>
                                <p className="text-sm text-muted-foreground">Receive a <strong>40% share</strong> of all business subscription revenue generated in your community hub. Turn your community passion into a source of income.</p>
                            </div>
                        </div>
                         <div className="flex items-start gap-4">
                            <div className="flex-shrink-0 w-10 h-10 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center">
                                <TrendingUp className="h-5 w-5" />
                            </div>
                            <div>
                                <h4 className="font-semibold">Build a Scalable Business</h4>
                                <p className="text-sm text-muted-foreground">Expand your impact and income by managing up to <strong>10 different community hubs</strong>. This is more than a role; it's a local business opportunity.</p>
                            </div>
                        </div>
                         <div className="flex items-start gap-4">
                            <div className="flex-shrink-0 w-10 h-10 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center">
                                <CheckCircle className="h-5 w-5" />
                            </div>
                            <div>
                                <h4 className="font-semibold">Empower Your Community</h4>
                                <p className="text-sm text-muted-foreground">You are in control. Approve local businesses, moderate content, publish news and events, and shape the digital future of your area.</p>
                            </div>
                        </div>
                    </div>
                    <DialogFooter>
                        <DialogClose asChild><Button variant="ghost">Close</Button></DialogClose>
                        <DialogClose asChild>
                            <Button onClick={handleClaimLeadership} disabled={isClaiming}>
                                {isClaiming && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}
                                Claim Leadership Now
                            </Button>
                        </DialogClose>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
            <Dialog>
                <DialogTrigger asChild>
                    <Button size="sm" className="bg-primary hover:bg-primary/90">Become a Leader</Button>
                </DialogTrigger>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Confirm Leadership</DialogTitle>
                        <DialogDescription>
                            Are you sure you want to become the leader of this community? This action cannot be undone. You will be responsible for its management.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose>
                        <Button onClick={handleClaimLeadership} disabled={isClaiming}>
                             {isClaiming && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}
                            Yes, Claim Leadership
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
           </div>
        </AlertDescription>
    </Alert>
  );
}
