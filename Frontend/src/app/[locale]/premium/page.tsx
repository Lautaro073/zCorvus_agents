"use client";

import { useState } from "react";
import { useRouter } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { ZIcon } from "@zcorvus/z-icons/react";
import { toast } from "sonner";
import { createCheckoutSession } from "@/lib/api/backend";
import { useAuth } from "@/contexts/AuthContext";
import { useLocale } from "@/hooks/useLocale";
import { cn } from "@/lib/utils";

type PlanType = "pro" | "enterprise";

export default function PremiumPage() {
    const t = useTranslations("premium");
    const router = useRouter();
    const { currentLocale } = useLocale();
    const { isAuthenticated } = useAuth();
    const [loadingPlan, setLoadingPlan] = useState<PlanType | null>(null);

    const heroHighlights = [
        t("hero.highlights.instant"),
        t("hero.highlights.token"),
        t("hero.highlights.support"),
    ];

    const plans: Array<{
        id: PlanType;
        price: string;
        badge: string;
        summary: string;
        features: string[];
        featured: boolean;
    }> = [
            {
                id: "pro",
                price: "$29.99",
                badge: t("plans.pro.badge"),
                summary: t("plans.pro.summary"),
                features: [
                    t("plans.pro.features.icons"),
                    t("plans.pro.features.npm"),
                    t("plans.pro.features.updates"),
                    t("plans.pro.features.support"),
                ],
                featured: false,
            },
            {
                id: "enterprise",
                price: "$49.99",
                badge: t("plans.enterprise.badge"),
                summary: t("plans.enterprise.summary"),
                features: [
                    t("plans.enterprise.features.everything"),
                    t("plans.enterprise.features.priority"),
                    t("plans.enterprise.features.custom"),
                    t("plans.enterprise.features.team"),
                ],
                featured: true,
            },
        ];

    const handleCheckout = async (planType: PlanType) => {
        setLoadingPlan(planType);

        try {
            if (!isAuthenticated) {
                toast.error(t("errors.notAuthenticated"));
                router.push("/auth/login");
                return;
            }

            const data = await createCheckoutSession(planType, currentLocale);

            if (data.url) {
                window.location.href = data.url;
            }
        } catch (error) {
            console.error("Error:", error);
            toast.error(
                error instanceof Error
                    ? error.message
                    : t("errors.checkoutFailed")
            );
        } finally {
            setLoadingPlan(null);
        }
    };

    return (
        <div className="relative isolate px-2 py-4 sm:px-4 sm:py-6 lg:px-6">
            <div
                aria-hidden
                className="pointer-events-none fixed inset-0 -z-10 bg-[radial-gradient(circle_at_top_left,rgba(212,175,55,0.18),transparent_32%),radial-gradient(circle_at_bottom_right,rgba(120,119,198,0.12),transparent_28%)]"
            />
            <div className="mx-auto flex max-w-6xl flex-col gap-8">


                    <section className="grid gap-6">
                        <div className="overflow-hidden rounded-[2rem] border border-border/70 bg-gradient-to-br from-secondary via-background to-background p-6 shadow-sm sm:p-8 lg:p-10">

                            <div className="flex items-center gap-1.5 sm:gap-3">
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => router.push("/icons")}
                                    className="group -ml-2 size-8 shrink-0 rounded-full hover:bg-background/60"
                                    aria-label={t("backToIcons")}
                                >
                                    <ZIcon
                                        type="mina"
                                        name="arrow-left"
                                        className="size-5 text-muted-foreground group-hover:text-foreground transition-colors"
                                    />
                                </Button>
                                <p className="text-xs uppercase tracking-[0.34em] text-muted-foreground pt-0.5">
                                    {t("hero.eyebrow")}
                                </p>
                            </div>

                            <div className="mt-5 max-w-3xl space-y-4">
                                <h1 className="font-kadwa leading-[0.95] text-4xl sm:text-5xl lg:text-6xl">
                                    {t("title")}
                                </h1>
                                <p className="max-w-2xl text-base leading-7 text-muted-foreground sm:text-lg">
                                    {t("subtitle")}
                                </p>
                            </div>

                            <div className="mt-8 grid gap-3 sm:grid-cols-3">
                                {heroHighlights.map((item, index) => (
                                    <div
                                        key={item}
                                        className="rounded-[1.5rem] border border-border/60 bg-background/75 p-4"
                                    >
                                        <p className="text-[11px] uppercase tracking-[0.3em] text-muted-foreground">
                                            {String(index + 1).padStart(2, "0")}
                                        </p>
                                        <p className="mt-3 text-sm leading-6 text-foreground/88">{item}</p>
                                    </div>
                                ))}
                            </div>
                        </div>

                    </section>

                    <section className="grid gap-6 lg:grid-cols-2">
                        {plans.map((plan) => {
                            const isLoading = loadingPlan === plan.id;

                            return (
                                <article
                                    key={plan.id}
                                    className={cn(
                                        "relative flex h-full flex-col overflow-hidden rounded-[2rem] border p-6 shadow-sm sm:p-8",
                                        plan.featured
                                            ? "border-primary/30 bg-gradient-to-br from-primary/[0.14] via-card to-card"
                                            : "border-border/70 bg-card/90"
                                    )}
                                >
                                    <div className="flex items-start justify-between gap-4">
                                        <div className="space-y-3">
                                            <span className="inline-flex rounded-full bg-background/80 px-3 py-1 text-[11px] uppercase tracking-[0.28em] text-muted-foreground">
                                                {plan.badge}
                                            </span>
                                            <div>
                                                <h2 className="text-3xl text-foreground sm:text-4xl">
                                                    {t(`plans.${plan.id}.name`)}
                                                </h2>
                                                <p className="mt-2 max-w-md text-sm leading-6 text-muted-foreground">
                                                    {plan.summary}
                                                </p>
                                            </div>
                                        </div>
                                        <ZIcon
                                            type="mina"
                                            name="star"
                                            className={cn(
                                                "size-8 shrink-0",
                                                plan.featured ? "text-primary" : "text-amber-500"
                                            )}
                                        />
                                    </div>

                                    <div className="mt-8 flex items-end gap-2 border-b border-border/60 pb-6">
                                        <span className="font-kadwa text-5xl leading-none sm:text-6xl">{plan.price}</span>
                                        <span className="pb-1 text-sm uppercase tracking-[0.28em] text-muted-foreground">
                                            {t("plans.billing")}
                                        </span>
                                    </div>

                                    <ul className="mt-6 flex flex-1 flex-col gap-3" role="list">
                                        {plan.features.map((feature) => (
                                            <li key={feature} className="flex items-start gap-3 rounded-2xl bg-background/65 p-3">
                                                <span className="mt-0.5 inline-flex size-6 shrink-0 items-center justify-center rounded-full bg-emerald-500/12 text-emerald-600 dark:text-emerald-300">
                                                    <ZIcon type="mina" name="check" className="size-4" />
                                                </span>
                                                <span className="text-sm leading-6 text-foreground/88">{feature}</span>
                                            </li>
                                        ))}
                                    </ul>

                                    <div className="mt-8 space-y-3">
                                        <Button
                                            onClick={() => handleCheckout(plan.id)}
                                            disabled={loadingPlan !== null}
                                            className="w-full rounded-full"
                                            size="lg"
                                            variant={plan.featured ? "default" : "secondary"}
                                        >
                                            {isLoading ? t("processing") : t(`plans.${plan.id}.cta`)}
                                        </Button>
                                        <p className="text-center text-xs leading-5 text-muted-foreground">
                                            {t("guarantee")}
                                        </p>
                                    </div>
                                </article>
                            );
                        })}
                    </section>
                </div>
            </div>
    );
}
