// ═══════════════════════════════════════════════════════════
//  BAZI CALCULATION ENGINE — TypeScript port
// ═══════════════════════════════════════════════════════════

import * as Astronomy from 'astronomy-engine';

import type { CalculationGenderMode } from '@/lib/gender';

// ── Types ──────────────────────────────────────────────────
export interface Stem {
  zh: string;
  pinyin: string;
  element: string;
  yin: boolean;
}

export interface Branch {
  zh: string;
  pinyin: string;
  element: string;
  yin: boolean;
  animal: string;
}

export interface Pillar {
  stem: Stem;
  branch: Branch;
  stemIdx: number;
  branchIdx: number;
}

export interface DaYunPillar {
  cycleIdx: number;
  stemIdx: number;
  branchIdx: number;
  stem: Stem;
  branch: Branch;
  ageStart: number;
  ageEnd: number;
  yearStart: number;
  yearEnd: number;
}

export interface DaYun {
  forward: boolean;
  calculationMode: CalculationGenderMode;
  ruleNote: string;
  startYears: number;
  startMonths: number;
  jie: { name: string; date: Date };
  pillars: DaYunPillar[];
}

export interface TSTInfo {
  dstApplied: boolean;
  dstCorrectionMin: number;
  lonCorrectionMin: number;
  eotMin: number;
  totalCorrectionMin: number;
  dayChanged: boolean;
  dayChangedDir: 'prev' | 'next' | null;
}

export interface BaziResult {
  utcDate: Date;
  localDate: Date;
  displayDate: Date;
  tstDate: Date;
  tzLabel: string;
  displayTzLabel: string;
  stdOffsetMin: number;
  tst: TSTInfo | null;
  daYun: DaYun | null;
  unknownTime: boolean;
  pillars: {
    hour: Pillar | null;
    day: Pillar;
    month: Pillar;
    year: Pillar;
  };
}

// ── Heavenly Stems (天干) ──────────────────────────────────
export const STEMS: Stem[] = [
  { zh: '甲', pinyin: 'Jiǎ',  element: 'wood',  yin: false },
  { zh: '乙', pinyin: 'Yǐ',   element: 'wood',  yin: true  },
  { zh: '丙', pinyin: 'Bǐng', element: 'fire',  yin: false },
  { zh: '丁', pinyin: 'Dīng', element: 'fire',  yin: true  },
  { zh: '戊', pinyin: 'Wù',   element: 'earth', yin: false },
  { zh: '己', pinyin: 'Jǐ',   element: 'earth', yin: true  },
  { zh: '庚', pinyin: 'Gēng', element: 'metal', yin: false },
  { zh: '辛', pinyin: 'Xīn',  element: 'metal', yin: true  },
  { zh: '壬', pinyin: 'Rén',  element: 'water', yin: false },
  { zh: '癸', pinyin: 'Guǐ',  element: 'water', yin: true  },
];

// ── Earthly Branches (地支) ────────────────────────────────
export const BRANCHES: Branch[] = [
  { zh: '子', pinyin: 'Zǐ',   element: 'water', yin: false, animal: 'Rat'     },
  { zh: '丑', pinyin: 'Chǒu', element: 'earth', yin: true,  animal: 'Ox'      },
  { zh: '寅', pinyin: 'Yín',  element: 'wood',  yin: false, animal: 'Tiger'   },
  { zh: '卯', pinyin: 'Mǎo',  element: 'wood',  yin: true,  animal: 'Rabbit'  },
  { zh: '辰', pinyin: 'Chén', element: 'earth', yin: false, animal: 'Dragon'  },
  { zh: '巳', pinyin: 'Sì',   element: 'fire',  yin: true,  animal: 'Snake'   },
  { zh: '午', pinyin: 'Wǔ',   element: 'fire',  yin: false, animal: 'Horse'   },
  { zh: '未', pinyin: 'Wèi',  element: 'earth', yin: true,  animal: 'Goat'    },
  { zh: '申', pinyin: 'Shēn', element: 'metal', yin: false, animal: 'Monkey'  },
  { zh: '酉', pinyin: 'Yǒu',  element: 'metal', yin: true,  animal: 'Rooster' },
  { zh: '戌', pinyin: 'Xū',   element: 'earth', yin: false, animal: 'Dog'     },
  { zh: '亥', pinyin: 'Hài',  element: 'water', yin: true,  animal: 'Pig'     },
];

// All hidden stems per branch (main qi first, then mid, then residual)
export const BRANCH_HIDDEN_STEMS: number[][] = [
  [9],           // 子(0): 癸
  [5, 9, 7],     // 丑(1): 己, 癸, 辛  — canonical order: main(己), mid(癸), residual(辛)
  [0, 2, 4],     // 寅(2): 甲, 丙, 戊
  [1],           // 卯(3): 乙
  [4, 1, 9],     // 辰(4): 戊, 乙, 癸
  [2, 6, 4],     // 巳(5): 丙, 庚, 戊
  [3, 5],        // 午(6): 丁, 己
  [5, 3, 1],     // 未(7): 己, 丁, 乙
  [6, 8, 4],     // 申(8): 庚, 壬, 戊
  [7],           // 酉(9): 辛
  [4, 7, 3],     // 戌(10): 戊, 辛, 丁
  [8, 0],        // 亥(11): 壬, 甲
];

// ── Element Relations ──────────────────────────────────────
export const ELEMENTS = ['wood', 'fire', 'earth', 'metal', 'water'];
export const ELEM_IDX: Record<string, number> = { wood: 0, fire: 1, earth: 2, metal: 3, water: 4 };

export function generates(a: string): string {
  return ELEMENTS[(ELEM_IDX[a] + 1) % 5];
}
export function controls(a: string): string {
  return ELEMENTS[(ELEM_IDX[a] + 2) % 5];
}
export function generatedBy(a: string): string {
  return ELEMENTS[(ELEM_IDX[a] + 4) % 5];
}
export function controlledBy(a: string): string {
  return ELEMENTS[(ELEM_IDX[a] + 3) % 5];
}

// ── Ten Gods (十神) ────────────────────────────────────────
export interface TenGod {
  zh: string;
  en: string;
  pinyin: string;
}

export function tenGod(dmStem: number, otherStem: number): TenGod {
  const dmEl  = STEMS[dmStem].element;
  const otEl  = STEMS[otherStem].element;
  const dmYin = STEMS[dmStem].yin;
  const otYin = STEMS[otherStem].yin;
  const samePolarity = dmYin === otYin;

  if (dmEl === otEl) {
    return samePolarity
      ? { zh: '比肩', en: 'Rob Wealth',       pinyin: 'Bǐ Jiān'    }
      : { zh: '劫財', en: 'Competitor',        pinyin: 'Jié Cái'   };
  }
  if (generates(dmEl) === otEl) {
    return samePolarity
      ? { zh: '食神', en: 'Eating God',        pinyin: 'Shí Shén'  }
      : { zh: '傷官', en: 'Hurting Officer',   pinyin: 'Shāng Guān'};
  }
  if (controls(dmEl) === otEl) {
    return samePolarity
      ? { zh: '偏財', en: 'Indirect Wealth',   pinyin: 'Piān Cái'  }
      : { zh: '正財', en: 'Direct Wealth',     pinyin: 'Zhèng Cái' };
  }
  if (controlledBy(dmEl) === otEl) {
    return samePolarity
      ? { zh: '偏官', en: '7 Killings',        pinyin: 'Piān Guān' }
      : { zh: '正官', en: 'Direct Officer',    pinyin: 'Zhèng Guān'};
  }
  if (generatedBy(dmEl) === otEl) {
    return samePolarity
      ? { zh: '偏印', en: 'Indirect Resource', pinyin: 'Piān Yìn'  }
      : { zh: '正印', en: 'Direct Resource',   pinyin: 'Zhèng Yìn' };
  }
  return { zh: '—', en: '—', pinyin: '—' };
}

