# nextSteps.md — Continue Implementation

---

## Implemented (previous sessions + this session)

### `waveCount` in `LevelDefinition`
- Added `readonly waveCount?: number` to `LevelDefinition` type.
- All 11 boss levels (level 10 of each world) get `waveCount: 5`.
- `game-app.ts` `onPlay` uses `levelDef.waveCount ?? (levelDef.type === 'boss' ? 5 : 3)`.

### "🗺 Return to Map" post-completion CTA overlay button
- `.lvl-complete-overlay` DOM element with a pulsing gold button.
- Shown after `onLevelComplete` fires; hidden on `showWorldMap()` or new level start.

### World-unlock pulse animation on world-map nodes
- `scheduleNewWorldHighlight(worldId)` queues a 4 s gold pulsing ring + "NEW!" label animation.
- `detectNewlyUnlockedWorlds(prevUnlocked, state)` helper in `game-app.ts`.

### Hover tooltip on world-map canvas nodes
- `.wm-node-tooltip` DOM element shows world name, chapter, and unlock state.
- Right-edge clamping prevents overflow beyond the canvas.

### FPS auto-detection in world-map anim loop
- Rolling FPS tracked each frame; auto-reduces/restores particle quality.

### Tutorial banners for first-encounter math objectives
- First encounter of each objective kind → 4 s gold pill banner explaining the mechanic.
- **Persistent across sessions**: `_seenObjectiveKinds` is stored in `localStorage` under `equatoria_seen_objectives`.
- `resetObjectiveTutorials()` only clears the active banner, not the seen set.

### Solvability guard for math objectives
- `setCurrentPlayerAtk(atk)` / `clampToReachable(value, maxMult)` in `rpg-math-objective-factory.ts`.
- `applyEquipmentStats()` keeps the factory in sync.

### Level progress dots on world-map nodes
- Small dots below world name showing completed/current/future mandatory levels.

### Charge attack mechanic
- Space/F hold builds `chargeMs` (0→1500ms max); release fires boosted shot (up to 3× ATK).
- `updateChargeAttack(deltaMs)` helper in `rpg-render.ts`.
- Visual: expanding arc ring + "CHARGED!" text at full charge.
- Canvas hint `[Space/F] Charge shot` shown in first 3 waves.

### Mobile charge button
- `#mobile-charge-btn` fixed-position DOM button (bottom-right, z=68).
- Visible only on coarse-pointer (touch) devices via `@media (pointer: fine)` hide.
- Fires synthetic `KeyF` keydown/keyup events so the same charge-attack path handles both mobile and desktop.
- Shown when arena starts; hidden on `showWorldMap()`.

---

## Files changed (this session)
- `src/types/levelTypes.ts` — `waveCount?`
- `src/data/worldLevelPlans.ts` — boss levels `waveCount: 5`
- `src/app/game-app.ts` — mobile charge button; `detectNewlyUnlockedWorlds` helper; waveCount usage; overlay wiring
- `src/ui/world-map/WorldMapScreen.ts` — scheduleNewWorldHighlight, FPS auto-quality, hover tooltip (w/ clamping), level progress dots
- `src/render/rpg/rpg-math-objective-draw.ts` — tutorial banner system (persistent localStorage)
- `src/render/rpg/rpg-math-objective-factory.ts` — solvability guard
- `src/render/rpg/rpg-render.ts` — charge attack, tutorial banner draw, `updateChargeAttack` helper
- `src/render/rpg/rpg-input.ts` — Space/KeyF charge key
- `src/render/rpg/rpg-types.ts` — `RpgKeyState.charge`
- `src/styles/canvas.css` — `.lvl-complete-overlay`, `#mobile-charge-btn`
- `src/styles/world-map.css` — `.wm-node-tooltip`
- `file_index.md` — updated entries

---

## What still needs work

1. **Campaign wave tuning per level**: Currently all campaign levels share the same wave-definition data from `wave-definitions.ts`. Level-specific tuning (weaker enemies for early levels, specific enemy mixes per world theme) would make each level feel unique.

2. **World-map level granularity (sub-nodes)**: Individual tappable level sub-nodes arranged around each world node. Each could show level number + type and open the LevelScreen directly.

3. **Auto-particle quality persistence**: FPS auto-reduction changes quality at runtime but doesn't write back to `SettingsState`. A persistent "reduced" setting would survive reloads on low-end devices.

4. **Per-enemy-kind solvability guard**: The diamond/eigenstein biases use `getWaveStatScale` scaling (already wave-appropriate). The `clampToReachable` guard only applies to the generic bucket. Per-kind targets could also be hardened.

5. **Back-button / swipe gesture**: Android/iOS system back gesture currently reloads the page. An in-app back handler would let players navigate RPG → World Map without a reload.

6. **Base 6 LevelDefinitions**: Most Base 6 challenge IDs are not yet in `WORLD_LEVEL_PLANS`. Either add definitions, or add a fallback that creates a generic Base 6 level layout from the challenge metadata.

7. **Offline/background progress**: The game currently accumulates no progress while closed. Even a simple "you were away for X minutes, here's Y motes" screen would improve retention.

8. **Sound effects for charge attack**: The charge build-up and release currently have no audio feedback.
