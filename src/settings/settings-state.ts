/** User-facing settings (persisted separately from game state). */
export interface SettingsState {
  musicVolume: number;     // 0–1
  sfxVolume: number;       // 0–1
  /** When true, music and SFX pause whenever the window loses focus or the tab is hidden. */
  isMusicOnlyWhenFocused: boolean;
  isReducedParticles: boolean;
  graphicsQuality: 'high' | 'low';
  isScreenShakeEnabled: boolean;
  colorTheme: 'dark' | 'light';
  backgroundStyle: 'vermiculate' | 'substrate' | 'none';
  /** Controls how large numbers are displayed: letter suffixes, scientific, or engineering notation. */
  numberFormat: 'letters' | 'scientific' | 'engineering';
  /** RPG enemy marker style. */
  rpgEnemyIndicatorStyle: 'triangle' | 'outline' | 'off';
  /** When true: all upgrades/unlocks are available regardless of cost; costs are not deducted. */
  isDevMode: boolean;
  /** When true, the RPG stats bar is anchored to the top of the screen instead of the bottom. */
  rpgBarAtTop: boolean;
  /** World map particle simulation quality. Defaults to 'full'. */
  worldMapParticleQuality: 'full' | 'reduced' | 'low';
}

export function createDefaultSettings(): SettingsState {
  return {
    musicVolume: 0.5,
    sfxVolume: 0.5,
    isMusicOnlyWhenFocused: true,
    isReducedParticles: false,
    graphicsQuality: 'high',
    isScreenShakeEnabled: true,
    colorTheme: 'dark',
    backgroundStyle: 'vermiculate',
    numberFormat: 'letters',
    rpgEnemyIndicatorStyle: 'triangle',
    isDevMode: false,
    rpgBarAtTop: false,
    worldMapParticleQuality: 'full',
  };
}

const SETTINGS_KEY = 'equatoria_settings';

export function loadSettings(): SettingsState {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) return createDefaultSettings();
    const parsed = JSON.parse(raw) as Partial<SettingsState>;
    return { ...createDefaultSettings(), ...parsed };
  } catch {
    return createDefaultSettings();
  }
}

export function saveSettings(settings: SettingsState): void {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch {
    // Storage might be full or unavailable — silently ignore
  }
}
