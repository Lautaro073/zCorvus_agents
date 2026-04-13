"use client";

import { useMemo } from "react";

interface KPIItem {
  key: string;
  label: string;
  value: number | null;
  isCurrency?: boolean;
}

interface KPICardsProps {
  items: KPIItem[];
}

export function KPICards({ items }: KPICardsProps) {
  const locale = useMemo(() => {
    try {
      return Intl.DateTimeFormat().resolvedOptions().locale;
    } catch {
      return "en-US";
    }
  }, []);

  const countFormatter = useMemo(() => new Intl.NumberFormat(locale), [locale]);
  const currencyFormatter = useMemo(
    () =>
      new Intl.NumberFormat(locale, {
        style: "currency",
        currency: "USD",
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }),
    [locale]
  );

  return (
    <div className="mt-6 grid min-h-[7rem] gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {items.map((item) => (
        <article
          key={item.key}
          className="rounded-2xl border border-border/70 bg-background/85 p-4 transition-transform duration-200 hover:-translate-y-[1px]"
        >
          <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">{item.label}</p>
          <p className="mt-3 text-3xl font-semibold leading-none tracking-tight">
            {item.value === null
              ? "--"
              : item.isCurrency
                ? currencyFormatter.format(item.value / 100)
                : countFormatter.format(item.value)}
          </p>
        </article>
      ))}
    </div>
  );
}
