import { getServerSession } from 'next-auth';
import { NextRequest, NextResponse } from 'next/server';

import { authOptions } from '@/lib/auth';
import { insertCompatibilityLog } from '@/lib/analysis-log';
import packageJson from '../../../../package.json';

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.email ?? null;

  const body = await req.json().catch(() => null);
  if (!body || typeof body !== 'object') {
    return NextResponse.json({ error: 'Invalid payload.' }, { status: 400 });
  }

  const {
    personA,
    personB,
    pillarsA,
    pillarsB,
    tier,
    dayBranchInteraction,
    dayMasterRelationship,
    elementBalance,
  } = body as Record<string, unknown>;

  const a = personA as Record<string, string> | null;
  const b = personB as Record<string, string> | null;

  try {
    await insertCompatibilityLog({
      user_id:                userId,
      name_a:                 a?.name || null,
      birth_date_a:           a?.date ?? '',
      birth_time_a:           a?.time || null,
      pillars_a:              pillarsA ?? null,
      name_b:                 b?.name || null,
      birth_date_b:           b?.date ?? '',
      birth_time_b:           b?.time || null,
      pillars_b:              pillarsB ?? null,
      tier:                   typeof tier === 'string' ? tier : '',
      day_branch_interaction: typeof dayBranchInteraction === 'string' ? dayBranchInteraction : '',
      day_master_relationship: typeof dayMasterRelationship === 'string' ? dayMasterRelationship : '',
      element_balance:        elementBalance ?? null,
      app_version:            packageJson.version ?? null,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown logging error';
    console.error('Compatibility log insert failed', { message });
  }

  return new NextResponse(null, { status: 204 });
}
