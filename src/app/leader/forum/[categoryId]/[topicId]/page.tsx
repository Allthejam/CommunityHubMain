'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardFooter, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ArrowLeft, MessageSquare, Loader2 } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import React, { useEffect, useState } from 'react';
import {
  doc,
  getDoc,
  collection,
  query,
  orderBy,
  onSnapshot,
} from 'firebase/firestore';
import { useFirestore, useUser, useDoc, useMemoFirebase } from '@/firebase';
import { RichTextEditor } from '@/components/rich-text-editor';
import { runAddPostToTopic } from '@/lib/actions/forumActions';
import { useToast } from '@/hooks/use-toast';
import { format, isValid } from 'date-fns';

type Post = {
  id: string;
  authorName: string;
  authorAvatar: string;
  authorId: string;
  createdAt: any;
  content: string;
  authorIsPrivate?: boolean;
  isAnonymous?: boolean;
  authorRealName?: string;
};

type Topic = {
  id: string;
  title: string;
  categoryId: string;
};

const PostCard = ({ post, isOriginalPost }: { post: Post; isOriginalPost?: boolean }) => {
  const isAnonymous = post.isAnonymous || post.authorIsPrivate || post.authorName?.toLowerCase().includes('anonymous');
  const authorDisplayName = isAnonymous ? 'Anonymous Member' : post.authorName;
  const authorAvatar = isAnonymous ? '' : post.authorAvatar;
  const authorInitial = isAnonymous
    ? 'A'
    : (post.authorName || 'A').charAt(0);

  const formatDate = (date: any) => {
    if (!date) return 'Just now';
    const d = date.toDate ? date.toDate() : (date.seconds ? new Date(date.seconds * 1000) : new Date(date));
    return isValid(d) ? format(d, "dd/MM/yyyy HH:mm") : 'Invalid Date';
  };

  return (
    <div className="flex gap-4">
      <Avatar className="h-10 w-10 shrink-0 border-2 border-primary/20 shadow-xs">
        <AvatarImage src={authorAvatar} alt={authorDisplayName} />
        <AvatarFallback className="bg-primary/10 text-primary font-bold text-sm">
          {isAnonymous ? '👤' : authorInitial}
        </AvatarFallback>
      </Avatar>
      <div className="flex-1 min-w-0">
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <span className="font-semibold text-foreground">{authorDisplayName}</span>
          {isAnonymous && post.authorRealName && (
            <span className="text-xs bg-muted px-2 py-0.5 rounded text-muted-foreground font-medium border">
              Real Name: {post.authorRealName}
            </span>
          )}
          {isOriginalPost && (
            <span className="text-[11px] px-1.5 py-0.5 rounded bg-primary/10 text-primary font-medium border border-primary/20">
              Author
            </span>
          )}
          <span className="text-muted-foreground text-xs">
            {formatDate(post.createdAt)}
          </span>
        </div>
        <div
          className="mt-3 text-foreground prose dark:prose-invert max-w-none text-sm leading-relaxed"
          dangerouslySetInnerHTML={{ __html: post.content }}
        />
      </div>
    </div>
  );
};

