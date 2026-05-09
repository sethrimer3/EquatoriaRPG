/**
 * world-map-detail-panel.ts — Detail panel DOM renderer for WorldMapScreen.
 *
 * Extracted from WorldMapScreen.ts to reduce that file's size and isolate all
 * detail-panel construction logic in one place.
 *
 * `renderDetailPanel(ctx)` rebuilds the panel's DOM from scratch whenever the
 * selected world changes.  All dependencies (state, callbacks, etc.) are passed
 * through the `DetailPanelCtx` DI interface — no module-level state is kept.
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
import { levelStateIcon } from './world-map-color-utils';

// ── Dependency-injection context ─────────────────────────────────────────────

export interface DetailPanelCtx {
  /** The container element whose children are replaced on each call. */
  detailPanelEl: HTMLElement;
  /** Currently selected world node, or null when nothing is selected. */
  selectedWorldId: WorldId | null;
  /** Current world map progression state (read-only). */
  state: WorldMapProgressionState;
  /**
   * Called after a dev-mode right-click completes a level so the caller can
   * refresh both the canvas map and the detail panel.
   */
  onRefresh(): void;
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Rebuilds the detail panel DOM from scratch based on the current context.
 * Replaces `detailPanelEl.innerHTML` completely on every call.
 */
export function renderDetailPanel(ctx: DetailPanelCtx): void {
  const { detailPanelEl, selectedWorldId, state, onRefresh } = ctx;
  detailPanelEl.innerHTML = '';

  if (!selectedWorldId) {
    const empty = document.createElement('div');
    empty.className = 'wm-detail-empty';
    empty.textContent = 'Select a world node on the map to see its details.';
    detailPanelEl.appendChild(empty);
    return;
  }

  const worldData = WORLD_MAP_DATA.find(w => w.id === selectedWorldId);
  if (!worldData) return;

  const worldUnlockState = getWorldUnlockState(state, selectedWorldId);
  const isLocked = worldUnlockState === 'locked';

  const content = document.createElement('div');
  content.className = 'wm-detail-content';
  detailPanelEl.appendChild(content);

  // ── World header ──
  const worldHeader = document.createElement('div');
  worldHeader.className = 'wm-world-header';

  const chapterEl = document.createElement('div');
  chapterEl.className = 'wm-world-chapter';
  chapterEl.textContent = `Chapter ${worldData.chapter}`;

  const titleEl = document.createElement('div');
  titleEl.className = 'wm-world-title';
  titleEl.textContent = worldData.name;

  const subtitleEl = document.createElement('div');
  subtitleEl.className = 'wm-world-subtitle';
  subtitleEl.textContent = worldData.subtitle;

  worldHeader.appendChild(chapterEl);
  worldHeader.appendChild(titleEl);
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

    const nameWrap = document.createElement('div');
    nameWrap.className = 'wm-level-name-wrap';

    const name = document.createElement('span');
    name.className = 'wm-level-name';
    name.textContent = level.name;
    nameWrap.appendChild(name);

    // Show a one-line description for unlocked/completed levels so players know
    // what to expect before entering.
    if (levelState !== 'locked' && level.description) {
      const desc = document.createElement('span');
      desc.className = 'wm-level-desc';
      desc.textContent = level.description;
      nameWrap.appendChild(desc);
    }

    const num = document.createElement('span');
    num.className = 'wm-level-number';
    num.textContent = level.type === 'boss' ? 'BOSS' : `${level.number}`;

    item.appendChild(icon);
    item.appendChild(nameWrap);
    item.appendChild(num);

    // Click to start an unlocked/current level
    if (levelState === 'unlocked' || levelState === 'current') {
      const capturedWorldId = selectedWorldId;
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
          onRefresh();
        });
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

      // Boss mechanics list
      if (level.bossMechanics && level.bossMechanics.length > 0) {
        const mechList = document.createElement('ul');
        mechList.className = 'wm-boss-mechanics';
        for (const mech of level.bossMechanics) {
          const mechItem = document.createElement('li');
          mechItem.textContent = mech;
          mechList.appendChild(mechItem);
        }
        bossCard.appendChild(mechList);
      }

      mandatoryList.appendChild(bossCard);
    }

    // Reward badge for completed levels
    if (levelState === 'completed' && level.reward) {
      const rewardBadge = document.createElement('div');
      rewardBadge.className = 'wm-level-reward';
      rewardBadge.textContent = `✦ ${level.reward}`;
      mandatoryList.appendChild(rewardBadge);
    }
  }

  mandatorySection.appendChild(mandatoryList);
  content.appendChild(mandatorySection);

  // ── Base 6 challenges ──
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

    const nameWrap = document.createElement('div');
    nameWrap.className = 'wm-level-name-wrap';

    const name = document.createElement('span');
    name.className = 'wm-level-name';
    name.textContent = challenge.name.replace(/^Base 6 Trial:\s*/i, '');
    nameWrap.appendChild(name);

    // Show the challenge rule as a subtitle when unlocked or completed.
    if (itemState !== 'locked' && challenge.challengeRule) {
      const ruleEl = document.createElement('span');
      ruleEl.className = 'wm-level-desc';
      ruleEl.textContent = challenge.challengeRule;
      nameWrap.appendChild(ruleEl);
    }

    const badge = document.createElement('span');
    badge.className = 'wm-level-number';
    badge.textContent = `B${challenge.base6Number}`;

    item.appendChild(icon);
    item.appendChild(nameWrap);
    item.appendChild(badge);
    item.title = unlocked ? challenge.challengeRule : 'Complete Level 5 to unlock Base 6 challenges.';

    if (itemState === 'unlocked') {
      const capturedWorldId = selectedWorldId;
      item.addEventListener('click', () => {
        startOptionalChallenge(capturedWorldId, challenge.id);
      });
    }

    // Dev: right-click marks Base6 challenge complete for testing
    if (state.devMode && itemState !== 'completed') {
      const capturedWorldId = selectedWorldId;
      item.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        markLevelComplete(state, capturedWorldId, challenge.id);
        onRefresh();
      });
    }

    base6List.appendChild(item);

    // Reward badge for completed Base6 challenges
    if (itemState === 'completed' && challenge.reward) {
      const rewardBadge = document.createElement('div');
      rewardBadge.className = 'wm-level-reward';
      rewardBadge.textContent = `✦ ${challenge.reward}`;
      base6List.appendChild(rewardBadge);
    }
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
