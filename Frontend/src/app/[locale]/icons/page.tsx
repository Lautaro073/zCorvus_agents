"use server";

import { IconCategories, IconCategoriesInfo } from "@/features/icons-explorer";
import { getTranslations } from "@/i18n/server";
import { Link } from "@/i18n/navigation";
import { ZIcon } from "@zcorvus/z-icons/react";

const categorySections = ["local", "external", "premium"] as const;

export default async function IconsLocalePage() {
  const home = await getTranslations("home");
  const common = await getTranslations("common");

  return (
    <div className="ui-page-shell py-2">
      <section className="ui-surface-panel-muted rounded-[2rem] p-5 sm:p-6 lg:p-8">
        <Link
          href="/"
          className="inline-flex items-start gap-4 rounded-[1.4rem] p-2 transition-[transform,background-color,color] duration-[180ms] ease-[var(--ease-out)] hover:bg-background/55 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          style={{ viewTransitionName: "title" }}
        >
          <span className="grid size-12 place-items-center">
            <ZIcon
              type="mina"
              name="arrow-left"
              className="size-5 text-muted-foreground"
            />
          </span>
          <div className="space-y-3">
            <div>
              <h1 className="ui-display-title text-[clamp(2.1rem,4.8vw,4rem)] leading-[0.94]">{home("tagline.line1")}</h1>
              <p className="text-[clamp(1.7rem,4vw,3.4rem)] leading-[0.96] tracking-tight text-foreground/82">
                {home("tagline.line2")}
              </p>
            </div>
            <p className="ui-section-header">{common("icons.library")}</p>
          </div>
        </Link>
      </section>

      <div className="grid gap-4 sm:gap-5 xl:gap-6">
        {categorySections.map((category, index) => {
          const title = home(`icons.${category}.title`);
          const description = home(`icons.${category}.description`);
          const tone =
            category === "premium"
              ? "bg-amber-500/12 text-amber-700 dark:text-amber-300"
              : category === "external"
                ? "bg-sky-500/12 text-sky-700 dark:text-sky-300"
                : "bg-emerald-500/12 text-emerald-700 dark:text-emerald-300";

          return (
            <section key={category} className="ui-surface-panel-muted rounded-[2rem] p-5 sm:p-6">
              <div className="flex flex-col gap-5 border-b border-border/60 pb-5 lg:flex-row lg:items-end lg:justify-between">
                <div className="space-y-3">
                  <span className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-medium uppercase tracking-[0.24em] ${tone}`}>
                    {common(`icons.categories.${category}`)}
                  </span>
                  <div className="space-y-2">
                    <Link
                      href={`/icons/${category}/all`}
                      style={index === 0 ? { viewTransitionName: "title-type" } : undefined}
                      className="inline-flex items-center gap-3 text-xl text-foreground transition-[transform,color] duration-[180ms] ease-[var(--ease-out)] hover:text-foreground/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60 focus-visible:ring-offset-2 focus-visible:ring-offset-background sm:text-2xl"
                    >
                      <span>{title}</span>
                    </Link>
                    <p className="max-w-2xl text-sm leading-6 text-muted-foreground">{description}</p>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  {IconCategories[category].map((set) => (
                    <span key={set} className="rounded-full border border-surface-border bg-background/76 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.2em] text-muted-foreground">
                      {set}
                    </span>
                  ))}
                </div>
              </div>

              <ul className="mt-5 grid gap-3 lg:grid-cols-2">
                {IconCategories[category].map((set) => {
                  const { label, subLabel } = IconCategoriesInfo[set];

                  return (
                    <li key={set} className="h-full">
                      <Link
                        href={`/icons/${category}/${set}`}
                        className="ui-panel-interactive group flex h-full min-h-[172px] flex-col justify-between rounded-[1.5rem] border border-surface-border bg-surface/84 px-4 py-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                      >
                        <div className="space-y-3">
                          <span className="inline-flex rounded-full bg-secondary px-2.5 py-1 text-[10px] font-medium uppercase tracking-[0.24em] text-muted-foreground">
                            {set}
                          </span>
                          <div className="space-y-2">
                            <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                              <span className="text-2xl leading-none text-foreground sm:text-[2rem]">{label}</span>
                              <span className="text-lg leading-none text-muted-foreground sm:text-xl">{subLabel}</span>
                            </div>
                            <p className="text-sm leading-6 text-muted-foreground">{description}</p>
                          </div>
                        </div>
                        <div className="mt-5 flex items-center justify-end border-t border-border/60 pt-3 text-xs uppercase tracking-[0.22em] text-foreground/78">
                          <span className="transition-transform duration-200 ease-[var(--ease-out)] group-hover:translate-x-1">&gt;</span>
                        </div>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </section>
          );
        })}
      </div>
    </div>
  );
}
