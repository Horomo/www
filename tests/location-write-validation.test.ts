import test from 'node:test';
import assert from 'node:assert/strict';

import {
  validateBirthLocationForWrite,
  LOCATION_TIMEZONE_LONGITUDE_MAX_DIFF_DEGREES,
} from '../src/lib/location-write-validation';
import type { AnalysisFormPayload } from '../src/lib/analysis-payload';

// ─────────────────────────────────────────────────────────────────────────────
// E-guard — server-side longitude/timezone mismatch validation on the write path.
// All three write routes (profile, log-chart, analyze) delegate to this single
// function, so testing it directly proves they behave consistently. Threshold is
// a generous 60° so legitimately wide single-timezone countries are accepted;
// reads/recompute deliberately do NOT call this (tolerate-on-read).
// ─────────────────────────────────────────────────────────────────────────────

const base: AnalysisFormPayload = {
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
const p = (o: Partial<AnalysisFormPayload>): AnalysisFormPayload => ({ ...base, ...o });

test('location-write / threshold is 60 degrees', () => {
  assert.equal(LOCATION_TIMEZONE_LONGITUDE_MAX_DIFF_DEGREES, 60);
});

test('location-write / a matched longitude + timezone is valid', () => {
  // Bangkok 100.52°E vs standard meridian 105°E → ~4.5°.
  assert.equal(validateBirthLocationForWrite(base).valid, true);
});

test('location-write / a gross mismatch is rejected (Thai longitude + New York tz)', () => {
  const r = validateBirthLocationForWrite(p({ timezone: 'America/New_York', longitude: '100.52' }));
  assert.equal(r.valid, false);
});

test('location-write / a wide single-timezone country is accepted (far-west China)', () => {
  // Asia/Shanghai standard meridian 120°E; Kashgar ~75.99°E → ~44° < 60°.
  // Must NOT be a false positive just because China spans one wide timezone.
  const r = validateBirthLocationForWrite(p({ dob: '2000-06-15', timezone: 'Asia/Shanghai', longitude: '75.99', latitude: '39.47' }));
  assert.equal(r.valid, true);
});

test('location-write / boundary at exactly 60 degrees (Bangkok meridian 105°)', () => {
  assert.equal(validateBirthLocationForWrite(p({ longitude: '46' })).valid, true);  // |46-105| = 59
  assert.equal(validateBirthLocationForWrite(p({ longitude: '45' })).valid, true);  // |45-105| = 60 → inclusive
  assert.equal(validateBirthLocationForWrite(p({ longitude: '44' })).valid, false); // |44-105| = 61
});

test('location-write / out-of-range or non-numeric longitude is rejected', () => {
  assert.equal(validateBirthLocationForWrite(p({ longitude: 'abc' })).valid, false);
  assert.equal(validateBirthLocationForWrite(p({ longitude: '999' })).valid, false);
  assert.equal(validateBirthLocationForWrite(p({ longitude: '' })).valid, false);
  // Strict parse: trailing garbage must NOT be silently accepted as 100.
  assert.equal(validateBirthLocationForWrite(p({ longitude: '100abc' })).valid, false);
});

test('location-write / unknown birth time still validates (uses noon)', () => {
  assert.equal(validateBirthLocationForWrite(p({ unknownTime: true, tob: '' })).valid, true);
});
