/**
 * main-menu.ts — Circuit-style main menu with plug-and-wire option selection.
 *
 * Layout (all boxes use `position: absolute`):
 *   ┌─────────────────────────┐
 *   │ mm-title-box            │ ← [output-plug] drag source
 *   │   "Equatoria"           │
 *   │   [output plug] ─wire─→ │ ──→ to option boxes
 *   └─────────────────────────┘
 *
 *   Positioned to the right of the title box:
 *     ┌──────────────────────────┐
 *     │[●] START GAME            │ ← mm-option-box (input plug on left)
 *     └──────────────────────────┘
 *     ┌──────────────────────────┐
 *     │[●] SETTINGS              │
 *     └──────────────────────────┘
 *
 *   Settings panel (slides in from top when Settings is connected):
 *     ┌──────────────────────────┐
 *     │ ⚙ SETTINGS              │
 *     │  Audio  ▸ …             │
 *     │  Graphics ▸ …           │
 *     │  Controls ▸ …           │
 *     │  · disconnect wire ·    │
 *     └──────────────────────────┘
 *
 * State machine:
 *   idle → dragging → startSelected → startTransition → (game starts)
 *   idle → dragging → settingsOpen  → settingsClosing → idle
 *
 * Reuses createSoftWireRenderer (rpg-soft-wire.ts) for Verlet-rope physics.
 */

import { createSoftWireRenderer } from '../../render/rpg/rpg-soft-wire';
import type { SoftWireData } from '../../render/rpg/rpg-soft-wire';

// ── Layout constants ──────────────────────────────────────────────────────────

/** CSS px distance from the left viewport edge to the title box. */
const MENU_MARGIN_X = 28;
/** CSS px distance from the top viewport edge to the title box. */
const MENU_MARGIN_Y = 44;
/** Horizontal gap (px) between the right edge of the title box and the option boxes. */
const OPTION_OFFSET_X = 22;
/** Vertical gap (px) between option boxes. */
const OPTION_GAP_Y = 6;
/** Vertical offset (px) for the first option box below the title box top edge. */
const OPTION_FIRST_Y_OFFSET = 6;
/** Gap (px) between the bottom of the title box and the top of the settings panel. */
const SETTINGS_PANEL_GAP_Y = 8;

/**
 * Radius (px) within which the dragged wire tip "snaps" to an input plug.
 * The snap is a smooth lerp, not a hard jump.
 */
const SNAP_RADIUS_PX = 36;

// ── Animation constants ────────────────────────────────────────────────────────

/** Floating amplitude in CSS px. All boxes float sinusoidally by this amount. */
const FLOAT_AMP_PX = 4.5;
/** Period (seconds) for one complete float cycle. */
const FLOAT_PERIOD_S = 3.4;

/** Independent phase offsets (0–1) per floating element so they don't move in unison. */
const FLOAT_PHASES = {
  title:         0.00,
  optStart:      0.28,
  optSettings:   0.52,
  settingsPanel: 0.16,
} as const;

/** Duration (ms) for the Start Game fly-up animation. */
const START_ANIM_MS = 700;
/** Duration (ms) for the Settings-panel slide-in animation. */
const SETTINGS_OPEN_MS = 520;
/** Duration (ms) for the Settings-panel slide-out (close) animation. */
const SETTINGS_CLOSE_MS = 480;
/** Delay (ms) after wire connects to Start Game before the fly-up begins. */
const START_DELAY_MS = 180;

// ── Menu state type ────────────────────────────────────────────────────────────

type MenuState =
  | 'idle'
  | 'dragging'
  | 'startSelected'     // wire connected to Start; waiting for START_DELAY_MS
  | 'startTransition'   // boxes flying up and off screen
  | 'settingsOpen'      // settings panel visible; main menu boxes shifted
  | 'settingsClosing';  // settings panel animating out; boxes returning

// ── Public interface ───────────────────────────────────────────────────────────

export interface MainMenuHandle {
  /** Root overlay element — append to #app. */
  element: HTMLElement;
  /** Stop the animation loop and remove all event listeners. */
  destroy(): void;
}

// ── Easing helpers ─────────────────────────────────────────────────────────────

