import test from 'node:test';
import assert from 'node:assert/strict';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

import { UsefulElementCard } from '../src/components/BaziResultView';
import { computeBazi, computeUsefulElement, EL_LABEL } from '../src/lib/bazi';

// ─────────────────────────────────────────────────────────────────────────────
// 用神 Result-page card. The card is a pure renderer of the engine's
// UsefulElementResult — it must display every classification (including the
// not-asserted ones) and the full per-component breakdown, and must never
// recompute the result itself.
// ─────────────────────────────────────────────────────────────────────────────

const renderCard = (date: string, time: string | null) => {
  const r = computeBazi(date, time, 'Asia/Bangkok', 100.52, 'male');
  const useful = computeUsefulElement(r.pillars, r.pillars.day.stemIdx, !time);
  return { useful, html: renderToStaticMarkup(createElement(UsefulElementCard, { useful })) };
};

test('useful-ui / strong chart shows 身強, the 用神, 喜/忌, and the full breakdown', () => {
  const { useful, html } = renderCard('1950-01-05', '02:00');
  assert.equal(useful.classification, 'strong');
  assert.match(html, /身強/);
  assert.match(html, /用神/);
  assert.match(html, /喜神/);
  assert.match(html, /忌神/);
  assert.ok(html.includes(EL_LABEL[useful.usefulElement as string].en), 'asserted useful element is shown');
  // Every breakdown component is rendered in the table, with its stem and side.
  for (const c of useful.breakdown) {
    assert.ok(html.includes(c.position), `breakdown row "${c.position}" is rendered`);
    assert.ok(html.includes(c.stem), `breakdown stem "${c.stem}" is rendered`);
  }
  // Exactly one side cell per breakdown component → all rows present, none dropped.
  const sideCells = html.match(/support 扶|drain 抑/g) ?? [];
  assert.equal(sideCells.length, useful.breakdown.length, 'one side cell per breakdown row');
  // The engine's reasoning string is surfaced verbatim.
  assert.ok(html.includes(useful.reasoning), 'engine reasoning is shown');
});

test('useful-ui / weak chart shows 身弱 and a supporting useful element', () => {
  const { useful, html } = renderCard('1950-03-05', '02:00');
  assert.equal(useful.classification, 'weak');
  assert.match(html, /身弱/);
  assert.ok(html.includes(EL_LABEL[useful.usefulElement as string].en));
});

test('useful-ui / borderline chart shows "Not asserted", not blank or a crash', () => {
  const { useful, html } = renderCard('1950-01-05', '22:00');
  assert.equal(useful.classification, 'borderline');
  assert.equal(useful.usefulElement, null);
  assert.match(html, /中和/);
  assert.match(html, /Not asserted/);
});

test('useful-ui / special_structure chart shows Special and no asserted element', () => {
  const { useful, html } = renderCard('1950-03-15', '22:00');
  assert.equal(useful.classification, 'special_structure');
  assert.match(html, /Special/);
  assert.match(html, /Not asserted/);
});

test('useful-ui / the card is a pure renderer of its prop (no recompute)', () => {
  const r = computeBazi('1990-06-15', '08:30', 'Asia/Bangkok', 100.52, 'male');
  const useful = computeUsefulElement(r.pillars, r.pillars.day.stemIdx, false);
  // Sentinel values injected into the prop must appear verbatim — proving the
  // card renders what it is given rather than recomputing anything.
  const html = renderToStaticMarkup(createElement(UsefulElementCard, {
    useful: { ...useful, reasoning: 'SENTINEL-REASONING-9F3X', supportScore: 987.654 },
  }));
  assert.match(html, /SENTINEL-REASONING-9F3X/);
  assert.ok(html.includes('987.654'), 'displayed support score comes from the prop, not a recompute');
});

test('useful-ui / the month-command (月令) rows are tagged in the breakdown', () => {
  const { useful, html } = renderCard('1950-01-05', '02:00');
  assert.ok(useful.breakdown.some((c) => c.monthCommand), 'engine marks month-command rows');
  assert.match(html, /月令/);
});
