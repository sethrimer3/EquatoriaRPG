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
 * Index of the mandatory level (0-based) that must be complete to unlock the
 * Base6 set for a given world. Index 4 corresponds to mandatory level 5.
 */
const BASE6_UNLOCK_LEVEL_INDEX = 4;

/**
 * Check whether a Base6 challenge is unlocked.
 * Base6 set unlocks after mandatory level 5 (index 4) is completed.
 * The specific `base6Id` is accepted for API consistency but not evaluated here —
 * all six challenges in a world share the same unlock gate.
 */
export function isBase6LevelUnlocked(
  state: WorldMapProgressionState,
  worldId: WorldId,
  base6Id: string,
): boolean {
  void base6Id; // all Base6 challenges share the same world-level unlock gate
  if (state.devMode) return true;

  const worldProgress = state.worlds.get(worldId);
  if (!worldProgress) return false;
  if (worldProgress.unlockState === 'locked') return false;

  const worldData = WORLD_MAP_DATA.find(w => w.id === worldId);
  if (!worldData) return false;

  const unlockLevel = worldData.mandatoryLevels[BASE6_UNLOCK_LEVEL_INDEX];
  return unlockLevel !== undefined && worldProgress.completedMandatoryLevelIds.has(unlockLevel.id);
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

// ─── Level launcher registration ──────────────────────────────────

type LevelLauncherFn = (worldId: WorldId, levelId: string) => void;
let _levelLauncher: LevelLauncherFn | null = null;

/**
 * Register the callback that opens the LevelScreen when a level is started.
 * Called once during app bootstrap (game-app.ts).
 */
export function registerLevelLauncher(fn: LevelLauncherFn): void {
  _levelLauncher = fn;
}

// ─── Launch actions ───────────────────────────────────────────────

/**
 * Begin a mandatory/boss level.
 * Invokes the registered level launcher if one has been provided.
 * Returns true if the launcher was called, false otherwise.
 */
export function startWorldLevel(worldId: WorldId, levelId: string): boolean {
  if (_levelLauncher) {
    _levelLauncher(worldId, levelId);
    return true;
  }
  console.log(`[WorldMap] startWorldLevel(${worldId}, ${levelId}) — no launcher registered`);
  return false;
}

/**
 * Begin a Base6 optional challenge.
 * Uses the same level launcher as mandatory levels — the launcher will open
 * the LevelScreen if a LevelDefinition exists for the challengeId, or show a
 * console warning if not yet designed.
 * Returns true if the launcher was called, false otherwise.
 */
export function startOptionalChallenge(worldId: WorldId, challengeId: string): boolean {
  if (_levelLauncher) {
    _levelLauncher(worldId, challengeId);
    return true;
  }
  console.log(`[WorldMap] startOptionalChallenge(${worldId}, ${challengeId}) — no launcher registered`);
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

const VALID_WORLD_IDS: ReadonlySet<string> = new Set<string>(WORLD_MAP_DATA.map(w => w.id));

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
