import type { Metadata } from 'next';
import { Geist, Geist_Mono, Noto_Serif_SC, Space_Grotesk } from 'next/font/google';
import Script from 'next/script';
import Link from 'next/link';

import StructuredData from '@/components/StructuredData';
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
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const spaceGrotesk = Space_Grotesk({
  variable: '--font-space-grotesk',
  subsets: ['latin'],
});

const notoSerifSc = Noto_Serif_SC({
  variable: '--font-noto-serif-sc',
  weight: ['400', '600', '700'],
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
      className={`${geistSans.variable} ${geistMono.variable} ${spaceGrotesk.variable} ${notoSerifSc.variable} h-full antialiased`}
    >
      <head>
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
      </head>
      <body className="cosmic-shell min-h-full flex flex-col">
        <StructuredData data={[buildOrganizationSchema(), buildWebsiteSchema()]} />
        <Providers>
          <header className="sticky top-0 z-50 border-b border-white/10 bg-slate-950/70 backdrop-blur-xl">
            <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
              <Link href="/" className="flex items-center gap-3">
                <span className="flex h-12 w-12 items-center justify-center rounded-2xl border border-cyan-300/20 bg-[radial-gradient(circle_at_top,rgba(103,232,249,0.22),rgba(59,130,246,0.08)_50%,transparent_70%)] shadow-[0_0_30px_rgba(34,211,238,0.16)]">
                  <span className="font-zh text-2xl font-bold text-slate-50">八字</span>
                </span>
                <span>
                  <span className="block text-sm font-semibold text-slate-50">Horomo</span>
                  <span className="block text-xs text-slate-400">Cosmic BaZi Atlas</span>
                </span>
              </Link>
              <nav aria-label="Primary" className="hidden flex-wrap items-center gap-5 text-sm text-slate-300 md:flex">
                <Link href="/#calculator" className="transition-colors hover:text-cyan-100">
                  Calculator
                </Link>
                <Link href="/learn" className="transition-colors hover:text-cyan-100">
                  Learn
                </Link>
                <Link href="/learn/day-master" className="transition-colors hover:text-cyan-100">
                  Day Master
                </Link>
                <Link href="/learn/ten-gods" className="transition-colors hover:text-cyan-100">
                  Ten Gods
                </Link>
                <Link href="/learn/luck-pillars" className="transition-colors hover:text-cyan-100">
                  Luck Pillars
                </Link>
              </nav>
              <div className="flex items-center gap-3">
                <Badge tone="cyan" className="hidden sm:inline-flex">True Solar Time</Badge>
                <Link href="/#calculator" className={buttonClassName('secondary', 'sm')}>
                  Start chart
                </Link>
              </div>
            </div>
          </header>
          <div className="flex-1">{children}</div>
          <footer className="border-t border-white/10 bg-slate-950/75">
            <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-8 text-sm text-slate-300 sm:px-6 lg:px-8 md:flex-row md:items-center md:justify-between">
              <p>
                Horomo helps you calculate a BaZi chart with true solar time, Day Master context,
                Ten Gods, hidden stems, and Da Yun cycles.
              </p>
              <div className="flex flex-wrap gap-4">
                <Link href="/" className="hover:text-cyan-100">Home</Link>
                <Link href="/learn" className="hover:text-cyan-100">Guides</Link>
                <Link href="/learn/what-is-ba-zi" className="hover:text-cyan-100">What Is BaZi</Link>
                <Link href="/learn/element-distribution" className="hover:text-cyan-100">Element Distribution</Link>
              </div>
            </div>
          </footer>
        </Providers>
      </body>
    </html>
  );
}
