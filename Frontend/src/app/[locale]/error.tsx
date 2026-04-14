"use client";

import { useEffect } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { ZIcon } from "@zcorvus/z-icons/react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const t = useTranslations("common");

  useEffect(() => {
    console.error("Global Error Boundary caught an error:", error);
  }, [error]);

  return (
    <div className="ui-page-shell items-center justify-center py-12">
      <div className="ui-surface-panel flex min-h-[20rem] w-full max-w-2xl flex-col items-center justify-center rounded-[2rem] p-8 text-center">
        <div className="mb-6 inline-flex size-18 items-center justify-center rounded-full bg-destructive/10 text-destructive">
          <ZIcon type="mina" name="danger-triangle" className="size-8" />
        </div>
        <h2 className="ui-display-title text-3xl leading-none sm:text-4xl">
          {t("errors.somethingWentWrong")}
        </h2>
        <p className="mt-4 max-w-xl text-sm leading-6 text-muted-foreground sm:text-base sm:leading-7">
          {t("errors.unexpectedError")}
        </p>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <Button onClick={() => reset()} variant="default" className="rounded-full">
            {t("actions.tryAgain")}
          </Button>
          <Button onClick={() => (window.location.href = "/")} variant="outline" className="rounded-full">
            {t("actions.goHome")}
          </Button>
        </div>
      </div>
    </div>
  );
}
