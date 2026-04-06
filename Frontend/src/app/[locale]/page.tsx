"use server";
import { ZCorvusLogo } from "@/components/common/ZCorvusLogo";
import { getTranslations } from "@/i18n/server";
import { TypesIcons } from "@/features/icons-explorer";
import { AppearanceSwitcher } from "@/components/controllers/AppearanceSwitcher";
import { Link } from "@/i18n/navigation";
import { UserProfileCard } from "@/features/user/components";

export default async function Home() {
  const home = await getTranslations("home");
  const common = await getTranslations("common");

  return (
    <div className="flex h-full flex-col gap-6 bg-background transition-all duration-300 sm:gap-8 lg:gap-8">
      <header className="flex h-auto flex-col justify-between gap-2 sm:flex-row sm:items-center">
        <div className="flex items-center gap-2">
          <ZCorvusLogo className="size-11" />
          <p className="font-secondary text-lg">ZCORVUS</p>
        </div>
        <div className="flex w-full min-w-0 items-center justify-end gap-2 sm:ml-auto sm:w-auto">
          <div className="hidden sm:block">
            <AppearanceSwitcher />
          </div>
          <UserProfileCard />
        </div>
      </header>
      <main className="flex flex-1 flex-col gap-5 lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(320px,370px)] lg:items-stretch lg:gap-5">
        <section className="flex flex-col justify-center gap-6 rounded-[2rem] border border-border/70 bg-secondary/35 p-5 sm:p-6 lg:p-7">
          <div className="space-y-5">
            <Link href="/icons" className="flex flex-col self-start" style={{ viewTransitionName: "title" }}>
              <h1 className="leading-[0.95]" style={{ fontSize: "clamp(2.1rem, 4.4vw, 4.3rem)" }}>{home("tagline.line1")}</h1>
              <p className="leading-[0.95] text-foreground/86" style={{ fontSize: "clamp(1.8rem, 4.1vw, 3.7rem)" }}>{home("tagline.line2")}</p>
            </Link>

            <div className="flex items-baseline gap-3">
              <h2 className="font-kadwa leading-none text-foreground" style={{ fontSize: "clamp(2.7rem, 6.2vw, 5.2rem)" }}>
                Z-ICONS
              </h2>
              <div className="h-px flex-1 bg-muted-foreground/25" />
            </div>
          </div>
        </section>

        <section className="flex flex-col gap-4 rounded-[2rem] border border-border/70 bg-background/80 p-4 shadow-sm sm:p-5 lg:gap-5">
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">{common("icons.sets")}</p>
            <div className="sm:hidden">
              <AppearanceSwitcher />
            </div>
          </div>

          <div className="h-px bg-muted-foreground/20" />

          <div className="flex-1">
            <TypesIcons />
          </div>
        </section>
      </main>
    </div>
  );
}
