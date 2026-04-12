'use client';

import { FormEvent, useEffect, useRef, useState } from 'react';

import BirthPlaceSearch from '@/components/BirthPlaceSearch';
import {
  HourlyScoringResultContent,
} from '@/components/hourly-scoring/HourlyScoringSections';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import { finalizeAnalysisFormPayload, type AnalysisFormDraft, type AnalysisFormPayload } from '@/lib/analysis-payload';
import { type HourlyScoringResult } from '@/lib/hourly-scoring';
import { type CalculationGenderMode, type GenderIdentity } from '@/lib/gender';
import type { PlaceSearchResult } from '@/lib/places';

const GENDER_IDENTITY_OPTIONS: Array<{
  value: GenderIdentity;
  label: string;
  tagline: string;
  autoCalculationMode: CalculationGenderMode | null;
}> = [
  { value: 'male', label: 'Male', tagline: 'Yin/Yang automatically set to Yang', autoCalculationMode: 'male' },
  { value: 'female', label: 'Female', tagline: 'Yin/Yang automatically set to Yin', autoCalculationMode: 'female' },
  { value: 'non_binary', label: 'Non-binary', tagline: 'Choose Yin or Yang polarity below', autoCalculationMode: null },
  { value: 'prefer_not_to_say', label: 'Prefer not to say', tagline: 'Choose Yin or Yang polarity below', autoCalculationMode: null },
  { value: 'other', label: 'Other', tagline: 'Choose Yin or Yang polarity below', autoCalculationMode: null },
];