// ── Solar Term Calculations ────────────────────────────────

// Solar-term instants are fixed for a given (year, longitude), so memoizing
// avoids recomputing the same term across the ~50 lookups a single chart makes
// (12 month terms + Li Chun + three years of Da Yun jie). We cache the epoch
// milliseconds (a primitive) and hand out a fresh Date per call, so a caller
// mutating the returned Date can never corrupt the cache.
const solarTermCache = new Map<string, number>();

/** Convert a JavaScript Date to Julian Day Number (JD). */
export function dateToJD(date: Date): number {
  let y = date.getUTCFullYear();
  let m = date.getUTCMonth() + 1;
  const d = date.getUTCDate() + (date.getUTCHours() + date.getUTCMinutes() / 60) / 24;
  if (m <= 2) { y -= 1; m += 12; }
  const A = Math.floor(y / 100);
  const B = 2 - A + Math.floor(A / 4);
  return Math.floor(365.25 * (y + 4716)) + Math.floor(30.6001 * (m + 1)) + d + B - 1524.5;
}

/**
 * UTC instant when the Sun's apparent ecliptic longitude (of date) reaches
 * `solarLon` degrees during civil year `year`.
 *
 * Each ecliptic longitude occurs exactly once per tropical year, so searching
 * forward from 00:00 UTC on 1 January of `year` returns the single occurrence
 * that falls within that civil year. This reproduces the calendar placement the
 * pillar engine relies on: e.g. Li Chun (315°) in early February of `year`, and
 * 大雪 (255°) in December of `year`.
 *
 * Backed by astronomy-engine's SearchSunLongitude, which works from the apparent
 * ecliptic longitude OF DATE (precession + nutation) — the definition the Chinese
 * 節氣 use. This single ephemeris source (accurate to well under an arcminute,
 * for every year) replaces a sparse HKO lookup table plus a ±~6 min iterative
 * approximation, so all charts use one consistent standard.
 */
export function solarTermDate(year: number, solarLon: number): Date {
  const key = `${year}:${solarLon}`;
  const cachedMs = solarTermCache.get(key);
  if (cachedMs !== undefined) return new Date(cachedMs);

  // Searching forward from Jan 1 spans a full tropical year, so the single
  // in-year occurrence of `solarLon` is the first (and, for the 24 term
  // longitudes, only) crossing in the window.
  const start = new Date(Date.UTC(year, 0, 1));
  const found = Astronomy.SearchSunLongitude(solarLon, start, 366);
  if (!found) {
    throw new Error(`solarTermDate: no Sun-longitude crossing for ${solarLon}° in ${year}`);
  }
  solarTermCache.set(key, found.date.getTime());
  return new Date(found.date.getTime());
}

interface JieTerm {
  lon: number;
  branchIdx: number;
  name: string;
  date: Date;
}

/**
 * Get the solar term dates (Jié) for a given year.
 */
export function getMonthTermDates(year: number): JieTerm[] {
  const jieTerms = [
    { lon: 315, branchIdx: 2,  name: '立春' },
    { lon: 345, branchIdx: 3,  name: '驚蟄' },
    { lon:  15, branchIdx: 4,  name: '清明' },
    { lon:  45, branchIdx: 5,  name: '立夏' },
    { lon:  75, branchIdx: 6,  name: '芒種' },
    { lon: 105, branchIdx: 7,  name: '小暑' },
    { lon: 135, branchIdx: 8,  name: '立秋' },
    { lon: 165, branchIdx: 9,  name: '白露' },
    { lon: 195, branchIdx: 10, name: '寒露' },
    { lon: 225, branchIdx: 11, name: '立冬' },
    { lon: 255, branchIdx: 0,  name: '大雪' },
    { lon: 285, branchIdx: 1,  name: '小寒' },
  ];

  const terms: JieTerm[] = [];
  for (const t of jieTerms) {
    const d = solarTermDate(year, t.lon);
    terms.push({ ...t, date: d });
  }
  const xiaohanPrev = solarTermDate(year - 1, 285);
  terms.push({ lon: 285, branchIdx: 1, name: '小寒(前年)', date: xiaohanPrev });

  terms.sort((a, b) => a.date.getTime() - b.date.getTime());
  return terms;
}

/**
 * Determine the Month Branch index for a given date.
 *
 * `date` must be the true UTC instant of birth — 節氣 boundaries are absolute
 * UTC instants, so comparing them against a solar-shifted time would bias the
 * boundary by the solar correction.
 */
export function getMonthBranchIndex(date: Date): number {
  const year = date.getUTCFullYear();
  const terms = getMonthTermDates(year);

  let activeBranch = 1;
  for (const t of terms) {
    if (date >= t.date) {
      activeBranch = t.branchIdx;
    }
  }
  return activeBranch;
}

/**
 * Determine Bazi Year, considering Li Chun (立春) cutoff.
 *
 * `date` must be the true UTC instant of birth (the 立春 cutoff is an absolute
 * UTC instant; do not pass solar-shifted time).
 */
export function getBaziYear(date: Date): number {
  const year = date.getUTCFullYear();
  const liChun = solarTermDate(year, 315);
  if (date < liChun) return year - 1;
  return year;
}

// ── Year Pillar (年柱) ─────────────────────────────────────
export function yearPillar(date: Date): { stemIdx: number; branchIdx: number } {
  const y = getBaziYear(date);
  const stemIdx   = ((y - 4) % 10 + 10) % 10;
  const branchIdx = ((y - 4) % 12 + 12) % 12;
  return { stemIdx, branchIdx };
}

// ── Month Pillar (月柱) ────────────────────────────────────
export function monthPillar(date: Date, yearStemIdx: number): { stemIdx: number; branchIdx: number } {
  const branchIdx = getMonthBranchIndex(date);
  const monthOffset = ((branchIdx - 2) + 12) % 12;
  const yearGroup = yearStemIdx % 5;
  const baseStemIdx = [2, 4, 6, 8, 0][yearGroup];
  const stemIdx = (baseStemIdx + monthOffset) % 10;
  return { stemIdx, branchIdx };
}

