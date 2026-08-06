'use client';

import * as React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import { 
  Vote, 
  Heart, 
  Compass, 
  Pin, 
  ChevronLeft, 
  ChevronRight, 
  ArrowRight, 
  BookOpen, 
  Store, 
  Briefcase, 
  Search,
  Sparkles,
  Users,
  Megaphone,
  CheckCircle2,
  Calendar,
  Target,
  Flame
} from 'lucide-react';
import { useUser, useFirestore, useDoc, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, where, doc, orderBy, limit } from 'firebase/firestore';
import { cn } from '@/lib/utils';

export function CommunityNoticeboardCarousel() {
  const { user } = useUser();
  const db = useFirestore();
  
  const userProfileRef = useMemoFirebase(() => (user && db ? doc(db, 'users', user.uid) : null), [user, db]);
  const { data: userProfile } = useDoc(userProfileRef);
  
  const activeCommunityId = (typeof window !== 'undefined' ? sessionStorage.getItem('visitedCommunityId') : null) || userProfile?.primaryHomeCommunityId || userProfile?.homeCommunityId || userProfile?.communityId;

  // 1. Live Polls query
  const pollsQuery = useMemoFirebase(() => {
    if (!activeCommunityId || !db) return null;
    return query(
      collection(db, 'communities', activeCommunityId, 'polls'),
      orderBy('createdAt', 'desc'),
      limit(1)
    );
  }, [db, activeCommunityId]);
  const { data: polls } = useCollection<any>(pollsQuery);

  // 2. Live Petitions query
  const campaignsQuery = useMemoFirebase(() => {
    if (!activeCommunityId || !db) return null;
    return collection(db, 'communities', activeCommunityId, 'petitions');
  }, [db, activeCommunityId]);
  const { data: campaigns } = useCollection<any>(campaignsQuery);

  // 3. Live Charities query
  const charitiesQuery = useMemoFirebase(() => {
    if (!activeCommunityId || !db) return null;
    return query(
      collection(db, 'charities'),
      where('communityId', '==', activeCommunityId),
      limit(1)
    );
  }, [db, activeCommunityId]);
  const { data: charities } = useCollection<any>(charitiesQuery);

  // 3. Live Announcements query
  const announcementsQuery = useMemoFirebase(() => {
    if (!activeCommunityId || !db) return null;
    return query(
      collection(db, 'announcements'),
      where('communityId', '==', activeCommunityId),
      limit(1)
    );
  }, [db, activeCommunityId]);
  const { data: announcements } = useCollection<any>(announcementsQuery);

  // 4. Live Events query
  const eventsQuery = useMemoFirebase(() => {
    if (!activeCommunityId || !db) return null;
    return query(
      collection(db, 'events'),
      where('communityId', '==', activeCommunityId),
      limit(1)
    );
  }, [db, activeCommunityId]);
  const { data: events } = useCollection<any>(eventsQuery);

  // Build dynamic slide list strictly from live Firestore data
  const slides = React.useMemo(() => {
    const list: Array<{
      id: string;
      badge: string;
      icon: any;
      title: string;
      content: React.ReactNode;
      link: string;
      linkText: string;
      badgeColorClass: string;
      buttonColorClass: string;
    }> = [];

    // Slide: Live Polls
    if (polls && polls.length > 0) {
      const poll = polls[0];
      list.push({
        id: 'poll',
        badge: 'Active Poll',
        icon: Vote,
        title: poll.title || poll.question || 'Community Poll',
        content: (
          <div className="space-y-2">
            {poll.description && (
              <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                {poll.description}
              </p>
            )}
            {Array.isArray(poll.options) && poll.options.length > 0 && (
              <div className="p-2.5 rounded-xl bg-indigo-500/5 border border-indigo-500/15 space-y-1.5">
                {poll.options.slice(0, 2).map((opt: any, idx: number) => {
                  const label = typeof opt === 'string' ? opt : opt.text || `Option ${idx + 1}`;
                  const votes = typeof opt === 'object' && opt.votes ? opt.votes : 0;
                  return (
                    <div key={idx} className="flex justify-between items-center text-xs font-medium">
                      <span className="truncate pr-2">• {label}</span>
                      {votes > 0 && <span className="font-bold text-indigo-600 dark:text-indigo-400">{votes} votes</span>}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        ),
        link: '/polls',
        linkText: 'Cast Your Vote / View Polls',
        badgeColorClass: 'bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 border-indigo-500/30',
        buttonColorClass: 'bg-indigo-600 hover:bg-indigo-700 text-white'
      });
    }

    // Slide: Live Campaigns
    if (campaigns && campaigns.length > 0) {
      const camp = campaigns[0];
      list.push({
        id: 'campaign',
        badge: 'Local Petition',
        icon: Target,
        title: camp.title || camp.name || 'Community Action',
        content: (
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
              {camp.description || camp.summary || 'Local petition and action campaign.'}
            </p>
            {camp.targetSignatures && (
              <div className="p-2 rounded-xl bg-amber-500/5 border border-amber-500/15 flex justify-between text-xs font-semibold">
                <span className="text-muted-foreground">Petitions Signed</span>
                <span className="text-amber-700 dark:text-amber-400 font-bold">{camp.currentSignatures || 0} / {camp.targetSignatures}</span>
              </div>
            )}
          </div>
        ),
        link: '/campaigns',
        linkText: 'Sign Petition / View All Petitions',
        badgeColorClass: 'bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30',
        buttonColorClass: 'bg-amber-600 hover:bg-amber-700 text-white'
      });
    }

    // Slide: Live Charities
    if (charities && charities.length > 0) {
      const charity = charities[0];
      list.push({
        id: 'charity',
        badge: charity.category || 'Local Non-Profit',
        icon: Heart,
        title: charity.title || 'Registered Non-Profit',
        content: (
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground line-clamp-3 leading-relaxed">
              {charity.description?.replace(/<[^>]*>?/gm, '') || 'Registered local non-profit organization serving your community.'}
            </p>
            {charity.website && (
              <div className="text-[11px] font-medium text-rose-600 dark:text-rose-400 truncate">
                🌐 {charity.website}
              </div>
            )}
          </div>
        ),
        link: '/charities',
        linkText: 'Support Cause / View Charities',
        badgeColorClass: 'bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/30',
        buttonColorClass: 'bg-rose-600 hover:bg-rose-700 text-white'
      });
    }

    // Slide: Live Announcements
    if (announcements && announcements.length > 0) {
      const notice = announcements[0];
      list.push({
        id: 'notice',
        badge: 'Official Notice',
        icon: Pin,
        title: notice.title || notice.heading || 'Official Announcement',
        content: (
          <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/25 space-y-1.5">
            <p className="text-xs text-amber-900/90 dark:text-amber-300/90 leading-relaxed line-clamp-3">
              {notice.content || notice.message || notice.description}
            </p>
          </div>
        ),
        link: '/forum',
        linkText: 'Discuss in Community Forum',
        badgeColorClass: 'bg-amber-500/20 text-amber-800 dark:text-amber-300 border-amber-500/40',
        buttonColorClass: 'bg-amber-600 hover:bg-amber-700 text-white'
      });
    }

    // Slide: Live Events
    if (events && events.length > 0) {
      const ev = events[0];
      list.push({
        id: 'event',
        badge: ev.category || 'Upcoming Event',
        icon: Calendar,
        title: ev.title || 'Community Event',
        content: (
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
              {ev.description || 'Community gathering and event.'}
            </p>
            {ev.startDate && (
              <div className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                📅 Scheduled Community Event
              </div>
            )}
          </div>
        ),
        link: '/events',
        linkText: 'View Community Events',
        badgeColorClass: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30',
        buttonColorClass: 'bg-emerald-600 hover:bg-emerald-700 text-white'
      });
    }

    // Slide: Town Directory Quick Links (Always Available)
    list.push({
      id: 'directory',
      badge: 'Town Hub Shortcuts',
      icon: Compass,
      title: 'Visitor & Resident Hub',
      content: (
        <div className="grid grid-cols-2 gap-2">
          <Link 
            href="/guestbook" 
            className="p-2.5 rounded-xl bg-amber-500/5 hover:bg-amber-500/10 border border-amber-500/20 transition-all flex items-center gap-2 group"
          >
            <BookOpen className="h-4 w-4 text-amber-600 shrink-0" />
            <div>
              <div className="text-xs font-bold text-foreground group-hover:text-amber-600 transition-colors">Guestbook</div>
              <div className="text-[10px] text-muted-foreground">Reviews</div>
            </div>
          </Link>

          <Link 
            href="/shopping/highstreet" 
            className="p-2.5 rounded-xl bg-emerald-500/5 hover:bg-emerald-500/10 border border-emerald-500/20 transition-all flex items-center gap-2 group"
          >
            <Store className="h-4 w-4 text-emerald-600 shrink-0" />
            <div>
              <div className="text-xs font-bold text-foreground group-hover:text-emerald-600 transition-colors">Highstreet</div>
              <div className="text-[10px] text-muted-foreground">Local Shops</div>
            </div>
          </Link>

          <Link 
            href="/jobs" 
            className="p-2.5 rounded-xl bg-sky-500/5 hover:bg-sky-500/10 border border-border/60 transition-all flex items-center gap-2 group"
          >
            <Briefcase className="h-4 w-4 text-sky-600 shrink-0" />
            <div>
              <div className="text-xs font-bold text-foreground group-hover:text-sky-600 transition-colors">Jobs Hub</div>
              <div className="text-[10px] text-muted-foreground">Vacancies</div>
            </div>
          </Link>

          <Link 
            href="/lost-and-found" 
            className="p-2.5 rounded-xl bg-indigo-500/5 hover:bg-indigo-500/10 border border-border/60 transition-all flex items-center gap-2 group"
          >
            <Search className="h-4 w-4 text-indigo-600 shrink-0" />
            <div>
              <div className="text-xs font-bold text-foreground group-hover:text-indigo-600 transition-colors">Lost & Found</div>
              <div className="text-[10px] text-muted-foreground">Recovery</div>
            </div>
          </Link>
        </div>
      ),
      link: '/directory',
      linkText: 'View Full Town Directory',
      badgeColorClass: 'bg-teal-500/15 text-teal-700 dark:text-teal-400 border-teal-500/30',
      buttonColorClass: 'bg-teal-600 hover:bg-teal-700 text-white'
    });

    return list;
  }, [polls, charities, announcements, events]);

  const [activeSlide, setActiveSlide] = React.useState(0);
  const [isPaused, setIsPaused] = React.useState(false);

  const totalSlides = slides.length;

  const nextSlide = React.useCallback(() => {
    setActiveSlide((prev) => (prev + 1) % totalSlides);
  }, [totalSlides]);

  const prevSlide = React.useCallback(() => {
    setActiveSlide((prev) => (prev - 1 + totalSlides) % totalSlides);
  }, [totalSlides]);

  // Reset active slide index if total slides change
  React.useEffect(() => {
    if (activeSlide >= totalSlides) {
      setActiveSlide(0);
    }
  }, [totalSlides, activeSlide]);

  // Auto-advance slides every 7 seconds if not paused
  React.useEffect(() => {
    if (isPaused || totalSlides <= 1) return;
    const timer = setInterval(() => {
      nextSlide();
    }, 7000);
    return () => clearInterval(timer);
  }, [isPaused, nextSlide, totalSlides]);

  const currentSlide = slides[activeSlide] || slides[0];

  return (
    <Card 
      className="relative overflow-hidden border-2 border-amber-500/30 shadow-lg bg-card"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      {/* Noticeboard Header Pin Strip */}
      <div className="bg-gradient-to-r from-amber-500/20 via-orange-500/20 to-amber-500/20 px-4 py-2.5 border-b border-amber-500/30 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Pin className="h-4 w-4 fill-amber-600 text-amber-700 dark:text-amber-400 rotate-45 shrink-0" />
          <CardTitle className="text-xs font-extrabold uppercase tracking-wider text-amber-900 dark:text-amber-300 font-headline">
            Town Square Noticeboard
          </CardTitle>
        </div>

        {/* Carousel Controls */}
        {totalSlides > 1 && (
          <div className="flex items-center gap-1">
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={prevSlide} 
              className="h-6 w-6 rounded-full text-amber-900 dark:text-amber-300 hover:bg-amber-500/20"
              title="Previous Notice"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-[10px] font-bold text-amber-900 dark:text-amber-300 w-7 text-center">
              {activeSlide + 1} / {totalSlides}
            </span>
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={nextSlide} 
              className="h-6 w-6 rounded-full text-amber-900 dark:text-amber-300 hover:bg-amber-500/20"
              title="Next Notice"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>

      <CardContent className="p-4 min-h-[300px] flex flex-col justify-between">
        {currentSlide && (
          <div key={currentSlide.id} className="space-y-3 animate-in fade-in duration-300">
            <div className="flex items-center justify-between">
              <Badge className={cn("text-[10px] font-bold gap-1 px-2.5 py-0.5", currentSlide.badgeColorClass)}>
                {React.createElement(currentSlide.icon, { className: "h-3 w-3" })}
                <span>{currentSlide.badge}</span>
              </Badge>
            </div>

            <div className="space-y-1.5">
              <h4 className="font-bold text-sm text-foreground leading-snug">
                {currentSlide.title}
              </h4>
              {currentSlide.content}
            </div>

            <Button asChild size="sm" className={cn("w-full gap-2 text-xs font-semibold shadow-xs mt-auto", currentSlide.buttonColorClass)}>
              <Link href={currentSlide.link}>
                <span>{currentSlide.linkText}</span>
                <ArrowRight className="h-3.5 w-3.5 ml-auto" />
              </Link>
            </Button>
          </div>
        )}

        {/* Slide Indicator Dots */}
        {totalSlides > 1 && (
          <div className="flex items-center justify-center gap-1.5 pt-3 border-t border-border/40 mt-3">
            {slides.map((_, index) => (
              <button
                key={index}
                onClick={() => setActiveSlide(index)}
                className={cn(
                  "h-2 rounded-full transition-all duration-300",
                  activeSlide === index 
                    ? "w-6 bg-amber-600" 
                    : "w-2 bg-muted-foreground/30 hover:bg-muted-foreground/50"
                )}
                title={`Go to notice ${index + 1}`}
              />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
