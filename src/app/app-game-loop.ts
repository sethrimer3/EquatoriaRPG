/**
 * app-game-loop.ts — Game loop.
 */

import { simTick } from '../sim';
import { clearCanvas, drawBackground, type ParticleSystem } from '../render';
import type { CanvasContext } from '../render/canvas';
import type { BackgroundAnimation, VermiculateEffect, SubstrateEffect } from '../render/background';
import type { SettingsState } from '../settings';
import { saveGame } from '../settings';
import { AUTO_SAVE_INTERVAL_MS } from '../data/balance';
import { TIER_BY_ID } from '../data/tiers';
import type { TierId } from '../data/tiers';
import type { AppState, UIPanels } from './app-types';

// ─── Game loop context ──────────────────────────────────────────

export interface GameLoopContext {
  appState: AppState;
  cc: CanvasContext;
  particles: ParticleSystem;
  settings: SettingsState;
  uiPanels: UIPanels;
  bgAnimation: BackgroundAnimation;
  vermiculateEffect: VermiculateEffect;
  substrateEffect: SubstrateEffect;
  lastFrameMs: { value: number };
}

// ─── Game loop ──────────────────────────────────────────────────

export function createGameLoop(ctx: GameLoopContext): (nowMs: number) => void {
  function gameLoop(nowMs: number): void {
    const deltaMs = Math.min(nowMs - ctx.lastFrameMs.value, 200);
    ctx.lastFrameMs.value = nowMs;

    simTick(ctx.appState.game, deltaMs);

    // Auto-save
    if (nowMs - ctx.appState.game.lastSaveMs > AUTO_SAVE_INTERVAL_MS) {
      ctx.appState.game.lastSaveMs = nowMs;
      saveGame(ctx.appState.game);
    }

    // RPG render (always active)
    const autoMove = ctx.uiPanels.rpgMenuPanel.isAutoMoveEnabled;
    ctx.uiPanels.rpgRender.setLowGraphicsMode(ctx.settings.graphicsQuality === 'low');
    ctx.uiPanels.rpgRender.setEnemyIndicatorStyle(ctx.settings.rpgEnemyIndicatorStyle);
    ctx.uiPanels.rpgRender.setNumberFormat(ctx.settings.numberFormat);
    ctx.uiPanels.rpgRender.setDevMode(ctx.settings.isDevMode);
    ctx.uiPanels.rpgRender.update(deltaMs, autoMove);

    // Background particle simulation — keeps motes moving and alivening active
    const alivenedTierIndices = ctx.particles.alivenedTierIndices;
    alivenedTierIndices.clear();
    for (const tierId of ctx.appState.game.aliven.alivenedTierIds) {
      const tier = TIER_BY_ID.get(tierId as TierId);
      if (tier) alivenedTierIndices.add(tier.unlockOrder);
    }
    ctx.particles.interactionMatrix = ctx.appState.game.aliven.interactionMatrix;

    const isLowGraphics = ctx.settings.graphicsQuality === 'low';
    ctx.particles.update(
      deltaMs,
      nowMs,
      [], // no generators (idle system removed)
      ctx.cc.widthPx / 2,
      ctx.cc.heightPx / 2,
      ctx.cc.widthPx,
      ctx.cc.heightPx,
      ctx.appState.forge,
      { enableGlow: !isLowGraphics, enableTrails: !isLowGraphics },
      false,
    );

    // Background visual (particle canvas is hidden; draw anyway so it stays ready)
    ctx.bgAnimation.update(deltaMs);
    clearCanvas(ctx.cc);
    drawBackground(ctx.cc, '#000000');
    if (ctx.settings.backgroundStyle === 'vermiculate') {
      ctx.vermiculateEffect.update(nowMs, ctx.cc.widthPx, ctx.cc.heightPx);
      ctx.vermiculateEffect.draw(ctx.cc.ctx);
    } else if (ctx.settings.backgroundStyle === 'substrate') {
      ctx.substrateEffect.update(nowMs, ctx.cc.widthPx, ctx.cc.heightPx);
      ctx.substrateEffect.draw(ctx.cc.ctx);
    }
    ctx.particles.draw(
      ctx.cc,
      { enableGlow: !isLowGraphics, enableTrails: !isLowGraphics },
      ctx.appState.particleDrag,
      ctx.cc.widthPx,
      ctx.cc.heightPx,
      nowMs,
    );

    // Periodically refresh the RPG menu panel so resources stay current
    if (Math.floor(nowMs / 100) !== Math.floor((nowMs - deltaMs) / 100)) {
      ctx.uiPanels.rpgMenuPanel.update(
        ctx.appState.game.rpg,
        ctx.appState.game.resources,
        ctx.settings.numberFormat,
        ctx.settings.isDevMode,
      );
    }

    requestAnimationFrame(gameLoop);
  }

  return gameLoop;
}
