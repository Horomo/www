// MANUAL STEP: npm install next-intl
import { defineRouting } from 'next-intl/routing';

export const routing = defineRouting({
  locales: ['th', 'en', 'zh'],
  defaultLocale: 'th',
  localePrefix: 'as-needed', // Thai = /, English = /en/, Chinese = /zh/
  // Disable automatic Accept-Language sniffing. The URL is authoritative:
  // `/` is always Thai. `/en` and `/zh` are explicit opt-ins.
  // Without this, a browser with Accept-Language: en would get 302'd to /en
  // on first visit, making Thai feel like the non-default locale.
  localeDetection: false,
});

export type Locale = (typeof routing.locales)[number];
