# PlanetPlanner Codebase Review Checklist

> Generated: 2026-02-27
> Use this document to track fixes. Check off items as they're completed.

---

## 1. Critical Issues (Fix First)

### 1.1 Memory Leaks in Canvas/Texture Creation
- [x] **TerrainRenderer.ts** — `render()` creates a new `document.createElement('canvas')` and `Texture.from(canvas)` each call but never disposes the old ones. Repeated generation = growing memory.
- [x] **ParchmentGenerator.ts** — Same pattern in `generate()` and `generateTiling()`. Canvas elements are created but never cleaned up.
- [x] **CanvasEngine.ts** — A `ResizeObserver` is created but never `.disconnect()`ed in `destroy()`.

### 1.2 Undo/Redo is Incomplete
- [x] History store (`useHistoryStore`) stores raw PixiJS `Container` objects which can't be serialized and don't represent full state.
- [x] Only layer graphics operations are handled — brush strokes, terrain edits, feature changes etc. are not tracked.
- [x] Design and implement a proper serializable undo/redo system.

### 1.3 Pixi v8 Workarounds are Fragile
- [x] **Layer.ts** — Re-enabled blend modes. Pixi v8 accepts CSS blend mode names directly. Added `BLEND_MODE_MAP` and apply in `applyProperties()`.
- [x] **Layer.ts** — Removed visibility toggle hacks from both `applyProperties()` and `addContent()`. Pixi v8.5 properly propagates render state changes from `addChild()` and property setters.
- [x] **LayerManager.ts** — `setChildIndex` already worked around: layers are removed and re-added in order instead. No further fix needed.

### 1.4 Broken/Placeholder Tools
- [x] **EyedropperTool.ts** — Implemented real pixel extraction via Pixi `renderer.extract.canvas()`. Picks color at screen coordinates accounting for DPR. Wired `onColorPicked` callback through ToolManager → useToolStore to update the active tool's primary color.
- [x] **FillTool.ts** — Implemented scanline flood fill algorithm. Extracts rendered scene, performs efficient queue-based scanline fill with tolerance-based color matching, creates a Sprite positioned in world space, and adds to active layer.
- [x] **Terrain generation** — Connected LandmassGenerator → TerrainRenderer. Added `ElevationMap.setData()` for external heightmaps, `TerrainRenderer.generateFromResult()` that uses the heightmap + landMask, and a `useEffect` in App.tsx that automatically renders generation results when they appear in the store. GenerationPanel no longer calls legacy `onGenerate()` callback.

---

## 2. High Priority (Will Cause Bugs)

### 2.1 Type Safety Bypasses
- [x] **PropertiesPanel.tsx:37-39** — Replaced `as unknown as` casts with conditional narrowing (`activeTool === 'shape' ? ... : null`). Also fixed `bg-accent-600` to `bg-parchment-600`.
- [x] **FeatureToolsPanel.tsx:280,358** — Replaced `as any` with typed indexed access (`ForestBrushSettings['forestType']`, `LakeShapeSettings['type']`).
- [x] **ToolManager.ts:260** — Added `deltaTime` parameter to `createContext()` instead of mutating the returned object.

### 2.2 Logic Errors
- [x] **ElevationMap.ts** — Erosion simulation can produce negative elevation values. Add `Math.max(0, ...)` clamp.
- [x] **TerrainRenderer.ts** — `getPatternValue()` crosshatch pattern returns `(line1 + line2) * density` which can exceed 1.0. Clamp output.
- [x] **Camera.ts:175-181** — Dead branch: `else if (this.viewport.zoom !== this.targetZoom)` can never be true when the epsilon check already failed. Fixed to snap without re-triggering changed.
- [x] **LandmassGenerator.ts** — Coastline tracing silently truncates at 10,000 points. Increased limit to 50,000.

### 2.3 Missing Error Handling
- [x] **ParchmentGenerator.ts** — Uses non-null assertion `canvas.getContext('2d')!`. Add null check with meaningful error.
- [x] **RenderPipeline.ts** `exportToImage()` — If `canvas.toBlob()` never calls its callback, the promise hangs forever. Added 30s timeout.
- [x] Add a React Error Boundary component to catch and display crashes gracefully.
- [x] Surface terrain generation errors to the user (added `generationError` to terrain store + display in TerrainPanel).

---

## 3. Medium Priority (UX & Performance)

