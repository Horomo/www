import { NextRequest, NextResponse } from 'next/server';

import { createSupabaseServerClient } from '@/lib/supabase/server';
import { buildAnalysisLogInsert, insertAnalysisLog } from '@/lib/analysis-log';
import { parseAnalyzeRequestBody } from '@/lib/analysis-payload';
import { validateBirthLocationForWrite } from '@/lib/location-write-validation';

type LogChartRouteDependencies = {
  getUserId: () => Promise<string | null>;
  buildLogInsert: typeof buildAnalysisLogInsert;
  insertLog: typeof insertAnalysisLog;
  randomUUID: () => string;
};

const defaultDependencies: LogChartRouteDependencies = {
  getUserId: async () => {
    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    return user?.id ?? null;
  },
  buildLogInsert: buildAnalysisLogInsert,
  insertLog: insertAnalysisLog,
  randomUUID: () => crypto.randomUUID(),
};

export async function handleLogChartRequest(
  req: Request,
  dependencies: LogChartRouteDependencies = defaultDependencies,
) {
  const userId = await dependencies.getUserId();
  const body = await req.json().catch(() => null);
  const parsedBody = parseAnalyzeRequestBody(body);

  if (!parsedBody) {
    return NextResponse.json({ error: 'Invalid payload.' }, { status: 400 });
  }

  const locationValidation = validateBirthLocationForWrite(parsedBody.birthInfo);
  if (!locationValidation.valid) {
    return NextResponse.json({ error: locationValidation.error }, { status: 400 });
  }

  try {
    await dependencies.insertLog(
      dependencies.buildLogInsert({
        requestBody: parsedBody,
        userId,
        userAgent: req.headers.get('user-agent'),
        requestId: dependencies.randomUUID(),
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

export async function POST(req: NextRequest) {
  return handleLogChartRequest(req);
}
