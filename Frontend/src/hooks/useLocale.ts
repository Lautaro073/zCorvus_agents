"use client"
import { DEFAULT_LOCALE, Locale, LOCALES } from "@/i18n/routing"
import { useParams } from 'next/navigation';

export function useLocale() {
  const params = useParams();
  const currentLocale = (params.locale as Locale) ?? DEFAULT_LOCALE;

  const currentLocaleIdx = LOCALES.indexOf(currentLocale)
  const totalLocales = LOCALES.length

  const nextLocale = currentLocaleIdx + 1 < totalLocales ? LOCALES[currentLocaleIdx + 1] : LOCALES[0]

  return { currentLocale, nextLocale }
}