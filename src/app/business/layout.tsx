import BusinessHeader from '@/components/layout/business-header';
import Footer from '@/components/layout/footer';

export default function BusinessLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen w-full flex-col">
      <BusinessHeader />
      <main className="flex-1 bg-background p-4 sm:p-6 lg:p-8">{children}</main>
      <Footer />
    </div>
  );
}
