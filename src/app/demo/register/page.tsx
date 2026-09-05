'use client';

import React, { useState, useCallback } from 'react';
import {
  User,
  Briefcase,
  Users,
  Building,
  Globe,
  Map,
  HelpCircle,
  Play,
  Pause,
  ChevronRight,
  Sparkles,
  ArrowLeft,
  Database
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Logo } from '@/components/icons';
import { useDoc, useMemoFirebase, useFirestore } from '@/firebase';
import { doc } from 'firebase/firestore';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
  DialogFooter,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';

const accountTypes = [
  {
    icon: User,
    title: 'Personal',
    description: 'Connect with your community, join discussions, and stay updated.',
    href: '/demo/signup/personal',
    details: "Create a personal account to participate in your local community. You can view news, events, join forum discussions, and connect with neighbours as well as do all you shopping locally in your digital Highstreet. Or, If you have been invited to join a community leadership team as a Reporter, Broadcaster, or other role, you should sign up for a Personal account first. The Community Leader will then promote you to your assigned role.",
    audioTourId: "436e743e-d460-45d1-b5fd-da3dea9b5b4b"
  },
  {
    icon: Briefcase,
    title: 'Business',
    description: 'Promote your business, post events, and engage with local customers.',
    href: '/demo/signup/business',
    details: "A Business Account gives you all the same basics as the personal account, however this option also allows you to create a listing for your local business or businesses in the community directory. Once approved by a Community Leader, you can post adverts, create events, and manage your business profile, As well as open a store in your local Highstreet with all the options you'd expect from and eCommerce storefront. This is ideal for local businesses that operate within one or more specific businesses or communities.",
    audioTourId: "e63ac093-d937-4aaf-8b59-becb3c32f0a1"
  },
  {
    icon: Users,
    title: 'Community Leader',
    description: 'Manage a community hub, moderate content, and earn revenue.',
    href: '/demo/signup/leader',
    details: "Select this option if you have been invited to or want to apply to run a community hub that does not yet have representation on the platform. Or, you may wish to create your very own community from scratch. As a Community Leader, you will be responsible for managing content, approving businesses, Adverts and Events and fostering a positive online environment. Leaders can earn 40% of the revenue generated from their community.",
    audioTourId: "61e42e62-4271-4c56-99e5-6cc135a3cfe2"
  },
  {
    icon: Building,
    title: 'Enterprise',
    description: 'For large organizations and multi-location businesses.',
    href: '/demo/signup/enterprise',
    details: "An Enterprise Account gives you all the same basics as the personal account and works in the same way as a business account, however this option also allows you to create a listing for your local Group or Groups in the community enterprise directory.",
    audioTourId: "91ad514e-d802-4856-9efb-781e0b772cfd"
  },
  {
    icon: Globe,
    title: 'National Advertiser',
    description: 'For brands advertising across multiple communities.',
    href: '/demo/signup/national',
    details: "A National Advertiser account is for brands who want to run large-scale advertising campaigns across the entire Community Hub platform, targeting users by interest rather than specific community locations.",
    audioTourId: "199d2ecd-79b8-487d-b894-e0aa3fd80f05"
  },
  {
    icon: Map,
    title: 'Regional Network Account',
    description: 'For National Parks, Regional Councils, and Regional Authorities.',
    href: '/demo/signup/regional',
    details: "A Regional Network Account is designed for National Park Authorities, Regional Councils, and Conservation or Emergency Authorities. It allows you to define a geographic boundary map covering multiple communities, publish regional announcements, and dispatch multi-community emergency broadcasts.",
    audioTourId: "regional-network-audio-tour"
  },
];

interface AccountTypeItemProps {
  acc: (typeof accountTypes)[0];
  playingAudioId: string | null;
  onTogglePlay: (id: string) => void;
  setPlayingAudioId: React.Dispatch<React.SetStateAction<string | null>>;
  audioRefs: React.MutableRefObject<Record<string, HTMLAudioElement | null>>;
}

