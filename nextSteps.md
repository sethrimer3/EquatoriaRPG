# nextSteps.md — Math Objective System

## What was implemented

- **Core type system** in `src/sim/rpg/math-objective-types.ts`: `MathObjective`, 11-kind discriminated union, `HasMathObjective`, `quantizeMathDamage`, `formatMathCompact`.
- **Evaluation logic** in `src/sim/rpg/math-objectives.ts`: factory helpers for all 11 kinds, `evaluateHit`, `applyAcceptedHit`, `applyRejectedHit`, `tickObjectiveFeedback`.
- **Supported objective kinds**: `threshold` (>=N), `exact` (=N), `digitEnding` (_N), `modulo` (mod M=R), `hitCount` (#N), `sumTarget` (Sigma N), `sequence` (increasing / differentValues / exactSequence), `factor` (|N), `approximate` (~=N), `integralAccumulation` (integral N), `geometryArea` (A=WxH).
- **Damage integration** in `rpg-damage.ts`: `maybeApplyMathObjectiveDamage` helper integrated into all 15 body-enemy damage functions. Rejected hits return 0 and do not subtract HP. Accepted hits on sum/count objectives mirror progress in HP visually; solved objectives set `hp = 0` so existing `removeDeadEnemies` logic fires XP, lucky motes, and wave completion normally.
- **Visual overlay** in `src/render/rpg/rpg-math-objective-draw.ts`: progress ring/arc, central symbol, compact value text, accepted/rejected feedback flash. `drawMathObjectivesForArray` is generic and safe to call on any array.
- **Enemy typing**: `mathObjective?: MathObjective` added to all 16 body-enemy interfaces across `rpg-enemy-types.ts` and `rpg-types.ts`.
- **Factory integration** in `rpg-factories.ts`: `maybeAttachMathObjective` attaches objectives at spawn time. Wave-progressive ramp: waves 1-5 (tutorial: threshold/hitCount only, 25% chance), waves 6-15 (moderate mix, 30%), waves 16-30 (advanced including sumTarget/factor/sequence, 35%), later waves (enemy-type-specific biases, 40%).
  - Iolite biased toward integralAccumulation and sumTarget.
  - Diamond biased toward exact (equationSnake mode) and exactSequence.
  - Quartz biased toward factor and geometryArea.
  - Amethyst biased toward sequence and sumTarget.
  - Citrine biased toward modulo and digitEnding.
  - Nullstone biased toward approximate.
- **Render wiring** in `rpg-render.ts`: `drawMathObjectivesForArray` called after each body-enemy draw pass for all 15 enemy types.
- **File index** updated in `file_index.md`.

## What was NOT implemented

- **Full equation snake body**: currently falls back to a compact monospace label above the enemy with a subtle colored underline (equationSnake display mode). Full segmented glyph body rendering (sinuous path, per-glyph positioned segments) is deferred.
- **Solvability analysis**: no check at objective creation time that the target is reachable given the player's current weapon damage range. A player with very low ATK could receive an exact=25 objective before they can deal 25 damage.
- **Overshoot punishment**: no "do not exceed N" mechanic for nullstone or others.
- **Companion ship hit filtering**: companion ship attacks (SapphireShip, AmethystShip) go through the same damage path and currently count toward math objectives. A `sourceRules` field on `MathObjective` could filter this later.
- **Damage-shaping player tools**: no charge attacks, digit modifiers, or weapon runes to help players hit specific values. Exact and digitEnding objectives currently depend on natural damage variance.
- **Solved animation**: no special "SOLVED!" burst visual beyond the normal death explosion.
- **Tutorial banners**: no first-encounter explanation for each objective kind.

## Known limitations

- Math objectives use post-DEF damage. This means a high-DEF enemy reduces the value the objective evaluates, which can make threshold objectives easier to satisfy (smaller effective hit qualifies) but exact objectives harder (damage variance is amplified relative to a small exact target). This is documented explicitly in `rpg-damage.ts`.
- Exact objective targets are capped at small integers (5 to 30 in waves 6-15). Late-game players with high ATK will likely overshoot these trivially. Exact targets should scale with player ATK in a future pass.
- Feedback text from multiple enemies may visually overlap on crowded screens.
- The label cache in `rpg-math-objective-draw.ts` evicts entries in insertion order (using Map iteration), which is a simple but not strictly LRU eviction.

## Recommended next work

1. **Full equation snake body** — implement a sinuous segmented glyph path for `displayMode: 'equationSnake'` enemies. Each glyph occupies one body segment that follows the enemy's movement path.
2. **Solvability guard** — at factory creation time, estimate the player's damage range from `rpgSimState.playerStats.atk` and bias or reject objectives that are statistically impossible.
3. **Damage-shaping tools** — add charge attack (multiplies next hit value), digit lock (forces last digit of next hit), and precision rune (reduces damage variance) as RPG upgrade options.
4. **Scaled exact targets** — make exact/digitEnding targets proportional to current player ATK so they remain challenging at higher levels.
5. **Source filtering** — add `sourceRules` to `MathObjective` to allow objectives to ignore or require specific attack sources (e.g., direct hits only, or companion ships excluded).
6. **Overshoot punishment** for nullstone: reject if damage > target.
7. **Solved animation** — spawn a "SOLVED!" damage number and a brief ring flash in a distinct gold/white color on objective completion.
8. **Tutorial system** — show a brief label on first encounter of each objective kind explaining the rule.
9. **Persist seen-objectives set** across sessions so tutorials only show once.
10. **Wave-definition-level objective hints** — allow `wave-definitions.ts` to specify that a particular spawn entry should always receive a given objective kind, for scripted tutorial waves.

## Design decisions for review

- Math objectives evaluate post-DEF damage. Is this the right interaction, or should objectives see pre-DEF raw damage instead?
- Companion ship hits count toward objectives. Should they be excluded?
- Wave attachment ratios (25%/30%/35%/40%) are conservative. Tune based on playtesting.
- Exact objective targets (5-30) may become trivial for high-ATK players. Consider a dynamic range formula.
- The equation snake label fallback uses 6px monospace text above the enemy. Is this readable enough on small screens?
