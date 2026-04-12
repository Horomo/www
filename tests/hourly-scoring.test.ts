import test from 'node:test';
import assert from 'node:assert/strict';

import { clockTimeToUtc, computeBazi, getDaYunCycleStartDate } from '../src/lib/bazi';
import * as hourly from '../src/lib/hourly-scoring';
import type { AnalysisFormPayload } from '../src/lib/analysis-payload';

const baseProfile: AnalysisFormPayload = {
  dob: '1990-06-15',
  tob: '08:30',
  timezone: 'Asia/Bangkok',
  longitude: '100.52',
  latitude: '13.75',
  birthPlaceQuery: 'Bangkok, Thailand',
  birthPlace: null,
  genderIdentity: 'male',
  genderOtherText: '',
  calculationMode: 'male',
  unknownTime: false,
};

test('Day Master strength classification returns weak, balanced, and strong', () => {
  assert.equal(
    hourly.determineDayMasterStrength({
      structureCounts: { companion: 4, output: 0, wealth: 0, influence: 0, resource: 1 },
      structureEls: {},
      tenGodsCount: {},
    }),
    'strong',
  );

  assert.equal(
    hourly.determineDayMasterStrength({
      structureCounts: { companion: 1, output: 0, wealth: 3, influence: 0, resource: 0 },
      structureEls: {},
      tenGodsCount: {},
    }),
    'weak',
  );

  assert.equal(
    hourly.determineDayMasterStrength({
      structureCounts: { companion: 2, output: 0, wealth: 2, influence: 0, resource: 0 },
      structureEls: {},
      tenGodsCount: {},
    }),
    'balanced',
  );
});

test('favorable and unfavorable element derivation matches the agreed rule', () => {
  assert.deepEqual(hourly.getFavorableUnfavorableElements('wood', 'weak'), {
    favorableElements: ['wood', 'water'],
    unfavorableElements: ['earth', 'metal'],
  });

  assert.deepEqual(hourly.getFavorableUnfavorableElements('wood', 'strong'), {
    favorableElements: ['earth', 'metal'],
    unfavorableElements: ['wood', 'water'],
  });

  assert.deepEqual(hourly.getFavorableUnfavorableElements('wood', 'balanced'), {
    favorableElements: ['wood', 'water'],
    unfavorableElements: [],
  });
});

test('strong clash is handled separately from unfavorable scoring', () => {
  assert.equal(hourly.scoreHourElement('fire', 'wood', ['wood', 'water'], [], 'wood', 'balanced'), 0);
  assert.equal(hourly.scoreHourElement('earth', 'wood', ['wood', 'water'], [], 'wood', 'balanced'), 0);
  assert.equal(hourly.scoreHourElement('metal', 'wood', ['wood', 'water'], [], 'wood', 'balanced'), -2);
  assert.equal(hourly.scoreHourElement('water', 'wood', ['wood', 'water'], [], 'wood', 'balanced'), 1);
  assert.equal(hourly.scoreHourElement('wood', 'wood', ['wood', 'water'], [], 'wood', 'balanced'), 2);
});

test('usefulGod is the first favorable element', () => {
  assert.equal(hourly.getUsefulGod(['wood', 'water']), 'wood');
  assert.equal(hourly.getUsefulGod(['earth', 'metal']), 'earth');
});

test('score formula behaves exactly as specified', () => {
  const weakFavorable = ['wood', 'water'];
  const weakUnfavorable = ['earth', 'metal'];
  assert.equal(hourly.scoreHourElement('wood', 'wood', weakFavorable, weakUnfavorable, 'wood', 'weak'), 2);
  assert.equal(hourly.scoreHourElement('water', 'wood', weakFavorable, weakUnfavorable, 'wood', 'weak'), 1);
  assert.equal(hourly.scoreHourElement('earth', 'wood', weakFavorable, weakUnfavorable, 'wood', 'weak'), -1);
  assert.equal(hourly.scoreHourElement('metal', 'wood', weakFavorable, weakUnfavorable, 'wood', 'weak'), -1);
  assert.equal(hourly.scoreHourElement('wood', 'earth', ['earth'], ['wood'], 'wood', 'strong'), 0);
  assert.equal(hourly.scoreHourElement('earth', 'earth', ['earth'], ['wood'], 'wood', 'weak'), -2);  assert.equal(hourly.scoreHourElement('water', 'earth', ['earth'], ['wood'], 'wood', 'strong'), -2);});

test('category mapping contributes correctly to each life area', () => {
  assert.deepEqual(hourly.getCategoryContributions('正官', 2), { career: 2, wealth: 0, love: 2, health: 0 });
  assert.deepEqual(hourly.getCategoryContributions('偏財', 1), { career: 0, wealth: 1, love: 0, health: 0 });
  assert.deepEqual(hourly.getCategoryContributions('劫財', 1), { career: 0, wealth: -1, love: 1, health: 0 });
  assert.deepEqual(hourly.getCategoryContributions('正印', 1), { career: 0, wealth: 0, love: 0, health: 1 });
});

