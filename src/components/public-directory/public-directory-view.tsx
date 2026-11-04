'use client';

import * as React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import {
  Search,
  Store,
  MapPin,
  Phone,
  Globe,
  Sparkles,
  ArrowRight,
  ExternalLink,
  CheckCircle2,
  Building2,
  Clock,
  Compass,
  ShoppingBag,
  UtensilsCrossed,
  Wrench,
  HeartPulse,
  Bed,
  Layers,
  ChevronRight,
  Megaphone,
  UserCheck,
} from 'lucide-react';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Logo } from '@/components/icons';
import type { PublicBusinessSummary } from '@/lib/actions/publicDirectoryActions';

const CATEGORY_FILTERS = [
  { id: 'all', label: 'All Listings', icon: Layers },
  { id: 'food', label: 'Food & Dining', icon: UtensilsCrossed, match: ['food', 'restaurant', 'cafe', 'bistro', 'baker', 'butcher'] },
  { id: 'retail', label: 'Retail & Shops', icon: ShoppingBag, match: ['retail', 'book', 'clothing', 'jewellery', 'electronics', 'gift', 'toys', 'florist'] },
  { id: 'trades', label: 'Trades & Services', icon: Wrench, match: ['trades', 'repair', 'automotive', 'bike', 'furniture', 'optician', 'stationery'] },
  { id: 'health', label: 'Health & Beauty', icon: HeartPulse, match: ['health', 'beauty', 'fitness', 'salon', 'pet'] },
  { id: 'accommodation', label: 'Stays & Lodging', icon: Bed, match: ['hotel', 'stay', 'accommodation', 'b&b', 'campsite'] },
];

