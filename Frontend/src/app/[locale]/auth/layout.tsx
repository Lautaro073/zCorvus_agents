"use client"

import { ZCorvusLogo } from "@/components/common/ZCorvusLogo";
import { AppearanceSwitcher } from "@/components/controllers/AppearanceSwitcher";
import { AnimatedIcon } from "@/components/common/AnimatedIcon";
import { MinaIconName, minaIconNames } from "@zcorvus/z-icons/icons";
import { Link } from "@/i18n/navigation";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  const columns = [
    { icons: minaIconNames.slice(10, 70), direction: "up", duration: 30, className: "hidden min-[1500px]:flex" },
    { icons: minaIconNames.slice(70, 130), direction: "down", duration: 34, className: "hidden min-[1410px]:flex" },
    { icons: minaIconNames.slice(130, 190), direction: "up", duration: 38, className: "hidden min-[1320px]:flex" },
    { icons: minaIconNames.slice(190, 250), direction: "down", duration: 33, className: "hidden min-[1230px]:flex" },
    { icons: minaIconNames.slice(250, 310), direction: "up", duration: 36, className: "hidden min-[1140px]:flex" },
  ] as const;

  return (
    <div className="relative mx-auto flex h-full w-full max-w-[1680px] flex-col overflow-hidden py-2">
      <main className="relative grid h-full flex-1 gap-5 overflow-hidden min-[1140px]:pr-[5.75rem] min-[1230px]:pr-[11.25rem] min-[1320px]:pr-[16.75rem] min-[1410px]:pr-[22.25rem] min-[1500px]:pr-[27.75rem] lg:grid-cols-[minmax(320px,0.92fr)_minmax(0,1.08fr)]">
        <aside className="ui-surface-panel-muted relative flex flex-col justify-between overflow-hidden rounded-[2rem] p-5 sm:p-6 lg:p-8">
          <div className="flex items-start justify-between gap-4">
            <Link href="/" className="inline-flex items-center gap-3">
              <div className="grid size-12 place-items-center">
                <ZCorvusLogo className="size-8" />
              </div>
              <div className="space-y-0.5">
                <p className="font-display text-2xl leading-none tracking-tight text-foreground">ZCorvus</p>
              </div>
            </Link>

            <AppearanceSwitcher />
          </div>

          <div className="flex flex-1 items-center py-8 lg:py-10">
            <div className="space-y-3">
              <p className="font-display text-[clamp(3.2rem,8vw,6.4rem)] leading-[0.92] tracking-tight text-foreground">
                Z-ICONS
              </p>
            </div>
          </div>
        </aside>

        <section className="ui-surface-panel flex min-h-[36rem] items-center rounded-[2rem] p-5 sm:p-6 lg:p-8">
          <div className="mx-auto w-full max-w-[34rem]">
            {children}
          </div>
        </section>

        <aside className="pointer-events-none absolute inset-y-0 right-0 hidden min-[1140px]:flex min-[1140px]:items-stretch">
          <div className="flex h-full translate-x-0 items-stretch gap-3 2xl:gap-4">
            {columns.map((column, index) => (
              <div key={index} className={column.className}>
                <AnimatedIcon
                  icons={column.icons as MinaIconName[]}
                  orientation="vertical"
                  direction={column.direction}
                  duration={column.duration}
                  className="h-full min-h-0 w-[4.6rem]"
                  iconClassName="size-6.5 text-foreground/12"
                  gapClassName="gap-3.5"
                />
              </div>
            ))}
          </div>
        </aside>
      </main>
    </div>
  )
}
