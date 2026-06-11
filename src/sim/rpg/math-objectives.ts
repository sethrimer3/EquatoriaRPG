/**
 * math-objectives.ts — Logic for creating and evaluating math objectives.
 *
 * Pure functions — no DOM, no canvas, no render dependencies.
 * The evaluateHit function is the core: given a math objective and quantized damage,
 * it returns whether the hit was accepted and what feedback to show.
 */
import type {
  MathObjective,
  SequenceKind,
} from './math-objective-types';
import { quantizeMathDamage, formatMathCompact } from './math-objective-types';

export { quantizeMathDamage, formatMathCompact };

/** Enemy feedback text lifetime: three times the 900 ms damage-number lifetime. */
export const MATH_FEEDBACK_DURATION_MS = 2700;
export const MATH_PULSE_DURATION_MS = 300;
/** Duration in ms for the expanding gold ring "SOLVED!" burst animation. */
export const MATH_SOLVED_FLASH_MS = 700;

// ── Objective construction helpers ────────────────────────────────

/**
 * Build a MathObjective for a threshold check (≥ N).
 * accentColor should match the enemy's main color.
 */
export function makeThresholdObjective(
  target: number,
  accentColor: string,
  displayMode: 'symbolCore' | 'equationSnake' = 'symbolCore',
): MathObjective {
  return {
    id: 'threshold',
    objectiveKind: { kind: 'threshold', target },
    displayMode,
    displaySymbol: '≥',
    compactValueText: formatMathCompact(target),
    equationText: displayMode === 'equationSnake' ? `x ≥ ${target}` : undefined,
    progress: 0, goal: 1,
    acceptedHits: 0, acceptedHitValues: [], rejectedHits: 0,
    solved: false,
    accentColor,
  };
}

export function makeExactObjective(
  target: number,
  accentColor: string,
  displayMode: 'symbolCore' | 'equationSnake' = 'symbolCore',
): MathObjective {
  // Exact objectives always use integer display — never K/M
  return {
    id: 'exact',
    objectiveKind: { kind: 'exact', target },
    displayMode,
    displaySymbol: '=',
    compactValueText: String(target),
    equationText: displayMode === 'equationSnake' ? `x = ${target}` : undefined,
    progress: 0, goal: 1,
    acceptedHits: 0, acceptedHitValues: [], rejectedHits: 0,
    solved: false,
    accentColor,
  };
}

export function makeDigitEndingObjective(
  requiredDigit: number,
  accentColor: string,
): MathObjective {
  return {
    id: 'digitEnding',
    objectiveKind: { kind: 'digitEnding', requiredDigit },
    displayMode: 'symbolCore',
    displaySymbol: '_' + requiredDigit,
    compactValueText: '_' + requiredDigit,
    progress: 0, goal: 1,
    acceptedHits: 0, acceptedHitValues: [], rejectedHits: 0,
    solved: false,
    accentColor,
  };
}

export function makeModuloObjective(
  modulus: number,
  remainder: number,
  accentColor: string,
): MathObjective {
  return {
    id: 'modulo',
    objectiveKind: { kind: 'modulo', modulus, remainder },
    displayMode: 'symbolCore',
    displaySymbol: '≡',
    compactValueText: `mod${modulus}:${remainder}`,
    equationText: `x mod ${modulus} = ${remainder}`,
    progress: 0, goal: 1,
    acceptedHits: 0, acceptedHitValues: [], rejectedHits: 0,
    solved: false,
    accentColor,
  };
}

export function makeHitCountObjective(
  requiredHits: number,
  accentColor: string,
): MathObjective {
  return {
    id: 'hitCount',
    objectiveKind: { kind: 'hitCount', requiredHits },
    displayMode: 'symbolCore',
    displaySymbol: '#',
    compactValueText: String(requiredHits),
    progress: 0, goal: requiredHits,
    acceptedHits: 0, acceptedHitValues: [], rejectedHits: 0,
    solved: false,
    accentColor,
  };
}

export function makeSumTargetObjective(
  target: number,
  accentColor: string,
): MathObjective {
  return {
    id: 'sumTarget',
    objectiveKind: { kind: 'sumTarget', target },
    displayMode: 'symbolCore',
    displaySymbol: 'Σ',
    compactValueText: formatMathCompact(target),
    progress: 0, goal: target,
    acceptedHits: 0, acceptedHitValues: [], rejectedHits: 0,
    solved: false,
    accentColor,
  };
}

