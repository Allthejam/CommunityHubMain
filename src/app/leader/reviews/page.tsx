'use client';

import React, { useState, useCallback } from 'react';
import {
    Star,
    Loader2,
    CheckCircle2,
    XCircle,
    Pencil,
    BookOpen,
    User,
    Calendar,
    MessageSquare,
    ImageIcon,
    AlertTriangle,
    ZoomIn,
    X,
} from 'lucide-react';
import { collection, query, orderBy, getDocs, doc, updateDoc, addDoc, serverTimestamp } from 'firebase/firestore';
import { useUser, useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { format, isValid } from 'date-fns';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';

type GuestBookEntry = {
    id: string;
    authorId: string;
    authorName: string;
    content: string;
    rating: number;
    status: 'Pending' | 'Live' | 'Rejected';
    createdAt: any;
    imageUrl?: string;
};

const StarDisplay = ({ rating }: { rating: number }) => (
    <div className="flex items-center gap-0.5">
        {[1, 2, 3, 4, 5].map((star) => (
            <Star
                key={star}
                className={cn(
                    'h-4 w-4',
                    star <= rating ? 'fill-amber-400 text-amber-400' : 'text-muted-foreground/30'
                )}
            />
        ))}
    </div>
);

const statusVariant = (status: string) => {
    if (status === 'Live') return 'default';
    if (status === 'Rejected') return 'destructive';
    return 'secondary';
};

/** Full-screen image lightbox overlay */
function ImageLightbox({ src, onClose }: { src: string; onClose: () => void }) {
    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-sm"
            onClick={onClose}
        >
            <button
                className="absolute top-4 right-4 rounded-full bg-white/10 p-2 text-white hover:bg-white/20 transition-colors"
                onClick={onClose}
                aria-label="Close image"
            >
                <X className="h-6 w-6" />
            </button>
            <img
                src={src}
                alt="Review attachment – full size"
                className="max-h-[90vh] max-w-[90vw] rounded-xl object-contain shadow-2xl"
                onClick={(e) => e.stopPropagation()}
            />
        </div>
    );
}

