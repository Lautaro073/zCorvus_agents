import { minaIconNames, neoIconNames, coreIconNames, minaIcons, coreIcons, neoIcons, AllIconNames } from '@zcorvus/z-icons/icons';
import { faSolidIconNames, faRegularIconNames, faSolidIcons, faRegularIcons } from '@/lib/fontawesome';
import { IconCategory, IconContent, IconSet, IconView, Layer } from '@/types/icons/icons.types';

export const IconSets: IconSet[] = ["neo", "core", "mina", "fa-solid", "fa-regular"];

export const IconCategories: Record<IconCategory, IconSet[]> = {
  local: ["core", "neo"],
  external: ["mina"],
  premium: ["fa-solid", "fa-regular"],
} as const;

export const IconCategoriesInfo: Record<IconSet, IconView> = {
  core: {
    label: "Core",
    subLabel: "Solid",
    type: ["light"],
  },
  neo: {
    label: "Neo",
    subLabel: "Light",
    type: ["light"],
  },
  mina: {
    label: "Mina",
    subLabel: "UI",
    type: ["light", "solid"],
  },
  "fa-solid": {
    label: "Font Awesome",
    subLabel: "Solid",
    type: ["solid"],
  },
  "fa-regular": {
    label: "Font Awesome",
    subLabel: "Regular",
    type: ["regular"],
  },
};

export const LayerModes: Record<Uppercase<Layer>, Layer> = {
  COMPACT: "compact",
  EXPANDED: "expanded",
};

export const IconContentData: IconContent = {
  local: {
    core: coreIconNames as Partial<AllIconNames>[],
    neo: neoIconNames as Partial<AllIconNames>[],
  },
  external: {
    mina: minaIconNames as Partial<AllIconNames>[],
  },
  premium: {
    "fa-solid": faSolidIconNames as any[],
    "fa-regular": faRegularIconNames as any[],
  },
} as const satisfies IconContent;

export const IconsSVG = {
  core: coreIcons,
  neo: neoIcons,
  mina: minaIcons,
  "fa-solid": faSolidIcons,
  "fa-regular": faRegularIcons,
};

export interface IconGroup {
  icons: Partial<AllIconNames>[] | undefined;
  name: IconSet;
  type: string[];
}
