"use server";
import { IconCategories, IconCategoriesInfo } from "@/features/icons-explorer";
import { getTranslations } from "@/i18n/server";
import { Link } from "@/i18n/navigation";
import { ZIcon } from "@zcorvus/z-icons/react";

const categorySections = ["local", "external", "premium"] as const;

export default async function IconsLocalePage() {
  const home = await getTranslations('home');
  const common = await getTranslations('common');

  return (
    <div className="relative flex flex-col gap-7 py-2 sm:gap-9">
      <Link
        href="/"
        className="group flex items-start gap-4 self-start rounded-2xl px-2 py-1.5 transition-all duration-300 hover:bg-secondary/35 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        style={{ viewTransitionName: "title" }}
      >
        <ZIcon
          type="mina"
          name="arrow-left"
          className="mt-1.5 size-8 text-muted-foreground transition-colors duration-300 group-hover:text-foreground sm:mt-2 sm:size-10"
        />
        <div className="space-y-2">
          <div>
            <h1 className="leading-[0.95]" style={{ fontSize: "clamp(1.9rem, 4.4vw, 3.6rem)" }}>{home("tagline.line1")}</h1>
            <p className="leading-[0.95] text-foreground/88" style={{ fontSize: "clamp(1.8rem, 4.1vw, 3.3rem)" }}>{home("tagline.line2")}</p>
          </div>
          <p className="ui-section-header">{common("icons.library")}</p>
        </div>
      </Link>

      <div className="grid gap-4 sm:gap-5 xl:gap-6">
        {categorySections.map((category, index) => {
          const title = home(`icons.${category}.title`);
          const description = home(`icons.${category}.description`);
          const tone =
            category === "premium"
              ? "bg-amber-500/10 text-amber-700 dark:text-amber-300"
              : category === "external"
                ? "bg-sky-500/10 text-sky-700 dark:text-sky-300"
                : "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300";

          return (
            <section key={category} className="rounded-[2rem] border border-border/70 bg-secondary/35 p-4 backdrop-blur-[1px] sm:p-5">
              <div className="flex flex-col gap-4 border-b border-border/60 pb-4 lg:flex-row lg:items-center lg:justify-between">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <span className={`rounded-full px-2.5 py-1 text-[11px] uppercase tracking-[0.24em] ${tone}`}>
                      {common(`icons.categories.${category}`)}
                    </span>
                  </div>
                  <Link
                    href={`/icons/${category}/all`}
                    style={index === 0 ? { viewTransitionName: "title-type" } : undefined}
                    className="inline-flex items-center text-xl text-foreground transition-colors duration-300 hover:text-foreground/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60 focus-visible:ring-offset-2 focus-visible:ring-offset-background sm:text-2xl"
                  >
                    <span>{title}</span>
                  </Link>
                  <p className="max-w-2xl text-sm leading-6 text-muted-foreground">{description}</p>
                </div>
                <div className="flex flex-wrap gap-1.5 sm:gap-2">
                  {IconCategories[category].map((set) => (
                    <span key={set} className="rounded-full border border-border/70 bg-background/80 px-2.5 py-1 text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
                      {set}
                    </span>
                  ))}
                </div>
              </div>

              <ul className="mt-4 grid gap-2.5 lg:grid-cols-2">
                {IconCategories[category].map((set) => {
                  const { label, subLabel } = IconCategoriesInfo[set];

                  return (
                    <li key={set} className="h-full">
                      <Link href={`/icons/${category}/${set}`} className="group flex h-full min-h-[156px] flex-col justify-between rounded-[1.35rem] border border-border/70 bg-background/75 px-4 py-4 transition-all duration-300 hover:-translate-y-0.5 hover:border-foreground/20 hover:bg-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60 focus-visible:ring-offset-2 focus-visible:ring-offset-background">
                        <div className="space-y-3">
                          <span className="inline-flex rounded-full bg-secondary px-2.5 py-1 text-[10px] uppercase tracking-[0.24em] text-muted-foreground">
                            {set}
                          </span>
                          <div className="space-y-1.5">
                            <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                              <span className="text-2xl leading-none text-foreground sm:text-[2rem]">{label}</span>
                              <span className="text-lg leading-none text-muted-foreground sm:text-xl">{subLabel}</span>
                            </div>
                            <p className="text-sm leading-5 text-muted-foreground">{description}</p>
                          </div>
                        </div>
                        <div className="mt-4 flex items-center justify-end border-t border-border/60 pt-3 text-xs uppercase tracking-[0.22em] text-foreground/80">
                          <span className="transition-transform duration-300 group-hover:translate-x-1">&gt;</span>
                        </div>
                      </Link>
                    </li>
                  )
                })}
              </ul>
            </section>
          )
        })}
      </div>
    </div>
  );
}
