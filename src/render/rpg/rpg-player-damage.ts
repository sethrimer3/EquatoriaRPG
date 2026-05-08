/**
 * rpg-player-damage.ts — Player damage and iframes logic for the RPG tab.
 *
 * Extracted from rpg-render.ts to reduce file size and centralise the two
 * player-hit functions in a testable, dependency-injected module.
 *
 * Both functions receive mutable state via `PlayerDamageCtx` and are pure
 * given that context: they never access closure variables from rpg-render.ts.
 */

import type { RpgMote, RpgPlayerStats } from './rpg-types';
import {
  PLAYER_IFRAME_MIN_MS,
  PLAYER_IFRAME_MAX_ADD_MS,
  PLAYER_KNOCKBACK_MAX,
} from './rpg-constants';

// ── Dependency-injection context ──────────────────────────────────────────────

export interface PlayerDamageCtx {
  /** Player mote — position is read; velocity is mutated by knockback variant. */
  mote: Pick<RpgMote, 'x' | 'y' | 'vx' | 'vy'>;
  /** Player stats — hp and maxHp are read/mutated; def is read. */
  playerStats: Pick<RpgPlayerStats, 'hp' | 'maxHp' | 'def'>;
  /** Returns the current remaining iframe duration in ms. */
  getPlayerIFramesMs(): number;
  /** Sets the remaining iframe duration in ms. */
  setPlayerIFramesMs(ms: number): void;
  /** Spawns a floating damage or "BLOCKED" label at the given canvas position. */
  spawnDamageNumber(
    x: number, y: number,
    vx: number, vy: number,
    text: string, ratio: number, color: string,
  ): void;
}

// ── Damage functions ──────────────────────────────────────────────────────────

/**
 * Applies raw enemy ATK damage to the player after blocking a percentage equal
 * to `playerStats.def`, subject to active iframes.
 *
 * Mutates `playerStats.hp` and the iframe timer on a successful hit.
 * Spawns a "BLOCKED" label when the hit is completely negated, or a numeric
 * damage number otherwise.
 */
export function dealDamageToPlayer(ctx: PlayerDamageCtx, atkValue: number): void {
  if (ctx.getPlayerIFramesMs() > 0) return;
  const dmg = Math.max(0, atkValue * (1 - Math.min(100, ctx.playerStats.def) / 100));
  if (dmg <= 0) {
    ctx.spawnDamageNumber(ctx.mote.x, ctx.mote.y, 0, -1, 'BLOCKED', 0.25, '#74c0fc');
  } else {
    ctx.playerStats.hp = Math.max(0, ctx.playerStats.hp - dmg);
    const ratio = Math.min(1, dmg / ctx.playerStats.maxHp);
    ctx.setPlayerIFramesMs(PLAYER_IFRAME_MIN_MS + ratio * PLAYER_IFRAME_MAX_ADD_MS);
    ctx.spawnDamageNumber(ctx.mote.x, ctx.mote.y, 0, -1, String(Math.round(dmg)), ratio, '#ff6666');
  }
}

/**
 * Applies damage to the player with a directional knockback impulse.
 *
 * Used exclusively by Amber shards which carry velocity-based knockback.
 * Prefer `dealDamageToPlayer` for all other enemy contact/projectile damage.
 *
 * @param atkValue   Raw attack value (defence percentage applied internally).
 * @param normDirX   Normalised knockback / damage-number direction X.
 * @param normDirY   Normalised knockback / damage-number direction Y.
 */
export function dealDamageToPlayerKnockback(
  ctx: PlayerDamageCtx,
  atkValue: number,
  normDirX: number,
  normDirY: number,
): void {
  if (ctx.getPlayerIFramesMs() > 0) return;
  const dmg = Math.max(0, atkValue * (1 - Math.min(100, ctx.playerStats.def) / 100));
  if (dmg <= 0) {
    ctx.spawnDamageNumber(ctx.mote.x, ctx.mote.y, normDirX, normDirY, 'BLOCKED', 0.25, '#74c0fc');
  } else {
    ctx.playerStats.hp = Math.max(0, ctx.playerStats.hp - dmg);
    const ratio = Math.min(1, dmg / ctx.playerStats.maxHp);
    ctx.mote.vx += normDirX * PLAYER_KNOCKBACK_MAX * ratio;
    ctx.mote.vy += normDirY * PLAYER_KNOCKBACK_MAX * ratio;
    ctx.setPlayerIFramesMs(PLAYER_IFRAME_MIN_MS + ratio * PLAYER_IFRAME_MAX_ADD_MS);
    ctx.spawnDamageNumber(ctx.mote.x, ctx.mote.y, normDirX, normDirY, String(Math.round(dmg)), ratio, '#ff6666');
  }
}
