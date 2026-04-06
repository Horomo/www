'use client';

import { startTransition, useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';

import BirthPlaceSearch from '@/components/BirthPlaceSearch';
import Button from '@/components/ui/Button';
import GlowCard from '@/components/ui/GlowCard';
import Stepper from '@/components/ui/Stepper';
import { cn } from '@/components/ui/utils';
import {
  buildAnalyzeRequestBody,
  finalizeAnalysisFormPayload,
  type AnalysisFormDraft,
} from '@/lib/analysis-payload';
import { trackEvent } from '@/lib/analytics';
import {
  computeBazi,
  computeChartData,
} from '@/lib/bazi';
import { saveCalculationResult } from '@/lib/calculation-session';
import { formatGenderIdentity, type CalculationGenderMode, type GenderIdentity } from '@/lib/gender';
import type { PlaceSearchResult } from '@/lib/places';

const GENDER_IDENTITY_OPTIONS: Array<{
  value: GenderIdentity;
  label: string;
  tagline: string;
  autoCalculationMode: CalculationGenderMode | null;
}> = [
  { value: 'male', label: 'Male', tagline: 'Yin/Yang automatically set to Yang (陽)', autoCalculationMode: 'male' },
  { value: 'female', label: 'Female', tagline: 'Yin/Yang automatically set to Yin (陰)', autoCalculationMode: 'female' },
  { value: 'non_binary', label: 'Non-binary', tagline: 'Choose Yin or Yang polarity below', autoCalculationMode: null },
  { value: 'prefer_not_to_say', label: 'Prefer not to say', tagline: 'Choose Yin or Yang polarity below', autoCalculationMode: null },
  { value: 'other', label: 'Other', tagline: 'Choose Yin or Yang polarity below', autoCalculationMode: null },
];

const YIN_YANG_OPTIONS: Array<{
  value: CalculationGenderMode;
  yinYang: string;
  pinyinLabel: string;
  label: string;
  tagline: string;
}> = [
  { value: 'male', yinYang: '陽', pinyinLabel: 'Yáng', label: 'Yang', tagline: 'Active energy · Da Yun follows Yang rule' },
  { value: 'female', yinYang: '陰', pinyinLabel: 'Yīn', label: 'Yin', tagline: 'Receptive energy · Da Yun follows Yin rule' },
];

const WIZARD_STEPS = [
  { id: 'identity', label: 'Identity', detail: 'Choose gender identity and Yin/Yang polarity.' },
  { id: 'birth', label: 'Birth', detail: 'Set date, time, and known-time status.' },
  { id: 'location', label: 'Location', detail: 'Confirm place, timezone, and coordinates.' },
  { id: 'confirm', label: 'Confirm', detail: 'Review the reading ritual before reveal.' },
] as const;

type FormValues = AnalysisFormDraft;
type StepFieldErrors = Partial<Record<'genderIdentity' | 'calculationMode' | 'dob' | 'tob' | 'timezone' | 'longitude' | 'latitude', string>>;
const TEXT_INPUT_CLASS = 'glass-input w-full rounded-[1.4rem] px-4 py-3 text-sm text-[#151d22] placeholder:text-[#151d22]/40';

function StatTile({ label, value, hint, className }: { label: string; value: string; hint?: string; className?: string }) {
  return (
    <div className={cn('rounded-[1.5rem] bg-[linear-gradient(135deg,rgba(255,255,255,0.78),rgba(255,255,255,0.56))] p-4 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.7)]', className)}>
      <div className="text-[11px] uppercase tracking-[0.22em] text-[#151d22]/48">{label}</div>
      <div className="mt-2 text-base font-semibold text-[#151d22]">{value}</div>
      {hint ? <div className="mt-2 text-xs leading-6 text-[#151d22]/56">{hint}</div> : null}
    </div>
  );
}

export default function BaziCalculator() {
  const router = useRouter();
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
  const [calcError, setCalcError] = useState<string | null>(null);
  const [currentStep, setCurrentStep] = useState(0);
  const [showStepValidation, setShowStepValidation] = useState(false);

  const formValues: FormValues = { dob, tob, birthPlaceQuery, birthPlace, timezone, longitude, latitude, genderIdentity, genderOtherText, calculationMode, unknownTime };
  const requiresYinYangSelection = genderIdentity !== '' && genderIdentity !== 'male' && genderIdentity !== 'female';
  useEffect(() => { trackEvent('calculation_mode_view', { screen_name: 'bazi_form' }); }, []);

  function syncFormState(values: FormValues) {
    setDob(values.dob); setTob(values.tob); setBirthPlaceQuery(values.birthPlaceQuery); setBirthPlace(values.birthPlace); setTimezone(values.timezone); setLongitude(values.longitude); setLatitude(values.latitude); setGenderIdentity(values.genderIdentity); setGenderOtherText(values.genderOtherText); setCalculationMode(values.calculationMode); setUnknownTime(values.unknownTime);
  }

  function handleGenderIdentityChange(next: GenderIdentity) {
    setShowStepValidation(false);
    setGenderIdentity(next);
    if (next !== 'other') setGenderOtherText('');
    const auto = GENDER_IDENTITY_OPTIONS.find((o) => o.value === next)?.autoCalculationMode ?? null;
    setCalculationMode(auto ?? '');
    trackEvent('gender_identity_selected', { gender_identity: next, screen_name: 'bazi_form' });
  }

  function handleYinYangChange(next: CalculationGenderMode) {
    setShowStepValidation(false);
    setCalculationMode(next);
    trackEvent('yin_yang_selected', { calculation_mode: next, screen_name: 'bazi_form' });
  }

  const getStepFieldErrors = useCallback((step: number, values: FormValues): StepFieldErrors => {
    const errors: StepFieldErrors = {};

    if (step === 0) {
      if (!values.genderIdentity) {
        errors.genderIdentity = 'Choose a gender identity to continue.';
      } else if (!values.calculationMode) {
        errors.calculationMode = 'Choose Yin or Yang polarity to continue.';
      }
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

  function moveToStep(nextStep: number) {
    startTransition(() => setCurrentStep(nextStep));
  }

  function calculate(values: FormValues) {
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
      syncFormState(normalizedValues);
      saveCalculationResult({ formValues: normalizedValues, result: computedResult, chartData: computedChartData });
      fetch('/api/log-chart', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(buildAnalyzeRequestBody({ formValues: normalizedValues, result: computedResult, chartData: computedChartData })) }).catch(() => {});
      router.push('/calculator/result');
    } catch (error: unknown) { setCalcError(`Calculation error: ${error instanceof Error ? error.message : String(error)}`); }
  }

  function handleBirthPlaceQueryChange(value: string) { setShowStepValidation(false); setBirthPlaceQuery(value); setBirthPlace(null); }
  function handleBirthPlaceSelect(place: PlaceSearchResult) { setShowStepValidation(false); setBirthPlace(place); setBirthPlaceQuery([place.name, place.admin1, place.country].filter(Boolean).join(', ')); setTimezone(place.timezone); setLongitude(place.longitude.toFixed(4)); setLatitude(place.latitude.toFixed(4)); }
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

  const confirmationSummary = useMemo(() => {
    const genderLabel = genderIdentity ? formatGenderIdentity(genderIdentity as GenderIdentity, genderOtherText) : 'Not selected';
    const yinYangLabel = calculationMode === 'male' ? 'Yang (陽) · Active energy' : calculationMode === 'female' ? 'Yin (陰) · Receptive energy' : 'Not selected';
    return [
      ['Gender', genderLabel],
      ['Yin/Yang polarity', yinYangLabel],
      ['Birth date', dob || 'Not set'],
      ['Birth time', unknownTime ? 'Unknown time mode' : tob || 'Not set'],
      ['Birth place', birthPlaceQuery || 'Not set'],
      ['Timezone', timezone || 'Not set'],
      ['Coordinates', `${latitude || '-'}, ${longitude || '-'}`],
    ];
  }, [birthPlaceQuery, calculationMode, dob, genderIdentity, genderOtherText, latitude, longitude, timezone, tob, unknownTime]);

  const currentStepErrors = getStepFieldErrors(currentStep, formValues);

  return (
    <section className="px-4 py-8 sm:px-6 lg:px-8" aria-labelledby="calculator-heading">
      <div className="mx-auto max-w-6xl">
        <div className="mx-auto max-w-4xl">
          <div className="rounded-[2rem] bg-[linear-gradient(135deg,rgba(255,255,255,0.86),rgba(255,255,255,0.72))] p-4 shadow-[0_20px_56px_rgba(0,106,98,0.08)] backdrop-blur-[20px] sm:p-6">
            <h2 id="calculator-heading" className="sr-only">BaZi calculator form</h2>
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

            <GlowCard accent="cyan" className="mt-5 p-5 sm:p-6">
              <div key={currentStep} className="animate-reveal space-y-5">
                {currentStep === 0 ? (
                  <>
                    <div>
                      <div className="text-[11px] uppercase tracking-[0.24em] text-[#006a62]/62">Step 1</div>
                      <h3 className="mt-2 font-serif text-[1.8rem] text-[#151d22]">Gender and polarity</h3>
                      <p className="mt-2 max-w-lg text-sm leading-7 text-[#151d22]/62">Choose your gender identity. Male and Female automatically set Yin/Yang. All other options let you choose polarity explicitly.</p>
                    </div>
                    <div className="space-y-3">
                      <div className="text-xs font-medium uppercase tracking-[0.18em] text-[#151d22]/56">Gender identity · 性別</div>
                      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                        {GENDER_IDENTITY_OPTIONS.map((option) => {
                          const selected = genderIdentity === option.value;
                          return (
                            <label key={option.value} data-selected={String(selected)} className="flex cursor-pointer items-start gap-3 rounded-[24px] bg-[linear-gradient(135deg,rgba(255,255,255,0.82),rgba(255,255,255,0.58))] px-4 py-4 transition-all duration-300 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.72)] hover:brightness-[1.02] hover:shadow-[inset_0_0_0_1px_rgba(64,224,208,0.18),0_18px_34px_rgba(0,106,98,0.07)] data-[selected=true]:shadow-[inset_0_0_0_1px_rgba(64,224,208,0.24),0_18px_38px_rgba(64,224,208,0.1)]">
                              <input type="radio" name="genderIdentity" value={option.value} checked={selected} onChange={() => handleGenderIdentityChange(option.value)} className="mt-1 h-4 w-4 border-white/20 bg-transparent text-[#006a62] focus:ring-[#40e0d0]" />
                              <span className="min-w-0">
                                <span className="block text-sm font-semibold text-[#151d22]">{option.label}</span>
                                <span className="mt-1 block text-xs leading-5 text-[#151d22]/48">{option.tagline}</span>
                              </span>
                            </label>
                          );
                        })}
                      </div>
                      {genderIdentity === 'other' ? (
                        <input type="text" value={genderOtherText} onChange={(e) => { setShowStepValidation(false); setGenderOtherText(e.target.value); }} placeholder="Describe your gender identity (optional)" className={cn(TEXT_INPUT_CLASS, 'mt-1')} />
                      ) : null}
                      {showStepValidation && currentStepErrors.genderIdentity ? <p className="text-xs leading-6 text-[#874e58]">{currentStepErrors.genderIdentity}</p> : null}
                    </div>
                    {requiresYinYangSelection ? (
                      <div className="space-y-3">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-medium uppercase tracking-[0.18em] text-[#151d22]/56">Yin/Yang polarity · 陰陽</span>
                          <span className="inline-flex h-5 w-5 cursor-help items-center justify-center rounded-full bg-white/56 text-[10px] font-semibold text-[#151d22]/62 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.72)]" title="Yin and Yang determine which Da Yun calculation rule is applied. This choice does not reflect gender identity." onMouseEnter={() => trackEvent('tooltip_opened', { interaction_type: 'tooltip', screen_name: 'bazi_form' })} onFocus={() => trackEvent('tooltip_opened', { interaction_type: 'tooltip', screen_name: 'bazi_form' })}>?</span>
                        </div>
                        <div className="grid gap-3 sm:grid-cols-2">
                          {YIN_YANG_OPTIONS.map((option) => {
                            const selected = calculationMode === option.value;
                            return (
                              <label key={option.value} data-selected={String(selected)} className="flex cursor-pointer items-start gap-4 rounded-[24px] bg-[linear-gradient(135deg,rgba(255,255,255,0.82),rgba(255,255,255,0.58))] px-5 py-4 transition-all duration-300 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.72)] hover:brightness-[1.02] hover:shadow-[inset_0_0_0_1px_rgba(64,224,208,0.18),0_18px_34px_rgba(0,106,98,0.07)] data-[selected=true]:shadow-[inset_0_0_0_1px_rgba(64,224,208,0.24),0_18px_38px_rgba(64,224,208,0.1)]">
                                <input type="radio" name="yinYangPolarity" value={option.value} checked={selected} onChange={() => handleYinYangChange(option.value)} className="mt-1 h-4 w-4 border-white/20 bg-transparent text-[#006a62] focus:ring-[#40e0d0]" />
                                <span className="min-w-0">
                                  <span className="flex items-center gap-3">
                                    <span className="font-zh text-3xl font-bold text-[#006a62]">{option.yinYang}</span>
                                    <span>
                                      <span className="block text-sm font-semibold text-[#151d22]">{option.label}</span>
                                      <span className="block text-xs text-[#151d22]/48">{option.pinyinLabel}</span>
                                    </span>
                                  </span>
                                  <span className="mt-2 block text-xs uppercase tracking-[0.18em] text-[#151d22]/42">{option.tagline}</span>
                                </span>
                              </label>
                            );
                          })}
                        </div>
                        {showStepValidation && currentStepErrors.calculationMode ? <p className="text-xs leading-6 text-[#874e58]">{currentStepErrors.calculationMode}</p> : null}
                      </div>
                    ) : null}
                  </>
                ) : null}

                {currentStep === 1 ? (
                  <>
                    <div><div className="text-[11px] uppercase tracking-[0.24em] text-[#006a62]/62">Step 2</div><h3 className="mt-2 font-serif text-[1.8rem] text-[#151d22]">Birth date and time</h3><p className="mt-2 max-w-lg text-sm leading-7 text-[#151d22]/62">Use the recorded local birth time if known.</p></div>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div><label className="text-xs font-medium uppercase tracking-[0.18em] text-[#151d22]/54">Date of Birth</label><input type="date" value={dob} onChange={(event) => { setShowStepValidation(false); setDob(event.target.value); }} className={cn(TEXT_INPUT_CLASS, 'mt-2')} />{showStepValidation && currentStepErrors.dob ? <p className="mt-2 text-xs leading-6 text-[#874e58]">{currentStepErrors.dob}</p> : null}</div>
                      <div><label className="text-xs font-medium uppercase tracking-[0.18em] text-[#151d22]/54">Time of Birth (clock time on certificate)</label><input type="time" value={tob} disabled={unknownTime} onChange={(event) => { setShowStepValidation(false); setTob(event.target.value); }} className={cn(TEXT_INPUT_CLASS, 'mt-2')} />{showStepValidation && currentStepErrors.tob ? <p className="mt-2 text-xs leading-6 text-[#874e58]">{currentStepErrors.tob}</p> : null}<p className="mt-2 text-xs leading-6 text-[#151d22]/52">Use the recorded local clock time at the birthplace. DST is handled automatically from the timezone.</p></div>
                    </div>
                    <label className="inline-flex items-center gap-3 rounded-2xl bg-[linear-gradient(135deg,rgba(255,255,255,0.78),rgba(255,255,255,0.58))] px-4 py-3 text-sm text-[#151d22]/72 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.72)]"><input type="checkbox" checked={unknownTime} onChange={(event) => { setShowStepValidation(false); setUnknownTime(event.target.checked); }} className="h-4 w-4 border-white/20 bg-transparent text-[#006a62] focus:ring-[#40e0d0]" /><span>I don&apos;t know my birth time</span></label>
                  </>
                ) : null}

                {currentStep === 2 ? (
                  <>
                    <div><div className="text-[11px] uppercase tracking-[0.24em] text-[#006a62]/62">Step 3</div><h3 className="mt-2 font-serif text-[1.8rem] text-[#151d22]">Birthplace and timezone</h3><p className="mt-2 max-w-lg text-sm leading-7 text-[#151d22]/62">Search your birthplace, then adjust the technical details only if needed.</p></div>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <BirthPlaceSearch value={birthPlaceQuery} onChange={handleBirthPlaceQueryChange} onSelect={handleBirthPlaceSelect} selectedPlace={birthPlace} />
                      <div className="rounded-[24px] bg-[linear-gradient(135deg,rgba(255,255,255,0.8),rgba(255,255,255,0.56))] p-4 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.72)]"><div className="text-xs font-semibold uppercase tracking-[0.18em] text-[#151d22]/46">Location summary</div><div className="mt-3 space-y-2 text-sm leading-7 text-[#151d22]/66"><div>Timezone: <span className="font-semibold text-[#151d22]">{timezone || '—'}</span></div><div>Longitude: <span className="font-semibold text-[#151d22]">{longitude || '—'}</span></div><div>Latitude: <span className="font-semibold text-[#151d22]">{latitude || '—'}</span></div></div>{showStepValidation && currentStepErrors.timezone ? <p className="mt-3 text-xs leading-6 text-[#874e58]">{currentStepErrors.timezone}</p> : null}<p className="mt-3 text-xs leading-6 text-[#151d22]/52">Longitude affects true solar time directly. Latitude is preserved for reference and logging.</p></div>
                    </div>
                    <details className="rounded-[24px] bg-[linear-gradient(135deg,rgba(255,255,255,0.8),rgba(255,255,255,0.56))] px-5 py-4 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.72)]"><summary className="cursor-pointer text-xs font-semibold uppercase tracking-[0.22em] text-[#151d22]/56">Advanced Location Details</summary><div className="mt-4 grid gap-4 sm:grid-cols-2"><div className="sm:col-span-2"><label className="text-xs font-medium uppercase tracking-[0.18em] text-[#151d22]/54">Timezone (DST detected automatically)</label><input type="text" value={timezone} onChange={(event) => { setShowStepValidation(false); setBirthPlace(null); setTimezone(event.target.value); }} placeholder="e.g. Asia/Bangkok" className={cn(TEXT_INPUT_CLASS, 'mt-2')} /></div><div><label className="text-xs font-medium uppercase tracking-[0.18em] text-[#151d22]/54">Longitude (°E positive, °W negative)</label><input type="number" value={longitude} onChange={(event) => { setShowStepValidation(false); setBirthPlace(null); setLongitude(event.target.value); }} min="-180" max="180" step="0.01" placeholder="e.g. 100.52" className={cn(TEXT_INPUT_CLASS, 'mt-2')} />{showStepValidation && currentStepErrors.longitude ? <p className="mt-2 text-xs leading-6 text-[#874e58]">{currentStepErrors.longitude}</p> : null}</div><div><label className="text-xs font-medium uppercase tracking-[0.18em] text-[#151d22]/54">Latitude (°N positive, °S negative)</label><input type="number" value={latitude} onChange={(event) => { setShowStepValidation(false); setBirthPlace(null); setLatitude(event.target.value); }} min="-90" max="90" step="0.01" placeholder="e.g. 13.75" className={cn(TEXT_INPUT_CLASS, 'mt-2')} />{showStepValidation && currentStepErrors.latitude ? <p className="mt-2 text-xs leading-6 text-[#874e58]">{currentStepErrors.latitude}</p> : null}</div></div></details>
                  </>
                ) : null}

                {currentStep === 3 ? (
                  <>
                    <div><div className="text-[11px] uppercase tracking-[0.24em] text-[#006a62]/62">Step 4</div><h3 className="mt-2 font-serif text-[1.8rem] text-[#151d22]">Review and calculate</h3><p className="mt-2 max-w-lg text-sm leading-7 text-[#151d22]/62">Check your inputs, then generate the chart.</p></div>
                    <div className="grid gap-3 sm:grid-cols-2">{confirmationSummary.map(([label, value]) => <StatTile key={label} label={label} value={value} />)}</div>
                    <div className="rounded-[24px] bg-[linear-gradient(135deg,rgba(64,224,208,0.14),rgba(255,255,255,0.72))] px-4 py-4 text-sm leading-7 text-[#151d22]/72 shadow-[inset_0_0_0_1px_rgba(64,224,208,0.16)]">Your chart is calculated locally first. Optional AI analysis only runs after the chart exists.</div>
                  </>
                ) : null}
              </div>
              {calcError ? <div className="mt-5 rounded-2xl bg-[linear-gradient(135deg,rgba(255,183,194,0.42),rgba(255,255,255,0.62))] px-4 py-3 text-sm text-[#874e58] shadow-[inset_0_0_0_1px_rgba(135,78,88,0.14)]">{calcError}</div> : null}
              <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
                <div className="flex gap-3">
                  {currentStep > 0 ? <Button variant="ghost" size="md" onClick={goBack}>Back</Button> : null}
                  {currentStep < WIZARD_STEPS.length - 1 ? <Button variant="secondary" size="md" onClick={goNext}>Next</Button> : <Button variant="primary" size="lg" onClick={() => { if (calculationMode) trackEvent('calculation_mode_confirmed', { energy_type: calculationMode }); calculate(formValues); }}>Calculate Chart · 起命盤</Button>}
                </div>
                <p className="text-xs leading-6 text-[#151d22]/48">{currentStep < WIZARD_STEPS.length - 1 ? `${currentStep + 1} of ${WIZARD_STEPS.length}` : 'Review complete'}</p>
              </div>
            </GlowCard>
          </div>
        </div>
      </div>
    </section>
  );
}
