// MANUAL STEP — Vercel environment variables:
// Add NEXT_PUBLIC_CANONICAL_HOST=horomo.com in the Vercel project dashboard
// (Settings → Environment Variables) for Production, Preview, and Development.

import { type NextRequest, NextResponse } from 'next/server';

// Falls back to 'horomo.com' if the variable is not set so the redirect
// still works on a cold deploy before the Vercel env var is configured.
const CANONICAL_HOST = process.env.NEXT_PUBLIC_CANONICAL_HOST ?? 'horomo.com';

export function middleware(request: NextRequest) {
  const { host, pathname, search } = request.nextUrl;

  // Strip port for comparison so localhost and staging previews are unaffected.
  const bareHost = host.split(':')[0];

  // Only redirect in production — skip on localhost and Vercel preview URLs.
  const isLocalhost = bareHost === 'localhost' || bareHost.endsWith('.local');
  const isVercelPreview = bareHost.endsWith('.vercel.app');

  if (!isLocalhost && !isVercelPreview && bareHost !== CANONICAL_HOST) {
    const url = new URL(request.url);
    url.host = CANONICAL_HOST;
    url.port = '';
    return NextResponse.redirect(url, { status: 301 });
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    // Run on all routes except Next.js internals and static assets.
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
