'use client';

import NationalHeader from '@/components/layout/national-header';
import Footer from '@/components/layout/footer';

export default function NationalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen w-full flex-col">
      <NationalHeader />
      <main className="flex-1 bg-background p-4 sm:p-6 lg:p-8">{children}</main>
      <Footer />
    </div>
  );
}