test('today-only scoring returns 12 slots and includes extreme slot selection', () => {
  const result = hourly.computeHourlyScoring(baseProfile, new Date('2026-04-11T00:00:00Z'));

  assert.equal(result.slots.length, 12);
  assert.ok(result.currentDateLabel.includes('2026-04-11'));
  assert.ok(Array.isArray(result.strongestPositiveSlots));
  assert.ok(Array.isArray(result.strongestNegativeSlots));
  assert.ok(result.strongestPositiveSlots.every((slot) => slot.finalScore === Math.max(...result.slots.map((s) => s.finalScore))));
  assert.ok(result.strongestNegativeSlots.every((slot) => slot.finalScore === Math.min(...result.slots.map((s) => s.finalScore))));
});

test('computed slot category contributions are consistent with Ten God mapping', () => {
  const result = hourly.computeHourlyScoring(baseProfile, new Date('2026-04-11T00:00:00Z'), { includeDaYun: false });

  for (const slot of result.slots) {
    const isCareer = ['正官', '偏官', '食神', '傷官'].includes(slot.tenGod.zh);
    const isWealth = ['正財', '偏財'].includes(slot.tenGod.zh);
    const isRobWealth = slot.tenGod.zh === '劫財';
    const isLove = ['比肩', '劫財', '食神', '傷官', '正官', '偏官'].includes(slot.tenGod.zh);
    const isHealth = ['正印', '偏印'].includes(slot.tenGod.zh);

    assert.equal(slot.baseCategoryScores.career, isCareer ? slot.baseScore : 0);
    assert.equal(slot.baseCategoryScores.wealth, isRobWealth ? -slot.baseScore : isWealth ? slot.baseScore : 0);
    assert.equal(slot.baseCategoryScores.love, isLove ? slot.baseScore : 0);
    assert.equal(slot.baseCategoryScores.health, isHealth ? slot.baseScore : 0);
  }
});

test('active Da Yun is selected for the known profile and reference date', () => {
  const result = hourly.computeHourlyScoring(baseProfile, new Date('2026-04-11T00:00:00Z'));

  assert.ok(result.activeDaYun);
  assert.equal(result.activeDaYun?.stem.zh, '乙');
  assert.equal(result.activeDaYun?.branch.zh, '酉');
  assert.equal(result.activeDaYun?.ageStart, 27);
  assert.equal(result.activeDaYun?.ageEnd, 36);
  assert.equal(result.activeDaYun?.yearStart, 2017);
  assert.equal(result.activeDaYun?.yearEnd, 2026);
});

test('active Da Yun switches at the first cycle start date instead of the calendar year boundary', () => {
  const natalChart = computeBazi(baseProfile.dob, baseProfile.tob, baseProfile.timezone, Number(baseProfile.longitude), baseProfile.calculationMode);
  assert.ok(natalChart.daYun);

  const firstCycleStart = getDaYunCycleStartDate(natalChart.tstDate, natalChart.daYun, 0);
  const startInstantUtc = clockTimeToUtc(
    firstCycleStart.getUTCFullYear(),
    firstCycleStart.getUTCMonth() + 1,
    firstCycleStart.getUTCDate(),
    firstCycleStart.getUTCHours(),
    firstCycleStart.getUTCMinutes(),
    baseProfile.timezone,
  );

  const beforeCycleStart = hourly.computeHourlyScoring(baseProfile, new Date(startInstantUtc.getTime() - 60 * 60 * 1000));
  const atCycleStart = hourly.computeHourlyScoring(baseProfile, new Date(startInstantUtc.getTime() + 60 * 60 * 1000));

  assert.equal(beforeCycleStart.activeDaYun, null);
  assert.ok(atCycleStart.activeDaYun);
  assert.equal(atCycleStart.activeDaYun?.stem.element, 'water');
  assert.equal(atCycleStart.activeDaYun?.branch.animal, 'Goat');
  assert.equal(atCycleStart.activeDaYun?.ageStart, 7);
  assert.equal(beforeCycleStart.currentDateLabel, atCycleStart.currentDateLabel);
});

test('baseScore remains unchanged when the Da Yun layer is disabled', () => {
  const withDaYun = hourly.computeHourlyScoring(baseProfile, new Date('2026-04-11T00:00:00Z'));
  const withoutDaYun = hourly.computeHourlyScoring(baseProfile, new Date('2026-04-11T00:00:00Z'), { includeDaYun: false });

  assert.deepEqual(
    withDaYun.slots.map((slot) => slot.baseScore),
    withoutDaYun.slots.map((slot) => slot.baseScore),
  );
  assert.ok(withoutDaYun.slots.every((slot) => slot.daYunModifier === 0 && slot.finalScore === slot.baseScore));
  assert.equal(withoutDaYun.activeDaYun, null);
});

