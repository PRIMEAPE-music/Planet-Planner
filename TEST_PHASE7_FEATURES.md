# Phase 7 Feature Tools - Test Guide

This guide covers testing all the new feature editing tools implemented in Phase 7.

---

## Prerequisites

1. Start the development server: `npm run dev`
2. Open the application in your browser
3. Generate or load a map with terrain first (the feature tools work on top of existing terrain)

---

## 1. Accessing Feature Tools Panel

**Steps:**
1. Look for the Feature Tools panel in the UI (should appear as a panel with tool icons)
2. Verify the panel displays 7 tool buttons:
   - Peak (Mountain icon)
   - Range (TrendingUp icon)
   - Forest (TreePine icon)
   - River (Waves icon)
   - Lake (Droplets icon)
   - Eraser (Eraser icon)
   - Select (MousePointer icon)

**Expected Result:**
- Panel is visible with all tool buttons
- Clicking a tool highlights it as active
- Clicking the same tool again deselects it
- Settings panel appears below when a tool is selected

---

## 2. Mountain Stamp Tool (Peak)

**Steps:**
1. Click the "Peak" tool button
2. Verify settings panel shows:
   - Elevation slider (0.5 - 0.98)
   - Radius slider (10 - 80)
   - Sharpness slider (0 - 1)
   - Snow Cap toggle
   - Randomize toggle
3. Click on the canvas to place a mountain peak
4. Adjust Elevation slider and place another peak
5. Adjust Radius slider and place another peak
6. Toggle Snow Cap on and place a peak
7. Toggle Randomize on and place several peaks

**Expected Results:**
- Each click creates a mountain peak at cursor position
- Higher elevation = taller peaks
- Larger radius = wider mountain base
- Higher sharpness = more pointed peak
- Snow Cap adds white coloring to peak tops
- Randomize causes variation in peak appearance

---

## 3. Mountain Path Tool (Range)

**Steps:**
1. Click the "Range" tool button
2. Verify settings panel shows:
   - Width slider (20 - 100)
   - Peak Density slider (2 - 20)
   - Roughness slider (0 - 1)
   - Smooth Path toggle
3. Click and drag across the canvas to draw a mountain range path
4. Release mouse to complete the range
5. Try different Width values
6. Try different Peak Density values
7. Toggle Smooth Path and draw another range

**Expected Results:**
- Dragging creates a path preview
- Releasing creates a mountain range along the path
- Width affects how wide the range appears
- Peak Density controls number of peaks along the path
- Roughness adds variation to peak heights
- Smooth Path creates more curved ranges vs. jagged

---

## 4. Forest Brush Tool

**Steps:**
1. Click the "Forest" tool button
2. Verify settings panel shows:
   - Radius slider (10 - 100)
   - Density slider (0.1 - 1)
   - Variation slider (0 - 1)
   - Forest Type dropdown (Auto, Deciduous, Coniferous, Tropical, Mixed)
   - Soft Edge toggle
3. Click and drag on the canvas to paint forest areas
4. Adjust Radius and paint more
5. Change Density and observe difference
6. Try different Forest Types
7. Toggle Soft Edge and paint

**Expected Results:**
- Dragging paints forest coverage on the terrain
- Larger radius = bigger brush
- Higher density = more trees per area
- Variation adds randomness to tree placement
- Forest Type changes tree appearance/coloring
- Soft Edge creates gradual fade at brush edges

---

## 5. River Spline Tool

**Steps:**
1. Click the "River" tool button
2. Verify settings panel shows:
   - Instruction text: "Click to add points. Double-click or press Enter to finish."
   - Start Width slider (1 - 10)
   - End Width slider (2 - 20)
   - Curve Tension slider (0 - 1)
   - Smooth Curves toggle
   - Erode Terrain toggle
3. Click multiple points on the canvas to define river path
4. Double-click or press Enter to complete the river
5. Try different Start/End Width combinations (rivers typically widen downstream)
6. Adjust Curve Tension and create another river
7. Toggle Erode Terrain and create a river

**Expected Results:**
- Each click adds a control point with visual indicator
- Line preview shows between points
- Double-click/Enter finalizes the river
- Start Width affects river width at beginning
- End Width affects river width at end
- Curve Tension controls how tightly curves bend
- Smooth Curves creates more natural-looking bends
- Erode Terrain (if implemented) carves into terrain

---

## 6. Lake Shape Tool

**Steps:**
1. Click the "Lake" tool button
2. Verify settings panel shows:
   - Shape Type dropdown (Freeform, Ellipse, Rectangle)
   - Edge Noise slider (0 - 0.5)
   - Depth slider (0.05 - 0.3)
   - Smooth Edges toggle
   - Wave Pattern toggle

**Test Freeform Mode:**
1. Select "Freeform" shape type
2. Click and drag to draw a lake boundary
3. Release to complete

**Test Ellipse Mode:**
1. Select "Ellipse" shape type
2. Click and drag to define ellipse bounds
3. Release to complete

**Test Rectangle Mode:**
1. Select "Rectangle" shape type
2. Click and drag to define rectangle bounds
3. Release to complete

