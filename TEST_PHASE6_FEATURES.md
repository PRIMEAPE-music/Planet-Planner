# Phase 6 Feature Testing Guide

Test the new terrain feature generation system in PlanetPlanner.

---

## Setup

1. Run the app with `npm run dev`
2. Open browser to `http://localhost:5173`

---

## Step 1: Generate a World First (Required)

Before testing features, you need terrain to place them on:

1. Click the **"World"** tab in the left Properties Panel
2. Select a preset (e.g., "Continental")
3. Click **"Generate World"** button
4. Wait for terrain to appear on canvas

**Expected:** Land masses with colored biomes appear on the canvas.

---

## Step 2: Open Features Panel

1. Click the **"Features"** tab (has sparkle icon)
2. You should see collapsible sections for: Mountains, Rivers, Lakes, Forests, Climate

**Expected:** Features panel loads with all sections visible.

---

## Step 3: Test Mountain Generation

### 3.1 Configure Mountains
1. Expand "Mountains" section (click the arrow)
2. Verify the enable toggle (switch) is ON
3. Set these values:
   - Range Count: **5**
   - Roughness: **0.6**
   - Isolated Peaks: **10**
   - Follow Tectonics: **ON**

### 3.2 Generate and Verify
1. Click **"Generate Features"** button at bottom
2. Watch progress bar show stages: climate, mountains, rivers, lakes, forests, biomes

**Expected Results:**
- [ ] Mountain peaks appear on terrain
- [ ] Multiple mountain ranges visible
- [ ] Mountains primarily on higher elevation (darker) terrain
- [ ] Isolated peaks scattered separate from ranges

---

## Step 4: Test River Generation

### 4.1 Configure Rivers
1. Expand "Rivers" section
2. Verify enabled toggle is ON
3. Set these values:
   - Max Rivers: **20**
   - Width Multiplier: **1.5**
   - Erosion Strength: **0.2**
   - Meander Factor: **0.5**
   - Tributaries: **ON**

### 4.2 Regenerate and Verify
1. Click **"Generate Features"**

**Expected Results:**
- [ ] Blue river lines appear on terrain
- [ ] Rivers start from mountains/highlands
- [ ] Rivers flow toward ocean (coastlines)
- [ ] Rivers get wider as they flow downstream
- [ ] Rivers show some curves/meandering

---

## Step 5: Test Lake Generation

### 5.1 Configure Lakes
1. Expand "Lakes" section
2. Verify enabled toggle is ON
3. Set these values:
   - Max Lakes: **15**
   - Min Size: **20**
   - Max Size: **200**
   - Mountain Lakes: **ON**

### 5.2 Regenerate and Verify
1. Click **"Generate Features"**

**Expected Results:**
- [ ] Blue lake shapes appear on terrain
- [ ] Lakes appear in lowland/valley areas
- [ ] Some smaller lakes appear in mountain regions
- [ ] Lakes vary in size

---

## Step 6: Test Forest Generation

### 6.1 Configure Forests
1. Expand "Forests" section
2. Verify enabled toggle is ON
3. Set these values:
   - Coverage Target: **0.4**
   - Moisture Threshold: **0.4**
   - Clustering: **0.7**
   - Edge Noise: **0.5**

### 6.2 Regenerate and Verify
1. Click **"Generate Features"**

**Expected Results:**
- [ ] Forest areas appear as tree symbols or shaded regions
- [ ] Forests cluster together (not scattered randomly)
- [ ] Forests avoid mountain peaks and deserts
- [ ] Forest density varies across regions

---

## Step 7: Test Climate Settings

### 7.1 Configure Climate
1. Expand "Climate" section
2. Verify enabled toggle is ON
3. Set these values:
   - Equator Position: **0.5** (middle)
   - Temperature Variation: **0.3**
   - Rain Shadow Strength: **0.7**
   - Ocean Moisture: **0.8**

### 7.2 Regenerate and Verify
1. Click **"Generate Features"**

