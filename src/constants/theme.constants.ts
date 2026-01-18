/**
 * Parchment color palette
 */
export const PARCHMENT_COLORS = {
  lightest: '#fefdfb',
  light: '#fdf9f0',
  base: '#f4e4c1',
  medium: '#e8d098',
  dark: '#d9b86c',
  darkest: '#a67c3b',
} as const;

/**
 * Ink color palette
 */
export const INK_COLORS = {
  lightest: '#b5aca2',
  light: '#857869',
  base: '#5d524a',
  medium: '#4f4640',
  dark: '#443d38',
  darkest: '#26211e',
} as const;

/**
 * Terrain biome colors
 */
export const BIOME_COLORS = {
  ocean: '#0277bd',
  shallowWater: '#4fc3f7',
  beach: '#ffe082',
  grassland: '#7cb342',
  forest: '#558b2f',
  denseForest: '#33691e',
  desert: '#d4a056',
  savanna: '#c6a060',
  tundra: '#b0bec5',
  snow: '#eceff1',
  mountain: '#78909c',
  highMountain: '#546e7a',
  swamp: '#8d6e63',
  volcanic: '#5d4037',
} as const;

/**
 * UI spacing constants
 */
export const UI_SPACING = {
  toolbarWidth: 48,
  panelWidth: 280,
  panelCollapsedWidth: 48,
  statusBarHeight: 28,
  gap: 8,
  padding: 16,
} as const;

/**
 * Default tool colors
 */
export const DEFAULT_TOOL_COLORS = {
  primary: '#5d524a',
  secondary: '#f4e4c1',
  highlight: '#c49a4a',
} as const;
