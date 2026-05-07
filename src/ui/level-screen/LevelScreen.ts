/**
 * LevelScreen.ts — Full-screen overlay for viewing a level layout.
 *
 * Shows the top-down room layout rendered on canvas, plus level info
 * and a placeholder play button.
 */

import type { LevelDefinition } from '../../types/levelTypes';
import { renderLevelLayout } from '../../render/renderLevelLayout';

// ─── Public interface ─────────────────────────────────────────────

export interface LevelScreen {
  element: HTMLElement;
  show(levelDef: LevelDefinition, worldColor: string): void;
  hide(): void;
  destroy(): void;
}

export function createLevelScreen(onClose: () => void): LevelScreen {
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

  const playBtn = document.createElement('button');
  playBtn.className = 'ls-play-btn ls-play-btn--disabled';
  playBtn.textContent = '▶ Play Level (Coming Soon)';
  playBtn.disabled = true;

  infoBar.appendChild(objectiveEl);
  infoBar.appendChild(archetypeEl);
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
