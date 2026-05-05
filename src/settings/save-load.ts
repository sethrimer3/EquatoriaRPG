import type { GameState } from '../sim/game-state';
import type { TierId } from '../data/tiers';
import { createGameState } from '../sim/game-state';
import {
  serializeInteractionMatrix,
  deserializeInteractionMatrix,
} from '../data/particles/interaction-matrix';

// ─── Save format ────────────────────────────────────────────────

const SAVE_KEY = 'equatoria_save';
const SAVE_VERSION = 21;

interface SaveData {
  version: number;
  timestamp: number;
  resources: {
    /** v21+: flat mote totals per tier. */
    moteTotals?: Record<string, number>;
    lifetimeMotes: Record<string, number>;
  };
  aliven: {
    alivenedTierIds: string[];
    /** Flat 169-element array for the 13×13 interaction matrix. */
    interactionMatrix?: number[];
  };
  /** v10+: RPG persistent state. Absent in older saves. */
  rpg?: {
    highestWaveReached: number;
    purchasedWeaponIds: string[];
    /** v10–v13 compat: single equipped weapon id. */
    equippedWeaponId?: string | null;
    /** v14+: set of all equipped weapon ids. */
    equippedWeaponIds?: string[];
    /** v20+: slot-index → weapon-id mapping. */
    equippedWeaponSlots?: Array<[number, string]>;
    xp?: number;
    weaponTiersByWeaponId?: Record<string, number>;
    rpgUpgradeLevels?: Record<string, number>;
    respawnWave?: number;
    bossCompletions?: Record<string, number>;
    bossSpeedPct?: number;
    /** v17–v18 compat: single stat XP is wired to. */
    xpAllocatedStat?: 'atk' | 'def' | 'luck' | 'hp' | null;
    /** v19+: all stats XP is wired to. */
    xpAllocatedStats?: string[];
    xpAllocatedToAtk?: number;
    xpAllocatedToDef?: number;
    xpAllocatedToLuck?: number;
    xpAllocatedToHp?: number;
  };
  elapsedMs: number;
}

// ─── Serialize ──────────────────────────────────────────────────

export function serializeGameState(state: GameState): SaveData {
  const moteTotals: Record<string, number> = {};
  for (const [tierId, total] of state.resources.moteTotals) {
    moteTotals[tierId] = total;
  }

  const lifetimeMotes: Record<string, number> = {};
  for (const [k, v] of state.resources.lifetimeMotes) lifetimeMotes[k] = v;

  return {
    version: SAVE_VERSION,
    timestamp: Date.now(),
    resources: { moteTotals, lifetimeMotes },
    aliven: {
      alivenedTierIds: Array.from(state.aliven.alivenedTierIds),
      interactionMatrix: serializeInteractionMatrix(state.aliven.interactionMatrix),
    },
    rpg: {
      highestWaveReached: state.rpg.highestWaveReached,
      purchasedWeaponIds: Array.from(state.rpg.purchasedWeaponIds),
      equippedWeaponIds: Array.from(state.rpg.equippedWeaponIds),
      equippedWeaponSlots: Array.from(state.rpg.equippedWeaponSlots.entries()),
      xp: state.rpg.xp,
      weaponTiersByWeaponId: Object.fromEntries(state.rpg.weaponTiersByWeaponId),
      rpgUpgradeLevels: Object.fromEntries(state.rpg.rpgUpgradeLevels),
      respawnWave: state.rpg.respawnWave,
      bossCompletions: Object.fromEntries(state.rpg.bossCompletions),
      bossSpeedPct: state.rpg.bossSpeedPct,
      xpAllocatedStats: Array.from(state.rpg.xpAllocatedStats),
      xpAllocatedToAtk: state.rpg.xpAllocatedToAtk,
      xpAllocatedToDef: state.rpg.xpAllocatedToDef,
      xpAllocatedToLuck: state.rpg.xpAllocatedToLuck,
      xpAllocatedToHp: state.rpg.xpAllocatedToHp,
    },
    elapsedMs: state.elapsedMs,
  };
}

// ─── Deserialize ────────────────────────────────────────────────

