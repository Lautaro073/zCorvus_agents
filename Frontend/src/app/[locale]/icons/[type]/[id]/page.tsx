"use client";

import { use } from "react";
import { useTranslations } from "next-intl";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group"

import { Link } from "@/i18n/navigation";
import { ZIcon } from "@zcorvus/z-icons/react";
import { IconGrid, IconCategoriesInfo, getIconContentData, IconGroup } from "@/features/icons-explorer";
import { Button } from "@/components/ui/button";
import { useUIStore } from "@/store";
import { IconCategory, IconSet } from "@/types/icons/icons.types";
import { PremiumGuard } from "@/components/guards/PremiumGuard";

interface IconsTypeIdPageProps {
  params: Promise<{ type: IconCategory; id: IconSet }>
}

export default function IconsTypeIdPage({ params }: IconsTypeIdPageProps) {
  const common = useTranslations('common');
  const setLayerDynamic = useUIStore((e) => e.setLayerDynamic);

  const { type, id } = use(params);
  const IconContentData = use(getIconContentData());

  const data: IconGroup = {
    name: id,
    icons: IconContentData[type][id],
    type: IconCategoriesInfo[id].type
  }

  const tone =
    type === "premium"
      ? "bg-amber-500/10 text-amber-700 dark:text-amber-300"
      : type === "external"
        ? "bg-sky-500/10 text-sky-700 dark:text-sky-300"
        : "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300";

  // Determinar si esta ruta requiere premium
  const isPremiumContent = type === 'premium' || id === 'fa-solid' || id === 'fa-regular';

  const content = (
    <div className="flex h-full min-h-0 flex-col gap-4">
      <section className="rounded-[1.5rem] border border-border/70 bg-secondary/35 px-4 py-4 sm:px-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-2">
            <Link
              href="/icons"
              className="group inline-flex items-center gap-3 rounded-xl px-1 py-1.5 transition-all duration-300 hover:bg-background/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            >
              <ZIcon
                type="mina"
                name="arrow-left"
                className="size-7 text-muted-foreground transition-colors duration-300 group-hover:text-foreground"
              />
              <h1 className="leading-tight capitalize" style={{ fontSize: "clamp(1.6rem, 3.8vw, 3rem)" }}>{id}</h1>
            </Link>
            <span className={`inline-flex rounded-full px-2.5 py-1 text-[11px] uppercase tracking-[0.24em] ${tone}`}>
              {common('icons.set')}
            </span>
          </div>

          <div className="w-full max-w-[680px] space-y-3 lg:space-y-2">
            <InputGroup>
              <InputGroupInput placeholder={common('actions.search')} />
              <InputGroupAddon>
                <ZIcon type="mina" name="search" />
              </InputGroupAddon>
            </InputGroup>
            <div className="flex justify-end">
              <Button variant="outline" size="sm" aria-label="Layers" onClick={setLayerDynamic}>
                <ZIcon type="mina" name="layers-three" />
                {common('actions.layers')}
              </Button>
            </div>
          </div>
        </div>
      </section>

      <section className="flex min-h-0 flex-1 rounded-[1.5rem] border border-border/70 bg-background/75 p-2 sm:p-3">
        <IconGrid data={[data]} />
      </section>
    </div>
  );

  // Si es contenido premium, protegerlo con el guard
  if (isPremiumContent) {
    return <PremiumGuard>{content}</PremiumGuard>;
  }

  // Si es contenido gratuito, mostrarlo directamente
  return content;
}
