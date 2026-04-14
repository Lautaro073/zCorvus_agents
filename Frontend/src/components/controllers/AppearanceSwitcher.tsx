"use client"

import dynamic from "next/dynamic"
import { ZIcon } from "@zcorvus/z-icons/react"
import { Button } from "@/components/ui/button"
import { Link, usePathname } from "@/i18n/navigation"
import { useLocale } from "@/hooks/useLocale"
import { useUIStore } from "@/store"

export function AppearanceSwitcher() {
  const pathname = usePathname()
  const theme = useUIStore((s) => s.theme)
  const setTheme = useUIStore((s) => s.setTheme)
  const { nextLocale } = useLocale()
  const iconSet = useUIStore((s) => s.iconSet)
  const setIconSetDynamic = useUIStore((s) => s.setIconSetDynamic)
  const validIconType = iconSet === "neo" || iconSet === "core" || iconSet === "mina" ? iconSet : "mina"

  return (
    <div className="ui-glass inline-flex items-center gap-1 rounded-full p-1">
      <Button
        variant="ghost"
        size="icon-sm"
        onClick={setTheme}
        aria-label="Toggle theme"
        className="rounded-full"
      >
        <ThemeComponent theme={theme} />
      </Button>
      <Button asChild variant="ghost" size="icon-sm" className="rounded-full">
        <Link href={pathname} locale={nextLocale} aria-label="Change language">
          <ZIcon
            name="language"
            type={validIconType}
            className="size-4 transition-transform duration-200 ease-[var(--ease-out)]"
          />
        </Link>
      </Button>
      <Button
        variant="ghost"
        size="icon-sm"
        onClick={setIconSetDynamic}
        aria-label="Change icon set"
        className="rounded-full"
      >
        <ZIcon name="anchor" type={validIconType} className="size-4" />
      </Button>
    </div>
  )
}

const ThemeComponent = dynamic<{ theme: string }>(() => Promise.resolve(ThemeButton), { ssr: false })

const ThemeButton = ({ theme }: { theme: string }) => {
  const iconSet = useUIStore((s) => s.iconSet)
  const validIconType = iconSet === "neo" || iconSet === "core" || iconSet === "mina" ? iconSet : "mina"

  return (
    <ZIcon
      name={theme === "dark" ? "moon" : "sun"}
      type={validIconType}
      className="size-4 transition-transform duration-200 ease-[var(--ease-out)]"
    />
  )
}