export function deserializeGameState(data: SaveData): GameState {
  const state = createGameState();

  // Resources — old saves (v1–v20) may have moteSizeCounts or moteTotals;
  // v21+ writes plain moteTotals. Fields not present default to zero.
  if (data.resources?.moteTotals) {
    for (const [key, val] of Object.entries(data.resources.moteTotals)) {
      state.resources.moteTotals.set(key as TierId, val);
    }
  }
  if (data.resources?.lifetimeMotes) {
    for (const [key, val] of Object.entries(data.resources.lifetimeMotes)) {
      state.resources.lifetimeMotes.set(key as TierId, val);
    }
  }

  // Aliven state
  if (data.aliven?.alivenedTierIds) {
    for (const id of data.aliven.alivenedTierIds) {
      state.aliven.alivenedTierIds.add(id as TierId);
    }
  }
  if (data.aliven?.interactionMatrix) {
    const restored = deserializeInteractionMatrix(data.aliven.interactionMatrix);
    for (let i = 0; i < restored.length; i++) {
      for (let j = 0; j < restored[i].length; j++) {
        state.aliven.interactionMatrix[i][j] = restored[i][j];
      }
    }
  }

  state.elapsedMs = data.elapsedMs ?? 0;

  // RPG state (v10+; older saves default to no progress)
  if (data.rpg) {
    state.rpg.highestWaveReached = data.rpg.highestWaveReached ?? 0;
    if (data.rpg.purchasedWeaponIds) {
      for (const id of data.rpg.purchasedWeaponIds) {
        state.rpg.purchasedWeaponIds.add(id);
      }
    }
    if (data.rpg.equippedWeaponIds) {
      for (const id of data.rpg.equippedWeaponIds) {
        state.rpg.equippedWeaponIds.add(id);
      }
    } else if (data.rpg.equippedWeaponId) {
      state.rpg.equippedWeaponIds.add(data.rpg.equippedWeaponId);
    }
    if (data.rpg.equippedWeaponSlots && data.rpg.equippedWeaponSlots.length > 0) {
      for (const [slot, wid] of data.rpg.equippedWeaponSlots) {
        state.rpg.equippedWeaponSlots.set(slot, wid);
      }
    } else {
      let migrateSlot = 0;
      for (const id of state.rpg.equippedWeaponIds) {
        state.rpg.equippedWeaponSlots.set(migrateSlot++, id);
      }
    }
    state.rpg.xp = data.rpg.xp ?? 0;
    if (data.rpg.weaponTiersByWeaponId) {
      for (const [weaponId, tier] of Object.entries(data.rpg.weaponTiersByWeaponId)) {
        state.rpg.weaponTiersByWeaponId.set(weaponId, tier);
      }
    } else {
      for (const weaponId of state.rpg.purchasedWeaponIds) {
        state.rpg.weaponTiersByWeaponId.set(weaponId, 1);
      }
    }
    if (data.rpg.rpgUpgradeLevels) {
      for (const [upgradeId, level] of Object.entries(data.rpg.rpgUpgradeLevels)) {
        state.rpg.rpgUpgradeLevels.set(upgradeId, level);
      }
    }
    state.rpg.respawnWave = data.rpg.respawnWave ?? 0;
    if (data.rpg.bossCompletions) {
      for (const [idStr, speedPct] of Object.entries(data.rpg.bossCompletions)) {
        state.rpg.bossCompletions.set(parseInt(idStr, 10), speedPct);
      }
    }
    state.rpg.bossSpeedPct = data.rpg.bossSpeedPct ?? 100;
    if (data.rpg.xpAllocatedStats) {
      const validStats = new Set(['atk', 'def', 'luck', 'hp']);
      state.rpg.xpAllocatedStats = (data.rpg.xpAllocatedStats as string[])
        .filter(s => validStats.has(s)) as Array<'atk' | 'def' | 'luck' | 'hp'>;
    } else if (data.rpg.xpAllocatedStat) {
      state.rpg.xpAllocatedStats = [data.rpg.xpAllocatedStat];
    } else {
      state.rpg.xpAllocatedStats = [];
    }
    state.rpg.xpAllocatedToAtk = data.rpg.xpAllocatedToAtk ?? 0;
    state.rpg.xpAllocatedToDef = data.rpg.xpAllocatedToDef ?? 0;
    state.rpg.xpAllocatedToLuck = data.rpg.xpAllocatedToLuck ?? 0;
    state.rpg.xpAllocatedToHp = data.rpg.xpAllocatedToHp ?? 0;
  }

  // Note: old save fields (equation, achievements, looms, progression,
  // pendingIdleMotes) are silently ignored — not present in GameState v21+.

  return state;
}

// ─── localStorage helpers ───────────────────────────────────────

export function saveGame(state: GameState): boolean {
  try {
    const data = serializeGameState(state);
    localStorage.setItem(SAVE_KEY, JSON.stringify(data));
    return true;
  } catch {
    return false;
  }
}

export function loadGame(): GameState | null {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw) as SaveData;
    // Accept all versions up to the current SAVE_VERSION
    if (typeof data.version !== 'number' || data.version < 1 || data.version > SAVE_VERSION) return null;
    return deserializeGameState(data);
  } catch {
    return null;
  }
}

export function deleteSave(): void {
  try {
    localStorage.removeItem(SAVE_KEY);
  } catch {
    // ignore
  }
}
