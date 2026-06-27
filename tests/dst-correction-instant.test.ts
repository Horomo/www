import test from 'node:test';
import assert from 'node:assert/strict';

import * as bazi from '../src/lib/bazi';

// ─────────────────────────────────────────────────────────────────────────────
// Fix G — DST is reverted by the real amount at the birth instant, not a
// hardcoded 60 minutes, and is not double-counted.
//
// True solar time = standard wall clock + longitude + EoT, where the standard
// wall clock is utcDate + stdOffsetMin (Fix D). DST reversion is already done by
// using the standard offset, so it must NOT be subtracted again. The reported
// dstCorrectionMin = stdOffsetMin − birthOffset (the clock→standard step) is the
// true DST amount: −60 for normal DST, −30 for Lord Howe, −120 for double summer
// time, 0 when DST is not in effect.
// ─────────────────────────────────────────────────────────────────────────────

const pz = (p: bazi.Pillar | null) => (p ? p.stem.zh + p.branch.zh : '(null)');
const branchZh = (p: { branchIdx: number }) => bazi.BRANCHES[p.branchIdx].zh;

// ── 1. Core invariant: tstDate = utcDate + std + lonCorrection + EoT (no DST term) ──
// Holds for every birth. On the old code (extra −60 for DST) this fails by an
// hour for any DST-active birth.
const invariantCases: Array<[string, string, string, number]> = [
  ['2024-07-15', '12:00', 'America/New_York', -74.0],      // EDT (60-min DST)
  ['2024-01-15', '12:00', 'Australia/Lord_Howe', 159.08],  // +11 summer (30-min DST)
  ['1947-07-15', '12:00', 'Europe/London', -0.13],         // Double British Summer Time (120)
  ['1990-06-15', '08:30', 'Asia/Bangkok', 100.52],         // no DST
  ['2024-01-15', '12:00', 'America/New_York', -74.0],      // EST winter (DST not active)
];

for (const [date, time, tz, lon] of invariantCases) {
  test(`dst / tstDate has no DST double-count (${tz} ${date} ${time})`, () => {
    const r = bazi.computeBazi(date, time, tz, lon, 'male');
    const std = bazi.getStdOffsetMinutes(r.utcDate, tz);
    const expectedMs = r.utcDate.getTime() + (std + (r.tst?.lonCorrectionMin ?? 0) + (r.tst?.eotMin ?? 0)) * 60000;
    assert.ok(
      Math.abs(r.tstDate.getTime() - expectedMs) < 1000,
      `tstDate must equal utc + std + lon + eot (no DST term). diff_ms=${r.tstDate.getTime() - expectedMs}`,
    );
  });
}

// ── 2. Sub-60-minute DST reverts the true amount (the root cause) ──
// Lord Howe summer: standard +10:30, clock +11:00 → DST is 30 min. The old
// hardcoded −60 pushed tstDate an extra 30 min early; at noon that flips the
// hour branch 午 → 巳.
test('dst / Lord Howe 30-minute DST reverts 30, not 60', () => {
  const r = bazi.computeBazi('2024-01-15', '12:00', 'Australia/Lord_Howe', 159.08, 'male');
  assert.equal(r.tst?.dstApplied, true);
  assert.equal(r.tst?.dstCorrectionMin, -30, 'reverted amount = std(630) − birthOffset(660)');
  assert.equal(branchZh(r.pillars.hour!), '午');

  // What the old hardcoded −60 would have produced (tstDate an extra 60 min early):
  const buggy = bazi.hourPillar(new Date(r.tstDate.getTime() - 60 * 60000), r.pillars.day.stemIdx);
  assert.equal(branchZh(buggy), '巳');
  assert.notEqual(branchZh(r.pillars.hour!), branchZh(buggy), 'fix changes the hour pillar vs the old −60');
});

// ── 3. Normal 60-min DST: reverted amount is 60, but not double-counted ──
test('dst / New York EDT reverts 60 with no double-count', () => {
  const r = bazi.computeBazi('2024-07-15', '12:00', 'America/New_York', -74.0, 'male');
  assert.equal(r.tst?.dstApplied, true);
  assert.equal(r.tst?.dstCorrectionMin, -60, 'std(−300) − birthOffset(−240)');
  // Standard clock for noon EDT is 11:00 EST; solar ≈ 11:00 + lon + eot, NOT 10:00.
  assert.equal(pz(r.pillars.hour), '辛巳');
});

// ── 4. Multi-tier double summer time reverts the full 120 ──
test('dst / London 1947 Double Summer Time reverts 120', () => {
  const r = bazi.computeBazi('1947-07-15', '12:00', 'Europe/London', -0.13, 'male');
  assert.equal(r.tst?.dstApplied, true);
  assert.equal(r.tst?.dstCorrectionMin, -120, 'std(0 GMT) − birthOffset(+120)');
  assert.equal(branchZh(r.pillars.hour!), '巳');
  // Old −60 under-reverted by an hour and would land in 辰.
  const buggy = bazi.hourPillar(new Date(r.tstDate.getTime() - 60 * 60000), r.pillars.day.stemIdx);
  assert.equal(branchZh(buggy), '辰');
});

// ── 5. Golden no-regression: DST-not-active charts are byte-identical ──
test('dst / non-DST Bangkok chart is unchanged', () => {
  const r = bazi.computeBazi('1990-06-15', '08:30', 'Asia/Bangkok', 100.52, 'male');
  assert.equal(r.tst?.dstApplied, false);
  assert.equal(r.tst?.dstCorrectionMin, 0);
  assert.equal(r.tstDate.toISOString(), '1990-06-15T08:11:47.465Z');
  assert.equal(pz(r.pillars.day), '辛亥');
});

test('dst / winter in a DST zone applies zero DST correction', () => {
  const r = bazi.computeBazi('2024-01-15', '12:00', 'America/New_York', -74.0, 'male');
  assert.equal(r.tst?.dstApplied, false);
  assert.equal(r.tst?.dstCorrectionMin, 0);
});

// ── 6. DST transition boundary: amount derived from the instant ──
test('dst / spring-forward day derives the correction from the instant', () => {
  // 2024-03-10 NY: DST begins 02:00→03:00. A noon birth is in EDT.
  const r = bazi.computeBazi('2024-03-10', '12:00', 'America/New_York', -74.0, 'male');
  assert.equal(r.tst?.dstApplied, true);
  assert.equal(r.tst?.dstCorrectionMin, -60);
});
