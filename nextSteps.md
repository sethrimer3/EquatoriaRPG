# nextSteps.md — Math Objective System & Particle-Life Enemies

---

## World Map First-Play Experience (new in this session)

### What was completed
- **Navigation flow**: `Start Game` now opens the **World Map** first, not the RPG arena directly.
  - `game-app.ts` shows `worldMapScreen` in the `onStartGame` callback instead of the RPG container.
  - RPG container and stats bar remain hidden until a level is launched from the world map.
- **"← Main Menu" button** on the World Map header replaces the generic back button when the map is the entry point. Clicking it auto-saves persistent progress and reloads the page (resets to main menu cleanly).
- **World Map particle simulation** — real-time animated particle system for the world map canvas:
  - `src/render/world-map/worldMapParticles.ts` — new module.
  - 1000 particles (default/full quality), 500 reduced, 250 low.
  - Particles spiral inward from the outer white-hole edge toward the central black hole.
  - Zone-based color transitions: pale sand → silver → gold (outer) → quartz/cyan → ruby → sunstone → emerald → sapphire → violet → diamond (inner).
  - Angular speed increases near center (conservation-of-momentum feel).
  - Each particle shimmers/glints with individual phase/speed variation.
  - Black hole at center: gravitational gradient + dark core + event-horizon ring.
  - White hole at outer edge: soft luminous glow along the outer boundary.
  - Particles fade out near the black hole and reappear at the white hole.
  - Simulation pauses when the world map is hidden.
- **Continuous RAF animation loop** in `WorldMapScreen.ts`:
  - `startAnimLoop()` / `stopAnimLoop()` manage the animation frame.
  - `drawMap()` is now called every frame (particles need continuous redraw).
  - ResizeObserver re-initializes particle positions when dimensions change.
  - `setParticleQuality()` method allows runtime quality switching.
- **RPG Menu navigation** — two new buttons added to the ⚔ Menu → Menu tab:
  - **🗺 Back to World Map** — shows an inline confirmation ("Progress in this level will be lost. Are you sure?") with Cancel / Confirm buttons.
  - **🏠 Back to Main Menu** — same inline confirmation flow.
  - Both buttons defined in `rpg-menu-tab.ts` via `RpgMenuNavCallbacks` interface.
  - CSS styles added to `panels.css` (`.rpg-menu__nav-section`, `.rpg-menu__nav-btn`, `--danger`, `--confirm`, `.rpg-menu__nav-warning`).
- **RPG menu panel** now accepts `navCallbacks?: RpgMenuNavCallbacks` as a 4th parameter in both `createRpgMenuPanel` and `createRpgMenuTabPane`.
- **Game loop control**: `createGameLoop` in `app-game-loop.ts` now returns a `{ start, stop, isRunning }` object instead of a bare function. The game loop can be paused/resumed without recreating it.
- **Forward-reference pattern** in `game-app.ts`: all navigation helpers (`showWorldMap`, `goToMainMenu`) are defined before the objects they reference, using JavaScript closure semantics. No double-creation of any panel.
- **Level screen "Back" button** now returns to the World Map instead of just closing.
- **Build passes**: `npm run typecheck` and `npm run build` both succeed with zero errors.

### What was partially completed
- **"Enter Game" / "Play Level" from World Map**: the Level Screen still shows "Play Level (Coming Soon)". The world map shows level details and the level screen previews level layout, but the bridge from "Play Level" to actual RPG gameplay (starting `gameLoop` from the world map detail screen) is not yet wired.
  - The RPG arena is still accessible via the existing game flow (level launched from world map → level screen → coming-soon play button). The full bridge requires wiring `levelScreen`'s play button to `hideWorldMapAndStartGame()`.
- **Save/load for world map progression**: `serializeWorldMapState` / `deserializeWorldMapState` helpers exist in `worldMapProgression.ts` but are not yet integrated into `saveGame` / `loadGame`. World map progression resets on reload.

### What still needs work
1. **Wire "Play Level" button** in `LevelScreen.ts` to start the RPG game loop. Remove the "Coming Soon" disabled state once the bridge logic is in place.
2. **Integrate world map save/load** — call `serializeWorldMapState` in `saveGame()` and `deserializeWorldMapState` in `loadGame()` so completed/unlocked levels persist.
3. **Particle quality from settings** — expose a world map particle quality dropdown in the Settings panel. Call `worldMapScreen.setParticleQuality(q)` from the settings change handler.
4. **Black hole visual polish** — the current black hole is a radial gradient. A more dramatic ring/accretion disk effect would be visually striking.
5. **Dedicated "Enter Campaign" button** on the world map for players who want to jump directly into the RPG arena without selecting a specific level first.
6. **Level node granularity on the map** — currently the map shows 11 world nodes; adding individual level nodes along the spiral for each world's 10 mandatory levels + 6 challenges would complete the "1000-level spiral" visual concept.
7. **Tooltip on hover** — show a tooltip or info panel when hovering over a level/world node.
8. **World map resize edge case** — when the world map is resized while hidden, the particle system reinitializes but the first frame after re-show may flicker. A guard against zero-size canvas would help.

