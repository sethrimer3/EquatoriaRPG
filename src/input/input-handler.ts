/** Actions that can be dispatched from input. */
export type GameAction =
  | { kind: 'tap'; xScreen: number; yScreen: number }
  | { kind: 'aliven_mote'; tierId: string }
  | { kind: 'set_active_tab'; tabId: TabId }
  | { kind: 'save_game' }
  | { kind: 'reset_game' }
  | { kind: 'set_interaction_matrix_cell'; row: number; col: number; value: number }
  | { kind: 'reset_interaction_matrix' }
  | { kind: 'purchase_weapon'; weaponId: string }
  | { kind: 'equip_weapon'; weaponId: string }
  | { kind: 'equip_weapon_to_slot'; weaponId: string; slotIndex: number }
  | { kind: 'unequip_weapon'; weaponId: string }
  | { kind: 'upgrade_weapon_tier'; weaponId: string }
  | { kind: 'purchase_rpg_upgrade'; upgradeId: string }
  | { kind: 'set_respawn_wave'; wave: number }
  | { kind: 'dev_jump_wave'; wave: number }
  | { kind: 'respawn_now' }
  | { kind: 'start_boss_fight'; bossId: number }
  | { kind: 'set_boss_speed'; pct: number };

export type TabId = 'rpg';

export type ActionHandler = (action: GameAction) => void;

/** Maximum ms between two taps to qualify as a double-tap. */
export const DOUBLE_TAP_MAX_MS = 350;
/** Maximum canvas-space distance (px) between two taps to qualify as a double-tap. */
export const DOUBLE_TAP_MAX_PX = 40;

/**
 * Sets up touch and mouse event listeners on the game container.
 * Translates raw input into GameActions.
 */
export function setupInputListeners(
  tapTarget: HTMLElement,
  dispatch: ActionHandler,
): () => void {
  const onPointerDown = (e: PointerEvent) => {
    e.preventDefault();
    dispatch({ kind: 'tap', xScreen: e.clientX, yScreen: e.clientY });
  };

  tapTarget.addEventListener('pointerdown', onPointerDown, { passive: false });

  return () => {
    tapTarget.removeEventListener('pointerdown', onPointerDown);
  };
}
