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
