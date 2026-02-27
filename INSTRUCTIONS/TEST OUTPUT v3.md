Phase 6 Feature Testing - Critical Bug Report
🔴 CRITICAL BUG: Feature Generation is Fundamentally Broken
Summary
The "Generate Features" functionality does NOT work as intended. Features generate but have multiple critical issues that make them essentially unusable.

Bug #1: Features Do NOT Generate On Terrain (CRITICAL)
Description: When clicking "Generate Features", the mountains, rivers, lakes, and forests are placed at fixed coordinates (seemingly starting near canvas origin 0,0) rather than on the actual terrain where land exists.
Expected Behavior: Features should be placed ON the generated terrain:

Mountains should appear on high-elevation land areas
Rivers should flow from highlands toward ocean/coastline
Lakes should appear in low-lying terrain depressions
Forests should cover moist, temperate land areas

Actual Behavior: Features appear in a cluster in one area of the canvas (often top-left or center), completely disconnected from where the terrain actually is. In the user's screenshot, you can clearly see features (blue rivers/lakes, gray mountain triangles) in the ocean/empty area, NOT on any land mass.
Root Cause (Likely): The feature generation code is not reading the actual terrain heightmap/position to determine where to place features. It may be using hardcoded coordinates or a default "world size" that doesn't match the actual terrain bounds.

Bug #2: Features Render UNDER Terrain Layer (CRITICAL)
Description: Even if features were positioned correctly, they would be invisible because they render UNDERNEATH the terrain layer instead of ON TOP of it.
Evidence: When I toggled off the "background" layer (which contains the terrain), I could see faint feature icons in the empty space. When terrain is visible, it completely covers the features.
Expected: Features should render as an overlay ON TOP of the terrain.
Root Cause (Likely): The FeatureRenderer is adding its container at the wrong z-index, or being added before the terrain layer in the rendering order.

Bug #3: Features Not Distributed Across Full Terrain
Description: Even in the user's screenshot showing features without terrain, the features are clustered in a small portion of the canvas rather than distributed across the full world area.
Expected: With "Max Rivers: 50" and "Max Lakes: 30", features should be spread across the entire terrain area.
Actual: Features cluster in one region, leaving most of the map empty.

Recommended Fixes for Claude Code
Fix #1: Feature Position Calculation
The feature generator needs to:
1. Get the actual terrain bounds (not hardcoded values)
2. Sample the terrain heightmap at each potential feature location
3. Place features based on terrain data:
   - Mountains: where elevation > threshold
   - Rivers: trace from high points down toward low points/ocean
   - Lakes: in terrain depressions (local minima)
   - Forests: where moisture + temperature conditions are met
Fix #2: Feature Layer Z-Order
The FeatureRenderer container needs to be added ABOVE the terrain layer:
- Check where featureRenderer.container is added to the stage
- Ensure it's added after/above the terrain layers
- Or explicitly set zIndex higher than terrain
Fix #3: Coordinate System Alignment
Ensure the feature coordinate system matches the terrain:
- If terrain uses world coordinates, features must too
- Account for any canvas pan/offset in the viewport
- The terrain position/bounds should be passed to the feature generator

Files Likely Affected
Based on the test guide and observed behavior, these files probably need fixes:

src/features/FeatureGenerator.ts (or similar) - Position calculation logic
src/features/FeatureRenderer.ts - Layer z-order/rendering
src/terrain/TerrainManager.ts (or similar) - Needs to expose terrain bounds/heightmap to features
src/App.tsx - Where FeatureRenderer is instantiated and added to stage


Testing Note
The UI controls (sliders, toggles, expand/collapse) work fine. The issue is purely in the feature placement and rendering logic, not the UI layer.

What Was Working

✅ Features tab opens and shows all sections
✅ All sliders respond to input
✅ Enable/disable toggles work
✅ "Generate Features" button triggers without crashing
✅ Feature icons ARE being rendered (just in wrong position/layer)
✅ Visibility toggles change state
✅ App handles extreme settings without crashing

What Is Broken

❌ Features don't appear on terrain
❌ Features render under terrain (invisible when terrain present)
❌ Features cluster in one area instead of spreading across map
❌ Feature positions have no relationship to terrain elevation/type
❌ Progress bar not visible during generation