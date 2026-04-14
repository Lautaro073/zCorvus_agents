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
      toast.error(
        error instanceof Error ? error.message : t("errors.checkoutFailed")
      );
    } finally {
      setLoadingPlan(null);
    }
  };

  return (
    <div className="ui-page-shell py-2">
      <section className="ui-surface-panel-muted rounded-[2rem] p-6 sm:p-8 lg:p-10">
        <div className="mt-2 max-w-4xl space-y-5">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push("/icons")}
            className="group h-auto justify-start rounded-none px-0 py-0 text-left transition-opacity duration-200 hover:bg-transparent hover:opacity-100"
            aria-label={t("backToIcons")}
          >
            <div className="flex items-start gap-4 sm:gap-5">
              <ZIcon
                type="mina"
                name="arrow-left"
                className="mt-3 size-5 shrink-0 text-muted-foreground transition-all duration-200 group-hover:translate-x-[-2px] group-hover:text-foreground"
              />
              <div className="space-y-4">
                <h1 className="ui-display-title text-foreground/92 transition-colors duration-200 group-hover:text-foreground text-4xl leading-[0.94] sm:text-5xl lg:text-6xl">
                  {t("title")}
                </h1>
                <p className="ui-section-header transition-colors duration-200 group-hover:text-foreground/82">
                  {t("backToIcons")}
                </p>
              </div>
            </div>
          </Button>
          <p className="max-w-2xl text-base leading-7 text-muted-foreground sm:text-lg">
            {t("subtitle")}
          </p>
        </div>
      </section>

      <section className="grid gap-5 xl:grid-cols-2">
        {plans.map((plan) => {
          const isLoading = loadingPlan === plan.id;

          return (
            <article
              key={plan.id}
              className={cn(
                "ui-surface-panel relative flex h-full flex-col rounded-[2rem] p-6 sm:p-8",
                plan.featured
                  ? "border-primary/30 bg-[color-mix(in_oklab,var(--primary)_12%,var(--card))]"
                  : "bg-card/90"
              )}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-3">
                  <span className="inline-flex rounded-full bg-background/82 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.28em] text-muted-foreground">
                    {plan.badge}
                  </span>
                  <div>
                    <h2 className="text-3xl tracking-tight text-foreground sm:text-4xl">
                      {t(`plans.${plan.id}.name`)}
                    </h2>
                    <p className="mt-3 max-w-md text-sm leading-6 text-muted-foreground">
                      {plan.summary}
                    </p>
                  </div>
                </div>
                <span
                  className={cn(
                    "inline-flex size-11 items-center justify-center rounded-full",
                    plan.featured
                      ? "bg-primary/12 text-primary"
                      : "bg-amber-500/12 text-amber-600 dark:text-amber-300"
                  )}
                >
                  <ZIcon type="mina" name="star" className="size-5" />
                </span>
              </div>

              <div className="mt-8 flex items-end gap-3 border-b border-border/60 pb-6">
                <span className="font-display text-5xl leading-none tracking-tight sm:text-6xl">{plan.price}</span>
                <span className="pb-1 text-sm uppercase tracking-[0.28em] text-muted-foreground">
                  {t("plans.billing")}
                </span>
              </div>

              <ul className="mt-6 flex flex-1 flex-col gap-3" role="list">
                {plan.features.map((feature) => (
                  <li key={feature} className="rounded-[1.35rem] border border-border/60 bg-background/58 p-4">
                    <div className="flex items-start gap-3">
                      <span className="mt-0.5 inline-flex size-6 shrink-0 items-center justify-center rounded-full bg-emerald-500/12 text-emerald-600 dark:text-emerald-300">
                        <ZIcon type="mina" name="check" className="size-4" />
                      </span>
                      <span className="text-sm leading-6 text-foreground/88">{feature}</span>
                    </div>
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
  );
}
