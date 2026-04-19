# CLAUDE.md

Behavioral guidelines to reduce common LLM coding mistakes. Merge with project-specific instructions as needed.

**Tradeoff:** These guidelines bias toward caution over speed. For trivial tasks, use judgment.

## 1. Think Before Coding

**Don't assume. Don't hide confusion. Surface tradeoffs.**

Before implementing:
- State your assumptions explicitly. If uncertain, ask.
- If multiple interpretations exist, present them - don't pick silently.
- If a simpler approach exists, say so. Push back when warranted.
- If something is unclear, stop. Name what's confusing. Ask.

## 2. Simplicity First

**Minimum code that solves the problem. Nothing speculative.**

- No features beyond what was asked.
- No abstractions for single-use code.
- No "flexibility" or "configurability" that wasn't requested.
- No error handling for impossible scenarios.
- If you write 200 lines and it could be 50, rewrite it.

Ask yourself: "Would a senior engineer say this is overcomplicated?" If yes, simplify.

## 3. Surgical Changes

**Touch only what you must. Clean up only your own mess.**

When editing existing code:
- Don't "improve" adjacent code, comments, or formatting.
- Don't refactor things that aren't broken.
- Match existing style, even if you'd do it differently.
- If you notice unrelated dead code, mention it - don't delete it.

When your changes create orphans:
- Remove imports/variables/functions that YOUR changes made unused.
- Don't remove pre-existing dead code unless asked.

The test: Every changed line should trace directly to the user's request.

## 4. Goal-Driven Execution

**Define success criteria. Loop until verified.**

Transform tasks into verifiable goals:
- "Add validation" → "Write tests for invalid inputs, then make them pass"
- "Fix the bug" → "Write a test that reproduces it, then make it pass"
- "Refactor X" → "Ensure tests pass before and after"

For multi-step tasks, state a brief plan:
```
1. [Step] → verify: [check]
2. [Step] → verify: [check]
3. [Step] → verify: [check]
```

Strong success criteria let you loop independently. Weak criteria ("make it work") require constant clarification.

---

**These guidelines are working if:** fewer unnecessary changes in diffs, fewer rewrites due to overcomplication, and clarifying questions come before implementation rather than after mistakes.

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
