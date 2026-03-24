import { IconDefinition } from '@fortawesome/fontawesome-svg-core';

export const getFontAwesomeIconNames = (iconSet: any): string[] => {
  const names: string[] = [];
  Object.entries(iconSet).forEach(([key, value]) => {
    if (key.startsWith('fa') && 
        key !== 'fas' && 
        key !== 'far' && 
        key !== 'prefix' && 
        typeof value === 'object' &&
        value !== null &&
        'iconName' in value) {
      names.push((value as any).iconName as string);
    }
  });
  return names;
};

export const getFontAwesomeIcons = (iconSet: any): Record<string, IconDefinition> => {
  const icons: Record<string, IconDefinition> = {};
  Object.entries(iconSet).forEach(([key, value]) => {
    if (key.startsWith('fa') && 
        key !== 'fas' && 
        key !== 'far' && 
        key !== 'prefix' && 
        typeof value === 'object' &&
        value !== null &&
        'iconName' in value) {
      const iconName = (value as any).iconName as string;
      icons[iconName] = value as IconDefinition;
    }
  });
  return icons;
};
