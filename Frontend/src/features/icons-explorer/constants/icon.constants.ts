import { minaIconNames, neoIconNames, coreIconNames, AllIconNames } from '@zcorvus/z-icons/icons';
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

import { minaIcons, coreIcons, neoIcons } from '@zcorvus/z-icons/icons';

export const getIconContentData = async (): Promise<IconContent> => {
  // Las colecciones grandes se importan dinamicamente para no bloquear el bundle inicial
  const [{ faSolidIconNames, faRegularIconNames }] = await Promise.all([
    import('@/lib/fontawesome')
  ]);

  return {
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
  };
};

// Objeto asíncrono para obtener SVGs y evitar bundles masivos
export const getIconsSVG = async (type: IconSet) => {
  if (type === 'fa-solid') {
    const { faSolidIcons } = await import('@/lib/fontawesome/solid');
    return faSolidIcons;
  }
  if (type === 'fa-regular') {
    const { faRegularIcons } = await import('@/lib/fontawesome/regular');
    return faRegularIcons;
  }
  if (type === 'core') return coreIcons;
  if (type === 'neo') return neoIcons;
  if (type === 'mina') return minaIcons;
  return null;
};

export interface IconGroup {
  icons: Partial<AllIconNames>[] | undefined;
  name: IconSet;
  type: string[];
}

