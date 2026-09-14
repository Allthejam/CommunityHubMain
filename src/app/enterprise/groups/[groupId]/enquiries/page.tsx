'use client';

import * as React from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  ArrowLeft,
  Mail,
  MailOpen,
  Reply,
  Trash2,
  MoreHorizontal,
  Search,
  Loader2,
  Calendar,
  User,
  Phone,
  Building2,
  Inbox,
  CheckCircle2,
  Archive,
  ExternalLink,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useUser, useFirestore, useDoc, useCollection, useMemoFirebase } from '@/firebase';
import { doc, collection, query, orderBy } from 'firebase/firestore';
import {
  updateGroupEnquiryStatusAction,
  deleteGroupEnquiryAction,
  type GroupEnquiry,
} from '@/lib/actions/groupEnquiryActions';
import { format, isValid } from 'date-fns';

const formatEnquiryDate = (timestamp: any): string => {
  if (!timestamp) return '—';
  if (typeof timestamp.toDate === 'function') {
    return format(timestamp.toDate(), 'dd MMM yyyy, HH:mm');
  }
  if (timestamp.seconds !== undefined) {
    return format(new Date(timestamp.seconds * 1000), 'dd MMM yyyy, HH:mm');
  }
  const d = new Date(timestamp);
  return isValid(d) ? format(d, 'dd MMM yyyy, HH:mm') : '—';
};