### Important architectural notes
- **Forward-reference pattern**: `worldMapScreen` and `gameLoop` are declared with `let = null!` before the navigation helpers that reference them, then assigned later. This is safe because the helpers are only called at user-interaction time (after all setup completes). TypeScript is satisfied via the `!` definite assignment assertion.
- **Game loop control**: the new `GameLoop.stop()` must be called before showing the world map (or main menu). Forgetting this would leave the RPG game loop running while the world map is displayed, causing invisible wasted CPU.
- **Main menu re-entry**: `goToMainMenu()` calls `window.location.reload()` after auto-saving. This is intentional — the main menu's fly-off animation and RAF teardown make in-place re-entry complex. A future session could implement a true `mainMenu.reset()` path if desired.
- **Particle simulation independence**: the particle simulation in `worldMapParticles.ts` has no knowledge of the world map data model. It uses only canvas geometry (center, maxRadius). This keeps it clean and reusable.

### Performance concerns
- 1000 particles at 60fps with per-particle glow passes may be heavy on low-end mobile. The quality tiers (full/reduced/low) mitigate this, but quality auto-detection (based on frame rate) is not yet implemented.
- The glow pass in `worldMapParticles.ts` runs for every particle where `shimmer > 0.8` (roughly ~20% of particles per frame). This could be reduced further with a `reduceGlow` flag.
- `drawMap()` is called every frame even when particles haven't changed significantly. A dirty-flag optimization (only redraw when particle state changes meaningfully) would reduce overdraw.

### Files to inspect first in a future session
- `src/app/game-app.ts` — bootstrap and navigation wiring (all screen transitions live here)
- `src/app/app-game-loop.ts` — game loop with stop/start control
- `src/ui/world-map/WorldMapScreen.ts` — world map with particle integration and animation loop
- `src/render/world-map/worldMapParticles.ts` — particle simulation (new)
- `src/ui/panels/rpg-menu-tab.ts` — Back to World Map / Back to Main Menu confirmation flow
- `src/ui/panels/rpg-menu-panel.ts` — passes `navCallbacks` through to tab pane
- `src/styles/panels.css` — nav button styles (at end of file)

---



## What was implemented

