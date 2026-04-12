'use client';

import { FormEvent, useEffect, useState } from 'react';
import { signIn, useSession } from 'next-auth/react';

import BirthPlaceSearch from '@/components/BirthPlaceSearch';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import GlowCard from '@/components/ui/GlowCard';
import { finalizeAnalysisFormPayload, type AnalysisFormDraft, type AnalysisFormPayload } from '@/lib/analysis-payload';
import { type HourlyScoringResult, type HourSlotScore } from '@/lib/hourly-scoring';
import { type CalculationGenderMode, type GenderIdentity } from '@/lib/gender';
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
  label: string;
}> = [
  { value: 'male', yinYang: '陽', label: 'Yang (male polarity)' },
  { value: 'female', yinYang: '陰', label: 'Yin (female polarity)' },
];

const DEFAULT_FORM_VALUES: AnalysisFormDraft = {
  dob: '1990-06-15',
  tob: '08:30',
  timezone: 'Asia/Bangkok',
  longitude: '100.52',
  latitude: '13.75',
  birthPlaceQuery: 'Bangkok, Thailand',
  birthPlace: null,
  genderIdentity: 'male',
  genderOtherText: '',
  calculationMode: 'male',
  unknownTime: false,
};

export const LOADING_SAVED_PROFILE_TEXT = 'Loading saved profile...';
export const SAVING_PROFILE_TEXT = 'Saving your profile...';
export const ACTIVE_DA_YUN_SEPARATOR = ' / ';
export const SLOT_SEPARATOR = ' - ';
export const SCORE_BREAKDOWN_SEPARATOR = ' | ';

export function formatActiveDaYunHeadline(scoringResult: NonNullable<HourlyScoringResult['activeDaYun']>) {
  return `${scoringResult.stem.zh}${scoringResult.branch.zh} ages ${scoringResult.ageStart}-${scoringResult.ageEnd}`;
}

export function formatActiveDaYunElements(scoringResult: NonNullable<HourlyScoringResult['activeDaYun']>) {
  return `${scoringResult.elements.stem} stem${ACTIVE_DA_YUN_SEPARATOR}${scoringResult.elements.branch} branch`;
}

export function formatSlotHeading(slot: HourSlotScore) {
  return `${slot.hourLabel}${SLOT_SEPARATOR}${slot.branch.zh}`;
}

export function formatSlotScoreBreakdown(slot: HourSlotScore) {
  return `Base ${slot.baseScore >= 0 ? '+' : ''}${slot.baseScore}${SCORE_BREAKDOWN_SEPARATOR}Da Yun ${slot.daYunModifier >= 0 ? '+' : ''}${slot.daYunModifier}${SCORE_BREAKDOWN_SEPARATOR}Final ${slot.finalScore >= 0 ? '+' : ''}${slot.finalScore}`;
}

