/**
 * worldLevelPlans.ts — Level layout definitions for all 11 worlds.
 *
 * Each entry in WORLD_LEVEL_PLANS maps a levelId (from worldMapData.ts)
 * to a LevelDefinition containing an archetype-generated room layout.
 *
 * Export WORLD_COLOR_MAP for per-world visual theming.
 */

import type { LevelDefinition, ArchetypeId } from '../types/levelTypes';
import type { WorldId } from '../types/worldMapTypes';
import {
  makeTeachChamber, makeCentralShrineArena, makeFourQuadrantArena,
  makeRingArena, makeBranchingChoice, makeGridChamber, makeLockAndKeyDungeon,
  makeConvergingLanes, makeSplitIslandArena, makeMirrorReflectionChamber,
  makeFlowChamber, makeRecursiveChamber, makeBossArena,
} from './levelLayoutData';

// ─── World color map ──────────────────────────────────────────────

export const WORLD_COLOR_MAP: ReadonlyMap<WorldId, string> = new Map([
  ['origin_nexus',        '#80c8ff'],
  ['arithmetic_sands',    '#ffd764'],
  ['fraction_fen',        '#50e88c'],
  ['algebra_grove',       '#a0e060'],
  ['geometry_peaks',      '#c0d8f8'],
  ['coordinate_city',     '#74c0fc'],
  ['calculus_falls',      '#60b8e0'],
  ['probability_gardens', '#f0a0e0'],
  ['matrix_bastion',      '#a0c8a0'],
  ['fractal_expanse',     '#c490ff'],
  ['eigen_citadel',       '#e89050'],
]);

// ─── Floor colors (semi-transparent tints) ────────────────────────

const FC: Record<WorldId, string> = {
  origin_nexus:        'rgba(100,160,230,0.12)',
  arithmetic_sands:    'rgba(255,200,80,0.12)',
  fraction_fen:        'rgba(60,200,120,0.12)',
  algebra_grove:       'rgba(100,200,80,0.12)',
  geometry_peaks:      'rgba(160,200,230,0.12)',
  coordinate_city:     'rgba(80,160,255,0.12)',
  calculus_falls:      'rgba(60,160,200,0.12)',
  probability_gardens: 'rgba(220,140,220,0.12)',
  matrix_bastion:      'rgba(120,180,120,0.12)',
  fractal_expanse:     'rgba(160,100,255,0.12)',
  eigen_citadel:       'rgba(220,140,80,0.12)',
};

// ─── Motifs by world ──────────────────────────────────────────────

const MOTIFS: Record<WorldId, string[]> = {
  origin_nexus:        ['∅', '□', '○', '=', '◎'],
  arithmetic_sands:    ['+', '−', '×', '÷', '=', '∑'],
  fraction_fen:        ['½', '⅓', '¼', '/', ':', '∝'],
  algebra_grove:       ['x', 'y', '=', '±', '∈', '∀'],
  geometry_peaks:      ['△', '□', '⬡', '∠', 'π', '∞'],
  coordinate_city:     ['(x,y)', '→', '↗', 'f(x)', '⊕', '∇'],
  calculus_falls:      ['∫', 'd/dt', '∞', 'Δ', 'lim', '→'],
  probability_gardens: ['P(x)', '?', '∪', '∩', '~', '⟂'],
  matrix_bastion:      ['[M]', '⊗', '|v⟩', '∥', '∑∑', '⊞'],
  fractal_expanse:     ['∞', 'φ', '⟳', '⋯', '∫∫', 'Σⁿ'],
  eigen_citadel:       ['λ', 'Av=λv', '↻', '⊥', '∀', '∃'],
};

// ─── Per-world wave enemy biases ──────────────────────────────────
// Each world emphasises different enemy types to give levels a distinct
// mechanical flavour.  Values > 1 boost counts; < 1 reduce; 0 removes.

/** Origin Nexus — balanced introductory mix, no heavy enemies */
const BIAS_ORIGIN: Partial<Record<string, number>> = { laser: 1.0, quartz: 1.0, void: 0, iolite: 0, amethyst: 0, diamond: 0, nullstone: 0, fracteryl: 0, eigenstein: 0 };
/** Arithmetic Sands — ruby-fast + sunstone area; no stealth/teleport */
const BIAS_ARITH: Partial<Record<string, number>> = { ruby: 1.6, sunstone: 1.4, laser: 1.2, quartz: 0.8, emerald: 0, fracteryl: 0, eigenstein: 0 };
/** Fraction Fen — quartz crystal + sapphire missiles; methodical pacing */
const BIAS_FRAC: Partial<Record<string, number>> = { quartz: 1.8, sapphire: 1.5, laser: 0.6, ruby: 0.5, void: 0 };
/** Algebra Grove — emerald blink + citrine fast patrol; x-solving feel */
const BIAS_ALG: Partial<Record<string, number>> = { emerald: 1.7, citrine: 1.5, laser: 1.0, quartz: 0.7, void: 0.4 };
/** Geometry Peaks — amber spread + quartz crystal; area-awareness feel */
const BIAS_GEO: Partial<Record<string, number>> = { amber: 1.8, quartz: 1.6, sunstone: 1.2, laser: 0.7, void: 0 };
/** Coordinate City — citrine + sapphire grid feel; fast positioning */
const BIAS_COORD: Partial<Record<string, number>> = { citrine: 1.7, sapphire: 1.4, ruby: 1.3, laser: 1.0, void: 0.3 };
/** Calculus Falls — iolite beams + void pressure; sustained engagement */
const BIAS_CALC: Partial<Record<string, number>> = { iolite: 1.8, void: 1.4, amethyst: 1.2, laser: 0.8, citrine: 0.7 };
/** Probability Gardens — amethyst swarm + amber spread; chaotic mix */
const BIAS_PROB: Partial<Record<string, number>> = { amethyst: 1.9, amber: 1.5, fracteryl: 1.1, laser: 0.7, quartz: 0.6 };
/** Matrix Bastion — diamond phase + nullstone gravity; tanky walls */
const BIAS_MAT: Partial<Record<string, number>> = { diamond: 1.8, nullstone: 1.5, iolite: 1.2, laser: 0.5, quartz: 0.5 };
/** Fractal Expanse — fracteryl + eigenstein recursive; complex patterns */
const BIAS_FRACT: Partial<Record<string, number>> = { fracteryl: 2.0, eigenstein: 1.6, nullstone: 1.2, laser: 0.4, quartz: 0.4 };
/** Eigen Citadel — eigenstein + alivened swarm; final-boss intensity */
const BIAS_EIGEN: Partial<Record<string, number>> = { eigenstein: 2.2, alivened: 1.8, fracteryl: 1.4, nullstone: 1.0, laser: 0.3 };

/** Map from WorldId to the default wave enemy bias for that world. */
const WORLD_BIAS: Record<WorldId, Partial<Record<string, number>>> = {
  origin_nexus:        BIAS_ORIGIN,
  arithmetic_sands:    BIAS_ARITH,
  fraction_fen:        BIAS_FRAC,
  algebra_grove:       BIAS_ALG,
  geometry_peaks:      BIAS_GEO,
  coordinate_city:     BIAS_COORD,
  calculus_falls:      BIAS_CALC,
  probability_gardens: BIAS_PROB,
  matrix_bastion:      BIAS_MAT,
  fractal_expanse:     BIAS_FRACT,
  eigen_citadel:       BIAS_EIGEN,
};

// ─── Helper ───────────────────────────────────────────────────────

function def(
  levelId: string,
  worldId: WorldId,
  name: string,
  type: 'mandatory' | 'boss' | 'optional_challenge',
  archetype: ArchetypeId,
  description: string,
  objective: string,
  room: ReturnType<typeof makeTeachChamber>,
  placeholderMechanics?: string[],
  waveCount?: number,
  waveEnemyBias?: Readonly<Partial<Record<string, number>>>,
): LevelDefinition {
  // If no explicit bias is provided, fall back to the world-level default.
  // Boss levels and optional challenge levels inherit the same world bias unless
  // overridden via the explicit 11th argument — this is intentional: even boss
  // fights should feel thematically consistent with their world's enemy roster.
  // Pass an empty object `{}` explicitly to opt out of any bias on a per-level basis.
  const bias = waveEnemyBias ?? WORLD_BIAS[worldId];
  return { id: `layout_${levelId}`, worldId, levelId, name, type, archetype, description, objective, room, placeholderMechanics, waveCount, waveEnemyBias: bias };
}

const plans: LevelDefinition[] = [];

// ═══════════════════════════════════════════════════════════════
// WORLD 1 — Origin Nexus
// ═══════════════════════════════════════════════════════════════

const ON = 'origin_nexus' as const;
plans.push(
  def('on_01', ON, 'First Motes', 'mandatory', 'teach_chamber',
    'A safe chamber teaching movement and basic attacks.',
    'Move, attack, and learn that damage values matter.',
    makeTeachChamber({ roomId: 'on_01_r', roomName: 'First Motes Chamber', floorColor: FC[ON], shrineLabel: 'Mote Fountain', enemyConcepts: ['number mote','target mote','harmless mote'], mathMotifs: MOTIFS[ON] }),
    ['mote-fountain-interaction','damage-value-display']),

  def('on_02', ON, 'Damage Means Answer', 'mandatory', 'central_shrine_arena',
    'A central shrine displays a target number. Hit enemies with exact values.',
    'Defeat enemies using exact damage amounts.',
    makeCentralShrineArena({ roomId: 'on_02_r', roomName: 'Shrine of Answers', floorColor: FC[ON], shrineLabel: '= ?', shrineColor: '#80c8ff', enemyConcepts: ['target-value slime','exact-match mote'], mathMotifs: MOTIFS[ON] }),
    ['exact-damage-check','shrine-unlock']),

  def('on_03', ON, 'Two-Hit Thinking', 'mandatory', 'converging_lanes',
    'Two lanes each teach one part of a two-hit total.',
    'Defeat enemies requiring two hits with combined damage.',
    makeConvergingLanes({ roomId: 'on_03_r', roomName: 'Double Lane', floorColor: FC[ON], laneCount: 2, laneLabels: ['Hit 1','Hit 2'], gateLabel: 'Total Gate', enemyConcepts: ['split-shell mote','two-hit enemy'], mathMotifs: MOTIFS[ON] }),
    ['multi-hit-tracking','split-damage']),

  def('on_04', ON, 'Safe Overkill', 'mandatory', 'grid_chamber',
    'Tiles show safe/unsafe overkill zones.',
    'Learn when overkill is allowed and when it is not.',
    makeGridChamber({ roomId: 'on_04_r', roomName: 'Overkill Grid', floorColor: FC[ON], gridSize: 3, tileLabels: [['✓','✗','✓'],['✗','✓','✗'],['✓','✗','✓']], enemyConcepts: ['fragile equation mote','capped mote'], mathMotifs: MOTIFS[ON] }),
    ['overkill-zone','damage-cap']),

  def('on_05', ON, 'Reading Enemy Shorthand', 'mandatory', 'central_shrine_arena',
    'Enemies with symbol markers orbit a central symbol shrine.',
    'Learn enemy shorthand symbol indicators.',
    makeCentralShrineArena({ roomId: 'on_05_r', roomName: 'Symbol Shrine', floorColor: FC[ON], shrineLabel: '§', shrineColor: '#c8a840', enemyConcepts: ['symbol-marked mote','rune mote'], mathMotifs: MOTIFS[ON] }),
    ['enemy-symbol-display','shorthand-reading']),

  def('on_06', ON, 'Mote Flow', 'mandatory', 'flow_chamber',
    'Gentle particle currents and safe pickups with light combat.',
    'Move through particle streams and collect motes.',
    makeFlowChamber({ roomId: 'on_06_r', roomName: 'Mote Stream', floorColor: FC[ON], flowLabel: 'Particle Flow', flowColor: '#80c8ff', enemyConcepts: ['drifting mote','stream mote'], mathMotifs: MOTIFS[ON] }),
    ['particle-flow','resource-pickup']),

  def('on_07', ON, 'First Constraint', 'mandatory', 'grid_chamber',
    'Tiles show constraints: exact, less-than, greater-than.',
    'Defeat enemies while respecting damage constraints.',
    makeGridChamber({ roomId: 'on_07_r', roomName: 'Constraint Grid', floorColor: FC[ON], gridSize: 3, tileLabels: [['=','<','>'],['<','=','>'],['=','>','<']], enemyConcepts: ['capped-value mote','threshold mote'], mathMotifs: MOTIFS[ON] }),
    ['constraint-zones','damage-limit']),

  def('on_08', ON, 'Mini Equation Gate', 'mandatory', 'lock_and_key_dungeon',
    'Three rooms reveal values for a final equation gate.',
    'Solve x = simple-value style gates.',
    makeLockAndKeyDungeon({ roomId: 'on_08_r', roomName: 'Equation Gate Keep', floorColor: FC[ON], roomCount: 3, keyLabels: ['x','=','?'], lockLabel: 'x = 5', enemyConcepts: ['x=5 enemy','equation mote'], mathMotifs: MOTIFS[ON] }),
    ['equation-gate','variable-reveal']),

  def('on_09', ON, 'Nexus Trial', 'mandatory', 'four_quadrant_arena',
    'Combines exact damage, two-hit enemies, and shorthand reading.',
    'Clear all quadrants using the full Origin Nexus skill set.',
    makeFourQuadrantArena({ roomId: 'on_09_r', roomName: 'Nexus Trial Arena', floorColor: FC[ON], quadrantLabels: ['Exact','Two-Hit','Constraint','Symbol'], quadrantColors: ['#80c8ff','#ffd764','#ff8888','#a0e060'], enemyConcepts: ['exact mote','split mote','capped mote','symbol mote'], mathMotifs: MOTIFS[ON] }),
    ['multi-mechanic-trial']),

  def('on_10', ON, 'The Blank Variable', 'boss', 'boss_arena',
    'A living empty variable cycling through values each phase.',
    'Match exact damage values as the boss changes phase.',
    makeBossArena({ roomId: 'on_10_r', roomName: 'Variable Sanctum', floorColor: FC[ON], bossLabel: '□', bossColor: '#80c8ff', phaseCount: 3, phaseLabels: ['Phase I: =3','Phase II: =7','Phase III: =?'], enemyConcepts: ['phase guardian','variable fragment'], mathMotifs: MOTIFS[ON] }),
    ['boss-phase-transitions','exact-damage-boss'], 5),

  def('on_b6_01', ON, 'B1: Precision Trial', 'optional_challenge', 'teach_chamber',
    'Hit exact small target values without overkill.',
    'Perfect precision — no overkill allowed.',
    makeTeachChamber({ roomId: 'on_b6_01_r', roomName: 'Precision Chamber', floorColor: FC[ON], shrineLabel: '=', enemyConcepts: ['precision mote','exact target'], mathMotifs: MOTIFS[ON] }),
    ['precision-constraint']),

  def('on_b6_02', ON, 'B2: Speed Trial', 'optional_challenge', 'ring_arena',
    'Values shift rapidly — hit them before they change.',
    'Strike shifting values within the time window.',
    makeRingArena({ roomId: 'on_b6_02_r', roomName: 'Speed Ring', floorColor: FC[ON], centerLabel: 'Tick', centerColor: '#ff8888', ringLabel: 'Shifting Values', enemyConcepts: ['speed mote','timed target'], mathMotifs: MOTIFS[ON] }),
    ['timed-values','speed-window']),

  def('on_b6_03', ON, 'B3: Endurance Trial', 'optional_challenge', 'converging_lanes',
    'Mote waves keep coming — survive all of them.',
    'Endure all mote waves without being overwhelmed.',
    makeConvergingLanes({ roomId: 'on_b6_03_r', roomName: 'Endurance Lanes', floorColor: FC[ON], laneCount: 3, laneLabels: ['Wave A','Wave B','Wave C'], gateLabel: 'Survive', enemyConcepts: ['wave mote','endurance mote'], mathMotifs: MOTIFS[ON] }),
    ['wave-endurance']),

  def('on_b6_04', ON, 'B4: Puzzle Trial', 'optional_challenge', 'grid_chamber',
    'Match values to open grid gates.',
    'Solve the grid puzzle to open all gates.',
    makeGridChamber({ roomId: 'on_b6_04_r', roomName: 'Puzzle Grid', floorColor: FC[ON], gridSize: 3, enemyConcepts: ['gate mote','puzzle mote'], mathMotifs: MOTIFS[ON] }),
    ['grid-gate-puzzle']),

  def('on_b6_05', ON, 'B5: Constraint Trial', 'optional_challenge', 'four_quadrant_arena',
    'No overkill permitted in any quadrant.',
    'Clear all enemies without exceeding any damage cap.',
    makeFourQuadrantArena({ roomId: 'on_b6_05_r', roomName: 'Constraint Arena', floorColor: FC[ON], quadrantLabels: ['≤3','≤5','≤7','≤9'], quadrantColors: ['#80c8ff','#ffd764','#50e88c','#ff8888'], enemyConcepts: ['capped mote','exact mote'], mathMotifs: MOTIFS[ON] }),
    ['no-overkill-constraint']),

  def('on_b6_06', ON, 'B6: Synthesis Trial', 'optional_challenge', 'boss_arena',
    'Exact damage + two-hit totals combined.',
    'Apply all Origin Nexus mechanics simultaneously.',
    makeBossArena({ roomId: 'on_b6_06_r', roomName: 'Synthesis Sanctum', floorColor: FC[ON], bossLabel: '∑', bossColor: '#c8a840', phaseCount: 2, phaseLabels: ['Exact Phase','Two-Hit Phase'], enemyConcepts: ['synthesis guardian','dual mote'], mathMotifs: MOTIFS[ON] }),
    ['synthesis-multi-mechanic']),
);

