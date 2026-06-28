# Changelog

## 2026-06-28

### Added
- `feat: Horomo MCP server (Phase 1) — read-only BaZi calculation tools`
  Added a Model Context Protocol server (`src/app/api/[transport]/route.ts`, via `mcp-handler`) that lets AI clients (Claude Desktop, Cursor, …) call Horomo's BaZi engine at `/api/mcp`. Three read-only, deterministic tools: `compute_bazi_chart` (Four Pillars, Ten Gods, five structures, true-solar-time correction), `compute_useful_element` (用神 + 身強/身弱 with support/drain breakdown; "not asserted" for borderline/從格 charts), and `compute_da_yun` (Major Luck Cycles: decade pillars, start age, direction). All three run the same engine the website uses (so output matches the UI) and validate the longitude/timezone pair with the shared 60° guard before computing — MCP has no search UI, so a mismatch is rejected at the tool boundary. Tool logic lives in `src/lib/mcp-tools.ts` (no transport dependency, fully unit-tested); the route is a thin registration layer. No auth, billing, or AI analysis — those are Phase 2. New deps: `mcp-handler`, `@modelcontextprotocol/sdk@1.26.0` (pinned at the security-fixed version), `zod`. See `docs/mcp-server.md`.

- `feat: show the Useful Element (用神) result and strength breakdown on the Result page`
  Surfaced the deterministic 用神 engine (added separately) on the calculator Result page as a dedicated "Useful Element · 用神" card in the Analysis Modules section, next to the 5 Structures and Ten Gods views. It shows the classification (身強/身弱/中和/從格-suspect), the asserted 用神 plus 喜神/忌神 — or "Not asserted · complex chart" for borderline/special charts — and the full calibration breakdown: support-vs-drain scores with the deciding thresholds, the weighted per-structure totals, a per-component table (position, stem, Ten God, support/drain side, weight, with 月令 rows tagged), the engine's reasoning, and the active weight config. The card renders the single engine result (computed once from the existing client-side chart, the same `computeUsefulElement` the AI route uses) and never recomputes 用神 logic in the view. The card is hardcoded-English to match the rest of the Result page; wiring it into i18n is a separate task. No engine, config, or time/pillar logic changed.

- `feat: deterministic Day Master strength + Useful Element (用神) engine`
  Added `computeUsefulElement` to the BaZi engine: it weighs 身強/身弱 by summing supporting (印 resource / 比劫 companion) vs draining (官杀 / 財 / 食伤) forces across the chart — the month branch (月令) weighted highest, then other branches, then stems, with rooted hidden stems counted by depth (本气 > 中气 > 余气) — then selects the Useful Element by the 病藥 principle (a weak Day Master gets a supporting element, a strong one a draining element, chosen to counter the dominant cause). The 扶抑 direction and 月令 precedence are fixed (school-agreed); the numeric weights and thresholds live in a single `DEFAULT_STRENGTH_CONFIG` that can be calibrated without touching the logic, and are explicitly Horomo's tunable stance, not a universal standard. Charts that are too balanced (borderline) or too extreme (從格-suspect) are flagged and the engine refuses to assert a 用神 rather than forcing a possibly-inverted call. Every result carries a full per-component breakdown (position, Ten God, support/drain side, weight) so the conclusion is explainable rather than a black box. The AI analysis route now injects this deterministic result and instructs the model to EXPLAIN it — not recompute, override, or guess a Useful Element (and to defer to an expert when not asserted). Time/pillar calculation is unchanged.

## 2026-06-27

### Added
- `dep: add astronomy-engine (2.1.19, MIT, zero-dependency) for solar-term computation`
  Pure-JavaScript astronomical ephemeris (no native binaries, runs on client and server) used to compute the 24 solar terms (節氣) from the Sun's apparent ecliptic longitude of date.

- `fix: validate birth longitude/timezone consistency on write-path APIs`
  Added server-side defense-in-depth validation for newly written chart/profile payloads. Profile saves, chart logging, and AI-analysis requests now reject gross longitude/timezone mismatches using the shared standard-meridian calculation with a global 60-degree tolerance, while legacy profile reads and stored-chart recomputation remain tolerated for backward compatibility.

