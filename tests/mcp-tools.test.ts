import test from 'node:test';
import assert from 'node:assert/strict';

import {
  BATCH_MAX_DATES,
  computeBatchTool,
  computeChartText,
  computeChartTool,
  computeDaYunText,
  computeDaYunTool,
  computeDayHoursTool,
  computeUsefulText,
  computeUsefulTool,
  McpToolError,
  type BirthInput,
} from '../src/lib/mcp-tools';
import { computeBazi, computeChartData } from '../src/lib/bazi';

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

// ─────────────────────────────────────────────────────────────────────────────
// Phase 1.5 — structured JSON alongside the text, 12-hour tool, batch tool.
// ─────────────────────────────────────────────────────────────────────────────

// Golden copies of the Phase 1 text output (captured from the merged Phase 1
// code before this change). structuredContent is ADDED alongside the text —
// the text itself must stay byte-identical.
const GOLDEN_INPUT: BirthInput = { date: '1990-06-15', time: '08:30', ...BKK };

const GOLDEN_CHART_TEXT = `BaZi Chart · 四柱
Birth: 1990-06-15 08:30 · Asia/Bangkok · longitude 100.52°
True solar time: 08:11 (clock corrected -18 min — DST 0, longitude -17.9, EoT -0.3)

Four Pillars (Year / Month / Day / Hour):
- Year 年: 庚午 (Gēng/Wǔ) — metal Yang / fire Yang · Horse
- Month 月: 壬午 (Rén/Wǔ) — water Yang / fire Yang · Horse
- Day 日: 辛亥 (Xīn/Hài) — Day Master metal Yin / water · Pig
- Hour 時: 壬辰 (Rén/Chén) — water Yang / earth Yang · Dragon

Ten Gods (十神, visible + hidden, flat count): 傷官 3, 偏官 2, 偏印 2, 正印 1, 偏財 1, 食神 1, 正財 1, 劫財 1
Five Structures (五行格局): companion 2, output 4, wealth 2, influence 2, resource 3`;

const GOLDEN_USEFUL_TEXT = `Useful Element · 用神
Birth: 1990-06-15 08:30 · Asia/Bangkok · longitude 100.52°
Day Master: 辛 Metal (金)
Classification: weak — support 8.5 vs drain 17.75 (ratio 0.324).
Weighted forces — 比劫 1, 印 7.5, 食伤 5.75, 財 3, 官杀 9 (月令 weighted highest).
Useful Element (用神): Earth (土)
Favorable (喜神): Earth (土), Metal (金)
Unfavorable (忌神): Fire (火), Wood (木), Water (水)
Reasoning: Day Master is weak (support ratio 0.324); Authority (官杀) presses hardest, so Resource (印) of Earth (土) channels that pressure into support (化杀生身). Useful element: Earth (土).`;

const GOLDEN_DAYUN_TEXT = `Major Luck Cycles · 大運
Birth: 1990-06-15 08:30 · Asia/Bangkok · longitude 100.52°
Direction: forward 順行 (rule treats the chart as male; gender sets direction only).
Luck starts at age 7 years 5 months, measured from the 節氣 Xiǎo Shǔ 小暑.
Decade pillars:
- Age 7-16 (1997-2006): 癸未 (Guǐ/Wèi) — water/earth
- Age 17-26 (2007-2016): 甲申 (Jiǎ/Shēn) — wood/metal
- Age 27-36 (2017-2026): 乙酉 (Yǐ/Yǒu) — wood/metal
- Age 37-46 (2027-2036): 丙戌 (Bǐng/Xū) — fire/earth
- Age 47-56 (2037-2046): 丁亥 (Dīng/Hài) — fire/water
- Age 57-66 (2047-2056): 戊子 (Wù/Zǐ) — earth/water
- Age 67-76 (2057-2066): 己丑 (Jǐ/Chǒu) — earth/earth
- Age 77-86 (2067-2076): 庚寅 (Gēng/Yín) — metal/wood
- Age 87-96 (2077-2086): 辛卯 (Xīn/Mǎo) — metal/wood
- Age 97-106 (2087-2096): 壬辰 (Rén/Chén) — water/earth`;

test('mcp / Phase 1 text output is byte-identical (structured is added alongside, not replacing)', () => {
  assert.equal(computeChartText(GOLDEN_INPUT), GOLDEN_CHART_TEXT);
  assert.equal(computeUsefulText(GOLDEN_INPUT), GOLDEN_USEFUL_TEXT);
  assert.equal(computeDaYunText({ ...GOLDEN_INPUT, gender: 'male' }), GOLDEN_DAYUN_TEXT);
  // The *Tool variants return that exact text plus the structured view.
  assert.equal(computeChartTool(GOLDEN_INPUT).text, GOLDEN_CHART_TEXT);
  assert.equal(computeUsefulTool(GOLDEN_INPUT).text, GOLDEN_USEFUL_TEXT);
  assert.equal(computeDaYunTool({ ...GOLDEN_INPUT, gender: 'male' }).text, GOLDEN_DAYUN_TEXT);
});

