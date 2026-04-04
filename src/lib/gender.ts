export const LEGACY_BINARY_GENDER_VALUES = ['male', 'female'] as const;
export type LegacyBinaryGender = (typeof LEGACY_BINARY_GENDER_VALUES)[number];

export const GENDER_IDENTITY_VALUES = [
  ...LEGACY_BINARY_GENDER_VALUES,
  'non_binary',
  'prefer_not_to_say',
  'other',
] as const;
export type GenderIdentity = (typeof GENDER_IDENTITY_VALUES)[number];

export type CalculationGenderMode = LegacyBinaryGender;

export type GenderFields = {
  genderIdentity: GenderIdentity;
  genderOtherText: string;
  calculationMode: CalculationGenderMode;
};

export type GenderDraftFields = {
  genderIdentity: GenderIdentity;
  genderOtherText: string;
  calculationMode: CalculationGenderMode | '';
};

export type LegacyGenderFields = {
  gender?: LegacyBinaryGender;
};

export function isLegacyBinaryGender(value: unknown): value is LegacyBinaryGender {
  return value === 'male' || value === 'female';
}

export function isGenderIdentity(value: unknown): value is GenderIdentity {
  return typeof value === 'string' && GENDER_IDENTITY_VALUES.includes(value as GenderIdentity);
}

export function isCalculationGenderMode(value: unknown): value is CalculationGenderMode {
  return isLegacyBinaryGender(value);
}

export function formatGenderIdentity(identity: GenderIdentity, otherText?: string): string {
  switch (identity) {
    case 'male':
      return 'Male';
    case 'female':
      return 'Female';
    case 'non_binary':
      return 'Non-binary';
    case 'prefer_not_to_say':
      return 'Prefer not to say';
    case 'other': {
      const trimmed = otherText?.trim();
      return trimmed ? `Other (${trimmed})` : 'Other';
    }
    default:
      return 'Unspecified';
  }
}

/**
 * Precise technical label used in AI prompts and server-side logging.
 * Includes both the traditional rule name and the Yin/Yang energy framing
 * so AI models and logs have full context.
 */
export function formatCalculationGenderMode(mode: CalculationGenderMode): string {
  return mode === 'male'
    ? 'Treat as male (Yang/陽 — active energy rule)'
    : 'Treat as female (Yin/陰 — receptive energy rule)';
}

/**
 * User-facing display label for the calculation mode.
 * Uses Yin/Yang language rather than male/female to keep the UI
 * inclusive and rooted in the actual energetic principle.
 */
export function formatCalculationGenderModeDisplay(mode: CalculationGenderMode): string {
  return mode === 'male'
    ? 'Yang (陽) · Active energy'
    : 'Yin (陰) · Receptive energy';
}

export function normalizeGenderDraft(
  value: Partial<GenderDraftFields & LegacyGenderFields> | null | undefined,
): GenderDraftFields | null {
  if (!value) return null;

  const legacyGender = isLegacyBinaryGender(value.gender) ? value.gender : null;
  const genderIdentity = isGenderIdentity(value.genderIdentity) ? value.genderIdentity : legacyGender;

  if (!genderIdentity) return null;

  const calculationMode = isCalculationGenderMode(value.calculationMode)
    ? value.calculationMode
    : legacyGender ?? (genderIdentity === 'male' || genderIdentity === 'female' ? genderIdentity : '');

  const genderOtherText = genderIdentity === 'other' && typeof value.genderOtherText === 'string'
    ? value.genderOtherText
    : '';

  return {
    genderIdentity,
    genderOtherText,
    calculationMode,
  };
}

export function finalizeGenderFields(draft: GenderDraftFields): GenderFields | null {
  if (!isGenderIdentity(draft.genderIdentity) || !isCalculationGenderMode(draft.calculationMode)) {
    return null;
  }

  return {
    genderIdentity: draft.genderIdentity,
    genderOtherText: draft.genderIdentity === 'other' ? draft.genderOtherText.trim() : '',
    calculationMode: draft.calculationMode,
  };
}