### Fixed
- `fix: compare 節氣 (solar-term) boundaries in the true UTC-instant frame`
  Year/Month pillars, 生肖, and Da Yun 起運 were decided by feeding True Solar Time (clock + longitude correction + Equation of Time + DST revert) into the solar-term comparison, but 節氣 are absolute UTC instants. Mixing the two frames biased every boundary by the total solar correction (~7–8 h in UTC+7/UTC+8), so a birth within roughly half a day of a 節氣 could land in the wrong Month/Year pillar and 生肖, and the Da Yun start age could be off by months or years. The birth instant (`utcDate`) is now compared directly against the term's UTC instant. Day and Hour pillars are unchanged — they correctly continue to use True Solar Time. Ordinary mid-month charts are unaffected.

- `fix: derive standard offset from the real non-DST offset around the birth instant`
  `getStdOffsetMinutes` used a min(January, July) heuristic that assumed the smaller of the two was the year-round standard. That broke for zones that changed their base offset *permanently* mid-year (a non-DST step) — e.g. Asia/Bangkok's +6:42 → +7:00 switch on 1920-04-01 — making the standard meridian (and therefore every longitude correction in that zone-year) wrong, and spuriously flagging the post-change period as DST. The standard offset is now read per instant from tzdata: the offset at the birth moment, demoted to its lower neighbour only when it is a DST bump (greater than both adjacent offsets). DST is no longer assumed to be 60 minutes, so half-hour DST zones (e.g. Lord Howe Island, +10:30/+11:00) resolve correctly. Zones without DST are byte-identical, so ordinary modern charts are unaffected.

- `fix: revert DST by the real instant amount, not a hardcoded 60 minutes`
  True solar time was computed as `utc + stdOffset + dstCorrection + longitude + EoT` with `dstCorrection = −60` whenever DST was active. But `utc + stdOffset` already reverts DST (it builds the standard wall clock), so the extra term double-counted: every DST-active birth's `tstDate` was an hour early, which could flip the Hour pillar (and the Day pillar near midnight). True solar time is now `standard wall clock + longitude + EoT`, with no second DST subtraction; the displayed DST step is derived from the real offsets at the instant (`stdOffset − birthOffset`), so it is −60 for normal DST, −30 for sub-hour DST (Lord Howe), −120 for double summer time, and 0 when DST is not in effect. Births with DST not in effect (incl. all DST-free zones) are unchanged; DST-active charts move by the previously double-counted amount, which corrects them.

### Changed
- `change: compute solar terms (節氣) from an ephemeris instead of a lookup table + approximation`
  Solar-term instants previously came from a sparse Hong Kong Observatory lookup table (only a handful of 2024 terms) that fell back to an in-repo ±~6 minute iterative `sunApparentLongitude` solver for every other date — two different standards, and minute-level inaccuracy that could flip the Month/Year pillar (and 生肖) for births within a few minutes of a 節氣. `solarTermDate` now computes each term from the astronomy-engine ephemeris (apparent ecliptic longitude of date) via `SearchSunLongitude`, accurate to well under an arcminute for every year, with results cached per (year, longitude). The lookup table, the iterative solver, and the now-unused `sunApparentLongitude`/`jdeToDate` helpers are removed (single source of truth). The UTC-instant comparison frame is unchanged, so only charts for births very close to a 節氣 boundary move — to the more accurate value; ordinary mid-month charts are unaffected.

- `change: birthplace is chosen via search only (removes longitude/timezone mismatch)`
  Birth location is now set exclusively by selecting a result from the place search, which fills timezone, longitude, and latitude together as a consistent set. The manual timezone/longitude/latitude inputs are removed from both the calculator wizard (the "Advanced Location Details" panel) and the member hourly-scoring form (along with its coordinate-override toggle); the derived values are shown read-only for transparency. This makes a longitude/timezone mismatch — e.g. a Thai longitude paired with `America/New_York`, which skewed the longitude correction by hundreds of minutes — unrepresentable at the source. Calculation, the persisted payload shape, and AI-analysis recompute are unchanged, so previously saved charts (including any with a legacy mismatch) still recompute from their stored values.

