/**
 * WorldMapScreen.ts — Full-screen world map overlay.
 *
 * Layout:
 *   ┌──────────────────────────────────────────────────────────┐
 *   │  [← Back]       🌌 The Equation Spiral      [dev mode]  │
 *   ├───────────────────────────────┬──────────────────────────┤
 *   │  Canvas: spiral path of 11    │  Detail panel (DOM)      │
 *   │  world nodes. Click a node →  │  • World name/subtitle   │
 *   │  highlights + sub-nodes.      │  • Theme + reward        │
 *   │                               │  • Mandatory levels list │
 *   │                               │  • Base6 levels list     │
 *   │                               │  • [Start Level] button  │
 *   └───────────────────────────────┴──────────────────────────┘
 *
 * Canvas rendering is intentionally simple — no per-frame animation
 * loop while idle. The map redraws on interaction or resize only.
 */

import type { WorldId, WorldMapProgressionState } from '../../types/worldMapTypes';
import {
  getWorldUnlockState,
  getLevelUnlockState,
  isBase6LevelUnlocked,
  startWorldLevel,
  startOptionalChallenge,
  markLevelComplete,
} from '../../systems/worldMapProgression';
import { WORLD_MAP_DATA } from '../../data/worldMapData';

// ─── Public interface ─────────────────────────────────────────────