// ── Day Pillar (日柱) ──────────────────────────────────────
export function dayPillar(date: Date): { stemIdx: number; branchIdx: number; cycleIdx: number } {
  const REF_JD = 2451545;
  const REF_INDEX = 54;
  const jd = dateToJD(date);

  // Julian Day numbers roll over at noon, but the sexagenary day pillar is
  // verified against civil dates that roll over at local midnight. Converting
  // JD -> civil day via floor(jd + 0.5) realigns the count to midnight-based
  // day boundaries before we compare against the reference anchor.
  //
  // Day-boundary convention: the day pillar changes at local solar midnight
  // (00:00), which the floor(jd + 0.5) civil-day conversion encodes. The
  // contested period is 子時's first half, 23:00–00:00 (子初 / 夜子時, the
  // "late-zi" sub-hour): here it stays on the CURRENT day — the midnight-rollover
  // rule (子正換日), commonly called the 早子時 method. The alternative school
  // rolls the day at 23:00 (子初換日 / 晚子時 method), giving a 23:00–23:59 birth
  // the NEXT day's pillar and a different Day Master. Both are used in practice;
  // neither is "wrong". Supporting the 23:00 rule is a deliberate non-goal for
  // now, tracked as a future opt-in toggle (default would remain midnight). Do
  // NOT change this 00:00 boundary to 23:00 without that toggle — it is a school
  // choice, not a bug.
  const civilDay = Math.floor(jd + 0.5);
  const refCivilDay = Math.floor(REF_JD + 0.5);
  const diff = civilDay - refCivilDay;
  const cycleIdx = ((diff + REF_INDEX) % 60 + 60) % 60;
  const stemIdx   = cycleIdx % 10;
  const branchIdx = cycleIdx % 12;
  return { stemIdx, branchIdx, cycleIdx };
}

// ── Hour Pillar (時柱) ─────────────────────────────────────
export function hourBranchIndex(solarHour: number, solarMinute: number): number {
  const h = solarHour + solarMinute / 60;
  // 子時 spans 23:00–01:00, so 23:00–23:59 (子初 / 夜子時) maps to branch 子 (0)
  // while the day pillar still changes at 00:00 (midnight-rollover; see
  // dayPillar). The alternative school rolls the day at 23:00 — intentionally
  // not implemented here (see dayPillar's note).
  if (h >= 23 || h < 1)  return 0;
  if (h < 3)  return 1;
  if (h < 5)  return 2;
  if (h < 7)  return 3;
  if (h < 9)  return 4;
  if (h < 11) return 5;
  if (h < 13) return 6;
  if (h < 15) return 7;
  if (h < 17) return 8;
  if (h < 19) return 9;
  if (h < 21) return 10;
  return 11;
}

export function hourPillar(tstDate: Date, dayStemIdx: number): { stemIdx: number; branchIdx: number } {
  const h = tstDate.getUTCHours();
  const m = tstDate.getUTCMinutes();
  const branchIdx = hourBranchIndex(h, m);
  const dayGroup = dayStemIdx % 5;
  const baseStemIdx = [0, 2, 4, 6, 8][dayGroup];
  const stemIdx = (baseStemIdx + branchIdx) % 10;
  return { stemIdx, branchIdx };
}

// ── Da Yun (大運) Helpers ──────────────────────────────────

export function getAllJie(year: number): { lon: number; name: string; date: Date }[] {
  const terms = [
    { lon: 315, name: 'Lì Chūn 立春'   },
    { lon: 345, name: 'Jīng Zhé 驚蟄'  },
    { lon:  15, name: 'Qīng Míng 清明'  },
    { lon:  45, name: 'Lì Xià 立夏'    },
    { lon:  75, name: 'Máng Zhòng 芒種' },
    { lon: 105, name: 'Xiǎo Shǔ 小暑'  },
    { lon: 135, name: 'Lì Qiū 立秋'    },
    { lon: 165, name: 'Bái Lù 白露'    },
    { lon: 195, name: 'Hán Lù 寒露'    },
    { lon: 225, name: 'Lì Dōng 立冬'   },
    { lon: 255, name: 'Dà Xuě 大雪'    },
    { lon: 285, name: 'Xiǎo Hán 小寒'  },
  ];
  return terms.map(t => ({ ...t, date: solarTermDate(year, t.lon) }));
}

// `date` must be the true UTC instant of birth — 節氣 are absolute UTC instants.
export function findNearestJie(date: Date, forward: boolean): { lon: number; name: string; date: Date } | null {
  const y = date.getUTCFullYear();
  const all: { lon: number; name: string; date: Date }[] = [];
  for (let yr = y - 1; yr <= y + 1; yr++) all.push(...getAllJie(yr));
  all.sort((a, b) => a.date.getTime() - b.date.getTime());

  if (forward) {
    return all.find(t => t.date > date) || null;
  } else {
    const before = all.filter(t => t.date < date);
    return before.length ? before[before.length - 1] : null;
  }
}

export function ganzhi2cycle(stemIdx: number, branchIdx: number): number {
  const k = (Math.round((branchIdx - stemIdx) / 2) * 5 % 6 + 6) % 6;
  return (stemIdx + 10 * k) % 60;
}

export function computeDaYun(
  utcDate: Date,
  civilDate: Date,
  mp: { stemIdx: number; branchIdx: number },
  yearStemIdx: number,
  calculationMode: CalculationGenderMode,
): DaYun | null {
  const yearStemYin = STEMS[yearStemIdx].yin;
  // Classical Da Yun direction still depends on a binary treatment rule.
  // Callers must pass an explicit calculation mode that is separate from gender identity.
  const treatedAsMale = calculationMode === 'male';
  const forward = treatedAsMale !== yearStemYin;

  // 起運 is measured to the nearest 節氣, which are absolute UTC instants. Both
  // the selection (findNearestJie) and the distance (daysDiff) must therefore
  // compare against the true birth instant (utcDate), NOT true solar time.
  // Longitude/EoT corrections are wall-clock adjustments and must not bias this.
  const jie = findNearestJie(utcDate, forward);
  if (!jie) return null;

  const MS_PER_DAY = 86400000;
  const daysDiff = Math.abs(jie.date.getTime() - utcDate.getTime()) / MS_PER_DAY;

  const startYears  = Math.floor(daysDiff / 3);
  const remainDays  = daysDiff % 3;
  const startMonths = Math.min(11, Math.round(remainDays * 4));

  const monthCycleIdx = ganzhi2cycle(mp.stemIdx, mp.branchIdx);
  // birthYear labels the Gregorian year of birth at the birthplace; it stays on
  // civil (clock) time and is not a 節氣 comparison.
  const birthYear = civilDate.getUTCFullYear();

  const pillars: DaYunPillar[] = [];
  for (let i = 1; i <= 10; i++) {
    const cycleIdx  = ((monthCycleIdx + (forward ? i : -i)) % 60 + 60) % 60;
    const stemIdx   = cycleIdx % 10;
    const branchIdx = cycleIdx % 12;
    const ageStart  = startYears + (i - 1) * 10;
    const ageEnd    = ageStart + 9;
    pillars.push({
      cycleIdx, stemIdx, branchIdx,
      stem:   STEMS[stemIdx],
      branch: BRANCHES[branchIdx],
      ageStart, ageEnd,
      yearStart: birthYear + ageStart,
      yearEnd:   birthYear + ageEnd,
    });
  }

  return {
    forward,
    calculationMode,
    ruleNote: 'Da Yun direction uses the classical rule of treating the chart as male or female. This parameter is separate from gender identity.',
    startYears,
    startMonths,
    jie,
    pillars,
  };
}

