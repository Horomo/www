# Horomo MCP Server (Phase 1 + 1.5)

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

## Tools (read-only, no auth, no billing, calculation only — no scoring/ranking)

All tools take `timezone` (IANA) and `longitude` (degrees, East +, West −).
**`longitude` must be the real birthplace longitude — not `0`.** Every tool
(and, for the batch tool, every date) validates the longitude/timezone pair
(the same 60° guard the website uses) before computing, so a mismatch (e.g.
a Thai longitude with a US timezone) is rejected instead of silently producing a
wrong chart.

| Tool | Input | Purpose |
|------|-------|---------|
| `compute_bazi_chart` | `date`, `time?`, `timezone`, `longitude` | Four Pillars (Year/Month/Day/Hour), Ten Gods (十神), five structures, and true-solar-time correction. |
| `compute_useful_element` | `date`, `time?`, `timezone`, `longitude` | Useful Element (用神) + Day Master strength (身強/身弱) with a support/drain breakdown. Returns *not asserted* for borderline / 從格 charts. |
| `compute_da_yun` | `date`, `time?`, `timezone`, `longitude`, `gender` | Major Luck Cycles (大運): decade pillars, start age, direction. `gender` sets direction only. |
| `compute_bazi_day_hours` | `date`, `timezone`, `longitude` | All 12 hour pillars (時柱) of one date — one per shichen (時辰) — plus the shared Year/Month/Day pillars and each hour stem's Ten God vs the Day Master. Ranges are **true solar time**; follows the engine's 早子時 (midnight-rollover) convention, so 23:00–24:00 solar keeps the same day pillar. |
| `compute_bazi_batch` | `dates[]` (≤ 31), `time?`, `timezone`, `longitude` | Full charts for several dates in one call. Each structured entry is exactly `compute_bazi_chart`'s structured output for that date. More than 31 dates → clear error. |
| `compute_compatibility` | `personA {date, time?, timezone, longitude}`, `personB {…}`, `genderA?`, `genderB?` | Deterministic 合婚 analysis of two charts on four rule-based axes (each 0–10 + reasoning): Day Master 生/克 relation, cross-chart branch interactions (六合/半三合/半三会/冲/刑/害/破 from hardcoded standard tables), 用神 complementarity, and — only when **both** genders are given — the spouse star (配偶星). Borderline 用神 or missing gender → that axis is *not asserted* and dropped from the weighted overall (weights: 0.2/0.35/0.3/0.15, echoed in the output). Both persons are validated like every other tool (incl. the 60° guard, errors prefixed `personA:`/`personB:`). |

## Structured output (Phase 1.5)

Every tool returns **both** views of the same engine result:

- `content` — the Phase 1 human/AI-readable text, unchanged;
- `structuredContent` — a machine-readable JSON object built from the *same*
  `computeBazi` call, so the two can never disagree.

No MCP `outputSchema` is declared (the SDK then passes `structuredContent`
through unvalidated); the shapes are:

- `compute_bazi_chart`: `{ birth {date, time|null, timezone, longitude, unknownTime}, trueSolar {time, correctionMinutes, dayChanged, breakdown {dstMin, longitudeMin, eotMin}} | null, pillars {year, month, day (+isDayMaster), hour|null}, dayMaster {stem, element, polarity}, tenGods {十神: count}, fiveStructures {structure: count} }`.
  Each pillar: `{ stem, stemPinyin, stemElement, stemPolarity, branch, branchPinyin, branchElement, branchPolarity, zodiac }`.
- `compute_useful_element`: `{ birth, dayMaster, classification, supportScore, drainScore, strengthRatio, structureScores, usefulElement|null, favorableElements[], unfavorableElements[], flags[], reasoning, breakdown[] }`.
  `usefulElement` stays `null` for borderline/從格 charts — the JSON never guesses a value the engine refused to assert.
- `compute_da_yun`: `{ birth, available, direction, calculationMode, startAge {years, months}, nearestSolarTerm, cycles[] {stem, stemPinyin, stemElement, branch, branchPinyin, branchElement, ageStart, ageEnd, yearStart, yearEnd} }`.
- `compute_bazi_day_hours`: `{ date, timezone, longitude, solarCorrectionMinutesAtNoon, convention, pillars {year, month, day}, dayMaster, hours[12] {shichen, pinyin, solarRange, pillar, tenGodVsDayMaster {zh, en, pinyin}} }`.
- `compute_bazi_batch`: `{ timezone, longitude, time|null, count, charts[] }` where each `charts` entry is the `compute_bazi_chart` structured shape.
- `compute_compatibility`: `{ personA {birth, pillars, dayMaster, usefulElement {classification, usefulElement|null, favorableElements, unfavorableElements, flags}, elementCounts}, personB {…}, dimensions { dayMasterRelation {score, relation, direction, reasoning}, branchInteractions {score, interactions[] {kind, zh, en, effect, pillarA, branchA, pillarB, branchB}, reasoning}, usefulElementComplementarity {score|null, aNeedsFromB, bNeedsFromA, reasoning}, spouseStar {asserted, score|null, personA|null, personB|null, reasoning} }, overall {score, weights, assessedAxes[], notes[]} }`.
  Unassessable axes carry `score: null` (and are absent from `assessedAxes`) — never a guessed number.

Deliberately **not** included anywhere: scoring, ranking, or good/bad ratings of
hours or dates. Those weights have no canonical standard (like the 用神 weights)
and are a separate phase gated on expert calibration.

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
