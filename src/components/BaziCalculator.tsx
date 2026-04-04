'use client';

import { signIn, signOut, useSession } from 'next-auth/react';
import { useEffect, useState } from 'react';
import { buildAnalyzeRequestBody, type AnalysisFormPayload } from '@/lib/analysis-payload';
import {
  computeBazi,
  computeChartData,
  BaziResult,
  ChartData,
  STEMS,
  BRANCHES,
  EL_LABEL,
  TG_ABBR,
  tenGod,
  getBranchMainStem,
  getDayMasterNote,
} from '@/lib/bazi';

// ── IANA Timezone list ─────────────────────────────────────
const TIMEZONES: { value: string; label: string }[] = [
  // Asia
  { value: 'Asia/Bangkok',                    label: 'UTC+7  — Bangkok, Hanoi, Jakarta'             },
  { value: 'Asia/Ho_Chi_Minh',                label: 'UTC+7  — Ho Chi Minh City'                   },
  { value: 'Asia/Jakarta',                    label: 'UTC+7  — Jakarta, Surabaya'                   },
  { value: 'Asia/Yangon',                     label: 'UTC+6:30 — Yangon'                            },
  { value: 'Asia/Dhaka',                      label: 'UTC+6  — Dhaka'                               },
  { value: 'Asia/Kolkata',                    label: 'UTC+5:30 — Mumbai, New Delhi'                 },
  { value: 'Asia/Karachi',                    label: 'UTC+5  — Karachi, Islamabad'                  },
  { value: 'Asia/Dubai',                      label: 'UTC+4  — Dubai, Abu Dhabi'                    },
  { value: 'Asia/Tehran',                     label: 'UTC+3:30/4:30 — Tehran'                       },
  { value: 'Asia/Baghdad',                    label: 'UTC+3  — Baghdad'                             },
  { value: 'Asia/Riyadh',                     label: 'UTC+3  — Riyadh, Kuwait, Nairobi'             },
  { value: 'Asia/Beirut',                     label: 'UTC+2/3 — Beirut, Amman'                      },
  { value: 'Asia/Jerusalem',                  label: 'UTC+2/3 — Jerusalem, Tel Aviv'                },
  { value: 'Asia/Singapore',                  label: 'UTC+8  — Singapore, Kuala Lumpur'             },
  { value: 'Asia/Shanghai',                   label: 'UTC+8  — Beijing, Shanghai, Chongqing'        },
  { value: 'Asia/Taipei',                     label: 'UTC+8  — Taipei'                              },
  { value: 'Asia/Hong_Kong',                  label: 'UTC+8  — Hong Kong'                           },
  { value: 'Asia/Manila',                     label: 'UTC+8  — Manila'                              },
  { value: 'Asia/Seoul',                      label: 'UTC+9  — Seoul'                               },
  { value: 'Asia/Tokyo',                      label: 'UTC+9  — Tokyo, Osaka'                        },
  // Europe
  { value: 'UTC',                             label: 'UTC±0  — Coordinated Universal Time'          },
  { value: 'Europe/London',                   label: 'UTC+0/1 — London, Dublin, Lisbon'             },
  { value: 'Europe/Paris',                    label: 'UTC+1/2 — Paris, Berlin, Rome, Madrid'        },
  { value: 'Europe/Helsinki',                 label: 'UTC+2/3 — Helsinki, Riga, Tallinn'            },
  { value: 'Europe/Athens',                   label: 'UTC+2/3 — Athens, Bucharest, Cairo'           },
  { value: 'Europe/Moscow',                   label: 'UTC+3  — Moscow, Minsk'                       },
  { value: 'Europe/Istanbul',                 label: 'UTC+3  — Istanbul, Ankara'                    },
  // Americas
  { value: 'America/New_York',                label: 'UTC−5/4 — New York, Toronto, Miami'           },
  { value: 'America/Chicago',                 label: 'UTC−6/5 — Chicago, Houston, Mexico City'      },
  { value: 'America/Denver',                  label: 'UTC−7/6 — Denver, Phoenix'                   },
  { value: 'America/Los_Angeles',             label: 'UTC−8/7 — Los Angeles, Seattle, Vancouver'   },
  { value: 'America/Anchorage',               label: 'UTC−9/8 — Anchorage'                         },
  { value: 'Pacific/Honolulu',                label: 'UTC−10 — Honolulu'                            },
  { value: 'America/Bogota',                  label: 'UTC−5  — Bogotá, Lima, Quito'                 },
  { value: 'America/Caracas',                 label: 'UTC−4  — Caracas'                             },
  { value: 'America/Santiago',                label: 'UTC−4/3 — Santiago'                           },
  { value: 'America/Sao_Paulo',               label: 'UTC−3/2 — São Paulo, Rio de Janeiro'          },
  { value: 'America/Argentina/Buenos_Aires',  label: 'UTC−3  — Buenos Aires, Montevideo'            },
  // Pacific & Oceania
  { value: 'Australia/Sydney',                label: 'UTC+10/11 — Sydney, Melbourne, Canberra'      },
  { value: 'Australia/Perth',                 label: 'UTC+8  — Perth'                               },
  { value: 'Pacific/Auckland',                label: 'UTC+12/13 — Auckland, Wellington'             },
  // Africa
  { value: 'Africa/Lagos',                    label: 'UTC+1  — Lagos, Kinshasa, Accra'              },
  { value: 'Africa/Johannesburg',             label: 'UTC+2  — Johannesburg, Harare'                },
];

