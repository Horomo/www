import test from 'node:test';
import assert from 'node:assert/strict';

import * as bazi from '../src/lib/bazi';
import { buildAnalyzeRequestBody } from '../src/lib/analysis-payload';
import { handleAnalyzeRequest } from '../src/app/api/analyze/route';

test('analyze route accepts a genuine payload and uses the server-validated chart in the prompt', async () => {
  const openAiCalls: Array<{ messages: Array<{ role: string; content: string }> }> = [];

  const formValues = {
    dob: '1990-06-15',
    tob: '08:30',
    timezone: 'Asia/Bangkok',
    longitude: '100.52',
    latitude: '13.75',
    genderIdentity: 'male' as const,
    genderOtherText: '',
    calculationMode: 'male' as const,
    unknownTime: false,
    birthPlaceQuery: 'Bangkok, Thailand',
    birthPlace: null,
  };

  const result = bazi.computeBazi(formValues.dob, formValues.tob, formValues.timezone, 100.52, formValues.calculationMode);
  const chartData = bazi.computeChartData(result.pillars, result.pillars.day.stemIdx, result.unknownTime);
  const body = buildAnalyzeRequestBody({ formValues, result, chartData });

  const request = new Request('http://localhost/api/analyze', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'user-agent': 'node-test',
    },
    body: JSON.stringify(body),
  });

  const response = await handleAnalyzeRequest(request, {
    getSession: async () => ({ user: { email: 'user@example.com' } }),
    buildLogInsert: () => ({
      user_id: 'user@example.com',
      birth_info: formValues,
      pillars: body.computedChart.pillars,
      chart_data: body.computedChart.chartData,
      request_payload: body,
      debug_metadata: {
        route: '/api/analyze',
        requestId: 'req-1',
        receivedAt: new Date().toISOString(),
        clientGeneratedAt: body.requestMetadata.clientGeneratedAt,
        userAgent: 'node-test',
        aiModel: 'gpt-4o-mini',
        timezone: formValues.timezone,
        unknownTime: false,
      },
      analysis_status: 'requested',
      app_version: 'test',
      logging_error: null,
    }),
    insertLog: async () => {},
    createCompletion: async (payload) => {
      openAiCalls.push(payload);
      return { choices: [{ message: { content: 'validated-analysis' } }] };
    },
  });
  const json = await response.json();

  assert.equal(response.status, 200);
  assert.equal(json.analysis, 'validated-analysis');
  assert.equal(openAiCalls.length, 1);

  const userMsg: string = openAiCalls[0].messages[1].content;
  const sysMsg: string = openAiCalls[0].messages[0].content;

  // Structural content still present
  assert.match(userMsg, /Day 日柱: 辛亥/);
  assert.match(userMsg, /Hour 時柱: 壬辰/);

  // Accurate flat-count wording is present
  assert.match(userMsg, /Most Frequent Ten Gods \(flat count, unweighted\)/);
  assert.match(userMsg, /Element Distribution/);
  assert.match(userMsg, /appear most often/);

  // Model limitation note is in the system prompt
  assert.match(sysMsg, /flat, unweighted occurrences/);
  assert.match(sysMsg, /not qi-strength scores/);

  // Misleading phrases have been removed
  assert.doesNotMatch(userMsg, /Dominant Ten Gods/);
  assert.doesNotMatch(userMsg, /Chart Balance/);
  assert.doesNotMatch(userMsg, /which elements dominate/);
  assert.doesNotMatch(userMsg, /favorable\/unfavorable/);
});

test('analyze route rejects forged computed charts before calling OpenAI', async () => {
  const openAiCalls: Array<unknown> = [];

  const formValues = {
    dob: '1990-06-15',
    tob: '08:30',
    timezone: 'Asia/Bangkok',
    longitude: '100.52',
    latitude: '13.75',
    genderIdentity: 'male' as const,
    genderOtherText: '',
    calculationMode: 'male' as const,
    unknownTime: false,
    birthPlaceQuery: 'Bangkok, Thailand',
    birthPlace: null,
  };

  const result = bazi.computeBazi(formValues.dob, formValues.tob, formValues.timezone, 100.52, formValues.calculationMode);
  const chartData = bazi.computeChartData(result.pillars, result.pillars.day.stemIdx, result.unknownTime);
  const body = JSON.parse(JSON.stringify(buildAnalyzeRequestBody({ formValues, result, chartData })));
  body.computedChart.pillars.day.stem.zh = '甲';

  const request = new Request('http://localhost/api/analyze', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'user-agent': 'node-test',
    },
    body: JSON.stringify(body),
  });

  const response = await handleAnalyzeRequest(request, {
    getSession: async () => ({ user: { email: 'user@example.com' } }),
    buildLogInsert: () => ({
      user_id: 'user@example.com',
      birth_info: formValues,
      pillars: body.computedChart.pillars,
      chart_data: body.computedChart.chartData,
      request_payload: body,
      debug_metadata: {
        route: '/api/analyze',
        requestId: 'req-2',
        receivedAt: new Date().toISOString(),
        clientGeneratedAt: body.requestMetadata.clientGeneratedAt,
        userAgent: 'node-test',
        aiModel: 'gpt-4o-mini',
        timezone: formValues.timezone,
        unknownTime: false,
      },
      analysis_status: 'requested',
      app_version: 'test',
      logging_error: null,
    }),
    insertLog: async () => {},
    createCompletion: async (payload) => {
      openAiCalls.push(payload);
      return { choices: [{ message: { content: 'should-not-run' } }] };
    },
  });
  const json = await response.json();

  assert.equal(response.status, 400);
  assert.match(json.error, /does not match/i);
  assert.equal(openAiCalls.length, 0);
});
