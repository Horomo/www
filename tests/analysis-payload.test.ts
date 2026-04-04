import test from 'node:test';
import assert from 'node:assert/strict';

import {
  analyzeRequestMatchesServerComputation,
  buildAnalyzeRequestBody,
  parseAnalyzeRequestBody,
  recomputeAnalysisChartPayload,
  type AnalysisFormPayload,
} from '../src/lib/analysis-payload';
import * as bazi from '../src/lib/bazi';

const formValues: AnalysisFormPayload = {
  dob: '1990-06-15',
  tob: '08:30',
  timezone: 'Asia/Bangkok',
  longitude: '100.52',
  latitude: '13.75',
  gender: 'male',
  unknownTime: false,
  birthPlaceQuery: 'Bangkok, Thailand',
  birthPlace: null,
};

test('recomputeAnalysisChartPayload reproduces the server-side chart from birth info', () => {
  const computedChart = recomputeAnalysisChartPayload(formValues);

  assert.equal(computedChart.utcDate, '1990-06-15T01:30:00.000Z');
  assert.equal(computedChart.localDate, '1990-06-15T08:30:00.000Z');
  assert.equal(computedChart.tstDate, '1990-06-15T08:11:47.465Z');
  assert.equal(computedChart.pillars.day.stem.zh + computedChart.pillars.day.branch.zh, '辛亥');
  assert.equal(computedChart.chartData.structureCounts.resource, 3);
});

test('parseAnalyzeRequestBody rejects malformed nested chart payloads', () => {
  const malformed = {
    birthInfo: formValues,
    computedChart: {
      utcDate: '1990-06-15T01:30:00.000Z',
      localDate: '1990-06-15T08:30:00.000Z',
      tstDate: '1990-06-15T08:11:47.465Z',
      tzLabel: 'UTC+7:00',
      stdOffsetMin: 420,
      tst: null,
      unknownTime: false,
      pillars: {},
      daYun: null,
      chartData: {},
    },
    requestMetadata: {
      clientGeneratedAt: new Date().toISOString(),
    },
  };

  assert.equal(parseAnalyzeRequestBody(malformed), null);
});

test('server-side validation accepts a genuine computed chart payload', () => {
  const result = bazi.computeBazi(
    formValues.dob,
    formValues.tob,
    formValues.timezone,
    parseFloat(formValues.longitude),
    true,
  );
  const chartData = bazi.computeChartData(result.pillars, result.pillars.day.stemIdx, result.unknownTime);
  const requestBody = buildAnalyzeRequestBody({ formValues, result, chartData });

  const parsed = parseAnalyzeRequestBody(requestBody);
  assert.ok(parsed);
  assert.equal(analyzeRequestMatchesServerComputation(parsed), true);
});

test('server-side validation rejects forged computed chart payloads', () => {
  const result = bazi.computeBazi(
    formValues.dob,
    formValues.tob,
    formValues.timezone,
    parseFloat(formValues.longitude),
    true,
  );
  const chartData = bazi.computeChartData(result.pillars, result.pillars.day.stemIdx, result.unknownTime);
  const requestBody = buildAnalyzeRequestBody({ formValues, result, chartData });

  requestBody.computedChart.pillars.day.stem.zh = '甲';
  requestBody.computedChart.chartData.tenGodsCount = { 比肩: 99 };

  const parsed = parseAnalyzeRequestBody(requestBody);
  assert.ok(parsed);
  assert.equal(analyzeRequestMatchesServerComputation(parsed), false);
});

test('server-side recomputation rejects invalid timezone birth info', () => {
  assert.throws(
    () => recomputeAnalysisChartPayload({ ...formValues, timezone: 'Not/AZone' }),
    /Invalid IANA timezone/,
  );
});
