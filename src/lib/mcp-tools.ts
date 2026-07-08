// ─────────────────────────────────────────────────────────────────────────────
// MCP tool logic (Phase 1 + 1.5, read-only). Pure functions that turn a birth
// input into AI-readable text plus a structured JSON view by calling the
// existing BaZi engine. Kept free of any MCP/transport dependency so it is
// fully unit-testable and so the route handler stays a thin registration
// layer. See docs/mcp-server.md.
// ─────────────────────────────────────────────────────────────────────────────

import {
  BRANCHES,
  BRANCH_HIDDEN_STEMS,
  EL_LABEL,
  STEMS,
  computeBazi,
  computeChartData,
  computeUsefulElement,
  controlledBy,
  controls,
  generates,
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

// ── compute_compatibility (合婚) — deterministic relational analysis ──────────
//
// Two charts are resolved through the SAME single-chart pipeline (validation,
// 60° guard, engine) and a relational layer is computed on top. No pillar or
// 用神 logic is re-derived here; only standard cross-chart relation tables and
// explicit, documented scoring rules. No randomness anywhere.

export type CompatibilityPerson = {
  date: string;        // YYYY-MM-DD
  time?: string;       // HH:mm at the birthplace; omit when unknown
  timezone: string;    // IANA
  longitude: number;
};

export type CompatibilityInput = {
  personA: CompatibilityPerson;
  personB: CompatibilityPerson;
  // Optional — only unlocks the spouse-star (配偶星) axis. Never guessed.
  genderA?: 'male' | 'female';
  genderB?: 'male' | 'female';
};

// Standard Earthly-Branch relation tables, by branch index
// (子0 丑1 寅2 卯3 辰4 巳5 午6 未7 申8 酉9 戌10 亥11).
const SIX_HARMONY_PAIRS: Array<[number, number]> = [[0, 1], [2, 11], [3, 10], [4, 9], [5, 8], [6, 7]];
const CLASH_PAIRS: Array<[number, number]> = [[0, 6], [1, 7], [2, 8], [3, 9], [4, 10], [5, 11]];
const HARM_PAIRS: Array<[number, number]> = [[0, 7], [1, 6], [2, 5], [3, 4], [8, 11], [9, 10]];
const BREAK_PAIRS: Array<[number, number]> = [[0, 9], [1, 4], [2, 11], [3, 6], [5, 8], [7, 10]];
// 刑 as pairs: the 寅巳申 (无恩) and 丑戌未 (恃势) trios expanded pairwise, 子卯 (无礼),
// and the four self-punishments (辰辰 午午 酉酉 亥亥 — possible across two charts).
const PUNISHMENT_PAIRS: Array<[number, number]> = [
  [2, 5], [5, 8], [2, 8],
  [1, 10], [7, 10], [1, 7],
  [0, 3],
  [4, 4], [6, 6], [9, 9], [11, 11],
];
// 三合 frames and 三会 seasonal groups. Across two charts only a PAIR can occur,
// so a shared frame is reported as a half-combination (半合/半会), weaker than 六合.
const SAN_HE_TRIOS: number[][] = [[8, 0, 4], [11, 3, 7], [2, 6, 10], [5, 9, 1]];
const SAN_HUI_TRIOS: number[][] = [[2, 3, 4], [5, 6, 7], [8, 9, 10], [11, 0, 1]];

type InteractionKind = 'six_harmony' | 'san_he_half' | 'san_hui_half' | 'clash' | 'punishment' | 'harm' | 'break';

const INTERACTION_LABEL: Record<InteractionKind, { zh: string; en: string; effect: 'harmonious' | 'conflicting' }> = {
  six_harmony: { zh: '六合', en: 'six harmony', effect: 'harmonious' },
  san_he_half: { zh: '半三合', en: 'half trine', effect: 'harmonious' },
  san_hui_half: { zh: '半三会', en: 'half directional combination', effect: 'harmonious' },
  clash: { zh: '冲', en: 'clash', effect: 'conflicting' },
  punishment: { zh: '刑', en: 'punishment', effect: 'conflicting' },
  harm: { zh: '害', en: 'harm', effect: 'conflicting' },
  break: { zh: '破', en: 'break', effect: 'conflicting' },
};

// Branch-axis scoring: start neutral at 5, add/subtract per found interaction,
// clamp to [0,10]. These deltas are Horomo's documented, tunable stance —
// every point traces to one table row above.
const BRANCH_SCORE_DELTA: Record<InteractionKind, number> = {
  six_harmony: 1.5,
  san_he_half: 1.0,
  san_hui_half: 0.5,
  clash: -1.5,
  punishment: -1.0,
  harm: -0.75,
  break: -0.5,
};

// Overall weighting of the four axes (echoed in the output). Branch
// interactions carry the most (direct chart-to-chart friction/affinity), then
// 用神 complementarity, then the Day-Master relation, then the spouse star.
// Axes that cannot be assessed are dropped and the remaining weights renormalized.
const OVERALL_WEIGHTS = {
  dayMasterRelation: 0.2,
  branchInteractions: 0.35,
  usefulElementComplementarity: 0.3,
  spouseStar: 0.15,
} as const;

const round1 = (n: number) => Math.round(n * 10) / 10;

const matchesPair = (pairs: Array<[number, number]>, a: number, b: number) =>
  pairs.some(([x, y]) => (x === a && y === b) || (x === b && y === a));
const sharesTrio = (trios: number[][], a: number, b: number) =>
  a !== b && trios.some((t) => t.includes(a) && t.includes(b));

// Flat element occurrence count (visible stems + all hidden stems, 1 each) —
// the same flat-count philosophy as computeChartData, but keyed by raw element
// so it can be read against ANOTHER chart's 用神/spouse-star element.
function elementCounts(pillars: BaziResult['pillars'], unknownTime: boolean): Record<string, number> {
  const counts: Record<string, number> = { wood: 0, fire: 0, earth: 0, metal: 0, water: 0 };
  const keys = (unknownTime ? ['year', 'month', 'day'] : ['year', 'month', 'day', 'hour']) as Array<keyof BaziResult['pillars']>;
  keys.forEach((k) => {
    const p = pillars[k];
    if (!p) return;
    counts[p.stem.element]++;
    BRANCH_HIDDEN_STEMS[p.branchIdx].forEach((hs) => counts[STEMS[hs].element]++);
  });
  return counts;
}

function resolvePerson(label: 'personA' | 'personB', p: CompatibilityPerson, gender?: 'male' | 'female'): Resolved {
  try {
    return resolveChart({ ...p, gender });
  } catch (error) {
    if (error instanceof McpToolError) throw new McpToolError(`${label}: ${error.message}`);
    throw error;
  }
}

// Axis 1 — 天干生克: the two Day-Master elements on the 生/克 cycle, with
// direction. Fixed score per relation (documented): 生 8, 同 7, 克 4.
function dayMasterRelationAxis(a: Resolved, b: Resolved) {
  const aStem = a.result.pillars.day.stem;
  const bStem = b.result.pillars.day.stem;
  const aEl = aStem.element;
  const bEl = bStem.element;
  let relation: 'same' | 'generates' | 'controls';
  let direction: 'AtoB' | 'BtoA' | null;
  let score: number;
  let sentence: string;
  if (aEl === bEl) {
    relation = 'same'; direction = null; score = 7;
    sentence = `Both Day Masters are ${el(aEl)} (同) — peers of the same element.`;
  } else if (generates(aEl) === bEl) {
    relation = 'generates'; direction = 'AtoB'; score = 8;
    sentence = `${aStem.zh} ${el(aEl)} (A) generates ${bStem.zh} ${el(bEl)} (B) — ${EL_LABEL[aEl].zh}生${EL_LABEL[bEl].zh}: A nourishes B (and is leaked 泄 by B).`;
  } else if (generates(bEl) === aEl) {
    relation = 'generates'; direction = 'BtoA'; score = 8;
    sentence = `${bStem.zh} ${el(bEl)} (B) generates ${aStem.zh} ${el(aEl)} (A) — ${EL_LABEL[bEl].zh}生${EL_LABEL[aEl].zh}: B nourishes A (and is leaked 泄 by A).`;
  } else if (controls(aEl) === bEl) {
    relation = 'controls'; direction = 'AtoB'; score = 4;
    sentence = `${aStem.zh} ${el(aEl)} (A) controls ${bStem.zh} ${el(bEl)} (B) — ${EL_LABEL[aEl].zh}克${EL_LABEL[bEl].zh}: A dominates B.`;
  } else {
    relation = 'controls'; direction = 'BtoA'; score = 4;
    sentence = `${bStem.zh} ${el(bEl)} (B) controls ${aStem.zh} ${el(aEl)} (A) — ${EL_LABEL[bEl].zh}克${EL_LABEL[aEl].zh}: B dominates A.`;
  }
  const reasoning = `${sentence} Fixed rule scores: 生 (generation, either direction) 8, 同 (same element) 7, 克 (control, either direction) 4.`;
  return { score, relation, direction, reasoning };
}

// Axis 2 — 地支冲刑合会: every cross-chart branch pair (up to 4×4) checked
// against the standard relation tables above.
function branchInteractionAxis(a: Resolved, b: Resolved) {
  const keysOf = (r: Resolved) =>
    (r.unknownTime ? ['year', 'month', 'day'] : ['year', 'month', 'day', 'hour']) as Array<keyof BaziResult['pillars']>;
  const interactions: Array<{
    kind: InteractionKind; zh: string; en: string; effect: 'harmonious' | 'conflicting';
    pillarA: string; branchA: string; pillarB: string; branchB: string;
  }> = [];
  keysOf(a).forEach((ka) => {
    const pa = a.result.pillars[ka];
    if (!pa) return;
    keysOf(b).forEach((kb) => {
      const pb = b.result.pillars[kb];
      if (!pb) return;
      const found: InteractionKind[] = [];
      if (matchesPair(SIX_HARMONY_PAIRS, pa.branchIdx, pb.branchIdx)) found.push('six_harmony');
      if (sharesTrio(SAN_HE_TRIOS, pa.branchIdx, pb.branchIdx)) found.push('san_he_half');
      if (sharesTrio(SAN_HUI_TRIOS, pa.branchIdx, pb.branchIdx)) found.push('san_hui_half');
      if (matchesPair(CLASH_PAIRS, pa.branchIdx, pb.branchIdx)) found.push('clash');
      if (matchesPair(PUNISHMENT_PAIRS, pa.branchIdx, pb.branchIdx)) found.push('punishment');
      if (matchesPair(HARM_PAIRS, pa.branchIdx, pb.branchIdx)) found.push('harm');
      if (matchesPair(BREAK_PAIRS, pa.branchIdx, pb.branchIdx)) found.push('break');
      found.forEach((kind) => interactions.push({
        kind, ...INTERACTION_LABEL[kind],
        pillarA: ka, branchA: pa.branch.zh, pillarB: kb, branchB: pb.branch.zh,
      }));
    });
  });

  const score = round1(Math.min(10, Math.max(0,
    5 + interactions.reduce((sum, i) => sum + BRANCH_SCORE_DELTA[i.kind], 0))));
  const list = interactions.length
    ? interactions.map((i) => `A ${i.pillarA} ${i.branchA} × B ${i.pillarB} ${i.branchB}: ${i.zh} (${i.en})`).join('; ')
    : 'no notable branch interactions between the two charts';
  const deltas = Object.entries(BRANCH_SCORE_DELTA).map(([k, v]) => `${INTERACTION_LABEL[k as InteractionKind].zh} ${v > 0 ? '+' : ''}${v}`).join(', ');
  const reasoning = `Checked every cross-chart branch pair against the standard tables — found: ${list}. Score = 5 (neutral) plus per-interaction deltas (${deltas}), clamped to 0–10.`;
  return { score, interactions, reasoning };
}

type UsefulResult = ReturnType<typeof computeUsefulElement>;

// Axis 3 — 用神互补: how much of each person's needed element the OTHER chart
// carries. Each direction: min(4, flat count of the needed element in the
// partner's chart) × 2.5 → 0–10. A person whose 用神 the engine refuses to
// assert (borderline/從格) makes that direction unassessable — never guessed.
function complementarityAxis(aUseful: UsefulResult, bUseful: UsefulResult, aCounts: Record<string, number>, bCounts: Record<string, number>) {
  const direction = (needer: 'A' | 'B', useful: UsefulResult, partnerCounts: Record<string, number>) => {
    if (!useful.usefulElement) {
      return {
        assessed: false as const,
        score: null,
        neededElement: null,
        countInPartner: null,
        note: `cannot assess complementarity for this direction: person ${needer}'s 用神 is not asserted (${useful.flags.join(', ') || 'inconclusive'})`,
      };
    }
    const count = partnerCounts[useful.usefulElement] ?? 0;
    return {
      assessed: true as const,
      score: Math.min(4, count) * 2.5,
      neededElement: useful.usefulElement,
      countInPartner: count,
      note: `person ${needer} needs ${el(useful.usefulElement)}; the partner's chart carries it ${count}× (flat count)`,
    };
  };
  const aNeedsFromB = direction('A', aUseful, bCounts);
  const bNeedsFromA = direction('B', bUseful, aCounts);
  const assessedDirs = [aNeedsFromB, bNeedsFromA].filter((d) => d.assessed);
  const score = assessedDirs.length === 0
    ? null
    : round1(assessedDirs.reduce((s, d) => s + (d.score as number), 0) / assessedDirs.length);
  const reasoning = [
    aNeedsFromB.note,
    bNeedsFromA.note,
    score === null
      ? 'Neither 用神 is asserted — cannot assess complementarity for this axis.'
      : `Direction score = min(4, count) × 2.5; axis score = mean of the ${assessedDirs.length} assessable direction(s)${assessedDirs.length === 1 ? ' (the other direction is excluded, not guessed)' : ''}.`,
  ].join(' ');
  return { score, aNeedsFromB, bNeedsFromA, reasoning };
}

// Axis 4 — 配偶星: classical spouse star (male → 財 = element the Day Master
// controls; female → 官杀 = element that controls the Day Master). Asserted
// only when BOTH genders are provided — gender is never guessed.
function spouseStarAxis(a: Resolved, b: Resolved, aCounts: Record<string, number>, bCounts: Record<string, number>, genderA?: 'male' | 'female', genderB?: 'male' | 'female') {
  if (!genderA || !genderB) {
    return {
      asserted: false as const,
      score: null,
      personA: null,
      personB: null,
      reasoning: 'Spouse star (配偶星) not asserted: it depends on gender (male → 財, female → 官杀) and gender was not provided for both persons. Nothing is guessed.',
    };
  }
  const side = (who: 'A' | 'B', gender: 'male' | 'female', own: Resolved, ownCounts: Record<string, number>, partner: Resolved, partnerCounts: Record<string, number>) => {
    const dmEl = own.result.pillars.day.stem.element;
    const starElement = gender === 'male' ? controls(dmEl) : controlledBy(dmEl);
    const starZh = gender === 'male' ? '財' : '官杀';
    const ownCount = ownCounts[starElement];
    const partnerIsStar = partner.result.pillars.day.stem.element === starElement;
    const partnerCount = partnerCounts[starElement];
    // 0–5 per person: own chart carries the star (up to 2) + partner supplies it
    // (partner's Day Master IS the star element → 3, otherwise up to 2 by count).
    const score = Math.min(5, Math.min(2, ownCount) + (partnerIsStar ? 3 : Math.min(2, partnerCount)));
    return {
      gender,
      starElement,
      starZh,
      countInOwnChart: ownCount,
      partnerDayMasterIsStar: partnerIsStar,
      countInPartnerChart: partnerCount,
      score,
      note: `person ${who} (${gender}): spouse star ${starZh} = ${el(starElement)}; own chart has it ${ownCount}×, partner's Day Master ${partnerIsStar ? 'IS' : 'is not'} that element (partner carries it ${partnerCount}×)`,
    };
  };
  const sideA = side('A', genderA, a, aCounts, b, bCounts);
  const sideB = side('B', genderB, b, bCounts, a, aCounts);
  const score = round1(sideA.score + sideB.score);
  const reasoning = `${sideA.note}. ${sideB.note}. Per person 0–5 = min(2, own count) + (partner's Day Master is the star ? 3 : min(2, partner count)); axis = sum of both sides.`;
  return { asserted: true as const, score, personA: sideA, personB: sideB, reasoning };
}

export function computeCompatibilityTool(input: CompatibilityInput): ToolOutput {
  const a = resolvePerson('personA', input.personA, input.genderA);
  const b = resolvePerson('personB', input.personB, input.genderB);

  const aUseful = computeUsefulElement(a.result.pillars, a.result.pillars.day.stemIdx, a.unknownTime);
  const bUseful = computeUsefulElement(b.result.pillars, b.result.pillars.day.stemIdx, b.unknownTime);
  const aCounts = elementCounts(a.result.pillars, a.unknownTime);
  const bCounts = elementCounts(b.result.pillars, b.unknownTime);

  const dayMasterRelation = dayMasterRelationAxis(a, b);
  const branchInteractions = branchInteractionAxis(a, b);
  const complementarity = complementarityAxis(aUseful, bUseful, aCounts, bCounts);
  const spouseStar = spouseStarAxis(a, b, aCounts, bCounts, input.genderA, input.genderB);

  // Weighted overall — unassessable axes are dropped and weights renormalized.
  const axes: Array<{ key: keyof typeof OVERALL_WEIGHTS; score: number | null }> = [
    { key: 'dayMasterRelation', score: dayMasterRelation.score },
    { key: 'branchInteractions', score: branchInteractions.score },
    { key: 'usefulElementComplementarity', score: complementarity.score },
    { key: 'spouseStar', score: spouseStar.score },
  ];
  const assessed = axes.filter((x): x is { key: keyof typeof OVERALL_WEIGHTS; score: number } => x.score !== null);
  const weightSum = assessed.reduce((s, x) => s + OVERALL_WEIGHTS[x.key], 0);
  const overallScore = round1(assessed.reduce((s, x) => s + x.score * OVERALL_WEIGHTS[x.key], 0) / weightSum);

  const notes: string[] = [];
  if (a.unknownTime) notes.push('Person A birth time unknown — hour pillar excluded from every axis.');
  if (b.unknownTime) notes.push('Person B birth time unknown — hour pillar excluded from every axis.');
  if (complementarity.score === null) notes.push('用神 complementarity could not be assessed (neither 用神 asserted); its weight was redistributed.');
  else if (!complementarity.aNeedsFromB.assessed || !complementarity.bNeedsFromA.assessed) notes.push('用神 complementarity assessed in one direction only (the other 用神 is not asserted).');
  if (!spouseStar.asserted) notes.push('Spouse star axis not asserted (gender missing); its weight was redistributed.');

  const personJson = (r: Resolved, p: CompatibilityPerson, useful: UsefulResult, counts: Record<string, number>) => ({
    birth: birthJson(p, r.unknownTime),
    pillars: {
      year: pillarJson(r.result.pillars.year),
      month: pillarJson(r.result.pillars.month),
      day: { ...pillarJson(r.result.pillars.day), isDayMaster: true },
      hour: r.result.pillars.hour ? pillarJson(r.result.pillars.hour) : null,
    },
    dayMaster: dayMasterJson(r.result.pillars.day),
    usefulElement: {
      classification: useful.classification,
      usefulElement: useful.usefulElement,
      favorableElements: useful.favorableElements,
      unfavorableElements: useful.unfavorableElements,
      flags: useful.flags,
    },
    elementCounts: counts,
  });

  const structured = {
    personA: personJson(a, input.personA, aUseful, aCounts),
    personB: personJson(b, input.personB, bUseful, bCounts),
    dimensions: {
      dayMasterRelation,
      branchInteractions,
      usefulElementComplementarity: complementarity,
      spouseStar,
    },
    overall: {
      score: overallScore,
      weights: OVERALL_WEIGHTS,
      assessedAxes: assessed.map((x) => x.key),
      notes,
    },
  };

  const fmt = (s: number | null) => (s === null ? 'not assessed' : `${s}/10`);
  const personText = (label: string, p: CompatibilityPerson, r: Resolved) => [
    `${label} — ${header(p, r.unknownTime)}`,
    pillarLine('Year 年', r.result.pillars.year),
    pillarLine('Month 月', r.result.pillars.month),
    pillarLine('Day 日 (Day Master)', r.result.pillars.day),
    r.result.pillars.hour ? pillarLine('Hour 時', r.result.pillars.hour) : '- Hour 時: unknown (no birth time)',
  ];
  const text = [
    'Compatibility · 合婚',
    ...personText('Person A', input.personA, a),
    '',
    ...personText('Person B', input.personB, b),
    '',
    `1) Day Master relation (天干生克): ${fmt(dayMasterRelation.score)}`,
    `   ${dayMasterRelation.reasoning}`,
    `2) Branch interactions (地支冲刑合会): ${fmt(branchInteractions.score)}`,
    `   ${branchInteractions.reasoning}`,
    `3) Useful Element complementarity (用神互补): ${fmt(complementarity.score)}`,
    `   ${complementarity.reasoning}`,
    `4) Spouse star (配偶星): ${spouseStar.asserted ? fmt(spouseStar.score) : 'not asserted'}`,
    `   ${spouseStar.reasoning}`,
    '',
    `Overall: ${overallScore}/10 — weights: Day Master ${OVERALL_WEIGHTS.dayMasterRelation}, branches ${OVERALL_WEIGHTS.branchInteractions}, 用神 ${OVERALL_WEIGHTS.usefulElementComplementarity}, spouse star ${OVERALL_WEIGHTS.spouseStar} (unassessed axes dropped, weights renormalized).`,
    ...(notes.length ? ['Notes:', ...notes.map((n) => `- ${n}`)] : []),
  ].join('\n');

  return { text, structured };
}
