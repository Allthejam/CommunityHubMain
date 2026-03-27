'use client'
import AppHeader from '@/components/layout/header'

export default function FeedLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <div className="flex min-h-screen w-full flex-col">
      <AppHeader />
      <main className="flex-1 bg-background p-4 sm:p-6 lg:p-8">
        {children}
      </main>
    </div>
  )
}
