// ─────────────────────────────────────────────────────────────────────────────
// MCP tool logic (Phase 1 + 1.5, read-only). Pure functions that turn a birth
// input into AI-readable text plus a structured JSON view by calling the
// existing BaZi engine. Kept free of any MCP/transport dependency so it is
// fully unit-testable and so the route handler stays a thin registration
// layer. See docs/mcp-server.md.
// ─────────────────────────────────────────────────────────────────────────────

import {
  BRANCHES,
  EL_LABEL,
  STEMS,
  computeBazi,
  computeChartData,
  computeUsefulElement,
  hourPillar,
  tenGod,
  type BaziResult,
} from '@/lib/bazi';
import { validateBirthLocation } from '@/lib/location-write-validation';
import type { CalculationGenderMode } from '@/lib/gender';

export type BirthInput = {
  date: string;        // YYYY-MM-DD
  time?: string;       // HH:mm at the birthplace; omit when the birth time is unknown
  timezone: string;    // IANA, e.g. Asia/Bangkok
  longitude: number;   // degrees, East positive / West negative
  gender?: 'male' | 'female'; // Da Yun direction only
};

// A friendly, AI-readable failure. The route turns this into an MCP error result.
export class McpToolError extends Error {}

// Every tool returns two views of the SAME engine result: the Phase 1 text
// (unchanged) and a structured JSON object the route emits as MCP
// `structuredContent`. Text and JSON are built from one resolveChart call so
// they can never disagree.
export type ToolOutput = { text: string; structured: Record<string, unknown> };

type Pillar = BaziResult['pillars']['year'];

function isValidTimeZone(timezone: string): boolean {
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: timezone });
    return true;
  } catch {
    return false;
  }
}

function resolveChart(input: BirthInput): { result: BaziResult; unknownTime: boolean; mode: CalculationGenderMode } {
  const unknownTime = !input.time;

  // Explicit input validation at the tool boundary with clear, AI-readable
  // messages. The route's Zod schema also checks these, but mcp-tools is an
  // exported, standalone API; it must not depend on the caller having validated.
  if (!Number.isFinite(input.longitude) || input.longitude < -180 || input.longitude > 180) {
    throw new McpToolError('longitude must be a number between -180 and 180 (East positive, West negative).');
  }
  if (!isValidTimeZone(input.timezone)) {
    throw new McpToolError(`Invalid IANA timezone "${input.timezone}". Use a name like "Asia/Bangkok".`);
  }
  // Same 60° longitude/timezone guard the write-path APIs use. MCP has no search
  // UI, so a mismatch (e.g. a Thai longitude paired with a US timezone) must be
  // rejected at the tool boundary rather than silently producing a wrong chart.
  const check = validateBirthLocation({
    dob: input.date,
    tob: input.time ?? '',
    unknownTime,
    timezone: input.timezone,
    longitude: String(input.longitude),
  });
  if (!check.valid) throw new McpToolError(check.error);

  const mode: CalculationGenderMode = input.gender ?? 'male';
  const result = computeBazi(input.date, input.time ?? null, input.timezone, input.longitude, mode);
  return { result, unknownTime, mode };
}

const pad = (n: number) => String(n).padStart(2, '0');
const el = (key: string) => `${EL_LABEL[key].en} (${EL_LABEL[key].zh})`;

function pillarLine(label: string, p: Pillar): string {
  return `- ${label}: ${p.stem.zh}${p.branch.zh} (${p.stem.pinyin}/${p.branch.pinyin}) — ${p.stem.element} ${p.stem.yin ? 'Yin' : 'Yang'} / ${p.branch.element} ${p.branch.yin ? 'Yin' : 'Yang'} · ${p.branch.animal}`;
}

function header(input: BirthInput, unknownTime: boolean): string {
  const when = unknownTime
    ? `${input.date} (birth time unknown — noon assumed for the date)`
    : `${input.date} ${input.time}`;
  return `Birth: ${when} · ${input.timezone} · longitude ${input.longitude}°`;
}

