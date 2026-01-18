# PHASE 1: Project Foundation & Canvas Core

---

### 1.1 Project Initialization

**Objective:** Create a new Vite + React + TypeScript project with all necessary dependencies and configuration.

#### 1.1.1 Create Project Structure

```bash
# Initialize project
npm create vite@latest planet-planner -- --template react-ts
cd planet-planner

# Install core dependencies
npm install pixi.js@^8.5.0 @pixi/react@^8.0.0 zustand@^5.0.0 immer@^10.1.0

# Install UI dependencies
npm install @radix-ui/react-slot @radix-ui/react-tooltip @radix-ui/react-dropdown-menu
npm install @radix-ui/react-slider @radix-ui/react-toggle @radix-ui/react-toggle-group
npm install @radix-ui/react-separator @radix-ui/react-scroll-area
npm install class-variance-authority clsx tailwind-merge
npm install lucide-react

# Install utility dependencies
npm install uuid nanoid
npm install @use-gesture/react

# Install Tailwind
npm install -D tailwindcss postcss autoprefixer
npm install -D @tailwindcss/typography

# Install dev dependencies
npm install -D @types/uuid
npx tailwindcss init -p
```

#### 1.1.2 Directory Structure

Create the following directory structure:

```
planet-planner/
├── public/
│   ├── fonts/
│   │   └── .gitkeep
│   ├── textures/
│   │   └── .gitkeep
│   └── icons/
│       └── .gitkeep
├── src/
│   ├── assets/
│   │   └── .gitkeep
│   ├── components/
│   │   ├── ui/                    # Reusable UI primitives
│   │   │   ├── Button.tsx
│   │   │   ├── Slider.tsx
│   │   │   ├── Toggle.tsx
│   │   │   ├── Tooltip.tsx
│   │   │   ├── DropdownMenu.tsx
│   │   │   ├── ScrollArea.tsx
│   │   │   └── index.ts
│   │   ├── layout/                # App layout components
│   │   │   ├── AppShell.tsx
│   │   │   ├── Toolbar.tsx
│   │   │   ├── LayerPanel.tsx
│   │   │   ├── PropertiesPanel.tsx
│   │   │   ├── StatusBar.tsx
│   │   │   └── index.ts
│   │   └── canvas/                # Canvas-related React components
│   │       ├── CanvasContainer.tsx
│   │       ├── CanvasOverlay.tsx
│   │       ├── GridOverlay.tsx
│   │       └── index.ts
│   ├── core/                      # Core engine (non-React)
│   │   ├── canvas/
│   │   │   ├── CanvasEngine.ts    # Main Pixi.js wrapper
│   │   │   ├── Camera.ts          # Pan/zoom/viewport
│   │   │   ├── Grid.ts            # Grid rendering & snapping
│   │   │   ├── InputHandler.ts    # Mouse/touch event processing
│   │   │   └── index.ts
│   │   ├── layers/
│   │   │   ├── Layer.ts           # Base layer class
│   │   │   ├── LayerManager.ts    # Layer orchestration
│   │   │   └── index.ts
│   │   ├── rendering/
│   │   │   ├── RenderPipeline.ts  # Compositor
│   │   │   └── index.ts
│   │   └── index.ts
│   ├── stores/                    # Zustand stores
│   │   ├── useCanvasStore.ts      # Canvas state (zoom, pan, grid)
│   │   ├── useLayerStore.ts       # Layer state
│   │   ├── useToolStore.ts        # Active tool, tool options
│   │   ├── useProjectStore.ts     # Project metadata
│   │   └── index.ts
│   ├── hooks/                     # Custom React hooks
│   │   ├── useCanvas.ts
│   │   ├── useKeyboardShortcuts.ts
│   │   ├── useResponsive.ts
│   │   └── index.ts
│   ├── types/                     # TypeScript type definitions
│   │   ├── canvas.types.ts
│   │   ├── layer.types.ts
│   │   ├── tool.types.ts
│   │   ├── project.types.ts
│   │   └── index.ts
│   ├── utils/                     # Utility functions
│   │   ├── math.ts                # Vector math, interpolation
│   │   ├── color.ts               # Color manipulation
│   │   ├── cn.ts                  # Tailwind class merge utility
│   │   └── index.ts
│   ├── constants/                 # App constants
│   │   ├── canvas.constants.ts
│   │   ├── theme.constants.ts
│   │   └── index.ts
│   ├── App.tsx
│   ├── main.tsx
│   └── index.css
├── .eslintrc.cjs
├── .prettierrc
├── tailwind.config.js
├── tsconfig.json
├── tsconfig.node.json
├── vite.config.ts
├── index.html
└── package.json
```

---

### 1.2 Configuration Files

#### 1.2.1 tailwind.config.js

```javascript
/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ['class'],
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        // Parchment theme colors
        parchment: {
          50: '#fefdfb',
          100: '#fdf9f0',
          200: '#f9f0dc',
          300: '#f4e4c1',
          400: '#e8d098',
          500: '#d9b86c',
          600: '#c49a4a',
          700: '#a67c3b',
          800: '#876335',
          900: '#6e512f',
          950: '#3d2a17',
        },
        ink: {
          50: '#f6f5f4',
          100: '#e7e4e1',
          200: '#d1cbc5',
          300: '#b5aca2',
          400: '#9a8d7f',
          500: '#857869',
          600: '#72655a',
          700: '#5d524a',
          800: '#4f4640',
          900: '#443d38',
          950: '#26211e',
        },
        ocean: {
          50: '#f0f9ff',
          100: '#e0f2fe',
          200: '#bae6fd',
          300: '#7dd3fc',
          400: '#38bdf8',
          500: '#0ea5e9',
          600: '#0284c7',
          700: '#0369a1',
          800: '#075985',
          900: '#0c4a6e',
          950: '#082f49',
        },
        terrain: {
          grass: '#7cb342',
          forest: '#558b2f',
          desert: '#d4a056',
          snow: '#eceff1',
          mountain: '#78909c',
          water: '#4fc3f7',
          deepwater: '#0277bd',
          sand: '#ffe082',
          swamp: '#8d6e63',
        },
      },
      fontFamily: {
        display: ['Cinzel', 'serif'],
        body: ['Inter', 'sans-serif'],
        map: ['IM Fell English', 'serif'],
        handwritten: ['Caveat', 'cursive'],
      },
      spacing: {
        'toolbar': '48px',
        'panel': '280px',
        'panel-collapsed': '48px',
      },
      zIndex: {
        'canvas': '0',
        'overlay': '10',
        'toolbar': '20',
        'panel': '30',
        'modal': '40',
        'tooltip': '50',
      },
      animation: {
        'fade-in': 'fadeIn 150ms ease-out',
        'slide-in-right': 'slideInRight 200ms ease-out',
        'slide-in-left': 'slideInLeft 200ms ease-out',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideInRight: {
          '0%': { transform: 'translateX(100%)', opacity: '0' },
          '100%': { transform: 'translateX(0)', opacity: '1' },
        },
        slideInLeft: {
          '0%': { transform: 'translateX(-100%)', opacity: '0' },
          '100%': { transform: 'translateX(0)', opacity: '1' },
        },
      },
    },
  },
  plugins: [
    require('@tailwindcss/typography'),
  ],
}
```

#### 1.2.2 tsconfig.json

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,

    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx",

    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "noUncheckedIndexedAccess": true,

    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"],
      "@components/*": ["./src/components/*"],
      "@core/*": ["./src/core/*"],
      "@stores/*": ["./src/stores/*"],
      "@hooks/*": ["./src/hooks/*"],
      "@types/*": ["./src/types/*"],
      "@utils/*": ["./src/utils/*"],
      "@constants/*": ["./src/constants/*"]
    }
  },
  "include": ["src"],
  "references": [{ "path": "./tsconfig.node.json" }]
}
```

#### 1.2.3 vite.config.ts

```typescript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@components': path.resolve(__dirname, './src/components'),
      '@core': path.resolve(__dirname, './src/core'),
      '@stores': path.resolve(__dirname, './src/stores'),
      '@hooks': path.resolve(__dirname, './src/hooks'),
      '@types': path.resolve(__dirname, './src/types'),
      '@utils': path.resolve(__dirname, './src/utils'),
      '@constants': path.resolve(__dirname, './src/constants'),
    },
  },
  server: {
    port: 3000,
    open: true,
  },
  build: {
    target: 'esnext',
    sourcemap: true,
  },
});
```

#### 1.2.4 .prettierrc

```json
{
  "semi": true,
  "singleQuote": true,
  "tabWidth": 2,
  "trailingComma": "es5",
  "printWidth": 100,
  "bracketSpacing": true,
  "arrowParens": "avoid",
  "endOfLine": "lf"
}
```

---

### 1.3 Type Definitions

#### 1.3.1 src/types/canvas.types.ts

```typescript
/**
 * 2D Vector representation
 */
export interface Vector2 {
  x: number;
  y: number;
}

/**
 * Rectangle bounds
 */
