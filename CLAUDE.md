# Claude Working Notes

## Project Snapshot

- App type: single-page Next.js 16 App Router application.
- Main experience: Bazi calculator and chart viewer.
- Optional backend feature: OpenAI-powered chart reading at `POST /api/analyze`.
- Key source files:
  - `src/app/page.tsx`
  - `src/components/BaziCalculator.tsx`
  - `src/lib/bazi.ts`
  - `src/app/api/analyze/route.ts`

## How The System Is Split

- `src/components/BaziCalculator.tsx`
  - Client-only UI.
  - Owns form inputs, calculation triggers, loading/error states, SVG chart rendering, and AI analysis fetches.
- `src/lib/bazi.ts`
  - Pure domain/calculation layer.
  - Includes stems, branches, Ten Gods, solar-term helpers, DST/timezone conversion, true solar time, Da Yun, and chart summary helpers.
- `src/app/api/analyze/route.ts`
  - Server-side OpenAI integration.
  - Accepts chart payload from the client and returns generated text.

## Development Rules

- Read the relevant bundled Next.js docs in `node_modules/next/dist/docs/` before changing framework behavior.
- Keep the client/server boundary explicit.
- Prefer extracting reusable helpers over expanding the main calculator component further.
- Keep TypeScript strict-compatible.
- Preserve `@/*` imports rooted at `src/`.

## Allowed Changes

- UI and UX improvements inside the existing App Router structure.
- Refactors that split the calculator into smaller components/hooks.
- Calculation fixes in `src/lib/bazi.ts`.
- API hardening for `/api/analyze`.
- Documentation updates for agent workflows and architecture.

## Avoid

- Replacing App Router with Pages Router.
- Moving secrets into client code.
- Treating placeholder framework metadata or README content as authoritative product documentation.
- Introducing speculative Bazi rules without documenting the rationale in code comments or docs.

## Environment

- Required for AI analysis: `OPENAI_API_KEY` in `.env.local`.
- Recommended checks:
  - `npx eslint src --format stylish`
  - `npm run build`

## When Editing

- If you change calculations, review timezone, DST, and unknown-time behavior together.
- If you change `/api/analyze`, keep the response format compatible with the current client fetch flow.
- If you change labels or page purpose, also update `src/app/layout.tsx` metadata and repository docs.
