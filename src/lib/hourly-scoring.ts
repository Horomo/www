import {
  BRANCHES,
  computeBazi,
  computeChartData,
  controls,
  controlledBy,
  generatedBy,
  getActiveDaYunPillarForDate,
  getBranchMainStem,
  hourPillar,
  STEMS,
  tenGod,
  type DaYun,
  type DaYunPillar,
  type ChartData,
  type Stem,
  type Branch,
  type TenGod,
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

export interface DaYunElementInfluence {
  source: 'stem' | 'branch';
  element: string;
  relation: 'usefulGod' | 'favorable' | 'neutral' | 'unfavorable' | 'strongClash';
  modifier: number;
}

export interface ActiveDaYunSummary {
  cycleIdx: number;
  stem: Stem;
  branch: Branch;
  ageStart: number;
  ageEnd: number;
  yearStart: number;
  yearEnd: number;
  stemTenGod: TenGod;
  branchTenGod: TenGod;
  elements: {
    stem: string;
    branch: string;
  };
  elementInfluences: DaYunElementInfluence[];
  modifier: number;
  categoryModifier: HourlyScoreCategories;
}

export interface HourSlotScore {
  branchIdx: number;
  branch: Branch;
  stemIdx: number;
  stem: Stem;
  hourLabel: string;
  localStartLabel: string;
  localEndLabel: string;
  tenGod: TenGod;
  baseScore: number;
  daYunModifier: number;
  finalScore: number;
  totalScore: number;
  baseCategoryScores: HourlyScoreCategories;
  daYunCategoryModifier: HourlyScoreCategories;
  categoryScores: HourlyScoreCategories;
  explanation: string | null;
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
  activeDaYun: ActiveDaYunSummary | null;
  strongestPositiveSlots: HourSlotScore[];
  strongestNegativeSlots: HourSlotScore[];
  slots: HourSlotScore[];
}

export interface ComputeHourlyScoringOptions {
  includeDaYun?: boolean;
}

const BRANCH_START_HOURS = [23, 1, 3, 5, 7, 9, 11, 13, 15, 17, 19, 21];
export const HOUR_SLOT_LABELS = [
  '23:00-01:00',
  '01:00-03:00',
  '03:00-05:00',
  '05:00-07:00',
  '07:00-09:00',
  '09:00-11:00',
  '11:00-13:00',
  '13:00-15:00',
  '15:00-17:00',
  '17:00-19:00',
  '19:00-21:00',
  '21:00-23:00',
];

function pad2(value: number) {
  return String(value).padStart(2, '0');
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function emptyCategoryScores(): HourlyScoreCategories {
  return { career: 0, wealth: 0, love: 0, health: 0 };
}

function sumCategoryScores(base: HourlyScoreCategories, modifier: HourlyScoreCategories): HourlyScoreCategories {
  return {
    career: base.career + modifier.career,
    wealth: base.wealth + modifier.wealth,
    love: base.love + modifier.love,
    health: base.health + modifier.health,
  };
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

function normalizeTenGodLabel(tenGodLabel: string) {
  switch (tenGodLabel) {
    case 'Direct Officer':
    case '正官':
      return 'Direct Officer';
    case '7 Killings':
    case '偏官':
      return '7 Killings';
    case 'Eating God':
    case '食神':
      return 'Eating God';
    case 'Hurting Officer':
    case '傷官':
      return 'Hurting Officer';
    case 'Direct Wealth':
    case '正財':
      return 'Direct Wealth';
    case 'Indirect Wealth':
    case '偏財':
      return 'Indirect Wealth';
    case 'Rob Wealth':
    case '比肩':
      return 'Rob Wealth';
    case 'Competitor':
    case '劫財':
      return 'Competitor';
    case 'Direct Resource':
    case '正印':
      return 'Direct Resource';
    case 'Indirect Resource':
    case '偏印':
      return 'Indirect Resource';
    default:
      return tenGodLabel;
  }
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

export function getCategoryContributions(tenGodLabel: string, score: number): HourlyScoreCategories {
  {
    const normalized = normalizeTenGodLabel(tenGodLabel);
    const isCareer = normalized === 'Direct Officer' || normalized === '7 Killings' || normalized === 'Eating God' || normalized === 'Hurting Officer';
    const isWealth = normalized === 'Direct Wealth' || normalized === 'Indirect Wealth';
    const isRobWealth = normalized === 'Competitor';
    const isLove = normalized === 'Rob Wealth' || normalized === 'Competitor' || normalized === 'Eating God' || normalized === 'Hurting Officer' || normalized === 'Direct Officer' || normalized === '7 Killings';
    const isHealth = normalized === 'Direct Resource' || normalized === 'Indirect Resource';

    return {
      career: isCareer ? score : 0,
      wealth: isRobWealth ? -score : isWealth ? score : 0,
      love: isLove ? score : 0,
      health: isHealth ? score : 0,
    };
  }
  const tenGodZh = normalizeTenGodLabel(tenGodLabel);
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

function classifyDaYunInfluence(
  element: string,
  usefulGod: string,
  favorableElements: string[],
  unfavorableElements: string[],
  dmElement: string,
  dmStrength: DayMasterStrength,
): DaYunElementInfluence['relation'] {
  if (isStrongClash(dmElement, dmStrength, element)) {
    return 'strongClash';
  }

  if (element === usefulGod) {
    return 'usefulGod';
  }

  if (favorableElements.includes(element)) {
    return 'favorable';
  }

  if (unfavorableElements.includes(element)) {
    return 'unfavorable';
  }

  return 'neutral';
}

function getDaYunElementModifier(relation: DaYunElementInfluence['relation']) {
  switch (relation) {
    case 'usefulGod':
    case 'favorable':
      return 1;
    case 'unfavorable':
      return -1;
    case 'strongClash':
      return -2;
    default:
      return 0;
  }
}

export function getActiveDaYunPillar(
  daYun: DaYun | null,
  birthDate: Date,
  referenceDate: Date,
  timezone: string,
): DaYunPillar | null {
  if (!daYun) return null;

  return getActiveDaYunPillarForDate(daYun, birthDate, referenceDate, timezone);
}

export function getDaYunCategoryModifier(dayMasterStemIdx: number, activeDaYun: DaYunPillar | null): HourlyScoreCategories {
  if (!activeDaYun) {
    return emptyCategoryScores();
  }

  const branchMainStemIdx = getBranchMainStem(activeDaYun.branchIdx);
  const stemContribution = getCategoryContributions(tenGod(dayMasterStemIdx, activeDaYun.stemIdx).en, 1);
  const branchContribution = getCategoryContributions(tenGod(dayMasterStemIdx, branchMainStemIdx).en, 1);
  const combined = sumCategoryScores(stemContribution, branchContribution);

  return {
    career: clamp(combined.career, -1, 1),
    wealth: clamp(combined.wealth, -1, 1),
    love: clamp(combined.love, -1, 1),
    health: clamp(combined.health, -1, 1),
  };
}

export function getDaYunModifier(
  dayMasterStemIdx: number,
  activeDaYun: DaYunPillar | null,
  usefulGod: string,
  favorableElements: string[],
  unfavorableElements: string[],
  dmElement: string,
  dmStrength: DayMasterStrength,
): ActiveDaYunSummary | null {
  if (!activeDaYun) {
    return null;
  }

  const stemTenGod = tenGod(dayMasterStemIdx, activeDaYun.stemIdx);
  const branchMainStemIdx = getBranchMainStem(activeDaYun.branchIdx);
  const branchTenGod = tenGod(dayMasterStemIdx, branchMainStemIdx);
  const elementInfluences: DaYunElementInfluence[] = [
    {
      source: 'stem' as const,
      element: activeDaYun.stem.element,
      relation: classifyDaYunInfluence(
        activeDaYun.stem.element,
        usefulGod,
        favorableElements,
        unfavorableElements,
        dmElement,
        dmStrength,
      ),
      modifier: 0,
    },
    {
      source: 'branch' as const,
      element: activeDaYun.branch.element,
      relation: classifyDaYunInfluence(
        activeDaYun.branch.element,
        usefulGod,
        favorableElements,
        unfavorableElements,
        dmElement,
        dmStrength,
      ),
      modifier: 0,
    },
  ].map((item): DaYunElementInfluence => ({
    ...item,
    modifier: getDaYunElementModifier(item.relation),
  }));

  let modifier = 0;
  if (elementInfluences.some((item) => item.relation === 'strongClash')) {
    modifier = -2;
  } else if (elementInfluences.some((item) => item.relation === 'usefulGod' || item.relation === 'favorable')) {
    modifier = 1;
  } else if (elementInfluences.some((item) => item.relation === 'unfavorable')) {
    modifier = -1;
  }

  return {
    cycleIdx: activeDaYun.cycleIdx,
    stem: activeDaYun.stem,
    branch: activeDaYun.branch,
    ageStart: activeDaYun.ageStart,
    ageEnd: activeDaYun.ageEnd,
    yearStart: activeDaYun.yearStart,
    yearEnd: activeDaYun.yearEnd,
    stemTenGod,
    branchTenGod,
    elements: {
      stem: activeDaYun.stem.element,
      branch: activeDaYun.branch.element,
    },
    elementInfluences,
    modifier,
    categoryModifier: getDaYunCategoryModifier(dayMasterStemIdx, activeDaYun),
  };
}

function describeBaseScore(slot: HourSlotScore, usefulGod: string) {
  if (slot.baseScore === 2) {
    return `The hour element ${slot.stem.element} matches your useful god ${usefulGod}, so the short-term trigger is strongly supportive.`;
  }

  if (slot.baseScore === 1) {
    return `The hour element ${slot.stem.element} is favorable for your natal balance, giving this slot a supportive short-term push.`;
  }

  if (slot.baseScore === -2) {
    return `The hour element ${slot.stem.element} hits the chart's strongest clash rule, so the short-term trigger is unusually tense.`;
  }

  if (slot.baseScore === -1) {
    return `The hour element ${slot.stem.element} falls into your unfavorable set, so the short-term trigger leans draining rather than supportive.`;
  }

  return `The hour element ${slot.stem.element} is neutral against your natal balance, so the short-term trigger is mixed.`;
}

function describeDaYun(activeDaYun: ActiveDaYunSummary | null, daYunModifier: number) {
  if (!activeDaYun) {
    return 'No active Da Yun modifier was applied.';
  }

  const periodLabel = `${activeDaYun.stem.zh}${activeDaYun.branch.zh} (${activeDaYun.yearStart}-${activeDaYun.yearEnd})`;
  if (daYunModifier > 0) {
    return `Your active Da Yun ${periodLabel} adds +${daYunModifier} as a long-term background because its ${activeDaYun.elements.stem}/${activeDaYun.elements.branch} elements support the useful or favorable side of the chart.`;
  }

  if (daYunModifier < 0) {
    return `Your active Da Yun ${periodLabel} adds ${daYunModifier} as a long-term background because its ${activeDaYun.elements.stem}/${activeDaYun.elements.branch} elements press against the natal balance.`;
  }

  return `Your active Da Yun ${periodLabel} is neutral here, so the long-term background does not change the short-term score.`;
}

function buildExtremeSlotExplanation(slot: HourSlotScore, usefulGod: string, activeDaYun: ActiveDaYunSummary | null) {
  return `${describeBaseScore(slot, usefulGod)} ${describeDaYun(activeDaYun, slot.daYunModifier)}`;
}

export function computeHourlyScoring(
  profile: AnalysisFormPayload,
  referenceDate: Date = new Date(),
  options: ComputeHourlyScoringOptions = {},
): HourlyScoringResult {
  const includeDaYun = options.includeDaYun ?? true;
  const longitude = parseFloat(profile.longitude);
  const currentDateParts = getLocalDateParts(referenceDate, profile.timezone);
  const currentDateString = `${currentDateParts.year}-${pad2(currentDateParts.month)}-${pad2(currentDateParts.day)}`;

  const todayBazi = computeBazi(currentDateString, '12:00', profile.timezone, longitude, profile.calculationMode);
  const currentDayStemIdx = todayBazi.pillars.day.stemIdx;

  const natalChart = computeBazi(profile.dob, profile.unknownTime ? null : profile.tob, profile.timezone, longitude, profile.calculationMode);
  const natalDmElement = natalChart.pillars.day.stem.element;
  const natalChartData = computeChartData(natalChart.pillars, natalChart.pillars.day.stemIdx, natalChart.unknownTime);
  const dmStrength = determineDayMasterStrength(natalChartData);

  const favoriteData = getFavorableUnfavorableElements(natalDmElement, dmStrength);
  const usefulGod = getUsefulGod(favoriteData.favorableElements);
  const activeDaYunPillar = includeDaYun
    ? getActiveDaYunPillar(natalChart.daYun, natalChart.tstDate, referenceDate, profile.timezone)
    : null;
  const activeDaYun = includeDaYun
    ? getDaYunModifier(
      natalChart.pillars.day.stemIdx,
      activeDaYunPillar,
      usefulGod,
      favoriteData.favorableElements,
      favoriteData.unfavorableElements,
      natalDmElement,
      dmStrength,
    )
    : null;

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
    const baseScore = scoreHourElement(
      hourElement,
      usefulGod,
      favoriteData.favorableElements,
      favoriteData.unfavorableElements,
      natalDmElement,
      dmStrength,
    );
    const daYunModifier = activeDaYun?.modifier ?? 0;
    const finalScore = clamp(baseScore + daYunModifier, -4, 4);

    const tenGodValue = tenGod(natalChart.pillars.day.stemIdx, slotHourStemIdx);
    const baseCategoryScores = getCategoryContributions(tenGodValue.en, baseScore);
    const daYunCategoryModifier = activeDaYun?.categoryModifier ?? emptyCategoryScores();
    const categoryScores = sumCategoryScores(baseCategoryScores, daYunCategoryModifier);
    const localStartLabel = formatLocalDateTime(slotBazi.utcDate, profile.timezone);
    const localEndLabel = formatLocalDateTime(new Date(slotBazi.utcDate.getTime() + 120 * 60000), profile.timezone);

    return {
      branchIdx,
      branch: BRANCHES[branchIdx],
      stemIdx: slotHourStemIdx,
      stem: STEMS[slotHourStemIdx],
      hourLabel: HOUR_SLOT_LABELS[branchIdx],
      localStartLabel,
      localEndLabel,
      tenGod: tenGodValue,
      baseScore,
      daYunModifier,
      finalScore,
      totalScore: finalScore,
      baseCategoryScores,
      daYunCategoryModifier,
      categoryScores,
      explanation: null,
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

  const bestScore = Math.max(...slots.map((slot) => slot.finalScore));
  const worstScore = Math.min(...slots.map((slot) => slot.finalScore));

  const strongestPositiveSlots = bestScore > 0 ? slots.filter((slot) => slot.finalScore === bestScore) : [];
  const strongestNegativeSlots = worstScore < 0 ? slots.filter((slot) => slot.finalScore === worstScore) : [];
  const extremeBranchIndexes = new Set([
    ...strongestPositiveSlots.map((slot) => slot.branchIdx),
    ...strongestNegativeSlots.map((slot) => slot.branchIdx),
  ]);
  const enrichedSlots = slots.map((slot) => ({
    ...slot,
    explanation: extremeBranchIndexes.has(slot.branchIdx)
      ? buildExtremeSlotExplanation(slot, usefulGod, activeDaYun)
      : null,
  }));

  return {
    currentDateLabel: formatLocalDate(referenceDate, profile.timezone),
    dmZh: natalChart.pillars.day.stem.zh,
    dmElement: natalDmElement,
    dmStrength,
    favorableElements: favoriteData.favorableElements,
    unfavorableElements: favoriteData.unfavorableElements,
    usefulGod,
    activeDaYun,
    strongestPositiveSlots: enrichedSlots.filter((slot) => strongestPositiveSlots.some((candidate) => candidate.branchIdx === slot.branchIdx)),
    strongestNegativeSlots: enrichedSlots.filter((slot) => strongestNegativeSlots.some((candidate) => candidate.branchIdx === slot.branchIdx)),
    slots: enrichedSlots,
  };
}