export default function LeaderReviewsPage() {
    const { user, isUserLoading } = useUser();
    const { toast } = useToast();
    const db = useFirestore();

    const [entries, setEntries] = useState<GuestBookEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'Pending' | 'Live' | 'Rejected'>('Pending');
    const [processingId, setProcessingId] = useState<string | null>(null);

    const [rejectDialogEntry, setRejectDialogEntry] = useState<GuestBookEntry | null>(null);
    const [editDialogEntry, setEditDialogEntry] = useState<GuestBookEntry | null>(null);
    const [editedContent, setEditedContent] = useState('');
    const [lightboxSrc, setLightboxSrc] = useState<string | null>(null);

    const userProfileRef = useMemoFirebase(
        () => (user && db ? doc(db, 'users', user.uid) : null),
        [user, db]
    );
    const { data: userProfile, isLoading: profileLoading } = useDoc(userProfileRef);

    const communityId =
        (userProfile as any)?.impersonating?.communityId || userProfile?.communityId;
    const communityName =
        (userProfile as any)?.impersonating?.communityName || userProfile?.communityName;

    const fetchEntries = useCallback(async () => {
        if (!communityId || !db) return;
        setLoading(true);
        try {
            const q = query(
                collection(db, 'communities', communityId, 'guestbook'),
                orderBy('createdAt', 'desc')
            );
            const snap = await getDocs(q);
            setEntries(
                snap.docs.map((d) => ({ id: d.id, ...d.data() } as GuestBookEntry))
            );
        } catch (err: any) {
            console.error(err);
            toast({ title: 'Error', description: 'Could not fetch guest book entries.', variant: 'destructive' });
        } finally {
            setLoading(false);
        }
    }, [communityId, db, toast]);

    React.useEffect(() => {
        if (!profileLoading && communityId) {
            fetchEntries();
        }
    }, [profileLoading, communityId, fetchEntries]);

    const handleApprove = async (entry: GuestBookEntry) => {
        if (!communityId || !db) return;
        setProcessingId(entry.id);
        try {
            await updateDoc(doc(db, 'communities', communityId, 'guestbook', entry.id), {
                status: 'Live',
            });
            // Send notification to author
            await addDoc(collection(db, 'notifications'), {
                recipientId: entry.authorId,
                type: 'General Inquiry',
                subject: 'Your Guest Book review has been approved!',
                from: communityName || 'Your Community',
                body: `Great news! Your review for ${communityName} has been approved and is now visible to visitors.`,
                status: 'new',
                date: serverTimestamp(),
                actionUrl: '/home',
            });
            toast({ title: 'Review Approved', description: 'The review is now live and the author has been notified.' });
            await fetchEntries();
        } catch (err: any) {
            toast({ title: 'Error', description: err.message, variant: 'destructive' });
        } finally {
            setProcessingId(null);
        }
    };

    const handleReject = async () => {
        if (!rejectDialogEntry || !communityId || !db) return;
        setProcessingId(rejectDialogEntry.id);
        try {
            await updateDoc(doc(db, 'communities', communityId, 'guestbook', rejectDialogEntry.id), {
                status: 'Rejected',
            });
            // No notification is sent on rejection as per requirements
            toast({ title: 'Review Rejected', description: 'The review has been rejected.' });
            setRejectDialogEntry(null);
            await fetchEntries();
        } catch (err: any) {
            toast({ title: 'Error', description: err.message, variant: 'destructive' });
        } finally {
            setProcessingId(null);
        }
    };

    const handleSaveEdit = async () => {
        if (!editDialogEntry || !communityId || !db || !editedContent.trim()) return;
        setProcessingId(editDialogEntry.id);
        try {
            await updateDoc(doc(db, 'communities', communityId, 'guestbook', editDialogEntry.id), {
                content: editedContent.trim(),
            });
            toast({ title: 'Review Updated', description: 'The review content has been amended.' });
            setEditDialogEntry(null);
            await fetchEntries();
        } catch (err: any) {
            toast({ title: 'Error', description: err.message, variant: 'destructive' });
        } finally {
            setProcessingId(null);
        }
    };

    const openEditDialog = (entry: GuestBookEntry) => {
        setEditedContent(entry.content);
        setEditDialogEntry(entry);
    };

    const filteredEntries = entries.filter((e) => e.status === activeTab);

    const counts = {
        Pending: entries.filter((e) => e.status === 'Pending').length,
        Live: entries.filter((e) => e.status === 'Live').length,
        Rejected: entries.filter((e) => e.status === 'Rejected').length,
    };

    const isLoading = isUserLoading || profileLoading || loading;

    return (
        <div className="space-y-8">
            {/* Lightbox */}
            {lightboxSrc && (
                <ImageLightbox src={lightboxSrc} onClose={() => setLightboxSrc(null)} />
            )}

            <div>
                <h1 className="text-3xl font-bold tracking-tight font-headline flex items-center gap-2">
                    <BookOpen className="h-8 w-8" />
                    Guest Book Reviews
                </h1>
                <p className="text-muted-foreground mt-1">
                    Moderate visitor reviews for {communityName}. Review all attached images for inappropriate content before approving.
                </p>
            </div>

            {/* Abuse-check reminder banner */}
            <div className="flex items-start gap-3 rounded-lg border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-700 dark:text-amber-400">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                <p>
                    Always review any attached photos before approving. Click a thumbnail to view it full-size.
                    Reject or amend any submission containing inappropriate, offensive, or abusive content.
                </p>
            </div>

            {/* Stats Row */}
            <div className="grid grid-cols-3 gap-4">
                {(['Pending', 'Live', 'Rejected'] as const).map((status) => (
                    <Card
                        key={status}
                        className={cn(
                            'cursor-pointer border-2 transition-colors',
                            activeTab === status ? 'border-primary' : 'border-transparent'
                        )}
                        onClick={() => setActiveTab(status)}
                    >
                        <CardContent className="pt-6 text-center">
                            <p className="text-3xl font-bold">{counts[status]}</p>
                            <p className="text-sm text-muted-foreground mt-1">{status}</p>
                        </CardContent>
                    </Card>
                ))}
            </div>

            <Card>
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <CardTitle className="flex items-center gap-2">
                            <MessageSquare className="h-5 w-5" />
                            {activeTab} Reviews
                        </CardTitle>
                        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
                            <TabsList>
                                <TabsTrigger value="Pending">
                                    Pending {counts.Pending > 0 && <Badge className="ml-2 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs">{counts.Pending}</Badge>}
                                </TabsTrigger>
                                <TabsTrigger value="Live">Live</TabsTrigger>
                                <TabsTrigger value="Rejected">Rejected</TabsTrigger>
                            </TabsList>
                        </Tabs>
                    </div>
                </CardHeader>
                <CardContent>
                    {isLoading ? (
                        <div className="flex justify-center items-center h-48">
                            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                        </div>
                    ) : filteredEntries.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-48 text-center gap-2">
                            <BookOpen className="h-12 w-12 text-muted-foreground/30" />
                            <p className="text-muted-foreground">No {activeTab.toLowerCase()} reviews.</p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {filteredEntries.map((entry) => {
                                const entryDate = entry.createdAt?.toDate
                                    ? entry.createdAt.toDate()
                                    : new Date(entry.createdAt);
                                const isProcessing = processingId === entry.id;

                                return (
                                    <div
                                        key={entry.id}
                                        className="rounded-lg border p-4 space-y-3 hover:bg-muted/30 transition-colors"
                                    >
                                        {/* Header row: avatar + name + rating + status badge */}
                                        <div className="flex items-start justify-between gap-4">
                                            <div className="flex items-center gap-3 flex-1 min-w-0">
                                                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                                                    <User className="h-5 w-5 text-primary" />
                                                </div>
                                                <div className="min-w-0">
                                                    <p className="font-semibold truncate">{entry.authorName}</p>
                                                    <div className="flex items-center gap-2 mt-0.5">
                                                        <StarDisplay rating={entry.rating} />
                                                        <span className="text-xs text-muted-foreground">
                                                            {isValid(entryDate)
                                                                ? format(entryDate, 'dd MMM yyyy')
                                                                : 'Unknown date'}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2 shrink-0">
                                                {entry.imageUrl && (
                                                    <Badge variant="outline" className="gap-1 text-amber-600 border-amber-400 bg-amber-50 dark:bg-amber-950/30">
                                                        <ImageIcon className="h-3 w-3" />
                                                        Photo attached
                                                    </Badge>
                                                )}
                                                <Badge variant={statusVariant(entry.status) as any}>
                                                    {entry.status}
                                                </Badge>
                                            </div>
                                        </div>

                                        {/* Review content */}
                                        <p className="text-sm text-muted-foreground leading-relaxed pl-1">
                                            {entry.content}
                                        </p>

                                        {/* Attached image thumbnail */}
                                        {entry.imageUrl && (
                                            <div className="pl-1">
                                                <p className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1">
                                                    <ImageIcon className="h-3.5 w-3.5" />
                                                    Attached photo — review before approving
                                                </p>
                                                <button
                                                    onClick={() => setLightboxSrc(entry.imageUrl!)}
                                                    className="group relative inline-block rounded-lg overflow-hidden border-2 border-border hover:border-primary transition-colors"
                                                    aria-label="View full-size image"
                                                >
                                                    <img
                                                        src={entry.imageUrl}
                                                        alt="Attached review photo"
                                                        className="h-36 w-auto max-w-xs object-cover"
                                                    />
                                                    {/* Hover zoom overlay */}
                                                    <div className="absolute inset-0 flex items-center justify-center bg-black/0 group-hover:bg-black/40 transition-colors">
                                                        <ZoomIn className="h-6 w-6 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                                                    </div>
                                                </button>
                                            </div>
                                        )}

                                        {/* Action buttons */}
                                        <div className="flex items-center gap-2 pt-1 flex-wrap">
                                            {entry.status === 'Pending' && (
                                                <>
                                                    <Button
                                                        size="sm"
                                                        className="bg-green-600 hover:bg-green-700 text-white"
                                                        onClick={() => handleApprove(entry)}
                                                        disabled={isProcessing}
                                                    >
                                                        {isProcessing ? (
                                                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                                        ) : (
                                                            <CheckCircle2 className="mr-2 h-4 w-4" />
                                                        )}
                                                        Approve
                                                    </Button>
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        onClick={() => openEditDialog(entry)}
                                                        disabled={isProcessing}
                                                    >
                                                        <Pencil className="mr-2 h-4 w-4" />
                                                        Amend
                                                    </Button>
                                                    <Button
                                                        size="sm"
                                                        variant="destructive"
                                                        onClick={() => setRejectDialogEntry(entry)}
                                                        disabled={isProcessing}
                                                    >
                                                        <XCircle className="mr-2 h-4 w-4" />
                                                        Reject
                                                    </Button>
                                                </>
                                            )}
                                            {entry.status === 'Live' && (
                                                <>
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        onClick={() => openEditDialog(entry)}
                                                        disabled={isProcessing}
                                                    >
                                                        <Pencil className="mr-2 h-4 w-4" />
                                                        Amend
                                                    </Button>
                                                    <Button
                                                        size="sm"
                                                        variant="destructive"
                                                        onClick={() => setRejectDialogEntry(entry)}
                                                        disabled={isProcessing}
                                                    >
                                                        <XCircle className="mr-2 h-4 w-4" />
                                                        Remove
                                                    </Button>
                                                </>
                                            )}
                                            {entry.status === 'Rejected' && (
                                                <Button
                                                    size="sm"
                                                    className="bg-green-600 hover:bg-green-700 text-white"
                                                    onClick={() => handleApprove(entry)}
                                                    disabled={isProcessing}
                                                >
                                                    {isProcessing ? (
                                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                                    ) : (
                                                        <CheckCircle2 className="mr-2 h-4 w-4" />
                                                    )}
                                                    Re-Approve
                                                </Button>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Reject / Remove Confirmation */}
            <AlertDialog open={!!rejectDialogEntry} onOpenChange={() => setRejectDialogEntry(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>
                            {rejectDialogEntry?.status === 'Live' ? 'Remove Review' : 'Reject Review'}
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                            This review will be moved to Rejected and will no longer be visible publicly.
                            The author will not be notified.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            onClick={handleReject}
                        >
                            Confirm
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            {/* Edit / Amend Dialog */}
            <Dialog open={!!editDialogEntry} onOpenChange={() => setEditDialogEntry(null)}>
                <DialogContent className="sm:max-w-lg">
                    <DialogHeader>
                        <DialogTitle>Amend Review</DialogTitle>
                        <DialogDescription>
                            Edit the content of this review. The author&apos;s rating will remain unchanged.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="py-4 space-y-3">
                        {editDialogEntry && <StarDisplay rating={editDialogEntry.rating} />}
                        <Textarea
                            value={editedContent}
                            onChange={(e) => setEditedContent(e.target.value)}
                            rows={5}
                            className="mt-2"
                        />
                        {/* Show image inside the edit dialog too for reference */}
                        {editDialogEntry?.imageUrl && (
                            <div className="mt-2">
                                <p className="text-xs font-medium text-muted-foreground mb-1 flex items-center gap-1">
                                    <ImageIcon className="h-3.5 w-3.5" />
                                    Attached photo
                                </p>
                                <button
                                    type="button"
                                    onClick={() => setLightboxSrc(editDialogEntry.imageUrl!)}
                                    className="group relative inline-block rounded-lg overflow-hidden border border-border hover:border-primary transition-colors"
                                >
                                    <img
                                        src={editDialogEntry.imageUrl}
                                        alt="Attached review photo"
                                        className="h-28 w-auto max-w-full object-cover"
                                    />
                                    <div className="absolute inset-0 flex items-center justify-center bg-black/0 group-hover:bg-black/40 transition-colors">
                                        <ZoomIn className="h-5 w-5 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                                    </div>
                                </button>
                            </div>
                        )}
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setEditDialogEntry(null)}>
                            Cancel
                        </Button>
                        <Button onClick={handleSaveEdit} disabled={!!processingId}>
                            {processingId ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                            Save Changes
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
