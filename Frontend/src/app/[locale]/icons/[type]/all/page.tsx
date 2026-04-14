"use client";

import { use, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group";
import { Link } from "@/i18n/navigation";
import { ZIcon } from "@zcorvus/z-icons/react";
import { IconGrid, IconGroup, IconCategories, IconCategoriesInfo, getIconContentData } from "@/features/icons-explorer";
import { Button } from "@/components/ui/button";
import { useUIStore } from "@/store";
import { IconCategory } from "@/types/icons/icons.types";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";

interface IconsTypeAllPageProps {
  params: Promise<{
    type: IconCategory;
  }>;
}

export default function IconsTypeAllPage({ params }: IconsTypeAllPageProps) {
  const common = useTranslations("common");
  const setLayerDynamic = useUIStore((e) => e.setLayerDynamic);
  const { type } = use(params);
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search, 200);
  const iconContentPromise = useMemo(() => getIconContentData(), []);
  const iconContentData = use(iconContentPromise);

  const currentGroup = IconCategories[type];

  const data: IconGroup[] = useMemo(
    () =>
      currentGroup?.map((name) => ({
        name,
        icons: iconContentData[type][name],
        type: IconCategoriesInfo[name].type,
      })) ?? [],
    [currentGroup, iconContentData, type]
  );

  const normalizedSearch = debouncedSearch.trim().toLowerCase();

  const filteredData = useMemo(() => {
    if (!normalizedSearch) {
      return data;
    }

    return data
      .map((group) => ({
        ...group,
        icons: group.icons?.filter((iconName) =>
          String(iconName).toLowerCase().includes(normalizedSearch)
        ),
      }))
      .filter((group) => (group.icons?.length ?? 0) > 0);
  }, [data, normalizedSearch]);

  const tone =
    type === "premium"
      ? "bg-amber-500/12 text-amber-700 dark:text-amber-300"
      : type === "external"
        ? "bg-sky-500/12 text-sky-700 dark:text-sky-300"
        : "bg-emerald-500/12 text-emerald-700 dark:text-emerald-300";

  return (
    <div className="ui-page-shell py-2">
      <section className="ui-surface-panel-muted rounded-[2rem] px-4 py-5 sm:px-6 sm:py-6">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-3">
            <Link
              href="/icons"
              className="inline-flex items-center gap-3 rounded-[1.25rem] p-1.5 transition-[transform,background-color,color] duration-[180ms] ease-[var(--ease-out)] hover:bg-background/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            >
              <span className="grid size-12 place-items-center">
                <ZIcon type="mina" name="arrow-left" className="size-5 text-muted-foreground" />
              </span>
              <h1 className="ui-display-title text-[clamp(2rem,4.8vw,3.5rem)] leading-tight capitalize">{type}</h1>
            </Link>
            <span className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-medium uppercase tracking-[0.24em] ${tone}`}>
              {common("icons.category")}
            </span>
          </div>

          <div className="w-full max-w-[720px] space-y-3">
            <InputGroup>
              <InputGroupAddon>
                <ZIcon type="mina" name="search" />
              </InputGroupAddon>
              <InputGroupInput
                value={search}
                onChange={(event) => setSearch(event.currentTarget.value)}
                placeholder={common("actions.search")}
                autoComplete="off"
                autoCorrect="off"
                spellCheck={false}
              />
            </InputGroup>
            <div className="flex justify-end">
              <Button variant="outline" size="sm" aria-label="Layers" onClick={setLayerDynamic} className="rounded-full">
                <ZIcon type="mina" name="layers-three" />
                {common("actions.layers")}
              </Button>
            </div>
          </div>
        </div>
      </section>

      <section className="ui-surface-panel min-h-[36rem] rounded-[2rem] p-3 sm:p-4">
        <IconGrid data={filteredData} />
      </section>
    </div>
  );
}
