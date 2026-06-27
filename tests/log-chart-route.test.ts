import test from 'node:test';
import assert from 'node:assert/strict';

import * as bazi from '../src/lib/bazi';
import { buildAnalyzeRequestBody, type AnalysisFormPayload } from '../src/lib/analysis-payload';
import { handleLogChartRequest } from '../src/app/api/log-chart/route';

const baseProfile: AnalysisFormPayload = {
  dob: '1990-06-15',
  tob: '08:30',
  timezone: 'Asia/Bangkok',
  longitude: '100.52',
  latitude: '13.75',
  genderIdentity: 'male',
  genderOtherText: '',
  calculationMode: 'male',
  unknownTime: false,
  birthPlaceQuery: 'Bangkok, Thailand',
  birthPlace: null,
};

function buildRequestBody(formValues: AnalysisFormPayload) {
  const result = bazi.computeBazi(
    formValues.dob,
    formValues.unknownTime ? null : formValues.tob,
    formValues.timezone,
    Number(formValues.longitude),
    formValues.calculationMode,
  );
  const chartData = bazi.computeChartData(result.pillars, result.pillars.day.stemIdx, result.unknownTime);
  return buildAnalyzeRequestBody({ formValues, result, chartData });
}

test('log-chart route writes a valid calculated-chart log', async () => {
  let insertCalls = 0;
  const body = buildRequestBody(baseProfile);
  const request = new Request('http://localhost/api/log-chart', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'user-agent': 'node-test' },
    body: JSON.stringify(body),
  });

  const response = await handleLogChartRequest(request, {
    getUserId: async () => 'test-user-id',
    randomUUID: () => 'test-request-id',
    buildLogInsert: (params) => ({
      user_id: params.userId,
      birth_info: params.requestBody.birthInfo,
      pillars: params.requestBody.computedChart.pillars,
      chart_data: params.requestBody.computedChart.chartData,
      request_payload: params.requestBody,
      debug_metadata: {
        route: params.route ?? '/api/log-chart',
        requestId: params.requestId,
        receivedAt: new Date().toISOString(),
        clientGeneratedAt: params.requestBody.requestMetadata.clientGeneratedAt,
        userAgent: params.userAgent,
        aiModel: params.aiModel ?? '',
        timezone: params.requestBody.birthInfo.timezone,
        unknownTime: params.requestBody.birthInfo.unknownTime,
      },
      analysis_status: params.analysisStatus ?? 'calculated',
      app_version: 'test',
      logging_error: null,
    }),
    insertLog: async () => {
      insertCalls += 1;
    },
  });

  assert.equal(response.status, 204);
  assert.equal(insertCalls, 1);
});

test('log-chart route rejects gross longitude/timezone mismatch before writing', async () => {
  let insertCalls = 0;
  const mismatchedProfile: AnalysisFormPayload = {
    ...baseProfile,
    timezone: 'America/New_York',
    longitude: '100.52',
    birthPlaceQuery: 'Mismatched direct API payload',
  };
  const body = buildRequestBody(mismatchedProfile);
  const request = new Request('http://localhost/api/log-chart', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'user-agent': 'node-test' },
    body: JSON.stringify(body),
  });

  const response = await handleLogChartRequest(request, {
    getUserId: async () => 'test-user-id',
    randomUUID: () => 'test-request-id',
    buildLogInsert: () => {
      throw new Error('buildLogInsert should not be called');
    },
    insertLog: async () => {
      insertCalls += 1;
    },
  });

  assert.equal(response.status, 400);
  const json = await response.json();
  assert.match(json.error, /does not match timezone America\/New_York/);
  assert.equal(insertCalls, 0);
});
