import test from 'node:test';
import assert from 'node:assert/strict';

import * as bazi from '../src/lib/bazi';

const TZ_UTC7 = 'Asia/Bangkok';
const LON_BKK = 100.52;

function computeUTC7(
  dateStr: string,
  timeStr: string | null,
  mode: 'male' | 'female' = 'male',
) {
  return bazi.computeBazi(dateStr, timeStr, TZ_UTC7, LON_BKK, mode);
}

function pillarStr(p: bazi.Pillar | null | undefined): string {
  if (!p) return '(null)';
  return p.stem.zh + p.branch.zh;
}

function branchContainsStemZh(branchIdx: number, stemZh: string): boolean {
  const hiddenIndices = bazi.BRANCH_HIDDEN_STEMS[branchIdx] ?? [];
  return hiddenIndices.some((idx) => bazi.STEMS[idx].zh === stemZh);
}

const engineSnapshotCases = [
  {
    id: 'basic-case-1',
    input: '1990-06-15 10:30 UTC+7',
    date: '1990-06-15',
    time: '10:30',
    expected: { year: '庚午', month: '壬午', day: '辛亥', hour: '癸巳' },
  },
  {
    id: 'basic-case-2',
    input: '1995-12-01 08:00 UTC+7',
    date: '1995-12-01',
    time: '08:00',
    expected: { year: '乙亥', month: '丁亥', day: '丙寅', hour: '壬辰' },
  },
  {
    id: 'basic-case-3',
    input: '2000-03-10 14:00 UTC+7',
    date: '2000-03-10',
    time: '14:00',
    expected: { year: '庚辰', month: '己卯', day: '丁卯', hour: '丁未' },
  },
];

for (const snapshotCase of engineSnapshotCases) {
  test(`engine snapshot / ${snapshotCase.id}`, () => {
    const result = computeUTC7(snapshotCase.date, snapshotCase.time);

    assert.deepEqual(
      {
        year: pillarStr(result.pillars.year),
        month: pillarStr(result.pillars.month),
        day: pillarStr(result.pillars.day),
        hour: pillarStr(result.pillars.hour),
      },
      snapshotCase.expected,
      `Engine snapshot changed for ${snapshotCase.input}`,
    );
  });
}

test('engine snapshot / Li Chun probes preserve the current year-month cutoff behavior', () => {
  const before = computeUTC7('2000-02-04', '08:00');
  const after = computeUTC7('2000-02-04', '20:00');

  assert.equal(pillarStr(before.pillars.year), '己卯');
  assert.equal(pillarStr(before.pillars.month), '丁丑');
  assert.equal(pillarStr(after.pillars.year), '庚辰');
  assert.equal(pillarStr(after.pillars.month), '戊寅');
});

test('engine snapshot / Zi hour still straddles midnight', () => {
  const late = computeUTC7('1998-08-08', '23:30');
  const early = computeUTC7('1998-08-09', '00:30');

  assert.equal(late.pillars.hour?.branch.zh, '子');
  assert.equal(early.pillars.hour?.branch.zh, '子');
});

test('engine snapshot / timezone changes alter UTC instant and hour branch near a boundary', () => {
  const resultUTC7 = bazi.computeBazi('1992-11-05', '23:00', 'Asia/Bangkok', LON_BKK, 'male');
  const resultUTC = bazi.computeBazi('1992-11-05', '23:00', 'UTC', 0, 'male');

  assert.notEqual(resultUTC7.utcDate.toISOString(), resultUTC.utcDate.toISOString());
  assert.notEqual(resultUTC7.pillars.hour?.branch.zh, resultUTC.pillars.hour?.branch.zh);
});

test('engine snapshot / leap day remains structurally valid', () => {
  const result = computeUTC7('2004-02-29', '12:00');
  assert.ok(result.pillars.year.stem.zh);
  assert.ok(result.pillars.month.stem.zh);
  assert.ok(result.pillars.day.stem.zh);
  assert.ok(result.pillars.hour?.stem.zh);
});

test('engine snapshot / 午 hidden stems include 丁 and 己', () => {
  const wuIdx = bazi.BRANCHES.findIndex((branch) => branch.zh === '午');
  assert.notEqual(wuIdx, -1);
  assert.ok(branchContainsStemZh(wuIdx, '丁'));
  assert.ok(branchContainsStemZh(wuIdx, '己'));
});

