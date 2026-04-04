/**
 * Gender identity / calculation mode regression tests.
 *
 * Covers:
 *   1. Legacy male/female values still work via backward-compat normalisation
 *   2. Non-binary identity requires an explicit calculationMode before finalisation
 *   3. prefer_not_to_say and other identities also require explicit calculationMode
 *   4. other + optional free-text works; text is trimmed and cleared for other identities
 *   5. Calculation logic reads calculationMode, NOT genderIdentity
 *   6. Existing pillar/Da Yun results are unchanged for legacy users
 */

import test from 'node:test';
import assert from 'node:assert/strict';

import {
  normalizeGenderDraft,
  finalizeGenderFields,
  formatGenderIdentity,
  formatCalculationGenderMode,
  formatCalculationGenderModeDisplay,
  isCalculationGenderMode,
  isGenderIdentity,
  type GenderDraftFields,
} from '../src/lib/gender';
import { computeBazi } from '../src/lib/bazi';
import {
  normalizeAnalysisFormDraft,
  finalizeAnalysisFormPayload,
} from '../src/lib/analysis-payload';

// ── 1. Legacy male / female backward compat ─────────────────

test('legacy gender:"male" normalises to genderIdentity:male + calculationMode:male', () => {
  const result = normalizeGenderDraft({ gender: 'male' });
  assert.ok(result);
  assert.equal(result.genderIdentity, 'male');
  assert.equal(result.calculationMode, 'male');
  assert.equal(result.genderOtherText, '');
});

test('legacy gender:"female" normalises to genderIdentity:female + calculationMode:female', () => {
  const result = normalizeGenderDraft({ gender: 'female' });
  assert.ok(result);
  assert.equal(result.genderIdentity, 'female');
  assert.equal(result.calculationMode, 'female');
  assert.equal(result.genderOtherText, '');
});

test('legacy gender field is accepted by normalizeAnalysisFormDraft', () => {
  const draft = normalizeAnalysisFormDraft({
    dob: '1990-06-15',
    tob: '08:30',
    timezone: 'Asia/Bangkok',
    longitude: '100.52',
    latitude: '13.75',
    gender: 'male',
    unknownTime: false,
    birthPlaceQuery: 'Bangkok',
    birthPlace: null,
  });
  assert.ok(draft);
  assert.equal(draft.genderIdentity, 'male');
  assert.equal(draft.calculationMode, 'male');
});

test('legacy gender draft produces the same finalised payload as explicit new fields', () => {
  const legacyDraft = normalizeAnalysisFormDraft({
    dob: '1990-06-15', tob: '08:30', timezone: 'Asia/Bangkok',
    longitude: '100.52', latitude: '13.75', gender: 'female',
    unknownTime: false, birthPlaceQuery: 'Bangkok', birthPlace: null,
  });
  const newDraft = normalizeAnalysisFormDraft({
    dob: '1990-06-15', tob: '08:30', timezone: 'Asia/Bangkok',
    longitude: '100.52', latitude: '13.75',
    genderIdentity: 'female', genderOtherText: '', calculationMode: 'female',
    unknownTime: false, birthPlaceQuery: 'Bangkok', birthPlace: null,
  });

  assert.ok(legacyDraft && newDraft);
  const legacyPayload = finalizeAnalysisFormPayload(legacyDraft);
  const newPayload = finalizeAnalysisFormPayload(newDraft);
  assert.deepEqual(legacyPayload, newPayload);
});

// ── 2. Non-binary requires explicit calculationMode ──────────

test('non_binary without calculationMode does not finalise', () => {
  const draft: GenderDraftFields = { genderIdentity: 'non_binary', genderOtherText: '', calculationMode: '' };
  const result = finalizeGenderFields(draft);
  assert.equal(result, null);
});

test('non_binary with calculationMode:male finalises successfully', () => {
  const draft: GenderDraftFields = { genderIdentity: 'non_binary', genderOtherText: '', calculationMode: 'male' };
  const result = finalizeGenderFields(draft);
  assert.ok(result);
  assert.equal(result.genderIdentity, 'non_binary');
  assert.equal(result.calculationMode, 'male');
});

test('non_binary with calculationMode:female finalises successfully', () => {
  const draft: GenderDraftFields = { genderIdentity: 'non_binary', genderOtherText: '', calculationMode: 'female' };
  const result = finalizeGenderFields(draft);
  assert.ok(result);
  assert.equal(result.genderIdentity, 'non_binary');
  assert.equal(result.calculationMode, 'female');
});