// ═══════════════════════════════════════════════════════════════
// WORLD 2 — Arithmetic Sands
// ═══════════════════════════════════════════════════════════════

const AS = 'arithmetic_sands' as const;
plans.push(
  def('as_01', AS, 'Counting Dunes', 'mandatory', 'teach_chamber',
    'Number stones and exact target enemies in golden sand.',
    'Hit exact number stone targets to clear the dunes.',
    makeTeachChamber({ roomId: 'as_01_r', roomName: 'Counting Dunes', floorColor: FC[AS], shrineLabel: '+1', enemyConcepts: ['number stone','count mote'], mathMotifs: MOTIFS[AS] }),
    ['number-stone-display']),

  def('as_02', AS, 'Addition Ruins', 'mandatory', 'converging_lanes',
    'Side chambers contribute partial sums to a central total gate.',
    'Sum the lane values to open the total gate.',
    makeConvergingLanes({ roomId: 'as_02_r', roomName: 'Addition Ruins', floorColor: FC[AS], laneCount: 2, laneLabels: ['+4','+3'], gateLabel: 'Total=7', enemyConcepts: ['addend mote','sum enemy'], mathMotifs: MOTIFS[AS] }),
    ['sum-gate','addition-check']),

  def('as_03', AS, 'Subtraction Sinkholes', 'mandatory', 'split_island_arena',
    'Enemy values must be reduced to zero exactly.',
    'Reduce each enemy to exactly zero — no overkill.',
    makeSplitIslandArena({ roomId: 'as_03_r', roomName: 'Subtraction Sinkholes', floorColor: FC[AS], islandCount: 2, islandLabels: ['Island −3','Island −5'], bridgeLabel: 'Bridge', enemyConcepts: ['subtraction mote','sinkhole slime'], mathMotifs: MOTIFS[AS] }),
    ['subtraction-exact','sinkhole-hazard']),

  def('as_04', AS, 'Multiplication Obelisks', 'mandatory', 'central_shrine_arena',
    'Obelisks labeled ×2, ×3, ×5 control enemy rules.',
    'Defeat enemies with the correct multiplied damage.',
    makeCentralShrineArena({ roomId: 'as_04_r', roomName: 'Obelisk Plaza', floorColor: FC[AS], shrineLabel: '×', shrineColor: '#ffd764', enemyConcepts: ['×2 mote','×3 mote','×5 mote'], mathMotifs: MOTIFS[AS] }),
    ['multiplication-rule','obelisk-modifiers']),

  def('as_05', AS, 'Division Canyons', 'mandatory', 'split_island_arena',
    'Divisible hits open bridges or split enemies.',
    'Hit enemies with values divisible by the shown number.',
    makeSplitIslandArena({ roomId: 'as_05_r', roomName: 'Division Canyons', floorColor: FC[AS], islandCount: 3, islandLabels: ['÷2 Isle','÷3 Isle','÷5 Isle'], bridgeLabel: 'Divide', enemyConcepts: ['divisible mote','split enemy'], mathMotifs: MOTIFS[AS] }),
    ['division-bridge','factor-check']),

  def('as_06', AS, 'Even and Odd Mirage', 'mandatory', 'four_quadrant_arena',
    'Safe zones for even/odd values, mirage enemies in each.',
    'Attack from the correct parity zone.',
    makeFourQuadrantArena({ roomId: 'as_06_r', roomName: 'Parity Mirage', floorColor: FC[AS], quadrantLabels: ['Even','Odd','Even','Odd'], quadrantColors: ['#74c0fc','#ffd764','#74c0fc','#ffd764'], enemyConcepts: ['even mirage','odd mirage'], mathMotifs: MOTIFS[AS] }),
    ['parity-zones','even-odd-rule']),

  def('as_07', AS, 'Last Digit Storm', 'mandatory', 'ring_arena',
    'Rotating number storms require damage ending in displayed digits.',
    'Hit enemies with damage matching the last digit shown.',
    makeRingArena({ roomId: 'as_07_r', roomName: 'Last Digit Storm', floorColor: FC[AS], centerLabel: '_d', centerColor: '#ffd764', ringLabel: 'Digit Ring', enemyConcepts: ['digit storm mote','last-digit enemy'], mathMotifs: MOTIFS[AS] }),
    ['digit-ending-rule','ring-rotation']),

  def('as_08', AS, 'Total Without Overkill', 'mandatory', 'lock_and_key_dungeon',
    'Each room has strict total caps — no overkill permitted.',
    'Complete each room while staying under the total cap.',
    makeLockAndKeyDungeon({ roomId: 'as_08_r', roomName: 'Total Keep', floorColor: FC[AS], roomCount: 4, keyLabels: ['Total≤5','Total≤8','Total≤12'], lockLabel: 'No Overkill Gate', enemyConcepts: ['capped arithmetic mote','total guardian'], mathMotifs: MOTIFS[AS] }),
    ['total-cap','no-overkill-gate']),

  def('as_09', AS, 'Arithmetic Trial', 'mandatory', 'four_quadrant_arena',
    'Combines totals, multiples, parity, and last-digit enemies.',
    'Apply all arithmetic mechanics across four zones.',
    makeFourQuadrantArena({ roomId: 'as_09_r', roomName: 'Arithmetic Trial Arena', floorColor: FC[AS], quadrantLabels: ['Σ','×','odd','_d'], quadrantColors: ['#ffd764','#ff8888','#74c0fc','#a0e060'], enemyConcepts: ['sum mote','factor mote','parity mote','digit mote'], mathMotifs: MOTIFS[AS] }),
    ['arithmetic-mastery-trial']),

  def('as_10', AS, 'The Sum Titan', 'boss', 'boss_arena',
    'A boss with four arithmetic pillars controlling its phases.',
    'Defeat each pillar phase using the correct arithmetic rule.',
    makeBossArena({ roomId: 'as_10_r', roomName: 'Titan\'s Crucible', floorColor: FC[AS], bossLabel: 'Σ', bossColor: '#ffd764', phaseCount: 4, phaseLabels: ['+Phase','−Phase','×Phase','÷Phase'], enemyConcepts: ['arithmetic titan','pillar guardian'], mathMotifs: MOTIFS[AS] }),
    ['boss-phase-pillars','arithmetic-phases'], 5),

  def('as_b6_01', AS, 'B1: Precision', 'optional_challenge', 'teach_chamber',
    'Exact arithmetic targets only.',
    'Hit every exact target without error.',
    makeTeachChamber({ roomId: 'as_b6_01_r', roomName: 'Precision Dunes', floorColor: FC[AS], shrineLabel: '=', enemyConcepts: ['exact stone','precision mote'], mathMotifs: MOTIFS[AS] }),
    ['exact-arithmetic']),

  def('as_b6_02', AS, 'B2: Speed Trial', 'optional_challenge', 'ring_arena',
    'Target values change rapidly.',
    'Strike each value before it shifts.',
    makeRingArena({ roomId: 'as_b6_02_r', roomName: 'Speed Dunes', floorColor: FC[AS], centerLabel: '?', centerColor: '#ff8888', enemyConcepts: ['speed stone','shifting mote'], mathMotifs: MOTIFS[AS] }),
    ['timed-arithmetic']),

  def('as_b6_03', AS, 'B3: Endurance', 'optional_challenge', 'converging_lanes',
    'Addition and multiplication waves keep coming.',
    'Survive all arithmetic waves.',
    makeConvergingLanes({ roomId: 'as_b6_03_r', roomName: 'Endurance Sands', floorColor: FC[AS], laneCount: 2, laneLabels: ['+wave','×wave'], gateLabel: 'Survive', enemyConcepts: ['wave stone','multiply mote'], mathMotifs: MOTIFS[AS] }),
    ['arithmetic-waves']),

  def('as_b6_04', AS, 'B4: Puzzle Trial', 'optional_challenge', 'grid_chamber',
    'Arrange number stones to satisfy grid conditions.',
    'Complete the number-stone arrangement puzzle.',
    makeGridChamber({ roomId: 'as_b6_04_r', roomName: 'Stone Puzzle Grid', floorColor: FC[AS], gridSize: 3, enemyConcepts: ['arrangement stone','grid mote'], mathMotifs: MOTIFS[AS] }),
    ['stone-arrangement-puzzle']),

  def('as_b6_05', AS, 'B5: Constraint Trial', 'optional_challenge', 'four_quadrant_arena',
    'Only odd or only even damage in each zone.',
    'Respect the parity constraint in every zone.',
    makeFourQuadrantArena({ roomId: 'as_b6_05_r', roomName: 'Parity Constraint', floorColor: FC[AS], quadrantLabels: ['Even only','Odd only','Even only','Odd only'], quadrantColors: ['#74c0fc','#ffd764','#74c0fc','#ffd764'], enemyConcepts: ['parity mote','constrained stone'], mathMotifs: MOTIFS[AS] }),
    ['parity-constraint']),

  def('as_b6_06', AS, 'B6: Synthesis Trial', 'optional_challenge', 'boss_arena',
    'Origin constraints plus arithmetic totals combined.',
    'Apply both Origin Nexus and Arithmetic Sands mechanics.',
    makeBossArena({ roomId: 'as_b6_06_r', roomName: 'Synthesis Sands', floorColor: FC[AS], bossLabel: '∑×', bossColor: '#ffd764', phaseCount: 2, phaseLabels: ['Origin Rules','Arithmetic Rules'], enemyConcepts: ['synthesis stone','dual guardian'], mathMotifs: MOTIFS[AS] }),
    ['synthesis-worlds-1-2']),
);

// ═══════════════════════════════════════════════════════════════
// WORLD 3 — Fraction Fen
// ═══════════════════════════════════════════════════════════════

