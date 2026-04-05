import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import Breadcrumbs from '@/components/Breadcrumbs';
import StructuredData from '@/components/StructuredData';
import { getLearnGuide, learnGuides } from '@/lib/learn';
import {
  buildArticleSchema,
  buildBreadcrumbSchema,
  buildMetadata,
} from '@/lib/seo';

type LearnGuidePageProps = {
  params: Promise<{ slug: string }>;
};

export async function generateStaticParams() {
  return learnGuides.map((guide) => ({ slug: guide.slug }));
}

export async function generateMetadata({ params }: LearnGuidePageProps): Promise<Metadata> {
  const { slug } = await params;
  const guide = getLearnGuide(slug);

  if (!guide) {
    return buildMetadata({
      title: 'Guide not found',
      description: 'The requested guide could not be found.',
      path: '/learn',
      noIndex: true,
    });
  }

  return buildMetadata({
    title: guide.title,
    description: guide.description,
    path: guide.href,
    keywords: guide.keywords,
    type: 'article',
  });
}

export default async function LearnGuidePage({ params }: LearnGuidePageProps) {
  const { slug } = await params;
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
    <main className="bg-slate-50">
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

      <article className="mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8">
        <Breadcrumbs items={breadcrumbItems} />
        <header className="mt-4 rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-indigo-600">
            Horomo Learn
          </p>
          <h1 className="mt-3 text-4xl font-semibold tracking-tight text-slate-900">
            {guide.title}
          </h1>
          <p className="mt-4 text-lg leading-8 text-slate-600">{guide.description}</p>
        </header>

        <div className="mt-8 space-y-8">
          {guide.sections.map((section) => (
            <section
              key={section.heading}
              className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm"
            >
              <h2 className="text-2xl font-semibold text-slate-900">{section.heading}</h2>
              <div className="mt-4 space-y-4 text-base leading-8 text-slate-700">
                {section.paragraphs.map((paragraph) => (
                  <p key={paragraph}>{paragraph}</p>
                ))}
              </div>
              {section.bullets ? (
                <ul className="mt-5 space-y-3 text-base leading-7 text-slate-700">
                  {section.bullets.map((bullet) => (
                    <li key={bullet} className="flex gap-3">
                      <span className="mt-2 h-2 w-2 rounded-full bg-indigo-600" aria-hidden="true" />
                      <span>{bullet}</span>
                    </li>
                  ))}
                </ul>
              ) : null}
            </section>
          ))}
        </div>

        <aside className="mt-8 rounded-3xl border border-slate-200 bg-indigo-50 p-8">
          <h2 className="text-2xl font-semibold text-slate-900">Continue learning</h2>
          <p className="mt-3 max-w-2xl text-base leading-8 text-slate-700">
            Pair this guide with the calculator and related topics so you can connect the concept
            to a real chart and keep exploring the surrounding structure.
          </p>
          <div className="mt-5 flex flex-wrap gap-4">
            <Link href="/#calculator" className="font-semibold text-indigo-700 hover:text-indigo-800">
              Open the calculator
            </Link>
            <Link href="/learn" className="font-semibold text-indigo-700 hover:text-indigo-800">
              Browse all guides
            </Link>
          </div>
          <div className="mt-6 grid gap-4 md:grid-cols-3">
            {relatedGuides.map((relatedGuide) => (
              <article key={relatedGuide.slug} className="rounded-2xl border border-indigo-100 bg-white p-4">
                <h3 className="text-base font-semibold text-slate-900">
                  <Link href={relatedGuide.href} className="transition-colors hover:text-indigo-700">
                    {relatedGuide.title}
                  </Link>
                </h3>
                <p className="mt-2 text-sm leading-6 text-slate-600">{relatedGuide.excerpt}</p>
              </article>
            ))}
          </div>
        </aside>
      </article>
    </main>
  );
}