function AccountTypeItem({ acc, playingAudioId, onTogglePlay, setPlayingAudioId, audioRefs }: AccountTypeItemProps) {
  const db = useFirestore();
  const router = useRouter();
  const audioTourRef = useMemoFirebase(() => db ? doc(db, 'audioTours', acc.audioTourId) : null, [db, acc.audioTourId]);
  const { data: audioTourData } = useDoc(audioTourRef);
  const isCurrentlyPlaying = playingAudioId === acc.audioTourId;

  const audioRef = useCallback((node: HTMLAudioElement) => {
    if (node) {
      audioRefs.current[acc.audioTourId] = node;
      const handleEnded = () => {
        setPlayingAudioId(currentId => currentId === acc.audioTourId ? null : currentId);
      };
      node.addEventListener('ended', handleEnded);
      return () => node.removeEventListener('ended', handleEnded);
    }
  }, [acc.audioTourId, setPlayingAudioId, audioRefs]);

  return (
    <div 
      onClick={() => router.push(acc.href)} 
      className="p-4 rounded-lg border-2 border-border hover:border-emerald-500/60 cursor-pointer transition-all flex items-start gap-4 hover:bg-muted/40"
    >
      <acc.icon className="h-8 w-8 text-emerald-500 mt-1" />
      <div className="flex-1">
        <h3 className="text-lg font-semibold text-foreground">{acc.title}</h3>
        <p className="text-sm text-muted-foreground">{acc.description}</p>
      </div>
      <div className="flex items-center">
        {audioTourData?.audioUrl && (
          <>
            <Button onClick={(e) => { e.stopPropagation(); onTogglePlay(acc.audioTourId); }} variant="ghost" size="icon" className="h-8 w-8">
              {isCurrentlyPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
            </Button>
            <audio 
              ref={audioRef}
              src={audioTourData.audioUrl} 
              preload="none"
            />
          </>
        )}
        <Dialog>
          <DialogTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={(e) => e.stopPropagation()}>
              <HelpCircle className="h-5 w-5 text-muted-foreground" />
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{acc.title}</DialogTitle>
            </DialogHeader>
            <p className="py-4 text-sm leading-relaxed">{acc.details}</p>
            <DialogFooter>
              <DialogClose asChild>
                <Button onClick={(e) => e.stopPropagation()}>Close</Button>
              </DialogClose>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        <ChevronRight className="h-5 w-5 text-muted-foreground" />
      </div>
    </div>
  );
}

export default function DemoRegisterPage() {
  const db = useFirestore();
  const [playingAudioId, setPlayingAudioId] = useState<string | null>(null);
  const audioRefs = React.useRef<Record<string, HTMLAudioElement | null>>({});

  const mainAudioTourId = "276b69c9-7752-43ac-8874-e2db6853ee42";
  const audioTourRef = useMemoFirebase(() => db ? doc(db, 'audioTours', mainAudioTourId) : null, [db]);
  const { data: audioTourData } = useDoc(audioTourRef);

  const togglePlay = useCallback((idToToggle: string) => {
    setPlayingAudioId(currentId => {
      Object.entries(audioRefs.current).forEach(([audioId, audioEl]) => {
        if (audioEl && !audioEl.paused && audioId !== idToToggle) {
          audioEl.pause();
        }
      });
      
      const targetAudio = audioRefs.current[idToToggle];
      if (!targetAudio) return currentId;

      if (currentId === idToToggle) {
        targetAudio.pause();
        return null;
      } else {
        targetAudio.play().catch(error => {
          if (error.name !== 'AbortError') {
            console.error("Audio playback error:", error);
          }
        });
        return idToToggle;
      }
    });
  }, []);
  
  const isMainPlaying = playingAudioId === mainAudioTourId;

  return (
    <div className="flex min-h-[90vh] flex-col items-center justify-center bg-background p-4 sm:p-6">
      <div className="w-full max-w-2xl">
        <div className="mb-4">
          <Button variant="ghost" size="sm" asChild className="gap-1.5 text-xs">
            <Link href="/demo/login">
              <ArrowLeft className="h-3.5 w-3.5" /> Back to Demo Gateway
            </Link>
          </Button>
        </div>

        <Card className="border-border shadow-xl">
          <CardHeader className="items-center text-center">
            <Logo className="mb-3 h-12 w-12 text-emerald-500" />
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-500 text-[11px] font-mono font-bold mb-2">
              <Sparkles className="h-3.5 w-3.5" /> Interactive Registration Preview (Display Only)
            </div>
            <CardTitle className="text-3xl font-black font-headline tracking-tight">Choose Your Account Type</CardTitle>
            <CardDescription className="flex items-center gap-2">
              Select an account type to view its interactive registration card.
              {audioTourData?.audioUrl && (
                <>
                  <Button onClick={() => togglePlay(mainAudioTourId)} variant="outline" size="icon" className="h-7 w-7">
                    {isMainPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                  </Button>
                  <audio src={audioTourData.audioUrl} preload="none" />
                </>
              )}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {accountTypes.map((acc) => (
              <AccountTypeItem 
                key={acc.title}
                acc={acc}
                playingAudioId={playingAudioId}
                onTogglePlay={togglePlay}
                setPlayingAudioId={setPlayingAudioId}
                audioRefs={audioRefs}
              />
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
