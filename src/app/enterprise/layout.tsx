
import EnterpriseHeader from '@/components/layout/enterprise-header';
import Footer from '@/components/layout/footer';

export default function EnterpriseLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen w-full flex-col">
      <EnterpriseHeader />
      <main className="flex-1 bg-background p-4 sm:p-6 lg:p-8">{children}</main>
      <Footer />
    </div>
  );
}

    