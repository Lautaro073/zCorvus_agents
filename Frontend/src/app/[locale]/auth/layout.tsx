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
    <div className="bg-background mx-auto h-screen flex flex-col overflow-hidden transition-all duration-300 relative">
      <Link href={"/"}>
        <div className="flex items-center gap-2 absolute">
          <ZCorvusLogo className="size-11" />
          <p className="font-secondary text-lg">ZCORVUS</p>
        </div>
      </Link>
      <main className="grid grid-cols-[2fr_1px_3fr] gap-4 h-full items-center w-full overflow-hidden">
        <div className="flex flex-col justify-between h-full gap-2">
          <div />
          <h1 className="font-kadwa text-7xl">Z-ICONS</h1>
          <AppearanceSwitcher />
        </div>
        <div className="bg-border w-px h-full transition-colors duration-300" />
        <div className="flex items-center gap-4 flex-1 h-full overflow-hidden">
          <div className="grid place-content-center flex-1">
            {children}
          </div>
          <div className="h-full flex gap-2 overflow-hidden">
            <div className="h-full flex gap-2 overflow-hidden">
              {columns.map((col, index) => (
                <AnimatedIcon
                  key={index}
                  icons={col.icons as MinaIconName[]}
                  direction={col.direction}
                  duration={col.duration}
                />
              ))}
            </div>

          </div>
        </div>
      </main>
    </div>
  )
}
// 112