const FF = 'fraction_fen' as const;
plans.push(
  def('ff_01', FF, 'Half-Step Marsh', 'mandatory', 'split_island_arena',
    'Two islands with half-shield enemies teach fraction basics.',
    'Defeat half-shield enemies on each island.',
    makeSplitIslandArena({ roomId: 'ff_01_r', roomName: 'Half Marsh', floorColor: FC[FF], islandCount: 2, islandLabels: ['½ Isle A','½ Isle B'], bridgeLabel: '½ Bridge', enemyConcepts: ['half-shield slime','fraction mote'], mathMotifs: MOTIFS[FF] }),
    ['fraction-shield','half-values']),

  def('ff_02', FF, 'Thirds and Fourths', 'mandatory', 'split_island_arena',
    'Three and four island segments teach denominator logic.',
    'Clear each fraction segment using the right denominator.',
    makeSplitIslandArena({ roomId: 'ff_02_r', roomName: 'Denominator Islands', floorColor: FC[FF], islandCount: 3, islandLabels: ['⅓ Isle','⅓ Isle','⅓ Isle'], bridgeLabel: '⅓', enemyConcepts: ['third mote','fourth enemy'], mathMotifs: MOTIFS[FF] }),
    ['denominator-segments']),

  def('ff_03', FF, 'Ratio Reeds', 'mandatory', 'split_island_arena',
    'Two-island arena requiring a 2:1 damage ratio.',
    'Deal damage in a 2:1 ratio across both islands.',
    makeSplitIslandArena({ roomId: 'ff_03_r', roomName: 'Ratio Reeds', floorColor: FC[FF], islandCount: 2, islandLabels: ['×2 Zone','×1 Zone'], bridgeLabel: 'Ratio Bridge', enemyConcepts: ['ratio mote','reed slime'], mathMotifs: MOTIFS[FF] }),
    ['damage-ratio','ratio-gate']),

  def('ff_04', FF, 'Split Slimes', 'mandatory', 'central_shrine_arena',
    'Enemies split into fractional copies when hit.',
    'Defeat all fractional copies before they multiply.',
    makeCentralShrineArena({ roomId: 'ff_04_r', roomName: 'Split Fen', floorColor: FC[FF], shrineLabel: '÷2', shrineColor: '#50e88c', enemyConcepts: ['split slime','fraction copy'], mathMotifs: MOTIFS[FF] }),
    ['enemy-splitting','fraction-copies']),

  def('ff_05', FF, 'Denominator Locks', 'mandatory', 'converging_lanes',
    'Bridge gates labeled with denominators.',
    'Open each gate by dealing denominator-exact damage.',
    makeConvergingLanes({ roomId: 'ff_05_r', roomName: 'Denominator Locks', floorColor: FC[FF], laneCount: 3, laneLabels: ['÷2','÷3','÷4'], gateLabel: 'Fraction Gate', enemyConcepts: ['denominator slime','lock mote'], mathMotifs: MOTIFS[FF] }),
    ['denominator-gates']),

  def('ff_06', FF, 'Numerator Strikes', 'mandatory', 'ring_arena',
    'Correct segment count in a circular arena matters.',
    'Hit each ring segment with the correct numerator count.',
    makeRingArena({ roomId: 'ff_06_r', roomName: 'Numerator Ring', floorColor: FC[FF], centerLabel: 'n/d', centerColor: '#50e88c', ringLabel: 'Numerator Segments', enemyConcepts: ['numerator mote','segment enemy'], mathMotifs: MOTIFS[FF] }),
    ['numerator-segments','ring-count']),

  def('ff_07', FF, 'Improper Mire', 'mandatory', 'converging_lanes',
    'Multi-stage enemies where totals exceed one whole.',
    'Accumulate damage past whole values to defeat improper enemies.',
    makeConvergingLanes({ roomId: 'ff_07_r', roomName: 'Improper Mire', floorColor: FC[FF], laneCount: 2, laneLabels: ['3/2 Lane','5/3 Lane'], gateLabel: 'Whole Gate', enemyConcepts: ['improper slime','overflow mote'], mathMotifs: MOTIFS[FF] }),
    ['improper-fraction','overflow-damage']),

  def('ff_08', FF, 'Common Ground', 'mandatory', 'lock_and_key_dungeon',
    'Common denominator gates in a mini-dungeon chain.',
    'Find the common denominator to unlock each gate.',
    makeLockAndKeyDungeon({ roomId: 'ff_08_r', roomName: 'Common Ground Keep', floorColor: FC[FF], roomCount: 4, keyLabels: ['LCD=6','LCD=12','LCD=4'], lockLabel: 'Common Gate', enemyConcepts: ['common-denom mote','LCD guardian'], mathMotifs: MOTIFS[FF] }),
    ['common-denominator','LCD-gate']),

  def('ff_09', FF, 'Fraction Trial', 'mandatory', 'four_quadrant_arena',
    'Combines ratios, segments, and split enemies.',
    'Clear all fraction mechanics across four zones.',
    makeFourQuadrantArena({ roomId: 'ff_09_r', roomName: 'Fraction Trial Arena', floorColor: FC[FF], quadrantLabels: ['½','⅓','⅔','3/4'], quadrantColors: ['#50e88c','#a0e060','#ffd764','#80c8ff'], enemyConcepts: ['half enemy','third enemy','two-thirds mote','three-quarter slime'], mathMotifs: MOTIFS[FF] }),
    ['fraction-mastery-trial']),

  def('ff_10', FF, 'The Denominator Hydra', 'boss', 'boss_arena',
    'A multi-headed boss occupying fraction islands.',
    'Defeat each head using its fractional weak point.',
    makeBossArena({ roomId: 'ff_10_r', roomName: 'Hydra Bog', floorColor: FC[FF], bossLabel: '÷', bossColor: '#50e88c', phaseCount: 4, phaseLabels: ['½ Head','⅓ Head','¼ Head','Common Head'], enemyConcepts: ['hydra head','fraction guardian'], mathMotifs: MOTIFS[FF] }),
    ['boss-fraction-heads','denominator-phases'], 5),

  def('ff_b6_01', FF, 'B1: Precision', 'optional_challenge', 'teach_chamber',
    'Exact fractional segment values.',
    'Hit exact fraction targets without error.',
    makeTeachChamber({ roomId: 'ff_b6_01_r', roomName: 'Precision Fen', floorColor: FC[FF], shrineLabel: '½', enemyConcepts: ['exact fraction','precision mote'], mathMotifs: MOTIFS[FF] }),
    ['exact-fraction-damage']),

  def('ff_b6_02', FF, 'B2: Speed Trial', 'optional_challenge', 'ring_arena',
    'Clear splitting enemies before they multiply.',
    'Defeat splits quickly before they cascade.',
    makeRingArena({ roomId: 'ff_b6_02_r', roomName: 'Speed Fen Ring', floorColor: FC[FF], centerLabel: '÷', centerColor: '#ff8888', enemyConcepts: ['fast split','speed fraction'], mathMotifs: MOTIFS[FF] }),
    ['split-speed-window']),

  def('ff_b6_03', FF, 'B3: Endurance', 'optional_challenge', 'converging_lanes',
    'Fraction copy waves keep spawning.',
    'Survive all fraction copy waves.',
    makeConvergingLanes({ roomId: 'ff_b6_03_r', roomName: 'Endurance Fen', floorColor: FC[FF], laneCount: 2, laneLabels: ['½ Wave','⅓ Wave'], gateLabel: 'Survive', enemyConcepts: ['fraction wave','copy slime'], mathMotifs: MOTIFS[FF] }),
    ['fraction-waves']),

  def('ff_b6_04', FF, 'B4: Puzzle Trial', 'optional_challenge', 'grid_chamber',
    'Build bridges by matching fractions.',
    'Arrange fraction tiles to complete each bridge.',
    makeGridChamber({ roomId: 'ff_b6_04_r', roomName: 'Bridge Puzzle', floorColor: FC[FF], gridSize: 3, enemyConcepts: ['bridge mote','fraction tile'], mathMotifs: MOTIFS[FF] }),
    ['fraction-tile-puzzle','bridge-building']),

  def('ff_b6_05', FF, 'B5: Constraint Trial', 'optional_challenge', 'four_quadrant_arena',
    'Maintain a precise 2:1 damage ratio at all times.',
    'Never break the required damage ratio.',
    makeFourQuadrantArena({ roomId: 'ff_b6_05_r', roomName: 'Ratio Constraint', floorColor: FC[FF], quadrantLabels: ['2x','1x','2x','1x'], quadrantColors: ['#50e88c','#ffd764','#50e88c','#ffd764'], enemyConcepts: ['ratio mote','constrained slime'], mathMotifs: MOTIFS[FF] }),
    ['ratio-constraint']),

  def('ff_b6_06', FF, 'B6: Synthesis Trial', 'optional_challenge', 'boss_arena',
    'Arithmetic totals plus fraction segmentation.',
    'Apply Arithmetic Sands and Fraction Fen mechanics together.',
    makeBossArena({ roomId: 'ff_b6_06_r', roomName: 'Synthesis Bog', floorColor: FC[FF], bossLabel: '+½', bossColor: '#50e88c', phaseCount: 2, phaseLabels: ['Arithmetic Phase','Fraction Phase'], enemyConcepts: ['synthesis slime','dual guardian'], mathMotifs: MOTIFS[FF] }),
    ['synthesis-worlds-2-3']),
);

// ═══════════════════════════════════════════════════════════════
// WORLD 4 — Algebra Grove
// ═══════════════════════════════════════════════════════════════

const AG = 'algebra_grove' as const;
plans.push(
  def('ag_01', AG, 'The First Unknown', 'mandatory', 'teach_chamber',
    'Simple x+2=7 style equation gates.',
    'Solve simple one-step equations to open gates.',
    makeTeachChamber({ roomId: 'ag_01_r', roomName: 'Unknown Glade', floorColor: FC[AG], shrineLabel: 'x=?', enemyConcepts: ['unknown mote','equation slime'], mathMotifs: MOTIFS[AG] }),
    ['equation-gate','variable-solve']),

  def('ag_02', AG, 'Isolate the Mote', 'mandatory', 'central_shrine_arena',
    'One-step equation enemies surround a central shrine.',
    'Isolate and defeat each equation enemy.',
    makeCentralShrineArena({ roomId: 'ag_02_r', roomName: 'Isolation Grove', floorColor: FC[AG], shrineLabel: 'x', shrineColor: '#a0e060', enemyConcepts: ['one-step mote','isolate enemy'], mathMotifs: MOTIFS[AG] }),
    ['one-step-equations']),

  def('ag_03', AG, 'Variable Vines', 'mandatory', 'converging_lanes',
    'Enemy values are revealed after interaction with vines.',
    'Interact with vines to reveal enemy variable values.',
    makeConvergingLanes({ roomId: 'ag_03_r', roomName: 'Variable Vines', floorColor: FC[AG], laneCount: 2, laneLabels: ['x vine','y vine'], gateLabel: 'Value Gate', enemyConcepts: ['vine enemy','variable mote'], mathMotifs: MOTIFS[AG] }),
    ['variable-reveal','vine-interaction']),

  def('ag_04', AG, 'Balanced Roots', 'mandatory', 'split_island_arena',
    'Left/right totals must remain equal in a mirrored arena.',
    'Keep both sides balanced at all times.',
    makeSplitIslandArena({ roomId: 'ag_04_r', roomName: 'Balance Grove', floorColor: FC[AG], islandCount: 2, islandLabels: ['Left = x','Right = x'], bridgeLabel: '=', enemyConcepts: ['balance root','mirror mote'], mathMotifs: MOTIFS[AG] }),
    ['balance-constraint','mirror-damage']),

  def('ag_05', AG, 'Coefficient Thicket', 'mandatory', 'converging_lanes',
    'Forest lanes labeled 2x, 3x, x/2.',
    'Apply the correct coefficient when attacking each lane.',
    makeConvergingLanes({ roomId: 'ag_05_r', roomName: 'Coefficient Thicket', floorColor: FC[AG], laneCount: 3, laneLabels: ['2x','3x','x/2'], gateLabel: 'Coefficient Gate', enemyConcepts: ['coefficient mote','thicket enemy'], mathMotifs: MOTIFS[AG] }),
    ['coefficient-damage','coefficient-gate']),

  def('ag_06', AG, 'Equation Ambush', 'mandatory', 'central_shrine_arena',
    'Solved variables alter later enemy values.',
    'Solve equations in the right order to chain values.',
    makeCentralShrineArena({ roomId: 'ag_06_r', roomName: 'Ambush Shrine', floorColor: FC[AG], shrineLabel: '∴', shrineColor: '#c8a840', enemyConcepts: ['ambush mote','chain enemy'], mathMotifs: MOTIFS[AG] }),
    ['variable-chaining','equation-order']),

  def('ag_07', AG, 'Substitution Shrine', 'mandatory', 'converging_lanes',
    'One lane reveals x, the other uses x.',
    'Substitute the revealed value into the second lane.',
    makeConvergingLanes({ roomId: 'ag_07_r', roomName: 'Substitution Shrine', floorColor: FC[AG], laneCount: 2, laneLabels: ['x=3 Lane','use x Lane'], gateLabel: 'Sub Gate', enemyConcepts: ['substitution mote','use-x enemy'], mathMotifs: MOTIFS[AG] }),
    ['substitution-chain']),

  def('ag_08', AG, 'Inequality Brambles', 'mandatory', 'lock_and_key_dungeon',
    'Greater-than, less-than, and range gates in bramble rooms.',
    'Pass each gate by satisfying its inequality.',
    makeLockAndKeyDungeon({ roomId: 'ag_08_r', roomName: 'Inequality Keep', floorColor: FC[AG], roomCount: 4, keyLabels: ['x>3','x<7','3≤x≤7'], lockLabel: 'Range Gate', enemyConcepts: ['inequality mote','range guardian'], mathMotifs: MOTIFS[AG] }),
    ['inequality-gates','range-damage']),

  def('ag_09', AG, 'Algebra Trial', 'mandatory', 'four_quadrant_arena',
    'Substitution, inequalities, and balance combined.',
    'Apply all algebra mechanics across four zones.',
    makeFourQuadrantArena({ roomId: 'ag_09_r', roomName: 'Algebra Trial Arena', floorColor: FC[AG], quadrantLabels: ['x=?','balance','coeff','ineq'], quadrantColors: ['#a0e060','#80c8ff','#ffd764','#ff8888'], enemyConcepts: ['equation mote','balance root','coeff enemy','ineq slime'], mathMotifs: MOTIFS[AG] }),
    ['algebra-mastery-trial']),

  def('ag_10', AG, 'The Balance Warden', 'boss', 'boss_arena',
    'Two equation sides shifting variable anchors.',
    'Keep both sides balanced while defeating the Warden.',
    makeBossArena({ roomId: 'ag_10_r', roomName: 'Warden\'s Grove', floorColor: FC[AG], bossLabel: '=', bossColor: '#a0e060', phaseCount: 3, phaseLabels: ['One-step','Two-step','Inequality'], enemyConcepts: ['balance warden','anchor guardian'], mathMotifs: MOTIFS[AG] }),
    ['boss-balance','equation-phases'], 5),

  def('ag_b6_01', AG, 'B1: Precision', 'optional_challenge', 'teach_chamber',
    'Solve exact variable values.',
    'Find x exactly right every time.',
    makeTeachChamber({ roomId: 'ag_b6_01_r', roomName: 'Precision Grove', floorColor: FC[AG], shrineLabel: 'x=', enemyConcepts: ['exact x','precision mote'], mathMotifs: MOTIFS[AG] }),
    ['exact-variable']),

  def('ag_b6_02', AG, 'B2: Speed Trial', 'optional_challenge', 'ring_arena',
    'Equations change over time.',
    'Solve before the equation updates.',
    makeRingArena({ roomId: 'ag_b6_02_r', roomName: 'Speed Grove Ring', floorColor: FC[AG], centerLabel: 'x?', centerColor: '#ff8888', enemyConcepts: ['timed equation','speed x'], mathMotifs: MOTIFS[AG] }),
    ['timed-equations']),

  def('ag_b6_03', AG, 'B3: Endurance', 'optional_challenge', 'converging_lanes',
    'Variable enemy waves keep coming.',
    'Survive all variable enemy waves.',
    makeConvergingLanes({ roomId: 'ag_b6_03_r', roomName: 'Endurance Grove', floorColor: FC[AG], laneCount: 2, laneLabels: ['x waves','y waves'], gateLabel: 'Survive', enemyConcepts: ['variable wave','endurance mote'], mathMotifs: MOTIFS[AG] }),
    ['algebra-waves']),

  def('ag_b6_04', AG, 'B4: Puzzle Trial', 'optional_challenge', 'grid_chamber',
    'Balance equation gates using grid tiles.',
    'Arrange tiles so each equation gate is satisfied.',
    makeGridChamber({ roomId: 'ag_b6_04_r', roomName: 'Equation Puzzle Grid', floorColor: FC[AG], gridSize: 3, enemyConcepts: ['equation tile','balance mote'], mathMotifs: MOTIFS[AG] }),
    ['equation-grid-puzzle']),

  def('ag_b6_05', AG, 'B5: Constraint Trial', 'optional_challenge', 'four_quadrant_arena',
    'Attack only while the equation is balanced.',
    'Balance is required before every strike.',
    makeFourQuadrantArena({ roomId: 'ag_b6_05_r', roomName: 'Balance Constraint', floorColor: FC[AG], quadrantLabels: ['=only','=only','=only','=only'], quadrantColors: ['#a0e060','#a0e060','#a0e060','#a0e060'], enemyConcepts: ['balance mote','constrained x'], mathMotifs: MOTIFS[AG] }),
    ['balance-attack-constraint']),

  def('ag_b6_06', AG, 'B6: Synthesis Trial', 'optional_challenge', 'boss_arena',
    'Fractions and arithmetic inside algebra equations.',
    'Combine all three worlds\' mechanics.',
    makeBossArena({ roomId: 'ag_b6_06_r', roomName: 'Synthesis Grove', floorColor: FC[AG], bossLabel: 'x+½', bossColor: '#a0e060', phaseCount: 2, phaseLabels: ['Fraction+Algebra','Arithmetic+Algebra'], enemyConcepts: ['synthesis mote','world guardian'], mathMotifs: MOTIFS[AG] }),
    ['synthesis-worlds-3-4']),
);

