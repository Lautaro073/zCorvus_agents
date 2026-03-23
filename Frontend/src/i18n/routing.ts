import { clientEnv } from '@/config/env.client';
import { defineRouting } from 'next-intl/routing';

export const LOCALES = ['es', 'en'] as const
export type Locale = (typeof LOCALES)[number];
export const DEFAULT_LOCALE = clientEnv.NEXT_PUBLIC_DEFAULT_LOCALE

export const routing = defineRouting({
  locales: LOCALES,
  defaultLocale: DEFAULT_LOCALE,
  localePrefix: 'always'
});
