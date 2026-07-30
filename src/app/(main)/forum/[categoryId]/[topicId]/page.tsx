'use client';

import * as React from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { 
  ArrowLeft, 
  MessageSquare, 
  Loader2, 
  Send, 
  User, 
  Clock, 
  MessageCircle, 
  CheckCircle2,
  Sparkles
} from 'lucide-react';
import Link from 'next/link';
import { useUser, useFirestore, useDoc, useCollection, useMemoFirebase } from '@/firebase';
import { doc, collection, query, where, orderBy, addDoc, serverTimestamp, updateDoc, increment } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { type Topic, type ForumCategory } from '@/lib/forum-data';

export type ForumReply = {
  id: string;
  topicId: string;
  categoryId: string;
  content: string;
  authorId: string;
  authorName: string;
  authorAvatar?: string;
  createdAt: any;
};

export default function ForumTopicDetailsPage() {
  const params = useParams();
  const categoryId = params.categoryId as string;
  const topicId = params.topicId as string;
  const db = useFirestore();
  const { user } = useUser();
  const { toast } = useToast();
  const router = useRouter();

  const [replyContent, setReplyContent] = React.useState('');
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  // Load User Profile
  const userProfileRef = useMemoFirebase(() => {
    if (!user || !db) return null;
    return doc(db, 'users', user.uid);
  }, [user, db]);
  const { data: userProfile, isLoading: profileLoading } = useDoc(userProfileRef);

  // Load Topic Details
  const topicRef = useMemoFirebase(() => {
    if (!topicId || !db) return null;
    return doc(db, 'forum-topics', topicId);
  }, [topicId, db]);
  const { data: topic, isLoading: topicLoading, error: topicError } = useDoc<Topic>(topicRef);

  // Load Category Details
  const categoryRef = useMemoFirebase(() => {
    if (!categoryId || !db) return null;
    return doc(db, 'forum-categories', categoryId);
  }, [categoryId, db]);
  const { data: category } = useDoc<ForumCategory>(categoryRef);

  // Load Replies for Topic (using subcollection path permitted in rules)
  const repliesQuery = useMemoFirebase(() => {
    if (!topicId || !db) return null;
    return query(
      collection(db, 'forum-topics', topicId, 'replies'),
      orderBy('createdAt', 'asc')
    );
  }, [topicId, db]);
  const { data: replies, isLoading: repliesLoading } = useCollection<ForumReply>(repliesQuery);

  const loading = profileLoading || topicLoading;

  const handlePostReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyContent.trim()) {
      toast({ title: 'Empty Reply', description: 'Please write a message before posting.', variant: 'destructive' });
      return;
    }

    if (!user || !db || !topicId) {
      toast({ title: 'Authentication Required', description: 'Please sign in to post a reply.', variant: 'destructive' });
      return;
    }

    setIsSubmitting(true);

    try {
      const authorName = userProfile?.name || `${userProfile?.firstName || ''} ${userProfile?.lastName || ''}`.trim() || 'Community Member';
      const authorAvatar = userProfile?.avatar || '';

      // 1. Add reply document into forum-topics/{topicId}/replies subcollection
      await addDoc(collection(db, 'forum-topics', topicId, 'replies'), {
        topicId,
        categoryId,
        communityId: userProfile?.communityId || '9ayHMyZf4SRw2gof1AM9',
        content: replyContent.trim(),
        authorId: user.uid,
        authorName,
        authorAvatar,
        createdAt: serverTimestamp(),
      });

      // 2. Increment topic reply count and update lastPost timestamp
      if (topicRef) {
        await updateDoc(topicRef, {
          replies: increment(1),
          lastPost: Date.now(),
        });
      }

      // 3. Increment category post count
      if (categoryRef) {
        await updateDoc(categoryRef, {
          posts: increment(1),
        });
      }

      setReplyContent('');
      toast({ title: 'Reply Posted!', description: 'Your message has been added to the discussion.' });
    } catch (err: any) {
      console.error('Error posting reply:', err);
      toast({ title: 'Error', description: err.message || 'Failed to post reply.', variant: 'destructive' });
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

  if (topicError || !topic) {
    return (
      <div className="text-center py-16 space-y-4 max-w-md mx-auto">
        <h1 className="text-2xl font-bold">Topic Not Found</h1>
        <p className="text-sm text-muted-foreground">This discussion topic may have been moved or removed.</p>
        <Button asChild variant="default" className="mt-4 bg-purple-600 hover:bg-purple-700 text-white">
          <Link href={`/forum/${categoryId}`}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Category
          </Link>
        </Button>
      </div>
    );
  }

  const topicDate = topic.createdAt?.toDate 
    ? topic.createdAt.toDate().toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })
    : 'Recently';

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12">
      {/* Navigation Bar */}
      <Button asChild variant="ghost" size="sm" className="text-xs hover:bg-muted font-medium">
        <Link href={`/forum/${categoryId}`}>
          <ArrowLeft className="mr-1.5 h-3.5 w-3.5" />
          Back to {category?.name || 'Category'}
        </Link>
      </Button>

      {/* Main Topic Header & Content Card */}
      <Card className="border-2 border-purple-200/60 dark:border-purple-900/40 shadow-sm overflow-hidden">
        <CardHeader className="p-6 bg-gradient-to-r from-purple-500/15 via-indigo-500/15 to-emerald-500/15 border-b border-purple-100 dark:border-purple-900/30 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <Badge variant="outline" className="bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300 border-purple-200 font-semibold text-xs">
              {category?.name || 'Discussion Topic'}
            </Badge>
            <Badge variant="secondary" className="bg-purple-600 text-white text-xs px-2.5 py-0.5">
              💬 {replies?.length || topic.replies || 0} Replies
            </Badge>
          </div>

          <CardTitle className="text-xl sm:text-2xl font-extrabold tracking-tight font-headline text-foreground leading-snug">
            {topic.title}
          </CardTitle>

          <div className="flex items-center gap-3 pt-2 text-xs text-muted-foreground flex-wrap">
            <div className="flex items-center gap-2">
              <Avatar className="h-6 w-6 border">
                <AvatarImage src={topic.authorAvatar} alt={topic.authorName} />
                <AvatarFallback className="text-[10px] bg-purple-100 text-purple-700 font-bold">
                  {topic.authorName?.charAt(0) || 'U'}
                </AvatarFallback>
              </Avatar>
              <span className="font-semibold text-foreground">{topic.authorName || 'Community Member'}</span>
            </div>
            <span>•</span>
            <span className="flex items-center gap-1">
              <Clock className="h-3.5 w-3.5 text-muted-foreground" />
              {topicDate}
            </span>
          </div>
        </CardHeader>

        {/* Topic Body Content */}
        <CardContent className="p-6 md:p-8 space-y-4">
          <div className="text-base text-foreground leading-relaxed whitespace-pre-wrap font-normal">
            {(topic as any).content || (topic as any).body || "No additional details provided for this topic."}
          </div>
        </CardContent>
      </Card>

      {/* Discussion Replies List */}
      <div className="space-y-4">
        <div className="flex items-center justify-between px-1">
          <h3 className="text-lg font-bold tracking-tight text-foreground flex items-center gap-2">
            <MessageCircle className="h-5 w-5 text-purple-600" />
            <span>Replies ({replies?.length || 0})</span>
          </h3>
        </div>

        {replies && replies.length > 0 ? (
          <div className="space-y-3">
            {replies.map((reply) => {
              const replyDate = reply.createdAt?.toDate 
                ? reply.createdAt.toDate().toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })
                : 'Just now';

              return (
                <Card key={reply.id} className="border border-border/80 shadow-2xs">
                  <CardContent className="p-4 sm:p-5 space-y-3">
                    <div className="flex items-center justify-between gap-2 border-b border-border/40 pb-2.5">
                      <div className="flex items-center gap-2.5">
                        <Avatar className="h-8 w-8 border">
                          <AvatarImage src={reply.authorAvatar} alt={reply.authorName} />
                          <AvatarFallback className="text-xs bg-purple-100 text-purple-700 font-bold">
                            {reply.authorName?.charAt(0) || 'U'}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="text-sm font-bold text-foreground">{reply.authorName}</p>
                          <p className="text-[11px] text-muted-foreground">{replyDate}</p>
                        </div>
                      </div>
                    </div>

                    <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">
                      {reply.content}
                    </p>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        ) : (
          <Card className="p-6 text-center border-dashed">
            <p className="text-sm text-muted-foreground">No replies yet. Be the first to share your thoughts!</p>
          </Card>
        )}
      </div>

      {/* Post a Reply Form Card */}
      <Card className="border-2 border-purple-200/80 dark:border-purple-900/60 shadow-sm">
        <CardHeader className="p-5 pb-2">
          <CardTitle className="text-base font-bold flex items-center gap-2">
            <MessageSquare className="h-4 w-4 text-purple-600" />
            <span>Join the Discussion</span>
          </CardTitle>
        </CardHeader>
        <form onSubmit={handlePostReply}>
          <CardContent className="p-5 pt-2 space-y-3">
            <Textarea
              placeholder="Write your reply to this topic..."
              value={replyContent}
              onChange={(e) => setReplyContent(e.target.value)}
              rows={4}
              required
              className="border-purple-200 dark:border-purple-900 focus-visible:ring-purple-500 leading-relaxed resize-y"
            />
          </CardContent>
          <CardFooter className="p-5 pt-0 flex justify-end">
            <Button
              type="submit"
              size="sm"
              className="bg-purple-600 hover:bg-purple-700 text-white font-semibold px-5 h-9 text-xs gap-1.5 shadow-xs"
              disabled={isSubmitting || !replyContent.trim()}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  <span>Posting...</span>
                </>
              ) : (
                <>
                  <Send className="h-3.5 w-3.5" />
                  <span>Post Reply</span>
                </>
              )}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
