import {
  BRANCHES,
  computeBazi,
  computeChartData,
  controls,
  controlledBy,
  generatedBy,
  hourPillar,
  STEMS,
  tenGod,
  type ChartData,
  type Stem,
  type Branch,
} from '@/lib/bazi';
import type { AnalysisFormPayload } from '@/lib/analysis-payload';

export type DayMasterStrength = 'weak' | 'balanced' | 'strong';

export interface HourlyScoreCategories {
  career: number;
  wealth: number;
  love: number;
  health: number;
}

export interface HourlyScoreMetadata {
  dmStrength: DayMasterStrength;
  dmElement: string;
  favorableElements: string[];
  unfavorableElements: string[];
  usefulGod: string;
  isStrongClash: boolean;
}

export interface HourSlotScore {
  branchIdx: number;
  branch: Branch;
  stemIdx: number;
  stem: Stem;
  hourLabel: string;
  localStartLabel: string;
  localEndLabel: string;
  tenGod: ReturnType<typeof tenGod>;
  totalScore: number;
  categoryScores: HourlyScoreCategories;
  debug: HourlyScoreMetadata;
}

export interface HourlyScoringResult {
  currentDateLabel: string;
  dmZh: string;
  dmElement: string;
  dmStrength: DayMasterStrength;
  favorableElements: string[];
  unfavorableElements: string[];
  usefulGod: string;
  strongestPositiveSlots: HourSlotScore[];
  strongestNegativeSlots: HourSlotScore[];
  slots: HourSlotScore[];
}

const BRANCH_START_HOURS = [23, 1, 3, 5, 7, 9, 11, 13, 15, 17, 19, 21];
const LABELS = [
  '23:00–01:00',
  '01:00–03:00',
  '03:00–05:00',
  '05:00–07:00',
  '07:00–09:00',
  '09:00–11:00',
  '11:00–13:00',
  '13:00–15:00',
  '15:00–17:00',
  '17:00–19:00',
  '19:00–21:00',
  '21:00–23:00',
];

function pad2(value: number) {
  return String(value).padStart(2, '0');
}

function formatLocalDateTime(date: Date, timezone: string): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(date).replace(',', '');
}

function formatLocalDate(date: Date, timezone: string): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour12: false,
  }).format(date).replace(',', '');
}

function getLocalDateParts(date: Date, timezone: string) {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  const parts = formatter.formatToParts(date);
  return {
    year: Number(parts.find((part) => part.type === 'year')?.value || '0'),
    month: Number(parts.find((part) => part.type === 'month')?.value || '0'),
    day: Number(parts.find((part) => part.type === 'day')?.value || '0'),
  };
}

export function determineDayMasterStrength(chartData: ChartData): DayMasterStrength {
  const support = chartData.structureCounts.companion + chartData.structureCounts.resource;
  const control = chartData.structureCounts.wealth + chartData.structureCounts.influence;

  if (support - control >= 2) return 'strong';
  if (control - support >= 2) return 'weak';
  return 'balanced';
}

export function getFavorableUnfavorableElements(dmElement: string, strength: DayMasterStrength) {
  if (strength === 'weak') {
    return {
      favorableElements: [dmElement, generatedBy(dmElement)],
      unfavorableElements: [controls(dmElement), controlledBy(dmElement)],
    };
  }

  if (strength === 'strong') {
    return {
      favorableElements: [controls(dmElement), controlledBy(dmElement)],
      unfavorableElements: [dmElement, generatedBy(dmElement)],
    };
  }

  // Balanced charts only assign favorable elements; the controlled element remains neutral.
  return {
    favorableElements: [dmElement, generatedBy(dmElement)],
    unfavorableElements: [],
  };
}

export function getUsefulGod(favorableElements: string[]): string {
  return favorableElements[0] ?? '';
}

export function isStrongClash(dmElement: string, strength: DayMasterStrength, hourElement: string) {
  if (strength === 'weak') {
    return hourElement === controls(dmElement);
  }

  if (strength === 'strong') {
    return hourElement === generatedBy(dmElement);
  }

  return hourElement === controlledBy(dmElement);
}

export function scoreHourElement(
  hourElement: string,
  usefulGod: string,
  favorableElements: string[],
  unfavorableElements: string[],
  dmElement: string,
  strength: DayMasterStrength,
) {
  // Scoring priority must be exact: strong clash first, useful god second,
  // favorable third, unfavorable fourth, and neutral last.
  // For weak charts, only a useful-god hour can also trigger the strong clash
  // override; otherwise the hour remains an ordinary unfavorable element.
  if (isStrongClash(dmElement, strength, hourElement) && (strength !== 'weak' || hourElement === usefulGod)) return -2;
  if (hourElement === usefulGod) return 2;
  if (favorableElements.includes(hourElement)) return 1;
  if (strength === 'strong' && hourElement === dmElement) return 0;
  if (unfavorableElements.includes(hourElement)) return -1;
  return 0;
}

