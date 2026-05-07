# nextSteps.md — Math Objective System & Particle-Life Enemies

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
