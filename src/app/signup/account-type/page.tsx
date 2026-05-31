
'use client'

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  User,
  Briefcase,
  Users,
  Building,
  Globe,
  HelpCircle,
  Mic, Play, Pause, ChevronRight
} from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Logo } from '@/components/icons'
import { useDoc, useMemoFirebase, useFirestore } from '@/firebase';
import { doc } from 'firebase/firestore';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger, DialogClose } from '@/components/ui/dialog';

const accountTypes = [
  {
    icon: User,
    title: 'Personal',
    description: 'Connect with your community, join discussions, and stay updated.',
    href: '/signup/personal',
    details: "Create a personal account to participate in your local community. You can view news, events, join forum discussions, and connect with neighbours as well as do all you shopping locally in your digital Highstreet. Or, If you have been invited to join a community leadership team as a Reporter, Broadcaster, or other role, you should sign up for a Personal account first. The Community Leader will then promote you to your assigned role.",
    audioTourId: "436e743e-d460-45d1-b5fd-da3dea9b5b4b"
  },
  {
    icon: Briefcase,
    title: 'Business',
    description: 'Promote your business, post events, and engage with local customers.',
    href: '/signup/business',
    details: "A Business Account gives you all the same basics as the personal account, however this option also allows you to create a listing for your local business or businesses in the community directory. Once approved by a Community Leader, you can post adverts, create events, and manage your business profile, As well as open a store in your local Highstreet with all the options you'd expect from and eCommerce storefront. This is ideal for local businesses that operate within one or more specific businesses or communities.",
    audioTourId: "e63ac093-d937-4aaf-8b59-becb3c32f0a1"
  },
  {
    icon: Users,
    title: 'Community Leader',
    description: 'Manage a community hub, moderate content, and earn revenue.',
    href: '/signup/leader',
    details: "Select this option if you have been invited to or want to apply to run a community hub that does not yet have representation on the platform.  Or, you may wish to create your very own community from scratch. As a Community Leader, you will be responsible for managing content, approving businesses, Adverts and Events and fostering a positive online environment. Leaders can earn 40% of the revenue generated from their community. This account was originally designed for Community Council Leaders, but in there absence anyone with a willingness can run up to a maximum or 10 communities from a single account. You will have a direct link to the administrators so you will never feel alone. We're always here to help.",
    audioTourId: "61e42e62-4271-4c56-99e5-6cc135a3cfe2"
  },
  {
    icon: Building,
    title: 'Enterprise',
    description: 'For large organizations and multi-location businesses.',
    href: '/signup/enterprise',
    details: "An Enterprise Account gives you all the same basics as the personal account and works in the same way as a business account, however this option also allows you to create a listing for your local Group or Groups in the community enterprise directory. Once approved by a Community Leader, you can post adverts, create events, and manage your business profile, As well as open a store in your local Highstreet with all the options you'd expect from and eCommerce storefront if you need to. This is ideal for local Enterprise Groups that operate within your community.",
    audioTourId: "91ad514e-d802-4856-9efb-781e0b772cfd"
  },
  {
    icon: Globe,
    title: 'National Advertiser',
    description: 'For brands advertising across multiple communities.',
    href: '/signup/national',
    details: "A National Advertiser account is for brands who want to run large-scale advertising campaigns across the entire Community Hub platform, targeting users by interest rather than specific community locations. This is ideal for national brand awareness by removing the expensive Pay Per Click model, with us if you pay for a month or a year that's what you get regardless of the traffic you generate.",
    audioTourId: "199d2ecd-79b8-487d-b894-e0aa3fd80f05"
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
            // Cleanup on unmount
            return () => node.removeEventListener('ended', handleEnded);
        }
    }, [acc.audioTourId, setPlayingAudioId, audioRefs]);

    return (
        <div 
            onClick={() => router.push(acc.href)} 
            className="p-4 rounded-lg border-2 border-border hover:border-primary/50 cursor-pointer transition-all flex items-start gap-4"
        >
            <acc.icon className="h-8 w-8 text-primary mt-1" />
            <div className="flex-1">
                <h3 className="text-lg font-semibold">{acc.title}</h3>
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
                        <p className="py-4">{acc.details}</p>
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


export default function AccountTypePage() {
    const db = useFirestore();
    const [playingAudioId, setPlayingAudioId] = React.useState<string | null>(null);
    const audioRefs = React.useRef<Record<string, HTMLAudioElement | null>>({});

    const mainAudioTourId = "276b69c9-7752-43ac-8874-e2db6853ee42";
    const audioTourRef = useMemoFirebase(() => db ? doc(db, 'audioTours', mainAudioTourId) : null, [db]);
    const { data: audioTourData } = useDoc(audioTourRef);

    const togglePlay = useCallback((idToToggle: string) => {
        setPlayingAudioId(currentId => {
            // Pause any other playing audio
            Object.entries(audioRefs.current).forEach(([audioId, audioEl]) => {
                if (audioEl && !audioEl.paused && audioId !== idToToggle) {
                    audioEl.pause();
                }
            });
            
            const targetAudio = audioRefs.current[idToToggle];
            if (!targetAudio) return currentId;

            // If we clicked the currently playing audio, pause it.
            if (currentId === idToToggle) {
                targetAudio.pause();
                return null;
            } else {
                // Otherwise, play the new audio.
                targetAudio.play().catch(error => {
                    if (error.name !== 'AbortError') {
                        console.error("Audio playback error:", error);
                    }
                });
                return idToToggle;
            }
        });
    }, []); // This function is stable and does not need dependencies
    
    const isMainPlaying = playingAudioId === mainAudioTourId;
    
    const mainAudioRef = useCallback((node: HTMLAudioElement) => {
        if (node) {
            audioRefs.current[mainAudioTourId] = node;
            const handleEnded = () => {
                setPlayingAudioId(currentId => currentId === mainAudioTourId ? null : currentId);
            };
            node.addEventListener('ended', handleEnded);
            // Cleanup on unmount
            return () => node.removeEventListener('ended', handleEnded);
        }
    }, []);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4">
      <div className="w-full max-w-2xl">
        <Card>
          <CardHeader className="items-center text-center">
            <Logo className="mb-4 h-12 w-12 text-primary" />
            <CardTitle className="text-3xl">Choose Your Account Type</CardTitle>
            <CardDescription className="flex items-center gap-2">
              Select the option that best describes you to get started.
              {audioTourData?.audioUrl && (
                <>
                    <Button onClick={() => togglePlay(mainAudioTourId)} variant="outline" size="icon" className="h-7 w-7">
                        {isMainPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                    </Button>
                    <audio 
                        ref={mainAudioRef}
                        src={audioTourData.audioUrl} 
                        preload="none"
                    />
                </>
              )}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {accountTypes.map((type) => (
                <AccountTypeItem 
                    key={type.href} 
                    acc={type}
                    playingAudioId={playingAudioId}
                    onTogglePlay={togglePlay}
                    setPlayingAudioId={setPlayingAudioId}
                    audioRefs={audioRefs}
                />
            ))}
          </CardContent>
        </Card>
        <div className="mt-4 text-center text-sm text-muted-foreground">
          Already have an account?{' '}
          <Link href="/" className="font-medium text-primary hover:underline">
            Sign In
          </Link>
        </div>
      </div>
    </div>
  )
}