// ── True Solar Time Helpers ────────────────────────────────

/**
 * Get the UTC offset in minutes for a given date in an IANA timezone.
 * Positive = ahead of UTC (e.g., Asia/Bangkok = +420).
 */
function addUtcYearsMonths(date: Date, years: number, months: number): Date {
  const result = new Date(Date.UTC(
    date.getUTCFullYear() + years,
    date.getUTCMonth() + months,
    1,
    date.getUTCHours(),
    date.getUTCMinutes(),
    date.getUTCSeconds(),
    date.getUTCMilliseconds(),
  ));
  const maxDay = new Date(Date.UTC(result.getUTCFullYear(), result.getUTCMonth() + 1, 0)).getUTCDate();
  result.setUTCDate(Math.min(date.getUTCDate(), maxDay));
  return result;
}

export function projectDateToTimezone(date: Date, ianaTimezone: string): Date {
  const formatter = createDateTimeFormatter(ianaTimezone);
  const localParts = getLocalDateTimeParts(date, formatter);

  return new Date(Date.UTC(
    localParts.year,
    localParts.month - 1,
    localParts.day,
    localParts.hour,
    localParts.minute,
    localParts.second,
  ));
}

export function getDaYunCycleStartDate(birthDate: Date, daYun: DaYun, pillarIndex: number): Date {
  return addUtcYearsMonths(
    birthDate,
    daYun.startYears + pillarIndex * 10,
    daYun.startMonths,
  );
}

export function getActiveDaYunPillarForDate(
  daYun: DaYun | null,
  birthDate: Date,
  referenceDate: Date,
  ianaTimezone: string,
): DaYunPillar | null {
  if (!daYun || daYun.pillars.length === 0) return null;

  const localReference = projectDateToTimezone(referenceDate, ianaTimezone);
  const firstCycleStart = getDaYunCycleStartDate(birthDate, daYun, 0);
  if (localReference < firstCycleStart) {
    return null;
  }

  let activePillar = daYun.pillars[0];
  for (let index = 1; index < daYun.pillars.length; index += 1) {
    const cycleStart = getDaYunCycleStartDate(birthDate, daYun, index);
    if (localReference < cycleStart) {
      break;
    }
    activePillar = daYun.pillars[index];
  }

  return activePillar;
}

export function getUtcOffsetMinutes(date: Date, ianaTimezone: string): number {
  const formatter = createDateTimeFormatter(ianaTimezone);
  const localParts = getLocalDateTimeParts(date, formatter);
  const localMs = Date.UTC(
    localParts.year,
    localParts.month - 1,
    localParts.day,
    localParts.hour,
    localParts.minute,
    localParts.second,
  );
  return Math.round((localMs - date.getTime()) / 60000);
}

/**
 * Distinct UTC offsets (minutes) observed at monthly probes from `date`,
 * scanning `direction` (-1 = past, +1 = future) for ~14 months (excluding
 * `date` itself).
 *
 * Monthly steps always land clear of the spring-forward gap / fall-back
 * ambiguous window (those are ~1 hour wide), so getUtcOffsetMinutes returns an
 * unambiguous offset at each probe. ~14 months guarantees at least one full
 * annual cycle is seen, so any seasonal (DST) offset is observed in each
 * direction.
 */
function offsetsInDirection(date: Date, ianaTimezone: string, direction: 1 | -1): Set<number> {
  const offsets = new Set<number>();
  for (let month = 1; month <= 14; month++) {
    offsets.add(getUtcOffsetMinutes(addUtcYearsMonths(date, 0, direction * month), ianaTimezone));
  }
  return offsets;
}

/**
 * Standard (non-DST) UTC offset in minutes for the timezone at the instant
 * `date`, derived from the actual tzdata around that instant.
 *
 * Standard time = the offset the zone uses when DST is NOT in effect at that
 * era. Rule: the standard offset is the LOWEST offset that recurs on BOTH sides
 * of the birth within ~14 months. DST (any tier) shifts the clock forward
 * seasonally, so the base offset reappears every winter on both the past and
 * future side and is the minimum of those recurring values. A permanent base
 * change is one-directional — the pre-change offset does not recur on the future
 * side (nor the post-change offset on the past side) — so it is excluded
 * automatically. The birth offset itself always recurs (it holds at `date`),
 * guaranteeing a non-empty result; for a year-round / permanent-DST era with no
 * winter reversion (e.g. UK 1968–71 British Standard Time) that single offset is
 * correctly returned as the standard.
 *
 * This handles, with no special-casing:
 *  - normal single DST (both hemispheres) and multi-tier double-summer-time;
 *  - sub-60-minute DST (e.g. Lord Howe +10:30/+11:00) — DST is read from tzdata,
 *    never assumed to be 60 minutes;
 *  - permanent mid-year base changes, the failure of the previous
 *    min(January, July) heuristic. Example: Asia/Bangkok switched +6:42 → +7:00
 *    on 1920-04-01, so a birth after April 1920 has standard +7:00 (meridian
 *    105°E), not the +6:42 the old heuristic returned for the whole year.
 *
 * Ceiling: negative-DST zones (e.g. Europe/Dublin winter, Ramadan rollbacks)
 * model their raw offset as the HIGHER value; this rule returns the lower
 * (winter) offset for them — matching the previous heuristic's behaviour, not a
 * regression. Revisit if such a zone needs its tzdata raw offset specifically.
 */
export function getStdOffsetMinutes(date: Date, ianaTimezone: string): number {
  const birthOffset = getUtcOffsetMinutes(date, ianaTimezone);
  const past = offsetsInDirection(date, ianaTimezone, -1);
  const future = offsetsInDirection(date, ianaTimezone, 1);
  past.add(birthOffset);
  future.add(birthOffset);

  let std = birthOffset;
  for (const offset of past) {
    if (future.has(offset) && offset < std) std = offset;
  }
  return std;
}

export function getStandardMeridianDegrees(stdOffsetMin: number): number {
  return stdOffsetMin / 60 * 15;
}

/**
 * Returns true if DST is in effect for the given date and timezone.
 */
export function isDST(date: Date, ianaTimezone: string): boolean {
  const stdOff = getStdOffsetMinutes(date, ianaTimezone);
  const curOff = getUtcOffsetMinutes(date, ianaTimezone);
  return curOff > stdOff;
}

/**
 * Convert a locally-entered clock time (HH:mm) on a given date in an IANA timezone to UTC.
 * Handles DST correctly via two-pass approximation.
 */
