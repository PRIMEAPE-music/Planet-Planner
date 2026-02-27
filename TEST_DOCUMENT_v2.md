# Planet Planner - Test Document v2

**Purpose:** Verify bug fixes from the previous testing session and confirm all features work correctly.

**Previous Test Date:** January 27, 2026
**Bugs Fixed:** 12 issues across camera controls, layer naming, keyboard handling, tool options UI, undo/redo, and export

---

## Quick Reference - Fixed Bugs

| Bug # | Issue | Status |
|-------|-------|--------|
| #1 | Toolbar zoom +/- buttons don't work | FIXED |
| #2 | Fit to canvas button doesn't work | FIXED |
| #3 | Reset view button doesn't work | FIXED |
| #4 | Path tool Escape doesn't finalize | FIXED |
| #5 | Text tool Escape doesn't dismiss | FIXED |
| #6 | Keyboard shortcuts captured by text input | FIXED |
| #7 | Shape tool missing type selection UI | FIXED |
| #8 | Stamp tool missing options UI | FIXED |
| #9 | New layers all named "Layer 2" | FIXED |
| #11 | Undo/Redo not implemented | FIXED |
| #12 | Export button no feedback | FIXED |

---

## Test Environment

| Property | Value |
|----------|-------|
| Tester Name | |
| Date | |
| Browser | |
| Browser Version | |
| Application URL | localhost:3000 |

---

## PART A: Verify Bug Fixes

### A1. Camera Control Buttons (Bugs #1, #2, #3)

| Test | Steps | Expected Result | Pass/Fail |
|------|-------|-----------------|-----------|
| Zoom In button | Click the + button in toolbar (right side) | Canvas zooms in, zoom percentage increases | |
| Zoom Out button | Click the - button in toolbar (right side) | Canvas zooms out, zoom percentage decreases | |
| Fit to Canvas button | Click the maximize icon button in toolbar | View adjusts to fit entire canvas | |
| Reset View button | Click the rotate/reset icon button in toolbar | View returns to default zoom and position | |

### A2. Layer Naming (Bug #9)

| Test | Steps | Expected Result | Pass/Fail |
|------|-------|-----------------|-----------|
| First new layer | Click + in layer panel | Layer created with name "Layer 2" (or next available) | |
| Second new layer | Click + again | Layer created with unique name (e.g., "Layer 3") | |
| Delete and recreate | Delete a layer, then create new one | New layer gets next highest number, not duplicate | |
| Multiple layers | Create 5+ layers | All layers have unique sequential names | |

### A3. Text Tool Keyboard (Bugs #5, #6)

| Test | Steps | Expected Result | Pass/Fail |
|------|-------|-----------------|-----------|
| Text input appears | Select Text tool (T), click on canvas | Text input box appears at top of screen | |
| Escape cancels | While input is open, press Escape | Input closes, no text object created | |
| Enter commits | Type text, press Enter | Text appears on canvas at clicked position | |
| Tool shortcuts blocked | While typing in input, press B, E, V, etc. | Letters type into input, don't switch tools | |

### A4. Path Tool Escape (Bug #4)

| Test | Steps | Expected Result | Pass/Fail |
|------|-------|-----------------|-----------|
| Create path | Select Path tool (P), click to add 3+ nodes | Path with control handles visible | |
| Escape finalizes | Press Escape | Path finalizes immediately, handles disappear | |
| Path remains | After Escape | Drawn path stays on canvas as finalized object | |

### A5. Shape Tool Options (Bug #7)

| Test | Steps | Expected Result | Pass/Fail |
|------|-------|-----------------|-----------|
| Shape options visible | Select Shape tool (U), go to Tool tab | Shape-specific options section appears | |
| Shape type buttons | Check options panel | Rectangle, Ellipse, Polygon, Freeform buttons visible | |
| Shape type selection | Click each shape type button | Button highlights, shape type changes | |
| Fill checkbox | Toggle Fill checkbox | Fill option toggles on/off | |
| Stroke checkbox | Toggle Stroke checkbox | Stroke option toggles on/off | |
| Stroke width slider | Adjust stroke width (when stroke enabled) | Slider shows value, affects drawn shapes | |
| Corner radius | Select Rectangle, adjust corner radius | Slider visible, affects rectangle corners | |
| Polygon sides | Select Polygon, adjust sides | Slider visible (3-12), affects polygon shape | |

