"use client"
import { cn } from "@/lib/utils"
import { IconCategories, IconCategoriesInfo, IconSets } from "../constants/icon.constants"
import { Link } from "@/i18n/navigation"
import { useLocale } from "next-intl";
import { useUIStore } from "@/store";
import { IconSet } from "@/types/icons/icons.types";

const TypesIcons = () => {

  const locale = useLocale()
  const iconSet = useUIStore((state) => state.iconSet);

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

  return (
    <div className="w-full sm:w-[260px] lg:w-[368px] text-muted-foreground grid grid-cols-2 sm:grid-cols-1 gap-x-4  sm:gap-x-0">
      {IconSets.map((icon) => {
        const currentIcon = IconCategoriesInfo[icon]
        const category = getCategoryForIcon(icon)
        const premium = isPremium(icon)

        return (
          <Link
            href={`/icons/${category}/${icon}`}
            key={icon}
            className={cn(
              "pl-2 transform duration-300 origin-left hover:scale-150 cursor-pointer hover:text-foreground transition-all flex items-center gap-1",
              iconSet === icon && "text-foreground",
              premium && "opacity-60"
            )}
          >
            {`${currentIcon.label}${currentIcon.subLabel}`}
            {premium && <span className="text-xs px-1.5 py-0.5 bg-amber-500/20 text-amber-600 dark:text-amber-400 rounded">PRO</span>}
          </Link>
        )
      })}
    </div>
  )
}

export { TypesIcons }