### Math objective system
- **Core type system** in `src/sim/rpg/math-objective-types.ts`: `MathObjective`, 11-kind discriminated union, `HasMathObjective`, `quantizeMathDamage`, `formatMathCompact`.
- **Evaluation logic** in `src/sim/rpg/math-objectives.ts`: factory helpers for all 11 kinds, `evaluateHit`, `applyAcceptedHit`, `applyRejectedHit`, `tickObjectiveFeedback`.
- **Supported objective kinds**: `threshold` (>=N), `exact` (=N), `digitEnding` (_N), `modulo` (mod M=R), `hitCount` (#N), `sumTarget` (Sigma N), `sequence` (increasing / differentValues / exactSequence), `factor` (|N), `approximate` (~=N), `integralAccumulation` (integral N), `geometryArea` (A=WxH).
- **Damage integration** in `rpg-damage.ts`: `maybeApplyMathObjectiveDamage` helper integrated into all 16 body-enemy damage functions (including AlivenSwarm). Rejected hits return 0 and do not subtract HP. Solved objectives set `hp = 0` so existing `removeDeadEnemies` logic fires XP, lucky motes, and wave completion normally.
- **Visual overlay** in `src/render/rpg/rpg-math-objective-draw.ts`:
  - Progress ring/arc, central symbol, compact value text.
  - **Actual feedback text** displayed (e.g. "needs ≥15", "too high (=25)", "Σ 45/200") — players see exactly what the objective requires.
  - **equationSnake display mode**: Diamond-class enemies render their equation text in gold (e.g. "x = 15", "12 → 19 → 27") for visual distinction.
  - SOLVED! burst animation (expanding gold ring + rising text).
  - `drawMathObjectivesForArray` generic helper called for all 16 body enemy types.
- **Enemy typing**: `mathObjective?: MathObjective` added to all 16 body-enemy interfaces.
- **Factory integration** in `rpg-factories.ts`: `maybeAttachMathObjective` attaches objectives at spawn time. Wave-progressive ramp. Per-enemy-kind biases at wave 31+.
  - Iolite → integralAccumulation/sumTarget.
  - Diamond → exact/exactSequence (equationSnake mode, **wave-scaled targets** so they match late-game ATK).
  - Quartz → factor/geometryArea.
  - Amethyst → sequence/sumTarget.
  - Citrine → modulo/digitEnding.
  - Nullstone → approximate (**directional feedback**: "too high!" / "too low").
  - Fracteryl → integralAccumulation/sumTarget.
  - Eigenstein → exactSequence (**wave-scaled**) / geometryArea.
  - Alivened → hitCount/sumTarget.
- **Render wiring** in `rpg-render.ts`: `drawMathObjectivesForArray` called after each body-enemy draw pass for all 16 enemy types. Low-graphics mode now correctly forwarded to `rpg-enemy-draw-adv.ts` (fixes advanced enemies ignoring the setting).
- **SOLVED! animation** in `rpg-math-objective-draw.ts`: expanding gold ring burst + rising "SOLVED!" text.

### Particle-life simulation enemies (AlivenSwarm)
- **Type definitions** (`rpg-enemy-types.ts`): `AlivenSwarmEnemy`, `AlivenSwarmParticle`, 4-tier interaction matrix.
- **Physics** (`rpg-enemy-updates-alivened.ts`): Particle Life simulation — group drift toward player, inter-particle attraction/repulsion via 4×4 matrix, cohesion, boundary clamping, velocity damping. Zero allocation in hot path (pre-allocated Float64Array force buffers).
- **Drawing** (`rpg-enemy-draw-adv.ts`): Per-particle glow dots with tier-matched colors, HP bar, math objective overlay at centroid.
- **Damage** (`rpg-damage.ts`): `damageAlivenSwarmEnemy` — hits nearest particle, removes it on kill, recomputes total HP. Math objective routing supported.
- **Factory** (`rpg-factories.ts`): `makeAlivenSwarmEnemy` spawns `ALIVEN_PARTICLE_COUNT` particles evenly distributed across 4 tiers.
- **Spawn** (`rpg-enemy-spawn.ts`): `spawnEnemyById` handles `'alivened'`.
- **Wave integration** (`wave-definitions.ts`): Alivened swarms appear from wave 95+ (1–2 per wave).
- **Wave lifecycle** (`rpg-wave-manager.ts`): `removeDeadEnemies` sweeps empty/zero-HP swarms; `checkWaveCompletion` waits for all swarms.
- **Targeting** (`rpg-targeting.ts`): Targets nearest living particle within the swarm.

## What is NOT yet implemented

- **Full sinuous equation snake body**: equationSnake mode renders the equation text label in gold above the enemy, but does not implement a per-glyph segmented body that follows the enemy's movement path. Full body rendering is deferred.
- **Solvability guard**: no check at spawn time that objective targets are reachable by the player. The wave-scaled exact targets (for Diamond/Eigenstein) partially address this, but a proper guard using player ATK is not implemented.
- **Companion ship hit filtering**: companion ship attacks count toward math objectives. A `sourceRules` field on `MathObjective` could filter this.
- **Damage-shaping player tools**: no charge attacks, digit modifiers, or weapon runes to help players hit specific math values.
- **Tutorial banners**: no first-encounter explanation for each objective kind.
- **Persist seen-objectives set**: tutorial hint system not implemented yet.
- **Wave-definition-level objective hints**: `wave-definitions.ts` cannot force a specific objective kind on a spawn entry.

## Known limitations

- Math objectives evaluate post-DEF damage. This means high-DEF enemies reduce the effective damage value seen by the objective.
- Feedback text from multiple enemies may visually overlap on crowded screens.
- The label cache in `rpg-math-objective-draw.ts` evicts entries in insertion order (FIFO, not strict LRU).
- AlivenSwarm force buffers are allocated as Float64Array(64) — swarms with more than 64 particles would overflow. Current `ALIVEN_PARTICLE_COUNT` is well below this limit.

## Recommended next work

1. **Full equation snake body** — implement a sinuous segmented glyph body path for `displayMode: 'equationSnake'` enemies. Requires storing a position trail on the enemy and placing glyphs at trail points.
2. **Solvability guard** — at factory creation time, pass player ATK to `maybeAttachMathObjective` and clamp/scale exact targets to the achievable damage range.
3. **Damage-shaping tools** — charge attack (multiplies next hit value), digit lock (forces last digit of next hit), precision rune (reduces damage variance) as RPG upgrade options.
4. **Source filtering** — `sourceRules` on `MathObjective` to exclude companion ship hits.
5. **Tutorial system** — show a brief label on first encounter of each objective kind.
6. **Persist seen-objectives set** across sessions so tutorials only show once.
7. **Wave-definition-level objective hints** — scripted tutorial waves that force a specific objective kind.

## Design decisions

- Math objectives evaluate post-DEF damage (documented in `rpg-damage.ts`).
- Wave attachment ratios (25%/30%/35%/40%) are conservative; tune based on playtesting.
- `approximate` objectives give directional feedback ("too high!" vs "too low") so players can adjust their weapon tier/combo.