// ═══════════════════════════════════════════════════════════════
// WORLD 5 — Geometry Peaks
// ═══════════════════════════════════════════════════════════════

const GP = 'geometry_peaks' as const;
plans.push(
  def('gp_01', GP, 'Triangle Pass', 'mandatory', 'teach_chamber',
    'A triangular chamber with three corner objectives.',
    'Activate all three triangle corners.',
    makeTeachChamber({ roomId: 'gp_01_r', roomName: 'Triangle Pass', floorColor: FC[GP], shrineLabel: '△', enemyConcepts: ['triangle mote','angle guardian'], mathMotifs: MOTIFS[GP] }),
    ['triangle-shape','corner-objectives']),

  def('gp_02', GP, 'Square Chambers', 'mandatory', 'four_quadrant_arena',
    'Four rooms requiring equal treatment per side.',
    'Apply equal damage to each side of the square.',
    makeFourQuadrantArena({ roomId: 'gp_02_r', roomName: 'Square Chambers', floorColor: FC[GP], quadrantLabels: ['Side A','Side B','Side C','Side D'], quadrantColors: ['#c0d8f8','#80c8ff','#c0d8f8','#80c8ff'], enemyConcepts: ['side guardian','square mote'], mathMotifs: MOTIFS[GP] }),
    ['equal-sides-constraint']),

  def('gp_03', GP, 'Polygon Path', 'mandatory', 'ring_arena',
    'Multi-sided room where enemy conditions match side count.',
    'Defeat each enemy using its polygon side count as the rule.',
    makeRingArena({ roomId: 'gp_03_r', roomName: 'Polygon Ring', floorColor: FC[GP], centerLabel: 'n', centerColor: '#c0d8f8', ringLabel: 'Side Count Ring', enemyConcepts: ['pentagon mote','hexagon enemy','heptagon slime'], mathMotifs: MOTIFS[GP] }),
    ['polygon-sides-rule']),

  def('gp_04', GP, 'Angle Mirrors', 'mandatory', 'mirror_reflection_chamber',
    'Angled mirrors and shielded enemies require reflection logic.',
    'Redirect attacks using mirror angles to hit shielded enemies.',
    makeMirrorReflectionChamber({ roomId: 'gp_04_r', roomName: 'Angle Mirror Hall', floorColor: FC[GP], mirrorCount: 4, enemyConcepts: ['mirror-shielded mote','angle guardian'], mathMotifs: MOTIFS[GP] }),
    ['mirror-reflection','angle-attack']),

  def('gp_05', GP, 'Perimeter Patrol', 'mandatory', 'ring_arena',
    'Boundary damage totals matter in a perimeter arena.',
    'Deal exact perimeter-sum damage around the boundary.',
    makeRingArena({ roomId: 'gp_05_r', roomName: 'Perimeter Ring', floorColor: FC[GP], centerLabel: 'P', centerColor: '#80c8ff', ringLabel: 'Perimeter Zone', enemyConcepts: ['perimeter mote','boundary enemy'], mathMotifs: MOTIFS[GP] }),
    ['perimeter-sum','boundary-damage']),

  def('gp_06', GP, 'Area Vaults', 'mandatory', 'four_quadrant_arena',
    'Different shapes in each zone modify attacks.',
    'Use area values to calculate correct damage per zone.',
    makeFourQuadrantArena({ roomId: 'gp_06_r', roomName: 'Area Vaults', floorColor: FC[GP], quadrantLabels: ['Area△','Area□','Area○','Area⬡'], quadrantColors: ['#c0d8f8','#80c8ff','#a0e060','#ffd764'], enemyConcepts: ['area mote','shape vault enemy'], mathMotifs: MOTIFS[GP] }),
    ['area-damage-modifier','shape-zones']),

  def('gp_07', GP, 'Rotating Weakpoints', 'mandatory', 'ring_arena',
    'Shield openings rotate around the ring — time your strikes.',
    'Hit each enemy during its rotating weak-point window.',
    makeRingArena({ roomId: 'gp_07_r', roomName: 'Rotation Ring', floorColor: FC[GP], centerLabel: '⟳', centerColor: '#c0d8f8', ringLabel: 'Weak-Point Ring', enemyConcepts: ['rotating mote','spin guardian'], mathMotifs: MOTIFS[GP] }),
    ['rotating-weakpoints','timing-window']),

  def('gp_08', GP, 'Prism Reflections', 'mandatory', 'lock_and_key_dungeon',
    'Multi-room reflection dungeon using attack redirection.',
    'Solve each reflection puzzle to advance.',
    makeLockAndKeyDungeon({ roomId: 'gp_08_r', roomName: 'Prism Keep', floorColor: FC[GP], roomCount: 4, keyLabels: ['Prism A','Prism B','Prism C'], lockLabel: 'Crystal Gate', enemyConcepts: ['prism mote','reflection guardian'], mathMotifs: MOTIFS[GP] }),
    ['prism-reflection','multi-room-reflection']),

  def('gp_09', GP, 'Geometry Trial', 'mandatory', 'four_quadrant_arena',
    'Shapes, angles, reflection, and area zones combined.',
    'Master all geometry mechanics across four zones.',
    makeFourQuadrantArena({ roomId: 'gp_09_r', roomName: 'Geometry Trial Arena', floorColor: FC[GP], quadrantLabels: ['∠Angle','P=perim','A=area','⟳Rotate'], quadrantColors: ['#c0d8f8','#80c8ff','#a0e060','#ffd764'], enemyConcepts: ['angle mote','perimeter mote','area mote','rotation mote'], mathMotifs: MOTIFS[GP] }),
    ['geometry-mastery-trial']),

  def('gp_10', GP, 'The Polygon Monarch', 'boss', 'boss_arena',
    'A boss that changes its shape each phase.',
    'Adapt to each polygon form to find the weak point.',
    makeBossArena({ roomId: 'gp_10_r', roomName: 'Monarch\'s Peak', floorColor: FC[GP], bossLabel: '⬡', bossColor: '#c0d8f8', phaseCount: 4, phaseLabels: ['Triangle','Square','Pentagon','∞-gon'], enemyConcepts: ['polygon monarch','shape guardian'], mathMotifs: MOTIFS[GP] }),
    ['boss-shape-phases','polygon-transformation'], 5),

  def('gp_b6_01', GP, 'B1: Precision', 'optional_challenge', 'teach_chamber',
    'Exact side or angle targets.',
    'Hit exact geometric targets.',
    makeTeachChamber({ roomId: 'gp_b6_01_r', roomName: 'Precision Peak', floorColor: FC[GP], shrineLabel: '∠', enemyConcepts: ['exact angle','precision mote'], mathMotifs: MOTIFS[GP] }),
    ['exact-geometry']),

  def('gp_b6_02', GP, 'B2: Speed Trial', 'optional_challenge', 'ring_arena',
    'Hit rotating weak points quickly.',
    'Strike each rotating window before it moves on.',
    makeRingArena({ roomId: 'gp_b6_02_r', roomName: 'Speed Rotation Ring', floorColor: FC[GP], centerLabel: '⟳', centerColor: '#ff8888', enemyConcepts: ['fast rotation','speed mote'], mathMotifs: MOTIFS[GP] }),
    ['fast-rotation-windows']),

  def('gp_b6_03', GP, 'B3: Endurance', 'optional_challenge', 'converging_lanes',
    'Geometric hazard waves keep arriving.',
    'Survive all shape hazard waves.',
    makeConvergingLanes({ roomId: 'gp_b6_03_r', roomName: 'Endurance Peaks', floorColor: FC[GP], laneCount: 2, laneLabels: ['Shape Waves','Hazard Waves'], gateLabel: 'Survive', enemyConcepts: ['shape wave','hazard mote'], mathMotifs: MOTIFS[GP] }),
    ['geometry-hazard-waves']),

  def('gp_b6_04', GP, 'B4: Puzzle Trial', 'optional_challenge', 'grid_chamber',
    'Reflect beams through shape gates.',
    'Align mirrors to direct the beam to all targets.',
    makeGridChamber({ roomId: 'gp_b6_04_r', roomName: 'Reflection Puzzle', floorColor: FC[GP], gridSize: 3, enemyConcepts: ['beam target','mirror tile'], mathMotifs: MOTIFS[GP] }),
    ['beam-reflection-puzzle']),

  def('gp_b6_05', GP, 'B5: Constraint Trial', 'optional_challenge', 'four_quadrant_arena',
    'Attack only from valid angle zones.',
    'Only angles inside the valid zone deal damage.',
    makeFourQuadrantArena({ roomId: 'gp_b6_05_r', roomName: 'Angle Constraint', floorColor: FC[GP], quadrantLabels: ['Valid∠','Block','Valid∠','Block'], quadrantColors: ['#c0d8f8','#ff888866','#c0d8f8','#ff888866'], enemyConcepts: ['angle-constrained mote','blocked enemy'], mathMotifs: MOTIFS[GP] }),
    ['angle-attack-constraint']),

  def('gp_b6_06', GP, 'B6: Synthesis Trial', 'optional_challenge', 'boss_arena',
    'Algebraic values encoded in shapes.',
    'Combine algebra and geometry in one arena.',
    makeBossArena({ roomId: 'gp_b6_06_r', roomName: 'Synthesis Peak', floorColor: FC[GP], bossLabel: 'x△', bossColor: '#c0d8f8', phaseCount: 2, phaseLabels: ['Algebra+Shape','Geometry+Equation'], enemyConcepts: ['synthesis mote','world guardian'], mathMotifs: MOTIFS[GP] }),
    ['synthesis-worlds-4-5']),
);

// ═══════════════════════════════════════════════════════════════
// WORLD 6 — Coordinate City
// ═══════════════════════════════════════════════════════════════

