import test from 'node:test';
import assert from 'node:assert/strict';

import termFixtures from './fixtures/solar-term-oracles.json';
import * as bazi from '../src/lib/bazi';

type SolarTermFixture = {
  id: string;
  termName: string;
  chineseName: string;
  year: number;
  solarLongitude: number;
  oracleUtc: string;
  oracleLocalLabel: string;
  referenceUrl: string;
  sourceNote: string;
};

const fixtures = termFixtures as SolarTermFixture[];
const ONE_MINUTE_MS = 60_000;

function pillarString(pillar: { stemIdx: number; branchIdx: number }): string {
  return `${bazi.STEMS[pillar.stemIdx].zh}${bazi.BRANCHES[pillar.branchIdx].zh}`;
}

function expectUtcMinuteMatch(actual: Date, expectedIso: string, context: string) {
  const expected = new Date(expectedIso);
  const deltaMs = Math.abs(actual.getTime() - expected.getTime());
  assert.ok(
    deltaMs < ONE_MINUTE_MS,
    [
      `${context} is outside the 1-minute oracle tolerance`,
      `expected=${expected.toISOString()}`,
      `actual=${actual.toISOString()}`,
      `delta_ms=${deltaMs}`,
    ].join('\n'),
  );
}

test('solar term oracle / exact timestamps stay within 1 minute of published values', () => {
  for (const fixture of fixtures) {
    const actual = bazi.solarTermDate(fixture.year, fixture.solarLongitude);
    expectUtcMinuteMatch(
      actual,
      fixture.oracleUtc,
      `${fixture.termName} ${fixture.year} (${fixture.chineseName})`,
    );
  }
});

test('solar term oracle / Li Chun boundary flips year and month pillars at the published minute', () => {
  const fixture = fixtures.find((item) => item.id === '2024-li-chun');
  assert.ok(fixture, 'Li Chun fixture must exist');

  const boundary = new Date(fixture.oracleUtc);
  const before = new Date(boundary.getTime() - ONE_MINUTE_MS);
  const after = new Date(boundary.getTime() + ONE_MINUTE_MS);

  assert.equal(
    pillarString(bazi.yearPillar(before)),
    '癸卯',
    `Expected the minute before ${fixture.oracleLocalLabel} to remain in 癸卯 year`,
  );
  assert.equal(
    pillarString(bazi.monthPillar(before, bazi.yearPillar(before).stemIdx)),
    '乙丑',
    `Expected the minute before ${fixture.oracleLocalLabel} to remain in 乙丑 month`,
  );
  assert.equal(
    pillarString(bazi.yearPillar(after)),
    '甲辰',
    `Expected the minute after ${fixture.oracleLocalLabel} to flip to 甲辰 year`,
  );
  assert.equal(
    pillarString(bazi.monthPillar(after, bazi.yearPillar(after).stemIdx)),
    '丙寅',
    `Expected the minute after ${fixture.oracleLocalLabel} to flip to 丙寅 month`,
  );
});

for (const target of [
  { id: '2024-jing-zhe', before: '丙寅', after: '丁卯' },
  { id: '2024-qing-ming', before: '丁卯', after: '戊辰' },
  { id: '2024-li-xia', before: '戊辰', after: '己巳' },
]) {
  test(`solar term oracle / ${target.id} flips the month pillar at the published minute`, () => {
    const fixture = fixtures.find((item) => item.id === target.id);
    assert.ok(fixture, `${target.id} fixture must exist`);

    const boundary = new Date(fixture.oracleUtc);
    const before = new Date(boundary.getTime() - ONE_MINUTE_MS);
    const after = new Date(boundary.getTime() + ONE_MINUTE_MS);
    const beforeYearStem = bazi.yearPillar(before).stemIdx;
    const afterYearStem = bazi.yearPillar(after).stemIdx;

    assert.equal(
      pillarString(bazi.monthPillar(before, beforeYearStem)),
      target.before,
      `Expected the minute before ${fixture.oracleLocalLabel} to remain in ${target.before}`,
    );
    assert.equal(
      pillarString(bazi.monthPillar(after, afterYearStem)),
      target.after,
      `Expected the minute after ${fixture.oracleLocalLabel} to flip to ${target.after}`,
    );
  });
}
