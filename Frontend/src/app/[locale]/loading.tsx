"use client";

import { useTranslations } from "next-intl";

export default function GlobalLoading() {
  const t = useTranslations("common");

  return (
    <div className="ui-page-shell items-center justify-center py-12">
      <div className="ui-surface-panel flex min-h-[18rem] w-full max-w-xl flex-col items-center justify-center rounded-[2rem] p-8 text-center">
        <div className="flex items-center justify-center gap-2">
          <div className="size-3 rounded-full bg-primary animate-bounce" style={{ animationDelay: "0ms" }} />
          <div className="size-3 rounded-full bg-primary animate-bounce" style={{ animationDelay: "120ms" }} />
          <div className="size-3 rounded-full bg-primary animate-bounce" style={{ animationDelay: "240ms" }} />
        </div>
        <p className="mt-5 text-sm uppercase tracking-[0.22em] text-muted-foreground">{t("states.loading")}</p>
      </div>
    </div>
  );
}
