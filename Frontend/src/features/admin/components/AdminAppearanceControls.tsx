"use client";

import { useMemo } from "react";
import { ZIcon } from "@zcorvus/z-icons/react";
import { useParams } from "next/navigation";
import { usePathname, useRouter } from "@/i18n/navigation";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { DEFAULT_LOCALE, type Locale, LOCALES } from "@/i18n/routing";
import { useUIStore } from "@/store";

function getValidIconType(iconSet: string): "neo" | "core" | "mina" {
  if (iconSet === "neo" || iconSet === "core" || iconSet === "mina") {
    return iconSet;
  }

  return "mina";
}

function getNextLocale(currentLocale: string): Locale {
  const normalizedCurrent = LOCALES.includes(currentLocale as Locale)
    ? (currentLocale as Locale)
    : DEFAULT_LOCALE;

  const currentIndex = LOCALES.indexOf(normalizedCurrent);
  const nextIndex = currentIndex + 1 < LOCALES.length ? currentIndex + 1 : 0;
  return LOCALES[nextIndex];
}

export function AdminAppearanceControls() {
  const admin = useTranslations("admin");
  const theme = useUIStore((state) => state.theme);
  const setTheme = useUIStore((state) => state.setTheme);
  const iconSet = useUIStore((state) => state.iconSet);
  const validIconType = getValidIconType(iconSet);

  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const params = useParams();

  const currentLocale = String(params.locale ?? DEFAULT_LOCALE);
  const nextLocale = useMemo(() => getNextLocale(currentLocale), [currentLocale]);

  const switchLocale = () => {
    const queryString = searchParams.toString();
    const href = queryString ? `${pathname}?${queryString}` : pathname;

    router.replace(href, {
      locale: nextLocale,
      scroll: false,
    });
  };

  return (
    <div className="flex items-center gap-2">
      <Button
        variant="outline"
        size="icon"
        onClick={setTheme}
        aria-label={admin("controls.toggleTheme")}
        title={admin("controls.toggleTheme")}
      >
        <ZIcon
          name={theme === "dark" ? "moon" : "sun"}
          type={validIconType}
          className="size-4"
        />
      </Button>

      <Button
        variant="outline"
        size="icon"
        onClick={switchLocale}
        aria-label={admin("controls.toggleLocale")}
        title={admin("controls.toggleLocale")}
      >
        <ZIcon name="language" type={validIconType} className="size-4" />
      </Button>
    </div>
  );
}
