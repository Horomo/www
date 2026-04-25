'use client';

import { useSyncExternalStore } from 'react';
import { useTranslations } from 'next-intl';

import { Link, useRouter } from '@/i18n/navigation';
import BaziResultView from '@/components/BaziResultView';
import Button, { buttonClassName } from '@/components/ui/Button';
import GlowCard from '@/components/ui/GlowCard';
import {
  clearCalculationResult,
  loadCalculationResult,
} from '@/lib/calculation-session';

type CalculationSession = NonNullable<ReturnType<typeof loadCalculationResult>>;
const subscribeToCalculationSession = () => () => {};

export default function CalculatorResultPage() {
  const router = useRouter();
  const tCommon = useTranslations('common');
  const tResult = useTranslations('calculator.result');
  const session = useSyncExternalStore<CalculationSession | null>(
    subscribeToCalculationSession,
    loadCalculationResult,
    () => null,
  );

  function handleNewCalculation() {
    clearCalculationResult();
    router.push('/calculator');
  }

  if (!session) {
    return (
      <section className="px-4 pb-14 pt-6 sm:px-6 sm:pt-8 lg:px-8">
        <div className="mx-auto max-w-5xl">
          <div className="flex justify-start">
            <Link href="/calculator" className={buttonClassName('ghost', 'sm')}>
              {tCommon('backToCalculator')}
            </Link>
          </div>
          <GlowCard accent="violet" className="mt-6 p-8 text-center sm:p-10">
            <h1 className="font-serif text-3xl tracking-[-0.03em] text-[#151d22] sm:text-[2.6rem]">
              No chart ready yet
            </h1>
            <p className="mx-auto mt-3 max-w-xl text-sm leading-7 text-[#151d22]/64 sm:text-base">
              Start a new calculation to generate your BaZi chart, pillars, and supporting analysis.
            </p>
            <div className="mt-6 flex justify-center">
              <Button variant="primary" size="lg" onClick={handleNewCalculation}>
                {tCommon('newCalculation')}
              </Button>
            </div>
          </GlowCard>
        </div>
      </section>
    );
  }

  return (
    <section className="px-4 pb-14 pt-6 sm:px-6 sm:pt-8 lg:px-8">
      <div className="mx-auto max-w-6xl">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Link href="/calculator" className={buttonClassName('ghost', 'sm')}>
            {tCommon('backToCalculator')}
          </Link>
          <Button variant="primary" size="sm" onClick={handleNewCalculation}>
            {tCommon('newCalculation')}
          </Button>
        </div>

        <div className="mt-6 text-center">
          <h1 className="font-serif text-4xl tracking-[-0.03em] text-[#151d22] sm:text-[3.1rem]">
            {tResult('h1')}
          </h1>
          <p className="mx-auto mt-3 max-w-2xl text-sm leading-7 text-[#151d22]/64 sm:text-base">
            Review the full chart, supporting visualizations, luck cycles, and optional AI insights
            in a dedicated result space.
          </p>
        </div>

        <div className="mt-8">
          <BaziResultView
            result={session.result}
            chartData={session.chartData}
            formValues={session.formValues}
          />
        </div>
      </div>
    </section>
  );
}
