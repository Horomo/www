'use client';

import { signIn, signOut, useSession } from 'next-auth/react';
import { startTransition, useCallback, useEffect, useMemo, useState } from 'react';

import BirthPlaceSearch from '@/components/BirthPlaceSearch';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import ChartContainer from '@/components/ui/ChartContainer';
import GlowCard from '@/components/ui/GlowCard';
import Stepper from '@/components/ui/Stepper';
import { cn } from '@/components/ui/utils';
import {
  buildAnalyzeRequestBody,
  finalizeAnalysisFormPayload,
  normalizeAnalysisFormDraft,
  type AnalysisFormDraft,
  type AnalysisFormPayload,
} from '@/lib/analysis-payload';
import { trackEvent } from '@/lib/analytics';
import {
  BRANCH_HIDDEN_STEMS,
  computeBazi,
  computeChartData,
  EL_LABEL,
  getBranchMainStem,
  getDayMasterNote,
  STEMS,
  TG_ABBR,
  tenGod,
  type BaziResult,
  type ChartData,
} from '@/lib/bazi';
import {
  formatCalculationGenderModeDisplay,
  formatMergedGenderSelection,
  type CalculationGenderMode,
} from '@/lib/gender';
import type { PlaceSearchResult } from '@/lib/places';

const MERGED_GENDER_OPTIONS: Array<{
  value: CalculationGenderMode;
  yinYang: string;
  pinyinLabel: string;
  label: string;
  tagline: string;
  description: string;
}> = [
  {
    value: 'male',
    yinYang: '陽',
    pinyinLabel: 'Yáng',
    label: 'Male (Yang)',
    tagline: 'Male identity with Yang polarity',
    description: 'Maps internally to gender=male and yinYang/calculationMode=yang for the existing Da Yun rule.',
  },
  {
    value: 'female',
    yinYang: '陰',
    pinyinLabel: 'Yīn',
    label: 'Female (Yin)',
    tagline: 'Female identity with Yin polarity',
    description: 'Maps internally to gender=female and yinYang/calculationMode=yin for the existing Da Yun rule.',
  },
];

const WIZARD_STEPS = [
  { id: 'identity', label: 'Identity', detail: 'Choose one merged gender and polarity option.' },
  { id: 'birth', label: 'Birth', detail: 'Set date, time, and known-time status.' },
  { id: 'location', label: 'Location', detail: 'Confirm place, timezone, and coordinates.' },
  { id: 'confirm', label: 'Confirm', detail: 'Review the reading ritual before reveal.' },
] as const;

const PILLAR_META = [
  { key: 'year', label: 'Year', zh: '年柱', accent: 'cyan' as const },
  { key: 'month', label: 'Month', zh: '月柱', accent: 'violet' as const },
  { key: 'day', label: 'Day', zh: '日柱', accent: 'gold' as const },
  { key: 'hour', label: 'Hour', zh: '時柱', accent: 'pink' as const },
] as const;

type PillarKey = (typeof PILLAR_META)[number]['key'];
type FormValues = AnalysisFormDraft;
type FollowUpItem = { question: string; answer: string | null; loading: boolean; error: string | null };
type StepFieldErrors = Partial<Record<'calculationMode' | 'dob' | 'tob' | 'timezone' | 'longitude' | 'latitude', string>>;

const EMPTY_FOLLOW_UPS: FollowUpItem[] = [
  { question: '', answer: null, loading: false, error: null },
  { question: '', answer: null, loading: false, error: null },
  { question: '', answer: null, loading: false, error: null },
];

const AUTH_STATE_KEY = 'horomo-auth-preserved-form';
const TEXT_INPUT_CLASS = 'glass-input w-full rounded-[1.4rem] px-4 py-3 text-sm text-[#151d22] placeholder:text-[#151d22]/40';
const TEXTAREA_CLASS = 'glass-input w-full rounded-[1.4rem] px-4 py-3 text-sm text-[#151d22] placeholder:text-[#151d22]/40';
const DISPLAY_PILLAR_ORDER: PillarKey[] = ['year', 'month', 'day', 'hour'];

function getDisplayPillarOrder(unknownTime: boolean): PillarKey[] {
  return unknownTime ? DISPLAY_PILLAR_ORDER.slice(0, 3) : DISPLAY_PILLAR_ORDER;
}

function elColor(el: string): string {
  switch (el) {
    case 'wood': return 'text-[#006a62]';
    case 'fire': return 'text-[#874e58]';
    case 'earth': return 'text-[#705d00]';
    case 'metal': return 'text-[#705d00]';
    case 'water': return 'text-[#006a62]';
    default: return 'text-[#151d22]';
  }
}

function elementGlow(el: string): string {
  switch (el) {
    case 'wood': return 'bg-[linear-gradient(135deg,rgba(64,224,208,0.18),rgba(255,255,255,0.62))] shadow-[inset_0_0_0_1px_rgba(64,224,208,0.16)]';
    case 'fire': return 'bg-[linear-gradient(135deg,rgba(255,183,194,0.22),rgba(255,255,255,0.6))] shadow-[inset_0_0_0_1px_rgba(135,78,88,0.12)]';
    case 'earth': return 'bg-[linear-gradient(135deg,rgba(252,212,0,0.18),rgba(255,255,255,0.62))] shadow-[inset_0_0_0_1px_rgba(112,93,0,0.12)]';
    case 'metal': return 'bg-[linear-gradient(135deg,rgba(252,212,0,0.14),rgba(255,255,255,0.72))] shadow-[inset_0_0_0_1px_rgba(112,93,0,0.1)]';
    case 'water': return 'bg-[linear-gradient(135deg,rgba(64,224,208,0.14),rgba(245,250,255,0.74))] shadow-[inset_0_0_0_1px_rgba(0,106,98,0.14)]';
    default: return 'bg-[linear-gradient(135deg,rgba(255,255,255,0.68),rgba(245,250,255,0.6))] shadow-[inset_0_0_0_1px_rgba(255,255,255,0.62)]';
  }
}

function tgBadgeTone(abbr: string): 'default' | 'cyan' | 'violet' | 'pink' | 'gold' | 'danger' {
  switch (abbr) {
    case 'EG': case 'HO': return 'gold';
    case 'IW': case 'DW': return 'cyan';
    case '7K': case 'DO': return 'danger';
    case 'IR': case 'DR': return 'violet';
    default: return 'default';
  }
}

