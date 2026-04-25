// MANUAL STEP — Vercel environment variables:
// Add CANONICAL_HOST=horomo.com in the Vercel project dashboard
// (Settings → Environment Variables) for Production, Preview, and Development.

import { type NextRequest, NextResponse } from 'next/server';
import createMiddleware from 'next-intl/middleware';

import { routing } from './i18n/routing';

const intlMiddleware = createMiddleware(routing);

const DIRECT_FILE_PATHS = new Set(['/ads.txt', '/robots.txt', '/favicon.ico']);

function normalizeHost(value: string | undefined): string {
  if (!value) {
    return 'horomo.com';
  }

  try {
    return new URL(value).hostname;
  } catch {
    return value.replace(/^https?:\/\//i, '').replace(/\/.*$/, '').replace(/:\d+$/, '');
  }
}

export function middleware(request: NextRequest) {
  const canonicalHost = normalizeHost(
    process.env.CANONICAL_HOST ?? process.env.VERCEL_PROJECT_PRODUCTION_URL,
  );
  const hostname = request.nextUrl.hostname;
  const pathname = request.nextUrl.pathname;

  if (
    DIRECT_FILE_PATHS.has(pathname) ||
    pathname.startsWith('/.well-known/') ||
    /^\/sitemap(?:[^/]+)?\.xml$/i.test(pathname)
  ) {
    return NextResponse.next();
  }

  // Skip dev environments and Vercel preview deployments.
  const isLocalhost = hostname === 'localhost' || hostname.endsWith('.local');
  const isVercelPreview = hostname.endsWith('.vercel.app');

  // Canonical-host redirect runs first (production only).
  if (!isLocalhost && !isVercelPreview && hostname !== canonicalHost) {
    const url = new URL(request.url);
    url.hostname = canonicalHost; // .hostname setter leaves protocol and port intact
    url.port = ''; // drop any explicit port so the URL is clean
    return NextResponse.redirect(url, { status: 301 });
  }

  // Then locale detection / negotiation.
  return intlMiddleware(request);
}

export const config = {
  // Match all paths except Next.js internals, API routes, and files (anything
  // with a dot in the final segment: favicon.ico, robots.txt, sitemap.xml,
  // images, fonts, etc.). Root `/` is matched so next-intl can serve Thai
  // without a prefix.
  matcher: [
    '/',
    '/((?!api|_next|_vercel|.*\\..*).*)',
  ],
};
