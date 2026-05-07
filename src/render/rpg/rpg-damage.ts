/**
 * rpg-damage.ts — Per-entity damage functions for the RPG tab.
 *
 * Uses a factory pattern: createDamageFns() takes a recordDps callback
 * and returns all damage functions with the same signatures as before,
 * so they can be destructured in rpg-render.ts without changing call sites.
 */

import type {
  LaserEnemy,
  SapphireEnemy, SapphireMissile,
} from './rpg-types';
import type {
  EmeraldEnemy,
  AmberEnemy, AmberShard,
  VoidEnemy,
  QuartzEnemy, QuartzSpike,
  RubyEnemy, RubyBolt,
  SunstoneEnemy,
  CitrineEnemy, CitrineBolt,
  IoliteEnemy,
  AmethystEnemy, AmethystShard,
  DiamondEnemy, DiamondShard,
  NullstoneEnemy, VoidTendril,
  FracterylEnemy, FracterylShard,
  EigensteinEnemy,
  AlivenSwarmEnemy,
} from './rpg-enemy-types';
import type { MathObjective } from '../../sim/rpg/math-objective-types';
import {
  evaluateHit,
  applyAcceptedHit,
  applyRejectedHit,
  quantizeMathDamage,
} from '../../sim/rpg/math-objectives';
import { MINIMUM_SHIELD_DAMAGE } from './rpg-constants';

export interface DamageCtx {
  recordDps(dmg: number, color?: string): void;
}

/** Minimal interface required by maybeApplyMathObjectiveDamage. */
export interface MathObjectiveEnemy {
  hp: number;
  mathObjective?: MathObjective;
}

/**
 * If the enemy has a math objective, route the effective post-DEF damage through
 * the objective's evaluation instead of subtracting from HP normally.
 *
 * Returns:
 *  - null  → no math objective present; caller should use normal HP subtraction
 *  - 0     → objective rejected the hit (deflected); no HP damage, no DPS
 *  - effectiveDmg → objective accepted; HP was set to 0 if solved; returns dmg for DPS
 */
export function maybeApplyMathObjectiveDamage(
  enemy: MathObjectiveEnemy,
  effectiveDmg: number,
): number | null {
  if (!enemy.mathObjective) return null;
  const mathDmg = quantizeMathDamage(effectiveDmg);
  const result = evaluateHit(enemy.mathObjective, mathDmg);
  if (result.accepted) {
    applyAcceptedHit(enemy.mathObjective, mathDmg, result);
    if (enemy.mathObjective.solved) enemy.hp = 0;
    return effectiveDmg;
  } else {
    applyRejectedHit(enemy.mathObjective, result);
    return 0;
  }
}