function easeInOut(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

function easeOut(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

function easeIn(t: number): number {
  return t * t * t;
}

// ── Factory ────────────────────────────────────────────────────────────────────

export function createMainMenu(onStartGame: () => void): MainMenuHandle {

  // ── Root overlay ─────────────────────────────────────────────────────────
  const overlay = document.createElement('div');
  overlay.id = 'main-menu-overlay';

  // ── Title box (source node / output-plug host) ───────────────────────────
  const titleBox = document.createElement('div');
  titleBox.className = 'mm-box mm-title-box';

  const titleText = document.createElement('div');
  titleText.className = 'mm-title-text';
  titleText.textContent = 'Equatoria';

  const subtitleText = document.createElement('div');
  subtitleText.className = 'mm-subtitle-text';
  subtitleText.textContent = 'RPG';

  const outputPlugRow = document.createElement('div');
  outputPlugRow.className = 'mm-output-plug-row';

  const plugLabel = document.createElement('div');
  plugLabel.className = 'mm-plug-label';
  plugLabel.textContent = 'Select ›';

  const outputPlug = document.createElement('div');
  outputPlug.className = 'mm-output-plug';

  outputPlugRow.appendChild(plugLabel);
  outputPlugRow.appendChild(outputPlug);

  titleBox.appendChild(titleText);
  titleBox.appendChild(subtitleText);
  titleBox.appendChild(outputPlugRow);

  // ── Option box factory ────────────────────────────────────────────────────

  function makeOptionBox(label: string): { box: HTMLElement; inputPlug: HTMLElement } {
    const box = document.createElement('div');
    box.className = 'mm-box mm-option-box';

    const inputPlug = document.createElement('div');
    inputPlug.className = 'mm-input-plug';

    const labelEl = document.createElement('div');
    labelEl.className = 'mm-option-label';
    labelEl.textContent = label;

    box.appendChild(inputPlug);
    box.appendChild(labelEl);

    return { box, inputPlug };
  }

  const { box: startBox,    inputPlug: startPlug    } = makeOptionBox('Start Game');
  const { box: settingsBox, inputPlug: settingsPlug } = makeOptionBox('Settings');

  // ── Settings panel ────────────────────────────────────────────────────────

  const settingsPanel = document.createElement('div');
  settingsPanel.className = 'mm-box mm-settings-panel';

  const settingsTitle = document.createElement('div');
  settingsTitle.className = 'mm-settings-title';
  settingsTitle.textContent = '⚙ Settings';
  settingsPanel.appendChild(settingsTitle);

  const settingsRowDefs: Array<[string, string]> = [
    ['Audio',    '▸ Volume, Music'],
    ['Graphics', '▸ Quality, Effects'],
    ['Controls', '▸ Touch, Keyboard'],
  ];

  for (const [name, hint] of settingsRowDefs) {
    const row = document.createElement('div');
    row.className = 'mm-settings-row';

    const nameEl = document.createElement('span');
    nameEl.textContent = name;

    const hintEl = document.createElement('span');
    hintEl.className = 'mm-settings-row-hint';
    hintEl.textContent = hint;

    row.appendChild(nameEl);
    row.appendChild(hintEl);
    settingsPanel.appendChild(row);
  }

  const settingsHint = document.createElement('div');
  settingsHint.className = 'mm-settings-hint';
  settingsHint.textContent = '· drag wire away from plug to return ·';
  settingsPanel.appendChild(settingsHint);

  // ── Append all to overlay ─────────────────────────────────────────────────

  overlay.appendChild(titleBox);
  overlay.appendChild(startBox);
  overlay.appendChild(settingsBox);
  overlay.appendChild(settingsPanel);

  // ── Soft-wire renderer (reuses the RPG Verlet-rope system) ───────────────
  const wireRenderer = createSoftWireRenderer(overlay);
  wireRenderer.svgEl.classList.add('mm-wire-svg');
  overlay.appendChild(wireRenderer.svgEl);

  // ── Mutable state ─────────────────────────────────────────────────────────

  let menuState: MenuState = 'idle';
  let animTimeS = 0;
  let lastFrameMs = -1;
  let rafId = 0;

  // Active (locked) wire and its connected target
  let connectedWire: SoftWireData | null = null;
  let connectedTarget: 'start' | 'settings' | null = null;

  // Wires being retracted (slurping) after disconnection
  const slurpingWires: SoftWireData[] = [];

  // Drag state
  let isDragging = false;
  let dragCurrentX = 0;
  let dragCurrentY = 0;
  let dragPointerId = -1;

  // Transition timing
  let transitionStartMs = 0;

  // Layout-derived base Y values (set in doLayout)
  let settingsPanelBaseTop = MENU_MARGIN_Y;  // CSS top for the settings panel
  let layoutReady = false;

  // Per-box Y offsets applied via translateY each frame
  let titleOffsetY = 0;
  let startOffsetY = 0;
  let settingsOptOffsetY = 0;
  let settingsPanelOffsetY = 0;

  // ── Layout ────────────────────────────────────────────────────────────────

  function doLayout(): void {
    // Title box: top-left with margins
    titleBox.style.left = MENU_MARGIN_X + 'px';
    titleBox.style.top  = MENU_MARGIN_Y + 'px';
    titleBox.style.transform = 'translateY(0px)';

    // Force layout so offsetHeight/Width are accurate
    const titleH = titleBox.offsetHeight;
    const titleW = titleBox.offsetWidth;

    // Option boxes: to the right of the title box, stacked vertically
    const optX      = MENU_MARGIN_X + titleW + OPTION_OFFSET_X;
    const optY0     = MENU_MARGIN_Y + OPTION_FIRST_Y_OFFSET;
    const startH    = startBox.offsetHeight;

    startBox.style.left    = optX + 'px';
    startBox.style.top     = optY0 + 'px';

    settingsBox.style.left = optX + 'px';
    settingsBox.style.top  = (optY0 + startH + OPTION_GAP_Y) + 'px';

    // Settings panel: same left as title box, just below it
    settingsPanelBaseTop = MENU_MARGIN_Y + titleH + SETTINGS_PANEL_GAP_Y;
    settingsPanel.style.left  = MENU_MARGIN_X + 'px';
    settingsPanel.style.top   = settingsPanelBaseTop + 'px';
    settingsPanel.style.width = Math.max(200, titleW + 80) + 'px';

    // Initially the settings panel is off screen above
    settingsPanelOffsetY = -(overlay.clientHeight + 300);

    layoutReady = true;
  }

  // ── Coordinate helpers ────────────────────────────────────────────────────

  /** Returns the centre of an element in overlay-local coordinates. */
  function plugCenter(el: HTMLElement): { x: number; y: number } {
    const ovR = overlay.getBoundingClientRect();
    const elR = el.getBoundingClientRect();
    return {
      x: elR.left + elR.width  / 2 - ovR.left,
      y: elR.top  + elR.height / 2 - ovR.top,
    };
  }

  function toLocal(clientX: number, clientY: number): { x: number; y: number } {
    const r = overlay.getBoundingClientRect();
    return { x: clientX - r.left, y: clientY - r.top };
  }

  function distSq(ax: number, ay: number, bx: number, by: number): number {
    return (ax - bx) ** 2 + (ay - by) ** 2;
  }

  // ── Wire management ───────────────────────────────────────────────────────

  function connectWire(target: 'start' | 'settings'): void {
    const srcColor = '#ffd764';
    const dstColor = target === 'start' ? '#a0e080' : '#a78bfa';
    const wire = wireRenderer.createWire(srcColor, dstColor);

    wire.tipHandle.style.background  = dstColor;
    wire.tipHandle.style.boxShadow   = `0 0 8px ${dstColor}`;
    wire.tipHandle.style.border      = `2px solid rgba(255,255,255,0.4)`;
    wire.tipHandle.addEventListener('pointerdown', onTipHandleDown);

    connectedWire   = wire;
    connectedTarget = target;
  }

  /**
   * Disconnect the active wire by moving it to the slurping queue.
   * Does NOT change menuState — the caller is responsible.
   */
  function disconnectWire(): void {
    if (!connectedWire) return;
    connectedWire.tipHandle.removeEventListener('pointerdown', onTipHandleDown);
    connectedWire.isSlurping = true;
    connectedWire.slurpMs    = 0;
    slurpingWires.push(connectedWire);
    connectedWire   = null;
    connectedTarget = null;
  }

  // ── Highlight helpers ─────────────────────────────────────────────────────

  function highlightValidTargets(mouseX: number, mouseY: number): void {
    const sc = plugCenter(startPlug);
    const ec = plugCenter(settingsPlug);

    const nearStart    = distSq(mouseX, mouseY, sc.x, sc.y) < SNAP_RADIUS_PX ** 2;
    const nearSettings = distSq(mouseX, mouseY, ec.x, ec.y) < SNAP_RADIUS_PX ** 2;

    startBox.classList.toggle('mm-option-box--hover',  nearStart);
    startPlug.classList.toggle('mm-input-plug--hover', nearStart);

    settingsBox.classList.toggle('mm-option-box--hover',  nearSettings);
    settingsPlug.classList.toggle('mm-input-plug--hover', nearSettings);
  }

  function clearHighlights(): void {
    startBox.classList.remove('mm-option-box--hover');
    startPlug.classList.remove('mm-input-plug--hover');
    settingsBox.classList.remove('mm-option-box--hover');
    settingsPlug.classList.remove('mm-input-plug--hover');
  }

  // ── Pointer handlers ──────────────────────────────────────────────────────

  /** Tip-handle pointerdown: disconnect current wire and start a new drag. */
  function onTipHandleDown(e: PointerEvent): void {
    if (isDragging) return;
    e.stopPropagation();

    // Undo the current connection and close settings if needed
    if (menuState === 'settingsOpen') {
      menuState = 'settingsClosing';
      transitionStartMs = performance.now();
      settingsBox.classList.remove('mm-option-box--connected');
      settingsPlug.classList.remove('mm-input-plug--connected');
      settingsPanel.style.pointerEvents = 'none';
      disconnectWire();
      return;   // do not start a new drag; just close settings
    }

    if (menuState === 'startSelected') {
      // Cancel start selection
      menuState = 'idle';
      startBox.classList.remove('mm-option-box--connected');
      startPlug.classList.remove('mm-input-plug--connected');
    }

    disconnectWire();
    beginDrag(e.clientX, e.clientY, e.pointerId);
  }

  /** Begin a pointer drag from the output plug. */
  function beginDrag(clientX: number, clientY: number, pointerId: number): void {
    const local = toLocal(clientX, clientY);
    dragCurrentX = local.x;
    dragCurrentY = local.y;
    dragPointerId = pointerId;
    isDragging = true;
    menuState  = 'dragging';

    overlay.setPointerCapture(pointerId);

    const from = plugCenter(outputPlug);
    wireRenderer.setDragPreview(from.x, from.y, dragCurrentX, dragCurrentY, '#ffd764');
    outputPlug.classList.add('mm-output-plug--active');
    highlightValidTargets(dragCurrentX, dragCurrentY);
  }

  // Output plug: start drag
  outputPlug.addEventListener('pointerdown', (e: PointerEvent) => {
    if (isDragging) return;
    // Block during transitions that can't be interrupted
    if (menuState === 'startTransition' || menuState === 'settingsClosing') return;

    e.preventDefault();
    e.stopPropagation();

    // If settings is open, closing it cancels the wire
    if (menuState === 'settingsOpen') {
      menuState = 'settingsClosing';
      transitionStartMs = performance.now();
      settingsBox.classList.remove('mm-option-box--connected');
      settingsPlug.classList.remove('mm-input-plug--connected');
      settingsPanel.style.pointerEvents = 'none';
      disconnectWire();
      // fall through to start a new drag so the user can reconnect
    } else if (menuState === 'startSelected') {
      // Cancel start selection
      menuState = 'idle';
      startBox.classList.remove('mm-option-box--connected');
      startPlug.classList.remove('mm-input-plug--connected');
      disconnectWire();
    } else {
      disconnectWire();
    }

    beginDrag(e.clientX, e.clientY, e.pointerId);
  });

  // Overlay: move and release
  overlay.addEventListener('pointermove', (e: PointerEvent) => {
    if (!isDragging || e.pointerId !== dragPointerId) return;
    const local = toLocal(e.clientX, e.clientY);
    dragCurrentX = local.x;
    dragCurrentY = local.y;
    highlightValidTargets(dragCurrentX, dragCurrentY);
  });

  overlay.addEventListener('pointerup', (e: PointerEvent) => {
    if (!isDragging || e.pointerId !== dragPointerId) return;
    endDrag(e.clientX, e.clientY, e.pointerId);
  });

  overlay.addEventListener('pointercancel', (e: PointerEvent) => {
    if (!isDragging || e.pointerId !== dragPointerId) return;
    endDrag(e.clientX, e.clientY, e.pointerId);
    menuState = 'idle';
  });

  function endDrag(clientX: number, clientY: number, pointerId: number): void {
    isDragging = false;
    outputPlug.classList.remove('mm-output-plug--active');
    clearHighlights();
    wireRenderer.hideDragPreview();

    if (overlay.hasPointerCapture(pointerId)) {
      overlay.releasePointerCapture(pointerId);
    }
    dragPointerId = -1;

    // If we're mid-settings-close we don't apply a new connection
    if (menuState === 'settingsClosing') return;

    const local = toLocal(clientX, clientY);
    const sc = plugCenter(startPlug);
    const ec = plugCenter(settingsPlug);

    const nearStart    = distSq(local.x, local.y, sc.x, sc.y) < SNAP_RADIUS_PX ** 2;
    const nearSettings = distSq(local.x, local.y, ec.x, ec.y) < SNAP_RADIUS_PX ** 2;

    if (nearStart) {
      connectWire('start');
      startBox.classList.add('mm-option-box--connected');
      startPlug.classList.add('mm-input-plug--connected');
      menuState = 'startSelected';
      transitionStartMs = performance.now() + START_DELAY_MS;
    } else if (nearSettings) {
      connectWire('settings');
      settingsBox.classList.add('mm-option-box--connected');
      settingsPlug.classList.add('mm-input-plug--connected');
      menuState = 'settingsOpen';
      transitionStartMs = performance.now();
    } else {
      menuState = 'idle';
    }
  }

  // ── Animation loop ────────────────────────────────────────────────────────

  function frame(nowMs: number): void {
    if (lastFrameMs < 0) lastFrameMs = nowMs;
    const deltaMs = Math.min(nowMs - lastFrameMs, 100);
    lastFrameMs = nowMs;
    animTimeS  += deltaMs / 1000;

    if (!layoutReady) doLayout();

    wireRenderer.setViewBox(overlay.clientWidth, overlay.clientHeight);

    const overlayH = overlay.clientHeight;

    // ── Floating offsets (sinusoidal, each element has a unique phase) ──────
    const floatTitle    = Math.sin((animTimeS / FLOAT_PERIOD_S + FLOAT_PHASES.title)         * Math.PI * 2) * FLOAT_AMP_PX;
    const floatStart    = Math.sin((animTimeS / FLOAT_PERIOD_S + FLOAT_PHASES.optStart)      * Math.PI * 2) * FLOAT_AMP_PX;
    const floatSettings = Math.sin((animTimeS / FLOAT_PERIOD_S + FLOAT_PHASES.optSettings)   * Math.PI * 2) * FLOAT_AMP_PX;
    const floatSPanel   = Math.sin((animTimeS / FLOAT_PERIOD_S + FLOAT_PHASES.settingsPanel) * Math.PI * 2) * FLOAT_AMP_PX;

    // ── State-specific transforms ─────────────────────────────────────────

    const offscreenDown = overlayH + 300;
    const offscreenUp   = -(overlayH + 300);

    if (menuState === 'idle' || menuState === 'dragging' || menuState === 'startSelected') {
      titleOffsetY         = floatTitle;
      startOffsetY         = floatStart;
      settingsOptOffsetY   = floatSettings;
      settingsPanelOffsetY = offscreenUp;

    } else if (menuState === 'startTransition') {
      const t    = Math.min((nowMs - transitionStartMs) / START_ANIM_MS, 1);
      const ease = easeIn(t);
      const flyY = ease * offscreenUp;

      // All menu boxes fly upward; float contribution diminishes as they go
      const floatFade = 1 - t;
      titleOffsetY       = flyY + floatTitle    * floatFade;
      startOffsetY       = flyY + floatStart    * floatFade;
      settingsOptOffsetY = flyY + floatSettings * floatFade;
      settingsPanelOffsetY = offscreenUp;

      if (t >= 1) {
        // Fly-up complete — hand off to game
        onStartGame();
        overlay.style.display = 'none';
        cancelAnimationFrame(rafId);
        return;
      }

    } else if (menuState === 'settingsOpen') {
      const t    = Math.min((nowMs - transitionStartMs) / SETTINGS_OPEN_MS, 1);
      const ease = easeOut(t);

      // Start box drops off screen; title and settings-option box stay/float
      const startDrop = ease * offscreenDown;
      titleOffsetY       = floatTitle;
      startOffsetY       = startDrop + floatStart * (1 - ease);
      settingsOptOffsetY = floatSettings;

      // Settings panel drops in from above, settles at its base position (translateY = 0)
      const fromY = offscreenUp;
      settingsPanelOffsetY = fromY + ease * (-fromY) + floatSPanel * Math.min(1, t * 3);

      // Enable pointer events on panel once it has settled
      settingsPanel.style.pointerEvents = t >= 1 ? 'auto' : 'none';

    } else if (menuState === 'settingsClosing') {
      const t    = Math.min((nowMs - transitionStartMs) / SETTINGS_CLOSE_MS, 1);
      const ease = easeInOut(t);

      // Title and settings-option box just float; start box returns from bottom
      titleOffsetY       = floatTitle;
      startOffsetY       = offscreenDown * (1 - ease) + floatStart * ease;
      settingsOptOffsetY = floatSettings;

      // Settings panel slides back up off screen
      settingsPanelOffsetY = ease * offscreenUp + floatSPanel * (1 - ease);

      settingsPanel.style.pointerEvents = 'none';

      if (t >= 1) {
        menuState            = 'idle';
        settingsPanelOffsetY = offscreenUp;
      }
    }

    // ── Trigger start transition after delay ──────────────────────────────
    if (menuState === 'startSelected' && nowMs >= transitionStartMs) {
      menuState         = 'startTransition';
      transitionStartMs = nowMs;
    }

    // ── Apply transforms ─────────────────────────────────────────────────
    titleBox.style.transform     = `translateY(${titleOffsetY.toFixed(2)}px)`;
    startBox.style.transform     = `translateY(${startOffsetY.toFixed(2)}px)`;
    settingsBox.style.transform  = `translateY(${settingsOptOffsetY.toFixed(2)}px)`;
    settingsPanel.style.top      = settingsPanelBaseTop + 'px';
    settingsPanel.style.transform = `translateY(${settingsPanelOffsetY.toFixed(2)}px)`;

    // ── Wire physics ──────────────────────────────────────────────────────

    if (isDragging) {
      const from = plugCenter(outputPlug);

      // Magnetic snap: smoothly pull the wire tip toward the nearest plug
      const sc = plugCenter(startPlug);
      const ec = plugCenter(settingsPlug);
      const d1 = distSq(dragCurrentX, dragCurrentY, sc.x, sc.y);
      const d2 = distSq(dragCurrentX, dragCurrentY, ec.x, ec.y);

      let tipX = dragCurrentX;
      let tipY = dragCurrentY;

      const r2 = SNAP_RADIUS_PX ** 2;
      if (d1 < r2) {
        const snap = 1 - Math.sqrt(d1) / SNAP_RADIUS_PX;
        tipX += (sc.x - dragCurrentX) * snap;
        tipY += (sc.y - dragCurrentY) * snap;
      } else if (d2 < r2) {
        const snap = 1 - Math.sqrt(d2) / SNAP_RADIUS_PX;
        tipX += (ec.x - dragCurrentX) * snap;
        tipY += (ec.y - dragCurrentY) * snap;
      }

      wireRenderer.updateDragPreviewPhysics(from.x, from.y, tipX, tipY);
    }

    if (connectedWire && connectedTarget) {
      const from = plugCenter(outputPlug);
      const to   = connectedTarget === 'start'
        ? plugCenter(startPlug)
        : plugCenter(settingsPlug);
      wireRenderer.updateLockedWire(connectedWire, from.x, from.y, to.x, to.y, deltaMs);
    }

    // ── Slurping (retracting) wires ───────────────────────────────────────
    for (let i = slurpingWires.length - 1; i >= 0; i--) {
      const wire = slurpingWires[i];
      const from = plugCenter(outputPlug);
      const done = wireRenderer.updateSlurpingWire(wire, from.x, from.y, deltaMs);
      if (done) {
        wireRenderer.finalizeWireRemoval(wire);
        slurpingWires.splice(i, 1);
      }
    }

    rafId = requestAnimationFrame(frame);
  }

  // ── Bootstrap ─────────────────────────────────────────────────────────────

  // First RAF: do layout and start the loop
  rafId = requestAnimationFrame((nowMs) => {
    lastFrameMs = nowMs;
    doLayout();
    // Fade in the overlay once layout is ready
    requestAnimationFrame(() => {
      overlay.classList.add('mm--visible');
    });
    rafId = requestAnimationFrame(frame);
  });

  // Re-layout on container resize
  const resizeObserver = new ResizeObserver(() => {
    layoutReady = false;
  });
  resizeObserver.observe(overlay);

  // ── Destroy ───────────────────────────────────────────────────────────────

  function destroy(): void {
    cancelAnimationFrame(rafId);
    resizeObserver.disconnect();
    // Clean up any remaining wires
    if (connectedWire) wireRenderer.finalizeWireRemoval(connectedWire);
    for (const w of slurpingWires) wireRenderer.finalizeWireRemoval(w);
    overlay.remove();
  }

  return { element: overlay, destroy };
}