export function clockTimeToUtc(y: number, mo: number, d: number, hr: number, mn: number, ianaTimezone: string): Date {
  const formatter = createDateTimeFormatter(ianaTimezone);
  // First pass: treat clock time as approximate UTC, get the timezone offset at that moment
  const approx1 = new Date(Date.UTC(y, mo - 1, d, hr, mn));
  const off1 = getUtcOffsetMinutes(approx1, ianaTimezone);
  // Second pass: better UTC estimate
  const approx2 = new Date(Date.UTC(y, mo - 1, d, hr, mn) - off1 * 60 * 1000);
  const off2 = getUtcOffsetMinutes(approx2, ianaTimezone);
  const approxUtc = new Date(Date.UTC(y, mo - 1, d, hr, mn) - off2 * 60 * 1000);
  const matches = findMatchingUtcInstants(
    { year: y, month: mo, day: d, hour: hr, minute: mn, second: 0 },
    formatter,
    approxUtc,
  );

  if (matches.length === 0) {
    throw new Error('The selected local time does not exist in this timezone because of a DST transition.');
  }

  if (matches.length > 1) {
    throw new Error('The selected local time is ambiguous in this timezone because of a DST transition. Please choose a different time.');
  }

  return matches[0];
}

/**
 * Equation of Time (EOT) in minutes using Meeus algorithm.
 * Range: approximately −14 to +16 minutes.
 */
export function equationOfTime(jd: number): number {
  const T = (jd - 2451545.0) / 36525;

  let L0 = 280.46646 + 36000.76983 * T + 0.0003032 * T * T;
  L0 = L0 % 360; if (L0 < 0) L0 += 360;

  let M = 357.52911 + 35999.05029 * T - 0.0001537 * T * T;
  M = M % 360; if (M < 0) M += 360;

  const e = 0.016708634 - 0.000042037 * T - 0.0000001267 * T * T;

  const eps0 = 23 + 26 / 60 + 21.448 / 3600;
  const eps = eps0 - (46.8150 / 3600) * T - (0.00059 / 3600) * T * T + (0.001813 / 3600) * T * T * T;
  const epsRad = eps * Math.PI / 180;

  const y = Math.pow(Math.tan(epsRad / 2), 2);
  const L0rad = L0 * Math.PI / 180;
  const Mrad  = M  * Math.PI / 180;

  const eotRad = y * Math.sin(2 * L0rad)
               - 2 * e * Math.sin(Mrad)
               + 4 * e * y * Math.sin(Mrad) * Math.cos(2 * L0rad)
               - 0.5 * y * y * Math.sin(4 * L0rad)
               - 1.25 * e * e * Math.sin(2 * Mrad);

  // Convert radians → degrees → minutes (1° = 4 min)
  return eotRad * (180 / Math.PI) * 4;
}

// ── Main Calculation Entry Point ───────────────────────────
export function computeBazi(
  dateStr: string,
  timeStr: string | null,
  ianaTimezone: string,
  longitude: number,
  calculationMode: CalculationGenderMode,
): BaziResult {
  const [y, mo, d] = dateStr.split('-').map(Number);
  const [hr, mn]   = timeStr ? timeStr.split(':').map(Number) : [12, 0];
  createDateTimeFormatter(ianaTimezone);

  // Convert clock time → UTC (accounts for DST in the IANA timezone)
  const utcDate = timeStr
    ? clockTimeToUtc(y, mo, d, hr, mn, ianaTimezone)
    : clockTimeToUtc(y, mo, d, 12, 0, ianaTimezone);

  const stdOffsetMin = getStdOffsetMinutes(utcDate, ianaTimezone);
  const displayOffsetMin = getUtcOffsetMinutes(utcDate, ianaTimezone);

  // ── True Solar Time calculation ──────────────────────────
  let tstDate: Date;
  let tst: TSTInfo | null = null;

  if (timeStr) {
    // Step 1: DST reversion. The standard offset (stdOffsetMin) already encodes
    // the non-DST offset, so building the standard wall clock from utcDate via
    // stdOffsetMin performs the reversion. dstCorrectionMin is the equivalent
    // clock→standard amount for the displayed breakdown, derived from the real
    // offsets at this instant (std − birthOffset) — NOT a hardcoded −60, so
    // sub-60-minute DST (e.g. Lord Howe = 30 min) and multi-tier double summer
    // time are reverted by their true amount. It is 0 when DST is not in effect.
    const dstApplied = isDST(utcDate, ianaTimezone);
    const dstCorrectionMin = stdOffsetMin - displayOffsetMin;

    // Step 2: Longitude correction
    const stdMeridian    = getStandardMeridianDegrees(stdOffsetMin); // degrees
    const lonCorrectionMin = (longitude - stdMeridian) * 4;

    // Step 3: Equation of Time
    const jd     = dateToJD(utcDate);
    const eotMin = equationOfTime(jd);

    // TST (apparent solar) = standard wall clock + longitude + EoT.
    // Standard wall clock = utcDate + stdOffsetMin (DST already removed by using
    // the standard offset), so DST is NOT subtracted a second time here.
    const tstMs = utcDate.getTime() + (stdOffsetMin + lonCorrectionMin + eotMin) * 60 * 1000;
    tstDate = new Date(tstMs);

    // Clock's local date (standard time, without DST)
    const clockStdMs = utcDate.getTime() + stdOffsetMin * 60 * 1000;
    const clockStdDate = new Date(clockStdMs);
    const dayChanged =
      tstDate.getUTCFullYear() !== clockStdDate.getUTCFullYear() ||
      tstDate.getUTCMonth()    !== clockStdDate.getUTCMonth()    ||
      tstDate.getUTCDate()     !== clockStdDate.getUTCDate();

    // Total correction is measured from the entered wall clock (which includes
    // DST): clock → solar = DST reversion + longitude + EoT.
    const totalCorrectionMin = dstCorrectionMin + lonCorrectionMin + eotMin;

    tst = {
      dstApplied,
      dstCorrectionMin,
      lonCorrectionMin,
      eotMin,
      totalCorrectionMin,
      dayChanged,
      dayChangedDir: dayChanged ? (tstDate > clockStdDate ? 'next' : 'prev') : null,
    };
  } else {
    // Unknown time: use standard local date at noon for pillar calculation
    tstDate = new Date(utcDate.getTime() + stdOffsetMin * 60 * 1000);
  }

  // Frame split:
  //  - Day & Hour pillars are wall-clock concepts → True Solar Time (tstDate).
  //  - Year & Month pillars and Da Yun 起運 are decided by 節氣 boundaries,
  //    which are absolute UTC instants → compare against the true birth instant
  //    (utcDate). Feeding tstDate here would bias every 節氣 boundary by the
  //    total solar correction (~hours), flipping Month/Year/生肖 and shifting
  //    Da Yun start age for births near a 節氣.
  const yp = yearPillar(utcDate);
  const mp = monthPillar(utcDate, yp.stemIdx);
  const dp = dayPillar(tstDate);
  const hp = timeStr ? hourPillar(tstDate, dp.stemIdx) : null;

  const daYun = computeDaYun(
    utcDate,
    tstDate,
    { stemIdx: mp.stemIdx, branchIdx: mp.branchIdx },
    yp.stemIdx,
    calculationMode,
  );

  // Build timezone label (standard offset)
  const sign    = stdOffsetMin >= 0 ? '+' : '−';
  const absMins = Math.abs(stdOffsetMin);
  const tzLabel = `UTC${sign}${Math.floor(absMins / 60)}:${String(absMins % 60).padStart(2, '0')}`;
  const displayTzLabel = formatUtcOffsetLabel(displayOffsetMin);

  // localDate = clock's standard-time representation (for display)
  const localDate = new Date(utcDate.getTime() + stdOffsetMin * 60 * 1000);
  const displayDate = new Date(utcDate.getTime() + displayOffsetMin * 60 * 1000);

  return {
    utcDate,
    localDate,
    displayDate,
    tstDate,
    tzLabel,
    displayTzLabel,
    stdOffsetMin,
    tst,
    daYun,
    unknownTime: !timeStr,
    pillars: {
      hour:  hp ? { stem: STEMS[hp.stemIdx], branch: BRANCHES[hp.branchIdx], stemIdx: hp.stemIdx, branchIdx: hp.branchIdx } : null,
      day:   { stem: STEMS[dp.stemIdx],  branch: BRANCHES[dp.branchIdx],  stemIdx: dp.stemIdx,  branchIdx: dp.branchIdx  },
      month: { stem: STEMS[mp.stemIdx],  branch: BRANCHES[mp.branchIdx],  stemIdx: mp.stemIdx,  branchIdx: mp.branchIdx  },
      year:  { stem: STEMS[yp.stemIdx],  branch: BRANCHES[yp.branchIdx],  stemIdx: yp.stemIdx,  branchIdx: yp.branchIdx  },
    },
  };
}

