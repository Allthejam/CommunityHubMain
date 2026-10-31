'use client';

export const dynamic = 'force-dynamic';

import PageComponent from '@/app/(main)/defibrillators/page';

export default function DemoWrappedPage(props: any) {
  return <PageComponent {...props} />;
}
