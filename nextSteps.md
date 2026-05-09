# nextSteps.md — Continue Implementation

---

## Implemented (this session)

### `waveCount` in `LevelDefinition`
- Added `readonly waveCount?: number` to `LevelDefinition` type (`levelTypes.ts`).
- Updated `def()` helper in `worldLevelPlans.ts` to accept it as an optional last arg.
- All 11 boss levels (level 10 of each world) set `waveCount: 5`.
- `game-app.ts` `onPlay` uses `levelDef.waveCount ?? (levelDef.type === 'boss' ? 5 : 3)`.

### "🗺 Return to Map" post-completion CTA overlay button
- A `.lvl-complete-overlay` DOM element (fixed, z=70) with a pulsing gold `.lvl-complete-overlay__btn` button is shown after `onLevelComplete` fires.
- Hidden automatically when `showWorldMap()` is called, or when a new level starts.
- CSS: animated `lvl-cta-pulse` keyframe gives it a breathing glow effect.

### World-unlock pulse animation on world-map nodes
- Added `scheduleNewWorldHighlight(worldId: WorldId)` to the `WorldMapScreen` interface.
- When called, the target node plays a 4 s gold pulsing ring + "NEW!" label animation.
- `game-app.ts` `onLevelComplete` snapshots previously-unlocked worlds, calls `markLevelComplete`, finds newly-unlocked worlds, and calls `scheduleNewWorldHighlight` for each.

### Hover tooltip on world-map canvas nodes
- A `.wm-node-tooltip` DOM element is positioned in the `wm-body` so it can overflow the canvas area without clipping.
- Appears on `mousemove` over a node; shows world name, chapter, and unlock state.
- Hides on `mouseleave` or when cursor moves off a node.
- CSS in `world-map.css`.

### FPS auto-detection in world-map anim loop
- Rolling FPS tracked each frame in `animFrame`.
- If FPS < 30 for ≥ 3 s: automatically reduces particle quality (`full → reduced`, then `reduced → low`).
- If FPS > 50 for ≥ 5 s at reduced quality: restores one step upward.
- Manual quality changes via `setParticleQuality()` reset FPS accumulators to avoid immediate re-override.

### Tutorial banners for first-encounter math objectives
- Module-level `_seenObjectiveKinds` session Set in `rpg-math-objective-draw.ts`.
- When a player encounters an objective kind for the first time, a brief (4 s) explanatory banner appears at the top of the canvas.
- Banner fades in/out and shows a gold-bordered pill with a human-readable explanation (e.g. "Deal EXACTLY the shown damage!").
- `resetObjectiveTutorials()` is called when `setActive(true)` is invoked (new level start).

### Solvability guard for math objectives
- Module-level `_currentPlayerAtk` in `rpg-math-objective-factory.ts`, updated via `setCurrentPlayerAtk(atk)`.
- `applyEquipmentStats()` in `rpg-render.ts` calls `setCurrentPlayerAtk(playerStats.atk)` on every stat update.
- All exact/threshold/sumTarget targets in the generic wave-tier bucket are clamped through `clampToReachable(value, maxMult)` so objectives are always achievable with a realistic number of hits at the player's current ATK.

### Level progress dots on world-map nodes
- Small dots arranged horizontally below the world name on each node.
- Completed levels → world-color dots.
- Current level → accent-blue dot.
- Upcoming levels → dim white dots.
- Boss level dot is slightly larger (1.4× radius).
- Only shown when world is unlocked/current/completed (not locked).

---

## Files changed (this session)

- `src/types/levelTypes.ts` — `waveCount?` in `LevelDefinition`
- `src/data/worldLevelPlans.ts` — `def()` accepts `waveCount`; all 11 boss defs get `waveCount: 5`
- `src/app/game-app.ts` — `waveCount` usage in onPlay; world-unlock detection; Return-to-Map overlay; `getWorldUnlockState`/`WorldId` imports
- `src/ui/world-map/WorldMapScreen.ts` — `scheduleNewWorldHighlight`, unlock-flash animation, hover tooltip, FPS auto-quality, level progress dots
- `src/render/rpg/rpg-math-objective-draw.ts` — tutorial banner system (`maybeShowTutorialBanner`, `drawTutorialBanner`, `resetObjectiveTutorials`, `OBJECTIVE_EXPLANATIONS`)
- `src/render/rpg/rpg-math-objective-factory.ts` — `setCurrentPlayerAtk`, `clampToReachable`, clamped generic bucket targets
- `src/render/rpg/rpg-render.ts` — `drawTutorialBanner` + `resetObjectiveTutorials` call-sites; `setCurrentPlayerAtk` call in `applyEquipmentStats`
- `src/styles/canvas.css` — `.lvl-complete-overlay` + `.lvl-complete-overlay__btn` + `@keyframes lvl-cta-pulse`
- `src/styles/world-map.css` — `.wm-node-tooltip`

---

## What still needs work

1. **World-map level granularity (sub-nodes)**: The progress dots give per-level feedback, but individual tappable level sub-nodes arranged around each world node would be even clearer. Each sub-node could show the level number + type, be tappable, and open the LevelScreen directly.

2. **Charge attack mechanic**: A hold-to-charge mechanic (joystick or spacebar) that builds damage (1× → 2× → 3×) over 1–2 seconds would add depth for exact/threshold objectives. Requires:
   - Charge state on player
   - Visual charging effect (expanding glow)
   - Damage multiplier applied on release

3. **Persistent session tracking for tutorials**: Currently `_seenObjectiveKinds` is per-session (page reload clears it). Persisting this set to `localStorage` would let returning players skip redundant hints across sessions.

4. **Level node granularity on world map spiral**: Full separate sub-node ring around each world node, each tappable to open a specific level's LevelScreen.

5. **Per-enemy-kind solvability guard**: The `clampToReachable` function is only applied to the generic bucket. The per-enemy-kind biases (diamond, eigenstein, etc.) already use `getWaveStatScale` scaling and are less likely to need clamping, but could be hardened further.

6. **Auto-particle quality persistence**: Currently FPS auto-detection changes quality at runtime but doesn't save the reduced setting to `SettingsState`. If a device consistently runs below 30 fps, the auto-reduction should write back to settings on the next save.

7. **Back-button / swipe gesture**: On Android/iOS, the system back gesture currently reloads the page (which triggers a save). A proper in-app back handler would let players go from RPG → World Map without a reload.

8. **Enemy wave scaling for campaign levels**: Currently all campaign levels share the same wave-definition data from `wave-definitions.ts`. Level-specific tuning (weaker enemies for early levels, specific enemy mixes per world theme) would make each level feel unique.
