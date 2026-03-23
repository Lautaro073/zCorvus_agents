"use client"
import { ZIcon } from "@zcorvus/z-icons/react";
import { Button } from "@/components/ui/button";
import { Link, usePathname } from '@/i18n/navigation';
import { useLocale } from "@/hooks/useLocale";
import { useUIStore } from "@/store";
import dynamic from "next/dynamic";

export function AppearanceSwitcher() {
  const pathname = usePathname()
  const theme = useUIStore((s) => s.theme);
  const setTheme = useUIStore((s) => s.setTheme);
  const { nextLocale } = useLocale();

  const iconSet = useUIStore((s) => s.iconSet);
  const setIconSetDynamic = useUIStore((s) => s.setIconSetDynamic);

  // Solo usar iconSet si es válido para ZIcon (neo, core, mina)
  const validIconType = iconSet === 'neo' || iconSet === 'core' || iconSet === 'mina' ? iconSet : 'mina';

  return (
    <div className="flex gap-2 items-center">
      <Button variant="secondary" onClick={setTheme} aria-label="Toggle theme" className="px-0 py-0 w-9">
        <ThemeComponent theme={theme} />
      </Button>
      <Link href={pathname} locale={nextLocale}>
        <Button variant="secondary">
          <ZIcon name="language" type={validIconType} className="w-6 h-6 transition-all duration-300" />
        </Button>
      </Link>
      <Button variant="secondary" onClick={setIconSetDynamic} aria-label="Change icon set">
        <ZIcon name={"anchor"} type={validIconType} />
      </Button>
    </div>
  );
}

const ThemeComponent = dynamic<{ theme: string }>(() => Promise.resolve(ThemeButton), { ssr: false });

const ThemeButton = ({ theme }: { theme: string }) => {
  const iconSet = useUIStore((s) => s.iconSet);
  const validIconType = iconSet === 'neo' || iconSet === 'core' || iconSet === 'mina' ? iconSet : 'mina';

  return (
    <ZIcon name={theme === "dark" ? "moon" : "sun"} type={validIconType} className="w-6 h-6 transition-all duration-300" />
  )
}
