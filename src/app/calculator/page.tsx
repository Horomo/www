import Link from 'next/link';

import BaziCalculator from '@/components/BaziCalculator';
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
    <main className="px-4 pb-14 pt-6 sm:px-6 sm:pt-8 lg:px-8">
      <section className="mx-auto max-w-4xl">
        <div className="flex justify-start">
          <Link href="/" className={buttonClassName('ghost', 'sm')}>
            Back to Home
          </Link>
        </div>
        <div className="mt-6 text-center">
          <h1 className="font-serif text-4xl tracking-[-0.03em] text-[#151d22] sm:text-[3.1rem]">
            Enter Your Birth Information
          </h1>
          <p className="mx-auto mt-3 max-w-xl text-sm leading-7 text-[#151d22]/64 sm:text-base">
            Complete the four short steps below to generate your chart. Your inputs stay in this
            focused calculator flow.
          </p>
        </div>
      </section>

      <BaziCalculator />
    </main>
  );
}
