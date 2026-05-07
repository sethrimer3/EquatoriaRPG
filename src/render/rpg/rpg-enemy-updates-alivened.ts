/**
 * rpg-enemy-updates-alivened.ts — Per-frame update logic for AlivenSwarm enemies.
 *
 * Each swarm consists of individual AlivenSwarmParticles that interact via a
 * simplified 4-type Particle Life matrix. The swarm drifts toward the player
 * as a unit while particles form dynamic sub-clusters through attraction and
 * repulsion forces.
 *
 * Physics overview (per frame):
 *   1. Group drift — move the swarm's weighted center toward the player.
 *   2. Particle Life forces — for each particle pair within ALIVEN_INTERACTION_RADIUS,
 *      apply matrix-controlled attraction/repulsion forces.
 *   3. Cohesion — pull each particle softly toward the swarm centroid.
 *   4. Boundary clamping — keep each particle inside the arena.
 *   5. Velocity damping.
 *   6. Update centroid + total HP + nearestParticleIdx.
 *   7. Contact damage to player.
 *
 * All constants are imported from rpg-enemy-constants.ts.
 */

import type { AlivenSwarmEnemy } from './rpg-enemy-types';
import type { RpgEnemyCtx } from './rpg-enemy-updates';
import {
  ALIVEN_INTERACTION_RADIUS,
  ALIVEN_PROTECTED_RADIUS,
  ALIVEN_MAX_FORCE,
  ALIVEN_COHESION_STR,
  ALIVEN_GROUP_DRIFT_SPEED,
  ALIVEN_VELOCITY_DAMPING,
  ALIVEN_CONTACT_RADIUS,
  ALIVEN_CONTACT_CD_MS,
} from './rpg-enemy-constants';

const R2 = ALIVEN_INTERACTION_RADIUS * ALIVEN_INTERACTION_RADIUS;
const PROT_R2 = ALIVEN_PROTECTED_RADIUS * ALIVEN_PROTECTED_RADIUS;

/** Temporary force accumulator buffers (reused per frame, no allocation in hot path). */
const _fx = new Float64Array(64);
const _fy = new Float64Array(64);

/**
 * Updates all AlivenSwarmEnemy instances for one frame.
 * Removes swarms whose `particles` array is empty (all particles killed).
 * Also clears swarms whose total HP reached 0 via math objectives.
 */