export interface Bounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * Viewport state representing the visible area of the canvas
 */
export interface Viewport {
  /** Center position in world coordinates */
  center: Vector2;
  /** Current zoom level (1 = 100%) */
  zoom: number;
  /** Viewport bounds in world coordinates */
  bounds: Bounds;
}

/**
 * Camera configuration
 */
export interface CameraConfig {
  /** Minimum zoom level */
  minZoom: number;
  /** Maximum zoom level */
  maxZoom: number;
  /** Zoom speed multiplier */
  zoomSpeed: number;
  /** Enable smooth zoom animation */
  smoothZoom: boolean;
  /** Enable smooth pan animation */
  smoothPan: boolean;
  /** Damping factor for smooth movement (0-1) */
  damping: number;
}

/**
 * Grid configuration
 */
export interface GridConfig {
  /** Grid visibility */
  visible: boolean;
  /** Grid cell size in pixels */
  cellSize: number;
  /** Grid type */
  type: 'square' | 'hex';
  /** Snap to grid when placing elements */
  snapToGrid: boolean;
  /** Grid line color */
  color: string;
  /** Grid line opacity (0-1) */
  opacity: number;
  /** Show subdivision lines */
  showSubdivisions: boolean;
  /** Subdivision count per cell */
  subdivisions: number;
}

/**
 * Canvas state
 */
export interface CanvasState {
  /** Viewport configuration */
  viewport: Viewport;
  /** Grid configuration */
  grid: GridConfig;
  /** Canvas dimensions in pixels */
  dimensions: { width: number; height: number };
  /** Is the canvas currently being interacted with */
  isInteracting: boolean;
  /** Current interaction mode */
  interactionMode: 'none' | 'pan' | 'zoom' | 'draw';
}

/**
 * Mouse/touch input state
 */
export interface InputState {
  /** Current pointer position in screen coordinates */
  screenPosition: Vector2;
  /** Current pointer position in world coordinates */
  worldPosition: Vector2;
  /** Is primary button pressed */
  isPrimaryDown: boolean;
  /** Is secondary button pressed */
  isSecondaryDown: boolean;
  /** Is middle button pressed */
  isMiddleDown: boolean;
  /** Currently pressed modifier keys */
  modifiers: {
    shift: boolean;
    ctrl: boolean;
    alt: boolean;
    meta: boolean;
  };
  /** Pressure for stylus input (0-1) */
  pressure: number;
}

/**
 * Canvas engine events
 */
export interface CanvasEngineEvents {
  'viewport:change': Viewport;
  'grid:change': GridConfig;
  'input:pointerdown': InputState;
  'input:pointermove': InputState;
  'input:pointerup': InputState;
  'input:wheel': { delta: Vector2; position: Vector2 };
  'render:frame': { deltaTime: number };
}
```

#### 1.3.2 src/types/layer.types.ts

```typescript
import type { Bounds } from './canvas.types';

/**
 * Layer blend modes matching Pixi.js blend modes
 */
export type BlendMode =
  | 'normal'
  | 'add'
  | 'multiply'
  | 'screen'
  | 'overlay'
  | 'darken'
  | 'lighten'
  | 'color-dodge'
  | 'color-burn'
  | 'hard-light'
  | 'soft-light'
  | 'difference'
  | 'exclusion';

/**
 * Layer types for different content categories
 */
export type LayerType =
  | 'terrain'      // Base terrain/landmass
  | 'biome'        // Biome overlays
  | 'elevation'    // Height map data
  | 'water'        // Oceans, lakes, rivers
  | 'feature'      // Mountains, forests
  | 'icon'         // Cities, POIs
  | 'path'         // Roads, borders
  | 'label'        // Text annotations
  | 'effect'       // Visual effects (fog, etc.)
  | 'reference';   // Reference images

/**
 * Base layer interface
 */
export interface Layer {
  /** Unique layer identifier */
  id: string;
  /** Display name */
  name: string;
  /** Layer type */
  type: LayerType;
  /** Is layer visible */
  visible: boolean;
  /** Is layer locked (non-editable) */
  locked: boolean;
  /** Layer opacity (0-1) */
  opacity: number;
  /** Blend mode */
  blendMode: BlendMode;
  /** Layer order (higher = on top) */
  order: number;
  /** Parent layer ID for grouping (null = root) */
  parentId: string | null;
  /** Is this a group layer */
  isGroup: boolean;
  /** Is group expanded in layer panel */
  isExpanded: boolean;
  /** Layer bounds in world coordinates */
  bounds: Bounds | null;
  /** Layer-specific metadata */
  metadata: Record<string, unknown>;
  /** Creation timestamp */
  createdAt: number;
  /** Last modified timestamp */
  updatedAt: number;
}

/**
 * Layer group (contains other layers)
 */
export interface LayerGroup extends Layer {
  isGroup: true;
  /** Child layer IDs */
  childIds: string[];
}

/**
 * Layer manager state
 */
export interface LayerState {
  /** All layers indexed by ID */
  layers: Record<string, Layer>;
  /** Root layer order (top-level layer IDs in order) */
  rootOrder: string[];
  /** Currently selected layer IDs */
  selectedIds: string[];
  /** Currently active layer ID (for drawing) */
  activeId: string | null;
}

/**
 * Layer creation options
 */
export interface CreateLayerOptions {
  name?: string;
  type: LayerType;
  parentId?: string | null;
  visible?: boolean;
  opacity?: number;
  blendMode?: BlendMode;
  metadata?: Record<string, unknown>;
}
```

#### 1.3.3 src/types/tool.types.ts

```typescript
import type { Vector2, InputState } from './canvas.types';

/**
 * Available tool types
 */
export type ToolType =
  | 'select'       // Selection tool
  | 'pan'          // Hand/pan tool
  | 'brush'        // Freehand brush
  | 'eraser'       // Eraser
  | 'shape'        // Shape drawing (rect, ellipse, polygon)
  | 'path'         // Path/spline tool
  | 'fill'         // Flood fill
  | 'stamp'        // Icon/stamp placement
  | 'text'         // Text tool
  | 'eyedropper';  // Color picker

/**
 * Shape subtypes for shape tool
 */
export type ShapeType = 'rectangle' | 'ellipse' | 'polygon' | 'freeform';

/**
 * Base tool options
 */
export interface BaseToolOptions {
  /** Tool size/radius in pixels */
  size: number;
  /** Tool opacity (0-1) */
  opacity: number;
  /** Primary color (hex) */
  primaryColor: string;
  /** Secondary color (hex) */
  secondaryColor: string;
}

/**
 * Brush tool specific options
 */
export interface BrushToolOptions extends BaseToolOptions {
  /** Brush hardness (0-1, 0 = soft, 1 = hard) */
  hardness: number;
  /** Brush spacing as percentage of size */
  spacing: number;
  /** Enable pressure sensitivity */
  pressureSensitivity: boolean;
  /** Pressure affects size */
  pressureAffectsSize: boolean;
  /** Pressure affects opacity */
  pressureAffectsOpacity: boolean;
}

/**
 * Shape tool specific options
 */
export interface ShapeToolOptions extends BaseToolOptions {
  /** Shape type */
  shapeType: ShapeType;
  /** Fill the shape */
  fill: boolean;
  /** Stroke the shape */
  stroke: boolean;
  /** Stroke width */
  strokeWidth: number;
  /** Corner radius for rectangles */
  cornerRadius: number;
  /** Number of sides for polygon */
  polygonSides: number;
}

/**
 * Path tool specific options
 */
export interface PathToolOptions extends BaseToolOptions {
  /** Path stroke width */
  strokeWidth: number;
  /** Smooth path curves */
  smoothing: number;
  /** Close path automatically */
  closePath: boolean;
}

/**
 * Text tool specific options
 */
export interface TextToolOptions extends BaseToolOptions {
  /** Font family */
  fontFamily: string;
  /** Font size in pixels */
  fontSize: number;
  /** Font weight */
  fontWeight: number;
  /** Font style */
  fontStyle: 'normal' | 'italic';
  /** Text alignment */
  textAlign: 'left' | 'center' | 'right';
}

/**
 * Union of all tool options
 */
export type ToolOptions =
  | BrushToolOptions
  | ShapeToolOptions
  | PathToolOptions
  | TextToolOptions
  | BaseToolOptions;

/**
 * Tool state
 */
export interface ToolState {
  /** Currently active tool */
  activeTool: ToolType;
  /** Previous tool (for quick swap) */
  previousTool: ToolType;
  /** Tool-specific options */
  options: Record<ToolType, ToolOptions>;
  /** Is tool currently in use (drawing) */
  isActive: boolean;
}

/**
 * Tool event context passed to tool handlers
 */
export interface ToolEventContext {
  /** Input state */
  input: InputState;
  /** Start position of current stroke/action */
  startPosition: Vector2 | null;
  /** All positions in current stroke */
  strokePath: Vector2[];
  /** Active layer ID */
  activeLayerId: string | null;
}
```

#### 1.3.4 src/types/project.types.ts

```typescript
import type { LayerState } from './layer.types';
import type { GridConfig, Viewport } from './canvas.types';