const CC = 'coordinate_city' as const;
plans.push(
  def('cc_01', CC, 'Origin Plaza', 'mandatory', 'teach_chamber',
    'A chamber with visible x/y axes at the center.',
    'Navigate the coordinate plane and strike at the origin.',
    makeTeachChamber({ roomId: 'cc_01_r', roomName: 'Origin Plaza', floorColor: FC[CC], shrineLabel: '(0,0)', enemyConcepts: ['origin mote','axis guardian'], mathMotifs: MOTIFS[CC] }),
    ['coordinate-axes-display','origin-zone']),

  def('cc_02', CC, 'Quadrant Streets', 'mandatory', 'four_quadrant_arena',
    'Enemies require damage from the correct quadrant position.',
    'Attack each enemy from its matching quadrant.',
    makeFourQuadrantArena({ roomId: 'cc_02_r', roomName: 'Quadrant Streets', floorColor: FC[CC], quadrantLabels: ['Q1 (+,+)','Q2 (−,+)','Q3 (−,−)','Q4 (+,−)'], quadrantColors: ['#74c0fc','#a0e060','#ff8888','#ffd764'], enemyConcepts: ['Q1 enemy','Q2 enemy','Q3 enemy','Q4 enemy'], mathMotifs: MOTIFS[CC] }),
    ['quadrant-attack-rule','position-check']),

  def('cc_03', CC, 'Slope Avenue', 'mandatory', 'grid_chamber',
    'Diagonal line paths define movement rules.',
    'Follow slope paths to reach enemies.',
    makeGridChamber({ roomId: 'cc_03_r', roomName: 'Slope Avenue', floorColor: FC[CC], gridSize: 5, enemyConcepts: ['slope mote','line enemy'], mathMotifs: MOTIFS[CC] }),
    ['slope-paths','grid-movement']),

  def('cc_04', CC, 'Intercept Station', 'mandatory', 'central_shrine_arena',
    'Enemies or doors activate at graph intercepts.',
    'Trigger intercept points to unlock enemies.',
    makeCentralShrineArena({ roomId: 'cc_04_r', roomName: 'Intercept Station', floorColor: FC[CC], shrineLabel: 'y=mx+b', shrineColor: '#74c0fc', enemyConcepts: ['intercept mote','function enemy'], mathMotifs: MOTIFS[CC] }),
    ['intercept-activation','function-display']),

  def('cc_05', CC, 'Function Rails', 'mandatory', 'converging_lanes',
    'Enemies move along plotted function paths.',
    'Predict enemy positions using function graphs.',
    makeConvergingLanes({ roomId: 'cc_05_r', roomName: 'Function Rails', floorColor: FC[CC], laneCount: 2, laneLabels: ['f(x)=2x','f(x)=x²'], gateLabel: 'Function Gate', enemyConcepts: ['function mote','rail enemy'], mathMotifs: MOTIFS[CC] }),
    ['function-enemy-paths','position-prediction']),

  def('cc_06', CC, 'Coordinate Locks', 'mandatory', 'grid_chamber',
    'Stand on coordinate tiles to open doors.',
    'Occupy the correct coordinate tiles to unlock each door.',
    makeGridChamber({ roomId: 'cc_06_r', roomName: 'Coordinate Lock Grid', floorColor: FC[CC], gridSize: 5, enemyConcepts: ['lock mote','position guardian'], mathMotifs: MOTIFS[CC] }),
    ['coordinate-tile-activation','position-locks']),

  def('cc_07', CC, 'Grid Ambush', 'mandatory', 'grid_chamber',
    'Row and column hazard triggers in a grid arena.',
    'Avoid row/column hazards while defeating enemies.',
    makeGridChamber({ roomId: 'cc_07_r', roomName: 'Grid Ambush', floorColor: FC[CC], gridSize: 7, enemyConcepts: ['row hazard','column enemy'], mathMotifs: MOTIFS[CC] }),
    ['row-column-hazards','grid-ambush']),

  def('cc_08', CC, 'Route Plotters', 'mandatory', 'lock_and_key_dungeon',
    'Path prediction matters in this mini-dungeon.',
    'Plot the correct route through each dungeon room.',
    makeLockAndKeyDungeon({ roomId: 'cc_08_r', roomName: 'Route Plotters Keep', floorColor: FC[CC], roomCount: 4, keyLabels: ['Route A','Route B','Route C'], lockLabel: 'Path Gate', enemyConcepts: ['route mote','path guardian'], mathMotifs: MOTIFS[CC] }),
    ['route-prediction','path-plotting']),

  def('cc_09', CC, 'Coordinate Trial', 'mandatory', 'four_quadrant_arena',
    'Quadrants, intercepts, and movement prediction combined.',
    'Master all coordinate mechanics across four zones.',
    makeFourQuadrantArena({ roomId: 'cc_09_r', roomName: 'Coordinate Trial Arena', floorColor: FC[CC], quadrantLabels: ['Q-zone','Slope','f(x)','(x,y)'], quadrantColors: ['#74c0fc','#a0e060','#ffd764','#ff8888'], enemyConcepts: ['quad mote','slope mote','function mote','coordinate enemy'], mathMotifs: MOTIFS[CC] }),
    ['coordinate-mastery-trial']),

  def('cc_10', CC, 'The Cartesian Engine', 'boss', 'boss_arena',
    'A boss with shifting axes, slope attacks, and coordinate traps.',
    'Anticipate the engine\'s coordinate mechanics each phase.',
    makeBossArena({ roomId: 'cc_10_r', roomName: 'Cartesian Core', floorColor: FC[CC], bossLabel: '⊕', bossColor: '#74c0fc', phaseCount: 3, phaseLabels: ['Axis Shift','Slope Storm','Coordinate Trap'], enemyConcepts: ['engine guardian','axis mote'], mathMotifs: MOTIFS[CC] }),
    ['boss-axis-shift','slope-attacks','coordinate-traps'], 5),

  def('cc_b6_01', CC, 'B1: Precision', 'optional_challenge', 'teach_chamber',
    'Attack from exact coordinate zones only.',
    'Hit targets from their precise required coordinate.',
    makeTeachChamber({ roomId: 'cc_b6_01_r', roomName: 'Precision Plaza', floorColor: FC[CC], shrineLabel: '(x,y)', enemyConcepts: ['exact coord','precision mote'], mathMotifs: MOTIFS[CC] }),
    ['exact-coordinate-attack']),

  def('cc_b6_02', CC, 'B2: Speed Trial', 'optional_challenge', 'ring_arena',
    'Reach graph-marked tiles quickly.',
    'Rush to marked coordinate tiles before time runs out.',
    makeRingArena({ roomId: 'cc_b6_02_r', roomName: 'Speed Grid Ring', floorColor: FC[CC], centerLabel: '→', centerColor: '#ff8888', enemyConcepts: ['speed tile','rush mote'], mathMotifs: MOTIFS[CC] }),
    ['timed-coordinate-tiles']),

  def('cc_b6_03', CC, 'B3: Endurance', 'optional_challenge', 'converging_lanes',
    'Grid hazard waves keep triggering.',
    'Survive all grid hazard waves.',
    makeConvergingLanes({ roomId: 'cc_b6_03_r', roomName: 'Endurance Grid', floorColor: FC[CC], laneCount: 2, laneLabels: ['Row Hazards','Col Hazards'], gateLabel: 'Survive', enemyConcepts: ['row wave','column wave'], mathMotifs: MOTIFS[CC] }),
    ['grid-hazard-waves']),

  def('cc_b6_04', CC, 'B4: Puzzle Trial', 'optional_challenge', 'grid_chamber',
    'Plot routes through coordinate gates.',
    'Navigate the correct path to reach the exit.',
    makeGridChamber({ roomId: 'cc_b6_04_r', roomName: 'Route Puzzle Grid', floorColor: FC[CC], gridSize: 5, enemyConcepts: ['route tile','path mote'], mathMotifs: MOTIFS[CC] }),
    ['coordinate-route-puzzle']),

  def('cc_b6_05', CC, 'B5: Constraint Trial', 'optional_challenge', 'four_quadrant_arena',
    'Damage only allowed from the required quadrant.',
    'Stay inside the required quadrant zone to deal damage.',
    makeFourQuadrantArena({ roomId: 'cc_b6_05_r', roomName: 'Quadrant Constraint', floorColor: FC[CC], quadrantLabels: ['Attack','Block','Attack','Block'], quadrantColors: ['#74c0fc','#ff888866','#74c0fc','#ff888866'], enemyConcepts: ['quad-constrained mote','blocked enemy'], mathMotifs: MOTIFS[CC] }),
    ['quadrant-damage-constraint']),

  def('cc_b6_06', CC, 'B6: Synthesis Trial', 'optional_challenge', 'boss_arena',
    'Geometry angles plus coordinate positions combined.',
    'Apply Geometry Peaks and Coordinate City mechanics together.',
    makeBossArena({ roomId: 'cc_b6_06_r', roomName: 'Synthesis City', floorColor: FC[CC], bossLabel: '∠(x,y)', bossColor: '#74c0fc', phaseCount: 2, phaseLabels: ['Geometry Phase','Coordinate Phase'], enemyConcepts: ['synthesis mote','world guardian'], mathMotifs: MOTIFS[CC] }),
    ['synthesis-worlds-5-6']),
);

// ═══════════════════════════════════════════════════════════════
// WORLD 7 — Calculus Falls
// ═══════════════════════════════════════════════════════════════

const CF = 'calculus_falls' as const;
plans.push(
  def('cf_01', CF, 'Flowing Path', 'mandatory', 'flow_chamber',
    'A gentle current chamber introduces motion concepts.',
    'Navigate the flow and defeat current-carried enemies.',
    makeFlowChamber({ roomId: 'cf_01_r', roomName: 'Flowing Path', floorColor: FC[CF], flowLabel: 'Gentle Current', flowColor: '#60b8e0', enemyConcepts: ['flow mote','current enemy'], mathMotifs: MOTIFS[CF] }),
    ['flow-current','motion-display']),

  def('cf_02', CF, 'Slope Serpents', 'mandatory', 'ring_arena',
    'Enemies are vulnerable during their direction changes.',
    'Strike enemies at the moment they change direction.',
    makeRingArena({ roomId: 'cf_02_r', roomName: 'Serpent Ring', floorColor: FC[CF], centerLabel: 'd/dt=0', centerColor: '#60b8e0', ringLabel: 'Direction Change Ring', enemyConcepts: ['slope serpent','direction-change mote'], mathMotifs: MOTIFS[CF] }),
    ['direction-change-window','slope-vulnerability']),

  def('cf_03', CF, 'Rate Motes', 'mandatory', 'central_shrine_arena',
    'Enemy vulnerability depends on current speed.',
    'Attack only when the enemy\'s rate matches the shrine display.',
    makeCentralShrineArena({ roomId: 'cf_03_r', roomName: 'Rate Shrine', floorColor: FC[CF], shrineLabel: 'Δv/Δt', shrineColor: '#60b8e0', enemyConcepts: ['rate mote','speed guardian'], mathMotifs: MOTIFS[CF] }),
    ['rate-vulnerability','speed-check']),

  def('cf_04', CF, 'Accumulation Pools', 'mandatory', 'split_island_arena',
    'Pools fill over time and must be stabilized.',
    'Balance pool levels before they overflow.',
    makeSplitIslandArena({ roomId: 'cf_04_r', roomName: 'Accumulation Pools', floorColor: FC[CF], islandCount: 2, islandLabels: ['Pool A ∫','Pool B ∫'], bridgeLabel: 'Flow Bridge', enemyConcepts: ['pool mote','accumulation enemy'], mathMotifs: MOTIFS[CF] }),
    ['pool-accumulation','fill-rate']),

  def('cf_05', CF, 'Limit Ledges', 'mandatory', 'converging_lanes',
    'Threshold gates and near-limit timing windows.',
    'Approach enemy values as close to the limit as possible.',
    makeConvergingLanes({ roomId: 'cf_05_r', roomName: 'Limit Ledges', floorColor: FC[CF], laneCount: 2, laneLabels: ['lim→3','lim→7'], gateLabel: 'Limit Gate', enemyConcepts: ['limit mote','threshold enemy'], mathMotifs: MOTIFS[CF] }),
    ['limit-approach','threshold-gate']),

  def('cf_06', CF, 'Derivative Drift', 'mandatory', 'ring_arena',
    'A timing-focused combat arena based on rate of change.',
    'Attack during derivative peaks for maximum damage.',
    makeRingArena({ roomId: 'cf_06_r', roomName: 'Derivative Drift Ring', floorColor: FC[CF], centerLabel: 'f\'(x)', centerColor: '#c8a840', ringLabel: 'Rate Ring', enemyConcepts: ['derivative mote','drift enemy'], mathMotifs: MOTIFS[CF] }),
    ['derivative-timing','peak-attack-window']),

  def('cf_07', CF, 'Integral Basin', 'mandatory', 'flow_chamber',
    'Accumulated damage over time windows matters.',
    'Build up integral damage over the basin window.',
    makeFlowChamber({ roomId: 'cf_07_r', roomName: 'Integral Basin', floorColor: FC[CF], flowLabel: '∫ Accumulate', flowColor: '#60b8e0', enemyConcepts: ['integral mote','basin enemy'], mathMotifs: MOTIFS[CF] }),
    ['integral-accumulation','damage-window']),

  def('cf_08', CF, 'Acceleration Falls', 'mandatory', 'lock_and_key_dungeon',
    'Fast-changing patterns in a multi-room flow dungeon.',
    'Navigate all rooms before patterns shift too fast.',
    makeLockAndKeyDungeon({ roomId: 'cf_08_r', roomName: 'Acceleration Falls Keep', floorColor: FC[CF], roomCount: 4, keyLabels: ['Accel A','Accel B','Peak C'], lockLabel: 'Flow Gate', enemyConcepts: ['acceleration mote','rate guardian'], mathMotifs: MOTIFS[CF] }),
    ['acceleration-patterns','fast-flow']),

  def('cf_09', CF, 'Calculus Trial', 'mandatory', 'four_quadrant_arena',
    'Timing, rate, and accumulation mechanics combined.',
    'Master all calculus mechanics across four zones.',
    makeFourQuadrantArena({ roomId: 'cf_09_r', roomName: 'Calculus Trial Arena', floorColor: FC[CF], quadrantLabels: ['d/dt','∫','lim','Δ'], quadrantColors: ['#60b8e0','#a0e060','#ffd764','#c0d8f8'], enemyConcepts: ['deriv mote','integral mote','limit mote','delta enemy'], mathMotifs: MOTIFS[CF] }),
    ['calculus-mastery-trial']),

  def('cf_10', CF, 'The Derivative Leviathan', 'boss', 'boss_arena',
    'A flowing boss with weak points during rate changes.',
    'Strike the Leviathan only during its rate-change moments.',
    makeBossArena({ roomId: 'cf_10_r', roomName: 'Leviathan Falls', floorColor: FC[CF], bossLabel: 'd/dt', bossColor: '#60b8e0', phaseCount: 3, phaseLabels: ['Steady Flow','Acceleration','Limit Approach'], enemyConcepts: ['leviathan segment','flow guardian'], mathMotifs: MOTIFS[CF] }),
    ['boss-rate-change','flow-phases'], 5),

  def('cf_b6_01', CF, 'B1: Precision', 'optional_challenge', 'teach_chamber',
    'Exact timing windows only.',
    'Strike within the exact timing window.',
    makeTeachChamber({ roomId: 'cf_b6_01_r', roomName: 'Precision Falls', floorColor: FC[CF], shrineLabel: 'lim', enemyConcepts: ['timing mote','exact limit'], mathMotifs: MOTIFS[CF] }),
    ['exact-timing-window']),

  def('cf_b6_02', CF, 'B2: Speed Trial', 'optional_challenge', 'ring_arena',
    'Solve before values drift away.',
    'Hit targets before drift moves them out of range.',
    makeRingArena({ roomId: 'cf_b6_02_r', roomName: 'Drift Ring', floorColor: FC[CF], centerLabel: '→∞', centerColor: '#ff8888', enemyConcepts: ['drift mote','speed limit'], mathMotifs: MOTIFS[CF] }),
    ['timed-drift']),

  def('cf_b6_03', CF, 'B3: Endurance', 'optional_challenge', 'converging_lanes',
    'Accumulating hazard pressure builds over time.',
    'Survive all accumulation pressure waves.',
    makeConvergingLanes({ roomId: 'cf_b6_03_r', roomName: 'Endurance Falls', floorColor: FC[CF], laneCount: 2, laneLabels: ['∫ Wave','Δ Wave'], gateLabel: 'Survive', enemyConcepts: ['pressure mote','accumulate enemy'], mathMotifs: MOTIFS[CF] }),
    ['accumulation-pressure-waves']),

  def('cf_b6_04', CF, 'B4: Puzzle Trial', 'optional_challenge', 'grid_chamber',
    'Redirect particle flow to solve the puzzle.',
    'Adjust flow channels to reach all targets.',
    makeGridChamber({ roomId: 'cf_b6_04_r', roomName: 'Flow Puzzle Grid', floorColor: FC[CF], gridSize: 3, enemyConcepts: ['flow tile','redirect mote'], mathMotifs: MOTIFS[CF] }),
    ['flow-redirect-puzzle']),

  def('cf_b6_05', CF, 'B5: Constraint Trial', 'optional_challenge', 'four_quadrant_arena',
    'Attack only during motion changes.',
    'No damage dealt during steady-state phases.',
    makeFourQuadrantArena({ roomId: 'cf_b6_05_r', roomName: 'Motion Constraint', floorColor: FC[CF], quadrantLabels: ['Change✓','Steady✗','Change✓','Steady✗'], quadrantColors: ['#60b8e0','#ff888866','#60b8e0','#ff888866'], enemyConcepts: ['motion mote','constrained rate'], mathMotifs: MOTIFS[CF] }),
    ['motion-change-attack-constraint']),

  def('cf_b6_06', CF, 'B6: Synthesis Trial', 'optional_challenge', 'boss_arena',
    'Coordinate positions plus timing and slopes.',
    'Combine Coordinate City and Calculus Falls mechanics.',
    makeBossArena({ roomId: 'cf_b6_06_r', roomName: 'Synthesis Falls', floorColor: FC[CF], bossLabel: '∫f(x)dx', bossColor: '#60b8e0', phaseCount: 2, phaseLabels: ['Coordinate Phase','Calculus Phase'], enemyConcepts: ['synthesis mote','world guardian'], mathMotifs: MOTIFS[CF] }),
    ['synthesis-worlds-6-7']),
);

