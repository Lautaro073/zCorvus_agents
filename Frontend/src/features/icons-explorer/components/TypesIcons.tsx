"use client"

import { cn } from "@/lib/utils"
import { IconCategories, IconCategoriesInfo, IconSets } from "../constants/icon.constants"
import { Link } from "@/i18n/navigation"
import { useUIStore } from "@/store"
import { IconSet } from "@/types/icons/icons.types"
import { useTranslations } from "next-intl"

const TypesIcons = () => {
  const iconSet = useUIStore((state) => state.iconSet)
  const common = useTranslations("common")

  const getCategoryForIcon = (icon: IconSet): string => {
    for (const [category, sets] of Object.entries(IconCategories)) {
      if (sets.includes(icon)) {
        return category
      }
    }
    return "local"
  }

  const isPremium = (icon: IconSet) => IconCategories.premium.includes(icon)

  const getCategoryTone = (icon: IconSet) => {
    const category = getCategoryForIcon(icon)

    if (category === "premium") return "bg-amber-500/12 text-amber-700 dark:text-amber-300"
    if (category === "external") return "bg-sky-500/12 text-sky-700 dark:text-sky-300"
    return "bg-emerald-500/12 text-emerald-700 dark:text-emerald-300"
  }

  return (
    <div className="grid w-full gap-2.5">
      {IconSets.map((icon) => {
        const currentIcon = IconCategoriesInfo[icon]
        const category = getCategoryForIcon(icon)
        const premium = isPremium(icon)

        return (
          <Link
            href={`/icons/${category}/${icon}`}
            key={icon}
            className={cn(
              "ui-panel-interactive rounded-[1.35rem] border border-surface-border bg-surface/84 p-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60 focus-visible:ring-offset-2 focus-visible:ring-offset-background",
              iconSet === icon && "border-foreground/14 bg-secondary/82 shadow-[var(--shadow-soft)]",
              premium && iconSet !== icon && "border-amber-500/24"
            )}
          >
            <div className="flex items-center justify-between gap-4">
              <div className="min-w-0 flex flex-1 items-baseline gap-2">
                <div className="flex min-w-0 flex-wrap items-baseline gap-2">
                  <p className="truncate text-base leading-none text-foreground sm:text-lg">{currentIcon.label}</p>
                  <p className="truncate text-[11px] uppercase tracking-[0.22em] text-muted-foreground">
                    {currentIcon.subLabel}
                  </p>
                </div>
              </div>

              <div className="flex shrink-0 items-center gap-2.5">
                <span
                  className={cn(
                    "rounded-full px-2.5 py-1 text-[11px] font-medium uppercase tracking-[0.22em]",
                    getCategoryTone(icon)
                  )}
                >
                {premium ? common("icons.pro") : common(`icons.categories.${category}`)}
                </span>
                <span className="text-lg text-foreground/65 transition-transform duration-200 ease-[var(--ease-out)]">
                  &gt;
                </span>
              </div>
            </div>
          </Link>
        )
      })}
    </div>
  )
}

export { TypesIcons }
