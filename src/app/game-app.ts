/**
 * game-app.ts — Application entry point and bootstrap.
 */

import { createGameState } from '../sim';
import type { TierId } from '../data/tiers';
import {
  createGameCanvas,
  resizeCanvas,
  ParticleSystem,
} from '../render';
import {
  createBackgroundAnimation,
  createVermiculateEffect,
  createSubstrateEffect,
} from '../render/background';
import { setupInputListeners, type GameAction } from '../input';
import {
  createParticleDragState,
  handleParticleDragDown,
  handleParticleDragMove,
  handleParticleDragUp,
} from '../input/particle-drag';
import { createSettingsPanel } from '../ui/panels';
import { createLoadingScreen } from '../ui/loading';
import {
  loadSettings,
  saveGame,
  loadGame,
  deleteSave,
  saveSettings,
} from '../settings';
import { createForgeCrunchState } from '../sim/forge';
import { createGeneratorState } from '../sim/particles';
import { createAudioSystem } from '../audio';
import { createRpgRender } from '../render/rpg/rpg-render';
import { createRpgMenuPanel } from '../ui/panels/rpg-menu-panel';
import { addMotes } from '../sim/resources/resource-state';
import { createMainMenu } from '../ui/main-menu';

import type { AppState, UIPanels } from './app-types';
import { handleAction as handleActionImpl } from './app-actions';
import { createGameLoop } from './app-game-loop';

// ─── Bootstrap ──────────────────────────────────────────────────

