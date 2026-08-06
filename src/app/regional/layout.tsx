'use client';

import * as React from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useUser, useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';
import AppHeader from '@/components/layout/header';
import RegionalHeader from '@/components/layout/regional-header';
import Footer from '@/components/layout/footer';
import { Loader2 } from 'lucide-react';
import { BackToTopButton } from '@/components/ui/back-to-top-button';

export default function RegionalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, isUserLoading } = useUser();
  const db = useFirestore();
  const router = useRouter();
  const pathname = usePathname();

  const userProfileRef = useMemoFirebase(() => (user ? doc(db, 'users', user.uid) : null), [user, db]);
  const { data: userProfile, isLoading: profileLoading } = useDoc(userProfileRef);

  const isPublicSite = pathname === '/regional/public-site' || pathname?.startsWith('/regional/public-site');

  React.useEffect(() => {
    if (isUserLoading || profileLoading) {
      return;
    }

    const isRegionalUser = userProfile?.accountType === 'regional' || userProfile?.role === 'regional' || userProfile?.permissions?.isRegionalNetwork;

    // Public site page is accessible to everyone, but back-office management routes require an authorized regional account
    if (!isPublicSite) {
      if (!user || !isRegionalUser) {
        router.replace('/regional-networks');
        return;
      }
    }
  }, [user, userProfile, isUserLoading, profileLoading, router, pathname, isPublicSite]);

  const isLoading = isUserLoading || profileLoading;

  if (isLoading) {
    return (
      <div className="flex h-screen w-full flex-col">
        {isPublicSite ? <AppHeader /> : <RegionalHeader />}
        <main className="flex-1 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
        </main>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-slate-50 dark:bg-slate-950">
      {isPublicSite ? <AppHeader /> : <RegionalHeader />}
      <div className="flex-1">{children}</div>
      <Footer />
      <BackToTopButton />
    </div>
  );
}