// ═══════════════════════════════════════════════════════════════
// WORLD 8 — Probability Gardens
// ═══════════════════════════════════════════════════════════════

const PG = 'probability_gardens' as const;
plans.push(
  def('pg_01', PG, 'Chance Seeds', 'mandatory', 'teach_chamber',
    'Visible random outcomes in a safe garden chamber.',
    'Learn to read probability displays and react.',
    makeTeachChamber({ roomId: 'pg_01_r', roomName: 'Chance Seed Garden', floorColor: FC[PG], shrineLabel: 'P=?', enemyConcepts: ['chance seed','random mote'], mathMotifs: MOTIFS[PG] }),
    ['probability-display','random-outcome-read']),

  def('pg_02', PG, 'Weighted Blossoms', 'mandatory', 'branching_choice',
    'Branching paths with visibly weighted probabilities.',
    'Choose the path with the best expected outcome.',
    makeBranchingChoice({ roomId: 'pg_02_r', roomName: 'Weighted Blossoms', floorColor: FC[PG], branchLabels: ['P=0.6','P=0.3','P=0.1'], enemyConcepts: ['weighted blossom','probability enemy'], mathMotifs: MOTIFS[PG] }),
    ['weighted-branches','expected-value-choice']),

  def('pg_03', PG, 'Reroll Grove', 'mandatory', 'central_shrine_arena',
    'A central shrine rerolls room conditions once.',
    'Use the reroll wisely to improve your odds.',
    makeCentralShrineArena({ roomId: 'pg_03_r', roomName: 'Reroll Shrine', floorColor: FC[PG], shrineLabel: '⟳', shrineColor: '#f0a0e0', enemyConcepts: ['reroll mote','condition guardian'], mathMotifs: MOTIFS[PG] }),
    ['reroll-mechanic','condition-reset']),

  def('pg_04', PG, 'Risk Pools', 'mandatory', 'split_island_arena',
    'Optional harder paths for better rewards.',
    'Choose your risk level — safe path or high-reward path.',
    makeSplitIslandArena({ roomId: 'pg_04_r', roomName: 'Risk Pools', floorColor: FC[PG], islandCount: 2, islandLabels: ['Safe P=0.8','Risk P=0.3'], bridgeLabel: 'Risk Bridge', enemyConcepts: ['safe mote','risk enemy'], mathMotifs: MOTIFS[PG] }),
    ['risk-reward-branches']),

  def('pg_05', PG, 'Branching Beasts', 'mandatory', 'branching_choice',
    'Enemies choose attacks from visible probability trees.',
    'Read the probability tree and counter the likely attack.',
    makeBranchingChoice({ roomId: 'pg_05_r', roomName: 'Branching Beasts', floorColor: FC[PG], branchLabels: ['P=0.5 attack','P=0.3 shield','P=0.2 run'], enemyConcepts: ['branching beast','probability mote'], mathMotifs: MOTIFS[PG] }),
    ['enemy-probability-tree','attack-prediction']),

  def('pg_06', PG, 'Expected Value Shrine', 'mandatory', 'central_shrine_arena',
    'A puzzle room for choosing efficient risk.',
    'Select the option with the highest expected value.',
    makeCentralShrineArena({ roomId: 'pg_06_r', roomName: 'EV Shrine', floorColor: FC[PG], shrineLabel: 'E(X)', shrineColor: '#c8a840', enemyConcepts: ['EV mote','expectation guardian'], mathMotifs: MOTIFS[PG] }),
    ['expected-value-calculation','optimal-choice']),

  def('pg_07', PG, 'Uncertain Shields', 'mandatory', 'ring_arena',
    'Weaknesses are probabilistic but readable.',
    'Identify the likely weak point from displayed odds.',
    makeRingArena({ roomId: 'pg_07_r', roomName: 'Uncertain Shield Ring', floorColor: FC[PG], centerLabel: 'P(weak)', centerColor: '#f0a0e0', ringLabel: 'Probability Ring', enemyConcepts: ['uncertain mote','shield chance enemy'], mathMotifs: MOTIFS[PG] }),
    ['probabilistic-weakness','readable-odds']),

  def('pg_08', PG, 'Luck Without Guessing', 'mandatory', 'lock_and_key_dungeon',
    'A multi-room dungeon teaching odds interpretation.',
    'Use readable odds — never guess blindly.',
    makeLockAndKeyDungeon({ roomId: 'pg_08_r', roomName: 'Odds Keep', floorColor: FC[PG], roomCount: 4, keyLabels: ['Odds A','Odds B','Tree C'], lockLabel: 'P-Gate', enemyConcepts: ['odds mote','probability guardian'], mathMotifs: MOTIFS[PG] }),
    ['odds-interpretation','probability-gates']),

  def('pg_09', PG, 'Probability Trial', 'mandatory', 'four_quadrant_arena',
    'Visible odds, rerolls, and risk decisions combined.',
    'Apply all probability mechanics across four zones.',
    makeFourQuadrantArena({ roomId: 'pg_09_r', roomName: 'Probability Trial Arena', floorColor: FC[PG], quadrantLabels: ['P(x)','E(X)','Reroll','Risk'], quadrantColors: ['#f0a0e0','#ffd764','#a0e060','#80c8ff'], enemyConcepts: ['prob mote','EV mote','reroll enemy','risk slime'], mathMotifs: MOTIFS[PG] }),
    ['probability-mastery-trial']),

  def('pg_10', PG, 'The Chance Matriarch', 'boss', 'boss_arena',
    'A boss with randomized but telegraphed weighted attacks.',
    'Read the Matriarch\'s probability display and counter each phase.',
    makeBossArena({ roomId: 'pg_10_r', roomName: 'Matriarch\'s Garden', floorColor: FC[PG], bossLabel: '?', bossColor: '#f0a0e0', phaseCount: 3, phaseLabels: ['P=0.6 Phase','P=0.3 Phase','P=0.1 Chaos'], enemyConcepts: ['matriarch form','chance guardian'], mathMotifs: MOTIFS[PG] }),
    ['boss-probability-phases','telegraphed-random'], 5),

  def('pg_b6_01', PG, 'B1: Precision', 'optional_challenge', 'teach_chamber',
    'Optimal damage under probability constraints.',
    'Calculate and deliver the optimal probability-weighted hit.',
    makeTeachChamber({ roomId: 'pg_b6_01_r', roomName: 'Precision Garden', floorColor: FC[PG], shrineLabel: 'P=1', enemyConcepts: ['optimal mote','precise chance'], mathMotifs: MOTIFS[PG] }),
    ['optimal-probability-damage']),

  def('pg_b6_02', PG, 'B2: Speed Trial', 'optional_challenge', 'ring_arena',
    'Fast probability shifts — react quickly.',
    'Track rapidly shifting odds and strike at the right moment.',
    makeRingArena({ roomId: 'pg_b6_02_r', roomName: 'Speed Garden Ring', floorColor: FC[PG], centerLabel: 'P→?', centerColor: '#ff8888', enemyConcepts: ['fast-shift mote','speed chance'], mathMotifs: MOTIFS[PG] }),
    ['fast-probability-shift']),

  def('pg_b6_03', PG, 'B3: Endurance', 'optional_challenge', 'converging_lanes',
    'Readable random wave patterns keep coming.',
    'Survive all readable random waves.',
    makeConvergingLanes({ roomId: 'pg_b6_03_r', roomName: 'Endurance Garden', floorColor: FC[PG], laneCount: 2, laneLabels: ['P waves','E(X) waves'], gateLabel: 'Survive', enemyConcepts: ['wave mote','probability wave'], mathMotifs: MOTIFS[PG] }),
    ['probability-waves']),

  def('pg_b6_04', PG, 'B4: Puzzle Trial', 'optional_challenge', 'grid_chamber',
    'Navigate through probability branches to the exit.',
    'Choose the correct branch path to reach the goal.',
    makeGridChamber({ roomId: 'pg_b6_04_r', roomName: 'Branch Puzzle Garden', floorColor: FC[PG], gridSize: 3, enemyConcepts: ['branch tile','path mote'], mathMotifs: MOTIFS[PG] }),
    ['probability-branch-puzzle']),

  def('pg_b6_05', PG, 'B5: Constraint Trial', 'optional_challenge', 'four_quadrant_arena',
    'Limited rerolls — use them wisely.',
    'Complete the challenge with only 2 rerolls available.',
    makeFourQuadrantArena({ roomId: 'pg_b6_05_r', roomName: 'Reroll Constraint', floorColor: FC[PG], quadrantLabels: ['1 Reroll','No Reroll','1 Reroll','No Reroll'], quadrantColors: ['#f0a0e0','#ff888866','#f0a0e0','#ff888866'], enemyConcepts: ['constrained mote','reroll guardian'], mathMotifs: MOTIFS[PG] }),
    ['limited-rerolls']),

  def('pg_b6_06', PG, 'B6: Synthesis Trial', 'optional_challenge', 'boss_arena',
    'Calculus timing plus probability windows.',
    'Combine Calculus Falls and Probability Gardens mechanics.',
    makeBossArena({ roomId: 'pg_b6_06_r', roomName: 'Synthesis Garden', floorColor: FC[PG], bossLabel: 'P·∫', bossColor: '#f0a0e0', phaseCount: 2, phaseLabels: ['Calculus Phase','Probability Phase'], enemyConcepts: ['synthesis mote','world guardian'], mathMotifs: MOTIFS[PG] }),
    ['synthesis-worlds-7-8']),
);

// ═══════════════════════════════════════════════════════════════
// WORLD 9 — Matrix Bastion
// ═══════════════════════════════════════════════════════════════

