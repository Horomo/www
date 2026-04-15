import type { Metadata } from 'next';

const DEFAULT_SITE_URL = 'http://localhost:3000';

export const siteConfig = {
  name: 'Horomo',
  shortName: 'Horomo',
  locale: 'en_US',
  description:
    'Horomo is a BaZi calculator for Four Pillars charts, Day Master analysis, Ten Gods, hidden stems, element distribution, and Da Yun luck pillars.',
};

function normalizeSiteUrl(rawUrl: string): URL {
  if (/^https?:\/\//i.test(rawUrl)) {
    return new URL(rawUrl);
  }

  return new URL(`https://${rawUrl}`);
}

export function getSiteUrl(): URL {
  const rawUrl =
    process.env.SITE_URL ||
    process.env.VERCEL_PROJECT_PRODUCTION_URL ||
    DEFAULT_SITE_URL;

  return normalizeSiteUrl(rawUrl);
}

export function absoluteUrl(path = '/'): string {
  return new URL(path, getSiteUrl()).toString();
}

type MetadataOptions = {
  title: string;
  description: string;
  path?: string;
  keywords?: string[];
  noIndex?: boolean;
  type?: 'website' | 'article';
};

export function buildMetadata({
  title,
  description,
  path = '/',
  keywords,
  noIndex = false,
  type = 'website',
}: MetadataOptions): Metadata {
  const canonical = absoluteUrl(path);

  return {
    metadataBase: getSiteUrl(),
    title,
    description,
    keywords,
    alternates: {
      canonical,
    },
    openGraph: {
      type,
      url: canonical,
      title,
      description,
      siteName: siteConfig.name,
      locale: siteConfig.locale,
      images: [
        {
          url: absoluteUrl('/opengraph-image'),
          width: 1200,
          height: 630,
          alt: `${siteConfig.name} preview`,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [absoluteUrl('/twitter-image')],
    },
    robots: noIndex
      ? {
          index: false,
          follow: false,
          nocache: true,
          googleBot: {
            index: false,
            follow: false,
            noimageindex: true,
          },
        }
      : {
          index: true,
          follow: true,
          googleBot: {
            index: true,
            follow: true,
            'max-image-preview': 'large',
            'max-snippet': -1,
            'max-video-preview': -1,
          },
        },
  };
}

type Thing = Record<string, unknown>;

export function buildOrganizationSchema(): Thing {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: siteConfig.name,
    url: absoluteUrl('/'),
    logo: absoluteUrl('/favicon.ico'),
    description: siteConfig.description,
  };
}

export function buildWebsiteSchema(): Thing {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: siteConfig.name,
    url: absoluteUrl('/'),
    description: siteConfig.description,
    inLanguage: 'en',
  };
}

export function buildBreadcrumbSchema(items: Array<{ name: string; path: string }>): Thing {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: absoluteUrl(item.path),
    })),
  };
}

export function buildArticleSchema(input: {
  headline: string;
  description: string;
  path: string;
  datePublished: string;
  dateModified: string;
}): Thing {
  return {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: input.headline,
    description: input.description,
    mainEntityOfPage: absoluteUrl(input.path),
    url: absoluteUrl(input.path),
    datePublished: input.datePublished,
    dateModified: input.dateModified,
    author: {
      '@type': 'Organization',
      name: siteConfig.name,
    },
    publisher: {
      '@type': 'Organization',
      name: siteConfig.name,
      logo: {
        '@type': 'ImageObject',
        url: absoluteUrl('/favicon.ico'),
      },
    },
    image: absoluteUrl('/opengraph-image'),
  };
}

export function buildFaqSchema(
  questions: Array<{ question: string; answer: string }>,
): Thing {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: questions.map((item) => ({
      '@type': 'Question',
      name: item.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: item.answer,
      },
    })),
  };
}