function fmtDate(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())} ${pad(date.getUTCHours())}:${pad(date.getUTCMinutes())}`;
}

function fmtMin(min: number): string {
  const sign = min >= 0 ? '+' : '-';
  return `${sign}${Math.round(Math.abs(min))} min`;
}

function RenderMd({ text }: { text: string }) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return <>{parts.map((part, index) => part.startsWith('**') && part.endsWith('**') ? <strong key={`${part}-${index}`}>{part.slice(2, -2)}</strong> : <span key={`${part}-${index}`}>{part}</span>)}</>;
}

function StatTile({ label, value, hint, className }: { label: string; value: string; hint?: string; className?: string }) {
  return (
    <div className={cn('rounded-[1.5rem] bg-[linear-gradient(135deg,rgba(255,255,255,0.78),rgba(255,255,255,0.56))] p-4 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.7)]', className)}>
      <div className="text-[11px] uppercase tracking-[0.22em] text-[#151d22]/48">{label}</div>
      <div className="mt-2 text-base font-semibold text-[#151d22]">{value}</div>
      {hint ? <div className="mt-2 text-xs leading-6 text-[#151d22]/56">{hint}</div> : null}
    </div>
  );
}

function TSTCard({ result }: { result: BaziResult }) {
  const { tst, displayDate, tstDate, displayTzLabel } = result;
  if (!tst) return null;
  const pad = (n: number) => String(n).padStart(2, '0');
  const clockStr = `${pad(displayDate.getUTCHours())}:${pad(displayDate.getUTCMinutes())}`;
  const tstStr = `${pad(tstDate.getUTCHours())}:${pad(tstDate.getUTCMinutes())}`;
  const rows = [
    { label: 'Clock Time', value: clockStr, note: `${displayTzLabel}${tst.dstApplied ? ' (DST in effect)' : ''}`, tone: 'text-[#151d22]' },
    { label: 'Step 1 · DST Correction', value: fmtMin(tst.dstCorrectionMin), note: tst.dstApplied ? 'DST detected and reverted to standard time.' : 'No DST adjustment needed.', tone: tst.dstApplied ? 'text-[#705d00]' : 'text-[#151d22]/70' },
    { label: 'Step 2 · Longitude Correction', value: fmtMin(tst.lonCorrectionMin), note: '(longitude - standard meridian) x 4 min/deg', tone: 'text-[#006a62]' },
    { label: 'Step 3 · Equation of Time', value: fmtMin(tst.eotMin), note: 'Orbital eccentricity correction.', tone: 'text-[#874e58]' },
  ];

  return (
    <GlowCard accent="gold" className="p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Badge tone="gold">Astronomy layer</Badge>
          <h3 className="mt-3 font-serif text-[1.8rem] text-[#151d22]">True Solar Time · 真太陽時</h3>
          <p className="mt-2 text-sm leading-7 text-[#151d22]/66">Horomo applies a three-step astronomical correction to stabilize boundary cases.</p>
        </div>
        <div className="rounded-[1.5rem] bg-[linear-gradient(135deg,rgba(64,224,208,0.16),rgba(255,255,255,0.76))] px-4 py-3 text-right shadow-[inset_0_0_0_1px_rgba(64,224,208,0.18)]">
          <div className="text-xs uppercase tracking-[0.24em] text-[#006a62]/62">Final solar time</div>
          <div className="mt-2 text-2xl font-semibold text-[#006a62]">{tstStr}</div>
          <div className="mt-1 text-xs text-[#151d22]/56">Total correction {fmtMin(tst.totalCorrectionMin)}</div>
        </div>
      </div>
      <div className="mt-6 grid gap-3 md:grid-cols-2">
        {rows.map((row) => <div key={row.label} className="rounded-[1.4rem] bg-[linear-gradient(135deg,rgba(255,255,255,0.78),rgba(255,255,255,0.54))] p-4 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.64)]"><div className="text-[11px] uppercase tracking-[0.18em] text-[#151d22]/48">{row.label}</div><div className={cn('mt-2 text-lg font-semibold', row.tone)}>{row.value}</div><div className="mt-2 text-xs leading-6 text-[#151d22]/56">{row.note}</div></div>)}
      </div>
      {tst.dayChanged ? <div className="mt-5 rounded-[1.4rem] bg-[linear-gradient(135deg,rgba(255,183,194,0.34),rgba(255,255,255,0.62))] px-4 py-3 text-sm leading-7 text-[#874e58] shadow-[inset_0_0_0_1px_rgba(135,78,88,0.12)]"><span className="font-semibold">Day transition detected:</span> true solar time crosses midnight, so the astrological date shifts to the {tst.dayChangedDir === 'next' ? 'following' : 'previous'} day. All pillars have already been recalculated.</div> : null}
    </GlowCard>
  );
}
function RadarGlowChart({ structureCounts, structureEls }: { structureCounts: Record<string, number>; structureEls: Record<string, string> }) {
  const structures = [
    { key: 'companion', name: 'Companion', angle: -90 },
    { key: 'output', name: 'Output', angle: -18 },
    { key: 'wealth', name: 'Wealth', angle: 54 },
    { key: 'influence', name: 'Influence', angle: 126 },
    { key: 'resource', name: 'Resource', angle: 198 },
  ];
  const maxScale = Math.max(4, ...Object.values(structureCounts));
  const center = 120;
  const radius = 86;
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const point = (deg: number, r: number) => ({ x: center + r * Math.cos(toRad(deg)), y: center + r * Math.sin(toRad(deg)) });
  const polygonPoints = structures.map((structure) => {
    const value = structureCounts[structure.key] || 0;
    const pointValue = point(structure.angle, value === 0 ? 0 : (radius * Math.min(value, maxScale)) / maxScale);
    return `${pointValue.x},${pointValue.y}`;
  }).join(' ');

  return (
    <svg viewBox="0 0 240 240" className="mx-auto w-full max-w-[320px]">
      <defs>
        <linearGradient id="radar-fill" x1="0%" x2="100%" y1="0%" y2="100%">
          <stop offset="0%" stopColor="rgba(64,224,208,0.34)" />
          <stop offset="55%" stopColor="rgba(252,212,0,0.22)" />
          <stop offset="100%" stopColor="rgba(255,183,194,0.36)" />
        </linearGradient>
      </defs>
      {[0.25, 0.5, 0.75, 1].map((ratio) => {
        const points = structures.map((structure) => {
          const pointValue = point(structure.angle, radius * ratio);
          return `${pointValue.x},${pointValue.y}`;
        }).join(' ');
        return <polygon key={ratio} points={points} fill="none" stroke="rgba(0,106,98,0.16)" strokeWidth="1" />;
      })}
      {structures.map((structure) => {
        const outer = point(structure.angle, radius);
        return <line key={structure.key} x1={center} y1={center} x2={outer.x} y2={outer.y} stroke="rgba(0,106,98,0.16)" strokeWidth="1" />;
      })}
      <polygon points={polygonPoints} fill="url(#radar-fill)" stroke="rgba(0,106,98,0.82)" strokeWidth="2.5" strokeLinejoin="round" />
      {structures.map((structure) => {
        const value = structureCounts[structure.key] || 0;
        const pointValue = point(structure.angle, value === 0 ? 0 : (radius * Math.min(value, maxScale)) / maxScale);
        const label = point(structure.angle, radius + 20);
        return (
          <g key={`${structure.key}-dot`}>
            <circle cx={pointValue.x} cy={pointValue.y} r="4.5" fill="rgba(0,106,98,0.92)" />
            <text x={label.x} y={label.y} textAnchor="middle" fontSize="9.5" fill="rgba(21,29,34,0.82)">{structure.name}</text>
            <text x={label.x} y={label.y + 11} textAnchor="middle" fontSize="8" fill="rgba(21,29,34,0.54)">{EL_LABEL[structureEls[structure.key]].en}</text>
          </g>
        );
      })}
    </svg>
  );
}

function NeonBars({ tenGodsCount }: { tenGodsCount: Record<string, number> }) {
  const allTenGods = [
    { zh: '比肩', en: 'Friend' },
    { zh: '劫財', en: 'Rob Wealth' },
    { zh: '食神', en: 'Eating God' },
    { zh: '傷官', en: 'Hurting Officer' },
    { zh: '偏財', en: 'Indirect Wealth' },
    { zh: '正財', en: 'Direct Wealth' },
    { zh: '偏官', en: 'Seven Killing' },
    { zh: '正官', en: 'Direct Officer' },
    { zh: '偏印', en: 'Indirect Resource' },
    { zh: '正印', en: 'Direct Resource' },
  ].sort((a, b) => (tenGodsCount[b.zh] || 0) - (tenGodsCount[a.zh] || 0));
  const maxValue = Math.max(...allTenGods.map((item) => tenGodsCount[item.zh] || 0), 1);

  return (
    <div className="space-y-3">
      {allTenGods.map((item) => {
        const value = tenGodsCount[item.zh] || 0;
        return (
          <div key={item.zh} className="grid grid-cols-[minmax(0,1fr)_56px] items-center gap-3">
            <div>
              <div className="mb-1 flex items-center justify-between gap-3 text-xs text-[#151d22]/66">
                <span>{item.en} <span className="font-zh text-sm">{item.zh}</span></span>
                <span className="text-[#151d22]/48">{value}</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-white/56 shadow-[inset_0_1px_0_rgba(255,255,255,0.86)]">
                <div className="h-full rounded-full bg-[linear-gradient(90deg,#40e0d0,#fcd400_56%,#ffb7c2)] shadow-[0_0_18px_rgba(64,224,208,0.18)] transition-[width] duration-700" style={{ width: `${(value / maxValue) * 100}%` }} />
              </div>
            </div>
            <div className="text-right text-xs uppercase tracking-[0.18em] text-[#151d22]/44">Rank</div>
          </div>
        );
      })}
    </div>
  );
}

function getPillarSummary(result: BaziResult, key: PillarKey) {
  const pillar = result.pillars[key];
  if (!pillar) return null;
  const hiddenStems = BRANCH_HIDDEN_STEMS[pillar.branchIdx].map((stemIdx) => ({ stem: STEMS[stemIdx], stemIdx }));
  const stemGod = key === 'day' ? null : tenGod(result.pillars.day.stemIdx, pillar.stemIdx);
  const branchGod = tenGod(result.pillars.day.stemIdx, getBranchMainStem(pillar.branchIdx));
  return { pillar, hiddenStems, stemGod, branchGod };
}

function PillarCard({ result, keyName, currentYear }: { result: BaziResult; keyName: PillarKey; currentYear: number }) {
  const meta = PILLAR_META.find((item) => item.key === keyName)!;
  const summary = getPillarSummary(result, keyName);

  if (!summary) {
    return (
      <GlowCard accent={meta.accent} interactive className="h-full p-5">
        <div className="flex items-center justify-between gap-3"><div><div className="text-xs uppercase tracking-[0.2em] text-[#151d22]/46">{meta.label} Pillar</div><div className="mt-2 text-sm text-[#151d22]/48">{meta.zh}</div></div><Badge tone="default">Unknown</Badge></div>
        <div className="mt-6 rounded-[1.9rem] bg-[linear-gradient(135deg,rgba(255,255,255,0.7),rgba(245,250,255,0.58))] p-6 text-center shadow-[inset_0_0_0_1px_rgba(255,255,255,0.68)]"><div className="font-zh text-5xl text-[#151d22]/42">?</div><div className="mt-3 text-sm text-[#151d22]/62">Hour pillar cannot be calculated without a known birth time.</div></div>
      </GlowCard>
    );
  }

  const { pillar, hiddenStems, stemGod, branchGod } = summary;
  const pillarHint = keyName === 'year' ? `Current year ${currentYear}` : keyName === 'day' ? 'Day Master anchor' : keyName === 'month' ? 'Seasonal climate' : 'Expression timing';

  return (
    <GlowCard accent={meta.accent} interactive className="h-full p-5">
      <div className="flex items-center justify-between gap-3"><div><div className="text-xs uppercase tracking-[0.2em] text-[#151d22]/46">{meta.label} Pillar</div><div className="mt-1 text-sm text-[#151d22]/56">{meta.zh}</div></div>{keyName === 'day' ? <Badge tone="gold">Day Master</Badge> : <Badge tone="default">{pillarHint}</Badge>}</div>
      <div className="mt-5 grid grid-cols-2 gap-3">
        <div className={cn('rounded-[24px] p-4', elementGlow(pillar.stem.element))}>
          <div className="text-[11px] uppercase tracking-[0.18em] text-[#151d22]/46">Stem · 天干</div>
          <div className={cn('mt-3 font-zh text-5xl font-bold', elColor(pillar.stem.element))}>{pillar.stem.zh}</div>
          <div className="mt-2 text-sm font-semibold text-[#151d22]">{pillar.stem.pinyin}</div>
          <div className="mt-1 text-xs text-[#151d22]/58">{EL_LABEL[pillar.stem.element].en} {pillar.stem.yin ? 'Yin' : 'Yang'}</div>
          <div className="mt-3 flex flex-wrap gap-2">{stemGod ? <><Badge tone={tgBadgeTone(TG_ABBR[stemGod.zh] || '')}>{TG_ABBR[stemGod.zh] || 'TG'}</Badge><span className="text-xs text-[#151d22]/62">{stemGod.zh} {stemGod.pinyin}</span></> : <span className="text-xs text-[#151d22]/62">Source stem of the chart.</span>}</div>
        </div>
        <div className={cn('rounded-[24px] p-4', elementGlow(pillar.branch.element))}>
          <div className="text-[11px] uppercase tracking-[0.18em] text-[#151d22]/46">Branch · 地支</div>
          <div className={cn('mt-3 font-zh text-5xl font-bold', elColor(pillar.branch.element))}>{pillar.branch.zh}</div>
          <div className="mt-2 text-sm font-semibold text-[#151d22]">{pillar.branch.pinyin}</div>
          <div className="mt-1 text-xs text-[#151d22]/58">{pillar.branch.animal} · {EL_LABEL[pillar.branch.element].en}</div>
          <div className="mt-3 flex flex-wrap items-center gap-2"><Badge tone={tgBadgeTone(TG_ABBR[branchGod.zh] || '')}>{TG_ABBR[branchGod.zh] || 'TG'}</Badge><span className="text-xs text-[#151d22]/62">{branchGod.zh} {branchGod.pinyin}</span></div>
        </div>
      </div>
      <div className="mt-4"><div className="text-[11px] uppercase tracking-[0.18em] text-[#151d22]/48">Hidden stems · 藏干</div><div className="mt-3 flex flex-wrap gap-2">{hiddenStems.map(({ stem, stemIdx }) => { const tg = tenGod(result.pillars.day.stemIdx, stemIdx); return <span key={`${keyName}-${stem.zh}`} className={cn('inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs', elementGlow(stem.element))}><span className={cn('font-zh text-base', elColor(stem.element))}>{stem.zh}</span><span className="text-[#151d22]/74">{stem.pinyin}</span><Badge tone={tgBadgeTone(TG_ABBR[tg.zh] || '')} className="px-2 py-0.5 text-[9px]">{TG_ABBR[tg.zh] || 'TG'}</Badge></span>; })}</div></div>
    </GlowCard>
  );
}

function WizardPreview({ formValues, step }: { formValues: FormValues; step: number }) {
  const selectionLabel = formatMergedGenderSelection(formValues.calculationMode);
  return (
    <div className="space-y-4 lg:sticky lg:top-24">
      <GlowCard accent="violet" className="p-6">
        <Badge tone="violet">Journey Preview</Badge>
        <h3 className="mt-4 font-serif text-[1.9rem] text-[#151d22]">The chart reveal is staged in four deliberate steps.</h3>
        <p className="mt-3 text-sm leading-7 text-[#151d22]/66">The wizard keeps the existing birth fields and logic intact, but turns the experience into a guided intake rather than a long static form.</p>
        <div className="mt-6 grid gap-3">
          <StatTile label="Current step" value={`${step + 1}. ${WIZARD_STEPS[step].label}`} hint={WIZARD_STEPS[step].detail} />
          <StatTile label="Selection" value={selectionLabel} hint="This single choice fills the existing gender identity and Da Yun rule fields together." />
          <StatTile label="Location status" value={formValues.birthPlace ? 'Matched from place search' : 'Manual review available'} hint={formValues.timezone || 'Timezone will appear here once set.'} />
        </div>
      </GlowCard>
      <GlowCard accent="cyan" className="p-6">
        <div className="text-[11px] uppercase tracking-[0.2em] text-[#006a62]/62">What stays preserved</div>
        <ul className="mt-4 space-y-3 text-sm leading-7 text-[#151d22]/66">
          <li>All birth fields, validation rules, and location overrides remain available.</li>
          <li>Local-first BaZi computation still runs in the browser with the same engine.</li>
          <li>AI reading, Google sign-in, follow-up questions, and chart logging all remain untouched.</li>
        </ul>
      </GlowCard>
    </div>
  );
}

export default function BaziCalculator() {
  const [dob, setDob] = useState('1990-06-15');
  const [tob, setTob] = useState('08:30');
  const [birthPlaceQuery, setBirthPlaceQuery] = useState('Bangkok, Thailand');
  const [birthPlace, setBirthPlace] = useState<PlaceSearchResult | null>(null);
  const [timezone, setTimezone] = useState('Asia/Bangkok');
  const [longitude, setLongitude] = useState('100.52');
  const [latitude, setLatitude] = useState('13.75');
  const [genderIdentity, setGenderIdentity] = useState<FormValues['genderIdentity']>('');
  const [genderOtherText, setGenderOtherText] = useState('');
  const [calculationMode, setCalculationMode] = useState<CalculationGenderMode | ''>('');
  const [unknownTime, setUnknownTime] = useState(false);
  const [result, setResult] = useState<BaziResult | null>(null);
  const [chartData, setChartData] = useState<ChartData | null>(null);
  const [calculatedFormValues, setCalculatedFormValues] = useState<AnalysisFormPayload | null>(null);
  const [analysis, setAnalysis] = useState<string | null>(null);
  const [followUps, setFollowUps] = useState<FollowUpItem[]>(EMPTY_FOLLOW_UPS);
  const [loadingAnalysis, setLoadingAnalysis] = useState(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [calcError, setCalcError] = useState<string | null>(null);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [signingIn, setSigningIn] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [activeLuckCycle, setActiveLuckCycle] = useState(0);
  const [showStepValidation, setShowStepValidation] = useState(false);
  const { data: session, status: sessionStatus } = useSession();
  const currentYear = new Date().getUTCFullYear();

  const formValues: FormValues = { dob, tob, birthPlaceQuery, birthPlace, timezone, longitude, latitude, genderIdentity, genderOtherText, calculationMode, unknownTime };
  useEffect(() => { trackEvent('calculation_mode_view', { screen_name: 'bazi_form' }); }, []);

  function syncFormState(values: FormValues) {
    setDob(values.dob); setTob(values.tob); setBirthPlaceQuery(values.birthPlaceQuery); setBirthPlace(values.birthPlace); setTimezone(values.timezone); setLongitude(values.longitude); setLatitude(values.latitude); setGenderIdentity(values.genderIdentity); setGenderOtherText(values.genderOtherText); setCalculationMode(values.calculationMode); setUnknownTime(values.unknownTime);
  }

  function handleMergedGenderChange(next: CalculationGenderMode) {
    setShowStepValidation(false);
    setGenderIdentity(next);
    setGenderOtherText('');
    if (next !== calculationMode) trackEvent('selection_changed', { previous_energy_type: calculationMode || undefined, energy_type: next, screen_name: 'bazi_form' });
    trackEvent('calculation_mode_selected', { energy_type: next, screen_name: 'bazi_form' });
    setCalculationMode(next);
  }

  const getStepFieldErrors = useCallback((step: number, values: FormValues): StepFieldErrors => {
    const errors: StepFieldErrors = {};

    if (step === 0) {
      if (!values.calculationMode) errors.calculationMode = 'Choose one option so we can apply the existing gender and polarity mapping.';
    }
    if (step === 1) {
      if (!values.dob) errors.dob = 'Enter date of birth.';
      if (!values.unknownTime && !values.tob) {
        errors.tob = "Enter time of birth, or check 'I don't know my birth time'.";
      }
    }
    if (step === 2) {
      const lng = parseFloat(values.longitude); const lat = parseFloat(values.latitude);
      if (!values.timezone) errors.timezone = 'Choose a birth place or enter a timezone manually.';
      if (Number.isNaN(lng) || lng < -180 || lng > 180) errors.longitude = 'Longitude must be between -180 and 180.';
      if (Number.isNaN(lat) || lat < -90 || lat > 90) errors.latitude = 'Latitude must be between -90 and 90.';
    }

    return errors;
  }, []);

  const validateStep = useCallback((step: number, values: FormValues): string | null => {
    return Object.values(getStepFieldErrors(step, values))[0] ?? null;
  }, [getStepFieldErrors]);

  const calculate = useCallback((values: FormValues) => {
    const normalizedValues = finalizeAnalysisFormPayload(values);
    const firstInvalidStep = [0, 1, 2].find((step) => validateStep(step, values));
    const error = firstInvalidStep === undefined ? null : validateStep(firstInvalidStep, values);
    if (error) {
      setShowStepValidation(true);
      if (firstInvalidStep !== undefined) moveToStep(firstInvalidStep);
      return void setCalcError(error);
    }
    if (!normalizedValues) return void setCalcError('Please review the merged gender and polarity selection.');
    setShowStepValidation(false);
    setCalcError(null);
    try {
      const lng = parseFloat(values.longitude);
      const computedResult = computeBazi(normalizedValues.dob, normalizedValues.unknownTime ? null : normalizedValues.tob, normalizedValues.timezone, lng, normalizedValues.calculationMode);
      const computedChartData = computeChartData(computedResult.pillars, computedResult.pillars.day.stemIdx, computedResult.unknownTime);
      syncFormState(normalizedValues); setResult(computedResult); setChartData(computedChartData); setCalculatedFormValues(normalizedValues); setAnalysis(null); setFollowUps(EMPTY_FOLLOW_UPS); setAnalysisError(null); setCurrentStep(3);
      fetch('/api/log-chart', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(buildAnalyzeRequestBody({ formValues: normalizedValues, result: computedResult, chartData: computedChartData })) }).catch(() => {});
    } catch (error: unknown) { setCalcError(`Calculation error: ${error instanceof Error ? error.message : String(error)}`); }
  }, [validateStep]);

  useEffect(() => {
    const rawSavedState = sessionStorage.getItem(AUTH_STATE_KEY); if (!rawSavedState) return; sessionStorage.removeItem(AUTH_STATE_KEY);
    try {
      const savedState = JSON.parse(rawSavedState) as { formValues?: FormValues; restoreChart?: boolean };
      if (!savedState.formValues) return;
      const restoredDraft = normalizeAnalysisFormDraft(savedState.formValues); if (!restoredDraft) return;
      syncFormState(restoredDraft);
      if (!savedState.restoreChart) return;
      calculate(restoredDraft);
    } catch { sessionStorage.removeItem(AUTH_STATE_KEY); }
  }, [calculate]);

  useEffect(() => { if (sessionStatus === 'authenticated') { setSigningIn(false); setLoginError(null); } }, [sessionStatus]);
  useEffect(() => {
    if (!result?.daYun) return void setActiveLuckCycle(0);
    const currentCycleIndex = result.daYun.pillars.findIndex((pillar) => currentYear >= pillar.yearStart && currentYear <= pillar.yearEnd);
    setActiveLuckCycle(currentCycleIndex >= 0 ? currentCycleIndex : 0);
  }, [currentYear, result]);

  async function handleGoogleSignIn() {
    setLoginError(null); setSigningIn(true);
    sessionStorage.setItem(AUTH_STATE_KEY, JSON.stringify({ formValues, restoreChart: Boolean(result && chartData) }));
    try {
      const response = await signIn('google', { callbackUrl: window.location.href, redirect: false });
      if (!response?.url) throw new Error('Unable to start Google sign-in. Please try again.');
      if (response.error) throw new Error(response.error);
      window.location.assign(response.url);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unable to sign in with Google.';
      setLoginError(message === 'Configuration' ? 'Google sign-in is not configured correctly on the server.' : 'Google sign-in failed. Please try again.');
      setSigningIn(false);
    }
  }

  async function runAnalysis() {
    if (!result || !chartData || !calculatedFormValues) return;
    setLoadingAnalysis(true); setAnalysisError(null); setAnalysis(null);
    try {
      const response = await fetch('/api/analyze', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(buildAnalyzeRequestBody({ formValues: calculatedFormValues, result, chartData })) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? 'Unable to analyze this chart right now.');
      if (data.error) throw new Error(data.error);
      setAnalysis(data.analysis); setFollowUps(EMPTY_FOLLOW_UPS);
    } catch (error: unknown) { setAnalysisError(error instanceof Error ? error.message : 'Unknown error'); } finally { setLoadingAnalysis(false); }
  }

  function updateFollowUp(index: number, patch: Partial<FollowUpItem>) { setFollowUps((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, ...patch } : item)); }

  async function runFollowUp(index: number) {
    if (!result || !chartData || !calculatedFormValues) return;
    const question = followUps[index]?.question.trim() ?? '';
    if (!question) return void updateFollowUp(index, { error: 'Please enter a question first.' });
    updateFollowUp(index, { loading: true, error: null, answer: null });
    try {
      const requestBody = { ...buildAnalyzeRequestBody({ formValues: calculatedFormValues, result, chartData }), mode: 'follow_up' as const, followUpQuestion: question };
      const response = await fetch('/api/analyze', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(requestBody) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? 'Unable to answer this question right now.');
      if (data.error) throw new Error(data.error);
      updateFollowUp(index, { answer: data.analysis, loading: false });
    } catch (error: unknown) { updateFollowUp(index, { loading: false, error: error instanceof Error ? error.message : 'Unknown error' }); }
  }

  function handleBirthPlaceQueryChange(value: string) { setShowStepValidation(false); setBirthPlaceQuery(value); setBirthPlace(null); }
  function handleBirthPlaceSelect(place: PlaceSearchResult) { setShowStepValidation(false); setBirthPlace(place); setBirthPlaceQuery([place.name, place.admin1, place.country].filter(Boolean).join(', ')); setTimezone(place.timezone); setLongitude(place.longitude.toFixed(4)); setLatitude(place.latitude.toFixed(4)); }
  function moveToStep(nextStep: number) { startTransition(() => setCurrentStep(nextStep)); }
  function goNext() {
    const error = validateStep(currentStep, formValues);
    if (error) {
      setShowStepValidation(true);
      return void setCalcError(error);
    }
    setShowStepValidation(false);
    setCalcError(null);
    moveToStep(Math.min(currentStep + 1, WIZARD_STEPS.length - 1));
  }
  function goBack() { setShowStepValidation(false); setCalcError(null); moveToStep(Math.max(currentStep - 1, 0)); }

  const confirmationSummary = useMemo(() => [
    ['Selection', formatMergedGenderSelection(calculationMode)],
    ['Birth date', dob || 'Not set'],
    ['Birth time', unknownTime ? 'Unknown time mode' : tob || 'Not set'],
    ['Birth place', birthPlaceQuery || 'Not set'],
    ['Timezone', timezone || 'Not set'],
    ['Coordinates', `${latitude || '-'}, ${longitude || '-'}`],
  ], [birthPlaceQuery, calculationMode, dob, latitude, longitude, timezone, tob, unknownTime]);

  const resultAnchor = result ? `${fmtDate(result.displayDate)}-${result.pillars.day.stem.zh}-${result.pillars.day.branch.zh}` : 'empty';
  const activeDaYun = result?.daYun?.pillars[activeLuckCycle] ?? null;
  const currentStepErrors = getStepFieldErrors(currentStep, formValues);
  const displayPillarOrder = getDisplayPillarOrder(result?.unknownTime ?? false);

  return (
    <section className="px-4 py-10 sm:px-6 lg:px-8" aria-labelledby="calculator-heading">
      <div className="mx-auto max-w-6xl">
        <div className="grid justify-center gap-6 lg:grid-cols-[minmax(0,560px)_280px] lg:items-start">
          <div className="rounded-[2.5rem] bg-[linear-gradient(135deg,rgba(255,255,255,0.74),rgba(255,255,255,0.58)_52%,rgba(240,250,255,0.7))] p-5 shadow-[0_28px_72px_rgba(0,106,98,0.08)] backdrop-blur-[24px] sm:p-7">
            <div>
              <Badge tone="cyan">Birth chart intake</Badge>
              <div className="mt-4 max-w-2xl">
                <p className="font-zh text-3xl font-bold tracking-[0.22em] text-[#006a62]">八字命盤</p>
                <h2 id="calculator-heading" className="mt-3 font-serif text-3xl tracking-[-0.03em] text-[#151d22] sm:text-[2.4rem]">
                  Guided chart creation, one step at a time
                </h2>
                <p className="mt-4 text-sm leading-8 text-[#151d22]/66 sm:text-base">
                  Every field, validator, and calculation stays intact. Move through the same
                  intake flow, then review the full chart and analysis below.
                </p>
              </div>

              <div className="mt-8">
                <Stepper
                  steps={WIZARD_STEPS.map((step) => ({ ...step }))}
                  currentStep={currentStep}
                  onStepClick={(index) => {
                    if (index <= currentStep) {
                      setShowStepValidation(false);
                      setCalcError(null);
                      moveToStep(index);
                    }
                  }}
                />
              </div>

              <GlowCard accent="cyan" className="mt-6 p-5 sm:p-6">
                <div key={currentStep} className="animate-reveal space-y-5">
                  {currentStep === 0 ? (
                    <>
                      <div>
                        <div className="text-[11px] uppercase tracking-[0.24em] text-[#006a62]/62">Step 1</div>
                        <h3 className="mt-2 font-serif text-[2rem] text-[#151d22]">Gender and polarity</h3>
                        <p className="mt-2 text-sm leading-7 text-[#151d22]/66">Choose one combined option. The calculator will keep the same internal fields and automatically map your selection to the existing classical Da Yun rule.</p>
                      </div>
                      <div className="space-y-3">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-medium uppercase tracking-[0.18em] text-[#151d22]/56">Selection · 命盤設定</span>
                          <span className="inline-flex h-5 w-5 cursor-help items-center justify-center rounded-full bg-white/56 text-[10px] font-semibold text-[#151d22]/62 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.72)]" title="This single choice updates both the displayed gender selection and the existing binary Da Yun calculation mode." onMouseEnter={() => trackEvent('tooltip_opened', { interaction_type: 'tooltip', screen_name: 'bazi_form' })} onFocus={() => trackEvent('tooltip_opened', { interaction_type: 'tooltip', screen_name: 'bazi_form' })}>?</span>
                        </div>
                        <p className="text-sm leading-7 text-[#151d22]/56">Choose one option below. No extra Yin/Yang step is required.</p>
                        <div className="grid gap-3 sm:grid-cols-2">
                          {MERGED_GENDER_OPTIONS.map((option) => {
                            const selected = calculationMode === option.value;
                            return (
                              <label key={option.value} data-selected={String(selected)} className="flex cursor-pointer items-start gap-4 rounded-[24px] bg-[linear-gradient(135deg,rgba(255,255,255,0.82),rgba(255,255,255,0.58))] px-5 py-4 transition-all duration-300 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.72)] hover:brightness-[1.02] hover:shadow-[inset_0_0_0_1px_rgba(64,224,208,0.18),0_18px_34px_rgba(0,106,98,0.07)] data-[selected=true]:shadow-[inset_0_0_0_1px_rgba(64,224,208,0.24),0_18px_38px_rgba(64,224,208,0.1)]">
                                <input type="radio" name="mergedGenderSelection" value={option.value} checked={selected} onChange={() => handleMergedGenderChange(option.value)} className="mt-1 h-4 w-4 border-white/20 bg-transparent text-[#006a62] focus:ring-[#40e0d0]" />
                                <span className="min-w-0"><span className="flex items-center gap-3"><span className="font-zh text-3xl font-bold text-[#006a62]">{option.yinYang}</span><span><span className="block text-sm font-semibold text-[#151d22]">{option.label}</span><span className="block text-xs text-[#151d22]/48">{option.pinyinLabel}</span></span></span><span className="mt-3 block text-sm leading-7 text-[#151d22]/66">{option.description}</span><span className="mt-2 block text-xs uppercase tracking-[0.18em] text-[#151d22]/42">{option.tagline}</span></span>
                              </label>
                            );
                          })}
                        </div>
                        {showStepValidation && currentStepErrors.calculationMode ? <p className="text-xs leading-6 text-[#874e58]">{currentStepErrors.calculationMode}</p> : null}
                      </div>
                    </>
                  ) : null}

                  {currentStep === 1 ? (
                    <>
                      <div><div className="text-[11px] uppercase tracking-[0.24em] text-[#006a62]/62">Step 2</div><h3 className="mt-2 font-serif text-[2rem] text-[#151d22]">Birth date and recorded time</h3><p className="mt-2 text-sm leading-7 text-[#151d22]/66">Enter the birth date and the recorded clock time from the certificate. Unknown time mode remains available and keeps the hour pillar unresolved.</p></div>
                      <div className="grid gap-4 sm:grid-cols-2">
                        <div><label className="text-xs font-medium uppercase tracking-[0.18em] text-[#151d22]/54">Date of Birth</label><input type="date" value={dob} onChange={(event) => { setShowStepValidation(false); setDob(event.target.value); }} className={cn(TEXT_INPUT_CLASS, 'mt-2')} />{showStepValidation && currentStepErrors.dob ? <p className="mt-2 text-xs leading-6 text-[#874e58]">{currentStepErrors.dob}</p> : null}</div>
                        <div><label className="text-xs font-medium uppercase tracking-[0.18em] text-[#151d22]/54">Time of Birth (clock time on certificate)</label><input type="time" value={tob} disabled={unknownTime} onChange={(event) => { setShowStepValidation(false); setTob(event.target.value); }} className={cn(TEXT_INPUT_CLASS, 'mt-2')} />{showStepValidation && currentStepErrors.tob ? <p className="mt-2 text-xs leading-6 text-[#874e58]">{currentStepErrors.tob}</p> : null}<p className="mt-2 text-xs leading-6 text-[#151d22]/52">Use the recorded local clock time at the birthplace. DST is handled automatically from the timezone.</p></div>
                      </div>
                      <label className="inline-flex items-center gap-3 rounded-2xl bg-[linear-gradient(135deg,rgba(255,255,255,0.78),rgba(255,255,255,0.58))] px-4 py-3 text-sm text-[#151d22]/72 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.72)]"><input type="checkbox" checked={unknownTime} onChange={(event) => { setShowStepValidation(false); setUnknownTime(event.target.checked); }} className="h-4 w-4 border-white/20 bg-transparent text-[#006a62] focus:ring-[#40e0d0]" /><span>I don&apos;t know my birth time</span></label>
                    </>
                  ) : null}

                  {currentStep === 2 ? (
                    <>
                      <div><div className="text-[11px] uppercase tracking-[0.24em] text-[#006a62]/62">Step 3</div><h3 className="mt-2 font-serif text-[2rem] text-[#151d22]">Birthplace, timezone, and coordinates</h3><p className="mt-2 text-sm leading-7 text-[#151d22]/66">Search the birthplace first, then fine-tune the timezone and coordinates manually if needed.</p></div>
                      <div className="grid gap-4 sm:grid-cols-2">
                        <BirthPlaceSearch value={birthPlaceQuery} onChange={handleBirthPlaceQueryChange} onSelect={handleBirthPlaceSelect} selectedPlace={birthPlace} />
                        <div className="rounded-[24px] bg-[linear-gradient(135deg,rgba(255,255,255,0.8),rgba(255,255,255,0.56))] p-4 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.72)]"><div className="text-xs font-semibold uppercase tracking-[0.18em] text-[#151d22]/46">Location summary</div><div className="mt-3 space-y-2 text-sm leading-7 text-[#151d22]/66"><div>Timezone: <span className="font-semibold text-[#151d22]">{timezone || '—'}</span></div><div>Longitude: <span className="font-semibold text-[#151d22]">{longitude || '—'}</span></div><div>Latitude: <span className="font-semibold text-[#151d22]">{latitude || '—'}</span></div></div>{showStepValidation && currentStepErrors.timezone ? <p className="mt-3 text-xs leading-6 text-[#874e58]">{currentStepErrors.timezone}</p> : null}<p className="mt-3 text-xs leading-6 text-[#151d22]/52">Longitude affects true solar time directly. Latitude is preserved for reference and logging.</p></div>
                      </div>
                      <details className="rounded-[24px] bg-[linear-gradient(135deg,rgba(255,255,255,0.8),rgba(255,255,255,0.56))] px-5 py-4 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.72)]"><summary className="cursor-pointer text-xs font-semibold uppercase tracking-[0.22em] text-[#151d22]/56">Advanced Location Details</summary><div className="mt-4 grid gap-4 sm:grid-cols-2"><div className="sm:col-span-2"><label className="text-xs font-medium uppercase tracking-[0.18em] text-[#151d22]/54">Timezone (DST detected automatically)</label><input type="text" value={timezone} onChange={(event) => { setShowStepValidation(false); setBirthPlace(null); setTimezone(event.target.value); }} placeholder="e.g. Asia/Bangkok" className={cn(TEXT_INPUT_CLASS, 'mt-2')} /></div><div><label className="text-xs font-medium uppercase tracking-[0.18em] text-[#151d22]/54">Longitude (°E positive, °W negative)</label><input type="number" value={longitude} onChange={(event) => { setShowStepValidation(false); setBirthPlace(null); setLongitude(event.target.value); }} min="-180" max="180" step="0.01" placeholder="e.g. 100.52" className={cn(TEXT_INPUT_CLASS, 'mt-2')} />{showStepValidation && currentStepErrors.longitude ? <p className="mt-2 text-xs leading-6 text-[#874e58]">{currentStepErrors.longitude}</p> : null}</div><div><label className="text-xs font-medium uppercase tracking-[0.18em] text-[#151d22]/54">Latitude (°N positive, °S negative)</label><input type="number" value={latitude} onChange={(event) => { setShowStepValidation(false); setBirthPlace(null); setLatitude(event.target.value); }} min="-90" max="90" step="0.01" placeholder="e.g. 13.75" className={cn(TEXT_INPUT_CLASS, 'mt-2')} />{showStepValidation && currentStepErrors.latitude ? <p className="mt-2 text-xs leading-6 text-[#874e58]">{currentStepErrors.latitude}</p> : null}</div></div></details>
                    </>
                  ) : null}

                  {currentStep === 3 ? (
                    <>
                      <div><div className="text-[11px] uppercase tracking-[0.24em] text-[#006a62]/62">Step 4</div><h3 className="mt-2 font-serif text-[2rem] text-[#151d22]">Confirmation and chart reveal</h3><p className="mt-2 text-sm leading-7 text-[#151d22]/66">Review the exact details that will be sent into the current calculation engine, then generate the chart.</p></div>
                      <div className="grid gap-3 sm:grid-cols-2">{confirmationSummary.map(([label, value]) => <StatTile key={label} label={label} value={value} />)}</div>
                      <div className="rounded-[24px] bg-[linear-gradient(135deg,rgba(64,224,208,0.14),rgba(255,255,255,0.72))] px-4 py-4 text-sm leading-7 text-[#151d22]/72 shadow-[inset_0_0_0_1px_rgba(64,224,208,0.16)]">The calculation still runs locally through the current BaZi engine. AI analysis remains optional and only runs after the chart exists.</div>
                    </>
                  ) : null}
                </div>
                {calcError ? <div className="mt-5 rounded-2xl bg-[linear-gradient(135deg,rgba(255,183,194,0.42),rgba(255,255,255,0.62))] px-4 py-3 text-sm text-[#874e58] shadow-[inset_0_0_0_1px_rgba(135,78,88,0.14)]">{calcError}</div> : null}
                <div className="mt-6 flex flex-wrap items-center justify-between gap-3"><div className="flex gap-3">{currentStep > 0 ? <Button variant="ghost" size="md" onClick={goBack}>Back</Button> : null}{currentStep < WIZARD_STEPS.length - 1 ? <Button variant="secondary" size="md" onClick={goNext}>Next</Button> : <Button variant="primary" size="lg" onClick={() => { if (calculationMode) trackEvent('calculation_mode_confirmed', { energy_type: calculationMode }); calculate(formValues); }}>Calculate Chart · 起命盤</Button>}</div></div>
              </GlowCard>
            </div>
          </div>
          <WizardPreview formValues={formValues} step={currentStep} />
        </div>
        {result && chartData ? (
          <div key={resultAnchor} className="mt-10 space-y-6 animate-reveal">
            <div className="grid gap-6 lg:grid-cols-[minmax(0,1.15fr)_360px]">
              <GlowCard accent="gold" className="p-6 sm:p-7"><div className="flex flex-wrap items-start justify-between gap-4"><div className="max-w-2xl"><Badge tone="gold">Character Profile</Badge><h3 className="mt-4 font-serif text-4xl text-[#151d22]">{result.pillars.day.stem.zh} {result.pillars.day.stem.pinyin} Day Master</h3><p className="mt-3 text-sm leading-8 text-[#151d22]/66">{getDayMasterNote(result.pillars.day.stem)}. The result surface now clusters the pillar story, timing, and analysis into focused panels without changing any source data.</p></div><div className="flex flex-wrap gap-2"><Badge tone="cyan">{formatMergedGenderSelection(calculatedFormValues?.calculationMode ?? calculationMode)}</Badge></div></div><div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4"><StatTile label="Day Master stem" value={`${result.pillars.day.stem.zh} (${result.pillars.day.stem.pinyin})`} hint={`${EL_LABEL[result.pillars.day.stem.element].zh} ${EL_LABEL[result.pillars.day.stem.element].en}`} /><StatTile label="Polarity" value={result.pillars.day.stem.yin ? 'Yin' : 'Yang'} hint="The core polarity of the Day Master stem." /><StatTile label="Clock / solar" value={result.unknownTime ? fmtDate(result.displayDate).split(' ')[0] : `${fmtDate(result.displayDate)} -> ${fmtDate(result.tstDate)}`} hint={result.unknownTime ? 'Hour pillar is intentionally left unknown.' : result.displayTzLabel} /><StatTile label="Luck cycle start" value={result.daYun ? `${result.daYun.startYears} yrs${result.daYun.startMonths > 0 ? ` ${result.daYun.startMonths} mths` : ''}` : 'Unavailable'} hint={result.daYun ? `${result.daYun.forward ? 'Forward' : 'Backward'} from ${result.daYun.jie.name}` : 'Requires full chart'} /></div></GlowCard>
              <GlowCard accent="violet" className="p-6"><div className="text-[11px] uppercase tracking-[0.22em] text-[#874e58]/62">Result briefing</div><div className="mt-4 space-y-4"><StatTile label="Local display" value={result.unknownTime ? fmtDate(result.displayDate).split(' ')[0] : fmtDate(result.displayDate)} hint={result.displayTzLabel} /><StatTile label="True solar time" value={result.unknownTime ? 'Not calculated' : fmtDate(result.tstDate)} hint={result.unknownTime ? 'Unknown birth time skips the hour pillar.' : 'Astronomically corrected time'} /><StatTile label="Current focus" value={activeDaYun ? `${activeDaYun.ageStart}-${activeDaYun.ageEnd}` : 'Luck cycles pending'} hint={activeDaYun ? `${activeDaYun.yearStart}-${activeDaYun.yearEnd}` : 'Use the journey map below'} /></div></GlowCard>
            </div>
            <div className="grid gap-5 lg:grid-cols-4">{displayPillarOrder.map((keyName) => <PillarCard key={keyName} result={result} keyName={keyName} currentYear={currentYear} />)}</div>
            {!result.unknownTime ? <TSTCard result={result} /> : null}
            <div className="grid gap-6 xl:grid-cols-2"><ChartContainer eyebrow="Chart pulse" title="5 Structures · 五行格局" description="The structure view is now drawn as a soft radial field, preserving the same underlying counts."><RadarGlowChart structureCounts={chartData.structureCounts} structureEls={chartData.structureEls} /></ChartContainer><ChartContainer eyebrow="Pattern loadout" title="10 Gods · 十神分布" description="All hidden stems are still included. The presentation now reads like a ranked signal board."><NeonBars tenGodsCount={chartData.tenGodsCount} /></ChartContainer></div>
            <GlowCard accent="cyan" className="p-6"><div><Badge tone="cyan">Source Matrix</Badge><h3 className="mt-3 font-serif text-[1.8rem] text-[#151d22]">Detailed pillar and Ten Gods reference</h3><p className="mt-2 text-sm leading-7 text-[#151d22]/66">The original analytical detail remains available here for practitioners who want the raw matrix view.</p></div><div className="cosmic-scrollbar mt-6 overflow-x-auto"><table className="min-w-[720px] w-full text-sm"><thead><tr className="text-xs uppercase tracking-[0.18em] text-[#151d22]/44"><th className="py-3 pr-4 text-left">Pillar</th><th className="py-3 px-2 text-center">Stem</th><th className="py-3 px-2 text-center">Stem God</th><th className="py-3 px-2 text-center">Branch</th><th className="py-3 px-2 text-center">Branch God</th></tr></thead><tbody>{displayPillarOrder.map((keyName) => { const summary = getPillarSummary(result, keyName); if (!summary) return null; const meta = PILLAR_META.find((item) => item.key === keyName)!; return <tr key={keyName} className="text-[#151d22]/74"><td className="py-3 pr-4"><div className="font-medium text-[#151d22]">{meta.label}</div><div className="text-xs text-[#151d22]/44">{meta.zh}</div></td><td className="py-3 px-2 text-center"><div className={cn('font-zh text-2xl font-bold', elColor(summary.pillar.stem.element))}>{summary.pillar.stem.zh}</div><div className="text-xs text-[#151d22]/44">{summary.pillar.stem.pinyin}</div></td><td className="py-3 px-2 text-center">{summary.stemGod ? <div className="flex items-center justify-center gap-2"><Badge tone={tgBadgeTone(TG_ABBR[summary.stemGod.zh] || '')}>{TG_ABBR[summary.stemGod.zh] || 'TG'}</Badge><span className="text-xs text-[#151d22]/62">{summary.stemGod.zh} {summary.stemGod.pinyin}</span></div> : <span className="text-xs text-[#151d22]/44">Day Master</span>}</td><td className="py-3 px-2 text-center"><div className={cn('font-zh text-2xl font-bold', elColor(summary.pillar.branch.element))}>{summary.pillar.branch.zh}</div><div className="text-xs text-[#151d22]/44">{summary.pillar.branch.pinyin}</div></td><td className="py-3 px-2 text-center"><div className="flex items-center justify-center gap-2"><Badge tone={tgBadgeTone(TG_ABBR[summary.branchGod.zh] || '')}>{TG_ABBR[summary.branchGod.zh] || 'TG'}</Badge><span className="text-xs text-[#151d22]/62">{summary.branchGod.zh} {summary.branchGod.pinyin}</span></div></td></tr>; })}</tbody></table></div><p className="mt-3 text-xs leading-6 text-[#151d22]/52">Branch God shows main qi (主氣) only. The charts above continue to count all hidden stems (藏干).</p></GlowCard>
            {result.daYun ? <GlowCard accent="pink" className="p-6"><div className="flex flex-wrap items-start justify-between gap-4"><div><Badge tone="pink">Journey Map</Badge><h3 className="mt-3 font-serif text-[2rem] text-[#151d22]">Major Luck Cycles · 大運</h3><p className="mt-2 text-sm leading-7 text-[#151d22]/66">The cycle stream now reads like a navigable progression path, while keeping the same decade markers and start-age logic.</p></div><div className="rounded-2xl bg-[linear-gradient(135deg,rgba(255,183,194,0.22),rgba(255,255,255,0.68))] px-4 py-3 text-sm text-[#151d22]/72 shadow-[inset_0_0_0_1px_rgba(255,183,194,0.18)]"><div>Direction: <span className="font-semibold text-[#151d22]">{result.daYun.forward ? 'Forward 順行' : 'Backward 逆行'}</span></div><div className="mt-1">Energy polarity: <span className="font-semibold text-[#151d22]">{formatCalculationGenderModeDisplay(result.daYun.calculationMode)}</span></div><div className="mt-1 text-xs text-[#151d22]/48">{result.daYun.ruleNote}</div></div></div><div className="mt-6 flex flex-wrap gap-3"><Button variant="secondary" size="sm" onClick={() => setActiveLuckCycle((current) => Math.max(current - 1, 0))} disabled={activeLuckCycle === 0}>Previous cycle</Button><Button variant="secondary" size="sm" onClick={() => setActiveLuckCycle((current) => Math.min(current + 1, result.daYun!.pillars.length - 1))} disabled={activeLuckCycle === result.daYun.pillars.length - 1}>Next cycle</Button></div><div className="cosmic-scrollbar mt-6 overflow-x-auto"><div className="flex min-w-max items-center gap-4 pb-3">{result.daYun.pillars.map((pillar, index) => { const isActive = index === activeLuckCycle; const isCurrent = currentYear >= pillar.yearStart && currentYear <= pillar.yearEnd; return <button key={`${pillar.cycleIdx}-${pillar.yearStart}`} type="button" onClick={() => setActiveLuckCycle(index)} className={cn('relative flex min-w-[138px] flex-col items-center rounded-[28px] px-4 py-4 text-center transition-all duration-300', isActive ? 'bg-[linear-gradient(135deg,rgba(64,224,208,0.18),rgba(255,255,255,0.82))] shadow-[inset_0_0_0_1px_rgba(64,224,208,0.22),0_18px_36px_rgba(64,224,208,0.12)]' : 'bg-[linear-gradient(135deg,rgba(255,255,255,0.78),rgba(255,255,255,0.58))] shadow-[inset_0_0_0_1px_rgba(255,255,255,0.72)] hover:brightness-[1.02]')}>{isCurrent ? <span className="absolute right-3 top-3 h-3 w-3 rounded-full bg-[#40e0d0] shadow-[0_0_16px_rgba(64,224,208,0.7)]" /> : null}<div className="text-[11px] uppercase tracking-[0.18em] text-[#151d22]/44">Cycle {index + 1}</div><div className="mt-2 text-xs text-[#151d22]/64">Age {pillar.ageStart}-{pillar.ageEnd}</div><div className="text-xs text-[#151d22]/46">{pillar.yearStart}-{pillar.yearEnd}</div><div className={cn('mt-4 font-zh text-3xl font-bold', elColor(pillar.stem.element))}>{pillar.stem.zh}</div><div className="my-2 h-px w-full bg-[linear-gradient(90deg,transparent,rgba(0,106,98,0.16),transparent)]" /><div className={cn('font-zh text-3xl font-bold', elColor(pillar.branch.element))}>{pillar.branch.zh}</div><div className="mt-2 text-xs text-[#151d22]/46">{pillar.stem.pinyin} / {pillar.branch.pinyin}</div></button>; })}</div></div>{activeDaYun ? <div className="mt-6 grid gap-4 lg:grid-cols-[minmax(0,1fr)_240px]"><div className="rounded-[28px] bg-[linear-gradient(135deg,rgba(255,255,255,0.8),rgba(255,255,255,0.58))] p-5 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.72)]"><div className="text-[11px] uppercase tracking-[0.2em] text-[#151d22]/46">Focused cycle</div><h4 className="mt-3 text-xl font-semibold text-[#151d22]">Age {activeDaYun.ageStart}-{activeDaYun.ageEnd} · {activeDaYun.yearStart}-{activeDaYun.yearEnd}</h4><p className="mt-3 text-sm leading-7 text-[#151d22]/66">Nearest solar term: <span className="font-semibold text-[#151d22]">{result.daYun.jie.name}</span>. Luck begins at <span className="font-semibold text-[#151d22]">{result.daYun.startYears} yrs{result.daYun.startMonths > 0 ? ` ${result.daYun.startMonths} mths` : ''}</span>.</p></div><div className="grid gap-3"><StatTile label="Stem" value={`${activeDaYun.stem.zh} ${activeDaYun.stem.pinyin}`} hint={EL_LABEL[activeDaYun.stem.element].en} /><StatTile label="Branch" value={`${activeDaYun.branch.zh} ${activeDaYun.branch.pinyin}`} hint={activeDaYun.branch.animal} /></div></div> : null}</GlowCard> : null}
            <GlowCard accent="violet" className="p-6 sm:p-7"><div className="flex flex-wrap items-start justify-between gap-4"><div className="max-w-2xl"><Badge tone="gold">AI Insight Panel</Badge><h3 className="mt-3 font-serif text-[2rem] text-[#151d22]">AI Reading · 八字解析</h3><p className="mt-2 text-sm leading-7 text-[#151d22]/66">The optional AI layer is now framed as a premium highlight panel, but it still uses the same authentication flow and endpoint.</p></div>{sessionStatus === 'authenticated' && session.user ? <div className="rounded-2xl bg-[linear-gradient(135deg,rgba(252,212,0,0.16),rgba(255,255,255,0.68))] px-4 py-3 text-sm text-[#151d22]/68 shadow-[inset_0_0_0_1px_rgba(112,93,0,0.12)]">Signed in as <span className="font-semibold text-[#151d22]">{session.user.email ?? session.user.name ?? 'Google user'}</span><button type="button" onClick={() => signOut({ callbackUrl: '/' })} className="ml-3 text-[#006a62] transition-colors hover:text-[#00564f]">Sign out</button></div> : null}</div><div className="mt-6 flex flex-wrap gap-3">{sessionStatus === 'loading' ? <Button variant="secondary" size="lg" disabled>Checking sign-in...</Button> : sessionStatus === 'authenticated' ? <Button variant="primary" size="lg" onClick={runAnalysis} disabled={loadingAnalysis}>{loadingAnalysis ? 'Analyzing...' : 'Analyze with AI · 用AI解析'}</Button> : <Button variant="secondary" size="lg" onClick={handleGoogleSignIn} disabled={signingIn}>{signingIn ? 'Redirecting to Google...' : 'Sign in with Google'}</Button>}</div>{loginError ? <div className="mt-4 rounded-2xl bg-[linear-gradient(135deg,rgba(255,183,194,0.42),rgba(255,255,255,0.62))] px-4 py-3 text-sm text-[#874e58] shadow-[inset_0_0_0_1px_rgba(135,78,88,0.14)]">{loginError}</div> : null}{analysisError ? <div className="mt-4 rounded-2xl bg-[linear-gradient(135deg,rgba(255,183,194,0.42),rgba(255,255,255,0.62))] px-4 py-3 text-sm text-[#874e58] shadow-[inset_0_0_0_1px_rgba(135,78,88,0.14)]">{analysisError}</div> : null}{analysis ? <><div className="mt-6 rounded-[28px] bg-[linear-gradient(135deg,rgba(255,248,228,0.78),rgba(255,255,255,0.64))] p-5 text-sm leading-8 text-[#151d22]/78 whitespace-pre-wrap shadow-[inset_0_0_0_1px_rgba(112,93,0,0.1)]">{analysis.split('\n').map((line, index) => <p key={`${line}-${index}`} className={line.trim() === '' ? 'mt-3' : ''}><RenderMd text={line} /></p>)}</div><div className="mt-6"><div><h4 className="font-serif text-[1.5rem] text-[#151d22]">Ask 3 More Questions</h4><p className="mt-1 text-sm leading-7 text-[#151d22]/66">Ask about career, relationships, timing, strengths, or any other point in this chart.</p></div><div className="mt-5 grid gap-4">{followUps.map((item, index) => <div key={index} className="rounded-[28px] bg-[linear-gradient(135deg,rgba(255,255,255,0.8),rgba(255,255,255,0.58))] p-4 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.72)]"><label className="block text-xs font-medium uppercase tracking-[0.18em] text-[#151d22]/44">Question {index + 1}</label><textarea value={item.question} onChange={(event) => updateFollowUp(index, { question: event.target.value, error: null })} rows={3} placeholder="e.g. What does this chart suggest about career direction over the next 3 years?" className={cn(TEXTAREA_CLASS, 'mt-3')} /><div className="mt-3 flex flex-wrap items-center gap-3"><Button variant="secondary" size="sm" onClick={() => runFollowUp(index)} disabled={item.loading}>{item.loading ? 'Asking...' : `Ask Question ${index + 1}`}</Button><span className="text-xs leading-6 text-[#151d22]/48">Each answer is returned separately and does not overwrite the main reading.</span></div>{item.error ? <div className="mt-3 rounded-2xl bg-[linear-gradient(135deg,rgba(255,183,194,0.42),rgba(255,255,255,0.62))] px-4 py-3 text-sm text-[#874e58] shadow-[inset_0_0_0_1px_rgba(135,78,88,0.14)]">{item.error}</div> : null}{item.answer ? <div className="mt-3 rounded-2xl bg-[linear-gradient(135deg,rgba(255,248,228,0.7),rgba(255,255,255,0.62))] px-4 py-4 text-sm leading-8 text-[#151d22]/76 whitespace-pre-wrap shadow-[inset_0_0_0_1px_rgba(112,93,0,0.08)]">{item.answer.split('\n').map((line, lineIndex) => <p key={`${line}-${lineIndex}`} className={line.trim() === '' ? 'mt-3' : ''}><RenderMd text={line} /></p>)}</div> : null}</div>)}</div></div></> : null}</GlowCard>
          </div>
        ) : null}
      </div>
    </section>
  );
}
