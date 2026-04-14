"use client";

import { useRouter } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { ZIcon } from "@zcorvus/z-icons/react";

export default function CancelPage() {
  const t = useTranslations("premium");
  const router = useRouter();

  return (
    <div className="ui-page-shell py-2">
      <Button
        variant="ghost"
        size="icon"
        onClick={() => router.push("/premium")}
        className="w-fit rounded-full"
        aria-label={t("cancel.backToPremium")}
      >
        <ZIcon type="mina" name="arrow-left" className="size-5 text-muted-foreground" />
      </Button>

      <section className="ui-surface-panel mx-auto w-full max-w-3xl rounded-[2rem] px-6 py-10 text-center sm:px-10 sm:py-12">
        <div className="inline-flex size-20 items-center justify-center rounded-full bg-amber-500/12 text-amber-600 dark:text-amber-300">
          <ZIcon type="mina" name="x" className="size-10" />
        </div>

        <div className="mt-6 space-y-4">
          <h1 className="ui-display-title text-4xl leading-[0.94] sm:text-5xl">
            {t("cancel.title")}
          </h1>
          <p className="text-base leading-7 text-muted-foreground sm:text-lg">
            {t("cancel.subtitle")}
          </p>
        </div>

        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
          <Button onClick={() => router.push("/premium")} size="lg" className="rounded-full">
            {t("cancel.tryAgain")}
          </Button>
          <Button
            onClick={() => router.push("/icons")}
            variant="outline"
            size="lg"
            className="rounded-full"
          >
            {t("cancel.backToIcons")}
          </Button>
        </div>
      </section>
    </div>
  );
}
