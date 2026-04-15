import { NextRequest, NextResponse } from 'next/server';

import { createSupabaseServerClient } from '@/lib/supabase/server';
import { buildAnalysisLogInsert, insertAnalysisLog } from '@/lib/analysis-log';
import { parseAnalyzeRequestBody } from '@/lib/analysis-payload';

export async function POST(req: NextRequest) {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  const userId = user?.id ?? null;

  const body = await req.json().catch(() => null);
  const parsedBody = parseAnalyzeRequestBody(body);

  if (!parsedBody) {
    return NextResponse.json({ error: 'Invalid payload.' }, { status: 400 });
  }

  try {
    await insertAnalysisLog(
      buildAnalysisLogInsert({
        requestBody: parsedBody,
        userId,
        userAgent: req.headers.get('user-agent'),
        requestId: crypto.randomUUID(),
        route: '/api/log-chart',
        analysisStatus: 'calculated',
      }),
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown logging error';
    console.error('Chart log insert failed', { message });
  }

  return new NextResponse(null, { status: 204 });
}
