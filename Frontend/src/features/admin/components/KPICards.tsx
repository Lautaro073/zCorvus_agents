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
    <div className="mt-6 grid min-h-[7rem] gap-3 md:grid-cols-3">
      {items.map((item) => (
        <article
          key={item.key}
          className="ui-surface-panel rounded-[1.5rem] bg-background/82 p-4 sm:p-5"
        >
          <p className="ui-section-header">{item.label}</p>
          <p className="mt-4 font-mono text-3xl font-semibold leading-none tracking-tight text-foreground">
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