export function makeSequenceObjective(
  sequenceKind: SequenceKind,
  accentColor: string,
  exactSequence?: number[],
): MathObjective {
  const goal = exactSequence ? exactSequence.length : 4; // 4 increasing hits by default
  const eqText = sequenceKind === 'exactSequence' && exactSequence
    ? exactSequence.join(' → ')
    : undefined;
  return {
    id: 'sequence',
    objectiveKind: { kind: 'sequence', sequenceKind, exactSequence },
    displayMode: 'symbolCore',
    displaySymbol: '→',
    compactValueText: eqText ? eqText.substring(0, 12) : sequenceKind === 'increasing' ? '+↑' : '≠',
    equationText: eqText,
    progress: 0, goal,
    acceptedHits: 0, acceptedHitValues: [], rejectedHits: 0,
    solved: false,
    accentColor,
  };
}

export function makeFactorObjective(
  target: number,
  accentColor: string,
): MathObjective {
  return {
    id: 'factor',
    objectiveKind: { kind: 'factor', target },
    displayMode: 'symbolCore',
    displaySymbol: '|',
    compactValueText: formatMathCompact(target),
    progress: 0, goal: 1,
    acceptedHits: 0, acceptedHitValues: [], rejectedHits: 0,
    solved: false,
    accentColor,
  };
}

export function makeApproximateObjective(
  target: number,
  tolerance: number,
  accentColor: string,
): MathObjective {
  return {
    id: 'approximate',
    objectiveKind: { kind: 'approximate', target, tolerance },
    displayMode: 'symbolCore',
    displaySymbol: '≈',
    compactValueText: formatMathCompact(target),
    progress: 0, goal: 1,
    acceptedHits: 0, acceptedHitValues: [], rejectedHits: 0,
    solved: false,
    accentColor,
  };
}

export function makeIntegralObjective(
  target: number,
  accentColor: string,
): MathObjective {
  return {
    id: 'integralAccumulation',
    objectiveKind: { kind: 'integralAccumulation', target },
    displayMode: 'symbolCore',
    displaySymbol: '∫',
    compactValueText: formatMathCompact(target),
    progress: 0, goal: target,
    acceptedHits: 0, acceptedHitValues: [], rejectedHits: 0,
    solved: false,
    accentColor,
  };
}

export function makeGeometryAreaObjective(
  width: number,
  height: number,
  accentColor: string,
): MathObjective {
  const target = width * height;
  return {
    id: 'geometryArea',
    objectiveKind: { kind: 'geometryArea', width, height, target },
    displayMode: 'symbolCore',
    displaySymbol: '□',
    compactValueText: `${width}×${height}`,
    equationText: `A = ${width}×${height} = ${target}`,
    progress: 0, goal: 1,
    acceptedHits: 0, acceptedHitValues: [], rejectedHits: 0,
    solved: false,
    accentColor,
  };
}

// ── Internal helpers ──────────────────────────────────────────────

/** Sum all accepted hit values recorded on an objective. */
function sumAcceptedHits(obj: MathObjective): number {
  return obj.acceptedHitValues.reduce((acc, v) => acc + v, 0);
}

// ── Core evaluation ────────────────────────────────────────────────

export interface EvalHitResult {
  accepted: boolean;
  feedbackText: string;
  progressUpdated: boolean;
  nowSolved: boolean;
}

/**
 * Evaluate whether a quantized damage value satisfies the objective.
 * Returns accepted/rejected status and feedback text.
 * Does NOT mutate the objective — call applyEvalResult to apply.
 */
