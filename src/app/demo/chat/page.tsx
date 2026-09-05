'use client';

import * as React from 'react';
import { ChatPageContent } from '@/app/chat/page';
import { Loader2 } from 'lucide-react';

export default function DemoChatPage() {
  return (
    <React.Suspense fallback={<div className="flex h-[75vh] items-center justify-center"><Loader2 className="h-8 w-8 animate-spin" /></div>}>
      <ChatPageContent />
    </React.Suspense>
  );
}

