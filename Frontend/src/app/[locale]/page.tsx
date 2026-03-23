"use server";
import { ZCorvusLogo } from "@/components/common/ZCorvusLogo";
import { Button } from "@/components/ui/button";
import { getTranslations, getLocale } from "next-intl/server";
import { TypesIcons } from "@/features/icons-explorer";
import { AppearanceSwitcher } from "@/components/controllers/AppearanceSwitcher";
import { Link } from "@/i18n/navigation";
import { serverEnv } from "@/config/env.server";
import { UserProfileCard } from "@/features/user/components";

export default async function Home() {
  const locale = await getLocale();
  const home = await getTranslations('home');

  // console.log("API_BASE_URL:", serverEnv.API_BASE_URL);

  return (
    <div className="bg-background h-full space-y-8 sm:space-y-12 md:space-y-16 lg:space-y-20 flex flex-col justify-center transition-all duration-300">
      <header className="flex flex-col sm:flex-row justify-between gap-2 h-auto">
        <div className="flex items-center gap-2">
          <ZCorvusLogo className="size-11" />
          <p className="font-secondary text-lg">ZCORVUS</p>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <UserProfileCard />
        </div>
      </header>
      <main className="flex flex-col gap-12 sm:gap-16 md:gap-20">
        <Link href="/icons" className="flex flex-col self-start sm:self-end" style={{ viewTransitionName: "title" }}>
          <h3 className="leading-tight" style={{ fontSize: 'clamp(2rem, 5vw, 4rem)' }}>{home("tagline.line1")}</h3>
          <p className="leading-2" style={{ fontSize: 'clamp(2rem, 5vw, 4rem)' }}>{home("tagline.line2")}</p>
        </Link>
        <section className="flex flex-col sm:flex-row gap-4 sm:gap-2">
          <div className="flex gap-2 items-center flex-1 h-6">
            <p className="text-muted-foreground">2026</p>
            <div className="h-[0.5px] w-full bg-muted-foreground/30" />
          </div>
          <TypesIcons />
        </section>
      </main>
      <footer className="mt-auto flex flex-col sm:flex-row justify-between items-end">
        <h1 className="font-kadwa" style={{ fontSize: 'clamp(3rem, 12vw, 8rem)' }}>Z-ICONS</h1>
        <AppearanceSwitcher />
      </footer>
    </div>
  );
}
