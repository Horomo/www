/**
 * Centralized GA4 analytics module.
 *
 * All event firing goes through `trackEvent` so:
 *  - gtag absence is handled in one place
 *  - duplicate rapid-fire events are suppressed via a debounce key store
 */

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
  }
}

// Minimum ms that must pass before the same event fires again.
const DEDUP_WINDOW_MS = 500;

const lastFired: Record<string, number> = {};

/**
 * Fire a GA4 event safely.
 *
 * Duplicate calls for the same `eventName` within DEDUP_WINDOW_MS are dropped.
 * The dedup key includes a JSON-serialised subset of params so that genuinely
 * different events with the same name (e.g. two different energy_type values)
 * are never suppressed.
 */
export function trackEvent(
  eventName: string,
  params: Record<string, string | number | boolean | undefined> = {},
): void {
  if (typeof window === 'undefined' || typeof window.gtag !== 'function') return;

  const dedupKey = `${eventName}::${JSON.stringify(params)}`;
  const now = Date.now();

  if (lastFired[dedupKey] && now - lastFired[dedupKey] < DEDUP_WINDOW_MS) return;

  lastFired[dedupKey] = now;
  window.gtag('event', eventName, params);
}
