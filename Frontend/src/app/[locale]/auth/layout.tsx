"use client"
import { ZCorvusLogo } from "@/components/common/ZCorvusLogo";
import { AppearanceSwitcher } from "@/components/controllers/AppearanceSwitcher";
import { AnimatedIcon } from "@/components/common/AnimatedIcon";
import { MinaIconName, minaIconNames } from '@zcorvus/z-icons/icons';
import { Link } from "@/i18n/navigation";

export default function AuthLayout({ children }: { children: React.ReactNode }) {

  const columns = [
    { icons: minaIconNames.slice(50, 120), direction: "up", duration: 100 },
    { icons: minaIconNames.slice(120, 190), direction: "down", duration: 120 },
    { icons: minaIconNames.slice(190, 260), direction: "up", duration: 110 },
    { icons: minaIconNames.slice(260, 330), direction: "down", duration: 130 },
    { icons: minaIconNames.slice(330, 400), direction: "up", duration: 115 },
  ] as const;

  return (
    <div className="bg-background mx-auto flex h-full min-h-0 flex-col overflow-hidden transition-all duration-300 relative lg:h-[calc(100vh-6rem)] lg:max-h-[calc(100vh-6rem)]">
      <Link href={"/"} className="hidden lg:block absolute">
        <div className="flex items-center gap-2">
          <ZCorvusLogo className="size-11" />
          <p className="font-secondary text-lg">ZCORVUS</p>
        </div>
      </Link>

      <main className="flex min-h-0 flex-1 flex-col gap-6 overflow-hidden lg:grid lg:h-full lg:grid-cols-[2fr_1px_3fr] lg:gap-4 lg:items-center lg:w-full lg:max-h-[calc(100vh-6rem)]">
        <aside className="flex flex-col gap-6 rounded-[2rem] border border-border/70 bg-secondary/35 px-5 py-5 sm:px-6 sm:py-6 lg:h-full lg:min-h-0 lg:gap-2 lg:justify-between lg:rounded-none lg:border-0 lg:bg-transparent lg:px-0 lg:py-0">
          <div className="flex items-start justify-between gap-4 lg:hidden">
            <Link href={"/"} className="flex items-center gap-2">
              <ZCorvusLogo className="size-11" />
              <p className="font-secondary text-lg">ZCORVUS</p>
            </Link>

            <AppearanceSwitcher />
          </div>

          <div className="hidden lg:block" />

          <p className="font-kadwa leading-none text-foreground" style={{ fontSize: 'clamp(3rem, 9vw, 7rem)' }}>
            Z-ICONS
          </p>

          <div className="hidden lg:flex">
            <AppearanceSwitcher />
          </div>
        </aside>

        <div className="hidden bg-border w-px h-full transition-colors duration-300 lg:block" />

        <section className="flex min-h-0 flex-1 items-center gap-4 overflow-hidden lg:h-full">
          <div className="grid min-h-0 flex-1 place-content-center px-1 lg:px-0">
            <div className="w-full max-w-md lg:max-w-none">
              {children}
            </div>
          </div>
          <div className="hidden h-full min-h-0 gap-2 overflow-hidden lg:flex">
            {columns.map((col, index) => (
              <AnimatedIcon
                key={index}
                icons={col.icons as MinaIconName[]}
                direction={col.direction}
                duration={col.duration}
              />
            ))}
          </div>
        </section>
      </main>
    </div>
  )
}
