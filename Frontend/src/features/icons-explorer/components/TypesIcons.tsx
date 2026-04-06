"use client"
import { cn } from "@/lib/utils"
import { IconCategories, IconCategoriesInfo, IconSets } from "../constants/icon.constants"
import { Link } from "@/i18n/navigation"
import { useUIStore } from "@/store";
import { IconSet } from "@/types/icons/icons.types";
import { useTranslations } from "next-intl";

const TypesIcons = () => {
  const iconSet = useUIStore((state) => state.iconSet);
  const common = useTranslations("common");

  // Función para obtener la categoría correcta de cada icono
  const getCategoryForIcon = (icon: IconSet): string => {
    for (const [category, sets] of Object.entries(IconCategories)) {
      if (sets.includes(icon)) {
        return category;
      }
    }
    return 'local'; // fallback
  }

  const isPremium = (icon: IconSet) => {
    return IconCategories.premium.includes(icon);
  }

  const getCategoryTone = (icon: IconSet) => {
    const category = getCategoryForIcon(icon);

    if (category === "premium") return "bg-amber-500/10 text-amber-700 dark:text-amber-300";
    if (category === "external") return "bg-sky-500/10 text-sky-700 dark:text-sky-300";
    return "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300";
  }

  return (
    <div className="grid w-full gap-2.5 text-muted-foreground sm:w-[280px] lg:w-full lg:max-w-none">
      {IconSets.map((icon) => {
        const currentIcon = IconCategoriesInfo[icon]
        const category = getCategoryForIcon(icon)
        const premium = isPremium(icon)

        return (
          <Link
            href={`/icons/${category}/${icon}`}
            key={icon}
              className={cn(
              "group rounded-[1.25rem] border px-3.5 py-2.5 transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60 focus-visible:ring-offset-2 focus-visible:ring-offset-background sm:px-4 sm:py-3",
              "border-border/70 bg-background/70 hover:-translate-y-0.5 hover:border-foreground/20 hover:bg-accent/40 hover:text-foreground",
              iconSet === icon && "border-foreground/20 bg-secondary text-foreground shadow-sm",
              premium && iconSet !== icon && "border-amber-500/20"
            )}
          >
            <div className="flex items-center justify-between gap-2.5 sm:gap-3">
              <div className="min-w-0 space-y-0.5 sm:space-y-1">
                <div className="flex min-w-0 items-baseline gap-2">
                  <p className="truncate text-base leading-none text-foreground sm:text-lg">{currentIcon.label}</p>
                  <p className="truncate text-[11px] uppercase tracking-[0.22em] text-muted-foreground">{currentIcon.subLabel}</p>
                </div>
                <p className="text-xs capitalize text-muted-foreground">{icon.replace("fa-", "")}</p>
              </div>
              <div className="flex items-center gap-1.5 pl-1 sm:gap-2 sm:pl-2">
                <span className={cn("rounded-full px-2.5 py-1 text-[11px] uppercase tracking-[0.24em]", getCategoryTone(icon))}>
                  {premium ? common("icons.pro") : common(`icons.categories.${category}`)}
                </span>
                <span className="text-foreground/70 transition-transform duration-300 group-hover:translate-x-1">&gt;</span>
              </div>
            </div>
          </Link>
        )
      })}
    </div>
  )
}

export { TypesIcons }
