"use client";

import { use } from "react";
import { useLocale } from "next-intl";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group"

import { Link } from "@/i18n/navigation";
import { ZIcon } from "@zcorvus/z-icons/react";
import { IconGrid, IconGroup, IconCategories, IconCategoriesInfo, getIconContentData } from "@/features/icons-explorer";
import { Button } from "@/components/ui/button";
import { useUIStore } from "@/store";
import { IconCategory } from "@/types/icons/icons.types";

interface IconsTypeAllPageProps {
  params: Promise<{
    type: IconCategory;
  }>;
}

export default function IconsTypeAllPage({ params }: IconsTypeAllPageProps) {
  const locale = useLocale();
  const setLayerDynamic = useUIStore((e) => e.setLayerDynamic);

  const { type } = use(params);

  // Cargamos los datos estáticos pero con promesas para aislar chunks (como fa-solid names)
  const IconContentData = use(getIconContentData());

  const currentGroup = IconCategories[type];

  const data: IconGroup[] = currentGroup?.map((name) => {
    return ({
      name: name,
      icons: IconContentData[type][name],
      type: IconCategoriesInfo[name].type
    })
  })

  return (
    <>
      <Link
        href="/icons"
        className="absolute top-0 left-0 bg-background pr-4 pb-4 group flex items-center gap-3 hover:gap-5 transition-all duration-300"
      >
        <ZIcon
          type="mina"
          name="arrow-left"
          className="size-8 text-muted-foreground group-hover:text-foreground transition-colors duration-300"
        />
        <h1 className="leading-tight capitalize" style={{ fontSize: 'clamp(2rem, 5vw, 4rem)' }}>{type}</h1>
      </Link>
      <div className="flex flex-col gap-6 h-full ">
        <div className="flex items-center justify-between">
          <InputGroup className="max-w-[600px]">
            <InputGroupInput placeholder="Search..." />
            <InputGroupAddon>
              <ZIcon type="mina" name="search" />
            </InputGroupAddon>
          </InputGroup>

          <div className="flex gap-1 items-center">
            <Button variant="ghost" size="icon" aria-label="Layers" onClick={setLayerDynamic}  >
              <ZIcon type="mina" name="layers-three" />
            </Button>
          </div>
        </div>
        <IconGrid data={data} />
      </div>
    </>
  );
}