export function PublicDirectoryView({ businesses }: { businesses: PublicBusinessSummary[] }) {
  const [searchTerm, setSearchTerm] = React.useState('');
  const [selectedCategory, setSelectedCategory] = React.useState('all');
  const [selectedCommunity, setSelectedCommunity] = React.useState('all');

  // Extract unique communities without duplicates, regardless of leadership status
  const { communities, communityCounts } = React.useMemo(() => {
    const countsMap = new Map<string, { display: string; count: number }>();

    const normalizeKey = (str: string) =>
      str.trim().toLowerCase().replace(/\./g, '').replace(/,/g, '').replace(/\s+/g, ' ');

    businesses.forEach((b) => {
      // Find all community names associated with this business (primary + additional)
      const directNames: string[] = [];
      if (b.primaryCommunityName) directNames.push(b.primaryCommunityName);
      if (Array.isArray(b.additionalCommunityNames)) {
        b.additionalCommunityNames.forEach((n) => n && directNames.push(n));
      }

      // If no community name is set, fallback to city
      if (directNames.length === 0 && b.city) {
        directNames.push(b.city);
      }

      const matchedKeysForThisBusiness = new Set<string>();

      directNames.forEach((raw) => {
        if (!raw || typeof raw !== 'string') return;
        const trimmed = raw.trim();
        const lower = trimmed.toLowerCase();
        if (
          !trimmed ||
          lower === 'all' ||
          lower === 'other' ||
          lower === 'none' ||
          lower === 'undefined' ||
          lower.includes('id will appear')
        ) {
          return;
        }

        const key = normalizeKey(trimmed);
        if (!matchedKeysForThisBusiness.has(key)) {
          matchedKeysForThisBusiness.add(key);

          const existing = countsMap.get(key);
          if (existing) {
            existing.count += 1;
            // Prefer Title Case or cleaner display name
            if (trimmed[0] === trimmed[0].toUpperCase() && existing.display[0] !== existing.display[0].toUpperCase()) {
              existing.display = trimmed;
            }
          } else {
            countsMap.set(key, { display: trimmed, count: 1 });
          }
        }
      });
    });

    const sorted = Array.from(countsMap.values()).sort((a, b) => a.display.localeCompare(b.display));
    const commList = sorted.map((s) => s.display);
    const counts: Record<string, number> = {};
    sorted.forEach((s) => {
      counts[s.display] = s.count;
    });

    return { communities: commList, communityCounts: counts };
  }, [businesses]);

  // Filter businesses
  const filteredBusinesses = React.useMemo(() => {
    const normalizeKey = (str: string) =>
      str.trim().toLowerCase().replace(/\./g, '').replace(/,/g, '').replace(/\s+/g, ' ');

    return businesses.filter((b) => {
      // Search term
      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase().trim();
        const matchesName = b.businessName?.toLowerCase().includes(term);
        const matchesDesc = b.shortDescription?.toLowerCase().includes(term);
        const matchesCat = b.businessCategory?.toLowerCase().includes(term);
        const matchesPrimaryComm = b.primaryCommunityName?.toLowerCase().includes(term);
        const matchesAdditionalComm = (b.additionalCommunityNames || []).some((c) => c.toLowerCase().includes(term));
        const matchesCity = b.city?.toLowerCase().includes(term);

        if (!matchesName && !matchesDesc && !matchesCat && !matchesPrimaryComm && !matchesAdditionalComm && !matchesCity) {
          return false;
        }
      }

      // Community filter
      if (selectedCommunity !== 'all') {
        const targetKey = normalizeKey(selectedCommunity);

        const bCommKey = b.primaryCommunityName ? normalizeKey(b.primaryCommunityName) : '';
        const bAdditionalKeys = (b.additionalCommunityNames || []).map((n) => normalizeKey(n));
        const bCityKey = b.city ? normalizeKey(b.city) : '';

        const matchesCommunity =
          bCommKey === targetKey ||
          bAdditionalKeys.includes(targetKey) ||
          (!bCommKey && bCityKey === targetKey);

        if (!matchesCommunity) return false;
      }

      // Category filter
      if (selectedCategory !== 'all') {
        const filterDef = CATEGORY_FILTERS.find((c) => c.id === selectedCategory);
        if (filterDef && filterDef.match) {
          const cat = (b.businessCategory || '').toLowerCase();
          const matchesCategoryKeyword = filterDef.match.some((m) => cat.includes(m));
          const matchesAccommodation = selectedCategory === 'accommodation' && b.isAccommodation;
          if (!matchesCategoryKeyword && !matchesAccommodation) return false;
        }
      }

      return true;
    });
  }, [businesses, searchTerm, selectedCategory, selectedCommunity]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-muted/20 to-background text-foreground flex flex-col">
      {/* Top Navigation Bar */}
      <header className="sticky top-0 z-40 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 group-hover:scale-105 transition-transform">
              <Logo className="h-6 w-6" />
            </div>
            <div>
              <span className="font-bold text-base sm:text-lg tracking-tight block leading-tight">
                Community Hub
              </span>
              <span className="text-[11px] text-muted-foreground font-medium block leading-tight">
                Public Directory
              </span>
            </div>
          </Link>

          {/* Quick Notice Badge */}
          <div className="hidden md:flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-700 dark:text-emerald-400 font-medium">
            <CheckCircle2 className="h-3.5 w-3.5" />
            <span>Looking for local shops & services? <strong>No login required.</strong></span>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" asChild className="text-xs sm:text-sm">
              <Link href="/directory/advertise">Why Advertise?</Link>
            </Button>
            <Button variant="outline" size="sm" asChild className="text-xs sm:text-sm">
              <Link href="/">Sign In</Link>
            </Button>
            <Button size="sm" asChild className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs sm:text-sm">
              <Link href="/signup/account-type">Join Community</Link>
            </Button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative py-12 md:py-16 bg-gradient-to-br from-emerald-500/10 via-teal-500/5 to-transparent border-b">
        <div className="container max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-6">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-800 dark:text-emerald-300 text-xs font-semibold uppercase tracking-wider">
            <Store className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
            <span>Public Local Business Directory &bull; Google Indexed</span>
          </div>

          <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight font-headline">
            Discover Great Local Shops, Services & Stays
          </h1>

          <p className="text-base sm:text-lg text-muted-foreground max-w-2xl mx-auto">
            Browse independently owned local businesses across our regional communities.
            No sign-in or account needed &mdash; view opening hours, contact details, directions, and services.
          </p>

          {/* Search & Location Bar */}
          <div className="max-w-3xl mx-auto pt-2">
            <div className="p-2 sm:p-2.5 rounded-2xl bg-card border shadow-lg flex flex-col sm:flex-row gap-2.5 items-stretch">
              <div className="relative flex-1">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="Search by business name, keyword, service, or town..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 h-11 border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 text-sm"
                />
              </div>

              {communities.length > 0 && (
                <div className="flex items-center border-t sm:border-t-0 sm:border-l sm:pl-2.5">
                  <MapPin className="h-4 w-4 text-emerald-600 dark:text-emerald-400 ml-2 sm:ml-0 mr-1.5 shrink-0" />
                  <select
                    value={selectedCommunity}
                    onChange={(e) => setSelectedCommunity(e.target.value)}
                    className="h-11 bg-transparent border-0 text-sm font-medium focus:outline-none cursor-pointer pr-4 max-w-[200px] truncate"
                    aria-label="Filter by community"
                  >
                    <option value="all">All Communities ({businesses.length})</option>
                    {communities.map((comm) => (
                      <option key={comm} value={comm}>
                        {comm} ({communityCounts[comm] || 0})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {searchTerm && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSearchTerm('')}
                  className="h-11 px-3 text-xs text-muted-foreground"
                >
                  Clear
                </Button>
              )}
            </div>
          </div>

          {/* Category Filter Chips */}
          <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
            {CATEGORY_FILTERS.map((cat) => {
              const Icon = cat.icon;
              const isActive = selectedCategory === cat.id;
              return (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                    isActive
                      ? 'bg-emerald-600 text-white shadow-sm'
                      : 'bg-card border hover:bg-muted text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <Icon className="h-3.5 w-3.5" />
                  <span>{cat.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </section>

      {/* Main Listings Grid */}
      <main className="container max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 flex-1">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h2 className="text-xl font-bold tracking-tight">
              {selectedCategory === 'all'
                ? 'All Local Businesses'
                : CATEGORY_FILTERS.find((c) => c.id === selectedCategory)?.label}
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Showing {filteredBusinesses.length} {filteredBusinesses.length === 1 ? 'business' : 'businesses'}
              {selectedCommunity !== 'all' ? ` in ${selectedCommunity}` : ' across all communities'} &bull; Regardless of leadership status
            </p>
          </div>

          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span className="inline-block h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>Search engines indexed</span>
          </div>
        </div>

        {filteredBusinesses.length === 0 ? (
          <div className="p-12 text-center rounded-2xl border border-dashed bg-card/50 max-w-xl mx-auto space-y-4 my-8">
            <div className="p-3 bg-muted rounded-full inline-block">
              <Store className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="font-semibold text-lg">No matching businesses found</h3>
            <p className="text-sm text-muted-foreground">
              Try adjusting your search terms, selecting "All Communities", or choosing another category.
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setSearchTerm('');
                setSelectedCategory('all');
                setSelectedCommunity('all');
              }}
            >
              Reset Filters
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredBusinesses.map((b) => (
              <Card
                key={b.id}
                className="group flex flex-col overflow-hidden hover:border-emerald-500/40 hover:shadow-lg transition-all duration-200 bg-card"
              >
                {/* Banner or Header Accent */}
                <div className="relative h-32 w-full bg-gradient-to-r from-emerald-600/20 via-teal-600/20 to-sky-600/20 flex items-center justify-center p-4">
                  {b.bannerImage ? (
                    <Image
                      src={b.bannerImage}
                      alt={b.businessName}
                      fill
                      className="object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-muted-foreground/40">
                      <Store className="h-10 w-10" />
                    </div>
                  )}

                  {/* Badges on top of card */}
                  <div className="absolute top-2.5 left-2.5 right-2.5 flex items-center justify-between pointer-events-none">
                    <Badge variant="secondary" className="text-[10px] bg-background/90 backdrop-blur font-semibold capitalize">
                      {b.businessCategory?.replace(/-/g, ' ')}
                    </Badge>

                    {b.isAccommodation && (
                      <Badge className="text-[10px] bg-amber-500 text-white font-semibold">
                        Accommodation
                      </Badge>
                    )}
                  </div>

                  {/* Logo Avatar Overlay */}
                  <div className="absolute -bottom-5 left-4 h-12 w-12 rounded-lg bg-card border-2 border-background shadow-md overflow-hidden flex items-center justify-center">
                    {b.logoImage ? (
                      <Image
                        src={b.logoImage}
                        alt={b.businessName}
                        width={48}
                        height={48}
                        className="object-cover w-full h-full"
                      />
                    ) : (
                      <Building2 className="h-6 w-6 text-muted-foreground" />
                    )}
                  </div>
                </div>

                <CardContent className="pt-8 px-4 pb-4 flex-1 flex flex-col justify-between space-y-3">
                  <div>
                    <h3 className="font-bold text-base text-foreground group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors line-clamp-1">
                      {b.businessName}
                    </h3>

                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-1">
                      <MapPin className="h-3 w-3 text-emerald-600 dark:text-emerald-400 shrink-0" />
                      <span className="truncate">
                        {b.primaryCommunityName || b.city || 'Local Community'}
                        {b.country ? ` &bull; ${b.country}` : ''}
                      </span>
                    </div>

                    <p className="text-xs text-muted-foreground mt-2 line-clamp-2 leading-relaxed">
                      {b.shortDescription || 'Local community business offering quality services and goods.'}
                    </p>
                  </div>

                  {/* Quick Contacts */}
                  <div className="pt-2 border-t text-[11px] text-muted-foreground space-y-1">
                    {b.phone && (
                      <div className="flex items-center gap-1.5 truncate">
                        <Phone className="h-3 w-3 shrink-0 text-muted-foreground/70" />
                        <span>{b.phone}</span>
                      </div>
                    )}
                    {b.website && (
                      <div className="flex items-center gap-1.5 truncate text-emerald-600 dark:text-emerald-400">
                        <Globe className="h-3 w-3 shrink-0" />
                        <span className="truncate">{b.website.replace(/^https?:\/\//, '')}</span>
                      </div>
                    )}
                  </div>
                </CardContent>

                <CardFooter className="px-4 py-3 bg-muted/30 border-t flex items-center justify-between gap-2">
                  <span className="text-[11px] text-muted-foreground font-medium flex items-center gap-1">
                    <CheckCircle2 className="h-3 w-3 text-emerald-500" />
                    No Login Needed
                  </span>

                  <Button
                    size="sm"
                    variant="default"
                    asChild
                    className="h-8 text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-medium"
                  >
                    <Link href={`/public-directory/${b.id}`}>
                      <span>View Profile</span>
                      <ArrowRight className="h-3.5 w-3.5 ml-1" />
                    </Link>
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        )}

        {/* Resident & Business Conversion Hub Banner */}
        <section className="mt-16 p-6 sm:p-10 rounded-3xl bg-gradient-to-br from-card via-muted/50 to-card border shadow-xl relative overflow-hidden">
          <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
          <div className="max-w-3xl space-y-4">
            <Badge variant="outline" className="border-emerald-500/40 text-emerald-600 dark:text-emerald-400 bg-emerald-500/10">
              Community Hub Network
            </Badge>

            <h3 className="text-2xl sm:text-3xl font-extrabold tracking-tight font-headline">
              Living in or visiting one of our communities?
            </h3>

            <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
              While our public directory is open to anyone on the web without logging in, members of the
              <strong> Community Hub app</strong> unlock resident loyalty discounts, doorstep courier delivery, local event
              calendars, community resilience notices, and direct contact with local leaders.
            </p>

            <div className="pt-2 flex flex-wrap items-center gap-3">
              <Button asChild className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold shadow-md">
                <Link href="/signup/account-type">
                  <UserCheck className="mr-2 h-4 w-4" />
                  Join as Resident (Free)
                </Link>
              </Button>
              <Button variant="outline" asChild>
                <Link href="/directory/advertise">
                  <Megaphone className="mr-2 h-4 w-4 text-emerald-600" />
                  Why Advertise Your Business?
                </Link>
              </Button>
              <Button variant="ghost" asChild>
                <Link href="/">Sign In to App &rarr;</Link>
              </Button>
            </div>
          </div>
        </section>
      </main>

      {/* Public Footer */}
      <footer className="border-t bg-card py-8 mt-12">
        <div className="container max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-muted-foreground">
          <div className="flex items-center gap-2">
            <Logo className="h-5 w-5 text-emerald-600" />
            <span>&copy; {new Date().getFullYear()} Community Hub. All rights reserved.</span>
          </div>

          <div className="flex items-center gap-6">
            <Link href="/" className="hover:text-foreground transition-colors">
              Sign In
            </Link>
            <Link href="/signup/account-type" className="hover:text-foreground transition-colors">
              Create Account
            </Link>
            <Link href="/about" className="hover:text-foreground transition-colors">
              About Us
            </Link>
            <Link href="/directory/advertise" className="hover:text-emerald-600 transition-colors font-medium">
              Advertise With Us
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
