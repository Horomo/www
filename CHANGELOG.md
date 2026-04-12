# Changelog

## 2026-04-12

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
