# Changelog

## 2026-04-12

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
