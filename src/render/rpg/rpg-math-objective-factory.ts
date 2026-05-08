/**
 * rpg-math-objective-factory.ts — Math objective assignment for RPG enemies.
 *
 * Extracted from rpg-factories.ts to keep that file focused on enemy/entity
 * construction and reduce its overall size.
 *
 * `maybeAttachMathObjective` is a pure, side-effect-free function: it either
 * assigns a `mathObjective` to the given enemy object or does nothing.
 *
 * Spawn chances:
 *   waves  1– 5 → 25%
 *   waves  6–15 → 30%
 *   waves 16–30 → 35%
 *   waves 31+   → 40%
 *
 * Per-kind biases (applied at wave 31+):
 *   iolite     → integralAccumulation (60%) / sumTarget (40%)
 *   diamond    → exact (50%) / sequence exactSequence (50%)
 *   quartz     → factor (50%) / geometryArea (50%)
 *   amethyst   → sequence increasing/differentValues (50%) / sumTarget (50%)
 *   citrine    → modulo (50%) / digitEnding (50%)
 *   nullstone  → approximate (100%)
 *   fracteryl  → integralAccumulation (50%) / sumTarget (50%)
 *   eigenstein → sequence exactSequence (50%) / geometryArea (50%)
 *   alivened   → hitCount (50%) / sumTarget (50%)
 */

import { getWaveStatScale } from '../../sim/rpg/rpg-state';
import type { MathObjective } from '../../sim/rpg/math-objective-types';
import {
  makeThresholdObjective,
  makeExactObjective,
  makeDigitEndingObjective,
  makeModuloObjective,
  makeHitCountObjective,
  makeSumTargetObjective,
  makeFactorObjective,
  makeApproximateObjective,
  makeSequenceObjective,
  makeIntegralObjective,
  makeGeometryAreaObjective,
} from '../../sim/rpg/math-objectives';
import { ALIVEN_PARTICLE_COUNT } from './rpg-enemy-constants';

/**
 * Randomly assigns a math objective to a body-enemy based on wave tier and
 * optionally an enemy-kind-specific bias.
 */
