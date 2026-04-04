import { getServerSession } from 'next-auth';
import { NextRequest, NextResponse } from 'next/server';

import { authOptions } from '@/lib/auth';
import { buildAnalysisLogInsert, insertAnalysisLog } from '@/lib/analysis-log';
import { parseAnalyzeRequestBody } from '@/lib/analysis-payload';

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.email ?? null;

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
