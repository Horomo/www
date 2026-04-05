import { getServerSession } from 'next-auth';
import { NextRequest, NextResponse } from 'next/server';

import { authOptions } from '@/lib/auth';
import { insertAnalysisLog, type CompatibilityLogInsert } from '@/lib/analysis-log';

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.email ?? null;

  const body = await req.json().catch(() => null);
  if (!body || typeof body !== 'object') {
    return NextResponse.json({ error: 'Invalid payload.' }, { status: 400 });
  }

  const { personA, personB, pillarsA, pillarsB, tier, dayBranchInteraction, dayMasterRelationship } = body as Record<string, unknown>;

  const logPayload: CompatibilityLogInsert = {
    user_id: userId,
    birth_info: {
      person_a: {
        name: (personA as Record<string, string>)?.name ?? '',
        date: (personA as Record<string, string>)?.date ?? '',
        time: (personA as Record<string, string>)?.time ?? '',
      },
      person_b: {
        name: (personB as Record<string, string>)?.name ?? '',
        date: (personB as Record<string, string>)?.date ?? '',
        time: (personB as Record<string, string>)?.time ?? '',
      },
    },
    pillars: {
      person_a: pillarsA ?? null,
      person_b: pillarsB ?? null,
    },
    chart_data: null,
    request_payload: body,
    debug_metadata: {
      type: 'compatibility',
      rating: typeof tier === 'string' ? tier : '',
      day_branch_interaction: (dayBranchInteraction as 'six_harmony' | 'six_clash' | 'neutral') ?? 'neutral',
      day_master_relationship: typeof dayMasterRelationship === 'string' ? dayMasterRelationship : '',
    },
    analysis_status: 'calculated',
    app_version: null,
    logging_error: null,
  };

  try {
    await insertAnalysisLog(logPayload);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown logging error';
    console.error('Compatibility log insert failed', { message });
  }

  return new NextResponse(null, { status: 204 });
}