// ── Hidden Stem / Chart Helpers ────────────────────────────
// Main qi derives directly from the hidden stems table (index 0 = main qi).
// BRANCH_HIDDEN_STEMS is the single source of truth — no duplicate table here.
export function getBranchMainStem(branchIdx: number): number {
  return BRANCH_HIDDEN_STEMS[branchIdx][0];
}

type LocalDateTimeParts = {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
};

function createDateTimeFormatter(ianaTimezone: string): Intl.DateTimeFormat {
  try {
    return new Intl.DateTimeFormat('en-US', {
      timeZone: ianaTimezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    });
  } catch {
    throw new Error(`Invalid IANA timezone: ${ianaTimezone}`);
  }
}

function getLocalDateTimeParts(date: Date, formatter: Intl.DateTimeFormat): LocalDateTimeParts {
  const parts = formatter.formatToParts(date);
  const get = (type: string) => parseInt(parts.find(p => p.type === type)?.value ?? '0', 10);
  let hour = get('hour');
  if (hour === 24) hour = 0;
  return {
    year: get('year'),
    month: get('month'),
    day: get('day'),
    hour,
    minute: get('minute'),
    second: get('second'),
  };
}

function sameLocalDateTime(a: LocalDateTimeParts, b: LocalDateTimeParts): boolean {
  return a.year === b.year
    && a.month === b.month
    && a.day === b.day
    && a.hour === b.hour
    && a.minute === b.minute
    && a.second === b.second;
}

function findMatchingUtcInstants(
  requestedLocalTime: LocalDateTimeParts,
  formatter: Intl.DateTimeFormat,
  approxUtc: Date,
): Date[] {
  const matches: Date[] = [];

  for (let delta = -180; delta <= 180; delta++) {
    const candidate = new Date(approxUtc.getTime() + delta * 60000);
    if (sameLocalDateTime(getLocalDateTimeParts(candidate, formatter), requestedLocalTime)) {
      matches.push(candidate);
    }
  }

  return matches;
}

function formatUtcOffsetLabel(offsetMin: number): string {
  const sign = offsetMin >= 0 ? '+' : '−';
  const absMins = Math.abs(offsetMin);
  return `UTC${sign}${Math.floor(absMins / 60)}:${String(absMins % 60).padStart(2, '0')}`;
}

export function elementToStructure(el: string, dmEl: string): string {
  if (el === dmEl)               return 'companion';
  if (el === generates(dmEl))    return 'output';
  if (el === controls(dmEl))     return 'wealth';
  if (el === controlledBy(dmEl)) return 'influence';
  if (el === generatedBy(dmEl))  return 'resource';
  // The five branches above are exhaustive for any valid element string.
  // Reaching here means `el` or `dmEl` is not a recognised element name —
  // likely a data bug upstream. Throw rather than silently misclassify.
  throw new Error(`elementToStructure: unrecognised element "${el}" (dmEl="${dmEl}")`);
}

export interface ChartData {
  structureCounts: Record<string, number>;
  structureEls: Record<string, string>;
  tenGodsCount: Record<string, number>;
}

/**
 * Flat-count aggregation model
 * ─────────────────────────────
 * This function implements a deliberately simple, unweighted counting model.
 * It is NOT a qi-strength model and NOT a seasonal influence model.
 *
 * Rules (each item contributes a flat count of 1):
 *  - Visible stem of each pillar:    counted in structureCounts
 *  - Hidden stems of each branch:    every stem in BRANCH_HIDDEN_STEMS[branchIdx]
 *                                    is counted once in both structureCounts and tenGodsCount
 *  - Day master's own visible stem:  counted in structureCounts (as companion),
 *                                    but excluded from tenGodsCount (k !== 'day' guard)
 *                                    because the day master has no Ten God relationship with itself
 *  - Pillar count:                   4 pillars when birth time is known,
 *                                    3 (day/month/year) when unknownTime is true
 *
 * Intentional asymmetry:
 *  sum(structureCounts) = sum(tenGodsCount) + 1
 *  The +1 is the day master's visible stem, which is excluded from tenGodsCount only.
 *
 * What this model does NOT do:
 *  - No qi-depth weighting (main qi ≠ mid qi ≠ residual qi)
 *  - No seasonal / monthly energy weighting
 *  - No positional strength for year/month/day/hour pillar
 *  - No Day Master strong/weak scoring
 */
export function computeChartData(
  pillars: BaziResult['pillars'],
  dmStemIdx: number,
  unknownTime: boolean
): ChartData {
  const dmEl = STEMS[dmStemIdx].element;
  const structureCounts: Record<string, number> = { companion: 0, output: 0, wealth: 0, influence: 0, resource: 0 };
  const tenGodsCount: Record<string, number> = {};
  const order = (unknownTime ? ['day', 'month', 'year'] : ['hour', 'day', 'month', 'year']) as Array<keyof typeof pillars>;

  order.forEach(k => {
    const p = pillars[k];
    if (!p) return;

    // Visible stem: +1 to structureCounts for every pillar (including day).
    structureCounts[elementToStructure(p.stem.element, dmEl)]++;

    // Visible stem Ten God: counted for every pillar except the day master's own stem.
    if (k !== 'day') {
      const tg = tenGod(dmStemIdx, p.stemIdx);
      tenGodsCount[tg.zh] = (tenGodsCount[tg.zh] || 0) + 1;
    }

    // Hidden stems: every hidden stem in the branch counts as +1 in both tallies.
    const hiddenStems = BRANCH_HIDDEN_STEMS[p.branchIdx];
    hiddenStems.forEach(hsIdx => {
      structureCounts[elementToStructure(STEMS[hsIdx].element, dmEl)]++;
      const tgH = tenGod(dmStemIdx, hsIdx);
      tenGodsCount[tgH.zh] = (tenGodsCount[tgH.zh] || 0) + 1;
    });
  });

  const structureEls: Record<string, string> = {
    companion: dmEl,
    output:    generates(dmEl),
    wealth:    controls(dmEl),
    influence: controlledBy(dmEl),
    resource:  generatedBy(dmEl),
  };

  return { structureCounts, structureEls, tenGodsCount };
}

