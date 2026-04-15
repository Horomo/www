import Link from 'next/link';

import HourlyScoringPanel from '@/components/HourlyScoringPanel';
import { buildMetadata } from '@/lib/seo';

export const metadata = buildMetadata({
  title: 'BaZi 2-Hour Scoring',
  description: 'Member-only BaZi 2-hour scoring for today, with saved birth profile support and hourly career, wealth, love, and health scores.',
  path: '/hourly',
  keywords: ['bazi hourly score', 'two hour score', 'member-only ba zi', 'today scoring', 'hourly fortune'],
});

export default async function HourlyScoringPage() {
  return (
    <main className="px-4 pb-16 pt-5 sm:px-6 sm:pt-7 lg:px-8">
      <section className="mx-auto max-w-7xl">
        <Link href="/calculator" className="inline-flex rounded-full bg-white/70 px-4 py-2 text-sm text-[#16302d] shadow-[inset_0_0_0_1px_rgba(13,93,86,0.08)] transition hover:bg-white/88">
          Back to Calculator
        </Link>
        <h1 className="mt-8 font-serif text-[2.8rem] leading-[0.98] tracking-[-0.04em] text-[#16302d] sm:text-[4rem]">
          BaZi Hourly Scoring
        </h1>
        <p className="mt-4 max-w-xl text-sm leading-7 text-[#35514d]">
          Career, wealth, love, and health scores for each 2-hour slot today, based on your saved birth profile.
        </p>
      </section>

      <HourlyScoringPanel />
    </main>
  );
}