**Test Settings:**
1. Increase Edge Noise and create lakes (adds irregular edges)
2. Adjust Depth and observe difference
3. Toggle Smooth Edges
4. Toggle Wave Pattern

**Expected Results:**
- Freeform allows free drawing of lake boundary
- Ellipse creates oval lakes
- Rectangle creates rectangular lakes with rounded edges
- Edge Noise adds natural irregularity to shoreline
- Depth affects water coloring/appearance
- Smooth Edges creates cleaner shorelines
- Wave Pattern adds water texture

---

## 7. Feature Eraser Tool

**Steps:**
1. First, create several features (mountains, rivers, lakes) to erase
2. Click the "Eraser" tool button
3. Verify settings panel shows:
   - Radius slider (10 - 100)
   - Erase Targets section with toggles:
     - Mountains
     - Rivers
     - Lakes
     - Forests
4. With all targets enabled, click and drag over features
5. Disable Mountains target and try erasing near mountains
6. Enable only Rivers and try erasing
7. Adjust Radius and test different sizes

**Expected Results:**
- Eraser shows red circle cursor
- Dragging over features removes them
- Only features matching enabled targets are erased
- Larger radius erases wider area
- X pattern in cursor indicates erasing mode

---

## 8. Feature Select Tool

**Steps:**
1. Create several features first (mountains, rivers, lakes)
2. Click the "Select" tool button
3. Verify info panel shows:
   - "Click on a feature to select it. Drag to move, use handles to resize. Press Delete to remove selected feature."
4. Click on a feature to select it
5. Observe selection rectangle with handles
6. Drag inside selection to move the feature
7. Drag corner handles to resize
8. Press Delete or Backspace to delete selected feature
9. Press Escape to deselect
10. Click empty area to deselect

**Expected Results:**
- Clicking feature shows selection box with 8 resize handles + rotate handle
- Cursor changes based on hover (resize arrows, move cursor)
- Dragging inside selection moves the feature
- Dragging handles resizes the feature
- Delete key removes the selected feature
- Escape deselects current selection

---

## 9. Undo/Redo Functionality

**Steps:**
1. Create a mountain peak
2. Create a river
3. Create a lake
4. Use Ctrl+Z (or Cmd+Z on Mac) to undo
5. Observe last action is undone
6. Use Ctrl+Shift+Z (or Cmd+Shift+Z) to redo
7. Observe action is restored
8. Perform multiple undos in sequence
9. Perform multiple redos

**Expected Results:**
- Each feature creation can be undone
- Each feature deletion can be undone
- Redo restores undone actions
- History is maintained correctly
- Undo/redo state persists across tool switches

---

## 10. Tool Switching & Preview

**Steps:**
1. Select Mountain Stamp tool
2. Move cursor over canvas (observe preview)
3. Switch to Forest Brush (observe preview changes)
4. Switch to River Spline (observe preview changes)
5. Switch to Eraser (observe red circle preview)
6. Click a tool to deselect (no tool active)

**Expected Results:**
- Each tool shows appropriate cursor/preview
- Preview updates in real-time with cursor movement
- Switching tools clears previous tool's preview
- Deselecting all tools returns to default cursor

---

## 11. Settings Persistence

**Steps:**
1. Set Mountain Stamp elevation to 0.8
2. Set Forest Brush radius to 75
3. Switch to different tools and back
4. Verify settings are remembered

**Expected Results:**
- Tool settings persist when switching between tools
- Settings don't reset unexpectedly

---

## 12. Edge Cases & Error Handling

**Test Cases:**
1. Try to create a river with only 1 point (should not create)
2. Try to create a freeform lake with less than 3 points (should not create)
3. Rapidly click while using stamp tool
4. Switch tools mid-operation (e.g., while drawing river)
5. Use eraser on empty area
6. Use select tool on empty area

**Expected Results:**
- Invalid operations are handled gracefully
- No crashes or console errors
- Partial operations are cancelled cleanly when switching tools

---

## Common Issues to Watch For

1. **Preview not updating** - Graphics should follow cursor
2. **Features not rendering** - Check if FeatureRenderer is connected
3. **Settings not applying** - Verify store is connected to tools
4. **Undo not working** - Check history store integration
5. **Selection handles misaligned** - Check bounds calculation
6. **Performance issues** - Watch for lag when many features exist

---

## Console Debugging

Open browser DevTools (F12) and check for:
- JavaScript errors in Console
- Network errors
- React warnings
- Performance warnings

Use these commands in console for debugging:
```javascript
// Check feature tools store state
console.log(window.__ZUSTAND_DEVTOOLS__);
```

---

## Test Completion Checklist

- [ ] Feature Tools Panel displays correctly
- [ ] Mountain Stamp tool works with all settings
- [ ] Mountain Path tool creates ranges
- [ ] Forest Brush paints forests
- [ ] River Spline creates smooth rivers
- [ ] Lake Shape creates lakes in all modes
- [ ] Feature Eraser removes features selectively
- [ ] Feature Select allows move/resize/delete
- [ ] Undo/Redo works for all operations
- [ ] Tool switching works smoothly
- [ ] Settings persist between tool switches
- [ ] No console errors during normal use
- [ ] Edge cases handled gracefully
