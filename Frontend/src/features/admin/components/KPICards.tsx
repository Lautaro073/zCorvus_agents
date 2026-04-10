"use client";

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
  return (
    <div className="mt-6 grid min-h-[7rem] gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {items.map((item) => (
        <article key={item.key} className="rounded-2xl border border-border/70 bg-background/80 p-4">
          <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">{item.label}</p>
          <p className="mt-3 text-3xl leading-none">
            {item.value === null
              ? "--"
              : item.isCurrency
                ? `$${(item.value / 100).toFixed(2)}`
                : item.value}
          </p>
        </article>
      ))}
    </div>
  );
}
