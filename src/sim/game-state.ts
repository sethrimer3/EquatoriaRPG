import type { TierId } from '../data/tiers';
import {
  createResourceState,
  getTotalMotes,
  type ResourceState,
} from './resources';
import {
  createAlivenState,
  tryAliven,
  type AlivenState,
} from './aliven';
import {
  createRpgSimState,
  type RpgSimState,
} from './rpg';

export interface GameState {
  resources: ResourceState;
  aliven: AlivenState;
  rpg: RpgSimState;
  lastSaveMs: number;
  elapsedMs: number;
}

export function createGameState(): GameState {
  return {
    resources: createResourceState(),
    aliven: createAlivenState(),
    rpg: createRpgSimState(),
    lastSaveMs: 0,
    elapsedMs: 0,
  };
}

export interface SimTickResult {
  // reserved for future RPG tick events
}

export function simTick(state: GameState, deltaMs: number): SimTickResult {
  state.elapsedMs += deltaMs;
  return {};
}

export function getScore(state: GameState): number {
  return getTotalMotes(state.resources);
}

export function tryAlivenMote(state: GameState, tierId: TierId, bypassCost = false): boolean {
  return tryAliven(state.aliven, state.resources, tierId, bypassCost);
}
