import { NextRequest, NextResponse } from 'next/server';

import { createSupabaseServerClient } from '@/lib/supabase/server';
import { clockTimeToUtc } from '@/lib/bazi';
import { fetchUserProfile } from '@/lib/profile';
import { computeHourlyScoring } from '@/lib/hourly-scoring';
import type { AnalysisFormPayload } from '@/lib/analysis-payload';

export type HourlyScoringRouteDependencies = {
  getSession: () => Promise<{ id: string } | null>;
  fetchProfile: (userId: string) => Promise<AnalysisFormPayload | null>;
  computeScoring: (profile: AnalysisFormPayload, referenceDate?: Date) => ReturnType<typeof computeHourlyScoring>;
};

function parseReferenceDate(dateParam: string | null, timezone: string): Date | null {
  if (!dateParam) return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateParam)) return null;

  const [year, month, day] = dateParam.split('-').map((value) => Number.parseInt(value, 10));
  if (!year || !month || !day) return null;

  try {
    return clockTimeToUtc(year, month, day, 12, 0, timezone);
  } catch {
    return null;
  }
}

function getRequestDateParam(req: NextRequest) {
  if ('nextUrl' in req && req.nextUrl) {
    return req.nextUrl.searchParams.get('date');
  }

  return new URL(req.url).searchParams.get('date');
}

export async function handleHourlyScoringGet(
  req: NextRequest,
  dependencies: HourlyScoringRouteDependencies,
) {
  const session = await dependencies.getSession();
  if (!session?.id) {
    return NextResponse.json(
      { error: 'Unauthorized. Please sign in to access hourly scoring.' },
      { status: 401 },
    );
  }

  const profile = await dependencies.fetchProfile(session.id);
  if (!profile) {
    return NextResponse.json({ profile: null, scoring: null });
  }

  const referenceDate = parseReferenceDate(getRequestDateParam(req), profile.timezone);
  const scoring = dependencies.computeScoring(profile, referenceDate ?? undefined);
  return NextResponse.json({ profile, scoring });
}

export async function GET(req: NextRequest) {
  return handleHourlyScoringGet(req, {
    getSession: async () => {
      const supabase = await createSupabaseServerClient();
      const { data: { user } } = await supabase.auth.getUser();
      return user ?? null;
    },
    fetchProfile: fetchUserProfile,
    computeScoring: computeHourlyScoring,
  });
}
