/**
 * app-actions.ts — Action dispatch and UI update logic.
 */

import { tryAlivenMote } from '../sim';
import { setInteractionMatrixCell, resetInteractionMatrix } from '../sim/aliven';
import { getMotes, spendMotes } from '../sim/resources';
import { WEAPON_BY_ID } from '../data/rpg/weapon-definitions';
import { RPG_UPGRADE_BY_ID } from '../data/rpg/rpg-upgrade-definitions';
import {
  getRpgUpgradeLevel,
  getWeaponTierUpgradeCost,
  getMaxEquippedWeapons,
  MAX_WEAPON_TIER,
  isBossUnlocked,
  MIN_BOSS_SPEED_PCT,
  MAX_BOSS_SPEED_PCT,
  BOSS_SPEED_STEP,
} from '../sim/rpg/rpg-state';
import type { TierId } from '../data/tiers';
import type { GameAction } from '../input';
import type { ParticleSystem } from '../render';
import type { SettingsState } from '../settings';
import type { AppState, UIPanels } from './app-types';
import type { AudioSystem } from '../audio';

// ─── Action handler ─────────────────────────────────────────────

export function handleAction(
  state: AppState,
  action: GameAction,
  particles: ParticleSystem,
  settings: SettingsState,
  uiPanels: UIPanels,
  audioSystem?: AudioSystem,
): void {
  const devMode = settings.isDevMode;
  switch (action.kind) {
    case 'tap':
      // Taps are routed to the RPG render directly via its own pointer listeners.
      break;
    case 'aliven_mote': {
      const ok = tryAlivenMote(state.game, action.tierId as TierId, devMode);
      if (!ok) audioSystem?.onError();
      break;
    }
    case 'set_interaction_matrix_cell':
      setInteractionMatrixCell(state.game.aliven, action.row, action.col, action.value);
      particles.interactionMatrix = state.game.aliven.interactionMatrix;
      break;
    case 'reset_interaction_matrix':
      resetInteractionMatrix(state.game.aliven);
      particles.interactionMatrix = state.game.aliven.interactionMatrix;
      break;
    case 'purchase_weapon': {
      const weaponDef = WEAPON_BY_ID.get(action.weaponId);
      if (!weaponDef) { audioSystem?.onError(); break; }
      if (state.game.rpg.purchasedWeaponIds.has(action.weaponId)) break;
      if (!devMode) {
        const balance = getMotes(state.game.resources, weaponDef.costTierId);
        if (balance < weaponDef.cost) { audioSystem?.onError(); break; }
        spendMotes(state.game.resources, weaponDef.costTierId, weaponDef.cost);
      }
      state.game.rpg.purchasedWeaponIds.add(action.weaponId);
      state.game.rpg.weaponTiersByWeaponId.set(action.weaponId, 1);
      audioSystem?.onBuyLoomUpgrade();
      uiPanels.rpgMenuPanel.update(state.game.rpg, state.game.resources, settings.numberFormat, devMode);
      break;
    }
    case 'equip_weapon': {
      if (!state.game.rpg.purchasedWeaponIds.has(action.weaponId)) { audioSystem?.onError(); break; }
      const maxSlots = getMaxEquippedWeapons(state.game.rpg);
      if (state.game.rpg.equippedWeaponIds.size >= maxSlots) { audioSystem?.onError(); break; }
      let firstEmpty = -1;
      for (let s = 0; s < maxSlots; s++) {
        if (!state.game.rpg.equippedWeaponSlots.has(s)) { firstEmpty = s; break; }
      }
      if (firstEmpty === -1) { audioSystem?.onError(); break; }
      state.game.rpg.equippedWeaponIds.add(action.weaponId);
      state.game.rpg.equippedWeaponSlots.set(firstEmpty, action.weaponId);
      uiPanels.rpgRender.notifyEquip();
      uiPanels.rpgMenuPanel.update(state.game.rpg, state.game.resources, settings.numberFormat, devMode);
      break;
    }
    case 'equip_weapon_to_slot': {
      if (!state.game.rpg.purchasedWeaponIds.has(action.weaponId)) { audioSystem?.onError(); break; }
      const maxSlots = getMaxEquippedWeapons(state.game.rpg);
      if (action.slotIndex < 0 || action.slotIndex >= maxSlots) { audioSystem?.onError(); break; }
      const prevWeapon = state.game.rpg.equippedWeaponSlots.get(action.slotIndex);
      if (prevWeapon) {
        state.game.rpg.equippedWeaponIds.delete(prevWeapon);
        state.game.rpg.equippedWeaponSlots.delete(action.slotIndex);
      }
      for (const [slot, wid] of state.game.rpg.equippedWeaponSlots) {
        if (wid === action.weaponId) {
          state.game.rpg.equippedWeaponSlots.delete(slot);
          break;
        }
      }
      state.game.rpg.equippedWeaponIds.add(action.weaponId);
      state.game.rpg.equippedWeaponSlots.set(action.slotIndex, action.weaponId);
      uiPanels.rpgRender.notifyEquip();
      uiPanels.rpgMenuPanel.update(state.game.rpg, state.game.resources, settings.numberFormat, devMode);
      break;
    }
    case 'unequip_weapon': {
      state.game.rpg.equippedWeaponIds.delete(action.weaponId);
      for (const [slot, wid] of state.game.rpg.equippedWeaponSlots) {
        if (wid === action.weaponId) {
          state.game.rpg.equippedWeaponSlots.delete(slot);
          break;
        }
      }
      uiPanels.rpgRender.notifyEquip();
      uiPanels.rpgMenuPanel.update(state.game.rpg, state.game.resources, settings.numberFormat, devMode);
      break;
    }
    case 'upgrade_weapon_tier': {
      const weaponDef = WEAPON_BY_ID.get(action.weaponId);
      if (!weaponDef) { audioSystem?.onError(); break; }
      if (!state.game.rpg.purchasedWeaponIds.has(action.weaponId)) { audioSystem?.onError(); break; }
      const currentTier = state.game.rpg.weaponTiersByWeaponId.get(action.weaponId) ?? 1;
      if (currentTier >= MAX_WEAPON_TIER) { audioSystem?.onError(); break; }
      const tierUpgradeCost = getWeaponTierUpgradeCost(weaponDef.cost, currentTier);
      if (!devMode) {
        const balance = getMotes(state.game.resources, weaponDef.costTierId);
        if (balance < tierUpgradeCost) { audioSystem?.onError(); break; }
        spendMotes(state.game.resources, weaponDef.costTierId, tierUpgradeCost);
      }
      state.game.rpg.weaponTiersByWeaponId.set(action.weaponId, currentTier + 1);
      audioSystem?.onBuyLoomUpgrade();
      uiPanels.rpgRender.notifyEquip();
      uiPanels.rpgMenuPanel.update(state.game.rpg, state.game.resources, settings.numberFormat, devMode);
      break;
    }
    case 'purchase_rpg_upgrade': {
      const upgradeDef = RPG_UPGRADE_BY_ID.get(action.upgradeId);
      if (!upgradeDef) { audioSystem?.onError(); break; }
      const currentLevel = getRpgUpgradeLevel(state.game.rpg, action.upgradeId);
      if (currentLevel >= upgradeDef.maxLevel) break;
      if (!devMode) {
        const balance = getMotes(state.game.resources, upgradeDef.costTierId);
        if (balance < upgradeDef.costPerLevel) { audioSystem?.onError(); break; }
        spendMotes(state.game.resources, upgradeDef.costTierId, upgradeDef.costPerLevel);
      }
      state.game.rpg.rpgUpgradeLevels.set(action.upgradeId, currentLevel + 1);
      audioSystem?.onBuyLoomUpgrade();
      uiPanels.rpgRender.notifyEquip();
      uiPanels.rpgMenuPanel.update(state.game.rpg, state.game.resources, settings.numberFormat, devMode);
      break;
    }
    case 'set_respawn_wave': {
      const w = action.wave;
      if (w !== 0 && w % 10 !== 0) break;
      if (w > state.game.rpg.highestWaveReached && w !== 0) break;
      state.game.rpg.respawnWave = w;
      uiPanels.rpgMenuPanel.update(state.game.rpg, state.game.resources, settings.numberFormat, devMode);
      break;
    }
    case 'dev_jump_wave': {
      if (!devMode) break;
      const wv = action.wave;
      if (wv < 1 || (wv % 10 !== 0 && wv !== 1)) break;
      uiPanels.rpgRender.devJumpToWave(wv);
      uiPanels.rpgMenuPanel.update(state.game.rpg, state.game.resources, settings.numberFormat, devMode);
      break;
    }
    case 'respawn_now':
      uiPanels.rpgRender.respawnNow();
      uiPanels.rpgMenuPanel.setVisible(false);
      break;
    case 'start_boss_fight': {
      const { bossId } = action;
      if (bossId < 1 || bossId > 10) { audioSystem?.onError(); break; }
      if (!isBossUnlocked(bossId, state.game.rpg.highestWaveReached) && !devMode) {
        audioSystem?.onError(); break;
      }
      uiPanels.rpgMenuPanel.setVisible(false);
      uiPanels.rpgRender.startBossFight(bossId);
      break;
    }
    case 'set_boss_speed': {
      const { pct } = action;
      if (pct < MIN_BOSS_SPEED_PCT || pct > MAX_BOSS_SPEED_PCT || pct % BOSS_SPEED_STEP !== 0) {
        audioSystem?.onError(); break;
      }
      state.game.rpg.bossSpeedPct = pct;
      uiPanels.rpgMenuPanel.update(state.game.rpg, state.game.resources, settings.numberFormat, devMode);
      break;
    }
    case 'set_active_tab':
      // Only 'rpg' tab exists; no-op.
      break;
    case 'save_game':
    case 'reset_game':
      // Handled directly in game-app.ts before this function is reached.
      break;
  }
}
