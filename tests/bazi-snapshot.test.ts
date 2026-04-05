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
