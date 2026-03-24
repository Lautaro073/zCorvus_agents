"use client";

import { useTranslations } from "next-intl";

export default function GlobalLoading() {
  const t = useTranslations("common");

  return (
    <div className="flex flex-col items-center justify-center min-h-[50vh] px-4">
      <div className="flex items-center justify-center gap-2 mb-4">
        <div className="w-3 h-3 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
        <div className="w-3 h-3 bg-primary rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
        <div className="w-3 h-3 bg-primary rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
      </div>
      <p className="text-muted-foreground animate-pulse">
        {t("states.loading") || "Cargando..."}
      </p>
    </div>
  );
}
