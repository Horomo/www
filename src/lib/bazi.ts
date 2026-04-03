// ═══════════════════════════════════════════════════════════
//  BAZI CALCULATION ENGINE — TypeScript port
// ═══════════════════════════════════════════════════════════

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
  startYears: number;
  startMonths: number;
  jie: { name: string; date: Date };
  pillars: DaYunPillar[];
}

export interface BaziResult {
  utcDate: Date;
  localDate: Date;
  tzLabel: string;
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
  [8],           // 子(0): 壬
  [5, 7, 9],     // 丑(1): 己, 辛, 癸
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

/**
 * Approximate Sun apparent longitude (degrees) for a given JDE.
 */
export function sunApparentLongitude(jde: number): number {
  const T = (jde - 2451545.0) / 36525;
  let L0 = 280.46646 + 36000.76983 * T + 0.0003032 * T * T;
  L0 = L0 % 360; if (L0 < 0) L0 += 360;
  let M = 357.52911 + 35999.05029 * T - 0.0001537 * T * T;
  M = M % 360; if (M < 0) M += 360;
  const Mrad = M * Math.PI / 180;
  const C = (1.914602 - 0.004817 * T - 0.000014 * T * T) * Math.sin(Mrad)
          + (0.019993 - 0.000101 * T) * Math.sin(2 * Mrad)
          + 0.000289 * Math.sin(3 * Mrad);
  let sunLon = L0 + C;
  const omega = 125.04 - 1934.136 * T;
  sunLon = sunLon - 0.00569 - 0.00478 * Math.sin(omega * Math.PI / 180);
  sunLon = sunLon % 360; if (sunLon < 0) sunLon += 360;
  return sunLon;
}

/** Convert Julian Day Number to JavaScript Date (UTC). */
export function jdeToDate(jde: number): Date {
  const ms = (jde - 2440587.5) * 86400000;
  return new Date(ms);
}

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
 * Calculate the approximate date of a solar term for a given year.
 */
export function solarTermDate(year: number, solarLon: number): Date {
  const refYear = (solarLon >= 280) ? year - 1 : year;
  const JDE_VE = 2451623.80984 + 365.242189623 * (refYear - 2000);
  const daysPerDeg = 365.242189623 / 360;
  const lon = ((solarLon - 0) + 360) % 360;
  let jde = JDE_VE + lon * daysPerDeg;

  for (let i = 0; i < 3; i++) {
    const sunLon = sunApparentLongitude(jde);
    let diff = solarLon - sunLon;
    if (diff > 180) diff -= 360;
    if (diff < -180) diff += 360;
    jde += diff * daysPerDeg;
  }

  return jdeToDate(jde);
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
  const REF_JD    = 2451545;
  const REF_INDEX = 55;
  const jd = dateToJD(date);
  const diff = Math.floor(jd) - Math.floor(REF_JD);
  const cycleIdx = ((diff + REF_INDEX) % 60 + 60) % 60;
  const stemIdx   = cycleIdx % 10;
  const branchIdx = cycleIdx % 12;
  return { stemIdx, branchIdx, cycleIdx };
}

// ── Hour Pillar (時柱) ─────────────────────────────────────
export function hourBranchIndex(solarHour: number, solarMinute: number): number {
  const h = solarHour + solarMinute / 60;
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

export function hourPillar(solarDate: Date, dayStemIdx: number): { stemIdx: number; branchIdx: number } {
  const h = solarDate.getUTCHours();
  const m = solarDate.getUTCMinutes();
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
  localDate: Date,
  mp: { stemIdx: number; branchIdx: number },
  yearStemIdx: number,
  male: boolean
): DaYun | null {
  const yearStemYin = STEMS[yearStemIdx].yin;
  const forward = male !== yearStemYin;

  const jie = findNearestJie(localDate, forward);
  if (!jie) return null;

  const MS_PER_DAY = 86400000;
  const daysDiff = Math.abs(jie.date.getTime() - localDate.getTime()) / MS_PER_DAY;

  const startYears  = Math.floor(daysDiff / 3);
  const remainDays  = daysDiff % 3;
  const startMonths = Math.min(11, Math.round(remainDays * 4));

  const monthCycleIdx = ganzhi2cycle(mp.stemIdx, mp.branchIdx);
  const birthYear = localDate.getUTCFullYear();

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

  return { forward, startYears, startMonths, jie, pillars };
}

// ── Main Calculation Entry Point ───────────────────────────
export function computeBazi(
  dateStr: string,
  timeStr: string | null,
  tzOffsetMin: number,
  male: boolean
): BaziResult {
  const [y, mo, d] = dateStr.split('-').map(Number);
  const [hr, mn] = timeStr ? timeStr.split(':').map(Number) : [12, 0];

  const utcMs   = Date.UTC(y, mo - 1, d, hr, mn) - tzOffsetMin * 60 * 1000;
  const utcDate = new Date(utcMs);
  const localDate = new Date(utcMs + tzOffsetMin * 60 * 1000);

  const yp = yearPillar(localDate);
  const mp = monthPillar(localDate, yp.stemIdx);
  const dp = dayPillar(localDate);

  const hp = timeStr ? hourPillar(utcDate, dp.stemIdx) : null;

  const daYun = computeDaYun(localDate, { stemIdx: mp.stemIdx, branchIdx: mp.branchIdx }, yp.stemIdx, male);

  const sign    = tzOffsetMin >= 0 ? '+' : '−';
  const absMins = Math.abs(tzOffsetMin);
  const tzLabel = `UTC${sign}${Math.floor(absMins / 60)}:${String(absMins % 60).padStart(2, '0')}`;

  return {
    utcDate,
    localDate,
    tzLabel,
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
export function getBranchMainStem(branchIdx: number): number {
  const mainQi = [8, 5, 0, 1, 4, 2, 3, 5, 6, 7, 4, 8];
  return mainQi[branchIdx];
}

export function elementToStructure(el: string, dmEl: string): string {
  if (el === dmEl)               return 'companion';
  if (el === generates(dmEl))    return 'output';
  if (el === controls(dmEl))     return 'wealth';
  if (el === controlledBy(dmEl)) return 'influence';
  if (el === generatedBy(dmEl))  return 'resource';
  return 'companion';
}

export interface ChartData {
  structureCounts: Record<string, number>;
  structureEls: Record<string, string>;
  tenGodsCount: Record<string, number>;
}

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
    // Surface stem (including Day Master self as companion)
    structureCounts[elementToStructure(p.stem.element, dmEl)]++;
    if (k !== 'day') {
      const tg = tenGod(dmStemIdx, p.stemIdx);
      tenGodsCount[tg.zh] = (tenGodsCount[tg.zh] || 0) + 1;
    }
    // ALL hidden stems in branch
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
