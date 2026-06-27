import test from 'node:test';
import assert from 'node:assert/strict';

import * as bazi from '../src/lib/bazi';

// ─────────────────────────────────────────────────────────────────────────────
// Fix D — standard offset is derived from the real non-DST offset around the
// birth instant, replacing the old min(January, July) heuristic.
//
// "Standard" = the offset the zone uses when DST is NOT in effect at that era.
// The new logic reads tzdata around the instant and never assumes DST = 60 min.
// stdOffsetMin feeds stdMeridian = stdOffsetMin/60*15, hence longitude
// correction, the DST flag, and the standard-time conversions in computeBazi.
// ─────────────────────────────────────────────────────────────────────────────

const D = (iso: string) => new Date(iso);

// ── 1. Permanent mid-year base-offset change (the core D bug), unit level ──
// Asia/Bangkok switched +6:42 → +7:00 permanently on 1920-04-01 (NOT DST).
// The old min(Jan,Jul) returned the smaller value (+6:42 = 402) for the whole
// year; per-instant derivation distinguishes the two halves.
test('std offset / permanent mid-year change resolves per instant (Asia/Bangkok 1920)', () => {
  assert.equal(bazi.getStdOffsetMinutes(D('1920-01-15T04:00:00Z'), 'Asia/Bangkok'), 402, 'Jan 1920 → +6:42');
  assert.equal(bazi.getStdOffsetMinutes(D('1920-12-15T04:00:00Z'), 'Asia/Bangkok'), 420, 'Dec 1920 → +7:00');
  // Neither side is DST — both must report no DST (old heuristic flagged Dec as DST).
  assert.equal(bazi.isDST(D('1920-01-15T04:00:00Z'), 'Asia/Bangkok'), false);
  assert.equal(bazi.isDST(D('1920-12-15T04:00:00Z'), 'Asia/Bangkok'), false);
});

// ── 2. End-to-end: the corrected std flows into stdMeridian → lonCorrection ──
// Dec 1920 BKK has whole-minute offset (+7:00) so clockTimeToUtc works.
// OLD code: std=402 → meridian 100.5° → lonCorr≈+0.08, and isDST→true → −60.
// NEW code: std=420 → meridian 105°  → lonCorr=−17.92, no DST. (Fails on old code.)
test('std offset / E2E permanent change feeds longitude correction (Dec 1920 BKK)', () => {
  const r = bazi.computeBazi('1920-12-20', '12:00', 'Asia/Bangkok', 100.52, 'male');
  assert.equal(r.stdOffsetMin, 420, 'std must be +7:00, not the min-heuristic +6:42');
  assert.equal(r.tst?.dstApplied, false, 'a permanent step is not DST');
  assert.equal(r.tst?.dstCorrectionMin, 0);
  // (100.52 − 105) × 4 = −17.92
  assert.ok(Math.abs((r.tst?.lonCorrectionMin ?? 0) - -17.92) < 1e-6, 'lonCorrection uses the 105° meridian');
});

// ── 3. DST is stripped without assuming 60 minutes ──
test('std offset / strips normal 60-min DST (America/New_York July)', () => {
  assert.equal(bazi.getStdOffsetMinutes(D('2024-07-15T12:00:00Z'), 'America/New_York'), -300, 'std = EST');
  assert.equal(bazi.isDST(D('2024-07-15T12:00:00Z'), 'America/New_York'), true);
  // E2E: meridian must be EST (−75°), not EDT (−60°): (−74 − −75) × 4 = +4.
  const ny = bazi.computeBazi('2024-07-15', '12:00', 'America/New_York', -74.0, 'male');
  assert.equal(ny.stdOffsetMin, -300);
  assert.equal(ny.tst?.dstApplied, true);
  assert.ok(Math.abs((ny.tst?.lonCorrectionMin ?? 0) - 4) < 1e-6);
});

test('std offset / strips historical China DST (Asia/Shanghai 1990)', () => {
  assert.equal(bazi.getStdOffsetMinutes(D('1990-07-15T04:00:00Z'), 'Asia/Shanghai'), 480, 'std = +8 (summer was +9)');
  assert.equal(bazi.isDST(D('1990-07-15T04:00:00Z'), 'Asia/Shanghai'), true);
  assert.equal(bazi.getStdOffsetMinutes(D('1990-01-15T04:00:00Z'), 'Asia/Shanghai'), 480);
});

