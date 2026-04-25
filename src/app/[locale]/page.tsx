import { getTranslations, setRequestLocale } from 'next-intl/server';

import { Link } from '@/i18n/navigation';

import GuideArtwork from '@/components/GuideArtwork';
import LearnGuideCard from '@/components/LearnGuideCard';
import StructuredData from '@/components/StructuredData';
import Badge from '@/components/ui/Badge';
import GlowCard from '@/components/ui/GlowCard';
import { buttonClassName } from '@/components/ui/Button';
import { learnGuides } from '@/lib/learn';
import { buildFaqSchema, buildMetadata } from '@/lib/seo';

type HomePageProps = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: HomePageProps) {
  const { locale } = await params;
  return buildMetadata({
    title: 'BaZi Calculator & Four Pillars Chart',
    description:
      'Use Horomo to calculate a BaZi chart with true solar time, Day Master analysis, Ten Gods, hidden stems, element distribution, and Da Yun luck pillars.',
    path: '/',
    locale,
    keywords: [
      'bazi calculator',
      'bazi chart',
      'four pillars calculator',
      'chinese astrology calculator',
      'bazi reading',
    ],
  });
}

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

export default async function Home({ params }: HomePageProps) {
  const { locale } = await params;
  setRequestLocale(locale);
  const tHome = await getTranslations('home');
  const tCommon = await getTranslations('common');

  return (
    <main>
      <StructuredData data={buildFaqSchema(homeFaqs)} />

      <section className="relative overflow-hidden">
        <div className="absolute inset-0 cosmic-grid opacity-30" aria-hidden="true" />
        <div className="absolute inset-x-0 top-0 h-[26rem] bg-[radial-gradient(circle_at_20%_20%,rgba(64,224,208,0.22),transparent_32%),radial-gradient(circle_at_82%_8%,rgba(255,183,194,0.28),transparent_28%),linear-gradient(135deg,rgba(255,255,255,0.48),transparent_65%)]" aria-hidden="true" />
        <div className="mx-auto grid max-w-7xl gap-10 px-4 pb-12 pt-14 sm:px-6 lg:grid-cols-[minmax(0,1fr)_360px] lg:px-8 lg:pb-18 lg:pt-22">
          <div>
            <Badge tone="cyan">Four Pillars of Destiny</Badge>
            <h1 className="mt-6 max-w-4xl font-serif text-5xl leading-[0.95] tracking-[-0.03em] text-[#151d22] sm:text-6xl lg:text-[5.2rem]">
              {tHome('h1')}
            </h1>
            <p className="mt-8 max-w-3xl text-lg leading-8 text-[#151d22]/72">
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
              <Link href="/calculator" className={buttonClassName('primary', 'lg')}>
                {tCommon('startAnalysis')}
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
                  <h2 className="font-serif text-[1.45rem] leading-tight text-[#151d22]">{title}</h2>
                  <p className="mt-3 text-sm leading-7 text-[#151d22]/66">{copy}</p>
                </GlowCard>
              ))}
            </div>
          </div>

          <GlowCard accent="gold" className="p-6 sm:p-7 lg:mt-8">
            <GuideArtwork seed={9} className="animate-float-slow" />
            <h2 className="mt-6 font-serif text-[1.65rem] text-[#151d22]">What you can inspect here</h2>
            <ul className="mt-4 space-y-3 text-sm leading-7 text-[#151d22]/68">
              <li>Four Pillars chart with visible stem and branch breakdown.</li>
              <li>Day Master summary tied to the computed chart.</li>
              <li>Hidden stems and Ten Gods pattern visibility.</li>
              <li>Element distribution across visible and hidden layers.</li>
              <li>Da Yun timing context for major luck pillars.</li>
            </ul>
            <div className="cosmic-divider mt-6" />
            <p className="mt-5 text-sm leading-7 text-[#151d22]/58">
              The experience stays readable and structured, but the presentation now builds
              anticipation before the reveal and reward once the chart is generated.
            </p>
          </GlowCard>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
        <div className="grid gap-6 md:grid-cols-3">
          <GlowCard accent="cyan" interactive className="p-6">
            <h2 className="font-serif text-[1.7rem] text-[#151d22]">Built for chart accuracy</h2>
            <p className="mt-3 text-sm leading-7 text-[#151d22]/66">
              True solar time handling helps keep the chart stable around boundary cases where a
              timezone or daylight saving adjustment can change the pillar output.
            </p>
          </GlowCard>
          <GlowCard accent="violet" interactive className="p-6">
            <h2 className="font-serif text-[1.7rem] text-[#151d22]">Readable analysis layers</h2>
            <p className="mt-3 text-sm leading-7 text-[#151d22]/66">
              The calculator keeps the core tables visible so Day Master, hidden stems, Ten Gods,
              and element summaries stay tied to the source chart instead of generic text.
            </p>
          </GlowCard>
          <GlowCard accent="pink" interactive className="p-6">
            <h2 className="font-serif text-[1.7rem] text-[#151d22]">Ready for deeper learning</h2>
            <p className="mt-3 text-sm leading-7 text-[#151d22]/66">
              The learn hub covers the exact informational topics users search for before and after
              using a BaZi calculator.
            </p>
          </GlowCard>
        </div>
      </section>

      <section className="px-4 py-8 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-5xl">
          <div className="rounded-[2.5rem] bg-[linear-gradient(135deg,rgba(255,255,255,0.78),rgba(255,255,255,0.62)_54%,rgba(240,250,255,0.72))] px-6 py-8 text-center shadow-[0_28px_72px_rgba(0,106,98,0.08)] backdrop-blur-[24px] sm:px-10 sm:py-10">
            <Badge tone="cyan">Start your chart</Badge>
            <h2 className="mt-4 font-serif text-4xl tracking-[-0.03em] text-[#151d22] sm:text-[3rem]">
              Begin your BaZi analysis on a dedicated calculator page
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-base leading-8 text-[#151d22]/66">
              The full birth intake, chart generation flow, and optional AI reading now live in a
              focused workspace designed for uninterrupted analysis.
            </p>
            <div className="mt-8 flex justify-center">
              <Link href="/calculator" className={buttonClassName('primary', 'lg')}>
                {tCommon('startAnalysis')}
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
        <div className="flex items-end justify-between gap-6">
          <div>
            <Badge tone="violet">Learn the system</Badge>
            <h2 className="mt-4 font-serif text-4xl tracking-[-0.02em] text-[#151d22]">
              Learn how to read the chart
            </h2>
            <p className="mt-3 max-w-3xl text-base leading-8 text-[#151d22]/66">
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

      <section className="mt-8">
        <div className="mx-auto max-w-4xl px-4 py-14 sm:px-6 lg:px-8">
          <h2 className="font-serif text-4xl tracking-[-0.02em] text-[#151d22]">BaZi calculator FAQ</h2>
          <div className="mt-8 space-y-4">
            {homeFaqs.map((item) => (
              <details key={item.question} className="rounded-[24px] bg-[linear-gradient(135deg,rgba(255,255,255,0.78),rgba(255,255,255,0.56))] p-5 shadow-[0_18px_44px_rgba(0,106,98,0.06)] backdrop-blur-[18px]">
                <summary className="cursor-pointer text-lg font-semibold text-[#151d22]">
                  {item.question}
                </summary>
                <p className="mt-3 text-base leading-8 text-[#151d22]/66">{item.answer}</p>
              </details>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