test('mcp / compute_bazi_chart structured JSON matches the engine (same data as the text)', () => {
  const { structured } = computeChartTool(GOLDEN_INPUT);
  const r = computeBazi('1990-06-15', '08:30', 'Asia/Bangkok', 100.52, 'male');
  const chart = computeChartData(r.pillars, r.pillars.day.stemIdx, false);

  assert.equal(structured.pillars.year.stem, r.pillars.year.stem.zh);
  assert.equal(structured.pillars.year.branch, r.pillars.year.branch.zh);
  assert.equal(structured.pillars.month.stem, r.pillars.month.stem.zh);
  assert.equal(structured.pillars.day.stem, r.pillars.day.stem.zh);
  assert.equal(structured.pillars.day.isDayMaster, true);
  assert.equal(structured.pillars.hour!.stem, r.pillars.hour!.stem.zh);
  assert.equal(structured.pillars.hour!.branch, r.pillars.hour!.branch.zh);
  assert.equal(structured.pillars.year.zodiac, 'Horse');
  assert.equal(structured.pillars.year.stemElement, 'metal');
  assert.equal(structured.pillars.year.stemPolarity, 'yang');

  assert.deepEqual(structured.dayMaster, { stem: '辛', element: 'metal', polarity: 'yin' });
  assert.deepEqual(structured.tenGods, chart.tenGodsCount);
  assert.deepEqual(structured.fiveStructures, chart.structureCounts);

  // True solar block mirrors the text line exactly (08:11, -18 min).
  assert.equal(structured.trueSolar!.time, '08:11');
  assert.equal(structured.trueSolar!.correctionMinutes, -18);
  assert.deepEqual(structured.trueSolar!.breakdown, { dstMin: 0, longitudeMin: -17.9, eotMin: -0.3 });

  assert.deepEqual(structured.birth, { date: '1990-06-15', time: '08:30', timezone: 'Asia/Bangkok', longitude: 100.52, unknownTime: false });

  // Unknown time → hour pillar and trueSolar are null (not guessed).
  const noTime = computeChartTool({ date: '1990-06-15', ...BKK }).structured;
  assert.equal(noTime.pillars.hour, null);
  assert.equal(noTime.trueSolar, null);
});

test('mcp / compute_useful_element structured JSON keeps "not asserted" as null and mirrors the text', () => {
  const strong = computeUsefulTool(GOLDEN_INPUT);
  const s = strong.structured;
  assert.equal(s.classification, 'weak');
  assert.equal(s.usefulElement, 'earth'); // text: Earth (土)
  assert.deepEqual(s.favorableElements, ['earth', 'metal']);
  assert.ok(Array.isArray(s.breakdown) && (s.breakdown as unknown[]).length > 0);

  // Borderline chart: null 用神 in JSON too — never a guessed value.
  const borderline = computeUsefulTool({ date: '1950-01-05', time: '22:00', ...BKK });
  assert.match(borderline.text, /not asserted/);
  assert.equal(borderline.structured.usefulElement, null);
  assert.deepEqual(borderline.structured.favorableElements, []);
  assert.ok((borderline.structured.flags as string[]).includes('borderline'));
});

test('mcp / compute_da_yun structured JSON matches the engine cycles', () => {
  const { structured } = computeDaYunTool({ ...GOLDEN_INPUT, gender: 'male' });
  const r = computeBazi('1990-06-15', '08:30', 'Asia/Bangkok', 100.52, 'male');
  const cycles = structured.cycles as Array<Record<string, unknown>>;
  assert.equal(structured.available, true);
  assert.equal(structured.direction, r.daYun!.forward ? 'forward' : 'backward');
  assert.deepEqual(structured.startAge, { years: r.daYun!.startYears, months: r.daYun!.startMonths });
  assert.equal(cycles.length, r.daYun!.pillars.length);
  assert.equal(cycles[0].stem, r.daYun!.pillars[0].stem.zh);
  assert.equal(cycles[0].ageStart, r.daYun!.pillars[0].ageStart);
  assert.equal(cycles[0].yearEnd, r.daYun!.pillars[0].yearEnd);
});

