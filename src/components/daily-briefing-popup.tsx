'use client';

import * as React from 'react';
import Link from 'next/link';
import { Sun, CloudSun, Construction, GraduationCap, Clock, ArrowRight } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useUser, useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';

type BulletinPayload = {
  success: boolean;
  date: string;
  greeting: string;
  communityName: string;
  weatherLine: string;
  roadsLine: string;
  schoolLines: string[];
};

function getLondonTodayAndHour(): { todayIso: string; hour: number } {
  const now = new Date();
  const todayIso = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/London',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now);
  const hour = Number(
    new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Europe/London',
      hour: '2-digit',
      hour12: false,
    }).format(now)
  );
  return { todayIso, hour };
}

export function DailyBriefingPopup() {
  const { user } = useUser();
  const db = useFirestore();
  const userProfileRef = useMemoFirebase(() => (user && db ? doc(db, 'users', user.uid) : null), [user, db]);
  const { data: userProfile } = useDoc<any>(userProfileRef);

  const [open, setOpen] = React.useState(false);
  const [bulletin, setBulletin] = React.useState<BulletinPayload | null>(null);

  const fetchAndOpen = React.useCallback(async (forceOpen = false) => {
    if (!user?.uid || !userProfile) return;
    if (userProfile.mailingLists?.standard === false || userProfile.mailingLists?.dailyBriefing === false) {
      if (!forceOpen) return;
    }

    const { todayIso, hour } = getLondonTodayAndHour();
    if (!forceOpen && hour < 8) return;

    const storageKey = `dailyBriefingDismissed_${todayIso}_${user.uid}`;
    if (!forceOpen && typeof window !== 'undefined' && localStorage.getItem(storageKey) === 'true') {
      return;
    }

    try {
      const res = await fetch(`/api/cron/daily-briefing?userId=${encodeURIComponent(user.uid)}`, {
        cache: 'no-store',
      });
      if (!res.ok) return;
      const data: BulletinPayload = await res.json();
      if (data.success) {
        setBulletin(data);
        setOpen(true);
      }
    } catch {
      // Ignore transient offline/abort errors
    }
  }, [user?.uid, userProfile]);

  React.useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    const forceBriefing = params.get('briefing') === '1';
    fetchAndOpen(forceBriefing);

    const onOpenEvent = () => fetchAndOpen(true);
    window.addEventListener('open-daily-briefing', onOpenEvent);
    return () => window.removeEventListener('open-daily-briefing', onOpenEvent);
  }, [fetchAndOpen]);

  const handleClose = () => {
    setOpen(false);
    if (user?.uid && typeof window !== 'undefined') {
      const { todayIso } = getLondonTodayAndHour();
      localStorage.setItem(`dailyBriefingDismissed_${todayIso}_${user.uid}`, 'true');
    }
  };

  if (!bulletin) return null;

  return (
    <Dialog open={open} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent className="max-w-lg p-0 overflow-hidden border-2 border-amber-300/80 dark:border-amber-700/60">
        <div className="bg-gradient-to-r from-amber-500 via-orange-500 to-sky-600 text-white px-6 py-4">
          <DialogHeader className="text-left space-y-1">
            <DialogTitle className="flex items-center gap-2 text-white text-lg font-black">
              <Sun className="h-5 w-5 text-yellow-200 shrink-0" />
              Morning Bulletin
            </DialogTitle>
            <DialogDescription className="text-amber-50 text-sm font-medium leading-snug">
              {bulletin.greeting}
            </DialogDescription>
          </DialogHeader>
        </div>

        <div className="p-5 space-y-3 text-xs">
          <div className="rounded-xl border border-sky-200 bg-sky-50/70 dark:bg-sky-950/30 p-3 flex items-start gap-2.5">
            <CloudSun className="h-4 w-4 text-sky-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-foreground">Weather &amp; Warnings</p>
              <p className="text-muted-foreground mt-0.5">{bulletin.weatherLine}</p>
            </div>
          </div>

          <div className="rounded-xl border border-amber-200 bg-amber-50/70 dark:bg-amber-950/30 p-3 flex items-start gap-2.5">
            <Construction className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
            <div className="flex-1 space-y-1">
              <p className="font-bold text-foreground">Local Travel &amp; 30-Mile Roadworks</p>
              <p className="text-muted-foreground">{bulletin.roadsLine}</p>
              <Link
                href="/travel"
                onClick={handleClose}
                className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-700 dark:text-amber-300 hover:underline pt-0.5"
              >
                View Travel &amp; Roadworks Noticeboard <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
          </div>

          <div className="rounded-xl border border-indigo-200 bg-indigo-50/70 dark:bg-indigo-950/30 p-3 flex items-start gap-2.5">
            <GraduationCap className="h-4 w-4 text-indigo-600 shrink-0 mt-0.5" />
            <div className="space-y-0.5">
              <p className="font-bold text-foreground">Schools &amp; Holiday Countdowns</p>
              {bulletin.schoolLines.map((line, i) => (
                <p key={i} className="text-muted-foreground">
                  {line}
                </p>
              ))}
            </div>
          </div>

          <DialogFooter className="pt-2 border-t flex-row justify-between sm:justify-between items-center gap-2">
            <span className="text-[11px] text-muted-foreground flex items-center gap-1">
              <Clock className="h-3 w-3" /> Auto-deletes from notifications after 20 hours
            </span>
            <Button type="button" onClick={handleClose} className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold">
              Got it
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}
