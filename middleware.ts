// MANUAL STEP — Vercel environment variables:
// Add NEXT_PUBLIC_CANONICAL_HOST=horomo.com in the Vercel project dashboard
// (Settings → Environment Variables) for Production, Preview, and Development.

import { type NextRequest, NextResponse } from 'next/server';

// NOTE: NEXT_PUBLIC_* variables are inlined at build time by Next.js.
// Do NOT set this in .env.local if that file is committed to the repo —
// the local value would be baked into the production bundle.
// Set it only in the Vercel dashboard for production builds.
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

  if (!isLocalhost && !isVercelPreview && hostname !== canonicalHost) {
    const url = new URL(request.url);
    url.hostname = canonicalHost; // .hostname setter leaves protocol and port intact
    url.port = ''; // drop any explicit port so the URL is clean
    return NextResponse.redirect(url, { status: 301 });
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    // Skip Next.js internals, static assets, and well-known root files that
    // must be served directly without going through the middleware redirect.
    '/((?!_next/static|_next/image|favicon\\.ico|ads\\.txt|robots\\.txt|sitemap[^/]*\\.xml|\\.well-known).*)',
  ],
};
