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
  saveWorldMapProgression,
  loadWorldMapProgression,
} from '../settings';
import { createForgeCrunchState } from '../sim/forge';
import { createGeneratorState } from '../sim/particles';
import { createAudioSystem } from '../audio';
import { createRpgRender } from '../render/rpg/rpg-render';
import { createRpgMenuPanel } from '../ui/panels/rpg-menu-panel';
import { addMotes } from '../sim/resources/resource-state';
import { createMainMenu } from '../ui/main-menu';
import { createWorldMapScreen } from '../ui/world-map/WorldMapScreen';
import {
  createWorldMapProgressionState,
  registerLevelLauncher,
  markLevelComplete,
  getWorldUnlockState,
} from '../systems/worldMapProgression';
import { createLevelScreen } from '../ui/level-screen/LevelScreen';
import { WORLD_LEVEL_PLANS, WORLD_COLOR_MAP } from '../data/worldLevelPlans';
import type { WorldId, WorldMapProgressionState } from '../types/worldMapTypes';
import { WORLD_MAP_DATA } from '../data/worldMapData';

import type { AppState, UIPanels } from './app-types';
import { handleAction as handleActionImpl } from './app-actions';
import { createGameLoop } from './app-game-loop';

// ─── Utilities ───────────────────────────────────────────────────

/**
 * Returns the list of worlds that are now unlocked (not 'locked') but were
 * locked before the given level was completed.
 *
 * @param prevUnlocked Set of WorldIds that were already unlocked before the completion.
 * @param state        The updated WorldMapProgressionState after marking the level complete.
 */