export function createDamageFns(ctx: DamageCtx) {
  const { recordDps } = ctx;

  /** Deals damage from the player to one laser enemy, respecting DEF and a DEF pierce ratio.
   *  Returns the actual damage dealt (0 if DEF fully absorbed the hit). */
  function damageEnemy(enemy: LaserEnemy, rawDamage: number, defPierceRatio: number): number {
    const effectiveDef = enemy.def * (1 - defPierceRatio);
    const dmg = Math.max(0, rawDamage - effectiveDef);
    const mathResult = maybeApplyMathObjectiveDamage(enemy, dmg);
    if (mathResult !== null) {
      if (mathResult > 0) recordDps(mathResult, '#d3f3ff');
      return mathResult;
    }
    if (dmg > 0) {
      enemy.hp -= dmg;
      recordDps(dmg, '#d3f3ff');
    }
    return dmg;
  }

  /**
   * Deals damage to a sapphire enemy, handling the shield.
   * bypassShield = true means the ruby laser is firing — ignore the shield.
   * Returns { dmg, wasShield } where dmg is the effective damage applied.
   */
  function damageSapphireEnemy(
    enemy: SapphireEnemy,
    rawDamage: number,
    defPierceRatio: number,
    bypassShield: boolean,
  ): number {
    if (!bypassShield && enemy.shieldHp > 0) {
      // Shields always absorb at least MINIMUM_SHIELD_DAMAGE, making chip damage possible.
      const dmg = Math.max(MINIMUM_SHIELD_DAMAGE, rawDamage);
      enemy.shieldHp = Math.max(0, enemy.shieldHp - dmg);
      recordDps(dmg, '#6bd9ff');
      return dmg;
    }
    // Hit the enemy body.
    const effectiveDef = enemy.def * (1 - defPierceRatio);
    const dmg = Math.max(0, rawDamage - effectiveDef);
    const mathResult = maybeApplyMathObjectiveDamage(enemy, dmg);
    if (mathResult !== null) {
      if (mathResult > 0) recordDps(mathResult, '#6bd9ff');
      return mathResult;
    }
    if (dmg > 0) {
      enemy.hp -= dmg;
      recordDps(dmg, '#6bd9ff');
    }
    return dmg;
  }

  /** Deals damage to a missile (no DEF, no shield). Returns actual damage dealt. */
  function damageMissile(missile: SapphireMissile, rawDamage: number): number {
    const dmg = Math.max(MINIMUM_SHIELD_DAMAGE, rawDamage);
    missile.hp = Math.max(0, missile.hp - dmg);
    recordDps(dmg, '#6bd9ff');
    return dmg;
  }

  /** Deals damage to an emerald enemy. Returns actual damage dealt. */
  function damageEmeraldEnemy(enemy: EmeraldEnemy, rawDamage: number, defPierceRatio: number): number {
    const effectiveDef = enemy.def * (1 - defPierceRatio);
    const dmg = Math.max(0, rawDamage - effectiveDef);
    const mathResult = maybeApplyMathObjectiveDamage(enemy, dmg);
    if (mathResult !== null) {
      if (mathResult > 0) recordDps(mathResult, '#8fff8f');
      return mathResult;
    }
    if (dmg > 0) {
      enemy.hp -= dmg;
      recordDps(dmg, '#8fff8f');
    }
    return dmg;
  }

  /** Deals damage to an amber enemy. Returns actual damage dealt. */
  function damageAmberEnemy(enemy: AmberEnemy, rawDamage: number, defPierceRatio: number): number {
    const effectiveDef = enemy.def * (1 - defPierceRatio);
    const dmg = Math.max(0, rawDamage - effectiveDef);
    const mathResult = maybeApplyMathObjectiveDamage(enemy, dmg);
    if (mathResult !== null) {
      if (mathResult > 0) recordDps(mathResult, '#ffb86c');
      return mathResult;
    }
    if (dmg > 0) {
      enemy.hp -= dmg;
      recordDps(dmg, '#ffb86c');
    }
    return dmg;
  }

  /** Deals damage to an amber shard (no DEF). Returns actual damage dealt. */
  function damageAmberShard(shard: AmberShard, rawDamage: number): number {
    const dmg = Math.max(MINIMUM_SHIELD_DAMAGE, rawDamage);
    shard.hp = Math.max(0, shard.hp - dmg);
    recordDps(dmg, '#ffb86c');
    return dmg;
  }

  /** Deals damage to a void enemy (high DEF). Returns actual damage dealt. */
  function damageVoidEnemy(enemy: VoidEnemy, rawDamage: number, defPierceRatio: number): number {
    const effectiveDef = enemy.def * (1 - defPierceRatio);
    const dmg = Math.max(0, rawDamage - effectiveDef);
    const mathResult = maybeApplyMathObjectiveDamage(enemy, dmg);
    if (mathResult !== null) {
      if (mathResult > 0) recordDps(mathResult, '#7b68ee');
      return mathResult;
    }
    if (dmg > 0) {
      enemy.hp -= dmg;
      recordDps(dmg, '#7b68ee');
    }
    return dmg;
  }

  function damageQuartzEnemy(enemy: QuartzEnemy, rawDamage: number, defPierceRatio: number): number {
    const effectiveDef = enemy.def * (1 - defPierceRatio);
    const dmg = Math.max(0, rawDamage - effectiveDef);
    const mathResult = maybeApplyMathObjectiveDamage(enemy, dmg);
    if (mathResult !== null) {
      if (mathResult > 0) recordDps(mathResult, '#e0e0e0');
      return mathResult;
    }
    if (dmg > 0) {
      enemy.hp -= dmg;
      recordDps(dmg, '#e0e0e0');
    }
    return dmg;
  }

  function damageQuartzSpike(spike: QuartzSpike, rawDamage: number): number {
    const dmg = Math.max(MINIMUM_SHIELD_DAMAGE, rawDamage);
    spike.hp = Math.max(0, spike.hp - dmg);
    recordDps(dmg, '#e0e0e0');
    return dmg;
  }

  function damageRubyEnemy(enemy: RubyEnemy, rawDamage: number, defPierceRatio: number): number {
    const effectiveDef = enemy.def * (1 - defPierceRatio);
    const dmg = Math.max(0, rawDamage - effectiveDef);
    const mathResult = maybeApplyMathObjectiveDamage(enemy, dmg);
    if (mathResult !== null) {
      if (mathResult > 0) recordDps(mathResult, '#ff6b6b');
      return mathResult;
    }
    if (dmg > 0) {
      enemy.hp -= dmg;
      recordDps(dmg, '#ff6b6b');
    }
    return dmg;
  }

  function damageRubyBolt(bolt: RubyBolt, rawDamage: number): number {
    const dmg = Math.max(MINIMUM_SHIELD_DAMAGE, rawDamage);
    bolt.hp = Math.max(0, bolt.hp - dmg);
    recordDps(dmg, '#ff6b6b');
    return dmg;
  }

  function damageSunstoneEnemy(enemy: SunstoneEnemy, rawDamage: number, defPierceRatio: number): number {
    const effectiveDef = enemy.def * (1 - defPierceRatio);
    const dmg = Math.max(0, rawDamage - effectiveDef);
    const mathResult = maybeApplyMathObjectiveDamage(enemy, dmg);
    if (mathResult !== null) {
      if (mathResult > 0) recordDps(mathResult, '#ffd700');
      return mathResult;
    }
    if (dmg > 0) {
      enemy.hp -= dmg;
      recordDps(dmg, '#ffd700');
    }
    return dmg;
  }

  function damageCitrineEnemy(enemy: CitrineEnemy, rawDamage: number, defPierceRatio: number): number {
    const effectiveDef = enemy.def * (1 - defPierceRatio);
    const dmg = Math.max(0, rawDamage - effectiveDef);
    const mathResult = maybeApplyMathObjectiveDamage(enemy, dmg);
    if (mathResult !== null) {
      if (mathResult > 0) recordDps(mathResult, '#fff176');
      return mathResult;
    }
    if (dmg > 0) {
      enemy.hp -= dmg;
      recordDps(dmg, '#fff176');
    }
    return dmg;
  }

  function damageCitrineBolt(bolt: CitrineBolt, rawDamage: number): number {
    const dmg = Math.max(MINIMUM_SHIELD_DAMAGE, rawDamage);
    bolt.hp = Math.max(0, bolt.hp - dmg);
    recordDps(dmg, '#fff176');
    return dmg;
  }

  function damageIoliteEnemy(enemy: IoliteEnemy, rawDamage: number, defPierceRatio: number): number {
    const effectiveDef = enemy.def * (1 - defPierceRatio);
    const dmg = Math.max(0, rawDamage - effectiveDef);
    const mathResult = maybeApplyMathObjectiveDamage(enemy, dmg);
    if (mathResult !== null) {
      if (mathResult > 0) recordDps(mathResult, '#9b59b6');
      return mathResult;
    }
    if (dmg > 0) {
      enemy.hp -= dmg;
      recordDps(dmg, '#9b59b6');
    }
    return dmg;
  }

  function damageAmethystEnemy(enemy: AmethystEnemy, rawDamage: number, defPierceRatio: number, bypassShield: boolean): number {
    if (!bypassShield && enemy.shieldHp > 0) {
      const dmg = Math.max(MINIMUM_SHIELD_DAMAGE, rawDamage);
      enemy.shieldHp = Math.max(0, enemy.shieldHp - dmg);
      recordDps(dmg, '#b388ff');
      return dmg;
    }
    const effectiveDef = enemy.def * (1 - defPierceRatio);
    const dmg = Math.max(0, rawDamage - effectiveDef);
    const mathResult = maybeApplyMathObjectiveDamage(enemy, dmg);
    if (mathResult !== null) {
      if (mathResult > 0) recordDps(mathResult, '#b388ff');
      return mathResult;
    }
    if (dmg > 0) {
      enemy.hp -= dmg;
      recordDps(dmg, '#b388ff');
    }
    return dmg;
  }

  function damageAmethystShard(shard: AmethystShard, rawDamage: number): number {
    const dmg = Math.max(MINIMUM_SHIELD_DAMAGE, rawDamage);
    shard.hp = Math.max(0, shard.hp - dmg);
    recordDps(dmg, '#b388ff');
    return dmg;
  }

  function damageDiamondEnemy(enemy: DiamondEnemy, rawDamage: number, defPierceRatio: number): number {
    if (enemy.phaseInvuln) return 0;
    const effectiveDef = enemy.def * (1 - defPierceRatio);
    const dmg = Math.max(0, rawDamage - effectiveDef);
    const mathResult = maybeApplyMathObjectiveDamage(enemy, dmg);
    if (mathResult !== null) {
      if (mathResult > 0) recordDps(mathResult, '#e0e0ff');
      return mathResult;
    }
    if (dmg > 0) {
      enemy.hp -= dmg;
      recordDps(dmg, '#e0e0ff');
    }
    return dmg;
  }

  function damageDiamondShard(shard: DiamondShard, rawDamage: number): number {
    const dmg = Math.max(MINIMUM_SHIELD_DAMAGE, rawDamage);
    shard.hp = Math.max(0, shard.hp - dmg);
    recordDps(dmg, '#e0e0ff');
    return dmg;
  }

  function damageNullstoneEnemy(enemy: NullstoneEnemy, rawDamage: number, defPierceRatio: number): number {
    if (enemy.isAbsorbing) return 0;
    const effectiveDef = enemy.def * (1 - defPierceRatio);
    const dmg = Math.max(0, rawDamage - effectiveDef);
    const mathResult = maybeApplyMathObjectiveDamage(enemy, dmg);
    if (mathResult !== null) {
      if (mathResult > 0) recordDps(mathResult, '#2c2c2c');
      return mathResult;
    }
    if (dmg > 0) {
      enemy.hp -= dmg;
      recordDps(dmg, '#2c2c2c');
    }
    return dmg;
  }

  function damageVoidTendril(tendril: VoidTendril, rawDamage: number): number {
    const dmg = Math.max(MINIMUM_SHIELD_DAMAGE, rawDamage);
    tendril.hp = Math.max(0, tendril.hp - dmg);
    recordDps(dmg, '#7b68ee');
    return dmg;
  }

  function damageFracterylEnemy(enemy: FracterylEnemy, rawDamage: number, defPierceRatio: number): number {
    const effectiveDef = enemy.def * (1 - defPierceRatio);
    const dmg = Math.max(0, rawDamage - effectiveDef);
    const mathResult = maybeApplyMathObjectiveDamage(enemy, dmg);
    if (mathResult !== null) {
      if (mathResult > 0) recordDps(mathResult, '#ff69b4');
      return mathResult;
    }
    if (dmg > 0) {
      enemy.hp -= dmg;
      recordDps(dmg, '#ff69b4');
    }
    return dmg;
  }

  function damageFracterylShard(shard: FracterylShard, rawDamage: number): number {
    const dmg = Math.max(MINIMUM_SHIELD_DAMAGE, rawDamage);
    shard.hp = Math.max(0, shard.hp - dmg);
    recordDps(dmg, '#ff69b4');
    return dmg;
  }

  function damageEigensteinEnemy(enemy: EigensteinEnemy, rawDamage: number, defPierceRatio: number): number {
    const effectiveDef = enemy.def * (1 - defPierceRatio);
    const dmg = Math.max(0, rawDamage - effectiveDef);
    const mathResult = maybeApplyMathObjectiveDamage(enemy, dmg);
    if (mathResult !== null) {
      if (mathResult > 0) recordDps(mathResult, '#00ffff');
      return mathResult;
    }
    if (dmg > 0) {
      enemy.hp -= dmg;
      recordDps(dmg, '#00ffff');
    }
    return dmg;
  }

  /**
   * Damages the living particle in the swarm that is nearest to the player
   * (pre-computed each frame as `swarm.nearestParticleIdx`).
   *
   * DEF is applied once against the raw damage to get effectiveDmg, then
   * applied to the individual particle's HP. If the swarm has a math
   * objective the damage is routed through it instead. After hitting a
   * particle, the swarm's total HP is recomputed.
   *
   * Returns the actual damage dealt (0 if fully absorbed by DEF).
   */
  function damageAlivenSwarmEnemy(
    swarm: AlivenSwarmEnemy,
    rawDamage: number,
    defPierceRatio: number,
  ): number {
    if (swarm.particles.length === 0) return 0;
    const effectiveDef = swarm.def * (1 - defPierceRatio);
    const dmg = Math.max(0, rawDamage - effectiveDef);

    // Math objective: routes damage through the objective; counts against total swarm HP
    const mathResult = maybeApplyMathObjectiveDamage(swarm, dmg);
    if (mathResult !== null) {
      if (mathResult > 0) {
        // Distribute math-objective hit damage across the nearest particle
        const idx = Math.min(swarm.nearestParticleIdx, swarm.particles.length - 1);
        swarm.particles[idx].hp = Math.max(0, swarm.particles[idx].hp - mathResult);
        if (swarm.particles[idx].hp <= 0) {
          swarm.particles.splice(idx, 1);
          swarm.nearestParticleIdx = Math.min(swarm.nearestParticleIdx, swarm.particles.length - 1);
        }
        // Recompute total HP
        swarm.hp = swarm.particles.reduce((s, p) => s + p.hp, 0);
        recordDps(mathResult, '#cc88ff');
      }
      return mathResult;
    }

    if (dmg <= 0) return 0;

    // Normal damage: hits nearest particle
    const idx = Math.min(swarm.nearestParticleIdx, swarm.particles.length - 1);
    swarm.particles[idx].hp = Math.max(0, swarm.particles[idx].hp - dmg);
    if (swarm.particles[idx].hp <= 0) {
      swarm.particles.splice(idx, 1);
      swarm.nearestParticleIdx = Math.min(swarm.nearestParticleIdx, swarm.particles.length - 1);
    }
    swarm.hp = swarm.particles.reduce((s, p) => s + p.hp, 0);
    recordDps(dmg, '#cc88ff');
    return dmg;
  }

  return {
    damageEnemy,
    damageSapphireEnemy,
    damageMissile,
    damageEmeraldEnemy,
    damageAmberEnemy,
    damageAmberShard,
    damageVoidEnemy,
    damageQuartzEnemy,
    damageQuartzSpike,
    damageRubyEnemy,
    damageRubyBolt,
    damageSunstoneEnemy,
    damageCitrineEnemy,
    damageCitrineBolt,
    damageIoliteEnemy,
    damageAmethystEnemy,
    damageAmethystShard,
    damageDiamondEnemy,
    damageDiamondShard,
    damageNullstoneEnemy,
    damageVoidTendril,
    damageFracterylEnemy,
    damageFracterylShard,
    damageEigensteinEnemy,
    damageAlivenSwarmEnemy,
  };
}
