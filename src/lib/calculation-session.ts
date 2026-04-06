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

// Stable snapshot cache for useSyncExternalStore.
// loadCalculationResult is called on every render; returning a new object
// every time causes an infinite re-render loop (React error #185).
// We cache by raw string so the same reference is returned when data is unchanged.
let _snapshotRaw: string | null | undefined = undefined;
let _snapshotResult: { formValues: AnalysisFormPayload; chartData: ChartData; result: BaziResult } | null = null;

export function saveCalculationResult(params: {
  formValues: AnalysisFormPayload;
  chartData: ChartData;
  result: BaziResult;
}) {
  if (typeof window === 'undefined') return;
  const payload = serializeCalculationResult(params);
  const raw = JSON.stringify(payload);
  window.sessionStorage.setItem(CALCULATION_RESULT_KEY, raw);
  // Invalidate cache so the next load reflects the new save.
  _snapshotRaw = undefined;
}

export function loadCalculationResult(): {
  formValues: AnalysisFormPayload;
  chartData: ChartData;
  result: BaziResult;
} | null {
  if (typeof window === 'undefined') return null;

  const raw = window.sessionStorage.getItem(CALCULATION_RESULT_KEY);

  // Return cached result if the raw data hasn't changed.
  if (raw === _snapshotRaw) return _snapshotResult;

  _snapshotRaw = raw;
  if (!raw) {
    _snapshotResult = null;
    return null;
  }

  try {
    _snapshotResult = deserializeCalculationResult(JSON.parse(raw) as StoredCalculationResult);
    return _snapshotResult;
  } catch {
    window.sessionStorage.removeItem(CALCULATION_RESULT_KEY);
    _snapshotRaw = undefined;
    _snapshotResult = null;
    return null;
  }
}

export function clearCalculationResult() {
  if (typeof window === 'undefined') return;
  window.sessionStorage.removeItem(CALCULATION_RESULT_KEY);
  _snapshotRaw = undefined;
  _snapshotResult = null;
}
