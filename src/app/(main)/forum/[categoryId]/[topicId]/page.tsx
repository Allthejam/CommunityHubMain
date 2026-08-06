'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import {
  Card,
  CardContent,
  CardHeader,
  CardFooter,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ArrowLeft, MessageSquare, Loader2 } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
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

type Post = {
  id: string;
  authorName: string;
  authorAvatar: string;
  authorId: string;
  createdAt: any;
  content: string;
  authorIsPrivate: boolean;
};

type Topic = {
  id: string;
  title: string;
  categoryId: string;
};

const PostCard = ({ post }: { post: Post }) => {
  const authorName = post.authorIsPrivate ? 'Anonymous Member' : post.authorName;
  const authorAvatar = post.authorIsPrivate ? '' : post.authorAvatar;
  const authorInitial = post.authorIsPrivate
    ? 'A'
    : (post.authorName || 'A').charAt(0);

  return (
    <div className="flex gap-4">
      <Avatar>
        <AvatarImage src={authorAvatar} alt={authorName} />
        <AvatarFallback>{authorInitial}</AvatarFallback>
      </Avatar>
      <div className="flex-1">
        <div className="flex items-center gap-2 text-sm">
          <span className="font-semibold">{authorName}</span>
          <span className="text-muted-foreground">
            {post.createdAt
              ? new Date(post.createdAt.toDate()).toLocaleString()
              : 'Just now'}
          </span>
        </div>
        <div
          className="mt-2 text-foreground prose dark:prose-invert max-w-none text-sm"
          dangerouslySetInnerHTML={{ __html: post.content }}
        />
      </div>
    </div>
  );
};

export default function TopicPage() {
  const params = useParams();
  const categoryId = params.categoryId as string;
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

  const userProfileRef = useMemoFirebase(
    () => (user ? doc(db, 'users', user.uid) : null),
    [user, db]
  );
  const { data: userProfile } = useDoc(userProfileRef);

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
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center">
        <h1 className="text-2xl font-bold">Topic Not Found</h1>
        <p className="text-muted-foreground">{error}</p>
        <Button asChild variant="link" className="mt-4">
          <Link href="/forum">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Return to Forum
          </Link>
        </Button>
      </div>
    );
  }

  if (!topic) {
    return null; // Should be covered by error state
  }

  return (
    <div className="space-y-8">
      <div>
        <Button asChild variant="ghost" className="mb-4">
          <Link href={`/forum/${categoryId}`}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Topics
          </Link>
        </Button>
        <h1 className="text-3xl font-bold tracking-tight font-headline flex items-center gap-2">
          <MessageSquare className="h-8 w-8 text-primary" />
          {topic.title}
        </h1>
      </div>

      <div className="space-y-6">
        {posts.map((post, index) => (
          <React.Fragment key={post.id}>
            {index === 0 ? (
              <Card>
                <CardHeader>
                  <PostCard post={post} />
                </CardHeader>
              </Card>
            ) : (
              <Card>
                <CardContent className="pt-6">
                  <PostCard post={post} />
                </CardContent>
              </Card>
            )}
            {index === 0 && posts.length > 1 && (
              <>
                <Separator />
                <h3 className="text-xl font-semibold">Replies</h3>
              </>
            )}
          </React.Fragment>
        ))}

        <Card>
          <CardHeader>
            <CardTitle>Post a Reply</CardTitle>
          </CardHeader>
          <CardContent>
            <RichTextEditor
              value={replyContent}
              onChange={setReplyContent}
              placeholder="Write your reply here..."
            />
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
