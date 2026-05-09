/**
 * LevelScreen.ts — Full-screen overlay for viewing a level layout.
 *
 * Shows the top-down room layout rendered on canvas, plus level info
 * and a placeholder play button.
 */

import type { LevelDefinition } from '../../types/levelTypes';
import { renderLevelLayout } from '../../render/renderLevelLayout';

// ─── Enemy badge colour map ───────────────────────────────────────
// Maps enemy type IDs to a representative hex colour for the info badge.

const ENEMY_BADGE_COLOR: Record<string, string> = {
  laser:    '#ff4444',
  quartz:   '#e0e0e0',
  sapphire: '#4488ff',
  emerald:  '#44cc66',
  amber:    '#ff8800',
  void:     '#9944cc',
  ruby:     '#ff2255',
  sunstone: '#ffcc44',
  citrine:  '#ffee22',
  iolite:   '#6688dd',
  amethyst: '#bb44ee',
  diamond:  '#88eeff',
  nullstone:'#335566',
  fracteryl:'#cc88ff',
  eigenstein:'#ff9944',
  alivened: '#44ffcc',
};

// ─── Public interface ─────────────────────────────────────────────

export interface LevelScreen {
  element: HTMLElement;
  show(levelDef: LevelDefinition, worldColor: string): void;
  hide(): void;
  destroy(): void;
}

