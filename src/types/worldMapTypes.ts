/**
 * worldMapTypes.ts — Type definitions for the World Map system.
 */

export type WorldId =
  | 'origin_nexus'
  | 'arithmetic_sands'
  | 'fraction_fen'
  | 'algebra_grove'
  | 'geometry_peaks'
  | 'coordinate_city'
  | 'calculus_falls'
  | 'probability_gardens'
  | 'matrix_bastion'
  | 'fractal_expanse'
  | 'eigen_citadel';

export type WorldUnlockState = 'locked' | 'unlocked' | 'current' | 'completed';
export type LevelUnlockState = 'locked' | 'unlocked' | 'current' | 'completed';

export interface MandatoryLevel {
  id: string;
  number: number;        // 1–10
  name: string;
  type: 'mandatory' | 'boss';
  description: string;
  mechanics: string[];
  enemyConcepts: string[];
  reward: string;
  unlocks: string[];
  // boss-only fields
  bossName?: string;
  bossDescription?: string;
  bossMechanics?: string[];
}

export interface Base6Level {
  id: string;
  base6Number: number;   // 1–6
  name: string;
  type: 'optional_challenge';
  description: string;
  challengeRule: string;
  reward: string;
}

export interface WorldData {
  id: WorldId;
  chapter: number;
  name: string;
  subtitle: string;
  theme: string;
  visualIdentity: string;
  /** Normalized canvas position (0–1 each axis). */
  position: { x: number; y: number };
  /** Boss-level IDs from prior worlds that must be complete to unlock this world. */
  unlockedBy: string[];
  reward: string;
  mandatoryLevels: MandatoryLevel[];
  base6Set: Base6Level[];
}

export interface WorldProgressState {
  worldId: WorldId;
  unlockState: WorldUnlockState;
  completedMandatoryLevelIds: Set<string>;
  completedBase6Ids: Set<string>;
  currentMandatoryLevelId: string | null;
}

export interface WorldMapProgressionState {
  worlds: Map<WorldId, WorldProgressState>;
  /** When true all worlds are visible/unlocked for testing. */
  devMode: boolean;
}
