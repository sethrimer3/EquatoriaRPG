/**
 * worldMapParticles.ts — Real-time spiral particle simulation for the World Map.
 *
 * Design:
 *   - 250–1000 particles (quality-dependent) stored as plain object arrays.
 *   - Each particle orbits the map center while drifting inward along the spiral.
 *   - Colors transition zone-by-zone from outer (silver/gold) to inner (ruby → sapphire → violet).
 *   - When a particle reaches the black hole (center) it fades out and reappears
 *     at the white hole (outer edge).
 *   - Particles shimmer/flash occasionally to look alive.
 *   - No allocations in the hot update/draw paths.
 */

// ─── Zone color palette (outer → inner) ──────────────────────────

type RGB = [number, number, number];

const ZONE_COLORS: RGB[] = [
  [220, 210, 180],  // pale sand
  [200, 200, 210],  // silver
  [255, 241, 160],  // faint gold
  [180, 220, 240],  // quartz blue-white
  [100, 205, 220],  // glassy cyan
  [220, 80,  80 ],  // ruby
  [230, 140, 60 ],  // sunstone
  [60,  200, 120],  // emerald
  [80,  120, 230],  // sapphire
  [150, 80,  230],  // violet
  [200, 220, 255],  // diamond
];

/** Blend between two zone colors by a fractional t (0–1). */
function blendZoneColor(t: number): RGB {
  const scaled  = Math.max(0, Math.min(1, t)) * (ZONE_COLORS.length - 1);
  const lo      = Math.floor(scaled);
  const hi      = Math.min(lo + 1, ZONE_COLORS.length - 1);
  const f       = scaled - lo;
  const a       = ZONE_COLORS[lo] as RGB;
  const b       = ZONE_COLORS[hi] as RGB;
  return [
    a[0] + (b[0] - a[0]) * f,
    a[1] + (b[1] - a[1]) * f,
    a[2] + (b[2] - a[2]) * f,
  ];
}

// ─── Particle type ────────────────────────────────────────────────

interface WMParticle {
  /** Polar coordinates relative to canvas center. */
  angle: number;          // radians
  radius: number;         // pixels from center
  /** Drift — amount radius decreases per second. */
  driftRate: number;
  /** Base angular speed — slightly perturbed per particle. */
  angularBase: number;
  /** World-space X/Y (computed from angle+radius each frame). */
  x: number;
  y: number;
  /** Visual. */
  size: number;           // base draw radius
  baseColor: RGB;
  alpha: number;
  shimmerPhase: number;   // 0 – 2π
  shimmerSpeed: number;   // radians/sec
  shimmerAmp: number;     // 0 – 1
  fadingOut: boolean;
}

// ─── Public interface ─────────────────────────────────────────────

export type ParticleQuality = 'full' | 'reduced' | 'low';

export const PARTICLE_COUNTS: Record<ParticleQuality, number> = {
  full: 1000,
  reduced: 500,
  low: 250,
};

export interface WorldMapParticles {
  /** Update all particles by `dtMs` milliseconds. */
  update(dtMs: number, cx: number, cy: number, maxRadius: number): void;
  /** Draw particles onto a 2D context. */
  draw(ctx: CanvasRenderingContext2D, cx: number, cy: number): void;
  /** Reset particle positions when the canvas is resized. */
  resize(cx: number, cy: number, maxRadius: number): void;
  /** Notify when the map becomes hidden (no need to update). */
  setActive(active: boolean): void;
}

// ─── Factory ─────────────────────────────────────────────────────

