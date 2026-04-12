import { getServerSession } from 'next-auth';
import { NextRequest, NextResponse } from 'next/server';

import { authOptions } from '@/lib/auth';
import { fetchUserProfile, parseSavedProfile, upsertUserProfile } from '@/lib/profile';
import type { AnalysisFormPayload } from '@/lib/analysis-payload';
import type { SavedBaziProfile } from '@/lib/profile';

export type ProfileRouteDependencies = {
  getSession: () => Promise<{ user?: { email?: string | null } } | null>;
  fetchProfile: (userId: string) => Promise<SavedBaziProfile | null>;
  saveProfile: (userId: string, profile: AnalysisFormPayload) => Promise<SavedBaziProfile>;
};

function handleProfileStorageError(error: unknown) {
  const message = error instanceof Error ? error.message : 'Unable to access saved profile storage.';
  const status = message.includes('not configured') ? 503 : 500;

  return NextResponse.json(
    { error: message },
    { status },
  );
}

export async function handleProfileGet(
  req: NextRequest,
  dependencies: ProfileRouteDependencies,
) {
  const session = await dependencies.getSession();
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized. Please sign in with Google to access your saved profile.' }, { status: 401 });
  }

  try {
    const profile = await dependencies.fetchProfile(session.user.email);
    return NextResponse.json({ profile });
  } catch (error: unknown) {
    return handleProfileStorageError(error);
  }
}

export async function handleProfilePost(
  req: NextRequest,
  dependencies: ProfileRouteDependencies,
) {
  const session = await dependencies.getSession();
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized. Please sign in with Google to save your profile.' }, { status: 401 });
  }

  const payload = await req.json().catch(() => null);
  const profile = parseSavedProfile(payload);

  if (!profile) {
    return NextResponse.json({ error: 'Invalid profile payload.' }, { status: 400 });
  }

  try {
    const savedProfile = await dependencies.saveProfile(session.user.email, profile);
    return NextResponse.json({ profile: savedProfile });
  } catch (error: unknown) {
    return handleProfileStorageError(error);
  }
}

export async function GET(req: NextRequest) {
  try {
    return await handleProfileGet(req, {
      getSession: () => getServerSession(authOptions),
      fetchProfile: fetchUserProfile,
      saveProfile: upsertUserProfile,
    });
  } catch (error: unknown) {
    return handleProfileStorageError(error);
  }
}

export async function POST(req: NextRequest) {
  try {
    return await handleProfilePost(req, {
      getSession: () => getServerSession(authOptions),
      fetchProfile: fetchUserProfile,
      saveProfile: upsertUserProfile,
    });
  } catch (error: unknown) {
    return handleProfileStorageError(error);
  }
}