export default function GroupEnquiriesInboxPage() {
  const { user } = useUser();
  const db = useFirestore();
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const groupId = params.groupId as string;

  // Group Details
  const groupDocRef = useMemoFirebase(() => (db && groupId ? doc(db, 'businesses', groupId) : null), [db, groupId]);
  const { data: groupData, isLoading: isGroupLoading } = useDoc(groupDocRef);

  // Enquiries Query
  const enquiriesQuery = useMemoFirebase(
    () => (db && groupId ? query(collection(db, 'businesses', groupId, 'enquiries'), orderBy('createdAt', 'desc')) : null),
    [db, groupId]
  );
  const { data: enquiries, isLoading: isEnquiriesLoading } = useCollection<GroupEnquiry>(enquiriesQuery);

  // State
  const [searchQuery, setSearchQuery] = React.useState('');
  const [activeTab, setActiveTab] = React.useState<'all' | 'new' | 'read' | 'replied' | 'archived'>('all');
  const [selectedEnquiry, setSelectedEnquiry] = React.useState<GroupEnquiry | null>(null);
  const [isDetailOpen, setIsDetailOpen] = React.useState(false);
  const [enquiryToDelete, setEnquiryToDelete] = React.useState<GroupEnquiry | null>(null);
  const [isDeleting, setIsDeleting] = React.useState(false);
  const [statusUpdatingId, setStatusUpdatingId] = React.useState<string | null>(null);

  // Filtered enquiries
  const filteredEnquiries = React.useMemo(() => {
    if (!enquiries) return [];
    return enquiries.filter((item) => {
      // Tab filter
      if (activeTab !== 'all' && (item.status || 'new') !== activeTab) {
        return false;
      }
      // Search filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const nameMatch = item.senderName?.toLowerCase().includes(q);
        const emailMatch = item.senderEmail?.toLowerCase().includes(q);
        const subjectMatch = item.subject?.toLowerCase().includes(q);
        const messageMatch = item.message?.toLowerCase().includes(q);
        return nameMatch || emailMatch || subjectMatch || messageMatch;
      }
      return true;
    });
  }, [enquiries, activeTab, searchQuery]);

  // Counts
  const counts = React.useMemo(() => {
    if (!enquiries) return { all: 0, new: 0, read: 0, replied: 0, archived: 0 };
    return {
      all: enquiries.length,
      new: enquiries.filter((e) => !e.status || e.status === 'new').length,
      read: enquiries.filter((e) => e.status === 'read').length,
      replied: enquiries.filter((e) => e.status === 'replied').length,
      archived: enquiries.filter((e) => e.status === 'archived').length,
    };
  }, [enquiries]);

  // Handlers
  const handleOpenDetail = async (enquiry: GroupEnquiry) => {
    setSelectedEnquiry(enquiry);
    setIsDetailOpen(true);
    // Mark as read if status is 'new'
    if (!enquiry.status || enquiry.status === 'new') {
      try {
        await updateGroupEnquiryStatusAction({
          groupId,
          enquiryId: enquiry.id,
          status: 'read',
        });
      } catch (err) {
        console.error('Failed to update status to read', err);
      }
    }
  };

  const handleUpdateStatus = async (enquiryId: string, newStatus: 'new' | 'read' | 'replied' | 'archived') => {
    setStatusUpdatingId(enquiryId);
    try {
      const res = await updateGroupEnquiryStatusAction({
        groupId,
        enquiryId,
        status: newStatus,
      });
      if (res.success) {
        toast({
          title: 'Status Updated',
          description: `Message marked as ${newStatus}.`,
        });
        if (selectedEnquiry && selectedEnquiry.id === enquiryId) {
          setSelectedEnquiry((prev) => (prev ? { ...prev, status: newStatus } : null));
        }
      } else {
        throw new Error(res.error || 'Failed to update status.');
      }
    } catch (error: any) {
      toast({
        title: 'Update Failed',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setStatusUpdatingId(null);
    }
  };

  const handleDeleteEnquiry = async () => {
    if (!enquiryToDelete) return;
    setIsDeleting(true);
    try {
      const res = await deleteGroupEnquiryAction({
        groupId,
        enquiryId: enquiryToDelete.id,
      });
      if (res.success) {
        toast({
          title: 'Enquiry Deleted',
          description: 'The enquiry has been permanently removed.',
        });
        if (selectedEnquiry?.id === enquiryToDelete.id) {
          setIsDetailOpen(false);
          setSelectedEnquiry(null);
        }
        setEnquiryToDelete(null);
      } else {
        throw new Error(res.error || 'Failed to delete enquiry.');
      }
    } catch (error: any) {
      toast({
        title: 'Delete Failed',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const getStatusBadge = (status?: string) => {
    switch (status) {
      case 'read':
        return <Badge variant="secondary" className="bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950 dark:text-blue-300">Read</Badge>;
      case 'replied':
        return <Badge variant="secondary" className="bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950 dark:text-purple-300">Replied</Badge>;
      case 'archived':
        return <Badge variant="outline" className="text-muted-foreground">Archived</Badge>;
      case 'new':
      default:
        return <Badge className="bg-green-600 hover:bg-green-700 text-white">New</Badge>;
    }
  };

  const buildMailtoUrl = (enquiry: GroupEnquiry) => {
    const subject = encodeURIComponent(`Re: ${enquiry.subject || 'Enquiry'}`);
    const body = encodeURIComponent(
      `\n\n--- Original Enquiry from ${enquiry.senderName} (${enquiry.senderEmail}) ---\n${enquiry.message}\n`
    );
    return `mailto:${enquiry.senderEmail}?subject=${subject}&body=${body}`;
  };

  const groupName = groupData?.businessName || groupData?.name || 'Enterprise Group';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <Button asChild variant="ghost" className="mb-3 -ml-2 text-muted-foreground">
          <Link href="/enterprise/groups">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to My Groups
          </Link>
        </Button>
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight font-headline flex items-center gap-2">
              <Inbox className="h-7 w-7 text-primary" />
              Message Centre: {groupName}
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              View and manage incoming public contact enquiries sent from your group&apos;s profile page.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" asChild>
              <Link href={`/businesses/${groupId}`} target="_blank">
                <ExternalLink className="mr-2 h-4 w-4" /> View Public Profile
              </Link>
            </Button>
            <Button variant="outline" size="sm" asChild>
              <Link href={`/enterprise/groups/edit/${groupId}`}>
                <Building2 className="mr-2 h-4 w-4" /> Edit Group
              </Link>
            </Button>
          </div>
        </div>
      </div>

      {/* Main Container */}
      <Card>
        <CardHeader className="pb-4 space-y-4">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <Tabs value={activeTab} onValueChange={(val: any) => setActiveTab(val)} className="w-full md:w-auto">
              <TabsList className="grid grid-cols-5 w-full md:w-auto">
                <TabsTrigger value="all" className="text-xs">
                  All ({counts.all})
                </TabsTrigger>
                <TabsTrigger value="new" className="text-xs">
                  New {counts.new > 0 && <span className="ml-1 px-1.5 py-0.2 bg-green-600 text-white rounded-full text-[10px]">{counts.new}</span>}
                </TabsTrigger>
                <TabsTrigger value="read" className="text-xs">
                  Read ({counts.read})
                </TabsTrigger>
                <TabsTrigger value="replied" className="text-xs">
                  Replied ({counts.replied})
                </TabsTrigger>
                <TabsTrigger value="archived" className="text-xs">
                  Archived ({counts.archived})
                </TabsTrigger>
              </TabsList>
            </Tabs>

            <div className="relative w-full md:w-72">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search messages..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 h-9"
              />
            </div>
          </div>
        </CardHeader>

        <CardContent>
          {isEnquiriesLoading ? (
            <div className="flex justify-center items-center py-16">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : filteredEnquiries.length === 0 ? (
            <div className="text-center py-16 border rounded-lg bg-muted/10">
              <Mail className="h-10 w-10 text-muted-foreground mx-auto mb-3 opacity-50" />
              <h3 className="font-semibold text-base">No enquiries found</h3>
              <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
                {searchQuery
                  ? 'No messages matched your search criteria. Try a different query.'
                  : activeTab === 'all'
                  ? 'When visitors and community members send enquiries via your group profile page, they will appear here.'
                  : `There are currently no messages in the ${activeTab} filter.`}
              </p>
            </div>
          ) : (
            <div className="rounded-md border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[100px]">Status</TableHead>
                    <TableHead>Sender</TableHead>
                    <TableHead>Subject & Message</TableHead>
                    <TableHead className="hidden md:table-cell w-[180px]">Date</TableHead>
                    <TableHead className="text-right w-[120px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredEnquiries.map((item) => {
                    const isUnread = !item.status || item.status === 'new';
                    return (
                      <TableRow
                        key={item.id}
                        className={`cursor-pointer transition-colors ${isUnread ? 'bg-primary/5 font-medium hover:bg-primary/10' : 'hover:bg-muted/50'}`}
                        onClick={() => handleOpenDetail(item)}
                      >
                        <TableCell>
                          {getStatusBadge(item.status)}
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="font-medium text-sm text-foreground">{item.senderName}</span>
                            <span className="text-xs text-muted-foreground">{item.senderEmail}</span>
                            {item.senderPhone && (
                              <span className="text-[11px] text-muted-foreground">{item.senderPhone}</span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col max-w-md">
                            <span className="text-sm font-semibold text-foreground truncate">{item.subject}</span>
                            <span className="text-xs text-muted-foreground line-clamp-1 mt-0.5">{item.message}</span>
                          </div>
                        </TableCell>
                        <TableCell className="hidden md:table-cell text-xs text-muted-foreground">
                          {formatEnquiryDate(item.createdAt)}
                        </TableCell>
                        <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 px-2 text-xs"
                              asChild
                              onClick={() => {
                                handleUpdateStatus(item.id, 'replied');
                              }}
                            >
                              <a href={buildMailtoUrl(item)}>
                                <Reply className="h-3.5 w-3.5 mr-1 text-primary" />
                                Reply
                              </a>
                            </Button>

                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8">
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={() => handleOpenDetail(item)}>
                                  <MailOpen className="mr-2 h-4 w-4" /> View Details
                                </DropdownMenuItem>
                                <DropdownMenuItem asChild>
                                  <a
                                    href={buildMailtoUrl(item)}
                                    onClick={() => handleUpdateStatus(item.id, 'replied')}
                                  >
                                    <Reply className="mr-2 h-4 w-4" /> Reply via Email
                                  </a>
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                {item.status !== 'new' && (
                                  <DropdownMenuItem onClick={() => handleUpdateStatus(item.id, 'new')}>
                                    <Mail className="mr-2 h-4 w-4" /> Mark as New
                                  </DropdownMenuItem>
                                )}
                                {item.status !== 'read' && (
                                  <DropdownMenuItem onClick={() => handleUpdateStatus(item.id, 'read')}>
                                    <CheckCircle2 className="mr-2 h-4 w-4" /> Mark as Read
                                  </DropdownMenuItem>
                                )}
                                {item.status !== 'replied' && (
                                  <DropdownMenuItem onClick={() => handleUpdateStatus(item.id, 'replied')}>
                                    <CheckCircle2 className="mr-2 h-4 w-4 text-purple-600" /> Mark as Replied
                                  </DropdownMenuItem>
                                )}
                                {item.status !== 'archived' && (
                                  <DropdownMenuItem onClick={() => handleUpdateStatus(item.id, 'archived')}>
                                    <Archive className="mr-2 h-4 w-4" /> Archive
                                  </DropdownMenuItem>
                                )}
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  className="text-destructive"
                                  onClick={() => setEnquiryToDelete(item)}
                                >
                                  <Trash2 className="mr-2 h-4 w-4" /> Delete Enquiry
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Message Reading Detail Dialog */}
      <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <div className="flex items-center justify-between gap-2 pr-6">
              <DialogTitle className="text-xl font-bold flex items-center gap-2">
                <Mail className="h-5 w-5 text-primary" />
                {selectedEnquiry?.subject || 'Enquiry Details'}
              </DialogTitle>
              {selectedEnquiry && getStatusBadge(selectedEnquiry.status)}
            </div>
            <DialogDescription>
              Received on {selectedEnquiry && formatEnquiryDate(selectedEnquiry.createdAt)}
            </DialogDescription>
          </DialogHeader>

          {selectedEnquiry && (
            <div className="space-y-4 py-2">
              {/* Sender Details Card */}
              <div className="p-4 rounded-lg bg-muted/40 border grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                  <div>
                    <span className="text-muted-foreground block text-[10px]">FROM</span>
                    <span className="font-semibold text-foreground text-sm">{selectedEnquiry.senderName}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                  <div>
                    <span className="text-muted-foreground block text-[10px]">EMAIL</span>
                    <a
                      href={`mailto:${selectedEnquiry.senderEmail}`}
                      className="font-medium text-primary hover:underline"
                    >
                      {selectedEnquiry.senderEmail}
                    </a>
                  </div>
                </div>
                {selectedEnquiry.senderPhone && (
                  <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    <div>
                      <span className="text-muted-foreground block text-[10px]">PHONE</span>
                      <a
                        href={`tel:${selectedEnquiry.senderPhone}`}
                        className="font-medium text-primary hover:underline"
                      >
                        {selectedEnquiry.senderPhone}
                      </a>
                    </div>
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                  <div>
                    <span className="text-muted-foreground block text-[10px]">TIMESTAMP</span>
                    <span className="font-medium text-foreground">{formatEnquiryDate(selectedEnquiry.createdAt)}</span>
                  </div>
                </div>
              </div>

              {/* Message Body */}
              <div className="space-y-2">
                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Message Content</h4>
                <div className="p-4 rounded-lg bg-background border whitespace-pre-wrap text-sm leading-relaxed text-foreground min-h-[140px]">
                  {selectedEnquiry.message}
                </div>
              </div>
            </div>
          )}

          <DialogFooter className="flex-col sm:flex-row gap-2 justify-between items-center pt-2">
            <div className="flex items-center gap-2 w-full sm:w-auto">
              {selectedEnquiry && selectedEnquiry.status !== 'replied' && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleUpdateStatus(selectedEnquiry.id, 'replied')}
                  disabled={statusUpdatingId === selectedEnquiry.id}
                >
                  <CheckCircle2 className="mr-1.5 h-4 w-4 text-purple-600" />
                  Mark as Replied
                </Button>
              )}
              {selectedEnquiry && selectedEnquiry.status !== 'archived' && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleUpdateStatus(selectedEnquiry.id, 'archived')}
                  disabled={statusUpdatingId === selectedEnquiry.id}
                >
                  <Archive className="mr-1.5 h-4 w-4 text-muted-foreground" />
                  Archive
                </Button>
              )}
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
              {selectedEnquiry && (
                <Button
                  className="w-full sm:w-auto"
                  asChild
                  onClick={() => handleUpdateStatus(selectedEnquiry.id, 'replied')}
                >
                  <a href={buildMailtoUrl(selectedEnquiry)}>
                    <Reply className="mr-2 h-4 w-4" />
                    Reply via Email
                  </a>
                </Button>
              )}
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!enquiryToDelete} onOpenChange={(open) => !open && setEnquiryToDelete(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Message Enquiry?</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete the message from <strong>{enquiryToDelete?.senderName}</strong> regarding &quot;{enquiryToDelete?.subject}&quot;? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setEnquiryToDelete(null)} disabled={isDeleting}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteEnquiry} disabled={isDeleting}>
              {isDeleting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />}
              Delete Permanently
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
