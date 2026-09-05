'use client'
import * as React from 'react';
import CreatePostForm from '@/components/create-post-form'
import PostCard from '@/components/post-card'
import { type Post } from '@/components/post-card';
import { useUser, useFirestore, useCollection, useMemoFirebase, useDoc } from '@/firebase';
import { collection, query, where, orderBy, doc, onSnapshot, getDoc } from 'firebase/firestore';
import { Loader2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import EmergencyAlert from '@/components/emergency-alert';
import { type Announcement } from '@/lib/announcement-data';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import NationalAdvertisers from '@/components/national-advertisers';
import { ValuedPartners } from '@/components/valued-partners';
import { UpcomingEventsFeed } from '@/components/upcoming-events-feed';
import { CommunityNoticeboardCarousel } from '@/components/community-noticeboard-carousel';

export default function FeedPage() {
  const { user, isUserLoading } = useUser();
  const db = useFirestore();
  const userProfileRef = useMemoFirebase(() => (user ? doc(db, 'users', user.uid) : null), [user, db]);
  const { data: userProfile, isLoading: profileLoading } = useDoc(userProfileRef);

  const [posts, setPosts] = React.useState<Post[]>([]);
  const [localDemoPosts, setLocalDemoPosts] = React.useState<Post[]>([]);
  const [postsLoading, setPostsLoading] = React.useState(true);
  
  const isDemo = typeof window !== 'undefined' && (sessionStorage.getItem('isDemoMode') === 'true' || window.location.pathname.startsWith('/demo'));
  const visitedId = typeof window !== 'undefined' ? sessionStorage.getItem('visitedCommunityId') : null;
  const communityId = isDemo ? '9ayHMyZf4SRw2gof1AM9' : (visitedId || userProfile?.primaryHomeCommunityId || userProfile?.homeCommunityId || userProfile?.communityId || 'N3SarfGXPLxBI7XcsinX');

  // Listen to local browser posts in demo mode
  React.useEffect(() => {
    const loadLocalPosts = () => {
      if (typeof window === 'undefined') return;
      try {
        const storageKeys = [
          `demo_posts_${communityId}`,
          'demo_posts_9ayHMyZf4SRw2gof1AM9',
          'demo_posts_c_showhome',
          'demo_posts_N3SarfGXPLxBI7XcsinX'
        ];
        const allSaved: Post[] = [];
        const seenIds = new Set<string>();

        for (const k of storageKeys) {
          const raw = sessionStorage.getItem(k) || localStorage.getItem(k);
          if (raw) {
            try {
              const parsed = JSON.parse(raw);
              if (Array.isArray(parsed)) {
                for (const p of parsed) {
                  const id = String(p.id);
                  if (!seenIds.has(id)) {
                    seenIds.add(id);
                    allSaved.push(p);
                  }
                }
              }
            } catch (e) {
              // ignore json parse err
            }
          }
        }
        setLocalDemoPosts(allSaved);
      } catch (err) {
        console.warn("Could not load local demo posts:", err);
      }
    };

    loadLocalPosts();
    window.addEventListener('demo-posts-updated', loadLocalPosts);
    return () => window.removeEventListener('demo-posts-updated', loadLocalPosts);
  }, [communityId]);

  React.useEffect(() => {
    if (!communityId || !db) {
      setPostsLoading(false);
      return;
    }
    
    const postsQuery = query(
      collection(db, `communities/${communityId}/posts`),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(postsQuery, async (snapshot) => {
      const userPrivacyCache = new Map<string, boolean>();

      const postsData: Post[] = await Promise.all(snapshot.docs.map(async (postDoc) => {
        try {
          const post = postDoc.data();
          let authorIsPrivate = false;

          if (post.authorId) {
            try {
              if (userPrivacyCache.has(post.authorId)) {
                authorIsPrivate = userPrivacyCache.get(post.authorId)!;
              } else {
                const userRef = doc(db, "users", post.authorId);
                const userSnap = await getDoc(userRef);
                if (userSnap && userSnap.exists()) {
                  authorIsPrivate = userSnap.data().settings?.publicProfile === false;
                }
                userPrivacyCache.set(post.authorId, authorIsPrivate);
              }
            } catch (err) {
              userPrivacyCache.set(post.authorId, false);
            }
          }

          let displayTimestamp = 'just now';
          if (post.createdAt) {
            try {
              if (typeof post.createdAt?.toDate === 'function') {
                displayTimestamp = formatDistanceToNow(post.createdAt.toDate(), { addSuffix: true });
              } else if (post.createdAt?._seconds) {
                displayTimestamp = formatDistanceToNow(new Date(post.createdAt._seconds * 1000), { addSuffix: true });
              } else if (typeof post.createdAt === 'string') {
                displayTimestamp = formatDistanceToNow(new Date(post.createdAt), { addSuffix: true });
              } else if (post.createdAt instanceof Date) {
                displayTimestamp = formatDistanceToNow(post.createdAt, { addSuffix: true });
              }
            } catch (dateErr) {
              displayTimestamp = post.timestamp || 'recently';
            }
          } else if (post.timestamp) {
            displayTimestamp = post.timestamp;
          }

          return {
            id: postDoc.id,
            ...post,
            author: authorIsPrivate ? 'Anonymous Member' : (post.authorName || post.author || 'Community Member'),
            authorAvatar: authorIsPrivate ? '' : (post.authorAvatar || ''),
            timestamp: displayTimestamp,
            image: post.image || null,
            videoUrl: post.videoUrl || null,
            likedBy: post.likedBy || [],
            communityId: post.communityId || communityId,
            commentCount: post.commentCount || 0,
            likes: post.likes || (post.likedBy?.length || 0),
          } as Post;
        } catch (postErr) {
          console.warn("Error parsing post doc:", postDoc.id, postErr);
          const raw = postDoc.data();
          return {
            id: postDoc.id,
            author: raw.authorName || raw.author || 'Community Member',
            authorAvatar: raw.authorAvatar || '',
            content: raw.content || '',
            timestamp: 'just now',
            communityId: raw.communityId || communityId,
            likes: 0,
            comments: 0,
            likedBy: [],
          } as Post;
        }
      }));

      setPosts(postsData);
      setPostsLoading(false);
    }, (error) => {
      console.warn("Could not subscribe to Firestore posts (using local/fallback):", error);
      setPostsLoading(false);
    });

    return () => unsubscribe();
  }, [communityId, db]);

  const allPosts = React.useMemo(() => {
    const merged = [...localDemoPosts, ...posts];
    const seen = new Set<string>();
    return merged.filter(p => {
      const id = String(p.id);
      if (seen.has(id)) return false;
      seen.add(id);
      return true;
    });
  }, [localDemoPosts, posts]);
  
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
      if (!db || !communityId) return null;
      return query(
          collection(db, "announcements"), 
          where("scope", "==", "community"),
          where("communityId", "==", communityId),
          where("status", "==", "Live")
      );
  }, [db, communityId]);
  const { data: communityAnnouncementsData, isLoading: communityLoading } = useCollection<Announcement>(communityAnnouncementsQuery);

  const allAnnouncements = [...(platformAnnouncementsData || []), ...(communityAnnouncementsData || [])];
  
  const mailingLists = (userProfile as any)?.mailingLists || {};
  const showEmergency = mailingLists.emergency !== false;

  const emergencyBroadcasts = showEmergency 
    ? allAnnouncements.filter(a => a.type === "Emergency") 
    : [];
    
  const loading = (isUserLoading && !isDemo) || (postsLoading && posts.length === 0 && localDemoPosts.length === 0);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 items-start">
        {/* Left Sidebar - Independent Scroll */}
        <aside className="hidden lg:block lg:col-span-1 lg:sticky lg:top-24 space-y-6 max-height-[calc(100vh-7rem)] overflow-y-auto pr-2 custom-scrollbar">
          <NationalAdvertisers layout="feed" />
          <ValuedPartners />
        </aside>

        {/* Main Feed */}
        <div className="lg:col-span-2 space-y-6">
          <div className="lg:hidden">
            <EmergencyAlert allBroadcasts={emergencyBroadcasts} />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl px-4 md:px-0">
            Community Feed
          </h1>
          <div className="px-4 md:px-0">
            <CreatePostForm communityId={communityId} />
          </div>
          <div className="space-y-4 px-4 md:px-0">
            {loading ? (
              <div className="flex justify-center items-center h-48">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : allPosts && allPosts.length > 0 ? (
              allPosts.map((post) => (
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

        {/* Right Sidebar - Independent Scroll */}
        <aside className="hidden lg:block lg:col-span-1 lg:sticky lg:top-24 space-y-6 max-height-[calc(100vh-7rem)] overflow-y-auto pl-2 custom-scrollbar">
           <EmergencyAlert allBroadcasts={emergencyBroadcasts} />
           <UpcomingEventsFeed />
           <CommunityNoticeboardCarousel />
        </aside>
      </div>
    </div>
  )
}
