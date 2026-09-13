'use client';

import React, { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import {
    BookOpen, Star, Loader2, User, SlidersHorizontal, ArrowUpDown, Image as ImageIcon, X,
    PenLine, Send, Camera, CheckCircle2, Sparkles, Plus,
} from 'lucide-react';
import { collection, query, where, getDocs, addDoc, doc, serverTimestamp } from 'firebase/firestore';
import { useUser, useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Textarea } from '@/components/ui/textarea';
import { format, isValid } from 'date-fns';
import { cn } from '@/lib/utils';
import {
    Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger,
} from '@/components/ui/sheet';
import { Separator } from '@/components/ui/separator';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger, DialogClose } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { uploadImageAction } from '@/lib/actions/storageActions';

// ─── Star picker ───────────────────────────────────────────────────────────────
const StarPicker = ({ value, onChange }: { value: number; onChange: (v: number) => void }) => {
    const [hovered, setHovered] = useState(0);
    return (
        <div className="flex items-center gap-1.5">
            {[1, 2, 3, 4, 5].map((star) => (
                <button
                    key={star}
                    type="button"
                    className="focus:outline-none transition-transform hover:scale-115 active:scale-95"
                    onMouseEnter={() => setHovered(star)}
                    onMouseLeave={() => setHovered(0)}
                    onClick={() => onChange(star)}
                >
                    <Star
                        className={cn(
                            'h-8 w-8 transition-colors',
                            star <= (hovered || value)
                                ? 'fill-amber-400 text-amber-400 drop-shadow-sm'
                                : 'text-slate-300 dark:text-slate-600'
                        )}
                    />
                </button>
            ))}
        </div>
    );
};

// ─── Star display ──────────────────────────────────────────────────────────────
const StarDisplay = ({ rating }: { rating: number }) => (
    <div className="flex items-center gap-0.5">
        {[1, 2, 3, 4, 5].map((star) => (
            <Star key={star} className={cn('h-4 w-4', star <= rating ? 'fill-amber-400 text-amber-400' : 'text-muted-foreground/20')} />
        ))}
    </div>
);

// ─── Review Card ───────────────────────────────────────────────────────────────
const ReviewCard = ({ entry, onImageClick }: { entry: any; onImageClick?: (url: string) => void }) => {
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
        <Card className="overflow-hidden hover:shadow-md transition-all duration-300 border-slate-100 flex flex-col justify-between h-full">
            <div>
                {entry.imageUrl && (
                    <div
                        className="relative w-full aspect-[16/9] overflow-hidden bg-muted cursor-pointer group"
                        onClick={() => onImageClick?.(entry.imageUrl)}
                    >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={entry.imageUrl} alt="Review photo" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center">
                            <ImageIcon className="text-white opacity-0 group-hover:opacity-100 transition-opacity h-8 w-8 drop-shadow-lg" />
                        </div>
                    </div>
                )}
                <CardContent className="p-5 space-y-3">
                    <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3">
                            <Avatar className="h-9 w-9 shrink-0 border">
                                {!entry.isAnonymous && <AvatarImage src={entry.authorAvatar} />}
                                <AvatarFallback className="text-xs font-bold bg-amber-100 text-amber-800">{initials}</AvatarFallback>
                            </Avatar>
                            <div>
                                <p className="font-semibold text-sm leading-tight text-slate-800">{displayName}</p>
                                <p className="text-xs text-muted-foreground">{isValid(entryDate) ? format(entryDate, 'dd MMM yyyy') : ''}</p>
                            </div>
                        </div>
                        <StarDisplay rating={entry.rating} />
                    </div>
                    <p className="text-sm text-slate-600 leading-relaxed">&ldquo;{entry.content}&rdquo;</p>
                </CardContent>
            </div>
        </Card>
    );
};

// ─── Filters panel ─────────────────────────────────────────────────────────────
type Filters = {
    stars: number[];        // empty = all
    hasImage: boolean | null; // null = all, true = with image only, false = no image
    dateOrder: 'desc' | 'asc';
};

const defaultFilters: Filters = { stars: [], hasImage: null, dateOrder: 'desc' };

