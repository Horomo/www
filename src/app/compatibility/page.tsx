'use client';

import { useState } from 'react';

import {
  computeBazi,
  EL_LABEL,
  type BaziResult,
  type Pillar,
} from '@/lib/bazi';
import {
  getBranchInteraction,
  getDayMasterRelationship,
  computeCompatibilityTier,
  computeElementBalance,
  type BranchInteraction,
  type DayMasterRelationship,
  type CompatibilityTier,
  type ElementBalance,
} from '@/lib/compatibility';

// ── Element color ──────────────────────────────────────────
function elColor(el: string): string {
  switch (el) {
    case 'wood':  return 'text-green-600';
    case 'fire':  return 'text-red-600';
    case 'earth': return 'text-stone-500';
    case 'metal': return 'text-amber-700';
    case 'water': return 'text-blue-600';
    default:      return 'text-slate-600';
  }
}

// ── Day Master relationship label ──────────────────────────
function dmRelationshipLabel(rel: DayMasterRelationship): string {
  switch (rel) {
    case 'generates':     return "A's element generates B's element — a nurturing and supportive dynamic where A gives energy to B.";
    case 'generated_by':  return "B's element generates A's element — B provides support and resources, A receives and flourishes.";
    case 'controls':      return "A's element restrains B's element — a directive dynamic where A takes the structuring role.";
    case 'controlled_by': return "B's element restrains A's element — B plays the disciplining role, A is shaped by B's influence.";
    case 'same':          return 'A and B share the same elemental nature — parallel energies, independent yet complementary.';
  }
}

// ── Branch interaction display ────────────────────────────
function branchInteractionDisplay(interaction: BranchInteraction): { label: string; status: 'positive' | 'neutral' | 'negative' } {
  switch (interaction) {
    case 'six_harmony': return { label: '六合 ✓', status: 'positive' };
    case 'six_clash':   return { label: '六冲 ✗', status: 'negative' };
    case 'neutral':     return { label: '中性 —', status: 'neutral' };
  }
}

// ── DM relationship display ────────────────────────────────
function dmDisplay(rel: DayMasterRelationship): { label: string; status: 'positive' | 'neutral' | 'negative' } {
  switch (rel) {
    case 'generates':
    case 'generated_by':  return { label: '相生 ✓', status: 'positive' };
    case 'controls':
    case 'controlled_by': return { label: '相克 ✗', status: 'negative' };
    case 'same':          return { label: '比和 —', status: 'neutral' };
  }
}

// ── Element balance display ────────────────────────────────
function balanceDisplay(b: ElementBalance): { label: string; status: 'positive' | 'neutral' | 'negative'; description: string } {
  if (b.missing.length === 0 && b.dominant.length === 0) {
    return { label: '均衡 ✓', status: 'positive', description: 'All five elements are present with no extreme imbalance.' };
  }
  const parts: string[] = [];
  if (b.missing.length > 0) parts.push(`缺 ${b.missing.map(el => EL_LABEL[el].zh).join('')}`);
  if (b.dominant.length > 0) parts.push(`${b.dominant.map(el => EL_LABEL[el].zh).join('')} 偏旺`);
  const label = parts.join('，');
  const desc = [
    b.missing.length > 0 ? `Missing element(s): ${b.missing.map(el => EL_LABEL[el].en).join(', ')}.` : '',
    b.dominant.length > 0 ? `Dominant element(s): ${b.dominant.map(el => EL_LABEL[el].en).join(', ')}.` : '',
  ].filter(Boolean).join(' ');
  return { label, status: 'neutral', description: desc };
}

// ── Status cell color ──────────────────────────────────────
function statusColor(s: 'positive' | 'neutral' | 'negative'): string {
  switch (s) {
    case 'positive': return 'text-green-700 font-semibold';
    case 'negative': return 'text-red-600 font-semibold';
    case 'neutral':  return 'text-amber-600 font-semibold';
  }
}

