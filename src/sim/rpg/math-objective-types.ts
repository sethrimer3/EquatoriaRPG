/**
 * math-objective-types.ts — Type definitions for the math objective layer.
 *
 * Math objectives can be attached to any enemy to give them a "solve me" mechanic.
 * Enemies without a mathObjective use normal HP damage as before.
 * When solved, the enemy's hp is set to 0 so the existing wave/XP logic fires normally.
 *
 * Math damage uses post-DEF/shield damage values (what the existing damage functions return).
 * This is explicit: see applyMathObjectiveDamage in rpg-damage.ts for the rationale.
 */

/** Compact number display: small exact integers show as-is; large values use K/M. */
export function formatMathCompact(n: number): string {
  const abs = Math.abs(n);
  if (abs < 1000) return String(Math.round(n));
  if (abs < 1_000_000) return (n / 1000).toFixed(1).replace(/\.0$/, '') + 'K';
  return (n / 1_000_000).toFixed(1).replace(/\.0$/, '') + 'M';
}

/**
 * Quantize actual damage to an integer for math objective evaluation.
 * Uses Math.round. Put in one place to keep it consistent.
 * Note: math objectives see post-DEF damage (same as what existing damage functions return).
 */
export function quantizeMathDamage(damage: number): number {
  return Math.round(damage);
}

// ── Sequence rule kinds ────────────────────────────────────────────

export type SequenceKind =
  | 'increasing'      // each accepted hit > previous accepted hit
  | 'differentValues' // accepted hits must all be different values
  | 'exactSequence';  // accepted hits must match a specific array in order

// ── Objective kinds (discriminated union) ─────────────────────────

/** Damage >= target */
export interface ThresholdObjective {
  kind: 'threshold';
  target: number;
}

/** Damage === target */
export interface ExactObjective {
  kind: 'exact';
  target: number;
}

/** Math.abs(damage) % 10 === requiredDigit */
export interface DigitEndingObjective {
  kind: 'digitEnding';
  requiredDigit: number; // 0-9
}

/** damage % modulus === remainder */
export interface ModuloObjective {
  kind: 'modulo';
  modulus: number;
  remainder: number;
}

/** Accept any positive hit; solve after N accepted hits */
export interface HitCountObjective {
  kind: 'hitCount';
  requiredHits: number;
}

/** Accept positive hits accumulating toward total sum */
export interface SumTargetObjective {
  kind: 'sumTarget';
  target: number;
}

/** Sequence-based objective */
export interface SequenceObjective {
  kind: 'sequence';
  sequenceKind: SequenceKind;
  exactSequence?: number[]; // for 'exactSequence' kind
}

/** Damage is a factor of target (target % damage === 0). Avoid divide-by-zero. */
export interface FactorObjective {
  kind: 'factor';
  target: number;
}

/** Damage within tolerance of target */
export interface ApproximateObjective {
  kind: 'approximate';
  target: number;
  tolerance: number; // abs(damage - target) <= tolerance
}

/** Like sumTarget but with distinct visuals (integral metaphor) */
export interface IntegralAccumulationObjective {
  kind: 'integralAccumulation';
  target: number;
}

/** Like exact/threshold but generated from width * height (geometry metaphor) */
export interface GeometryAreaObjective {
  kind: 'geometryArea';
  width: number;
  height: number;
  target: number; // = width * height, pre-computed
}

export type MathObjectiveKind =
  | ThresholdObjective
  | ExactObjective
  | DigitEndingObjective
  | ModuloObjective
  | HitCountObjective
  | SumTargetObjective
  | SequenceObjective
  | FactorObjective
  | ApproximateObjective
  | IntegralAccumulationObjective
  | GeometryAreaObjective;

// ── Feedback state ─────────────────────────────────────────────────

export interface MathObjectiveFeedback {
  text: string;
  /** 'accepted' | 'rejected' */
  kind: 'accepted' | 'rejected';
  /** Remaining display time in ms */
  timerMs: number;
  /** Max display time in ms */
  maxTimerMs: number;
}

// ── Main MathObjective structure ──────────────────────────────────

export interface MathObjective {
  id: string;
  objectiveKind: MathObjectiveKind;
  /** 'symbolCore' — overlay on enemy body; 'equationSnake' — equation-style label */
  displayMode: 'symbolCore' | 'equationSnake';
  /** Short symbol shown at center: '≥', '=', '_9', '≡', '#', 'Σ', '→', '|', '≈', '∫', '□' */
  displaySymbol: string;
  /** Text shown below symbol (compact target value, e.g. '42', '1.2K') */
  compactValueText: string;
  /** Full equation string for equationSnake mode (e.g. 'x + 7 = 19') */
  equationText?: string;

  /** 0-1 progress ratio. Visual only for solveOnAccept kinds; used as HP fraction for sum kinds. */
  progress: number;
  /** Meaningful goal for progress (e.g., requiredHits, sumTarget). May be 1 for instant-solve kinds. */
  goal: number;

  /** Count of accepted hits */
  acceptedHits: number;
  /** Last accepted hit values (for sequence checking) */
  acceptedHitValues: number[];
  /** Count of rejected hits (informational) */
  rejectedHits: number;

  /** True when objective is solved (triggers enemy.hp = 0) */
  solved: boolean;

  /**
   * Remaining ms for the "SOLVED!" burst animation.
   * Set to SOLVED_FLASH_DURATION_MS when solved becomes true.
   * Ticked down by tickObjectiveFeedback. Used by the draw layer to
   * render an expanding gold ring around the enemy.
   */
  solvedFlashMs?: number;

  /** Current feedback message shown near enemy */
  feedback?: MathObjectiveFeedback;

  /** Enemy's visual display color (from enemy type) for tinting the ring */
  accentColor: string;
}

// ── Shared interface for enemies that can have a math objective ────

export interface HasMathObjective {
  mathObjective?: MathObjective;
}