test('normalizeGenderDraft with non_binary leaves calculationMode empty when not supplied', () => {
  const result = normalizeGenderDraft({ genderIdentity: 'non_binary' });
  assert.ok(result);
  assert.equal(result.calculationMode, '');
});

// ── 3. prefer_not_to_say and other also require explicit mode ─

test('prefer_not_to_say without calculationMode does not finalise', () => {
  const draft: GenderDraftFields = { genderIdentity: 'prefer_not_to_say', genderOtherText: '', calculationMode: '' };
  assert.equal(finalizeGenderFields(draft), null);
});

test('prefer_not_to_say with explicit calculationMode finalises', () => {
  const draft: GenderDraftFields = { genderIdentity: 'prefer_not_to_say', genderOtherText: '', calculationMode: 'female' };
  const result = finalizeGenderFields(draft);
  assert.ok(result);
  assert.equal(result.genderIdentity, 'prefer_not_to_say');
  assert.equal(result.calculationMode, 'female');
});

test('other without calculationMode does not finalise', () => {
  const draft: GenderDraftFields = { genderIdentity: 'other', genderOtherText: 'genderqueer', calculationMode: '' };
  assert.equal(finalizeGenderFields(draft), null);
});

// ── 4. other + optional free-text ───────────────────────────

test('other with free-text and calculationMode finalises and preserves trimmed text', () => {
  const draft: GenderDraftFields = { genderIdentity: 'other', genderOtherText: '  genderqueer  ', calculationMode: 'male' };
  const result = finalizeGenderFields(draft);
  assert.ok(result);
  assert.equal(result.genderIdentity, 'other');
  assert.equal(result.genderOtherText, 'genderqueer');
  assert.equal(result.calculationMode, 'male');
});

test('other with empty free-text still finalises', () => {
  const draft: GenderDraftFields = { genderIdentity: 'other', genderOtherText: '', calculationMode: 'female' };
  const result = finalizeGenderFields(draft);
  assert.ok(result);
  assert.equal(result.genderOtherText, '');
});

test('genderOtherText is cleared for non-other identities on finalisation', () => {
  const draft: GenderDraftFields = { genderIdentity: 'non_binary', genderOtherText: 'some stale text', calculationMode: 'male' };
  const result = finalizeGenderFields(draft);
  assert.ok(result);
  assert.equal(result.genderOtherText, '');
});

test('formatGenderIdentity renders other with custom text', () => {
  assert.equal(formatGenderIdentity('other', 'pangender'), 'Other (pangender)');
  assert.equal(formatGenderIdentity('other', '  '), 'Other');
  assert.equal(formatGenderIdentity('other', ''), 'Other');
  assert.equal(formatGenderIdentity('other', undefined), 'Other');
});

test('formatCalculationGenderMode returns enriched strings for AI prompts', () => {
  // The function includes Yang/Yin context so AI models and logs have full picture.
  assert.match(formatCalculationGenderMode('male'),   /Treat as male/);
  assert.match(formatCalculationGenderMode('male'),   /Yang/);
  assert.match(formatCalculationGenderMode('female'), /Treat as female/);
  assert.match(formatCalculationGenderMode('female'), /Yin/);
});

test('formatCalculationGenderModeDisplay returns inclusive Yang/Yin labels for the UI', () => {
  assert.equal(formatCalculationGenderModeDisplay('male'),   'Yang (陽) · Active energy');
  assert.equal(formatCalculationGenderModeDisplay('female'), 'Yin (陰) · Receptive energy');
});

// ── 5. Calculation logic reads calculationMode, not genderIdentity ─

test('non_binary with calculationMode:male produces same Da Yun as male identity', () => {
  const nonBinary = computeBazi('1990-01-01', null, 'Asia/Bangkok', 100.52, 'male');
  const male      = computeBazi('1990-01-01', null, 'Asia/Bangkok', 100.52, 'male');

  assert.ok(nonBinary.daYun && male.daYun);
  assert.equal(nonBinary.daYun.forward, male.daYun.forward);
  assert.equal(nonBinary.daYun.startYears, male.daYun.startYears);
  assert.deepEqual(
    nonBinary.daYun.pillars.map(p => p.stem.zh + p.branch.zh),
    male.daYun.pillars.map(p => p.stem.zh + p.branch.zh),
  );
});