// ── 12 Growth Stage ───────────────────────────────────────
export const TWELVE_STAGE_TABLE: Record<string, string[]> = {
  //         子0      丑1      寅2      卯3      辰4      巳5      午6      未7      申8      酉9      戌10     亥11
  wood:  ['沐浴','冠帶','臨官','帝旺','衰', '病', '死', '墓', '絕', '胎', '養', '長生'],
  fire:  ['胎', '養', '長生','沐浴','冠帶','臨官','帝旺','衰', '病', '死', '墓', '絕'],
  earth: ['胎', '養', '長生','沐浴','冠帶','臨官','帝旺','衰', '病', '死', '墓', '絕'],
  metal: ['死', '墓', '絕', '胎', '養', '長生','沐浴','冠帶','臨官','帝旺','衰', '病'],
  water: ['帝旺','衰', '病', '死', '墓', '絕', '胎', '養', '長生','沐浴','冠帶','臨官'],
};

export const STAGE_EN: Record<string, string> = {
  '長生':'ChangSheng','沐浴':'MuYu','冠帶':'GuanDai','臨官':'LinGuan',
  '帝旺':'DiWang','衰':'Shuai','病':'Bing','死':'Si',
  '墓':'Mu','絕':'Jue','胎':'Tai','養':'Yang',
};

export function twelveStage(dmEl: string, branchIdx: number): { zh: string; en: string } {
  const zh = TWELVE_STAGE_TABLE[dmEl][branchIdx];
  return { zh, en: STAGE_EN[zh] };
}

export const TG_ABBR: Record<string, string> = {
  '比肩':'FR','劫財':'RW','食神':'EG','傷官':'HO',
  '偏財':'IW','正財':'DW','偏官':'7K','正官':'DO','偏印':'IR','正印':'DR',
};

export const TG_COLOR: Record<string, string> = {
  FR:'#64748B', RW:'#64748B',
  EG:'#D97706', HO:'#D97706',
  IW:'#16A34A', DW:'#16A34A',
  '7K':'#DC2626', DO:'#DC2626',
  IR:'#7C3AED', DR:'#7C3AED',
};

export const EL_LABEL: Record<string, { en: string; zh: string }> = {
  wood:  { en: 'Wood',  zh: '木' },
  fire:  { en: 'Fire',  zh: '火' },
  earth: { en: 'Earth', zh: '土' },
  metal: { en: 'Metal', zh: '金' },
  water: { en: 'Water', zh: '水' },
};

export function getDayMasterNote(stem: Stem): string {
  const notes: Record<string, string> = {
    '甲': 'Upright & Pioneering',
    '乙': 'Flexible & Graceful',
    '丙': 'Radiant & Generous',
    '丁': 'Warm & Refined',
    '戊': 'Solid & Reliable',
    '己': 'Nurturing & Practical',
    '庚': 'Decisive & Strong',
    '辛': 'Perceptive & Elegant',
    '壬': 'Intelligent & Adaptive',
    '癸': 'Intuitive & Subtle',
  };
  return notes[stem.zh] || '—';
}

// ── Day Master Strength & Useful Element (用神) ─────────────
//
// IMPORTANT: this is Horomo's stance, NOT a universal standard. Weighing 身強/
// 身弱 is a qualitative judgment in the classics. Two things ARE agreed across
// schools and are encoded as fixed logic:
//   - the direction of 扶抑: a weak Day Master wants support (印 resource / 比劫
//     companion), a strong one wants draining (官杀 / 財 / 食伤);
//   - 月令 (the month branch) carries the most weight, then other branches, then
//     stems; rooted hidden stems count by depth 本气 > 中气 > 余气.
// The numeric weights and thresholds below have NO canonical values — they are
// tunable defaults a human can calibrate WITHOUT touching the logic. Charts that
// are too balanced (borderline) or too extreme (從格-suspect) are flagged and the
// engine refuses to assert a 用神 rather than forcing a (possibly inverted) call.

export interface StrengthConfig {
  monthCommandWeight: number;                                        // 月令 — highest
  rootWeight: { primary: number; middle: number; residual: number }; // 本/中/余气
  stemWeight: number;                                                // a stem on the table
  branchWeight: number;                                              // a non-month branch
  strongThreshold: number;   // support ratio ≥ this → 身強
  weakThreshold: number;     // support ratio ≤ this → 身弱; strictly between → borderline
  extremeThreshold: number;  // ratio ≥ this (or ≤ 1−this) → suspect 從格 → special_structure
}

// Default stance — calibrate these, do not bury new numbers in the logic.
export const DEFAULT_STRENGTH_CONFIG: StrengthConfig = {
  monthCommandWeight: 3,
  rootWeight: { primary: 2, middle: 1, residual: 0.5 },
  stemWeight: 1,
  branchWeight: 1.5,
  strongThreshold: 0.55,
  weakThreshold: 0.45,
  extremeThreshold: 0.80,
};

// Fixed (not configurable): which structures support vs drain the Day Master.
//   support 扶 = companion (比劫, 同我) + resource (印, 生我)
//   drain   抑 = output (食伤, 我生) + wealth (財, 我剋) + influence (官杀, 剋我)
const SUPPORT_STRUCTURES = new Set(['companion', 'resource']);

export type DayMasterClassification = 'strong' | 'weak' | 'borderline' | 'special_structure';

export interface StrengthComponent {
  position: string;       // e.g. 'month branch 本气'
  stem: string;           // 天干 zh
  element: string;
  tenGod: string;         // 十神 zh
  structure: string;      // companion/resource/output/wealth/influence
  side: 'support' | 'drain';
  weight: number;
  monthCommand: boolean;  // true if from the month branch (月令)
}

export interface UsefulElementResult {
  dayMaster: { stem: string; element: string };
  supportScore: number;
  drainScore: number;
  strengthRatio: number;                  // support / (support + drain)
  classification: DayMasterClassification;
  usefulElement: string | null;          // element key (e.g. 'water'), or null when not asserted
  favorableElements: string[];           // element keys; empty when not asserted
  unfavorableElements: string[];
  flags: string[];                        // 'borderline' | 'special_structure'
  reasoning: string;                      // human-readable why
  structureScores: Record<string, number>;
  breakdown: StrengthComponent[];         // full per-component transparency
  config: StrengthConfig;                 // echo of the weights used
}

const HIDDEN_DEPTH_NAMES = ['本气', '中气', '余气'];

/**
 * Deterministic Day Master strength + Useful Element (用神) engine.
 *
 * Sums weighted support vs drain forces across the chart (month branch weighted
 * highest), classifies the Day Master, and — for clearly strong/weak charts —
 * selects a 用神 by the 病藥 principle (counter the dominant cause). Borderline
 * and 從格-suspect charts are flagged with no asserted 用神. Returns a full
 * breakdown so the result is explainable, never a black box.
 */
