
import type { Metadata } from 'next'
import './globals.css'
import { Toaster } from '@/components/ui/toaster'
import { FirebaseClientProvider } from '@/firebase'
import { CartProvider } from '@/contexts/cart-context'
import { GoogleAnalytics } from '@/components/google-analytics'
import { CookieConsentDialog } from '@/components/cookie-consent-dialog'
import { ServiceWorkerRegistrar } from '@/components/service-worker-registrar'
import Script from 'next/script'

export const metadata: Metadata = {
  metadataBase: new URL('https://my-community-hub.co.uk'), // Replace with your actual domain
  title: 'Community Hub',
  description: 'Your community at your fingertips.',
  icons: {
    icon: [
      { url: 'https://i.postimg.cc/63VmdRcZ/favicon-32x32.png', sizes: '32x32', type: 'image/png' },
      { url: 'https://i.postimg.cc/HnhWpVyt/HubLogo192x192.png', sizes: '192x192', type: 'image/png' }
    ],
    apple: [
        { url: 'https://i.postimg.cc/NF9qkbK1/HubLogoIOS180x180.png', sizes: '180x180' }
    ],
    other: [
      {
        rel: 'icon',
        url: 'https://i.postimg.cc/63VmdRcZ/favicon-32x32.png',
        sizes: '32x32'
      },
       {
        rel: 'icon',
        url: 'https://i.postimg.cc/HnhWpVyt/HubLogo192x192.png',
        sizes: '192x192'
      },
      {
        rel: 'icon',
        url: 'https://i.postimg.cc/ydfsPkvz/Hublogo512x512.png',
        sizes: '512x512'
      }
    ],
  },
  openGraph: {
    title: 'Community Hub',
    description: 'Your community at your fingertips.',
    url: '/',
    siteName: 'Community Hub',
    images: [
      {
        url: 'https://i.postimg.cc/ydfsPkvz/Hublogo512x512.png', // Default image for sharing
        width: 512,
        height: 512,
        alt: 'Community Hub Logo',
      },
    ],
    locale: 'en_GB',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Community Hub',
    description: 'Your community at your fingertips.',
    images: ['https://i.postimg.cc/ydfsPkvz/Hublogo512x512.png'],
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=PT+Sans:wght@400;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="font-body antialiased">
        <FirebaseClientProvider>
          <ServiceWorkerRegistrar />
          <GoogleAnalytics />
          <CartProvider>
            {children}
            <CookieConsentDialog />
          </CartProvider>
          <Toaster />
        </FirebaseClientProvider>
        {/* Pinterest Tag */}
        <Script id="pinterest-tag" strategy="afterInteractive">
          {`
            !function(e){if(!window.pintrk){window.pintrk=function(){window.pintrk.queue.push(Array.prototype.slice.call(arguments))};var n=window.pintrk;n.queue=[],n.version="3.0";var t=document.createElement("script");t.async=!0,t.src=e;var r=document.getElementsByTagName("script")[0];r.parentNode.insertBefore(t,r)}}("https://s.pinimg.com/ct/core.js");
            pintrk('load', '2612925086164', {em: '<user_email_address>'});
            pintrk('page');
          `}
        </Script>
        <noscript
          dangerouslySetInnerHTML={{
            __html: `<img height="1" width="1" style="display:none;" alt=""
              src="https://ct.pinterest.com/v3/?event=init&tid=2612925086164&pd[em]=<hashed_email_address>&noscript=1" />`,
          }}
        />
        {/* end Pinterest Tag */}
      </body>
    </html>
  )
}