export function createLevelScreen(
  onClose: () => void,
  onPlay?: (levelDef: LevelDefinition) => void,
): LevelScreen {
  let currentLevelDef: LevelDefinition | null = null;
  let currentWorldColor = '#80c8ff';
  let rafId = 0;
  let isVisible = false;

  // ── Root element ──
  const element = document.createElement('div');
  element.className = 'ls-screen';
  element.setAttribute('role', 'dialog');
  element.setAttribute('aria-label', 'Level Layout');

  // ── Header ──
  const header = document.createElement('div');
  header.className = 'ls-header';

  const backBtn = document.createElement('button');
  backBtn.className = 'ls-back-btn';
  backBtn.textContent = '← Map';
  backBtn.setAttribute('aria-label', 'Back to world map');
  backBtn.addEventListener('click', () => onClose());

  const titleEl = document.createElement('span');
  titleEl.className = 'ls-header-title';
  titleEl.textContent = '—';

  const worldTag = document.createElement('span');
  worldTag.className = 'ls-world-tag';
  worldTag.textContent = '';

  header.appendChild(backBtn);
  header.appendChild(titleEl);
  header.appendChild(worldTag);
  element.appendChild(header);

  // ── Canvas area ──
  const canvasArea = document.createElement('div');
  canvasArea.className = 'ls-canvas-area';
  element.appendChild(canvasArea);

  const canvas = document.createElement('canvas');
  canvasArea.appendChild(canvas);
  const ctxRaw = canvas.getContext('2d');
  if (!ctxRaw) throw new Error('LevelScreen: failed to get 2D context');
  const ctx = ctxRaw;

  // ── Info bar ──
  const infoBar = document.createElement('div');
  infoBar.className = 'ls-info-bar';

  const objectiveEl = document.createElement('div');
  objectiveEl.className = 'ls-objective';

  const archetypeEl = document.createElement('div');
  archetypeEl.className = 'ls-archetype';

  // Enemy emphasis badge — shows the world's dominant enemy type(s) as coloured
  // dots so the player can anticipate what they're about to face.
  const enemyBadgeEl = document.createElement('div');
  enemyBadgeEl.className = 'ls-enemy-badge';

  const wavesEl = document.createElement('div');
  wavesEl.className = 'ls-waves';

  const playBtn = document.createElement('button');
  playBtn.className = onPlay ? 'ls-play-btn' : 'ls-play-btn ls-play-btn--disabled';
  playBtn.textContent = onPlay ? '▶ Play Level' : '▶ Play Level (Coming Soon)';
  playBtn.disabled = !onPlay;
  if (onPlay) {
    playBtn.addEventListener('click', () => {
      if (currentLevelDef) {
        onPlay(currentLevelDef);
      }
    });
  }

  infoBar.appendChild(objectiveEl);
  infoBar.appendChild(archetypeEl);
  infoBar.appendChild(enemyBadgeEl);
  infoBar.appendChild(wavesEl);
  infoBar.appendChild(playBtn);
  element.appendChild(infoBar);

  // ─── Resize ──────────────────────────────────────────────────────

  const MAX_DPR = 2;

  function resizeCanvas(): void {
    const dpr = Math.min(window.devicePixelRatio || 1, MAX_DPR);
    const w = canvasArea.clientWidth;
    const h = canvasArea.clientHeight;
    if (w === 0 || h === 0) return;
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    canvas.style.width = w + 'px';
    canvas.style.height = h + 'px';
    ctx.scale(dpr, dpr);
    scheduleRender();
  }

  const ro = new ResizeObserver(() => { resizeCanvas(); });
  ro.observe(canvasArea);

  // ─── Render loop ─────────────────────────────────────────────────

  function scheduleRender(): void {
    if (!isVisible) return;
    cancelAnimationFrame(rafId);
    rafId = requestAnimationFrame(renderFrame);
  }

  function renderFrame(nowMs: number): void {
    if (!isVisible || !currentLevelDef) return;
    const w = canvasArea.clientWidth;
    const h = canvasArea.clientHeight;
    if (w === 0 || h === 0) { rafId = requestAnimationFrame(renderFrame); return; }
    renderLevelLayout(ctx, currentLevelDef.room, w, h, currentWorldColor, nowMs);
    rafId = requestAnimationFrame(renderFrame);
  }

  // ─── Public methods ───────────────────────────────────────────────

  function show(levelDef: LevelDefinition, worldColor: string): void {
    currentLevelDef = levelDef;
    currentWorldColor = worldColor;
    isVisible = true;

    titleEl.textContent = `🎯 ${levelDef.name}`;
    worldTag.textContent = levelDef.worldId.replace(/_/g, ' ');
    objectiveEl.textContent = `Objective: ${levelDef.objective}`;
    archetypeEl.textContent = `Archetype: ${levelDef.archetype.replace(/_/g, ' ')}`;

    // Waves indicator
    const waves = levelDef.waveCount ?? (levelDef.type === 'boss' ? 5 : 3);
    const waveLabel = levelDef.type === 'boss' ? `👑 ${waves} Boss Waves` : `⚔ ${waves} Waves`;
    wavesEl.textContent = waveLabel;

    // Enemy emphasis: show dots for the top 3 highest-biased enemy types.
    enemyBadgeEl.innerHTML = '';
    const bias = levelDef.waveEnemyBias;
    if (bias && Object.keys(bias).length > 0) {
      // Sort by descending multiplier; only show entries with multiplier > 0.8.
      const entries = Object.entries(bias)
        .filter((e): e is [string, number] => typeof e[1] === 'number' && e[1] > 0.8)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 4);
      if (entries.length > 0) {
        const label = document.createElement('span');
        label.className = 'ls-enemy-badge__label';
        label.textContent = 'Enemies: ';
        enemyBadgeEl.appendChild(label);
        for (const [eId] of entries) {
          const dot = document.createElement('span');
          dot.className = 'ls-enemy-badge__dot';
          dot.textContent = eId.charAt(0).toUpperCase() + eId.slice(1, 3) + '.';
          dot.style.color = ENEMY_BADGE_COLOR[eId] ?? '#ccc';
          dot.title = eId;
          enemyBadgeEl.appendChild(dot);
        }
      }
    }

    element.classList.add('ls-screen--visible');
    resizeCanvas();
    rafId = requestAnimationFrame(renderFrame);
  }

  function hide(): void {
    isVisible = false;
    element.classList.remove('ls-screen--visible');
    cancelAnimationFrame(rafId);
    rafId = 0;
  }

  function destroy(): void {
    hide();
    ro.disconnect();
  }

  return { element, show, hide, destroy };
}