export function computeUsefulElement(
  pillars: BaziResult['pillars'],
  dmStemIdx: number,
  unknownTime: boolean,
  config: StrengthConfig = DEFAULT_STRENGTH_CONFIG,
): UsefulElementResult {
  const dmEl = STEMS[dmStemIdx].element;
  const breakdown: StrengthComponent[] = [];
  const structureScores: Record<string, number> = { companion: 0, resource: 0, output: 0, wealth: 0, influence: 0 };
  const depthWeights = [config.rootWeight.primary, config.rootWeight.middle, config.rootWeight.residual];

  const add = (stemIdx: number, position: string, weight: number, monthCommand: boolean) => {
    const el = STEMS[stemIdx].element;
    const structure = elementToStructure(el, dmEl);
    structureScores[structure] += weight;
    breakdown.push({
      position,
      stem: STEMS[stemIdx].zh,
      element: el,
      tenGod: tenGod(dmStemIdx, stemIdx).zh,
      structure,
      side: SUPPORT_STRUCTURES.has(structure) ? 'support' : 'drain',
      weight,
      monthCommand,
    });
  };

  const order = (unknownTime ? ['year', 'month', 'day'] : ['year', 'month', 'day', 'hour']) as Array<keyof typeof pillars>;
  order.forEach((k) => {
    const p = pillars[k];
    if (!p) return;
    // Visible stem — skip the Day Master's own stem (the subject is not a force on itself).
    if (k !== 'day') add(p.stemIdx, `${k} stem`, config.stemWeight, false);
    // Branch hidden stems (通根): weighted by depth; the month branch (月令) carries the most.
    const isMonth = k === 'month';
    const branchBase = isMonth ? config.monthCommandWeight : config.branchWeight;
    BRANCH_HIDDEN_STEMS[p.branchIdx].forEach((hsIdx, depth) => {
      const depthW = depthWeights[depth] ?? config.rootWeight.residual;
      add(hsIdx, `${k} branch ${HIDDEN_DEPTH_NAMES[depth] ?? '余气'}`, branchBase * depthW, isMonth);
    });
  });

  const supportScore = structureScores.companion + structureScores.resource;
  const drainScore = structureScores.output + structureScores.wealth + structureScores.influence;
  const total = supportScore + drainScore;
  const strengthRatio = total === 0 ? 0.5 : supportScore / total;

  const elMap: Record<string, string> = {
    companion: dmEl,
    resource: generatedBy(dmEl),
    output: generates(dmEl),
    wealth: controls(dmEl),
    influence: controlledBy(dmEl),
  };
  const round = (n: number) => Math.round(n * 1000) / 1000;
  const elLabel = (key: string) => `${EL_LABEL[key].en} (${EL_LABEL[key].zh})`;

  let classification: DayMasterClassification;
  const flags: string[] = [];
  if (strengthRatio >= config.extremeThreshold || strengthRatio <= 1 - config.extremeThreshold) {
    classification = 'special_structure';
    flags.push('special_structure');
  } else if (strengthRatio >= config.strongThreshold) {
    classification = 'strong';
  } else if (strengthRatio <= config.weakThreshold) {
    classification = 'weak';
  } else {
    classification = 'borderline';
    flags.push('borderline');
  }

  const base = {
    dayMaster: { stem: STEMS[dmStemIdx].zh, element: dmEl },
    supportScore: round(supportScore),
    drainScore: round(drainScore),
    strengthRatio: round(strengthRatio),
    classification,
    structureScores: Object.fromEntries(Object.entries(structureScores).map(([k, v]) => [k, round(v)])),
    breakdown,
    config,
    flags,
  };

  if (classification === 'borderline') {
    return {
      ...base,
      usefulElement: null,
      favorableElements: [],
      unfavorableElements: [],
      reasoning: `Support ratio ${round(strengthRatio)} falls between the weak (${config.weakThreshold}) and strong (${config.strongThreshold}) thresholds — the Day Master is too balanced to call confidently. Horomo does not assert a single useful element here; this chart needs case-by-case judgment.`,
    };
  }

  if (classification === 'special_structure') {
    const dir = strengthRatio >= 0.5 ? 'overwhelmingly strong' : 'overwhelmingly weak';
    return {
      ...base,
      usefulElement: null,
      favorableElements: [],
      unfavorableElements: [],
      reasoning: `Support ratio ${round(strengthRatio)} is ${dir} (beyond ${config.extremeThreshold}/${round(1 - config.extremeThreshold)}), which suggests a special structure (從格) where ordinary 扶抑 does not apply and could invert the polarity. Horomo does not assert a useful element here; this chart warrants expert review.`,
    };
  }

  const supportEls = [elMap.resource, elMap.companion];
  const drainEls = [elMap.influence, elMap.wealth, elMap.output];

  if (classification === 'weak') {
    const dominant = (['influence', 'wealth', 'output'] as const).reduce((a, b) => (structureScores[b] > structureScores[a] ? b : a));
    let usefulElement: string;
    let why: string;
    if (dominant === 'wealth') {
      usefulElement = elMap.companion; // 比劫 shares the load against 財
      why = `the heaviest drain is Wealth (財), so companions (比劫) of ${elLabel(elMap.companion)} help the Day Master hold its wealth`;
    } else if (dominant === 'influence') {
      usefulElement = elMap.resource; // 印 channels 官杀 into the DM (化杀生身)
      why = `Authority (官杀) presses hardest, so Resource (印) of ${elLabel(elMap.resource)} channels that pressure into support (化杀生身)`;
    } else {
      usefulElement = elMap.resource; // 印 restrains 食伤 and feeds DM
      why = `Output (食伤) leaks the Day Master most, so Resource (印) of ${elLabel(elMap.resource)} both restrains the output and feeds the Day Master`;
    }
    return {
      ...base,
      usefulElement,
      favorableElements: supportEls,
      unfavorableElements: drainEls,
      reasoning: `Day Master is weak (support ratio ${round(strengthRatio)}); ${why}. Useful element: ${elLabel(usefulElement)}.`,
    };
  }

  // strong
  const strongFrom = structureScores.resource >= structureScores.companion ? 'resource' : 'companion';
  let usefulElement: string;
  let why: string;
  if (strongFrom === 'resource') {
    usefulElement = elMap.wealth; // 財剋印
    why = `it is over-fed by Resource (印), so Wealth (財) of ${elLabel(elMap.wealth)} curbs the excess (財剋印) and gives the Day Master something to act on`;
  } else {
    usefulElement = elMap.influence; // 官杀 disciplines 比劫
    why = `it is crowded by Companions (比劫), so Authority (官杀) of ${elLabel(elMap.influence)} disciplines them (Output 食伤 is a secondary outlet)`;
  }
  return {
    ...base,
    usefulElement,
    favorableElements: drainEls,
    unfavorableElements: supportEls,
    reasoning: `Day Master is strong (support ratio ${round(strengthRatio)}); ${why}. Useful element: ${elLabel(usefulElement)}.`,
  };
}