/**
 * Project metadata
 */
export interface ProjectMetadata {
  /** Project unique identifier */
  id: string;
  /** Project name */
  name: string;
  /** Project description */
  description: string;
  /** Author name */
  author: string;
  /** Creation timestamp */
  createdAt: number;
  /** Last modified timestamp */
  updatedAt: number;
  /** Project version (for migrations) */
  version: string;
  /** Project thumbnail (base64 or URL) */
  thumbnail: string | null;
  /** Project tags for organization */
  tags: string[];
}

/**
 * Canvas settings saved with project
 */
export interface ProjectCanvasSettings {
  /** Canvas width in world units */
  width: number;
  /** Canvas height in world units */
  height: number;
  /** Background color */
  backgroundColor: string;
  /** Grid configuration */
  grid: GridConfig;
  /** Default viewport */
  defaultViewport: Viewport;
}

/**
 * Style settings for the map
 */
export interface ProjectStyleSettings {
  /** Parchment effect intensity (0-1) */
  parchmentIntensity: number;
  /** Ink effect intensity (0-1) */
  inkIntensity: number;
  /** Overall saturation adjustment (-1 to 1) */
  saturation: number;
  /** Overall brightness adjustment (-1 to 1) */
  brightness: number;
  /** Vignette intensity (0-1) */
  vignetteIntensity: number;
  /** Paper aging effect (0-1) */
  agingEffect: number;
}

/**
 * Complete project state (for save/load)
 */
export interface Project {
  /** Project metadata */
  metadata: ProjectMetadata;
  /** Canvas settings */
  canvas: ProjectCanvasSettings;
  /** Style settings */
  style: ProjectStyleSettings;
  /** Layer state */
  layers: LayerState;
  /** Additional project data (tool presets, etc.) */
  data: Record<string, unknown>;
}

/**
 * Project state for the store
 */
export interface ProjectState {
  /** Current project */
  project: Project | null;
  /** Is project modified since last save */
  isDirty: boolean;
  /** Is project currently saving */
  isSaving: boolean;
  /** Is project currently loading */
  isLoading: boolean;
  /** Last error message */
  error: string | null;
}
```

#### 1.3.5 src/types/index.ts

```typescript
export * from './canvas.types';
export * from './layer.types';
export * from './tool.types';
export * from './project.types';
```

---

### 1.4 Constants

#### 1.4.1 src/constants/canvas.constants.ts

```typescript
import type { CameraConfig, GridConfig, Viewport } from '@/types';

/**
 * Default camera configuration
 */
export const DEFAULT_CAMERA_CONFIG: CameraConfig = {
  minZoom: 0.1,
  maxZoom: 10,
  zoomSpeed: 0.001,
  smoothZoom: true,
  smoothPan: true,
  damping: 0.1,
};

/**
 * Default grid configuration
 */
export const DEFAULT_GRID_CONFIG: GridConfig = {
  visible: true,
  cellSize: 64,
  type: 'square',
  snapToGrid: false,
  color: '#4a4a4a',
  opacity: 0.3,
  showSubdivisions: true,
  subdivisions: 4,
};

/**
 * Default viewport
 */
export const DEFAULT_VIEWPORT: Viewport = {
  center: { x: 0, y: 0 },
  zoom: 1,
  bounds: { x: 0, y: 0, width: 0, height: 0 },
};

/**
 * Default canvas dimensions
 */
export const DEFAULT_CANVAS_DIMENSIONS = {
  width: 4096,
  height: 4096,
};

/**
 * Zoom level presets
 */
export const ZOOM_PRESETS = {
  fit: 'fit',
  '25%': 0.25,
  '50%': 0.5,
  '100%': 1,
  '200%': 2,
  '400%': 4,
} as const;

/**
 * Canvas rendering constants
 */
export const CANVAS_CONSTANTS = {
  /** Maximum canvas size in pixels */
  MAX_CANVAS_SIZE: 16384,
  /** Minimum canvas size in pixels */
  MIN_CANVAS_SIZE: 256,
  /** Default background color */
  DEFAULT_BACKGROUND_COLOR: '#1a1a2e',
  /** Checkerboard pattern size for transparency */
  CHECKERBOARD_SIZE: 16,
};
```

#### 1.4.2 src/constants/theme.constants.ts

```typescript
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
```

#### 1.4.3 src/constants/index.ts

```typescript
export * from './canvas.constants';
export * from './theme.constants';
```

---

### 1.5 Utility Functions

#### 1.5.1 src/utils/cn.ts

```typescript
import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Merge Tailwind CSS classes with clsx
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
```

#### 1.5.2 src/utils/math.ts

```typescript
import type { Vector2, Bounds } from '@/types';

/**
 * Create a Vector2
 */
export function vec2(x: number = 0, y: number = 0): Vector2 {
  return { x, y };
}

/**
 * Add two vectors
 */
export function vec2Add(a: Vector2, b: Vector2): Vector2 {
  return { x: a.x + b.x, y: a.y + b.y };
}

/**
 * Subtract vector b from vector a
 */
export function vec2Sub(a: Vector2, b: Vector2): Vector2 {
  return { x: a.x - b.x, y: a.y - b.y };
}

/**
 * Multiply vector by scalar
 */
export function vec2Scale(v: Vector2, scalar: number): Vector2 {
  return { x: v.x * scalar, y: v.y * scalar };
}

/**
 * Get vector length
 */
export function vec2Length(v: Vector2): number {
  return Math.sqrt(v.x * v.x + v.y * v.y);
}

/**
 * Normalize vector to unit length
 */
export function vec2Normalize(v: Vector2): Vector2 {
  const len = vec2Length(v);
  if (len === 0) return { x: 0, y: 0 };
  return { x: v.x / len, y: v.y / len };
}

/**
 * Linear interpolation between two vectors
 */
export function vec2Lerp(a: Vector2, b: Vector2, t: number): Vector2 {
  return {
    x: a.x + (b.x - a.x) * t,
    y: a.y + (b.y - a.y) * t,
  };
}

/**
 * Distance between two vectors
 */
export function vec2Distance(a: Vector2, b: Vector2): number {
  return vec2Length(vec2Sub(b, a));
}

/**
 * Dot product of two vectors
 */
export function vec2Dot(a: Vector2, b: Vector2): number {
  return a.x * b.x + a.y * b.y;
}

/**
 * Clamp a value between min and max
 */
export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

/**
 * Linear interpolation between two numbers
 */
export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

/**
 * Smoothstep interpolation
 */
export function smoothstep(edge0: number, edge1: number, x: number): number {
  const t = clamp((x - edge0) / (edge1 - edge0), 0, 1);
  return t * t * (3 - 2 * t);
}

/**
 * Map a value from one range to another
 */
export function mapRange(
  value: number,
  inMin: number,
  inMax: number,
  outMin: number,
  outMax: number
): number {
  return ((value - inMin) * (outMax - outMin)) / (inMax - inMin) + outMin;
}

/**
 * Check if a point is inside bounds
 */
export function isPointInBounds(point: Vector2, bounds: Bounds): boolean {
  return (
    point.x >= bounds.x &&
    point.x <= bounds.x + bounds.width &&
    point.y >= bounds.y &&
    point.y <= bounds.y + bounds.height
  );
}

/**
 * Check if two bounds intersect
 */
export function boundsIntersect(a: Bounds, b: Bounds): boolean {
  return (
    a.x < b.x + b.width &&
    a.x + a.width > b.x &&
    a.y < b.y + b.height &&
    a.y + a.height > b.y
  );
}

/**
 * Get intersection of two bounds
 */
export function boundsIntersection(a: Bounds, b: Bounds): Bounds | null {
  const x = Math.max(a.x, b.x);
  const y = Math.max(a.y, b.y);
  const width = Math.min(a.x + a.width, b.x + b.width) - x;
  const height = Math.min(a.y + a.height, b.y + b.height) - y;

  if (width <= 0 || height <= 0) return null;
  return { x, y, width, height };
}

/**
 * Snap value to grid
 */
export function snapToGrid(value: number, gridSize: number): number {
  return Math.round(value / gridSize) * gridSize;
}

/**
 * Snap vector to grid
 */
export function vec2SnapToGrid(v: Vector2, gridSize: number): Vector2 {
  return {
    x: snapToGrid(v.x, gridSize),
    y: snapToGrid(v.y, gridSize),
  };
}

/**
 * Degrees to radians
 */
export function degToRad(degrees: number): number {
  return degrees * (Math.PI / 180);
}

/**
 * Radians to degrees
 */
export function radToDeg(radians: number): number {
  return radians * (180 / Math.PI);
}
```

#### 1.5.3 src/utils/color.ts

```typescript
/**
 * Parse hex color to RGB components
 */
export function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
      }
    : null;
}

/**
 * RGB components to hex color
 */
