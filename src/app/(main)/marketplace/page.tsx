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
  Search,
  Tag,
  Repeat,
  Gift,
  SearchCode,
  MessageCircle,
  User,
  Clock,
  Sparkles,
  ArrowRight
} from 'lucide-react';
import { useUser, useFirestore, useDoc, useMemoFirebase, useCollection } from '@/firebase';
import { collection, query, where, doc, Timestamp } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { createMarketplaceListingAction, deleteMarketplaceListingAction } from '@/lib/actions/marketplaceActions';
import { findOrCreateChatForItem } from '@/lib/actions/chatActions';
import Image from 'next/image';
import { formatDistanceToNow } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

type MarketplaceItem = {
  id: string;
  ownerId: string;
  ownerName: string;
  title: string;
  description: string;
  listingType: 'For Sale' | 'To Swap' | 'Free' | 'Looking For';
  price?: number;
  image?: string;
  createdAt: Timestamp;
  expiresAt: Timestamp;
};

const ItemForm = ({ onSave }: { onSave: () => void }) => {
  const { user } = useUser();
  const db = useFirestore();
  const userProfileRef = useMemoFirebase(() => (user ? doc(db, 'users', user.uid) : null), [user, db]);
  const { data: userProfile } = useDoc(userProfileRef);
  const { toast } = useToast();

  const [title, setTitle] = React.useState('');
  const [description, setDescription] = React.useState('');
  const [listingType, setListingType] = React.useState<'For Sale' | 'To Swap' | 'Free' | 'Looking For'>('For Sale');
  const [price, setPrice] = React.useState('');
  const [image, setImage] = React.useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const handleSubmit = async () => {
    if (!user || !userProfile?.communityId) {
      toast({ title: 'Error', description: 'You must be logged in to a community.', variant: 'destructive' });
      return;
    }
    if (!title || !description) {
      toast({ title: 'Error', description: 'Title and description are required.', variant: 'destructive' });
      return;
    }

    setIsSubmitting(true);
    const result = await createMarketplaceListingAction({
      ownerId: user.uid,
      ownerName: userProfile.name,
      ownerAvatar: userProfile.avatar,
      communityId: userProfile.communityId,
      title,
      description,
      listingType,
      price: listingType === 'For Sale' ? parseFloat(price) || 0 : 0,
      image,
    });
    setIsSubmitting(false);

    if (result.success) {
      toast({ title: 'Listing Posted! 🎉', description: 'Your item is live on the local marketplace.' });
      onSave();
    } else {
      toast({ title: 'Error', description: result.error, variant: 'destructive' });
    }
  };

  return (
    <div className="grid gap-4 py-2">
      <div className="space-y-2">
        <Label htmlFor="title" className="font-bold text-xs">Title *</Label>
        <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Mountain Bike, Wooden Dining Table" className="h-10 border-amber-200" />
      </div>
      <div className="space-y-2">
        <Label htmlFor="description" className="font-bold text-xs">Description *</Label>
        <Textarea id="description" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Provide item details, condition, pick-up info..." rows={3} className="border-amber-200" />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="listing-type" className="font-bold text-xs">Listing Type *</Label>
          <Select value={listingType} onValueChange={(val) => setListingType(val as any)}>
            <SelectTrigger id="listing-type" className="h-10 border-amber-200">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="For Sale">🏷️ For Sale</SelectItem>
              <SelectItem value="To Swap">🔄 To Swap</SelectItem>
              <SelectItem value="Free">🎁 Free</SelectItem>
              <SelectItem value="Looking For">🔍 Looking For</SelectItem>
            </SelectContent>
          </Select>
        </div>
        {listingType === 'For Sale' && (
          <div className="space-y-2">
            <Label htmlFor="price" className="font-bold text-xs">Price (£)</Label>
            <Input id="price" type="number" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="e.g. 25.00" className="h-10 border-amber-200" />
          </div>
        )}
      </div>
      <div className="space-y-2">
        <Label className="font-bold text-xs">Photo (Optional)</Label>
        {image ? (
          <div className="relative w-32 h-32 rounded-lg overflow-hidden border-2 border-amber-300">
            <Image src={image} alt="Preview" fill style={{ objectFit: 'cover' }} />
            <Button variant="destructive" size="icon" className="absolute top-1 right-1 h-6 w-6 rounded-full" onClick={() => setImage(null)}><X className="h-3.5 w-3.5" /></Button>
          </div>
        ) : (
          <Input type="file" accept="image/*" className="border-amber-200 text-xs" onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) {
              const reader = new FileReader();
              reader.onloadend = () => setImage(reader.result as string);
              reader.readAsDataURL(file);
            }
          }} />
        )}
      </div>
      <DialogFooter className="pt-2">
        <Button onClick={handleSubmit} disabled={isSubmitting} className="bg-amber-600 hover:bg-amber-700 text-white font-semibold w-full sm:w-auto">
          {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <PlusCircle className="mr-1.5 h-4 w-4" />}
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
    const isOwner = user?.uid === item.ownerId;

    const formattedTime = item.createdAt?.toDate ? formatDistanceToNow(item.createdAt.toDate(), { addSuffix: true }) : 'Recently';

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

    const getBadgeStyle = (type: MarketplaceItem['listingType']) => {
      switch (type) {
        case 'For Sale': return 'bg-emerald-600 text-white';
        case 'To Swap': return 'bg-purple-600 text-white';
        case 'Free': return 'bg-amber-500 text-white';
        case 'Looking For': return 'bg-blue-600 text-white';
        default: return 'bg-muted text-foreground';
      }
    };
  
    return (
      <Card className="flex flex-col overflow-hidden border-2 border-border/80 hover:border-amber-400 dark:hover:border-amber-600 transition-all duration-200 shadow-xs hover:shadow-md group">
        {item.image && (
          <div className="relative w-full aspect-video bg-muted overflow-hidden">
            <Image src={item.image} alt={item.title} fill className="object-cover group-hover:scale-105 transition-transform duration-300" />
            <Badge className={cn("absolute top-3 left-3 text-xs font-bold shadow-xs", getBadgeStyle(item.listingType))}>
              {item.listingType === 'For Sale' && item.price ? `£${item.price.toFixed(2)}` : item.listingType}
            </Badge>
          </div>
        )}
        <CardHeader className="p-4 sm:p-5 pb-2">
          <div className="flex items-start justify-between gap-2">
            <CardTitle className="text-base sm:text-lg font-bold group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors line-clamp-1">
              {item.title}
            </CardTitle>
            {!item.image && (
              <Badge className={cn("text-[11px] font-bold shrink-0", getBadgeStyle(item.listingType))}>
                {item.listingType === 'For Sale' && item.price ? `£${item.price.toFixed(2)}` : item.listingType}
              </Badge>
            )}
          </div>
          <CardDescription className="text-xs flex items-center gap-1.5 pt-0.5">
            <User className="h-3 w-3 text-amber-600 shrink-0" />
            <span className="font-semibold text-foreground">{item.ownerName}</span>
            <span>•</span>
            <Clock className="h-3 w-3 shrink-0" />
            <span>{formattedTime}</span>
          </CardDescription>
        </CardHeader>
        <CardContent className="p-4 sm:p-5 pt-0 flex-grow">
          <p className="text-xs text-muted-foreground line-clamp-3 leading-relaxed">{item.description}</p>
        </CardContent>
        <CardFooter className="p-4 sm:p-5 pt-0 border-t border-border/40 flex justify-between items-center mt-auto">
          {isOwner ? (
            <Button variant="destructive" size="sm" className="h-8 text-xs font-semibold w-full" onClick={() => onDelete(item.id)}>
              <Trash2 className="mr-1.5 h-3.5 w-3.5" /> Remove Listing
            </Button>
          ) : (
            <Button size="sm" className="h-9 text-xs font-semibold w-full bg-amber-600 hover:bg-amber-700 text-white gap-1.5 shadow-xs" onClick={handleContactSeller} disabled={isContacting}>
              {isContacting ? <Loader2 className="h-3.5 w-3.5 animate-spin"/> : <MessageCircle className="h-3.5 w-3.5" />}
              <span>Contact Seller</span>
            </Button>
          )}
        </CardFooter>
      </Card>
    );
};