export function getCategoryContributions(tenGodZh: string, score: number): HourlyScoreCategories {
  const isCareer = tenGodZh === '正官' || tenGodZh === '偏官' || tenGodZh === '食神' || tenGodZh === '傷官';
  const isWealth = tenGodZh === '正財' || tenGodZh === '偏財';
  const isRobWealth = tenGodZh === '劫財';
  const isLove = tenGodZh === '比肩' || tenGodZh === '劫財' || tenGodZh === '食神' || tenGodZh === '傷官' || tenGodZh === '正官' || tenGodZh === '偏官';
  const isHealth = tenGodZh === '正印' || tenGodZh === '偏印';

  return {
    career: isCareer ? score : 0,
    wealth: isRobWealth ? -score : isWealth ? score : 0,
    love: isLove ? score : 0,
    health: isHealth ? score : 0,
  };
}

function getBranchDateForSlot(localDateParts: { year: number; month: number; day: number }, branchIdx: number) {
  const slotHour = BRANCH_START_HOURS[branchIdx];
  const slotDayOffset = branchIdx === 0 ? -1 : 0;
  const date = new Date(Date.UTC(localDateParts.year, localDateParts.month - 1, localDateParts.day + slotDayOffset, 0, 0));
  date.setUTCDate(date.getUTCDate());
  return { date, slotHour };
}

export function computeHourlyScoring(profile: AnalysisFormPayload, referenceDate: Date = new Date()): HourlyScoringResult {
  const longitude = parseFloat(profile.longitude);
  const currentDateParts = getLocalDateParts(referenceDate, profile.timezone);
  const currentDateString = `${currentDateParts.year}-${pad2(currentDateParts.month)}-${pad2(currentDateParts.day)}`;

  const todayBazi = computeBazi(currentDateString, '12:00', profile.timezone, longitude, profile.calculationMode);
  const currentDayStemIdx = todayBazi.pillars.day.stemIdx;

  const natalDayMaster = computeBazi(profile.dob, profile.unknownTime ? null : profile.tob, profile.timezone, longitude, profile.calculationMode);
  const natalDmElement = natalDayMaster.pillars.day.stem.element;
  const natalChartData = computeChartData(natalDayMaster.pillars, natalDayMaster.pillars.day.stemIdx, natalDayMaster.unknownTime);
  const dmStrength = determineDayMasterStrength(natalChartData);

  // Placeholder because computeHourlyScoring needs a chartData parameter; this will be replaced soon.
  const favoriteData = getFavorableUnfavorableElements(natalDmElement, dmStrength);
  const usefulGod = getUsefulGod(favoriteData.favorableElements);

  const slots: HourSlotScore[] = BRANCH_START_HOURS.map((_, branchIdx) => {
    const { date: candidateDate, slotHour } = getBranchDateForSlot(currentDateParts, branchIdx);
    const localYear = candidateDate.getUTCFullYear();
    const localMonth = candidateDate.getUTCMonth() + 1;
    const localDay = candidateDate.getUTCDate();
    const slotDateStr = `${localYear}-${pad2(localMonth)}-${pad2(localDay)}`;
    const slotTimeStr = `${pad2(slotHour)}:00`;
    const slotBazi = computeBazi(slotDateStr, slotTimeStr, profile.timezone, longitude, profile.calculationMode);
    const slotTst = slotBazi.tstDate;
    const slotHourStemIdx = hourPillar(slotTst, currentDayStemIdx).stemIdx;

    const hourElement = STEMS[slotHourStemIdx].element;
    const totalScore = scoreHourElement(
      hourElement,
      usefulGod,
      favoriteData.favorableElements,
      favoriteData.unfavorableElements,
      natalDmElement,
      dmStrength,
    );

    const tenGodValue = tenGod(natalDayMaster.pillars.day.stemIdx, slotHourStemIdx);
    const categoryScores = getCategoryContributions(tenGodValue.zh, totalScore);
    const localStartLabel = formatLocalDateTime(slotBazi.utcDate, profile.timezone);
    const localEndLabel = formatLocalDateTime(new Date(slotBazi.utcDate.getTime() + 120 * 60000), profile.timezone);

    return {
      branchIdx,
      branch: BRANCHES[branchIdx],
      stemIdx: slotHourStemIdx,
      stem: STEMS[slotHourStemIdx],
      hourLabel: LABELS[branchIdx],
      localStartLabel,
      localEndLabel,
      tenGod: tenGodValue,
      totalScore,
      categoryScores,
      debug: {
        dmStrength,
        dmElement: natalDmElement,
        favorableElements: favoriteData.favorableElements,
        unfavorableElements: favoriteData.unfavorableElements,
        usefulGod,
        isStrongClash: isStrongClash(natalDmElement, dmStrength, hourElement),
      },
    };
  });

  const bestScore = Math.max(...slots.map((slot) => slot.totalScore));
  const worstScore = Math.min(...slots.map((slot) => slot.totalScore));

  const strongestPositiveSlots = bestScore > 0 ? slots.filter((slot) => slot.totalScore === bestScore) : [];
  const strongestNegativeSlots = worstScore < 0 ? slots.filter((slot) => slot.totalScore === worstScore) : [];

  return {
    currentDateLabel: formatLocalDate(referenceDate, profile.timezone),
    dmZh: natalDayMaster.pillars.day.stem.zh,
    dmElement: natalDmElement,
    dmStrength,
    favorableElements: favoriteData.favorableElements,
    unfavorableElements: favoriteData.unfavorableElements,
    usefulGod,
    strongestPositiveSlots,
    strongestNegativeSlots,
    slots,
  };
}
