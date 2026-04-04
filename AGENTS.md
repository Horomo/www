<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This repo uses Next.js 16 App Router. Before changing routing, rendering, metadata, caching, or API behavior, read the relevant guide in `node_modules/next/dist/docs/`. At minimum, use:

- `01-app/01-getting-started/02-project-structure.md`
- `01-app/01-getting-started/05-server-and-client-components.md`

Heed deprecations and do not rely on training-time Next.js assumptions.
<!-- END:nextjs-agent-rules -->

# Repository Guide

## Architecture

- Runtime: Next.js 16.2.2, React 19, TypeScript, Tailwind CSS v4.
- Entry route: `src/app/page.tsx` renders `src/components/BaziCalculator.tsx`.
- Client UI: `src/components/BaziCalculator.tsx` is a large `"use client"` component that owns form state, chart rendering, and AI analysis requests.
- Domain logic: `src/lib/bazi.ts` contains the Bazi engine, timezone/DST helpers, solar term math, and chart aggregation helpers.
- Server API: `src/app/api/analyze/route.ts` calls OpenAI using `OPENAI_API_KEY` and returns a short text analysis.

## Current User Flow

1. User enters birth info in the calculator.
2. Client computes pillars locally with `computeBazi()` and `computeChartData()`.
3. UI renders pillar tables, charts, and Da Yun cycles from local calculations.
4. Optional AI analysis posts chart data to `/api/analyze`.

## Commands

- Install: `npm install`
- Dev: `npm run dev`
- Lint: `npx eslint src --format stylish`
- Build: `npm run build`

## Agent Rules

- Keep business logic in `src/lib/bazi.ts` or nearby domain modules, not inline in JSX.
- Keep server-only behavior in route handlers or server modules. Never expose `OPENAI_API_KEY` or other secrets to client code.
- Preserve the App Router layout under `src/app/`; do not introduce Pages Router files.
- Prefer small focused components/hooks over growing `BaziCalculator.tsx`.
- Validate input and error states at the edge of the system: form parsing in the client, request validation in the API route, invariant-heavy logic in the domain layer.
- Update metadata, labels, and docs when changing product behavior. The current metadata in `src/app/layout.tsx` is placeholder content and should be treated as application content, not framework boilerplate.
- Use absolute source-of-truth rules from the codebase, not generic metaphysics assumptions, when modifying calculations.

## Do Not

- Do not assume Next.js behavior from older versions without checking local docs.
- Do not move calculation logic into the API just to make the UI work; the current architecture is local-first calculation with optional AI enrichment.
- Do not commit `.env*`, secrets, `.next/`, or machine-local `.claude` settings.
- Do not import server-only modules into client components.
- Do not add new dependencies for small utilities unless existing platform APIs are clearly insufficient.

## Expected Change Pattern

- For calculation changes: update `src/lib/bazi.ts`, then verify the UI output path in `src/components/BaziCalculator.tsx`.
- For AI analysis changes: update `src/app/api/analyze/route.ts`, then verify the client request/response handling in `src/components/BaziCalculator.tsx`.
- For UI refactors: preserve the existing inputs, chart outputs, and bilingual labeling unless the task explicitly changes product behavior.

## Validation Checklist

- Run `npx eslint src --format stylish`.
- Run `npm run build`.
- If calculations changed, manually sanity-check at least one known chart scenario, especially around DST, timezone, and unknown birth time handling.