const YIN_YANG_OPTIONS: Array<{
  value: CalculationGenderMode;
  label: string;
}> = [
  { value: 'male', label: 'Yang polarity' },
  { value: 'female', label: 'Yin polarity' },
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
export { formatActiveDaYunElements, formatActiveDaYunHeadline, formatSlotHeading, formatSlotScoreBreakdown, HourlyScoringResultContent } from '@/components/hourly-scoring/HourlyScoringSections';

function SectionEyebrow({ children }: { children: React.ReactNode }) {
  return <div className="text-[11px] uppercase tracking-[0.28em] text-[#0d5d56]/62">{children}</div>;
}

function sanitizeCoordinateInput(value: string) {
  let next = value.replace(/[^0-9.-]/g, '');
  const minus = next.startsWith('-') ? '-' : '';
  next = minus + next.slice(minus ? 1 : 0).replace(/-/g, '');

  const dotIndex = next.indexOf('.');
  if (dotIndex !== -1) {
    next = `${next.slice(0, dotIndex + 1)}${next.slice(dotIndex + 1).replace(/\./g, '')}`;
  }

  return next;
}

function FormField({
  label,
  children,
  description,
}: {
  label: string;
  children: React.ReactNode;
  description?: string;
}) {
  return (
    <label className="block text-xs font-medium uppercase tracking-[0.18em] text-[#48605c]">
      {label}
      <div className="mt-2">{children}</div>
      {description ? <div className="mt-2 text-[11px] normal-case tracking-normal text-[#5b6f6d]">{description}</div> : null}
    </label>
  );
}

export default function HourlyScoringPanel() {
  const [formValues, setFormValues] = useState<AnalysisFormDraft>(DEFAULT_FORM_VALUES);
  const [savedProfile, setSavedProfile] = useState<AnalysisFormPayload | null>(null);
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileSaving, setProfileSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [scoringResult, setScoringResult] = useState<HourlyScoringResult | null>(null);
  const [isCoordinateOverrideEnabled, setIsCoordinateOverrideEnabled] = useState(false);
  const editFormRef = useRef<HTMLFormElement | null>(null);

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
        setIsCoordinateOverrideEnabled(!json.profile.birthPlace);
        setIsEditing(false);
        setScoringResult(json.scoring);
      } else {
        setSavedProfile(null);
        setIsCoordinateOverrideEnabled(true);
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
    loadHourlyScoring();
  }, []);

  useEffect(() => {
    if (!isEditing) return;

    const frame = window.requestAnimationFrame(() => {
      editFormRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });

    return () => window.cancelAnimationFrame(frame);
  }, [isEditing]);

  const hasSavedProfile = Boolean(savedProfile);
  const canEditYinYang = formValues.genderIdentity !== 'male' && formValues.genderIdentity !== 'female';
  const coordinatesLockedFromPlace = Boolean(formValues.birthPlace) && !isCoordinateOverrideEnabled;

  const startEditing = () => {
    if (savedProfile) {
      setFormValues({ ...savedProfile });
      setIsCoordinateOverrideEnabled(!savedProfile.birthPlace);
    }
    setError(null);
    setIsEditing(true);
  };

  const cancelEditing = () => {
    if (savedProfile) {
      setFormValues({ ...savedProfile });
      setIsCoordinateOverrideEnabled(!savedProfile.birthPlace);
    } else {
      setFormValues(DEFAULT_FORM_VALUES);
      setIsCoordinateOverrideEnabled(true);
    }
    setError(null);
    setIsEditing(false);
  };

  const handleBirthPlaceSelect = (place: PlaceSearchResult) => {
    setIsCoordinateOverrideEnabled(false);
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

  return (
    <div className="mx-auto mt-10 max-w-7xl space-y-8 md:mt-12 md:space-y-10">
      <section className="rounded-[2.6rem] bg-[linear-gradient(180deg,rgba(255,255,255,0.72),rgba(240,248,247,0.78))] p-6 shadow-[0_24px_60px_rgba(13,93,86,0.06)] md:p-8">
        <div className="grid gap-8 lg:grid-cols-[minmax(0,1.1fr)_minmax(280px,0.9fr)] lg:items-end">
          <div className="pr-2 lg:pr-8">
            <SectionEyebrow>Saved Profile</SectionEyebrow>
            <h2 className="mt-3 max-w-[15ch] font-serif text-[2.2rem] leading-[0.99] tracking-[-0.035em] text-[#16302d] md:text-[3.1rem]">
              Your private chart profile, prepared for daily scoring
            </h2>
            <p className="mt-5 max-w-2xl text-sm leading-8 text-[#35514d] md:text-[15px]">
              The calculation model stays exactly as it is. This surface simply reframes your saved profile as the entry point to today&apos;s timing analysis.
            </p>
          </div>

          <div className="rounded-[2.1rem] bg-[linear-gradient(160deg,rgba(232,248,244,0.88),rgba(255,255,255,0.84)_54%,rgba(247,252,252,0.92))] p-6 shadow-[inset_0_0_0_1px_rgba(13,93,86,0.06)]">
            <div className="text-[11px] uppercase tracking-[0.24em] text-[#5b6f6d]">Profile status</div>
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <Badge tone="cyan">{hasSavedProfile ? 'Saved to account' : 'Profile needed'}</Badge>
              {savedProfile ? <Badge tone="default">{savedProfile.birthPlaceQuery}</Badge> : null}
            </div>
            <div className="mt-5 flex flex-wrap gap-2.5">
              <div className="rounded-full bg-white/75 px-4 py-2 shadow-[inset_0_0_0_1px_rgba(13,93,86,0.08)]">
                <div className="text-[10px] uppercase tracking-[0.2em] text-[#5b6f6d]">Birth date</div>
                <div className="mt-1 text-sm font-medium text-[#16302d]">{savedProfile?.dob ?? formValues.dob}</div>
              </div>
              <div className="rounded-full bg-white/75 px-4 py-2 shadow-[inset_0_0_0_1px_rgba(13,93,86,0.08)]">
                <div className="text-[10px] uppercase tracking-[0.2em] text-[#5b6f6d]">Birth time</div>
                <div className="mt-1 text-sm font-medium text-[#16302d]">{savedProfile?.unknownTime ? 'Unknown' : savedProfile?.tob ?? formValues.tob}</div>
              </div>
              <div className="rounded-full bg-white/75 px-4 py-2 shadow-[inset_0_0_0_1px_rgba(13,93,86,0.08)]">
                <div className="text-[10px] uppercase tracking-[0.2em] text-[#5b6f6d]">Timezone</div>
                <div className="mt-1 text-sm font-medium text-[#16302d]">{savedProfile?.timezone ?? formValues.timezone}</div>
              </div>
            </div>
            <div className="mt-6">
              <Button type="button" variant="secondary" size="md" onClick={startEditing}>
                {hasSavedProfile ? 'Edit saved profile' : 'Set up profile'}
              </Button>
            </div>
          </div>
        </div>
      </section>

      {error ? (
        <div className="rounded-[2rem] bg-[linear-gradient(180deg,rgba(255,241,244,0.92),rgba(255,255,255,0.9))] px-6 py-5 text-sm text-[#8f4655] shadow-[inset_0_0_0_1px_rgba(143,70,85,0.12)]">
          {error}
        </div>
      ) : null}

      {(profileLoading || profileSaving) && !scoringResult && !isEditing ? (
        <div className="rounded-[2rem] bg-[linear-gradient(180deg,rgba(255,255,255,0.82),rgba(242,249,248,0.9))] p-6 shadow-[0_18px_42px_rgba(13,93,86,0.05)]">
          <p className="text-sm text-[#35514d]">
            {profileLoading ? LOADING_SAVED_PROFILE_TEXT : SAVING_PROFILE_TEXT}
          </p>
        </div>
      ) : null}

      {(isEditing || !hasSavedProfile) ? (
        <form ref={editFormRef} onSubmit={handleSaveProfile} className="grid gap-6 rounded-[2.6rem] bg-[linear-gradient(180deg,rgba(255,255,255,0.88),rgba(241,249,248,0.92))] p-6 shadow-[0_24px_60px_rgba(13,93,86,0.08)] md:p-8">
          <div className="grid gap-4 lg:grid-cols-[minmax(0,1.1fr)_minmax(280px,0.9fr)]">
            <div>
              <SectionEyebrow>Profile Editor</SectionEyebrow>
              <h3 className="mt-3 font-serif text-[2rem] leading-tight text-[#16302d]">Save the profile used for every hourly request</h3>
              <p className="mt-3 max-w-2xl text-sm leading-8 text-[#35514d]">
                This keeps auth, saved-profile behavior, and scoring input exactly as before. The redesign only changes how the profile setup is presented.
              </p>
            </div>
            <div className="rounded-[2rem] bg-white/70 p-5 shadow-[inset_0_0_0_1px_rgba(13,93,86,0.06)]">
              <div className="text-[11px] uppercase tracking-[0.24em] text-[#5b6f6d]">Profile summary</div>
              <p className="mt-3 text-sm leading-7 text-[#35514d]">
                This saved birth profile will be reused for all future hourly scoring requests.
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                <Badge tone="default">{formValues.birthPlaceQuery || 'Birth location pending'}</Badge>
                <Badge tone="default">{formValues.timezone}</Badge>
                <Badge tone="default">{formValues.unknownTime ? 'Unknown birth time' : formValues.tob}</Badge>
              </div>
            </div>
          </div>

          <div className="grid gap-6 xl:grid-cols-2">
            <section className="rounded-[2.2rem] bg-[linear-gradient(180deg,rgba(255,255,255,0.76),rgba(242,249,248,0.82))] p-5 shadow-[0_18px_42px_rgba(13,93,86,0.045)]">
              <FormField label="Gender identity">
                <div className="grid gap-3 sm:grid-cols-2">
                  {GENDER_IDENTITY_OPTIONS.map((option) => (
                    <label key={option.value} className="flex cursor-pointer items-start gap-3 rounded-[1.5rem] bg-white/70 px-4 py-3 shadow-[inset_0_0_0_1px_rgba(13,93,86,0.08)] transition hover:bg-white/86">
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
                        className="mt-1 h-4 w-4 text-[#0d5d56]"
                      />
                      <span className="min-w-0 text-sm">
                        <span className="font-semibold text-[#16302d]">{option.label}</span>
                        <span className="mt-1 block text-xs leading-6 text-[#5b6f6d]">{option.tagline}</span>
                      </span>
                    </label>
                  ))}
                </div>
              </FormField>

              {canEditYinYang ? (
                <div className="mt-6">
                  <FormField label="Yin/Yang polarity">
                    <div className="grid gap-3 sm:grid-cols-2">
                      {YIN_YANG_OPTIONS.map((option) => (
                        <label key={option.value} className="flex cursor-pointer items-center gap-3 rounded-[1.5rem] bg-white/70 px-4 py-3 shadow-[inset_0_0_0_1px_rgba(13,93,86,0.08)] transition hover:bg-white/86">
                          <input
                            type="radio"
                            name="calculationMode"
                            value={option.value}
                            checked={formValues.calculationMode === option.value}
                            onChange={() => setFormValues((current) => ({ ...current, calculationMode: option.value }))}
                            className="mt-1 h-4 w-4 text-[#0d5d56]"
                          />
                          <span className="text-sm text-[#16302d]">{option.label}</span>
                        </label>
                      ))}
                    </div>
                  </FormField>
                </div>
              ) : null}
            </section>

            <section className="rounded-[2.2rem] bg-[linear-gradient(180deg,rgba(247,250,245,0.82),rgba(255,255,255,0.8))] p-5 shadow-[0_18px_42px_rgba(13,93,86,0.04)]">
              <div className="grid gap-4 md:grid-cols-2">
                <FormField label="Date of birth">
                  <input
                    type="date"
                    value={formValues.dob}
                    onChange={(event) => setFormValues((current) => ({ ...current, dob: event.target.value }))}
                    className="glass-input w-full rounded-[1.35rem] px-4 py-3 text-sm"
                  />
                </FormField>

                <FormField label="Time of birth" description="Use the recorded local clock time at the birthplace. DST is detected by timezone.">
                  <input
                    type="time"
                    value={formValues.tob}
                    disabled={formValues.unknownTime}
                    onChange={(event) => setFormValues((current) => ({ ...current, tob: event.target.value }))}
                    className="glass-input w-full rounded-[1.35rem] px-4 py-3 text-sm"
                  />
                </FormField>
              </div>

              <label className="mt-4 flex items-center gap-3 rounded-[1.5rem] bg-white/70 px-4 py-3 text-sm text-[#35514d] shadow-[inset_0_0_0_1px_rgba(13,93,86,0.08)]">
                <input
                  type="checkbox"
                  checked={formValues.unknownTime}
                  onChange={(event) => setFormValues((current) => ({ ...current, unknownTime: event.target.checked }))}
                  className="h-4 w-4 text-[#0d5d56]"
                />
                <span>I don&apos;t know my birth time</span>
              </label>
            </section>
          </div>

          <section className="rounded-[2.3rem] bg-[linear-gradient(180deg,rgba(255,255,255,0.76),rgba(242,249,248,0.82))] p-5 shadow-[0_18px_42px_rgba(13,93,86,0.045)]">
            <div className="grid gap-6 xl:grid-cols-[minmax(0,1.1fr)_minmax(280px,0.9fr)]">
              <BirthPlaceSearch
                value={formValues.birthPlaceQuery}
                onChange={(value) => {
                  setIsCoordinateOverrideEnabled(true);
                  setFormValues((current) => ({ ...current, birthPlaceQuery: value, birthPlace: null }));
                }}
                onSelect={handleBirthPlaceSelect}
                selectedPlace={formValues.birthPlace}
              />

              <div className="grid gap-4">
                <FormField label="Timezone">
                  <input
                    type="text"
                    value={formValues.timezone}
                    onChange={(event) => setFormValues((current) => ({ ...current, timezone: event.target.value }))}
                    className="glass-input w-full rounded-[1.35rem] px-4 py-3 text-sm"
                    placeholder="e.g. Asia/Bangkok"
                  />
                </FormField>

                <div className="grid gap-4 sm:grid-cols-2">
                  <FormField label="Longitude">
                    <input
                      type="text"
                      value={formValues.longitude}
                      onChange={(event) => setFormValues((current) => ({ ...current, longitude: sanitizeCoordinateInput(event.target.value) }))}
                      className="glass-input w-full rounded-[1.35rem] px-4 py-3 text-sm"
                      inputMode="decimal"
                      autoComplete="off"
                      placeholder="e.g. 100.5305"
                      readOnly={coordinatesLockedFromPlace}
                    />
                  </FormField>

                  <FormField label="Latitude">
                    <input
                      type="text"
                      value={formValues.latitude}
                      onChange={(event) => setFormValues((current) => ({ ...current, latitude: sanitizeCoordinateInput(event.target.value) }))}
                      className="glass-input w-full rounded-[1.35rem] px-4 py-3 text-sm"
                      inputMode="decimal"
                      autoComplete="off"
                      placeholder="e.g. 13.7563"
                      readOnly={coordinatesLockedFromPlace}
                    />
                  </FormField>
                </div>
                {formValues.birthPlace ? (
                  <div className="rounded-[1.5rem] bg-white/68 px-4 py-4 text-sm text-[#35514d] shadow-[inset_0_0_0_1px_rgba(13,93,86,0.06)]">
                    <p>
                      Coordinates are locked to the selected place so accidental keyboard input does not corrupt the saved location.
                    </p>
                    <div className="mt-3">
                      <Button
                        type="button"
                        variant="ghost"
                        size="md"
                        onClick={() => setIsCoordinateOverrideEnabled((current) => !current)}
                      >
                        {coordinatesLockedFromPlace ? 'Edit coordinates' : 'Lock to selected place'}
                      </Button>
                    </div>
                  </div>
                ) : null}
              </div>
            </div>
          </section>

          <div className="flex flex-col gap-3 border-t border-white/50 pt-2 sm:flex-row sm:items-center sm:justify-between">
            <p className="max-w-2xl text-sm leading-7 text-[#35514d]">
              Saving updates refreshes the same hourly scoring endpoint and preserves the existing account-based profile flow.
            </p>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              {hasSavedProfile ? (
                <Button type="button" variant="ghost" size="lg" onClick={cancelEditing} disabled={profileSaving}>
                  Cancel
                </Button>
              ) : null}
              <Button type="submit" variant="primary" size="lg" disabled={profileSaving}>
                {profileSaving ? SAVING_PROFILE_TEXT : hasSavedProfile ? 'Update profile' : 'Save profile'}
              </Button>
            </div>
          </div>
        </form>
      ) : scoringResult ? (
        <HourlyScoringResultContent scoringResult={scoringResult} />
      ) : null}
    </div>
  );
}
