import test from 'node:test';
import assert from 'node:assert/strict';

import * as bazi from '../src/lib/bazi';

// ─────────────────────────────────────────────────────────────────────────────
// 用神 (Useful Element) engine — deterministic, tunable, transparent.
// The 扶抑 DIRECTION (weak→support, strong→drain) and 月令-highest precedence are
// fixed and tested here. The numeric weights/thresholds are config and tested for
// tunability. Borderline/從格 charts must be FLAGGED, never force-judged.
// Charts below were chosen (Asia/Bangkok) to land clearly in each classification.
// ─────────────────────────────────────────────────────────────────────────────

const LON = 100.52;
const TZ = 'Asia/Bangkok';
const useful = (date: string, time: string | null, cfg?: bazi.StrengthConfig) => {
  const r = bazi.computeBazi(date, time, TZ, LON, 'male');
  return bazi.computeUsefulElement(r.pillars, r.pillars.day.stemIdx, !time, cfg);
};
const SUPPORT = new Set(['companion', 'resource']);
const DRAIN = new Set(['output', 'wealth', 'influence']);
const structureOf = (elKey: string, dmEl: string) => bazi.elementToStructure(elKey, dmEl);

// Representative charts (verified deterministic with the default config):
const STRONG = ['1950-01-05', '02:00'] as const;       // ratio ~0.59
const WEAK = ['1950-03-05', '02:00'] as const;         // ratio ~0.38
const BORDERLINE = ['1950-01-05', '22:00'] as const;   // ratio ~0.47
const SPECIAL = ['1950-03-15', '22:00'] as const;      // ratio ~0.15

// ── 1. Ten God mapping + breakdown transparency ──
test('useful / breakdown is complete and side matches structure', () => {
  const u = useful(...STRONG);
  assert.ok(u.breakdown.length > 0, 'breakdown must list contributing components');
  const validTenGods = new Set(['比肩', '劫財', '食神', '傷官', '偏財', '正財', '偏官', '正官', '偏印', '正印']);
  for (const c of u.breakdown) {
    assert.equal(c.side, SUPPORT.has(c.structure) ? 'support' : 'drain', `${c.position} side must match its structure`);
    assert.ok(validTenGods.has(c.tenGod), `${c.tenGod} is a valid Ten God`);
    assert.ok(c.weight > 0, 'every component carries a positive weight');
  }
  // The Day Master's own visible stem is the subject, not a force on itself.
  assert.ok(!u.breakdown.some((c) => c.position === 'day stem'), 'day stem (the DM) is excluded');
  // Scores reconcile with the per-structure tally.
  const sumStruct = Object.values(u.structureScores).reduce((a, b) => a + b, 0);
  assert.ok(Math.abs(sumStruct - (u.supportScore + u.drainScore)) < 1e-9, 'structure scores reconcile with support+drain');
});

// ── 2. 扶抑 direction: weak → support, strong → drain ──
test('useful / strong Day Master gets a DRAINING useful element', () => {
  const u = useful(...STRONG);
  assert.equal(u.classification, 'strong');
  assert.ok(u.usefulElement, 'strong chart asserts a useful element');
  assert.ok(DRAIN.has(structureOf(u.usefulElement!, u.dayMaster.element)), 'useful element drains a strong DM');
  for (const f of u.favorableElements) assert.ok(DRAIN.has(structureOf(f, u.dayMaster.element)), 'favorable elements all drain');
});

test('useful / weak Day Master gets a SUPPORTING useful element', () => {
  const u = useful(...WEAK);
  assert.equal(u.classification, 'weak');
  assert.ok(u.usefulElement, 'weak chart asserts a useful element');
  assert.ok(SUPPORT.has(structureOf(u.usefulElement!, u.dayMaster.element)), 'useful element supports a weak DM');
  for (const f of u.favorableElements) assert.ok(SUPPORT.has(structureOf(f, u.dayMaster.element)), 'favorable elements all support');
});

