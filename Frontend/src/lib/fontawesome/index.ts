import * as solidIcons from '@fortawesome/free-solid-svg-icons';
import * as regularIcons from '@fortawesome/free-regular-svg-icons';
import { IconDefinition } from '@fortawesome/fontawesome-svg-core';

// Extraer nombres de iconos usando el iconName real de Font Awesome
export const getFontAwesomeIconNames = (iconSet: typeof solidIcons | typeof regularIcons): string[] => {
  const names: string[] = [];
  
  Object.entries(iconSet).forEach(([key, value]) => {
    if (key.startsWith('fa') && 
        key !== 'fas' && 
        key !== 'far' && 
        key !== 'prefix' && 
        typeof value === 'object' &&
        value !== null &&
        'iconName' in value) {
      // Usar el iconName real de Font Awesome
      names.push(value.iconName as string);
    }
  });
  
  return names;
};

// Obtener iconos de Font Awesome indexados por su iconName real
export const getFontAwesomeIcons = (iconSet: typeof solidIcons | typeof regularIcons): Record<string, IconDefinition> => {
  const icons: Record<string, IconDefinition> = {};
  
  Object.entries(iconSet).forEach(([key, value]) => {
    if (key.startsWith('fa') && 
        key !== 'fas' && 
        key !== 'far' && 
        key !== 'prefix' && 
        typeof value === 'object' &&
        value !== null &&
        'iconName' in value) {
      // Indexar por el iconName real
      const iconName = value.iconName as string;
      icons[iconName] = value as IconDefinition;
    }
  });
  
  return icons;
};

// Exportar nombres de iconos
export const faSolidIconNames = getFontAwesomeIconNames(solidIcons);
export const faRegularIconNames = getFontAwesomeIconNames(regularIcons);

// Exportar iconos
export const faSolidIcons = getFontAwesomeIcons(solidIcons);
export const faRegularIcons = getFontAwesomeIcons(regularIcons);

// Tipo para nombres de iconos
export type FontAwesomeSolidIconName = typeof faSolidIconNames[number];
export type FontAwesomeRegularIconName = typeof faRegularIconNames[number];
export type FontAwesomeIconName = FontAwesomeSolidIconName | FontAwesomeRegularIconName;