test('std offset / southern-hemisphere DST (Australia/Sydney)', () => {
  // Sydney DST is in the local summer (Jan), so January is DST, July is standard.
  assert.equal(bazi.getStdOffsetMinutes(D('2024-01-15T00:00:00Z'), 'Australia/Sydney'), 600, 'std = +10');
  assert.equal(bazi.isDST(D('2024-01-15T00:00:00Z'), 'Australia/Sydney'), true);
  assert.equal(bazi.getStdOffsetMinutes(D('2024-07-15T00:00:00Z'), 'Australia/Sydney'), 600);
  assert.equal(bazi.isDST(D('2024-07-15T00:00:00Z'), 'Australia/Sydney'), false);
});

// ── 3b. DST ≠ 60 minutes: proves the probe is right where "minus 60" is wrong ──
// Lord Howe Island uses a 30-minute DST: standard +10:30 (630), summer +11:00 (660).
// "offset − 60" would give 600 (+10:00) — wrong. The probe reads 630 from tzdata.
test('std offset / handles 30-minute DST without a fixed −60 assumption (Lord Howe)', () => {
  const summer = D('2024-01-15T00:00:00Z');
  assert.equal(bazi.getUtcOffsetMinutes(summer, 'Australia/Lord_Howe'), 660, 'summer offset = +11:00');
  assert.equal(bazi.getStdOffsetMinutes(summer, 'Australia/Lord_Howe'), 630, 'standard = +10:30 (DST is 30 min, not 60)');
  assert.notEqual(bazi.getStdOffsetMinutes(summer, 'Australia/Lord_Howe'), 660 - 60, 'a −60 shortcut would give the wrong 600');
});

// ── 3c. Multi-tier double summer time resolves to the base, not a middle tier ──
// Europe/London 1947 ran GMT(0) → BST(+60) → Double BST(+120) → BST(+60) → GMT(0).
// The standard base is GMT(0) all year; every tier must report std=0.
test('std offset / double summer time resolves to the base offset (London 1947)', () => {
  for (const iso of ['1947-01-15T12:00:00Z', '1947-05-15T12:00:00Z', '1947-07-15T12:00:00Z', '1947-10-15T12:00:00Z']) {
    assert.equal(bazi.getStdOffsetMinutes(D(iso), 'Europe/London'), 0, `std must be GMT base at ${iso}`);
  }
  // The +120 peak is two tiers above standard — a single "−60" would miss it.
  assert.equal(bazi.getUtcOffsetMinutes(D('1947-07-15T12:00:00Z'), 'Europe/London'), 120);
});

// ── 4. Golden no-regression: zones without DST are byte-identical ──
test('std offset / DST-free zones unchanged (Asia/Bangkok, Asia/Shanghai)', () => {
  assert.equal(bazi.getStdOffsetMinutes(D('2024-06-15T04:00:00Z'), 'Asia/Bangkok'), 420);
  assert.equal(bazi.getStdOffsetMinutes(D('2020-06-15T04:00:00Z'), 'Asia/Shanghai'), 480);
});

test('std offset / ordinary modern chart is unaffected (1990-06-15 BKK snapshot)', () => {
  const r = bazi.computeBazi('1990-06-15', '10:30', 'Asia/Bangkok', 100.52, 'male');
  assert.equal(r.stdOffsetMin, 420);
  const pz = (p: { stemIdx: number; branchIdx: number }) => bazi.STEMS[p.stemIdx].zh + bazi.BRANCHES[p.branchIdx].zh;
  assert.equal(pz(r.pillars.year), '庚午');
  assert.equal(pz(r.pillars.month), '壬午');
  assert.equal(pz(r.pillars.day), '辛亥');
  assert.equal(pz(r.pillars.hour!), '癸巳');
});

// ── 5. Probing stays clear of DST gap / ambiguous windows ──
// Birth on the US spring-forward day (2024-03-10, ~07:00Z transition). The
// monthly-step probe lands well away from the ~1-hour gap, so std resolves to
// EST cleanly and nothing throws.
test('std offset / resolves correctly near a DST transition boundary', () => {
  assert.doesNotThrow(() => bazi.getStdOffsetMinutes(D('2024-03-10T12:00:00Z'), 'America/New_York'));
  assert.equal(bazi.getStdOffsetMinutes(D('2024-03-10T12:00:00Z'), 'America/New_York'), -300);
  assert.equal(bazi.getStdOffsetMinutes(D('2024-11-03T12:00:00Z'), 'America/New_York'), -300);
});