test('mcp / compute_bazi_day_hours returns 12 hour pillars consistent with the engine', () => {
  const { text, structured } = computeDayHoursTool({ date: '1990-06-15', ...BKK });
  const hours = structured.hours as Array<{ shichen: string; solarRange: string; pillar: { stem: string; branch: string } }>;
  assert.equal(hours.length, 12);

  // Day pillar is computed once and shared (matches a normal chart of the date).
  const r = computeBazi('1990-06-15', '12:00', 'Asia/Bangkok', 100.52, 'male');
  const day = structured.pillars as { day: { stem: string; branch: string } };
  assert.equal(day.day.stem, r.pillars.day.stem.zh);
  assert.equal(day.day.branch, r.pillars.day.branch.zh);

  // Each entry matches what compute_bazi_chart returns for a clock time inside
  // that solar shichen (Bangkok correction ≈ −18 min keeps these midpoints in
  // range). 子 checked in both halves (早子時 consistency) below.
  const branchOrder = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'];
  hours.forEach((h, i) => {
    assert.equal(h.shichen, branchOrder[i]);
    assert.equal(h.pillar.branch, branchOrder[i]);
  });
  for (let i = 1; i < 12; i++) {
    const clock = `${String(i * 2).padStart(2, '0')}:30`; // 02:30, 04:30, … solar ≈ 12 min later... still inside the shichen
    const engine = computeBazi('1990-06-15', clock, 'Asia/Bangkok', 100.52, 'male');
    assert.equal(hours[i].pillar.stem, engine.pillars.hour!.stem.zh, `hour stem of ${branchOrder[i]}`);
    assert.equal(hours[i].pillar.branch, engine.pillars.hour!.branch.zh, `hour branch of ${branchOrder[i]}`);
  }

  // 早子時: both halves of 子 (00:30 and 23:30 clock → solar still 子 of THIS
  // date under the midnight-rollover convention) give the same pillar as the
  // tool's single 子 entry.
  const early = computeBazi('1990-06-15', '00:30', 'Asia/Bangkok', 100.52, 'male');
  const late = computeBazi('1990-06-15', '23:30', 'Asia/Bangkok', 100.52, 'male');
  assert.equal(hours[0].pillar.stem, early.pillars.hour!.stem.zh);
  assert.equal(hours[0].pillar.branch, early.pillars.hour!.branch.zh);
  assert.equal(hours[0].pillar.stem, late.pillars.hour!.stem.zh);
  assert.equal(late.pillars.day.stem.zh, r.pillars.day.stem.zh, '23:30 stays on the same day pillar (早子時)');

  assert.match(text, /12時辰/);
  assert.match(text, /早子時/);
});

test('mcp / compute_bazi_batch equals per-date compute_bazi_chart and caps the date count', () => {
  const dates = ['1990-06-15', '1990-06-16', '1990-06-17'];
  const { text, structured } = computeBatchTool({ dates, time: '08:30', ...BKK });
  const charts = structured.charts as Array<Record<string, unknown>>;
  assert.equal(structured.count, 3);
  charts.forEach((c, i) => {
    const single = computeChartTool({ date: dates[i], time: '08:30', ...BKK }).structured;
    assert.deepEqual(c, single, `batch entry ${dates[i]} must equal the single-chart structured output`);
  });
  dates.forEach((d) => assert.ok(text.includes(d)));

  // Cap: more than BATCH_MAX_DATES dates → clear error, no computation.
  const tooMany = Array.from({ length: BATCH_MAX_DATES + 1 }, (_, i) => `1990-06-${String((i % 28) + 1).padStart(2, '0')}`);
  assert.throws(() => computeBatchTool({ dates: tooMany, ...BKK }), McpToolError);
  assert.throws(() => computeBatchTool({ dates: tooMany, ...BKK }), /at most 31/);
  assert.throws(() => computeBatchTool({ dates: [], ...BKK }), McpToolError);
});

test('mcp / new tools run the same longitude/timezone validation as Phase 1', () => {
  // 60° guard (lon 0 + Asia/Bangkok).
  assert.throws(() => computeDayHoursTool({ date: '1990-06-15', timezone: 'Asia/Bangkok', longitude: 0 }), /does not match timezone/);
  assert.throws(() => computeBatchTool({ dates: ['1990-06-15'], timezone: 'Asia/Bangkok', longitude: 0 }), /does not match timezone/);
  // Range + IANA checks.
  assert.throws(() => computeDayHoursTool({ date: '1990-06-15', timezone: 'Asia/Bangkok', longitude: 999 }), /between -180 and 180/);
  assert.throws(() => computeBatchTool({ dates: ['1990-06-15'], timezone: 'Not/AZone', longitude: 100.52 }), /Invalid IANA timezone/);
});