function ScoreChip({ score }: { score: number }) {
  const tone = score > 0 ? 'cyan' : score < 0 ? 'danger' : 'default';
  return (
    <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${tone === 'cyan' ? 'bg-[#d9fbf6]/80 text-[#006a62]' : tone === 'danger' ? 'bg-[#ffe4ea]/90 text-[#b91c1c]' : 'bg-[#f8fafc]/90 text-[#475569]'}`}>
      {score >= 0 ? '+' : ''}{score}
    </span>
  );
}

function BreakdownValue({ value }: { value: number }) {
  return <span className="font-semibold text-[#151d22]">{value >= 0 ? '+' : ''}{value}</span>;
}

function TableRow({ slot }: { slot: HourSlotScore }) {
  return (
    <tr className="border-t border-slate-200/70">
      <td className="whitespace-nowrap py-4 pr-4 text-sm text-[#151d22]/84">{slot.hourLabel}</td>
      <td className="whitespace-nowrap py-4 pr-4 text-sm text-[#151d22]/84">{slot.branch.zh} ({slot.branch.animal})</td>
      <td className="whitespace-nowrap py-4 pr-4 text-sm text-[#151d22]/84">{slot.stem.zh}{slot.branch.zh}</td>
      <td className="py-4 pr-4 text-sm text-[#151d22]/84">{slot.tenGod.zh}</td>
      <td className="py-4 pr-4 text-sm text-[#151d22]/84"><BreakdownValue value={slot.baseScore} /></td>
      <td className="py-4 pr-4 text-sm text-[#151d22]/84"><BreakdownValue value={slot.daYunModifier} /></td>
      <td className="py-4 pr-4 text-sm text-[#151d22]/84"><ScoreChip score={slot.finalScore} /></td>
      <td className="py-4 pr-4 text-sm text-[#151d22]/84">{slot.categoryScores.career}</td>
      <td className="py-4 pr-4 text-sm text-[#151d22]/84">{slot.categoryScores.wealth}</td>
      <td className="py-4 pr-4 text-sm text-[#151d22]/84">{slot.categoryScores.love}</td>
      <td className="py-4 text-sm text-[#151d22]/84">{slot.categoryScores.health}</td>
    </tr>
  );
}

export default function HourlyScoringPanel() {
  const { status } = useSession();
  const [formValues, setFormValues] = useState<AnalysisFormDraft>(DEFAULT_FORM_VALUES);
  const [savedProfile, setSavedProfile] = useState<AnalysisFormPayload | null>(null);
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileSaving, setProfileSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [scoringResult, setScoringResult] = useState<HourlyScoringResult | null>(null);

  async function loadHourlyScoring() {
    setProfileLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/hourly-scoring');
      if (!response.ok) {
        const body = await response.json().catch(() => null);
        throw new Error(body?.error ?? 'Unable to load hourly scoring.');
      }

      const json = await response.json() as { profile: AnalysisFormPayload | null; scoring: HourlyScoringResult | null };
      if (json.profile) {
        setSavedProfile(json.profile);
        setFormValues({ ...json.profile });
        setIsEditing(false);
        setScoringResult(json.scoring);
      } else {
        setSavedProfile(null);
        setIsEditing(true);
        setScoringResult(null);
      }
    } catch (loadError: unknown) {
      setSavedProfile(null);
      setScoringResult(null);
      setError(loadError instanceof Error ? loadError.message : 'Unable to load hourly scoring.');
    } finally {
      setProfileLoading(false);
    }
  }

  useEffect(() => {
    if (status !== 'authenticated') return;
    loadHourlyScoring();
  }, [status]);

  const hasSavedProfile = Boolean(savedProfile);
  const canEditYinYang = formValues.genderIdentity !== 'male' && formValues.genderIdentity !== 'female';

  const handleBirthPlaceSelect = (place: PlaceSearchResult) => {
    setFormValues((current) => ({
      ...current,
      birthPlace: place,
      birthPlaceQuery: [place.name, place.admin1, place.country].filter(Boolean).join(', '),
      timezone: place.timezone,
      longitude: place.longitude.toFixed(4),
      latitude: place.latitude.toFixed(4),
    }));
  };

  const handleSaveProfile = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setProfileSaving(true);
    setError(null);

    const normalized = finalizeAnalysisFormPayload(formValues);
    if (!normalized) {
      setError('Please complete the profile with valid gender polarity, date, and location fields.');
      setProfileSaving(false);
      return;
    }

    try {
      const response = await fetch('/api/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formValues),
      });

      if (!response.ok) {
        const body = await response.json().catch(() => null);
        throw new Error(body?.error ?? 'Unable to save your profile.');
      }

      const json = await response.json() as { profile: AnalysisFormPayload };
      setSavedProfile(json.profile);
      setFormValues({ ...json.profile });
      setIsEditing(false);
      setError(null);
      await loadHourlyScoring();
    } catch (saveError: unknown) {
      setError(saveError instanceof Error ? saveError.message : 'Unable to save your profile.');
    } finally {
      setProfileSaving(false);
    }
  };

  if (status === 'loading') {
    return (
      <div className="mx-auto mt-10 max-w-5xl rounded-[2rem] bg-white/90 p-8 text-center shadow-[0_30px_90px_rgba(0,106,98,0.08)]">
        <p className="text-sm text-[#151d22]/72">Checking your membership status...</p>
      </div>
    );
  }

  if (status === 'unauthenticated') {
    return (
      <div className="mx-auto mt-10 max-w-5xl rounded-[2rem] bg-white/90 p-8 shadow-[0_30px_90px_rgba(0,106,98,0.08)]">
        <div className="flex flex-col gap-5 text-center">
          <Badge tone="gold">Members only</Badge>
          <h2 className="font-serif text-3xl text-[#151d22]">Sign in to unlock your hourly BaZi score</h2>
          <p className="max-w-2xl mx-auto text-sm leading-7 text-[#151d22]/70">
            Sign in to save your birth profile and get your BaZi 2-hour scoring for today without re-entering details each time.
          </p>
          <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
            <Button variant="primary" size="lg" onClick={() => signIn('google')}>
              Sign in with Google
            </Button>
            <Button variant="secondary" size="lg" onClick={() => window.location.assign('/calculator')}>
              Back to calculator
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto mt-10 max-w-6xl space-y-8">
      <GlowCard accent="cyan" className="p-6">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <Badge tone="cyan">Member feature</Badge>
            <h2 className="mt-3 font-serif text-3xl text-[#151d22]">Your saved BaZi profile</h2>
            <p className="mt-2 max-w-2xl text-sm leading-7 text-[#151d22]/66">
              Use your saved birth information to compute today&apos;s fresh hourly scores without re-entering your details.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Button variant="secondary" size="md" onClick={() => setIsEditing(true)}>
              {hasSavedProfile ? 'Edit saved profile' : 'Set up profile'}
            </Button>
          </div>
        </div>
      </GlowCard>

      {error ? (
        <div className="rounded-[2rem] bg-[#fff1f2] px-6 py-5 text-sm text-[#991b1b] shadow-[inset_0_0_0_1px_rgba(153,27,27,0.12)]">
          {error}
        </div>
      ) : null}

      {(profileLoading || profileSaving) && (
        <div className="rounded-[2rem] bg-white/90 px-6 py-8 shadow-[0_18px_40px_rgba(0,106,98,0.08)]">
          <p className="text-sm text-[#151d22]/72">
            {profileLoading ? LOADING_SAVED_PROFILE_TEXT : SAVING_PROFILE_TEXT}
          </p>
        </div>
      )}

      {(isEditing || !hasSavedProfile) ? (
        <form onSubmit={handleSaveProfile} className="grid gap-6 rounded-[2rem] bg-white/90 p-6 shadow-[0_18px_40px_rgba(0,106,98,0.08)]">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="text-xs font-medium uppercase tracking-[0.18em] text-[#151d22]/64">Gender identity</label>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                {GENDER_IDENTITY_OPTIONS.map((option) => (
                  <label key={option.value} className="flex cursor-pointer items-start gap-3 rounded-[1.6rem] border border-slate-200 bg-slate-50 px-4 py-3 transition hover:border-slate-300">
                    <input
                      type="radio"
                      name="genderIdentity"
                      value={option.value}
                      checked={formValues.genderIdentity === option.value}
                      onChange={() => {
                        const nextCalculationMode = option.autoCalculationMode ?? '';
                        setFormValues((current) => ({
                          ...current,
                          genderIdentity: option.value,
                          calculationMode: nextCalculationMode,
                          genderOtherText: option.value === 'other' ? current.genderOtherText : '',
                        }));
                      }}
                      className="mt-1 h-4 w-4 text-[#006a62]"
                    />
                    <span className="min-w-0 text-sm">
                      <span className="font-semibold text-[#151d22]">{option.label}</span>
                      <span className="block text-xs text-[#151d22]/60">{option.tagline}</span>
                    </span>
                  </label>
                ))}
              </div>
            </div>

            {canEditYinYang ? (
              <div>
                <label className="text-xs font-medium uppercase tracking-[0.18em] text-[#151d22]/64">Yin/Yang polarity</label>
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  {YIN_YANG_OPTIONS.map((option) => (
                    <label key={option.value} className="flex cursor-pointer items-center gap-3 rounded-[1.6rem] border border-slate-200 bg-slate-50 px-4 py-3 transition hover:border-slate-300">
                      <input
                        type="radio"
                        name="calculationMode"
                        value={option.value}
                        checked={formValues.calculationMode === option.value}
                        onChange={() => setFormValues((current) => ({ ...current, calculationMode: option.value }))}
                        className="mt-1 h-4 w-4 text-[#006a62]"
                      />
                      <span className="text-sm text-[#151d22]">{option.label}</span>
                    </label>
                  ))}
                </div>
              </div>
            ) : null}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block text-xs font-medium uppercase tracking-[0.18em] text-[#151d22]/64">
              Date of birth
              <input
                type="date"
                value={formValues.dob}
                onChange={(event) => setFormValues((current) => ({ ...current, dob: event.target.value }))}
                className="mt-2 glass-input w-full rounded-[1.4rem] px-4 py-3 text-sm"
              />
            </label>

            <label className="block text-xs font-medium uppercase tracking-[0.18em] text-[#151d22]/64">
              Time of birth
              <input
                type="time"
                value={formValues.tob}
                disabled={formValues.unknownTime}
                onChange={(event) => setFormValues((current) => ({ ...current, tob: event.target.value }))}
                className="mt-2 glass-input w-full rounded-[1.4rem] px-4 py-3 text-sm"
              />
              <div className="mt-2 text-xs text-[#151d22]/56">
                Use the recorded local clock time at the birthplace. DST is detected by timezone.
              </div>
            </label>
          </div>

          <div className="flex items-center gap-3 rounded-[1.4rem] bg-slate-50 px-4 py-3 text-sm text-[#151d22]/74">
            <input
              type="checkbox"
              checked={formValues.unknownTime}
              onChange={(event) => setFormValues((current) => ({ ...current, unknownTime: event.target.checked }))}
              className="h-4 w-4 text-[#006a62]"
            />
            <span>I don&apos;t know my birth time</span>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <BirthPlaceSearch
              value={formValues.birthPlaceQuery}
              onChange={(value) => setFormValues((current) => ({ ...current, birthPlaceQuery: value, birthPlace: null }))}
              onSelect={handleBirthPlaceSelect}
              selectedPlace={formValues.birthPlace}
            />

            <div className="grid gap-4">
              <label className="block text-xs font-medium uppercase tracking-[0.18em] text-[#151d22]/64">
                Timezone
                <input
                  type="text"
                  value={formValues.timezone}
                  onChange={(event) => setFormValues((current) => ({ ...current, timezone: event.target.value }))}
                  className="mt-2 glass-input w-full rounded-[1.4rem] px-4 py-3 text-sm"
                  placeholder="e.g. Asia/Bangkok"
                />
              </label>

              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block text-xs font-medium uppercase tracking-[0.18em] text-[#151d22]/64">
                  Longitude
                  <input
                    type="number"
                    value={formValues.longitude}
                    onChange={(event) => setFormValues((current) => ({ ...current, longitude: event.target.value }))}
                    className="mt-2 glass-input w-full rounded-[1.4rem] px-4 py-3 text-sm"
                    step="0.01"
                    min="-180"
                    max="180"
                  />
                </label>
                <label className="block text-xs font-medium uppercase tracking-[0.18em] text-[#151d22]/64">
                  Latitude
                  <input
                    type="number"
                    value={formValues.latitude}
                    onChange={(event) => setFormValues((current) => ({ ...current, latitude: event.target.value }))}
                    className="mt-2 glass-input w-full rounded-[1.4rem] px-4 py-3 text-sm"
                    step="0.01"
                    min="-90"
                    max="90"
                  />
                </label>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:justify-between sm:items-center">
            <div>
              <div className="text-xs uppercase tracking-[0.24em] text-[#151d22]/48">Profile summary</div>
              <div className="mt-2 text-sm text-[#151d22]/70">This birth profile is saved to your account and used for all future hourly scoring requests.</div>
            </div>
            <Button type="submit" variant="primary" size="lg" disabled={profileSaving}>
              {profileSaving ? SAVING_PROFILE_TEXT : hasSavedProfile ? 'Update profile' : 'Save profile'}
            </Button>
          </div>
        </form>
      ) : scoringResult ? (
        <div className="space-y-8">
          <GlowCard accent="gold" className="p-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <Badge tone="gold">Today only</Badge>
                <h2 className="mt-3 font-serif text-3xl text-[#151d22]">Hourly scoring for {scoringResult.currentDateLabel}</h2>
                <p className="mt-2 max-w-2xl text-sm leading-7 text-[#151d22]/66">
                  Scores are recomputed fresh from your saved birth profile and today&apos;s day stem. The hour is the short-term trigger, while the active Da Yun acts as the longer-term background layer.
                </p>
              </div>
              <div className="grid gap-2 rounded-[1.4rem] bg-slate-50 p-4 text-sm text-[#151d22]/76">
                <div><span className="font-semibold text-[#151d22]">Day Master</span> {scoringResult.dmZh} / {scoringResult.dmElement}</div>
                <div><span className="font-semibold text-[#151d22]">Strength</span> {scoringResult.dmStrength}</div>
                <div><span className="font-semibold text-[#151d22]">Useful God</span> {scoringResult.usefulGod}</div>
              </div>
            </div>
          </GlowCard>

          {scoringResult.activeDaYun ? (
            <GlowCard accent="violet" className="p-6">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <Badge tone="violet">Active Da Yun</Badge>
                  <h3 className="mt-3 font-serif text-2xl text-[#151d22]">
                    {formatActiveDaYunHeadline(scoringResult.activeDaYun)}
                  </h3>
                  <p className="mt-2 max-w-2xl text-sm leading-7 text-[#151d22]/66">
                    This cycle covers {scoringResult.activeDaYun.yearStart}-{scoringResult.activeDaYun.yearEnd}. It does not replace the hourly score; it reweights each slot as the long-term climate around today&apos;s hour trigger.
                  </p>
                </div>
                <div className="grid gap-2 rounded-[1.4rem] bg-slate-50 p-4 text-sm text-[#151d22]/76">
                  <div><span className="font-semibold text-[#151d22]">Elements</span> {formatActiveDaYunElements(scoringResult.activeDaYun)}</div>
                  <div><span className="font-semibold text-[#151d22]">Ten Gods</span> {scoringResult.activeDaYun.stemTenGod.en} / {scoringResult.activeDaYun.branchTenGod.en}</div>
                  <div><span className="font-semibold text-[#151d22]">Score modifier</span> {scoringResult.activeDaYun.modifier >= 0 ? '+' : ''}{scoringResult.activeDaYun.modifier}</div>
                </div>
              </div>
              <div className="mt-5 grid gap-3 md:grid-cols-2">
                {scoringResult.activeDaYun.elementInfluences.map((influence) => (
                  <div key={`${influence.source}-${influence.element}`} className="rounded-[1.3rem] bg-white/85 p-4 text-sm text-[#151d22]/78 shadow-[inset_0_0_0_1px_rgba(64,224,208,0.12)]">
                    <div className="font-semibold text-[#151d22] capitalize">{influence.source} element: {influence.element}</div>
                    <div className="mt-1">Relation: {influence.relation}</div>
                    <div className="mt-1">Modifier: {influence.modifier >= 0 ? '+' : ''}{influence.modifier}</div>
                  </div>
                ))}
              </div>
              <div className="mt-5 text-sm text-[#151d22]/70">
                Category background: career {scoringResult.activeDaYun.categoryModifier.career >= 0 ? '+' : ''}{scoringResult.activeDaYun.categoryModifier.career},
                wealth {scoringResult.activeDaYun.categoryModifier.wealth >= 0 ? '+' : ''}{scoringResult.activeDaYun.categoryModifier.wealth},
                love {scoringResult.activeDaYun.categoryModifier.love >= 0 ? '+' : ''}{scoringResult.activeDaYun.categoryModifier.love},
                health {scoringResult.activeDaYun.categoryModifier.health >= 0 ? '+' : ''}{scoringResult.activeDaYun.categoryModifier.health}.
              </div>
            </GlowCard>
          ) : null}

          <GlowCard accent="cyan" className="p-6">
            <div className="mb-4 text-sm text-[#151d22]/70">
              Category columns include the hour&apos;s base Ten God contribution plus the active Da Yun category background.
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full border-separate border-spacing-0 text-left text-sm">
                <thead>
                  <tr className="bg-slate-100 text-xs uppercase tracking-[0.22em] text-[#151d22]/60">
                    <th className="py-3 pr-4">Slot</th>
                    <th className="py-3 pr-4">Branch</th>
                    <th className="py-3 pr-4">Hour stem</th>
                    <th className="py-3 pr-4">Ten God</th>
                    <th className="py-3 pr-4">Base</th>
                    <th className="py-3 pr-4">Da Yun</th>
                    <th className="py-3 pr-4">Final</th>
                    <th className="py-3 pr-4">Career</th>
                    <th className="py-3 pr-4">Wealth</th>
                    <th className="py-3 pr-4">Love</th>
                    <th className="py-3 py-3">Health</th>
                  </tr>
                </thead>
                <tbody>
                  {scoringResult.slots.map((slot) => (
                    <TableRow key={slot.branchIdx} slot={slot} />
                  ))}
                </tbody>
              </table>
            </div>
          </GlowCard>

          <div className="grid gap-6 lg:grid-cols-2">
            <GlowCard accent="violet" className="p-6">
              <h3 className="font-serif text-2xl text-[#151d22]">Strongest positive slot{scoringResult.strongestPositiveSlots.length === 1 ? '' : 's'}</h3>
              <div className="mt-4 space-y-4">
                {scoringResult.strongestPositiveSlots.map((slot) => (
                  <div key={slot.branchIdx} className="rounded-[1.5rem] bg-white/90 p-4 shadow-[inset_0_0_0_1px_rgba(64,224,208,0.14)]">
                    <div className="text-sm font-semibold text-[#151d22]">{formatSlotHeading(slot)}</div>
                    <div className="mt-2 text-xs uppercase tracking-[0.18em] text-[#151d22]/46">
                      {formatSlotScoreBreakdown(slot)}
                    </div>
                    <p className="mt-2 text-sm text-[#151d22]/70">{slot.explanation}</p>
                  </div>
                ))}
              </div>
            </GlowCard>

            <GlowCard accent="pink" className="p-6">
              <h3 className="font-serif text-2xl text-[#151d22]">Strongest negative slot{scoringResult.strongestNegativeSlots.length === 1 ? '' : 's'}</h3>
              <div className="mt-4 space-y-4">
                {scoringResult.strongestNegativeSlots.map((slot) => (
                  <div key={slot.branchIdx} className="rounded-[1.5rem] bg-white/90 p-4 shadow-[inset_0_0_0_1px_rgba(248,113,113,0.14)]">
                    <div className="text-sm font-semibold text-[#151d22]">{formatSlotHeading(slot)}</div>
                    <div className="mt-2 text-xs uppercase tracking-[0.18em] text-[#151d22]/46">
                      {formatSlotScoreBreakdown(slot)}
                    </div>
                    <p className="mt-2 text-sm text-[#151d22]/70">{slot.explanation}</p>
                  </div>
                ))}
              </div>
            </GlowCard>
          </div>
        </div>
      ) : null}
    </div>
  );
}

