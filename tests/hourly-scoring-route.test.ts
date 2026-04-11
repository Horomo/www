import test from 'node:test';
import assert from 'node:assert/strict';
import { NextRequest } from 'next/server';

import { handleHourlyScoringGet } from '../src/app/api/hourly-scoring/route';
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

test('hourly scoring API rejects unauthenticated requests', async () => {
  const request = new Request('http://localhost/api/hourly-scoring');

  const response = await handleHourlyScoringGet(request as unknown as NextRequest, {
    getSession: async () => null,
    fetchProfile: async () => null,
    computeScoring: async () => computeHourlyScoring(baseProfile),
  });

  assert.equal(response.status, 401);
  const body = await response.json();
  assert.equal(body.error?.toString().includes('Unauthorized'), true);
});

test('hourly scoring API returns null scoring when no saved profile exists', async () => {
  const request = new Request('http://localhost/api/hourly-scoring');

  const response = await handleHourlyScoringGet(request as unknown as NextRequest, {
    getSession: async () => ({ user: { email: 'user@example.com' } }),
    fetchProfile: async () => null,
    computeScoring: () => computeHourlyScoring(baseProfile),
  });

  assert.equal(response.status, 200);
  const body = await response.json();
  assert.equal(body.profile, null);
  assert.equal(body.scoring, null);
});

test('hourly scoring API computes fresh scoring from the saved profile', async () => {
  const request = new Request('http://localhost/api/hourly-scoring');

  const response = await handleHourlyScoringGet(request as unknown as NextRequest, {
    getSession: async () => ({ user: { email: 'member@example.com' } }),
    fetchProfile: async () => baseProfile,
    computeScoring: (profile) => computeHourlyScoring(profile, new Date('2026-04-12T00:00:00Z')),
  });

  assert.equal(response.status, 200);
  const body = await response.json();
  assert.deepEqual(body.profile, baseProfile);
  assert.equal(Array.isArray(body.scoring?.slots), true);
  assert.equal(body.scoring?.slots.length, 12);
  assert.ok(body.scoring?.strongestPositiveSlots.every((slot) => slot.totalScore === Math.max(...body.scoring.slots.map((s) => s.totalScore))));
});
