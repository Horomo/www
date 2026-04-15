'use client';

import { useState } from 'react';

import Badge from '@/components/ui/Badge';
import {
  type ActiveDaYunSummary,
  type HourlyScoreCategories,
  type HourlyScoringResult,
  type HourSlotScore,
  type TransitLayerSummary,
} from '@/lib/hourly-scoring';

export const ACTIVE_DA_YUN_SEPARATOR = ' / ';
export const SLOT_SEPARATOR = ' - ';
export const SCORE_BREAKDOWN_SEPARATOR = ' | ';

type SlotTone = 'positive' | 'neutral' | 'negative';

const AREA_ORDER = ['career', 'wealth', 'love', 'health'] as const;
const AREA_EXAMPLE = '3 / 0 / 3 / 2';

const TEN_GOD_DESCRIPTIONS: Record<string, string> = {
  '比肩': 'Companion — reinforces self-reliance, peer support, and direct initiative.',
  '劫财': 'Rob Wealth — brings rivalry, assertiveness, and competition for shared resources.',
  '食神': 'Eating God — favors creativity, talent expression, and self-sustaining output.',
  '伤官': 'Hurting Officer — drives innovation, boldness, and unconventional approaches.',
  '正财': 'Direct Wealth — supports disciplined effort, stable returns, and practical reward.',
  '偏财': 'Indirect Wealth — opens windfall, opportunity, and fluid exchange.',
  '正官': 'Direct Officer — aligns with structure, responsibility, and lawful achievement.',
  '七杀': '7 Killings — brings pressure, sharp challenge, and competitive drive.',
  '偏官': 'Indirect Officer — channels bold pressure and testing circumstances.',
  '正印': 'Direct Resource — offers nurturing support, learning, and steady backing.',
  '偏印': 'Indirect Resource — activates unconventional knowledge and hidden ability.',
};

const LAYER_ROWS = [
  { key: 'base' as const, label: 'Base fit', sublabel: 'hour on its own' },
  { key: 'daYun' as const, label: '10-year', sublabel: 'Da Yun layer' },
  { key: 'year' as const, label: 'Year', sublabel: 'Liu Nian layer' },
  { key: 'month' as const, label: 'Month', sublabel: 'Liu Yue layer' },
  { key: 'day' as const, label: 'Day', sublabel: 'Liu Ri layer' },
];

export function formatActiveDaYunHeadline(scoringResult: ActiveDaYunSummary) {
  return `${scoringResult.stem.zh}${scoringResult.branch.zh} ages ${scoringResult.ageStart}-${scoringResult.ageEnd}`;
}

export function formatActiveDaYunElements(scoringResult: ActiveDaYunSummary) {
  return `${scoringResult.elements.stem} stem${ACTIVE_DA_YUN_SEPARATOR}${scoringResult.elements.branch} branch`;
}

export function formatSlotHeading(slot: HourSlotScore) {
  return `${slot.hourLabel}${SLOT_SEPARATOR}${slot.branch.animal} hour`;
}

export function formatSlotScoreBreakdown(slot: HourSlotScore) {
  return `Base fit ${formatSignedValue(slot.baseScore)}${SCORE_BREAKDOWN_SEPARATOR}10-year cycle ${formatSignedValue(slot.daYunModifier)}${SCORE_BREAKDOWN_SEPARATOR}Year ${formatSignedValue(slot.liuNianModifier)}${SCORE_BREAKDOWN_SEPARATOR}Month ${formatSignedValue(slot.liuYueModifier)}${SCORE_BREAKDOWN_SEPARATOR}Day ${formatSignedValue(slot.liuRiModifier)}${SCORE_BREAKDOWN_SEPARATOR}Final ${formatSignedValue(slot.finalScore)}`;
}

function formatSignedValue(value: number) {
  return `${value >= 0 ? '+' : ''}${value}`;
}

function formatLayerName(layer: TransitLayerSummary) {
  switch (layer.kind) {
    case 'liuNian':
      return 'Current year (Liu Nian)';
    case 'liuYue':
      return 'Current month (Liu Yue)';
    case 'liuRi':
      return 'Current day (Liu Ri)';
  }
}

function formatTransitLayerHeadline(layer: TransitLayerSummary) {
  return `${layer.stem.zh}${layer.branch.zh} ${formatLayerName(layer)}`;
}

function getScoreTone(score: number): SlotTone {
  if (score > 0) return 'positive';
  if (score < 0) return 'negative';
  return 'neutral';
}

function scoreChipClass(score: number) {
  const tone = getScoreTone(score);

  if (tone === 'positive') {
    return 'bg-[linear-gradient(135deg,rgba(145,242,228,0.86),rgba(255,255,255,0.9))] text-[#0d5d56] shadow-[inset_0_0_0_1px_rgba(13,93,86,0.08)]';
  }

  if (tone === 'negative') {
    return 'bg-[linear-gradient(135deg,rgba(255,223,227,0.94),rgba(255,255,255,0.92))] text-[#9b4f5d] shadow-[inset_0_0_0_1px_rgba(155,79,93,0.08)]';
  }

  return 'bg-[linear-gradient(135deg,rgba(240,247,247,0.95),rgba(255,255,255,0.9))] text-[#5d6d6b] shadow-[inset_0_0_0_1px_rgba(93,109,107,0.08)]';
}

