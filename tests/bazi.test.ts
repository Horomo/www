import test from 'node:test';
import assert from 'node:assert/strict';

import * as bazi from '../src/lib/bazi';

function formatInTimeZone(date: Date, timeZone: string): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(date).replace(',', '');
}

function isoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function formatPseudoUtc(date: Date): string {
  const pad = (value: number) => String(value).padStart(2, '0');
  return `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())} ${pad(date.getUTCHours())}:${pad(date.getUTCMinutes())}`;
}

test('timezone conversion round-trips the entered local clock time for a normal case', () => {
  const result = bazi.computeBazi('1990-06-15', '08:30', 'Asia/Bangkok', 100.52, 'male');

  assert.equal(result.utcDate.toISOString(), '1990-06-15T01:30:00.000Z');
  assert.equal(formatInTimeZone(result.utcDate, 'Asia/Bangkok'), '1990-06-15 08:30');
  assert.equal(formatPseudoUtc(result.displayDate), '1990-06-15 08:30');
  assert.equal(result.displayTzLabel, 'UTC+7:00');
  assert.equal(result.pillars.hour?.stem.zh + result.pillars.hour?.branch.zh, '壬辰');
});

test('DST births keep display time separate from the internal standard-time surrogate', () => {
  const result = bazi.computeBazi('1990-06-15', '12:00', 'America/New_York', -74.006, 'female');

  assert.equal(result.utcDate.toISOString(), '1990-06-15T16:00:00.000Z');
  assert.equal(formatInTimeZone(result.utcDate, 'America/New_York'), '1990-06-15 12:00');
  assert.equal(formatPseudoUtc(result.displayDate), '1990-06-15 12:00');
  assert.equal(result.displayTzLabel, 'UTC−4:00');
  assert.equal(result.tzLabel, 'UTC−5:00');
  assert.equal(result.localDate.toISOString(), '1990-06-15T11:00:00.000Z');
});

test('invalid IANA timezones are rejected instead of falling back to UTC', () => {
  assert.throws(
    () => bazi.computeBazi('1990-06-15', '08:30', 'Not/AZone', 100.52, 'male'),
    /Invalid IANA timezone/,
  );
});

test('nonexistent spring-forward local times are rejected', () => {
  assert.throws(
    () => bazi.clockTimeToUtc(2024, 3, 10, 2, 30, 'America/New_York'),
    /does not exist/i,
  );
});

test('ambiguous fall-back local times are rejected', () => {
  assert.throws(
    () => bazi.clockTimeToUtc(2024, 11, 3, 1, 30, 'America/New_York'),
    /ambiguous/i,
  );
});

test('unknown-time fallback preserves the civil birth date in western timezones', () => {
  const losAngeles = bazi.computeBazi('2024-02-04', null, 'America/Los_Angeles', -118.2437, 'male');
  const honolulu = bazi.computeBazi('1990-01-01', null, 'Pacific/Honolulu', -157.8583, 'male');

  assert.equal(isoDate(losAngeles.displayDate), '2024-02-04');
  assert.equal(losAngeles.pillars.year.stem.zh + losAngeles.pillars.year.branch.zh, '甲辰');
  assert.equal(losAngeles.pillars.month.stem.zh + losAngeles.pillars.month.branch.zh, '丙寅');
  assert.equal(losAngeles.pillars.day.stem.zh + losAngeles.pillars.day.branch.zh, '戊戌');

  assert.equal(isoDate(honolulu.displayDate), '1990-01-01');
  assert.equal(honolulu.pillars.year.stem.zh + honolulu.pillars.year.branch.zh, '己巳');
  assert.equal(honolulu.pillars.month.stem.zh + honolulu.pillars.month.branch.zh, '丁丑');
  assert.equal(honolulu.pillars.day.stem.zh + honolulu.pillars.day.branch.zh, '丙寅');
  assert.deepEqual(
    honolulu.daYun && [honolulu.daYun.pillars[0].yearStart, honolulu.daYun.pillars[0].yearEnd],
    [1998, 2007],
  );
});

test('子 hidden stem and main qi map to 癸', () => {
  assert.deepEqual(bazi.BRANCH_HIDDEN_STEMS[0], [9]);
  assert.equal(bazi.getBranchMainStem(0), 9);
});

test('derived chart values use the corrected 子 hidden stem', () => {
  const result = bazi.computeBazi('1990-12-15', '12:00', 'Asia/Bangkok', 100.52, 'male');
  const chartData = bazi.computeChartData(result.pillars, result.pillars.day.stemIdx, result.unknownTime);

  assert.equal(result.pillars.month.branch.zh, '子');
  assert.equal(bazi.tenGod(result.pillars.day.stemIdx, bazi.getBranchMainStem(result.pillars.month.branchIdx)).zh, '正印');
  assert.equal(chartData.tenGodsCount['正印'], 1);
  assert.equal(chartData.tenGodsCount['偏印'] ?? 0, 0);
});

test('year pillar flips at the Li Chun boundary after true-solar-time correction', () => {
  const before = bazi.computeBazi('2024-02-04', '08:35', 'UTC', 0, 'male');
  const after = bazi.computeBazi('2024-02-04', '08:36', 'UTC', 0, 'male');

  assert.equal(before.pillars.year.stem.zh + before.pillars.year.branch.zh, '癸卯');
  assert.equal(before.pillars.month.stem.zh + before.pillars.month.branch.zh, '乙丑');
  assert.equal(after.pillars.year.stem.zh + after.pillars.year.branch.zh, '甲辰');
  assert.equal(after.pillars.month.stem.zh + after.pillars.month.branch.zh, '丙寅');
});

test('month pillar flips at the Jing Zhe boundary after true-solar-time correction', () => {
  const before = bazi.computeBazi('2024-03-05', '02:27', 'UTC', 0, 'male');
  const after = bazi.computeBazi('2024-03-05', '02:28', 'UTC', 0, 'male');

  assert.equal(before.pillars.month.stem.zh + before.pillars.month.branch.zh, '丙寅');
  assert.equal(after.pillars.month.stem.zh + after.pillars.month.branch.zh, '丁卯');
  assert.equal(before.pillars.year.stem.zh + before.pillars.year.branch.zh, '甲辰');
  assert.equal(after.pillars.year.stem.zh + after.pillars.year.branch.zh, '甲辰');
});

test('local display date survives UTC year rollover in far-east timezones', () => {
  const result = bazi.computeBazi('2024-01-01', '00:30', 'Pacific/Kiritimati', -157.4, 'male');

  assert.equal(result.utcDate.toISOString(), '2023-12-31T10:30:00.000Z');
  assert.equal(formatPseudoUtc(result.displayDate), '2024-01-01 00:30');
  assert.equal(result.displayTzLabel, 'UTC+14:00');
  assert.equal(isoDate(result.displayDate), '2024-01-01');
});

test('local display date survives UTC month rollover in eastern timezones', () => {
  const result = bazi.computeBazi('2024-03-01', '00:30', 'Asia/Tokyo', 139.6917, 'male');

  assert.equal(result.utcDate.toISOString(), '2024-02-29T15:30:00.000Z');
  assert.equal(formatPseudoUtc(result.displayDate), '2024-03-01 00:30');
  assert.equal(result.displayTzLabel, 'UTC+9:00');
  assert.equal(isoDate(result.displayDate), '2024-03-01');
});
