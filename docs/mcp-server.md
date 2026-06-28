# Horomo MCP Server (Phase 1)

This project exposes Horomo's BaZi calculation engine to AI clients (Claude
Desktop, Cursor, etc.) through an **MCP server** — a single Next.js route that
speaks the Model Context Protocol over Streamable HTTP.

## What an MCP server is, here

An MCP server publishes **tools** that an AI client can discover and call. The
flow is JSON-RPC:

```
AI client ──tools/list──▶  server returns [{ name, description, inputSchema }, …]
AI client ──tools/call──▶  server runs the matching handler ──▶ returns text content
```

In this repo that is one dynamic route, `src/app/api/[transport]/route.ts`:

- `createMcpHandler((server) => { … }, {}, { basePath: '/api' })` builds the
  protocol handler. `basePath: '/api'` means the client connects at `/api/mcp`.
- `export { handler as GET, handler as POST }` wires it into Next.js.
- Each `server.registerTool(name, { description, inputSchema }, handler)` adds one
  tool. The **description** tells the AI *when* to use the tool; the **inputSchema**
  (Zod) tells it *what arguments* to send; the **handler** runs on `tools/call`.

The handlers are thin — all logic lives in `src/lib/mcp-tools.ts`, which calls the
same deterministic engine (`computeBazi`, `computeUsefulElement`, …) the website
uses, so the MCP output always matches the UI. The route stays free of business
logic and the logic stays unit-testable without the MCP transport.

## Tools (Phase 1 — read-only, no auth, no billing)

All three take `date` (YYYY-MM-DD), optional `time` (HH:mm), `timezone` (IANA),
and `longitude` (degrees, East +, West −). **`longitude` must be the real
birthplace longitude — not `0`.** Every tool validates the longitude/timezone
pair (the same 60° guard the website uses) before computing, so a mismatch (e.g.
a Thai longitude with a US timezone) is rejected instead of silently producing a
wrong chart.

| Tool | Purpose |
|------|---------|
| `compute_bazi_chart` | Four Pillars (Year/Month/Day/Hour), Ten Gods (十神), five structures, and true-solar-time correction. |
| `compute_useful_element` | Useful Element (用神) + Day Master strength (身強/身弱) with a support/drain breakdown. Returns *not asserted* for borderline / 從格 charts. |
| `compute_da_yun` | Major Luck Cycles (大運): decade pillars, start age, direction. Also takes `gender` (sets direction only). |

## Connecting a client

Run the app, then point an MCP client at `/api/mcp`. Example client config:

```json
{
  "mcpServers": {
    "horomo": {
      "url": "https://<your-host>/api/mcp"
    }
  }
}
```

(For local dev that is `http://localhost:3000/api/mcp`.)

## Setup

The MCP packages are pinned in `package.json`; install them with:

```bash
npm install
```

(`mcp-handler`, `@modelcontextprotocol/sdk@1.26.0` — the SDK is pinned at the
security-fixed version — and `zod`.)

## Phase 2 (not in this release)

The AI chart *reading* (`/api/analyze`) is intentionally **not** exposed here: it
calls a paid LLM and needs authentication and credit handling. A future
`analyze_chart` tool will add that behind auth/billing. Phase 1 is calculation
only.
