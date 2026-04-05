import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import Link from 'next/link';

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

export const metadata: Metadata = {
  title: 'Horomo Bazi Calculator',
  description: 'Calculate Four Pillars of Destiny charts and unlock AI analysis after signing in with Google.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <Providers>
          <nav className="bg-white border-b border-slate-200 px-4 py-3 flex items-center gap-6">
            <Link href="/" className="text-sm font-semibold text-slate-600 hover:text-indigo-600 transition-colors">
              Bazi Calculator
            </Link>
            <Link href="/compatibility" className="text-sm font-semibold text-slate-600 hover:text-indigo-600 transition-colors">
              Compatibility
            </Link>
          </nav>
          {children}
        </Providers>
      </body>
    </html>
  );
}
