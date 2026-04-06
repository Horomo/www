import CalculatorResultPage from '@/components/CalculatorResultPage';
import { buildMetadata } from '@/lib/seo';

export const metadata = buildMetadata({
  title: 'Your BaZi Result',
  description:
    'Review your full BaZi chart, Four Pillars, Ten Gods, hidden stems, structure view, and Da Yun cycles on a dedicated result page.',
  path: '/calculator/result',
  keywords: [
    'bazi result',
    'four pillars result',
    'day master chart',
    'ten gods result',
    'da yun analysis',
  ],
});

export default function CalculatorResultRoute() {
  return <CalculatorResultPage />;
}
