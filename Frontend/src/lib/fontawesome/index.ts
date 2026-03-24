import * as solidIcons from '@fortawesome/free-solid-svg-icons';
import * as regularIcons from '@fortawesome/free-regular-svg-icons';
import { getFontAwesomeIconNames } from './utils';

// Exportar SOLO nombres de iconos. 
// Esto es importante para que el bundler no cargue las definiciones SVG completas en el thread principal
export const faSolidIconNames = getFontAwesomeIconNames(solidIcons);
export const faRegularIconNames = getFontAwesomeIconNames(regularIcons);

export type FontAwesomeSolidIconName = typeof faSolidIconNames[number];
export type FontAwesomeRegularIconName = typeof faRegularIconNames[number];
export type FontAwesomeIconName = FontAwesomeSolidIconName | FontAwesomeRegularIconName;
