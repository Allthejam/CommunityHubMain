
import BroadcastHeader from '@/components/layout/broadcast-header';
import Footer from '@/components/layout/footer'
import { BackToTopButton } from '@/components/ui/back-to-top-button';

export default function BroadcastLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <div className="flex min-h-screen w-full flex-col">
      <BroadcastHeader />
      <main className="flex-1 bg-background p-4 sm:p-6 lg:p-8">
        {children}
      </main>
      <Footer />
      <BackToTopButton />
    </div>
  )
}
    