export function rgbToHex(r: number, g: number, b: number): string {
  return '#' + [r, g, b].map(x => x.toString(16).padStart(2, '0')).join('');
}

/**
 * Parse hex color to number (for Pixi.js)
 */
export function hexToNumber(hex: string): number {
  return parseInt(hex.replace('#', ''), 16);
}

/**
 * Number color to hex string
 */
export function numberToHex(num: number): string {
  return '#' + num.toString(16).padStart(6, '0');
}

/**
 * Blend two colors
 */
export function blendColors(color1: string, color2: string, factor: number): string {
  const c1 = hexToRgb(color1);
  const c2 = hexToRgb(color2);
  if (!c1 || !c2) return color1;

  const r = Math.round(c1.r + (c2.r - c1.r) * factor);
  const g = Math.round(c1.g + (c2.g - c1.g) * factor);
  const b = Math.round(c1.b + (c2.b - c1.b) * factor);

  return rgbToHex(r, g, b);
}

/**
 * Lighten a color
 */
export function lightenColor(hex: string, amount: number): string {
  return blendColors(hex, '#ffffff', amount);
}

/**
 * Darken a color
 */
export function darkenColor(hex: string, amount: number): string {
  return blendColors(hex, '#000000', amount);
}

/**
 * Get contrasting text color (black or white)
 */
export function getContrastColor(hex: string): string {
  const rgb = hexToRgb(hex);
  if (!rgb) return '#000000';

  // Calculate relative luminance
  const luminance = (0.299 * rgb.r + 0.587 * rgb.g + 0.114 * rgb.b) / 255;
  return luminance > 0.5 ? '#000000' : '#ffffff';
}

/**
 * Convert RGB to HSL
 */
export function rgbToHsl(
  r: number,
  g: number,
  b: number
): { h: number; s: number; l: number } {
  r /= 255;
  g /= 255;
  b /= 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);

    switch (max) {
      case r:
        h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
        break;
      case g:
        h = ((b - r) / d + 2) / 6;
        break;
      case b:
        h = ((r - g) / d + 4) / 6;
        break;
    }
  }

  return { h, s, l };
}

/**
 * Convert HSL to RGB
 */
export function hslToRgb(
  h: number,
  s: number,
  l: number
): { r: number; g: number; b: number } {
  let r: number, g: number, b: number;

  if (s === 0) {
    r = g = b = l;
  } else {
    const hue2rgb = (p: number, q: number, t: number) => {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1 / 6) return p + (q - p) * 6 * t;
      if (t < 1 / 2) return q;
      if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
      return p;
    };

    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    r = hue2rgb(p, q, h + 1 / 3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1 / 3);
  }

  return {
    r: Math.round(r * 255),
    g: Math.round(g * 255),
    b: Math.round(b * 255),
  };
}
```

#### 1.5.4 src/utils/index.ts

```typescript
export * from './cn';
export * from './math';
export * from './color';
```

---

### 1.6 Core Canvas Engine

#### 1.6.1 src/core/canvas/Camera.ts

```typescript
import { Container } from 'pixi.js';
import type { Vector2, Viewport, CameraConfig, Bounds } from '@/types';
import { DEFAULT_CAMERA_CONFIG, DEFAULT_VIEWPORT } from '@/constants';
import { clamp, vec2Lerp, vec2 } from '@/utils';

/**
 * Camera class managing viewport transformations
 * Handles pan, zoom, and coordinate conversions
 */
export class Camera {
  private container: Container;
  private config: CameraConfig;
  private viewport: Viewport;
  private targetCenter: Vector2;
  private targetZoom: number;
  private screenWidth: number = 0;
  private screenHeight: number = 0;

  constructor(container: Container, config: Partial<CameraConfig> = {}) {
    this.container = container;
    this.config = { ...DEFAULT_CAMERA_CONFIG, ...config };
    this.viewport = { ...DEFAULT_VIEWPORT };
    this.targetCenter = { ...this.viewport.center };
    this.targetZoom = this.viewport.zoom;
  }

  /**
   * Update screen dimensions (call on resize)
   */
  setScreenSize(width: number, height: number): void {
    this.screenWidth = width;
    this.screenHeight = height;
    this.updateBounds();
  }

  /**
   * Get current viewport state
   */
  getViewport(): Viewport {
    return { ...this.viewport };
  }

  /**
   * Get current zoom level
   */
  getZoom(): number {
    return this.viewport.zoom;
  }

  /**
   * Get current center position
   */
  getCenter(): Vector2 {
    return { ...this.viewport.center };
  }

  /**
   * Set zoom level (with optional focal point)
   */
  setZoom(zoom: number, focalPoint?: Vector2): void {
    const newZoom = clamp(zoom, this.config.minZoom, this.config.maxZoom);

    if (focalPoint && this.config.smoothZoom) {
      // Zoom toward focal point
      const worldFocal = this.screenToWorld(focalPoint);
      this.targetZoom = newZoom;

      // Adjust center to keep focal point stationary
      const zoomRatio = newZoom / this.viewport.zoom;
      this.targetCenter = {
        x: worldFocal.x - (worldFocal.x - this.viewport.center.x) / zoomRatio,
        y: worldFocal.y - (worldFocal.y - this.viewport.center.y) / zoomRatio,
      };
    } else {
      this.targetZoom = newZoom;
      if (!this.config.smoothZoom) {
        this.viewport.zoom = newZoom;
        this.applyTransform();
      }
    }
  }

  /**
   * Zoom by delta amount (for scroll wheel)
   */
  zoomBy(delta: number, focalPoint?: Vector2): void {
    const newZoom = this.viewport.zoom * (1 - delta * this.config.zoomSpeed * 100);
    this.setZoom(newZoom, focalPoint);
  }

  /**
   * Set center position
   */
  setCenter(center: Vector2): void {
    this.targetCenter = { ...center };
    if (!this.config.smoothPan) {
      this.viewport.center = { ...center };
      this.applyTransform();
    }
  }

  /**
   * Pan by delta amount
   */
  panBy(delta: Vector2): void {
    this.setCenter({
      x: this.viewport.center.x - delta.x / this.viewport.zoom,
      y: this.viewport.center.y - delta.y / this.viewport.zoom,
    });
  }

  /**
   * Convert screen coordinates to world coordinates
   */
  screenToWorld(screen: Vector2): Vector2 {
    return {
      x: (screen.x - this.screenWidth / 2) / this.viewport.zoom + this.viewport.center.x,
      y: (screen.y - this.screenHeight / 2) / this.viewport.zoom + this.viewport.center.y,
    };
  }

  /**
   * Convert world coordinates to screen coordinates
   */
  worldToScreen(world: Vector2): Vector2 {
    return {
      x: (world.x - this.viewport.center.x) * this.viewport.zoom + this.screenWidth / 2,
      y: (world.y - this.viewport.center.y) * this.viewport.zoom + this.screenHeight / 2,
    };
  }

  /**
   * Fit view to show specified bounds
   */
  fitToBounds(bounds: Bounds, padding: number = 0.1): void {
    const paddedWidth = bounds.width * (1 + padding * 2);
    const paddedHeight = bounds.height * (1 + padding * 2);

    const zoomX = this.screenWidth / paddedWidth;
    const zoomY = this.screenHeight / paddedHeight;
    const zoom = Math.min(zoomX, zoomY);

    this.setZoom(zoom);
    this.setCenter({
      x: bounds.x + bounds.width / 2,
      y: bounds.y + bounds.height / 2,
    });
  }

  /**
   * Reset to default view
   */
  reset(): void {
    this.setZoom(1);
    this.setCenter(vec2(0, 0));
  }

  /**
   * Update camera (call each frame for smooth movement)
   */
  update(deltaTime: number): boolean {
    let changed = false;
    const damping = 1 - Math.pow(this.config.damping, deltaTime * 60);

    // Smooth zoom
    if (Math.abs(this.viewport.zoom - this.targetZoom) > 0.0001) {
      this.viewport.zoom = this.viewport.zoom + (this.targetZoom - this.viewport.zoom) * damping;
      changed = true;
    } else if (this.viewport.zoom !== this.targetZoom) {
      this.viewport.zoom = this.targetZoom;
      changed = true;
    }

    // Smooth pan
    const centerDist = Math.abs(this.viewport.center.x - this.targetCenter.x) +
                       Math.abs(this.viewport.center.y - this.targetCenter.y);
    if (centerDist > 0.01) {
      this.viewport.center = vec2Lerp(this.viewport.center, this.targetCenter, damping);
      changed = true;
    } else if (
      this.viewport.center.x !== this.targetCenter.x ||
      this.viewport.center.y !== this.targetCenter.y
    ) {
      this.viewport.center = { ...this.targetCenter };
      changed = true;
    }

    if (changed) {
      this.applyTransform();
      this.updateBounds();
    }

    return changed;
  }

  /**
   * Apply current transform to container
   */
  private applyTransform(): void {
    this.container.scale.set(this.viewport.zoom);
    this.container.position.set(
      this.screenWidth / 2 - this.viewport.center.x * this.viewport.zoom,
      this.screenHeight / 2 - this.viewport.center.y * this.viewport.zoom
    );
  }

