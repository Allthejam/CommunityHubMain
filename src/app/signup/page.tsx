
'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';

export default function SignUpRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/signup/account-type');
  }, [router]);

  return (
    <div className="flex h-screen items-center justify-center">
      <Loader2 className="h-8 w-8 animate-spin" />
      <p className="ml-2">Redirecting...</p>
    </div>
  );
}
