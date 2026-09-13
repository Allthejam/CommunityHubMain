
'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Loader2,
  PlusCircle,
  ShoppingCart,
  Upload,
  Camera,
  X,
  Trash2,
  Info,
  Clock,
} from 'lucide-react';
import { useUser, useFirestore, useDoc, useMemoFirebase, useCollection } from '@/firebase';
import { collection, query, where, doc, Timestamp } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { createMarketplaceListingAction, deleteMarketplaceListingAction } from '@/lib/actions/marketplaceActions';
import { findOrCreateChatForItem } from '@/lib/actions/chatActions';
import Image from 'next/image';
import { formatDistanceToNow } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

type MarketplaceItem = {
  id: string;
  ownerId: string;
  ownerName: string;
  title: string;
  description: string;
  listingType: 'For Sale' | 'To Swap' | 'Free' | 'Looking For';
  price?: number;
  image?: string;
  createdAt: any;
  expiresAt: any;
};

const ItemForm = ({ onSave }: { onSave: () => void }) => {
  const { user } = useUser();
  const db = useFirestore();
  const userProfileRef = useMemoFirebase(() => (user ? doc(db, 'users', user.uid) : null), [user, db]);
  const { data: userProfile } = useDoc(userProfileRef);
  const { toast } = useToast();

  const isDemo = typeof window !== 'undefined' && (
    window.location.pathname.startsWith('/demo') ||
    sessionStorage.getItem('visitedCommunityId') === '9ayHMyZf4SRw2gof1AM9' ||
    sessionStorage.getItem('visitedCommunityId') === 'c_showhome' ||
    sessionStorage.getItem('isDemoMode') === 'true'
  );

  const [title, setTitle] = React.useState('');
  const [description, setDescription] = React.useState('');
  const [listingType, setListingType] = React.useState<'For Sale' | 'To Swap' | 'Free' | 'Looking For'>('For Sale');
  const [price, setPrice] = React.useState('');
  const [image, setImage] = React.useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const handleSubmit = async () => {
    const effectiveCommunityId = (typeof window !== 'undefined' ? sessionStorage.getItem('visitedCommunityId') : null) || userProfile?.primaryHomeCommunityId || userProfile?.homeCommunityId || userProfile?.communityId || (isDemo ? '9ayHMyZf4SRw2gof1AM9' : null);
    const effectiveUserId = user?.uid || (isDemo ? 'demo-personal' : null);
    const effectiveUserName = userProfile?.name || (isDemo ? 'Demo Resident' : null);

    if (!effectiveUserId || !effectiveCommunityId) {
      toast({ title: 'Error', description: 'You must be logged in to a community.', variant: 'destructive' });
      return;
    }
    if (!title || !description) {
      toast({ title: 'Error', description: 'Title and description are required.', variant: 'destructive' });
      return;
    }

    setIsSubmitting(true);
    const result = await createMarketplaceListingAction({
      ownerId: effectiveUserId,
      ownerName: effectiveUserName || 'Demo Resident',
      ownerAvatar: userProfile?.avatar || '',
      communityId: effectiveCommunityId,
      title,
      description,
      listingType,
      price: listingType === 'For Sale' ? parseFloat(price) || 0 : 0,
      image,
    });
    setIsSubmitting(false);

    if (result.success) {
      if (isDemo && typeof window !== 'undefined') {
        const key = `demo_marketplace_${effectiveCommunityId}`;
        const existing = JSON.parse(sessionStorage.getItem(key) || '[]');
        const newItem = {
          id: `demo-${Date.now()}`,
          ownerId: effectiveUserId,
          ownerName: effectiveUserName || 'Demo Resident',
          title,
          description,
          listingType,
          price: listingType === 'For Sale' ? parseFloat(price) || 0 : 0,
          image,
          createdAt: new Date().toISOString(),
          expiresAt: new Date(Date.now() + 21 * 86400000).toISOString(),
        };
        sessionStorage.setItem(key, JSON.stringify([newItem, ...existing]));
        window.dispatchEvent(new CustomEvent('demo_marketplace_updated'));
      }
      toast({ title: 'Success', description: 'Your listing has been posted.' });
      onSave(); // Close dialog on success
    } else {
      toast({ title: 'Error', description: result.error, variant: 'destructive' });
    }
  };

  return (
    <div className="grid gap-4 py-4">
      <div className="space-y-2">
        <Label htmlFor="title">Title *</Label>
        <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g., Used Bicycle" />
      </div>
      <div className="space-y-2">
        <Label htmlFor="description">Description *</Label>
        <Textarea id="description" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Condition, details, etc." />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="listing-type">Listing Type *</Label>
          <Select value={listingType} onValueChange={(val) => setListingType(val as any)}>
            <SelectTrigger id="listing-type">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="For Sale">For Sale</SelectItem>
              <SelectItem value="To Swap">To Swap</SelectItem>
              <SelectItem value="Free">Free</SelectItem>
              <SelectItem value="Looking For">Looking For</SelectItem>
            </SelectContent>
          </Select>
        </div>
        {listingType === 'For Sale' && (
          <div className="space-y-2">
            <Label htmlFor="price">Price (£)</Label>
            <Input id="price" type="number" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="e.g., 50.00" />
          </div>
        )}
      </div>
      <div className="space-y-2">
        <Label>Image (Optional)</Label>
        {image ? (
          <div className="relative w-32 h-32">
            <Image src={image} alt="Preview" fill style={{ objectFit: 'cover' }} className="rounded-md border" />
            <Button variant="destructive" size="icon" className="absolute -top-2 -right-2 h-6 w-6" onClick={() => setImage(null)}><X className="h-4 w-4" /></Button>
          </div>
        ) : (
          <Input type="file" accept="image/*" onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) {
              const reader = new FileReader();
              reader.onloadend = () => setImage(reader.result as string);
              reader.readAsDataURL(file);
            }
          }} />
        )}
      </div>
      <DialogFooter>
        <Button onClick={handleSubmit} disabled={isSubmitting}>
          {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Post Listing
        </Button>
      </DialogFooter>
    </div>
  );
};

