import { setRequestLocale } from 'next-intl/server';

import CalculatorResultPage from '@/components/CalculatorResultPage';
import { buildMetadata } from '@/lib/seo';

type ResultPageProps = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: ResultPageProps) {
  const { locale } = await params;
  return buildMetadata({
    title: 'Your BaZi Result',
    description:
      'Review your full BaZi chart, Four Pillars, Ten Gods, hidden stems, structure view, and Da Yun cycles on a dedicated result page.',
    path: '/calculator/result',
    locale,
    keywords: [
      'bazi result',
      'four pillars result',
      'day master chart',
      'ten gods result',
      'da yun analysis',
    ],
  });
}

export default async function CalculatorResultRoute({ params }: ResultPageProps) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <CalculatorResultPage />;
}
