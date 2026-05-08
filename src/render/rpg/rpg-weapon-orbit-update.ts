/**
 * rpg-weapon-orbit-update.ts — Per-frame update for equipped-weapon visual orbit particles.
 *
 * Extracted from rpg-render.ts to reduce file size and keep the orbit-particle
 * update logic alongside its drawing counterpart (drawWeaponOrbitParticle in
 * rpg-entity-draw.ts).
 *
 * Each weapon orbit particle tracks the player mote at a fixed orbital radius,
 * evenly spaced when multiple weapons are equipped, and appends its position to
 * a ring-buffer trail used by drawWeaponOrbitParticle.
 */

import type { WeaponOrbitParticle } from './rpg-types';
import {
  WEAPON_PARTICLE_ORBIT_SPEED,
  WEAPON_PARTICLE_ORBIT_RADIUS,
  WEAPON_PARTICLE_MIN_SPEED,
  WEAPON_ORBIT_TRAIL_CAP,
  MIN_TRAIL_DISTANCE,
} from './rpg-constants';

/** Precomputed square of MIN_TRAIL_DISTANCE — avoids a sqrt in the hot loop. */
const MIN_TRAIL_DISTANCE_SQ = MIN_TRAIL_DISTANCE * MIN_TRAIL_DISTANCE;

/**
 * Advances every equipped-weapon orbit particle by `deltaMs` milliseconds.
 *
 * @param weaponOrbitParticles  Live array of orbit particles (mutated in place).
 * @param mote                  Player mote position (read-only, x/y used for orbit centre).
 * @param deltaMs               Frame delta time in milliseconds.
 */
export function updateWeaponOrbitParticles(
  weaponOrbitParticles: WeaponOrbitParticle[],
  mote: { readonly x: number; readonly y: number },
  deltaMs: number,
): void {
  if (weaponOrbitParticles.length === 0) return;
  const dt = deltaMs / 1000;
  const angleStep = (2 * Math.PI) / weaponOrbitParticles.length;
  const nowS = Date.now() / 1000;
  for (let idx = 0; idx < weaponOrbitParticles.length; idx++) {
    const p = weaponOrbitParticles[idx];
    p.angle += WEAPON_PARTICLE_ORBIT_SPEED * dt;
    // Keep evenly spaced when multiple weapons are equipped.
    const targetAngle = idx * angleStep + nowS * WEAPON_PARTICLE_ORBIT_SPEED;
    const angleDelta = ((targetAngle - p.angle + Math.PI * 3) % (Math.PI * 2)) - Math.PI;
    p.angle += angleDelta * 0.05;
    const newX = mote.x + Math.cos(p.angle) * WEAPON_PARTICLE_ORBIT_RADIUS;
    const newY = mote.y + Math.sin(p.angle) * WEAPON_PARTICLE_ORBIT_RADIUS;
    const dx = newX - p.x, dy = newY - p.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < WEAPON_PARTICLE_MIN_SPEED * dt) p.angle += 0.05;
    p.x = newX; p.y = newY;

    // Distance-based trail update — prevents trail bunching at high refresh rates.
    const lastTrailIdx = (p.trailHead - 1 + WEAPON_ORBIT_TRAIL_CAP) % WEAPON_ORBIT_TRAIL_CAP;
    const trailDx = p.x - p.trailX[lastTrailIdx];
    const trailDy = p.y - p.trailY[lastTrailIdx];
    const trailDistSq = trailDx * trailDx + trailDy * trailDy;
    if (p.trailCount === 0 || trailDistSq >= MIN_TRAIL_DISTANCE_SQ) {
      p.trailX[p.trailHead] = p.x;
      p.trailY[p.trailHead] = p.y;
      p.trailHead = (p.trailHead + 1) % WEAPON_ORBIT_TRAIL_CAP;
      if (p.trailCount < WEAPON_ORBIT_TRAIL_CAP) p.trailCount++;
    }
  }
}