export function updateAlivenSwarmEnemies(
  swarms: AlivenSwarmEnemy[],
  ctx: RpgEnemyCtx,
  deltaMs: number,
): void {
  const dt = deltaMs / 16.67; // normalised to a 60fps tick
  const { mote, dim, dealDamageToPlayer } = ctx;

  for (let si = swarms.length - 1; si >= 0; si--) {
    const swarm = swarms[si];
    const particles = swarm.particles;

    // Remove dead swarm
    if (particles.length === 0 || swarm.hp <= 0) {
      swarms.splice(si, 1);
      continue;
    }

    const n = particles.length;

    // ── 1. Compute centroid ────────────────────────────────────
    let cx = 0, cy = 0;
    for (let i = 0; i < n; i++) { cx += particles[i].x; cy += particles[i].y; }
    cx /= n; cy /= n;
    swarm.x = cx; swarm.y = cy;

    // ── 2. Group drift toward player ───────────────────────────
    const gdx = mote.x - cx, gdy = mote.y - cy;
    const gdist = Math.sqrt(gdx * gdx + gdy * gdy) + 0.001;
    const gspd = ALIVEN_GROUP_DRIFT_SPEED * dt;
    swarm.groupVx = (gdx / gdist) * gspd;
    swarm.groupVy = (gdy / gdist) * gspd;

    // ── 3. Compute Particle Life forces ──────────────────────
    const matrix = swarm.interactionMatrix; // 4×4 flat row-major

    // Clear force accumulator
    for (let i = 0; i < n; i++) { _fx[i] = 0; _fy[i] = 0; }

    for (let i = 0; i < n; i++) {
      const pi = particles[i];
      for (let j = 0; j < n; j++) {
        if (i === j) continue;
        const pj = particles[j];
        const dx = pj.x - pi.x;
        const dy = pj.y - pi.y;
        const distSq = dx * dx + dy * dy;
        if (distSq > R2 || distSq < 0.001) continue;

        const dist = Math.sqrt(distSq);
        const nx = dx / dist, ny = dy / dist;

        if (distSq < PROT_R2) {
          // Strong repulsion inside protected radius
          const repForce = (1 - dist / ALIVEN_PROTECTED_RADIUS) * ALIVEN_MAX_FORCE;
          _fx[i] -= nx * repForce;
          _fy[i] -= ny * repForce;
        } else {
          // Matrix-controlled force, tapered to 0 at outer radius
          const coeff = matrix[pi.tierIndex * 4 + pj.tierIndex]; // attraction if +
          const taper = 1 - (dist - ALIVEN_PROTECTED_RADIUS) /
            (ALIVEN_INTERACTION_RADIUS - ALIVEN_PROTECTED_RADIUS);
          const force = coeff * taper * ALIVEN_MAX_FORCE;
          _fx[i] += nx * force;
          _fy[i] += ny * force;
        }
      }
    }

    // ── 4. Apply forces + cohesion + group drift ──────────────
    const widthPx = dim.w, heightPx = dim.h;
    for (let i = 0; i < n; i++) {
      const p = particles[i];

      // Particle Life force (scaled by dt)
      p.vx += _fx[i] * 0.05 * dt;
      p.vy += _fy[i] * 0.05 * dt;

      // Cohesion toward centroid
      p.vx += (cx - p.x) * ALIVEN_COHESION_STR * dt;
      p.vy += (cy - p.y) * ALIVEN_COHESION_STR * dt;

      // Group drift
      p.vx += swarm.groupVx;
      p.vy += swarm.groupVy;

      // Velocity damping
      p.vx *= ALIVEN_VELOCITY_DAMPING;
      p.vy *= ALIVEN_VELOCITY_DAMPING;

      // Integrate position
      p.x += p.vx * dt;
      p.y += p.vy * dt;

      // Boundary clamp
      const half = 3;
      if (p.x < half)               { p.x = half;              p.vx =  Math.abs(p.vx) * 0.4; }
      if (p.x > widthPx  - half)    { p.x = widthPx  - half;   p.vx = -Math.abs(p.vx) * 0.4; }
      if (p.y < half)               { p.y = half;              p.vy =  Math.abs(p.vy) * 0.4; }
      if (p.y > heightPx - half)    { p.y = heightPx - half;   p.vy = -Math.abs(p.vy) * 0.4; }
    }

    // ── 5. Recompute centroid (post-move) + total HP ───────────
    cx = 0; cy = 0;
    for (let i = 0; i < n; i++) { cx += particles[i].x; cy += particles[i].y; }
    cx /= n; cy /= n;
    swarm.x = cx; swarm.y = cy;
    swarm.hp = particles.reduce((s, p) => s + p.hp, 0);

    // ── 6. Update nearestParticleIdx ───────────────────────────
    let bestDistSq = Infinity, bestIdx = 0;
    for (let i = 0; i < n; i++) {
      const ddx = particles[i].x - mote.x;
      const ddy = particles[i].y - mote.y;
      const dSq = ddx * ddx + ddy * ddy;
      if (dSq < bestDistSq) { bestDistSq = dSq; bestIdx = i; }
    }
    swarm.nearestParticleIdx = bestIdx;

    // ── 7. Contact damage to player ────────────────────────────
    const contactR2 = ALIVEN_CONTACT_RADIUS * ALIVEN_CONTACT_RADIUS;
    for (let i = 0; i < n; i++) {
      const p = particles[i];
      p.contactCdMs = Math.max(0, p.contactCdMs - deltaMs);

      const ddx = p.x - mote.x, ddy = p.y - mote.y;
      if (ddx * ddx + ddy * ddy <= contactR2 && p.contactCdMs <= 0) {
        dealDamageToPlayer(swarm.atk);
        p.contactCdMs = ALIVEN_CONTACT_CD_MS;
      }
    }
  }
}
