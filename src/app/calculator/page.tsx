import Link from 'next/link';

import BaziCalculator from '@/components/BaziCalculator';
import Badge from '@/components/ui/Badge';
import { buttonClassName } from '@/components/ui/Button';
import { buildMetadata } from '@/lib/seo';

export const metadata = buildMetadata({
  title: 'Enter Your Birth Information',
  description:
    'Enter your birth date, time, place, and calculation preferences to generate a BaZi chart with true solar time handling and optional AI analysis.',
  path: '/calculator',
  keywords: [
    'bazi calculator',
    'birth information',
    'four pillars chart',
    'day master analysis',
    'ba zi birth chart',
  ],
});

export default function CalculatorPage() {
  return (
    <main className="px-4 pb-16 pt-8 sm:px-6 sm:pt-10 lg:px-8">
      <section className="mx-auto max-w-3xl text-center">
        <div className="rounded-[2.5rem] bg-[linear-gradient(135deg,rgba(255,255,255,0.78),rgba(255,255,255,0.62)_54%,rgba(240,250,255,0.72))] px-6 py-8 shadow-[0_28px_72px_rgba(0,106,98,0.08)] backdrop-blur-[24px] sm:px-10 sm:py-10">
          <div className="flex flex-wrap items-center justify-center gap-3">
            <Badge tone="cyan">Focused intake</Badge>
            <Link href="/" className={buttonClassName('ghost', 'sm')}>
              Back to Home
            </Link>
          </div>
          <h1 className="mt-5 font-serif text-4xl tracking-[-0.03em] text-[#151d22] sm:text-[3.25rem]">
            Enter Your Birth Information
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-base leading-8 text-[#151d22]/66">
            Fill in the same details as before to calculate your chart. Your birth data stays in
            this dedicated workspace, and the full result flow continues below once the chart is
            generated.
          </p>
        </div>
      </section>

      <BaziCalculator />
    </main>
  );
}
