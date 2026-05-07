/**
 * rpg-math-objective-draw.ts
 *
 * Canvas rendering for math objectives attached to enemies.
 * Draws a progress ring above the enemy, the symbolic prompt label,
 * and transient feedback text (✓ / ✗ / flash) when the player hits.
 *
 * This file has no dependencies on sim/ state mutation — it is purely
 * visual. It reads the `mathObjective` field on enemy objects and
 * calls `tickObjectiveFeedback` from the sim layer to advance timers.
 */

import type { MathObjective } from '../../sim/rpg/math-objective-types';
import { tickObjectiveFeedback, MATH_SOLVED_FLASH_MS } from '../../sim/rpg/math-objectives';

// ── Layout constants ───────────────────────────────────────────

const RING_THICK = 1.5;               // progress ring stroke width (canvas units)
const RING_OFFSET_Y = 8;              // px above enemy centre to ring centre
const LABEL_FONT = '5px monospace';
const EQUATION_SNAKE_FONT = '5px monospace'; // same size but rendered in gold accent
const FEEDBACK_FONT = '6px monospace';
const FEEDBACK_OFFSET_Y = -12;        // px above ring centre
const LABEL_CACHE_SIZE = 64;          // maximum entries in the text-width LRU cache

// ── Text-width cache (FIFO eviction, avoids measureText on every frame) ─

const _labelCache = new Map<string, number>();

function getCachedTextWidth(ctx: CanvasRenderingContext2D, text: string): number {
  if (_labelCache.has(text)) return _labelCache.get(text)!;
  if (_labelCache.size >= LABEL_CACHE_SIZE) {
    _labelCache.delete(_labelCache.keys().next().value as string);
  }
  const w = ctx.measureText(text).width;
  _labelCache.set(text, w);
  return w;
}

// ── Single-enemy draw ──────────────────────────────────────────

/**
 * Draws the math objective overlay for one enemy at (ex, ey) with
 * body radius `radius`. Also advances feedback timers.
 */
export function drawMathObjective(
  ctx: CanvasRenderingContext2D,
  obj: MathObjective,
  ex: number,
  ey: number,
  radius: number,
  deltaMs: number,
): void {
  tickObjectiveFeedback(obj, deltaMs);

  const ringCy = ey - radius - RING_OFFSET_Y;
  const ringR  = radius + 1.5;

  // ── Progress ring ──────────────────────────────────────────
  const progress = obj.progress;
  ctx.save();
  ctx.lineWidth = RING_THICK;

  // Background track
  ctx.strokeStyle = 'rgba(255,255,255,0.18)';
  ctx.beginPath();
  ctx.arc(ex, ringCy, ringR, 0, Math.PI * 2);
  ctx.stroke();

  // Filled arc — clockwise from top, colour shifts red as hp drops
  const redComponent = Math.round(255 * (1 - progress));
  const greenComponent = Math.round(200 * progress);
  ctx.strokeStyle = `rgb(${redComponent},${greenComponent},80)`;
  ctx.beginPath();
  ctx.arc(ex, ringCy, ringR, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * progress);
  ctx.stroke();

  // ── Symbol label ───────────────────────────────────────────
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'center';

  // For equationSnake mode show the full equation text (e.g. "x = 15") in gold;
  // for symbolCore mode show the compact symbol + value (e.g. "= 15") in pale blue.
  const equationText = obj.displayMode === 'equationSnake' ? obj.equationText : undefined;
  const label = equationText ?? `${obj.displaySymbol} ${obj.compactValueText}`;
  ctx.font = equationText ? EQUATION_SNAKE_FONT : LABEL_FONT;

  const bgW = getCachedTextWidth(ctx, label) + 3;
  ctx.fillStyle = equationText ? 'rgba(0,0,0,0.70)' : 'rgba(0,0,0,0.55)';
  ctx.fillRect(ex - bgW / 2, ringCy - 3.5, bgW, 7);

  // Gold for equation-snake (makes Diamond enemies stand out); pale blue for standard.
  ctx.fillStyle = equationText ? '#ffd764' : '#eef';
  ctx.fillText(label, ex, ringCy);

  // ── Feedback flash ─────────────────────────────────────────
  if (obj.feedback && obj.feedback.timerMs > 0) {
    // Fade out over the last 80 ms; full brightness for the rest of the duration.
    const alpha = Math.min(1, obj.feedback.timerMs / 80);
    ctx.font = FEEDBACK_FONT;
    ctx.globalAlpha = alpha;
    ctx.fillStyle = obj.feedback.kind === 'accepted' ? '#4f8' : '#f44';
    // Show the actual feedback text (e.g. "needs ≥15", "too high (=25)", "Σ 45/200")
    // so players know exactly what the objective requires.
    ctx.fillText(obj.feedback.text, ex, ringCy + FEEDBACK_OFFSET_Y);
    ctx.globalAlpha = 1;
  }

  ctx.restore();

  // ── SOLVED burst animation ─────────────────────────────────
  if (obj.solvedFlashMs !== undefined && obj.solvedFlashMs > 0) {
    const t = 1 - obj.solvedFlashMs / MATH_SOLVED_FLASH_MS; // 0→1 as flash fades
    const burstR = radius + 2 + t * (radius * 3 + 8);
    const alpha = (1 - t) * 0.9;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.strokeStyle = '#ffe566';
    ctx.lineWidth = 1.5 + (1 - t) * 2;
    ctx.shadowBlur = 6; ctx.shadowColor = '#ffe566';
    ctx.beginPath();
    ctx.arc(ex, ey, burstR, 0, Math.PI * 2);
    ctx.stroke();
    ctx.shadowBlur = 0;
    // "SOLVED!" text that rises and fades
    ctx.font = 'bold 7px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#ffe566';
    ctx.globalAlpha = Math.max(0, (1 - t * 1.5));
    ctx.fillText('SOLVED!', ex, ey - radius - 10 - t * 8);
    ctx.restore();
  }
}

// ── Array draw helper ──────────────────────────────────────────

/**
 * Iterates an array of enemies, drawing the math objective overlay
 * for each enemy that has one.
 */
export function drawMathObjectivesForArray<T extends { x: number; y: number; mathObjective?: MathObjective }>(
  ctx: CanvasRenderingContext2D,
  enemies: readonly T[],
  radius: number,
  deltaMs: number,
): void {
  for (let i = 0; i < enemies.length; i++) {
    const e = enemies[i];
    if (e.mathObjective) {
      drawMathObjective(ctx, e.mathObjective, e.x, e.y, radius, deltaMs);
    }
  }
}