// ── 2b. Exact 病藥 selection: the specific element that counters the dominant cause ──
test('useful / 病藥 picks the specific countering element (all four branches)', () => {
  const cases: Array<[string, string, string]> = [
    ['1950-01-05', '02:00', 'wealth'],    // strong from 印 (resource) → 財剋印
    ['1955-01-18', '04:00', 'influence'], // strong from 比劫 (companion) → 官杀
    ['1950-03-05', '02:00', 'resource'],  // weak, 官杀/食伤 dominant drain → 印
    ['1955-01-03', '04:00', 'companion'], // weak, 財 (wealth) dominant drain → 比劫
  ];
  for (const [d, t, expectedStructure] of cases) {
    const r = useful(d, t);
    assert.ok(r.usefulElement, `${d} ${t} asserts a useful element`);
    assert.equal(structureOf(r.usefulElement as string, r.dayMaster.element), expectedStructure, `${d} ${t} 用神 must be the ${expectedStructure} element`);
  }
});

// ── 3. Borderline → flagged, NOT force-judged ──
test('useful / borderline chart is flagged with no asserted useful element', () => {
  const u = useful(...BORDERLINE);
  assert.equal(u.classification, 'borderline');
  assert.equal(u.usefulElement, null);
  assert.deepEqual(u.favorableElements, []);
  assert.ok(u.flags.includes('borderline'));
  assert.match(u.reasoning, /balanced|threshold/i);
});

// ── 4. Special structure (從格-suspect) → flagged, no normal 用神 ──
test('useful / extreme chart is flagged special_structure with no useful element', () => {
  const u = useful(...SPECIAL);
  assert.equal(u.classification, 'special_structure');
  assert.equal(u.usefulElement, null);
  assert.ok(u.flags.includes('special_structure'));
  assert.match(u.reasoning, /從格|special|expert/i);
});

// ── 5. Config tunability — weights/thresholds are NOT hardcoded ──
test('useful / raising strongThreshold reclassifies a strong chart as borderline', () => {
  const def = useful(...STRONG);
  assert.equal(def.classification, 'strong');
  const tuned = useful(...STRONG, { ...bazi.DEFAULT_STRENGTH_CONFIG, strongThreshold: 0.70 });
  assert.equal(tuned.classification, 'borderline', 'threshold change must flow through to classification');
});

test('useful / changing the month-command weight changes the strength ratio', () => {
  const def = useful(...STRONG);
  const tuned = useful(...STRONG, { ...bazi.DEFAULT_STRENGTH_CONFIG, monthCommandWeight: 0 });
  assert.notEqual(tuned.strengthRatio, def.strengthRatio, 'month-command weight must affect the score');
});

test('useful / weakThreshold and extremeThreshold are tunable', () => {
  // Raising weakThreshold pulls a borderline chart into 'weak'.
  assert.equal(useful(...BORDERLINE).classification, 'borderline');
  assert.equal(useful(...BORDERLINE, { ...bazi.DEFAULT_STRENGTH_CONFIG, weakThreshold: 0.47 }).classification, 'weak');
  // Loosening extremeThreshold turns a plain weak chart into special_structure.
  assert.equal(useful(...WEAK).classification, 'weak');
  assert.equal(useful(...WEAK, { ...bazi.DEFAULT_STRENGTH_CONFIG, extremeThreshold: 0.62 }).classification, 'special_structure');
});

test('useful / root-depth weights feed the score (本/中/余气 tunable)', () => {
  const def = useful(...WEAK);
  const tuned = useful(...WEAK, { ...bazi.DEFAULT_STRENGTH_CONFIG, rootWeight: { primary: 1, middle: 1, residual: 1 } });
  assert.notEqual(tuned.strengthRatio, def.strengthRatio, 'root-depth weights must affect the score');
});

// ── 6. 月令 carries the most weight ──
test('useful / the month branch (月令) outweighs other branches at the same depth', () => {
  const u = useful(...STRONG);
  const monthPrimary = u.breakdown.find((c) => c.monthCommand && c.position.includes('本气'));
  const otherPrimary = u.breakdown.find((c) => !c.monthCommand && c.position.includes('branch 本气'));
  assert.ok(monthPrimary && otherPrimary, 'both a month and a non-month primary-qi root exist');
  assert.ok(monthPrimary!.weight > otherPrimary!.weight, '月令 primary qi must weigh more than a non-month primary qi');
});

// ── 7. Unknown birth time: 3 pillars, still resolves without throwing ──
test('useful / unknown-time charts use three pillars and still classify', () => {
  const u = useful('1990-06-15', null);
  assert.ok(!u.breakdown.some((c) => c.position.startsWith('hour')), 'no hour pillar when time unknown');
  assert.ok(['strong', 'weak', 'borderline', 'special_structure'].includes(u.classification));
});