export function maybeAttachMathObjective(
  enemy: { mathObjective?: MathObjective },
  waveNumber: number,
  accentColor: string,
  enemyKind?: string,
): void {
  let chance: number;
  if (waveNumber <= 5) chance = 0.25;
  else if (waveNumber <= 15) chance = 0.30;
  else if (waveNumber <= 30) chance = 0.35;
  else chance = 0.40;

  if (Math.random() >= chance) return;

  const rand = Math.random();

  // ── Per-enemy-kind biases at wave 31+ ─────────────────────────
  if (waveNumber > 30 && enemyKind) {
    switch (enemyKind) {
      case 'iolite': {
        const intTarget = 80 + Math.floor(Math.random() * 200);
        if (rand < 0.60) {
          enemy.mathObjective = makeIntegralObjective(intTarget, accentColor);
        } else {
          enemy.mathObjective = makeSumTargetObjective(100 + Math.floor(Math.random() * 200), accentColor);
        }
        return;
      }
      case 'diamond': {
        // Scale exact targets proportionally to wave so they remain reachable by
        // higher-ATK players.  At wave 31, exactScale ≈ 2.1; at wave 100 ≈ 5.0.
        const exactScale = Math.max(1, getWaveStatScale(waveNumber) / 4);
        if (rand < 0.50) {
          const target = Math.ceil((5 + Math.random() * 20) * exactScale);
          enemy.mathObjective = makeExactObjective(target, accentColor, 'equationSnake');
        } else {
          const seqLen = 3 + Math.floor(Math.random() * 2);
          const seq: number[] = [];
          let v = Math.ceil((5 + Math.random() * 20) * exactScale);
          for (let i = 0; i < seqLen; i++) {
            seq.push(v);
            v += Math.ceil((3 + Math.random() * 8) * exactScale);
          }
          enemy.mathObjective = makeSequenceObjective('exactSequence', accentColor, seq);
        }
        return;
      }
      case 'quartz': {
        const FACTORS = [12, 18, 24, 30, 36, 42, 48, 60];
        if (rand < 0.50) {
          enemy.mathObjective = makeFactorObjective(
            FACTORS[Math.floor(Math.random() * FACTORS.length)], accentColor,
          );
        } else {
          const w = 4 + Math.floor(Math.random() * 8);
          const h = 4 + Math.floor(Math.random() * 8);
          enemy.mathObjective = makeGeometryAreaObjective(w, h, accentColor);
        }
        return;
      }
      case 'amethyst': {
        if (rand < 0.50) {
          const seqKind = rand < 0.25 ? 'increasing' : 'differentValues';
          enemy.mathObjective = makeSequenceObjective(seqKind, accentColor);
        } else {
          enemy.mathObjective = makeSumTargetObjective(80 + Math.floor(Math.random() * 200), accentColor);
        }
        return;
      }
      case 'citrine': {
        if (rand < 0.50) {
          const moduli = [2, 3, 5, 7];
          const m = moduli[Math.floor(Math.random() * moduli.length)];
          enemy.mathObjective = makeModuloObjective(m, Math.floor(Math.random() * m), accentColor);
        } else {
          enemy.mathObjective = makeDigitEndingObjective(Math.floor(Math.random() * 10), accentColor);
        }
        return;
      }
      case 'nullstone': {
        const target = 30 + Math.floor(Math.random() * 50);
        const tol = 2 + Math.floor(Math.random() * 5);
        enemy.mathObjective = makeApproximateObjective(target, tol, accentColor);
        return;
      }
      case 'fracteryl': {
        const fracTarget = 120 + Math.floor(Math.random() * 300);
        if (rand < 0.50) {
          enemy.mathObjective = makeIntegralObjective(fracTarget, accentColor);
        } else {
          enemy.mathObjective = makeSumTargetObjective(fracTarget, accentColor);
        }
        return;
      }
      case 'eigenstein': {
        // Scale sequence values with wave so they match player's growing ATK.
        const exactScale = Math.max(1, getWaveStatScale(waveNumber) / 4);
        if (rand < 0.50) {
          const seqLen = 3 + Math.floor(Math.random() * 3);
          const seq: number[] = [];
          let v = Math.ceil((5 + Math.random() * 15) * exactScale);
          for (let i = 0; i < seqLen; i++) {
            seq.push(v);
            v += Math.ceil((3 + Math.random() * 8) * exactScale);
          }
          enemy.mathObjective = makeSequenceObjective('exactSequence', accentColor, seq);
        } else {
          const w = 5 + Math.floor(Math.random() * 10);
          const h = 5 + Math.floor(Math.random() * 10);
          enemy.mathObjective = makeGeometryAreaObjective(w, h, accentColor);
        }
        return;
      }
      case 'alivened': {
        // Each hit is per-particle, so hitCount and sumTarget reward consistent pressure
        if (rand < 0.50) {
          enemy.mathObjective = makeHitCountObjective(
            ALIVEN_PARTICLE_COUNT + Math.floor(Math.random() * ALIVEN_PARTICLE_COUNT), accentColor,
          );
        } else {
          enemy.mathObjective = makeSumTargetObjective(
            ALIVEN_PARTICLE_COUNT * 30 + Math.floor(Math.random() * 200), accentColor,
          );
        }
        return;
      }
    }
  }

  // ── Wave-tier generic bucket ───────────────────────────────────
  if (waveNumber <= 5) {
    if (rand < 0.5) {
      enemy.mathObjective = makeThresholdObjective(8 + Math.floor(Math.random() * 8), accentColor);
    } else {
      enemy.mathObjective = makeHitCountObjective(2 + Math.floor(Math.random() * 2), accentColor);
    }
  } else if (waveNumber <= 15) {
    if (rand < 0.30) {
      enemy.mathObjective = makeThresholdObjective(10 + Math.floor(Math.random() * 20), accentColor);
    } else if (rand < 0.50) {
      enemy.mathObjective = makeHitCountObjective(2 + Math.floor(Math.random() * 3), accentColor);
    } else if (rand < 0.75) {
      enemy.mathObjective = makeExactObjective(10 + Math.floor(Math.random() * 20), accentColor);
    } else {
      enemy.mathObjective = makeDigitEndingObjective(Math.floor(Math.random() * 10), accentColor);
    }
  } else if (waveNumber <= 30) {
    const FACTORS_MID = [12, 18, 24, 30, 36, 42];
    if (rand < 0.20) {
      enemy.mathObjective = makeThresholdObjective(20 + Math.floor(Math.random() * 40), accentColor);
    } else if (rand < 0.35) {
      enemy.mathObjective = makeHitCountObjective(3 + Math.floor(Math.random() * 3), accentColor);
    } else if (rand < 0.50) {
      enemy.mathObjective = makeExactObjective(15 + Math.floor(Math.random() * 30), accentColor);
    } else if (rand < 0.65) {
      enemy.mathObjective = makeDigitEndingObjective(Math.floor(Math.random() * 10), accentColor);
    } else if (rand < 0.80) {
      const moduli = [2, 3, 5];
      const m = moduli[Math.floor(Math.random() * moduli.length)];
      enemy.mathObjective = makeModuloObjective(m, Math.floor(Math.random() * m), accentColor);
    } else if (rand < 0.90) {
      enemy.mathObjective = makeFactorObjective(
        FACTORS_MID[Math.floor(Math.random() * FACTORS_MID.length)], accentColor,
      );
    } else {
      enemy.mathObjective = makeSumTargetObjective(50 + Math.floor(Math.random() * 100), accentColor);
    }
  } else {
    // Late-game generic bucket — now includes integral and geometry
    const FACTORS_LATE = [12, 18, 24, 30, 36, 42, 48, 60];
    const GEO_DIMS = [4, 5, 6, 7, 8, 9, 10, 12];
    if (rand < 0.12) {
      enemy.mathObjective = makeThresholdObjective(30 + Math.floor(Math.random() * 60), accentColor);
    } else if (rand < 0.22) {
      enemy.mathObjective = makeExactObjective(20 + Math.floor(Math.random() * 50), accentColor);
    } else if (rand < 0.31) {
      enemy.mathObjective = makeDigitEndingObjective(Math.floor(Math.random() * 10), accentColor);
    } else if (rand < 0.40) {
      const moduli = [2, 3, 5, 7];
      const m = moduli[Math.floor(Math.random() * moduli.length)];
      enemy.mathObjective = makeModuloObjective(m, Math.floor(Math.random() * m), accentColor);
    } else if (rand < 0.50) {
      enemy.mathObjective = makeFactorObjective(
        FACTORS_LATE[Math.floor(Math.random() * FACTORS_LATE.length)], accentColor,
      );
    } else if (rand < 0.60) {
      enemy.mathObjective = makeSumTargetObjective(80 + Math.floor(Math.random() * 200), accentColor);
    } else if (rand < 0.68) {
      enemy.mathObjective = makeHitCountObjective(4 + Math.floor(Math.random() * 3), accentColor);
    } else if (rand < 0.76) {
      const target = 20 + Math.floor(Math.random() * 60);
      const tol = 3 + Math.floor(Math.random() * 5);
      enemy.mathObjective = makeApproximateObjective(target, tol, accentColor);
    } else if (rand < 0.84) {
      enemy.mathObjective = makeSequenceObjective('increasing', accentColor);
    } else if (rand < 0.92) {
      enemy.mathObjective = makeIntegralObjective(80 + Math.floor(Math.random() * 200), accentColor);
    } else {
      const w = GEO_DIMS[Math.floor(Math.random() * GEO_DIMS.length)];
      const h = GEO_DIMS[Math.floor(Math.random() * GEO_DIMS.length)];
      enemy.mathObjective = makeGeometryAreaObjective(w, h, accentColor);
    }
  }
}