test('engine snapshot / result metadata stays internally coherent', () => {
  const result = computeUTC7('2010-10-10', '10:10');
  assert.equal(result.pillars.day.stem.zh, bazi.STEMS[result.pillars.day.stemIdx].zh);
  assert.equal(result.pillars.day.branch.zh, bazi.BRANCHES[result.pillars.day.branchIdx].zh);
  assert.equal(result.unknownTime, false);
  assert.ok(result.tstDate instanceof Date);
});

test('engine snapshot / stress probes still return a chart', () => {
  assert.doesNotThrow(() => computeUTC7('1970-01-01', '00:00'));
  assert.doesNotThrow(() => computeUTC7('2030-12-31', '23:59'));
});

// ── Aggregation model regression tests ────────────────────────────────────
//
// Reference chart: 1990-06-15 10:30 UTC+7 (basic-case-1)
//   Year  庚午  stem 庚(metal/yang)  branch 午(hidden: 丁,己)         — 2 hidden stems
//   Month 壬午  stem 壬(water/yang)  branch 午(hidden: 丁,己)         — 2 hidden stems
//   Day   辛亥  stem 辛(metal/yin)   branch 亥(hidden: 壬,甲)         — 2 hidden stems
//   Hour  癸巳  stem 癸(water/yin)   branch 巳(hidden: 丙,庚,戊)      — 3 hidden stems
//   DM: 辛 / metal / yin
//
// Flat-count model:
//   structureCounts total = 4 visible stems + (2+2+2+3) hidden = 13
//   tenGodsCount    total = 3 non-day visible + 9 hidden         = 12
//   asymmetry = 1 (day master's own visible stem is excluded from tenGodsCount only)

test('aggregation / structureCounts total equals visible stems plus all hidden stems', () => {
  const result = computeUTC7('1990-06-15', '10:30');
  const chartData = bazi.computeChartData(result.pillars, result.pillars.day.stemIdx, result.unknownTime);

  const total = Object.values(chartData.structureCounts).reduce((a, b) => a + b, 0);
  // 4 pillars × 1 visible + (2+2+2+3) hidden = 13
  assert.equal(total, 13, 'structureCounts total must equal visible + all hidden stems');
});

test('aggregation / tenGodsCount total excludes day master visible stem', () => {
  const result = computeUTC7('1990-06-15', '10:30');
  const chartData = bazi.computeChartData(result.pillars, result.pillars.day.stemIdx, result.unknownTime);

  const total = Object.values(chartData.tenGodsCount).reduce((a, b) => a + b, 0);
  // 3 non-day visible + 9 hidden = 12
  assert.equal(total, 12, 'tenGodsCount total must exclude the day master visible stem');
});

test('aggregation / structureCounts total is exactly 1 more than tenGodsCount total', () => {
  // The intentional asymmetry: the day master visible stem is in structureCounts
  // (classified as companion) but never in tenGodsCount.
  const result = computeUTC7('1990-06-15', '10:30');
  const chartData = bazi.computeChartData(result.pillars, result.pillars.day.stemIdx, result.unknownTime);

  const structureTotal = Object.values(chartData.structureCounts).reduce((a, b) => a + b, 0);
  const tenGodTotal    = Object.values(chartData.tenGodsCount).reduce((a, b) => a + b, 0);
  assert.equal(structureTotal - tenGodTotal, 1, 'asymmetry must be exactly 1 (day master visible stem)');
});

test('aggregation / per-structure counts match manual derivation for reference chart', () => {
  // DM 辛 (metal/yin):
  //   companion = metal  → 庚(yr) 辛(day DM) 庚(巳hidden)        = 3
  //   output    = water  → 壬(mo) 癸(hr) 壬(亥hidden)             = 3
  //   wealth    = wood   → 甲(亥hidden)                           = 1
  //   influence = fire   → 丁(年午) 丁(月午) 丙(巳hidden)         = 3
  //   resource  = earth  → 己(年午) 己(月午) 戊(巳hidden)         = 3
  const result = computeUTC7('1990-06-15', '10:30');
  const { structureCounts } = bazi.computeChartData(result.pillars, result.pillars.day.stemIdx, result.unknownTime);

  assert.equal(structureCounts.companion, 3);
  assert.equal(structureCounts.output,    3);
  assert.equal(structureCounts.wealth,    1);
  assert.equal(structureCounts.influence, 3);
  assert.equal(structureCounts.resource,  3);
});