**Expected Results:**
- [ ] Biome colors update based on climate
- [ ] Warmer colors near equator position
- [ ] Cooler colors toward top/bottom
- [ ] Drier areas (less forest) on lee side of mountains

---

## Step 8: Test Visibility Toggles

In the Features panel header, there are 4 small icons:

1. **Mountain icon** - Click to toggle mountain visibility
   - [ ] Mountains disappear when toggled off
   - [ ] Mountains reappear when toggled on

2. **Waves icon** - Click to toggle river visibility
   - [ ] Rivers disappear when toggled off
   - [ ] Rivers reappear when toggled on

3. **Droplets icon** - Click to toggle lake visibility
   - [ ] Lakes disappear when toggled off
   - [ ] Lakes reappear when toggled on

4. **Trees icon** - Click to toggle forest visibility
   - [ ] Forests disappear when toggled off
   - [ ] Forests reappear when toggled on

---

## Step 9: Test Feature Enable/Disable

### 9.1 Disable Mountains
1. In Mountains section, toggle the switch OFF
2. Click **"Generate Features"**
3. **Expected:** No mountains appear, but rivers/lakes/forests still generate

### 9.2 Disable All Except Rivers
1. Toggle OFF: Mountains, Lakes, Forests
2. Toggle ON: Rivers only
3. Click **"Generate Features"**
4. **Expected:** Only rivers appear on terrain

### 9.3 Re-enable All
1. Toggle all feature types back ON
2. Click **"Generate Features"**
3. **Expected:** All features appear again

---

## Step 10: Test with Different World

### 10.1 Generate New World
1. Go to **"World"** tab
2. Click the dice icon to randomize seed
3. Click **"Generate World"**

### 10.2 Generate Features on New World
1. Go to **"Features"** tab
2. Click **"Generate Features"**

**Expected Results:**
- [ ] Features adapt to new terrain shape
- [ ] Rivers flow correctly on new terrain
- [ ] Mountains appear in appropriate locations
- [ ] No errors or crashes

---

## Step 11: Test Extreme Settings

### 11.1 Maximum Features
1. Set all to maximum:
   - Range Count: 10
   - Isolated Peaks: 20
   - Max Rivers: 50
   - Max Lakes: 30
   - Coverage Target: 0.7
2. Click **"Generate Features"**

**Expected:** App handles without crashing, many features appear

### 11.2 Minimum Features
1. Set all to minimum values
2. Click **"Generate Features"**

**Expected:** App handles gracefully, few features appear

---

## Step 12: Progress Indicator Test

1. Click **"Generate Features"**
2. Watch the progress bar at bottom of Features panel

**Expected Results:**
- [ ] Progress bar appears during generation
- [ ] Shows stage names: "Simulating climate...", "Generating mountains...", etc.
- [ ] Percentage updates as generation progresses
- [ ] Bar disappears when complete

---

## Quick Checklist Summary

### Critical Tests (Must Pass)
- [ ] Features tab accessible
- [ ] Can expand/collapse all sections (Mountains, Rivers, Lakes, Forests, Climate)
- [ ] All sliders respond to input
- [ ] Enable/disable toggles work for each feature type
- [ ] "Generate Features" button works
- [ ] Features appear on canvas after generation
- [ ] Visibility toggle icons work

### Feature-Specific Tests
- [ ] Mountains appear on high terrain
- [ ] Rivers flow from high to low elevation
- [ ] Lakes appear in depressions
- [ ] Forests cluster in moist areas
- [ ] Climate affects biome distribution

### Stability Tests
- [ ] Can regenerate multiple times without issues
- [ ] Works with different world seeds
- [ ] Handles extreme settings without crashing

---

## Reporting Bugs

If something doesn't work, note:
1. What you clicked/changed
2. What you expected to happen
3. What actually happened
4. Any error messages in browser console (F12 > Console)
5. Screenshot if helpful
