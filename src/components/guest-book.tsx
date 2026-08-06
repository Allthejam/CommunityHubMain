'use client';

import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
    Star, BookOpen, Loader2, PenLine, Send, Camera, X, Image as ImageIcon, ChevronLeft, ChevronRight, ArrowRight,
} from 'lucide-react';
import {
    collection, query, where, orderBy, getDocs, addDoc, serverTimestamp, doc,
} from 'firebase/firestore';
import { uploadImageAction } from '@/lib/actions/storageActions';
import { useUser, useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { format, isValid } from 'date-fns';
import {
    Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger, DialogClose,
} from '@/components/ui/dialog';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import Link from 'next/link';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';

// ─── Mock data ─────────────────────────────────────────────────────────────────
export const MOCK_ENTRIES = [
    {
        id: 'mock-1', authorName: 'Sarah Mitchell', authorAvatar: '',
        content: 'What a wonderful community! The local park is beautifully kept and the farmers market on Saturday is an absolute gem. Would love to see more evening events for families.',
        rating: 5, createdAt: new Date(Date.now() - 86400000 * 2), imageUrl: '',
    },
    {
        id: 'mock-2', authorName: 'James Thornton', authorAvatar: '',
        content: "Visited for the summer fete — absolutely brilliant. The high street has some great independent shops. The new cycle lanes are a real improvement too.",
        rating: 4, createdAt: new Date(Date.now() - 86400000 * 5), imageUrl: '',
    },
    {
        id: 'mock-3', authorName: 'Priya Sharma', authorAvatar: '',
        content: "A lovely place with a real sense of community spirit. The local council seem to genuinely care about residents' feedback. Looking forward to seeing the new library extension!",
        rating: 5, createdAt: new Date(Date.now() - 86400000 * 9), imageUrl: '',
    },
    {
        id: 'mock-4', authorName: 'Derek Hughes', authorAvatar: '',
        content: 'Good community, friendly people. The roads could do with a bit of attention but overall a nice place to visit. The community hub website is really helpful.',
        rating: 4, createdAt: new Date(Date.now() - 86400000 * 14), imageUrl: '',
    },
    {
        id: 'mock-5', authorName: 'Fiona Campbell', authorAvatar: '',
        content: 'Lovely community with amazing people. The charity events they run are second to none and the local schools are brilliant. Would highly recommend visiting!',
        rating: 5, createdAt: new Date(Date.now() - 86400000 * 20), imageUrl: '',
    },
];

// ─── Star picker ───────────────────────────────────────────────────────────────
const StarPicker = ({ value, onChange }: { value: number; onChange: (v: number) => void }) => {
    const [hovered, setHovered] = useState(0);
    return (
        <div className="flex items-center gap-1">
            {[1, 2, 3, 4, 5].map((star) => (
                <button key={star} type="button" className="focus:outline-none transition-transform hover:scale-110"
                    onMouseEnter={() => setHovered(star)} onMouseLeave={() => setHovered(0)} onClick={() => onChange(star)}>
                    <Star className={cn('h-7 w-7 transition-colors', star <= (hovered || value) ? 'fill-amber-400 text-amber-400' : 'text-muted-foreground/30')} />
                </button>
            ))}
        </div>
    );
};

// ─── Static stars ──────────────────────────────────────────────────────────────
const StarDisplay = ({ rating, size = 'sm' }: { rating: number; size?: 'sm' | 'md' }) => (
    <div className="flex items-center gap-0.5">
        {[1, 2, 3, 4, 5].map((star) => (
            <Star key={star} className={cn(size === 'sm' ? 'h-3.5 w-3.5' : 'h-4 w-4', star <= rating ? 'fill-amber-400 text-amber-400' : 'text-muted-foreground/20')} />
        ))}
    </div>
);

// ─── Single review card (for carousel) ────────────────────────────────────────
const ReviewCard = ({ entry, className }: { entry: any; className?: string }) => {
    const entryDate = entry.createdAt?.toDate ? entry.createdAt.toDate() : new Date(entry.createdAt);
    
    const displayName = entry.isAnonymous 
        ? 'Anonymous' 
        : (() => {
            const name = entry.authorName || 'Guest';
            const parts = name.trim().split(/\s+/);
            if (parts.length <= 1) return parts[0];
            const firstName = parts[0];
            const lastInitial = parts[1][0].toUpperCase();
            return `${firstName} ${lastInitial}.`;
        })();

    const initials = entry.isAnonymous ? 'A' : (entry.authorName || 'A').split(' ').map((p: string) => p[0]).join('').toUpperCase().slice(0, 2);

    return (
        <div className={cn("flex flex-col rounded-2xl border bg-card shadow-sm hover:shadow-md transition-all duration-300 overflow-hidden w-full h-full", className)}>
            {entry.imageUrl && (
                <div className="relative w-full aspect-[16/10] overflow-hidden bg-muted">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={entry.imageUrl} alt="Guest review photo" className="w-full h-full object-cover" />
                </div>
            )}
            <div className="flex flex-col gap-2 p-5 flex-1 justify-between">
                <div className="space-y-3">
                    <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                            <Avatar className="h-9 w-9 shrink-0">
                                {!entry.isAnonymous && <AvatarImage src={entry.authorAvatar} />}
                                <AvatarFallback className="text-xs font-bold bg-primary/10 text-primary">{initials}</AvatarFallback>
                            </Avatar>
                            <div>
                                <p className="font-semibold text-sm leading-tight">{displayName}</p>
                                <p className="text-xs text-muted-foreground">{isValid(entryDate) ? format(entryDate, 'dd MMM yyyy') : ''}</p>
                            </div>
                        </div>
                        <StarDisplay rating={entry.rating} />
                    </div>
                    <p className="text-sm text-muted-foreground leading-relaxed line-clamp-4">&ldquo;{entry.content}&rdquo;</p>
                </div>
            </div>
        </div>
    );
};

// ─── Responsive Grid Carousel ────────────────────────────────────────────────
const CascadingCarousel = ({ entries }: { entries: any[] }) => {
    const [current, setCurrent] = useState(0);

    const next = () => {
        if (entries.length <= 1) return;
        setCurrent((c) => (c + 1) % entries.length);
    };

    const prev = () => {
        if (entries.length <= 1) return;
        setCurrent((c) => (c - 1 + entries.length) % entries.length);
    };

    // Auto-advance every 6s
    useEffect(() => {
        if (entries.length <= 1) return;
        const interval = setInterval(() => {
            setCurrent((c) => (c + 1) % entries.length);
        }, 6000);
        return () => clearInterval(interval);
    }, [entries.length]);

    return (
        <div className="relative w-full">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 items-center py-6">
                {/* First card: always visible */}
                {entries.length > 0 && (
                    <div className="transition-all duration-500 hover:scale-[1.01] h-full flex items-center">
                        <ReviewCard entry={entries[current]} className="hover:shadow-md" />
                    </div>
                )}

                {/* Second card: visible on medium screens and up. In 3-column layout, it is the center card and pops. */}
                {entries.length > 1 && (
                    <div className="hidden md:block transition-all duration-500 hover:scale-[1.01] h-full flex items-center">
                        <ReviewCard 
                            entry={entries[(current + 1) % entries.length]} 
                            className="lg:scale-120 lg:shadow-2xl lg:shadow-black/20 lg:border-primary/40 lg:z-10 hover:lg:scale-125"
                        />
                    </div>
                )}

                {/* Third card: visible on large screens and up */}
                {entries.length > 2 && (
                    <div className="hidden lg:block transition-all duration-500 hover:scale-[1.01] h-full flex items-center">
                        <ReviewCard entry={entries[(current + 2) % entries.length]} className="hover:shadow-md" />
                    </div>
                )}
            </div>

            {/* Nav buttons */}
            {entries.length > 1 && (
                <div className="flex items-center justify-center gap-3 mt-6">
                    <Button variant="outline" size="icon" className="rounded-full h-9 w-9" onClick={prev}>
                        <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <div className="flex items-center gap-1.5">
                        {entries.map((_, idx) => (
                            <button
                                key={idx}
                                className={cn(
                                    'rounded-full transition-all duration-300',
                                    idx === current ? 'w-5 h-2 bg-primary' : 'w-2 h-2 bg-muted-foreground/30 hover:bg-muted-foreground/60'
                                )}
                                onClick={() => setCurrent(idx)}
                            />
                        ))}
                    </div>
                    <Button variant="outline" size="icon" className="rounded-full h-9 w-9" onClick={next}>
                        <ChevronRight className="h-4 w-4" />
                    </Button>
                </div>
            )}
        </div>
    );
};

// ─── Main component ────────────────────────────────────────────────────────────
export function GuestBook({ communityId }: { communityId: string | null }) {
    const { user, isUserLoading } = useUser();
    const { toast } = useToast();
    const db = useFirestore();
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [entries, setEntries] = useState<any[] | null>(null);
    const [loading, setLoading] = useState(true);
    const [dialogOpen, setDialogOpen] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [newRating, setNewRating] = useState(0);
    const [newContent, setNewContent] = useState('');
    const [selectedImage, setSelectedImage] = useState<File | null>(null);
    const [imagePreview, setImagePreview] = useState<string | null>(null);
    const [hasSubmitted, setHasSubmitted] = useState(false);
    const [isAnonymous, setIsAnonymous] = useState(false);

    const userProfileRef = useMemoFirebase(() => (user && db ? doc(db, 'users', user.uid) : null), [user, db]);
    const { data: userProfile } = useDoc(userProfileRef);

    const fetchEntries = useCallback(async () => {
        if (!communityId || !db) return;
        try {
            const q = query(collection(db, 'communities', communityId, 'guestbook'), where('status', 'in', ['Live', 'Approved']));
            const snap = await getDocs(q);
            const fetched = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
            // Sort by createdAt descending client‑side
            fetched.sort((a, b) => {
                const aDate = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(a.createdAt);
                const bDate = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(b.createdAt);
                return bDate.getTime() - aDate.getTime();
            });
            setEntries(fetched);
        } catch { setEntries([]); }
        finally { setLoading(false); }
    }, [communityId, db]);

    useEffect(() => { fetchEntries(); }, [fetchEntries]);

    const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        if (file.size > 5 * 1024 * 1024) {
            toast({ title: 'Image too large', description: 'Please choose an image under 5MB.', variant: 'destructive' });
            return;
        }
        setSelectedImage(file);
        setImagePreview(URL.createObjectURL(file));
    };

    const clearImage = () => {
        setSelectedImage(null);
        setImagePreview(null);
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const handleSubmit = async () => {
        if (!user || !userProfile || !communityId || !db) return;
        if (newRating === 0) {
            toast({ title: 'Rating required', description: 'Please select a star rating.', variant: 'destructive' }); return;
        }
        if (newContent.trim().length < 10) {
            toast({ title: 'Review too short', description: 'Please write at least 10 characters.', variant: 'destructive' }); return;
        }
        setSubmitting(true);
        try {
            let imageUrl = '';
            if (selectedImage) {
                const reader = new FileReader();
                reader.readAsDataURL(selectedImage);
                const base64Data = await new Promise<string>((resolve, reject) => {
                    reader.onload = () => resolve(reader.result as string);
                    reader.onerror = error => reject(error);
                });
                const path = `guestbook/${communityId}/${Date.now()}-${selectedImage.name}`;
                const uploadResult = await uploadImageAction({ base64Data, path });
                if (!uploadResult.success || !uploadResult.url) {
                    throw new Error(uploadResult.error || "Failed to upload image.");
                }
                imageUrl = uploadResult.url;
            }
            await addDoc(collection(db, 'communities', communityId, 'guestbook'), {
                authorId: user.uid,
                authorName: userProfile.name || user.displayName || 'Community Visitor',
                authorAvatar: userProfile.avatar || user.photoURL || '',
                content: newContent.trim(),
                rating: newRating,
                imageUrl,
                isAnonymous,
                status: 'Pending',
                createdAt: serverTimestamp(),
            });
            setHasSubmitted(true);
            setDialogOpen(false);
            setNewContent(''); setNewRating(0); clearImage(); setIsAnonymous(false);
            toast({ title: '🎉 Thank you for your review!', description: 'Your message has been submitted and is awaiting approval from the community team.' });
        } catch (err: any) {
            toast({ title: 'Error', description: err.message, variant: 'destructive' });
        } finally { setSubmitting(false); }
    };

    const displayEntries = entries ?? [];
    const hasRealData = displayEntries.length > 0;
    const avgRating = hasRealData ? displayEntries.reduce((s, e) => s + e.rating, 0) / displayEntries.length : 0;

    if (loading) return (
        <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><BookOpen className="h-6 w-6" />Community Guest Book</CardTitle></CardHeader>
            <CardContent className="h-48 flex justify-center items-center"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></CardContent>
        </Card>
    );

    return (
        <Card>
            <CardHeader>
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                    <div>
                        <CardTitle className="flex items-center gap-2 text-xl">
                            <BookOpen className="h-6 w-6 text-primary" />
                            Community Guest Book
                        </CardTitle>
                        <CardDescription className="mt-1">What visitors say about this community</CardDescription>
                        {hasRealData && (
                            <div className="flex items-center gap-2 mt-2">
                                <span className="text-2xl font-bold">{avgRating.toFixed(1)}</span>
                                <div>
                                    <StarDisplay rating={Math.round(avgRating)} size="md" />
                                    <p className="text-xs text-muted-foreground">{displayEntries.length} review{displayEntries.length !== 1 ? 's' : ''}</p>
                                </div>
                            </div>
                        )}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                        {!hasSubmitted ? (
                            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                                <DialogTrigger asChild>
                                    <Button disabled={!user || isUserLoading} title={!user ? 'Sign in to leave a review' : undefined}>
                                        <PenLine className="mr-2 h-4 w-4" /> Leave a Review
                                    </Button>
                                </DialogTrigger>
                                <DialogContent className="sm:max-w-md">
                                    <DialogHeader>
                                        <DialogTitle>Leave a Review</DialogTitle>
                                        <DialogDescription>Share your experience. Reviews are approved by the local community team before going public.</DialogDescription>
                                    </DialogHeader>
                                    <div className="space-y-4 py-2">
                                        <div className="space-y-1.5">
                                            <label className="text-sm font-medium">Your Rating *</label>
                                            <StarPicker value={newRating} onChange={setNewRating} />
                                        </div>
                                        <div className="space-y-1.5">
                                            <label className="text-sm font-medium">Your Message *</label>
                                            <Textarea placeholder="Tell us what you think about this community..." value={newContent} onChange={(e) => setNewContent(e.target.value)} rows={4} maxLength={500} />
                                            <p className="text-xs text-muted-foreground text-right">{newContent.length} / 500</p>
                                        </div>
                                        <div className="flex items-center gap-2 py-1">
                                            <Checkbox 
                                                id="anonymous-review" 
                                                checked={isAnonymous} 
                                                onCheckedChange={(checked) => setIsAnonymous(!!checked)} 
                                            />
                                            <Label htmlFor="anonymous-review" className="text-sm font-medium cursor-pointer">
                                                Submit review anonymously
                                            </Label>
                                        </div>
                                        <div className="space-y-1.5">
                                            <label className="text-sm font-medium">Add a Photo <span className="text-muted-foreground font-normal">(optional, max 5MB)</span></label>
                                            {imagePreview ? (
                                                <div className="relative rounded-lg overflow-hidden border">
                                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                                    <img src={imagePreview} alt="Preview" className="w-full object-cover max-h-40" />
                                                    <Button type="button" variant="destructive" size="icon" className="absolute top-2 right-2 h-7 w-7 rounded-full" onClick={clearImage}>
                                                        <X className="h-4 w-4" />
                                                    </Button>
                                                </div>
                                            ) : (
                                                <div className="flex gap-2">
                                                    <Button type="button" variant="outline" className="flex-1" onClick={() => fileInputRef.current?.click()}>
                                                        <ImageIcon className="mr-2 h-4 w-4" /> Upload Photo
                                                    </Button>
                                                    <Button type="button" variant="outline" className="flex-1" onClick={() => {
                                                        if (fileInputRef.current) { fileInputRef.current.setAttribute('capture', 'environment'); fileInputRef.current.click(); }
                                                    }}>
                                                        <Camera className="mr-2 h-4 w-4" /> Take Photo
                                                    </Button>
                                                </div>
                                            )}
                                            <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageSelect} />
                                        </div>
                                    </div>
                                    <DialogFooter>
                                        <DialogClose asChild><Button variant="outline" disabled={submitting}>Cancel</Button></DialogClose>
                                        <Button onClick={handleSubmit} disabled={submitting}>
                                            {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
                                            Submit Review
                                        </Button>
                                    </DialogFooter>
                                </DialogContent>
                            </Dialog>
                        ) : (
                            <Badge className="bg-green-100 text-green-800 border-green-200">✓ Review Submitted</Badge>
                        )}
                    </div>
                </div>
            </CardHeader>

            <CardContent>
                {loading ? (
                    <div className="flex justify-center items-center h-48">
                        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                    </div>
                ) : hasRealData ? (
                    <CascadingCarousel entries={displayEntries.slice(0, 20)} />
                ) : (
                    <div className="flex flex-col items-center justify-center h-48 text-center gap-2 text-muted-foreground">
                        <BookOpen className="h-12 w-12 opacity-20" />
                        <p className="text-sm">No approved reviews yet.</p>
                        <p className="text-xs opacity-70">Be the first to leave one!</p>
                    </div>
                )}
            </CardContent>

            <div className="px-6 pb-5 pt-1 flex justify-end">
                <Button variant="ghost" size="sm" asChild>
                    <Link href="/guestbook">
                        See All Reviews <ArrowRight className="ml-2 h-4 w-4" />
                    </Link>
                </Button>
            </div>
        </Card>
    );
}
