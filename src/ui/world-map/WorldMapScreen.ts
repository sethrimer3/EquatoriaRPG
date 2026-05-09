/**
 * WorldMapScreen.ts — Full-screen world map overlay.
 *
 * Layout:
 *   ┌────────────────────────────────────────────────────────────┐
 *   │  [← Main Menu]   🌌 The Equation Spiral      [dev mode]   │
 *   ├────────────────────────────────┬───────────────────────────┤
 *   │  Canvas: animated spiral map   │  Detail panel (DOM)       │
 *   │  with particle simulation.     │  • World name/subtitle    │
 *   │  Click a world node →          │  • Theme + reward         │
 *   │  highlights + sub-nodes.       │  • Mandatory levels list  │
 *   │                                │  • Base6 levels list      │
 *   │                                │  • [Start Level] button   │
 *   └────────────────────────────────┴───────────────────────────┘
 *
 * A continuous RAF loop drives the particle simulation when the map is visible.
 */

import type { WorldId, WorldMapProgressionState } from '../../types/worldMapTypes';
import { getWorldUnlockState } from '../../systems/worldMapProgression';
import { WORLD_MAP_DATA } from '../../data/worldMapData';
import {
  createWorldMapParticles,
  type ParticleQuality,
} from '../../render/world-map/worldMapParticles';
import { lerpColor, lighten, darken } from './world-map-color-utils';
import { renderDetailPanel as renderDetailPanelImpl, type DetailPanelCtx } from './world-map-detail-panel';

// ─── Public interface ─────────────────────────────────────────────

export interface WorldMapScreen {
  element: HTMLElement;
  show(): void;
  hide(): void;
  refresh(state: WorldMapProgressionState): void;
  /** Update particle quality (e.g. from settings change). */
  setParticleQuality(quality: ParticleQuality): void;
  /**
   * Queue a brief unlock-pulse animation on a world node.
   * Plays automatically the next time the map is shown (or immediately
   * if the map is already visible).  Safe to call before `show()`.
   */
  scheduleNewWorldHighlight(worldId: WorldId): void;
  destroy(): void;
}

// ─── Internal types ───────────────────────────────────────────────

interface WorldNode {
  worldId: WorldId;
  /** Canvas pixel position, updated on resize. */
  cx: number;
  cy: number;
  radius: number;
}

// ─── Visual constants ─────────────────────────────────────────────

const NODE_RADIUS = 18;
const BOSS_NODE_RADIUS = 22;
const NODE_PADDING = 0.08;        // fraction of canvas dimension kept as margin
/**
 * Extra hit-test radius beyond visual radius so nodes are easy to tap.
 * 22 CSS px gives a comfortable finger-sized target on mobile.
 */
const NODE_HIT_EXPAND = 22;
/**
 * Perpendicular offset factor for path quadratic curves.
 * A small value (0.12) produces a gentle arc without dramatic bending.
 */
const PATH_CURVE_FACTOR = 0.12;
/**
 * Device pixel ratio is capped at 2 to limit canvas memory usage on very
 * high-DPI displays (3x+), where the extra sharpness provides diminishing
 * returns while significantly increasing buffer size.
 */
const MAX_DPR = 2;

const COLOR_LOCKED     = '#3a3a4a';
const COLOR_UNLOCKED   = '#c8a840';
const COLOR_CURRENT    = '#80c8ff';
const COLOR_COMPLETED  = '#70e080';
const COLOR_BOSS_RING  = '#ff8888';

const COLOR_PATH_START = '#ffd764';
const COLOR_PATH_END   = '#a78bfa';

// ─── Factory ─────────────────────────────────────────────────────

