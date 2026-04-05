import Link from 'next/link';

import BaziCalculator from '@/components/BaziCalculator';
import StructuredData from '@/components/StructuredData';
import { learnGuides } from '@/lib/learn';
import { buildFaqSchema, buildMetadata } from '@/lib/seo';

export const metadata = buildMetadata({
  title: 'BaZi Calculator & Four Pillars Chart',
  description:
    'Use Horomo to calculate a BaZi chart with true solar time, Day Master analysis, Ten Gods, hidden stems, element distribution, and Da Yun luck pillars.',
  path: '/',
  keywords: [
    'bazi calculator',
    'bazi chart',
    'four pillars calculator',
    'chinese astrology calculator',
    'bazi reading',
  ],
});

const homeFaqs = [
  {
    question: 'What does this BaZi calculator show?',
    answer:
      'Horomo calculates the Four Pillars chart and shows the Day Master, visible stems, hidden stems, Ten Gods distribution, element distribution, and Da Yun luck pillars.',
  },
  {
    question: 'Why does birth place matter in a BaZi chart?',
    answer:
      'Birth place determines the timezone and local solar correction. Those values matter when the recorded birth time is close to a pillar boundary.',
  },
  {
    question: 'Can I use the calculator if I do not know my birth time?',
    answer:
      'Yes. Horomo can calculate the year, month, and day pillars without the hour pillar, and it marks the time-dependent areas as unknown.',
  },
  {
    question: 'What should I read after I generate my chart?',
    answer:
      'Start with the Day Master, then review hidden stems, Ten Gods, element distribution, and the current or upcoming luck pillars to understand the chart in context.',
  },
];

export default function Home() {
  return (
    <main className="bg-slate-50">
      <StructuredData data={buildFaqSchema(homeFaqs)} />

      <section className="border-b border-slate-200 bg-white">
        <div className="mx-auto grid max-w-6xl gap-10 px-4 py-14 sm:px-6 lg:grid-cols-[minmax(0,1fr)_320px] lg:px-8">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-indigo-600">
              Four Pillars of Destiny
            </p>
            <h1 className="mt-4 max-w-3xl text-4xl font-semibold tracking-tight text-slate-900 sm:text-5xl">
              BaZi calculator for Day Master, Ten Gods, hidden stems, and Da Yun cycles
            </h1>
            <p className="mt-6 max-w-3xl text-lg leading-8 text-slate-600">
              Horomo is built for people who want more than a basic BaZi chart. It calculates the
              Four Pillars with true solar time handling, then surfaces the chart structure you need
              to read Day Master context, element distribution, hidden stems, and major luck cycles.
            </p>
            <div className="mt-8 flex flex-wrap gap-4">
              <Link
                href="/#calculator"
                className="rounded-full bg-indigo-600 px-5 py-3 font-semibold text-white transition-colors hover:bg-indigo-700"
              >
                Open the calculator
              </Link>
              <Link
                href="/learn"
                className="rounded-full border border-slate-300 px-5 py-3 font-semibold text-slate-700 transition-colors hover:border-slate-400 hover:text-slate-900"
              >
                Learn the core concepts
              </Link>
            </div>
          </div>

          <aside className="rounded-3xl border border-slate-200 bg-slate-50 p-6">
            <h2 className="text-lg font-semibold text-slate-900">What you can inspect here</h2>
            <ul className="mt-4 space-y-3 text-sm leading-7 text-slate-700">
              <li>Four Pillars chart with visible stem and branch breakdown.</li>
              <li>Day Master summary tied to the computed chart.</li>
              <li>Hidden stems and Ten Gods pattern visibility.</li>
              <li>Element distribution across visible and hidden layers.</li>
              <li>Da Yun timing context for major luck pillars.</li>
            </ul>
          </aside>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid gap-6 md:grid-cols-3">
          <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-semibold text-slate-900">Built for chart accuracy</h2>
            <p className="mt-3 text-sm leading-7 text-slate-600">
              True solar time handling helps keep the chart stable around boundary cases where a
              timezone or daylight saving adjustment can change the pillar output.
            </p>
          </article>
          <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-semibold text-slate-900">Readable analysis layers</h2>
            <p className="mt-3 text-sm leading-7 text-slate-600">
              The calculator keeps the core tables visible so Day Master, hidden stems, Ten Gods,
              and element summaries stay tied to the source chart instead of generic text.
            </p>
          </article>
          <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-semibold text-slate-900">Ready for deeper learning</h2>
            <p className="mt-3 text-sm leading-7 text-slate-600">
              The learn hub covers the exact informational topics users search for before and after
              using a BaZi calculator.
            </p>
          </article>
        </div>
      </section>

      <section id="calculator">
        <BaziCalculator />
      </section>

      <section className="mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="flex items-end justify-between gap-6">
          <div>
            <h2 className="text-3xl font-semibold tracking-tight text-slate-900">
              Learn how to read the chart
            </h2>
            <p className="mt-3 max-w-3xl text-base leading-8 text-slate-600">
              These guides are designed to support high-intent searches and help visitors understand
              the chart after they calculate it.
            </p>
          </div>
          <Link href="/learn" className="font-semibold text-indigo-700 hover:text-indigo-800">
            View all guides
          </Link>
        </div>

        <div className="mt-8 grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {learnGuides.map((guide) => (
            <article key={guide.slug} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <h3 className="text-xl font-semibold text-slate-900">
                <Link href={guide.href} className="transition-colors hover:text-indigo-700">
                  {guide.title}
                </Link>
              </h3>
              <p className="mt-3 text-sm leading-7 text-slate-600">{guide.excerpt}</p>
              <div className="mt-5">
                <Link href={guide.href} className="font-semibold text-indigo-700 hover:text-indigo-800">
                  Read guide
                </Link>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="border-t border-slate-200 bg-white">
        <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-semibold tracking-tight text-slate-900">BaZi calculator FAQ</h2>
          <div className="mt-8 space-y-4">
            {homeFaqs.map((item) => (
              <details key={item.question} className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
                <summary className="cursor-pointer text-lg font-semibold text-slate-900">
                  {item.question}
                </summary>
                <p className="mt-3 text-base leading-8 text-slate-600">{item.answer}</p>
              </details>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