### A6. Stamp Tool Options (Bug #8)

| Test | Steps | Expected Result | Pass/Fail |
|------|-------|-----------------|-----------|
| Stamp options visible | Select Stamp tool (S), go to Tool tab | Stamp-specific options section appears | |
| Rotation slider | Adjust rotation slider | Shows 0-360 degrees, affects stamp placement | |
| Scale slider | Adjust scale slider | Shows 0.1x-3.0x, affects stamp size | |

### A7. Undo/Redo (Bug #11)

| Test | Steps | Expected Result | Pass/Fail |
|------|-------|-----------------|-----------|
| Undo button disabled initially | Launch app, check Undo button | Button is disabled (grayed out) | |
| Draw something | Use Brush tool to draw a stroke | Stroke appears on canvas | |
| Undo button enabled | Check Undo button after drawing | Button becomes enabled | |
| Click Undo | Click Undo button | Stroke is removed from canvas | |
| Redo button enabled | After undo, check Redo button | Button becomes enabled | |
| Click Redo | Click Redo button | Stroke reappears on canvas | |
| Keyboard Undo | Draw, then press Ctrl+Z | Stroke is removed | |
| Keyboard Redo | After undo, press Ctrl+Y or Ctrl+Shift+Z | Stroke reappears | |
| Multiple undos | Draw 3 strokes, undo 3 times | All 3 strokes removed in reverse order | |

### A8. Export (Bug #12)

| Test | Steps | Expected Result | Pass/Fail |
|------|-------|-----------------|-----------|
| Export button | Click Download/Export button in toolbar | PNG file downloads | |
| File content | Open downloaded file | Contains current canvas content | |
| File naming | Check downloaded filename | Named like "planet-map-[timestamp].png" | |

---

## PART B: Regression Testing (Previously Working Features)

### B1. Canvas & Rendering

| Test | Steps | Expected Result | Pass/Fail |
|------|-------|-----------------|-----------|
| Canvas initialization | Launch application | Canvas renders with WebGL context | |
| Default view | Launch application | Canvas displays centered | |

### B2. Camera Controls (Non-Button)

| Test | Steps | Expected Result | Pass/Fail |
|------|-------|-----------------|-----------|
| Scroll wheel zoom | Scroll up/down on canvas | Canvas zooms in/out toward cursor | |
| Keyboard zoom in | Press = or + key | Canvas zooms in | |
| Keyboard zoom out | Press - key | Canvas zooms out | |
| Shift + click pan | Hold Shift + left click + drag | Canvas pans | |
| Hand tool pan | Select Hand tool (H), drag | Canvas pans with grab cursor | |

### B3. Grid System

| Test | Steps | Expected Result | Pass/Fail |
|------|-------|-----------------|-----------|
| Grid toggle | Click grid button in toolbar | Grid shows/hides | |
| Snap toggle | Click magnet button in toolbar | Snap indicator changes in status bar | |

### B4. Drawing Tools

| Test | Steps | Expected Result | Pass/Fail |
|------|-------|-----------------|-----------|
| Brush tool | Select (B), draw on canvas | Colored stroke appears | |
| Eraser tool | Select (E), erase content | Content is removed | |
| Shape tool - Rectangle | Select (U), choose Rectangle, draw | Rectangle shape appears | |
| Shape tool - Ellipse | Choose Ellipse, draw | Ellipse shape appears | |
| Path tool | Select (P), click to add nodes | Bezier path with control points | |
| Text tool | Select (T), click, type, Enter | Text appears on canvas | |
| Stamp tool | Select (S), click on canvas | Stamp placed at position | |

