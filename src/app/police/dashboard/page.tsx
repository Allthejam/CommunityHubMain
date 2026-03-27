'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';

export default function PoliceDashboardRedirect() {
  const router = useRouter();

  useEffect(() => {
    // This page now simply redirects to the standard leader dashboard.
    router.replace('/leader/dashboard');
  }, [router]);

  return (
    <div className="flex h-screen w-full items-center justify-center">
      <div className="flex items-center gap-2 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin" />
        <span>Redirecting to your dashboard...</span>
      </div>
    </div>
  );
}
