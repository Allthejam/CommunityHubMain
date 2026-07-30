'use client';

import * as React from 'react';
import PostCard from '@/components/post-card';
import type { Post } from '@/components/post-card';
import MainAppLayout from '../(main)/layout';
import { cn } from '@/lib/utils';
import { ReportItemForm } from '@/components/report-item-form';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useCollection, useFirestore, useUser, useMemoFirebase, useDoc } from '@/firebase';
import { collection, query, where, Timestamp, doc } from 'firebase/firestore';
import { 
  Loader2, 
  HeartHandshake, 
  Info, 
  Search, 
  MapPin, 
  Calendar, 
  PlusCircle, 
  MessageCircle, 
  ArrowRight, 
  User, 
  Clock,
  Sparkles,
  AlertTriangle
} from 'lucide-react';
import { type Item as LeaderItem } from '../leader/lost-and-found/page';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import Image from 'next/image';
import Link from 'next/link';
import { findOrCreateChatForItem } from '@/lib/actions/chatActions';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { formatDistanceToNow } from 'date-fns';

type Item = Omit<LeaderItem, 'date'> & {
    date: Timestamp;
    reporterName: string;
    communityId: string;
    ownerId?: string;
    location?: string;
    description?: string;
    type?: 'lost' | 'found';
    status?: string;
    image?: string;
};

const LostAndFoundCard = ({ item }: { item: Item }) => {
  const { user } = useUser();
  const router = useRouter();
  const { toast } = useToast();
  const [isContacting, setIsContacting] = React.useState(false);

  const isLost = item.type === 'lost';
  const isOwner = user?.uid === item.ownerId;
  const formattedTime = item.date?.toDate ? formatDistanceToNow(item.date.toDate(), { addSuffix: true }) : 'Recently';

  const handleContactReporter = async () => {
    if (!user) {
      toast({ title: "Please sign in", description: "You must be logged in to contact the reporter.", variant: "destructive" });
      return;
    }
    if (isOwner) {
      toast({ title: "Your report", description: "This is a report created by you.", variant: "destructive" });
      return;
    }
    if (!item.ownerId) {
      toast({ title: "Unavailable", description: "Reporter contact info not available.", variant: "destructive" });
      return;
    }

    setIsContacting(true);
    const result = await findOrCreateChatForItem({
      currentUserId: user.uid,
      sellerId: item.ownerId,
      itemId: item.id,
      itemTitle: item.name || item.description || 'Lost & Found Report',
    });
    setIsContacting(false);

    if (result.success && result.conversationId) {
      router.push(`/chat?conversationId=${result.conversationId}`);
    } else {
      toast({ title: 'Error', description: result.error || 'Could not start conversation.', variant: 'destructive' });
    }
  };

  return (
    <Card className="flex flex-col overflow-hidden border-2 border-border/80 hover:border-rose-400 dark:hover:border-rose-600 transition-all duration-200 shadow-xs hover:shadow-md group">
      {item.image && (
        <div className="relative w-full aspect-video bg-muted overflow-hidden">
          <Image src={item.image} alt={item.name || 'Reported item'} fill className="object-cover group-hover:scale-105 transition-transform duration-300" />
          <Badge className={cn("absolute top-3 left-3 text-xs font-bold shadow-xs", isLost ? "bg-rose-600 text-white" : "bg-emerald-600 text-white")}>
            {isLost ? '🔴 Lost Item' : '🟢 Found Item'}
          </Badge>
        </div>
      )}

      <CardHeader className="p-4 sm:p-5 pb-2">
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="text-base sm:text-lg font-bold group-hover:text-rose-600 dark:group-hover:text-rose-400 transition-colors line-clamp-1">
            {item.name || (isLost ? 'Lost Item Report' : 'Found Item Report')}
          </CardTitle>
          {!item.image && (
            <Badge className={cn("text-[11px] font-bold shrink-0", isLost ? "bg-rose-600 text-white" : "bg-emerald-600 text-white")}>
              {isLost ? '🔴 Lost' : '🟢 Found'}
            </Badge>
          )}
        </div>
        <CardDescription className="text-xs flex items-center gap-1.5 pt-0.5">
          <User className="h-3 w-3 text-rose-600 shrink-0" />
          <span className="font-semibold text-foreground">{item.reporterName || 'Community Member'}</span>
          <span>•</span>
          <Clock className="h-3 w-3 shrink-0" />
          <span>{formattedTime}</span>
        </CardDescription>
      </CardHeader>

      <CardContent className="p-4 sm:p-5 pt-0 flex-grow space-y-2">
        <p className="text-xs text-muted-foreground line-clamp-3 leading-relaxed">{item.description}</p>
        {item.location && (
          <div className="flex items-center gap-1 text-[11px] font-medium text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/40 p-2 rounded-md border border-rose-200 dark:border-rose-900/50">
            <MapPin className="h-3.5 w-3.5 text-rose-600 shrink-0" />
            <span className="truncate">Last seen near: <strong>{item.location}</strong></span>
          </div>
        )}
      </CardContent>

      <CardFooter className="p-4 sm:p-5 pt-0 border-t border-border/40 flex justify-between items-center mt-auto">
        {!isOwner && item.ownerId ? (
          <Button size="sm" className="h-9 text-xs font-semibold w-full bg-rose-600 hover:bg-rose-700 text-white gap-1.5 shadow-xs" onClick={handleContactReporter} disabled={isContacting}>
            {isContacting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <MessageCircle className="h-3.5 w-3.5" />}
            <span>Contact {isLost ? 'Finder / Owner' : 'Finder'}</span>
          </Button>
        ) : (
          <Badge variant="outline" className="text-[11px] w-full py-1.5 justify-center bg-muted/50 font-medium">
            {isOwner ? 'Your Report' : 'Active Community Report'}
          </Badge>
        )}
      </CardFooter>
    </Card>
  );
};

