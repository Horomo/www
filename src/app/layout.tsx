import type { Metadata } from 'next';
import { Geist, Geist_Mono, Noto_Serif, Space_Grotesk } from 'next/font/google';
import Script from 'next/script';
import Link from 'next/link';

import { SpeedInsights } from '@vercel/speed-insights/next';
import { Analytics } from '@vercel/analytics/next';

import StructuredData from '@/components/StructuredData';
import DesktopPrimaryNav from '@/components/ui/DesktopPrimaryNav';
import MobilePrimaryNav from '@/components/ui/MobilePrimaryNav';
import Badge from '@/components/ui/Badge';
import { buttonClassName } from '@/components/ui/Button';
import {
  buildOrganizationSchema,
  buildWebsiteSchema,
  getSiteUrl,
} from '@/lib/seo';
import Providers from './providers';
import './globals.css';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

const spaceGrotesk = Space_Grotesk({
  variable: '--font-space-grotesk',
  subsets: ['latin'],
});

const notoSerif = Noto_Serif({
  variable: '--font-noto-serif',
  weight: ['400', '500', '600', '700'],
  subsets: ['latin'],
});

export const metadata: Metadata = {
  metadataBase: getSiteUrl(),
  title: {
    default: 'BaZi Calculator & Four Pillars Chart',
    template: '%s | Horomo',
  },
  description:
    'Calculate a BaZi chart with true solar time, Day Master analysis, Ten Gods, hidden stems, element distribution, and Da Yun luck pillars.',
  applicationName: 'Horomo',
  alternates: {
    canonical: '/',
  },
  category: 'Astrology',
  keywords: [
    'bazi calculator',
    'bazi chart',
    'chinese astrology calculator',
    'four pillars calculator',
    'day master',
    'ten gods',
    'hidden stems',
    'element distribution',
    'da yun',
  ],
  openGraph: {
    title: 'BaZi Calculator & Four Pillars Chart',
    description:
      'Calculate a BaZi chart with true solar time, Day Master analysis, Ten Gods, hidden stems, element distribution, and Da Yun luck pillars.',
    url: '/',
    siteName: 'Horomo',
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'BaZi Calculator & Four Pillars Chart',
    description:
      'Calculate a BaZi chart with true solar time, Day Master analysis, Ten Gods, hidden stems, element distribution, and Da Yun luck pillars.',
  },
  manifest: '/manifest.webmanifest',
  verification: process.env.GOOGLE_SITE_VERIFICATION
    ? { google: process.env.GOOGLE_SITE_VERIFICATION }
    : undefined,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} ${spaceGrotesk.variable} ${notoSerif.variable} h-full antialiased`}
    >
      <body className="cosmic-shell min-h-full flex flex-col text-[#151d22]">
        <Script
          src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-7343687256315400"
          strategy="afterInteractive"
          crossOrigin="anonymous"
        />
        <Script
          src="https://www.googletagmanager.com/gtag/js?id=G-V0RH6KHWH9"
          strategy="afterInteractive"
        />
        <Script id="ga4-init" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', 'G-V0RH6KHWH9', { page_path: window.location.pathname });
          `}
        </Script>
        <StructuredData data={[buildOrganizationSchema(), buildWebsiteSchema()]} />
        <SpeedInsights />
        <Analytics />
        <Providers>
          <header className="sticky top-0 z-50 px-3 pt-3 sm:px-6 sm:pt-5">
            <div className="mx-auto max-w-7xl">
              <div className="flex items-center justify-between gap-4 rounded-full bg-[linear-gradient(135deg,rgba(255,255,255,0.76),rgba(255,255,255,0.58)_48%,rgba(235,250,255,0.72))] px-4 py-3 shadow-[0_24px_60px_rgba(0,106,98,0.08)] backdrop-blur-[24px] sm:px-6">
                <Link href="/" className="flex items-center gap-3">
                  <span className="flex h-12 w-12 items-center justify-center rounded-[1.4rem] bg-[radial-gradient(circle_at_30%_30%,rgba(255,255,255,0.92),rgba(64,224,208,0.34)_48%,rgba(255,183,194,0.24)_76%,transparent_100%)] shadow-[inset_0_1px_0_rgba(255,255,255,0.92),0_14px_34px_rgba(64,224,208,0.12)]">
                    <span className="text-2xl font-bold text-[#006a62]">H</span>
                  </span>
                  <span>
                    <span className="block font-serif text-xl text-[#151d22]">Horomo</span>
                    <span className="block text-[11px] uppercase tracking-[0.28em] text-[#006a62]/70">Celestial Day Atlas</span>
                  </span>
                </Link>
                <DesktopPrimaryNav />
                <div className="flex items-center gap-3">
                  <Badge tone="cyan" className="hidden sm:inline-flex">True Solar Time</Badge>
                  <Link href="/calculator" className={buttonClassName('secondary', 'sm')}>
                    Start Your Analysis
                  </Link>
                </div>
              </div>
              <MobilePrimaryNav />
            </div>
          </header>
          <div className="flex-1">{children}</div>
          <footer className="mt-12 px-4 pb-8 sm:px-6 lg:px-8">
            <div className="mx-auto flex max-w-7xl flex-col gap-4 rounded-[2rem] bg-[linear-gradient(135deg,rgba(255,255,255,0.74),rgba(255,255,255,0.58)_54%,rgba(255,248,226,0.72))] px-5 py-7 text-sm text-[#151d22]/70 shadow-[0_24px_60px_rgba(0,106,98,0.07)] backdrop-blur-[24px] md:flex-row md:items-center md:justify-between">
              <p>
                Horomo helps you calculate a BaZi chart with true solar time, Day Master context,
                Ten Gods, hidden stems, and Da Yun cycles.
              </p>
              <div className="flex flex-wrap gap-4">
                <Link href="/" className="transition-colors hover:text-[#006a62]">Home</Link>
                <Link href="/learn" className="transition-colors hover:text-[#006a62]">Guides</Link>
                <Link href="/learn/what-is-ba-zi" className="transition-colors hover:text-[#006a62]">What Is BaZi</Link>
                <Link href="/learn/element-distribution" className="transition-colors hover:text-[#006a62]">Element Distribution</Link>
              </div>
            </div>
          </footer>
        </Providers>
      </body>
    </html>
  );
}
