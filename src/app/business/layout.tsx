'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { useUser, useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';
import BusinessHeader from '@/components/layout/business-header';
import Footer from '@/components/layout/footer';
import { Loader2 } from 'lucide-react';
import { BackToTopButton } from '@/components/ui/back-to-top-button';

export default function BusinessLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, isUserLoading } = useUser();
  const db = useFirestore();
  const router = useRouter();

  const userProfileRef = useMemoFirebase(() => (user ? doc(db, 'users', user.uid) : null), [user, db]);
  const { data: userProfile, isLoading: profileLoading } = useDoc(userProfileRef);

  React.useEffect(() => {
    if (isUserLoading || profileLoading) return;
    if (!user) {
      window.location.href = '/';
      return;
    }
  }, [user, isUserLoading, profileLoading, router]);

  const isLoading = isUserLoading || profileLoading;

  if (isLoading || !user) {
    return (
      <div className="flex h-screen w-full flex-col">
        <BusinessHeader />
        <main className="flex-1 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen w-full flex-col">
      <BusinessHeader />
      <main className="flex-1 bg-background p-4 sm:p-6 lg:p-8">{children}</main>
      <Footer />
      <BackToTopButton />
    </div>
  );
}
