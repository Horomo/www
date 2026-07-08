import test from 'node:test';
import assert from 'node:assert/strict';

import { computeCompatibilityTool, McpToolError, type CompatibilityInput } from '../src/lib/mcp-tools';

// ─────────────────────────────────────────────────────────────────────────────
// compute_compatibility (合婚). Deterministic relational layer over the same
// engine the single-chart tools use — these tests pin the golden couple, the
// graceful degradation paths (borderline 用神, missing gender), and validation.
// ─────────────────────────────────────────────────────────────────────────────

const BKK = { timezone: 'Asia/Bangkok', longitude: 100.5 };
const GOLDEN: CompatibilityInput = {
  personA: { date: '1980-04-20', time: '02:00', ...BKK },
  personB: { date: '1980-12-14', time: '21:49', ...BKK },
  genderA: 'male',
  genderB: 'female',
};

type Structured = Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any

test('compatibility / golden couple — Day Master relation is 辛 metal (B) 生 癸 water (A)', () => {
  const s = computeCompatibilityTool(GOLDEN).structured as Structured;
  assert.equal(s.personA.dayMaster.stem, '癸');
  assert.equal(s.personA.dayMaster.element, 'water');
  assert.equal(s.personB.dayMaster.stem, '辛');
  assert.equal(s.personB.dayMaster.element, 'metal');
  const dm = s.dimensions.dayMasterRelation;
  assert.equal(dm.relation, 'generates');
  assert.equal(dm.direction, 'BtoA'); // 金生水
  assert.equal(dm.score, 8);
  assert.match(dm.reasoning, /金生水/);
});

test('compatibility / golden couple — 辰 (A month) × 酉 (B day) 六合 is found', () => {
  const s = computeCompatibilityTool(GOLDEN).structured as Structured;
  const hit = s.dimensions.branchInteractions.interactions.find(
    (i: Structured) => i.kind === 'six_harmony' && i.pillarA === 'month' && i.branchA === '辰' && i.pillarB === 'day' && i.branchB === '酉',
  );
  assert.ok(hit, '辰酉六合 between A month and B day must be reported');
  assert.equal(typeof s.dimensions.branchInteractions.score, 'number');
});

test('compatibility / golden couple — both charts lack fire, so the spouse-star axis is weak', () => {
  const s = computeCompatibilityTool(GOLDEN).structured as Structured;
  assert.equal(s.personA.elementCounts.fire, 0);
  assert.equal(s.personB.elementCounts.fire, 0);
  const spouse = s.dimensions.spouseStar;
  assert.equal(spouse.asserted, true);
  assert.equal(spouse.personA.starElement, 'fire');  // male 癸 water → 財 = fire
  assert.equal(spouse.personB.starElement, 'fire');  // female 辛 metal → 官杀 = fire
  assert.equal(spouse.score, 0);
});

test('compatibility / golden couple — overall score is weighted, documented, deterministic', () => {
  const first = computeCompatibilityTool(GOLDEN);
  const second = computeCompatibilityTool(GOLDEN);
  assert.deepEqual(first.structured, second.structured); // same input → same output, always
  assert.deepEqual(first.text, second.text);
  const overall = (first.structured as Structured).overall;
  assert.ok(overall.score >= 0 && overall.score <= 10);
  assert.deepEqual(overall.weights, {
    dayMasterRelation: 0.2,
    branchInteractions: 0.35,
    usefulElementComplementarity: 0.3,
    spouseStar: 0.15,
  });
  assert.match(first.text, /Compatibility · 合婚/);
  assert.match(first.text, /Overall: /);
});

test('compatibility / borderline 用神 (person A) degrades that direction gracefully — no crash', () => {
  // Person A's chart is the known borderline case (ratio ~0.5): the engine
  // refuses to assert a 用神, so the A-needs-from-B direction must be excluded.
  const s = computeCompatibilityTool(GOLDEN).structured as Structured;
  assert.equal(s.personA.usefulElement.usefulElement, null);
  assert.ok(s.personA.usefulElement.flags.includes('borderline'));
  const comp = s.dimensions.usefulElementComplementarity;
  assert.equal(comp.aNeedsFromB.assessed, false);
  assert.match(comp.aNeedsFromB.note, /cannot assess complementarity/);
  assert.equal(comp.bNeedsFromA.assessed, true);
  assert.equal(typeof comp.score, 'number'); // one assessable direction still scores
});

test('compatibility / both 用神 not asserted — the whole axis is dropped, weights renormalized', () => {
  const borderline = { date: '1980-04-20', time: '02:00', ...BKK };
  const out = computeCompatibilityTool({ personA: borderline, personB: borderline });
  const s = out.structured as Structured;
  const comp = s.dimensions.usefulElementComplementarity;
  assert.equal(comp.score, null);
  assert.match(comp.reasoning, /cannot assess complementarity/);
  assert.ok(!s.overall.assessedAxes.includes('usefulElementComplementarity'));
  assert.ok(s.overall.score >= 0 && s.overall.score <= 10); // still produces an overall
  assert.match(out.text, /not assessed/);
});

test('compatibility / no gender — spouse star section is not asserted, never guessed', () => {
  const { personA, personB } = GOLDEN;
  const out = computeCompatibilityTool({ personA, personB });
  const spouse = (out.structured as Structured).dimensions.spouseStar;
  assert.equal(spouse.asserted, false);
  assert.equal(spouse.score, null);
  assert.equal(spouse.personA, null);
  assert.equal(spouse.personB, null);
  assert.match(spouse.reasoning, /not asserted/);
  assert.ok(!(out.structured as Structured).overall.assessedAxes.includes('spouseStar'));
  assert.match(out.text, /4\) Spouse star \(配偶星\): not asserted/);
});

test('compatibility / one gender only is not enough for the spouse-star axis', () => {
  const { personA, personB } = GOLDEN;
  const spouse = (computeCompatibilityTool({ personA, personB, genderA: 'male' }).structured as Structured).dimensions.spouseStar;
  assert.equal(spouse.asserted, false);
});

test('compatibility / validation — lon 0, out-of-range lon, and bad timezone are rejected per person', () => {
  const { personA, personB } = GOLDEN;
  // lon 0 + Asia/Bangkok trips the shared 60° guard.
  assert.throws(
    () => computeCompatibilityTool({ personA, personB: { ...personB, longitude: 0 } }),
    (e: unknown) => e instanceof McpToolError && /personB/.test(e.message) && /does not match timezone/.test(e.message),
  );
  assert.throws(
    () => computeCompatibilityTool({ personA: { ...personA, longitude: 999 }, personB }),
    (e: unknown) => e instanceof McpToolError && /personA/.test(e.message) && /between -180 and 180/.test(e.message),
  );
  assert.throws(
    () => computeCompatibilityTool({ personA, personB: { ...personB, timezone: 'Not/AZone' } }),
    (e: unknown) => e instanceof McpToolError && /personB/.test(e.message) && /Invalid IANA timezone/.test(e.message),
  );
});

test('compatibility / unknown birth time — hour pillar excluded, noted, no crash', () => {
  const { personA, personB } = GOLDEN;
  const out = computeCompatibilityTool({ personA: { date: personA.date, ...BKK }, personB, genderA: 'male', genderB: 'female' });
  const s = out.structured as Structured;
  assert.equal(s.personA.pillars.hour, null);
  assert.ok(s.overall.notes.some((n: string) => /Person A birth time unknown/.test(n)));
});
