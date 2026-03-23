import { CoreIconName, NeoIconName, MinaIconName, AllIconNames } from '@zcorvus/z-icons/icons';
import { FontAwesomeIconName } from '@/lib/fontawesome';

export type IconSet = "neo" | "core" | "mina" | "fa-solid" | "fa-regular";
export type IconCategory = "local" | "external" | "premium";
export type Layer = "compact" | "expanded";
export type Theme = "dark" | "light";

export type IconTypeInfo =
  | { type: 'core', name: CoreIconName, variant: string }
  | { type: 'neo', name: NeoIconName, variant: string }
  | { type: 'mina', name: MinaIconName, variant: string }
  | { type: 'fa-solid', name: FontAwesomeIconName, variant: string }
  | { type: 'fa-regular', name: FontAwesomeIconName, variant: string };

export interface IconView {
  label: string;
  subLabel: string;
  type: string[];
}

export type IconContent = Record<
  IconCategory,
  Partial<Record<IconSet, AllIconNames[]>>
>;