// ── Element color helper ───────────────────────────────────
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

// ── TG badge color helper ──────────────────────────────────
function tgBadgeColor(abbr: string): string {
  switch (abbr) {
    case 'FR': case 'RW': return 'bg-slate-500';
    case 'EG': case 'HO': return 'bg-amber-600';
    case 'IW': case 'DW': return 'bg-green-600';
    case '7K': case 'DO': return 'bg-red-600';
    case 'IR': case 'DR': return 'bg-violet-600';
    default: return 'bg-slate-400';
  }
}

// ── Format date helper ─────────────────────────────────────
function fmtDate(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())} `
       + `${pad(date.getUTCHours())}:${pad(date.getUTCMinutes())}`;
}

function fmtMin(min: number): string {
  const sign = min >= 0 ? '+' : '−';
  const abs  = Math.abs(min);
  const m    = Math.round(abs);
  return `${sign}${m} min`;
}

// ── SVG Radar Chart ────────────────────────────────────────
function RadarSVG({ structureCounts, structureEls }: { structureCounts: Record<string, number>; structureEls: Record<string, string> }) {
  const W = 280, H = 264;
  const cx = 140, cy = 134;
  const rMax = 72;
  const toRad = (d: number) => d * Math.PI / 180;
  const px = (d: number, r: number) => (cx + r * Math.cos(toRad(d))).toFixed(1);
  const py = (d: number, r: number) => (cy + r * Math.sin(toRad(d))).toFixed(1);

  const structs = [
    { key: 'companion', name: 'Companion', angle: -90 },
    { key: 'output',    name: 'Output',    angle: -18 },
    { key: 'wealth',    name: 'Wealth',    angle:  54 },
    { key: 'influence', name: 'Influence', angle: 126 },
    { key: 'resource',  name: 'Resource',  angle: 198 },
  ];
  const elZh: Record<string, string> = { wood:'木', fire:'火', earth:'土', metal:'金', water:'水' };
  const elEn: Record<string, string> = { wood:'Wood', fire:'Fire', earth:'Earth', metal:'Metal', water:'Water' };

  const maxScale = Math.max(4, ...Object.values(structureCounts));

  const gridLines = [1, 2, 3, 4].map(l => {
    const r = rMax * l / 4;
    const pts = structs.map(s => `${px(s.angle, r)},${py(s.angle, r)}`).join(' ');
    return <polygon key={l} points={pts} fill="none" stroke="#E2E8F0" strokeWidth="1" />;
  });

  const axes = structs.map(s => (
    <line key={s.key} x1={cx} y1={cy} x2={px(s.angle, rMax)} y2={py(s.angle, rMax)} stroke="#E2E8F0" strokeWidth="1" />
  ));

  const dataPts = structs.map(s => {
    const v = structureCounts[s.key] || 0;
    const r = v === 0 ? 0 : rMax * Math.min(v, maxScale) / maxScale;
    return `${px(s.angle, r)},${py(s.angle, r)}`;
  }).join(' ');

  const dots = structs.map(s => {
    const v = structureCounts[s.key] || 0;
    const r = rMax * Math.min(v, maxScale) / maxScale;
    return (
      <g key={s.key}>
        <circle cx={px(s.angle, r)} cy={py(s.angle, r)} r="3.5" fill="#4F46E5" stroke="#fff" strokeWidth="1.5" />
        {v > 0 && (
          <text x={px(s.angle, r)} y={(parseFloat(py(s.angle, r)) - 6).toFixed(1)} textAnchor="middle" fontSize="9" fontWeight="700" fill="#4F46E5">{v}</text>
        )}
      </g>
    );
  });

  const anchorOf = (d: number) => Math.cos(toRad(d)) > 0.2 ? 'start' : Math.cos(toRad(d)) < -0.2 ? 'end' : 'middle';
  const labelR = rMax + 26;
  const labels = structs.map(s => {
    const el = structureEls[s.key];
    const anchor = anchorOf(s.angle);
    return (
      <g key={s.key}>
        <text x={px(s.angle, labelR)} y={(parseFloat(py(s.angle, labelR)) - 4).toFixed(1)} textAnchor={anchor} fontSize="9.5" fontWeight="600" fill="#475569">{s.name}</text>
        <text x={px(s.angle, labelR)} y={(parseFloat(py(s.angle, labelR)) + 8).toFixed(1)} textAnchor={anchor} fontSize="8.5" fill="#94A3B8">{elZh[el]} {elEn[el]}</text>
      </g>
    );
  });

  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" fontFamily="Inter,sans-serif">
      {gridLines}
      {axes}
      <polygon points={dataPts} fill="rgba(79,70,229,0.12)" stroke="#4F46E5" strokeWidth="2" strokeLinejoin="round" />
      {dots}
      {labels}
    </svg>
  );
}

// ── SVG Bar Chart ──────────────────────────────────────────
function BarsSVG({ tenGodsCount }: { tenGodsCount: Record<string, number> }) {
  const ALL_TG = [
    { zh:'比肩', en:'Friend'            },
    { zh:'劫財', en:'Rob Wealth'        },
    { zh:'食神', en:'Eating God'        },
    { zh:'傷官', en:'Hurting Officer'   },
    { zh:'偏財', en:'Indirect Wealth'   },
    { zh:'正財', en:'Direct Wealth'     },
    { zh:'偏官', en:'Seven Killing'     },
    { zh:'正官', en:'Direct Officer'    },
    { zh:'偏印', en:'Indirect Resource' },
    { zh:'正印', en:'Direct Resource'   },
  ];
  const sorted = [...ALL_TG].sort((a, b) => (tenGodsCount[b.zh] || 0) - (tenGodsCount[a.zh] || 0));
  const maxVal = Math.max(...ALL_TG.map(t => tenGodsCount[t.zh] || 0), 1);
  const labelW = 148, barMaxW = 130, rowH = 24;
  const H = sorted.length * rowH + 20;
  const W = labelW + barMaxW + 24;

  const rows = sorted.map((tg, i) => {
    const count = tenGodsCount[tg.zh] || 0;
    const bw = count === 0 ? 0 : Math.max(4, (count / maxVal) * barMaxW);
    const y = i * rowH + 2;
    const color = count >= 2 ? '#DC2626' : '#94A3B8';
    return (
      <g key={tg.zh}>
        <text x={labelW - 6} y={y + 14} textAnchor="end" fontSize="10" fill="#475569">{tg.en} {tg.zh}</text>
        {count > 0 && <rect x={labelW} y={y + 5} width={bw} height="11" rx="2" fill={color} />}
      </g>
    );
  });

  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" fontFamily="Inter,sans-serif">
      {rows}
      <line x1={labelW} y1={H - 8} x2={labelW + barMaxW} y2={H - 8} stroke="#E2E8F0" strokeWidth="1" />
      <text x={labelW} y={H - 2} fontSize="8" fill="#94A3B8" textAnchor="middle">0</text>
      <text x={labelW + barMaxW} y={H - 2} fontSize="8" fill="#94A3B8" textAnchor="middle">{maxVal}</text>
    </svg>
  );
}

// ── Markdown bold renderer ─────────────────────────────────
function RenderMd({ text }: { text: string }) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return (
    <>
      {parts.map((part, i) =>
        part.startsWith('**') && part.endsWith('**')
          ? <strong key={i}>{part.slice(2, -2)}</strong>
          : part
      )}
    </>
  );
}

// ── TST Info Card ──────────────────────────────────────────
function TSTCard({ result }: { result: BaziResult }) {
  const { tst, localDate, tstDate, tzLabel } = result;
  if (!tst) return null;

  const pad = (n: number) => String(n).padStart(2, '0');
  const clockStr = `${pad(localDate.getUTCHours())}:${pad(localDate.getUTCMinutes())}`;
  const tstStr   = `${pad(tstDate.getUTCHours())}:${pad(tstDate.getUTCMinutes())}`;

  const rows = [
    { label: 'Clock Time (birth certificate)', value: clockStr, note: tzLabel + (tst.dstApplied ? ' incl. DST' : ''), color: 'text-slate-700' },
    { label: 'Step 1 · DST Correction',        value: fmtMin(tst.dstCorrectionMin), note: tst.dstApplied ? 'DST detected — reverted to standard time' : 'No DST in effect', color: tst.dstApplied ? 'text-amber-600' : 'text-slate-400' },
    { label: 'Step 2 · Longitude Correction',  value: fmtMin(tst.lonCorrectionMin), note: '(longitude − std meridian) × 4 min/°', color: 'text-indigo-600' },
    { label: 'Step 3 · Equation of Time',      value: fmtMin(tst.eotMin),           note: 'Earth orbital eccentricity correction', color: 'text-teal-600' },
  ];

  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-5">
      <h3 className="text-sm font-semibold text-slate-700 mb-1">True Solar Time · 真太陽時</h3>
      <p className="text-xs text-slate-400 mb-4">3-step astronomical correction applied to clock time</p>

      <div className="space-y-2">
        {rows.map(r => (
          <div key={r.label} className="flex items-start justify-between gap-4 py-1.5 border-b border-slate-50 last:border-0">
            <div>
              <div className="text-xs font-medium text-slate-600">{r.label}</div>
              <div className="text-[10px] text-slate-400 mt-0.5">{r.note}</div>
            </div>
            <div className={`text-sm font-bold tabular-nums shrink-0 ${r.color}`}>{r.value}</div>
          </div>
        ))}

        {/* Result */}
        <div className="flex items-center justify-between pt-2 mt-1">
          <div>
            <div className="text-xs font-semibold text-slate-700">True Solar Time</div>
            <div className="text-[10px] text-slate-400">Total correction: {fmtMin(tst.totalCorrectionMin)}</div>
          </div>
          <div className="text-lg font-bold text-indigo-700 tabular-nums">{tstStr}</div>
        </div>
      </div>

      {tst.dayChanged && (
        <div className="mt-3 bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-xs text-red-700">
          <span className="font-semibold">Day transition detected:</span> True Solar Time crosses midnight —
          astrological date shifts to the {tst.dayChangedDir === 'next' ? 'following' : 'previous'} day.
          All pillars have been recalculated accordingly.
        </div>
      )}
    </div>
  );
}

type FormValues = AnalysisFormPayload;

const AUTH_STATE_KEY = 'horomo-auth-preserved-form';

// ── Main Component ─────────────────────────────────────────
export default function BaziCalculator() {
  const [dob, setDob]             = useState('1990-06-15');
  const [tob, setTob]             = useState('08:30');
  const [timezone, setTimezone]   = useState('Asia/Bangkok');
  const [longitude, setLongitude] = useState('100.52');
  const [latitude, setLatitude]   = useState('13.75');
  const [gender, setGender]       = useState<'male' | 'female'>('male');
  const [unknownTime, setUnknownTime] = useState(false);
  const [result, setResult]       = useState<BaziResult | null>(null);
  const [chartData, setChartData] = useState<ChartData | null>(null);
  const [analysis, setAnalysis]   = useState<string | null>(null);
  const [loadingAnalysis, setLoadingAnalysis] = useState(false);
  const [analysisError, setAnalysisError]     = useState<string | null>(null);
  const [calcError, setCalcError] = useState<string | null>(null);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [signingIn, setSigningIn] = useState(false);
  const { data: session, status: sessionStatus } = useSession();

  const formValues: FormValues = {
    dob,
    tob,
    timezone,
    longitude,
    latitude,
    gender,
    unknownTime,
  };

  function syncFormState(values: FormValues) {
    setDob(values.dob);
    setTob(values.tob);
    setTimezone(values.timezone);
    setLongitude(values.longitude);
    setLatitude(values.latitude);
    setGender(values.gender);
    setUnknownTime(values.unknownTime);
  }

  function calculate(values: FormValues, options?: { syncInputs?: boolean }) {
    if (options?.syncInputs) syncFormState(values);
    if (!values.dob) { setCalcError('Please enter date of birth.'); return; }
    if (!values.unknownTime && !values.tob) { setCalcError('Please enter time of birth, or check "I don\'t know my birth time".'); return; }
    const lng = parseFloat(values.longitude);
    if (isNaN(lng) || lng < -180 || lng > 180) { setCalcError('Longitude must be between −180 and 180.'); return; }
    setCalcError(null);
    try {
      const r = computeBazi(
        values.dob,
        values.unknownTime ? null : values.tob,
        values.timezone,
        lng,
        values.gender === 'male',
      );
      const cd = computeChartData(r.pillars, r.pillars.day.stemIdx, r.unknownTime);
      setResult(r);
      setChartData(cd);
      setAnalysis(null);
      setAnalysisError(null);
    } catch (e: unknown) {
      setCalcError('Calculation error: ' + (e instanceof Error ? e.message : String(e)));
    }
  }

  useEffect(() => {
    const rawSavedState = sessionStorage.getItem(AUTH_STATE_KEY);
    if (!rawSavedState) return;

    sessionStorage.removeItem(AUTH_STATE_KEY);

    try {
      const savedState = JSON.parse(rawSavedState) as {
        formValues?: FormValues;
        restoreChart?: boolean;
      };

      if (!savedState.formValues) return;

      if (savedState.restoreChart) {
        const restoredValues = savedState.formValues;
        syncFormState(restoredValues);

        if (!restoredValues.dob) { setCalcError('Please enter date of birth.'); return; }
        if (!restoredValues.unknownTime && !restoredValues.tob) {
          setCalcError('Please enter time of birth, or check "I don\'t know my birth time".');
          return;
        }

        const lng = parseFloat(restoredValues.longitude);
        if (isNaN(lng) || lng < -180 || lng > 180) {
          setCalcError('Longitude must be between −180 and 180.');
          return;
        }

        setCalcError(null);

        try {
          const restoredResult = computeBazi(
            restoredValues.dob,
            restoredValues.unknownTime ? null : restoredValues.tob,
            restoredValues.timezone,
            lng,
            restoredValues.gender === 'male',
          );
          const restoredChartData = computeChartData(
            restoredResult.pillars,
            restoredResult.pillars.day.stemIdx,
            restoredResult.unknownTime,
          );

          setResult(restoredResult);
          setChartData(restoredChartData);
          setAnalysis(null);
          setAnalysisError(null);
        } catch (error: unknown) {
          setCalcError(`Calculation error: ${error instanceof Error ? error.message : String(error)}`);
        }
        return;
      }

      syncFormState(savedState.formValues);
    } catch {
      sessionStorage.removeItem(AUTH_STATE_KEY);
    }
  }, []);

  useEffect(() => {
    if (sessionStatus === 'authenticated') {
      setSigningIn(false);
      setLoginError(null);
    }
  }, [sessionStatus]);

  async function handleGoogleSignIn() {
    setLoginError(null);
    setSigningIn(true);

    sessionStorage.setItem(
      AUTH_STATE_KEY,
      JSON.stringify({
        formValues,
        restoreChart: Boolean(result && chartData),
      }),
    );

    try {
      const response = await signIn('google', {
        callbackUrl: window.location.href,
        redirect: false,
      });

      if (!response?.url) {
        throw new Error('Unable to start Google sign-in. Please try again.');
      }

      if (response.error) {
        throw new Error(response.error);
      }

      window.location.assign(response.url);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unable to sign in with Google.';
      setLoginError(message === 'Configuration'
        ? 'Google sign-in is not configured correctly on the server.'
        : 'Google sign-in failed. Please try again.');
      setSigningIn(false);
    }
  }

  async function runAnalysis() {
    if (!result || !chartData) return;
    setLoadingAnalysis(true);
    setAnalysisError(null);
    setAnalysis(null);
    try {
      const requestBody = buildAnalyzeRequestBody({
        formValues,
        result,
        chartData,
      });
      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error ?? 'Unable to analyze this chart right now.');
      }

      if (data.error) throw new Error(data.error);
      setAnalysis(data.analysis);
    } catch (e: unknown) {
      setAnalysisError(e instanceof Error ? e.message : 'Unknown error');
    } finally {
      setLoadingAnalysis(false);
    }
  }

  return (
    <main className="min-h-screen bg-slate-100 py-8 px-4" style={{ fontFamily: "'Inter', system-ui, sans-serif" }}>
      <div className="max-w-4xl mx-auto space-y-4">

        {/* Header */}
        <header className="text-center pb-2">
          <div className="font-zh text-4xl font-bold text-slate-900 tracking-widest">八字命盤</div>
          <div className="text-xs font-semibold tracking-widest text-slate-400 uppercase mt-1">Four Pillars of Destiny</div>
          <div className="w-8 h-0.5 bg-indigo-600 mx-auto mt-3 rounded" />
        </header>

        {/* Form */}
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-5">
          <div className="text-xs font-semibold tracking-widest text-slate-400 uppercase mb-4">Birth Information · 生辰八字</div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

            {/* Date */}
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-slate-600">Date of Birth</label>
              <input
                type="date"
                value={dob}
                onChange={e => setDob(e.target.value)}
                className="bg-slate-50 border border-slate-200 rounded-lg text-slate-900 text-sm px-3 py-2 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
              />
            </div>

            {/* Time */}
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-slate-600">Time of Birth (clock time on certificate)</label>
              <input
                type="time"
                value={tob}
                disabled={unknownTime}
                onChange={e => setTob(e.target.value)}
                className="bg-slate-50 border border-slate-200 rounded-lg text-slate-900 text-sm px-3 py-2 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 disabled:opacity-50"
              />
              <label className="flex items-center gap-2 text-xs text-slate-500 mt-1 cursor-pointer">
                <input type="checkbox" checked={unknownTime} onChange={e => setUnknownTime(e.target.checked)} />
                <span>I don&apos;t know my birth time</span>
              </label>
            </div>

            {/* Timezone */}
            <div className="flex flex-col gap-1 sm:col-span-2">
              <label className="text-xs font-medium text-slate-600">Timezone (DST detected automatically)</label>
              <select
                value={timezone}
                onChange={e => setTimezone(e.target.value)}
                className="bg-slate-50 border border-slate-200 rounded-lg text-slate-900 text-sm px-3 py-2 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
              >
                {TIMEZONES.map(tz => (
                  <option key={tz.value} value={tz.value}>{tz.label}</option>
                ))}
              </select>
            </div>

            {/* Coordinates */}
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-slate-600">Longitude (°E positive, °W negative)</label>
              <input
                type="number"
                value={longitude}
                onChange={e => setLongitude(e.target.value)}
                min="-180" max="180" step="0.01"
                placeholder="e.g. 100.52"
                className="bg-slate-50 border border-slate-200 rounded-lg text-slate-900 text-sm px-3 py-2 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-slate-600">Latitude (°N positive, °S negative)</label>
              <input
                type="number"
                value={latitude}
                onChange={e => setLatitude(e.target.value)}
                min="-90" max="90" step="0.01"
                placeholder="e.g. 13.75"
                className="bg-slate-50 border border-slate-200 rounded-lg text-slate-900 text-sm px-3 py-2 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
              />
              <p className="text-[10px] text-slate-400 mt-0.5">Used for reference — only longitude affects True Solar Time</p>
            </div>

            {/* Gender */}
            <div className="flex flex-col gap-1 sm:col-span-2">
              <label className="text-xs font-medium text-slate-600">Gender</label>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setGender('male')}
                  className={`px-4 py-2 rounded-lg text-sm font-medium border transition-colors ${gender === 'male' ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-slate-600 border-slate-200 hover:border-indigo-300'}`}
                >♂ Male</button>
                <button
                  type="button"
                  onClick={() => setGender('female')}
                  className={`px-4 py-2 rounded-lg text-sm font-medium border transition-colors ${gender === 'female' ? 'bg-rose-500 text-white border-rose-500' : 'bg-white text-slate-600 border-slate-200 hover:border-rose-300'}`}
                >♀ Female</button>
              </div>
            </div>

          </div>

          {calcError && <div className="text-red-600 text-sm mt-3">{calcError}</div>}
          <button
            onClick={() => calculate(formValues)}
            className="mt-4 block w-full sm:w-auto sm:mx-auto bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm px-8 py-2.5 rounded-lg transition-colors"
          >
            Calculate Chart · 起命盤
          </button>
        </div>

        {result && chartData && (
          <>
            {/* Solar Info */}
            <div className="bg-white border border-slate-200 rounded-xl shadow-sm px-5 py-3 text-sm text-slate-600">
              {result.unknownTime
                ? <>Local date: <span className="font-medium text-slate-800">{result.localDate.getUTCFullYear()}-{String(result.localDate.getUTCMonth() + 1).padStart(2, '0')}-{String(result.localDate.getUTCDate()).padStart(2, '0')} ({result.tzLabel})</span> &nbsp;·&nbsp; Hour pillar not calculated</>
                : <>Clock time: <span className="font-medium text-slate-800">{fmtDate(result.localDate)} ({result.tzLabel})</span> &nbsp;→&nbsp; True Solar Time: <span className="font-medium text-indigo-700">{fmtDate(result.tstDate)}</span></>
              }
            </div>

            {/* True Solar Time Card */}
            {!result.unknownTime && <TSTCard result={result} />}

            {/* Pillar Table */}
            <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-x-auto">
              <table className="w-full min-w-[400px]">
                <thead>
                  <tr className="border-b border-slate-100">
                    <th className="w-16 py-3 px-3 text-xs font-semibold text-slate-400 text-left"></th>
                    {['hour', 'day', 'month', 'year'].map(k => (
                      <th key={k} className={`py-3 px-3 text-center text-xs font-semibold ${k === 'day' ? 'bg-indigo-50 text-indigo-700' : 'text-slate-500'}`}>
                        {k === 'hour' ? '時柱' : k === 'day' ? '日柱' : k === 'month' ? '月柱' : '年柱'}
                        <br /><span className="text-[10px] font-normal capitalize opacity-70">{k}</span>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {/* Stem row */}
                  <tr className="border-b border-slate-100">
                    <td className="py-3 px-3 text-xs text-slate-400 font-medium">天干<br/>Stem</td>
                    {(['hour', 'day', 'month', 'year'] as const).map(k => {
                      const p = result.pillars[k];
                      if (!p) return (
                        <td key={k} className="py-3 px-3 text-center">
                          <div className="font-zh text-3xl text-slate-300">?</div>
                          <div className="text-xs text-slate-300 mt-0.5">—</div>
                          <div className="text-[10px] text-slate-300">Unknown</div>
                        </td>
                      );
                      return (
                        <td key={k} className={`py-3 px-3 text-center ${k === 'day' ? 'bg-indigo-50' : ''}`}>
                          {k === 'day' && <div className="text-[10px] font-semibold text-indigo-500 mb-1">日主</div>}
                          <div className={`font-zh text-3xl font-bold ${elColor(p.stem.element)}`}>{p.stem.zh}</div>
                          <div className="text-xs text-slate-500 mt-0.5">{p.stem.pinyin}</div>
                          <div className="text-[10px] text-slate-400">{EL_LABEL[p.stem.element].zh}{p.stem.yin ? '陰' : '陽'} · {EL_LABEL[p.stem.element].en} {p.stem.yin ? 'Yin' : 'Yang'}</div>
                        </td>
                      );
                    })}
                  </tr>
                  {/* Branch row */}
                  <tr>
                    <td className="py-3 px-3 text-xs text-slate-400 font-medium">地支<br/>Branch</td>
                    {(['hour', 'day', 'month', 'year'] as const).map(k => {
                      const p = result.pillars[k];
                      if (!p) return (
                        <td key={k} className="py-3 px-3 text-center">
                          <div className="font-zh text-3xl text-slate-300">?</div>
                          <div className="text-xs text-slate-300 mt-0.5">—</div>
                          <div className="text-[10px] text-slate-300">Unknown</div>
                        </td>
                      );
                      return (
                        <td key={k} className={`py-3 px-3 text-center ${k === 'day' ? 'bg-indigo-50' : ''}`}>
                          <div className={`font-zh text-3xl font-bold ${elColor(p.branch.element)}`}>{p.branch.zh}</div>
                          <div className="text-xs text-slate-500 mt-0.5">{p.branch.pinyin} · {p.branch.animal}</div>
                          <div className="text-[10px] text-slate-400">{EL_LABEL[p.branch.element].zh}{p.branch.yin ? '陰' : '陽'} · {EL_LABEL[p.branch.element].en} {p.branch.yin ? 'Yin' : 'Yang'}</div>
                        </td>
                      );
                    })}
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Day Master Card */}
            <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-5">
              <h3 className="text-sm font-semibold text-slate-700 mb-3">Day Master · 日主</h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  { label: 'Stem · 天干', value: `${result.pillars.day.stem.zh} (${result.pillars.day.stem.pinyin})`, el: result.pillars.day.stem.element },
                  { label: 'Element · 五行', value: `${EL_LABEL[result.pillars.day.stem.element].zh} ${EL_LABEL[result.pillars.day.stem.element].en}`, el: result.pillars.day.stem.element },
                  { label: 'Polarity · 陰陽', value: result.pillars.day.stem.yin ? '陰 Yin' : '陽 Yang', el: null },
                  { label: 'Nature · 性格', value: getDayMasterNote(result.pillars.day.stem), el: null },
                ].map(item => (
                  <div key={item.label} className="bg-slate-50 rounded-lg p-3">
                    <div className="text-[10px] text-slate-400 font-medium uppercase tracking-wide mb-1">{item.label}</div>
                    <div className={`text-sm font-semibold ${item.el ? elColor(item.el) : 'text-slate-700'}`}>{item.value}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Ten Gods Table */}
            <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-5">
              <h3 className="text-sm font-semibold text-slate-700 mb-3">Ten Gods · 十神 (relative to Day Master {result.pillars.day.stem.zh} {result.pillars.day.stem.pinyin})</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm min-w-[480px]">
                  <thead>
                    <tr className="border-b border-slate-100 text-xs text-slate-400 font-medium">
                      <th className="text-left py-2 pr-4">Pillar</th>
                      <th className="text-center py-2 px-2">Stem 天干</th>
                      <th className="text-center py-2 px-2">Stem God</th>
                      <th className="text-center py-2 px-2">Branch 地支</th>
                      <th className="text-center py-2 px-2">Branch God</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(result.unknownTime ? ['day', 'month', 'year'] : ['hour', 'day', 'month', 'year'] as const).map(k => {
                      const p = result.pillars[k as keyof typeof result.pillars];
                      if (!p) return null;
                      const dmIdx = result.pillars.day.stemIdx;
                      const tgStem = k === 'day' ? { zh: '—', en: 'Day Master', pinyin: '日主' } : tenGod(dmIdx, p.stemIdx);
                      const branchMainStem = getBranchMainStem(p.branchIdx);
                      const tgBranch = tenGod(dmIdx, branchMainStem);
                      const pillarLabel: Record<string, string> = { hour: '時柱 Hour', day: '日柱 Day', month: '月柱 Month', year: '年柱 Year' };
                      const tgAbbr = TG_ABBR[tgStem.zh] || '';
                      const tgBranchAbbr = TG_ABBR[tgBranch.zh] || '';
                      return (
                        <tr key={k} className="border-b border-slate-50 last:border-0">
                          <td className="py-2 pr-4 text-xs text-slate-500">{pillarLabel[k]}</td>
                          <td className="py-2 px-2 text-center">
                            <span className={`font-zh text-base font-bold ${elColor(STEMS[p.stemIdx].element)}`}>{STEMS[p.stemIdx].zh}</span>
                          </td>
                          <td className={`py-2 px-2 text-center ${k === 'day' ? 'text-slate-400 text-xs' : ''}`}>
                            {tgAbbr && <span className={`inline-block text-white text-[10px] font-bold px-1.5 py-0.5 rounded ${tgBadgeColor(tgAbbr)} mr-1`}>{tgAbbr}</span>}
                            <span className="text-xs text-slate-600">{tgStem.zh}</span>
                            <span className="text-[10px] text-slate-400 ml-1">{tgStem.pinyin}</span>
                          </td>
                          <td className="py-2 px-2 text-center">
                            <span className={`font-zh text-base font-bold ${elColor(BRANCHES[p.branchIdx].element)}`}>{BRANCHES[p.branchIdx].zh}</span>
                          </td>
                          <td className="py-2 px-2 text-center">
                            {tgBranchAbbr && <span className={`inline-block text-white text-[10px] font-bold px-1.5 py-0.5 rounded ${tgBadgeColor(tgBranchAbbr)} mr-1`}>{tgBranchAbbr}</span>}
                            <span className="text-xs text-slate-600">{tgBranch.zh}</span>
                            <span className="text-[10px] text-slate-400 ml-1">{tgBranch.pinyin}</span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Charts Section */}
            <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div>
                  <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">5 Structures · 五行格局</div>
                  <RadarSVG structureCounts={chartData.structureCounts} structureEls={chartData.structureEls} />
                </div>
                <div>
                  <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">10 Gods · 十神分布</div>
                  <BarsSVG tenGodsCount={chartData.tenGodsCount} />
                </div>
              </div>
            </div>

            {/* Da Yun Section */}
            {result.daYun && (
              <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-5">
                <h3 className="text-sm font-semibold text-slate-700 mb-1">Major Luck Cycles · 大運</h3>
                <div className="text-xs text-slate-500 mb-3">
                  Direction: <span className="font-medium text-slate-700">{result.daYun.forward ? 'Forward 順行' : 'Backward 逆行'}</span>
                  {result.daYun.forward
                    ? ' (Yang year ♂ / Yin year ♀ — pillars advance with the cycle)'
                    : ' (Yin year ♂ / Yang year ♀ — pillars retreat against the cycle)'}
                  <br />
                  Nearest solar term: <span className="font-medium text-slate-700">{result.daYun.jie.name}</span>
                  &nbsp;·&nbsp; Luck begins at: <span className="font-medium text-slate-700">
                    {result.daYun.startYears} yrs{result.daYun.startMonths > 0 ? ` ${result.daYun.startMonths} mths` : ''}
                  </span>
                </div>
                <div className="overflow-x-auto">
                  <div className="flex gap-3 min-w-max pb-2">
                    {result.daYun.pillars.map((p, i) => (
                      <div key={i} className="flex flex-col items-center border border-slate-200 rounded-lg px-3 py-2 min-w-[80px] text-center bg-slate-50">
                        <div className="text-[10px] text-slate-400 font-medium">Cycle {i + 1}</div>
                        <div className="text-[10px] text-slate-400">Age {p.ageStart}–{p.ageEnd}</div>
                        <div className="text-[10px] text-slate-400">{p.yearStart}–{p.yearEnd}</div>
                        <div className={`font-zh text-2xl font-bold mt-1 ${elColor(p.stem.element)}`}>{p.stem.zh}</div>
                        <div className="w-full h-px bg-slate-200 my-1" />
                        <div className={`font-zh text-2xl font-bold ${elColor(p.branch.element)}`}>{p.branch.zh}</div>
                        <div className="text-[10px] text-slate-400 mt-1">{p.stem.pinyin} / {p.branch.pinyin}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* AI Analysis Section */}
            <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-5">
              <h3 className="text-sm font-semibold text-slate-700 mb-1">AI Reading · 八字解析</h3>
              <p className="text-xs text-slate-400 mb-3">Google sign-in is required before AI analysis can run.</p>

              {sessionStatus === 'authenticated' && session.user && (
                <div className="mb-3 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                  <span>Signed in as <span className="font-medium text-slate-700">{session.user.email ?? session.user.name ?? 'Google user'}</span></span>
                  <button
                    type="button"
                    onClick={() => signOut({ callbackUrl: '/' })}
                    className="rounded-md border border-slate-200 px-2 py-1 text-slate-600 transition-colors hover:border-slate-300 hover:text-slate-900"
                  >
                    Sign out
                  </button>
                </div>
              )}

              {sessionStatus === 'loading' ? (
                <button
                  disabled
                  className="flex items-center gap-2 rounded-lg bg-slate-300 px-5 py-2 text-sm font-semibold text-white"
                >
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Checking sign-in…
                </button>
              ) : sessionStatus === 'authenticated' ? (
                <button
                  onClick={runAnalysis}
                  disabled={loadingAnalysis}
                  className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white font-semibold text-sm px-5 py-2 rounded-lg transition-colors"
                >
                  {loadingAnalysis ? (
                    <>
                      <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      Analyzing…
                    </>
                  ) : 'Analyze with AI · 用AI解析'}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleGoogleSignIn}
                  disabled={signingIn}
                  className="flex items-center gap-2 rounded-lg bg-white px-5 py-2 text-sm font-semibold text-slate-700 border border-slate-300 transition-colors hover:border-slate-400 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {signingIn ? (
                    <>
                      <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      Redirecting to Google…
                    </>
                  ) : 'Sign in with Google'}
                </button>
              )}

              {loginError && <div className="text-red-600 text-sm mt-3">{loginError}</div>}
              {analysisError && <div className="text-red-600 text-sm mt-3">{analysisError}</div>}
              {analysis && (
                <div className="mt-4 text-sm text-slate-700 leading-relaxed whitespace-pre-wrap border-t border-slate-100 pt-4">
                  {analysis.split('\n').map((line, i) => (
                    <p key={i} className={line.trim() === '' ? 'mt-3' : ''}>
                      <RenderMd text={line} />
                    </p>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </main>
  );
}
