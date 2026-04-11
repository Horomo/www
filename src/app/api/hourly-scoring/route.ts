import { getServerSession } from 'next-auth';
import { NextRequest, NextResponse } from 'next/server';

import { authOptions } from '@/lib/auth';
import { fetchUserProfile } from '@/lib/profile';
import { computeHourlyScoring } from '@/lib/hourly-scoring';
import type { AnalysisFormPayload } from '@/lib/analysis-payload';

export type HourlyScoringRouteDependencies = {
  getSession: () => Promise<{ user?: { email?: string | null } } | null>;
  fetchProfile: (userId: string) => Promise<AnalysisFormPayload | null>;
  computeScoring: (profile: AnalysisFormPayload) => ReturnType<typeof computeHourlyScoring>;
};

export async function handleHourlyScoringGet(
  req: NextRequest,
  dependencies: HourlyScoringRouteDependencies,
) {
  const session = await dependencies.getSession();
  if (!session?.user?.email) {
    return NextResponse.json(
      { error: 'Unauthorized. Please sign in to access hourly scoring.' },
      { status: 401 },
    );
  }

  const profile = await dependencies.fetchProfile(session.user.email);
  if (!profile) {
    return NextResponse.json({ profile: null, scoring: null });
  }

  const scoring = dependencies.computeScoring(profile);
  return NextResponse.json({ profile, scoring });
}

export async function GET(req: NextRequest) {
  return handleHourlyScoringGet(req, {
    getSession: () => getServerSession(authOptions),
    fetchProfile: fetchUserProfile,
    computeScoring: computeHourlyScoring,
  });
}
