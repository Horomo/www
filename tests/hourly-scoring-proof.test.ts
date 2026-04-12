import test from 'node:test';
import assert from 'node:assert/strict';

import { computeBazi } from '../src/lib/bazi';
import { computeHourlyScoring } from '../src/lib/hourly-scoring';
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

test('Liu Nian, Liu Yue, and Liu Ri match the exact engine pillars for a known local date', () => {
  const result = computeHourlyScoring(baseProfile, new Date('2026-04-11T00:00:00Z'));
  const expected = computeBazi('2026-04-11', '12:00', baseProfile.timezone, Number(baseProfile.longitude), baseProfile.calculationMode);

  assert.deepEqual(
    {
      stemZh: result.liuNian?.stem.zh,
      stemPinyin: result.liuNian?.stem.pinyin,
      branchZh: result.liuNian?.branch.zh,
      branchPinyin: result.liuNian?.branch.pinyin,
    },
    {
      stemZh: expected.pillars.year.stem.zh,
      stemPinyin: expected.pillars.year.stem.pinyin,
      branchZh: expected.pillars.year.branch.zh,
      branchPinyin: expected.pillars.year.branch.pinyin,
    },
  );

  assert.deepEqual(
    {
      stemZh: result.liuYue?.stem.zh,
      stemPinyin: result.liuYue?.stem.pinyin,
      branchZh: result.liuYue?.branch.zh,
      branchPinyin: result.liuYue?.branch.pinyin,
    },
    {
      stemZh: expected.pillars.month.stem.zh,
      stemPinyin: expected.pillars.month.stem.pinyin,
      branchZh: expected.pillars.month.branch.zh,
      branchPinyin: expected.pillars.month.branch.pinyin,
    },
  );

  assert.deepEqual(
    {
      stemZh: result.liuRi?.stem.zh,
      stemPinyin: result.liuRi?.stem.pinyin,
      branchZh: result.liuRi?.branch.zh,
      branchPinyin: result.liuRi?.branch.pinyin,
    },
    {
      stemZh: expected.pillars.day.stem.zh,
      stemPinyin: expected.pillars.day.stem.pinyin,
      branchZh: expected.pillars.day.branch.zh,
      branchPinyin: expected.pillars.day.branch.pinyin,
    },
  );
});

test('real computed category scores equal base plus Da Yun, Liu Nian, Liu Yue, and Liu Ri modifiers', () => {
  const result = computeHourlyScoring(baseProfile, new Date('2026-04-11T00:00:00Z'));

  for (const slot of result.slots) {
    assert.deepEqual(slot.categoryScores, {
      career: slot.baseCategoryScores.career + slot.daYunCategoryModifier.career + slot.liuNianCategoryModifier.career + slot.liuYueCategoryModifier.career + slot.liuRiCategoryModifier.career,
      wealth: slot.baseCategoryScores.wealth + slot.daYunCategoryModifier.wealth + slot.liuNianCategoryModifier.wealth + slot.liuYueCategoryModifier.wealth + slot.liuRiCategoryModifier.wealth,
      love: slot.baseCategoryScores.love + slot.daYunCategoryModifier.love + slot.liuNianCategoryModifier.love + slot.liuYueCategoryModifier.love + slot.liuRiCategoryModifier.love,
      health: slot.baseCategoryScores.health + slot.daYunCategoryModifier.health + slot.liuNianCategoryModifier.health + slot.liuYueCategoryModifier.health + slot.liuRiCategoryModifier.health,
    });
  }
});
