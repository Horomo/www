import type { AnalysisFormPayload } from '@/lib/analysis-payload';
import {
  clockTimeToUtc,
  getStandardMeridianDegrees,
  getStdOffsetMinutes,
} from '@/lib/bazi';

export const LOCATION_TIMEZONE_LONGITUDE_MAX_DIFF_DEGREES = 60;

// The minimal set of fields the longitude/timezone check needs. Both the
// write-path API guard (full AnalysisFormPayload) and the MCP tools (which have
// no form payload) validate through the same core, so the 60° rule lives once.
export type BirthLocationFields = Pick<AnalysisFormPayload, 'dob' | 'tob' | 'unknownTime' | 'timezone' | 'longitude'>;

export type LocationWriteValidationResult =
  | {
    valid: true;
    longitude: number;
    timezone: string;
    standardMeridian: number;
    differenceDegrees: number;
    thresholdDegrees: number;
  }
  | {
    valid: false;
    error: string;
    longitude?: number;
    timezone: string;
    standardMeridian?: number;
    differenceDegrees?: number;
    thresholdDegrees: number;
  };

function formatDegrees(value: number): string {
  return value.toFixed(2);
}

function normalizeLongitudeDegrees(value: number): number {
  const normalized = ((((value + 180) % 360) + 360) % 360) - 180;
  return Object.is(normalized, -180) ? 180 : normalized;
}

function longitudeDistanceDegrees(a: number, b: number): number {
  return Math.abs(normalizeLongitudeDegrees(a - b));
}

function parseDateParts(date: string): [number, number, number] | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  if (!match) return null;

  const [, year, month, day] = match;
  return [Number.parseInt(year, 10), Number.parseInt(month, 10), Number.parseInt(day, 10)];
}

function parseTimeParts(time: string): [number, number] | null {
  const match = /^(\d{2}):(\d{2})$/.exec(time);
  if (!match) return null;

  const [, hour, minute] = match;
  return [Number.parseInt(hour, 10), Number.parseInt(minute, 10)];
}

function birthInstantForValidation(profile: BirthLocationFields): Date {
  const dateParts = parseDateParts(profile.dob);
  if (!dateParts) {
    throw new Error('Date of birth must use YYYY-MM-DD format.');
  }

  const [year, month, day] = dateParts;
  const timeParts = profile.unknownTime ? [12, 0] as const : parseTimeParts(profile.tob);
  if (!timeParts) {
    throw new Error('Time of birth must use HH:mm format.');
  }

  const [hour, minute] = timeParts;
  return clockTimeToUtc(year, month, day, hour, minute, profile.timezone);
}

export function validateBirthLocation(
  profile: BirthLocationFields,
  thresholdDegrees = LOCATION_TIMEZONE_LONGITUDE_MAX_DIFF_DEGREES,
): LocationWriteValidationResult {
  const timezone = profile.timezone;
  // Strict numeric parse: reject trailing garbage like "100abc" (parseFloat would
  // silently accept it as 100) and empty strings before the range check.
  const rawLongitude = profile.longitude.trim();
  const longitude = /^-?\d+(\.\d+)?$/.test(rawLongitude) ? Number(rawLongitude) : NaN;

  if (!Number.isFinite(longitude) || longitude < -180 || longitude > 180) {
    return {
      valid: false,
      error: 'Birth location longitude must be between -180 and 180.',
      timezone,
      thresholdDegrees,
    };
  }

  try {
    const birthInstant = birthInstantForValidation(profile);
    const stdOffsetMin = getStdOffsetMinutes(birthInstant, timezone);
    const standardMeridian = normalizeLongitudeDegrees(getStandardMeridianDegrees(stdOffsetMin));
    const differenceDegrees = longitudeDistanceDegrees(longitude, standardMeridian);

    if (differenceDegrees > thresholdDegrees) {
      return {
        valid: false,
        error: `Birth location longitude ${formatDegrees(longitude)} does not match timezone ${timezone}; standard meridian ${formatDegrees(standardMeridian)}, difference ${formatDegrees(differenceDegrees)} degrees exceeds ${formatDegrees(thresholdDegrees)} degrees.`,
        longitude,
        timezone,
        standardMeridian,
        differenceDegrees,
        thresholdDegrees,
      };
    }

    return {
      valid: true,
      longitude,
      timezone,
      standardMeridian,
      differenceDegrees,
      thresholdDegrees,
    };
  } catch (error: unknown) {
    return {
      valid: false,
      error: `Birth location timezone/longitude could not be validated: ${error instanceof Error ? error.message : 'Unknown validation error.'}`,
      longitude,
      timezone,
      thresholdDegrees,
    };
  }
}

// Write-path API guard: same rule, accepting the full form payload.
export function validateBirthLocationForWrite(
  profile: AnalysisFormPayload,
  thresholdDegrees = LOCATION_TIMEZONE_LONGITUDE_MAX_DIFF_DEGREES,
): LocationWriteValidationResult {
  return validateBirthLocation(profile, thresholdDegrees);
}