// ── Structured (JSON) builders — same engine fields the text prints ──────────

const polarity = (yin: boolean) => (yin ? 'yin' : 'yang');

function pillarJson(p: Pillar) {
  return {
    stem: p.stem.zh,
    stemPinyin: p.stem.pinyin,
    stemElement: p.stem.element,
    stemPolarity: polarity(p.stem.yin),
    branch: p.branch.zh,
    branchPinyin: p.branch.pinyin,
    branchElement: p.branch.element,
    branchPolarity: polarity(p.branch.yin),
    zodiac: p.branch.animal,
  };
}

function birthJson(input: BirthInput, unknownTime: boolean) {
  return {
    date: input.date,
    time: input.time ?? null,
    timezone: input.timezone,
    longitude: input.longitude,
    unknownTime,
  };
}

function dayMasterJson(day: Pillar) {
  return { stem: day.stem.zh, element: day.stem.element, polarity: polarity(day.stem.yin) };
}

export function computeChartTool(input: BirthInput): ToolOutput & { structured: ReturnType<typeof chartStructured> } {
  const resolved = resolveChart(input);
  return { text: chartText(input, resolved), structured: chartStructured(input, resolved) };
}

type Resolved = ReturnType<typeof resolveChart>;

function chartStructured(input: BirthInput, { result, unknownTime }: Resolved) {
  const p = result.pillars;
  const chart = computeChartData(p, p.day.stemIdx, unknownTime);
  const tst = result.tst;
  return {
    birth: birthJson(input, unknownTime),
    trueSolar: unknownTime || !tst
      ? null
      : {
        time: `${pad(result.tstDate.getUTCHours())}:${pad(result.tstDate.getUTCMinutes())}`,
        correctionMinutes: Math.round(tst.totalCorrectionMin),
        dayChanged: tst.dayChanged,
        breakdown: {
          dstMin: Math.round(tst.dstCorrectionMin),
          longitudeMin: Number(tst.lonCorrectionMin.toFixed(1)),
          eotMin: Number(tst.eotMin.toFixed(1)),
        },
      },
    pillars: {
      year: pillarJson(p.year),
      month: pillarJson(p.month),
      day: { ...pillarJson(p.day), isDayMaster: true },
      hour: p.hour ? pillarJson(p.hour) : null,
    },
    dayMaster: dayMasterJson(p.day),
    tenGods: chart.tenGodsCount,
    fiveStructures: chart.structureCounts,
  };
}

export function computeChartText(input: BirthInput): string {
  return computeChartTool(input).text;
}

