import type { AnalysisFormPayload } from '@/lib/analysis-payload';
import type { BaziResult, ChartData } from '@/lib/bazi';

export const CALCULATION_RESULT_KEY = 'horomo-calculation-result';

type SerializedDaYun = Omit<NonNullable<BaziResult['daYun']>, 'jie'> & {
  jie: Omit<NonNullable<BaziResult['daYun']>['jie'], 'date'> & { date: string };
};

type SerializedBaziResult = Omit<
  BaziResult,
  'utcDate' | 'localDate' | 'displayDate' | 'tstDate' | 'daYun'
> & {
  utcDate: string;
  localDate: string;
  displayDate: string;
  tstDate: string;
  daYun: SerializedDaYun | null;
};

export type StoredCalculationResult = {
  formValues: AnalysisFormPayload;
  chartData: ChartData;
  result: SerializedBaziResult;
};

export function serializeCalculationResult(params: {
  formValues: AnalysisFormPayload;
  chartData: ChartData;
  result: BaziResult;
}): StoredCalculationResult {
  const { formValues, chartData, result } = params;

  return {
    formValues,
    chartData,
    result: {
      ...result,
      utcDate: result.utcDate.toISOString(),
      localDate: result.localDate.toISOString(),
      displayDate: result.displayDate.toISOString(),
      tstDate: result.tstDate.toISOString(),
      daYun: result.daYun
        ? {
            ...result.daYun,
            jie: {
              ...result.daYun.jie,
              date: result.daYun.jie.date.toISOString(),
            },
          }
        : null,
    },
  };
}

export function deserializeCalculationResult(value: StoredCalculationResult): {
  formValues: AnalysisFormPayload;
  chartData: ChartData;
  result: BaziResult;
} {
  return {
    formValues: value.formValues,
    chartData: value.chartData,
    result: {
      ...value.result,
      utcDate: new Date(value.result.utcDate),
      localDate: new Date(value.result.localDate),
      displayDate: new Date(value.result.displayDate),
      tstDate: new Date(value.result.tstDate),
      daYun: value.result.daYun
        ? {
            ...value.result.daYun,
            jie: {
              ...value.result.daYun.jie,
              date: new Date(value.result.daYun.jie.date),
            },
          }
        : null,
    },
  };
}

export function saveCalculationResult(params: {
  formValues: AnalysisFormPayload;
  chartData: ChartData;
  result: BaziResult;
}) {
  if (typeof window === 'undefined') return;
  const payload = serializeCalculationResult(params);
  window.sessionStorage.setItem(CALCULATION_RESULT_KEY, JSON.stringify(payload));
}

export function loadCalculationResult(): {
  formValues: AnalysisFormPayload;
  chartData: ChartData;
  result: BaziResult;
} | null {
  if (typeof window === 'undefined') return null;

  const raw = window.sessionStorage.getItem(CALCULATION_RESULT_KEY);
  if (!raw) return null;

  try {
    return deserializeCalculationResult(JSON.parse(raw) as StoredCalculationResult);
  } catch {
    window.sessionStorage.removeItem(CALCULATION_RESULT_KEY);
    return null;
  }
}

export function clearCalculationResult() {
  if (typeof window === 'undefined') return;
  window.sessionStorage.removeItem(CALCULATION_RESULT_KEY);
}
