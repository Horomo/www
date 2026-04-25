import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { setRequestLocale } from 'next-intl/server';

import { Link } from '@/i18n/navigation';

import Breadcrumbs from '@/components/Breadcrumbs';
import LearnGuideCard from '@/components/LearnGuideCard';
import StructuredData from '@/components/StructuredData';
import Badge from '@/components/ui/Badge';
import GlowCard from '@/components/ui/GlowCard';
import { buttonClassName } from '@/components/ui/Button';
import { routing } from '@/i18n/routing';
import { getLearnGuide, learnGuides } from '@/lib/learn';
import {
  buildArticleSchema,
  buildBreadcrumbSchema,
  buildMetadata,
} from '@/lib/seo';

type LearnGuidePageProps = {
  params: Promise<{ slug: string; locale: string }>;
};

export async function generateStaticParams() {
  const slugs = learnGuides.map((guide) => guide.slug);
  return routing.locales.flatMap((locale) =>
    slugs.map((slug) => ({ locale, slug })),
  );
}

export async function generateMetadata({ params }: LearnGuidePageProps): Promise<Metadata> {
  const { slug, locale } = await params;
  const guide = getLearnGuide(slug);

  if (!guide) {
    return buildMetadata({
      title: 'Guide not found',
      description: 'The requested guide could not be found.',
      path: '/learn',
      locale,
      noIndex: true,
    });
  }

  return buildMetadata({
    title: guide.title,
    description: guide.description,
    path: guide.href,
    locale,
    keywords: guide.keywords,
    type: 'article',
  });
}

export default async function LearnGuidePage({ params }: LearnGuidePageProps) {
  const { slug, locale } = await params;
  setRequestLocale(locale);
  const guide = getLearnGuide(slug);

  if (!guide) {
    notFound();
  }

  const relatedGuides = learnGuides.filter((item) => item.slug !== guide.slug).slice(0, 3);

  const breadcrumbItems = [
    { name: 'Home', href: '/' },
    { name: 'Learn', href: '/learn' },
    { name: guide.title },
  ];

  return (
    <main>
      <StructuredData
        data={[
          buildBreadcrumbSchema([
            { name: 'Home', path: '/' },
            { name: 'Learn', path: '/learn' },
            { name: guide.title, path: guide.href },
          ]),
          buildArticleSchema({
            headline: guide.title,
            description: guide.description,
            path: guide.href,
            datePublished: guide.datePublished,
            dateModified: guide.dateModified,
          }),
        ]}
      />

      <article className="mx-auto max-w-5xl px-4 py-14 sm:px-6 lg:px-8">
        <Breadcrumbs items={breadcrumbItems} />
        <header className="mt-6 rounded-[32px] border border-white/10 bg-white/6 p-8 shadow-[0_20px_60px_rgba(2,8,23,0.36)] backdrop-blur-sm">
          <Badge tone="violet">Horomo Learn</Badge>
          <h1 className="mt-4 text-4xl font-semibold tracking-tight text-white">
            {guide.title}
          </h1>
          <p className="mt-4 text-lg leading-8 text-slate-300">{guide.description}</p>
        </header>

        <div className="mt-8 space-y-8">
          {guide.sections.map((section) => (
            <GlowCard key={section.heading} accent="cyan" className="p-8">
              <h2 className="text-2xl font-semibold text-white">{section.heading}</h2>
              <div className="mt-4 space-y-4 text-base leading-8 text-slate-200">
                {section.paragraphs.map((paragraph) => (
                  <p key={paragraph}>{paragraph}</p>
                ))}
              </div>
              {section.bullets ? (
                <ul className="mt-5 space-y-3 text-base leading-7 text-slate-200">
                  {section.bullets.map((bullet) => (
                    <li key={bullet} className="flex gap-3">
                      <span className="mt-2 h-2 w-2 rounded-full bg-cyan-300" aria-hidden="true" />
                      <span>{bullet}</span>
                    </li>
                  ))}
                </ul>
              ) : null}
            </GlowCard>
          ))}
        </div>

        <aside className="mt-8 rounded-[32px] border border-white/10 bg-[linear-gradient(180deg,rgba(34,211,238,0.08),rgba(15,23,42,0.6))] p-8 backdrop-blur-sm">
          <h2 className="text-2xl font-semibold text-white">Continue learning</h2>
          <p className="mt-3 max-w-2xl text-base leading-8 text-slate-300">
            Pair this guide with the calculator and related topics so you can connect the concept
            to a real chart and keep exploring the surrounding structure.
          </p>
          <div className="mt-5 flex flex-wrap gap-4">
            <Link href="/#calculator" className={buttonClassName('primary', 'sm')}>
              Open the calculator
            </Link>
            <Link href="/learn" className={buttonClassName('secondary', 'sm')}>
              Browse all guides
            </Link>
          </div>
          <div className="mt-6 grid gap-4 md:grid-cols-3">
            {relatedGuides.map((relatedGuide, index) => (
              <LearnGuideCard key={relatedGuide.slug} guide={relatedGuide} index={index} />
            ))}
          </div>
        </aside>
      </article>
    </main>
  );
}