### Documentation
- `docs: document the midnight (子正) day-boundary convention`
  Recorded that the day pillar changes at local solar midnight (00:00). The contested period is 子時's first half, 23:00–00:00 (子初 / 夜子時): here it stays on the current day (the midnight-rollover rule, 子正換日, commonly called the 早子時 method), so a 23:00–23:59 birth keeps the current day's pillar and Day Master while its hour branch is 子. The alternative school rolls the day at 23:00 (子初換日 / 晚子時 method), giving those births the next day's pillar and a different Day Master; it is a recognised school choice (not a bug) and is intentionally not implemented yet. Added explanatory comments at the convention sites in `src/lib/bazi.ts` (`dayPillar`, `hourBranchIndex`) so the 00:00 boundary is not mistaken for a defect, plus a "Calculation Conventions" note in the README. No calculation logic changed — chart output is byte-identical. A future opt-in day-boundary toggle (default = midnight rollover) is planned as a separate enhancement.

## 2026-04-14

- `feat: rewrite hourly scoring explanations for normal users`
  Reworked the hourly results copy on desktop and mobile so normal users can understand what they are looking at without needing implementation knowledge. Added a dedicated “How to read this” explanation block near the results that now explains what a two-hour slot is, what the hour pillar identity labels mean, how Base fit differs from the broader timing layers, how the Final score is built, how to read positive versus negative values, and how to use the strongest supportive and strongest challenging windows in practice. This changed user-facing interpretation copy only and did not change the scoring formula.

- `fix: simplify extreme-slot explanation text to match the real score model`
  Rewrote the generated strongest-slot explanations so they still describe the same engine behavior but in clearer product language. The strongest-window text now explains Base fit as the slot’s baseline match, describes Da Yun as the current 10-year cycle, clarifies Year/Month/Day as shorter background layers, and explicitly tells users that the score reflects timing support or friction rather than guaranteed outcomes or mystical certainty.

- `feat: rename confusing hourly result labels into clearer user-facing wording`
  Updated visible terminology across the hourly table, mobile cards, and score breakdown strings so the UI feels less like internal debug output. Examples include changing `Base` to `Base fit`, changing compact `Da Yun` score labels to `10-year cycle`, changing `Areas` to `Life areas`, reframing the Ten God column as a user-readable role label, and replacing vague mobile labels with direct wording such as “Most supportive” and “Most challenging.”

- `docs: clarify life-area score order and interpretation in the hourly UI`
  Added explicit explanation that life-area scores always appear in the order `career / wealth / love / health`, including a concrete numeric example so users can decode patterns such as `3 / 0 / 3 / 2` without guessing. The UI now also states that higher numbers indicate relatively more support, lower or negative numbers indicate more pressure, and that these area values are another view of the same timing model rather than a separate hidden prediction system.

## 2026-04-12

- `audit: verify Da Yun hourly-scoring phase against the agreed implementation spec`
  Performed a code-and-test audit of the member-only hourly scoring feature, checking Da Yun reuse, active-cycle selection, timezone-aware `today` handling, score-layer transparency, category modifiers, UI breakdowns, explanation behavior, scope control, and whether `npm test`, `npm run lint`, and `npm run build` were actually passing.

- `fix: replace year-only active Da Yun matching with date-accurate cycle selection`
  Removed the coarse calendar-year lookup in hourly scoring and switched active Da Yun resolution to use the natal chart's existing Da Yun engine data plus the actual cycle start boundary derived from `startYears` and `startMonths`, using the user's local date/time instead of only `yearStart`/`yearEnd`.

- `fix: align active Da Yun interpretation across hourly scoring and AI analysis`
  Updated the analyze route to resolve the current Da Yun through the same date-accurate helper used by hourly scoring, so both feature paths now interpret the active cycle consistently from the same underlying BaZi engine data.

- `feat: add shared BaZi-engine helpers for precise Da Yun boundary resolution`
  Added reusable helpers in the core BaZi engine to project UTC instants into the user's timezone, compute each Da Yun cycle's real start date from the natal chart, and select the active Da Yun pillar for an exact local reference date.

- `fix: clean hourly-scoring UI text and remove mojibake from user-facing strings`
  Repaired corrupted Hourly UI copy, including slot labels, loading text, score separators, Day Master summary formatting, Active Da Yun headings, and strongest-slot breakdown strings so the feature renders cleanly and remains understandable.

