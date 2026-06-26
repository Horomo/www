import test from 'node:test';
import assert from 'node:assert/strict';

import * as bazi from '../src/lib/bazi';

// ─────────────────────────────────────────────────────────────────────────────
// Fix A — 節氣 (solar-term) boundaries are compared in the UTC-instant frame.
//
// Year/Month pillars, 生肖, and Da Yun 起運 are decided by 節氣, which are
// absolute UTC instants. The birth moment compared against them must be the
// true UTC instant (result.utcDate), NOT True Solar Time (result.tstDate, which
// is shifted by stdOffset − DST + longitude correction + EoT, ~hours).
//
// Before this fix, computeBazi fed tstDate into yearPillar/monthPillar/
// computeDaYun, biasing every 節氣 boundary by the solar correction. These
// tests pin the corrected (UTC-instant) frame and prove the old frame differed.
// ─────────────────────────────────────────────────────────────────────────────

const pz = (p: { stemIdx: number; branchIdx: number }) =>
  bazi.STEMS[p.stemIdx].zh + bazi.BRANCHES[p.branchIdx].zh;

const TZ = {
  BKK: { tz: 'Asia/Bangkok', lon: 100.52 },
  SH: { tz: 'Asia/Shanghai', lon: 121.47 },
  NY: { tz: 'America/New_York', lon: -74.0 },
};

function utcFrameYearMonth(result: bazi.BaziResult) {
  const yp = bazi.yearPillar(result.utcDate);
  const mp = bazi.monthPillar(result.utcDate, yp.stemIdx);
  return { year: pz(yp), month: pz(mp) };
}

// ── 1. Frame invariant: result year/month always equals the UTC-instant frame ──
// Holds for ANY input. Exercised here across timezones and clock times that
// include 節氣-straddling cases where the old (tstDate) frame would diverge.
const invariantGrid = [
  '1990-06-15', '1995-12-01', '2000-03-10', // mid-month (ordinary charts)
  '2024-02-04', '2024-04-04', '2024-05-05', // around exact-lookup 節氣
];
const invariantTimes = ['00:30', '06:30', '12:00', '14:00', '20:00', '23:30'];

for (const { tz, lon } of Object.values(TZ)) {
  for (const date of invariantGrid) {
    for (const time of invariantTimes) {
      test(`frame invariant / ${date} ${time} ${tz}`, () => {
        const r = bazi.computeBazi(date, time, tz, lon, 'male');
        const expected = utcFrameYearMonth(r);
        assert.equal(pz(r.pillars.year), expected.year, 'year pillar must follow the UTC-instant frame');
        assert.equal(pz(r.pillars.month), expected.month, 'month pillar must follow the UTC-instant frame');
      });
    }
  }
}

// ── 2. Explicit 節氣-straddle cases: true instant before the term, solar time after ──
// In each case utcDate < termUTC < tstDate, so the corrected result follows
// utcDate while the OLD code (tstDate frame) produced the value in `oldWrong`.
const straddleCases: Array<{
  id: string; date: string; time: string; tz: string; lon: number;
  year: string; month: string; oldWrongYear?: string; oldWrongMonth?: string;
}> = [
  { id: '2024 立春 / BKK', date: '2024-02-04', time: '14:00', ...TZ.BKK, year: '癸卯', month: '乙丑', oldWrongYear: '甲辰' },
  { id: '2024 立春 / Shanghai', date: '2024-02-04', time: '15:00', ...TZ.SH, year: '癸卯', month: '乙丑', oldWrongYear: '甲辰' },
  { id: '2000 立春 / BKK', date: '2000-02-04', time: '14:00', ...TZ.BKK, year: '己卯', month: '丁丑', oldWrongYear: '庚辰' },
  // 清明 flips the MONTH only (year unchanged) — proves month boundary independently.
  { id: '2024 清明 / BKK (month-only)', date: '2024-04-04', time: '13:00', ...TZ.BKK, year: '甲辰', month: '丁卯', oldWrongMonth: '戊辰' },
];

for (const c of straddleCases) {
  test(`straddle / ${c.id} resolves on the true UTC instant`, () => {
    const r = bazi.computeBazi(c.date, c.time, c.tz, c.lon, 'male');
    assert.equal(pz(r.pillars.year), c.year, 'year must match the true-instant frame');
    assert.equal(pz(r.pillars.month), c.month, 'month must match the true-instant frame');

    // Prove this is a genuine cross-boundary case the OLD (tstDate) frame got wrong.
    const tstYear = pz(bazi.yearPillar(r.tstDate));
    const tstMonth = pz(bazi.monthPillar(r.tstDate, bazi.yearPillar(r.tstDate).stemIdx));
    if (c.oldWrongYear) {
      assert.equal(tstYear, c.oldWrongYear, 'sanity: tstDate frame would give the wrong year');
      assert.notEqual(tstYear, c.year, 'fix must change the outcome vs the old frame');
    }
    if (c.oldWrongMonth) {
      assert.equal(tstMonth, c.oldWrongMonth, 'sanity: tstDate frame would give the wrong month');
      assert.notEqual(tstMonth, c.month, 'fix must change the outcome vs the old frame');
    }
  });
}

