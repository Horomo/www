import { createMcpHandler } from 'mcp-handler';
import { z } from 'zod';

import {
  computeChartText,
  computeUsefulText,
  computeDaYunText,
  McpToolError,
  type BirthInput,
} from '@/lib/mcp-tools';

// ─────────────────────────────────────────────────────────────────────────────
// Horomo MCP server — Phase 1 (read-only calculation tools).
//
// How it works: an AI client (Claude Desktop, Cursor, …) speaks JSON-RPC over
// Streamable HTTP to this single dynamic route. `createMcpHandler` turns the
// registered tools into the MCP protocol:
//   - tools/list  → the client discovers each tool's name, description, schema
//   - tools/call  → the matching handler runs and returns text content
// Each tool below = name + description (tells the AI when to use it) + a Zod
// input schema + a handler that calls the deterministic BaZi engine (via
// src/lib/mcp-tools.ts) and returns AI-readable text. No auth, no billing, no
// write/AI-analysis here — that is Phase 2. See docs/mcp-server.md.
//
// Client URL: https://<host>/api/mcp
// ─────────────────────────────────────────────────────────────────────────────

const birthShape = {
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'date must be YYYY-MM-DD'),
  time: z
    .string()
    .regex(/^\d{2}:\d{2}$/, 'time must be HH:mm')
    .optional()
    .describe('Local clock time at the birthplace (24h HH:mm). Omit if the birth time is unknown.'),
  timezone: z.string().min(1).describe('IANA timezone of the birthplace, e.g. "Asia/Bangkok".'),
  longitude: z
    .number()
    .min(-180)
    .max(180)
    .describe('TRUE longitude of the birthplace in degrees (East positive, West negative). Use the real birthplace longitude — do NOT pass 0.'),
};

const genderField = {
  gender: z
    .enum(['male', 'female'])
    .describe('Sets the Major Luck Cycle (大運) direction (classical rule). Does not affect the pillars or 用神.'),
};

const ok = (text: string) => ({ content: [{ type: 'text' as const, text }] });
const fail = (error: unknown) => ({
  content: [{
    type: 'text' as const,
    text: error instanceof McpToolError
      ? error.message
      : `Calculation failed: ${error instanceof Error ? error.message : String(error)}`,
  }],
  isError: true as const,
});
const run = (fn: (input: BirthInput) => string, args: BirthInput) => {
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
      async (args) => run(computeChartText, args as BirthInput),
    );

    server.registerTool(
      'compute_useful_element',
      {
        title: 'Compute Useful Element (用神)',
        description:
          'Determine the Useful Element (用神) and Day Master strength (身強/身弱) for a BaZi chart, with a transparent support/drain breakdown. Returns "not asserted" for borderline or special-structure (從格) charts instead of guessing.',
        inputSchema: birthShape,
      },
      async (args) => run(computeUsefulText, args as BirthInput),
    );

    server.registerTool(
      'compute_da_yun',
      {
        title: 'Compute Major Luck Cycles (大運)',
        description:
          'Compute the Major Luck Cycles (大運) for a BaZi chart: the decade pillars, the start age, and the direction. Gender is required because it sets the cycle direction (classical rule).',
        inputSchema: { ...birthShape, ...genderField },
      },
      async (args) => run(computeDaYunText, args as BirthInput),
    );
  },
  {},
  { basePath: '/api', maxDuration: 60 },
);

export { handler as GET, handler as POST };
