import { createMcpHandler } from 'mcp-handler';
import { z } from 'zod';

import {
  BATCH_MAX_DATES,
  computeBatchTool,
  computeChartTool,
  computeDaYunTool,
  computeDayHoursTool,
  computeUsefulTool,
  McpToolError,
  type ToolOutput,
} from '@/lib/mcp-tools';

// ─────────────────────────────────────────────────────────────────────────────
// Horomo MCP server — Phase 1 + 1.5 (read-only calculation tools).
//
// How it works: an AI client (Claude Desktop, Cursor, …) speaks JSON-RPC over
// Streamable HTTP to this single dynamic route. `createMcpHandler` turns the
// registered tools into the MCP protocol:
//   - tools/list  → the client discovers each tool's name, description, schema
//   - tools/call  → the matching handler runs and returns text content
// Each tool below = name + description (tells the AI when to use it) + a Zod
// input schema + a handler that calls the deterministic BaZi engine (via
// src/lib/mcp-tools.ts) and returns AI-readable text PLUS the same data as
// MCP `structuredContent` (machine-readable JSON; no outputSchema declared, so
// the SDK passes it through unvalidated — the JSON shape is documented in
// docs/mcp-server.md). No auth, no billing, no write/AI-analysis here — that
// is Phase 2. No scoring/ranking either: calculation only.
//
// Client URL: https://<host>/api/mcp
// ─────────────────────────────────────────────────────────────────────────────

const dateField = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'date must be YYYY-MM-DD');
const timeField = z
  .string()
  .regex(/^\d{2}:\d{2}$/, 'time must be HH:mm')
  .optional()
  .describe('Local clock time at the birthplace (24h HH:mm). Omit if the birth time is unknown.');
const timezoneField = z.string().min(1).describe('IANA timezone of the birthplace, e.g. "Asia/Bangkok".');
const longitudeField = z
  .number()
  .min(-180)
  .max(180)
  .describe('TRUE longitude of the birthplace in degrees (East positive, West negative). Use the real birthplace longitude — do NOT pass 0.');

const birthShape = {
  date: dateField,
  time: timeField,
  timezone: timezoneField,
  longitude: longitudeField,
};

const genderField = {
  gender: z
    .enum(['male', 'female'])
    .describe('Sets the Major Luck Cycle (大運) direction (classical rule). Does not affect the pillars or 用神.'),
};

const ok = ({ text, structured }: ToolOutput) => ({
  content: [{ type: 'text' as const, text }],
  structuredContent: structured,
});
const fail = (error: unknown) => ({
  content: [{
    type: 'text' as const,
    text: error instanceof McpToolError
      ? error.message
      : `Calculation failed: ${error instanceof Error ? error.message : String(error)}`,
  }],
  isError: true as const,
});
const run = <A,>(fn: (input: A) => ToolOutput, args: A) => {
  try {
    return ok(fn(args));
  } catch (error) {
    return fail(error);
  }
};

const handler = createMcpHandler(
  (server) => {
    server.registerTool(
      'compute_bazi_chart',
      {
        title: 'Compute BaZi chart',
        description:
          'Compute the BaZi (Four Pillars / 八字) chart from a birth date, optional time, IANA timezone, and birthplace longitude. Returns the Year/Month/Day/Hour pillars, Ten Gods (十神), the five structures, and the true-solar-time correction. Longitude must be the real birthplace longitude (not 0).',
        inputSchema: birthShape,
      },
      async (args) => run(computeChartTool, args),
    );

    server.registerTool(
      'compute_useful_element',
      {
        title: 'Compute Useful Element (用神)',
        description:
          'Determine the Useful Element (用神) and Day Master strength (身強/身弱) for a BaZi chart, with a transparent support/drain breakdown. Returns "not asserted" for borderline or special-structure (從格) charts instead of guessing.',
        inputSchema: birthShape,
      },
      async (args) => run(computeUsefulTool, args),
    );

    server.registerTool(
      'compute_da_yun',
      {
        title: 'Compute Major Luck Cycles (大運)',
        description:
          'Compute the Major Luck Cycles (大運) for a BaZi chart: the decade pillars, the start age, and the direction. Gender is required because it sets the cycle direction (classical rule).',
        inputSchema: { ...birthShape, ...genderField },
      },
      async (args) => run(computeDaYunTool, args),
    );

    server.registerTool(
      'compute_bazi_day_hours',
      {
        title: 'Compute all 12 hour pillars of a day (12時辰)',
        description:
          'List the hour pillar (時柱) of every one of the 12 shichen (時辰) for a given date, timezone, and longitude, plus the shared Year/Month/Day pillars and each hour stem\'s Ten God relative to the Day Master. Ranges are true solar time. Deterministic calculation only — no scoring or ranking of hours.',
        inputSchema: { date: dateField, timezone: timezoneField, longitude: longitudeField },
      },
      async (args) => run(computeDayHoursTool, args),
    );

    server.registerTool(
      'compute_bazi_batch',
      {
        title: 'Compute BaZi charts for multiple dates',
        description:
          `Compute full BaZi charts for up to ${BATCH_MAX_DATES} dates in one call (same optional time, timezone, and longitude for every date). Each entry in the structured JSON matches compute_bazi_chart exactly. Deterministic calculation only — no scoring or ranking of dates.`,
        inputSchema: {
          dates: z
            .array(dateField)
            .min(1)
            .max(BATCH_MAX_DATES)
            .describe(`Dates to compute (YYYY-MM-DD each, at most ${BATCH_MAX_DATES} per call).`),
          time: timeField,
          timezone: timezoneField,
          longitude: longitudeField,
        },
      },
      async (args) => run(computeBatchTool, args),
    );
  },
  {},
  { basePath: '/api', maxDuration: 60 },
);

export { handler as GET, handler as POST };