### B5. Layer System

| Test | Steps | Expected Result | Pass/Fail |
|------|-------|-----------------|-----------|
| Add layer | Click + button | New layer appears in panel | |
| Toggle visibility | Click eye icon on layer | Layer shows/hides on canvas | |
| Select layer | Click on layer in panel | Layer highlights as active | |
| Delete layer | Click X on layer | Layer is removed | |

### B6. Terrain Generation

| Test | Steps | Expected Result | Pass/Fail |
|------|-------|-----------------|-----------|
| Generate terrain | Go to Generate tab, click Generate | Terrain renders on canvas | |
| Seed input | Enter specific seed, generate | Same seed produces same terrain | |
| Style sliders | Adjust terrain style options | Visual appearance updates | |

### B7. Tool Keyboard Shortcuts

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

### B8. UI Components

| Test | Steps | Expected Result | Pass/Fail |
|------|-------|-----------------|-----------|
| Tool tab | Click Tool tab in properties panel | Tool options display | |
| Terrain tab | Click Terrain tab | Terrain styling options display | |
| Generate tab | Click Generate tab | Generation controls display | |
| Status bar coordinates | Move cursor on canvas | X/Y coordinates update | |
| Status bar zoom | Check status bar | Zoom percentage displayed | |

---

## PART C: New Feature Testing

### C1. Shape Tool Full Test

| Test | Steps | Expected Result | Pass/Fail |
|------|-------|-----------------|-----------|
| Rectangle with fill | Enable fill, disable stroke, draw | Solid filled rectangle | |
| Rectangle with stroke | Disable fill, enable stroke, draw | Outlined rectangle | |
| Rectangle with both | Enable fill and stroke, draw | Filled rectangle with outline | |
| Rounded rectangle | Set corner radius > 0, draw rectangle | Rectangle with rounded corners | |
| Ellipse | Select ellipse, draw | Ellipse shape | |
| Polygon (triangle) | Select polygon, set sides=3, draw | Triangle | |
| Polygon (hexagon) | Set sides=6, draw | Hexagon | |
| Stroke width | Increase stroke width, draw | Thicker outline | |

### C2. Stamp Tool Full Test

| Test | Steps | Expected Result | Pass/Fail |
|------|-------|-----------------|-----------|
| Default stamp | Click on canvas | Stamp placed at default rotation/scale | |
| Rotated stamp | Set rotation to 90, click | Stamp rotated 90 degrees | |
| Scaled up stamp | Set scale to 2.0, click | Stamp 2x larger | |
| Scaled down stamp | Set scale to 0.5, click | Stamp half size | |
| Combined | Set rotation=45, scale=1.5, click | Rotated and scaled stamp | |

### C3. Undo/Redo Stress Test

| Test | Steps | Expected Result | Pass/Fail |
|------|-------|-----------------|-----------|
| Many operations | Perform 10+ drawing operations | All operations recorded | |
| Undo all | Undo all operations | Canvas returns to initial state | |
| Redo all | Redo all operations | All drawings restored | |
| New action clears redo | Undo, then draw new stroke | Redo stack cleared | |

---

## Test Summary

| Category | Total Tests | Passed | Failed | Notes |
|----------|-------------|--------|--------|-------|
| A1. Camera Buttons | 4 | | | |
| A2. Layer Naming | 4 | | | |
| A3. Text Tool Keyboard | 4 | | | |
| A4. Path Tool Escape | 3 | | | |
| A5. Shape Tool Options | 8 | | | |
| A6. Stamp Tool Options | 3 | | | |
| A7. Undo/Redo | 9 | | | |
| A8. Export | 3 | | | |
| B. Regression Tests | 28 | | | |
| C. New Features | 17 | | | |
| **TOTAL** | **83** | | | |

---

## Notes & Issues Found

_Use this space to document any bugs, issues, or observations during testing._

---

*Test Document v2 - Post Bug Fix Verification*
*Generated for Planet Planner*