export function createWorldMapScreen(
  onClose: () => void,
  initialState: WorldMapProgressionState,
  onMainMenu?: () => void,
): WorldMapScreen {
  let state = initialState;
  let selectedWorldId: WorldId | null = null;
  let nodes: WorldNode[] = [];
  /** Animation loop RAF id (drives particles + map redraws). */
  let animRafId = 0;
  let lastFrameMs = 0;
  let particleQuality: ParticleQuality = 'full';
  let particleSys = createWorldMapParticles(particleQuality);
  let isVisible = false;

  /**
   * Worlds pending an unlock-flash animation.
   * Each entry holds the worldId and the remaining display duration in ms.
   * Entries are removed when duration reaches 0.
   */
  const unlockFlashes = new Map<WorldId, number>();
  /** Total duration for the unlock-flash pulse animation (ms). */
  const UNLOCK_FLASH_DURATION_MS = 4000;

  // ── FPS auto-detection ──
  // Track a rolling window of recent frame times to compute average FPS.
  // When FPS stays below FPS_REDUCE_THRESHOLD for FPS_REDUCE_WINDOW_MS,
  // particle quality is automatically lowered.
  const FPS_REDUCE_THRESHOLD = 30;      // fps — reduce if below this
  const FPS_REDUCE_WINDOW_MS = 3000;    // ms — how long FPS must be low before reducing
  const FPS_RESTORE_THRESHOLD = 50;     // fps — restore to 'full' if consistently above this
  const FPS_RESTORE_WINDOW_MS = 5000;   // ms — how long FPS must be high before restoring
  let _fpsLowMs  = 0;   // accumulated ms below FPS_REDUCE_THRESHOLD this window
  let _fpsHighMs = 0;   // accumulated ms above FPS_RESTORE_THRESHOLD this window

  // ── Root element ──
  const element = document.createElement('div');
  element.className = 'wm-screen';
  element.setAttribute('role', 'dialog');
  element.setAttribute('aria-label', 'World Map');

  // ── Header ──
  const header = document.createElement('div');
  header.className = 'wm-header';

  const backBtn = document.createElement('button');
  backBtn.className = 'wm-back-btn';
  backBtn.textContent = onMainMenu ? '← Main Menu' : '← Back';
  backBtn.setAttribute('aria-label', onMainMenu ? 'Back to main menu' : 'Close world map');
  backBtn.addEventListener('click', () => {
    if (onMainMenu) {
      screen.hide();
      onMainMenu();
    } else {
      onClose();
    }
  });

  const titleEl = document.createElement('span');
  titleEl.className = 'wm-header-title';
  titleEl.textContent = '🌌 The Equation Spiral';

  const devBtn = document.createElement('button');
  devBtn.className = 'wm-dev-btn';
  devBtn.textContent = 'DEV';
  devBtn.setAttribute('aria-label', 'Toggle dev mode — unlock all worlds');
  devBtn.title = 'Toggle dev mode (unlock all worlds)';
  devBtn.addEventListener('click', () => {
    state = { ...state, devMode: !state.devMode };
    syncDevButton();
    drawMap();
    renderDetailPanel();
  });

  header.appendChild(backBtn);
  header.appendChild(titleEl);
  header.appendChild(devBtn);
  element.appendChild(header);

  // ── Body ──
  const body = document.createElement('div');
  body.className = 'wm-body';
  element.appendChild(body);

  // ── Canvas area ──
  const canvasArea = document.createElement('div');
  canvasArea.className = 'wm-canvas-area';
  body.appendChild(canvasArea);

  // ── Mobile hint label ──
  // Shown below the canvas on narrow viewports to help first-time mobile users.
  const mobileHint = document.createElement('div');
  mobileHint.className = 'wm-mobile-hint';
  mobileHint.textContent = 'Tap a world node to select a level';
  canvasArea.appendChild(mobileHint);

  const canvas = document.createElement('canvas');
  canvasArea.appendChild(canvas);
  const ctxRaw = canvas.getContext('2d');
  if (!ctxRaw) throw new Error('WorldMapScreen: failed to get 2D canvas context');
  const ctx = ctxRaw;

  // ── Node hover tooltip (desktop) ──
  // Positioned absolutely inside `body` so it can overflow the canvas area.
  const nodeTooltip = document.createElement('div');
  nodeTooltip.className = 'wm-node-tooltip';
  nodeTooltip.style.display = 'none';
  body.appendChild(nodeTooltip);

  // ── Detail panel ──
  const detailPanel = document.createElement('div');
  detailPanel.className = 'wm-detail-panel';
  body.appendChild(detailPanel);

  // ─── Helpers ────────────────────────────────────────────────────

  function syncDevButton(): void {
    devBtn.classList.toggle('wm-dev-btn--active', state.devMode);
    devBtn.setAttribute('aria-pressed', String(state.devMode));
  }

  /**
   * Map a normalized (0–1) world position to CSS-pixel canvas coordinates.
   *
   * IMPORTANT: always use CSS pixel dimensions (clientWidth/clientHeight), NOT
   * canvas.width/canvas.height.  canvas.width is the backing-store size
   * (CSS px × DPR).  ctx.setTransform(dpr,0,0,dpr,0,0) means every drawing
   * call expects CSS-pixel coordinates, so nodes must also live in that space.
   * Mixing backing-store dimensions with the DPR transform pushes nodes off-
   * screen by a factor of DPR on high-DPI (e.g. 2× or 3×) devices.
   */
  function normToCanvas(nx: number, ny: number): { cx: number; cy: number } {
    const w = canvasArea.clientWidth;
    const h = canvasArea.clientHeight;
    const padX = w * NODE_PADDING;
    const padY = h * NODE_PADDING;
    return {
      cx: padX + nx * (w - 2 * padX),
      cy: padY + ny * (h - 2 * padY),
    };
  }

  /** Returns true if the last mandatory level of the world is typed as a boss. */
  function hasTerminalBossLevel(mandatoryLevels: { type: string }[]): boolean {
    return mandatoryLevels[mandatoryLevels.length - 1]?.type === 'boss';
  }

  /** Rebuild the nodes array from WORLD_MAP_DATA positions. */
  function buildNodes(): void {
    nodes = WORLD_MAP_DATA.map(world => {
      const { cx, cy } = normToCanvas(world.position.x, world.position.y);
      return {
        worldId: world.id,
        cx,
        cy,
        radius: hasTerminalBossLevel(world.mandatoryLevels) ? BOSS_NODE_RADIUS : NODE_RADIUS,
      };
    });
  }

  /** Return the fill color for a world node based on its unlock state. */
  function nodeColor(worldId: WorldId): string {
    const s = getWorldUnlockState(state, worldId);
    switch (s) {
      case 'completed': return COLOR_COMPLETED;
      case 'current':   return COLOR_CURRENT;
      case 'unlocked':  return COLOR_UNLOCKED;
      default:          return COLOR_LOCKED;
    }
  }

  /** Draw the full map (called every animation frame). */
  function drawMap(): void {
    // Use CSS pixel dimensions — the ctx DPR transform means all drawing
    // coordinates are in CSS pixels.  Clearing with canvas.width/canvas.height
    // (backing-store pixels) in the transformed context would over-clear by
    // DPR², wasting fill operations (though Canvas clips it harmlessly).
    const w = canvasArea.clientWidth;
    const h = canvasArea.clientHeight;
    ctx.clearRect(0, 0, w, h);

    if (nodes.length === 0) return;

    // Use CSS pixel space (matches ctx DPR transform).
    const cxCSS = canvasArea.clientWidth / 2;
    const cyCSS = canvasArea.clientHeight / 2;

    // ── Draw particle simulation (below paths and nodes) ──
    particleSys.draw(ctx, cxCSS, cyCSS);

    // ── Draw paths between worlds (order follows the spiral) ──
    for (let i = 0; i < nodes.length - 1; i++) {
      const a = nodes[i];
      const b = nodes[i + 1];
      if (!a || !b) continue;

      const t = i / Math.max(nodes.length - 2, 1);
      const gradient = ctx.createLinearGradient(a.cx, a.cy, b.cx, b.cy);
      gradient.addColorStop(0, lerpColor(COLOR_PATH_START, COLOR_PATH_END, t));
      gradient.addColorStop(1, lerpColor(COLOR_PATH_START, COLOR_PATH_END, t + 1 / (nodes.length - 1)));

      ctx.beginPath();
      ctx.moveTo(a.cx, a.cy);
      // Simple curve through midpoint
      const mx = (a.cx + b.cx) / 2 + (b.cy - a.cy) * PATH_CURVE_FACTOR;
      const my = (a.cy + b.cy) / 2 - (b.cx - a.cx) * PATH_CURVE_FACTOR;
      ctx.quadraticCurveTo(mx, my, b.cx, b.cy);
      ctx.strokeStyle = gradient;
      ctx.lineWidth = 2.5;
      ctx.globalAlpha = 0.6;
      ctx.stroke();
      ctx.globalAlpha = 1;
    }

    // ── Draw nodes ──
    for (const node of nodes) {
      const worldData = WORLD_MAP_DATA.find(w => w.id === node.worldId);
      if (!worldData) continue;

      const color = nodeColor(node.worldId);
      const isSelected = node.worldId === selectedWorldId;
      const isBossWorld = hasTerminalBossLevel(worldData.mandatoryLevels);

      // Glow for unlocked/current/completed
      const s = getWorldUnlockState(state, node.worldId);
      if (s !== 'locked') {
        ctx.beginPath();
        ctx.arc(node.cx, node.cy, node.radius + 8, 0, Math.PI * 2);
        const glowGrad = ctx.createRadialGradient(node.cx, node.cy, node.radius, node.cx, node.cy, node.radius + 8);
        glowGrad.addColorStop(0, color + '55');
        glowGrad.addColorStop(1, 'transparent');
        ctx.fillStyle = glowGrad;
        ctx.fill();
      }

      // Boss ring
      if (isBossWorld) {
        ctx.beginPath();
        ctx.arc(node.cx, node.cy, node.radius + 4, 0, Math.PI * 2);
        ctx.strokeStyle = s === 'locked' ? '#3a2a2a' : COLOR_BOSS_RING;
        ctx.lineWidth = 1.5;
        ctx.globalAlpha = 0.6;
        ctx.stroke();
        ctx.globalAlpha = 1;
      }

      // Selection ring
      if (isSelected) {
        ctx.beginPath();
        ctx.arc(node.cx, node.cy, node.radius + 6, 0, Math.PI * 2);
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.globalAlpha = 0.9;
        ctx.stroke();
        ctx.globalAlpha = 1;
      }

      // Node fill
      ctx.beginPath();
      ctx.arc(node.cx, node.cy, node.radius, 0, Math.PI * 2);
      const radGrad = ctx.createRadialGradient(node.cx - node.radius * 0.3, node.cy - node.radius * 0.3, 2, node.cx, node.cy, node.radius);
      radGrad.addColorStop(0, lighten(color, 0.35));
      radGrad.addColorStop(1, darken(color, 0.2));
      ctx.fillStyle = radGrad;
      ctx.fill();
      ctx.strokeStyle = color;
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Chapter number in node
      ctx.fillStyle = s === 'locked' ? '#5a5a6a' : '#0a0a12';
      ctx.font = `bold ${Math.round(node.radius * 0.75)}px 'Poiret One', sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(String(worldData.chapter), node.cx, node.cy);

      // World name below node
      ctx.fillStyle = s === 'locked' ? '#4a4a5a' : color;
      ctx.font = `${Math.round(node.radius * 0.55)}px 'Poiret One', sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      // Abbreviated world name: first two words. Single-word names display as-is.
      const shortName = worldData.name.split(' ').slice(0, 2).join(' ');
      ctx.fillText(shortName, node.cx, node.cy + node.radius + 4);

      // Boss sigil
      if (isBossWorld && s !== 'locked') {
        ctx.fillStyle = COLOR_BOSS_RING;
        ctx.font = `${Math.round(node.radius * 0.55)}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'bottom';
        ctx.fillText('⬡', node.cx, node.cy - node.radius - 3);
      }

      // ── Level progress dots ────────────────────────────────────
      // Show mini dots below the world name indicating mandatory-level progress.
      // Only visible when the world is unlocked/current/completed.
      if (s !== 'locked') {
        const worldProgress = state.worlds.get(node.worldId);
        const totalLevels   = worldData.mandatoryLevels.length;
        const doneLevels    = worldProgress ? worldProgress.completedMandatoryLevelIds.size : 0;
        if (totalLevels > 0) {
          const dotRadius = 1.5;
          const dotGap    = 3.5;
          const dotRow    = node.cy + node.radius + 14; // below world name
          const totalW    = (totalLevels - 1) * dotGap;
          const startX    = node.cx - totalW / 2;
          for (let d = 0; d < totalLevels; d++) {
            const dx = startX + d * dotGap;
            const isBossLevel = worldData.mandatoryLevels[d]?.type === 'boss';
            ctx.beginPath();
            ctx.arc(dx, dotRow, isBossLevel ? dotRadius * 1.4 : dotRadius, 0, Math.PI * 2);
            if (d < doneLevels) {
              // Completed dot — bright colour matching the world
              ctx.fillStyle = color;
            } else if (d === doneLevels && s !== 'completed') {
              // Current dot — accent blue
              ctx.fillStyle = COLOR_CURRENT;
            } else {
              // Future dot — dim
              ctx.fillStyle = 'rgba(255,255,255,0.2)';
            }
            ctx.fill();
          }
        }
      }
    }

    // ── Unlock-flash rings (drawn after all nodes so they are on top) ──
    for (const [wId, remaining] of unlockFlashes) {
      const node = nodes.find(n => n.worldId === wId);
      if (!node) continue;
      // Normalised progress [0,1]: 0 = just started, 1 = almost done
      const t = 1 - remaining / UNLOCK_FLASH_DURATION_MS;
      // Oscillate with decreasing amplitude (fades out)
      const oscillations = 4;
      const pulse = Math.sin(t * oscillations * Math.PI * 2) * (1 - t);
      // Outer ring expands then contracts
      const expandR = node.radius + 14 + pulse * 10;
      const alpha = (1 - t) * 0.85;
      ctx.save();
      ctx.globalAlpha = Math.max(0, alpha);
      ctx.beginPath();
      ctx.arc(node.cx, node.cy, expandR, 0, Math.PI * 2);
      ctx.strokeStyle = '#ffe066';
      ctx.lineWidth = 3;
      ctx.shadowColor = '#ffe066';
      ctx.shadowBlur = 16;
      ctx.stroke();
      // "NEW!" label on first half of animation
      if (t < 0.5) {
        ctx.font = `bold ${Math.round(node.radius * 0.55)}px 'Poiret One', sans-serif`;
        ctx.fillStyle = '#ffe066';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        ctx.shadowBlur = 8;
        ctx.fillText('NEW!', node.cx, node.cy + node.radius + Math.round(node.radius * 0.7));
      }
      ctx.shadowBlur = 0;
      ctx.restore();
    }
  }

  // ─── Detail panel rendering ──────────────────────────────────────

  function renderDetailPanel(): void {
    const panelCtx: DetailPanelCtx = {
      detailPanelEl: detailPanel,
      selectedWorldId,
      state,
      onRefresh(): void {
        drawMap();
        renderDetailPanel();
      },
    };
    renderDetailPanelImpl(panelCtx);
  }

  // ─── Canvas interaction ──────────────────────────────────────────

  function getNodeAtPoint(px: number, py: number): WorldNode | null {
    for (const node of nodes) {
      const dx = px - node.cx;
      const dy = py - node.cy;
      if (dx * dx + dy * dy <= (node.radius + NODE_HIT_EXPAND) ** 2) return node;
    }
    return null;
  }

  /**
   * Convert a client-space pointer position to CSS-pixel canvas coordinates.
   *
   * getBoundingClientRect() already returns CSS-pixel values, so subtracting
   * rect.left/top gives the correct CSS-pixel offset — no DPR scaling needed.
   * Node positions in `nodes[]` are also in CSS pixels (see normToCanvas), so
   * hit-testing compares apples to apples.
   */
  function clientToCanvas(clientX: number, clientY: number): { px: number; py: number } {
    const rect = canvas.getBoundingClientRect();
    return {
      px: clientX - rect.left,
      py: clientY - rect.top,
    };
  }

  function onCanvasClick(e: MouseEvent | TouchEvent): void {
    let clientX: number, clientY: number;
    if (e instanceof MouseEvent) {
      clientX = e.clientX;
      clientY = e.clientY;
    } else {
      const touch = e.changedTouches[0];
      if (!touch) return;
      clientX = touch.clientX;
      clientY = touch.clientY;
    }

    const { px, py } = clientToCanvas(clientX, clientY);
    const node = getNodeAtPoint(px, py);
    if (node) {
      selectedWorldId = node.worldId;
      drawMap();
      renderDetailPanel();
    }
  }

  canvas.addEventListener('click', onCanvasClick);
  canvas.addEventListener('touchend', (e) => {
    // Only prevent default (blocking scroll) when a node was actually tapped
    const touch = e.changedTouches[0];
    if (touch) {
      const { px, py } = clientToCanvas(touch.clientX, touch.clientY);
      if (getNodeAtPoint(px, py)) {
        e.preventDefault();
      }
    }
    onCanvasClick(e);
  }, { passive: false });

  // Pointer cursor + tooltip when hovering a node
  canvas.addEventListener('mousemove', (e: MouseEvent) => {
    const { px, py } = clientToCanvas(e.clientX, e.clientY);
    const node = getNodeAtPoint(px, py);
    canvas.style.cursor = node ? 'pointer' : 'default';

    if (node) {
      const worldData = WORLD_MAP_DATA.find(w => w.id === node.worldId);
      const s = getWorldUnlockState(state, node.worldId);
      const stateLabel: Record<typeof s, string> = {
        completed: '✅ Completed',
        current:   '▶ In Progress',
        unlocked:  '🔓 Unlocked',
        locked:    '🔒 Locked',
      };
      const lines = [
        worldData ? `<strong>${worldData.name}</strong>` : node.worldId,
        worldData ? `Chapter ${worldData.chapter}` : '',
        stateLabel[s],
      ].filter(Boolean);
      nodeTooltip.innerHTML = lines.join('<br>');
      // Position the tooltip in the canvas area's coordinate space.
      const canvasRect = canvas.getBoundingClientRect();
      const bodyRect   = body.getBoundingClientRect();
      let tooltipX = e.clientX - bodyRect.left + 14;
      const tooltipY = e.clientY - bodyRect.top  - 8;
      // Clamp so the tooltip doesn't overflow beyond the canvas right edge.
      // We estimate the tooltip width conservatively (80 px) as we can't
      // measure it before rendering without forcing layout.
      const TOOLTIP_EST_WIDTH = 120;
      const canvasRight = canvasRect.right - bodyRect.left;
      if (tooltipX + TOOLTIP_EST_WIDTH > canvasRight) {
        tooltipX = Math.max(0, e.clientX - bodyRect.left - TOOLTIP_EST_WIDTH - 6);
      }
      nodeTooltip.style.left = `${tooltipX}px`;
      nodeTooltip.style.top  = `${tooltipY}px`;
      nodeTooltip.style.display = '';
    } else {
      nodeTooltip.style.display = 'none';
    }
  });

  canvas.addEventListener('mouseleave', () => {
    nodeTooltip.style.display = 'none';
    canvas.style.cursor = 'default';
  });

  // ─── Resize ─────────────────────────────────────────────────────

  let resizeRafId = 0;

  /** Maximum time delta clamped per frame to guard against tab-switch gaps. */
  const MAX_FRAME_DELTA_MS = 200;

  function resize(): void {
    const { width, height } = canvasArea.getBoundingClientRect();
    // Guard against zero-dimension layouts (e.g., hidden tabs) that would cause
    // invalid canvas state and divide-by-zero in particle radius calculations.
    if (width === 0 || height === 0) return;
    const dpr = Math.min(window.devicePixelRatio || 1, MAX_DPR);
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    // Reset the transform before applying DPR scale to avoid compounding on repeated calls.
    // setTransform(a, b, c, d, e, f): a/d = x/y scale, b/c = skew, e/f = translation.
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    buildNodes();
    // Re-initialize particles. Use CSS pixel space — the ctx DPR transform means
    // all drawing coordinates are in CSS pixels, so particles must be too.
    const cxCSS = width / 2;
    const cyCSS = height / 2;
    const maxR = Math.min(cxCSS, cyCSS) * 0.92;
    particleSys.resize(cxCSS, cyCSS, maxR);
    drawMap();
  }

  const resizeObserver = new ResizeObserver(() => {
    cancelAnimationFrame(resizeRafId);
    resizeRafId = requestAnimationFrame(resize);
  });
  resizeObserver.observe(canvasArea);

  // ─── Animation loop (runs while the map is visible) ─────────────

  function animFrame(nowMs: number): void {
    if (!isVisible) return;
    // Clamp dtMs to avoid runaway simulation after tab switches or debugger pauses.
    const dtMs = Math.min(nowMs - lastFrameMs, MAX_FRAME_DELTA_MS);
    lastFrameMs = nowMs;

    // Tick unlock-flash timers.
    for (const [wId, remaining] of unlockFlashes) {
      const next = remaining - dtMs;
      if (next <= 0) {
        unlockFlashes.delete(wId);
      } else {
        unlockFlashes.set(wId, next);
      }
    }

    // ── FPS auto-quality ──────────────────────────────────────────
    if (dtMs > 0) {
      const fps = 1000 / dtMs;
      if (fps < FPS_REDUCE_THRESHOLD) {
        _fpsLowMs += dtMs;
        _fpsHighMs = 0;
        if (_fpsLowMs >= FPS_REDUCE_WINDOW_MS && particleQuality === 'full') {
          // Auto-reduce to 'reduced'
          applyParticleQuality('reduced');
          _fpsLowMs = 0;
          console.info('[WorldMap] Auto-reduced particle quality to "reduced" (FPS < 30)');
        } else if (_fpsLowMs >= FPS_REDUCE_WINDOW_MS && particleQuality === 'reduced') {
          // Reduce further to 'low'
          applyParticleQuality('low');
          _fpsLowMs = 0;
          console.info('[WorldMap] Auto-reduced particle quality to "low" (FPS < 30)');
        }
      } else {
        _fpsLowMs = 0;
        if (fps > FPS_RESTORE_THRESHOLD && particleQuality !== 'full') {
          _fpsHighMs += dtMs;
          if (_fpsHighMs >= FPS_RESTORE_WINDOW_MS) {
            const next = particleQuality === 'low' ? 'reduced' as const : 'full' as const;
            applyParticleQuality(next);
            _fpsHighMs = 0;
            console.info(`[WorldMap] Auto-restored particle quality to "${next}" (FPS > 50)`);
          }
        } else {
          _fpsHighMs = 0;
        }
      }
    }

    // Particle positions are in CSS pixel space (matching the ctx DPR transform).
    const cxCSS = canvasArea.clientWidth / 2;
    const cyCSS = canvasArea.clientHeight / 2;
    const maxR = Math.min(cxCSS, cyCSS) * 0.92;

    particleSys.update(dtMs, cxCSS, cyCSS, maxR);
    drawMap();

    animRafId = requestAnimationFrame(animFrame);
  }

  /** Internal helper: apply a quality level without the idempotency guard. */
  function applyParticleQuality(quality: ParticleQuality): void {
    particleQuality = quality;
    particleSys = createWorldMapParticles(quality);
    if (isVisible) {
      const cxCSS = canvasArea.clientWidth / 2;
      const cyCSS = canvasArea.clientHeight / 2;
      const maxR = Math.min(cxCSS, cyCSS) * 0.92;
      particleSys.resize(cxCSS, cyCSS, maxR);
      particleSys.setActive(true);
    }
  }

  function startAnimLoop(): void {
    if (animRafId !== 0) return;
    lastFrameMs = performance.now();
    particleSys.setActive(true);
    animRafId = requestAnimationFrame(animFrame);
  }

  function stopAnimLoop(): void {
    particleSys.setActive(false);
    cancelAnimationFrame(animRafId);
    animRafId = 0;
  }

  // ─── Public API ──────────────────────────────────────────────────

  function show(): void {
    isVisible = true;
    element.classList.add('wm-screen--visible');
    syncDevButton();
    // Defer first draw to ensure layout is complete, then start anim loop
    requestAnimationFrame(() => {
      resize();
      renderDetailPanel();
      startAnimLoop();
    });
  }

  function hide(): void {
    isVisible = false;
    element.classList.remove('wm-screen--visible');
    stopAnimLoop();
  }

  function refresh(newState: WorldMapProgressionState): void {
    state = newState;
    syncDevButton();
    buildNodes();
    drawMap();
    renderDetailPanel();
  }

  function destroy(): void {
    isVisible = false;
    resizeObserver.disconnect();
    stopAnimLoop();
    cancelAnimationFrame(resizeRafId);
  }

  // Initial setup
  syncDevButton();
  renderDetailPanel();

  const screen: WorldMapScreen = {
    element,
    show,
    hide,
    refresh,
    setParticleQuality(quality: ParticleQuality): void {
      if (quality === particleQuality) return;
      applyParticleQuality(quality);
      // Reset FPS accumulators so a manual quality change isn't immediately
      // re-overridden by the auto-detection logic.
      _fpsLowMs  = 0;
      _fpsHighMs = 0;
    },
    scheduleNewWorldHighlight(worldId: WorldId): void {
      // Queue the unlock-flash animation; it plays the next time drawMap() is
      // called from the anim loop (which starts when the map is shown).
      unlockFlashes.set(worldId, UNLOCK_FLASH_DURATION_MS);
    },
    destroy,
  };
  return screen;
}


