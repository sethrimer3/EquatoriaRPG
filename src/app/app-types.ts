/**
 * app-types.ts — Shared type definitions for the app orchestrator.
 */

import type { GameState } from '../sim';
import type { ForgeCrunchState } from '../sim/forge';
import type { GeneratorState } from '../sim/particles';
import type { ParticleDragState } from '../input/particle-drag';
import type { RpgRender } from '../render/rpg/rpg-render';
import type { RpgMenuPanel } from '../ui/panels/rpg-menu-panel';

/** Mutable application-level state. */
export interface AppState {
  game: GameState;
  tapFlashAlpha: number;
  animPulse: number;
  /** Retained for particle-system API compatibility. */
  forge: ForgeCrunchState;
  generatorState: GeneratorState;
  particleDrag: ParticleDragState;
  lastTapCanvasX: number;
  lastTapCanvasY: number;
  lastTapTimeMs: number;
}

/** Configuration object grouping all UI panels. */
export interface UIPanels {
  /** The hidden background canvas container (particles run here). */
  mainCanvasContainer: HTMLElement;
  /** The RPG render system. */
  rpgRender: RpgRender;
  /** Container that wraps the RPG canvas — always visible. */
  rpgContainer: HTMLElement;
  /** Tabbed RPG menu (Menu / Weapons / Upgrades / Settings). */
  rpgMenuPanel: RpgMenuPanel;
}