- `test: add boundary and timezone regression coverage for active Da Yun selection`
  Added targeted tests proving the active Da Yun changes at the actual first-cycle start boundary rather than at a plain year boundary, and proving the hourly feature's `today` label follows the saved profile timezone rather than UTC around local midnight edges.

- `test: strengthen explanation and UI-string proofs for hourly scoring`
  Extended test coverage so extreme-slot explanations must still include both the short-term hour effect and long-term Da Yun effect after the fixes, and added UI-oriented assertions that hourly-scoring labels and formatted strings remain clean and free of mojibake.

- `chore: re-verify the completed Da Yun hourly-scoring phase`
  Re-ran `npm test`, `npm run lint`, and `npm run build` after the audit fixes; all three commands passed, confirming the phase was brought from incomplete to complete without changing the underlying base hourly scoring behavior.

- `feat: extend hourly scoring with Liu Nian, Liu Yue, and Liu Ri timing layers`
  Added additive current-year, current-month, and current-day influence layers on top of the existing natal base scoring and active Da Yun flow, while preserving the underlying hourly scoring architecture and member/profile behavior.

- `feat: expose transparent layer breakdowns for hourly slot scoring`
  Extended the hourly result shape with `liuNian`, `liuYue`, and `liuRi` summaries plus per-slot `liuNianModifier`, `liuYueModifier`, and `liuRiModifier`, keeping final scores explainable as base + Da Yun + year + month + day.

- `feat: extend hourly category scoring with timing-layer modifiers`
  Added deterministic category-level timing contributions for career, wealth, love, and health so real computed slots now carry both base Ten God effects and additive time-layer category backgrounds.

- `feat: surface year/month/day timing layers in the hourly UI`
  Updated the Hourly scoring interface to show summary cards for Active Da Yun, Liu Nian, Liu Yue, and Liu Ri, and expanded the slot breakdown to display Base, Da Yun, Year, Month, Day, and Final values.

- `fix: correct Da Yun semantic tagging in shared timing-layer helpers`
  Replaced the incorrect internal `liuNian` tag used by the shared Da Yun summary path with an explicit `daYun` semantic tag, without changing intended scoring output.

- `test: strengthen exact pillar proofs for Liu Nian, Liu Yue, and Liu Ri`
  Added structured exact-pillar assertions using stable stem and branch fields instead of fragile combined pillar strings, proving the current year/month/day layers match the engine output for a known local date.

- `test: add end-to-end category composition proof for hourly scoring`
  Added deterministic coverage proving that computed slot category totals equal base category scores plus Da Yun, Liu Nian, Liu Yue, and Liu Ri category modifiers.

- `test: add rendered UI proof for hourly scoring layer cards and breakdown columns`
  Added render-level coverage proving the Hourly results UI shows the timing-layer summary cards, Base/Da Yun/Year/Month/Day/Final columns, and strongest-slot insight cards only for extreme slots.

- `fix: document and verify the symmetric [-6, 6] hourly score clamp`
  Added explicit code rationale for the six-point symmetric user-facing score range and kept regression coverage that verifies computed final scores stay inside that bound.

- `chore: remove unreachable legacy assertions from hourly scoring tests`
  Removed dead assertions after an early return in `hourly-scoring.test.ts`, preserving the stronger structured proof paths and keeping behavior unchanged.

- `feat: redesign hourly scoring into a more editorial reading experience`
  Rebuilt the Hourly interface around a calmer editorial hierarchy with serif-led headings, softer mint and teal tonal layering, more whitespace, and clearer separation between profile context, time layers, slot analysis, and strongest-slot insights.

- `refactor: split hourly presentation into cleaner result sections`
  Moved major Hourly result presentation into dedicated section components so the route and panel logic stay focused on profile loading, editing, and state transitions instead of one large mixed UI surface.

- `fix: reduce repeated dashboard shells across the hourly page`
  Replaced the heaviest repeated card treatments with quieter section surfaces, lighter secondary panels, stronger typography contrast, and more asymmetric spacing to reduce the generic dashboard feel.

