import { getTranslations, setRequestLocale } from 'next-intl/server';

import { Link } from '@/i18n/navigation';

import Breadcrumbs from '@/components/Breadcrumbs';
import LearnGuideCard from '@/components/LearnGuideCard';
import StructuredData from '@/components/StructuredData';
import Badge from '@/components/ui/Badge';
import { buttonClassName } from '@/components/ui/Button';
import GlowCard from '@/components/ui/GlowCard';
import { learnGuides } from '@/lib/learn';
import { buildBreadcrumbSchema, buildMetadata } from '@/lib/seo';

type LearnHubPageProps = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: LearnHubPageProps) {
  const { locale } = await params;
  return buildMetadata({
    title: 'BaZi Guides and Glossary',
    description:
      'Explore Horomo guides on BaZi charts, Day Master, Ten Gods, hidden stems, element distribution, and Da Yun luck pillars.',
    path: '/learn',
    locale,
    keywords: ['bazi guides', 'bazi glossary', 'day master', 'ten gods', 'luck pillars'],
  });
}

export default async function LearnHubPage({ params }: LearnHubPageProps) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('learn');
  const breadcrumbItems = [
    { name: 'Home', href: '/' },
    { name: 'Learn' },
  ];

  return (
    <main>
      <StructuredData
        data={buildBreadcrumbSchema([
          { name: 'Home', path: '/' },
          { name: 'Learn', path: '/learn' },
        ])}
      />
      <section className="border-b border-white/8">
        <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6 lg:px-8">
          <Breadcrumbs items={breadcrumbItems} />
          <Badge tone="violet" className="mt-6">Learning vault</Badge>
          <h1 className="mt-4 text-4xl font-semibold tracking-tight text-white">
            {t('h1')}
          </h1>
          <p className="mt-4 max-w-3xl text-lg leading-8 text-slate-300">
            This hub supports the calculator with practical explanations of the core concepts people
            search for before and after running a chart.
          </p>
          <div className="mt-8 grid gap-4 md:grid-cols-3">
            {[
              'Use the calculator first, then bring your chart into the guide that matches your question.',
              'Each article stays grounded in the app’s real output instead of generic fortune-telling language.',
              'The visual system matches the main app, so moving between education and analysis feels seamless.',
            ].map((copy, index) => (
              <GlowCard key={copy} accent={index === 0 ? 'cyan' : index === 1 ? 'violet' : 'gold'} className="p-5">
                <p className="text-sm leading-7 text-slate-300">{copy}</p>
              </GlowCard>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-14 sm:px-6 lg:px-8">
        <div className="mb-8 flex items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-semibold text-white">Guide cards</h2>
            <p className="mt-2 text-sm leading-7 text-slate-300">
              Browse concept-focused entries with quick visual cues and direct calls to continue reading.
            </p>
          </div>
          <Link href="/#calculator" className={buttonClassName('secondary', 'sm')}>
            Open calculator
          </Link>
        </div>
        <div className="grid gap-6 md:grid-cols-2">
          {learnGuides.map((guide, index) => (
            <LearnGuideCard key={guide.slug} guide={guide} index={index} />
          ))}
        </div>
      </section>
    </main>
  );
}