// ── Tier config ────────────────────────────────────────────
const TIER_CONFIG: Record<CompatibilityTier, { bg: string; border: string; summary: string }> = {
  '上等': {
    bg: 'bg-yellow-100',
    border: 'border-yellow-400',
    summary: 'The Day Branch harmonizes and the Day Masters nourish each other — a relationship of natural flow and mutual growth. This pairing carries the warmth of genuine compatibility.',
  },
  '中上': {
    bg: 'bg-teal-50',
    border: 'border-teal-400',
    summary: 'One of the key compatibility factors aligns favorably, providing a solid foundation. With understanding and shared effort, this relationship can flourish beyond its initial promise.',
  },
  '中等': {
    bg: 'bg-slate-100',
    border: 'border-slate-400',
    summary: 'The charts show neither strong harmony nor strong conflict — a neutral pairing. With communication and mutual respect, this relationship can develop its own unique strength.',
  },
  '需注意': {
    bg: 'bg-red-50',
    border: 'border-red-400',
    summary: 'There are conflicting energies between the two charts. Awareness and open communication are essential — challenges can be navigated when both partners understand each other\'s elemental nature.',
  },
};

// ── Pillar table ───────────────────────────────────────────
// dayHighlight: Tailwind classes for the day column background/text
function PillarTable({
  result,
  label,
  dayBg,
  dayText,
}: {
  result: BaziResult;
  label: string;
  dayBg: string;
  dayText: string;
}) {
  const cols = (['hour', 'day', 'month', 'year'] as const);

  function colHeader(k: string) {
    const labels: Record<string, string> = { hour: '時柱', day: '日柱', month: '月柱', year: '年柱' };
    return labels[k] ?? k;
  }

  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-x-auto">
      <div className={`px-4 py-2 text-sm font-semibold text-slate-700 border-b border-slate-100`}>{label}</div>
      <table className="w-full min-w-[340px]">
        <thead>
          <tr className="border-b border-slate-100">
            <th className="w-14 py-3 px-3 text-xs font-semibold text-slate-400 text-left"></th>
            {cols.map(k => (
              <th
                key={k}
                className={`py-3 px-3 text-center text-xs font-semibold ${k === 'day' ? `${dayBg} ${dayText}` : 'text-slate-500'}`}
              >
                {colHeader(k)}
                <br />
                <span className="text-[10px] font-normal capitalize opacity-70">{k}</span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {/* Stem row */}
          <tr className="border-b border-slate-100">
            <td className="py-3 px-3 text-xs text-slate-400 font-medium">天干<br />Stem</td>
            {cols.map(k => {
              const p: Pillar | null = result.pillars[k];
              if (!p) return (
                <td key={k} className="py-3 px-3 text-center">
                  <div className="font-zh text-3xl text-slate-300">?</div>
                  <div className="text-xs text-slate-300 mt-0.5">—</div>
                  <div className="text-[10px] text-slate-300">Unknown</div>
                </td>
              );
              return (
                <td key={k} className={`py-3 px-3 text-center ${k === 'day' ? dayBg : ''}`}>
                  {k === 'day' && <div className={`text-[10px] font-semibold ${dayText} mb-1`}>日主</div>}
                  <div className={`font-zh text-3xl font-bold ${elColor(p.stem.element)}`}>{p.stem.zh}</div>
                  <div className="text-xs text-slate-500 mt-0.5">{p.stem.pinyin}</div>
                  <div className="text-[10px] text-slate-400">
                    {EL_LABEL[p.stem.element].zh}{p.stem.yin ? '陰' : '陽'} · {EL_LABEL[p.stem.element].en} {p.stem.yin ? 'Yin' : 'Yang'}
                  </div>
                </td>
              );
            })}
          </tr>
          {/* Branch row */}
          <tr>
            <td className="py-3 px-3 text-xs text-slate-400 font-medium">地支<br />Branch</td>
            {cols.map(k => {
              const p: Pillar | null = result.pillars[k];
              if (!p) return (
                <td key={k} className="py-3 px-3 text-center">
                  <div className="font-zh text-3xl text-slate-300">?</div>
                  <div className="text-xs text-slate-300 mt-0.5">—</div>
                  <div className="text-[10px] text-slate-300">Unknown</div>
                </td>
              );
              return (
                <td key={k} className={`py-3 px-3 text-center ${k === 'day' ? dayBg : ''}`}>
                  <div className={`font-zh text-3xl font-bold ${elColor(p.branch.element)}`}>{p.branch.zh}</div>
                  <div className="text-xs text-slate-500 mt-0.5">{p.branch.pinyin} · {p.branch.animal}</div>
                  <div className="text-[10px] text-slate-400">
                    {EL_LABEL[p.branch.element].zh}{p.branch.yin ? '陰' : '陽'} · {EL_LABEL[p.branch.element].en} {p.branch.yin ? 'Yin' : 'Yang'}
                  </div>
                </td>
              );
            })}
          </tr>
        </tbody>
      </table>
    </div>
  );
}

// ── Types ──────────────────────────────────────────────────
type CompatibilityResult = {
  resultA: BaziResult;
  resultB: BaziResult;
  dayBranchInteraction: BranchInteraction;
  yearBranchInteraction: BranchInteraction;
  dayMasterRelationship: DayMasterRelationship;
  tier: CompatibilityTier;
  elementBalance: ElementBalance;
};

// ── Main component ─────────────────────────────────────────
export default function CompatibilityPage() {
  const [nameA, setNameA] = useState('');
  const [dobA,  setDobA]  = useState('');
  const [tobA,  setTobA]  = useState('');

  const [nameB, setNameB] = useState('');
  const [dobB,  setDobB]  = useState('');
  const [tobB,  setTobB]  = useState('');

  const [result, setResult] = useState<CompatibilityResult | null>(null);
  const [error,  setError]  = useState<string | null>(null);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setResult(null);

    if (!dobA) { setError('Please enter Date of Birth for Person A.'); return; }
    if (!dobB) { setError('Please enter Date of Birth for Person B.'); return; }

    try {
      const resultA = computeBazi(
        dobA,
        tobA || null,
        'Asia/Bangkok',
        100.52,
        'male',
      );
      const resultB = computeBazi(
        dobB,
        tobB || null,
        'Asia/Bangkok',
        100.52,
        'male',
      );

      const dayBranchInteraction  = getBranchInteraction(
        resultA.pillars.day.branch.zh,
        resultB.pillars.day.branch.zh,
      );
      const yearBranchInteraction = getBranchInteraction(
        resultA.pillars.year.branch.zh,
        resultB.pillars.year.branch.zh,
      );
      const dayMasterRelationship = getDayMasterRelationship(
        resultA.pillars.day.stem.element,
        resultB.pillars.day.stem.element,
      );
      const tier = computeCompatibilityTier(dayBranchInteraction, dayMasterRelationship);
      const elementBalance = computeElementBalance(resultA.pillars, resultB.pillars);

      const nextResult: CompatibilityResult = {
        resultA, resultB,
        dayBranchInteraction, yearBranchInteraction,
        dayMasterRelationship, tier, elementBalance,
      };

      setResult(nextResult);

      // Fire-and-forget log to server
      fetch('/api/log-compatibility', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          personA: { name: nameA, date: dobA, time: tobA },
          personB: { name: nameB, date: dobB, time: tobB },
          pillarsA: resultA.pillars,
          pillarsB: resultB.pillars,
          tier,
          dayBranchInteraction,
          dayMasterRelationship,
          elementBalance,
        }),
      }).catch(err => console.error('Compatibility log failed', err));

    } catch (e: unknown) {
      setError('Calculation error: ' + (e instanceof Error ? e.message : String(e)));
    }
  }

  const tierCfg = result ? TIER_CONFIG[result.tier] : null;
  const branchDisp = result ? branchInteractionDisplay(result.dayBranchInteraction) : null;
  const yearBranchDisp = result ? branchInteractionDisplay(result.yearBranchInteraction) : null;
  const dmDisp    = result ? dmDisplay(result.dayMasterRelationship) : null;
  const balDisp   = result ? balanceDisplay(result.elementBalance) : null;

  return (
    <>
      <style>{`
        @keyframes compFadeIn {
          from { opacity: 0; transform: translateY(12px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .comp-fade-in {
          animation: compFadeIn 0.4s ease both;
        }
      `}</style>

      <main className="min-h-screen bg-slate-100 py-8 px-4" style={{ fontFamily: "'Inter', system-ui, sans-serif" }}>
        <div className="max-w-4xl mx-auto space-y-4">

          {/* Header */}
          <header className="text-center pb-2">
            <div className="font-zh text-4xl font-bold text-slate-900 tracking-widest">合婚分析</div>
            <div className="text-xs font-semibold tracking-widest text-slate-400 uppercase mt-1">Compatibility Analysis</div>
            <div className="w-8 h-0.5 bg-indigo-600 mx-auto mt-3 rounded" />
          </header>

          {/* Form */}
          <form onSubmit={handleSubmit} className="bg-white border border-slate-200 rounded-xl shadow-sm p-5 space-y-4">
            <div className="text-xs font-semibold tracking-widest text-slate-400 uppercase">Birth Information · 生辰</div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Person A */}
              <div className="rounded-xl border border-indigo-100 bg-indigo-50/40 p-4 space-y-3">
                <div className="text-sm font-semibold text-indigo-700">命主甲 · Person A</div>

                <div className="flex flex-col gap-1">
                  <label className="text-xs font-medium text-slate-600">Name (optional)</label>
                  <input
                    type="text"
                    value={nameA}
                    onChange={e => setNameA(e.target.value)}
                    placeholder="e.g. Ariya"
                    className="bg-white border border-slate-200 rounded-lg text-slate-900 text-sm px-3 py-2 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-xs font-medium text-slate-600">Date of Birth</label>
                  <input
                    type="date"
                    value={dobA}
                    onChange={e => setDobA(e.target.value)}
                    className="bg-white border border-slate-200 rounded-lg text-slate-900 text-sm px-3 py-2 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-xs font-medium text-slate-600">Time of Birth</label>
                  <input
                    type="time"
                    value={tobA}
                    onChange={e => setTobA(e.target.value)}
                    className="bg-white border border-slate-200 rounded-lg text-slate-900 text-sm px-3 py-2 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                  />
                  <p className="text-[10px] text-slate-400">Thailand local time (UTC+7)</p>
                </div>
              </div>

              {/* Person B */}
              <div className="rounded-xl border border-amber-100 bg-amber-50/40 p-4 space-y-3">
                <div className="text-sm font-semibold text-amber-700">命主乙 · Person B</div>

                <div className="flex flex-col gap-1">
                  <label className="text-xs font-medium text-slate-600">Name (optional)</label>
                  <input
                    type="text"
                    value={nameB}
                    onChange={e => setNameB(e.target.value)}
                    placeholder="e.g. Prim"
                    className="bg-white border border-slate-200 rounded-lg text-slate-900 text-sm px-3 py-2 focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-100"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-xs font-medium text-slate-600">Date of Birth</label>
                  <input
                    type="date"
                    value={dobB}
                    onChange={e => setDobB(e.target.value)}
                    className="bg-white border border-slate-200 rounded-lg text-slate-900 text-sm px-3 py-2 focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-100"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-xs font-medium text-slate-600">Time of Birth</label>
                  <input
                    type="time"
                    value={tobB}
                    onChange={e => setTobB(e.target.value)}
                    className="bg-white border border-slate-200 rounded-lg text-slate-900 text-sm px-3 py-2 focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-100"
                  />
                  <p className="text-[10px] text-slate-400">Thailand local time (UTC+7)</p>
                </div>
              </div>
            </div>

            {error && <div className="text-red-600 text-sm">{error}</div>}

            <div className="flex justify-center">
              <button
                type="submit"
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm px-8 py-2.5 rounded-lg transition-colors"
              >
                分析合婚
              </button>
            </div>
          </form>

          {/* Results */}
          {result && tierCfg && branchDisp && yearBranchDisp && dmDisp && balDisp && (
            <>
              {/* Section 1 — Side-by-side charts */}
              <div className="comp-fade-in space-y-4" style={{ animationDelay: '0ms' }}>
                <PillarTable
                  result={result.resultA}
                  label={nameA || '命主甲 · Person A'}
                  dayBg="bg-indigo-50"
                  dayText="text-indigo-700"
                />
                <PillarTable
                  result={result.resultB}
                  label={nameB || '命主乙 · Person B'}
                  dayBg="bg-amber-50"
                  dayText="text-amber-700"
                />
              </div>

              {/* Section 2 — Relationship Summary Card */}
              <div
                className="comp-fade-in bg-white border border-slate-200 rounded-xl shadow-sm p-5"
                style={{ animationDelay: '150ms' }}
              >
                <div className="text-xs font-semibold tracking-widest text-slate-400 uppercase mb-4">
                  日主关系 · Day Master Relationship
                </div>
                <div className="flex items-center justify-center gap-6 mb-4">
                  <div className="text-center">
                    <div className={`font-zh text-5xl font-bold ${elColor(result.resultA.pillars.day.stem.element)}`}>
                      {result.resultA.pillars.day.stem.zh}
                    </div>
                    <div className="text-xs text-slate-500 mt-1">
                      {EL_LABEL[result.resultA.pillars.day.stem.element].en}
                      {' '}{result.resultA.pillars.day.stem.yin ? 'Yin' : 'Yang'}
                    </div>
                    <div className="text-[10px] text-slate-400 mt-0.5">{nameA || '命主甲'}</div>
                  </div>

                  <div className="text-2xl text-slate-300 select-none">←→</div>

                  <div className="text-center">
                    <div className={`font-zh text-5xl font-bold ${elColor(result.resultB.pillars.day.stem.element)}`}>
                      {result.resultB.pillars.day.stem.zh}
                    </div>
                    <div className="text-xs text-slate-500 mt-1">
                      {EL_LABEL[result.resultB.pillars.day.stem.element].en}
                      {' '}{result.resultB.pillars.day.stem.yin ? 'Yin' : 'Yang'}
                    </div>
                    <div className="text-[10px] text-slate-400 mt-0.5">{nameB || '命主乙'}</div>
                  </div>
                </div>
                <p className="text-sm text-slate-600 text-center max-w-lg mx-auto">
                  {dmRelationshipLabel(result.dayMasterRelationship)}
                </p>
              </div>

              {/* Section 3 — Key Interactions Table */}
              <div
                className="comp-fade-in bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden"
                style={{ animationDelay: '300ms' }}
              >
                <div className="px-5 py-3 border-b border-slate-100 text-xs font-semibold tracking-widest text-slate-400 uppercase">
                  关键互动 · Key Interactions
                </div>
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-slate-100 bg-slate-50">
                      <th className="py-2.5 px-5 text-left text-xs font-semibold text-slate-500">分析项目</th>
                      <th className="py-2.5 px-5 text-left text-xs font-semibold text-slate-500">结果</th>
                      <th className="py-2.5 px-5 text-left text-xs font-semibold text-slate-500">说明</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b border-slate-50">
                      <td className="py-3 px-5 text-sm text-slate-600 font-medium">日支关系</td>
                      <td className={`py-3 px-5 text-sm ${statusColor(branchDisp.status)}`}>{branchDisp.label}</td>
                      <td className="py-3 px-5 text-xs text-slate-400">
                        Day Branch: {result.resultA.pillars.day.branch.zh} &amp; {result.resultB.pillars.day.branch.zh}
                      </td>
                    </tr>
                    <tr className="border-b border-slate-50">
                      <td className="py-3 px-5 text-sm text-slate-600 font-medium">年支关系</td>
                      <td className={`py-3 px-5 text-sm ${statusColor(yearBranchDisp.status)}`}>{yearBranchDisp.label}</td>
                      <td className="py-3 px-5 text-xs text-slate-400">
                        Year Branch: {result.resultA.pillars.year.branch.zh} &amp; {result.resultB.pillars.year.branch.zh}
                      </td>
                    </tr>
                    <tr className="border-b border-slate-50">
                      <td className="py-3 px-5 text-sm text-slate-600 font-medium">日主关系</td>
                      <td className={`py-3 px-5 text-sm ${statusColor(dmDisp.status)}`}>{dmDisp.label}</td>
                      <td className="py-3 px-5 text-xs text-slate-400">
                        {result.resultA.pillars.day.stem.zh} ({EL_LABEL[result.resultA.pillars.day.stem.element].en}) · {result.resultB.pillars.day.stem.zh} ({EL_LABEL[result.resultB.pillars.day.stem.element].en})
                      </td>
                    </tr>
                    <tr>
                      <td className="py-3 px-5 text-sm text-slate-600 font-medium">元素平衡</td>
                      <td className={`py-3 px-5 text-sm ${statusColor(balDisp.status)}`}>{balDisp.label}</td>
                      <td className="py-3 px-5 text-xs text-slate-400">{balDisp.description}</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Section 4 — Overall Rating Banner */}
              <div
                className={`comp-fade-in rounded-xl border-2 p-6 text-center ${tierCfg.bg} ${tierCfg.border}`}
                style={{ animationDelay: '450ms' }}
              >
                <div className="font-zh text-4xl font-bold text-slate-800 tracking-wider mb-2">
                  {result.tier}
                </div>
                <p className="text-sm text-slate-600 max-w-xl mx-auto leading-relaxed">
                  {tierCfg.summary}
                </p>
              </div>
            </>
          )}

        </div>
      </main>
    </>
  );
}