export default function TopicPage() {
  const params = useParams();
  const topicId = params.topicId as string;
  const db = useFirestore();
  const { user } = useUser();
  const { toast } = useToast();

  const [topic, setTopic] = useState<Topic | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const [replyContent, setReplyContent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isAnonymous, setIsAnonymous] = useState(false);

  const userProfileRef = useMemoFirebase(
    () => (user ? doc(db, 'users', user.uid) : null),
    [user, db]
  );
  const { data: userProfile } = useDoc(userProfileRef);

  useEffect(() => {
    if (userProfile?.settings?.publicProfile === false) {
      setIsAnonymous(true);
    }
  }, [userProfile?.settings?.publicProfile]);

  useEffect(() => {
    if (!topicId || !db) return;

    setLoading(true);
    const fetchTopicAndPosts = async () => {
      try {
        // Fetch topic details
        const topicRef = doc(db, 'forum-topics', topicId);
        const topicSnap = await getDoc(topicRef);
        if (topicSnap.exists()) {
          setTopic({ id: topicSnap.id, ...topicSnap.data() } as Topic);

          // Fetch posts only if topic exists
          const postsQuery = query(
            collection(db, `forum-topics/${topicId}/posts`),
            orderBy('createdAt', 'asc')
          );
          const unsubscribe = onSnapshot(
            postsQuery,
            async (querySnapshot) => {
              const fetchedPosts: Post[] = [];
              const userPrivacyCache = new Map<string, boolean>();

              for (const docSnapshot of querySnapshot.docs) {
                const postData = docSnapshot.data();
                let authorIsPrivate = false;

                if (userPrivacyCache.has(postData.authorId)) {
                  authorIsPrivate = userPrivacyCache.get(postData.authorId)!;
                } else {
                  const userRef = doc(db, 'users', postData.authorId);
                  const userSnap = await getDoc(userRef);
                  if (userSnap.exists()) {
                    authorIsPrivate = userSnap.data().settings?.publicProfile === false;
                    userPrivacyCache.set(postData.authorId, authorIsPrivate);
                  }
                }

                fetchedPosts.push({
                  id: docSnapshot.id,
                  ...postData,
                  authorIsPrivate,
                } as Post);
              }

              setPosts(fetchedPosts);
              setLoading(false);
            },
            (err) => {
              console.error('Error fetching posts:', err);
              setError('Failed to load posts for this topic.');
              setLoading(false);
            }
          );
          return unsubscribe;
        } else {
          setError('Topic not found.');
          setLoading(false);
          return () => {}; // Return a no-op unsubscribe function
        }
      } catch (err) {
        console.error('Error fetching topic:', err);
        setError('Failed to load topic.');
        setLoading(false);
        return () => {};
      }
    };

    const unsubscribePromise = fetchTopicAndPosts();

    return () => {
      unsubscribePromise.then((unsub) => unsub && unsub());
    };
  }, [topicId, db]);

  const handleReply = async () => {
    if (!user || !userProfile) {
      toast({
        title: 'Not Authenticated',
        description: 'You must be logged in to reply.',
        variant: 'destructive',
      });
      return;
    }
    if (!replyContent.trim()) {
      toast({
        title: 'Missing Content',
        description: 'Please provide a message.',
        variant: 'destructive',
      });
      return;
    }
    setIsSubmitting(true);
    try {
      const result = await runAddPostToTopic({
        topicId,
        content: replyContent,
        authorId: user.uid,
        isAnonymous,
      });
      if (result.success) {
        toast({ title: 'Reply Posted!' });
        setReplyContent('');
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: (error as Error).message,
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <h1 className="text-2xl font-bold">Topic Not Found</h1>
        <p className="text-muted-foreground mt-2">{error}</p>
        <Button asChild variant="link" className="mt-4">
          <Link href="/leader/forum">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Return to Forum Categories
          </Link>
        </Button>
      </div>
    );
  }

  if (!topic) {
    return null; // Should be covered by error state
  }

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-primary/10 via-primary/5 to-background border border-primary/20 rounded-2xl p-6 shadow-sm">
        <Button asChild variant="ghost" size="sm" className="mb-3 hover:bg-primary/10">
          <Link href={`/leader/forum/${topic.categoryId}`}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Topics
          </Link>
        </Button>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight font-headline flex items-center gap-3">
            <span className="p-2 rounded-xl bg-primary/10 text-primary">
              <MessageSquare className="h-6 w-6 sm:h-7 sm:w-7" />
            </span>
            {topic.title}
          </h1>
          <Badge variant="secondary" className="w-fit bg-primary/10 text-primary border border-primary/20 font-semibold px-3 py-1 text-xs sm:text-sm rounded-full flex items-center gap-1.5 shadow-xs">
            <MessageSquare className="h-4 w-4" />
            <span>{posts.length > 1 ? posts.length - 1 : 0}</span>
            <span>{posts.length - 1 === 1 ? 'Reply' : 'Replies'}</span>
          </Badge>
        </div>
      </div>

      <div className="space-y-6">
        {posts.map((post, index) => (
          <React.Fragment key={post.id}>
            {index === 0 ? (
              <Card className="border shadow-sm">
                <CardHeader>
                  <PostCard post={post} isOriginalPost={true} />
                </CardHeader>
              </Card>
            ) : (
              <Card className="border shadow-sm">
                <CardContent className="pt-6">
                  <PostCard post={post} />
                </CardContent>
              </Card>
            )}
            {index === 0 && posts.length > 1 && (
              <>
                <Separator />
                <h3 className="text-xl font-semibold flex items-center gap-2">
                  <span>Replies</span>
                  <span className="text-sm font-normal text-muted-foreground">({posts.length - 1})</span>
                </h3>
              </>
            )}
          </React.Fragment>
        ))}

        <Card>
          <CardHeader>
            <CardTitle>Post a Reply</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <RichTextEditor
              value={replyContent}
              onChange={setReplyContent}
              placeholder="Write your reply here..."
            />
            <div className="flex items-center space-x-2 pt-2 border-t">
              <Checkbox
                id="anonymous-reply"
                checked={isAnonymous}
                onCheckedChange={(checked) => setIsAnonymous(checked === true)}
              />
              <div className="grid gap-1.5 leading-none">
                <Label
                  htmlFor="anonymous-reply"
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                >
                  Post reply anonymously (Hide my name and avatar)
                </Label>
                <p className="text-xs text-muted-foreground">
                  Your reply will display as &quot;Anonymous Member&quot; to members.
                </p>
              </div>
            </div>
          </CardContent>
          <CardFooter>
            <Button onClick={handleReply} disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Submit Reply
            </Button>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