function LostAndFoundContent() {
  const { user, isUserLoading } = useUser();
  const db = useFirestore();
  const [searchQuery, setSearchQuery] = React.useState('');

  const userProfileRef = useMemoFirebase(() => (user ? doc(db, 'users', user.uid) : null), [user, db]);
  const { data: userProfile, isLoading: profileLoading } = useDoc(userProfileRef);
  const communityId = userProfile?.communityId;
  
  const activeItemsQuery = useMemoFirebase(() => 
    communityId && db
      ? query(
          collection(db, 'lostAndFound'),
          where('status', '==', 'active'),
          where('communityId', '==', communityId)
        )
      : null
  , [communityId, db]);

  const userPendingItemsQuery = useMemoFirebase(() =>
    user?.uid && communityId && db
      ? query(
          collection(db, 'lostAndFound'),
          where('status', '==', 'new'),
          where('ownerId', '==', user.uid),
          where('communityId', '==', communityId)
        )
      : null
  , [user, communityId, db]);

  const { data: activeItems, isLoading: activeItemsLoading } = useCollection<Item>(activeItemsQuery);
  const { data: pendingItems, isLoading: pendingItemsLoading } = useCollection<Item>(userPendingItemsQuery);

  const loading = isUserLoading || profileLoading || activeItemsLoading || pendingItemsLoading;

  const allItems = React.useMemo(() => {
    const combined = [...(activeItems || [])];
    const activeIds = new Set(combined.map(item => item.id));
    
    if (pendingItems) {
      pendingItems.forEach(item => {
        if (!activeIds.has(item.id)) {
          combined.push(item);
        }
      });
    }
    
    const twentyEightDaysAgo = new Date();
    twentyEightDaysAgo.setDate(twentyEightDaysAgo.getDate() - 28);
    
    return combined.filter(item => {
        try {
            const rawDate = item.date || (item as any).createdAt;
            if (!rawDate) return false;
            const itemDate = rawDate?.toDate ? rawDate.toDate() : new Date(rawDate);
            if (isNaN(itemDate.getTime())) return false;
            return itemDate >= twentyEightDaysAgo;
        } catch (e) {
            return false;
        }
    });
  }, [activeItems, pendingItems]);

  const filteredItems = React.useMemo(() => {
    if (!allItems) return [];
    if (!searchQuery.trim()) return allItems;
    const q = searchQuery.toLowerCase();
    return allItems.filter(item => 
      (item.name && item.name.toLowerCase().includes(q)) || 
      (item.description && item.description.toLowerCase().includes(q)) ||
      (item.location && item.location.toLowerCase().includes(q)) ||
      (item.reporterName && item.reporterName.toLowerCase().includes(q))
    );
  }, [allItems, searchQuery]);

  const lostItems = filteredItems.filter(item => item.type === 'lost');
  const foundItems = filteredItems.filter(item => item.type === 'found');

  return (
    <div className="space-y-8 pb-12">
      {/* Hero Header Banner */}
      <div className="p-6 md:p-8 rounded-2xl bg-gradient-to-r from-rose-500/15 via-pink-500/15 to-purple-500/15 border border-rose-200/50 dark:border-rose-900/40 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2.5">
              <div className="p-2.5 rounded-xl bg-rose-600 text-white shadow-xs">
                <HeartHandshake className="h-6 w-6" />
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight font-headline">
                Lost & Found
              </h1>
            </div>
            <p className="text-sm text-muted-foreground pt-1">
              Help neighbors reunite with missing items in {userProfile?.communityName || 'your community'}.
            </p>
          </div>

          <ReportItemForm />
        </div>

        {/* Live Search Input */}
        <div className="relative max-w-md pt-2">
          <Search className="absolute left-3.5 top-5 h-4 w-4 text-muted-foreground" />
          <Input 
            type="text" 
            placeholder="Search lost & found items, locations, descriptions..." 
            className="pl-10 h-10 bg-background/80 backdrop-blur-xs border-rose-200 dark:border-rose-900"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* Expiry Notice Banner */}
      <Alert className="border-amber-200 bg-amber-50/60 dark:bg-amber-950/30 text-amber-900 dark:text-amber-200">
        <Info className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0" />
        <AlertTitle className="font-bold text-xs">📅 28-Day Auto-Removal Notice</AlertTitle>
        <AlertDescription className="text-xs text-amber-800 dark:text-amber-300">
          All lost and found reports automatically expire 28 days after posting to ensure the board stays fresh and active.
        </AlertDescription>
      </Alert>

      {/* Tabs Component */}
      <Tabs defaultValue="lost" className="w-full">
        <TabsList className="grid w-full grid-cols-2 h-11 p-1 bg-muted/60">
          <TabsTrigger value="lost" className="text-xs font-bold gap-1.5 data-[state=active]:bg-background data-[state=active]:text-rose-700 dark:data-[state=active]:text-rose-300">
            <span>🔴 Lost Items ({lostItems.length})</span>
          </TabsTrigger>
          <TabsTrigger value="found" className="text-xs font-bold gap-1.5 data-[state=active]:bg-background data-[state=active]:text-emerald-700 dark:data-[state=active]:text-emerald-300">
            <span>🟢 Found Items ({foundItems.length})</span>
          </TabsTrigger>
        </TabsList>

        {/* Tab 1: Lost Items Grid */}
        <TabsContent value="lost" className="mt-6">
          {loading ? (
            <div className="flex justify-center items-center h-48"><Loader2 className="animate-spin h-8 w-8 text-muted-foreground" /></div>
          ) : lostItems.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {lostItems.map((item) => <LostAndFoundCard key={`lost-${item.id}`} item={item} />)}
            </div>
          ) : (
            <Card className="p-8 text-center border-dashed">
              <HeartHandshake className="h-12 w-12 text-muted-foreground/40 mx-auto mb-3" />
              <h3 className="text-lg font-bold">No Lost Items Reported</h3>
              <p className="text-sm text-muted-foreground mt-1 max-w-sm mx-auto">
                {searchQuery ? `No lost items matched "${searchQuery}".` : "No active lost item reports in your community right now."}
              </p>
            </Card>
          )}
        </TabsContent>

        {/* Tab 2: Found Items Grid */}
        <TabsContent value="found" className="mt-6">
          {loading ? (
            <div className="flex justify-center items-center h-48"><Loader2 className="animate-spin h-8 w-8 text-muted-foreground" /></div>
          ) : foundItems.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {foundItems.map((item) => <LostAndFoundCard key={`found-${item.id}`} item={item} />)}
            </div>
          ) : (
            <Card className="p-8 text-center border-dashed">
              <HeartHandshake className="h-12 w-12 text-muted-foreground/40 mx-auto mb-3" />
              <h3 className="text-lg font-bold">No Found Items Reported</h3>
              <p className="text-sm text-muted-foreground mt-1 max-w-sm mx-auto">
                {searchQuery ? `No found items matched "${searchQuery}".` : "No active found item reports in your community right now."}
              </p>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default function LostAndFoundPage() {
    return (
        <MainAppLayout>
            <LostAndFoundContent />
        </MainAppLayout>
    );
}