### 3.1 Performance Bottlenecks
- [x] **TerrainRenderer.ts** — Pre-computed biome color table (eliminates per-pixel `hexToRgb`/`getBlendedColor` calls), inlined pixel color computation, cached style values, bumped yield chunk size to 50k, bitwise rounding.
- [x] **LandmassGenerator.ts** — Replaced O(n²) per-query `distanceToLand()` with one-time O(width×height) BFS distance transform (`buildDistanceMap`) + O(1) lookups.
- [x] **BiomeRegistry.ts** — `getBlendedColor()` / `interpolateColor()` called per-pixel with no caching. Add memoization.

### 3.2 UI/Styling Issues
- [x] **PropertiesPanel.tsx:212** — Uses `bg-accent-600` which is not defined in `tailwind.config.js`. Changed to `bg-parchment-600 text-ink-950`.
- [x] **Tooltip component** — Reimplemented with working hover/focus state, delay, and positioned content.
- [x] **Select.tsx** — Removed legacy passthrough wrappers (`Select`, `SelectGroup`, `SelectValue`, `SelectTrigger`, `SelectContent`). Only `SimpleSelect` and `SelectItem` remain.

### 3.3 Accessibility Gaps
- [x] Add `aria-label` to toolbar buttons (undo, redo, all tools, grid, snap, zoom, fit, reset, export), layer panel buttons (add, visibility, lock, delete), and made layer rows keyboard-navigable with `role="button"` and `tabIndex`.
- [x] Add `<label>` elements for color picker `<input type="color">` fields. Wrapped with `<label>` and added `aria-label`, visual text marked `aria-hidden`.
- [x] Replaced raw `<input type="checkbox">` in PropertiesPanel with styled `Switch` component (Fill/Stroke toggles).
- [x] Added skip-to-canvas link in App.tsx (visible on focus, `sr-only` otherwise) and `id="main-canvas"` target.

### 3.4 Event Listener Cleanup
- [x] **useCanvasEngine.ts** — Captured `containerRef.current` into a local variable before adding listeners, so cleanup always removes from the same element.

---

## 4. Low Priority (Technical Debt & Polish)

### 4.1 Console Logging in Production
- [x] Created `src/utils/debug.ts` with dev-only `debug.log`/`debug.warn` (no-ops in production). Replaced all 72 `console.log` and 4 `console.warn` calls across 12 files. `console.error` calls preserved as-is.

### 4.2 Magic Numbers
- [x] **LandmassGenerator.ts** — Extracted and documented constants: `PLATE_SCALE_FACTOR`, `COASTLINE_SEARCH_RADIUS`, `MIN_CONTINENT_PIXELS`, `PLATE_BOUNDARY_THRESHOLD`.

### 4.3 Missing Input Validation
- [x] **GenerationPanel.tsx** — Seed input already handles all strings gracefully via `parseSeed()` (tries hex, then number, then string hash). No fix needed.
- [x] **Slider components** — Added `Math.min/max` clamping on both displayed value and `onValueChange` callback, plus divide-by-zero guard when `min === max`.
- [x] **BiomeRegistry.ts** — Added `|| 0` fallback to all `parseInt(..., 16)` calls in `interpolateColor` to handle invalid hex gracefully.

### 4.4 Hardcoded Layout
- [x] Panels are fixed width — added responsive `w-48 lg:w-64` / `w-48 lg:w-panel` with `shrink-0`.
- [x] Status bar overflow — added `overflow-hidden`, `truncate`, `min-w-0`, `tabular-nums` for stable numeric display.

### 4.5 Duplicate Dependencies
- [x] Only `nanoid` is imported (in `useLayerStore.ts`). `uuid` and `@types/uuid` were unused — removed via `npm uninstall uuid @types/uuid`.

### 4.6 Dead Code Cleanup
- [x] Tooltip component was reimplemented (see §3.2).
- [x] Legacy Select passthrough wrappers removed (see §3.2).
- [x] **BaseTool.ts** — `onDeactivate` now wraps `removeChild` in try/catch to handle destroyed parent.

---

## Priority Order Summary

| Order | Area | Section |
|-------|------|---------|
| 1 | Memory leaks | §1.1 |
| 2 | Broken features | §1.4 |
| 3 | Type safety | §2.1 |
| 4 | Error handling | §2.3 |
| 5 | Performance | §3.1 |
| 6 | UI polish | §3.2, §3.3 |
| 7 | Pixi v8 hacks | §1.3 |
| 8 | Cleanup | §4.x |