export default function MarketplacePage() {
  const { user, isUserLoading } = useUser();
  const db = useFirestore();
  const [searchQuery, setSearchQuery] = React.useState('');
  const [isFormOpen, setIsFormOpen] = React.useState(false);

  const userProfileRef = useMemoFirebase(() => (user ? doc(db, 'users', user.uid) : null), [user, db]);
  const { data: userProfile, isLoading: profileLoading } = useDoc(userProfileRef);
  const communityId = userProfile?.communityId;

  const marketplaceQuery = useMemoFirebase(() => {
    if (!communityId || !db) return null;
    return query(
      collection(db, `communities/${communityId}/marketplace`),
      where('expiresAt', '>', Timestamp.now())
    );
  }, [communityId, db]);
  const { data: rawItems, isLoading: itemsLoading } = useCollection<MarketplaceItem>(marketplaceQuery);

  const items = React.useMemo(() => {
    if (!rawItems) return [];
    if (!searchQuery.trim()) return rawItems;
    const q = searchQuery.toLowerCase();
    return rawItems.filter(item => 
      item.title.toLowerCase().includes(q) || 
      item.description.toLowerCase().includes(q) ||
      item.ownerName.toLowerCase().includes(q)
    );
  }, [rawItems, searchQuery]);

  const forSaleCount = React.useMemo(() => items?.filter((item) => item.listingType === 'For Sale').length ?? 0, [items]);
  const toSwapCount = React.useMemo(() => items?.filter((item) => item.listingType === 'To Swap').length ?? 0, [items]);
  const freeCount = React.useMemo(() => items?.filter((item) => item.listingType === 'Free').length ?? 0, [items]);
  const lookingForCount = React.useMemo(() => items?.filter((item) => item.listingType === 'Looking For').length ?? 0, [items]);

  const handleDelete = async (itemId: string) => {
    if (!communityId || !user) return;
    await deleteMarketplaceListingAction({ communityId, itemId, userId: user.uid });
  }

  const renderTabContent = (listingType: MarketplaceItem['listingType']) => {
    const filteredItems = items?.filter(item => item.listingType === listingType);
    if (loading) return <div className="flex justify-center items-center h-48"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>;
    if (!filteredItems || filteredItems.length === 0) {
      return (
        <Card className="p-8 text-center border-dashed">
          <ShoppingCart className="h-12 w-12 text-muted-foreground/40 mx-auto mb-3" />
          <h3 className="text-lg font-bold">No Items Found</h3>
          <p className="text-sm text-muted-foreground mt-1 max-w-sm mx-auto">
            {searchQuery ? `No ${listingType} items matched "${searchQuery}".` : `No ${listingType} items listed in ${userProfile?.communityName || 'this community'} yet.`}
          </p>
          <Button size="sm" className="mt-4 bg-amber-600 hover:bg-amber-700 text-white" onClick={() => setIsFormOpen(true)}>
            <PlusCircle className="mr-1.5 h-4 w-4" /> List an Item
          </Button>
        </Card>
      );
    }

    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {filteredItems.map(item => <MarketplaceItemCard key={item.id} item={item} onDelete={handleDelete} />)}
      </div>
    );
  };
  
  const loading = isUserLoading || profileLoading || itemsLoading;

  return (
    <div className="space-y-8 pb-12">
      {/* Hero Header Banner */}
      <div className="p-6 md:p-8 rounded-2xl bg-gradient-to-r from-amber-500/15 via-orange-500/15 to-pink-500/15 border border-amber-200/50 dark:border-amber-900/40 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2.5">
              <div className="p-2.5 rounded-xl bg-amber-600 text-white shadow-xs">
                <ShoppingCart className="h-6 w-6" />
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight font-headline">
                Buy, Swap & Sell
              </h1>
            </div>
            <p className="text-sm text-muted-foreground pt-1">
              Local community marketplace for {userProfile?.communityName || 'your community'}. Listings active for 21 days.
            </p>
          </div>

          <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="h-9 text-xs font-semibold bg-amber-600 hover:bg-amber-700 text-white shadow-sm gap-1.5 shrink-0">
                <PlusCircle className="h-3.5 w-3.5" />
                <span>List an Item</span>
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-lg">
              <DialogHeader>
                <DialogTitle className="text-lg font-bold flex items-center gap-2">
                  <Tag className="h-5 w-5 text-amber-600" /> Create Marketplace Listing
                </DialogTitle>
              </DialogHeader>
              <ItemForm onSave={() => setIsFormOpen(false)} />
            </DialogContent>
          </Dialog>
        </div>

        {/* Live Search Input */}
        <div className="relative max-w-md pt-2">
          <Search className="absolute left-3.5 top-5 h-4 w-4 text-muted-foreground" />
          <Input 
            type="text" 
            placeholder="Search items, descriptions or sellers..." 
            className="pl-10 h-10 bg-background/80 backdrop-blur-xs border-amber-200 dark:border-amber-900"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* Categories Tabs */}
      <Tabs defaultValue="For Sale" className="w-full">
        <TabsList className="grid w-full grid-cols-2 sm:grid-cols-4 h-11 p-1 bg-muted/60">
          <TabsTrigger value="For Sale" className="text-xs font-bold gap-1.5 data-[state=active]:bg-background data-[state=active]:text-emerald-700 dark:data-[state=active]:text-emerald-300">
            <Tag className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
            <span>For Sale ({forSaleCount})</span>
          </TabsTrigger>
          <TabsTrigger value="To Swap" className="text-xs font-bold gap-1.5 data-[state=active]:bg-background data-[state=active]:text-purple-700 dark:data-[state=active]:text-purple-300">
            <Repeat className="h-3.5 w-3.5 text-purple-600 shrink-0" />
            <span>To Swap ({toSwapCount})</span>
          </TabsTrigger>
          <TabsTrigger value="Free" className="text-xs font-bold gap-1.5 data-[state=active]:bg-background data-[state=active]:text-amber-700 dark:data-[state=active]:text-amber-300">
            <Gift className="h-3.5 w-3.5 text-amber-500 shrink-0" />
            <span>Free ({freeCount})</span>
          </TabsTrigger>
          <TabsTrigger value="Looking For" className="text-xs font-bold gap-1.5 data-[state=active]:bg-background data-[state=active]:text-blue-700 dark:data-[state=active]:text-blue-300">
            <SearchCode className="h-3.5 w-3.5 text-blue-600 shrink-0" />
            <span>Looking For ({lookingForCount})</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="For Sale" className="mt-6">{renderTabContent('For Sale')}</TabsContent>
        <TabsContent value="To Swap" className="mt-6">{renderTabContent('To Swap')}</TabsContent>
        <TabsContent value="Free" className="mt-6">{renderTabContent('Free')}</TabsContent>
        <TabsContent value="Looking For" className="mt-6">{renderTabContent('Looking For')}</TabsContent>
      </Tabs>
    </div>
  );
}