function chartText(input: BirthInput, { result, unknownTime }: Resolved): string {
  const p = result.pillars;
  const chart = computeChartData(p, p.day.stemIdx, unknownTime);
  const tst = result.tst;
  const tstLine = unknownTime || !tst
    ? 'True solar time: not applied (birth time unknown).'
    : `True solar time: ${pad(result.tstDate.getUTCHours())}:${pad(result.tstDate.getUTCMinutes())} (clock corrected ${Math.round(tst.totalCorrectionMin)} min — DST ${Math.round(tst.dstCorrectionMin)}, longitude ${tst.lonCorrectionMin.toFixed(1)}, EoT ${tst.eotMin.toFixed(1)})${tst.dayChanged ? ' — crosses midnight, astrological date shifted' : ''}`;

  const tenGods = Object.entries(chart.tenGodsCount).sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k} ${v}`).join(', ');
  const structures = Object.entries(chart.structureCounts).map(([k, v]) => `${k} ${v}`).join(', ');

  return [
    'BaZi Chart · 四柱',
    header(input, unknownTime),
    tstLine,
    '',
    'Four Pillars (Year / Month / Day / Hour):',
    pillarLine('Year 年', p.year),
    pillarLine('Month 月', p.month),
    `- Day 日: ${p.day.stem.zh}${p.day.branch.zh} (${p.day.stem.pinyin}/${p.day.branch.pinyin}) — Day Master ${p.day.stem.element} ${p.day.stem.yin ? 'Yin' : 'Yang'} / ${p.day.branch.element} · ${p.day.branch.animal}`,
    p.hour ? pillarLine('Hour 時', p.hour) : '- Hour 時: unknown (no birth time)',
    '',
    `Ten Gods (十神, visible + hidden, flat count): ${tenGods}`,
    `Five Structures (五行格局): ${structures}`,
  ].join('\n');
}

export function computeUsefulTool(input: BirthInput): ToolOutput {
  const resolved = resolveChart(input);
  const { result, unknownTime } = resolved;
  const u = computeUsefulElement(result.pillars, result.pillars.day.stemIdx, unknownTime);
  const structured = {
    birth: birthJson(input, unknownTime),
    dayMaster: dayMasterJson(result.pillars.day),
    classification: u.classification,
    supportScore: u.supportScore,
    drainScore: u.drainScore,
    strengthRatio: u.strengthRatio,
    structureScores: u.structureScores,
    // null when the engine refuses to assert (borderline / 從格-suspect) —
    // mirrored as-is, never replaced with a guess.
    usefulElement: u.usefulElement,
    favorableElements: u.favorableElements,
    unfavorableElements: u.unfavorableElements,
    flags: u.flags,
    reasoning: u.reasoning,
    breakdown: u.breakdown,
  };
  return { text: usefulText(input, resolved, u), structured };
}

export function computeUsefulText(input: BirthInput): string {
  return computeUsefulTool(input).text;
}

function usefulText(input: BirthInput, { result, unknownTime }: Resolved, u: ReturnType<typeof computeUsefulElement>): string {
  const lines = [
    'Useful Element · 用神',
    header(input, unknownTime),
    `Day Master: ${result.pillars.day.stem.zh} ${el(result.pillars.day.stem.element)}`,
    `Classification: ${u.classification} — support ${u.supportScore} vs drain ${u.drainScore} (ratio ${u.strengthRatio}).`,
    `Weighted forces — 比劫 ${u.structureScores.companion}, 印 ${u.structureScores.resource}, 食伤 ${u.structureScores.output}, 財 ${u.structureScores.wealth}, 官杀 ${u.structureScores.influence} (月令 weighted highest).`,
  ];
  if (u.usefulElement) {
    lines.push(`Useful Element (用神): ${el(u.usefulElement)}`);
    lines.push(`Favorable (喜神): ${u.favorableElements.map(el).join(', ')}`);
    lines.push(`Unfavorable (忌神): ${u.unfavorableElements.map(el).join(', ')}`);
  } else {
    lines.push(`Useful Element (用神): not asserted (${u.flags.join(', ') || 'inconclusive'}).`);
  }
  lines.push(`Reasoning: ${u.reasoning}`);
  return lines.join('\n');
}

export function computeDaYunTool(input: BirthInput): ToolOutput {
  const resolved = resolveChart(input);
  const { result, unknownTime, mode } = resolved;
  const dy = result.daYun;
  const structured = {
    birth: birthJson(input, unknownTime),
    available: Boolean(dy),
    ...(dy
      ? {
        direction: dy.forward ? 'forward' : 'backward',
        calculationMode: mode,
        startAge: { years: dy.startYears, months: dy.startMonths },
        nearestSolarTerm: dy.jie.name,
        cycles: dy.pillars.map((c) => ({
          stem: c.stem.zh,
          stemPinyin: c.stem.pinyin,
          stemElement: c.stem.element,
          branch: c.branch.zh,
          branchPinyin: c.branch.pinyin,
          branchElement: c.branch.element,
          ageStart: c.ageStart,
          ageEnd: c.ageEnd,
          yearStart: c.yearStart,
          yearEnd: c.yearEnd,
        })),
      }
      : {}),
  };
  return { text: daYunText(input, resolved), structured };
}

export function computeDaYunText(input: BirthInput): string {
  return computeDaYunTool(input).text;
}

function daYunText(input: BirthInput, { result, unknownTime, mode }: Resolved): string {
  const dy = result.daYun;
  if (!dy) {
    return ['Major Luck Cycles · 大運', header(input, unknownTime), 'Da Yun is unavailable for this chart.'].join('\n');
  }
  const cycles = dy.pillars
    .map((c) => `- Age ${c.ageStart}-${c.ageEnd} (${c.yearStart}-${c.yearEnd}): ${c.stem.zh}${c.branch.zh} (${c.stem.pinyin}/${c.branch.pinyin}) — ${c.stem.element}/${c.branch.element}`)
    .join('\n');
  return [
    'Major Luck Cycles · 大運',
    header(input, unknownTime),
    `Direction: ${dy.forward ? 'forward 順行' : 'backward 逆行'} (rule treats the chart as ${mode}; gender sets direction only).`,
    `Luck starts at age ${dy.startYears}${dy.startMonths ? ` years ${dy.startMonths} months` : ' years'}, measured from the 節氣 ${dy.jie.name}.`,
    unknownTime ? '(Birth time unknown — cycles are computed from a noon assumption and are approximate.)' : '',
    '',
    'Decade pillars:',
    cycles,
  ].filter(Boolean).join('\n');
}

// ── Phase 1.5 tools — deterministic calculation only, no scoring/ranking ─────

export type DayHoursInput = {
  date: string;        // YYYY-MM-DD
  timezone: string;    // IANA
  longitude: number;
};

// 12 時辰 ranges in TRUE SOLAR time (子 spans 23:00–01:00). Under the engine's
// 早子時 / midnight-rollover convention (see dayPillar in bazi.ts), 23:00–24:00
// solar keeps THIS date's day pillar, so one solar day has exactly these 12
// hour pillars and the 子 pillar covers both halves of its range.
const SHICHEN_SOLAR_RANGES = [
  '23:00–01:00', '01:00–03:00', '03:00–05:00', '05:00–07:00', '07:00–09:00', '09:00–11:00',
  '11:00–13:00', '13:00–15:00', '15:00–17:00', '17:00–19:00', '19:00–21:00', '21:00–23:00',
];

export function computeDayHoursTool(input: DayHoursInput): ToolOutput {
  // Reuse the full single-chart pipeline (Zod-independent validation, 60°
  // guard, TST) at clock noon: within the ±60° guard the solar correction is
  // ≤ ~4 h, so noon safely pins the date's day pillar, and the noon TST gives a
  // representative clock→solar correction for the day.
  const { result } = resolveChart({ date: input.date, time: '12:00', timezone: input.timezone, longitude: input.longitude });
  const p = result.pillars;
  const dayStemIdx = p.day.stemIdx;
  const corr = result.tst ? Math.round(result.tst.totalCorrectionMin) : 0;

  const hours = BRANCHES.map((b, branchIdx) => {
    // Midpoint of each solar 時辰 (子 → 00:00) through the engine's own
    // hourPillar — no re-derived stem table.
    const hp = hourPillar(new Date(Date.UTC(2000, 0, 1, branchIdx * 2, 0)), dayStemIdx);
    const pillar: Pillar = { stem: STEMS[hp.stemIdx], branch: BRANCHES[hp.branchIdx], stemIdx: hp.stemIdx, branchIdx: hp.branchIdx };
    return {
      shichen: b.zh,
      pinyin: b.pinyin,
      solarRange: SHICHEN_SOLAR_RANGES[branchIdx],
      pillar,
      tenGodVsDayMaster: tenGod(dayStemIdx, hp.stemIdx),
    };
  });

  const text = [
    'Hour Pillars for One Day · 12時辰',
    `Date: ${input.date} · ${input.timezone} · longitude ${input.longitude}°`,
    `Day pillar: ${p.day.stem.zh}${p.day.branch.zh} — Day Master ${p.day.stem.element} ${p.day.stem.yin ? 'Yin' : 'Yang'}. Year/Month/Day pillars are shared by all 12 hours; only the hour pillar changes.`,
    `Ranges are TRUE SOLAR time (solar ≈ clock ${corr >= 0 ? '+' : ''}${corr} min at noon on this date). For an exact clock time use compute_bazi_chart.`,
    '早子時 note: 23:00–24:00 solar still belongs to THIS date (midnight-rollover convention), so the 子 pillar covers both halves of 23:00–01:00.',
    '',
    ...hours.map((h) =>
      `- ${h.shichen} ${h.solarRange}: ${h.pillar.stem.zh}${h.pillar.branch.zh} (${h.pillar.stem.pinyin}/${h.pillar.branch.pinyin}) — ${h.pillar.stem.element} ${h.pillar.stem.yin ? 'Yin' : 'Yang'} · Ten God vs Day Master: ${h.tenGodVsDayMaster.zh} (${h.tenGodVsDayMaster.en})`),
  ].join('\n');

  const structured = {
    date: input.date,
    timezone: input.timezone,
    longitude: input.longitude,
    solarCorrectionMinutesAtNoon: corr,
    convention: 'early-zi (子正換日): 23:00–24:00 solar keeps the same day pillar',
    pillars: {
      year: pillarJson(p.year),
      month: pillarJson(p.month),
      day: { ...pillarJson(p.day), isDayMaster: true },
    },
    dayMaster: dayMasterJson(p.day),
    hours: hours.map((h) => ({
      shichen: h.shichen,
      pinyin: h.pinyin,
      solarRange: h.solarRange,
      pillar: pillarJson(h.pillar),
      tenGodVsDayMaster: h.tenGodVsDayMaster,
    })),
  };

  return { text, structured };
}

export type BatchInput = {
  dates: string[];     // YYYY-MM-DD each
  time?: string;       // HH:mm shared by every date; omit for unknown time
  timezone: string;
  longitude: number;
};

// Caps the per-call loop/payload. The route's Zod schema enforces this too,
// but mcp-tools is a standalone API and must not rely on the caller.
export const BATCH_MAX_DATES = 31;

export function computeBatchTool(input: BatchInput): ToolOutput {
  if (input.dates.length === 0) {
    throw new McpToolError('dates must contain at least one YYYY-MM-DD date.');
  }
  if (input.dates.length > BATCH_MAX_DATES) {
    throw new McpToolError(`dates accepts at most ${BATCH_MAX_DATES} dates per call (got ${input.dates.length}). Split the request.`);
  }

  // Each date goes through the exact single-chart tool (validation included —
  // the 60° guard is DST-aware, so it runs per date), guaranteeing a batch
  // entry is byte-for-byte the structured output of compute_bazi_chart.
  const charts = input.dates.map((date) =>
    computeChartTool({ date, time: input.time, timezone: input.timezone, longitude: input.longitude }).structured);

  const lines = charts.map((c) => {
    const pl = c.pillars;
    const hour = pl.hour ? `${pl.hour.stem}${pl.hour.branch}` : '— (time unknown)';
    return `- ${c.birth.date}: Year ${pl.year.stem}${pl.year.branch} · Month ${pl.month.stem}${pl.month.branch} · Day ${pl.day.stem}${pl.day.branch} (DM ${c.dayMaster.element} ${c.dayMaster.polarity}) · Hour ${hour}`;
  });

  const text = [
    `BaZi Batch · ${input.dates.length} date${input.dates.length === 1 ? '' : 's'}`,
    `Time: ${input.time ?? 'unknown (noon assumed)'} · ${input.timezone} · longitude ${input.longitude}°`,
    'Full per-date charts (true solar time, Ten Gods, five structures) are in the structured JSON.',
    '',
    ...lines,
  ].join('\n');

  return { text, structured: { timezone: input.timezone, longitude: input.longitude, time: input.time ?? null, count: charts.length, charts } };
}
