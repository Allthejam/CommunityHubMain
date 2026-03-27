
import ShoppingHeader from '@/components/layout/shopping-header';
import Footer from '@/components/layout/footer';

export default function ShoppingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen w-full flex-col">
      <ShoppingHeader />
      <main className="flex-1 bg-background p-4 sm:p-6 lg:p-8">{children}</main>
      <Footer />
    </div>
  );
}