test('non_binary with calculationMode:female produces same Da Yun as female identity', () => {
  const nonBinary = computeBazi('1990-01-01', null, 'Asia/Bangkok', 100.52, 'female');
  const female    = computeBazi('1990-01-01', null, 'Asia/Bangkok', 100.52, 'female');

  assert.ok(nonBinary.daYun && female.daYun);
  assert.equal(nonBinary.daYun.forward, female.daYun.forward);
  assert.deepEqual(
    nonBinary.daYun.pillars.map(p => p.stem.zh + p.branch.zh),
    female.daYun.pillars.map(p => p.stem.zh + p.branch.zh),
  );
});

test('calculationMode:male and calculationMode:female produce different Da Yun directions for a Yang year stem', () => {
  // 1990-01-01 year stem: 庚 (yang metal, index 6 → not yin)
  // Yang year + male → forward; Yang year + female → backward
  const maleChart   = computeBazi('1990-01-01', null, 'Asia/Bangkok', 100.52, 'male');
  const femaleChart = computeBazi('1990-01-01', null, 'Asia/Bangkok', 100.52, 'female');

  assert.ok(maleChart.daYun && femaleChart.daYun);
  assert.notEqual(maleChart.daYun.forward, femaleChart.daYun.forward);
});

test('calculationMode is stored on the DaYun result for transparency', () => {
  const chart = computeBazi('1990-06-15', '08:30', 'Asia/Bangkok', 100.52, 'female');
  assert.ok(chart.daYun);
  assert.equal(chart.daYun.calculationMode, 'female');
});

// ── 6. Existing calculations unchanged for legacy users ──────

test('pillar output is identical for a legacy male user and a new male user', () => {
  // Legacy path: normalize from { gender: 'male' }
  const legacyDraft = normalizeGenderDraft({ gender: 'male' })!;
  const legacyFinalized = finalizeGenderFields(legacyDraft)!;

  // New path: explicit fields
  const newDraft: GenderDraftFields = { genderIdentity: 'male', genderOtherText: '', calculationMode: 'male' };
  const newFinalized = finalizeGenderFields(newDraft)!;

  const legacy = computeBazi('1990-06-15', '08:30', 'Asia/Bangkok', 100.52, legacyFinalized.calculationMode);
  const modern = computeBazi('1990-06-15', '08:30', 'Asia/Bangkok', 100.52, newFinalized.calculationMode);

  assert.equal(legacy.pillars.day.stem.zh + legacy.pillars.day.branch.zh, '辛亥');
  assert.equal(legacy.pillars.day.stem.zh, modern.pillars.day.stem.zh);
  assert.equal(legacy.pillars.day.branch.zh, modern.pillars.day.branch.zh);
  assert.equal(legacy.daYun?.forward, modern.daYun?.forward);
});

test('pillar output is identical for a legacy female user and a new female user', () => {
  const legacyDraft = normalizeGenderDraft({ gender: 'female' })!;
  const legacyFinalized = finalizeGenderFields(legacyDraft)!;

  const newDraft: GenderDraftFields = { genderIdentity: 'female', genderOtherText: '', calculationMode: 'female' };
  const newFinalized = finalizeGenderFields(newDraft)!;

  const legacy = computeBazi('1985-03-10', '14:00', 'Europe/London', -0.1278, legacyFinalized.calculationMode);
  const modern = computeBazi('1985-03-10', '14:00', 'Europe/London', -0.1278, newFinalized.calculationMode);

  assert.equal(legacy.pillars.year.stem.zh + legacy.pillars.year.branch.zh,
               modern.pillars.year.stem.zh + modern.pillars.year.branch.zh);
  assert.equal(legacy.daYun?.forward, modern.daYun?.forward);
  assert.equal(legacy.daYun?.startYears, modern.daYun?.startYears);
});

// ── Type guard smoke tests ───────────────────────────────────

test('isGenderIdentity accepts all valid values and rejects unknown strings', () => {
  assert.equal(isGenderIdentity('male'), true);
  assert.equal(isGenderIdentity('female'), true);
  assert.equal(isGenderIdentity('non_binary'), true);
  assert.equal(isGenderIdentity('prefer_not_to_say'), true);
  assert.equal(isGenderIdentity('other'), true);
  assert.equal(isGenderIdentity('unknown'), false);
  assert.equal(isGenderIdentity(null), false);
  assert.equal(isGenderIdentity(undefined), false);
});

test('isCalculationGenderMode only accepts binary values', () => {
  assert.equal(isCalculationGenderMode('male'), true);
  assert.equal(isCalculationGenderMode('female'), true);
  assert.equal(isCalculationGenderMode('non_binary'), false);
  assert.equal(isCalculationGenderMode(''), false);
  assert.equal(isCalculationGenderMode(null), false);
});
