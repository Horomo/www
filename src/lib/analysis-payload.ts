import {
  computeBazi,
  computeChartData,
  type BaziResult,
  type ChartData,
  type DaYun,
  type TSTInfo,
} from '@/lib/bazi';
import type { PlaceSearchResult } from '@/lib/places';

export type AnalysisFormPayload = {
  dob: string;
  tob: string;
  timezone: string;
  longitude: string;
  latitude: string;
  gender: 'male' | 'female';
  unknownTime: boolean;
  birthPlaceQuery: string;
  birthPlace: PlaceSearchResult | null;
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

export type AnalysisMode = 'initial' | 'follow_up';

export type AnalyzeRequestBody = {
  mode?: AnalysisMode;
  followUpQuestion?: string;
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

export function buildComputedChartPayload(result: BaziResult, chartData: ChartData): AnalysisComputedChartPayload {
  return {
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
  };
}

export function recomputeAnalysisChartPayload(formValues: AnalysisFormPayload): AnalysisComputedChartPayload {
  if (!formValues.dob) {
    throw new Error('Date of birth is required.');
  }

  if (!formValues.unknownTime && !formValues.tob) {
    throw new Error('Time of birth is required when birth time is known.');
  }

  const longitude = parseFloat(formValues.longitude);
  if (!Number.isFinite(longitude) || longitude < -180 || longitude > 180) {
    throw new Error('Longitude must be between -180 and 180.');
  }

  const result = computeBazi(
    formValues.dob,
    formValues.unknownTime ? null : formValues.tob,
    formValues.timezone,
    longitude,
    formValues.gender === 'male',
  );
  const chartData = computeChartData(result.pillars, result.pillars.day.stemIdx, result.unknownTime);
  return buildComputedChartPayload(result, chartData);
}

export function buildAnalyzeRequestBody(params: {
  formValues: AnalysisFormPayload;
  result: BaziResult;
  chartData: ChartData;
}): AnalyzeRequestBody {
  const { formValues, result, chartData } = params;

  return {
    birthInfo: formValues,
    computedChart: buildComputedChartPayload(result, chartData),
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

function isNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function isStem(value: unknown): boolean {
  return isRecord(value)
    && isString(value.zh)
    && isString(value.pinyin)
    && isString(value.element)
    && isBoolean(value.yin);
}

function isBranch(value: unknown): boolean {
  return isRecord(value)
    && isString(value.zh)
    && isString(value.pinyin)
    && isString(value.element)
    && isBoolean(value.yin)
    && isString(value.animal);
}

function isPillar(value: unknown): boolean {
  return isRecord(value)
    && isStem(value.stem)
    && isBranch(value.branch)
    && isNumber(value.stemIdx)
    && isNumber(value.branchIdx);
}

function isTstInfo(value: unknown): value is TSTInfo {
  return isRecord(value)
    && isBoolean(value.dstApplied)
    && isNumber(value.dstCorrectionMin)
    && isNumber(value.lonCorrectionMin)
    && isNumber(value.eotMin)
    && isNumber(value.totalCorrectionMin)
    && isBoolean(value.dayChanged)
    && (value.dayChangedDir === 'prev' || value.dayChangedDir === 'next' || value.dayChangedDir === null);
}

function isSerializedDaYun(value: unknown): boolean {
  if (!isRecord(value) || !isBoolean(value.forward) || !isNumber(value.startYears) || !isNumber(value.startMonths)) {
    return false;
  }

  if (!isRecord(value.jie) || !isString(value.jie.name) || !isString(value.jie.date)) {
    return false;
  }

  return Array.isArray(value.pillars)
    && value.pillars.every((pillar) => isRecord(pillar)
      && isNumber(pillar.cycleIdx)
      && isNumber(pillar.stemIdx)
      && isNumber(pillar.branchIdx)
      && isStem(pillar.stem)
      && isBranch(pillar.branch)
      && isNumber(pillar.ageStart)
      && isNumber(pillar.ageEnd)
      && isNumber(pillar.yearStart)
      && isNumber(pillar.yearEnd));
}

function isChartData(value: unknown): value is ChartData {
  if (!isRecord(value) || !isRecord(value.structureCounts) || !isRecord(value.structureEls) || !isRecord(value.tenGodsCount)) {
    return false;
  }

  const structureKeys = ['companion', 'output', 'wealth', 'influence', 'resource'] as const;
  const structureCounts = value.structureCounts;
  const structureEls = value.structureEls;
  const tenGodsCount = value.tenGodsCount;

  return structureKeys.every((key) => isNumber(structureCounts[key]) && isString(structureEls[key]))
    && Object.values(tenGodsCount).every(isNumber);
}

function isComputedChartPayload(value: unknown): value is AnalysisComputedChartPayload {
  return isRecord(value)
    && isString(value.utcDate)
    && isString(value.localDate)
    && isString(value.tstDate)
    && isString(value.tzLabel)
    && isNumber(value.stdOffsetMin)
    && (value.tst === null || isTstInfo(value.tst))
    && isBoolean(value.unknownTime)
    && isRecord(value.pillars)
    && isPillar(value.pillars.year)
    && isPillar(value.pillars.month)
    && isPillar(value.pillars.day)
    && (value.pillars.hour === null || isPillar(value.pillars.hour))
    && (value.daYun === null || isSerializedDaYun(value.daYun))
    && isChartData(value.chartData);
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
    isBoolean(birthInfo.unknownTime) &&
    isString(birthInfo.birthPlaceQuery) &&
    (birthInfo.birthPlace === null || isRecord(birthInfo.birthPlace));

  const hasValidComputedChart =
    isComputedChartPayload(computedChart);

  const hasValidMetadata = isString(requestMetadata.clientGeneratedAt);
  const hasValidMode =
    body.mode === undefined ||
    body.mode === 'initial' ||
    body.mode === 'follow_up';
  const hasValidFollowUpQuestion =
    body.followUpQuestion === undefined || isString(body.followUpQuestion);

  if (!hasValidBirthInfo || !hasValidComputedChart || !hasValidMetadata || !hasValidMode || !hasValidFollowUpQuestion) {
    return null;
  }

  return body as AnalyzeRequestBody;
}

export function analyzeRequestMatchesServerComputation(body: AnalyzeRequestBody): boolean {
  const recomputedChart = recomputeAnalysisChartPayload(body.birthInfo);
  return JSON.stringify(body.computedChart) === JSON.stringify(recomputedChart);
}