const MB = 'matrix_bastion' as const;
plans.push(
  def('mb_01', MB, 'Row Gate', 'mandatory', 'grid_chamber',
    'A 3×3 grid chamber where rows control gate logic.',
    'Clear each row to unlock its gate.',
    makeGridChamber({ roomId: 'mb_01_r', roomName: 'Row Gate Grid', floorColor: FC[MB], gridSize: 3, enemyConcepts: ['row guardian','column mote'], mathMotifs: MOTIFS[MB] }),
    ['row-gate','grid-row-logic']),

  def('mb_02', MB, 'Column Watch', 'mandatory', 'grid_chamber',
    'Columns affect enemy rules in a grid chamber.',
    'Satisfy each column condition to defeat enemies.',
    makeGridChamber({ roomId: 'mb_02_r', roomName: 'Column Watch Grid', floorColor: FC[MB], gridSize: 3, enemyConcepts: ['column guardian','matrix mote'], mathMotifs: MOTIFS[MB] }),
    ['column-rule','grid-column-logic']),

  def('mb_03', MB, 'Diagonal Guard', 'mandatory', 'four_quadrant_arena',
    'Diagonal pattern arena — diagonals protect enemies.',
    'Break the diagonal pattern to expose enemies.',
    makeFourQuadrantArena({ roomId: 'mb_03_r', roomName: 'Diagonal Guard Arena', floorColor: FC[MB], quadrantLabels: ['Diag\\','Diag/','Anti\\','Anti/'], quadrantColors: ['#a0c8a0','#80c8ff','#a0c8a0','#80c8ff'], enemyConcepts: ['diagonal mote','diagonal guardian'], mathMotifs: MOTIFS[MB] }),
    ['diagonal-pattern','matrix-diagonal']),

  def('mb_04', MB, 'Array Shift', 'mandatory', 'grid_chamber',
    'Enemies shift formation each wave.',
    'Adapt targeting to each new formation after it shifts.',
    makeGridChamber({ roomId: 'mb_04_r', roomName: 'Array Shift Grid', floorColor: FC[MB], gridSize: 5, enemyConcepts: ['shift mote','array guardian'], mathMotifs: MOTIFS[MB] }),
    ['array-formation-shift','wave-reformation']),

  def('mb_05', MB, 'Transform Panels', 'mandatory', 'grid_chamber',
    'Floor tiles transform damage before it applies.',
    'Account for tile transformations when planning attacks.',
    makeGridChamber({ roomId: 'mb_05_r', roomName: 'Transform Panel Grid', floorColor: FC[MB], gridSize: 5, enemyConcepts: ['transform mote','panel guardian'], mathMotifs: MOTIFS[MB] }),
    ['transform-tiles','damage-transformation']),

  def('mb_06', MB, 'System Sentinels', 'mandatory', 'central_shrine_arena',
    'Multiple enemies must be solved simultaneously.',
    'Solve the system by defeating all sentinels in one sweep.',
    makeCentralShrineArena({ roomId: 'mb_06_r', roomName: 'Sentinel Array', floorColor: FC[MB], shrineLabel: '[M]', shrineColor: '#a0c8a0', enemyConcepts: ['sentinel A','sentinel B','sentinel C'], mathMotifs: MOTIFS[MB] }),
    ['simultaneous-solution','system-of-enemies']),

  def('mb_07', MB, 'Formation Locks', 'mandatory', 'ring_arena',
    'Break formations by targeting correct positions.',
    'Hit the key formation position to unlock the group.',
    makeRingArena({ roomId: 'mb_07_r', roomName: 'Formation Lock Ring', floorColor: FC[MB], centerLabel: '⊗', centerColor: '#a0c8a0', ringLabel: 'Formation Ring', enemyConcepts: ['formation mote','lock position'], mathMotifs: MOTIFS[MB] }),
    ['formation-lock','position-key']),

  def('mb_08', MB, 'Matrix Multipliers', 'mandatory', 'lock_and_key_dungeon',
    'Enemy rules modify other enemy values.',
    'Defeat multiplier enemies first to simplify the rest.',
    makeLockAndKeyDungeon({ roomId: 'mb_08_r', roomName: 'Matrix Multiplier Keep', floorColor: FC[MB], roomCount: 4, keyLabels: ['Mult A','Mult B','Result C'], lockLabel: 'Matrix Gate', enemyConcepts: ['multiplier mote','modified enemy'], mathMotifs: MOTIFS[MB] }),
    ['enemy-value-modification','matrix-multiplier']),

  def('mb_09', MB, 'Matrix Trial', 'mandatory', 'grid_chamber',
    'Rows, columns, diagonals, and transformations combined.',
    'Master all matrix mechanics across the full grid.',
    makeGridChamber({ roomId: 'mb_09_r', roomName: 'Matrix Trial Grid', floorColor: FC[MB], gridSize: 7, enemyConcepts: ['row mote','col mote','diag mote','transform mote'], mathMotifs: MOTIFS[MB] }),
    ['matrix-mastery-trial']),

  def('mb_10', MB, 'The Array General', 'boss', 'boss_arena',
    'A boss with formation commands and grid transformations.',
    'Break each formation command to disable the General\'s phases.',
    makeBossArena({ roomId: 'mb_10_r', roomName: 'General\'s Bastion', floorColor: FC[MB], bossLabel: '[M]', bossColor: '#a0c8a0', phaseCount: 3, phaseLabels: ['Row Command','Col Command','Full Matrix'], enemyConcepts: ['array general','formation guardian'], mathMotifs: MOTIFS[MB] }),
    ['boss-formation-commands','matrix-phases'], 5),

  def('mb_b6_01', MB, 'B1: Precision', 'optional_challenge', 'teach_chamber',
    'Exact row/column targets.',
    'Hit each row/column target with perfect precision.',
    makeTeachChamber({ roomId: 'mb_b6_01_r', roomName: 'Precision Bastion', floorColor: FC[MB], shrineLabel: '[R,C]', enemyConcepts: ['exact row','precision col'], mathMotifs: MOTIFS[MB] }),
    ['exact-matrix-targets']),

  def('mb_b6_02', MB, 'B2: Speed Trial', 'optional_challenge', 'ring_arena',
    'Solve formations before they shift.',
    'Clear each formation before it reorganizes.',
    makeRingArena({ roomId: 'mb_b6_02_r', roomName: 'Speed Formation Ring', floorColor: FC[MB], centerLabel: '⊗', centerColor: '#ff8888', enemyConcepts: ['speed formation','shift mote'], mathMotifs: MOTIFS[MB] }),
    ['timed-formations']),

  def('mb_b6_03', MB, 'B3: Endurance', 'optional_challenge', 'converging_lanes',
    'Tactical formation waves keep advancing.',
    'Survive all formation waves.',
    makeConvergingLanes({ roomId: 'mb_b6_03_r', roomName: 'Endurance Bastion', floorColor: FC[MB], laneCount: 2, laneLabels: ['Row Waves','Col Waves'], gateLabel: 'Survive', enemyConcepts: ['formation wave','endurance mote'], mathMotifs: MOTIFS[MB] }),
    ['formation-waves']),

  def('mb_b6_04', MB, 'B4: Puzzle Trial', 'optional_challenge', 'grid_chamber',
    'Arrange transform panels for correct output.',
    'Configure transform tiles so damage reaches all targets.',
    makeGridChamber({ roomId: 'mb_b6_04_r', roomName: 'Panel Puzzle Grid', floorColor: FC[MB], gridSize: 3, enemyConcepts: ['panel tile','transform mote'], mathMotifs: MOTIFS[MB] }),
    ['transform-panel-puzzle']),

  def('mb_b6_05', MB, 'B5: Constraint Trial', 'optional_challenge', 'four_quadrant_arena',
    'Limited attacks per row and per column.',
    'Complete the challenge within the attack limit per row/col.',
    makeFourQuadrantArena({ roomId: 'mb_b6_05_r', roomName: 'Attack Limit Grid', floorColor: FC[MB], quadrantLabels: ['≤2/row','≤2/col','≤2/row','≤2/col'], quadrantColors: ['#a0c8a0','#80c8ff','#a0c8a0','#80c8ff'], enemyConcepts: ['constrained row','limited col'], mathMotifs: MOTIFS[MB] }),
    ['attack-limit-constraint']),

  def('mb_b6_06', MB, 'B6: Synthesis Trial', 'optional_challenge', 'boss_arena',
    'Probability outcomes inside matrix formations.',
    'Combine Probability Gardens and Matrix Bastion mechanics.',
    makeBossArena({ roomId: 'mb_b6_06_r', roomName: 'Synthesis Bastion', floorColor: FC[MB], bossLabel: 'P[M]', bossColor: '#a0c8a0', phaseCount: 2, phaseLabels: ['Probability Phase','Matrix Phase'], enemyConcepts: ['synthesis mote','world guardian'], mathMotifs: MOTIFS[MB] }),
    ['synthesis-worlds-8-9']),
);

// ═══════════════════════════════════════════════════════════════
// WORLD 10 — Fractal Expanse
// ═══════════════════════════════════════════════════════════════

const FE = 'fractal_expanse' as const;
plans.push(
  def('fe_01', FE, 'Echo Field', 'mandatory', 'teach_chamber',
    'Enemies repeat your last action back at you.',
    'Learn to vary your attacks to avoid echo feedback.',
    makeTeachChamber({ roomId: 'fe_01_r', roomName: 'Echo Field', floorColor: FC[FE], shrineLabel: '⟳', enemyConcepts: ['echo mote','repeat enemy'], mathMotifs: MOTIFS[FE] }),
    ['echo-mechanic','action-repeat']),

  def('fe_02', FE, 'Smaller Selves', 'mandatory', 'central_shrine_arena',
    'Enemies split into smaller self-similar copies.',
    'Defeat all recursion copies before they multiply.',
    makeCentralShrineArena({ roomId: 'fe_02_r', roomName: 'Smaller Selves Shrine', floorColor: FC[FE], shrineLabel: '∞', shrineColor: '#c490ff', enemyConcepts: ['split copy','fractal mote'], mathMotifs: MOTIFS[FE] }),
    ['self-similar-split','copy-defeat']),

  def('fe_03', FE, 'Recursive Roots', 'mandatory', 'converging_lanes',
    'Enemy rules reference previous hits.',
    'Track your hit history to satisfy recursive conditions.',
    makeConvergingLanes({ roomId: 'fe_03_r', roomName: 'Recursive Roots', floorColor: FC[FE], laneCount: 2, laneLabels: ['Hit(n-1)','Use n-1'], gateLabel: 'Recursion Gate', enemyConcepts: ['recursive mote','history enemy'], mathMotifs: MOTIFS[FE] }),
    ['hit-history-tracking','recursive-rule']),

  def('fe_04', FE, 'Pattern Spiral', 'mandatory', 'ring_arena',
    'Repeating attack patterns with small variations.',
    'Identify and complete the repeating pattern.',
    makeRingArena({ roomId: 'fe_04_r', roomName: 'Pattern Spiral Ring', floorColor: FC[FE], centerLabel: 'φ', centerColor: '#c490ff', ringLabel: 'Spiral Ring', enemyConcepts: ['spiral mote','pattern enemy'], mathMotifs: MOTIFS[FE] }),
    ['repeating-pattern','pattern-completion']),

  def('fe_05', FE, 'Nested Gates', 'mandatory', 'lock_and_key_dungeon',
    'Outer and inner gate conditions must both be met.',
    'Satisfy nested conditions from outside in.',
    makeLockAndKeyDungeon({ roomId: 'fe_05_r', roomName: 'Nested Gates Keep', floorColor: FC[FE], roomCount: 3, keyLabels: ['Outer Gate','Inner Gate'], lockLabel: 'Core Gate', enemyConcepts: ['nested mote','gate guardian'], mathMotifs: MOTIFS[FE] }),
    ['nested-conditions','outer-inner-gates']),

  def('fe_06', FE, 'Scale Storm', 'mandatory', 'four_quadrant_arena',
    'Same mechanic appears at different scales in each quadrant.',
    'Apply the same rule at each scale level.',
    makeFourQuadrantArena({ roomId: 'fe_06_r', roomName: 'Scale Storm Arena', floorColor: FC[FE], quadrantLabels: ['Scale×1','Scale×2','Scale×4','Scale×8'], quadrantColors: ['#c490ff','#a490ff','#8490ff','#6490ff'], enemyConcepts: ['small fractal','medium fractal','large fractal','huge fractal'], mathMotifs: MOTIFS[FE] }),
    ['multi-scale-rule','self-similarity']),

  def('fe_07', FE, 'Copy Motes', 'mandatory', 'central_shrine_arena',
    'Enemies copy the player\'s damage pattern.',
    'Vary your damage to prevent enemy adaptation.',
    makeCentralShrineArena({ roomId: 'fe_07_r', roomName: 'Copy Shrine', floorColor: FC[FE], shrineLabel: '⋯', shrineColor: '#8888ff', enemyConcepts: ['copy mote','mirror enemy'], mathMotifs: MOTIFS[FE] }),
    ['damage-pattern-copy','anti-pattern']),

  def('fe_08', FE, 'Infinite Branch', 'mandatory', 'recursive_chamber',
    'Recursive room chain that must be pruned carefully.',
    'Prune the recursion tree without cutting needed branches.',
    makeRecursiveChamber({ roomId: 'fe_08_r', roomName: 'Infinite Branch Chamber', floorColor: FC[FE], nestingDepth: 3, patternLabel: 'Prune', enemyConcepts: ['branch mote','prune enemy'], mathMotifs: MOTIFS[FE] }),
    ['recursion-pruning','branch-management']),

  def('fe_09', FE, 'Fractal Trial', 'mandatory', 'four_quadrant_arena',
    'Splitting, copying, nesting, and repeating rules combined.',
    'Master all fractal mechanics across four zones.',
    makeFourQuadrantArena({ roomId: 'fe_09_r', roomName: 'Fractal Trial Arena', floorColor: FC[FE], quadrantLabels: ['Split','Copy','Nest','Repeat'], quadrantColors: ['#c490ff','#a0e060','#80c8ff','#ffd764'], enemyConcepts: ['split mote','copy mote','nested mote','repeat mote'], mathMotifs: MOTIFS[FE] }),
    ['fractal-mastery-trial']),

  def('fe_10', FE, 'The Recursive Seraph', 'boss', 'boss_arena',
    'A boss that recursively remixes earlier boss mechanics.',
    'Recognize and counter each recycled boss pattern.',
    makeBossArena({ roomId: 'fe_10_r', roomName: 'Seraph\'s Expanse', floorColor: FC[FE], bossLabel: 'Σⁿ', bossColor: '#c490ff', phaseCount: 4, phaseLabels: ['Origin Echo','Arithmetic Echo','Algebra Echo','Fractal Core'], enemyConcepts: ['recursive seraph','echo guardian'], mathMotifs: MOTIFS[FE] }),
    ['boss-recursive-phases','mechanic-remix'], 5),

  def('fe_b6_01', FE, 'B1: Precision', 'optional_challenge', 'teach_chamber',
    'Hit exact recursive patterns.',
    'Match each recursive pattern with perfect precision.',
    makeTeachChamber({ roomId: 'fe_b6_01_r', roomName: 'Precision Expanse', floorColor: FC[FE], shrineLabel: 'φ', enemyConcepts: ['precise pattern','exact fractal'], mathMotifs: MOTIFS[FE] }),
    ['exact-recursive-pattern']),

  def('fe_b6_02', FE, 'B2: Speed Trial', 'optional_challenge', 'ring_arena',
    'Stop recursion before it grows too large.',
    'Defeat copies quickly before they multiply out of control.',
    makeRingArena({ roomId: 'fe_b6_02_r', roomName: 'Speed Fractal Ring', floorColor: FC[FE], centerLabel: '⟳', centerColor: '#ff8888', enemyConcepts: ['fast split','growth mote'], mathMotifs: MOTIFS[FE] }),
    ['recursion-speed-limit']),

  def('fe_b6_03', FE, 'B3: Endurance', 'optional_challenge', 'converging_lanes',
    'Self-similar waves keep repeating.',
    'Survive all self-similar wave patterns.',
    makeConvergingLanes({ roomId: 'fe_b6_03_r', roomName: 'Endurance Expanse', floorColor: FC[FE], laneCount: 2, laneLabels: ['Echo Waves','Split Waves'], gateLabel: 'Survive', enemyConcepts: ['similar wave','endurance fractal'], mathMotifs: MOTIFS[FE] }),
    ['fractal-waves']),

  def('fe_b6_04', FE, 'B4: Puzzle Trial', 'optional_challenge', 'grid_chamber',
    'Find the base case to solve the recursive puzzle.',
    'Identify and activate the base case tile.',
    makeGridChamber({ roomId: 'fe_b6_04_r', roomName: 'Base Case Puzzle', floorColor: FC[FE], gridSize: 3, enemyConcepts: ['base mote','recursive tile'], mathMotifs: MOTIFS[FE] }),
    ['base-case-puzzle','recursion-stop']),

  def('fe_b6_05', FE, 'B5: Constraint Trial', 'optional_challenge', 'four_quadrant_arena',
    'Limited recursion-breaking tools available.',
    'Complete the challenge with only 3 prune moves.',
    makeFourQuadrantArena({ roomId: 'fe_b6_05_r', roomName: 'Limited Prune Arena', floorColor: FC[FE], quadrantLabels: ['Prune','No prune','Prune','No prune'], quadrantColors: ['#c490ff','#ff888866','#c490ff','#ff888866'], enemyConcepts: ['constrained mote','locked fractal'], mathMotifs: MOTIFS[FE] }),
    ['limited-prune-constraint']),

  def('fe_b6_06', FE, 'B6: Synthesis Trial', 'optional_challenge', 'boss_arena',
    'Matrix structures plus recursive enemy rules.',
    'Combine Matrix Bastion and Fractal Expanse mechanics.',
    makeBossArena({ roomId: 'fe_b6_06_r', roomName: 'Synthesis Expanse', floorColor: FC[FE], bossLabel: '[M]ⁿ', bossColor: '#c490ff', phaseCount: 2, phaseLabels: ['Matrix Phase','Fractal Phase'], enemyConcepts: ['synthesis mote','world guardian'], mathMotifs: MOTIFS[FE] }),
    ['synthesis-worlds-9-10']),
);

