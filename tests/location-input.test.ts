import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { recomputeAnalysisChartPayload, type AnalysisFormPayload } from '../src/lib/analysis-payload';

// ─────────────────────────────────────────────────────────────────────────────
// Fix E — birthplace is chosen via search only. Manual timezone/longitude/
// latitude inputs are removed so a longitude/timezone mismatch cannot be
// entered. This is an input-layer change; calculation and persisted payload
// shape are unchanged, so previously saved charts must still recompute.
// ─────────────────────────────────────────────────────────────────────────────

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

const readSource = (rel: string) => readFileSync(new URL(`../src/${rel}`, import.meta.url), 'utf8');

// ── Backward-compat: stored charts still recompute, reading their saved tz/lon ──
test('location / a normal saved profile still recomputes from stored timezone + longitude', () => {
  const chart = recomputeAnalysisChartPayload(baseProfile);
  assert.ok(chart, 'recompute must succeed');
  assert.equal(chart!.utcDate, '1990-06-15T01:30:00.000Z');
  assert.equal(chart!.tstDate, '1990-06-15T08:11:47.465Z');
  assert.ok(chart!.pillars.day.stem.zh, 'day pillar present');
});

test('location / a previously-mismatched saved chart still recomputes (no crash, reads stored values)', () => {
  // The old manual inputs allowed e.g. timezone=America/New_York with a Thai
  // longitude. Such records may exist in storage; they must still recompute from
  // the stored fields rather than crash or be rejected.
  const mismatched: AnalysisFormPayload = { ...baseProfile, timezone: 'America/New_York', longitude: '100.52' };
  const chart = recomputeAnalysisChartPayload(mismatched);
  assert.ok(chart, 'mismatched legacy chart must still recompute');
  assert.ok(chart!.pillars.day.stem.zh && chart!.pillars.year.stem.zh, 'pillars present');
  assert.equal(typeof chart!.tstDate, 'string');
  // Deterministic: same input → same output.
  const again = recomputeAnalysisChartPayload(mismatched);
  assert.equal(chart!.tstDate, again!.tstDate);
});

// ── Search-only guard: manual tz/lon/lat editing is gone, search remains ──
// No DOM test harness is wired for the full client wizard, so this guards the
// source against re-introducing editable location inputs (the mismatch source).
for (const file of ['components/BaziCalculator.tsx', 'components/HourlyScoringPanel.tsx']) {
  test(`location / ${file} has no manual timezone/coordinate editing`, () => {
    const src = readSource(file);
    // Birthplace search must remain the input path.
    assert.match(src, /BirthPlaceSearch/, 'search picker must still be used');
    // No editable handlers that set tz/lon/lat from user keystrokes.
    assert.doesNotMatch(src, /setTimezone\(event/, 'no manual timezone input');
    assert.doesNotMatch(src, /setLongitude\(event/, 'no manual longitude input');
    assert.doesNotMatch(src, /setLatitude\(event/, 'no manual latitude input');
    assert.doesNotMatch(src, /timezone:\s*event\.target\.value/, 'no manual timezone input');
    assert.doesNotMatch(src, /longitude:\s*(?:sanitizeCoordinateInput|event\.target\.value)/, 'no manual longitude input');
    assert.doesNotMatch(src, /latitude:\s*(?:sanitizeCoordinateInput|event\.target\.value)/, 'no manual latitude input');
  });
}
