import type { BaziResult, ChartData, DaYun, TSTInfo } from '@/lib/bazi';

export type AnalysisFormPayload = {
  dob: string;
  tob: string;
  timezone: string;
  longitude: string;
  latitude: string;
  gender: 'male' | 'female';
  unknownTime: boolean;
};

type SerializedJie = {
  name: string;
  date: string;
};

export type SerializedDaYun = Omit<DaYun, 'jie'> & {
  jie: SerializedJie;
};

export type AnalysisComputedChartPayload = {
  utcDate: string;
  localDate: string;
  tstDate: string;
  tzLabel: string;
  stdOffsetMin: number;
  tst: TSTInfo | null;
  unknownTime: boolean;
  pillars: BaziResult['pillars'];
  daYun: SerializedDaYun | null;
  chartData: ChartData;
};

export type AnalysisRequestMetadata = {
  clientGeneratedAt: string;
};

export type AnalyzeRequestBody = {
  birthInfo: AnalysisFormPayload;
  computedChart: AnalysisComputedChartPayload;
  requestMetadata: AnalysisRequestMetadata;
};

function serializeDaYun(daYun: BaziResult['daYun']): SerializedDaYun | null {
  if (!daYun) return null;

  return {
    ...daYun,
    jie: {
      ...daYun.jie,
      date: daYun.jie.date.toISOString(),
    },
  };
}

export function buildAnalyzeRequestBody(params: {
  formValues: AnalysisFormPayload;
  result: BaziResult;
  chartData: ChartData;
}): AnalyzeRequestBody {
  const { formValues, result, chartData } = params;

  return {
    birthInfo: formValues,
    computedChart: {
      utcDate: result.utcDate.toISOString(),
      localDate: result.localDate.toISOString(),
      tstDate: result.tstDate.toISOString(),
      tzLabel: result.tzLabel,
      stdOffsetMin: result.stdOffsetMin,
      tst: result.tst,
      unknownTime: result.unknownTime,
      pillars: result.pillars,
      daYun: serializeDaYun(result.daYun),
      chartData,
    },
    requestMetadata: {
      clientGeneratedAt: new Date().toISOString(),
    },
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isString(value: unknown): value is string {
  return typeof value === 'string';
}

function isBoolean(value: unknown): value is boolean {
  return typeof value === 'boolean';
}

export function parseAnalyzeRequestBody(body: unknown): AnalyzeRequestBody | null {
  if (!isRecord(body)) return null;
  if (!isRecord(body.birthInfo) || !isRecord(body.computedChart) || !isRecord(body.requestMetadata)) {
    return null;
  }

  const { birthInfo, computedChart, requestMetadata } = body;

  const hasValidBirthInfo =
    isString(birthInfo.dob) &&
    isString(birthInfo.tob) &&
    isString(birthInfo.timezone) &&
    isString(birthInfo.longitude) &&
    isString(birthInfo.latitude) &&
    (birthInfo.gender === 'male' || birthInfo.gender === 'female') &&
    isBoolean(birthInfo.unknownTime);

  const hasValidComputedChart =
    isString(computedChart.utcDate) &&
    isString(computedChart.localDate) &&
    isString(computedChart.tstDate) &&
    isString(computedChart.tzLabel) &&
    typeof computedChart.stdOffsetMin === 'number' &&
    isBoolean(computedChart.unknownTime) &&
    isRecord(computedChart.pillars) &&
    isRecord(computedChart.chartData);

  const hasValidMetadata = isString(requestMetadata.clientGeneratedAt);

  if (!hasValidBirthInfo || !hasValidComputedChart || !hasValidMetadata) {
    return null;
  }

  return body as AnalyzeRequestBody;
}
