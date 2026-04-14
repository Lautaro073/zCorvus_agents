"use server";

import { ZCorvusLogo } from "@/components/common/ZCorvusLogo";
import { AnimatedIcon } from "@/components/common/AnimatedIcon";
import { getTranslations } from "@/i18n/server";
import { TypesIcons } from "@/features/icons-explorer";
import { AppearanceSwitcher } from "@/components/controllers/AppearanceSwitcher";
import { Link } from "@/i18n/navigation";
import { UserProfileCard } from "@/features/user/components";
import { MinaIconName, minaIconNames } from "@zcorvus/z-icons/icons";

export default async function Home() {
  const home = await getTranslations("home");
  const common = await getTranslations("common");
  const rails = [
    {
      icons: minaIconNames.slice(8, 30),
      direction: "left" as const,
      duration: 30,
      className: "home-rail home-rail-1",
    },
    {
      icons: minaIconNames.slice(34, 56),
      direction: "right" as const,
      duration: 34,
      className: "home-rail home-rail-2",
    },
    {
      icons: minaIconNames.slice(60, 82),
      direction: "left" as const,
      duration: 38,
      className: "home-rail home-rail-3",
    },
    {
      icons: minaIconNames.slice(86, 108),
      direction: "right" as const,
      duration: 33,
      className: "home-rail home-rail-4",
    },
    {
      icons: minaIconNames.slice(112, 134),
      direction: "left" as const,
      duration: 36,
      className: "home-rail home-rail-5",
    },
  ];

  return (
    <div className="ui-page-shell h-full overflow-hidden py-2">
      <header className="flex flex-none flex-col gap-4 rounded-[1.75rem] p-3 sm:flex-row sm:items-center sm:justify-between sm:p-4">
        <div className="flex items-center gap-3">
          <div className="ui-surface-panel grid size-12 place-items-center rounded-[1.15rem] bg-card">
            <ZCorvusLogo className="size-8" />
          </div>
          <div className="space-y-0.5">
            <p className="font-display text-2xl leading-none tracking-tight text-foreground">ZCorvus</p>
          </div>
        </div>

        <div className="flex min-w-0 items-center justify-end gap-3">
          <AppearanceSwitcher />
          <UserProfileCard />
        </div>
      </header>

      <main className="grid min-h-0 flex-1 gap-5 overflow-hidden lg:grid-cols-[minmax(0,1.1fr)_minmax(340px,390px)]">
        <section className="ui-surface-panel-muted home-hero-panel relative flex min-h-0 flex-col justify-between overflow-hidden rounded-[2rem] p-6 sm:p-8 lg:p-10">
          <div className="home-hero-main flex min-h-0 flex-1 flex-col gap-6">
            <Link href="/icons" className="flex min-h-0 flex-1 flex-col" style={{ viewTransitionName: "title" }}>
              <div className="home-hero-copy space-y-2">
                <h1 className="ui-display-title home-hero-title max-w-4xl text-[clamp(2.7rem,6vw,5.3rem)] leading-[0.92]">
                  {home("tagline.line1")}
                </h1>
                <p className="home-hero-subtitle max-w-3xl text-[clamp(2rem,4.5vw,4rem)] leading-[0.96] tracking-tight text-foreground/82">
                  {home("tagline.line2")}
                </p>
              </div>

              <div className="home-hero-rails hidden min-h-0 flex-1 items-center justify-center py-10 lg:flex">
                <div className="flex w-full max-w-[min(100%,78rem)] flex-col justify-center gap-4">
                  {rails.map((rail, index) => (
                    <div key={index} className={rail.className}>
                      <AnimatedIcon
                        icons={rail.icons as MinaIconName[]}
                        orientation="horizontal"
                        direction={rail.direction}
                        duration={rail.duration}
                        className="h-10 w-full"
                        iconClassName="size-7 text-foreground/12"
                        gapClassName="gap-6"
                      />
                    </div>
                  ))}
                </div>
              </div>
            </Link>
          </div>

          <div className="home-hero-footer gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(220px,280px)] lg:items-end">
            <div className="space-y-4">
              <div className="flex items-end gap-4">
                <h2 className="home-hero-brand font-display text-[clamp(3rem,6vw,5.6rem)] leading-none tracking-tight text-foreground">
                  Z-ICONS
                </h2>
                <div className="ui-divider mb-1 hidden flex-1 lg:block" />
              </div>
              <div className="flex flex-wrap gap-2">
                <span className="rounded-full bg-emerald-500/12 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.22em] text-emerald-700 dark:text-emerald-300">
                  {common("icons.categories.local")}
                </span>
                <span className="rounded-full bg-sky-500/12 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.22em] text-sky-700 dark:text-sky-300">
                  {common("icons.categories.external")}
                </span>
                <span className="rounded-full bg-amber-500/12 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.22em] text-amber-700 dark:text-amber-300">
                  {common("icons.categories.premium")}
                </span>
              </div>
            </div>
          </div>
        </section>

        <section className="ui-surface-panel flex min-h-0 flex-col rounded-[2rem] p-4 sm:p-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="ui-section-header">{common("icons.sets")}</p>
            </div>
          </div>

          <div className="ui-divider my-4" />

          <div className="min-h-0 flex-1 overflow-auto">
            <TypesIcons />
          </div>
        </section>
      </main>
    </div>
  );
}
