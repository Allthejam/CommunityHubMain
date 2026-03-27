
'use client'
import * as React from 'react';
import CreatePostForm from '@/components/create-post-form'
import PostCard from '@/components/post-card'
import { type Post } from '@/components/post-card';
import { useUser, useFirestore, useCollection, useMemoFirebase, useDoc } from '@/firebase';
import { collection, query, where, orderBy, doc, Timestamp, onSnapshot, getDoc } from 'firebase/firestore';
import { Loader2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import EmergencyAlert from '@/components/emergency-alert';
import { type Announcement } from '@/lib/announcement-data';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { NationalAdvertisers } from '@/components/national-advertisers';
import { ValuedPartners } from '@/components/valued-partners';
import { UpcomingEventsFeed } from '@/components/upcoming-events-feed';

export default function FeedPage() {
  const { user, isUserLoading } = useUser();
  const db = useFirestore();
  const userProfileRef = useMemoFirebase(() => (user ? doc(db, 'users', user.uid) : null), [user, db]);
  const { data: userProfile, isLoading: profileLoading } = useDoc(userProfileRef);

  const [posts, setPosts] = React.useState<Post[]>([]);
  const [postsLoading, setPostsLoading] = React.useState(true);

  React.useEffect(() => {
    if (!userProfile?.communityId || !db) {
        setPostsLoading(false);
        return;
    };
    
    const postsQuery = query(
      collection(db, `communities/${userProfile.communityId}/posts`),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(postsQuery, async (snapshot) => {
        const userPrivacyCache = new Map<string, boolean>();

        const postsData: Post[] = await Promise.all(snapshot.docs.map(async (postDoc) => {
            const post = postDoc.data();
            let authorIsPrivate = false;

            if (userPrivacyCache.has(post.authorId)) {
                authorIsPrivate = userPrivacyCache.get(post.authorId)!;
            } else {
                const userRef = doc(db, "users", post.authorId);
                const userSnap = await getDoc(userRef);
                if (userSnap.exists()) {
                    authorIsPrivate = userSnap.data().settings?.publicProfile === false;
                    userPrivacyCache.set(post.authorId, authorIsPrivate);
                }
            }
            
            return {
                id: postDoc.id,
                ...post,
                author: authorIsPrivate ? 'Anonymous Member' : post.authorName,
                authorAvatar: authorIsPrivate ? '' : post.authorAvatar,
                timestamp: post.createdAt ? formatDistanceToNow(post.createdAt.toDate(), { addSuffix: true }) : 'just now',
                image: post.image || null,
                videoUrl: post.videoUrl || null,
                likedBy: post.likedBy || [],
                communityId: post.communityId,
                commentCount: post.commentCount || 0,
            } as Post;
        }));
        setPosts(postsData);
        setPostsLoading(false);
    });

    return () => unsubscribe();
  }, [userProfile?.communityId, db]);
  
  const platformAnnouncementsQuery = useMemoFirebase(() => {
      if (!db) return null;
      return query(
          collection(db, "announcements"), 
          where("scope", "==", "platform"),
          where("status", "==", "Live")
      );
  }, [db]);
  const { data: platformAnnouncementsData, isLoading: platformLoading } = useCollection<Announcement>(platformAnnouncementsQuery);

  const communityAnnouncementsQuery = useMemoFirebase(() => {
      if (!db || !userProfile?.communityId) return null;
      return query(
          collection(db, "announcements"), 
          where("scope", "==", "community"),
          where("communityId", "==", userProfile.communityId),
          where("status", "==", "Live")
      );
  }, [db, userProfile?.communityId]);
  const { data: communityAnnouncementsData, isLoading: communityLoading } = useCollection<Announcement>(communityAnnouncementsQuery);

  const allAnnouncements = [...(platformAnnouncementsData || []), ...(communityAnnouncementsData || [])];
  
  const settings = (userProfile as any)?.settings || {};
  const mailingLists = (userProfile as any)?.mailingLists || {};

  const showEmergency = mailingLists.emergency !== false;

  const emergencyBroadcasts = showEmergency 
    ? allAnnouncements.filter(a => a.type === "Emergency") 
    : [];
    
  const standardAnnouncements = allAnnouncements.filter(a => a.type === "Standard");

  const loading = isUserLoading || profileLoading || postsLoading || platformLoading || communityLoading;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 items-start">
        <aside className="hidden lg:block lg:col-span-1 lg:sticky lg:top-24 space-y-6">
          <NationalAdvertisers layout="compact" />
          <ValuedPartners />
        </aside>

        <div className="lg:col-span-2 space-y-6">
          <div className="lg:hidden">
            <EmergencyAlert allBroadcasts={emergencyBroadcasts} />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            Community Feed
          </h1>
          <CreatePostForm />
          <div className="space-y-4">
            {loading ? (
              <div className="flex justify-center items-center h-48">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : posts && posts.length > 0 ? (
              posts.map((post) => (
                <PostCard key={post.id} post={post} />
              ))
            ) : (
              <div className="text-center py-12">
                <h3 className="text-lg font-semibold">No posts yet</h3>
                <p className="text-muted-foreground">Be the first to share something with your community!</p>
              </div>
            )}
          </div>
        </div>

        <aside className="hidden lg:block lg:col-span-1 lg:sticky lg:top-24 space-y-6">
           <EmergencyAlert allBroadcasts={emergencyBroadcasts} />
           <UpcomingEventsFeed />
           <Card>
            <CardHeader>
                <CardTitle>Placeholder</CardTitle>
            </CardHeader>
            <CardContent>
                <p className="text-muted-foreground">We will populate this later.</p>
            </CardContent>
          </Card>
        </aside>
      </div>
    </div>
  )
}
