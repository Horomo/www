// ─────────────────────────────────────────────────────────────────────────────
// MCP tool logic (Phase 1, read-only). Pure functions that turn a birth input
// into AI-readable text by calling the existing BaZi engine. Kept free of any
// MCP/transport dependency so it is fully unit-testable and so the route handler
// stays a thin registration layer. See docs/mcp-server.md.
// ─────────────────────────────────────────────────────────────────────────────

import {
  EL_LABEL,
  computeBazi,
  computeChartData,
  computeUsefulElement,
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

export function computeChartText(input: BirthInput): string {
  const { result, unknownTime } = resolveChart(input);
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

export function computeUsefulText(input: BirthInput): string {
  const { result, unknownTime } = resolveChart(input);
  const u = computeUsefulElement(result.pillars, result.pillars.day.stemIdx, unknownTime);
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

export function computeDaYunText(input: BirthInput): string {
  const { result, unknownTime, mode } = resolveChart(input);
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
