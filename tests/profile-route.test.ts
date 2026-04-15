import test from 'node:test';
import assert from 'node:assert/strict';
import { NextRequest } from 'next/server';

import { handleProfileGet, handleProfilePost } from '../src/app/api/profile/route';
import type { AnalysisFormPayload } from '../src/lib/analysis-payload';
import type { SavedBaziProfile } from '../src/lib/profile';

const validProfile: AnalysisFormPayload = {
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

test('profile GET rejects unauthenticated requests', async () => {
  const request = new Request('http://localhost/api/profile');

  const response = await handleProfileGet(request as unknown as NextRequest, {
    getSession: async () => null,
    fetchProfile: async () => null,
    saveProfile: async (): Promise<SavedBaziProfile> => ({ userId: 'user@example.com', updatedAt: '2026-04-11T00:00:00Z', ...validProfile }),
  });

  assert.equal(response.status, 401);
  const body = await response.json();
  assert.equal(body.error?.toString().includes('Unauthorized'), true);
});

test('profile GET returns null when no saved profile exists', async () => {
  const request = new Request('http://localhost/api/profile');

  const response = await handleProfileGet(request as unknown as NextRequest, {
    getSession: async () => ({ id: 'test-user-id' }),
    fetchProfile: async () => null,
    saveProfile: async (): Promise<SavedBaziProfile> => ({ userId: 'user@example.com', updatedAt: '2026-04-11T00:00:00Z', ...validProfile }),
  });

  assert.equal(response.status, 200);
  const body = await response.json();
  assert.equal(body.profile, null);
});

test('profile POST rejects invalid payloads', async () => {
  const request = new Request('http://localhost/api/profile', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ invalid: true }),
  });

  const response = await handleProfilePost(request as unknown as NextRequest, {
    getSession: async () => ({ id: 'test-user-id' }),
    fetchProfile: async () => null,
    saveProfile: async (): Promise<SavedBaziProfile> => ({ userId: 'test-user-id', updatedAt: '2026-04-11T00:00:00Z', ...validProfile }),
  });

  assert.equal(response.status, 400);
  const body = await response.json();
  assert.equal(body.error?.toString().includes('Invalid profile payload'), true);
});

test('profile POST saves and returns the profile for authenticated members', async () => {
  let savedPayload: AnalysisFormPayload | null = null;

  const request = new Request('http://localhost/api/profile', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(validProfile),
  });

  const response = await handleProfilePost(request as unknown as NextRequest, {
    getSession: async () => ({ id: 'test-user-id' }),
    fetchProfile: async () => null,
    saveProfile: async (userId, profile) => {
      savedPayload = profile;
      return {
        userId,
        updatedAt: '2026-04-11T00:00:00Z',
        ...profile,
      };
    },
  });

  assert.equal(response.status, 200);
  const body = await response.json();
  assert.deepEqual(savedPayload, validProfile);
  assert.equal(body.profile.userId, 'test-user-id');
  assert.equal(body.profile.dob, validProfile.dob);
});

test('profile POST returns a useful error payload when storage is not configured', async () => {
  const request = new Request('http://localhost/api/profile', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(validProfile),
  });

  const response = await handleProfilePost(request as unknown as NextRequest, {
    getSession: async () => ({ id: 'test-user-id' }),
    fetchProfile: async () => null,
    saveProfile: async (): Promise<SavedBaziProfile> => {
      throw new Error('Supabase storage is not configured.');
    },
  });

  assert.equal(response.status, 503);
  const body = await response.json();
  assert.equal(body.error, 'Supabase storage is not configured.');
});
