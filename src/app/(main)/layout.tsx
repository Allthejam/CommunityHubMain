import AppHeader from '@/components/layout/header'
import Footer from '@/components/layout/footer'
import { MainLayoutClientWrapper } from '@/components/layout/main-layout-client-wrapper'
import { BackToTopButton } from '@/components/ui/back-to-top-button'

export default function MainAppLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <div className="flex min-h-screen w-full flex-col">
      <AppHeader />
      <main className="flex-1 bg-background md:p-4 sm:p-6 lg:p-8">
        <MainLayoutClientWrapper>{children}</MainLayoutClientWrapper>
      </main>
      <Footer />
      <BackToTopButton />
    </div>
  )
}
