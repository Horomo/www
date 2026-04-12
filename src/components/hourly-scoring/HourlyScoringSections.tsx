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

export function formatActiveDaYunHeadline(scoringResult: ActiveDaYunSummary) {
  return `${scoringResult.stem.zh}${scoringResult.branch.zh} ages ${scoringResult.ageStart}-${scoringResult.ageEnd}`;
}

export function formatActiveDaYunElements(scoringResult: ActiveDaYunSummary) {
  return `${scoringResult.elements.stem} stem${ACTIVE_DA_YUN_SEPARATOR}${scoringResult.elements.branch} branch`;
}

export function formatSlotHeading(slot: HourSlotScore) {
  return `${slot.hourLabel}${SLOT_SEPARATOR}${slot.branch.zh}`;
}

export function formatSlotScoreBreakdown(slot: HourSlotScore) {
  return `Base ${formatSignedValue(slot.baseScore)}${SCORE_BREAKDOWN_SEPARATOR}Da Yun ${formatSignedValue(slot.daYunModifier)}${SCORE_BREAKDOWN_SEPARATOR}Year ${formatSignedValue(slot.liuNianModifier)}${SCORE_BREAKDOWN_SEPARATOR}Month ${formatSignedValue(slot.liuYueModifier)}${SCORE_BREAKDOWN_SEPARATOR}Day ${formatSignedValue(slot.liuRiModifier)}${SCORE_BREAKDOWN_SEPARATOR}Final ${formatSignedValue(slot.finalScore)}`;
}

function formatSignedValue(value: number) {
  return `${value >= 0 ? '+' : ''}${value}`;
}

