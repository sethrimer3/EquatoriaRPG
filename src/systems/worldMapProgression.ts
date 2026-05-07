/**
 * worldMapProgression.ts — Progression state for the world map.
 *
 * Tracks which worlds and levels are locked/unlocked/completed/current.
 * Progression is driven entirely from boss-level completions (level 10 of each world).
 */

import type {
  WorldId,
  WorldMapProgressionState,
  WorldProgressState,
  WorldUnlockState,
  LevelUnlockState,
} from '../types/worldMapTypes';
import { WORLD_MAP_DATA } from '../data/worldMapData';

// ─── Factory ──────────────────────────────────────────────────────

/** Create initial progression state. Only Origin Nexus is unlocked by default. */
export function createWorldMapProgressionState(devMode = false): WorldMapProgressionState {
  const worlds = new Map<WorldId, WorldProgressState>();

  for (const world of WORLD_MAP_DATA) {
    const isFirst = world.unlockedBy.length === 0;
    const unlockState: WorldUnlockState = devMode
      ? 'unlocked'
      : isFirst
        ? 'current'
        : 'locked';

    worlds.set(world.id, {
      worldId: world.id,
      unlockState,
      completedMandatoryLevelIds: new Set<string>(),
      completedBase6Ids: new Set<string>(),
      currentMandatoryLevelId: isFirst || devMode ? (world.mandatoryLevels[0]?.id ?? null) : null,
    });
  }

  return { worlds, devMode };
}

// ─── Queries ──────────────────────────────────────────────────────

/** Get the unlock state for a world. */
export function getWorldUnlockState(
  state: WorldMapProgressionState,
  worldId: WorldId,
): WorldUnlockState {
  if (state.devMode) return 'unlocked';
  return state.worlds.get(worldId)?.unlockState ?? 'locked';
}

/**
 * Get the unlock state for a mandatory level within a world.
 * A level is unlocked if it is the first level, or the previous level is complete.
 */
export function getLevelUnlockState(
  state: WorldMapProgressionState,
  worldId: WorldId,
  levelId: string,
): LevelUnlockState {
  const worldProgress = state.worlds.get(worldId);
  if (!worldProgress) return 'locked';

  const worldData = WORLD_MAP_DATA.find(w => w.id === worldId);
  if (!worldData) return 'locked';

  if (state.devMode) {
    if (worldProgress.completedMandatoryLevelIds.has(levelId)) return 'completed';
    if (worldProgress.currentMandatoryLevelId === levelId) return 'current';
    return 'unlocked';
  }

  if (worldProgress.unlockState === 'locked') return 'locked';
  if (worldProgress.completedMandatoryLevelIds.has(levelId)) return 'completed';
  if (worldProgress.currentMandatoryLevelId === levelId) return 'current';

  const levelIndex = worldData.mandatoryLevels.findIndex(l => l.id === levelId);
  if (levelIndex <= 0) return 'unlocked';

  // Level is unlocked only if the previous level is complete
  const prevLevel = worldData.mandatoryLevels[levelIndex - 1];
  if (prevLevel && worldProgress.completedMandatoryLevelIds.has(prevLevel.id)) return 'unlocked';

  return 'locked';
}

/**
 * Check whether a Base6 challenge is unlocked.
 * Base6 set unlocks after mandatory level 5 (index 4) is completed.
 */
export function isBase6LevelUnlocked(
  state: WorldMapProgressionState,
  worldId: WorldId,
  _base6Id: string,
): boolean {
  if (state.devMode) return true;

  const worldProgress = state.worlds.get(worldId);
  if (!worldProgress) return false;
  if (worldProgress.unlockState === 'locked') return false;

  const worldData = WORLD_MAP_DATA.find(w => w.id === worldId);
  if (!worldData) return false;

  const level5 = worldData.mandatoryLevels[4]; // index 4 = level 5
  return level5 !== undefined && worldProgress.completedMandatoryLevelIds.has(level5.id);
}

// ─── Mutations ────────────────────────────────────────────────────

/**
 * Mark a mandatory level as complete and advance progression within the world.
 * If the completed level is the boss (level 10), unlock dependent worlds.
 */