function sectionEyebrow(label: string) {
  return <div className="text-[11px] uppercase tracking-[0.28em] text-[#0d5d56]/62">{label}</div>;
}

function SectionSurface({
  children,
  className = '',
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={`rounded-[2.6rem] bg-[linear-gradient(180deg,rgba(255,255,255,0.78),rgba(244,250,249,0.88))] px-6 py-7 shadow-[0_26px_64px_rgba(13,93,86,0.055)] md:px-8 md:py-9 ${className}`}>
      {children}
    </section>
  );
}

function metadataChip(label: string, value: string) {
  return (
    <div className="rounded-full bg-white/76 px-4 py-2 shadow-[inset_0_0_0_1px_rgba(13,93,86,0.08)]">
      <div className="text-[10px] uppercase tracking-[0.22em] text-[#5b6f6d]">{label}</div>
      <div className="mt-1 text-sm font-medium text-[#16302d]">{value}</div>
    </div>
  );
}

function formatAreaScores(scores: HourlyScoreCategories) {
  return `${scores.career} / ${scores.wealth} / ${scores.love} / ${scores.health}`;
}

function LayerSummaryCard({
  badge,
  title,
  description,
  modifier,
  elements,
  tenGods,
  categoryModifier,
}: {
  badge: string;
  title: string;
  description: string;
  modifier: number;
  elements: string;
  tenGods: string;
  categoryModifier: HourlyScoreCategories;
}) {
  return (
    <article className="grid gap-5 rounded-[2.2rem] bg-[linear-gradient(180deg,rgba(255,255,255,0.7),rgba(242,249,248,0.84))] p-6 shadow-[0_18px_42px_rgba(13,93,86,0.045)]">
      <div className="flex items-start justify-between gap-4">
        <div>
          <Badge tone="cyan">{badge}</Badge>
          <h3 className="mt-4 max-w-[16ch] font-serif text-[1.85rem] leading-[1.04] tracking-[-0.03em] text-[#16302d]">{title}</h3>
        </div>
        <div className={`inline-flex min-w-[78px] items-center justify-center rounded-full px-4 py-2 text-sm font-semibold ${scoreChipClass(modifier)}`}>
          {formatSignedValue(modifier)}
        </div>
      </div>

      <p className="max-w-xl text-sm leading-7 text-[#35514d]">{description}</p>

      <div className="grid gap-4 rounded-[1.7rem] bg-white/58 p-4 shadow-[inset_0_0_0_1px_rgba(13,93,86,0.05)]">
        <div className="flex items-start justify-between gap-4 text-sm">
          <span className="text-[11px] uppercase tracking-[0.18em] text-[#5b6f6d]">Elements</span>
          <span className="text-right font-medium text-[#16302d]">{elements}</span>
        </div>
        <div className="flex items-start justify-between gap-4 text-sm">
          <span className="text-[11px] uppercase tracking-[0.18em] text-[#5b6f6d]">Ten Gods</span>
          <span className="text-right font-medium text-[#16302d]">{tenGods}</span>
        </div>
        <div className="grid grid-cols-2 gap-2 pt-1 text-sm sm:grid-cols-4">
          <div className="rounded-[1.1rem] bg-[#f8fbfb] px-3 py-3">
            <div className="text-[10px] uppercase tracking-[0.18em] text-[#5b6f6d]">Career</div>
            <div className="mt-1 font-semibold text-[#16302d]">{formatSignedValue(categoryModifier.career)}</div>
          </div>
          <div className="rounded-[1.1rem] bg-[#f8fbfb] px-3 py-3">
            <div className="text-[10px] uppercase tracking-[0.18em] text-[#5b6f6d]">Wealth</div>
            <div className="mt-1 font-semibold text-[#16302d]">{formatSignedValue(categoryModifier.wealth)}</div>
          </div>
          <div className="rounded-[1.1rem] bg-[#f8fbfb] px-3 py-3">
            <div className="text-[10px] uppercase tracking-[0.18em] text-[#5b6f6d]">Love</div>
            <div className="mt-1 font-semibold text-[#16302d]">{formatSignedValue(categoryModifier.love)}</div>
          </div>
          <div className="rounded-[1.1rem] bg-[#f8fbfb] px-3 py-3">
            <div className="text-[10px] uppercase tracking-[0.18em] text-[#5b6f6d]">Health</div>
            <div className="mt-1 font-semibold text-[#16302d]">{formatSignedValue(categoryModifier.health)}</div>
          </div>
        </div>
      </div>
    </article>
  );
}

