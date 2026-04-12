import test from 'node:test';
import assert from 'node:assert/strict';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

import {
  HourlyScoringResultContent,
  formatActiveDaYunElements,
  formatActiveDaYunHeadline,
  formatSlotHeading,
  formatSlotScoreBreakdown,
  LOADING_SAVED_PROFILE_TEXT,
  SAVING_PROFILE_TEXT,
} from '../src/components/HourlyScoringPanel';
import { computeHourlyScoring, HOUR_SLOT_LABELS } from '../src/lib/hourly-scoring';
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

const MOJIBAKE_PATTERN = /โ€|เธ|ยท|�/u;

test('hourly scoring user-facing labels stay clean and readable', () => {
  for (const label of HOUR_SLOT_LABELS) {
    assert.match(label, /^\d{2}:\d{2}-\d{2}:\d{2}$/);
    assert.doesNotMatch(label, MOJIBAKE_PATTERN);
  }

  assert.equal(LOADING_SAVED_PROFILE_TEXT, 'Loading saved profile...');
  assert.equal(SAVING_PROFILE_TEXT, 'Saving your profile...');
  assert.doesNotMatch(LOADING_SAVED_PROFILE_TEXT, MOJIBAKE_PATTERN);
  assert.doesNotMatch(SAVING_PROFILE_TEXT, MOJIBAKE_PATTERN);
});

test('hourly scoring summary formatters render clean separators', () => {
  const result = computeHourlyScoring(baseProfile, new Date('2026-04-11T00:00:00Z'));
  assert.ok(result.activeDaYun);

  const headline = formatActiveDaYunHeadline(result.activeDaYun);
  const elements = formatActiveDaYunElements(result.activeDaYun);
  const slotHeading = formatSlotHeading(result.slots[0]);
  const slotBreakdown = formatSlotScoreBreakdown(result.strongestPositiveSlots[0] ?? result.slots[0]);

  assert.equal(headline, `${result.activeDaYun.stem.zh}${result.activeDaYun.branch.zh} ages ${result.activeDaYun.ageStart}-${result.activeDaYun.ageEnd}`);
  assert.equal(elements, `${result.activeDaYun.elements.stem} stem / ${result.activeDaYun.elements.branch} branch`);
  assert.equal(slotHeading, `${result.slots[0].hourLabel} - ${result.slots[0].branch.zh}`);
  assert.match(slotBreakdown, /^Base [+-]\d+ \| Da Yun [+-]\d+ \| Year [+-]\d+ \| Month [+-]\d+ \| Day [+-]\d+ \| Final [+-]\d+$/);

  assert.doesNotMatch(headline, MOJIBAKE_PATTERN);
  assert.doesNotMatch(elements, MOJIBAKE_PATTERN);
  assert.doesNotMatch(slotHeading, MOJIBAKE_PATTERN);
  assert.doesNotMatch(slotBreakdown, MOJIBAKE_PATTERN);
});

test('hourly scoring content renders timing-layer cards, expanded table columns, and extreme-slot cards only', () => {
  const result = computeHourlyScoring(baseProfile, new Date('2026-04-11T00:00:00Z'));
  const markup = renderToStaticMarkup(createElement(HourlyScoringResultContent, { scoringResult: result }));
  const extremeBranchIndexes = new Set([
    ...result.strongestPositiveSlots.map((slot) => slot.branchIdx),
    ...result.strongestNegativeSlots.map((slot) => slot.branchIdx),
  ]);
  const nonExtremeSlot = result.slots.find((slot) => !extremeBranchIndexes.has(slot.branchIdx));

  assert.match(markup, /Active Da Yun/);
  assert.match(markup, /Liu Nian/);
  assert.match(markup, /Liu Yue/);
  assert.match(markup, /Liu Ri/);
  assert.match(markup, />Base</);
  assert.match(markup, />Da Yun</);
  assert.match(markup, />Year</);
  assert.match(markup, />Month</);
  assert.match(markup, />Day</);
  assert.match(markup, />Final</);
  assert.match(markup, /Strongest positive slot/);
  assert.match(markup, /Strongest negative slot/);

  for (const slot of [...result.strongestPositiveSlots, ...result.strongestNegativeSlots]) {
    assert.match(markup, new RegExp(formatSlotHeading(slot).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  }

  assert.ok(nonExtremeSlot);
  assert.doesNotMatch(markup, new RegExp(formatSlotHeading(nonExtremeSlot).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
});
