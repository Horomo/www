import test from 'node:test';
import assert from 'node:assert/strict';

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
  assert.ok(result.strongestPositiveSlots.every((slot) => slot.totalScore === Math.max(...result.slots.map((s) => s.totalScore))));
  assert.ok(result.strongestNegativeSlots.every((slot) => slot.totalScore === Math.min(...result.slots.map((s) => s.totalScore))));
});

test('computed slot category contributions are consistent with Ten God mapping', () => {
  const result = hourly.computeHourlyScoring(baseProfile, new Date('2026-04-11T00:00:00Z'));

  for (const slot of result.slots) {
    const isCareer = ['正官', '偏官', '食神', '傷官'].includes(slot.tenGod.zh);
    const isWealth = ['正財', '偏財'].includes(slot.tenGod.zh);
    const isRobWealth = slot.tenGod.zh === '劫財';
    const isLove = ['比肩', '劫財', '食神', '傷官', '正官', '偏官'].includes(slot.tenGod.zh);
    const isHealth = ['正印', '偏印'].includes(slot.tenGod.zh);

    assert.equal(slot.categoryScores.career, isCareer ? slot.totalScore : 0);
    assert.equal(slot.categoryScores.wealth, isRobWealth ? -slot.totalScore : isWealth ? slot.totalScore : 0);
    assert.equal(slot.categoryScores.love, isLove ? slot.totalScore : 0);
    assert.equal(slot.categoryScores.health, isHealth ? slot.totalScore : 0);
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