  /**
   * Update viewport bounds
   */
  private updateBounds(): void {
    const halfWidth = this.screenWidth / 2 / this.viewport.zoom;
    const halfHeight = this.screenHeight / 2 / this.viewport.zoom;

    this.viewport.bounds = {
      x: this.viewport.center.x - halfWidth,
      y: this.viewport.center.y - halfHeight,
      width: halfWidth * 2,
      height: halfHeight * 2,
    };
  }
}
```

#### 1.6.2 src/core/canvas/Grid.ts

```typescript
import { Graphics, Container } from 'pixi.js';
import type { GridConfig, Bounds } from '@/types';
import { DEFAULT_GRID_CONFIG } from '@/constants';
import { hexToNumber } from '@/utils';

/**
 * Grid renderer for the canvas
 * Renders square or hex grids with optional subdivisions
 */
export class Grid {
  private container: Container;
  private graphics: Graphics;
  private config: GridConfig;
  private lastBounds: Bounds | null = null;
  private lastZoom: number = 1;

  constructor(container: Container, config: Partial<GridConfig> = {}) {
    this.container = container;
    this.config = { ...DEFAULT_GRID_CONFIG, ...config };
    this.graphics = new Graphics();
    this.container.addChild(this.graphics);
  }

  /**
   * Update grid configuration
   */
  setConfig(config: Partial<GridConfig>): void {
    this.config = { ...this.config, ...config };
    this.lastBounds = null; // Force redraw
  }

  /**
   * Get current configuration
   */
  getConfig(): GridConfig {
    return { ...this.config };
  }

  /**
   * Render the grid for the current viewport
   */
  render(bounds: Bounds, zoom: number): void {
    if (!this.config.visible) {
      this.graphics.clear();
      return;
    }

    // Check if we need to redraw
    if (
      this.lastBounds &&
      this.lastZoom === zoom &&
      this.boundsEqual(this.lastBounds, bounds)
    ) {
      return;
    }

    this.lastBounds = { ...bounds };
    this.lastZoom = zoom;

    this.graphics.clear();

    if (this.config.type === 'square') {
      this.renderSquareGrid(bounds, zoom);
    } else {
      this.renderHexGrid(bounds, zoom);
    }
  }

  /**
   * Render square grid
   */
  private renderSquareGrid(bounds: Bounds, zoom: number): void {
    const { cellSize, color, opacity, showSubdivisions, subdivisions } = this.config;

    // Calculate visible grid range
    const startX = Math.floor(bounds.x / cellSize) * cellSize;
    const startY = Math.floor(bounds.y / cellSize) * cellSize;
    const endX = Math.ceil((bounds.x + bounds.width) / cellSize) * cellSize;
    const endY = Math.ceil((bounds.y + bounds.height) / cellSize) * cellSize;

    const colorNum = hexToNumber(color);

    // Draw subdivision lines (if visible at current zoom)
    if (showSubdivisions && zoom > 0.5) {
      const subSize = cellSize / subdivisions;
      const subOpacity = opacity * 0.3 * Math.min(1, (zoom - 0.5) * 2);

      this.graphics.setStrokeStyle({
        width: 1 / zoom,
        color: colorNum,
        alpha: subOpacity,
      });

      for (let x = startX; x <= endX; x += subSize) {
        if (x % cellSize !== 0) {
          this.graphics.moveTo(x, startY);
          this.graphics.lineTo(x, endY);
        }
      }

      for (let y = startY; y <= endY; y += subSize) {
        if (y % cellSize !== 0) {
          this.graphics.moveTo(startX, y);
          this.graphics.lineTo(endX, y);
        }
      }

      this.graphics.stroke();
    }

    // Draw main grid lines
    this.graphics.setStrokeStyle({
      width: 1 / zoom,
      color: colorNum,
      alpha: opacity,
    });

    for (let x = startX; x <= endX; x += cellSize) {
      this.graphics.moveTo(x, startY);
      this.graphics.lineTo(x, endY);
    }

    for (let y = startY; y <= endY; y += cellSize) {
      this.graphics.moveTo(startX, y);
      this.graphics.lineTo(endX, y);
    }

    this.graphics.stroke();
  }

  /**
   * Render hexagonal grid
   */
  private renderHexGrid(bounds: Bounds, zoom: number): void {
    const { cellSize, color, opacity } = this.config;

    const colorNum = hexToNumber(color);
    const hexWidth = cellSize * 2;
    const hexHeight = cellSize * Math.sqrt(3);
    const horizSpacing = hexWidth * 0.75;
    const vertSpacing = hexHeight;

    const startCol = Math.floor(bounds.x / horizSpacing) - 1;
    const endCol = Math.ceil((bounds.x + bounds.width) / horizSpacing) + 1;
    const startRow = Math.floor(bounds.y / vertSpacing) - 1;
    const endRow = Math.ceil((bounds.y + bounds.height) / vertSpacing) + 1;

    this.graphics.setStrokeStyle({
      width: 1 / zoom,
      color: colorNum,
      alpha: opacity,
    });

    for (let col = startCol; col <= endCol; col++) {
      for (let row = startRow; row <= endRow; row++) {
        const centerX = col * horizSpacing;
        const centerY = row * vertSpacing + (col % 2 === 1 ? vertSpacing / 2 : 0);

        this.drawHexagon(centerX, centerY, cellSize);
      }
    }

    this.graphics.stroke();
  }

  /**
   * Draw a single hexagon
   */
  private drawHexagon(cx: number, cy: number, size: number): void {
    const points: [number, number][] = [];

    for (let i = 0; i < 6; i++) {
      const angle = (Math.PI / 3) * i;
      points.push([cx + size * Math.cos(angle), cy + size * Math.sin(angle)]);
    }

    this.graphics.moveTo(points[0][0], points[0][1]);
    for (let i = 1; i < 6; i++) {
      this.graphics.lineTo(points[i][0], points[i][1]);
    }
    this.graphics.lineTo(points[0][0], points[0][1]);
  }

  /**
   * Snap a world position to the nearest grid point
   */
  snapToGrid(x: number, y: number): { x: number; y: number } {
    if (!this.config.snapToGrid) {
      return { x, y };
    }

    if (this.config.type === 'square') {
      return {
        x: Math.round(x / this.config.cellSize) * this.config.cellSize,
        y: Math.round(y / this.config.cellSize) * this.config.cellSize,
      };
    } else {
      // Hex grid snapping (approximate)
      const hexWidth = this.config.cellSize * 2;
      const hexHeight = this.config.cellSize * Math.sqrt(3);
      const horizSpacing = hexWidth * 0.75;

      const col = Math.round(x / horizSpacing);
      const row = Math.round((y - (col % 2 === 1 ? hexHeight / 2 : 0)) / hexHeight);

      return {
        x: col * horizSpacing,
        y: row * hexHeight + (col % 2 === 1 ? hexHeight / 2 : 0),
      };
    }
  }

  /**
   * Compare two bounds for equality
   */
  private boundsEqual(a: Bounds, b: Bounds): boolean {
    return (
      Math.abs(a.x - b.x) < 1 &&
      Math.abs(a.y - b.y) < 1 &&
      Math.abs(a.width - b.width) < 1 &&
      Math.abs(a.height - b.height) < 1
    );
  }

  /**
   * Destroy the grid
   */
  destroy(): void {
    this.graphics.destroy();
  }
}
```

#### 1.6.3 src/core/canvas/InputHandler.ts

```typescript
import type { Vector2, InputState } from '@/types';

export type InputEventType =
  | 'pointerdown'
  | 'pointermove'
  | 'pointerup'
  | 'pointercancel'
  | 'wheel';

export interface InputEventCallback {
  (state: InputState, event: PointerEvent | WheelEvent): void;
}

/**
 * Input handler for canvas interactions
 * Normalizes mouse and touch input
 */
export class InputHandler {
  private element: HTMLElement;
  private state: InputState;
  private listeners: Map<InputEventType, Set<InputEventCallback>>;
  private worldTransform: (screen: Vector2) => Vector2;

  constructor(
    element: HTMLElement,
    worldTransform: (screen: Vector2) => Vector2
  ) {
    this.element = element;
    this.worldTransform = worldTransform;
    this.listeners = new Map();

    this.state = {
      screenPosition: { x: 0, y: 0 },
      worldPosition: { x: 0, y: 0 },
      isPrimaryDown: false,
      isSecondaryDown: false,
      isMiddleDown: false,
      modifiers: {
        shift: false,
        ctrl: false,
        alt: false,
        meta: false,
      },
      pressure: 0,
    };

    this.setupListeners();
  }

  /**
   * Subscribe to input events
   */
  on(type: InputEventType, callback: InputEventCallback): () => void {
    if (!this.listeners.has(type)) {
      this.listeners.set(type, new Set());
    }
    this.listeners.get(type)!.add(callback);

    return () => {
      this.listeners.get(type)?.delete(callback);
    };
  }

