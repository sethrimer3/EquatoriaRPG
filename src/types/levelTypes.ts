/**
 * levelTypes.ts — Type definitions for the top-down level layout system.
 */

import type { WorldId } from './worldMapTypes';

// ─── Archetype IDs ────────────────────────────────────────────────

export type ArchetypeId =
  | 'teach_chamber'
  | 'central_shrine_arena'
  | 'four_quadrant_arena'
  | 'ring_arena'
  | 'branching_choice'
  | 'grid_chamber'
  | 'lock_and_key_dungeon'
  | 'converging_lanes'
  | 'split_island_arena'
  | 'mirror_reflection_chamber'
  | 'flow_chamber'
  | 'recursive_chamber'
  | 'boss_arena';

// ─── Room shapes ──────────────────────────────────────────────────

export type RoomShape =
  | 'rectangle'
  | 'circle'
  | 'hexagon'
  | 'triangle'
  | 'cross'
  | 'l_shape'
  | 'ring';

// ─── Object types ─────────────────────────────────────────────────

export type LevelObjectType =
  | 'shrine'
  | 'gate'
  | 'pillar'
  | 'mote_fountain'
  | 'boss_sigil'
  | 'equation_gate'
  | 'treasure'
  | 'hazard_zone'
  | 'key_fragment'
  | 'bridge'
  | 'platform'
  | 'decorative';

export interface LevelObject {
  readonly id: string;
  readonly type: LevelObjectType;
  readonly x: number;
  readonly y: number;
  readonly size: number;
  readonly label?: string;
  readonly color?: string;
  readonly glowColor?: string;
  readonly rotation?: number;
  readonly behaviorHook?: string;
}

// ─── Enemy spawn markers ──────────────────────────────────────────

export type EnemyFormation = 'single' | 'pair' | 'cluster' | 'ring' | 'grid_row' | 'grid_col';

export interface EnemySpawnMarker {
  readonly concept: string;
  readonly x: number;
  readonly y: number;
  readonly formation: EnemyFormation;
  readonly count: number;
  readonly enemyTypeHook?: string;
  readonly ruleLabel?: string;
}

// ─── Rule zones ───────────────────────────────────────────────────

export type RuleZoneShape = 'rect' | 'circle' | 'polygon';

export interface RuleZone {
  readonly id: string;
  readonly label: string;
  readonly bounds: readonly number[];
  readonly shape: RuleZoneShape;
  readonly color: string;
  readonly borderColor: string;
  readonly ruleHook?: string;
}

// ─── Room definition ─────────────────────────────────────────────

export interface RoomDefinition {
  readonly id: string;
  readonly name: string;
  readonly shape: RoomShape;
  readonly objects: readonly LevelObject[];
  readonly enemySpawns: readonly EnemySpawnMarker[];
  readonly ruleZones: readonly RuleZone[];
  readonly mathMotifs?: readonly string[];
  readonly floorColor?: string;
  readonly isBoss?: boolean;
}

// ─── Level definition ─────────────────────────────────────────────

export type LevelType = 'mandatory' | 'boss' | 'optional_challenge';

export interface LevelDefinition {
  readonly id: string;
  readonly worldId: WorldId;
  readonly levelId: string;
  readonly name: string;
  readonly type: LevelType;
  readonly archetype: ArchetypeId;
  readonly description: string;
  readonly objective: string;
  readonly twist?: string;
  readonly room: RoomDefinition;
  readonly placeholderMechanics?: readonly string[];
  /**
   * How many waves must be cleared for this level to be considered complete.
   * When omitted the RPG arena uses its default per-type fallback
   * (boss → 5 waves, others → 3 waves).
   */
  readonly waveCount?: number;
  /**
   * Optional per-enemy-type spawn multipliers for this level.
   * Values > 1 boost counts; values < 1 reduce them; 0 removes the type.
   * Used to give each world a distinct enemy composition flavour.
   *
   * Example: `{ quartz: 1.8, laser: 0.5 }` for a crystal-heavy level.
   */
  readonly waveEnemyBias?: Readonly<Partial<Record<string, number>>>;
  /**
   * Wave number offset added to the running wave counter when computing enemy
   * HP/ATK/DEF via `getWaveStatScale()`.  Later worlds use a higher base so
   * enemies feel progressively harder even though campaign levels only run
   * 3–5 waves.
   *
   * World 1 = 0 (waves effectively 1-3/5)
   * World 6 = 30 (waves effectively 31-35)
   * World 11 = 100 (waves effectively 101-105)
   */
  readonly waveBaseLevel?: number;
}
