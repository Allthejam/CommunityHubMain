'use client';

import * as React from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { ArrowLeft, MessageSquare, Loader2, Sparkles, Send } from 'lucide-react';
import Link from 'next/link';
import { useUser, useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { doc, collection, addDoc, serverTimestamp, updateDoc, increment } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { type ForumCategory } from '@/lib/forum-data';

export default function NewForumTopicPage() {
  const router = useRouter();
  const params = useParams();
  const categoryId = params.categoryId as string;
  const db = useFirestore();
  const { user } = useUser();
  const { toast } = useToast();

  const [title, setTitle] = React.useState('');
  const [content, setContent] = React.useState('');
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  // Load User Profile
  const userProfileRef = useMemoFirebase(() => {
    if (!user || !db) return null;
    return doc(db, 'users', user.uid);
  }, [user, db]);
  const { data: userProfile, isLoading: profileLoading } = useDoc(userProfileRef);

  // Load Category Details
  const categoryRef = useMemoFirebase(() => {
    if (!categoryId || !db) return null;
    return doc(db, 'forum-categories', categoryId);
  }, [categoryId, db]);
  const { data: category, isLoading: categoryLoading } = useDoc<ForumCategory>(categoryRef);

  const loading = profileLoading || categoryLoading;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) {
      toast({
        title: 'Missing Fields',
        description: 'Please enter both a topic title and message content.',
        variant: 'destructive',
      });
      return;
    }

    if (!user || !db || !categoryId) {
      toast({
        title: 'Error',
        description: 'You must be signed in to post a new topic.',
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const authorName = userProfile?.name || `${userProfile?.firstName || ''} ${userProfile?.lastName || ''}`.trim() || 'Community Member';
      const authorAvatar = userProfile?.avatar || '';

      // 1. Create the new topic in forum-topics
      const topicRef = await addDoc(collection(db, 'forum-topics'), {
        categoryId,
        communityId: userProfile?.communityId || category?.communityId || '9ayHMyZf4SRw2gof1AM9',
        title: title.trim(),
        content: content.trim(),
        authorId: user.uid,
        authorName,
        authorAvatar,
        createdAt: serverTimestamp(),
        lastPost: Date.now(),
        replies: 0,
      });

      // 2. Increment topic count and post count in category document
      if (categoryRef) {
        await updateDoc(categoryRef, {
          topics: increment(1),
          posts: increment(1),
        });
      }

      toast({
        title: '🎉 Topic Created!',
        description: 'Your discussion topic has been published to the community forum.',
      });

      // Navigate to the newly created topic page
      router.push(`/forum/${categoryId}/${topicRef.id}`);
    } catch (err: any) {
      console.error('Error creating topic:', err);
      toast({
        title: 'Error Creating Topic',
        description: err.message || 'Failed to publish topic. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-12">
      {/* Back Button */}
      <Button asChild variant="ghost" size="sm" className="text-xs hover:bg-muted font-medium">
        <Link href={`/forum/${categoryId}`}>
          <ArrowLeft className="mr-1.5 h-3.5 w-3.5" />
          Back to {category?.name || 'Category'}
        </Link>
      </Button>

      {/* Main Creation Card */}
      <Card className="border-2 border-purple-200/60 dark:border-purple-900/40 shadow-sm overflow-hidden">
        <CardHeader className="p-6 bg-gradient-to-r from-purple-500/10 via-indigo-500/10 to-amber-500/10 border-b border-purple-100 dark:border-purple-900/30">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-purple-600 text-white shadow-xs">
              <MessageSquare className="h-5 w-5" />
            </div>
            <div>
              <CardTitle className="text-xl font-bold font-headline">Start a New Topic</CardTitle>
              <CardDescription className="text-xs mt-0.5">
                Posting in: <strong className="text-purple-700 dark:text-purple-300 font-semibold">{category?.name || 'Community Forum'}</strong>
              </CardDescription>
            </div>
          </div>
        </CardHeader>

        <form onSubmit={handleSubmit}>
          <CardContent className="p-6 space-y-6">
            {/* Title Input */}
            <div className="space-y-2">
              <Label htmlFor="title" className="font-bold text-sm">
                Topic Title <span className="text-red-500">*</span>
              </Label>
              <Input
                id="title"
                placeholder="What would you like to discuss? (e.g. Local Park Renovation Proposal)"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                maxLength={120}
                required
                className="h-11 border-purple-200 dark:border-purple-900 focus-visible:ring-purple-500"
              />
              <p className="text-[11px] text-muted-foreground text-right">{title.length}/120 characters</p>
            </div>

            {/* Message Content Area */}
            <div className="space-y-2">
              <Label htmlFor="content" className="font-bold text-sm">
                Topic Details & Message <span className="text-red-500">*</span>
              </Label>
              <Textarea
                id="content"
                placeholder="Write your message here... Provide background context or questions for your neighbors to join in."
                value={content}
                onChange={(e) => setContent(e.target.value)}
                rows={7}
                required
                className="border-purple-200 dark:border-purple-900 focus-visible:ring-purple-500 leading-relaxed resize-y"
              />
            </div>
          </CardContent>

          <CardFooter className="p-6 pt-0 flex items-center justify-between gap-4 border-t border-border/50 bg-muted/20">
            <Button
              type="button"
              variant="outline"
              size="default"
              onClick={() => router.push(`/forum/${categoryId}`)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>

            <Button
              type="submit"
              size="default"
              className="bg-purple-600 hover:bg-purple-700 text-white font-semibold px-6 shadow-sm gap-2"
              disabled={isSubmitting || !title.trim() || !content.trim()}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Publishing Topic...</span>
                </>
              ) : (
                <>
                  <Send className="h-4 w-4" />
                  <span>Publish Topic</span>
                </>
              )}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
