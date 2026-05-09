# nextSteps.md — Continue Implementation

---

## Implemented (across recent sessions)

### Core gameplay / campaign features
- `waveCount` in `LevelDefinition` — boss levels = 5 waves; used in `game-app.ts onPlay`
- Per-world wave enemy bias — 11 `BIAS_*` constants; `WaveManagerCtx.getWaveEnemyBias()` injects into `startNextWave()`; `setWaveEnemyBias()` on `RpgRender`
- Charge attack — Space/F hold → up to 3× ATK; arc ring + "CHARGED!" text; `updateChargeAttack()` helper with try-finally ATK safety
- Mobile charge button — `#mobile-charge-btn` touch-only; synthetic KeyF events
- Charge SFX — `onChargeReady()` + `onChargeRelease()` in `AudioSystem`
- Level intro banner — `setLevelName()` on `RpgRender`; 3 s fade-in/out at level start
- Solvability guard — `clampToReachable()` + `setCurrentPlayerAtk()` in `rpg-math-objective-factory.ts`
- Tutorial banners — first-encounter explanations; persistent via `equatoria_seen_objectives` localStorage
- Level completion CTA — "🗺 Return to Map" pulsing DOM overlay button

### World map UX
- Hover tooltip with right-edge clamping
- Level progress dots (colour-coded; boss dot larger)
- Completed-world gold ring + ✓ checkmark
- World-unlock pulse animation — `scheduleNewWorldHighlight()` + `detectNewlyUnlockedWorlds()`
- FPS auto-detection — step-down at < 30 FPS, step-up at > 50 FPS; persisted to `SettingsState`

### Settings
- "💡 Reset Tutorial Hints" button — clears `equatoria_seen_objectives` localStorage
- FPS auto-quality persistence — `onAutoQualityChange` callback writes back to settings

### LevelScreen
- Enemy badge — top 4 promoted enemy types as colour abbreviation tags
- Wave count label — "⚔ N Waves" / "👑 N Boss Waves"

### Navigation
- Back-button / swipe: History API `pushState({ screen: 'arena' })`; `popstate` returns to world map

### Documentation
- `ARCHITECTURE.md` — world map particle/UX system, enemy bias, charge attack, level completion flow, navigation diagram
- `manual_test_checklist.md` — 30+ new checks for all new features
- `file_index.md` — updated entries

---

## What still needs work

1. **Campaign wave tuning per level**: All campaign levels share wave definitions from `wave-definitions.ts`. Level-specific tuning (enemy HP scaling, spawn rate) would differentiate early and late levels. Approach: add `waveScaleFactor?: number` to `LevelDefinition` passed through to `startNextWave()`.

2. **World-map sub-nodes / level dots clickable**: Currently the world node opens a detail panel. Individual level dots could be tappable to jump directly to the LevelScreen for that level.

3. **Per-enemy-kind solvability guard**: Diamond/eigenstein/fracteryl enemies have unique attack patterns. Clamping their `mathObjective` targets independently (not just via generic `clampToReachable`) would improve difficulty fairness.

4. **Base 6 LevelDefinitions**: Most Base 6 challenge IDs are not yet in `WORLD_LEVEL_PLANS`. Add definitions or a fallback that creates a generic layout from challenge metadata.

5. **Offline / background progress**: No progress accumulates while closed. Even a simple "away for X min → Y motes" screen would improve retention.

6. **Boss-completion grade in world map detail panel**: `bossCompletions: Map<number, number>` lives in `RpgSimState`. Exposing best-time grades (S/A/B/C) in the world map detail panel would reward skilled play. Requires passing `RpgSimState` into `DetailPanelCtx`.

7. **World-specific music**: Background ambiance currently only distinguishes "equation" tab. Worlds could have distinct music themes started by `goToWorldMusic(worldId)`.

8. **Accessibility audit**: Keyboard-only navigation through world map and RPG menus; ARIA roles for canvas overlays; color-blind mode for tier dots.
