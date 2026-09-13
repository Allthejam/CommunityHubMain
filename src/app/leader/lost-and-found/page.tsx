
'use client';

import * as React from 'react';
import {
  MoreHorizontal,
  Search,
  CheckCircle,
  XCircle,
  Loader2,
  Trash2,
  Mail,
  Phone,
  MessageSquare,
} from 'lucide-react';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { format } from 'date-fns';

import { useUser, useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import {
  updateLostAndFoundStatusAction,
  deleteLostAndFoundItemAction,
} from '@/lib/actions/lostAndFoundActions';
import { doc } from 'firebase/firestore';

import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import Image from 'next/image';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import Link from 'next/link';

export type ItemStatus =
  | 'new'
  | 'active'
  | 'resolved'
  | 'rejected'
  | 'deleted';
export type ItemType = 'lost' | 'found';

export type Item = {
  id: string;
  type: ItemType;
  description: string;
  location: string;
  date: { toDate: () => Date };
  image?: string;
  status: ItemStatus;
  reporterName: string;
  contactPreference: 'leader' | 'direct';
  contactEmail?: string;
  contactPhone?: string;
  createdAt?: { toDate: () => Date };
};

const ContactAuthorDialog = ({ item }: { item: Item }) => {
    return (
        <DialogContent>
            <DialogHeader>
                <DialogTitle>Contact {item.reporterName}</DialogTitle>
                <DialogDescription>
                    The user chose the following contact preference.
                </DialogDescription>
            </DialogHeader>
            <div className="py-4">
                {item.contactPreference === 'direct' ? (
                    <div className="space-y-4">
                        <p className="text-sm font-semibold">The user has allowed direct contact:</p>
                        {item.contactEmail && (
                            <div className="flex items-center gap-2">
                                <Mail className="h-4 w-4" />
                                <a href={`mailto:${item.contactEmail}`} className="text-primary hover:underline">{item.contactEmail}</a>
                            </div>
                        )}
                        {item.contactPhone && (
                            <div className="flex items-center gap-2">
                                <Phone className="h-4 w-4" />
                                <a href={`tel:${item.contactPhone}`} className="text-primary hover:underline">{item.contactPhone}</a>
                            </div>
                        )}
                         {!item.contactEmail && !item.contactPhone && (
                            <p className="text-sm text-muted-foreground">The user requested direct contact but did not provide any details.</p>
                        )}
                    </div>
                ) : (
                    <div className="space-y-4">
                        <p className="text-sm font-semibold">The user requested leader mediation:</p>
                        <p className="text-sm text-muted-foreground">Please use the button below to open your email client and connect the parties involved. Remember to protect the privacy of all individuals.</p>
                        <Button asChild>
                            <a href={`mailto:?subject=Connecting you for item: ${item.description.substring(0, 20)}...`}>
                                <MessageSquare className="mr-2 h-4 w-4" /> Mediate Contact
                            </a>
                        </Button>
                    </div>
                )}
            </div>
        </DialogContent>
    )
}

const StatusBadge = ({ status }: { status: ItemStatus }) => {
  const statusConfig = {
    new: {
      className:
        'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-300',
      text: 'Pending',
    },
    active: {
      className:
        'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800',
      text: 'Live',
    },
    resolved: {
      className:
        'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300',
      text: 'Resolved',
    },
    rejected: {
      className:
        'bg-rose-100 text-rose-800 dark:bg-rose-950/50 dark:text-rose-300',
      text: 'Removed / Inappropriate',
    },
    deleted: {
      className:
        'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
      text: 'Deleted',
    },
  };
  const config = statusConfig[status] || { className: '', text: status };
  return <Badge className={config.className}>{config.text}</Badge>;
};

function ItemTable({
  items,
  loading,
  handleUpdateStatus,
  handleDelete,
}: {
  items: Item[];
  loading: boolean;
  handleUpdateStatus: (id: string, status: ItemStatus) => void;
  handleDelete: (id: string) => void;
}) {
  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Type</TableHead>
            <TableHead>Description</TableHead>
            <TableHead>Location</TableHead>
            <TableHead>Date Reported</TableHead>
            <TableHead>Reported By</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {loading ? (
            <TableRow>
              <TableCell colSpan={7} className="h-24 text-center">
                <Loader2 className="animate-spin mx-auto" />
              </TableCell>
            </TableRow>
          ) : items.length > 0 ? (
            items.map((item) => {
              const displayDate = item.createdAt ? item.createdAt.toDate() : item.date.toDate();
              return (
              <TableRow key={item.id}>
                <TableCell>
                  <Badge variant={item.type === 'lost' ? 'destructive' : 'secondary'} className="capitalize">
                    {item.type}
                  </Badge>
                </TableCell>
                <TableCell className="max-w-xs truncate">
                  <div className="flex items-center gap-2">
                    {item.image && (
                      <Image
                        src={item.image}
                        alt={item.description}
                        width={40}
                        height={40}
                        className="rounded-sm object-cover shrink-0"
                      />
                    )}
                    <span className="truncate font-medium">{item.description}</span>
                  </div>
                </TableCell>
                <TableCell>{item.location}</TableCell>
                <TableCell>
                  {format(displayDate, 'PPP')}
                </TableCell>
                <TableCell>{item.reporterName}</TableCell>
                <TableCell>
                  <StatusBadge status={item.status} />
                </TableCell>
                <TableCell className="text-right">
                   <Dialog>
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-8 w-8 p-0">
                                <MoreHorizontal className="h-4 w-4" />
                            </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                                <DropdownMenuLabel>Moderation & Actions</DropdownMenuLabel>
                                
                                <DialogTrigger asChild>
                                    <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                                        <MessageSquare className="mr-2 h-4 w-4" /> Contact Author
                                    </DropdownMenuItem>
                                </DialogTrigger>

                                {item.status === 'active' && (
                                    <>
                                        <DropdownMenuItem onClick={() => handleUpdateStatus(item.id, 'resolved')}>
                                            <CheckCircle className="mr-2 h-4 w-4 text-emerald-600" /> Mark as Resolved
                                        </DropdownMenuItem>
                                        <DropdownMenuItem onClick={() => handleUpdateStatus(item.id, 'rejected')} className="text-rose-600 dark:text-rose-400">
                                            <XCircle className="mr-2 h-4 w-4" /> Remove / Inappropriate
                                        </DropdownMenuItem>
                                    </>
                                )}

                                {item.status === 'rejected' && (
                                    <DropdownMenuItem onClick={() => handleUpdateStatus(item.id, 'active')}>
                                        <CheckCircle className="mr-2 h-4 w-4 text-emerald-600" /> Restore to Live Feed
                                    </DropdownMenuItem>
                                )}

                                {item.status === 'resolved' && (
                                    <DropdownMenuItem onClick={() => handleUpdateStatus(item.id, 'active')}>
                                        <CheckCircle className="mr-2 h-4 w-4 text-emerald-600" /> Reopen / Make Live
                                    </DropdownMenuItem>
                                )}

                                {item.status === 'new' && (
                                    <>
                                        <DropdownMenuItem onClick={() => handleUpdateStatus(item.id, 'active')}>
                                            <CheckCircle className="mr-2 h-4 w-4 text-emerald-600" /> Publish Live
                                        </DropdownMenuItem>
                                        <DropdownMenuItem onClick={() => handleUpdateStatus(item.id, 'rejected')} className="text-rose-600 dark:text-rose-400">
                                            <XCircle className="mr-2 h-4 w-4" /> Reject / Remove
                                        </DropdownMenuItem>
                                    </>
                                )}

                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={() => handleDelete(item.id)} className="text-destructive">
                                    <Trash2 className="mr-2 h-4 w-4" /> Delete Permanently
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                         <ContactAuthorDialog item={item} />
                    </Dialog>
                </TableCell>
              </TableRow>
            )})
          ) : (
            <TableRow>
              <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                No items in this category.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}

export default function LeaderLostAndFoundPage() {
  const { user } = useUser();
  const db = useFirestore();
  const { toast } = useToast();
  const [items, setItems] = React.useState<Item[]>([]);
  const [loading, setLoading] = React.useState(true);

  const userProfileRef = useMemoFirebase(
    () => (user ? doc(db, 'users', user.uid) : null),
    [user, db]
  );
  const { data: userProfile } = useDoc(userProfileRef);

  React.useEffect(() => {
    if (!userProfile?.communityId || !db) {
      setLoading(false);
      return;
    }
    const q = query(
      collection(db, 'lostAndFound'),
      where('communityId', '==', userProfile.communityId)
    );
    const unsub = onSnapshot(q, (snapshot) => {
      const itemsData = snapshot.docs.map(
        (doc) => ({ id: doc.id, ...doc.data() } as Item)
      );
      setItems(itemsData);
      setLoading(false);
    });
    return () => unsub();
  }, [userProfile?.communityId, db]);

  const handleUpdateStatus = async (id: string, status: ItemStatus) => {
    const result = await updateLostAndFoundStatusAction({
      itemId: id,
      status,
      communityId: userProfile?.communityId || '',
    });
    if (result.success) {
      toast({ title: 'Status Updated', description: `Item is now marked as ${status}.` });
    } else {
      toast({
        title: 'Error',
        description: result.error,
        variant: 'destructive',
      });
    }
  };

  const handleDelete = async (id: string) => {
    const result = await deleteLostAndFoundItemAction({ itemId: id, communityId: userProfile?.communityId });
    if (result.success) {
      toast({ title: 'Item Deleted', description: 'Item has been permanently removed.' });
    } else {
      toast({
        title: 'Error',
        description: result.error,
        variant: 'destructive',
      });
    }
  };

  const twentyEightDaysAgo = new Date();
  twentyEightDaysAgo.setDate(twentyEightDaysAgo.getDate() - 28);

  const allLiveItems = items.filter((item) => {
    if (item.status !== 'active') return false;
    try {
      const itemDate = item.date?.toDate ? item.date.toDate() : new Date(item.date as any);
      return itemDate >= twentyEightDaysAgo;
    } catch {
      return true;
    }
  });

  const activeLostItems = allLiveItems.filter((item) => item.type === 'lost');
  const activeFoundItems = allLiveItems.filter((item) => item.type === 'found');
  const resolvedItems = items.filter((item) => item.status === 'resolved');
  const moderatedItems = items.filter((item) => item.status === 'rejected' || item.status === 'deleted');

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight font-headline flex items-center gap-2">
          <Search className="h-8 w-8" />
          Manage Lost & Found
        </h1>
        <p className="text-muted-foreground">
          Community reports go live immediately. As a leader, you can review live items, contact reporters, mark items resolved, or remove inappropriate posts.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Community Lost & Found Items</CardTitle>
          <CardDescription>
            Live items are shown directly to the public. Moderate, resolve, or remove any report as needed.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="all_live">
            <TabsList className="grid w-full grid-cols-2 md:grid-cols-5 h-auto gap-1">
              <TabsTrigger value="all_live" className="py-2">
                All Live ({allLiveItems.length})
              </TabsTrigger>
              <TabsTrigger value="lost" className="py-2">
                Live Lost ({activeLostItems.length})
              </TabsTrigger>
              <TabsTrigger value="found" className="py-2">
                Live Found ({activeFoundItems.length})
              </TabsTrigger>
              <TabsTrigger value="resolved" className="py-2">
                Resolved ({resolvedItems.length})
              </TabsTrigger>
              <TabsTrigger value="moderated" className="py-2">
                Moderated / Removed ({moderatedItems.length})
              </TabsTrigger>
            </TabsList>
            <TabsContent value="all_live" className="mt-4">
              <ItemTable
                items={allLiveItems}
                loading={loading}
                handleUpdateStatus={handleUpdateStatus}
                handleDelete={handleDelete}
              />
            </TabsContent>
            <TabsContent value="lost" className="mt-4">
              <ItemTable
                items={activeLostItems}
                loading={loading}
                handleUpdateStatus={handleUpdateStatus}
                handleDelete={handleDelete}
              />
            </TabsContent>
            <TabsContent value="found" className="mt-4">
              <ItemTable
                items={activeFoundItems}
                loading={loading}
                handleUpdateStatus={handleUpdateStatus}
                handleDelete={handleDelete}
              />
            </TabsContent>
            <TabsContent value="resolved" className="mt-4">
              <ItemTable
                items={resolvedItems}
                loading={loading}
                handleUpdateStatus={handleUpdateStatus}
                handleDelete={handleDelete}
              />
            </TabsContent>
            <TabsContent value="moderated" className="mt-4">
              <ItemTable
                items={moderatedItems}
                loading={loading}
                handleUpdateStatus={handleUpdateStatus}
                handleDelete={handleDelete}
              />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
