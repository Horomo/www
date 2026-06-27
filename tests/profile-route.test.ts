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

test('profile POST rejects gross longitude/timezone mismatch before saving', async () => {
  let saveCalled = false;
  const mismatchedProfile: AnalysisFormPayload = {
    ...validProfile,
    timezone: 'America/New_York',
    longitude: '100.52',
    latitude: '13.75',
    birthPlaceQuery: 'Mismatched legacy input',
  };
  const request = new Request('http://localhost/api/profile', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(mismatchedProfile),
  });

  const response = await handleProfilePost(request as unknown as NextRequest, {
    getSession: async () => ({ id: 'test-user-id' }),
    fetchProfile: async () => null,
    saveProfile: async (userId, profile) => {
      saveCalled = true;
      return { userId, updatedAt: '2026-04-11T00:00:00Z', ...profile };
    },
  });

  assert.equal(response.status, 400);
  const body = await response.json();
  assert.match(body.error, /does not match timezone America\/New_York/);
  assert.match(body.error, /exceeds 60\.00 degrees/);
  assert.equal(saveCalled, false);
});

test('profile POST accepts normal and wide-zone longitude/timezone pairs', async () => {
  const acceptedProfiles: AnalysisFormPayload[] = [
    validProfile,
    {
      ...validProfile,
      timezone: 'America/New_York',
      longitude: '-74.0060',
      latitude: '40.7128',
      birthPlaceQuery: 'New York, United States',
    },
    {
      ...validProfile,
      timezone: 'Asia/Shanghai',
      longitude: '73.50',
      latitude: '39.47',
      birthPlaceQuery: 'Western Xinjiang, China',
    },
    {
      ...validProfile,
      timezone: 'Asia/Kuala_Lumpur',
      longitude: '99.60',
      latitude: '6.40',
      birthPlaceQuery: 'Western Malaysia',
    },
    {
      ...validProfile,
      timezone: 'America/Argentina/Buenos_Aires',
      longitude: '-73.60',
      latitude: '-49.30',
      birthPlaceQuery: 'Western Argentina',
    },
  ];

  for (const profile of acceptedProfiles) {
    let savedPayload: AnalysisFormPayload | null = null;
    const request = new Request('http://localhost/api/profile', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(profile),
    });

    const response = await handleProfilePost(request as unknown as NextRequest, {
      getSession: async () => ({ id: 'test-user-id' }),
      fetchProfile: async () => null,
      saveProfile: async (userId, payload) => {
        savedPayload = payload;
        return { userId, updatedAt: '2026-04-11T00:00:00Z', ...payload };
      },
    });

    assert.equal(response.status, 200, `${profile.timezone} ${profile.longitude} should pass write validation`);
    assert.deepEqual(savedPayload, profile);
  }
});

test('profile GET returns legacy mismatched profiles without write validation', async () => {
  const legacyProfile: SavedBaziProfile = {
    userId: 'test-user-id',
    updatedAt: '2026-04-11T00:00:00Z',
    ...validProfile,
    timezone: 'America/New_York',
    longitude: '100.52',
    birthPlaceQuery: 'Legacy mismatched saved profile',
  };
  const request = new Request('http://localhost/api/profile');

  const response = await handleProfileGet(request as unknown as NextRequest, {
    getSession: async () => ({ id: 'test-user-id' }),
    fetchProfile: async () => legacyProfile,
    saveProfile: async (): Promise<SavedBaziProfile> => ({ userId: 'test-user-id', updatedAt: '2026-04-11T00:00:00Z', ...validProfile }),
  });

  assert.equal(response.status, 200);
  const body = await response.json();
  assert.equal(body.profile.timezone, 'America/New_York');
  assert.equal(body.profile.longitude, '100.52');
});