- `feat: improve desktop and mobile hourly readability`
  Refined the desktop scoring table, supporting reading guide, timing context cards, and insight panels; improved mobile with prioritized slot summaries, expandable remaining slots, and a clearer visual rhythm on small screens.

- `fix: remove mojibake and normalize user-facing separators`
  Cleaned broken UTF-8 strings and corrupted separators in the Hourly UI and related birthplace search text so labels, score breakdowns, and helper copy render consistently.

- `fix: replace corrupted header glyph and stabilize app-shell text`
  Removed the broken logo glyph in the shared header and replaced it with a stable `H` mark to avoid encoding artifacts in the main app shell.

- `fix: improve mobile top nav visibility for hourly access`
  Added a dedicated portrait-friendly mobile top navigation row so the Hourly feature is reachable without rotating the device, and removed the oversized horizontal overflow pattern from the top menu.

- `feat: add active states to primary navigation on desktop and mobile`
  Introduced route-aware desktop and mobile primary navigation components so the current page is visually obvious across `/`, `/calculator`, `/hourly`, `/learn`, and guide routes.

- `fix: streamline mobile top nav to fit the viewport`
  Removed `Home` from the mobile nav and constrained the mobile menu to a fixed three-column layout so it fits within the viewport without horizontal scrolling.

- `refactor: move hourly scoring route from /calculator/hourly to /hourly`
  Promoted Hourly from a calculator sub-route to its own top-level feature route, updated navigation targets, updated the public page metadata path, and changed sign-in callback URLs to point at `/hourly`.

- `fix: remove the old App Router hourly page route`
  Removed the old `/calculator/hourly` page route from App Router so only `/hourly` remains as the live page path.

- `fix: improve hourly profile editing flow and scroll into edit form`
  Updated the saved-profile edit experience so tapping edit immediately brings the form into view, making the state change obvious on long mobile pages.

- `feat: add cancel support to hourly profile editing`
  Added a cancel action that exits edit mode and restores the last saved profile values instead of leaving partially edited form state visible.

- `fix: harden profile save handling and surface useful API errors`
  Improved `/api/profile` error handling so storage and configuration failures return readable JSON error payloads rather than opaque server failures.

- `fix: tighten Supabase profile upsert behavior`
  Added explicit Supabase merge-duplicate preferences for saved profile upserts to make profile persistence more robust.

- `test: add profile storage failure regression coverage`
  Added route-level coverage proving `/api/profile` returns a useful response when storage is unavailable or not configured.

- `fix: sanitize hourly profile coordinate inputs on mobile`
  Prevented invalid mobile keyboard characters from blocking form submission by sanitizing longitude and latitude inputs before save.

- `fix: lock selected place coordinates unless manually overridden`
  Locked longitude and latitude after a user selects a place from search, reducing accidental coordinate corruption from keyboard edits while preserving an explicit manual override path.

- `feat: add explicit coordinate override controls`
  Added an `Edit coordinates` / `Lock to selected place` control so users can intentionally switch between search-controlled coordinates and manual coordinate entry.

- `fix: preserve saved place-based coordinate lock state while editing`
  Synced coordinate locking behavior with saved profiles, profile editing, and cancel/reset flows so place-derived coordinates remain stable unless intentionally unlocked.

- `feat: add date picker and Today shortcut to hourly scoring`
  Added a selected-date control and `Today` shortcut to the `/hourly` page so users can inspect a specific day without changing any underlying scoring rules.

- `feat: extend /api/hourly-scoring to accept a requested date`
  Added support for `?date=YYYY-MM-DD` on `/api/hourly-scoring`, parsing the requested day in the saved profile timezone and passing that reference date into the existing scoring engine.

- `test: add hourly route coverage for selected-date scoring`
  Added route coverage proving the hourly scoring endpoint respects a requested date and returns the correct `currentDateLabel`.

- `fix: support selected-date scoring in both NextRequest and plain Request tests`
  Adjusted the hourly scoring route internals so tests using plain `Request` objects still work while production continues using `NextRequest`.

- `chore: keep hourly work green with repeated validation`
  Re-ran `npm run lint`, `npm test`, and `npm run build` throughout the redesign, route move, profile fixes, date-picker work, and navigation updates to keep the full stack stable.