  /**
   * Get current input state
   */
  getState(): InputState {
    return { ...this.state };
  }

  /**
   * Update world transform function (when camera changes)
   */
  setWorldTransform(transform: (screen: Vector2) => Vector2): void {
    this.worldTransform = transform;
  }

  /**
   * Setup DOM event listeners
   */
  private setupListeners(): void {
    this.element.addEventListener('pointerdown', this.handlePointerDown);
    this.element.addEventListener('pointermove', this.handlePointerMove);
    this.element.addEventListener('pointerup', this.handlePointerUp);
    this.element.addEventListener('pointercancel', this.handlePointerCancel);
    this.element.addEventListener('pointerleave', this.handlePointerLeave);
    this.element.addEventListener('wheel', this.handleWheel, { passive: false });
    this.element.addEventListener('contextmenu', this.handleContextMenu);

    // Prevent default touch behaviors
    this.element.style.touchAction = 'none';
  }

  /**
   * Update state from pointer event
   */
  private updateStateFromEvent(event: PointerEvent): void {
    const rect = this.element.getBoundingClientRect();
    this.state.screenPosition = {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
    };
    this.state.worldPosition = this.worldTransform(this.state.screenPosition);
    this.state.modifiers = {
      shift: event.shiftKey,
      ctrl: event.ctrlKey,
      alt: event.altKey,
      meta: event.metaKey,
    };
    this.state.pressure = event.pressure || (this.state.isPrimaryDown ? 1 : 0);
  }

  /**
   * Emit event to listeners
   */
  private emit(type: InputEventType, event: PointerEvent | WheelEvent): void {
    const callbacks = this.listeners.get(type);
    if (callbacks) {
      callbacks.forEach(callback => callback({ ...this.state }, event));
    }
  }

  private handlePointerDown = (event: PointerEvent): void => {
    this.updateStateFromEvent(event);

    switch (event.button) {
      case 0:
        this.state.isPrimaryDown = true;
        break;
      case 1:
        this.state.isMiddleDown = true;
        break;
      case 2:
        this.state.isSecondaryDown = true;
        break;
    }

    this.element.setPointerCapture(event.pointerId);
    this.emit('pointerdown', event);
  };

  private handlePointerMove = (event: PointerEvent): void => {
    this.updateStateFromEvent(event);
    this.emit('pointermove', event);
  };

  private handlePointerUp = (event: PointerEvent): void => {
    this.updateStateFromEvent(event);

    switch (event.button) {
      case 0:
        this.state.isPrimaryDown = false;
        break;
      case 1:
        this.state.isMiddleDown = false;
        break;
      case 2:
        this.state.isSecondaryDown = false;
        break;
    }

    this.element.releasePointerCapture(event.pointerId);
    this.emit('pointerup', event);
  };

  private handlePointerCancel = (event: PointerEvent): void => {
    this.state.isPrimaryDown = false;
    this.state.isSecondaryDown = false;
    this.state.isMiddleDown = false;
    this.emit('pointercancel', event);
  };

  private handlePointerLeave = (event: PointerEvent): void => {
    // Don't reset button state on leave if we have capture
    this.updateStateFromEvent(event);
  };

  private handleWheel = (event: WheelEvent): void => {
    event.preventDefault();

    const rect = this.element.getBoundingClientRect();
    this.state.screenPosition = {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
    };
    this.state.worldPosition = this.worldTransform(this.state.screenPosition);
    this.state.modifiers = {
      shift: event.shiftKey,
      ctrl: event.ctrlKey,
      alt: event.altKey,
      meta: event.metaKey,
    };

    this.emit('wheel', event);
  };

  private handleContextMenu = (event: Event): void => {
    event.preventDefault();
  };

  /**
   * Cleanup event listeners
   */
  destroy(): void {
    this.element.removeEventListener('pointerdown', this.handlePointerDown);
    this.element.removeEventListener('pointermove', this.handlePointerMove);
    this.element.removeEventListener('pointerup', this.handlePointerUp);
    this.element.removeEventListener('pointercancel', this.handlePointerCancel);
    this.element.removeEventListener('pointerleave', this.handlePointerLeave);
    this.element.removeEventListener('wheel', this.handleWheel);
    this.element.removeEventListener('contextmenu', this.handleContextMenu);
  }
}
```

#### 1.6.4 src/core/canvas/CanvasEngine.ts

```typescript
import { Application, Container, Graphics } from 'pixi.js';
import { Camera } from './Camera';
import { Grid } from './Grid';
import { InputHandler } from './InputHandler';
import type { Vector2, GridConfig, Viewport, CameraConfig } from '@/types';
import { DEFAULT_CANVAS_DIMENSIONS, CANVAS_CONSTANTS } from '@/constants';

export interface CanvasEngineConfig {
  backgroundColor?: string;
  width?: number;
  height?: number;
  cameraConfig?: Partial<CameraConfig>;
  gridConfig?: Partial<GridConfig>;
}

export interface CanvasEngineCallbacks {
  onViewportChange?: (viewport: Viewport) => void;
  onGridChange?: (config: GridConfig) => void;
  onPointerDown?: (position: Vector2, worldPosition: Vector2) => void;
  onPointerMove?: (position: Vector2, worldPosition: Vector2) => void;
  onPointerUp?: (position: Vector2, worldPosition: Vector2) => void;
}

/**
 * Main canvas engine wrapping Pixi.js
 * Manages rendering, camera, grid, and input
 */
export class CanvasEngine {
  private app: Application;
  private worldContainer: Container;
  private camera: Camera;
  private grid: Grid;
  private inputHandler: InputHandler;
  private callbacks: CanvasEngineCallbacks;
  private isInitialized: boolean = false;
  private isPanning: boolean = false;
  private lastPointerPosition: Vector2 = { x: 0, y: 0 };

  // Background
  private background: Graphics;
  private canvasWidth: number;
  private canvasHeight: number;

  constructor() {
    this.app = new Application();
    this.worldContainer = new Container();
    this.background = new Graphics();
    this.canvasWidth = DEFAULT_CANVAS_DIMENSIONS.width;
    this.canvasHeight = DEFAULT_CANVAS_DIMENSIONS.height;
    this.callbacks = {};

    // These will be properly initialized in init()
    this.camera = null!;
    this.grid = null!;
    this.inputHandler = null!;
  }

  /**
   * Initialize the canvas engine
   */
  async init(
    container: HTMLElement,
    config: CanvasEngineConfig = {},
    callbacks: CanvasEngineCallbacks = {}
  ): Promise<void> {
    if (this.isInitialized) {
      console.warn('CanvasEngine already initialized');
      return;
    }

    this.callbacks = callbacks;
    this.canvasWidth = config.width ?? DEFAULT_CANVAS_DIMENSIONS.width;
    this.canvasHeight = config.height ?? DEFAULT_CANVAS_DIMENSIONS.height;

    // Initialize Pixi Application
    await this.app.init({
      background: config.backgroundColor ?? CANVAS_CONSTANTS.DEFAULT_BACKGROUND_COLOR,
      resizeTo: container,
      antialias: true,
      resolution: window.devicePixelRatio || 1,
      autoDensity: true,
    });

    container.appendChild(this.app.canvas);

    // Setup world container
    this.app.stage.addChild(this.worldContainer);

    // Setup background
    this.worldContainer.addChild(this.background);
    this.drawBackground();

    // Setup camera
    this.camera = new Camera(this.worldContainer, config.cameraConfig);
    this.camera.setScreenSize(this.app.screen.width, this.app.screen.height);

    // Setup grid
    const gridContainer = new Container();
    this.worldContainer.addChild(gridContainer);
    this.grid = new Grid(gridContainer, config.gridConfig);

    // Setup input handler
    this.inputHandler = new InputHandler(
      this.app.canvas as HTMLCanvasElement,
      (screen) => this.camera.screenToWorld(screen)
    );

    this.setupInputHandlers();
    this.setupResizeHandler();

    // Start render loop
    this.app.ticker.add(this.update);

    this.isInitialized = true;

    // Initial viewport update
    this.emitViewportChange();
  }

  /**
   * Draw canvas background
   */
  private drawBackground(): void {
    this.background.clear();
    this.background.rect(0, 0, this.canvasWidth, this.canvasHeight);
    this.background.fill({ color: 0x1a1a2e });

    // Draw canvas border
    this.background.setStrokeStyle({ width: 2, color: 0x4a4a6a });
    this.background.rect(0, 0, this.canvasWidth, this.canvasHeight);
    this.background.stroke();
  }

