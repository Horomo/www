import Link from 'next/link';

import { buildMetadata } from '@/lib/seo';

const ERROR_MESSAGES: Record<string, string> = {
  AccessDenied: 'Google sign-in was denied. Please try again and grant access to continue.',
  Configuration: 'Authentication is not configured correctly on the server.',
  OAuthAccountNotLinked: 'This Google account is already linked differently. Please use the original sign-in method.',
  OAuthCallback: 'Google sign-in could not be completed. Please try again.',
  OAuthCreateAccount: 'Your account could not be created during Google sign-in. Please try again.',
  OAuthSignin: 'The Google sign-in flow could not be started. Please try again.',
  SessionRequired: 'You need to sign in with Google to use this feature.',
  default: 'Google sign-in failed. Please try again.',
};

export const metadata = buildMetadata({
  title: 'Authentication Error',
  description: 'Google sign-in could not be completed for Horomo.',
  path: '/auth/error',
  noIndex: true,
});

export default async function AuthErrorPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string | string[] }>;
}) {
  const resolvedSearchParams = await searchParams;
  const rawError = resolvedSearchParams.error;
  const errorCode = Array.isArray(rawError) ? rawError[0] : rawError;
  const message = ERROR_MESSAGES[errorCode ?? 'default'] ?? ERROR_MESSAGES.default;

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-8">
      <div className="mx-auto max-w-lg rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">Authentication Error</p>
        <h1 className="mt-2 text-2xl font-semibold text-slate-900">Unable to sign in with Google</h1>
        <p className="mt-3 text-sm leading-6 text-slate-600">{message}</p>
        <div className="mt-5">
          <Link
            href="/"
            className="inline-flex items-center rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-indigo-700"
          >
            Back to calculator
          </Link>
        </div>
      </div>
    </main>
  );
}