// ═══════════════════════════════════════════════════════════════
// WORLD 11 — Eigen Citadel
// ═══════════════════════════════════════════════════════════════

const EC = 'eigen_citadel' as const;
plans.push(
  def('ec_01', EC, 'Identity Gate', 'mandatory', 'teach_chamber',
    'Enemies that preserve certain values through transformation.',
    'Find the invariant value and use it to pass the gate.',
    makeTeachChamber({ roomId: 'ec_01_r', roomName: 'Identity Gate', floorColor: FC[EC], shrineLabel: 'I', enemyConcepts: ['identity mote','invariant guardian'], mathMotifs: MOTIFS[EC] }),
    ['invariant-detection','identity-gate']),

  def('ec_02', EC, 'Vector Halls', 'mandatory', 'converging_lanes',
    'Direction and magnitude both matter for enemy attacks.',
    'Match both direction and magnitude to defeat vector enemies.',
    makeConvergingLanes({ roomId: 'ec_02_r', roomName: 'Vector Halls', floorColor: FC[EC], laneCount: 2, laneLabels: ['→ Direction','‖v‖ Magnitude'], gateLabel: 'Vector Gate', enemyConcepts: ['vector mote','direction enemy'], mathMotifs: MOTIFS[EC] }),
    ['vector-direction','vector-magnitude']),

  def('ec_03', EC, 'Transformation Choir', 'mandatory', 'central_shrine_arena',
    'Damage is transformed by a rule before applying.',
    'Account for the transformation when calculating damage.',
    makeCentralShrineArena({ roomId: 'ec_03_r', roomName: 'Transformation Choir', floorColor: FC[EC], shrineLabel: 'T(x)', shrineColor: '#e89050', enemyConcepts: ['transform mote','choir guardian'], mathMotifs: MOTIFS[EC] }),
    ['damage-transformation','T-function']),

  def('ec_04', EC, 'Invariant Watchers', 'mandatory', 'ring_arena',
    'Recognize which properties survive transformation.',
    'Identify invariant enemies — they cannot be harmed directly.',
    makeRingArena({ roomId: 'ec_04_r', roomName: 'Invariant Watcher Ring', floorColor: FC[EC], centerLabel: 'λ', centerColor: '#e89050', ringLabel: 'Invariant Ring', enemyConcepts: ['invariant watcher','mutable enemy'], mathMotifs: MOTIFS[EC] }),
    ['invariant-recognition','transformation-immunity']),

  def('ec_05', EC, 'Basis Chambers', 'mandatory', 'four_quadrant_arena',
    'Arena zones alter damage interpretation.',
    'Adjust attacks for the basis transformation in each zone.',
    makeFourQuadrantArena({ roomId: 'ec_05_r', roomName: 'Basis Chambers', floorColor: FC[EC], quadrantLabels: ['Basis e1','Basis e2','Dual e1','Dual e2'], quadrantColors: ['#e89050','#c860a0','#6060e8','#30a090'], enemyConcepts: ['basis mote','dual enemy','basis guardian'], mathMotifs: MOTIFS[EC] }),
    ['basis-transformation','zone-damage-alt']),

  def('ec_06', EC, 'Reflection Court', 'mandatory', 'mirror_reflection_chamber',
    'Earlier mechanics return in transformed forms.',
    'Recognize and counter returning mechanics in new guises.',
    makeMirrorReflectionChamber({ roomId: 'ec_06_r', roomName: 'Reflection Court', floorColor: FC[EC], mirrorCount: 4, enemyConcepts: ['transformed echo','mirror guardian'], mathMotifs: MOTIFS[EC] }),
    ['transformed-mechanics','reflection-synthesis']),

  def('ec_07', EC, 'Resonance Fields', 'mandatory', 'central_shrine_arena',
    'Correct damage creates harmonic resonance chains.',
    'Hit eigenvalue targets to trigger resonance effects.',
    makeCentralShrineArena({ roomId: 'ec_07_r', roomName: 'Resonance Fields', floorColor: FC[EC], shrineLabel: 'Av=λv', shrineColor: '#c860a0', enemyConcepts: ['resonant mote','harmonic enemy'], mathMotifs: MOTIFS[EC] }),
    ['eigenvalue-resonance','harmonic-chain']),

  def('ec_08', EC, 'Axiom Convergence', 'mandatory', 'lock_and_key_dungeon',
    'World axioms collected from previous worlds matter.',
    'Apply axioms from each world to unlock corresponding gates.',
    makeLockAndKeyDungeon({ roomId: 'ec_08_r', roomName: 'Axiom Convergence Keep', floorColor: FC[EC], roomCount: 5, keyLabels: ['Origin Axiom','Geometry Axiom','Calculus Axiom'], lockLabel: 'Convergence Gate', enemyConcepts: ['axiom mote','world guardian'], mathMotifs: MOTIFS[EC] }),
    ['world-axiom-gates','convergence-mechanic']),

  def('ec_09', EC, 'Final Synthesis Trial', 'mandatory', 'recursive_chamber',
    'All previous world mechanics combined.',
    'Defeat enemies using any technique learned across all worlds.',
    makeRecursiveChamber({ roomId: 'ec_09_r', roomName: 'Synthesis Trial Chamber', floorColor: FC[EC], nestingDepth: 4, patternLabel: 'All Worlds', enemyConcepts: ['synthesis guardian','world echo','final mote'], mathMotifs: MOTIFS[EC] }),
    ['all-worlds-synthesis','multi-mechanic-mastery']),

  def('ec_10', EC, 'The Prime Equation', 'boss', 'boss_arena',
    'The ultimate boss transforming earlier world mechanics each phase.',
    'Defeat the Prime Equation by adapting to each world transformation.',
    makeBossArena({ roomId: 'ec_10_r', roomName: 'Prime Equation Sanctum', floorColor: FC[EC], bossLabel: 'Av=λv', bossColor: '#e89050', phaseCount: 5, phaseLabels: ['Origin Transform','Arithmetic Transform','Calculus Transform','Fractal Transform','Eigen Core'], enemyConcepts: ['prime equation','world echo','eigen guardian'], mathMotifs: MOTIFS[EC] }),
    ['boss-world-transforms','final-boss-phases'], 5),

  def('ec_b6_01', EC, 'B1: Precision', 'optional_challenge', 'teach_chamber',
    'Invariant target values must be exact.',
    'Hit each invariant value with perfect precision.',
    makeTeachChamber({ roomId: 'ec_b6_01_r', roomName: 'Precision Citadel', floorColor: FC[EC], shrineLabel: 'λ', enemyConcepts: ['exact eigenvalue','precision mote'], mathMotifs: MOTIFS[EC] }),
    ['exact-invariant-targets']),

  def('ec_b6_02', EC, 'B2: Speed Trial', 'optional_challenge', 'ring_arena',
    'Rules transform rapidly — adapt quickly.',
    'Track rapid transformation shifts and respond.',
    makeRingArena({ roomId: 'ec_b6_02_r', roomName: 'Speed Transform Ring', floorColor: FC[EC], centerLabel: '↻', centerColor: '#ff8888', enemyConcepts: ['fast transform','speed mote'], mathMotifs: MOTIFS[EC] }),
    ['rapid-transformation']),

  def('ec_b6_03', EC, 'B3: Endurance', 'optional_challenge', 'converging_lanes',
    'Waves from all previous worlds keep arriving.',
    'Survive the ultimate multi-world endurance challenge.',
    makeConvergingLanes({ roomId: 'ec_b6_03_r', roomName: 'All-World Endurance', floorColor: FC[EC], laneCount: 3, laneLabels: ['Early Worlds','Mid Worlds','Late Worlds'], gateLabel: 'Survive All', enemyConcepts: ['world wave','endurance mote'], mathMotifs: MOTIFS[EC] }),
    ['all-world-waves']),

  def('ec_b6_04', EC, 'B4: Puzzle Trial', 'optional_challenge', 'grid_chamber',
    'Align transformations to reveal the hidden path.',
    'Configure each transform tile to expose the exit path.',
    makeGridChamber({ roomId: 'ec_b6_04_r', roomName: 'Transform Puzzle Citadel', floorColor: FC[EC], gridSize: 3, enemyConcepts: ['transform tile','path mote'], mathMotifs: MOTIFS[EC] }),
    ['transform-alignment-puzzle']),

  def('ec_b6_05', EC, 'B5: Constraint Trial', 'optional_challenge', 'four_quadrant_arena',
    'Damage is transformed unpredictably but readably.',
    'Read the transformation display and adjust every hit.',
    makeFourQuadrantArena({ roomId: 'ec_b6_05_r', roomName: 'Unpredictable Constraint', floorColor: FC[EC], quadrantLabels: ['T(x)?','Read→','T(x)?','Read→'], quadrantColors: ['#e89050','#a0e060','#e89050','#a0e060'], enemyConcepts: ['constrained transform','readable mote'], mathMotifs: MOTIFS[EC] }),
    ['unpredictable-readable-transform']),

  def('ec_b6_06', EC, 'B6: Synthesis Trial', 'optional_challenge', 'boss_arena',
    'The ultimate optional super-challenge combining all systems.',
    'Survive the final synthesis of all eleven worlds.',
    makeBossArena({ roomId: 'ec_b6_06_r', roomName: 'Ultimate Synthesis Sanctum', floorColor: FC[EC], bossLabel: '∀∃λ', bossColor: '#e89050', phaseCount: 5, phaseLabels: ['Worlds 1-3','Worlds 4-6','Worlds 7-9','World 10','Eigen Core'], enemyConcepts: ['world synthesis','ultimate guardian','prime echo'], mathMotifs: MOTIFS[EC] }),
    ['synthesis-all-worlds','ultimate-challenge']),
);

// ─── Build the lookup map ─────────────────────────────────────────

export const WORLD_LEVEL_PLANS: ReadonlyMap<string, LevelDefinition> = new Map(
  plans.map(p => [p.levelId, p]),
);
