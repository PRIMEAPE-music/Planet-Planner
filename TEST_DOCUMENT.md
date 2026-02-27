# Planet Planner - Test Document

This document provides comprehensive test cases for all implemented features in the Planet Planner application.

---

## Table of Contents

1. [Canvas & Rendering](#1-canvas--rendering)
2. [Camera Controls](#2-camera-controls)
3. [Grid System](#3-grid-system)
4. [Drawing Tools](#4-drawing-tools)
5. [Layer System](#5-layer-system)
6. [Terrain System](#6-terrain-system)
7. [Selection & Transformation](#7-selection--transformation)
8. [User Interface](#8-user-interface)
9. [Keyboard Shortcuts](#9-keyboard-shortcuts)
10. [Performance](#10-performance)

---

## 1. Canvas & Rendering

### 1.1 Initial Load
| Test | Steps | Expected Result | Pass/Fail |
|------|-------|-----------------|-----------|
| Canvas initialization | Launch application | Canvas renders with WebGL context | |
| Default view | Launch application | Canvas displays centered with default zoom | |
| Responsive resize | Resize browser window | Canvas resizes proportionally | |

### 1.2 WebGL Context
| Test | Steps | Expected Result | Pass/Fail |
|------|-------|-----------------|-----------|
| Context preservation | Minimize/restore browser | Canvas maintains rendering state | |
| High DPI support | Use high-resolution display | Canvas renders at device pixel ratio | |

---

## 2. Camera Controls

### 2.1 Panning
| Test | Steps | Expected Result | Pass/Fail |
|------|-------|-----------------|-----------|
| Middle mouse pan | Hold middle mouse + drag | Canvas pans in drag direction | |
| Shift + click pan | Hold Shift + left click + drag | Canvas pans in drag direction | |
| Pan tool | Select Hand tool (H), left click + drag | Canvas pans with grab cursor | |
| Pan boundaries | Pan to canvas edges | Smooth panning, no jitter | |

### 2.2 Zooming
| Test | Steps | Expected Result | Pass/Fail |
|------|-------|-----------------|-----------|
| Scroll wheel zoom in | Scroll up | Canvas zooms in toward cursor | |
| Scroll wheel zoom out | Scroll down | Canvas zooms out from cursor | |
| Zoom buttons | Click + / - in toolbar | Canvas zooms in/out from center | |
| Focal point zoom | Zoom while cursor over object | Zoom maintains cursor position | |
| Min/max zoom limits | Zoom extensively in/out | Zoom stops at min/max limits | |

### 2.3 View Controls
| Test | Steps | Expected Result | Pass/Fail |
|------|-------|-----------------|-----------|
| Fit to canvas | Click fit button in toolbar | View fits entire canvas | |
| Reset view | Click reset button in toolbar | View returns to default state | |

---

## 3. Grid System

### 3.1 Grid Display
| Test | Steps | Expected Result | Pass/Fail |
|------|-------|-----------------|-----------|
| Grid toggle on | Click grid button (enabled) | Grid overlay becomes visible | |
| Grid toggle off | Click grid button (disabled) | Grid overlay hides | |
| Grid scales with zoom | Zoom in/out with grid visible | Grid lines scale appropriately | |

### 3.2 Snap to Grid
| Test | Steps | Expected Result | Pass/Fail |
|------|-------|-----------------|-----------|
| Snap toggle on | Enable snap-to-grid | Snap indicator shows enabled | |
| Snap toggle off | Disable snap-to-grid | Snap indicator shows disabled | |
| Object snapping | Draw with snap enabled | Objects align to grid points | |
| Snap distance | Draw near grid line | Objects snap within threshold | |

---

## 4. Drawing Tools

### 4.1 Brush Tool (B)
| Test | Steps | Expected Result | Pass/Fail |
|------|-------|-----------------|-----------|
| Select brush | Press B or click brush icon | Brush tool activates | |
| Basic stroke | Click and drag on canvas | Continuous colored stroke appears | |
| Brush size | Adjust size slider, draw | Stroke width matches size setting | |
| Brush opacity | Adjust opacity slider, draw | Stroke transparency matches setting | |
| Brush hardness | Adjust hardness, draw | Stroke edges vary (soft to hard) | |
| Primary color | Change primary color, draw | Stroke uses selected color | |
| Brush preview | Hover over canvas | Circle preview shows at cursor | |
| Stroke smoothing | Draw with smoothing enabled | Stroke appears smoother | |
| Pressure sensitivity | Draw with stylus (if available) | Stroke varies with pressure | |

### 4.2 Eraser Tool (E)
| Test | Steps | Expected Result | Pass/Fail |
|------|-------|-----------------|-----------|
| Select eraser | Press E or click eraser icon | Eraser tool activates | |
| Erase content | Draw over existing strokes | Content is removed/erased | |
| Eraser size | Adjust size, erase | Eraser radius matches size | |
| Eraser preview | Hover over canvas | Eraser circle preview shows | |
| Pressure sensitivity | Erase with stylus (if available) | Erase intensity varies with pressure | |

### 4.3 Pan/Hand Tool (H)
| Test | Steps | Expected Result | Pass/Fail |
|------|-------|-----------------|-----------|
| Select hand tool | Press H or click hand icon | Hand tool activates | |
| Pan with hand | Click and drag | Canvas pans, grab cursor shows | |
| Release pan | Release mouse button | Panning stops smoothly | |

### 4.4 Path Tool (P)
| Test | Steps | Expected Result | Pass/Fail |
|------|-------|-----------------|-----------|
| Select path tool | Press P or click path icon | Path tool activates | |
| Add nodes | Click on canvas multiple times | Path nodes appear with connecting curves | |
| Adjust control points | Drag control handles | Curve shape adjusts smoothly | |
| Alt + drag mirror | Hold Alt, drag control point | Opposite handle mirrors movement | |
| Auto-smooth | Add nodes quickly | Control points auto-generate smoothly | |
| Close path (C) | Press C while drawing | Path closes into loop | |
| Complete path (Enter) | Press Enter | Path stops adding, remains editable | |
| Finalize path (Escape) | Press Escape | Path finalizes, becomes object | |
| Delete last node | Press Delete/Backspace | Last node removes | |
| Path stroke style | Adjust stroke width/color | Path appearance updates | |

### 4.5 Text Tool (T)
| Test | Steps | Expected Result | Pass/Fail |
|------|-------|-----------------|-----------|
| Select text tool | Press T or click text icon | Text tool activates | |
| Add text | Click on canvas | Text input appears | |
| Type text | Type in input field | Text shows in input | |
| Confirm text (Enter) | Press Enter | Text object placed on canvas | |
| Cancel text (Escape) | Press Escape | Text input cancels, no object | |
| Font family | Change font family setting | Text uses selected font | |
| Font size | Adjust font size | Text size changes | |
| Font weight | Toggle bold/weight | Text weight changes | |
| Font style | Toggle italic | Text style changes | |
| Text color | Change primary color | Text uses selected color | |
| Text opacity | Adjust opacity | Text transparency changes | |
| Empty text handling | Confirm without typing | No empty text object created | |

### 4.6 Stamp Tool (S)
| Test | Steps | Expected Result | Pass/Fail |
|------|-------|-----------------|-----------|
| Select stamp tool | Press S or click stamp icon | Stamp tool activates | |
| Place stamp | Click on canvas | Stamp icon appears at position | |
| Stamp rotation | Adjust rotation slider | Stamp rotates on placement | |
| Stamp scale | Adjust scale slider | Stamp size changes | |
| Stamp preview | Hover over canvas | Semi-transparent preview shows | |
| Stamp colors | Change primary/secondary color | Stamp uses selected colors | |

### 4.7 Shape Tool (U)
| Test | Steps | Expected Result | Pass/Fail |
|------|-------|-----------------|-----------|
| Select shape tool | Press U or click shape icon | Shape tool activates | |
| Draw rectangle | Select rectangle, click-drag | Rectangle shape appears | |
| Draw ellipse | Select ellipse, click-drag | Ellipse shape appears | |
| Draw polygon | Select polygon, click-drag | Regular polygon appears | |
| Draw freeform | Select freeform, draw freely | Closed freeform shape appears | |
| Fill toggle | Enable/disable fill | Shape fill shows/hides | |
| Stroke toggle | Enable/disable stroke | Shape stroke shows/hides | |
| Corner radius | Adjust radius (rectangle) | Rectangle corners round | |
| Polygon sides | Adjust sides count | Polygon vertex count changes | |
| Stroke width | Adjust stroke width | Shape outline thickness changes | |

### 4.8 Fill Tool (G)
| Test | Steps | Expected Result | Pass/Fail |
|------|-------|-----------------|-----------|
| Select fill tool | Press G or click fill icon | Fill tool activates | |
| Click to fill | Click on canvas | Fill action occurs at position | |
| Fill color | Change primary color | Fill uses selected color | |

### 4.9 Eyedropper Tool (I)
| Test | Steps | Expected Result | Pass/Fail |
|------|-------|-----------------|-----------|
| Select eyedropper | Press I or click eyedropper icon | Eyedropper tool activates | |
| Color preview | Hover over canvas | Color preview circle shows | |
| Pick color | Click on colored area | Color extracted (if implemented) | |

---

## 5. Layer System

### 5.1 Layer Creation & Deletion
| Test | Steps | Expected Result | Pass/Fail |
|------|-------|-----------------|-----------|
| Add layer | Click + button in layer panel | New layer appears in list | |
| Delete layer | Click delete (X) on layer | Layer removes from list | |
| Layer naming | Check layer names | Layers have descriptive names | |
| Multiple layers | Add several layers | All layers appear in panel | |

### 5.2 Layer Properties
| Test | Steps | Expected Result | Pass/Fail |
|------|-------|-----------------|-----------|
| Toggle visibility | Click eye icon | Layer shows/hides on canvas | |
| Toggle lock | Click lock icon | Layer becomes non-editable | |
| Draw on locked layer | Try to draw on locked layer | Drawing is prevented | |
| Layer opacity | Adjust layer opacity | Layer transparency changes | |
| Blend modes | Change layer blend mode | Blending effect applies | |

### 5.3 Layer Selection
| Test | Steps | Expected Result | Pass/Fail |
|------|-------|-----------------|-----------|
| Select layer | Click on layer in panel | Layer highlights as active | |
| Draw on active layer | Draw after selecting layer | Content appears on selected layer | |
| Switch layers | Select different layer, draw | Content appears on new active layer | |

### 5.4 Layer Ordering
| Test | Steps | Expected Result | Pass/Fail |
|------|-------|-----------------|-----------|
| Layer z-order | Create overlapping content on layers | Layers stack in correct order | |
| Reorder layers | Reorder layers (if implemented) | Visual stacking updates | |

---

## 6. Terrain System

### 6.1 Terrain Generation
| Test | Steps | Expected Result | Pass/Fail |
|------|-------|-----------------|-----------|
| Generate terrain | Click generate button | Terrain renders on canvas | |
| Seed input | Enter specific seed, generate | Same seed produces same terrain | |
| Different seeds | Generate with different seeds | Different terrain each time | |
| Preset selection | Select generation preset | Preset parameters apply | |
| Generation progress | Watch during generation | Progress indicator shows | |

### 6.2 Terrain Styling
| Test | Steps | Expected Result | Pass/Fail |
|------|-------|-----------------|-----------|
| Style blend | Adjust realistic/parchment slider | Terrain style transitions | |
| Coastline intensity | Adjust coastline slider | Coastline rendering changes | |
| Hillshade intensity | Adjust hillshade slider | Shadow/lighting changes | |
| Pattern visibility | Toggle patterns | Texture patterns show/hide | |
| Saturation | Adjust saturation | Color intensity changes | |
| Brightness | Adjust brightness | Overall brightness changes | |

### 6.3 Biomes
| Test | Steps | Expected Result | Pass/Fail |
|------|-------|-----------------|-----------|
| Biome colors | Inspect generated terrain | Different biomes have distinct colors | |
| Elevation coloring | Check mountains vs lowlands | Color varies by elevation | |
| Water rendering | Check ocean/lake areas | Water renders appropriately | |

### 6.4 Terrain Painting
| Test | Steps | Expected Result | Pass/Fail |
|------|-------|-----------------|-----------|
| Paint biome | Use terrain paint tool (if available) | Biome type changes at location | |
| Modify elevation | Use elevation tool (if available) | Height changes at location | |
| Falloff radius | Paint with different radius | Smooth transition at edges | |

---

## 7. Selection & Transformation

### 7.1 Selection Tool (V)
| Test | Steps | Expected Result | Pass/Fail |
|------|-------|-----------------|-----------|
| Select tool activation | Press V or click select icon | Selection tool activates | |
| Rectangle selection | Click and drag on canvas | Selection rectangle appears | |
| Select objects | Draw selection over objects | Objects within bounds selected | |
| Clear selection (Escape) | Press Escape | Selection clears | |
| Selection visual | Create selection | Dashed outline shows bounds | |

### 7.2 Moving Objects
| Test | Steps | Expected Result | Pass/Fail |
|------|-------|-----------------|-----------|
| Move selected | Drag selected objects | Objects move with cursor | |
| Arrow key nudge | Press arrow keys | Objects move 1px in direction | |
| Shift + arrow nudge | Hold Shift + arrow keys | Objects move 10px in direction | |

### 7.3 Resizing Objects
| Test | Steps | Expected Result | Pass/Fail |
|------|-------|-----------------|-----------|
| Resize handles | Select object | 8 resize handles appear | |
| Corner resize | Drag corner handle | Object scales proportionally | |
| Edge resize | Drag edge handle | Object stretches in one direction | |

### 7.4 Deleting Objects
| Test | Steps | Expected Result | Pass/Fail |
|------|-------|-----------------|-----------|
| Delete selected | Select objects, press Delete | Selected objects removed | |
| Backspace delete | Select objects, press Backspace | Selected objects removed | |

---

## 8. User Interface

### 8.1 Toolbar
| Test | Steps | Expected Result | Pass/Fail |
|------|-------|-----------------|-----------|
| Tool buttons | Click each tool button | Corresponding tool activates | |
| Active tool indicator | Select different tools | Active tool visually highlighted | |
| Grid toggle button | Click grid button | Grid toggles, button state updates | |
| Snap toggle button | Click snap button | Snap toggles, button state updates | |
| Zoom buttons | Click +/- buttons | Zoom level changes | |
| Export button | Click export button | Export action triggers | |

### 8.2 Properties Panel (Left)
| Test | Steps | Expected Result | Pass/Fail |
|------|-------|-----------------|-----------|
| Tab switching | Click Tool/Terrain/Generate tabs | Tab content switches | |
| Tool options display | Select different tools | Options update for each tool | |
| Slider controls | Drag slider controls | Values update smoothly | |
| Color pickers | Click color inputs | Color picker opens | |
| Number inputs | Type in number fields | Values update correctly | |

### 8.3 Layer Panel (Right)
| Test | Steps | Expected Result | Pass/Fail |
|------|-------|-----------------|-----------|
| Layer list display | View layer panel | All layers listed | |
| Layer list order | Check order | Top layer at top of list | |
| Scroll with many layers | Add many layers | Panel scrolls | |
| Add layer button | Click + button | New layer added | |
| Layer item interaction | Click layer items | Selection/toggle works | |

### 8.4 Status Bar
| Test | Steps | Expected Result | Pass/Fail |
|------|-------|-----------------|-----------|
| Position display | Move cursor on canvas | Coordinates update in real-time | |
| Screen coordinates | Check displayed values | Screen position accurate | |
| World coordinates | Check displayed values | World position accurate | |

---

## 9. Keyboard Shortcuts

### 9.1 Tool Selection
| Shortcut | Expected Action | Pass/Fail |
|----------|-----------------|-----------|
| B | Select Brush tool | |
| E | Select Eraser tool | |
| V | Select Selection tool | |
| H | Select Hand/Pan tool | |
| P | Select Path tool | |
| U | Select Shape tool | |
| G | Select Fill tool | |
| S | Select Stamp tool | |
| T | Select Text tool | |
| I | Select Eyedropper tool | |

### 9.2 View Controls
| Shortcut | Expected Action | Pass/Fail |
|----------|-----------------|-----------|
| + (Plus) | Zoom in | |
| - (Minus) | Zoom out | |
| 0 (Zero) | Reset zoom | |

### 9.3 Actions
| Shortcut | Expected Action | Pass/Fail |
|----------|-----------------|-----------|
| Delete | Delete selected | |
| Backspace | Delete selected | |
| Escape | Cancel/clear selection | |
| Enter | Confirm action | |
| Arrow keys | Nudge selected (1px) | |
| Shift + Arrow | Nudge selected (10px) | |

### 9.4 Tool-Specific
| Shortcut | Context | Expected Action | Pass/Fail |
|----------|---------|-----------------|-----------|
| C | Path tool | Toggle path closure | |
| Enter | Path tool | Stop drawing, keep editable | |
| Escape | Path tool | Finalize path | |
| Alt + drag | Path tool | Mirror control points | |

---

## 10. Performance

### 10.1 Rendering Performance
| Test | Steps | Expected Result | Pass/Fail |
|------|-------|-----------------|-----------|
| Smooth panning | Pan canvas rapidly | No stuttering or lag | |
| Smooth zooming | Zoom in/out rapidly | Smooth zoom transitions | |
| Drawing responsiveness | Draw quickly | Strokes keep up with cursor | |

### 10.2 Large Canvas
| Test | Steps | Expected Result | Pass/Fail |
|------|-------|-----------------|-----------|
| Large terrain | Generate large terrain | Generation completes | |
| Many objects | Add many objects to canvas | Rendering remains responsive | |
| Many layers | Create many layers | Layer panel remains responsive | |

### 10.3 Memory
| Test | Steps | Expected Result | Pass/Fail |
|------|-------|-----------------|-----------|
| Extended use | Use app for extended period | No memory leaks | |
| Undo/redo stress | Perform many operations | Memory stable | |

---

## Known Issues

The following issues are known and documented:

1. **Terrain Generation** - Currently broken (noted in git history)
2. **Undo/Redo** - Disabled/placeholder functionality
3. **Eyedropper** - Needs pixel extraction implementation
4. **Fill Tool** - Placeholder, needs flood-fill algorithm

---

## Test Environment

| Property | Value |
|----------|-------|
| Tester Name | |
| Date | |
| Browser | |
| Browser Version | |
| OS | |
| Screen Resolution | |
| Device Pixel Ratio | |
| Stylus Available | Yes / No |

---

## Test Summary

| Category | Total Tests | Passed | Failed | Blocked |
|----------|-------------|--------|--------|---------|
| Canvas & Rendering | | | | |
| Camera Controls | | | | |
| Grid System | | | | |
| Drawing Tools | | | | |
| Layer System | | | | |
| Terrain System | | | | |
| Selection & Transformation | | | | |
| User Interface | | | | |
| Keyboard Shortcuts | | | | |
| Performance | | | | |
| **TOTAL** | | | | |

---

## Notes & Observations

_Use this space to document any additional observations, bugs found, or suggestions during testing._

---

*Document generated for Planet Planner testing*
