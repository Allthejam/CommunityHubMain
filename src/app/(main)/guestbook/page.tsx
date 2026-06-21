'use client';

import React, { useState, useCallback, useEffect, useMemo } from 'react';
import {
    BookOpen, Star, Loader2, User, SlidersHorizontal, ArrowUpDown, Image as ImageIcon, X,
} from 'lucide-react';
import { collection, query, where, orderBy, getDocs, doc } from 'firebase/firestore';
import { useUser, useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { format, isValid } from 'date-fns';
import { cn } from '@/lib/utils';
import {
    Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger,
} from '@/components/ui/sheet';
import { Separator } from '@/components/ui/separator';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent } from '@/components/ui/dialog';

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
        <Card className="overflow-hidden hover:shadow-md transition-shadow">
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
            <CardContent className="p-4 space-y-3">
                <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                        <Avatar className="h-9 w-9 shrink-0">
                            {!entry.isAnonymous && <AvatarImage src={entry.authorAvatar} />}
                            <AvatarFallback className="text-xs font-bold bg-primary/10 text-primary">{initials}</AvatarFallback>
                        </Avatar>
                        <div>
                            <p className="font-semibold text-sm">{displayName}</p>
                            <p className="text-xs text-muted-foreground">{isValid(entryDate) ? format(entryDate, 'dd MMM yyyy') : ''}</p>
                        </div>
                    </div>
                    <StarDisplay rating={entry.rating} />
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed">&ldquo;{entry.content}&rdquo;</p>
            </CardContent>
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
                <Button variant="outline" size="sm" className="relative">
                    <SlidersHorizontal className="mr-2 h-4 w-4" />
                    Filters
                    {activeCount > 0 && <Badge className="absolute -top-2 -right-2 h-4 w-4 p-0 flex items-center justify-center text-xs rounded-full">{activeCount}</Badge>}
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
                                    <div className={cn('h-4 w-4 rounded-full border-2 transition-colors', local.hasImage === opt.value ? 'border-primary bg-primary' : 'border-muted-foreground/40')} />
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
                                    <div className={cn('h-4 w-4 rounded-full border-2 transition-colors', local.dateOrder === opt.value ? 'border-primary bg-primary' : 'border-muted-foreground/40')} />
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
                    <Button className="flex-1" onClick={() => onApply(local)}>
                        Apply Filters
                    </Button>
                </div>
            </SheetContent>
        </Sheet>
    );
};

// ─── Main page ─────────────────────────────────────────────────────────────────
export default function GuestBookPage() {
    const { user } = useUser();
    const db = useFirestore();

    const [entries, setEntries] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [filters, setFilters] = useState<Filters>(defaultFilters);
    const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);

    // Determine community from session / user profile
    const [communityId, setCommunityId] = useState<string | null>(null);
    const [communityName, setCommunityName] = useState<string>('');

    const userProfileRef = useMemoFirebase(() => (user && db ? doc(db, 'users', user.uid) : null), [user, db]);
    const { data: userProfile, isLoading: profileLoading } = useDoc(userProfileRef);

    useEffect(() => {
        if (profileLoading) return;
        const visited = typeof window !== 'undefined' ? sessionStorage.getItem('visitedCommunityId') : null;
        const id = visited || userProfile?.communityId || null;
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
                where('status', '==', 'Live')
            );
            const snap = await getDocs(q);
            setEntries(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
        } catch { setEntries([]); }
        finally { setLoading(false); }
    }, [communityId, db]);

    useEffect(() => { fetchEntries(); }, [fetchEntries]);

    // Only display real approved entries (no mock fallback)
    const displayEntries = entries ?? [];

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
            {/* Header */}
            <div>
                <h1 className="text-3xl font-bold tracking-tight font-headline flex items-center gap-2">
                    <BookOpen className="h-8 w-8 text-primary" /> Community Guest Book
                </h1>
                <p className="text-muted-foreground mt-1">
                    All approved visitor reviews for {communityName || 'this community'}
                </p>
            </div>

            {/* Summary stats */}
            {!loading && displayEntries.length > 0 && (
                <Card>
                    <CardContent className="pt-6">
                        <div className="flex flex-col md:flex-row gap-6 md:items-center">
                            <div className="flex items-center gap-3">
                                <span className="text-5xl font-bold">{avgRating.toFixed(1)}</span>
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
                                            <span className="w-4 text-right shrink-0">{star}</span>
                                            <Star className="h-3 w-3 fill-amber-400 text-amber-400 shrink-0" />
                                            <div className="flex-1 bg-muted rounded-full h-2 overflow-hidden">
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
            <div className="flex items-center justify-between gap-4 flex-wrap">
                <p className="text-sm text-muted-foreground">
                    {loading ? 'Loading...' : `Showing ${filtered.length} of ${displayEntries.length} review${displayEntries.length !== 1 ? 's' : ''}`}
                    {activeFiltersCount > 0 && ` (${activeFiltersCount} filter${activeFiltersCount > 1 ? 's' : ''} active)`}
                </p>
                <div className="flex items-center gap-2">
                    {activeFiltersCount > 0 && (
                        <Button variant="ghost" size="sm" onClick={() => setFilters(defaultFilters)}>
                            <X className="mr-1 h-3.5 w-3.5" /> Clear filters
                        </Button>
                    )}
                    <FiltersSheet filters={filters} onApply={setFilters} />
                </div>
            </div>

            {/* Results */}
            {loading ? (
                <div className="flex justify-center items-center h-48">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
            ) : filtered.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-48 text-center gap-3 border rounded-xl bg-muted/20">
                    <BookOpen className="h-12 w-12 text-muted-foreground/30" />
                    <div>
                        <p className="font-medium">No reviews found</p>
                        <p className="text-sm text-muted-foreground">
                            {displayEntries.length === 0 ? 'No approved reviews yet.' : 'Try adjusting your filters.'}
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

            {/* Lightbox */}
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