// ── 3. 立春 + 生肖 (zodiac) flips at the true instant ──
// 立春 2024 = 2024-02-04T08:27Z. clock 14:00 BKK → utc 07:00 (before) ; 20:00 → utc 13:00 (after).
test('立春 / 生肖 follows the true instant, not solar time', () => {
  const before = bazi.computeBazi('2024-02-04', '14:00', TZ.BKK.tz, TZ.BKK.lon, 'male');
  const after = bazi.computeBazi('2024-02-04', '20:00', TZ.BKK.tz, TZ.BKK.lon, 'male');

  assert.equal(before.pillars.year.branch.animal, 'Rabbit', 'before 立春 → 癸卯 → Rabbit');
  assert.equal(after.pillars.year.branch.animal, 'Dragon', 'after 立春 → 甲辰 → Dragon');
});

// ── 4. Da Yun 起運 distance is measured in the UTC frame ──
// forward chart born ~40 min BEFORE 立夏 2024 (2024-05-05T00:10Z):
//   true (utcDate 2024-05-04T23:30) → nearest forward 節氣 = 立夏 → start 0y0m
//   OLD  (tstDate 2024-05-05T06:15, after 立夏) → next 節氣 芒種 → ~10 years off
test('Da Yun / 起運 uses the UTC instant — birth just before 立夏', () => {
  const r = bazi.computeBazi('2024-05-05', '06:30', TZ.BKK.tz, TZ.BKK.lon, 'male');
  assert.ok(r.daYun, 'da yun present');
  assert.equal(r.daYun!.forward, true);
  assert.match(r.daYun!.jie.name, /立夏/, 'nearest forward 節氣 from the true instant is 立夏');
  assert.equal(r.daYun!.startYears, 0, 'start age years (UTC frame)');
  assert.equal(r.daYun!.startMonths, 0, 'start age months (UTC frame)');

  // Simulate the OLD frame by feeding tstDate as the instant; it must diverge sharply.
  const oldSim = bazi.computeDaYun(
    r.tstDate,
    r.tstDate,
    { stemIdx: r.pillars.month.stemIdx, branchIdx: r.pillars.month.branchIdx },
    r.pillars.year.stemIdx,
    'male',
  );
  assert.ok(oldSim, 'old-sim da yun present');
  assert.match(oldSim!.jie.name, /芒種/, 'old frame would have selected the next 節氣 芒種');
  assert.notEqual(oldSim!.startYears, r.daYun!.startYears, 'old frame off by years (the bug)');
});

test('Da Yun / genuinely after 立夏 selects 芒種 (true-after baseline)', () => {
  const r = bazi.computeBazi('2024-05-05', '12:00', TZ.BKK.tz, TZ.BKK.lon, 'male');
  assert.ok(r.daYun);
  assert.equal(r.daYun!.forward, true);
  assert.match(r.daYun!.jie.name, /芒種/);
  assert.equal(r.daYun!.startYears, 10);
  assert.equal(r.daYun!.startMonths, 4);
});

// ── 5. Golden no-regression: ordinary mid-month charts are unchanged ──
// For these the UTC and solar frames sit on the same side of every 節氣, so the
// fix must not move them. Values match the existing engine snapshots.
const golden = [
  { date: '1990-06-15', time: '10:30', year: '庚午', month: '壬午', day: '辛亥', hour: '癸巳' },
  { date: '1995-12-01', time: '08:00', year: '乙亥', month: '丁亥', day: '丙寅', hour: '壬辰' },
  { date: '2000-03-10', time: '14:00', year: '庚辰', month: '己卯', day: '丁卯', hour: '丁未' },
];

for (const g of golden) {
  test(`golden / ${g.date} ${g.time} BKK unchanged`, () => {
    const r = bazi.computeBazi(g.date, g.time, TZ.BKK.tz, TZ.BKK.lon, 'male');
    assert.equal(pz(r.pillars.year), g.year);
    assert.equal(pz(r.pillars.month), g.month);
    assert.equal(pz(r.pillars.day), g.day);
    assert.equal(pz(r.pillars.hour!), g.hour);
    // Structural reason there is no regression: both frames agree away from 節氣.
    assert.equal(pz(bazi.yearPillar(r.utcDate)), pz(bazi.yearPillar(r.tstDate)), 'frames agree for mid-month births');
  });
}