const MarketplaceItemCard = ({ item, onDelete }: { item: MarketplaceItem, onDelete: (itemId: string) => void }) => {
    const { user } = useUser();
    const router = useRouter();
    const { toast } = useToast();
    const [isContacting, setIsContacting] = React.useState(false);
    const isOwner = user?.uid === item.ownerId || item.ownerId === 'demo-personal';
  
    const handleContactSeller = async () => {
        if (!user) {
            toast({ title: "Please sign in", description: "You must be logged in to contact a seller.", variant: "destructive" });
            return;
        }
        if (isOwner) {
            toast({ title: "This is your listing", description: "You cannot contact yourself.", variant: "destructive" });
            return;
        }

        setIsContacting(true);
        const result = await findOrCreateChatForItem({
            currentUserId: user.uid,
            sellerId: item.ownerId,
            itemId: item.id,
            itemTitle: item.title,
        });
        setIsContacting(false);

        if (result.success && result.conversationId) {
            router.push(`/chat?conversationId=${result.conversationId}`);
        } else {
            toast({ title: 'Error', description: result.error || 'Could not start a conversation.', variant: 'destructive' });
        }
    };

    const formattedDate = React.useMemo(() => {
      try {
        if (item.createdAt?.toDate) {
          return formatDistanceToNow(item.createdAt.toDate(), { addSuffix: true });
        }
        if (typeof item.createdAt === 'string') {
          return formatDistanceToNow(new Date(item.createdAt), { addSuffix: true });
        }
        if (item.createdAt instanceof Date) {
          return formatDistanceToNow(item.createdAt, { addSuffix: true });
        }
      } catch (e) {
        // fallback
      }
      return 'recently';
    }, [item.createdAt]);

    const remainingDays = React.useMemo(() => {
      try {
        const rawExpiry = item.expiresAt;
        if (!rawExpiry) return null;
        const expiryDate = rawExpiry?.toDate ? rawExpiry.toDate() : new Date(rawExpiry);
        const diffMs = expiryDate.getTime() - Date.now();
        const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
        if (diffDays <= 0) return 'Expires today';
        if (diffDays === 1) return '1 day left';
        return `${diffDays} days left`;
      } catch {
        return null;
      }
    }, [item.expiresAt]);
  
    return (
      <Card className="flex flex-col">
        {item.image && (
          <div className="relative w-full aspect-video">
            <Image src={item.image} alt={item.title} fill className="object-cover rounded-t-lg" />
          </div>
        )}
        <CardHeader>
          <div className="flex items-start justify-between gap-2">
            <CardTitle>{item.title}</CardTitle>
            {remainingDays && (
              <span className="text-[11px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground border font-medium shrink-0 flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {remainingDays}
              </span>
            )}
          </div>
          <CardDescription>
            Posted by {item.ownerName} • {formattedDate}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex-grow">
          <p className="text-sm text-muted-foreground">{item.description}</p>
        </CardContent>
        <CardFooter className="flex justify-between items-center">
          {item.listingType === 'For Sale' && item.price && item.price > 0 ? (
            <span className="font-bold text-lg">£{item.price.toFixed(2)}</span>
          ) : (
            <Badge variant="outline">{item.listingType}</Badge>
          )}
          {isOwner ? (
            <Button variant="destructive" size="sm" onClick={() => onDelete(item.id)}>
              <Trash2 className="mr-2 h-4 w-4" /> Delete
            </Button>
          ) : (
            <Button size="sm" onClick={handleContactSeller} disabled={isContacting}>
                {isContacting && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}
                Contact Seller
            </Button>
          )}
        </CardFooter>
      </Card>
    );
};