  /**
   * Setup input event handlers
   */
  private setupInputHandlers(): void {
    this.inputHandler.on('pointerdown', (state, event) => {
      if (event instanceof PointerEvent) {
        // Middle mouse or space+click for panning
        if (state.isMiddleDown || (state.isPrimaryDown && state.modifiers.shift)) {
          this.isPanning = true;
          this.lastPointerPosition = { ...state.screenPosition };
        } else if (state.isPrimaryDown) {
          this.callbacks.onPointerDown?.(state.screenPosition, state.worldPosition);
        }
      }
    });

    this.inputHandler.on('pointermove', (state) => {
      if (this.isPanning) {
        const delta = {
          x: state.screenPosition.x - this.lastPointerPosition.x,
          y: state.screenPosition.y - this.lastPointerPosition.y,
        };
        this.camera.panBy({ x: -delta.x, y: -delta.y });
        this.lastPointerPosition = { ...state.screenPosition };
      } else {
        this.callbacks.onPointerMove?.(state.screenPosition, state.worldPosition);
      }
    });

    this.inputHandler.on('pointerup', (state) => {
      if (this.isPanning) {
        this.isPanning = false;
      } else {
        this.callbacks.onPointerUp?.(state.screenPosition, state.worldPosition);
      }
    });

    this.inputHandler.on('wheel', (state, event) => {
      if (event instanceof WheelEvent) {
        this.camera.zoomBy(event.deltaY, state.screenPosition);
      }
    });
  }

  /**
   * Setup window resize handler
   */
  private setupResizeHandler(): void {
    const resizeObserver = new ResizeObserver(() => {
      this.camera.setScreenSize(this.app.screen.width, this.app.screen.height);
      this.emitViewportChange();
    });

    resizeObserver.observe(this.app.canvas);
  }

  /**
   * Main update loop
   */
  private update = (): void => {
    const deltaTime = this.app.ticker.deltaMS / 1000;

    // Update camera (smooth movement)
    const cameraChanged = this.camera.update(deltaTime);

    if (cameraChanged) {
      this.emitViewportChange();
    }

    // Update grid
    const viewport = this.camera.getViewport();
    this.grid.render(viewport.bounds, viewport.zoom);
  };

  /**
   * Emit viewport change to callback
   */
  private emitViewportChange(): void {
    const viewport = this.camera.getViewport();
    this.callbacks.onViewportChange?.(viewport);

    // Update input handler's world transform
    this.inputHandler.setWorldTransform((screen) => this.camera.screenToWorld(screen));
  }

  // Public API

  /**
   * Get the world container for adding content
   */
  getWorldContainer(): Container {
    return this.worldContainer;
  }

  /**
   * Get current viewport
   */
  getViewport(): Viewport {
    return this.camera.getViewport();
  }

  /**
   * Set zoom level
   */
  setZoom(zoom: number): void {
    this.camera.setZoom(zoom);
  }

  /**
   * Set center position
   */
  setCenter(center: Vector2): void {
    this.camera.setCenter(center);
  }

  /**
   * Reset camera to default
   */
  resetCamera(): void {
    this.camera.reset();
  }

  /**
   * Fit camera to canvas bounds
   */
  fitToCanvas(): void {
    this.camera.fitToBounds({
      x: 0,
      y: 0,
      width: this.canvasWidth,
      height: this.canvasHeight,
    });
  }

  /**
   * Update grid configuration
   */
  setGridConfig(config: Partial<GridConfig>): void {
    this.grid.setConfig(config);
    this.callbacks.onGridChange?.(this.grid.getConfig());
  }

  /**
   * Get grid configuration
   */
  getGridConfig(): GridConfig {
    return this.grid.getConfig();
  }

  /**
   * Snap position to grid
   */
  snapToGrid(x: number, y: number): Vector2 {
    return this.grid.snapToGrid(x, y);
  }

  /**
   * Convert screen to world coordinates
   */
  screenToWorld(screen: Vector2): Vector2 {
    return this.camera.screenToWorld(screen);
  }

  /**
   * Convert world to screen coordinates
   */
  worldToScreen(world: Vector2): Vector2 {
    return this.camera.worldToScreen(world);
  }

  /**
   * Get canvas dimensions
   */
  getCanvasDimensions(): { width: number; height: number } {
    return { width: this.canvasWidth, height: this.canvasHeight };
  }

  /**
   * Destroy the engine and cleanup
   */
  destroy(): void {
    if (!this.isInitialized) return;

    this.app.ticker.remove(this.update);
    this.inputHandler.destroy();
    this.grid.destroy();
    this.app.destroy(true, { children: true });
    this.isInitialized = false;
  }
}
```

#### 1.6.5 src/core/canvas/index.ts

```typescript
export { CanvasEngine } from './CanvasEngine';
export type { CanvasEngineConfig, CanvasEngineCallbacks } from './CanvasEngine';
export { Camera } from './Camera';
export { Grid } from './Grid';
export { InputHandler } from './InputHandler';
export type { InputEventType, InputEventCallback } from './InputHandler';
```

#### 1.6.6 src/core/index.ts

```typescript
export * from './canvas';
```

---

### 1.7 Zustand Stores

#### 1.7.1 src/stores/useCanvasStore.ts

```typescript
import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import type { Viewport, GridConfig } from '@/types';
import { DEFAULT_VIEWPORT, DEFAULT_GRID_CONFIG, DEFAULT_CANVAS_DIMENSIONS } from '@/constants';

interface CanvasStoreState {
  // Viewport
  viewport: Viewport;
  setViewport: (viewport: Viewport) => void;

  // Grid
  grid: GridConfig;
  setGrid: (config: Partial<GridConfig>) => void;
  toggleGrid: () => void;
  toggleSnapToGrid: () => void;

  // Canvas dimensions
  dimensions: { width: number; height: number };
  setDimensions: (width: number, height: number) => void;

  // Interaction state
  isInteracting: boolean;
  setIsInteracting: (value: boolean) => void;
}

export const useCanvasStore = create<CanvasStoreState>()(
  immer((set) => ({
    // Viewport
    viewport: DEFAULT_VIEWPORT,
    setViewport: (viewport) =>
      set((state) => {
        state.viewport = viewport;
      }),

    // Grid
    grid: DEFAULT_GRID_CONFIG,
    setGrid: (config) =>
      set((state) => {
        Object.assign(state.grid, config);
      }),
    toggleGrid: () =>
      set((state) => {
        state.grid.visible = !state.grid.visible;
      }),
    toggleSnapToGrid: () =>
      set((state) => {
        state.grid.snapToGrid = !state.grid.snapToGrid;
      }),

    // Canvas dimensions
    dimensions: DEFAULT_CANVAS_DIMENSIONS,
    setDimensions: (width, height) =>
      set((state) => {
        state.dimensions = { width, height };
      }),

    // Interaction state
    isInteracting: false,
    setIsInteracting: (value) =>
      set((state) => {
        state.isInteracting = value;
      }),
  }))
);
```

#### 1.7.2 src/stores/useToolStore.ts

```typescript
import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import type { ToolType, ToolOptions, BrushToolOptions, ShapeToolOptions } from '@/types';
import { DEFAULT_TOOL_COLORS } from '@/constants';

const defaultBrushOptions: BrushToolOptions = {
  size: 20,
  opacity: 1,
  primaryColor: DEFAULT_TOOL_COLORS.primary,
  secondaryColor: DEFAULT_TOOL_COLORS.secondary,
  hardness: 0.8,
  spacing: 0.25,
  pressureSensitivity: true,
  pressureAffectsSize: true,
  pressureAffectsOpacity: false,
};

const defaultShapeOptions: ShapeToolOptions = {
  size: 20,
  opacity: 1,
  primaryColor: DEFAULT_TOOL_COLORS.primary,
  secondaryColor: DEFAULT_TOOL_COLORS.secondary,
  shapeType: 'rectangle',
  fill: true,
  stroke: true,
  strokeWidth: 2,
  cornerRadius: 0,
  polygonSides: 6,
};

interface ToolStoreState {
  // Active tool
  activeTool: ToolType;
  previousTool: ToolType;
  setActiveTool: (tool: ToolType) => void;
  swapToPreviousTool: () => void;

  // Tool options
  options: Record<ToolType, ToolOptions>;
  setToolOptions: <T extends ToolOptions>(tool: ToolType, options: Partial<T>) => void;
  getToolOptions: <T extends ToolOptions>(tool: ToolType) => T;

  // Tool state
  isToolActive: boolean;
  setIsToolActive: (value: boolean) => void;

  // Color shortcuts
  setPrimaryColor: (color: string) => void;
  setSecondaryColor: (color: string) => void;
  swapColors: () => void;
}