test('finalScore changes predictably when Da Yun is active', () => {
  const result = hourly.computeHourlyScoring(baseProfile, new Date('2026-04-11T00:00:00Z'));

  assert.ok(result.activeDaYun);
  assert.ok(result.slots.every((slot) => slot.finalScore === slot.baseScore + slot.daYunModifier));
});

test('Da Yun modifier helper produces predictable unfavorable output', () => {
  const modifier = hourly.getDaYunModifier(
    0,
    {
      cycleIdx: 0,
      stemIdx: 7,
      branchIdx: 9,
      stem: { zh: '辛', pinyin: 'Xin', element: 'metal', yin: true },
      branch: { zh: '酉', pinyin: 'You', element: 'metal', yin: true, animal: 'Rooster' },
      ageStart: 30,
      ageEnd: 39,
      yearStart: 2020,
      yearEnd: 2029,
    },
    'wood',
    ['wood', 'water'],
    ['earth', 'metal'],
    'wood',
    'balanced',
  );

  assert.equal(modifier?.modifier, -2);
});

test('Da Yun category modifiers respond to Ten God themes', () => {
  const wealthModifier = hourly.getDaYunCategoryModifier(0, {
    cycleIdx: 0,
    stemIdx: 5,
    branchIdx: 1,
    stem: { zh: '己', pinyin: 'Ji', element: 'earth', yin: true },
    branch: { zh: '丑', pinyin: 'Chou', element: 'earth', yin: true, animal: 'Ox' },
    ageStart: 20,
    ageEnd: 29,
    yearStart: 2010,
    yearEnd: 2019,
  });
  const healthModifier = hourly.getDaYunCategoryModifier(0, {
    cycleIdx: 0,
    stemIdx: 9,
    branchIdx: 0,
    stem: { zh: '癸', pinyin: 'Gui', element: 'water', yin: true },
    branch: { zh: '子', pinyin: 'Zi', element: 'water', yin: false, animal: 'Rat' },
    ageStart: 20,
    ageEnd: 29,
    yearStart: 2010,
    yearEnd: 2019,
  });

  assert.equal(wealthModifier.wealth, 1);
  assert.equal(healthModifier.health, 1);
});

test('explanations include Da Yun context only for extreme slots', () => {
  const result = hourly.computeHourlyScoring(baseProfile, new Date('2026-04-11T00:00:00Z'));
  const extremeBranchIndexes = new Set([
    ...result.strongestPositiveSlots.map((slot) => slot.branchIdx),
    ...result.strongestNegativeSlots.map((slot) => slot.branchIdx),
  ]);

  for (const slot of result.slots) {
    if (extremeBranchIndexes.has(slot.branchIdx)) {
      assert.match(slot.explanation ?? '', /Da Yun/);
      assert.match(slot.explanation ?? '', /short-term trigger/);
      assert.match(slot.explanation ?? '', /long-term background/);
    } else {
      assert.equal(slot.explanation, null);
    }
  }
});

test('unknownTime birth profile still computes hourly scoring without throwing', () => {
  const unknownTimeProfile: AnalysisFormPayload = { ...baseProfile, tob: '', unknownTime: true };
  const result = hourly.computeHourlyScoring(unknownTimeProfile, new Date('2026-04-11T00:00:00Z'));
  assert.equal(result.slots.length, 12);
  assert.equal(typeof result.dmZh, 'string');
});

test('fresh calculation is performed from saved profile and current date reference', () => {
  const resultA = hourly.computeHourlyScoring(baseProfile, new Date('2026-04-10T00:00:00Z'));
  const resultB = hourly.computeHourlyScoring(baseProfile, new Date('2026-04-11T00:00:00Z'));
  assert.notEqual(resultA.currentDateLabel, resultB.currentDateLabel);
});

test('today follows the user timezone instead of UTC around midnight boundaries', () => {
  const justBeforeLocalMidnight = hourly.computeHourlyScoring(baseProfile, new Date('2026-04-11T16:30:00Z'), { includeDaYun: false });
  const justAfterLocalMidnight = hourly.computeHourlyScoring(baseProfile, new Date('2026-04-11T17:30:00Z'), { includeDaYun: false });

  assert.equal(justBeforeLocalMidnight.currentDateLabel, '2026-04-11');
  assert.equal(justAfterLocalMidnight.currentDateLabel, '2026-04-12');
  assert.notDeepEqual(
    justBeforeLocalMidnight.slots.map((slot) => slot.stemIdx),
    justAfterLocalMidnight.slots.map((slot) => slot.stemIdx),
  );
});