export default function MarketplacePage() {
  const { user, isUserLoading } = useUser();
  const db = useFirestore();
  const userProfileRef = useMemoFirebase(() => (user ? doc(db, 'users', user.uid) : null), [user, db]);
  const { data: userProfile, isLoading: profileLoading } = useDoc(userProfileRef);

  const isDemo = typeof window !== 'undefined' && (
    window.location.pathname.startsWith('/demo') ||
    sessionStorage.getItem('visitedCommunityId') === '9ayHMyZf4SRw2gof1AM9' ||
    sessionStorage.getItem('visitedCommunityId') === 'c_showhome' ||
    sessionStorage.getItem('isDemoMode') === 'true'
  );

  const communityId = (typeof window !== 'undefined' ? sessionStorage.getItem('visitedCommunityId') : null) || userProfile?.primaryHomeCommunityId || userProfile?.homeCommunityId || userProfile?.communityId || (isDemo ? '9ayHMyZf4SRw2gof1AM9' : null);
  const [isFormOpen, setIsFormOpen] = React.useState(false);

  const marketplaceQuery = useMemoFirebase(() => {
    if (isDemo || !communityId || !db) return null;
    return query(
      collection(db, `communities/${communityId}/marketplace`),
      where('expiresAt', '>', Timestamp.now())
    );
  }, [communityId, db, isDemo]);
  const { data: firestoreItems, isLoading: itemsLoading } = useCollection<MarketplaceItem>(marketplaceQuery);

  const [demoItems, setDemoItems] = React.useState<MarketplaceItem[]>([]);
  const [isDemoLoading, setIsDemoLoading] = React.useState(false);

  const loadDemoItems = React.useCallback(async () => {
    if (!communityId) return;
    setIsDemoLoading(true);
    try {
      const res = await getMarketplaceListingsAction(communityId);
      const serverItems = res.success && res.data ? res.data : [];
      const localKey = `demo_marketplace_${communityId}`;
      const localItems: MarketplaceItem[] = typeof window !== 'undefined' ? JSON.parse(sessionStorage.getItem(localKey) || '[]') : [];
      const combined = [...localItems, ...serverItems.filter(s => !localItems.some(l => l.id === s.id))];
      setDemoItems(combined as any);
    } catch (e) {
      console.error(e);
    } finally {
      setIsDemoLoading(false);
    }
  }, [communityId]);

  React.useEffect(() => {
    if (isDemo && communityId) {
      loadDemoItems();
    }
  }, [isDemo, communityId, loadDemoItems]);

  React.useEffect(() => {
    const handleUpdate = () => {
      if (isDemo && communityId) {
        loadDemoItems();
      }
    };
    window.addEventListener('demo_marketplace_updated', handleUpdate);
    return () => window.removeEventListener('demo_marketplace_updated', handleUpdate);
  }, [isDemo, communityId, loadDemoItems]);

  const items = isDemo ? demoItems : firestoreItems;

  const forSaleCount = React.useMemo(() => items?.filter((item) => item.listingType === 'For Sale').length ?? 0, [items]);
  const toSwapCount = React.useMemo(() => items?.filter((item) => item.listingType === 'To Swap').length ?? 0, [items]);
  const freeCount = React.useMemo(() => items?.filter((item) => item.listingType === 'Free').length ?? 0, [items]);
  const lookingForCount = React.useMemo(() => items?.filter((item) => item.listingType === 'Looking For').length ?? 0, [items]);

  const handleDelete = async (itemId: string) => {
    if (!communityId) return;
    if (isDemo) {
      const localKey = `demo_marketplace_${communityId}`;
      const existing: MarketplaceItem[] = typeof window !== 'undefined' ? JSON.parse(sessionStorage.getItem(localKey) || '[]') : [];
      const updated = existing.filter(i => i.id !== itemId);
      sessionStorage.setItem(localKey, JSON.stringify(updated));
      setDemoItems(prev => prev.filter(i => i.id !== itemId));
    }
    await deleteMarketplaceListingAction({ communityId, itemId, userId: user?.uid || 'demo-personal' });
  }

  const loading = (isUserLoading || profileLoading || itemsLoading || isDemoLoading) && !items?.length;

  const renderTabContent = (listingType: MarketplaceItem['listingType']) => {
    const filteredItems = items?.filter(item => item.listingType === listingType);
    if (loading) return <div className="flex justify-center items-center h-48"><Loader2 className="h-8 w-8 animate-spin" /></div>;
    if (!filteredItems || filteredItems.length === 0) return <p className="col-span-full text-center text-muted-foreground py-10">No items listed in this category.</p>;

    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredItems.map(item => <MarketplaceItemCard key={item.id} item={item} onDelete={handleDelete} />)}
      </div>
    );
  };

  return (
    <div className="space-y-8">
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-purple-500/15 via-fuchsia-500/15 to-pink-500/15 border border-purple-500/20 p-6 md:p-10 shadow-lg backdrop-blur-sm">
        <div className="absolute -top-24 -right-24 w-72 h-72 bg-purple-500/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-72 h-72 bg-fuchsia-500/20 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-8">
          <div className="space-y-3 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-background/80 backdrop-blur-md border border-purple-500/30 text-xs font-semibold text-purple-600 dark:text-purple-400 shadow-xs">
              <ShoppingCart className="h-3.5 w-3.5" />
              <span>Local Trading & Marketplace</span>
            </div>

            <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight font-headline">
              <span className="bg-gradient-to-r from-purple-600 via-fuchsia-600 to-pink-600 dark:from-purple-400 dark:via-fuchsia-400 dark:to-pink-400 bg-clip-text text-transparent">
                Buy, Swap & Sell
              </span>
            </h1>

            <p className="text-sm md:text-base text-muted-foreground leading-relaxed">
              Buy pre-loved goods, offer items for free or swap, and discover local items listed by your neighbors.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 shrink-0">
            <div className="grid grid-cols-2 gap-2 sm:flex sm:items-center">
              <div className="p-3 rounded-xl bg-background/80 backdrop-blur-md border border-border/80 text-center">
                <div className="text-lg font-bold text-purple-600 dark:text-purple-400">{forSaleCount}</div>
                <div className="text-[10px] text-muted-foreground">For Sale</div>
              </div>
              <div className="p-3 rounded-xl bg-background/80 backdrop-blur-md border border-border/80 text-center">
                <div className="text-lg font-bold text-fuchsia-600 dark:text-fuchsia-400">{toSwapCount}</div>
                <div className="text-[10px] text-muted-foreground">To Swap</div>
              </div>
              <div className="p-3 rounded-xl bg-background/80 backdrop-blur-md border border-border/80 text-center">
                <div className="text-lg font-bold text-pink-600 dark:text-pink-400">{freeCount}</div>
                <div className="text-[10px] text-muted-foreground">Free Items</div>
              </div>
              <div className="p-3 rounded-xl bg-background/80 backdrop-blur-md border border-border/80 text-center">
                <div className="text-lg font-bold text-indigo-600 dark:text-indigo-400">{lookingForCount}</div>
                <div className="text-[10px] text-muted-foreground">Wanted</div>
              </div>
            </div>

            <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
              <DialogTrigger asChild>
                <Button size="lg" className="gap-2 font-semibold shadow-md bg-purple-600 hover:bg-purple-700 text-white shrink-0">
                  <PlusCircle className="h-5 w-5" />
                  Post an Item
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                  <DialogTitle>Post a Marketplace Item</DialogTitle>
                  <DialogDescription>
                    List an item for sale, swap, free, or wanted. Listings remain active on the community board for 21 days (3 weeks).
                  </DialogDescription>
                </DialogHeader>
                <ItemForm onSave={() => setIsFormOpen(false)} />
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </div>

      <Alert className="bg-purple-50/50 border-purple-200/60 dark:bg-purple-950/20 dark:border-purple-900/50">
        <Info className="h-4 w-4 text-purple-600 dark:text-purple-400" />
        <AlertTitle className="text-purple-800 dark:text-purple-300 font-semibold">Listing Auto-Removal Notice</AlertTitle>
        <AlertDescription className="text-purple-700/90 dark:text-purple-400/90 text-sm">
          To keep the trading board clean and active, all marketplace listings remain live for 21 days (3 weeks) from the date of posting before being automatically archived.
        </AlertDescription>
      </Alert>

      <Tabs defaultValue="For Sale" className="w-full">
        <div className="w-full overflow-x-auto pb-2">
            <TabsList className="inline-grid w-full grid-cols-4 min-w-[550px] md:w-full md:min-w-0">
                <TabsTrigger value="For Sale" className="transition-all data-[state=active]:font-bold data-[state=active]:text-lg data-[state=active]:border-2 data-[state=active]:border-blue-300 data-[state=active]:bg-blue-50 data-[state=active]:text-blue-700 dark:data-[state=active]:bg-blue-900/30 dark:data-[state=active]:text-blue-300">For Sale&nbsp;<span className="text-xs">({forSaleCount})</span></TabsTrigger>
                <TabsTrigger value="To Swap" className="transition-all data-[state=active]:font-bold data-[state=active]:text-lg data-[state=active]:border-2 data-[state=active]:border-blue-300 data-[state=active]:bg-blue-50 data-[state=active]:text-blue-700 dark:data-[state=active]:bg-blue-900/30 dark:data-[state=active]:text-blue-300">To Swap&nbsp;<span className="text-xs">({toSwapCount})</span></TabsTrigger>
                <TabsTrigger value="Free" className="transition-all data-[state=active]:font-bold data-[state=active]:text-lg data-[state=active]:border-2 data-[state=active]:border-blue-300 data-[state=active]:bg-blue-50 data-[state=active]:text-blue-700 dark:data-[state=active]:bg-blue-900/30 dark:data-[state=active]:text-blue-300">Free&nbsp;<span className="text-xs">({freeCount})</span></TabsTrigger>
                <TabsTrigger value="Looking For" className="transition-all data-[state=active]:font-bold data-[state=active]:text-lg data-[state=active]:border-2 data-[state=active]:border-blue-300 data-[state=active]:bg-blue-50 data-[state=active]:text-blue-700 dark:data-[state=active]:bg-blue-900/30 dark:data-[state=active]:text-blue-300">Looking For&nbsp;<span className="text-xs">({lookingForCount})</span></TabsTrigger>
            </TabsList>
        </div>
        <TabsContent value="For Sale" className="mt-6">{renderTabContent('For Sale')}</TabsContent>
        <TabsContent value="To Swap" className="mt-6">{renderTabContent('To Swap')}</TabsContent>
        <TabsContent value="Free" className="mt-6">{renderTabContent('Free')}</TabsContent>
        <TabsContent value="Looking For" className="mt-6">{renderTabContent('Looking For')}</TabsContent>
      </Tabs>
    </div>
  );
}