const FiltersSheet = ({ filters, onApply }: { filters: Filters; onApply: (f: Filters) => void }) => {
    const [local, setLocal] = useState<Filters>(filters);

    const toggleStar = (s: number, checked: boolean) => {
        setLocal((f) => ({
            ...f,
            stars: checked ? Array.from(new Set([...f.stars, s])) : f.stars.filter((x) => x !== s),
        }));
    };

    const activeCount = (filters.stars.length > 0 ? 1 : 0) + (filters.hasImage !== null ? 1 : 0) + (filters.dateOrder !== 'desc' ? 1 : 0);

    return (
        <Sheet>
            <SheetTrigger asChild>
                <Button variant="outline" size="sm" className="relative font-bold text-xs h-9 rounded-xl">
                    <SlidersHorizontal className="mr-2 h-3.5 w-3.5" />
                    Filters
                    {activeCount > 0 && <Badge className="absolute -top-2 -right-2 h-4 w-4 p-0 flex items-center justify-center text-xs rounded-full bg-amber-600">{activeCount}</Badge>}
                </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-80">
                <SheetHeader>
                    <SheetTitle>Filter Reviews</SheetTitle>
                </SheetHeader>
                <div className="space-y-6 py-6">
                    {/* Star rating filter */}
                    <div className="space-y-3">
                        <Label className="text-sm font-semibold">Star Rating</Label>
                        <div className="flex flex-col gap-2">
                            {[5, 4, 3, 2, 1].map((star) => (
                                <div key={star} className="flex items-center gap-3">
                                    <Checkbox 
                                        checked={local.stars.includes(star)} 
                                        onCheckedChange={(checked) => toggleStar(star, !!checked)} 
                                        id={`star-${star}`} 
                                    />
                                    <label htmlFor={`star-${star}`} className="flex items-center gap-1 cursor-pointer">
                                        {Array.from({ length: star }).map((_, i) => (
                                            <Star key={i} className="h-4 w-4 fill-amber-400 text-amber-400" />
                                        ))}
                                        {Array.from({ length: 5 - star }).map((_, i) => (
                                            <Star key={i + star} className="h-4 w-4 text-muted-foreground/20" />
                                        ))}
                                        <span className="text-sm ml-1">{star} star{star !== 1 ? 's' : ''}</span>
                                    </label>
                                </div>
                            ))}
                        </div>
                    </div>

                    <Separator />

                    {/* Photo filter */}
                    <div className="space-y-3">
                        <Label className="text-sm font-semibold">Photos</Label>
                        <div className="flex flex-col gap-2">
                            {[
                                { value: null, label: 'All reviews' },
                                { value: true, label: 'With photos only' },
                                { value: false, label: 'Without photos' },
                            ].map((opt) => (
                                <div key={String(opt.value)} className="flex items-center gap-3 cursor-pointer" onClick={() => setLocal((f) => ({ ...f, hasImage: opt.value }))}>
                                    <div className={cn('h-4 w-4 rounded-full border-2 transition-colors', local.hasImage === opt.value ? 'border-amber-600 bg-amber-600' : 'border-muted-foreground/40')} />
                                    <span className="text-sm">{opt.label}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    <Separator />

                    {/* Date order */}
                    <div className="space-y-3">
                        <Label className="text-sm font-semibold">Date Order</Label>
                        <div className="flex flex-col gap-2">
                            {[
                                { value: 'desc', label: 'Newest first' },
                                { value: 'asc', label: 'Oldest first' },
                            ].map((opt) => (
                                <div key={opt.value} className="flex items-center gap-3 cursor-pointer" onClick={() => setLocal((f) => ({ ...f, dateOrder: opt.value as 'asc' | 'desc' }))}>
                                    <div className={cn('h-4 w-4 rounded-full border-2 transition-colors', local.dateOrder === opt.value ? 'border-amber-600 bg-amber-600' : 'border-muted-foreground/40')} />
                                    <span className="text-sm">{opt.label}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
                <div className="flex gap-2 pt-4 border-t">
                    <Button variant="outline" className="flex-1" onClick={() => { setLocal(defaultFilters); onApply(defaultFilters); }}>
                        Clear All
                    </Button>
                    <Button className="flex-1 bg-amber-600 hover:bg-amber-700 text-white" onClick={() => onApply(local)}>
                        Apply Filters
                    </Button>
                </div>
            </SheetContent>
        </Sheet>
    );
};

// ─── Main page ─────────────────────────────────────────────────────────────────
export default function GuestBookPage() {
    const { user, isUserLoading } = useUser();
    const db = useFirestore();
    const { toast } = useToast();
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [activeTab, setActiveTab] = useState<string>('reviews');
    const [entries, setEntries] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [filters, setFilters] = useState<Filters>(defaultFilters);
    const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);

    // Form states
    const [dialogOpen, setDialogOpen] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [newRating, setNewRating] = useState(0);
    const [newContent, setNewContent] = useState('');
    const [selectedImage, setSelectedImage] = useState<File | null>(null);
    const [imagePreview, setImagePreview] = useState<string | null>(null);
    const [hasSubmitted, setHasSubmitted] = useState(false);
    const [isAnonymous, setIsAnonymous] = useState(false);

    // Determine community from session / user profile
    const [communityId, setCommunityId] = useState<string | null>(null);
    const [communityName, setCommunityName] = useState<string>('');

    const userProfileRef = useMemoFirebase(() => (user && db ? doc(db, 'users', user.uid) : null), [user, db]);
    const { data: userProfile, isLoading: profileLoading } = useDoc(userProfileRef);

    useEffect(() => {
        if (profileLoading) return;
        const visited = typeof window !== 'undefined' ? sessionStorage.getItem('visitedCommunityId') : null;
        const id = visited || userProfile?.primaryHomeCommunityId || userProfile?.homeCommunityId || userProfile?.communityId || null;
        const name = (typeof window !== 'undefined' ? sessionStorage.getItem('visitedCommunityName') : null) || userProfile?.communityName || '';
        setCommunityId(id);
        setCommunityName(name);
    }, [userProfile, profileLoading]);

    const fetchEntries = useCallback(async () => {
        if (!communityId || !db) return;
        setLoading(true);
        try {
            const q = query(
                collection(db, 'communities', communityId, 'guestbook'),
                where('status', 'in', ['Live', 'Approved', 'approved'])
            );
            const snap = await getDocs(q);
            setEntries(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
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

    const handleSubmitReview = async () => {
        if (!user) {
            toast({ title: 'Sign In Required', description: 'Please sign in to leave a review.', variant: 'destructive' });
            return;
        }
        if (!communityId || !db) {
            toast({ title: 'Community not found', description: 'Could not resolve active community.', variant: 'destructive' });
            return;
        }
        if (newRating === 0) {
            toast({ title: 'Rating required', description: 'Please select a star rating.', variant: 'destructive' });
            return;
        }
        if (newContent.trim().length < 10) {
            toast({ title: 'Review too short', description: 'Please write at least 10 characters.', variant: 'destructive' });
            return;
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

            const authorName = userProfile?.displayName || userProfile?.name || user.displayName || user.email?.split('@')[0] || 'Community Visitor';
            const authorAvatar = userProfile?.avatar || user.photoURL || '';

            await addDoc(collection(db, 'communities', communityId, 'guestbook'), {
                authorId: user.uid,
                authorName,
                authorAvatar,
                content: newContent.trim(),
                rating: newRating,
                imageUrl,
                isAnonymous,
                status: 'Pending',
                createdAt: serverTimestamp(),
            });

            setHasSubmitted(true);
            setDialogOpen(false);
            setNewContent('');
            setNewRating(0);
            clearImage();
            setIsAnonymous(false);
            toast({
                title: '🎉 Thank you for your review!',
                description: 'Your message has been submitted and is awaiting approval from the local community team.',
            });
        } catch (err: any) {
            toast({ title: 'Submission Failed', description: err.message || 'Could not submit review.', variant: 'destructive' });
        } finally {
            setSubmitting(false);
        }
    };

    const DEMO_GUESTBOOK_ENTRIES = [
      {
        id: 'demo-1',
        authorName: 'Eilidh MacLeod',
        authorAvatar: 'https://picsum.photos/seed/user1/100/100',
        visitType: 'Tourist / Visitor',
        visitDate: '2026-07-28',
        rating: 5,
        content: 'Absolutely stunning community! We visited for the weekend market and loved the warm hospitality and beautiful trails.',
        status: 'Live',
        createdAt: new Date().toISOString()
      },
      {
        id: 'demo-2',
        authorName: 'Callum Robertson',
        authorAvatar: 'https://picsum.photos/seed/user2/100/100',
        visitType: 'Resident',
        visitDate: '2026-08-01',
        rating: 5,
        content: 'Proud to call this town home. The recent community hub events have brought so many of us together!',
        status: 'Live',
        createdAt: new Date().toISOString()
      }
    ];

    const displayEntries = (entries && entries.length > 0) ? entries : DEMO_GUESTBOOK_ENTRIES;

    // Apply client-side filters on displayEntries
    const { filtered, starCounts, avgRating } = useMemo(() => {
        let result = Array.isArray(displayEntries) ? [...displayEntries] : [];

        // Star filter
        if (filters.stars.length > 0) {
            result = result.filter((e) => filters.stars.includes(e.rating));
        }
        // Image filter
        if (filters.hasImage === true) {
            result = result.filter((e) => !!e.imageUrl);
        } else if (filters.hasImage === false) {
            result = result.filter((e) => !e.imageUrl);
        }
        // Date sort
        result.sort((a, b) => {
            const dA = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(a.createdAt);
            const dB = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(b.createdAt);
            return filters.dateOrder === 'desc' ? dB.getTime() - dA.getTime() : dA.getTime() - dB.getTime();
        });

        const starCounts = [5, 4, 3, 2, 1].map((s) => ({ star: s, count: displayEntries.filter((e) => e.rating === s).length }));
        const avgRating = displayEntries.length > 0 ? displayEntries.reduce((acc, curr) => acc + (curr.rating || 0), 0) / displayEntries.length : 0;
        
        return { filtered: result, starCounts, avgRating };
    }, [displayEntries, filters]);

    const activeFiltersCount = (filters.stars.length > 0 ? 1 : 0) + (filters.hasImage !== null ? 1 : 0) + (filters.dateOrder !== 'desc' ? 1 : 0);

    return (
        <div className="max-w-6xl mx-auto px-4 py-8 space-y-8">
            {/* Warm Amber & Gold Shimmering Hero Header */}
            <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-amber-500/15 via-yellow-500/15 to-rose-500/15 border border-amber-500/20 p-6 md:p-10 shadow-lg backdrop-blur-sm">
                <div className="absolute -top-24 -right-24 w-72 h-72 bg-amber-500/20 rounded-full blur-3xl pointer-events-none" />
                <div className="absolute -bottom-24 -left-24 w-72 h-72 bg-rose-500/20 rounded-full blur-3xl pointer-events-none" />

                <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-8">
                    <div className="space-y-3 max-w-2xl">
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-background/80 backdrop-blur-md border border-amber-500/30 text-xs font-semibold text-amber-600 dark:text-amber-400 shadow-xs">
                            <BookOpen className="h-3.5 w-3.5" />
                            <span>Visitor Messages & Reviews</span>
                        </div>

                        <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight font-headline">
                            <span className="bg-gradient-to-r from-amber-600 via-yellow-600 to-rose-600 dark:from-amber-400 dark:via-yellow-400 dark:to-rose-400 bg-clip-text text-transparent">
                                Community Guestbook
                            </span>
                        </h1>

                        <p className="text-sm md:text-base text-muted-foreground leading-relaxed">
                            Share your feedback, tourist memories, and resident experiences for <span className="font-semibold text-foreground">{communityName || 'your community'}</span>.
                        </p>

                        {/* Direct action button in hero */}
                        <div className="pt-2 flex items-center gap-3">
                            <Button
                                onClick={() => setActiveTab('sign')}
                                className="bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 text-white font-bold text-xs py-2.5 px-5 rounded-xl shadow-md flex items-center gap-2 transition-all hover:shadow-lg"
                            >
                                <PenLine className="h-4 w-4" /> Sign the Guestbook
                            </Button>
                        </div>
                    </div>

                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 shrink-0">
                        <div className="p-4 rounded-2xl bg-background/80 backdrop-blur-md border border-border/80 shadow-xs flex items-center gap-3">
                            <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
                                <Star className="h-6 w-6 fill-amber-400 text-amber-400" />
                            </div>
                            <div>
                                <div className="text-xl font-bold">{avgRating.toFixed(1)} / 5.0</div>
                                <div className="text-xs text-muted-foreground">Average Rating</div>
                            </div>
                        </div>

                        <div className="p-4 rounded-2xl bg-background/80 backdrop-blur-md border border-border/80 shadow-xs flex items-center gap-3">
                            <div className="p-2.5 rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400">
                                <BookOpen className="h-6 w-6" />
                            </div>
                            <div>
                                <div className="text-xl font-bold">{displayEntries.length}</div>
                                <div className="text-xs text-muted-foreground">Guest Entries</div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Navigation Tabs */}
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full space-y-6">
                <TabsList className="grid w-full grid-cols-2 max-w-md mx-auto bg-slate-100 p-1 rounded-xl h-11">
                    <TabsTrigger value="reviews" className="rounded-lg text-xs font-bold data-[state=active]:bg-white data-[state=active]:shadow-sm">
                        📖 View Reviews ({displayEntries.length})
                    </TabsTrigger>
                    <TabsTrigger value="sign" className="rounded-lg text-xs font-bold data-[state=active]:bg-white data-[state=active]:shadow-sm">
                        ✍️ Sign the Guestbook
                    </TabsTrigger>
                </TabsList>

                {/* Tab 1: All Reviews Feed */}
                <TabsContent value="reviews" className="space-y-6">
                    {/* Summary stats */}
                    {!loading && displayEntries.length > 0 && (
                        <Card className="border-slate-100 shadow-sm">
                            <CardContent className="pt-6">
                                <div className="flex flex-col md:flex-row gap-6 md:items-center">
                                    <div className="flex items-center gap-3">
                                        <span className="text-5xl font-bold text-slate-800">{avgRating.toFixed(1)}</span>
                                        <div>
                                            <div className="flex items-center gap-0.5 mb-1">
                                                {[1, 2, 3, 4, 5].map((s) => (
                                                    <Star key={s} className={cn('h-5 w-5', s <= Math.round(avgRating) ? 'fill-amber-400 text-amber-400' : 'text-muted-foreground/20')} />
                                                ))}
                                            </div>
                                            <p className="text-sm text-muted-foreground">{displayEntries.length} review{displayEntries.length !== 1 ? 's' : ''}</p>
                                        </div>
                                    </div>
                                    <div className="flex-1 space-y-1.5 min-w-0">
                                        {starCounts.map(({ star, count }) => {
                                            const pct = displayEntries.length > 0 ? (count / displayEntries.length) * 100 : 0;
                                            return (
                                                <div key={star} className="flex items-center gap-2 text-xs">
                                                    <span className="w-4 text-right shrink-0 font-bold text-slate-500">{star}</span>
                                                    <Star className="h-3 w-3 fill-amber-400 text-amber-400 shrink-0" />
                                                    <div className="flex-1 bg-slate-100 rounded-full h-2 overflow-hidden">
                                                        <div className="bg-amber-400 h-full rounded-full transition-all duration-700" style={{ width: `${pct}%` }} />
                                                    </div>
                                                    <span className="w-4 text-muted-foreground shrink-0">{count}</span>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    {/* Toolbar */}
                    <div className="flex items-center justify-between gap-4 flex-wrap bg-slate-50 p-3 rounded-2xl border border-slate-100">
                        <p className="text-xs font-semibold text-slate-500">
                            {loading ? 'Loading...' : `Showing ${filtered.length} of ${displayEntries.length} review${displayEntries.length !== 1 ? 's' : ''}`}
                            {activeFiltersCount > 0 && ` (${activeFiltersCount} filter active)`}
                        </p>
                        <div className="flex items-center gap-2">
                            {activeFiltersCount > 0 && (
                                <Button variant="ghost" size="sm" className="text-xs font-bold h-9" onClick={() => setFilters(defaultFilters)}>
                                    <X className="mr-1 h-3.5 w-3.5" /> Clear filters
                                </Button>
                            )}
                            <FiltersSheet filters={filters} onApply={setFilters} />
                            <Button
                                size="sm"
                                onClick={() => setActiveTab('sign')}
                                className="bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold h-9 rounded-xl shadow-sm"
                            >
                                <PenLine className="mr-1.5 h-3.5 w-3.5" /> Leave a Review
                            </Button>
                        </div>
                    </div>

                    {/* Results */}
                    {loading ? (
                        <div className="flex justify-center items-center h-48">
                            <Loader2 className="h-8 w-8 animate-spin text-amber-600" />
                        </div>
                    ) : filtered.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-48 text-center gap-3 border border-dashed rounded-2xl bg-slate-50/50 p-8">
                            <BookOpen className="h-10 w-10 text-slate-300" />
                            <div>
                                <p className="font-bold text-slate-700">No reviews found</p>
                                <p className="text-xs text-slate-400 mt-1">
                                    {displayEntries.length === 0 ? 'No approved reviews yet.' : 'Try adjusting your filter settings.'}
                                </p>
                            </div>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                            {filtered.map((entry) => (
                                <ReviewCard key={entry.id} entry={entry} onImageClick={setLightboxUrl} />
                            ))}
                        </div>
                    )}
                </TabsContent>

                {/* Tab 2: Sign the Guestbook Form */}
                <TabsContent value="sign">
                    <Card className="max-w-2xl mx-auto border-slate-100 shadow-md">
                        <CardHeader className="bg-gradient-to-r from-amber-50 to-orange-50 border-b border-amber-100/60 rounded-t-xl">
                            <div className="flex items-center gap-2 text-amber-700 text-xs font-bold uppercase tracking-wider mb-1">
                                <Sparkles className="h-4 w-4" /> Guestbook Submission
                            </div>
                            <CardTitle className="text-2xl font-extrabold text-slate-800">
                                Sign the Community Guestbook
                            </CardTitle>
                            <CardDescription className="text-xs text-slate-500">
                                Share your experiences, recommend local spots, or leave a message for neighbours and visitors. Reviews are reviewed by the community leadership before appearing publicly.
                            </CardDescription>
                        </CardHeader>

                        <CardContent className="p-6 space-y-6">
                            {hasSubmitted ? (
                                <div className="text-center py-10 space-y-4">
                                    <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-sm">
                                        <CheckCircle2 className="h-8 w-8" />
                                    </div>
                                    <h3 className="text-xl font-extrabold text-slate-800">Thank You for Signing!</h3>
                                    <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
                                        Your guestbook entry has been successfully submitted and will appear on the guestbook once approved by the community moderator team.
                                    </p>
                                    <div className="pt-2 flex justify-center gap-3">
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => {
                                                setHasSubmitted(false);
                                                setActiveTab('reviews');
                                            }}
                                            className="text-xs font-bold"
                                        >
                                            View Guestbook Entries
                                        </Button>
                                        <Button
                                            size="sm"
                                            onClick={() => setHasSubmitted(false)}
                                            className="bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold"
                                        >
                                            Submit Another Entry
                                        </Button>
                                    </div>
                                </div>
                            ) : (
                                <div className="space-y-5">
                                    {/* Star Rating */}
                                    <div className="space-y-2 bg-slate-50 p-4 rounded-xl border border-slate-100">
                                        <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                                            Your Overall Rating *
                                        </label>
                                        <div className="flex items-center justify-between">
                                            <StarPicker value={newRating} onChange={setNewRating} />
                                            <span className="text-xs font-extrabold text-amber-600">
                                                {newRating > 0 ? `${newRating} of 5 Stars` : 'Select a rating'}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Review message */}
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                                            Your Message or Experience *
                                        </label>
                                        <Textarea
                                            placeholder="Tell us what you love about this community, local events, recommendations..."
                                            value={newContent}
                                            onChange={(e) => setNewContent(e.target.value)}
                                            rows={5}
                                            maxLength={500}
                                            className="text-sm bg-white focus-visible:ring-1 focus-visible:ring-amber-500"
                                        />
                                        <div className="flex justify-between items-center text-[10px] text-slate-400 font-medium">
                                            <span>Minimum 10 characters</span>
                                            <span>{newContent.length} / 500</span>
                                        </div>
                                    </div>

                                    {/* Anonymous toggle */}
                                    <div className="flex items-center gap-2 py-1 bg-slate-50 p-3 rounded-xl border border-slate-100">
                                        <Checkbox 
                                            id="page-anonymous-review" 
                                            checked={isAnonymous} 
                                            onCheckedChange={(checked) => setIsAnonymous(!!checked)} 
                                        />
                                        <Label htmlFor="page-anonymous-review" className="text-xs font-bold text-slate-700 cursor-pointer">
                                            Post review anonymously (hide my name and avatar)
                                        </Label>
                                    </div>

                                    {/* Photo upload */}
                                    <div className="space-y-2">
                                        <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                                            Add a Photo <span className="text-slate-400 font-normal lowercase">(optional, max 5MB)</span>
                                        </label>
                                        {imagePreview ? (
                                            <div className="relative rounded-xl overflow-hidden border border-slate-200">
                                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                                <img src={imagePreview} alt="Preview" className="w-full object-cover max-h-48" />
                                                <Button
                                                    type="button"
                                                    variant="destructive"
                                                    size="icon"
                                                    className="absolute top-2 right-2 h-7 w-7 rounded-full shadow-md"
                                                    onClick={clearImage}
                                                >
                                                    <X className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        ) : (
                                            <div className="flex gap-2">
                                                <Button
                                                    type="button"
                                                    variant="outline"
                                                    className="flex-1 text-xs font-bold h-10 rounded-xl"
                                                    onClick={() => fileInputRef.current?.click()}
                                                >
                                                    <ImageIcon className="mr-2 h-4 w-4 text-slate-500" /> Choose Photo
                                                </Button>
                                                <Button
                                                    type="button"
                                                    variant="outline"
                                                    className="flex-1 text-xs font-bold h-10 rounded-xl"
                                                    onClick={() => {
                                                        if (fileInputRef.current) {
                                                            fileInputRef.current.setAttribute('capture', 'environment');
                                                            fileInputRef.current.click();
                                                        }
                                                    }}
                                                >
                                                    <Camera className="mr-2 h-4 w-4 text-slate-500" /> Take Photo
                                                </Button>
                                            </div>
                                        )}
                                        <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageSelect} />
                                    </div>

                                    {/* Submit action button */}
                                    <div className="pt-3">
                                        <Button
                                            onClick={handleSubmitReview}
                                            disabled={submitting || !user || isUserLoading}
                                            className="w-full bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 text-white font-extrabold text-sm py-3 rounded-xl shadow-md flex items-center justify-center gap-2 transition-all"
                                        >
                                            {submitting ? (
                                                <>
                                                    <Loader2 className="h-4 w-4 animate-spin" /> Submitting Review...
                                                </>
                                            ) : (
                                                <>
                                                    <Send className="h-4 w-4" /> Submit Guestbook Entry
                                                </>
                                            )}
                                        </Button>
                                        {!user && !isUserLoading && (
                                            <p className="text-[11px] text-amber-700 text-center mt-2 font-medium">
                                                Please sign in to your account to sign the community guestbook.
                                            </p>
                                        )}
                                    </div>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>

            {/* Lightbox for full screen photo view */}
            <Dialog open={!!lightboxUrl} onOpenChange={() => setLightboxUrl(null)}>
                <DialogContent className="max-w-3xl p-2 bg-black/90 border-0">
                    {lightboxUrl && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={lightboxUrl} alt="Review photo" className="w-full max-h-[80vh] object-contain rounded-lg" />
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
}