test('aggregation / per-god counts match manual derivation for reference chart', () => {
  // DM 辛 (metal/yin). Ten Gods for each counted stem:
  //   庚(yr)→劫財  壬(mo)→傷官  癸(hr)→食神
  //   年午: 丁→偏官  己→偏印
  //   月午: 丁→偏官  己→偏印
  //   日亥: 壬→傷官  甲→正財
  //   時巳: 丙→正官  庚→劫財  戊→正印
  const result = computeUTC7('1990-06-15', '10:30');
  const { tenGodsCount } = bazi.computeChartData(result.pillars, result.pillars.day.stemIdx, result.unknownTime);

  assert.equal(tenGodsCount['劫財'], 2, '劫財 (庚yr + 庚巳hidden)');
  assert.equal(tenGodsCount['傷官'], 2, '傷官 (壬mo + 壬亥hidden)');
  assert.equal(tenGodsCount['食神'], 1, '食神 (癸hr)');
  assert.equal(tenGodsCount['偏官'], 2, '偏官 (丁年午 + 丁月午)');
  assert.equal(tenGodsCount['偏印'], 2, '偏印 (己年午 + 己月午)');
  assert.equal(tenGodsCount['正財'], 1, '正財 (甲亥hidden)');
  assert.equal(tenGodsCount['正官'], 1, '正官 (丙巳hidden)');
  assert.equal(tenGodsCount['正印'], 1, '正印 (戊巳hidden)');
});

test('aggregation / branch with 3 hidden stems contributes more counts than branch with 1', () => {
  // 辰 (Dragon, branchIdx=4) has 3 hidden stems: [戊,乙,癸]
  // 子 (Rat,    branchIdx=0) has 1 hidden stem:  [癸]
  // 卯 (Rabbit, branchIdx=3) has 1 hidden stem:  [乙]
  // Each hidden stem counts flat, so 辰 adds 3 to any tally vs 1 for 子 or 卯.
  assert.equal(bazi.BRANCH_HIDDEN_STEMS[4].length, 3, '辰 must have 3 hidden stems');
  assert.equal(bazi.BRANCH_HIDDEN_STEMS[0].length, 1, '子 must have 1 hidden stem');
  assert.ok(
    bazi.BRANCH_HIDDEN_STEMS[4].length > bazi.BRANCH_HIDDEN_STEMS[0].length,
    '辰 hidden stem count must exceed 子',
  );
});

test('aggregation / unknown-time mode uses 3 pillars and produces smaller totals', () => {
  // With unknownTime=true the hour pillar is omitted.
  // 巳 branch (hour) had 3 hidden stems, so totals drop by 1 visible + 3 hidden = 4.
  const result = computeUTC7('1990-06-15', null);   // null → unknownTime=true
  assert.equal(result.unknownTime, true);

  const chartData = bazi.computeChartData(result.pillars, result.pillars.day.stemIdx, result.unknownTime);
  const structureTotal = Object.values(chartData.structureCounts).reduce((a, b) => a + b, 0);
  const tenGodTotal    = Object.values(chartData.tenGodsCount).reduce((a, b) => a + b, 0);

  // 3 visible + (2+2+2) hidden = 9
  assert.equal(structureTotal, 9,  'unknown-time structureCounts total must be 9');
  // 2 non-day visible + 6 hidden = 8
  assert.equal(tenGodTotal,    8,  'unknown-time tenGodsCount total must be 8');
  // Asymmetry still holds
  assert.equal(structureTotal - tenGodTotal, 1, 'asymmetry must still be 1 in unknown-time mode');
});

test('aggregation / elementToStructure throws on unrecognised element input', () => {
  assert.throws(
    () => bazi.elementToStructure('aether', 'wood'),
    /unrecognised element/,
    'elementToStructure must throw for unknown element strings',
  );
  assert.throws(
    () => bazi.elementToStructure('wood', 'qi'),
    /unrecognised element/,
    'elementToStructure must throw for unknown dmEl strings',
  );
});