export function markLevelComplete(
  state: WorldMapProgressionState,
  worldId: WorldId,
  levelId: string,
): void {
  const worldProgress = state.worlds.get(worldId);
  if (!worldProgress) return;

  worldProgress.completedMandatoryLevelIds.add(levelId);

  const worldData = WORLD_MAP_DATA.find(w => w.id === worldId);
  if (!worldData) return;

  const completedLevel = worldData.mandatoryLevels.find(l => l.id === levelId);
  if (!completedLevel) return;

  // Advance current level pointer to the next mandatory level in this world
  const levelIndex = worldData.mandatoryLevels.findIndex(l => l.id === levelId);
  const nextLevel = worldData.mandatoryLevels[levelIndex + 1];
  if (nextLevel) {
    worldProgress.currentMandatoryLevelId = nextLevel.id;
  } else {
    // All levels complete — world is finished
    worldProgress.unlockState = 'completed';
    worldProgress.currentMandatoryLevelId = null;
  }

  // Unlock dependent worlds when a boss level is cleared
  if (completedLevel.type === 'boss') {
    for (const otherWorld of WORLD_MAP_DATA) {
      if (otherWorld.unlockedBy.includes(levelId)) {
        const otherProgress = state.worlds.get(otherWorld.id);
        if (otherProgress && otherProgress.unlockState === 'locked') {
          otherProgress.unlockState = 'current';
          otherProgress.currentMandatoryLevelId = otherWorld.mandatoryLevels[0]?.id ?? null;
        }
      }
    }
  }
}

// ─── Placeholders ─────────────────────────────────────────────────

/** Placeholder: begin a mandatory/boss level. Returns false until gameplay is wired. */
export function startWorldLevel(worldId: WorldId, levelId: string): boolean {
  console.log(`[WorldMap] startWorldLevel(${worldId}, ${levelId}) — placeholder`);
  return false;
}

/** Placeholder: begin a Base6 optional challenge. Returns false until gameplay is wired. */
export function startOptionalChallenge(worldId: WorldId, challengeId: string): boolean {
  console.log(`[WorldMap] startOptionalChallenge(${worldId}, ${challengeId}) — placeholder`);
  return false;
}

// ─── Serialization ────────────────────────────────────────────────

interface SerializedWorldProgress {
  worldId: string;
  unlockState: string;
  completedMandatoryLevelIds: string[];
  completedBase6Ids: string[];
  currentMandatoryLevelId: string | null;
}

/** Serialize progression state for persistence. */
export function serializeWorldMapState(state: WorldMapProgressionState): Record<string, unknown> {
  const worlds: SerializedWorldProgress[] = [];
  for (const [, progress] of state.worlds) {
    worlds.push({
      worldId: progress.worldId,
      unlockState: progress.unlockState,
      completedMandatoryLevelIds: Array.from(progress.completedMandatoryLevelIds),
      completedBase6Ids: Array.from(progress.completedBase6Ids),
      currentMandatoryLevelId: progress.currentMandatoryLevelId,
    });
  }
  return { version: 1, devMode: state.devMode, worlds };
}

const VALID_WORLD_IDS: ReadonlySet<string> = new Set<string>([
  'origin_nexus', 'arithmetic_sands', 'fraction_fen', 'algebra_grove',
  'geometry_peaks', 'coordinate_city', 'calculus_falls', 'probability_gardens',
  'matrix_bastion', 'fractal_expanse', 'eigen_citadel',
]);

const VALID_UNLOCK_STATES: ReadonlySet<string> = new Set<string>([
  'locked', 'unlocked', 'current', 'completed',
]);

/** Deserialize progression state from a save record. Falls back to default on errors. */
export function deserializeWorldMapState(raw: Record<string, unknown>): WorldMapProgressionState {
  try {
    const devMode = Boolean(raw['devMode']);
    const defaults = createWorldMapProgressionState(devMode);

    const rawWorlds = raw['worlds'];
    if (!Array.isArray(rawWorlds)) return defaults;

    for (const entry of rawWorlds as SerializedWorldProgress[]) {
      if (typeof entry !== 'object' || entry === null) continue;
      if (typeof entry.worldId !== 'string' || !VALID_WORLD_IDS.has(entry.worldId)) continue;
      if (typeof entry.unlockState !== 'string' || !VALID_UNLOCK_STATES.has(entry.unlockState)) continue;

      const progress = defaults.worlds.get(entry.worldId as WorldId);
      if (!progress) continue;
      progress.unlockState = entry.unlockState as WorldUnlockState;
      progress.completedMandatoryLevelIds = new Set<string>(
        Array.isArray(entry.completedMandatoryLevelIds) ? entry.completedMandatoryLevelIds.filter(v => typeof v === 'string') : [],
      );
      progress.completedBase6Ids = new Set<string>(
        Array.isArray(entry.completedBase6Ids) ? entry.completedBase6Ids.filter(v => typeof v === 'string') : [],
      );
      progress.currentMandatoryLevelId = typeof entry.currentMandatoryLevelId === 'string'
        ? entry.currentMandatoryLevelId
        : null;
    }

    return defaults;
  } catch {
    return createWorldMapProgressionState();
  }
}