export function evaluateHit(obj: MathObjective, mathDmg: number): EvalHitResult {
  if (obj.solved) {
    return { accepted: false, feedbackText: 'already solved', progressUpdated: false, nowSolved: false };
  }
  if (mathDmg <= 0) {
    return { accepted: false, feedbackText: 'needs positive hit', progressUpdated: false, nowSolved: false };
  }

  const ok = obj.objectiveKind;

  switch (ok.kind) {
    case 'threshold': {
      if (mathDmg >= ok.target) {
        return { accepted: true, feedbackText: `✓ ${formatMathCompact(mathDmg)}`, progressUpdated: true, nowSolved: true };
      }
      return { accepted: false, feedbackText: `needs ≥${formatMathCompact(ok.target)}`, progressUpdated: false, nowSolved: false };
    }
    case 'exact': {
      if (mathDmg === ok.target) {
        return { accepted: true, feedbackText: `✓ =${mathDmg}`, progressUpdated: true, nowSolved: true };
      }
      const diff = mathDmg - ok.target;
      return {
        accepted: false,
        feedbackText: diff > 0 ? `too high (=${ok.target})` : `too low (=${ok.target})`,
        progressUpdated: false, nowSolved: false,
      };
    }
    case 'digitEnding': {
      const lastDigit = Math.abs(mathDmg) % 10;
      if (lastDigit === ok.requiredDigit) {
        return { accepted: true, feedbackText: `✓ _${ok.requiredDigit}`, progressUpdated: true, nowSolved: true };
      }
      return { accepted: false, feedbackText: `needs _${ok.requiredDigit}`, progressUpdated: false, nowSolved: false };
    }
    case 'modulo': {
      const rem = mathDmg % ok.modulus;
      if (rem === ok.remainder) {
        return { accepted: true, feedbackText: `✓ mod${ok.modulus}`, progressUpdated: true, nowSolved: true };
      }
      return {
        accepted: false,
        feedbackText: `needs mod${ok.modulus}=${ok.remainder}`,
        progressUpdated: false, nowSolved: false,
      };
    }
    case 'hitCount': {
      // Any positive damage counts
      const newCount = obj.acceptedHits + 1;
      const nowSolved = newCount >= ok.requiredHits;
      return {
        accepted: true,
        feedbackText: `${newCount}/${ok.requiredHits} hits`,
        progressUpdated: true,
        nowSolved,
      };
    }
    case 'sumTarget': {
      const newSum = sumAcceptedHits(obj) + mathDmg;
      const nowSolved = newSum >= ok.target;
      return {
        accepted: true,
        feedbackText: `Σ ${formatMathCompact(newSum)}/${formatMathCompact(ok.target)}`,
        progressUpdated: true,
        nowSolved,
      };
    }
    case 'sequence': {
      const lastAccepted = obj.acceptedHitValues.length > 0
        ? obj.acceptedHitValues[obj.acceptedHitValues.length - 1]
        : undefined;
      switch (ok.sequenceKind) {
        case 'increasing': {
          if (lastAccepted !== undefined && mathDmg <= lastAccepted) {
            return {
              accepted: false,
              feedbackText: `needs > ${lastAccepted}`,
              progressUpdated: false, nowSolved: false,
            };
          }
          const newCount = obj.acceptedHits + 1;
          const nowSolved = newCount >= obj.goal;
          return {
            accepted: true,
            feedbackText: `${newCount}/${obj.goal} ↑`,
            progressUpdated: true, nowSolved,
          };
        }
        case 'differentValues': {
          if (obj.acceptedHitValues.includes(mathDmg)) {
            return {
              accepted: false,
              feedbackText: 'repeat',
              progressUpdated: false, nowSolved: false,
            };
          }
          const newCount = obj.acceptedHits + 1;
          const nowSolved = newCount >= obj.goal;
          return {
            accepted: true,
            feedbackText: `${newCount}/${obj.goal} ≠`,
            progressUpdated: true, nowSolved,
          };
        }
        case 'exactSequence': {
          const seq = ok.exactSequence ?? [];
          const idx = obj.acceptedHits;
          if (idx >= seq.length) {
            return { accepted: true, feedbackText: '✓', progressUpdated: true, nowSolved: true };
          }
          if (mathDmg === seq[idx]) {
            const newIdx = idx + 1;
            const nowSolved = newIdx >= seq.length;
            return {
              accepted: true,
              feedbackText: `${newIdx}/${seq.length}`,
              progressUpdated: true, nowSolved,
            };
          }
          return {
            accepted: false,
            feedbackText: `needs ${seq[idx]}`,
            progressUpdated: false, nowSolved: false,
          };
        }
      }
      break;
    }
    case 'factor': {
      // mathDmg > 0 is already guaranteed by the guard above
      if (ok.target % mathDmg === 0) {
        return { accepted: true, feedbackText: `✓ |${formatMathCompact(ok.target)}`, progressUpdated: true, nowSolved: true };
      }
      return { accepted: false, feedbackText: `${formatMathCompact(mathDmg)} not factor of ${formatMathCompact(ok.target)}`, progressUpdated: false, nowSolved: false };
    }
    case 'approximate': {
      if (Math.abs(mathDmg - ok.target) <= ok.tolerance) {
        return { accepted: true, feedbackText: `✓ ≈${formatMathCompact(ok.target)}`, progressUpdated: true, nowSolved: true };
      }
      if (mathDmg > ok.target + ok.tolerance) {
        return {
          accepted: false,
          feedbackText: `too high! (≈${formatMathCompact(ok.target)})`,
          progressUpdated: false, nowSolved: false,
        };
      }
      return {
        accepted: false,
        feedbackText: `too low (≈${formatMathCompact(ok.target)})`,
        progressUpdated: false, nowSolved: false,
      };
    }
    case 'integralAccumulation': {
      const newSum = sumAcceptedHits(obj) + mathDmg;
      const nowSolved = newSum >= ok.target;
      return {
        accepted: true,
        feedbackText: `∫ ${formatMathCompact(newSum)}/${formatMathCompact(ok.target)}`,
        progressUpdated: true,
        nowSolved,
      };
    }
    case 'geometryArea': {
      if (mathDmg === ok.target) {
        return { accepted: true, feedbackText: `✓ A=${formatMathCompact(ok.target)}`, progressUpdated: true, nowSolved: true };
      }
      const diff = mathDmg - ok.target;
      return {
        accepted: false,
        feedbackText: diff > 0 ? `too high (A=${ok.target})` : `too low (A=${ok.target})`,
        progressUpdated: false, nowSolved: false,
      };
    }
  }

  return { accepted: false, feedbackText: 'unknown objective', progressUpdated: false, nowSolved: false };
}