export interface WorldMapScreen {
  element: HTMLElement;
  show(): void;
  hide(): void;
  refresh(state: WorldMapProgressionState): void;
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
const NODE_PADDING = 0.08; // fraction of canvas dimension kept as margin

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
): WorldMapScreen {
  let state = initialState;
  let selectedWorldId: WorldId | null = null;
  let nodes: WorldNode[] = [];
  let rafId = 0;

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
  backBtn.textContent = '← Back';
  backBtn.setAttribute('aria-label', 'Close world map');
  backBtn.addEventListener('click', () => onClose());

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

  const canvas = document.createElement('canvas');
  canvasArea.appendChild(canvas);
  const ctxRaw = canvas.getContext('2d');
  if (!ctxRaw) throw new Error('WorldMapScreen: failed to get 2D canvas context');
  const ctx = ctxRaw;

  // ── Detail panel ──
  const detailPanel = document.createElement('div');
  detailPanel.className = 'wm-detail-panel';
  body.appendChild(detailPanel);

  // ─── Helpers ────────────────────────────────────────────────────

  function syncDevButton(): void {
    devBtn.classList.toggle('wm-dev-btn--active', state.devMode);
    devBtn.setAttribute('aria-pressed', String(state.devMode));
  }

  /** Map a normalized (0–1) world position to canvas pixel coordinates. */
  function normToCanvas(nx: number, ny: number): { cx: number; cy: number } {
    const w = canvas.width;
    const h = canvas.height;
    const padX = w * NODE_PADDING;
    const padY = h * NODE_PADDING;
    return {
      cx: padX + nx * (w - 2 * padX),
      cy: padY + ny * (h - 2 * padY),
    };
  }

  /** Returns true if the last mandatory level of a world is a boss level. */
  function hasBossLevel(mandatoryLevels: { type: string }[]): boolean {
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
        radius: hasBossLevel(world.mandatoryLevels) ? BOSS_NODE_RADIUS : NODE_RADIUS,
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

  /** Draw the full map. */
  function drawMap(): void {
    const w = canvas.width;
    const h = canvas.height;
    ctx.clearRect(0, 0, w, h);

    if (nodes.length === 0) return;

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
      const mx = (a.cx + b.cx) / 2 + (b.cy - a.cy) * 0.12;
      const my = (a.cy + b.cy) / 2 - (b.cx - a.cx) * 0.12;
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
      const isBossWorld = hasBossLevel(worldData.mandatoryLevels);

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
    }
  }

  // ─── Detail panel rendering ──────────────────────────────────────

  function renderDetailPanel(): void {
    detailPanel.innerHTML = '';

    if (!selectedWorldId) {
      const empty = document.createElement('div');
      empty.className = 'wm-detail-empty';
      empty.textContent = 'Select a world node on the map to see its details.';
      detailPanel.appendChild(empty);
      return;
    }

    const worldData = WORLD_MAP_DATA.find(w => w.id === selectedWorldId);
    if (!worldData) return;

    const worldUnlockState = getWorldUnlockState(state, selectedWorldId);
    const isLocked = worldUnlockState === 'locked';

    const content = document.createElement('div');
    content.className = 'wm-detail-content';
    detailPanel.appendChild(content);

    // ── World header ──
    const worldHeader = document.createElement('div');
    worldHeader.className = 'wm-world-header';

    const chapterEl = document.createElement('div');
    chapterEl.className = 'wm-world-chapter';
    chapterEl.textContent = `Chapter ${worldData.chapter}`;

    const titleEl2 = document.createElement('div');
    titleEl2.className = 'wm-world-title';
    titleEl2.textContent = worldData.name;

    const subtitleEl = document.createElement('div');
    subtitleEl.className = 'wm-world-subtitle';
    subtitleEl.textContent = worldData.subtitle;

    worldHeader.appendChild(chapterEl);
    worldHeader.appendChild(titleEl2);
    worldHeader.appendChild(subtitleEl);
    content.appendChild(worldHeader);

    if (isLocked) {
      const lockedNotice = document.createElement('div');
      lockedNotice.className = 'wm-locked-notice';
      const lockedTitle = document.createElement('strong');
      lockedTitle.textContent = '🔒 World Locked';
      lockedNotice.appendChild(lockedTitle);
      lockedNotice.appendChild(document.createTextNode(
        `Complete the previous world's boss to unlock ${worldData.name}.`,
      ));
      content.appendChild(lockedNotice);
      return;
    }

    // ── Theme ──
    const themeEl = document.createElement('div');
    themeEl.className = 'wm-world-theme';
    themeEl.textContent = worldData.theme;
    content.appendChild(themeEl);

    // ── Reward ──
    const rewardEl = document.createElement('div');
    rewardEl.className = 'wm-world-reward';
    rewardEl.textContent = worldData.reward;
    content.appendChild(rewardEl);

    // ── Mandatory levels ──
    const mandatorySection = document.createElement('div');

    const mandatorySectionTitle = document.createElement('div');
    mandatorySectionTitle.className = 'wm-section-title';
    mandatorySectionTitle.textContent = 'Levels';
    mandatorySection.appendChild(mandatorySectionTitle);

    const mandatoryList = document.createElement('div');
    mandatoryList.className = 'wm-level-list';

    for (const level of worldData.mandatoryLevels) {
      const levelState = getLevelUnlockState(state, selectedWorldId, level.id);
      const item = document.createElement('div');
      item.className = `wm-level-item wm-level-item--${levelState}`;
      if (level.type === 'boss') item.classList.add('wm-level-item--boss');

      const icon = document.createElement('span');
      icon.className = 'wm-level-icon';
      icon.textContent = levelStateIcon(levelState, level.type === 'boss');

      const name = document.createElement('span');
      name.className = 'wm-level-name';
      name.textContent = level.name;

      const num = document.createElement('span');
      num.className = 'wm-level-number';
      num.textContent = level.type === 'boss' ? 'BOSS' : `${level.number}`;

      item.appendChild(icon);
      item.appendChild(name);
      item.appendChild(num);

      // Click to start an unlocked/current level
      if (levelState === 'unlocked' || levelState === 'current') {
        const capturedWorldId = selectedWorldId;
        if (capturedWorldId !== null) {
          item.title = `Start: ${level.name}`;
          item.addEventListener('click', () => {
            startWorldLevel(capturedWorldId, level.id);
          });

          // DEV: right-click marks complete for testing
          if (state.devMode) {
            item.title += ' (right-click → mark complete)';
            item.addEventListener('contextmenu', (e) => {
              e.preventDefault();
              markLevelComplete(state, capturedWorldId, level.id);
              drawMap();
              renderDetailPanel();
            });
          }
        }
      }

      mandatoryList.appendChild(item);

      // Boss info card beneath boss level
      if (level.type === 'boss' && level.bossName && levelState !== 'locked') {
        const bossCard = document.createElement('div');
        bossCard.className = 'wm-boss-info';

        const bossName = document.createElement('div');
        bossName.className = 'wm-boss-name';
        bossName.textContent = `☠ ${level.bossName}`;
        bossCard.appendChild(bossName);

        if (level.bossDescription) {
          const bossDesc = document.createElement('div');
          bossDesc.className = 'wm-boss-desc';
          bossDesc.textContent = level.bossDescription;
          bossCard.appendChild(bossDesc);
        }

        mandatoryList.appendChild(bossCard);
      }
    }

    mandatorySection.appendChild(mandatoryList);
    content.appendChild(mandatorySection);

    // ── Base6 challenges ──
    const base6Section = document.createElement('div');

    const base6SectionTitle = document.createElement('div');
    base6SectionTitle.className = 'wm-section-title';
    base6SectionTitle.textContent = 'Base 6 Challenges';
    base6Section.appendChild(base6SectionTitle);

    const base6List = document.createElement('div');
    base6List.className = 'wm-level-list';

    for (const challenge of worldData.base6Set) {
      const unlocked = isBase6LevelUnlocked(state, selectedWorldId, challenge.id);
      const completed = state.worlds.get(selectedWorldId)?.completedBase6Ids.has(challenge.id) ?? false;
      const itemState = completed ? 'completed' : unlocked ? 'unlocked' : 'locked';

      const item = document.createElement('div');
      item.className = `wm-level-item wm-level-item--${itemState}`;

      const icon = document.createElement('span');
      icon.className = 'wm-level-icon';
      icon.textContent = itemState === 'completed' ? '✓' : itemState === 'locked' ? '🔒' : '◈';

      const name = document.createElement('span');
      name.className = 'wm-level-name';
      name.textContent = `B${challenge.base6Number}`;

      const desc = document.createElement('span');
      desc.className = 'wm-level-number';
      desc.textContent = challenge.name.replace('Base 6 Trial: ', '');

      item.appendChild(icon);
      item.appendChild(name);
      item.appendChild(desc);
      item.title = unlocked ? challenge.challengeRule : 'Complete Level 5 to unlock Base 6 challenges.';

      if (itemState === 'unlocked') {
        const capturedWorldId = selectedWorldId;
        if (capturedWorldId !== null) {
          item.addEventListener('click', () => {
            startOptionalChallenge(capturedWorldId, challenge.id);
          });
        }
      }

      base6List.appendChild(item);
    }

    base6Section.appendChild(base6List);
    content.appendChild(base6Section);

    // ── Start current level button ──
    const worldProgress = state.worlds.get(selectedWorldId);
    const currentLevelId = worldProgress?.currentMandatoryLevelId;
    if (currentLevelId && selectedWorldId !== null) {
      const capturedWorldId = selectedWorldId;
      const currentLevel = worldData.mandatoryLevels.find(l => l.id === currentLevelId);
      if (currentLevel) {
        const startBtn = document.createElement('button');
        startBtn.className = 'wm-start-btn';
        startBtn.textContent = `▶ Start: ${currentLevel.name}`;
        startBtn.addEventListener('click', () => {
          startWorldLevel(capturedWorldId, currentLevelId);
        });
        content.appendChild(startBtn);
      }
    }
  }

  // ─── Canvas interaction ──────────────────────────────────────────

  function getNodeAtPoint(px: number, py: number): WorldNode | null {
    for (const node of nodes) {
      const dx = px - node.cx;
      const dy = py - node.cy;
      if (dx * dx + dy * dy <= (node.radius + 8) ** 2) return node;
    }
    return null;
  }

  /** Convert a client-space point to canvas pixel coordinates. */
  function clientToCanvas(clientX: number, clientY: number): { px: number; py: number } {
    const rect = canvas.getBoundingClientRect();
    return {
      px: (clientX - rect.left) * (canvas.width / rect.width),
      py: (clientY - rect.top) * (canvas.height / rect.height),
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

  // Pointer cursor when hovering a node
  canvas.addEventListener('mousemove', (e: MouseEvent) => {
    const { px, py } = clientToCanvas(e.clientX, e.clientY);
    canvas.style.cursor = getNodeAtPoint(px, py) ? 'pointer' : 'default';
  });

  // ─── Resize ─────────────────────────────────────────────────────

  function resize(): void {
    const { width, height } = canvasArea.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    // Reset the transform before applying DPR scale to avoid compounding on repeated calls.
    // setTransform(a, b, c, d, e, f): a/d = x/y scale, b/c = skew, e/f = translation.
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    buildNodes();
    drawMap();
  }

  const resizeObserver = new ResizeObserver(() => {
    cancelAnimationFrame(rafId);
    rafId = requestAnimationFrame(resize);
  });
  resizeObserver.observe(canvasArea);

  // ─── Public API ──────────────────────────────────────────────────

  function show(): void {
    element.classList.add('wm-screen--visible');
    syncDevButton();
    // Defer first draw to ensure layout is complete
    requestAnimationFrame(() => { resize(); renderDetailPanel(); });
  }

  function hide(): void {
    element.classList.remove('wm-screen--visible');
  }

  function refresh(newState: WorldMapProgressionState): void {
    state = newState;
    syncDevButton();
    buildNodes();
    drawMap();
    renderDetailPanel();
  }

  function destroy(): void {
    resizeObserver.disconnect();
    cancelAnimationFrame(rafId);
  }

  // Initial setup
  syncDevButton();
  renderDetailPanel();

  return { element, show, hide, refresh, destroy };
}

// ─── Color utility helpers ────────────────────────────────────────

/** Linearly interpolate between two hex colours. */
function lerpColor(a: string, b: string, t: number): string {
  const ar = parseInt(a.slice(1, 3), 16);
  const ag = parseInt(a.slice(3, 5), 16);
  const ab = parseInt(a.slice(5, 7), 16);
  const br = parseInt(b.slice(1, 3), 16);
  const bg = parseInt(b.slice(3, 5), 16);
  const bb = parseInt(b.slice(5, 7), 16);
  const r = Math.round(ar + (br - ar) * t);
  const g = Math.round(ag + (bg - ag) * t);
  const bv = Math.round(ab + (bb - ab) * t);
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${bv.toString(16).padStart(2, '0')}`;
}

function hexToRgb(hex: string): [number, number, number] {
  return [
    parseInt(hex.slice(1, 3), 16),
    parseInt(hex.slice(3, 5), 16),
    parseInt(hex.slice(5, 7), 16),
  ];
}

function rgbToHex(r: number, g: number, b: number): string {
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}

function lighten(hex: string, amount: number): string {
  const [r, g, b] = hexToRgb(hex);
  return rgbToHex(
    Math.min(255, Math.round(r + (255 - r) * amount)),
    Math.min(255, Math.round(g + (255 - g) * amount)),
    Math.min(255, Math.round(b + (255 - b) * amount)),
  );
}

function darken(hex: string, amount: number): string {
  const [r, g, b] = hexToRgb(hex);
  return rgbToHex(
    Math.max(0, Math.round(r * (1 - amount))),
    Math.max(0, Math.round(g * (1 - amount))),
    Math.max(0, Math.round(b * (1 - amount))),
  );
}

function levelStateIcon(state: string, isBoss: boolean): string {
  if (state === 'completed') return '✓';
  if (state === 'current')   return isBoss ? '☠' : '▶';
  if (state === 'unlocked')  return isBoss ? '⬡' : '○';
  return '🔒';
}
