'use client';

import * as React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import {
  Search,
  ArrowUpDown,
  ArrowUpAZ,
  ArrowDownAZ,
  Handshake,
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
  ChevronLeft,
  ChevronsLeft,
  ChevronsRight,
  Megaphone,
  UserCheck,
  Lock,
  LayoutList,
  LayoutGrid,
  Filter,
  ShieldCheck,
  AlertCircle,
  PlusCircle,
  Upload,
  Check,
  ImageIcon,
  HelpCircle,
  Loader2,
  AlertTriangle,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Logo } from '@/components/icons';
import { useUser, useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';
import {
  createPlatformUnclaimedBusinessAction,
  type PublicBusinessSummary,
} from '@/lib/actions/publicDirectoryActions';
import { uploadImageAction } from '@/lib/actions/storageActions';

const CATEGORY_COVER_PRESETS = [
  {
    label: 'Bakery & Deli',
    category: 'Bakery & Deli',
    url: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&w=1200&q=80',
  },
  {
    label: 'Café & Coffee',
    category: 'Café & Coffee Shop',
    url: 'https://images.unsplash.com/photo-1554118811-1e0d58224f24?auto=format&fit=crop&w=1200&q=80',
  },
  {
    label: 'Restaurant & Pub',
    category: 'Restaurant & Bar',
    url: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=1200&q=80',
  },
  {
    label: 'Retail & Boutique',
    category: 'Retail & Boutique',
    url: 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?auto=format&fit=crop&w=1200&q=80',
  },
  {
    label: 'Trades & Workshop',
    category: 'Trades & Services',
    url: 'https://images.unsplash.com/photo-1581578731548-c64695cc6952?auto=format&fit=crop&w=1200&q=80',
  },
  {
    label: 'Stays & Lodging',
    category: 'Stays & Lodging',
    url: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=1200&q=80',
  },
  {
    label: 'Salon & Beauty',
    category: 'Hair & Beauty',
    url: 'https://images.unsplash.com/photo-1560066984-138dadb4c035?auto=format&fit=crop&w=1200&q=80',
  },
  {
    label: 'Auto & Garage',
    category: 'Automotive & Garage',
    url: 'https://images.unsplash.com/photo-1486006920555-c77dce18193b?auto=format&fit=crop&w=1200&q=80',
  },
];

const CATEGORY_FILTERS = [
  { id: 'all', label: 'All Listings', icon: Layers },
  { id: 'food', label: 'Food & Dining', icon: UtensilsCrossed, match: ['food', 'restaurant', 'cafe', 'bistro', 'baker', 'butcher'] },
  { id: 'retail', label: 'Retail & Shops', icon: ShoppingBag, match: ['retail', 'book', 'clothing', 'jewellery', 'electronics', 'gift', 'toys', 'florist'] },
  { id: 'trades', label: 'Trades & Services', icon: Wrench, match: ['trades', 'repair', 'automotive', 'bike', 'furniture', 'optician', 'stationery'] },
  { id: 'health', label: 'Health & Beauty', icon: HeartPulse, match: ['health', 'beauty', 'fitness', 'salon', 'pet'] },
  { id: 'accommodation', label: 'Stays & Lodging', icon: Bed, match: ['hotel', 'stay', 'accommodation', 'b&b', 'campsite'] },
  { id: 'featured_ads', label: 'Featured Ads', icon: Sparkles, match: ['featured ad'] },
  { id: 'valued_partners', label: 'Valued Partners', icon: Handshake, match: ['valued partner'] },
];

export function PublicDirectoryView({
  businesses,
  communitiesList = [],
}: {
  businesses: PublicBusinessSummary[];
  communitiesList?: { id: string; name: string }[];
}) {
  const [searchTerm, setSearchTerm] = React.useState('');
  const [selectedCategory, setSelectedCategory] = React.useState('all');
  const [selectedCommunity, setSelectedCommunity] = React.useState('all');

  // Subscription status filter: 'all' | 'businesses' | 'featured' | 'partner' | 'active' | 'inactive'
  const [statusFilter, setStatusFilter] = React.useState<string>('all');

  // Sort order: active_first, alphabetical_asc, alphabetical_desc, newest, oldest, inactive_first
  type SortOption = 'active_first' | 'alphabetical_asc' | 'alphabetical_desc' | 'newest' | 'oldest' | 'inactive_first';
  const [sortBy, setSortBy] = React.useState<SortOption>('active_first');

  // Pagination state (10-line rule by default)
  const [currentPage, setCurrentPage] = React.useState(1);
  const [pageSize, setPageSize] = React.useState(10);
  const [viewMode, setViewMode] = React.useState<'table' | 'grid'>('table');

  const listingsTopRef = React.useRef<HTMLDivElement>(null);
  const router = useRouter();
  const { toast } = useToast();

  // Check if user is logged in to contextualize "Your Community"
  const { user } = useUser();
  const db = useFirestore();
  const userProfileRef = useMemoFirebase(() => (user && db ? doc(db, 'users', user.uid) : null), [user, db]);
  const { data: userProfile } = useDoc<any>(userProfileRef);

  const loggedInCommunityName = userProfile?.communityName || null;
  const loggedInCommunityId = userProfile?.primaryHomeCommunityId || userProfile?.homeCommunityId || userProfile?.communityId || null;

  // Platform Owner Check (Can seed unclaimed businesses)
  const isPlatformOwner = Boolean(
    userProfile?.accountType === 'owner' ||
    userProfile?.role === 'owner' ||
    user?.email === 'allan_jamieson@outlook.com' ||
    userProfile?.email === 'allan_jamieson@outlook.com'
  );

  // 5-Field Quick-Add Modal State
  const [isQuickAddOpen, setIsQuickAddOpen] = React.useState(false);
  const [newBizName, setNewBizName] = React.useState('');
  const [newBizCategory, setNewBizCategory] = React.useState('Retail & Boutique');
  const [newBizCommunityId, setNewBizCommunityId] = React.useState('');
  const [newBizCommunityName, setNewBizCommunityName] = React.useState('');
  const [newBizPostcode, setNewBizPostcode] = React.useState('');
  const [newBizCoverImage, setNewBizCoverImage] = React.useState('');
  const [isUploadingCover, setIsUploadingCover] = React.useState(false);
  const [isSubmittingQuickAdd, setIsSubmittingQuickAdd] = React.useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  // Courier Visibility Rule:
  // Couriers are strictly localized to their community and ONLY visible to logged-in residents of that community.
  const isBusinessAllowedForViewer = React.useCallback(
    (b: PublicBusinessSummary) => {
      const isCourier =
        b.accountType === 'courier' ||
        b.businessCategory?.toLowerCase() === 'courier' ||
        (typeof b.businessCategory === 'string' && b.businessCategory.toLowerCase().includes('courier'));

      if (isCourier) {
        // Hidden for unauthenticated visitors
        if (!user) return false;

        // If logged in, only visible if matching the user's registered community
        const userCommName = (loggedInCommunityName || '').trim().toLowerCase();
        const bCommName = (b.primaryCommunityName || b.city || '').trim().toLowerCase();
        const matchesCommunityName = Boolean(userCommName && bCommName && userCommName === bCommName);
        const matchesCommunityId = Boolean(loggedInCommunityId && b.primaryCommunityId && loggedInCommunityId === b.primaryCommunityId);

        return matchesCommunityName || matchesCommunityId;
      }

      return true;
    },
    [user, loggedInCommunityName, loggedInCommunityId]
  );

  // Filter businesses by courier visibility
  const visibleBusinesses = React.useMemo(() => {
    return businesses.filter(isBusinessAllowedForViewer);
  }, [businesses, isBusinessAllowedForViewer]);

  // Extract unique registered communities strictly from each business's MAIN registered community
  const { communities, communityCounts } = React.useMemo(() => {
    const countsMap = new Map<string, { display: string; count: number }>();

    const normalizeKey = (str: string) =>
      str.trim().toLowerCase().replace(/\./g, '').replace(/,/g, '').replace(/\s+/g, ' ');

    visibleBusinesses.forEach((b) => {
      // Strictly use ONLY the primary registered community
      const rawComm = b.primaryCommunityName || b.city;
      if (!rawComm || typeof rawComm !== 'string') return;

      const trimmed = rawComm.trim();
      const lower = trimmed.toLowerCase();

      // Filter out generic placeholders and invalid entries
      if (
        !trimmed ||
        lower === 'all' ||
        lower === 'other' ||
        lower === 'none' ||
        lower === 'undefined' ||
        lower === 'your community' ||
        lower === 'local community' ||
        lower === 'our community' ||
        lower.includes('id will appear')
      ) {
        return;
      }

      const key = normalizeKey(trimmed);
      const existing = countsMap.get(key);
      if (existing) {
        existing.count += 1;
        if (trimmed[0] === trimmed[0].toUpperCase() && existing.display[0] !== existing.display[0].toUpperCase()) {
          existing.display = trimmed;
        }
      } else {
        countsMap.set(key, { display: trimmed, count: 1 });
      }
    });

    const sorted = Array.from(countsMap.values()).sort((a, b) => a.display.localeCompare(b.display));
    const commList = sorted.map((s) => s.display);
    const counts: Record<string, number> = {};
    sorted.forEach((s) => {
      counts[s.display] = s.count;
    });

    return { communities: commList, communityCounts: counts };
  }, [visibleBusinesses]);

  // Combined available communities for dropdown selection
  const allAvailableCommunities = React.useMemo(() => {
    const map = new Map<string, { id?: string; name: string }>();
    communitiesList.forEach((c) => {
      if (c.name) map.set(c.name.toLowerCase().trim(), { id: c.id, name: c.name.trim() });
    });
    communities.forEach((commName) => {
      const key = commName.toLowerCase().trim();
      if (!map.has(key)) {
        map.set(key, { name: commName });
      }
    });
    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [communitiesList, communities]);

  // File upload handler for Quick-Add Cover Image
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast({
        title: 'Invalid file type',
        description: 'Please upload an image file (PNG, JPG, WebP).',
        variant: 'destructive',
      });
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: 'File too large',
        description: 'Maximum image size is 5MB.',
        variant: 'destructive',
      });
      return;
    }

    setIsUploadingCover(true);
    try {
      const reader = new FileReader();
      reader.onload = async () => {
        const base64Data = reader.result as string;
        const filename = `${Date.now()}_${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
        const path = `business-covers/platform-seed/${filename}`;

        const res = await uploadImageAction({ base64Data, path });
        if (res.success && res.url) {
          setNewBizCoverImage(res.url);
          toast({
            title: 'Image uploaded!',
            description: 'Cover photo successfully uploaded and linked.',
          });
        } else {
          setNewBizCoverImage(base64Data);
          toast({
            title: 'Image ready',
            description: 'Using uploaded preview.',
          });
        }
        setIsUploadingCover(false);
      };
      reader.readAsDataURL(file);
    } catch (err: any) {
      setIsUploadingCover(false);
      toast({
        title: 'Upload failed',
        description: err.message || 'Could not upload cover image.',
        variant: 'destructive',
      });
    }
  };

  // Submit Quick-Add Unclaimed Business
  const handleQuickAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!newBizName.trim()) {
      toast({ title: 'Business Name Required', description: 'Please enter the name of the business.', variant: 'destructive' });
      return;
    }
    if (!newBizCategory.trim()) {
      toast({ title: 'Category Required', description: 'Please select or enter a category.', variant: 'destructive' });
      return;
    }
    if (!newBizCommunityName.trim()) {
      toast({ title: 'Community Required', description: 'Please choose which community this business belongs to.', variant: 'destructive' });
      return;
    }
    if (!newBizPostcode.trim()) {
      toast({ title: 'Postcode Required', description: 'Please enter a valid UK postcode (e.g. PH22 1RH).', variant: 'destructive' });
      return;
    }

    const coverToUse =
      newBizCoverImage.trim() ||
      CATEGORY_COVER_PRESETS.find((p) => p.category === newBizCategory)?.url ||
      CATEGORY_COVER_PRESETS[0].url;

    setIsSubmittingQuickAdd(true);
    try {
      const resolvedCommId =
        newBizCommunityId ||
        allAvailableCommunities.find((c) => c.name.toLowerCase() === newBizCommunityName.toLowerCase().trim())?.id ||
        newBizCommunityName.toLowerCase().replace(/[^a-z0-9]/g, '-');

      const res = await createPlatformUnclaimedBusinessAction({
        businessName: newBizName.trim(),
        businessCategory: newBizCategory.trim(),
        communityId: resolvedCommId,
        communityName: newBizCommunityName.trim(),
        postcode: newBizPostcode.trim().toUpperCase(),
        coverImage: coverToUse,
      });

      if (res.success && res.businessId) {
        toast({
          title: 'Unclaimed Listing Created!',
          description: `${newBizName} has been seeded into ${newBizCommunityName} with 14-day claim capability.`,
        });
        setIsQuickAddOpen(false);
        setNewBizName('');
        setNewBizPostcode('');
        setNewBizCoverImage('');
        router.refresh();
      } else {
        toast({
          title: 'Error Creating Listing',
          description: res.error || 'Failed to create business listing.',
          variant: 'destructive',
        });
      }
    } catch (err: any) {
      toast({
        title: 'Error Creating Listing',
        description: err.message || 'Something went wrong.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmittingQuickAdd(false);
    }
  };

  // Overall count totals
  const totalActiveCount = React.useMemo(() => visibleBusinesses.filter((b) => b.isLive).length, [visibleBusinesses]);
  const totalInactiveCount = React.useMemo(() => visibleBusinesses.filter((b) => !b.isLive).length, [visibleBusinesses]);
  const unclaimedCount = React.useMemo(() => visibleBusinesses.filter((b) => b.isUnclaimed).length, [visibleBusinesses]);
  const localBusinessesCount = React.useMemo(() => visibleBusinesses.filter((b) => !b.listingType || b.listingType === 'business').length, [visibleBusinesses]);
  const featuredAdsCount = React.useMemo(() => visibleBusinesses.filter((b) => b.listingType === 'featured_ad' || b.accountType === 'featured_ad' || b.businessCategory === 'Featured Ad').length, [visibleBusinesses]);
  const valuedPartnersCount = React.useMemo(() => visibleBusinesses.filter((b) => b.listingType === 'valued_partner' || b.accountType === 'valued_partner' || b.businessCategory === 'Valued Partner').length, [visibleBusinesses]);

  // Filter businesses: each business ONLY appears in its main registered community
  const filteredBusinesses = React.useMemo(() => {
    const normalizeKey = (str: string) =>
      str.trim().toLowerCase().replace(/\./g, '').replace(/,/g, '').replace(/\s+/g, ' ');

    return visibleBusinesses.filter((b) => {
      // 1. Text search term (matches Name, Category, Description, Town, and Postcode)
      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase().trim();
        const matchesName = b.businessName?.toLowerCase().includes(term);
        const matchesDesc = b.shortDescription?.toLowerCase().includes(term);
        const matchesCat = b.businessCategory?.toLowerCase().includes(term);
        const matchesPrimaryComm = b.primaryCommunityName?.toLowerCase().includes(term);
        const matchesCity = b.city?.toLowerCase().includes(term);
        const matchesPostcode = b.postcode?.toLowerCase().includes(term);

        if (!matchesName && !matchesDesc && !matchesCat && !matchesPrimaryComm && !matchesCity && !matchesPostcode) {
          return false;
        }
      }

      // 2. Community filter: strictly matches the main registered community ONLY
      if (selectedCommunity !== 'all') {
        const targetKey = normalizeKey(selectedCommunity);
        const bCommKey = b.primaryCommunityName
          ? normalizeKey(b.primaryCommunityName)
          : (b.city ? normalizeKey(b.city) : '');

        if (bCommKey !== targetKey) {
          return false;
        }
      }

      // 3. Category filter
      if (selectedCategory !== 'all') {
        if (selectedCategory === 'featured_ads') {
          const isFeatured = b.listingType === 'featured_ad' || b.accountType === 'featured_ad' || b.businessCategory === 'Featured Ad';
          if (!isFeatured) return false;
        } else if (selectedCategory === 'valued_partners') {
          const isPartner = b.listingType === 'valued_partner' || b.accountType === 'valued_partner' || b.businessCategory === 'Valued Partner';
          if (!isPartner) return false;
        } else {
          // If searching for normal categories, exclude national adverts
          if (b.listingType === 'featured_ad' || b.listingType === 'valued_partner') return false;
          const filterDef = CATEGORY_FILTERS.find((c) => c.id === selectedCategory);
          if (filterDef && filterDef.match) {
            const cat = (b.businessCategory || '').toLowerCase();
            const matchesCategoryKeyword = filterDef.match.some((m) => cat.includes(m));
            const matchesAccommodation = selectedCategory === 'accommodation' && b.isAccommodation;
            if (!matchesCategoryKeyword && !matchesAccommodation) return false;
          }
        }
      }

      // 4. Listing type and subscription status filter
      if (statusFilter === 'businesses') {
        const isAd = b.listingType === 'featured_ad' || b.listingType === 'valued_partner' || b.businessCategory === 'Featured Ad' || b.businessCategory === 'Valued Partner';
        if (isAd) return false;
      } else if (statusFilter === 'featured') {
        const isFeatured = b.listingType === 'featured_ad' || b.accountType === 'featured_ad' || b.businessCategory === 'Featured Ad';
        if (!isFeatured) return false;
      } else if (statusFilter === 'partner') {
        const isPartner = b.listingType === 'valued_partner' || b.accountType === 'valued_partner' || b.businessCategory === 'Valued Partner';
        if (!isPartner) return false;
      } else if (statusFilter === 'active' && !b.isLive) {
        return false;
      } else if (statusFilter === 'inactive' && b.isLive) {
        return false;
      } else if (statusFilter === 'unclaimed' && !b.isUnclaimed) {
        return false;
      }

      return true;
    });
  }, [visibleBusinesses, searchTerm, selectedCategory, selectedCommunity, statusFilter]);

  // Sort filtered listings according to the active sort order
  const sortedBusinesses = React.useMemo(() => {
    return [...filteredBusinesses].sort((a, b) => {
      if (sortBy === 'alphabetical_asc') {
        return (a.businessName || '').localeCompare(b.businessName || '');
      }
      if (sortBy === 'alphabetical_desc') {
        return (b.businessName || '').localeCompare(a.businessName || '');
      }
      if (sortBy === 'newest') {
        const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return timeB - timeA;
      }
      if (sortBy === 'oldest') {
        const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return timeA - timeB;
      }
      if (sortBy === 'active_first') {
        if (a.isLive && !b.isLive) return -1;
        if (!a.isLive && b.isLive) return 1;
        return (a.businessName || '').localeCompare(b.businessName || '');
      }
      if (sortBy === 'inactive_first') {
        if (!a.isLive && b.isLive) return -1;
        if (a.isLive && !b.isLive) return 1;
        return (a.businessName || '').localeCompare(b.businessName || '');
      }
      return 0;
    });
  }, [filteredBusinesses, sortBy]);

  // Reset to page 1 whenever any filter, search, or sort changes
  React.useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, selectedCategory, selectedCommunity, statusFilter, sortBy, pageSize]);

  // Pagination metrics
  const totalItems = sortedBusinesses.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const validCurrentPage = Math.min(currentPage, totalPages);

  const startIndex = (validCurrentPage - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, totalItems);
  const paginatedBusinesses = React.useMemo(() => {
    return sortedBusinesses.slice(startIndex, endIndex);
  }, [sortedBusinesses, startIndex, endIndex]);

  const handlePageChange = (newPage: number) => {
    const target = Math.max(1, Math.min(newPage, totalPages));
    setCurrentPage(target);
    if (listingsTopRef.current) {
      listingsTopRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  // Generate pagination page numbers
  const pageNumbers = React.useMemo(() => {
    const pages: (number | 'ellipsis')[] = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      if (validCurrentPage > 3) pages.push('ellipsis');
      const start = Math.max(2, validCurrentPage - 1);
      const end = Math.min(totalPages - 1, validCurrentPage + 1);
      for (let i = start; i <= end; i++) {
        pages.push(i);
      }
      if (validCurrentPage < totalPages - 2) pages.push('ellipsis');
      pages.push(totalPages);
    }
    return pages;
  }, [totalPages, validCurrentPage]);

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
            {isPlatformOwner && (
              <Button
                size="sm"
                onClick={() => setIsQuickAddOpen(true)}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs sm:text-sm flex items-center gap-1.5 shadow-sm"
              >
                <PlusCircle className="h-4 w-4" />
                <span className="hidden sm:inline">+ Quick-Add Business</span>
                <span className="sm:hidden">+ Seed</span>
              </Button>
            )}
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
                  placeholder="Search by business name, keyword, service, town, or postcode (e.g. PH22)..."
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
                    className="h-11 bg-transparent border-0 text-sm font-medium focus:outline-none cursor-pointer pr-4 max-w-[220px] truncate"
                    aria-label="Filter by community"
                  >
                    <option value="all">All Communities ({visibleBusinesses.length})</option>
                    {user && loggedInCommunityName && communities.includes(loggedInCommunityName) && (
                      <option value={loggedInCommunityName}>
                        📍 Your Community ({loggedInCommunityName})
                      </option>
                    )}
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

      {/* Main Listings Section */}
      <main className="container max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 flex-1">
        {/* Anchor for smooth page change scrolling */}
        <div ref={listingsTopRef} className="-mt-6 pt-6" />

        {/* Listings Header & Filter Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h2 className="text-xl font-bold tracking-tight">
              {statusFilter === 'unclaimed'
                ? '🔍 Unclaimed Community Listings'
                : statusFilter === 'inactive'
                ? 'Inactive / Unpaid Subscriptions'
                : statusFilter === 'featured' || selectedCategory === 'featured_ads'
                ? '⭐ Featured National Ads'
                : statusFilter === 'partner' || selectedCategory === 'valued_partners'
                ? '🤝 Our Valued Partners'
                : selectedCategory === 'all'
                ? 'All Local Businesses & Partners'
                : CATEGORY_FILTERS.find((c) => c.id === selectedCategory)?.label}
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              {totalItems > 0 ? (
                <>
                  Showing <strong>{startIndex + 1}</strong> to <strong>{endIndex}</strong> of{' '}
                  <strong>{totalItems}</strong> {totalItems === 1 ? 'business' : 'businesses'}
                  {selectedCommunity !== 'all' ? ` in ${selectedCommunity}` : ' across all communities'}
                  {' '}&bull; {pageSize} per page
                  {statusFilter === 'active' && ' (Active only)'}
                  {statusFilter === 'inactive' && ' (Inactive / Locked only)'}
                  {statusFilter === 'unclaimed' && ' (Unclaimed teaser listings only)'}
                </>
              ) : (
                <>No businesses found for selected filters</>
              )}
            </p>
          </div>

          {/* Controls: Subscription Status Filter, Table/Grid Toggle & Page Size */}
          <div className="flex items-center flex-wrap gap-2.5">
            {isPlatformOwner && (
              <Button
                size="sm"
                onClick={() => setIsQuickAddOpen(true)}
                className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold flex items-center gap-1.5 shadow-xs"
              >
                <PlusCircle className="h-3.5 w-3.5" />
                <span>+ Seed Business</span>
              </Button>
            )}

            {/* Subscription Status Filter Dropdown */}
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground bg-card border rounded-lg px-2.5 py-1 shadow-xs">
              <Filter className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
              <span className="font-medium">Filter:</span>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="bg-transparent text-xs font-semibold focus:outline-none cursor-pointer pr-1"
                aria-label="Filter listings by type and status"
              >
                <option value="all">All Listings ({visibleBusinesses.length})</option>
                <option value="businesses">Local Businesses ({localBusinessesCount})</option>
                {unclaimedCount > 0 && <option value="unclaimed">Unclaimed ({unclaimedCount})</option>}
                {featuredAdsCount > 0 && <option value="featured">Featured Ads ({featuredAdsCount})</option>}
                {valuedPartnersCount > 0 && <option value="partner">Valued Partners ({valuedPartnersCount})</option>}
                <option value="active">Active Partners Only ({totalActiveCount})</option>
                <option value="inactive">Inactive Subscriptions Only ({totalInactiveCount})</option>
              </select>
            </div>

            {/* Sort Order Selector */}
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground bg-card border rounded-lg px-2.5 py-1 shadow-xs">
              <ArrowUpDown className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
              <span className="font-medium">Sort:</span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as SortOption)}
                className="bg-transparent text-xs font-semibold focus:outline-none cursor-pointer pr-1"
                aria-label="Sort listings"
              >
                <option value="active_first">Active Partners First</option>
                <option value="alphabetical_asc">Alphabetical (A &rarr; Z)</option>
                <option value="alphabetical_desc">Alphabetical (Z &rarr; A)</option>
                <option value="newest">Newest Listed First</option>
                <option value="oldest">Oldest Listed First</option>
                <option value="inactive_first">Inactive / Unpaid First</option>
              </select>
            </div>

            {/* View Mode Toggle: Table (10-line view) vs Grid Cards */}
            <div className="inline-flex rounded-lg border bg-card p-0.5 shadow-xs text-xs">
              <button
                type="button"
                onClick={() => setViewMode('table')}
                className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md font-medium transition-colors ${
                  viewMode === 'table'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
                title="Table view (10 lines per page)"
              >
                <LayoutList className="h-3.5 w-3.5" />
                <span>Table</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode('grid')}
                className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md font-medium transition-colors ${
                  viewMode === 'grid'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
                title="Grid cards view"
              >
                <LayoutGrid className="h-3.5 w-3.5" />
                <span>Cards</span>
              </button>
            </div>

            {/* Page Size Selector */}
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground bg-card border rounded-lg px-2.5 py-1 shadow-xs">
              <span>Lines:</span>
              <select
                value={pageSize}
                onChange={(e) => setPageSize(Number(e.target.value))}
                className="bg-transparent text-xs font-semibold focus:outline-none cursor-pointer"
                aria-label="Lines per page"
              >
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={30}>30</option>
                <option value={50}>50</option>
              </select>
            </div>
          </div>
        </div>

        {/* Helpful Banner when filtering by Inactive Subscriptions */}
        {statusFilter === 'inactive' && (
          <div className="mb-6 p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-start gap-3 text-xs text-amber-900 dark:text-amber-300">
            <AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="font-semibold">
                Viewing Inactive / Unpaid Listings ({totalItems} found)
              </p>
              <p className="text-muted-foreground leading-relaxed">
                These listings are visible with contact actions locked until renewed. Business owners can click their profile
                to view details or renew their £20/mo subscription.
              </p>
            </div>
          </div>
        )}

        {totalItems === 0 ? (
          <div className="p-12 text-center rounded-2xl border border-dashed bg-card/50 max-w-xl mx-auto space-y-4 my-8">
            <div className="p-3 bg-muted rounded-full inline-block">
              <Store className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="font-semibold text-lg">No matching businesses found</h3>
            <p className="text-sm text-muted-foreground">
              {statusFilter === 'inactive'
                ? 'No inactive subscriptions matched your search criteria.'
                : 'Try adjusting your search terms, selecting "All Communities", or changing the filter.'}
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setSearchTerm('');
                setSelectedCategory('all');
                setSelectedCommunity('all');
                setStatusFilter('all');
              }}
            >
              Reset All Filters
            </Button>
          </div>
        ) : viewMode === 'table' ? (
          /* Table View: 10 lines per page */
          <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
            <Table>
              <TableHeader className="bg-muted/40">
                <TableRow>
                  <TableHead
                    onClick={() => {
                      setSortBy((prev) => (prev === 'alphabetical_asc' ? 'alphabetical_desc' : 'alphabetical_asc'));
                    }}
                    className="w-[300px] font-semibold text-xs text-foreground cursor-pointer select-none hover:text-emerald-600 transition-colors"
                    title="Click to sort by Business Name"
                  >
                    <div className="flex items-center gap-1.5">
                      <span>Business</span>
                      {sortBy === 'alphabetical_asc' ? (
                        <ArrowUpAZ className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                      ) : sortBy === 'alphabetical_desc' ? (
                        <ArrowDownAZ className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                      ) : (
                        <ArrowUpDown className="h-3 w-3 text-muted-foreground/50" />
                      )}
                    </div>
                  </TableHead>
                  <TableHead className="w-[180px] font-semibold text-xs text-foreground">Community & Location</TableHead>
                  <TableHead
                    onClick={() => {
                      setSortBy((prev) => (prev === 'active_first' ? 'inactive_first' : 'active_first'));
                    }}
                    className="w-[160px] font-semibold text-xs text-foreground cursor-pointer select-none hover:text-emerald-600 transition-colors"
                    title="Click to toggle Active vs Inactive first"
                  >
                    <div className="flex items-center gap-1.5">
                      <span>Partner Status</span>
                      <ArrowUpDown className="h-3 w-3 text-muted-foreground/50" />
                    </div>
                  </TableHead>
                  <TableHead className="hidden md:table-cell font-semibold text-xs text-foreground">Direct Contact</TableHead>
                  <TableHead className="text-right font-semibold text-xs text-foreground w-[130px]">Profile</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedBusinesses.map((b) => (
                  <TableRow
                    key={b.id}
                    className={`hover:bg-muted/50 transition-colors group ${
                      !b.isLive ? 'opacity-85 bg-muted/10' : ''
                    }`}
                  >
                    {/* Business Column (Logo + Name + Category) */}
                    <TableCell className="py-3.5">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 shrink-0 rounded-lg bg-muted border overflow-hidden flex items-center justify-center relative">
                          {b.logoImage ? (
                            <Image
                              src={b.logoImage}
                              alt={`${b.businessName} - ${b.businessCategory || 'Local Business'} in ${b.primaryCommunityName || b.city || 'Local Community'}, UK`}
                              width={40}
                              height={40}
                              className={`object-cover w-full h-full ${!b.isLive ? 'grayscale-[30%]' : ''}`}
                            />
                          ) : (
                            <Building2 className="h-5 w-5 text-muted-foreground" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <Link
                            href={`/public-directory/${b.id}`}
                            className="font-semibold text-sm text-foreground group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors truncate block"
                          >
                            {b.businessName}
                          </Link>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <Badge
                              variant="secondary"
                              className="text-[10px] py-0 px-1.5 font-medium capitalize truncate max-w-[150px]"
                            >
                              {b.businessCategory?.replace(/-/g, ' ') || 'General'}
                            </Badge>
                          </div>
                        </div>
                      </div>
                    </TableCell>

                    {/* Community & Location Column */}
                    <TableCell className="py-3.5">
                      <div className="flex items-center gap-1.5 text-xs text-foreground font-medium">
                        <MapPin className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                        <span className="truncate">
                          {b.primaryCommunityName || b.city || 'Local Area'}
                        </span>
                      </div>
                      {(b.postcode || b.country) && (
                        <div className="text-[11px] text-muted-foreground pl-5 truncate">
                          {[b.postcode, b.country].filter(Boolean).join(' • ')}
                        </div>
                      )}
                    </TableCell>

                    {/* Partner Status Column */}
                    <TableCell className="py-3.5">
                      {b.isUnclaimed ? (
                        <Badge
                          variant="outline"
                          className="text-[10px] bg-amber-500/15 text-amber-800 dark:text-amber-300 border-amber-500/40 flex items-center gap-1 font-semibold w-fit"
                        >
                          <HelpCircle className="h-2.5 w-2.5 text-amber-600" />
                          Unclaimed Listing
                        </Badge>
                      ) : b.listingType === 'featured_ad' ? (
                        <Badge className="text-[10px] bg-gradient-to-r from-amber-500 to-purple-600 text-white font-semibold flex items-center gap-1 w-fit shadow-xs">
                          <Sparkles className="h-2.5 w-2.5" />
                          <span>Featured Partner</span>
                        </Badge>
                      ) : b.listingType === 'valued_partner' ? (
                        <Badge className="text-[10px] bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold flex items-center gap-1 w-fit shadow-xs">
                          <Handshake className="h-2.5 w-2.5" />
                          <span>Valued Partner</span>
                        </Badge>
                      ) : b.isLive ? (
                        b.isAccommodation ? (
                          <Badge className="text-[10px] bg-amber-500 text-white font-semibold">
                            Accommodation
                          </Badge>
                        ) : (
                          <Badge
                            variant="outline"
                            className="text-[10px] bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30 font-medium"
                          >
                            Active Partner
                          </Badge>
                        )
                      ) : (
                        <Badge
                          variant="outline"
                          className="text-[10px] bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/40 flex items-center gap-1 font-semibold w-fit"
                        >
                          <Lock className="h-2.5 w-2.5" />
                          Subscription Inactive
                        </Badge>
                      )}
                    </TableCell>

                    {/* Direct Contact Column */}
                    <TableCell className="py-3.5 hidden md:table-cell">
                      {b.isUnclaimed ? (
                        <div className="flex items-center gap-1 text-[11px] text-amber-700/90 dark:text-amber-400/90 italic font-medium">
                          <HelpCircle className="h-3 w-3 text-amber-500 shrink-0" />
                          <span>Unclaimed &bull; Claim Available</span>
                        </div>
                      ) : b.isLive ? (
                        <div className="space-y-0.5 text-xs">
                          {b.phone && (
                            <div className="flex items-center gap-1.5 text-muted-foreground truncate">
                              <Phone className="h-3 w-3 shrink-0" />
                              <span>{b.phone}</span>
                            </div>
                          )}
                          {b.website && (
                            <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 truncate">
                              <Globe className="h-3 w-3 shrink-0" />
                              <span className="truncate">{b.website.replace(/^https?:\/\//, '')}</span>
                            </div>
                          )}
                          {!b.phone && !b.website && (
                            <span className="text-[11px] text-muted-foreground/70 italic">Verified Local</span>
                          )}
                        </div>
                      ) : (
                        <div className="flex items-center gap-1 text-[11px] text-amber-700/80 dark:text-amber-400/80 italic font-medium">
                          <Lock className="h-3 w-3 text-amber-500 shrink-0" />
                          <span>Locked</span>
                        </div>
                      )}
                    </TableCell>

                    {/* Action Column */}
                    <TableCell className="py-3.5 text-right">
                      {b.isUnclaimed ? (
                        <Button
                          size="sm"
                          variant="outline"
                          asChild
                          className="h-8 text-xs border-amber-500/50 text-amber-800 dark:text-amber-300 hover:bg-amber-500/15 font-semibold"
                        >
                          <Link href={`/public-directory/${b.id}`}>
                            <HelpCircle className="h-3 w-3 mr-1 text-amber-600" />
                            <span>Claim / View</span>
                          </Link>
                        </Button>
                      ) : b.isLive ? (
                        <Button
                          size="sm"
                          asChild
                          className="h-8 text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-medium"
                        >
                          <Link href={`/public-directory/${b.id}`}>
                            <span>View</span>
                            <ArrowRight className="h-3 w-3 ml-1" />
                          </Link>
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          variant="outline"
                          asChild
                          className="h-8 text-xs border-amber-500/40 text-amber-700 dark:text-amber-400 hover:bg-amber-500/10 font-medium"
                        >
                          <Link href={`/public-directory/${b.id}`}>
                            <Lock className="h-3 w-3 mr-1" />
                            <span>Locked</span>
                          </Link>
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ) : (
          /* Grid View: 10 cards per page */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {paginatedBusinesses.map((b) => (
              <Card
                key={b.id}
                className={`group flex flex-col overflow-hidden transition-all duration-200 bg-card ${
                  b.isUnclaimed
                    ? 'border-amber-500/40 hover:border-amber-500/70 shadow-xs hover:shadow-md'
                    : b.isLive
                    ? 'hover:border-emerald-500/40 hover:shadow-lg'
                    : 'border-border/60 opacity-90 hover:border-amber-500/40'
                }`}
              >
                {/* Banner or Header Accent */}
                <div className="relative h-32 w-full bg-gradient-to-r from-emerald-600/20 via-teal-600/20 to-sky-600/20 flex items-center justify-center p-4">
                  {b.bannerImage ? (
                    <Image
                      src={b.bannerImage}
                      alt={`${b.businessName} - ${b.businessCategory || 'Local Business'} in ${b.primaryCommunityName || b.city || 'Local Area'}, ${b.postcode ? b.postcode + ', ' : ''}UK`}
                      fill
                      className={`object-cover ${b.isLive ? 'group-hover:scale-105' : 'grayscale-[40%]'} transition-transform duration-300`}
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-muted-foreground/40">
                      <Store className="h-10 w-10" />
                    </div>
                  )}

                  {/* Badges on top of card */}
                  <div className="absolute top-2.5 left-2.5 right-2.5 flex items-center justify-between gap-1 pointer-events-none">
                    <Badge variant="secondary" className="text-[10px] bg-background/90 backdrop-blur font-semibold capitalize truncate max-w-[140px]">
                      {b.businessCategory?.replace(/-/g, ' ')}
                    </Badge>

                    {b.isUnclaimed ? (
                      <Badge
                        variant="outline"
                        className="text-[10px] bg-amber-500/20 text-amber-800 dark:text-amber-300 border-amber-500/40 flex items-center gap-1 font-semibold shadow-xs"
                      >
                        <HelpCircle className="h-2.5 w-2.5 text-amber-600" />
                        <span>Unclaimed</span>
                      </Badge>
                    ) : b.listingType === 'featured_ad' ? (
                      <Badge className="text-[10px] bg-gradient-to-r from-amber-500 to-purple-600 text-white font-semibold flex items-center gap-1 shadow-xs">
                        <Sparkles className="h-2.5 w-2.5" />
                        <span>Featured Ad</span>
                      </Badge>
                    ) : b.listingType === 'valued_partner' ? (
                      <Badge className="text-[10px] bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold flex items-center gap-1 shadow-xs">
                        <Handshake className="h-2.5 w-2.5" />
                        <span>Valued Partner</span>
                      </Badge>
                    ) : b.isLive ? (
                      b.isAccommodation ? (
                        <Badge className="text-[10px] bg-amber-500 text-white font-semibold">
                          Accommodation
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-[10px] bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30">
                          Active Partner
                        </Badge>
                      )
                    ) : (
                      <Badge variant="outline" className="text-[10px] bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/40 flex items-center gap-1 font-semibold">
                        <Lock className="h-2.5 w-2.5" />
                        Subscription Inactive
                      </Badge>
                    )}
                  </div>

                  {/* Logo Avatar Overlay */}
                  <div className="absolute -bottom-5 left-4 h-12 w-12 rounded-lg bg-card border-2 border-background shadow-md overflow-hidden flex items-center justify-center">
                    {b.logoImage ? (
                      <Image
                        src={b.logoImage}
                        alt={`${b.businessName} logo - ${b.primaryCommunityName || b.city || 'Local Area'}`}
                        width={48}
                        height={48}
                        className={`object-cover w-full h-full ${!b.isLive ? 'grayscale-[30%]' : ''}`}
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
                        {b.primaryCommunityName || b.city || 'Local Area'}
                        {b.postcode ? ` • ${b.postcode}` : ''}
                        {b.country ? ` • ${b.country}` : ''}
                      </span>
                    </div>

                    <p className="text-xs text-muted-foreground mt-2 line-clamp-2 leading-relaxed">
                      {b.shortDescription || 'Local community business offering quality services and goods.'}
                    </p>
                  </div>

                  {/* Quick Contacts (Live vs Unclaimed vs Locked) */}
                  <div className="pt-2 border-t text-[11px] text-muted-foreground space-y-1">
                    {b.isUnclaimed ? (
                      <div className="flex items-center gap-1.5 text-amber-800 dark:text-amber-300 font-medium py-0.5">
                        <HelpCircle className="h-3 w-3 text-amber-600 shrink-0" />
                        <span>Interactive links locked &bull; Claim available</span>
                      </div>
                    ) : b.isLive ? (
                      <>
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
                        {!b.phone && !b.website && (
                          <div className="text-[11px] text-muted-foreground/70 italic">
                            Verified Local Listing
                          </div>
                        )}
                      </>
                    ) : (
                      <div className="flex items-center gap-1.5 text-amber-700/80 dark:text-amber-400/80 italic font-medium py-0.5">
                        <Lock className="h-3 w-3 text-amber-500 shrink-0" />
                        <span>Interactive links locked &bull; Subscription inactive</span>
                      </div>
                    )}
                  </div>
                </CardContent>

                <CardFooter className="px-4 py-3 bg-muted/30 border-t flex items-center justify-between gap-2">
                  {b.isUnclaimed ? (
                    <>
                      <span className="text-[11px] text-amber-800 dark:text-amber-300 font-semibold flex items-center gap-1">
                        <HelpCircle className="h-3.5 w-3.5 text-amber-600" />
                        Claimable Listing
                      </span>

                      <Button
                        size="sm"
                        variant="outline"
                        asChild
                        className="h-8 text-xs border-amber-500/50 text-amber-800 dark:text-amber-300 hover:bg-amber-500/15 font-semibold"
                      >
                        <Link href={`/public-directory/${b.id}`}>
                          <span>Claim / View</span>
                          <ArrowRight className="h-3.5 w-3.5 ml-1 text-amber-600" />
                        </Link>
                      </Button>
                    </>
                  ) : b.isLive ? (
                    <>
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
                    </>
                  ) : (
                    <>
                      <span className="text-[11px] text-amber-700 dark:text-amber-400 font-medium flex items-center gap-1">
                        <Lock className="h-3 w-3 text-amber-500" />
                        Locked Listing
                      </span>

                      <Button
                        size="sm"
                        variant="outline"
                        asChild
                        className="h-8 text-xs border-amber-500/40 text-amber-700 dark:text-amber-400 hover:bg-amber-500/10 font-medium"
                      >
                        <Link href={`/public-directory/${b.id}`}>
                          <Lock className="h-3 w-3 mr-1" />
                          <span>Locked Profile</span>
                        </Link>
                      </Button>
                    </>
                  )}
                </CardFooter>
              </Card>
            ))}
          </div>
        )}

        {/* Pagination Controls Bar */}
        {totalPages > 1 && (
          <div className="mt-8 pt-4 border-t flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="text-xs text-muted-foreground">
              Page <strong>{validCurrentPage}</strong> of <strong>{totalPages}</strong> &bull; Showing lines{' '}
              <strong>{startIndex + 1}</strong> &ndash; <strong>{endIndex}</strong> of{' '}
              <strong>{totalItems}</strong>
            </div>

            <div className="flex items-center gap-1 sm:gap-1.5">
              {/* First Page Button */}
              <Button
                variant="outline"
                size="sm"
                onClick={() => handlePageChange(1)}
                disabled={validCurrentPage === 1}
                className="h-8 w-8 p-0"
                aria-label="First page"
              >
                <ChevronsLeft className="h-4 w-4" />
              </Button>

              {/* Previous Page Button */}
              <Button
                variant="outline"
                size="sm"
                onClick={() => handlePageChange(validCurrentPage - 1)}
                disabled={validCurrentPage === 1}
                className="h-8 px-2.5 text-xs flex items-center gap-1"
                aria-label="Previous page"
              >
                <ChevronLeft className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Previous</span>
              </Button>

              {/* Numbered Page Buttons */}
              <div className="flex items-center gap-1">
                {pageNumbers.map((item, idx) => {
                  if (item === 'ellipsis') {
                    return (
                      <span key={`ellipsis-${idx}`} className="px-2 text-xs text-muted-foreground">
                        &hellip;
                      </span>
                    );
                  }
                  const isCurrent = item === validCurrentPage;
                  return (
                    <Button
                      key={item}
                      size="sm"
                      variant={isCurrent ? 'default' : 'outline'}
                      onClick={() => handlePageChange(item)}
                      className={`h-8 min-w-[32px] px-2 text-xs font-semibold ${
                        isCurrent
                          ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs'
                          : 'hover:bg-muted text-foreground'
                      }`}
                    >
                      {item}
                    </Button>
                  );
                })}
              </div>

              {/* Next Page Button */}
              <Button
                variant="outline"
                size="sm"
                onClick={() => handlePageChange(validCurrentPage + 1)}
                disabled={validCurrentPage === totalPages}
                className="h-8 px-2.5 text-xs flex items-center gap-1"
                aria-label="Next page"
              >
                <span className="hidden sm:inline">Next</span>
                <ChevronRight className="h-3.5 w-3.5" />
              </Button>

              {/* Last Page Button */}
              <Button
                variant="outline"
                size="sm"
                onClick={() => handlePageChange(totalPages)}
                disabled={validCurrentPage === totalPages}
                className="h-8 w-8 p-0"
                aria-label="Last page"
              >
                <ChevronsRight className="h-4 w-4" />
              </Button>
            </div>
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

      {/* 5-Field Quick-Add Unclaimed Business Dialog for Platform Owner */}
      <Dialog open={isQuickAddOpen} onOpenChange={setIsQuickAddOpen}>
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-400 text-xs font-semibold w-fit">
              <PlusCircle className="h-3.5 w-3.5" />
              <span>Platform Owner Seeding Tool</span>
            </div>
            <DialogTitle className="text-xl font-bold">
              Seed Unclaimed Local Business
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Enter the 5 core details to create an indexed teaser profile. The listing will appear in search results,
              and real business owners can discover and claim it for a 14-day free trial.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleQuickAddSubmit} className="space-y-4 pt-2">
            {/* Field 1: Business Name */}
            <div className="space-y-1.5">
              <Label htmlFor="biz-name" className="text-xs font-semibold flex items-center gap-1">
                <span>1. Business Name</span>
                <span className="text-red-500">*</span>
              </Label>
              <Input
                id="biz-name"
                placeholder="e.g. Speyside Heather Honey & Deli"
                value={newBizName}
                onChange={(e) => setNewBizName(e.target.value)}
                required
                className="h-10 text-sm"
              />
            </div>

            {/* Field 2: Business Category */}
            <div className="space-y-1.5">
              <Label htmlFor="biz-category" className="text-xs font-semibold flex items-center gap-1">
                <span>2. Category</span>
                <span className="text-red-500">*</span>
              </Label>
              <select
                id="biz-category"
                value={newBizCategory}
                onChange={(e) => {
                  const cat = e.target.value;
                  setNewBizCategory(cat);
                  const preset = CATEGORY_COVER_PRESETS.find((p) => p.category === cat);
                  if (preset && !newBizCoverImage) {
                    setNewBizCoverImage(preset.url);
                  }
                }}
                className="h-10 w-full rounded-md border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="Bakery & Deli">Bakery & Deli</option>
                <option value="Café & Coffee Shop">Café & Coffee Shop</option>
                <option value="Restaurant & Bar">Restaurant & Bar</option>
                <option value="Retail & Boutique">Retail & Boutique</option>
                <option value="Trades & Services">Trades & Services</option>
                <option value="Stays & Lodging">Stays & Lodging</option>
                <option value="Hair & Beauty">Hair & Beauty</option>
                <option value="Automotive & Garage">Automotive & Garage</option>
                <option value="Professional Services">Professional Services</option>
                <option value="Health & Wellness">Health & Wellness</option>
                <option value="Local Farm Shop">Local Farm Shop</option>
                <option value="Other Local Business">Other Local Business</option>
              </select>
            </div>

            {/* Field 3: Community / Town */}
            <div className="space-y-1.5">
              <Label htmlFor="biz-community" className="text-xs font-semibold flex items-center gap-1">
                <span>3. Community / Town</span>
                <span className="text-red-500">*</span>
              </Label>
              <select
                id="biz-community"
                value={newBizCommunityName}
                onChange={(e) => {
                  const commName = e.target.value;
                  setNewBizCommunityName(commName);
                  const found = allAvailableCommunities.find((c) => c.name === commName);
                  if (found?.id) setNewBizCommunityId(found.id);
                }}
                required
                className="h-10 w-full rounded-md border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="">-- Choose Community / Town --</option>
                {allAvailableCommunities.map((c) => (
                  <option key={c.id || c.name} value={c.name}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Field 4: Postcode */}
            <div className="space-y-1.5">
              <Label htmlFor="biz-postcode" className="text-xs font-semibold flex items-center gap-1">
                <span>4. Postcode</span>
                <span className="text-red-500">*</span>
              </Label>
              <Input
                id="biz-postcode"
                placeholder="e.g. PH22 1RH"
                value={newBizPostcode}
                onChange={(e) => setNewBizPostcode(e.target.value.toUpperCase())}
                required
                className="h-10 text-sm font-mono uppercase"
              />
              <p className="text-[11px] text-muted-foreground">
                Crucial for Google local search and resident directory filtering by postcode (e.g. PH22).
              </p>
            </div>

            {/* Field 5: Cover Image */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-semibold flex items-center gap-1">
                  <span>5. Cover Image</span>
                  <span className="text-red-500">*</span>
                </Label>
                {isUploadingCover && (
                  <span className="text-xs text-emerald-600 flex items-center gap-1">
                    <Loader2 className="h-3 w-3 animate-spin" />
                    Uploading photo...
                  </span>
                )}
              </div>

              {/* 1-Click Curated Presets */}
              <div className="space-y-1.5">
                <p className="text-[11px] text-muted-foreground font-medium">
                  1-Click High-Quality Presets:
                </p>
                <div className="grid grid-cols-4 gap-2">
                  {CATEGORY_COVER_PRESETS.map((preset) => {
                    const isSelected = newBizCoverImage === preset.url;
                    return (
                      <button
                        type="button"
                        key={preset.label}
                        onClick={() => setNewBizCoverImage(preset.url)}
                        className={`relative rounded-lg overflow-hidden border-2 text-left transition-all group h-14 ${
                          isSelected
                            ? 'border-emerald-600 ring-2 ring-emerald-500/30'
                            : 'border-border hover:border-emerald-500/50'
                        }`}
                      >
                        <Image
                          src={preset.url}
                          alt={preset.label}
                          fill
                          className="object-cover group-hover:scale-105 transition-transform"
                        />
                        <div className="absolute inset-0 bg-black/40 flex items-end p-1">
                          <span className="text-[10px] text-white font-semibold leading-tight line-clamp-1">
                            {preset.label}
                          </span>
                        </div>
                        {isSelected && (
                          <div className="absolute top-1 right-1 bg-emerald-600 rounded-full p-0.5 text-white">
                            <Check className="h-2.5 w-2.5" />
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Or upload / paste URL */}
              <div className="flex gap-2 pt-1">
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileUpload}
                  accept="image/*"
                  className="hidden"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploadingCover}
                  className="text-xs flex items-center gap-1.5 h-9 shrink-0"
                >
                  <Upload className="h-3.5 w-3.5" />
                  <span>Upload File</span>
                </Button>
                <Input
                  type="url"
                  placeholder="Or paste image URL (https://...)"
                  value={newBizCoverImage}
                  onChange={(e) => setNewBizCoverImage(e.target.value)}
                  className="h-9 text-xs flex-1"
                />
              </div>

              {/* Selected Image Preview with ALT tag indicator */}
              {newBizCoverImage && (
                <div className="relative h-28 w-full rounded-lg overflow-hidden border mt-2 bg-muted">
                  <Image
                    src={newBizCoverImage}
                    alt={`${newBizName || 'Business'} in ${newBizCommunityName || 'Community'}`}
                    fill
                    className="object-cover"
                  />
                  <div className="absolute bottom-0 inset-x-0 bg-black/75 p-1.5 text-[10px] text-white/90 truncate flex items-center justify-between">
                    <span className="truncate">
                      <strong>SEO ALT Tag:</strong>{' '}
                      {newBizName ? `${newBizName} - ${newBizCategory} in ${newBizCommunityName || 'Local Community'}, ${newBizPostcode || ''} UK` : 'Pending business name...'}
                    </span>
                    <button
                      type="button"
                      onClick={() => setNewBizCoverImage('')}
                      className="ml-2 text-xs text-red-300 hover:text-red-100 shrink-0"
                    >
                      Clear
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Information Notice */}
            <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/30 text-xs text-amber-900 dark:text-amber-300 flex items-start gap-2">
              <HelpCircle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
              <p className="leading-relaxed">
                This listing will be marked as <strong>Platform-Created &bull; Unclaimed</strong>. Contact links and opening hours remain locked until the legitimate business owner verifies and claims it, initiating their 14-day free trial.
              </p>
            </div>

            <DialogFooter className="gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsQuickAddOpen(false)}
                disabled={isSubmittingQuickAdd}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isSubmittingQuickAdd || isUploadingCover || !newBizName.trim() || !newBizCommunityName.trim() || !newBizPostcode.trim()}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
              >
                {isSubmittingQuickAdd ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Creating Listing...
                  </>
                ) : (
                  <>
                    <PlusCircle className="h-4 w-4 mr-1.5" />
                    Create Unclaimed Listing
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
