import test from 'node:test';
import assert from 'node:assert/strict';
import * as Astronomy from 'astronomy-engine';

import * as bazi from '../src/lib/bazi';

// ─────────────────────────────────────────────────────────────────────────────
// Fix B — solar terms come from the astronomy-engine ephemeris (one source for
// every year), replacing the sparse HKO lookup table + ±~6 min iterative solver.
//
// Independent (external) accuracy against the Hong Kong Observatory is anchored
// by solar-term-oracle.test.ts (2024 terms, 1-minute tolerance). The checks here
// instead prove the search CONVERGES correctly and is placed in the right year
// for ALL years — including ones the old table lacked. (The SunPosition check
// below confirms convergence/usage, not external accuracy: SearchSunLongitude
// converges on SunPosition internally, so HKO remains the accuracy anchor.)
// ─────────────────────────────────────────────────────────────────────────────

// The 12 "jie" longitudes that drive month/year pillars.
const JIE_LONS = [315, 345, 15, 45, 75, 105, 135, 165, 195, 225, 255, 285];
const YEARS = [1900, 1950, 1965, 1984, 1990, 2000, 2012, 2024, 2030, 2100];

const angleDiff = (a: number, b: number) => {
  const d = ((a - b) % 360 + 540) % 360 - 180;
  return Math.abs(d);
};

// ── Convergence: the Sun is actually at the target longitude at the instant ──
// Proves the search converged (no null, no wrong crossing, no units error) so the
// apparent ecliptic longitude OF DATE at the returned moment equals the requested
// term longitude to sub-arcminute. External accuracy is anchored separately by
// the HKO oracle test; this is a usage/convergence check, not an independent one.
test('solar term / returned instant has the Sun at the target ecliptic longitude (every year)', () => {
  for (const year of YEARS) {
    for (const lon of JIE_LONS) {
      const t = bazi.solarTermDate(year, lon);
      const elon = Astronomy.SunPosition(t).elon; // apparent ecliptic longitude of date
      assert.ok(
        angleDiff(elon, lon) < 1 / 60, // < 1 arcminute
        `${year} term ${lon}°: Sun at ${elon.toFixed(5)}° (Δ=${(angleDiff(elon, lon) * 60).toFixed(3)} arcmin) at ${t.toISOString()}`,
      );
    }
  }
});

// ── Correct calendar placement: search-from-Jan-1 returns the in-year occurrence ──
test('solar term / each term lands in its expected month of the civil year', () => {
  for (const year of YEARS) {
    const liChun = bazi.solarTermDate(year, 315); // 立春 — early February
    assert.equal(liChun.getUTCFullYear(), year, `立春 ${year} must fall in ${year}`);
    assert.ok(liChun.getUTCMonth() <= 1, `立春 ${year} must be Jan/Feb, got month ${liChun.getUTCMonth()}`);

    const daXue = bazi.solarTermDate(year, 255); // 大雪 — December
    assert.equal(daXue.getUTCFullYear(), year, `大雪 ${year} must fall in ${year}`);
    assert.equal(daXue.getUTCMonth(), 11, `大雪 ${year} must be December`);

    const xiaoHan = bazi.solarTermDate(year, 285); // 小寒 — January of `year`
    assert.equal(xiaoHan.getUTCMonth(), 0, `小寒 ${year} must be January`);
  }
});

// ── 立春 / Year Pillar boundary resolves on the ephemeris instant, every year ──
test('solar term / year pillar flips exactly at 立春 across many years (no table edge)', () => {
  for (const year of [1950, 1984, 1990, 2000, 2024, 2030]) {
    const liChun = bazi.solarTermDate(year, 315).getTime();
    const before = bazi.yearPillar(new Date(liChun - 60_000)); // 1 min before
    const after = bazi.yearPillar(new Date(liChun + 60_000));  // 1 min after
    // The branch must advance by exactly one (the new Bazi year begins at 立春).
    assert.equal((after.branchIdx - before.branchIdx + 12) % 12, 1, `year branch must advance at 立春 ${year}`);
    assert.equal((after.stemIdx - before.stemIdx + 10) % 10, 1, `year stem must advance at 立春 ${year}`);
  }
});

// ── Wide range never throws (no year-edge like the old table) ──
test('solar term / computes without error across a wide year range', () => {
  for (const year of [1850, 1900, 2099, 2100]) {
    assert.doesNotThrow(() => bazi.solarTermDate(year, 315));
    assert.doesNotThrow(() => bazi.solarTermDate(year, 255));
  }
});

// ── Determinism / cache returns a stable instant ──
test('solar term / repeated lookups return the same instant', () => {
  const a = bazi.solarTermDate(1987, 75);
  const b = bazi.solarTermDate(1987, 75);
  assert.equal(a.getTime(), b.getTime());
});
