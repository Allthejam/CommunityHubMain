
'use client'

import * as React from 'react';
import { ImagePlus, Send, Loader2, Smile, Video, X } from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardFooter,
} from '@/components/ui/card'
import { useUser, useFirestore, useDoc, useMemoFirebase } from '@/firebase'
import { doc } from 'firebase/firestore'
import { useToast } from '@/hooks/use-toast'
import { createPostAction } from '@/lib/actions/postActions';
import Image from 'next/image';
import { RichTextEditor } from './rich-text-editor';
import EmojiPicker, { Theme as EmojiTheme } from "emoji-picker-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Input } from './ui/input';

export default function CreatePostForm({ communityId }: { communityId?: string }) {
  const { user } = useUser();
  const db = useFirestore();
  const { toast } = useToast();
  
  const userProfileRef = useMemoFirebase(() => (user ? doc(db, 'users', user.uid) : null), [user, db]);
  const { data: userProfile } = useDoc(userProfileRef);
  const darkMode = userProfile?.settings?.darkMode;

  const [mounted, setMounted] = React.useState(false);
  const [currentPersona, setCurrentPersona] = React.useState('personal');

  React.useEffect(() => {
    setMounted(true);
    if (typeof window !== 'undefined') {
      const p = sessionStorage.getItem('sandboxPersona') || 'personal';
      setCurrentPersona(p);
    }
  }, []);

  const isDemo = mounted && typeof window !== 'undefined' && (sessionStorage.getItem('isDemoMode') === 'true' || window.location.pathname.startsWith('/demo'));
  const visitedId = mounted && typeof window !== 'undefined' ? sessionStorage.getItem('visitedCommunityId') : null;
  const effectiveCommunityId = communityId || visitedId || userProfile?.primaryHomeCommunityId || userProfile?.homeCommunityId || userProfile?.communityId || (isDemo ? '9ayHMyZf4SRw2gof1AM9' : 'N3SarfGXPLxBI7XcsinX');

  const [isExpanded, setIsExpanded] = React.useState(false);
  const [content, setContent] = React.useState('');
  const [image, setImage] = React.useState<string | null>(null);
  const [videoUrl, setVideoUrl] = React.useState('');
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const PERSONA_DETAILS: Record<string, { name: string; avatar: string }> = {
    leader: { name: 'Fiona Macleod (Leader)', avatar: '' },
    business: { name: 'Callum Stewart (Merchant)', avatar: '' },
    personal: { name: 'Morag Campbell (Resident)', avatar: '' },
    advertiser: { name: 'Marcus Vance (Brand Partner)', avatar: '' },
    regional: { name: 'Alastair Roy (Regional Authority)', avatar: '' },
  };

  const activeAuthorName = userProfile?.name || user?.displayName || (mounted && isDemo ? PERSONA_DETAILS[currentPersona]?.name : 'Community Member');
  const activeAuthorAvatar = userProfile?.avatar || user?.photoURL || (mounted && isDemo ? PERSONA_DETAILS[currentPersona]?.avatar : '');

  const handlePost = async () => {
    if (!content.trim()) {
      toast({ title: "Error", description: "Post content cannot be empty.", variant: "destructive" });
      return;
    }

    setIsSubmitting(true);
    try {
      // 1. If user is logged in, save to backend database (comfeed DB for demo 9ayHMyZf4SRw2gof1AM9, default DB for live communities)
      if (user) {
        const result = await createPostAction({
          authorId: user.uid,
          authorName: activeAuthorName,
          authorAvatar: activeAuthorAvatar,
          content: content.trim(),
          image,
          videoUrl,
          communityId: effectiveCommunityId,
        });

        if (result.success) {
          toast({ title: "Post Live!", description: "Your post is saved to the database and live on the feed." });
          setContent('');
          setImage(null);
          setVideoUrl('');
          setIsExpanded(false);
          if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('demo-posts-updated'));
          }
          return;
        } else {
          throw new Error(result.error);
        }
      }

      // 2. If running in Demo mode (or unauthenticated visitor), save ONLY in browser session & local storage
      const demoTargetCommunityId = isDemo ? '9ayHMyZf4SRw2gof1AM9' : effectiveCommunityId;
      const newDemoPost = {
        id: `demo-local-${Date.now()}`,
        author: activeAuthorName,
        authorId: `demo-${currentPersona}-${Date.now()}`,
        authorAvatar: activeAuthorAvatar,
        content: content.trim(),
        image: image || null,
        videoUrl: videoUrl || null,
        communityId: demoTargetCommunityId,
        status: 'active',
        createdAt: new Date().toISOString(),
        timestamp: 'just now',
        likes: 0,
        comments: 0,
        commentCount: 0,
        likedBy: [],
      };

      if (typeof window !== 'undefined') {
        const storageKey = `demo_posts_${demoTargetCommunityId}`;
        const existing = JSON.parse(sessionStorage.getItem(storageKey) || localStorage.getItem(storageKey) || '[]');
        const updated = [newDemoPost, ...existing];
        sessionStorage.setItem(storageKey, JSON.stringify(updated));
        localStorage.setItem(storageKey, JSON.stringify(updated));
        window.dispatchEvent(new CustomEvent('demo-posts-updated', { detail: newDemoPost }));
      }

      toast({ title: "Post Submitted!", description: "Your demo post is live in your browser session." });
      setContent('');
      setImage(null);
      setVideoUrl('');
      setIsExpanded(false);
    } catch (error: any) {
      toast({ title: "Error", description: error.message || "Could not create post.", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      setImage(event.target?.result as string);
    };
    reader.readAsDataURL(file);
  };
  
  if (!isExpanded) {
    return (
      <Card onClick={() => setIsExpanded(true)} className="cursor-pointer hover:bg-muted/50 transition-colors">
        <CardContent className="p-4">
          <div className="flex items-center gap-4">
            <Avatar className="h-10 w-10 border">
              <AvatarImage src={activeAuthorAvatar} alt={activeAuthorName} />
              <AvatarFallback suppressHydrationWarning>{activeAuthorName?.charAt(0) || 'U'}</AvatarFallback>
            </Avatar>
            <div className="flex-1 text-muted-foreground text-sm" suppressHydrationWarning>
              What&apos;s happening in {isDemo ? 'Oakridge' : 'your community'}?
            </div>
            <Button variant="ghost" size="icon" aria-label="Add image">
              <ImagePlus className="h-5 w-5" />
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="p-4 space-y-4">
        <div className="flex items-start gap-4">
          <Avatar className="h-12 w-12 border hidden sm:flex">
            <AvatarImage src={userProfile?.avatar} alt={userProfile?.name} />
            <AvatarFallback>{userProfile?.name?.charAt(0) || 'U'}</AvatarFallback>
          </Avatar>
          <div className="flex-1">
             <RichTextEditor
                value={content}
                onChange={setContent}
                placeholder="What's happening in your community?"
            />
          </div>
        </div>
         {image && (
            <div className="mt-4 flex justify-center md:justify-start md:pl-16">
                <div className="relative w-32 h-32">
                    <Image src={image} alt="Preview" fill className="rounded-md object-cover" />
                     <Button
                        type="button"
                        variant="destructive"
                        size="icon"
                        className="absolute -top-2 -right-2 h-6 w-6 rounded-full"
                        onClick={() => setImage(null)}
                    >
                        <X className="h-4 w-4" />
                    </Button>
                </div>
            </div>
        )}
         <div className="relative sm:pl-16">
            <Input
                placeholder="Paste a YouTube video URL..."
                value={videoUrl}
                onChange={(e) => setVideoUrl(e.target.value)}
                className="pl-8"
            />
            <Video className="absolute left-2 sm:left-18 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        </div>
      </CardContent>
      <CardFooter className="flex justify-between p-4 pt-0">
        <div className="flex items-center gap-1">
            <input type="file" ref={fileInputRef} onChange={handleImageUpload} accept="image/*" className="hidden" />
            <Button variant="ghost" size="icon" onClick={() => fileInputRef.current?.click()} aria-label="Add image">
              <ImagePlus className="h-5 w-5" />
            </Button>
             <Popover>
                <PopoverTrigger asChild>
                    <Button variant="ghost" size="icon" aria-label="Add emoji">
                        <Smile className="h-5 w-5" />
                    </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0 border-0">
                    <EmojiPicker 
                        onEmojiClick={(emojiObject) => setContent(prev => prev + emojiObject.emoji)}
                        theme={darkMode ? EmojiTheme.DARK : EmojiTheme.LIGHT}
                    />
                </PopoverContent>
            </Popover>
        </div>
        <div className="flex gap-2">
            <Button variant="ghost" onClick={() => setIsExpanded(false)}>Cancel</Button>
            <Button size="sm" onClick={handlePost} disabled={isSubmitting || !content.trim()}>
              {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
              Post
            </Button>
        </div>
      </CardFooter>
    </Card>
  )
}
