import Link from 'next/link';
import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';

import HourlyScoringPanel from '@/components/HourlyScoringPanel';
import { buildMetadata } from '@/lib/seo';
import { authOptions } from '@/lib/auth';

export const metadata = buildMetadata({
  title: 'BaZi 2-Hour Scoring',
  description: 'Member-only BaZi 2-hour scoring for today, with saved birth profile support and hourly career, wealth, love, and health scores.',
  path: '/calculator/hourly',
  keywords: ['bazi hourly score', 'two hour score', 'member-only ba zi', 'today scoring', 'hourly fortune'],
});

export default async function HourlyScoringPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    redirect('/api/auth/signin?callbackUrl=/calculator/hourly');
  }

  return (
    <main className="px-4 pb-14 pt-6 sm:px-6 sm:pt-8 lg:px-8">
      <section className="mx-auto max-w-4xl">
        <div className="flex justify-start">
          <Link href="/calculator" className="inline-flex rounded-full border border-slate-200 px-3 py-2 text-sm text-[#151d22] transition hover:border-slate-300 hover:bg-white/80">
            Back to Calculator
          </Link>
        </div>
        <div className="mt-6 text-center">
          <h1 className="font-serif text-4xl tracking-[-0.03em] text-[#151d22] sm:text-[3.1rem]">
            BaZi 2-Hour Scoring for Today
          </h1>
          <p className="mx-auto mt-3 max-w-xl text-sm leading-7 text-[#151d22]/64 sm:text-base">
            Members can save their birth profile and see fresh hourly scoring for career, wealth, love, and health without re-entering birth details.
          </p>
        </div>
      </section>

      <HourlyScoringPanel />
    </main>
  );
}
