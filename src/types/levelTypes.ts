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
}
