# PlanetPlanner Testing Guide

This document provides step-by-step testing instructions for the PlanetPlanner application. Use this guide to verify all features are working correctly.

---

## Prerequisites

1. Open the application in a browser (typically at `http://localhost:5173` during development)
2. Ensure the canvas loads and displays a dark background with a bordered canvas area
3. The UI should show: Toolbar (top), Properties Panel (left), Canvas (center), Layer Panel (right), Status Bar (bottom)

---

## Test 1: Basic UI Navigation

### 1.1 Properties Panel Tabs
- [ ] Click the "Tool" tab - should show tool options (Size, Opacity, Colors)
- [ ] Click the "Terrain" tab - should show terrain style settings
- [ ] Click the "World" tab - should show world generation controls with presets
- [ ] Click the "Features" tab - should show feature generation controls (Mountains, Rivers, Lakes, Forests, Climate)

### 1.2 Toolbar
- [ ] Verify toolbar shows tool icons (Select, Pan, Brush, Eraser, etc.)
- [ ] Click different tools and verify the Tool tab updates to show relevant options
- [ ] Verify zoom controls (+/-) work to zoom the canvas

### 1.3 Layer Panel
- [ ] Verify layer panel shows on the right side
- [ ] Should have at least one "background" layer listed
- [ ] Verify layer visibility toggle (eye icon) works

---

## Test 2: Canvas Interaction

### 2.1 Pan and Zoom
- [ ] Hold middle mouse button and drag - canvas should pan
- [ ] Hold Shift + left click and drag - canvas should pan
- [ ] Use mouse scroll wheel - canvas should zoom in/out
- [ ] Use toolbar zoom buttons - should zoom in/out

### 2.2 Cursor Position
- [ ] Move mouse over canvas
- [ ] Status bar at bottom should show cursor X,Y coordinates updating

---

## Test 3: World Generation (World Tab)

### 3.1 Preset Selection
- [ ] Open "World" tab in Properties Panel
- [ ] Change preset dropdown (Continental, Archipelago, Pangaea, etc.)
- [ ] Verify sliders update when preset changes

### 3.2 Seed Controls
- [ ] Click the dice icon to randomize seed
- [ ] Verify seed value changes in the input field
- [ ] Manually type a seed value and verify it's accepted

### 3.3 Generate World
- [ ] Click "Generate World" button
- [ ] Verify progress bar appears during generation
- [ ] Verify terrain appears on canvas after generation completes
- [ ] Terrain should show land masses with varying colors (biomes)

### 3.4 Regenerate with Different Settings
- [ ] Change a slider (e.g., Land Coverage, Continent Size)
- [ ] Click "Generate World" again
- [ ] Verify the terrain changes based on new settings

### 3.5 Terrain Noise Settings (expand section)
- [ ] Expand "Terrain Noise" section
- [ ] Adjust Scale slider - should affect terrain detail
- [ ] Adjust Octaves slider - should affect terrain complexity
- [ ] Regenerate and verify changes

### 3.6 Continent Shape Settings (expand section)
- [ ] Expand "Continent Shape" section
- [ ] Adjust Land Coverage slider
- [ ] Adjust Continent Size slider
- [ ] Regenerate and verify land/water ratio changes

### 3.7 Coastline Settings (expand section)
- [ ] Expand "Coastline" section
- [ ] Adjust Jaggedness slider
- [ ] Adjust Beach Width slider
- [ ] Regenerate and verify coastline appearance changes

---

## Test 4: Feature Generation (Features Tab)

**Important:** You must generate a world first (Test 3) before features can be generated.

### 4.1 Features Tab Access
- [ ] Click "Features" tab in Properties Panel
- [ ] Verify message "Generate a world first in the Generation tab" appears if no world generated
- [ ] After generating a world, the "Generate Features" button should be enabled

### 4.2 Mountain Settings
- [ ] Expand "Mountains" section (should be open by default)
- [ ] Toggle Mountains enabled/disabled using the switch
- [ ] Adjust "Range Count" slider (1-10)
- [ ] Adjust "Roughness" slider (0-1)
- [ ] Adjust "Isolated Peaks" slider (0-20)
- [ ] Toggle "Follow Tectonics" switch

### 4.3 River Settings
- [ ] Expand "Rivers" section
- [ ] Toggle Rivers enabled/disabled
- [ ] Adjust "Max Rivers" slider (1-50)
- [ ] Adjust "Width Multiplier" slider (0.5-3)
- [ ] Adjust "Erosion Strength" slider (0-0.5)
- [ ] Adjust "Meander Factor" slider (0-1)
- [ ] Toggle "Tributaries" switch

### 4.4 Lake Settings
- [ ] Expand "Lakes" section
- [ ] Toggle Lakes enabled/disabled
- [ ] Adjust "Max Lakes" slider (1-30)
- [ ] Adjust "Min Size" slider (10-100)
- [ ] Adjust "Max Size" slider (50-500)
- [ ] Toggle "Mountain Lakes" switch

### 4.5 Forest Settings
- [ ] Expand "Forests" section
- [ ] Toggle Forests enabled/disabled
- [ ] Adjust "Coverage Target" slider (0.1-0.7)
- [ ] Adjust "Moisture Threshold" slider (0.2-0.7)
- [ ] Adjust "Clustering" slider (0-1)
- [ ] Adjust "Edge Noise" slider (0-1)

