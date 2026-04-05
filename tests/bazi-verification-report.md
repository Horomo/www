# BaZi Verification Report

## Current Day Pillar Assumptions

- `dayPillar()` anchors the 60-day cycle to `REF_JD = 2451545` and `REF_INDEX = 55`, which means the reference instant is Julian Day 2451545 with cycle index 55 (`己未`).
- `dateToJD()` includes the UTC hour and minute as a fractional day, but `dayPillar()` immediately applies `Math.floor()` to both the computed JD and the reference JD. In practice this treats the day-cycle boundary as a whole-number Julian day boundary instead of a locally verified sexagenary-day turnover rule.
- `computeBazi()` feeds `dayPillar()` the already-corrected `tstDate`, so any day-cycle mismatch propagates directly into the day pillar and then into the hour stem.

## Current Solar Term Assumptions

- `solarTermDate(year, solarLon)` uses a hard-coded vernal-equinox seed: `2451623.80984 + 365.242189623 * (refYear - 2000)`.
- The initial estimate assumes a constant mean rate of `365.242189623 / 360` days per degree of solar longitude.
- The solver performs exactly three correction iterations using `sunApparentLongitude(jde)` and returns a UTC `Date`.
- `getBaziYear()` uses `solarTermDate(year, 315)` as the Li Chun cutoff.
- `getMonthBranchIndex()` uses the 12 jie terms from `getMonthTermDates(year)` as branch boundaries.

## Where Exact Values Currently Come From

- Solar-term positions come from the in-repo `sunApparentLongitude()` approximation and the hard-coded tropical-year constants in `solarTermDate()`.
- Day-cycle values come from the in-repo JD conversion plus the fixed `REF_JD` / `REF_INDEX` pair.
- The new oracle fixtures are external to the engine:
  - `tests/fixtures/bazi-oracle-fixtures.json` uses published daily Chinese-calendar pages from Fourpillars.pro for resolved year/month/day checks and explicitly records unresolved hour-oracle gaps.
  - `tests/fixtures/solar-term-oracles.json` uses Hong Kong Observatory timestamps, which the HKO page states are based on HM Nautical Almanac Office and US Naval Observatory data and are published in Hong Kong Time.

## New and Updated Test Files

- Added `tests/bazi-snapshot.test.ts` to preserve current engine behavior as a snapshot suite.
- Added `tests/bazi-oracle.test.ts` for oracle-backed pillar verification.
- Added `tests/solar-term-oracle.test.ts` for published solar-term timestamps and minute-level boundary flips.
- Added `tests/fixtures/bazi-oracle-fixtures.json` for external pillar truth data.
- Added `tests/fixtures/solar-term-oracles.json` for external solar-term truth data.
- Replaced `tests/bazi-golden.test.ts` with `tests/bazi-snapshot.test.ts` so the engine snapshot is no longer presented as oracle truth.

## Unresolved Oracle Dependencies

- Full four-pillar oracle cases for timezone-aware datetimes are still missing, especially authoritative hour-pillar outputs with explicit timezone and true-solar-time handling.
- The audit examples from Bangkok still need a source that publishes all four pillars, not just daily year/month/day data.
- Additional authoritative daily sexagenary references would strengthen the day-pillar verdict beyond the two adjacent calendar dates now captured.

## Recommendation

- Fix the day pillar logic first.
- The current oracle fixtures already show a direct contradiction on consecutive published day-pillars (`2000-01-07` and `2000-01-08`), while the solar-term discrepancies are on the order of several minutes and are now isolated with exact timestamp tests.
- Once the day anchor is corrected, rerun the solar-term oracle suite to see whether any remaining month/year boundary mismatches still justify a second production change.
