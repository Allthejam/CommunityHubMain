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
import { Textarea } from './ui/textarea';
import EmojiPicker, { Theme as EmojiTheme } from "emoji-picker-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Input } from './ui/input';

export default function CreatePostForm() {
  const { user } = useUser();
  const db = useFirestore();
  const { toast } = useToast();
  
  const userProfileRef = useMemoFirebase(() => (user ? doc(db, 'users', user.uid) : null), [user, db]);
  const { data: userProfile } = useDoc(userProfileRef);
  const darkMode = userProfile?.settings?.darkMode;

  const [content, setContent] = React.useState('');
  const [image, setImage] = React.useState<string | null>(null);
  const [videoUrl, setVideoUrl] = React.useState('');
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [isEditing, setIsEditing] = React.useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const handlePost = async () => {
    if (!user || !userProfile) {
        toast({ title: "Error", description: "You must be logged in to post.", variant: "destructive" });
        return;
    }
    if (!content.trim()) {
        toast({ title: "Error", description: "Post content cannot be empty.", variant: "destructive" });
        return;
    }
    
    setIsSubmitting(true);
    try {
        const result = await createPostAction({
            authorId: user.uid,
            content,
            image,
            videoUrl,
        });

        if (result.success) {
            toast({ title: "Post Submitted!", description: "Your post is live on the feed." });
            setContent('');
            setImage(null);
            setVideoUrl('');
            setIsEditing(false);
        } else {
            throw new Error(result.error);
        }
    } catch (error: any) {
        toast({ title: "Error", description: error.message || "Could not create post.", variant: "destructive" });
    } finally {
        setIsSubmitting(false);
    }
  }

   const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      setImage(event.target?.result as string);
    };
    reader.readAsDataURL(file);
  };


  return (
    <Card>
      <CardContent className="p-4 space-y-4">
        <div className="flex items-start gap-4">
          <Avatar className="h-12 w-12 border">
            <AvatarImage
              src={userProfile?.avatar}
              alt={userProfile?.name}
            />
            <AvatarFallback>{userProfile?.name?.charAt(0) || 'U'}</AvatarFallback>
          </Avatar>
          <div className="flex-1">
            {isEditing ? (
              <>
                <RichTextEditor
                    value={content}
                    onChange={setContent}
                    placeholder="What's happening in your community?"
                    hideHeading
                    hideQuote
                    hideFontSize
                    hideColor
                />
                <div className="relative mt-2">
                    <Input
                        placeholder="Paste a YouTube video URL..."
                        value={videoUrl}
                        onChange={(e) => setVideoUrl(e.target.value)}
                        className="pl-8"
                    />
                    <Video className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                </div>
              </>
            ) : (
                 <Textarea
                    placeholder="What's happening in your community?"
                    onFocus={() => setIsEditing(true)}
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    className="min-h-12 resize-none"
                />
            )}
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
      </CardContent>
      <CardFooter className="flex justify-between p-4 pt-0">
        <div className="flex items-center gap-1">
            <input type="file" ref={fileInputRef} onChange={handleImageUpload} accept="image/*" className="hidden" />
            <Button variant="ghost" size="sm" onClick={() => fileInputRef.current?.click()}>
              <ImagePlus className="mr-2 h-4 w-4" />
              Add Image
            </Button>
             <Popover>
                <PopoverTrigger asChild>
                    <Button variant="ghost" size="icon">
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
            {isEditing && (
                <Button variant="ghost" size="sm" onClick={() => { setIsEditing(false); setContent(''); setImage(null); setVideoUrl('');}}>Cancel</Button>
            )}
            <Button size="sm" onClick={handlePost} disabled={isSubmitting || !content.trim()}>
              {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
              Post
            </Button>
        </div>
      </CardFooter>
    </Card>
  )
}
