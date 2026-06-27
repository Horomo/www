Horomo is a Next.js 16 BaZi calculator focused on accurate single-person Four Pillars calculation with optional AI interpretation.

## Getting Started

Run the app locally:

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to use the calculator.

## Product Scope

- Single-person BaZi chart calculation
- Four Pillars generation with true solar time support
- Element and Ten Gods analysis
- Da Yun cycle calculation
- Optional AI reading for the computed chart

## Calculation Conventions

- **Day boundary (子時 / zi hour): the day changes at midnight (00:00).** The day
  pillar advances at local solar midnight. A birth at 23:00–23:59 (子初 / 夜子時,
  the "late-zi" first half of 子時) keeps the current day's pillar and Day Master
  while its hour branch is 子. This is the midnight-rollover rule (子正換日),
  commonly called the 早子時 method. The alternative school rolls the day at 23:00
  (子初換日 / 晚子時 method), assigning those births the next day's pillar; it is a
  recognised school choice (not a bug) and is **not** currently supported — a
  future opt-in toggle (default = midnight rollover) is planned. See the note in
  `src/lib/bazi.ts` (`dayPillar`).

## Important Files

- `src/app/page.tsx` renders the main calculator route
- `src/components/BaziCalculator.tsx` contains the client UI
- `src/lib/bazi.ts` contains the core BaZi engine
- `src/app/api/analyze/route.ts` handles optional AI analysis

## Commands

```bash
npx eslint src --format stylish
npm test
npm run build
```

## Notes

- The app uses the Next.js App Router under `src/app/`.
- Core calculation logic stays local-first and should remain in `src/lib/bazi.ts`.
- Server routes should stay limited to auth, analysis, and supporting services.