### 4.6 Climate Settings
- [ ] Expand "Climate" section
- [ ] Toggle Climate enabled/disabled
- [ ] Adjust "Equator Position" slider (0.2-0.8)
- [ ] Adjust "Temperature Variation" slider (0-0.5)
- [ ] Adjust "Rain Shadow Strength" slider (0-1)
- [ ] Adjust "Ocean Moisture" slider (0.3-1)

### 4.7 Generate Features
- [ ] Click "Generate Features" button
- [ ] Verify progress bar shows with stage messages (climate, mountains, rivers, lakes, forests, biomes)
- [ ] Verify features appear on the canvas after generation

### 4.8 Feature Visibility Toggles (Header Icons)
- [ ] Click Mountain icon in Features header - mountains should toggle visibility
- [ ] Click Waves icon - rivers should toggle visibility
- [ ] Click Droplets icon - lakes should toggle visibility
- [ ] Click Trees icon - forests should toggle visibility
- [ ] Toggle each back on and verify features reappear

---

## Test 5: Feature Visual Verification

After generating features, visually verify:

### 5.1 Mountains
- [ ] Mountain peaks visible on terrain
- [ ] Mountains appear primarily in higher elevation areas
- [ ] If "Follow Tectonics" enabled, ranges should follow continental patterns
- [ ] Mountain symbols visible (triangular shapes in parchment style)

### 5.2 Rivers
- [ ] Rivers visible as blue lines
- [ ] Rivers flow from high elevation toward ocean/lakes
- [ ] River width varies (narrow at source, wider downstream)
- [ ] Rivers show meandering if meander factor > 0

### 5.3 Lakes
- [ ] Lakes visible as blue filled areas
- [ ] Lakes appear in terrain depressions
- [ ] Lake sizes vary within configured range
- [ ] Mountain lakes appear at high elevations (if enabled)

### 5.4 Forests
- [ ] Forest areas visible (tree symbols in parchment style)
- [ ] Forests cluster in appropriate moisture zones
- [ ] Forest density varies across regions
- [ ] Forests avoid high mountain peaks

---

## Test 6: Regeneration Tests

### 6.1 Regenerate Features with Different Settings
- [ ] Change mountain range count to maximum (10)
- [ ] Click "Generate Features"
- [ ] Verify more mountain ranges appear

- [ ] Change max rivers to maximum (50)
- [ ] Click "Generate Features"
- [ ] Verify more rivers appear

- [ ] Set forest coverage to maximum (0.7)
- [ ] Click "Generate Features"
- [ ] Verify forests cover more area

### 6.2 Disable Feature Types
- [ ] Disable Mountains (toggle off)
- [ ] Click "Generate Features"
- [ ] Verify no mountains appear but other features do

- [ ] Disable all features except Rivers
- [ ] Click "Generate Features"
- [ ] Verify only rivers appear

### 6.3 Regenerate World and Features
- [ ] Go to "World" tab
- [ ] Change seed and generate new world
- [ ] Go to "Features" tab
- [ ] Generate features on new world
- [ ] Verify features adapt to new terrain

---

## Test 7: Performance Tests

### 7.1 Generation Time
- [ ] Generate features with default settings
- [ ] Generation should complete in reasonable time (under 10 seconds for typical settings)
- [ ] No browser freezing during generation

### 7.2 Repeated Generation
- [ ] Generate features 5 times in a row
- [ ] Verify no memory issues or slowdown
- [ ] Previous features should be replaced, not accumulated

---

## Test 8: Edge Cases

### 8.1 Extreme Settings
- [ ] Set all feature counts to maximum values
- [ ] Generate features
- [ ] App should handle without crashing

### 8.2 Minimal Settings
- [ ] Set all feature counts to minimum values
- [ ] Generate features
- [ ] App should handle gracefully

### 8.3 No Land
- [ ] In World tab, set Land Coverage to minimum
- [ ] Generate world (mostly ocean)
- [ ] Generate features
- [ ] Rivers/forests should be minimal or none (no land to place them)

---

## Test 9: Terrain Style (Terrain Tab)

### 9.1 Style Blend
- [ ] Go to "Terrain" tab
- [ ] Adjust "Style Blend" slider
- [ ] Verify terrain appearance changes between realistic and parchment styles
- [ ] Features should also change style (e.g., mountain symbols vs shading)

### 9.2 Other Style Settings
- [ ] Adjust Coastline Intensity
- [ ] Adjust Hillshade Intensity
- [ ] Adjust Saturation
- [ ] Adjust Brightness
- [ ] Toggle Show Patterns
- [ ] Verify terrain appearance updates

---

## Test Summary Checklist

### Must Pass (Critical)
- [ ] World generation works
- [ ] Feature generation works after world generation
- [ ] All feature sections expand/collapse
- [ ] All sliders respond to changes
- [ ] Features appear on canvas
- [ ] Visibility toggles work

### Should Pass (Important)
- [ ] Mountains follow terrain (high elevation areas)
- [ ] Rivers flow downhill toward water
- [ ] Lakes appear in depressions
- [ ] Forests appear in appropriate climate zones
- [ ] Regeneration replaces previous features

### Nice to Have
- [ ] Style blend affects feature rendering
- [ ] Performance is smooth
- [ ] No console errors during normal operation

---

## Reporting Issues

When reporting issues, please include:
1. Steps to reproduce
2. Expected behavior
3. Actual behavior
4. Browser and version
5. Any console errors (F12 > Console tab)
6. Screenshot if visual issue

---

## Notes

- The app uses procedural generation, so results will vary with different seeds
- Feature generation requires a world to be generated first
- Some features depend on terrain characteristics (e.g., rivers need elevation differences)
- Parchment style shows symbolic representations; realistic style shows more naturalistic rendering
