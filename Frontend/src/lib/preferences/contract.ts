import type { IconSet, Layer, Theme } from "@/types/icons/icons.types";

export interface UserPreferences {
  theme: Theme;
  iconSet: IconSet;
  layer: Layer;
}

export const DEFAULT_USER_PREFERENCES: UserPreferences = {
  theme: "light",
  iconSet: "core",
  layer: "expanded",
};

const ICON_SETS = new Set<IconSet>(["neo", "core", "mina", "fa-solid", "fa-regular"]);
const LAYERS = new Set<Layer>(["compact", "expanded"]);
const THEMES = new Set<Theme>(["dark", "light"]);

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

export function normalizeUserPreferences(value: unknown): UserPreferences {
  if (!isObject(value)) {
    return { ...DEFAULT_USER_PREFERENCES };
  }

  return {
    theme: THEMES.has(value.theme as Theme) ? (value.theme as Theme) : DEFAULT_USER_PREFERENCES.theme,
    iconSet: ICON_SETS.has(value.iconSet as IconSet)
      ? (value.iconSet as IconSet)
      : DEFAULT_USER_PREFERENCES.iconSet,
    layer: LAYERS.has(value.layer as Layer) ? (value.layer as Layer) : DEFAULT_USER_PREFERENCES.layer,
  };
}

export function parseUserPreferencesCookie(cookieValue: string | undefined): UserPreferences {
  if (!cookieValue) {
    return { ...DEFAULT_USER_PREFERENCES };
  }

  try {
    return normalizeUserPreferences(JSON.parse(cookieValue) as unknown);
  } catch {
    return { ...DEFAULT_USER_PREFERENCES };
  }
}

export function serializeUserPreferences(prefs: UserPreferences): string {
  return JSON.stringify(prefs);
}

export function areUserPreferencesEqual(a: UserPreferences, b: UserPreferences): boolean {
  return a.theme === b.theme && a.iconSet === b.iconSet && a.layer === b.layer;
}