/**
 * Apply a successful (accepted) evaluation to the objective, mutating it.
 * Should be called after evaluateHit returns accepted: true.
 */
export function applyAcceptedHit(obj: MathObjective, mathDmg: number, result: EvalHitResult): void {
  obj.acceptedHits += 1;
  obj.acceptedHitValues.push(mathDmg);

  // Update progress
  const ok = obj.objectiveKind;
  switch (ok.kind) {
    case 'hitCount':
      obj.progress = obj.acceptedHits / obj.goal;
      break;
    case 'sumTarget':
    case 'integralAccumulation': {
      const sum = sumAcceptedHits(obj);
      obj.progress = Math.min(1, sum / obj.goal);
      break;
    }
    case 'sequence':
      obj.progress = obj.acceptedHits / obj.goal;
      break;
    default:
      obj.progress = result.nowSolved ? 1 : obj.progress;
      break;
  }

  if (result.nowSolved) {
    obj.progress = 1;
    obj.solved = true;
    obj.solvedFlashMs = MATH_SOLVED_FLASH_MS;
  }

  obj.feedback = {
    text: result.feedbackText,
    kind: 'accepted',
    timerMs: MATH_FEEDBACK_DURATION_MS,
    maxTimerMs: MATH_FEEDBACK_DURATION_MS,
  };
}

/**
 * Apply a rejected hit result to the objective (increments counter and sets feedback).
 */
export function applyRejectedHit(obj: MathObjective, result: EvalHitResult): void {
  obj.rejectedHits += 1;
  obj.feedback = {
    text: result.feedbackText,
    kind: 'rejected',
    timerMs: MATH_FEEDBACK_DURATION_MS,
    maxTimerMs: MATH_FEEDBACK_DURATION_MS,
  };
}

/**
 * Tick objective feedback timer. Returns true if feedback is still active.
 */
export function tickObjectiveFeedback(obj: MathObjective, deltaMs: number): void {
  if (obj.feedback && obj.feedback.timerMs > 0) {
    obj.feedback.timerMs -= deltaMs;
    if (obj.feedback.timerMs <= 0) {
      obj.feedback = undefined;
    }
  }
  if (obj.solvedFlashMs !== undefined && obj.solvedFlashMs > 0) {
    obj.solvedFlashMs = Math.max(0, obj.solvedFlashMs - deltaMs);
  }
}
