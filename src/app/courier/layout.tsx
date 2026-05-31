import CourierHeader from '@/components/layout/courier-header';
import Footer from '@/components/layout/footer';
import { BackToTopButton } from '@/components/ui/back-to-top-button';

export default function CourierLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen w-full flex-col">
      <CourierHeader />
      <main className="flex-1 bg-background p-4 sm:p-6 lg:p-8">{children}</main>
      <Footer />
      <BackToTopButton />
    </div>
  );
}