function ScorePill({ score }: { score: number }) {
  return (
    <span className={`inline-flex items-center rounded-full px-3 py-1.5 text-xs font-semibold ${scoreChipClass(score)}`}>
      {formatSignedValue(score)}
    </span>
  );
}

function BreakdownValue({ value }: { value: number }) {
  return (
    <span className={value > 0 ? 'font-semibold text-[#0d5d56]' : value < 0 ? 'font-semibold text-[#9b4f5d]' : 'font-semibold text-[#516665]'}>
      {formatSignedValue(value)}
    </span>
  );
}

function ExpandedRowDetail({ slot }: { slot: HourSlotScore }) {
  const layerValues = {
    base: slot.baseScore,
    daYun: slot.daYunModifier,
    year: slot.liuNianModifier,
    month: slot.liuYueModifier,
    day: slot.liuRiModifier,
  };

  return (
    <div className="grid gap-4 rounded-[1.4rem] bg-white/72 p-4 shadow-[inset_0_0_0_1px_rgba(13,93,86,0.06)] sm:grid-cols-[1fr_auto]">
      <div>
        <div className="text-[10px] uppercase tracking-[0.22em] text-[#5b6f6d]">Layer breakdown</div>
        <div className="mt-3 space-y-2">
          {LAYER_ROWS.map((layer) => (
            <div key={layer.key} className="flex items-center gap-3 text-sm">
              <div className="w-28 shrink-0">
                <span className="font-medium text-[#16302d]">{layer.label}</span>
                <span className="ml-1.5 text-[10px] text-[#5b6f6d]">{layer.sublabel}</span>
              </div>
              <BreakdownValue value={layerValues[layer.key]} />
              {/* TODO: per-layer explanation (data not currently available per-slot) */}
            </div>
          ))}
          <div className="flex items-center gap-3 border-t border-[#d9e9e5] pt-2 text-sm">
            <div className="w-28 shrink-0 font-medium text-[#16302d]">Final</div>
            <ScorePill score={slot.finalScore} />
          </div>
        </div>
      </div>

      <div className="space-y-4 sm:min-w-[196px]">
        <div>
          <div className="text-[10px] uppercase tracking-[0.22em] text-[#5b6f6d]">Life areas</div>
          <div className="mt-2 grid grid-cols-2 gap-2">
            {AREA_ORDER.map((area) => (
              <div key={area} className="rounded-[1rem] bg-[#f8fbfb] px-3 py-2">
                <div className="text-[10px] uppercase tracking-[0.18em] text-[#5b6f6d]">{area}</div>
                <div className="mt-0.5 text-sm font-semibold">
                  <BreakdownValue value={slot.categoryScores[area]} />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div>
          <div className="text-[10px] uppercase tracking-[0.22em] text-[#5b6f6d]">Role</div>
          <div className="mt-1.5 text-sm font-medium text-[#16302d]">{slot.tenGod.zh} {slot.tenGod.en}</div>
          <div className="mt-0.5 text-xs leading-5 text-[#5b6f6d]">
            {TEN_GOD_DESCRIPTIONS[slot.tenGod.zh] ?? 'Ten God role for this hour relative to your Day Master.'}
          </div>
        </div>
      </div>
    </div>
  );
}

function TableRow({
  slot,
  isExpanded,
  onToggle,
}: {
  slot: HourSlotScore;
  isExpanded: boolean;
  onToggle: () => void;
}) {
  const tone = getScoreTone(slot.finalScore);

  return (
    <>
      <tr
        onClick={onToggle}
        className={`cursor-pointer ${
          tone === 'positive'
            ? 'bg-[rgba(234,252,248,0.42)]'
            : tone === 'negative'
              ? 'bg-[rgba(255,243,245,0.56)]'
              : 'bg-white/38'
        }`}
      >
        <td className="rounded-l-[1.4rem] py-4 pl-5 pr-3">
          <div className="font-medium text-[#16302d]">{slot.hourLabel}</div>
          <div className="mt-1 text-xs text-[#5b6f6d]">{slot.localStartLabel} to {slot.localEndLabel}</div>
          <div className="mt-1 text-xs text-[#5b6f6d]">Hour pillar {slot.stem.zh}{slot.branch.zh} | {slot.branch.animal}</div>
        </td>
        <td className="px-3 py-4 text-sm text-[#16302d]">{slot.branch.animal}</td>
        <td className="px-3 py-4 text-sm text-[#16302d]">
          <div>{slot.tenGod.en}</div>
          <div className="mt-1 text-xs text-[#5b6f6d]">{slot.tenGod.zh}</div>
        </td>
        <td className="px-3 py-4 text-sm"><BreakdownValue value={slot.baseScore} /></td>
        <td className="px-3 py-4 text-sm"><BreakdownValue value={slot.daYunModifier} /></td>
        <td className="px-3 py-4 text-sm"><BreakdownValue value={slot.liuNianModifier} /></td>
        <td className="px-3 py-4 text-sm"><BreakdownValue value={slot.liuYueModifier} /></td>
        <td className="px-3 py-4 text-sm"><BreakdownValue value={slot.liuRiModifier} /></td>
        <td className="px-3 py-4 text-sm"><ScorePill score={slot.finalScore} /></td>
        <td className="rounded-r-[1.4rem] px-4 py-4 text-sm text-[#35514d]">
          {formatAreaScores(slot.categoryScores)}
        </td>
      </tr>
      <tr>
        <td colSpan={10} className="p-0">
          {/* Animate max-height so the panel slides in/out. The <tr> itself is always rendered
              to avoid table reflow; border-spacing-y-1 on the parent table compensates for
              the extra rows so the visual gap between main rows stays equivalent. */}
          <div
            className="overflow-hidden transition-all duration-200"
            style={{ maxHeight: isExpanded ? '600px' : '0' }}
          >
            <div className="px-2 pb-3 pt-1">
              <ExpandedRowDetail slot={slot} />
            </div>
          </div>
        </td>
      </tr>
    </>
  );
}

function MobilePriorityCard({ slot, label }: { slot: HourSlotScore; label: string }) {
  return (
    <article className="rounded-[1.85rem] bg-[linear-gradient(180deg,rgba(255,255,255,0.9),rgba(242,249,248,0.96))] p-5 shadow-[0_18px_38px_rgba(13,93,86,0.06)]">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-[11px] uppercase tracking-[0.24em] text-[#5b6f6d]">{label}</div>
          <h3 className="mt-2 font-serif text-[1.55rem] leading-none text-[#16302d]">{slot.hourLabel}</h3>
          <p className="mt-2 text-sm text-[#35514d]">Hour pillar {slot.stem.zh}{slot.branch.zh} | {slot.branch.animal} | {slot.tenGod.en}</p>
        </div>
        <ScorePill score={slot.finalScore} />
      </div>

      <div className="mt-4 grid grid-cols-3 gap-2">
        <div className="rounded-[1rem] bg-white/74 px-3 py-2">
          <div className="text-[10px] uppercase tracking-[0.18em] text-[#5b6f6d]">Base fit</div>
          <div className="mt-1 text-sm font-semibold text-[#16302d]">{formatSignedValue(slot.baseScore)}</div>
        </div>
        <div className="rounded-[1rem] bg-white/74 px-3 py-2">
          <div className="text-[10px] uppercase tracking-[0.18em] text-[#5b6f6d]">Time layers</div>
          <div className="mt-1 text-sm font-semibold text-[#16302d]">
            {formatSignedValue(slot.daYunModifier + slot.liuNianModifier + slot.liuYueModifier + slot.liuRiModifier)}
          </div>
        </div>
        <div className="rounded-[1rem] bg-white/74 px-3 py-2">
          <div className="text-[10px] uppercase tracking-[0.18em] text-[#5b6f6d]">Final</div>
          <div className="mt-1 text-sm font-semibold text-[#16302d]">{formatSignedValue(slot.finalScore)}</div>
        </div>
      </div>

      {slot.explanation ? <p className="mt-4 text-sm leading-7 text-[#35514d]">{slot.explanation}</p> : null}
    </article>
  );
}

function MobileSlotAccordion({ slots }: { slots: HourSlotScore[] }) {
  return (
    <div className="space-y-3">
      {slots.map((slot) => (
        <details key={slot.branchIdx} className="rounded-[1.4rem] bg-white/78 p-4 shadow-[inset_0_0_0_1px_rgba(13,93,86,0.06)]">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-4">
            <div>
              <div className="text-sm font-medium text-[#16302d]">{slot.hourLabel}</div>
              <div className="mt-1 text-xs text-[#5b6f6d]">{slot.localStartLabel} to {slot.localEndLabel}</div>
            </div>
            <ScorePill score={slot.finalScore} />
          </summary>
          <div className="mt-4 space-y-3 border-t border-[#d9e9e5] pt-4">
            <div className="text-sm text-[#35514d]">Hour pillar {slot.stem.zh}{slot.branch.zh} | {slot.branch.animal} | {slot.tenGod.en}</div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="rounded-full bg-[#f7fbfb] px-3 py-2">Base fit <span className="font-semibold text-[#16302d]">{formatSignedValue(slot.baseScore)}</span></div>
              <div className="rounded-full bg-[#f7fbfb] px-3 py-2">10-year cycle <span className="font-semibold text-[#16302d]">{formatSignedValue(slot.daYunModifier)}</span></div>
              <div className="rounded-full bg-[#f7fbfb] px-3 py-2">Year <span className="font-semibold text-[#16302d]">{formatSignedValue(slot.liuNianModifier)}</span></div>
              <div className="rounded-full bg-[#f7fbfb] px-3 py-2">Month <span className="font-semibold text-[#16302d]">{formatSignedValue(slot.liuYueModifier)}</span></div>
              <div className="rounded-full bg-[#f7fbfb] px-3 py-2">Day <span className="font-semibold text-[#16302d]">{formatSignedValue(slot.liuRiModifier)}</span></div>
              <div className="rounded-full bg-[#f7fbfb] px-3 py-2">Life areas <span className="font-semibold text-[#16302d]">{formatAreaScores(slot.categoryScores)}</span></div>
            </div>
          </div>
        </details>
      ))}
    </div>
  );
}

function InsightPanel({
  title,
  eyebrow,
  description,
  sharedContext,
  slots,
  tone,
}: {
  title: string;
  eyebrow: string;
  description: string;
  sharedContext: string | null;
  slots: HourSlotScore[];
  tone: 'positive' | 'negative';
}) {
  return (
    <section className="rounded-[2.2rem] bg-[linear-gradient(180deg,rgba(255,255,255,0.76),rgba(245,250,249,0.9))] p-6 shadow-[0_18px_40px_rgba(13,93,86,0.045)] md:p-7">
      {sectionEyebrow(eyebrow)}
      <h3 className="mt-3 font-serif text-[1.95rem] leading-[1.02] tracking-[-0.03em] text-[#16302d]">{title}</h3>
      <p className="mt-3 max-w-2xl text-sm leading-7 text-[#35514d]">{description}</p>
      {sharedContext ? (
        <p className="mt-3 max-w-2xl text-sm leading-7 text-[#5b6f6d]">{sharedContext}</p>
      ) : null}
      <div className="mt-6 space-y-4">
        {slots.map((slot) => (
          <article key={slot.branchIdx} className={`rounded-[1.7rem] px-4 py-5 ${tone === 'positive' ? 'bg-[linear-gradient(180deg,rgba(236,252,247,0.8),rgba(255,255,255,0.72))]' : 'bg-[linear-gradient(180deg,rgba(255,244,246,0.82),rgba(255,255,255,0.74))]'} shadow-[inset_0_0_0_1px_rgba(13,93,86,0.04)]`}>
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="text-[11px] uppercase tracking-[0.22em] text-[#5b6f6d]">{slot.localStartLabel} to {slot.localEndLabel}</div>
                <div className="mt-2 text-base font-semibold text-[#16302d]">{formatSlotHeading(slot)}</div>
                <div className="mt-2 text-sm text-[#35514d]">Hour pillar {slot.stem.zh}{slot.branch.zh} | {slot.branch.animal} | {slot.tenGod.en}</div>
              </div>
              <ScorePill score={slot.finalScore} />
            </div>
            <div className="mt-4 text-[11px] uppercase tracking-[0.16em] text-[#5b6f6d]">{formatSlotScoreBreakdown(slot)}</div>
            {slot.explanation ? <p className="mt-3 text-sm leading-7 text-[#35514d]">{slot.explanation}</p> : null}
          </article>
        ))}
      </div>
    </section>
  );
}

function SlotTable({ slots }: { slots: HourSlotScore[] }) {
  const [expandedIdx, setExpandedIdx] = useState<number | null>(null);

  function handleToggle(branchIdx: number) {
    setExpandedIdx((current) => (current === branchIdx ? null : branchIdx));
  }

  return (
    <div className="cosmic-scrollbar mt-7 overflow-x-auto pb-1">
      {/* border-spacing-y-1 (4px): each expansion <tr> adds 4px above + 4px below = 8px gap,
          matching the visual row gap of the original border-spacing-y-2 (8px). */}
      <table className="min-w-full border-separate border-spacing-y-1 text-left">
        <thead>
          <tr className="text-[11px] uppercase tracking-[0.22em] text-[#5b6f6d]">
            <th className="px-4 py-2 font-medium">Slot</th>
            <th className="px-3 py-2 font-medium">Animal</th>
            <th className="px-3 py-2 font-medium">Role</th>
            <th className="px-3 py-2 font-medium">
              <div>Base fit</div>
              <div className="mt-0.5 text-[10px] normal-case tracking-normal text-[#5b6f6d]/60">hour on its own</div>
            </th>
            <th className="px-3 py-2 font-medium">
              <div>10-year</div>
              <div className="mt-0.5 text-[10px] normal-case tracking-normal text-[#5b6f6d]/60">Da Yun layer</div>
            </th>
            <th className="px-3 py-2 font-medium">
              <div>Year</div>
              <div className="mt-0.5 text-[10px] normal-case tracking-normal text-[#5b6f6d]/60">Liu Nian layer</div>
            </th>
            <th className="px-3 py-2 font-medium">
              <div>Month</div>
              <div className="mt-0.5 text-[10px] normal-case tracking-normal text-[#5b6f6d]/60">Liu Yue layer</div>
            </th>
            <th className="px-3 py-2 font-medium">
              <div>Day</div>
              <div className="mt-0.5 text-[10px] normal-case tracking-normal text-[#5b6f6d]/60">Liu Ri layer</div>
            </th>
            <th className="px-3 py-2 font-medium">
              <div>Final</div>
              <div className="mt-0.5 text-[10px] normal-case tracking-normal text-[#5b6f6d]/60">all layers combined</div>
            </th>
            <th className="px-3 py-2 font-medium">
              <div>Life areas</div>
              <div className="mt-0.5 text-[10px] normal-case tracking-normal text-[#5b6f6d]/60">career / wealth / love / health</div>
            </th>
          </tr>
        </thead>
        <tbody>
          {slots.map((slot) => (
            <TableRow
              key={slot.branchIdx}
              slot={slot}
              isExpanded={expandedIdx === slot.branchIdx}
              onToggle={() => handleToggle(slot.branchIdx)}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function HourlyScoringResultContent({ scoringResult }: { scoringResult: HourlyScoringResult }) {
  const mobilePrioritySlots = [
    scoringResult.strongestPositiveSlots[0],
    scoringResult.strongestNegativeSlots[0],
  ].filter((slot): slot is HourSlotScore => Boolean(slot));

  const remainingMobileSlots = scoringResult.slots.filter(
    (slot) => !mobilePrioritySlots.some((prioritySlot) => prioritySlot.branchIdx === slot.branchIdx),
  );

  return (
    <div className="space-y-8 md:space-y-10">
      <SectionSurface>
        <div className="grid gap-10 xl:grid-cols-[minmax(0,1.2fr)_minmax(320px,0.8fr)] xl:items-start">
          <div className="pr-2 lg:pr-8">
            {sectionEyebrow("Today's Celestial Briefing")}
            <h2 className="mt-3 max-w-[14ch] font-serif text-[2.35rem] leading-[0.98] tracking-[-0.035em] text-[#16302d] md:text-[3.45rem]">
              BaZi 2-hour scoring for {scoringResult.currentDateLabel}
            </h2>
            <p className="mt-5 max-w-2xl text-sm leading-8 text-[#35514d] md:text-[15px]">
              Each row is one local two-hour window. The slot starts with its own base fit, then your 10-year cycle, current year, current month, and current day add context on top.
            </p>
            <div className="mt-6 hidden max-w-xl grid-cols-3 gap-3 text-[11px] uppercase tracking-[0.18em] text-[#5b6f6d] md:grid">
              <div className="border-t border-[#cfe3de] pt-3">Two-hour slot</div>
              <div className="border-t border-[#cfe3de] pt-3">Timing layers</div>
              <div className="border-t border-[#cfe3de] pt-3">Combined score</div>
            </div>
          </div>

          <div className="relative overflow-hidden rounded-[2.2rem] bg-[linear-gradient(160deg,rgba(232,248,244,0.86),rgba(255,255,255,0.84)_54%,rgba(247,252,252,0.92))] p-6 shadow-[inset_0_0_0_1px_rgba(13,93,86,0.06)]">
            <div className="absolute right-0 top-0 h-28 w-28 rounded-full bg-[radial-gradient(circle,rgba(145,242,228,0.42),transparent_70%)]" />
            {sectionEyebrow('Profile Summary')}
            <div className="mt-4 flex items-end justify-between gap-4">
              <div>
                <div className="text-sm text-[#5b6f6d]">Day Master</div>
                <div className="mt-1 font-serif text-[2.4rem] leading-none text-[#16302d]">{scoringResult.dmZh}</div>
              </div>
              <div className="rounded-full bg-[#0d5d56] px-4 py-2 text-xs uppercase tracking-[0.18em] text-white/90">
                {scoringResult.dmElement}
              </div>
            </div>
            <div className="mt-6 flex flex-wrap gap-2.5">
              {metadataChip('Strength', scoringResult.dmStrength)}
              {metadataChip('Useful God', scoringResult.usefulGod)}
              {metadataChip('Favorable', scoringResult.favorableElements.join(', '))}
            </div>
            <div className="mt-6 rounded-[1.6rem] bg-white/62 p-4 text-sm leading-7 text-[#35514d] shadow-[inset_0_0_0_1px_rgba(13,93,86,0.05)]">
              Unfavorable elements: <span className="font-medium text-[#16302d]">{scoringResult.unfavorableElements.join(', ')}</span>
            </div>
          </div>
        </div>
      </SectionSurface>

      <section className="space-y-5">
        <div className="px-1 md:max-w-3xl">
          {sectionEyebrow('Timing Context')}
          <h2 className="mt-3 font-serif text-[2.1rem] leading-[1.03] tracking-[-0.03em] text-[#16302d]">Layered time influences</h2>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-[#35514d]">
            These layers affect every slot in the same way for the selected day. The hour is the local trigger; the time layers are the background conditions around it.
          </p>
        </div>
        <div className="grid gap-4 xl:grid-cols-2">
          {scoringResult.activeDaYun ? (
            <LayerSummaryCard
              badge="10-year cycle"
              title={formatActiveDaYunHeadline(scoringResult.activeDaYun)}
              description={`This is your current Da Yun, the 10-year cycle running through ${scoringResult.activeDaYun.yearStart}-${scoringResult.activeDaYun.yearEnd}. It is the slowest background layer behind every slot.`}
              modifier={scoringResult.activeDaYun.modifier}
              elements={formatActiveDaYunElements(scoringResult.activeDaYun)}
              tenGods={`${scoringResult.activeDaYun.stemTenGod.en} / ${scoringResult.activeDaYun.branchTenGod.en}`}
              categoryModifier={scoringResult.activeDaYun.categoryModifier}
            />
          ) : null}

          {scoringResult.liuNian ? (
            <LayerSummaryCard
              badge="Current year"
              title={formatTransitLayerHeadline(scoringResult.liuNian)}
              description="This is the current year layer, also called Liu Nian. It adds a year-level push or drag to every slot without replacing the hour itself."
              modifier={scoringResult.liuNian.modifier}
              elements={`${scoringResult.liuNian.elements.stem} stem / ${scoringResult.liuNian.elements.branch} branch`}
              tenGods={`${scoringResult.liuNian.stemTenGod.en} / ${scoringResult.liuNian.branchTenGod.en}`}
              categoryModifier={scoringResult.liuNian.categoryModifier}
            />
          ) : null}

          {scoringResult.liuYue ? (
            <LayerSummaryCard
              badge="Current month"
              title={formatTransitLayerHeadline(scoringResult.liuYue)}
              description="This is the current month layer, also called Liu Yue. It is a shorter-term influence sitting on top of the year and 10-year cycle."
              modifier={scoringResult.liuYue.modifier}
              elements={`${scoringResult.liuYue.elements.stem} stem / ${scoringResult.liuYue.elements.branch} branch`}
              tenGods={`${scoringResult.liuYue.stemTenGod.en} / ${scoringResult.liuYue.branchTenGod.en}`}
              categoryModifier={scoringResult.liuYue.categoryModifier}
            />
          ) : null}

          {scoringResult.liuRi ? (
            <LayerSummaryCard
              badge="Current day"
              title={formatTransitLayerHeadline(scoringResult.liuRi)}
              description="This is the current day layer, also called Liu Ri. It is the closest shared background before the two-hour slot takes over."
              modifier={scoringResult.liuRi.modifier}
              elements={`${scoringResult.liuRi.elements.stem} stem / ${scoringResult.liuRi.elements.branch} branch`}
              tenGods={`${scoringResult.liuRi.stemTenGod.en} / ${scoringResult.liuRi.branchTenGod.en}`}
              categoryModifier={scoringResult.liuRi.categoryModifier}
            />
          ) : null}
        </div>
      </section>

      <SectionSurface>
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1.05fr)_minmax(320px,0.95fr)]">
          <div>
            {sectionEyebrow('How To Read This')}
            <h2 className="mt-3 font-serif text-[2.1rem] leading-[1.03] tracking-[-0.03em] text-[#16302d]">What each result is telling you</h2>
            <div className="mt-5 grid gap-3">
              <div className="rounded-[1.5rem] bg-white/78 px-4 py-4 text-sm leading-7 text-[#35514d] shadow-[inset_0_0_0_1px_rgba(13,93,86,0.05)]">
                <span className="font-semibold text-[#16302d]">Slot:</span> one local two-hour window. If you see a stem, branch, animal, or Ten God role, that is simply the hour&apos;s BaZi identity label.
              </div>
              <div className="rounded-[1.5rem] bg-white/78 px-4 py-4 text-sm leading-7 text-[#35514d] shadow-[inset_0_0_0_1px_rgba(13,93,86,0.05)]">
                <span className="font-semibold text-[#16302d]">Base fit:</span> your personal baseline match with that hour before broader timing layers are added.
              </div>
              <div className="rounded-[1.5rem] bg-white/78 px-4 py-4 text-sm leading-7 text-[#35514d] shadow-[inset_0_0_0_1px_rgba(13,93,86,0.05)]">
                <span className="font-semibold text-[#16302d]">Da Yun:</span> your current 10-year cycle. <span className="font-semibold text-[#16302d]">Year, Month, and Day</span> are the shorter background layers for the selected date.
              </div>
              <div className="rounded-[1.5rem] bg-white/78 px-4 py-4 text-sm leading-7 text-[#35514d] shadow-[inset_0_0_0_1px_rgba(13,93,86,0.05)]">
                <span className="font-semibold text-[#16302d]">Final score:</span> the combined result after Base + Da Yun + Year + Month + Day. Higher positive values suggest more support. Lower negative values suggest more friction. This is a timing signal, not a guarantee.
              </div>
            </div>
          </div>
          <div className="rounded-[2rem] bg-[linear-gradient(180deg,rgba(236,250,247,0.76),rgba(255,255,255,0.74))] p-6 shadow-[inset_0_0_0_1px_rgba(13,93,86,0.05)]">
            <div className="text-[11px] uppercase tracking-[0.22em] text-[#5b6f6d]">Life Area Scores</div>
            <h3 className="mt-3 font-serif text-[1.6rem] leading-[1.08] text-[#16302d]">How to read the area numbers</h3>
            <p className="mt-4 text-sm leading-7 text-[#35514d]">
              Life areas always appear in this order: {AREA_ORDER.join(' / ')}. An example like <span className="font-semibold text-[#16302d]">{AREA_EXAMPLE}</span> means career +3, wealth 0, love +3, health +2.
            </p>
            <div className="mt-5 space-y-3 text-sm text-[#35514d]">
              <div className="border-t border-[#d8e8e4] pt-3">Higher numbers mean that area is getting more support from the slot and the active time layers.</div>
              <div className="border-t border-[#d8e8e4] pt-3">Lower or negative numbers mean that area is carrying more pressure or resistance.</div>
              <div className="border-t border-[#d8e8e4] pt-3">These area scores are a separate lens on the same timing, not an extra hidden prediction.</div>
            </div>
          </div>
        </div>
      </SectionSurface>

      <SectionSurface className="hidden lg:block">
        <div className="grid gap-10 xl:grid-cols-[minmax(0,1fr)_minmax(280px,0.42fr)]">
          <div>
            {sectionEyebrow('Hourly Editorial Table')}
            <h2 className="mt-3 font-serif text-[2.2rem] leading-[1.02] tracking-[-0.03em] text-[#16302d]">Two-hour slot flow</h2>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-[#35514d]">
              Read left to right: start with the slot itself, then follow how the time layers raise or lower the final result.
            </p>
            <SlotTable slots={scoringResult.slots} />
          </div>

          <aside className="rounded-[2rem] bg-[linear-gradient(180deg,rgba(236,250,247,0.76),rgba(255,255,255,0.74))] p-6 shadow-[inset_0_0_0_1px_rgba(13,93,86,0.05)]">
            {sectionEyebrow('Reading Guide')}
            <h3 className="mt-3 font-serif text-[1.6rem] leading-[1.08] text-[#16302d]">How to read the table</h3>
            <p className="mt-4 text-sm leading-7 text-[#35514d]">
              Positive numbers suggest the timing is more supportive. Negative numbers suggest more friction. Compare slots first by Final, then look at the area scores if you care about a specific part of life.
            </p>
            <div className="mt-6 space-y-3 text-sm text-[#35514d]">
              <div className="border-t border-[#d8e8e4] pt-3">Base fit is the hour on its own. The 10-year, year, month, and day columns show what each timing layer added or removed.</div>
              <div className="border-t border-[#d8e8e4] pt-3">Role is the Ten God label for that hour relative to your Day Master.</div>
              <div className="border-t border-[#d8e8e4] pt-3">Life areas always read as career / wealth / love / health.</div>
            </div>
          </aside>
        </div>
      </SectionSurface>

      <SectionSurface className="lg:hidden">
        <div className="px-1">
          {sectionEyebrow('Mobile Slot Flow')}
          <h2 className="mt-3 font-serif text-[2.05rem] leading-[1.03] tracking-[-0.03em] text-[#16302d]">Two-hour slot flow</h2>
          <p className="mt-3 text-sm leading-7 text-[#35514d]">
            Mobile shows the clearest supportive and challenging windows first, then lets you expand the full list when you want the complete table in a smaller format.
          </p>
        </div>

        <div className="mt-6 grid gap-4">
          {mobilePrioritySlots.map((slot) => (
            <MobilePriorityCard
              key={slot.branchIdx}
              slot={slot}
              label={slot.finalScore >= 0 ? 'Most supportive' : 'Most challenging'}
            />
          ))}
        </div>

        <div className="mt-5">
          <details className="rounded-[1.8rem] bg-white/72 p-4 shadow-[inset_0_0_0_1px_rgba(13,93,86,0.05)]">
            <summary className="cursor-pointer list-none font-medium text-[#16302d]">View all time slots</summary>
            <div className="mt-4">
              <MobileSlotAccordion slots={remainingMobileSlots} />
            </div>
          </details>
        </div>
      </SectionSurface>

      <div className="grid gap-6 xl:grid-cols-2">
        <InsightPanel
          title={`Strongest positive slot${scoringResult.strongestPositiveSlots.length === 1 ? '' : 's'}`}
          eyebrow="Most Supportive Windows"
          description="Use these times for actions that benefit from more support, easier momentum, or a cleaner background. They are your better-timed windows today, not guarantees."
          sharedContext={scoringResult.extremeSlotContext}
          slots={scoringResult.strongestPositiveSlots}
          tone="positive"
        />
        <InsightPanel
          title={`Strongest negative slot${scoringResult.strongestNegativeSlots.length === 1 ? '' : 's'}`}
          eyebrow="Most Challenging Windows"
          description="Use these times with more caution, lower stakes, or slower pacing. They point to greater resistance today, not fixed bad outcomes."
          sharedContext={scoringResult.extremeSlotContext}
          slots={scoringResult.strongestNegativeSlots}
          tone="negative"
        />
      </div>
    </div>
  );
}
