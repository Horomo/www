import test from 'node:test';
import assert from 'node:assert/strict';

import oracleFixtures from './fixtures/bazi-oracle-fixtures.json';
import * as bazi from '../src/lib/bazi';

type PillarField = 'yearPillar' | 'monthPillar' | 'dayPillar' | 'hourPillar';

type OracleFixture = {
  id: string;
  description: string;
  input: {
    date: string;
    time: string | null;
    timezone: string;
    longitude: number;
    calculationMode: 'male' | 'female';
  };
  expected: Record<PillarField, string | null>;
  oracle: {
    sourceKind: string;
    referenceUrl: string | null;
    sourceNote: string;
  };
  status: {
    resolvedFields: PillarField[];
    unresolvedFields: PillarField[];
  };
};

function pillarStr(pillar: bazi.Pillar | null): string | null {
  return pillar ? `${pillar.stem.zh}${pillar.branch.zh}` : null;
}

const fixtures = oracleFixtures as OracleFixture[];

for (const fixture of fixtures) {
  const resolved = fixture.status.resolvedFields;

  if (resolved.length === 0) {
    test(`oracle fixture pending / ${fixture.id}`, { skip: fixture.oracle.sourceNote }, () => {});
    continue;
  }

  test(`oracle truth / ${fixture.id}`, () => {
    const result = bazi.computeBazi(
      fixture.input.date,
      fixture.input.time,
      fixture.input.timezone,
      fixture.input.longitude,
      fixture.input.calculationMode,
    );

    const actual: Record<PillarField, string | null> = {
      yearPillar: pillarStr(result.pillars.year),
      monthPillar: pillarStr(result.pillars.month),
      dayPillar: pillarStr(result.pillars.day),
      hourPillar: pillarStr(result.pillars.hour),
    };

    for (const field of resolved) {
      assert.equal(
        actual[field],
        fixture.expected[field],
        [
          `${fixture.id} mismatch for ${field}`,
          `input=${fixture.input.date} ${fixture.input.time ?? '(unknown time)'} ${fixture.input.timezone}`,
          `expected=${fixture.expected[field]}`,
          `actual=${actual[field]}`,
          `source=${fixture.oracle.referenceUrl ?? '(missing reference url)'}`,
          `note=${fixture.oracle.sourceNote}`,
        ].join('\n'),
      );
    }
  });
}

test('oracle truth / consecutive oracle days advance by one sexagenary step', () => {
  const first = fixtures.find((fixture) => fixture.id === 'oracle-day-calendar-2000-01-07');
  const second = fixtures.find((fixture) => fixture.id === 'oracle-day-calendar-2000-01-08');

  assert.ok(first, 'Expected 2000-01-07 oracle fixture to exist');
  assert.ok(second, 'Expected 2000-01-08 oracle fixture to exist');

  const firstResult = bazi.computeBazi(
    first.input.date,
    first.input.time,
    first.input.timezone,
    first.input.longitude,
    first.input.calculationMode,
  );
  const secondResult = bazi.computeBazi(
    second.input.date,
    second.input.time,
    second.input.timezone,
    second.input.longitude,
    second.input.calculationMode,
  );

  const firstDay = bazi.dayPillar(firstResult.tstDate);
  const secondDay = bazi.dayPillar(secondResult.tstDate);

  assert.equal(first.expected.dayPillar, '甲子');
  assert.equal(second.expected.dayPillar, '乙丑');
  assert.equal(
    secondDay.cycleIdx,
    (firstDay.cycleIdx + 1) % 60,
    [
      'Expected consecutive civil days to advance by one step in the sexagenary cycle',
      `first=${first.expected.dayPillar} idx=${firstDay.cycleIdx}`,
      `second=${second.expected.dayPillar} idx=${secondDay.cycleIdx}`,
    ].join('\n'),
  );
});
