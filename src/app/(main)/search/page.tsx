'use client';

import React, { useState, useMemo, useEffect } from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import {
  Search,
  MapPin,
  Building2,
  Calendar,
  Newspaper,
  Crown,
  ArrowRight,
  ShieldCheck,
  Clock,
  X,
  Compass,
  Phone,
  HelpCircle,
  Tv
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection } from 'firebase/firestore';

function normalize(str: string): string {
  return (str || '')
    .toLowerCase()
    .replace(/[-_&/\\.,'"+()]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function levenshteinDistance(a: string, b: string): number {
  const an = a ? a.length : 0;
  const bn = b ? b.length : 0;
  if (an === 0) return bn;
  if (bn === 0) return an;
  const matrix = Array.from({ length: bn + 1 }, () => Array(an + 1).fill(0));
  for (let i = 0; i <= an; i++) matrix[0][i] = i;
  for (let j = 0; j <= bn; j++) matrix[j][0] = j;
  for (let j = 1; j <= bn; j++) {
    for (let i = 1; i <= an; i++) {
      if (a[i - 1] === b[j - 1]) {
        matrix[j][i] = matrix[j - 1][i - 1];
      } else {
        matrix[j][i] = Math.min(
          matrix[j - 1][i] + 1,
          matrix[j][i - 1] + 1,
          matrix[j - 1][i - 1] + 1
        );
      }
    }
  }
  return matrix[bn][an];
}

const STOP_WORDS = new Set(['on', 'the', 'and', 'of', 'in', 'at', 'by', 'for', 'with', 'a', 'an', 'to']);
const SHOW_HOME_ID = '9ayHMyZf4SRw2gof1AM9';

function SearchContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const db = useFirestore();

  const initialQuery = searchParams.get('q') || '';
  const [searchTerm, setSearchTerm] = useState(initialQuery);
  const [activeQuery, setActiveQuery] = useState(initialQuery);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  useEffect(() => {
    const q = searchParams.get('q') || '';
    setSearchTerm(q);
    setActiveQuery(q);
  }, [searchParams]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = searchTerm.trim();
    setActiveQuery(clean);
    if (clean) {
      router.push(`/search?q=${encodeURIComponent(clean)}`);
    } else {
      router.push('/search');
    }
  };

  const handleSuggestedSearch = (suggestion: string) => {
    setSearchTerm(suggestion);
    setActiveQuery(suggestion);
    router.push(`/search?q=${encodeURIComponent(suggestion)}`);
  };

  // ─── QUERY UNLIMITED COLLECTIONS FROM DATABASE ────────────────────────
  const communitiesQuery = useMemoFirebase(() => (db ? collection(db, 'communities') : null), [db]);
  const businessesQuery = useMemoFirebase(() => (db ? collection(db, 'businesses') : null), [db]);
  const eventsQuery = useMemoFirebase(() => (db ? collection(db, 'events') : null), [db]);
  const whatsonQuery = useMemoFirebase(() => (db ? collection(db, 'whatson') : null), [db]);
  const newsQuery = useMemoFirebase(() => (db ? collection(db, 'news') : null), [db]);

  const { data: rawCommunities } = useCollection<any>(communitiesQuery);
  const { data: rawBusinesses } = useCollection<any>(businessesQuery);
  const { data: rawEvents } = useCollection<any>(eventsQuery);
  const { data: rawWhatsOn } = useCollection<any>(whatsonQuery);
  const { data: rawNews } = useCollection<any>(newsQuery);

  const isDemoEnv = false;

  const communitiesData = useMemo(() => {
    if (!rawCommunities) return [];
    if (!isDemoEnv) {
      return rawCommunities.filter(c => c.id !== SHOW_HOME_ID);
    }
    return rawCommunities;
  }, [rawCommunities, isDemoEnv]);

  const businessesData = useMemo(() => {
    if (!rawBusinesses) return [];
    if (!isDemoEnv) {
      return rawBusinesses.filter(b => (b.primaryCommunityId !== SHOW_HOME_ID && b.communityId !== SHOW_HOME_ID));
    }
    return rawBusinesses;
  }, [rawBusinesses, isDemoEnv]);

  const eventsData = useMemo(() => {
    if (!rawEvents) return [];
    if (!isDemoEnv) {
      return rawEvents.filter(e => e.communityId !== SHOW_HOME_ID);
    }
    return rawEvents;
  }, [rawEvents, isDemoEnv]);

  const whatsonData = useMemo(() => {
    if (!rawWhatsOn) return [];
    if (!isDemoEnv) {
      return rawWhatsOn.filter(w => w.communityId !== SHOW_HOME_ID);
    }
    return rawWhatsOn;
  }, [rawWhatsOn, isDemoEnv]);

  const newsData = useMemo(() => {
    if (!rawNews) return [];
    if (!isDemoEnv) {
      return rawNews.filter(n => n.communityId !== SHOW_HOME_ID);
    }
    return rawNews;
  }, [rawNews, isDemoEnv]);

  const communityNamesMap = useMemo(() => {
    const map = new Map<string, string>();
    (communitiesData || []).forEach(c => {
      if (c.id && c.name) map.set(c.id, c.name);
    });
    return map;
  }, [communitiesData]);

  // ─── TOWN-SCOPED MATCHING LOGIC ───────────────────────────────────────────
  const qNormalized = normalize(activeQuery);
  const qTokens = qNormalized.split(' ').filter(t => t.length > 0 && !STOP_WORDS.has(t));

  const matchesStrict = (text: string): boolean => {
    if (!text || !qNormalized) return false;
    const textNorm = normalize(text);
    if (textNorm.includes(qNormalized)) return true;
    if (qTokens.length > 0 && qTokens.every(token => textNorm.includes(token))) {
      return true;
    }
    return false;
  };

  // 1. Matched Communities
  const matchedCommunities = useMemo(() => {
    if (!qNormalized) return [];
    return (communitiesData || []).filter((c) => {
      return matchesStrict(c.name);
    });
  }, [communitiesData, qNormalized, qTokens]);

  const matchedCommunityIds = useMemo(() => {
    return new Set(matchedCommunities.map(c => c.id));
  }, [matchedCommunities]);

  const isTownSearch = matchedCommunities.length > 0;

  // 2. Matched Businesses
  const matchedBusinesses = useMemo(() => {
    if (!qNormalized) return [];
    return (businessesData || []).filter((b) => {
      const commId = b.primaryCommunityId || b.communityId;
      if (isTownSearch) {
        return commId && matchedCommunityIds.has(commId);
      }
      return (
        matchesStrict(b.businessName) ||
        matchesStrict(b.name) ||
        matchesStrict(b.businessCategory) ||
        matchesStrict(b.category) ||
        matchesStrict(b.description) ||
        matchesStrict(b.about)
      );
    });
  }, [businessesData, qNormalized, qTokens, isTownSearch, matchedCommunityIds]);

  // 3. Matched Events
  const matchedEvents = useMemo(() => {
    if (!qNormalized) return [];
    return (eventsData || []).filter((e) => {
      const commId = e.communityId;
      if (isTownSearch) {
        return commId && matchedCommunityIds.has(commId);
      }
      return (
        matchesStrict(e.title) ||
        matchesStrict(e.description) ||
        matchesStrict(e.category) ||
        matchesStrict(e.location)
      );
    });
  }, [eventsData, qNormalized, qTokens, isTownSearch, matchedCommunityIds]);

  // 4. Matched What's On
  const matchedWhatsOn = useMemo(() => {
    if (!qNormalized) return [];
    return (whatsonData || []).filter((w) => {
      const commId = w.communityId;
      if (isTownSearch) {
        return commId && matchedCommunityIds.has(commId);
      }
      return (
        matchesStrict(w.title) ||
        matchesStrict(w.description) ||
        matchesStrict(w.category) ||
        matchesStrict(w.venue) ||
        matchesStrict(w.location)
      );
    });
  }, [whatsonData, qNormalized, qTokens, isTownSearch, matchedCommunityIds]);

  // 5. Matched News
  const matchedNews = useMemo(() => {
    if (!qNormalized) return [];
    return (newsData || []).filter((n) => {
      const commId = n.communityId;
      if (isTownSearch) {
        return commId && matchedCommunityIds.has(commId);
      }
      return (
        matchesStrict(n.title) ||
        matchesStrict(n.content) ||
        matchesStrict(n.author) ||
        matchesStrict(n.category)
      );
    });
  }, [newsData, qNormalized, qTokens, isTownSearch, matchedCommunityIds]);

  const totalResultsCount =
    matchedCommunities.length +
    matchedBusinesses.length +
    matchedEvents.length +
    matchedWhatsOn.length +
    matchedNews.length;

  // ─── DYNAMIC "DID YOU MEAN?" ──────────────────────────────────────────────
  const didYouMean = useMemo(() => {
    if (totalResultsCount > 0 || !qNormalized || qNormalized.length < 3) return null;

    let bestCandidate: string | null = null;
    let minDistance = 999;

    const allNames = [
      ...(communitiesData || []).map(c => c.name),
      ...(businessesData || []).map(b => b.businessName || b.name)
    ].filter(Boolean);

    for (const name of allNames) {
      const nameNorm = normalize(name);
      if (nameNorm === qNormalized) continue;

      const dist = levenshteinDistance(qNormalized, nameNorm);
      const threshold = Math.max(2, Math.floor(nameNorm.length * 0.35));
      if (dist <= threshold && dist < minDistance) {
        minDistance = dist;
        bestCandidate = name;
      }
    }

    return bestCandidate;
  }, [totalResultsCount, qNormalized, communitiesData, businessesData]);

  return (
    <div className="min-h-[85vh] bg-background text-foreground pb-16">
      {/* ─── SEARCH HERO BAR ─── */}
      <div className="pt-10 pb-8 px-4 border-b border-border bg-muted/30">
        <div className="container max-w-4xl mx-auto flex flex-col items-center text-center">
          <div className="flex items-center gap-2.5 mb-3">
            <div className="h-10 w-10 rounded-2xl bg-primary text-primary-foreground flex items-center justify-center shadow-md">
              <Search className="h-5 w-5" />
            </div>
            <h1 className="text-3xl font-black tracking-tight font-headline text-foreground">
              Community<span className="text-primary">Search</span>
            </h1>
            <Badge variant="outline" className="text-[10px] font-mono uppercase font-bold">
              Ecosystem
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground max-w-lg mb-6 font-medium">
            Search across towns, local businesses, community events, what&apos;s on guides, and news.
          </p>

          <form onSubmit={handleSearchSubmit} className="w-full relative max-w-2xl">
            <div className="relative flex items-center">
              <Search className="absolute left-4 h-5 w-5 text-muted-foreground pointer-events-none" />
              <Input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search towns, businesses, events, what's on, or news..."
                className="h-13 pl-12 pr-28 rounded-full text-base bg-background border-2 border-primary/40 focus-visible:border-primary shadow-md text-foreground placeholder:text-muted-foreground"
                autoFocus
              />
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => { setSearchTerm(''); setActiveQuery(''); router.push('/search'); }}
                  className="absolute right-20 text-muted-foreground hover:text-foreground p-1"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
              <Button
                type="submit"
                size="sm"
                className="absolute right-2 h-9 px-5 rounded-full font-bold shadow"
              >
                Search
              </Button>
            </div>
          </form>
        </div>
      </div>

      {/* ─── SEARCH RESULTS CONTAINER ─── */}
      <div className="container max-w-5xl mx-auto px-4 sm:px-6 pt-6">
        {activeQuery ? (
          <div>
            {didYouMean && (
              <div className="mb-6 p-4 rounded-xl bg-primary/10 border border-primary/30 flex items-center justify-between gap-3 shadow-sm">
                <div className="flex items-center gap-2.5 text-sm">
                  <HelpCircle className="h-5 w-5 text-primary shrink-0" />
                  <span>
                    Did you mean:{' '}
                    <button
                      onClick={() => handleSuggestedSearch(didYouMean)}
                      className="font-bold text-primary underline hover:text-primary/80 cursor-pointer"
                    >
                      {didYouMean}
                    </button>
                    ?
                  </span>
                </div>
                <Button size="sm" variant="outline" onClick={() => handleSuggestedSearch(didYouMean)} className="text-xs font-bold shrink-0">
                  Search &ldquo;{didYouMean}&rdquo;
                </Button>
              </div>
            )}

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-border mb-6">
              <p className="text-sm text-muted-foreground">
                Found <strong className="text-foreground">{totalResultsCount}</strong> result{totalResultsCount === 1 ? '' : 's'} for &ldquo;
                <span className="text-foreground font-bold">{activeQuery}</span>&rdquo;
                {isTownSearch && <span className="ml-1 text-primary font-medium">(Scoped to {matchedCommunities.map(c => c.name).join(', ')})</span>}
              </p>

              <div className="flex items-center gap-1.5 flex-wrap">
                <Button
                  variant={selectedCategory === 'all' ? 'secondary' : 'ghost'}
                  size="sm"
                  onClick={() => setSelectedCategory('all')}
                  className="h-8 text-xs font-bold"
                >
                  All ({totalResultsCount})
                </Button>
                <Button
                  variant={selectedCategory === 'communities' ? 'secondary' : 'ghost'}
                  size="sm"
                  onClick={() => setSelectedCategory('communities')}
                  className="h-8 text-xs font-bold gap-1"
                >
                  <MapPin className="h-3.5 w-3.5 text-primary" /> Towns ({matchedCommunities.length})
                </Button>
                <Button
                  variant={selectedCategory === 'businesses' ? 'secondary' : 'ghost'}
                  size="sm"
                  onClick={() => setSelectedCategory('businesses')}
                  className="h-8 text-xs font-bold gap-1"
                >
                  <Building2 className="h-3.5 w-3.5 text-amber-500" /> Businesses ({matchedBusinesses.length})
                </Button>
                <Button
                  variant={selectedCategory === 'events' ? 'secondary' : 'ghost'}
                  size="sm"
                  onClick={() => setSelectedCategory('events')}
                  className="h-8 text-xs font-bold gap-1"
                >
                  <Calendar className="h-3.5 w-3.5 text-sky-500" /> Events ({matchedEvents.length})
                </Button>
                <Button
                  variant={selectedCategory === 'whatson' ? 'secondary' : 'ghost'}
                  size="sm"
                  onClick={() => setSelectedCategory('whatson')}
                  className="h-8 text-xs font-bold gap-1"
                >
                  <Tv className="h-3.5 w-3.5 text-emerald-500" /> What&apos;s On ({matchedWhatsOn.length})
                </Button>
                <Button
                  variant={selectedCategory === 'news' ? 'secondary' : 'ghost'}
                  size="sm"
                  onClick={() => setSelectedCategory('news')}
                  className="h-8 text-xs font-bold gap-1"
                >
                  <Newspaper className="h-3.5 w-3.5 text-purple-500" /> News ({matchedNews.length})
                </Button>
              </div>
            </div>

            {totalResultsCount === 0 ? (
              <Card className="p-10 text-center border-dashed border-2 bg-card text-card-foreground">
                <div className="mx-auto w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-3">
                  <Compass className="h-6 w-6 text-muted-foreground" />
                </div>
                <h3 className="font-bold text-lg mb-1 text-foreground">No ecosystem results found</h3>
                <p className="text-sm text-muted-foreground max-w-md mx-auto">
                  We couldn&apos;t find any towns, businesses, or events matching &ldquo;{activeQuery}&rdquo;.
                </p>
                {didYouMean && (
                  <div className="mt-4">
                    <Button onClick={() => handleSuggestedSearch(didYouMean)} className="font-bold gap-1.5 shadow">
                      Search for &ldquo;{didYouMean}&rdquo; instead <ArrowRight className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </Card>
            ) : (
              <div className="space-y-8">
                {/* ─── SECTION 1: TOWN / COMMUNITY STATUS CARD ─── */}
                {(selectedCategory === 'all' || selectedCategory === 'communities') &&
                  matchedCommunities.length > 0 && (
                    <div className="space-y-4">
                      <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                        <MapPin className="h-4 w-4 text-primary" /> Community Status & Leadership
                      </h2>

                      <div className="grid grid-cols-1 gap-4">
                        {matchedCommunities.map((comm) => {
                          const hasLeader = (comm.leaderCount || 0) > 0 || comm.status === 'active';
                          const isUnclaimed = !hasLeader || comm.status === 'unclaimed' || comm.status === 'inactive';

                          return (
                            <Card
                              key={comm.id}
                              className={`border-2 transition-all shadow-md ${
                                isUnclaimed
                                  ? 'border-amber-500/50 bg-amber-500/5'
                                  : 'border-primary/50 bg-primary/5'
                              }`}
                            >
                              <CardHeader className="pb-3">
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                  <div>
                                    <div className="flex items-center gap-2.5 flex-wrap">
                                      <CardTitle className="text-2xl font-black text-foreground">{comm.name}</CardTitle>
                                      {isUnclaimed ? (
                                        <Badge className="bg-amber-500 text-white font-bold text-xs gap-1">
                                          <Crown className="h-3 w-3" /> Leadership Vacancy • Unclaimed
                                        </Badge>
                                      ) : (
                                        <Badge className="bg-primary text-primary-foreground font-bold text-xs gap-1">
                                          <ShieldCheck className="h-3 w-3" /> Active Community Hub
                                        </Badge>
                                      )}
                                    </div>
                                    <CardDescription className="text-xs mt-1 text-muted-foreground font-medium">
                                      Region: {comm.region || 'Regional Network'} • {comm.country || 'UK'}
                                    </CardDescription>
                                  </div>

                                  <div className="flex items-center gap-2">
                                    <div className="text-center px-3.5 py-1.5 rounded-lg bg-card border border-border shadow-sm">
                                      <p className="text-[10px] uppercase text-muted-foreground font-bold">Members</p>
                                      <p className="text-base font-extrabold text-foreground">{comm.memberCount || 0}</p>
                                    </div>
                                    <div className="text-center px-3.5 py-1.5 rounded-lg bg-card border border-border shadow-sm">
                                      <p className="text-[10px] uppercase text-muted-foreground font-bold">Leaders</p>
                                      <p className={`text-base font-extrabold ${isUnclaimed ? 'text-amber-600 dark:text-amber-400' : 'text-primary'}`}>
                                        {comm.leaderCount || 0}
                                      </p>
                                    </div>
                                  </div>
                                </div>
                              </CardHeader>

                              <CardContent className="text-sm pb-4 text-foreground">
                                <p className="leading-relaxed text-foreground font-normal">
                                  {comm.description ||
                                    `Welcome to the ${comm.name} Community Hub. Connect with residents, explore local businesses, and follow civic events.`}
                                </p>

                                {isUnclaimed && (
                                  <div className="mt-3.5 p-3.5 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-start gap-3">
                                    <Crown className="h-5 w-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                                    <div className="text-xs text-foreground leading-relaxed">
                                      <strong className="text-amber-700 dark:text-amber-300 font-bold">Leadership Opportunity:</strong> This community currently has no registered leader. Community Leaders earn a <strong className="font-bold">40% revenue share</strong> from all local business and premium subscriptions.
                                    </div>
                                  </div>
                                )}
                              </CardContent>

                              <CardFooter className="pt-3 flex flex-wrap gap-2.5 justify-between border-t border-border bg-card/40">
                                {isUnclaimed ? (
                                  <>
                                    <Button
                                      size="sm"
                                      className="font-bold bg-amber-600 hover:bg-amber-500 text-white gap-1.5 shadow"
                                      asChild
                                    >
                                      <Link href="/signup/leader">
                                        <Crown className="h-4 w-4" /> Become Leader of {comm.name}
                                      </Link>
                                    </Button>
                                    <Button variant="outline" size="sm" asChild>
                                      <Link href="/home" className="text-xs font-semibold gap-1">
                                        Explore Starter Hub <ArrowRight className="h-3.5 w-3.5" />
                                      </Link>
                                    </Button>
                                  </>
                                ) : (
                                  <>
                                    <Button size="sm" className="font-bold gap-1.5 shadow" asChild>
                                      <Link href="/home">
                                        Enter {comm.name} Hub <ArrowRight className="h-4 w-4" />
                                      </Link>
                                    </Button>
                                    <Button variant="outline" size="sm" asChild>
                                      <Link href="/communities" className="text-xs font-semibold gap-1">
                                        View on Community Map <MapPin className="h-3.5 w-3.5 text-primary" />
                                      </Link>
                                    </Button>
                                  </>
                                )}
                              </CardFooter>
                            </Card>
                          );
                        })}
                      </div>
                    </div>
                  )}

                {/* ─── SECTION 2: BUSINESSES & HIGH STREET ─── */}
                {(selectedCategory === 'all' || selectedCategory === 'businesses') &&
                  matchedBusinesses.length > 0 && (
                    <div className="space-y-4">
                      <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                        <Building2 className="h-4 w-4 text-amber-500" /> Local Businesses & High Street ({matchedBusinesses.length})
                      </h2>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {matchedBusinesses.map((biz) => {
                          const commId = biz.primaryCommunityId || biz.communityId;
                          const townName = communityNamesMap.get(commId) || biz.communityName || 'Local Community';

                          return (
                            <Card key={biz.id} className="bg-card text-card-foreground hover:border-primary/50 transition-all shadow-sm">
                              <CardHeader className="pb-2">
                                <div className="flex items-start justify-between gap-2">
                                  <div>
                                    <CardTitle className="text-base font-bold text-foreground">{biz.businessName || biz.name}</CardTitle>
                                    <Badge variant="secondary" className="text-[10px] mt-1 capitalize font-medium">
                                      {biz.businessCategory || biz.category || 'Local Business'}
                                    </Badge>
                                  </div>
                                  <span className="text-[11px] font-medium text-muted-foreground flex items-center gap-1">
                                    <MapPin className="h-3.5 w-3.5 text-primary" /> {townName}
                                  </span>
                                </div>
                              </CardHeader>
                              <CardContent className="text-xs text-muted-foreground pb-3 line-clamp-2 leading-relaxed">
                                {biz.description || biz.about || 'Local community business registered in the High Street directory.'}
                              </CardContent>
                              <CardFooter className="pt-2.5 flex justify-between items-center text-xs border-t border-border">
                                <span className="text-muted-foreground flex items-center gap-1 font-medium">
                                  <Phone className="h-3 w-3" /> {biz.phone || 'Contact Business'}
                                </span>
                                <Button variant="ghost" size="sm" className="h-7 text-xs font-bold text-primary hover:text-primary/80 gap-1" asChild>
                                  <Link href="/shopping">
                                    View Shop <ArrowRight className="h-3 w-3" />
                                  </Link>
                                </Button>
                              </CardFooter>
                            </Card>
                          );
                        })}
                      </div>
                    </div>
                  )}

                {/* ─── SECTION 3: EVENTS & FESTIVALS ─── */}
                {(selectedCategory === 'all' || selectedCategory === 'events') &&
                  matchedEvents.length > 0 && (
                    <div className="space-y-4">
                      <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                        <Calendar className="h-4 w-4 text-sky-500" /> Upcoming Community Events ({matchedEvents.length})
                      </h2>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {matchedEvents.map((evt) => {
                          const townName = communityNamesMap.get(evt.communityId) || 'Local Community';

                          return (
                            <Card key={evt.id} className="bg-card text-card-foreground hover:border-primary/50 transition-all shadow-sm">
                              <CardHeader className="pb-2">
                                <div className="flex items-start justify-between gap-2">
                                  <div>
                                    <CardTitle className="text-base font-bold text-foreground">{evt.title}</CardTitle>
                                    <span className="text-xs text-sky-600 dark:text-sky-400 font-semibold flex items-center gap-1 mt-1">
                                      <Clock className="h-3 w-3" /> {evt.date || 'Upcoming'} • {evt.time || '10:00 AM'}
                                    </span>
                                  </div>
                                  <Badge variant="outline" className="text-[10px] font-medium">
                                    {evt.category || 'Event'}
                                  </Badge>
                                </div>
                              </CardHeader>
                              <CardContent className="text-xs text-muted-foreground pb-3 line-clamp-2 leading-relaxed">
                                {evt.description || 'Community event open to residents and visitors.'}
                              </CardContent>
                              <CardFooter className="pt-2.5 flex justify-between items-center text-xs border-t border-border">
                                <span className="text-muted-foreground flex items-center gap-1 font-medium">
                                  <MapPin className="h-3.5 w-3.5 text-primary" /> {evt.location || townName}
                                </span>
                                <Button variant="ghost" size="sm" className="h-7 text-xs font-bold text-primary hover:text-primary/80 gap-1" asChild>
                                  <Link href="/events">
                                    Details <ArrowRight className="h-3 w-3" />
                                  </Link>
                                </Button>
                              </CardFooter>
                            </Card>
                          );
                        })}
                      </div>
                    </div>
                  )}

                {/* ─── SECTION 4: WHAT'S ON GUIDE ─── */}
                {(selectedCategory === 'all' || selectedCategory === 'whatson') &&
                  matchedWhatsOn.length > 0 && (
                    <div className="space-y-4">
                      <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                        <Tv className="h-4 w-4 text-emerald-500" /> What&apos;s On Guide & Activities ({matchedWhatsOn.length})
                      </h2>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {matchedWhatsOn.map((w) => {
                          const townName = communityNamesMap.get(w.communityId) || 'Local Community';

                          return (
                            <Card key={w.id} className="bg-card text-card-foreground hover:border-primary/50 transition-all shadow-sm">
                              <CardHeader className="pb-2">
                                <div className="flex items-start justify-between gap-2">
                                  <div>
                                    <CardTitle className="text-base font-bold text-foreground">{w.title}</CardTitle>
                                    <span className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1 mt-1">
                                      <MapPin className="h-3 w-3" /> {w.venue || w.location || townName}
                                    </span>
                                  </div>
                                  <Badge variant="outline" className="text-[10px] font-medium border-emerald-500/40 text-emerald-600 dark:text-emerald-300">
                                    {w.category || 'Attraction'}
                                  </Badge>
                                </div>
                              </CardHeader>
                              <CardContent className="text-xs text-muted-foreground pb-3 line-clamp-2 leading-relaxed">
                                {w.description || 'Community attractions, walking trails, and regular activities.'}
                              </CardContent>
                              <CardFooter className="pt-2.5 flex justify-end items-center text-xs border-t border-border">
                                <Button variant="ghost" size="sm" className="h-7 text-xs font-bold text-primary hover:text-primary/80 gap-1" asChild>
                                  <Link href="/whatson">
                                    Explore <ArrowRight className="h-3 w-3" />
                                  </Link>
                                </Button>
                              </CardFooter>
                            </Card>
                          );
                        })}
                      </div>
                    </div>
                  )}

                {/* ─── SECTION 5: NEWS & ANNOUNCEMENTS ─── */}
                {(selectedCategory === 'all' || selectedCategory === 'news') &&
                  matchedNews.length > 0 && (
                    <div className="space-y-4">
                      <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                        <Newspaper className="h-4 w-4 text-purple-500" /> Community News & Bulletins ({matchedNews.length})
                      </h2>

                      <div className="grid grid-cols-1 gap-3">
                        {matchedNews.map((item) => (
                          <Card key={item.id} className="bg-card text-card-foreground hover:border-primary/50 transition-all shadow-sm">
                            <CardHeader className="py-3">
                              <div className="flex items-start justify-between gap-3">
                                <div>
                                  <CardTitle className="text-base font-bold text-foreground">
                                    {item.title}
                                  </CardTitle>
                                  <CardDescription className="text-xs mt-1 text-muted-foreground font-medium">
                                    By {item.author || 'Community Leader'} • {item.category || 'Local Notice'}
                                  </CardDescription>
                                </div>
                                <Button variant="outline" size="sm" className="h-7 text-xs font-bold shrink-0" asChild>
                                  <Link href="/news">Read Story</Link>
                                </Button>
                              </div>
                            </CardHeader>
                          </Card>
                        ))}
                      </div>
                    </div>
                  )}
              </div>
            )}
          </div>
        ) : (
          <div className="max-w-2xl mx-auto pt-8 text-center text-muted-foreground">
            <Compass className="h-10 w-10 mx-auto mb-3 opacity-40" />
            <h3 className="font-bold text-base text-foreground mb-1">Search the Community Ecosystem</h3>
            <p className="text-xs leading-relaxed max-w-md mx-auto">
              Type any town name, local shop, service, event, what&apos;s on guide, or keyword to search across the entire database in real time.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

export default function LiveSearchPage() {
  return (
    <React.Suspense fallback={<div className="min-h-[50vh] flex items-center justify-center text-muted-foreground">Loading search...</div>}>
      <SearchContent />
    </React.Suspense>
  );
}

