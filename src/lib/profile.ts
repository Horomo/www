import type { AnalysisFormDraft, AnalysisFormPayload } from '@/lib/analysis-payload';
import { finalizeAnalysisFormPayload, normalizeAnalysisFormDraft } from '@/lib/analysis-payload';

const PROFILE_TABLE = 'user_profiles';

export type SavedBaziProfile = AnalysisFormPayload & {
  userId: string;
  updatedAt: string;
};

function getSupabaseConfig() {
  const url = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    throw new Error('Supabase storage is not configured.');
  }

  return { url, serviceRoleKey };
}

export function parseSavedProfile(value: unknown): AnalysisFormPayload | null {
  const normalizedDraft = normalizeAnalysisFormDraft(value as Partial<AnalysisFormDraft> | null);
  if (!normalizedDraft) return null;
  return finalizeAnalysisFormPayload(normalizedDraft);
}

export async function fetchUserProfile(userId: string): Promise<SavedBaziProfile | null> {
  const { url, serviceRoleKey } = getSupabaseConfig();
  const response = await fetch(
    `${url}/rest/v1/${PROFILE_TABLE}?select=profile_data,updated_at&user_id=eq.${encodeURIComponent(userId)}&limit=1`,
    {
      method: 'GET',
      headers: {
        apikey: serviceRoleKey,
        Authorization: `Bearer ${serviceRoleKey}`,
        Accept: 'application/json',
      },
    },
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Supabase profile fetch failed (${response.status}): ${errorText.slice(0, 300)}`);
  }

  const rows = (await response.json()) as Array<{ profile_data: AnalysisFormPayload; updated_at: string }>;
  if (!rows || rows.length === 0) {
    return null;
  }

  return {
    userId,
    updatedAt: rows[0].updated_at,
    ...rows[0].profile_data,
  };
}

export async function upsertUserProfile(userId: string, profile: AnalysisFormPayload): Promise<SavedBaziProfile> {
  const { url, serviceRoleKey } = getSupabaseConfig();
  const response = await fetch(
    `${url}/rest/v1/${PROFILE_TABLE}?on_conflict=user_id&select=updated_at,profile_data`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: serviceRoleKey,
        Authorization: `Bearer ${serviceRoleKey}`,
        Prefer: 'resolution=merge-duplicates,return=representation',
      },
      body: JSON.stringify({ user_id: userId, profile_data: profile }),
    },
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Supabase profile save failed (${response.status}): ${errorText.slice(0, 300)}`);
  }

  const rows = (await response.json()) as Array<{ updated_at: string; profile_data: AnalysisFormPayload }>;
  const saved = rows?.[0];
  if (!saved) {
    throw new Error('Supabase profile save returned an unexpected response.');
  }

  return {
    userId,
    updatedAt: saved.updated_at,
    ...saved.profile_data,
  };
}
