import test from 'node:test';
import assert from 'node:assert/strict';

import { computeChartText, computeUsefulText, computeDaYunText, McpToolError, type BirthInput } from '../src/lib/mcp-tools';
import { computeBazi } from '../src/lib/bazi';

// ─────────────────────────────────────────────────────────────────────────────
// MCP tool logic (Phase 1). These run the same engine the website uses, so the
// MCP output must match the engine exactly. The route layer (mcp-handler) is a
// thin wrapper verified after the dependency is installed.
// ─────────────────────────────────────────────────────────────────────────────

const BKK: Pick<BirthInput, 'timezone' | 'longitude'> = { timezone: 'Asia/Bangkok', longitude: 100.52 };

test('mcp / compute_bazi_chart matches the engine pillars exactly', () => {
  const input: BirthInput = { date: '1990-06-15', time: '08:30', ...BKK };
  const text = computeChartText(input);
  const r = computeBazi('1990-06-15', '08:30', 'Asia/Bangkok', 100.52, 'male');
  const zh = (p: { stem: { zh: string }; branch: { zh: string } }) => p.stem.zh + p.branch.zh;
  // MCP text contains the engine's exact pillars (same source of truth as the UI).
  assert.ok(text.includes(zh(r.pillars.year)), `year pillar ${zh(r.pillars.year)}`);
  assert.ok(text.includes(zh(r.pillars.month)), `month pillar ${zh(r.pillars.month)}`);
  assert.ok(text.includes(zh(r.pillars.day)), `day pillar ${zh(r.pillars.day)}`);
  assert.ok(text.includes(zh(r.pillars.hour!)), `hour pillar ${zh(r.pillars.hour!)}`);
  assert.match(text, /Day Master/);
  assert.match(text, /Ten Gods/);
});

test('mcp / 60° guard rejects a longitude/timezone mismatch (lon 0 + Asia/Bangkok)', () => {
  const bad: BirthInput = { date: '1990-06-15', time: '08:30', timezone: 'Asia/Bangkok', longitude: 0 };
  assert.throws(() => computeChartText(bad), McpToolError);
  assert.throws(() => computeChartText(bad), /does not match timezone/);
  // The other tools share the same guard.
  assert.throws(() => computeUsefulText(bad), McpToolError);
  assert.throws(() => computeDaYunText({ ...bad, gender: 'male' }), McpToolError);
});

test('mcp / rejects out-of-range longitude and invalid IANA timezone with clear messages', () => {
  const ok: BirthInput = { date: '1990-06-15', time: '08:30', ...BKK };
  // Out-of-range longitude (would bypass the route's Zod, but the tool guards too).
  assert.throws(() => computeChartText({ ...ok, longitude: 999 }), McpToolError);
  assert.throws(() => computeChartText({ ...ok, longitude: 999 }), /between -180 and 180/);
  // Invalid IANA timezone → explicit, AI-readable error (not a buried throw).
  assert.throws(() => computeChartText({ ...ok, timezone: 'Not/AZone' }), McpToolError);
  assert.throws(() => computeChartText({ ...ok, timezone: 'Not/AZone' }), /Invalid IANA timezone/);
  // A real IANA zone still works.
  assert.doesNotThrow(() => computeChartText({ ...ok, timezone: 'America/New_York', longitude: -74 }));
});

test('mcp / wide single-timezone country is accepted (far-west China)', () => {
  const input: BirthInput = { date: '2000-06-15', time: '08:30', timezone: 'Asia/Shanghai', longitude: 75.99 };
  assert.doesNotThrow(() => computeChartText(input));
});

test('mcp / compute_useful_element reports a strong chart with a 用神', () => {
  const text = computeUsefulText({ date: '1950-01-05', time: '02:00', ...BKK });
  assert.match(text, /Classification: strong/);
  assert.match(text, /Useful Element \(用神\): /);
  assert.doesNotMatch(text, /not asserted/);
});

test('mcp / compute_useful_element returns "not asserted" for a borderline chart', () => {
  const text = computeUsefulText({ date: '1950-01-05', time: '22:00', ...BKK });
  assert.match(text, /Classification: borderline/);
  assert.match(text, /not asserted/);
});

test('mcp / compute_da_yun direction flips with gender', () => {
  const male = computeDaYunText({ date: '1990-06-15', time: '08:30', ...BKK, gender: 'male' });
  const female = computeDaYunText({ date: '1990-06-15', time: '08:30', ...BKK, gender: 'female' });
  assert.match(male, /Age \d+-\d+/);
  assert.match(male, /順行|逆行/);
  // Opposite gender ⇒ opposite direction (classical rule).
  assert.notEqual(
    /順行/.test(male),
    /順行/.test(female),
    'male and female must yield opposite Da Yun directions',
  );
});

test('mcp / unknown birth time omits the hour pillar without error', () => {
  const text = computeChartText({ date: '1990-06-15', ...BKK }); // no time
  assert.match(text, /Hour 時: unknown/);
  assert.match(text, /birth time unknown/);
});