export function createWorldMapParticles(quality: ParticleQuality = 'full'): WorldMapParticles {
  const count = PARTICLE_COUNTS[quality];
  const particles: WMParticle[] = [];

  /** Current canvas geometry — set on resize(). */
  let _cx = 400;
  let _cy = 300;
  let _maxR = 280;
  let _active = false;

  const BLACK_HOLE_FRAC = 0.06;  // fraction of maxRadius
  const WHITE_HOLE_FRAC = 0.95;  // fraction of maxRadius where reborn
  const DRIFT_BASE = 6;          // px/sec inward drift at full radius
  const ANGULAR_BASE = 0.25;     // rad/sec base angular speed

  function blackHoleR(): number { return _maxR * BLACK_HOLE_FRAC; }
  function whiteHoleR(): number  { return _maxR * WHITE_HOLE_FRAC; }

  function randomParticle(angle: number, radius: number): WMParticle {
    // Color based on radial position (0 = outer, 1 = inner)
    const tColor = 1 - radius / _maxR;
    const bc = blendZoneColor(tColor);
    return {
      angle,
      radius,
      driftRate: DRIFT_BASE + Math.random() * 8,
      angularBase: ANGULAR_BASE + (Math.random() - 0.5) * 0.12,
      x: _cx + radius * Math.cos(angle),
      y: _cy + radius * Math.sin(angle),
      size: 0.8 + Math.random() * 1.4,
      baseColor: bc,
      alpha: 0.5 + Math.random() * 0.5,
      shimmerPhase: Math.random() * Math.PI * 2,
      shimmerSpeed: 0.8 + Math.random() * 2.5,
      shimmerAmp: 0.2 + Math.random() * 0.5,
      fadingOut: false,
    };
  }

  function initParticles(cx: number, cy: number, maxRadius: number): void {
    _cx = cx; _cy = cy; _maxR = maxRadius;
    particles.length = 0;
    const bhr = blackHoleR();
    for (let i = 0; i < count; i++) {
      const angle  = Math.random() * Math.PI * 2;
      const radius = bhr + Math.random() * (maxRadius - bhr);
      particles.push(randomParticle(angle, radius));
    }
  }

  function rebirthParticle(p: WMParticle): void {
    const whr = whiteHoleR();
    p.angle     = Math.random() * Math.PI * 2;
    p.radius    = whr * (0.9 + Math.random() * 0.1);
    p.alpha     = 0;        // fade in
    p.fadingOut = false;
    const tColor = 1 - p.radius / _maxR;
    p.baseColor = blendZoneColor(tColor);
    p.driftRate = DRIFT_BASE + Math.random() * 8;
    p.angularBase = ANGULAR_BASE + (Math.random() - 0.5) * 0.12;
    p.size = 0.8 + Math.random() * 1.4;
    p.shimmerAmp = 0.2 + Math.random() * 0.5;
  }

  // ── update ────────────────────────────────────────────────────

  function update(dtMs: number, cx: number, cy: number, maxRadius: number): void {
    _cx = cx; _cy = cy; _maxR = maxRadius;
    const dt = dtMs / 1000;
    const bhr = blackHoleR();

    for (const p of particles) {
      if (p.fadingOut) {
        p.alpha -= dt * 2.5;  // fade to black in ~0.4 s
        if (p.alpha <= 0) {
          rebirthParticle(p);
        }
        p.x = cx + p.radius * Math.cos(p.angle);
        p.y = cy + p.radius * Math.sin(p.angle);
        continue;
      }

      // Fade in if just reborn — target alpha is mid-range plus shimmer contribution
      const targetAlpha = 0.5 + p.shimmerAmp * 0.5;
      if (p.alpha < targetAlpha) {
        p.alpha = Math.min(targetAlpha, p.alpha + dt * 1.5);
      }

      // Angular speed — faster near center (conservation)
      const radiusFrac = Math.max(0.05, p.radius / maxRadius);
      const angSpeed   = p.angularBase / (radiusFrac * radiusFrac + 0.1);

      p.angle  += angSpeed * dt;
      p.radius -= p.driftRate * dt;

      // Shimmer
      p.shimmerPhase += p.shimmerSpeed * dt;

      // Update base color as particle moves inward
      const tColor = 1 - p.radius / maxRadius;
      p.baseColor = blendZoneColor(Math.max(0, Math.min(1, tColor)));

      // Compute canvas position
      p.x = cx + p.radius * Math.cos(p.angle);
      p.y = cy + p.radius * Math.sin(p.angle);

      // Near black hole → start fading
      if (p.radius <= bhr * 1.5) {
        p.fadingOut = true;
      }
    }
  }

  // ── draw ──────────────────────────────────────────────────────

  function draw(ctx: CanvasRenderingContext2D, cx: number, cy: number): void {
    const bhr = blackHoleR();
    const whr = whiteHoleR();

    // ── Black hole ──
    drawBlackHole(ctx, cx, cy, bhr);

    // ── White hole ──
    drawWhiteHole(ctx, cx, cy, whr);

    // ── Particles ──
    ctx.save();
    for (const p of particles) {
      const shimmer = 0.5 + 0.5 * Math.sin(p.shimmerPhase);
      const brightness = 1 + p.shimmerAmp * shimmer;
      const [r, g, b] = p.baseColor;
      const R = Math.min(255, Math.round(r * brightness));
      const G = Math.min(255, Math.round(g * brightness));
      const B = Math.min(255, Math.round(b * brightness));
      const alpha = Math.max(0, Math.min(1, p.alpha));
      if (alpha < 0.01) continue;

      const drawSize = p.size * (1 + shimmer * 0.3);

      ctx.beginPath();
      ctx.arc(p.x, p.y, drawSize, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(${R},${G},${B},${alpha.toFixed(2)})`;
      ctx.fill();

      // Occasional glow pass for shimmering particles
      if (shimmer > 0.8) {
        const glowA = (alpha * (shimmer - 0.8) * 0.4).toFixed(2);
        ctx.beginPath();
        ctx.arc(p.x, p.y, drawSize * 2.5, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${R},${G},${B},${glowA})`;
        ctx.fill();
      }
    }
    ctx.restore();
  }

  function drawBlackHole(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number): void {
    const outer = r * 4;
    const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, outer);
    grad.addColorStop(0,   'rgba(0,0,0,1)');
    grad.addColorStop(0.4, 'rgba(0,0,0,0.85)');
    grad.addColorStop(0.7, 'rgba(5,3,15,0.4)');
    grad.addColorStop(1,   'rgba(0,0,0,0)');
    ctx.beginPath();
    ctx.arc(cx, cy, outer, 0, Math.PI * 2);
    ctx.fillStyle = grad;
    ctx.fill();

    // Dark core
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fillStyle = '#000000';
    ctx.fill();

    // Event-horizon ring
    const ring = ctx.createRadialGradient(cx, cy, r * 0.6, cx, cy, r * 1.4);
    ring.addColorStop(0,   'rgba(30,20,60,0.0)');
    ring.addColorStop(0.5, 'rgba(80,40,160,0.5)');
    ring.addColorStop(1,   'rgba(20,10,40,0.0)');
    ctx.beginPath();
    ctx.arc(cx, cy, r * 1.4, 0, Math.PI * 2);
    ctx.fillStyle = ring;
    ctx.fill();
  }

  function drawWhiteHole(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number): void {
    // White hole glows near its position on the outer edge — we draw a soft glow
    // around the full outer ring since white hole feeds the entire outer boundary.
    const innerGlow = ctx.createRadialGradient(cx, cy, r * 0.85, cx, cy, r);
    innerGlow.addColorStop(0,   'rgba(200,220,255,0.0)');
    innerGlow.addColorStop(0.6, 'rgba(200,220,255,0.04)');
    innerGlow.addColorStop(1,   'rgba(180,200,255,0.12)');
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fillStyle = innerGlow;
    ctx.fill();
  }

  // ── Public ────────────────────────────────────────────────────

  return {
    update(dtMs: number, cx: number, cy: number, maxRadius: number): void {
      if (!_active) return;
      update(dtMs, cx, cy, maxRadius);
    },
    draw(ctx: CanvasRenderingContext2D, cx: number, cy: number): void {
      draw(ctx, cx, cy);
    },
    resize(cx: number, cy: number, maxRadius: number): void {
      initParticles(cx, cy, maxRadius);
    },
    setActive(active: boolean): void {
      _active = active;
    },
  };
}
