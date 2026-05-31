
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
} from 'lucide-react';
import { useUser, useFirestore, useDoc, useMemoFirebase, useCollection } from '@/firebase';
import { collection, query, where, doc, Timestamp } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { createMarketplaceListingAction, deleteMarketplaceListingAction } from '@/lib/actions/marketplaceActions';
import { findOrCreateChatForItem } from '@/lib/actions/chatActions';
import Image from 'next/image';
import { formatDistanceToNow } from 'date-fns';
import { Badge } from '@/components/ui/badge';

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
    const isOwner = user?.uid === item.ownerId;
  
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
  
    return (
      <Card className="flex flex-col">
        {item.image && (
          <div className="relative w-full aspect-video">
            <Image src={item.image} alt={item.title} fill className="object-cover rounded-t-lg" />
          </div>
        )}
        <CardHeader>
          <CardTitle>{item.title}</CardTitle>
          <CardDescription>
            Posted by {item.ownerName} - {formatDistanceToNow(item.createdAt.toDate(), { addSuffix: true })}
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
  const communityId = userProfile?.communityId;
  const [isFormOpen, setIsFormOpen] = React.useState(false);

  const marketplaceQuery = useMemoFirebase(() => {
    if (!communityId || !db) return null;
    return query(
      collection(db, `communities/${communityId}/marketplace`),
      where('expiresAt', '>', Timestamp.now())
    );
  }, [communityId, db]);
  const { data: items, isLoading: itemsLoading } = useCollection<MarketplaceItem>(marketplaceQuery);

  const forSaleCount = React.useMemo(() => items?.filter((item) => item.listingType === 'For Sale').length ?? 0, [items]);
  const toSwapCount = React.useMemo(() => items?.filter((item) => item.listingType === 'To Swap').length ?? 0, [items]);
  const freeCount = React.useMemo(() => items?.filter((item) => item.listingType === 'Free').length ?? 0, [items]);
  const lookingForCount = React.useMemo(() => items?.filter((item) => item.listingType === 'Looking For').length ?? 0, [items]);

  const handleDelete = async (itemId: string) => {
    if (!communityId) return;
    await deleteMarketplaceListingAction({ communityId, itemId, userId: user!.uid });
  }

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
  
  const loading = isUserLoading || profileLoading || itemsLoading;

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight font-headline flex items-center gap-2">
            <ShoppingCart className="h-8 w-8" />
            Buy, Swap & Sell
          </h1>
          <p className="text-muted-foreground">
            A marketplace for your local community. Listings expire after 21 days.
          </p>
        </div>
        <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
          <DialogTrigger asChild>
            <Button className="w-full md:w-auto">
              <PlusCircle className="mr-2 h-4 w-4" />
              List an Item
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>Create a New Listing</DialogTitle>
            </DialogHeader>
            <ItemForm onSave={() => setIsFormOpen(false)} />
          </DialogContent>
        </Dialog>
      </div>

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
