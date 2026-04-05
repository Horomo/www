import Link from 'next/link';

import Breadcrumbs from '@/components/Breadcrumbs';
import StructuredData from '@/components/StructuredData';
import { learnGuides } from '@/lib/learn';
import { buildBreadcrumbSchema, buildMetadata } from '@/lib/seo';

export const metadata = buildMetadata({
  title: 'BaZi Guides and Glossary',
  description:
    'Explore Horomo guides on BaZi charts, Day Master, Ten Gods, hidden stems, element distribution, and Da Yun luck pillars.',
  path: '/learn',
  keywords: ['bazi guides', 'bazi glossary', 'day master', 'ten gods', 'luck pillars'],
});

export default function LearnHubPage() {
  const breadcrumbItems = [
    { name: 'Home', href: '/' },
    { name: 'Learn' },
  ];

  return (
    <main className="bg-slate-50">
      <StructuredData
        data={buildBreadcrumbSchema([
          { name: 'Home', path: '/' },
          { name: 'Learn', path: '/learn' },
        ])}
      />
      <section className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6 lg:px-8">
          <Breadcrumbs items={breadcrumbItems} />
          <h1 className="mt-4 text-4xl font-semibold tracking-tight text-slate-900">
            BaZi guides and glossary
          </h1>
          <p className="mt-4 max-w-3xl text-lg leading-8 text-slate-600">
            This hub supports the calculator with practical explanations of the core concepts people
            search for before and after running a chart.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid gap-6 md:grid-cols-2">
          {learnGuides.map((guide) => (
            <article
              key={guide.slug}
              className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
            >
              <h2 className="text-2xl font-semibold text-slate-900">
                <Link href={guide.href} className="transition-colors hover:text-indigo-700">
                  {guide.title}
                </Link>
              </h2>
              <p className="mt-3 text-sm leading-7 text-slate-600">{guide.description}</p>
              <p className="mt-4 text-sm font-medium text-slate-500">{guide.excerpt}</p>
              <div className="mt-5">
                <Link href={guide.href} className="font-semibold text-indigo-700 hover:text-indigo-800">
                  Read guide
                </Link>
              </div>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