function formatLayerName(layer: TransitLayerSummary) {
  switch (layer.kind) {
    case 'liuNian':
      return 'Liu Nian';
    case 'liuYue':
      return 'Liu Yue';
    case 'liuRi':
      return 'Liu Ri';
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

function TableRow({ slot }: { slot: HourSlotScore }) {
  const tone = getScoreTone(slot.finalScore);

  return (
    <tr className={tone === 'positive' ? 'bg-[rgba(234,252,248,0.42)]' : tone === 'negative' ? 'bg-[rgba(255,243,245,0.56)]' : 'bg-white/38'}>
      <td className="rounded-l-[1.4rem] py-4 pl-5 pr-3">
        <div className="font-medium text-[#16302d]">{slot.hourLabel}</div>
        <div className="mt-1 text-xs text-[#5b6f6d]">{slot.localStartLabel} to {slot.localEndLabel}</div>
      </td>
      <td className="px-3 py-4 text-sm text-[#16302d]">{slot.branch.zh}</td>
      <td className="px-3 py-4 text-sm text-[#16302d]">{slot.tenGod.zh}</td>
      <td className="px-3 py-4 text-sm"><BreakdownValue value={slot.baseScore} /></td>
      <td className="px-3 py-4 text-sm"><BreakdownValue value={slot.daYunModifier} /></td>
      <td className="px-3 py-4 text-sm"><BreakdownValue value={slot.liuNianModifier} /></td>
      <td className="px-3 py-4 text-sm"><BreakdownValue value={slot.liuYueModifier} /></td>
      <td className="px-3 py-4 text-sm"><BreakdownValue value={slot.liuRiModifier} /></td>
      <td className="px-3 py-4 text-sm"><ScorePill score={slot.finalScore} /></td>
      <td className="rounded-r-[1.4rem] px-4 py-4 text-sm text-[#35514d]">
        {slot.categoryScores.career} / {slot.categoryScores.wealth} / {slot.categoryScores.love} / {slot.categoryScores.health}
      </td>
    </tr>
  );
}

function MobilePriorityCard({ slot, label }: { slot: HourSlotScore; label: string }) {
  return (
    <article className="rounded-[1.85rem] bg-[linear-gradient(180deg,rgba(255,255,255,0.9),rgba(242,249,248,0.96))] p-5 shadow-[0_18px_38px_rgba(13,93,86,0.06)]">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-[11px] uppercase tracking-[0.24em] text-[#5b6f6d]">{label}</div>
          <h3 className="mt-2 font-serif text-[1.55rem] leading-none text-[#16302d]">{slot.hourLabel}</h3>
          <p className="mt-2 text-sm text-[#35514d]">{slot.stem.zh}{slot.branch.zh} / {slot.branch.zh} ({slot.branch.animal}) / {slot.tenGod.en}</p>
        </div>
        <ScorePill score={slot.finalScore} />
      </div>

      <div className="mt-4 grid grid-cols-3 gap-2">
        <div className="rounded-[1rem] bg-white/74 px-3 py-2">
          <div className="text-[10px] uppercase tracking-[0.18em] text-[#5b6f6d]">Base</div>
          <div className="mt-1 text-sm font-semibold text-[#16302d]">{formatSignedValue(slot.baseScore)}</div>
        </div>
        <div className="rounded-[1rem] bg-white/74 px-3 py-2">
          <div className="text-[10px] uppercase tracking-[0.18em] text-[#5b6f6d]">Stacked</div>
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
            <div className="text-sm text-[#35514d]">{slot.stem.zh}{slot.branch.zh} / {slot.branch.zh} ({slot.branch.animal}) / {slot.tenGod.en}</div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="rounded-full bg-[#f7fbfb] px-3 py-2">Base <span className="font-semibold text-[#16302d]">{formatSignedValue(slot.baseScore)}</span></div>
              <div className="rounded-full bg-[#f7fbfb] px-3 py-2">Da Yun <span className="font-semibold text-[#16302d]">{formatSignedValue(slot.daYunModifier)}</span></div>
              <div className="rounded-full bg-[#f7fbfb] px-3 py-2">Year <span className="font-semibold text-[#16302d]">{formatSignedValue(slot.liuNianModifier)}</span></div>
              <div className="rounded-full bg-[#f7fbfb] px-3 py-2">Month <span className="font-semibold text-[#16302d]">{formatSignedValue(slot.liuYueModifier)}</span></div>
              <div className="rounded-full bg-[#f7fbfb] px-3 py-2">Day <span className="font-semibold text-[#16302d]">{formatSignedValue(slot.liuRiModifier)}</span></div>
              <div className="rounded-full bg-[#f7fbfb] px-3 py-2">Areas <span className="font-semibold text-[#16302d]">{slot.categoryScores.career}/{slot.categoryScores.wealth}/{slot.categoryScores.love}/{slot.categoryScores.health}</span></div>
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
  slots,
  tone,
}: {
  title: string;
  eyebrow: string;
  slots: HourSlotScore[];
  tone: 'positive' | 'negative';
}) {
  return (
    <section className="rounded-[2.2rem] bg-[linear-gradient(180deg,rgba(255,255,255,0.76),rgba(245,250,249,0.9))] p-6 shadow-[0_18px_40px_rgba(13,93,86,0.045)] md:p-7">
      {sectionEyebrow(eyebrow)}
      <h3 className="mt-3 font-serif text-[1.95rem] leading-[1.02] tracking-[-0.03em] text-[#16302d]">{title}</h3>
      <div className="mt-6 space-y-4">
        {slots.map((slot) => (
          <article key={slot.branchIdx} className={`rounded-[1.7rem] px-4 py-5 ${tone === 'positive' ? 'bg-[linear-gradient(180deg,rgba(236,252,247,0.8),rgba(255,255,255,0.72))]' : 'bg-[linear-gradient(180deg,rgba(255,244,246,0.82),rgba(255,255,255,0.74))]'} shadow-[inset_0_0_0_1px_rgba(13,93,86,0.04)]`}>
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="text-[11px] uppercase tracking-[0.22em] text-[#5b6f6d]">{slot.localStartLabel} to {slot.localEndLabel}</div>
                <div className="mt-2 text-base font-semibold text-[#16302d]">{formatSlotHeading(slot)}</div>
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
              The score recalculates from your saved birth profile and today&apos;s timing layers. The hour remains the immediate trigger, while Da Yun, Liu Nian, Liu Yue, and Liu Ri create the broader atmospheric context behind each slot.
            </p>
            <div className="mt-6 hidden max-w-xl grid-cols-3 gap-3 text-[11px] uppercase tracking-[0.18em] text-[#5b6f6d] md:grid">
              <div className="border-t border-[#cfe3de] pt-3">Context first</div>
              <div className="border-t border-[#cfe3de] pt-3">Hourly trigger</div>
              <div className="border-t border-[#cfe3de] pt-3">Insight after</div>
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
            These layers are kept intact from the existing scoring model and reframed with more whitespace so the long-term climate and short-term pressure are easier to distinguish.
          </p>
        </div>
        <div className="grid gap-4 xl:grid-cols-2">
          {scoringResult.activeDaYun ? (
            <LayerSummaryCard
              badge="Active Da Yun"
              title={formatActiveDaYunHeadline(scoringResult.activeDaYun)}
              description={`This cycle covers ${scoringResult.activeDaYun.yearStart}-${scoringResult.activeDaYun.yearEnd}. It acts as the long-term climate behind today's faster time layers.`}
              modifier={scoringResult.activeDaYun.modifier}
              elements={formatActiveDaYunElements(scoringResult.activeDaYun)}
              tenGods={`${scoringResult.activeDaYun.stemTenGod.en} / ${scoringResult.activeDaYun.branchTenGod.en}`}
              categoryModifier={scoringResult.activeDaYun.categoryModifier}
            />
          ) : null}

          {scoringResult.liuNian ? (
            <LayerSummaryCard
              badge="Liu Nian"
              title={formatTransitLayerHeadline(scoringResult.liuNian)}
              description="Liu Nian is the yearly climate. It nudges every slot without replacing the hour trigger."
              modifier={scoringResult.liuNian.modifier}
              elements={`${scoringResult.liuNian.elements.stem} stem / ${scoringResult.liuNian.elements.branch} branch`}
              tenGods={`${scoringResult.liuNian.stemTenGod.en} / ${scoringResult.liuNian.branchTenGod.en}`}
              categoryModifier={scoringResult.liuNian.categoryModifier}
            />
          ) : null}

          {scoringResult.liuYue ? (
            <LayerSummaryCard
              badge="Liu Yue"
              title={formatTransitLayerHeadline(scoringResult.liuYue)}
              description="Liu Yue is the monthly weather. It adds a shorter timing bias on top of the year and Da Yun."
              modifier={scoringResult.liuYue.modifier}
              elements={`${scoringResult.liuYue.elements.stem} stem / ${scoringResult.liuYue.elements.branch} branch`}
              tenGods={`${scoringResult.liuYue.stemTenGod.en} / ${scoringResult.liuYue.branchTenGod.en}`}
              categoryModifier={scoringResult.liuYue.categoryModifier}
            />
          ) : null}

          {scoringResult.liuRi ? (
            <LayerSummaryCard
              badge="Liu Ri"
              title={formatTransitLayerHeadline(scoringResult.liuRi)}
              description="Liu Ri is the daily condition. It is the closest shared background layer before the two-hour slot fires."
              modifier={scoringResult.liuRi.modifier}
              elements={`${scoringResult.liuRi.elements.stem} stem / ${scoringResult.liuRi.elements.branch} branch`}
              tenGods={`${scoringResult.liuRi.stemTenGod.en} / ${scoringResult.liuRi.branchTenGod.en}`}
              categoryModifier={scoringResult.liuRi.categoryModifier}
            />
          ) : null}
        </div>
      </section>

      <SectionSurface className="hidden lg:block">
        <div className="grid gap-10 xl:grid-cols-[minmax(0,1fr)_minmax(280px,0.42fr)]">
          <div>
            {sectionEyebrow('Hourly Editorial Table')}
            <h2 className="mt-3 font-serif text-[2.2rem] leading-[1.02] tracking-[-0.03em] text-[#16302d]">Two-hour slot flow</h2>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-[#35514d]">
              Read left to right: the slot opens with its base tendency, then the broader timing layers push that window brighter, quieter, or more challenging.
            </p>
            <div className="cosmic-scrollbar mt-7 overflow-x-auto pb-1">
              <table className="min-w-full border-separate border-spacing-y-2 text-left">
                <thead>
                  <tr className="text-[11px] uppercase tracking-[0.22em] text-[#5b6f6d]">
                    <th className="px-4 py-2 font-medium">Slot</th>
                    <th className="px-3 py-2 font-medium">Branch</th>
                    <th className="px-3 py-2 font-medium">Ten God</th>
                    <th className="px-3 py-2 font-medium">Base</th>
                    <th className="px-3 py-2 font-medium">Da Yun</th>
                    <th className="px-3 py-2 font-medium">Year</th>
                    <th className="px-3 py-2 font-medium">Month</th>
                    <th className="px-3 py-2 font-medium">Day</th>
                    <th className="px-3 py-2 font-medium">Final</th>
                    <th className="px-3 py-2 font-medium">Areas</th>
                  </tr>
                </thead>
                <tbody>
                  {scoringResult.slots.map((slot) => (
                    <TableRow key={slot.branchIdx} slot={slot} />
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <aside className="rounded-[2rem] bg-[linear-gradient(180deg,rgba(236,250,247,0.76),rgba(255,255,255,0.74))] p-6 shadow-[inset_0_0_0_1px_rgba(13,93,86,0.05)]">
            {sectionEyebrow('Reading Guide')}
            <h3 className="mt-3 font-serif text-[1.6rem] leading-[1.08] text-[#16302d]">How to read the table</h3>
            <p className="mt-4 text-sm leading-7 text-[#35514d]">
              The immediate hour begins with the base score. Da Yun, Year, Month, and Day then shift the atmosphere. Final is the resulting tone for that slot.
            </p>
            <div className="mt-6 space-y-3 text-sm text-[#35514d]">
              <div className="border-t border-[#d8e8e4] pt-3">Positive slots rise in mint.</div>
              <div className="border-t border-[#d8e8e4] pt-3">Negative slots soften into rose.</div>
              <div className="border-t border-[#d8e8e4] pt-3">Areas are listed as career / wealth / love / health.</div>
            </div>
          </aside>
        </div>
      </SectionSurface>

      <SectionSurface className="lg:hidden">
        <div className="px-1">
          {sectionEyebrow('Mobile Slot Flow')}
          <h2 className="mt-3 font-serif text-[2.05rem] leading-[1.03] tracking-[-0.03em] text-[#16302d]">Two-hour slot flow</h2>
          <p className="mt-3 text-sm leading-7 text-[#35514d]">
            Mobile prioritizes the strongest windows first, then lets you expand the remaining slots only when you want more detail.
          </p>
        </div>

        <div className="mt-6 grid gap-4">
          {mobilePrioritySlots.map((slot, index) => (
            <MobilePriorityCard
              key={slot.branchIdx}
              slot={slot}
              label={index === 0 ? 'Priority window' : 'Counterpoint'}
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
          eyebrow="Constructive Windows"
          slots={scoringResult.strongestPositiveSlots}
          tone="positive"
        />
        <InsightPanel
          title={`Strongest negative slot${scoringResult.strongestNegativeSlots.length === 1 ? '' : 's'}`}
          eyebrow="Challenging Windows"
          slots={scoringResult.strongestNegativeSlots}
          tone="negative"
        />
      </div>
    </div>
  );
}
