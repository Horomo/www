import packageJson from '../../package.json';

import type { AnalyzeRequestBody, AnalysisFormPayload } from '@/lib/analysis-payload';

const ANALYSIS_LOG_TABLE = 'analysis_logs';

export type AnalysisStatus = 'requested' | 'calculated';

export type AnalysisDebugMetadata = {
  route: string;
  requestId: string;
  receivedAt: string;
  clientGeneratedAt: string;
  userAgent: string | null;
  aiModel: string;
  timezone: string;
  unknownTime: boolean;
};

// ── Compatibility log types ────────────────────────────────

export type CompatibilityLogRow = {
  user_id: string | null;
  name_a: string | null;
  birth_date_a: string;
  birth_time_a: string | null;
  pillars_a: unknown;
  name_b: string | null;
  birth_date_b: string;
  birth_time_b: string | null;
  pillars_b: unknown;
  tier: string;
  day_branch_interaction: string;
  day_master_relationship: string;
  element_balance: unknown;
  app_version: string | null;
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
  route?: string;
  aiModel?: string;
  analysisStatus?: AnalysisStatus;
}): AnalysisLogInsert {
  const {
    requestBody, userId, userAgent, requestId,
    route = '/api/analyze',
    aiModel = '',
    analysisStatus = 'requested',
  } = params;

  return {
    user_id: userId,
    birth_info: requestBody.birthInfo,
    pillars: requestBody.computedChart.pillars,
    chart_data: requestBody.computedChart.chartData,
    request_payload: requestBody,
    debug_metadata: {
      route,
      requestId,
      receivedAt: new Date().toISOString(),
      clientGeneratedAt: requestBody.requestMetadata.clientGeneratedAt,
      userAgent,
      aiModel,
      timezone: requestBody.birthInfo.timezone,
      unknownTime: requestBody.birthInfo.unknownTime,
    },
    analysis_status: analysisStatus,
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

const COMPATIBILITY_LOG_TABLE = 'compatibility_logs';

export async function insertCompatibilityLog(row: CompatibilityLogRow): Promise<void> {
  const { url, serviceRoleKey } = getSupabaseConfig();
  const response = await fetch(`${url}/rest/v1/${COMPATIBILITY_LOG_TABLE}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: serviceRoleKey,
      Authorization: `Bearer ${serviceRoleKey}`,
      Prefer: 'return=minimal',
    },
    body: JSON.stringify(row),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Supabase insert failed (${response.status}): ${errorText.slice(0, 300)}`);
  }
}