function detectNewlyUnlockedWorlds(
  prevUnlocked: ReadonlySet<WorldId>,
  state: WorldMapProgressionState,
): WorldId[] {
  return WORLD_MAP_DATA
    .filter(w => !prevUnlocked.has(w.id) && getWorldUnlockState(state, w.id) !== 'locked')
    .map(w => w.id);
}

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

  // ── World map progression — loaded from storage, defaults to fresh state ──
  // Declared here (early) so it's available to both navigation helpers and the
  // visibility-change save handler registered below.
  const savedWorldMap = loadWorldMapProgression();
  const worldMapProgressionState: WorldMapProgressionState =
    savedWorldMap ?? createWorldMapProgressionState(settings.isDevMode);

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

  // ── Mobile charge button ──
  // Overlays the RPG arena in the bottom-right corner (opposite the joystick).
  // Fires a charge-shot on pointerdown; pointerdone fires when released.
  // The button synthesises keyboard charge events so the existing charge-attack
  // logic in rpg-render.ts handles both desktop (Space/F) and mobile identically.
  const mobileChargeBtn = document.createElement('button');
  mobileChargeBtn.id = 'mobile-charge-btn';
  mobileChargeBtn.setAttribute('aria-label', 'Charge shot');
  mobileChargeBtn.textContent = '⚡';
  mobileChargeBtn.style.display = 'none'; // hidden until arena is shown
  // Wire it to synthetic keyboard events that rpg-input.ts handles.
  mobileChargeBtn.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    document.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyF', bubbles: true }));
  });
  mobileChargeBtn.addEventListener('pointerup', (e) => {
    e.preventDefault();
    document.dispatchEvent(new KeyboardEvent('keyup', { code: 'KeyF', bubbles: true }));
  });
  mobileChargeBtn.addEventListener('pointercancel', () => {
    document.dispatchEvent(new KeyboardEvent('keyup', { code: 'KeyF', bubbles: true }));
  });
  root.appendChild(mobileChargeBtn);

  // ── Level-complete overlay: "Return to Map" CTA ──
  // Shown after the level-complete banner fires; hidden when returning to map.
  const levelCompleteOverlay = document.createElement('div');
  levelCompleteOverlay.className = 'lvl-complete-overlay';
  levelCompleteOverlay.style.display = 'none';
  const returnToMapBtn = document.createElement('button');
  returnToMapBtn.className = 'lvl-complete-overlay__btn';
  returnToMapBtn.textContent = '🗺 Return to Map';
  returnToMapBtn.setAttribute('aria-label', 'Return to world map');
  levelCompleteOverlay.appendChild(returnToMapBtn);
  // Append after rpgContainer so it overlays it (same stacking context)
  root.appendChild(levelCompleteOverlay);

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
      saveWorldMapProgression(worldMapProgressionState);
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
    onError:         () => { audioSystem.onError(); },
    onChargeReady:   () => { audioSystem.onChargeReady(); },
    onChargeRelease: () => { audioSystem.onChargeRelease(); },
    onLevelComplete: () => {
      // Snapshot which worlds are unlocked BEFORE marking the level complete.
      const prevUnlocked = new Set<WorldId>(
        WORLD_MAP_DATA
          .filter(w => getWorldUnlockState(worldMapProgressionState, w.id) !== 'locked')
          .map(w => w.id),
      );

      // Mark the active level complete in the world-map progression.
      if (activeLevelWorldId && activeLevelId) {
        markLevelComplete(worldMapProgressionState, activeLevelWorldId as WorldId, activeLevelId);
      }
      // Persist the updated progression so it survives a page reload.
      saveWorldMapProgression(worldMapProgressionState);
      console.info(
        `[Campaign] Level complete — world="${activeLevelWorldId}" level="${activeLevelId}". Progression saved.`,
      );

      // Queue a pulse animation for any worlds newly unlocked by this completion.
      for (const wId of detectNewlyUnlockedWorlds(prevUnlocked, worldMapProgressionState)) {
        worldMapScreen.scheduleNewWorldHighlight(wId);
      }

      // Show the "Return to Map" CTA button over the arena.
      levelCompleteOverlay.style.display = '';
    },
  });
  rpgRender.setNumberFormat(settings.numberFormat);
  root.appendChild(rpgRender.statsPanel);

  // ── Action dispatch (declared early so closures below can safely reference it) ──
  // eslint-disable-next-line prefer-const
  let dispatch: (action: GameAction) => void = () => { /* assigned below */ };

  // ── Settings panel (created before rpgMenuPanel so it can be passed in) ──
  const settingsPanel = createSettingsPanel(settings, (action: GameAction) => {
    dispatch(action);
  }, audioSystem, applyFocusedAudio, {
    onWorldMapParticleQuality: (q) => { worldMapScreen?.setParticleQuality(q); },
  });

  // ── Forward-declared references — assigned later; closures capture the binding. ──
  // All navigation helpers below are CALLED only after every object is created,
  // so these forward refs will always be properly assigned at call time.
  // eslint-disable-next-line prefer-const
  let worldMapScreen: ReturnType<typeof createWorldMapScreen> = null!;
  // eslint-disable-next-line prefer-const
  let gameLoop: ReturnType<typeof createGameLoop> = null!;

  // ── RPG navigation helpers ────────────────────────────────────────

  function showWorldMap(): void {
    gameLoop.stop();
    rpgContainer.style.display = 'none';
    rpgRender.statsPanel.style.display = 'none';
    rpgMenuPanel.setVisible(false);
    // Hide the post-completion CTA and mobile charge button whenever we leave the arena.
    levelCompleteOverlay.style.display = 'none';
    mobileChargeBtn.style.display = 'none';
    saveWorldMapProgression(worldMapProgressionState);
    // Refresh the map canvas/detail panel so any progression changes
    // made during the RPG session are reflected immediately.
    worldMapScreen.refresh(worldMapProgressionState);
    worldMapScreen.show();
    // Update the history state so the browser back button returns to the map
    // (not the RPG arena) without a page reload.
    history.replaceState({ screen: 'worldmap' }, '', location.href);
  }

  function goToMainMenu(): void {
    gameLoop.stop();
    worldMapScreen.hide();
    // Save both game state and world map progression, then reload.
    saveGame(appState.game);
    saveWorldMapProgression(worldMapProgressionState);
    window.location.reload();
  }

  // ── Back-button / swipe-back navigation ──────────────────────────
  // When the RPG level starts we push a { screen: 'arena' } history entry on
  // top of whatever was already there.  When the user presses the system back
  // gesture, the browser pops the 'arena' entry and fires popstate with the
  // underlying state (which is { screen: 'worldmap' }).  We intercept that and
  // call showWorldMap() instead of letting the browser navigate away.
  window.addEventListener('popstate', (e: PopStateEvent) => {
    const screen = (e.state as { screen?: string } | null)?.screen;
    if (screen === 'worldmap') {
      // User pressed back while in the arena — return to world map.
      showWorldMap();
    }
    // Other states (e.g. no state / pre-app entries) are left to browser default.
  });

  // Wire the Return-to-Map CTA button (showWorldMap must be defined first).
  returnToMapBtn.addEventListener('click', () => { showWorldMap(); });

  // ── Helper: apply the RPG bar position setting ──
  function applyRpgBarPosition(atTop: boolean): void {
    rpgRender.statsPanel.classList.toggle('rpg-bar-at-top', atTop);
    rpgContainer.classList.toggle('rpg-bar-at-top', atTop);
    rpgMenuPanel.element.classList.toggle('rpg-bar-at-top', atTop);
  }

  // ── RPG menu panel — created once, with nav callbacks via closures ──
  const rpgMenuPanel = createRpgMenuPanel(
    (action: GameAction) => { dispatch(action); },
    (atTop) => {
      settings.rpgBarAtTop = atTop;
      saveSettings(settings);
      applyRpgBarPosition(atTop);
      rpgMenuPanel.setRpgBarAtTop(atTop);
    },
    settingsPanel.element,
    { onBackToWorldMap: showWorldMap, onBackToMainMenu: goToMainMenu },
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

  // ── World map progression + screen ──
  // worldMapProgressionState was loaded from storage (or freshly created) above.
  worldMapScreen = createWorldMapScreen(
    () => { worldMapScreen.hide(); },
    worldMapProgressionState,
    goToMainMenu,
    // Persist auto-reduced particle quality so low-end devices remember the
    // reduced setting across sessions without requiring a manual settings change.
    (quality) => {
      settings.worldMapParticleQuality = quality;
      saveSettings(settings);
    },
  );
  // Apply persisted particle quality.
  worldMapScreen.setParticleQuality(settings.worldMapParticleQuality ?? 'full');
  root.appendChild(worldMapScreen.element);

  // ── Active level context (set when the player launches a level) ──
  // This state lets the game loop and RPG arena know which level/world is active.
  let activeLevelWorldId = '';
  let activeLevelId = '';

  // ── Level screen (opened by startWorldLevel via registerLevelLauncher) ──
  const levelScreen = createLevelScreen(
    // onClose: go back to world map
    () => {
      levelScreen.hide();
      worldMapScreen.show();
    },
    // onPlay: transition from level preview into the RPG arena
    (levelDef) => {
      levelScreen.hide();
      // Hide any lingering level-complete CTA from a previous run.
      levelCompleteOverlay.style.display = 'none';
      // Show the RPG arena containers
      rpgContainer.style.display = '';
      rpgRender.statsPanel.style.display = '';
      // Show mobile charge button when arena is active.
      mobileChargeBtn.style.display = '';
      // Activate and resize the RPG renderer
      rpgRender.setActive(true);
      rpgRender.resize(rpgContainer);
      // Set wave target based on level definition.
      rpgRender.setLevelWaveTarget(levelDef.waveCount ?? (levelDef.type === 'boss' ? 5 : 3));
      // Apply per-world enemy bias so each level has a distinct flavour.
      rpgRender.setWaveEnemyBias(levelDef.waveEnemyBias ?? {});
      // Start the game loop
      gameLoop.start();
      // Push an 'arena' history entry so the system back gesture navigates
      // to the world map instead of leaving the app.
      history.pushState({ screen: 'arena' }, '', location.href);
      // Confirm active level context (set by registerLevelLauncher above, but
      // levelDef.levelId is the canonical source in the onPlay path).
      activeLevelId = levelDef.levelId ?? activeLevelId;
      console.info(`[Campaign] Starting level "${activeLevelId}" in world "${activeLevelWorldId}"`);
    },
  );
  root.appendChild(levelScreen.element);

  registerLevelLauncher((worldId, levelId) => {
    const levelDef = WORLD_LEVEL_PLANS.get(levelId);
    const worldColor = WORLD_COLOR_MAP.get(worldId) ?? WORLD_COLOR_MAP.get('origin_nexus') ?? '#80c8ff';
    // Track which world/level the player is about to enter
    activeLevelWorldId = worldId;
    activeLevelId = levelId;
    if (levelDef) {
      worldMapScreen.hide();
      levelScreen.show(levelDef, worldColor);
    } else {
      console.warn(`[LevelLauncher] No layout found for levelId="${levelId}" in world="${worldId}"`);
    }
  });

  // ── Map button (shown next to ⚔ Menu button in RPG view) ──
  const mapBtn = document.createElement('button');
  mapBtn.className = 'rpg-menu-btn';
  mapBtn.textContent = '🗺 Map';
  mapBtn.setAttribute('aria-label', 'Open world map');
  mapBtn.addEventListener('click', () => { showWorldMap(); });
  rpgRender.menuButtonContainer.appendChild(mapBtn);

  const uiPanels: UIPanels = {
    mainCanvasContainer: canvasContainer,
    rpgRender,
    rpgContainer,
    rpgMenuPanel,
  };

  // RPG is activated when the player launches a level from the World Map.
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

  // ── Game loop (started when the player enters from the world map) ──
  const lastFrameMs = { value: performance.now() };
  gameLoop = createGameLoop({
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
  // onStartGame() is called, the menu flies off, and the World Map is shown.
  // The RPG game only starts when the player launches a level from the World Map.
  const mainMenu = createMainMenu(() => {
    cancelAnimationFrame(bgAnimRafId);
    // The main menu component self-cleans (ResizeObserver, wires, RAF) at the end
    // of the start-game fly-up animation before calling this callback.
    worldMapScreen.show();
  });
  root.appendChild(mainMenu.element);
}
