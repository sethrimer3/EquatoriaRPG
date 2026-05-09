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
- **Campaign difficulty scaling** — `waveBaseLevel` field on `LevelDefinition`; `WORLD_WAVE_BASE_LEVEL` map in `worldLevelPlans.ts` (0 for World 1 → 132 for World 11); `getEffectiveWave()` on `EnemySpawnCtx` / `WaveManagerCtx` drives enemy HP/ATK/DEF; `setWaveBaseLevel()` on `RpgRender`; called from `game-app.ts onPlay`
- **Base6 challenge completion tracking** (bug fix) — `markLevelComplete()` in `worldMapProgression.ts` now checks `base6Set` first and records IDs in `completedBase6Ids`; previously completions were silently dropped
- **All 110 Base6 LevelDefinitions** — all 11 worlds × 10 challenges fully defined in `worldLevelPlans.ts`

### World map UX
- Hover tooltip with right-edge clamping
- Level progress dots (colour-coded; boss dot larger)
- Completed-world gold ring + ✓ checkmark
- World-unlock pulse animation — `scheduleNewWorldHighlight()` + `detectNewlyUnlockedWorlds()`
- FPS auto-detection — step-down at < 30 FPS, step-up at > 50 FPS; persisted to `SettingsState`
- **Enriched detail panel** — mandatory level descriptions shown below level names for unlocked/completed levels; reward badges (`✦ Reward`) on completed levels; boss mechanics list (`wm-boss-mechanics`) beneath boss info card; Base6 challenge rules shown as subtitle when unlocked; Base6 reward badges on completion; dev right-click marks Base6 complete

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

1. **World-map level dots clickable**: Currently the world node opens a detail panel. Individual level progress dots drawn on the canvas could be tappable to jump directly to the LevelScreen for that level (requires storing dot hit regions after `drawMap()`).

2. **Per-enemy-kind solvability guard**: Diamond/eigenstein/fracteryl enemies have unique attack patterns. Clamping their `mathObjective` targets independently (not just via generic `clampToReachable`) would improve difficulty fairness.

3. **Offline / background progress**: No progress accumulates while closed. Even a simple "away for X min → Y motes" screen would improve retention.

4. **Boss-completion grade in world map detail panel**: `bossCompletions: Map<number, number>` lives in `RpgSimState`. Exposing best-time grades (S/A/B/C) in the world map detail panel would reward skilled play. Requires passing `RpgSimState` into `DetailPanelCtx`.

5. **World-specific music**: Background ambiance currently only distinguishes "equation" tab. Worlds could have distinct music themes started by `goToWorldMusic(worldId)`.

6. **Accessibility audit**: Keyboard-only navigation through world map and RPG menus; ARIA roles for canvas overlays; color-blind mode for tier dots.