export async function startApp(): Promise<void> {
  const root = document.getElementById('app')!;
  root.innerHTML = '';

  // ── Loading screen ──
  const loadingScreen = await createLoadingScreen();
  root.appendChild(loadingScreen.element);

  // ── Initialize game state ──
  const savedGame = loadGame();
  const game = savedGame ?? createGameState();
  const settings = loadSettings();

  // ── Preload fonts ──
  try {
    await document.fonts.load("bold 12px 'Poiret One'");
  } catch {
    // non-critical
  }
  try {
    await document.fonts.load("bold 14px 'Pixelify Sans'");
  } catch {
    // non-critical
  }

  const forge = createForgeCrunchState();
  const generatorState = createGeneratorState();

  // ── Audio system ──
  const audioSystem = createAudioSystem(settings.musicVolume, settings.sfxVolume);

  const appState: AppState = {
    game,
    tapFlashAlpha: 0,
    animPulse: 0,
    forge,
    generatorState,
    particleDrag: createParticleDragState(),
    lastTapCanvasX: 0,
    lastTapCanvasY: 0,
    lastTapTimeMs: 0,
  };

  // ── Background effects ──
  const bgAnimation = createBackgroundAnimation();
  root.appendChild(bgAnimation.canvas);

  const vermiculateEffect = createVermiculateEffect();
  const substrateEffect = createSubstrateEffect({
    quality: settings.graphicsQuality === 'low' ? 'low' : 'high',
  });

  // ── Canvas container (hidden — particle physics run in background) ──
  const canvasContainer = document.createElement('div');
  canvasContainer.id = 'canvas-container';
  canvasContainer.style.display = 'none';
  root.appendChild(canvasContainer);

  const cc = createGameCanvas(canvasContainer);

  // ── RPG container (full screen, hidden until main menu completes) ──
  const rpgContainer = document.createElement('div');
  rpgContainer.id = 'rpg-container';
  rpgContainer.style.display = 'none';   // revealed by main menu onStartGame
  root.appendChild(rpgContainer);

  // ── Particle system ──
  const particles = new ParticleSystem();

  // ── Focus-aware audio pause ──
  let _isWindowFocused = document.visibilityState === 'visible';

  function applyFocusedAudio(): void {
    audioSystem.setFocused(!settings.isMusicOnlyWhenFocused || _isWindowFocused);
  }

  document.addEventListener('visibilitychange', () => {
    _isWindowFocused = document.visibilityState === 'visible';
    applyFocusedAudio();
    if (document.visibilityState === 'hidden') {
      saveGame(game);
    }
  });

  window.addEventListener('blur', () => {
    _isWindowFocused = false;
    applyFocusedAudio();
  });

  window.addEventListener('focus', () => {
    _isWindowFocused = true;
    applyFocusedAudio();
  });

  // ── RPG render ──
  const rpgRender = createRpgRender(rpgContainer, appState.game.rpg, {
    onLuckyMoteCollected: (tierId: TierId, bonusPct: number) => {
      const current = appState.game.resources.moteTotals.get(tierId) ?? 0;
      const bonus = Math.max(1, current * bonusPct / 100);
      addMotes(appState.game.resources, tierId, bonus);
    },
    onError: () => { audioSystem.onError(); },
  });
  rpgRender.setNumberFormat(settings.numberFormat);
  root.appendChild(rpgRender.statsPanel);

  // ── Action dispatch (declared early so closures below can safely reference it) ──
  // eslint-disable-next-line prefer-const
  let dispatch: (action: GameAction) => void = () => { /* assigned below */ };

  // ── Settings panel (created before rpgMenuPanel so it can be passed in) ──
  const settingsPanel = createSettingsPanel(settings, (action: GameAction) => {
    dispatch(action);
  }, audioSystem, applyFocusedAudio);

  // ── Helper: apply the RPG bar position setting ──
  function applyRpgBarPosition(atTop: boolean): void {
    rpgRender.statsPanel.classList.toggle('rpg-bar-at-top', atTop);
    rpgContainer.classList.toggle('rpg-bar-at-top', atTop);
    rpgMenuPanel.element.classList.toggle('rpg-bar-at-top', atTop);
  }

  // ── RPG menu panel (with Settings tab) ──
  const rpgMenuPanel = createRpgMenuPanel(
    (action: GameAction) => { dispatch(action); },
    (atTop) => {
      settings.rpgBarAtTop = atTop;
      saveSettings(settings);
      applyRpgBarPosition(atTop);
      rpgMenuPanel.setRpgBarAtTop(atTop);
    },
    settingsPanel.element,
  );
  rpgMenuPanel.element.style.display = 'none';
  root.appendChild(rpgMenuPanel.element);

  applyRpgBarPosition(settings.rpgBarAtTop);
  rpgMenuPanel.setRpgBarAtTop(settings.rpgBarAtTop);

  // ── Menu toggle button ──
  const menuToggleBtn = document.createElement('button');
  menuToggleBtn.className = 'rpg-menu-btn';
  menuToggleBtn.textContent = '⚔ Menu';
  menuToggleBtn.setAttribute('aria-label', 'Open RPG menu');
  menuToggleBtn.addEventListener('click', () => {
    const nowVisible = !rpgMenuPanel.isVisible;
    rpgMenuPanel.setVisible(nowVisible);
    if (nowVisible) {
      rpgMenuPanel.update(appState.game.rpg, appState.game.resources, settings.numberFormat, settings.isDevMode);
    }
  });
  rpgRender.menuButtonContainer.appendChild(menuToggleBtn);

  const uiPanels: UIPanels = {
    mainCanvasContainer: canvasContainer,
    rpgRender,
    rpgContainer,
    rpgMenuPanel,
  };

  // RPG is activated after the main menu transition completes (see below).
  // Do NOT call rpgRender.setActive(true) / resize() here.

  // ── Action dispatch ──
  dispatch = (action: GameAction): void => {
    audioSystem.resumeContext().catch(() => { /* silently ignore */ });

    if (action.kind === 'save_game') {
      saveGame(appState.game);
      return;
    }
    if (action.kind === 'reset_game') {
      deleteSave();
      particles.reset();
      Object.assign(appState, {
        game: createGameState(),
        tapFlashAlpha: 0,
      });
      rpgRender.setActive(true);
      return;
    }
    handleActionImpl(appState, action, particles, settings, uiPanels, audioSystem);
  };

  // ── Input listeners on the RPG container ──
  setupInputListeners(rpgContainer, dispatch);

  const getCanvasCoords = (e: PointerEvent): { x: number; y: number } => {
    const rect = cc.canvas.getBoundingClientRect();
    const scaleX = cc.widthPx / rect.width;
    const scaleY = cc.heightPx / rect.height;
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    };
  };

  // Particle drag on the (hidden) background canvas — preserved for if/when
  // the canvas is un-hidden so particles remain interactive.
  cc.canvas.addEventListener('pointerdown', (e: PointerEvent) => {
    cc.canvas.setPointerCapture(e.pointerId);
    audioSystem.resumeContext().catch(() => { /* silently ignore */ });
    const pos = getCanvasCoords(e);
    handleParticleDragDown(appState.particleDrag, pos.x, pos.y, e.timeStamp, particles.particles, cc.widthPx, cc.heightPx);
  });
  cc.canvas.addEventListener('pointermove', (e: PointerEvent) => {
    const pos = getCanvasCoords(e);
    if (!appState.particleDrag.isDown) return;
    e.preventDefault();
    handleParticleDragMove(appState.particleDrag, pos.x, pos.y, e.timeStamp, particles.particles);
  }, { passive: false });
  cc.canvas.addEventListener('pointerup', (e: PointerEvent) => {
    const pos = getCanvasCoords(e);
    handleParticleDragUp(appState.particleDrag, pos.x, pos.y, e.timeStamp, particles.particles);
  });
  cc.canvas.addEventListener('pointercancel', (e: PointerEvent) => {
    const pos = getCanvasCoords(e);
    handleParticleDragUp(appState.particleDrag, pos.x, pos.y, e.timeStamp, particles.particles);
  });

  // ── Resize handler ──
  const onResize = (): void => {
    resizeCanvas(cc, canvasContainer);
    const w = canvasContainer.clientWidth;
    const h = canvasContainer.clientHeight;
    bgAnimation.resize(w, h);
    vermiculateEffect.reset();
    substrateEffect.reset();
    rpgRender.resize(rpgContainer);
  };
  window.addEventListener('resize', onResize);
  bgAnimation.resize(canvasContainer.clientWidth, canvasContainer.clientHeight);

  // ── Game loop (created here, started after the main menu completes) ──
  const lastFrameMs = { value: performance.now() };
  const gameLoop = createGameLoop({
    appState,
    cc,
    particles,
    settings,
    uiPanels,
    bgAnimation,
    vermiculateEffect,
    substrateEffect,
    lastFrameMs,
  });

  // ── Fade out loading screen ──
  await loadingScreen.fadeOut();

  // ── Lightweight background-animation loop (runs while main menu is shown) ──
  // Keeps the background canvas alive and animated so the menu has a living backdrop.
  let bgAnimRafId = 0;
  let bgAnimLastMs = performance.now();
  function bgAnimLoop(nowMs: number): void {
    const dt = Math.min(nowMs - bgAnimLastMs, 200);
    bgAnimLastMs = nowMs;
    bgAnimation.update(dt);
    bgAnimRafId = requestAnimationFrame(bgAnimLoop);
  }
  bgAnimRafId = requestAnimationFrame(bgAnimLoop);

  // ── Main menu ──
  // Shown before gameplay. When the player connects the wire to "Start Game",
  // onStartGame() is called, the menu flies off, the RPG elements are revealed,
  // and the full game loop begins.
  const mainMenu = createMainMenu(() => {
    cancelAnimationFrame(bgAnimRafId);
    // The main menu component self-cleans (ResizeObserver, wires, RAF) at the end
    // of the start-game fly-up animation before calling this callback.
    // All that remains is to reveal the RPG gameplay elements and start the game loop.

    // Reveal the RPG gameplay elements and start the game loop.
    rpgContainer.style.display = '';
    rpgRender.statsPanel.style.display = '';   // clear the inline 'none' — CSS 'flex' takes over
    rpgRender.setActive(true);
    rpgRender.resize(rpgContainer);

    lastFrameMs.value = performance.now();
    requestAnimationFrame(gameLoop);
  });
  root.appendChild(mainMenu.element);
}
