import Link from 'next/link';
import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';

import HourlyScoringPanel from '@/components/HourlyScoringPanel';
import { authOptions } from '@/lib/auth';
import { buildMetadata } from '@/lib/seo';

export const metadata = buildMetadata({
  title: 'BaZi 2-Hour Scoring',
  description: 'Member-only BaZi 2-hour scoring for today, with saved birth profile support and hourly career, wealth, love, and health scores.',
  path: '/hourly',
  keywords: ['bazi hourly score', 'two hour score', 'member-only ba zi', 'today scoring', 'hourly fortune'],
});

export default async function HourlyScoringPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    redirect('/api/auth/signin?callbackUrl=/hourly');
  }

  return (
    <main className="px-4 pb-16 pt-5 sm:px-6 sm:pt-7 lg:px-8">
      <section className="mx-auto max-w-7xl">
        <div className="flex justify-start">
          <Link href="/calculator" className="inline-flex rounded-full bg-white/70 px-4 py-2 text-sm text-[#16302d] shadow-[inset_0_0_0_1px_rgba(13,93,86,0.08)] transition hover:bg-white/88">
            Back to Calculator
          </Link>
        </div>
        <div className="mt-10 grid gap-8 lg:grid-cols-[minmax(0,1.2fr)_minmax(280px,0.8fr)] lg:items-end">
          <div className="relative pr-4 lg:pr-12">
            <div className="absolute -left-2 top-2 hidden h-20 w-20 rounded-full bg-[radial-gradient(circle,rgba(145,242,228,0.22),transparent_72%)] lg:block" />
            <div className="text-[11px] uppercase tracking-[0.32em] text-[#0d5d56]/62">Celestial Editorial</div>
            <h1 className="mt-3 max-w-4xl font-serif text-[2.8rem] leading-[0.98] tracking-[-0.04em] text-[#16302d] sm:text-[4.4rem]">
              BaZi 2-Hour Scoring for Today
            </h1>
            <p className="mt-5 max-w-2xl text-sm leading-8 text-[#35514d] sm:text-[15px]">
              A calmer reading surface for today&apos;s hourly career, wealth, love, and health flow. Your saved profile, timing layers, and slot-by-slot scoring remain live and unchanged underneath.
            </p>
            <div className="mt-7 flex flex-wrap gap-3 text-[11px] uppercase tracking-[0.18em] text-[#5b6f6d]">
              <span className="rounded-full bg-white/70 px-4 py-2 shadow-[inset_0_0_0_1px_rgba(13,93,86,0.06)]">Profile-led</span>
              <span className="rounded-full bg-white/58 px-4 py-2 shadow-[inset_0_0_0_1px_rgba(13,93,86,0.05)]">Timing context</span>
              <span className="rounded-full bg-white/50 px-4 py-2 shadow-[inset_0_0_0_1px_rgba(13,93,86,0.04)]">Editorial scoring view</span>
            </div>
          </div>
          <div className="relative overflow-hidden rounded-[2.4rem] bg-[linear-gradient(165deg,rgba(233,247,243,0.82),rgba(255,255,255,0.94)_56%,rgba(244,251,250,0.96))] px-6 py-6 shadow-[0_26px_54px_rgba(13,93,86,0.07)]">
            <div className="absolute -right-8 -top-8 h-28 w-28 rounded-full bg-[radial-gradient(circle,rgba(145,242,228,0.28),transparent_72%)]" />
            <div className="text-[11px] uppercase tracking-[0.24em] text-[#5b6f6d]">Reading frame</div>
            <div className="mt-4 space-y-4">
              <div>
                <div className="text-xs uppercase tracking-[0.18em] text-[#5b6f6d]">Context</div>
                <p className="mt-2 text-sm leading-7 text-[#35514d]">Saved profile and timing layers anchor the reading before the slots appear.</p>
              </div>
              <div className="grid gap-3 text-sm text-[#35514d] sm:grid-cols-2">
                <div className="rounded-[1.4rem] bg-white/70 px-4 py-3 shadow-[inset_0_0_0_1px_rgba(13,93,86,0.05)]">Saved birth profile</div>
                <div className="rounded-[1.4rem] bg-white/58 px-4 py-3 shadow-[inset_0_0_0_1px_rgba(13,93,86,0.04)]">Da Yun, year, month, day stack</div>
                <div className="rounded-[1.4rem] bg-white/64 px-4 py-3 shadow-[inset_0_0_0_1px_rgba(13,93,86,0.05)]">Desktop editorial table</div>
                <div className="rounded-[1.4rem] bg-white/52 px-4 py-3 shadow-[inset_0_0_0_1px_rgba(13,93,86,0.04)]">Mobile slot summaries</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <HourlyScoringPanel />
    </main>
  );
}
