import Link from 'next/link';

import BaziCalculator from '@/components/BaziCalculator';
import GuideArtwork from '@/components/GuideArtwork';
import LearnGuideCard from '@/components/LearnGuideCard';
import StructuredData from '@/components/StructuredData';
import Badge from '@/components/ui/Badge';
import GlowCard from '@/components/ui/GlowCard';
import { buttonClassName } from '@/components/ui/Button';
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
    <main>
      <StructuredData data={buildFaqSchema(homeFaqs)} />

      <section className="relative overflow-hidden border-b border-white/8">
        <div className="absolute inset-0 cosmic-grid opacity-20" aria-hidden="true" />
        <div className="mx-auto grid max-w-7xl gap-10 px-4 py-16 sm:px-6 lg:grid-cols-[minmax(0,1fr)_360px] lg:px-8 lg:py-24">
          <div>
            <Badge tone="cyan">Four Pillars of Destiny</Badge>
            <h1 className="mt-5 max-w-4xl text-4xl font-semibold tracking-tight text-white sm:text-5xl lg:text-6xl">
              BaZi calculator for Day Master, Ten Gods, hidden stems, and Da Yun cycles
            </h1>
            <p className="mt-6 max-w-3xl text-lg leading-8 text-slate-300">
              Horomo is built for people who want more than a basic BaZi chart. It calculates the
              Four Pillars with true solar time handling, then surfaces the chart structure you need
              to read Day Master context, element distribution, hidden stems, and major luck cycles.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Badge tone="violet">Immersive chart flow</Badge>
              <Badge tone="pink">True solar time engine</Badge>
              <Badge tone="gold">AI reading unlock</Badge>
            </div>
            <div className="mt-8 flex flex-wrap gap-4">
              <Link href="/#calculator" className={buttonClassName('primary', 'lg')}>
                Open the calculator
              </Link>
              <Link href="/learn" className={buttonClassName('secondary', 'lg')}>
                Learn the core concepts
              </Link>
            </div>
            <div className="mt-10 grid gap-4 sm:grid-cols-3">
              {[
                ['Guided onboarding', 'A step-by-step ritual that reduces form fatigue and keeps every field intact.'],
                ['Character profile results', 'Pillars, hidden stems, and Ten Gods re-framed as layered profile cards.'],
                ['Journey timing view', 'Luck cycles presented as a navigable path with the current decade highlighted.'],
              ].map(([title, copy], index) => (
                <GlowCard key={title} accent={index === 0 ? 'cyan' : index === 1 ? 'violet' : 'pink'} className="p-5">
                  <h2 className="text-lg font-semibold text-white">{title}</h2>
                  <p className="mt-3 text-sm leading-7 text-slate-300">{copy}</p>
                </GlowCard>
              ))}
            </div>
          </div>

          <GlowCard accent="gold" className="p-6 sm:p-7 lg:mt-8">
            <GuideArtwork seed={9} className="animate-float-slow" />
            <h2 className="mt-6 text-lg font-semibold text-white">What you can inspect here</h2>
            <ul className="mt-4 space-y-3 text-sm leading-7 text-slate-300">
              <li>Four Pillars chart with visible stem and branch breakdown.</li>
              <li>Day Master summary tied to the computed chart.</li>
              <li>Hidden stems and Ten Gods pattern visibility.</li>
              <li>Element distribution across visible and hidden layers.</li>
              <li>Da Yun timing context for major luck pillars.</li>
            </ul>
            <div className="cosmic-divider mt-6" />
            <p className="mt-5 text-sm leading-7 text-slate-400">
              The experience stays readable and structured, but the presentation now builds
              anticipation before the reveal and reward once the chart is generated.
            </p>
          </GlowCard>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
        <div className="grid gap-6 md:grid-cols-3">
          <GlowCard accent="cyan" interactive className="p-6">
            <h2 className="text-xl font-semibold text-white">Built for chart accuracy</h2>
            <p className="mt-3 text-sm leading-7 text-slate-300">
              True solar time handling helps keep the chart stable around boundary cases where a
              timezone or daylight saving adjustment can change the pillar output.
            </p>
          </GlowCard>
          <GlowCard accent="violet" interactive className="p-6">
            <h2 className="text-xl font-semibold text-white">Readable analysis layers</h2>
            <p className="mt-3 text-sm leading-7 text-slate-300">
              The calculator keeps the core tables visible so Day Master, hidden stems, Ten Gods,
              and element summaries stay tied to the source chart instead of generic text.
            </p>
          </GlowCard>
          <GlowCard accent="pink" interactive className="p-6">
            <h2 className="text-xl font-semibold text-white">Ready for deeper learning</h2>
            <p className="mt-3 text-sm leading-7 text-slate-300">
              The learn hub covers the exact informational topics users search for before and after
              using a BaZi calculator.
            </p>
          </GlowCard>
        </div>
      </section>

      <section id="calculator">
        <BaziCalculator />
      </section>

      <section className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
        <div className="flex items-end justify-between gap-6">
          <div>
            <Badge tone="violet">Learn the system</Badge>
            <h2 className="mt-4 text-3xl font-semibold tracking-tight text-white">
              Learn how to read the chart
            </h2>
            <p className="mt-3 max-w-3xl text-base leading-8 text-slate-300">
              These guides are designed to support high-intent searches and help visitors understand
              the chart after they calculate it.
            </p>
          </div>
          <Link href="/learn" className={buttonClassName('secondary', 'sm')}>
            View all guides
          </Link>
        </div>

        <div className="mt-8 grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {learnGuides.map((guide, index) => (
            <LearnGuideCard key={guide.slug} guide={guide} index={index} />
          ))}
        </div>
      </section>

      <section className="border-t border-white/8 bg-slate-950/35">
        <div className="mx-auto max-w-4xl px-4 py-14 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-semibold tracking-tight text-white">BaZi calculator FAQ</h2>
          <div className="mt-8 space-y-4">
            {homeFaqs.map((item) => (
              <details key={item.question} className="rounded-[24px] border border-white/10 bg-white/6 p-5 backdrop-blur-sm">
                <summary className="cursor-pointer text-lg font-semibold text-white">
                  {item.question}
                </summary>
                <p className="mt-3 text-base leading-8 text-slate-300">{item.answer}</p>
              </details>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