export const useToolStore = create<ToolStoreState>()(
  immer((set, get) => ({
    // Active tool
    activeTool: 'brush',
    previousTool: 'select',
    setActiveTool: (tool) =>
      set((state) => {
        if (state.activeTool !== tool) {
          state.previousTool = state.activeTool;
          state.activeTool = tool;
        }
      }),
    swapToPreviousTool: () =>
      set((state) => {
        const temp = state.activeTool;
        state.activeTool = state.previousTool;
        state.previousTool = temp;
      }),

    // Tool options
    options: {
      select: { ...defaultBrushOptions },
      pan: { ...defaultBrushOptions },
      brush: { ...defaultBrushOptions },
      eraser: { ...defaultBrushOptions, size: 30 },
      shape: { ...defaultShapeOptions },
      path: { ...defaultBrushOptions, size: 4 },
      fill: { ...defaultBrushOptions },
      stamp: { ...defaultBrushOptions, size: 48 },
      text: {
        ...defaultBrushOptions,
        fontFamily: 'IM Fell English',
        fontSize: 24,
        fontWeight: 400,
        fontStyle: 'normal' as const,
        textAlign: 'left' as const,
      },
      eyedropper: { ...defaultBrushOptions },
    },
    setToolOptions: (tool, options) =>
      set((state) => {
        Object.assign(state.options[tool], options);
      }),
    getToolOptions: (tool) => get().options[tool] as any,

    // Tool state
    isToolActive: false,
    setIsToolActive: (value) =>
      set((state) => {
        state.isToolActive = value;
      }),

    // Color shortcuts
    setPrimaryColor: (color) =>
      set((state) => {
        const tool = state.activeTool;
        (state.options[tool] as any).primaryColor = color;
      }),
    setSecondaryColor: (color) =>
      set((state) => {
        const tool = state.activeTool;
        (state.options[tool] as any).secondaryColor = color;
      }),
    swapColors: () =>
      set((state) => {
        const tool = state.activeTool;
        const opts = state.options[tool] as any;
        const temp = opts.primaryColor;
        opts.primaryColor = opts.secondaryColor;
        opts.secondaryColor = temp;
      }),
  }))
);
```

#### 1.7.3 src/stores/useLayerStore.ts

```typescript
import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { nanoid } from 'nanoid';
import type { Layer, LayerState, CreateLayerOptions, BlendMode } from '@/types';

interface LayerStoreState extends LayerState {
  // Layer CRUD
  createLayer: (options: CreateLayerOptions) => string;
  deleteLayer: (id: string) => void;
  duplicateLayer: (id: string) => string | null;

  // Layer properties
  setLayerName: (id: string, name: string) => void;
  setLayerVisibility: (id: string, visible: boolean) => void;
  toggleLayerVisibility: (id: string) => void;
  setLayerLocked: (id: string, locked: boolean) => void;
  toggleLayerLocked: (id: string) => void;
  setLayerOpacity: (id: string, opacity: number) => void;
  setLayerBlendMode: (id: string, blendMode: BlendMode) => void;

  // Layer ordering
  moveLayer: (id: string, direction: 'up' | 'down') => void;
  reorderLayers: (newOrder: string[]) => void;

  // Selection
  selectLayer: (id: string, addToSelection?: boolean) => void;
  deselectLayer: (id: string) => void;
  clearSelection: () => void;
  setActiveLayer: (id: string | null) => void;

  // Groups
  toggleGroupExpanded: (id: string) => void;
}

export const useLayerStore = create<LayerStoreState>()(
  immer((set, get) => ({
    // Initial state
    layers: {},
    rootOrder: [],
    selectedIds: [],
    activeId: null,

    // Layer CRUD
    createLayer: (options) => {
      const id = nanoid();
      const now = Date.now();
      const existingLayers = Object.keys(get().layers).length;

      const layer: Layer = {
        id,
        name: options.name ?? `Layer ${existingLayers + 1}`,
        type: options.type,
        visible: options.visible ?? true,
        locked: false,
        opacity: options.opacity ?? 1,
        blendMode: options.blendMode ?? 'normal',
        order: existingLayers,
        parentId: options.parentId ?? null,
        isGroup: false,
        isExpanded: true,
        bounds: null,
        metadata: options.metadata ?? {},
        createdAt: now,
        updatedAt: now,
      };

      set((state) => {
        state.layers[id] = layer;
        if (!layer.parentId) {
          state.rootOrder.push(id);
        }
        state.activeId = id;
        state.selectedIds = [id];
      });

      return id;
    },

    deleteLayer: (id) =>
      set((state) => {
        const layer = state.layers[id];
        if (!layer) return;

        // Remove from parent or root
        if (layer.parentId) {
          const parent = state.layers[layer.parentId];
          if (parent && 'childIds' in parent) {
            (parent as any).childIds = (parent as any).childIds.filter(
              (cid: string) => cid !== id
            );
          }
        } else {
          state.rootOrder = state.rootOrder.filter((rid) => rid !== id);
        }

        // Remove from selection
        state.selectedIds = state.selectedIds.filter((sid) => sid !== id);
        if (state.activeId === id) {
          state.activeId = state.rootOrder[0] ?? null;
        }

        delete state.layers[id];
      }),

    duplicateLayer: (id) => {
      const layer = get().layers[id];
      if (!layer) return null;

      const newId = nanoid();
      const now = Date.now();

      set((state) => {
        state.layers[newId] = {
          ...layer,
          id: newId,
          name: `${layer.name} Copy`,
          createdAt: now,
          updatedAt: now,
        };

        const index = state.rootOrder.indexOf(id);
        if (index !== -1) {
          state.rootOrder.splice(index + 1, 0, newId);
        } else {
          state.rootOrder.push(newId);
        }

        state.activeId = newId;
        state.selectedIds = [newId];
      });

      return newId;
    },

    // Layer properties
    setLayerName: (id, name) =>
      set((state) => {
        if (state.layers[id]) {
          state.layers[id].name = name;
          state.layers[id].updatedAt = Date.now();
        }
      }),

    setLayerVisibility: (id, visible) =>
      set((state) => {
        if (state.layers[id]) {
          state.layers[id].visible = visible;
          state.layers[id].updatedAt = Date.now();
        }
      }),

    toggleLayerVisibility: (id) =>
      set((state) => {
        if (state.layers[id]) {
          state.layers[id].visible = !state.layers[id].visible;
          state.layers[id].updatedAt = Date.now();
        }
      }),

    setLayerLocked: (id, locked) =>
      set((state) => {
        if (state.layers[id]) {
          state.layers[id].locked = locked;
          state.layers[id].updatedAt = Date.now();
        }
      }),

    toggleLayerLocked: (id) =>
      set((state) => {
        if (state.layers[id]) {
          state.layers[id].locked = !state.layers[id].locked;
          state.layers[id].updatedAt = Date.now();
        }
      }),

    setLayerOpacity: (id, opacity) =>
      set((state) => {
        if (state.layers[id]) {
          state.layers[id].opacity = Math.max(0, Math.min(1, opacity));
          state.layers[id].updatedAt = Date.now();
        }
      }),

    setLayerBlendMode: (id, blendMode) =>
      set((state) => {
        if (state.layers[id]) {
          state.layers[id].blendMode = blendMode;
          state.layers[id].updatedAt = Date.now();
        }
      }),

    // Layer ordering
    moveLayer: (id, direction) =>
      set((state) => {
        const index = state.rootOrder.indexOf(id);
        if (index === -1) return;

        const newIndex = direction === 'up' ? index + 1 : index - 1;
        if (newIndex < 0 || newIndex >= state.rootOrder.length) return;

        const temp = state.rootOrder[index];
        state.rootOrder[index] = state.rootOrder[newIndex];
        state.rootOrder[newIndex] = temp;
      }),

    reorderLayers: (newOrder) =>
      set((state) => {
        state.rootOrder = newOrder;
      }),

    // Selection
    selectLayer: (id, addToSelection = false) =>
      set((state) => {
        if (addToSelection) {
          if (!state.selectedIds.includes(id)) {
            state.selectedIds.push(id);
          }
        } else {
          state.selectedIds = [id];
        }
        state.activeId = id;
      }),

    deselectLayer: (id) =>
      set((state) => {
        state.selectedIds = state.selectedIds.filter((sid) => sid !== id);
        if (state.activeId === id) {
          state.activeId = state.selectedIds[0] ?? null;
        }
      }),

    clearSelection: () =>
      set((state) => {
        state.selectedIds = [];
      }),

    setActiveLayer: (id) =>
      set((state) => {
        state.activeId = id;
        if (id && !state.selectedIds.includes(id)) {
          state.selectedIds = [id];
        }
      }),

    // Groups
    toggleGroupExpanded: (id) =>
      set((state) => {
        if (state.layers[id]) {
          state.layers[id].isExpanded = !state.layers[id].isExpanded;
        }
      }),
  }))
);
```

#### 1.7.4 src/stores/index.ts

```typescript
export { useCanvasStore } from './useCanvasStore';
export { useToolStore } from './useToolStore';
export { useLayerStore } from './useLayerStore';
```

---

### 1.8 Verification Checklist for Phase 1

After implementing Phase 1, verify the following:

```
□ Project builds without errors (npm run build)
□ Development server starts (npm run dev)
□ Canvas renders with dark background
□ Pan with middle mouse button or Shift+drag
□ Zoom with scroll wheel (smooth animation)
□ Grid is visible and scales with zoom
□ Grid can be toggled via store
□ Viewport state updates in store
□ No TypeScript errors
□ Responsive to window resize
□ Touch events work on mobile (basic pan/zoom)
```
