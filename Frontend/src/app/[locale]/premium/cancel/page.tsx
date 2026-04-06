"use client";

import { useRouter } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { ZIcon } from "@zcorvus/z-icons/react";

export default function CancelPage() {
    const t = useTranslations("premium");
    const router = useRouter();

    return (
        <div className="relative isolate overflow-hidden px-4 py-8 sm:px-6 sm:py-10 lg:px-8">
            <div
                aria-hidden
                className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(circle_at_top_right,rgba(251,191,36,0.14),transparent_24%),radial-gradient(circle_at_bottom_left,rgba(244,114,182,0.08),transparent_22%)]"
            />

            <Button
                variant="ghost"
                size="icon"
                onClick={() => router.push("/premium")}
                className="group mb-8 rounded-full border border-border/70 bg-background/85"
                aria-label={t("cancel.backToPremium")}
            >
                <ZIcon
                    type="mina"
                    name="arrow-left"
                    className="size-6 group-hover:text-foreground transition-colors"
                />
            </Button>

            <div className="mx-auto max-w-3xl rounded-[2rem] border border-border/70 bg-card/90 px-6 py-10 text-center shadow-sm sm:px-10 sm:py-12">
                <div className="inline-flex size-20 items-center justify-center rounded-full bg-amber-100 text-amber-600 dark:bg-amber-900/25 dark:text-amber-300">
                    <ZIcon type="mina" name="x" className="size-10" />
                </div>

                <div className="mt-6 space-y-4">
                    <h1 className="font-kadwa text-4xl leading-[0.95] sm:text-5xl">
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
            </div>
        </div>
    );
}
