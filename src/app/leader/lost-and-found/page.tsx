
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
        'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300',
      text: 'Active',
    },
    resolved: {
      className:
        'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300',
      text: 'Resolved',
    },
    rejected: {
      className:
        'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300',
      text: 'Rejected',
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
              <TableCell colSpan={6} className="h-24 text-center">
                <Loader2 className="animate-spin mx-auto" />
              </TableCell>
            </TableRow>
          ) : items.length > 0 ? (
            items.map((item) => {
              const displayDate = item.createdAt ? item.createdAt.toDate() : item.date.toDate();
              return (
              <TableRow key={item.id}>
                <TableCell className="max-w-xs truncate">
                  <div className="flex items-center gap-2">
                    {item.image && (
                      <Image
                        src={item.image}
                        alt={item.description}
                        width={40}
                        height={40}
                        className="rounded-sm object-cover"
                      />
                    )}
                    <span>{item.description}</span>
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
                                <MoreHorizontal />
                            </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                                <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                {item.status === 'new' && (
                                    <>
                                        <DropdownMenuItem onClick={() => handleUpdateStatus(item.id, 'active')}>
                                            <CheckCircle className="mr-2 h-4 w-4" /> Approve
                                        </DropdownMenuItem>
                                        <DropdownMenuItem onClick={() => handleUpdateStatus(item.id, 'rejected')} className="text-destructive">
                                            <XCircle className="mr-2 h-4 w-4" /> Reject
                                        </DropdownMenuItem>
                                    </>
                                )}
                                {item.status === 'active' && (
                                    <>
                                        <DialogTrigger asChild>
                                            <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                                                <MessageSquare className="mr-2 h-4 w-4" /> Contact Author
                                            </DropdownMenuItem>
                                        </DialogTrigger>
                                        <DropdownMenuItem onClick={() => handleUpdateStatus(item.id, 'resolved')}>
                                            <CheckCircle className="mr-2 h-4 w-4" /> Mark as Resolved
                                        </DropdownMenuItem>
                                    </>
                                )}
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={() => handleDelete(item.id)} className="text-destructive">
                                    <Trash2 className="mr-2 h-4 w-4" /> Delete
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
              <TableCell colSpan={6} className="h-24 text-center">
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
      toast({ title: 'Status Updated' });
    } else {
      toast({
        title: 'Error',
        description: result.error,
        variant: 'destructive',
      });
    }
  };

  const handleDelete = async (id: string) => {
    const result = await deleteLostAndFoundItemAction({ itemId: id });
    if (result.success) {
      toast({ title: 'Item Deleted' });
    } else {
      toast({
        title: 'Error',
        description: result.error,
        variant: 'destructive',
      });
    }
  };

  const pendingItems = items.filter((item) => item.status === 'new');
  const activeLostItems = items.filter(
    (item) => item.status === 'active' && item.type === 'lost'
  );
  const activeFoundItems = items.filter(
    (item) => item.status === 'active' && item.type === 'found'
  );
  const resolvedItems = items.filter((item) => item.status === 'resolved');

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight font-headline flex items-center gap-2">
          <Search className="h-8 w-8" />
          Manage Lost & Found
        </h1>
        <p className="text-muted-foreground">
          Review and manage lost and found item reports for your community.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Item Submissions</CardTitle>
          <CardDescription>
            Review, approve, and manage all submitted items.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="pending">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="pending">
                Pending Approval ({pendingItems.length})
              </TabsTrigger>
              <TabsTrigger value="lost">Active Lost ({activeLostItems.length})</TabsTrigger>
              <TabsTrigger value="found">Active Found ({activeFoundItems.length})</TabsTrigger>
              <TabsTrigger value="resolved">Resolved ({resolvedItems.length})</TabsTrigger>
            </TabsList>
            <TabsContent value="pending" className="mt-4">
              <ItemTable
                items={pendingItems}
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
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
