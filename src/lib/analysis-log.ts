import packageJson from '../../package.json';

import type { AnalyzeRequestBody, AnalysisFormPayload } from '@/lib/analysis-payload';

const ANALYSIS_LOG_TABLE = 'analysis_logs';

export type AnalysisStatus = 'requested';

export type AnalysisDebugMetadata = {
  route: '/api/analyze';
  requestId: string;
  receivedAt: string;
  clientGeneratedAt: string;
  userAgent: string | null;
  aiModel: string;
  timezone: string;
  unknownTime: boolean;
};

export type AnalysisLogInsert = {
  user_id: string | null;
  birth_info: AnalysisFormPayload;
  pillars: AnalyzeRequestBody['computedChart']['pillars'];
  chart_data: AnalyzeRequestBody['computedChart']['chartData'];
  request_payload: AnalyzeRequestBody;
  debug_metadata: AnalysisDebugMetadata;
  analysis_status: AnalysisStatus;
  app_version: string | null;
  logging_error: string | null;
};

function getSupabaseConfig() {
  const url = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    throw new Error('Supabase logging is not configured.');
  }

  return { url, serviceRoleKey };
}

export function buildAnalysisLogInsert(params: {
  requestBody: AnalyzeRequestBody;
  userId: string | null;
  userAgent: string | null;
  requestId: string;
  aiModel: string;
}): AnalysisLogInsert {
  const { requestBody, userId, userAgent, requestId, aiModel } = params;

  return {
    user_id: userId,
    birth_info: requestBody.birthInfo,
    pillars: requestBody.computedChart.pillars,
    chart_data: requestBody.computedChart.chartData,
    request_payload: requestBody,
    debug_metadata: {
      route: '/api/analyze',
      requestId,
      receivedAt: new Date().toISOString(),
      clientGeneratedAt: requestBody.requestMetadata.clientGeneratedAt,
      userAgent,
      aiModel,
      timezone: requestBody.birthInfo.timezone,
      unknownTime: requestBody.birthInfo.unknownTime,
    },
    analysis_status: 'requested',
    app_version: packageJson.version ?? null,
    logging_error: null,
  };
}

export async function insertAnalysisLog(payload: AnalysisLogInsert): Promise<void> {
  const { url, serviceRoleKey } = getSupabaseConfig();
  const response = await fetch(`${url}/rest/v1/${ANALYSIS_LOG_TABLE}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: serviceRoleKey,
      Authorization: `Bearer ${serviceRoleKey}`,
      Prefer: 'return=minimal',
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Supabase insert failed (${response.status}): ${errorText.slice(0, 300)}`);
  }
}
