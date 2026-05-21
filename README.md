# Equatoria RPG

Equatoria RPG is an epic math-, physics-, and particle-driven action RPG built with TypeScript.

## Vision

- Fast, kinetic particle combat and world simulation
- Math-forward progression systems that reward strategy and build crafting
- Physics-rich encounters, waves, and bosses with readable UI overlays

## Development Plan

1. Expand particle-based combat depth (weapons, interactions, emergent effects).
2. Deepen physics systems for enemy behavior, arena dynamics, and battlefield control.
3. Grow RPG progression with meaningful upgrades, loadouts, and long-term goals.
4. Polish game feel (audio, visual feedback, motion clarity, and responsiveness).

## Quick Start

```bash
npm install
npm run dev      # Development server on http://localhost:3000
npm run build    # Production build to dist/
npm run typecheck # TypeScript type checking
```

## Windows Launchers

The easiest local desktop entry point is `run-desktop.bat`. Double-click it from Windows Explorer to install dependencies if needed, build the desktop-friendly `dist/`, and launch the game in Electron.

- `run-desktop.bat` builds and runs the Electron desktop version.
- `run-browser-dev.bat` starts the normal Vite browser dev server at `http://localhost:3000`.
- `build-game.bat` runs the normal production build for static hosting/GitHub Pages.

Manual Electron commands:

```bash
npm run build:desktop
npm run electron
```

See [ELECTRON.md](./ELECTRON.md) for troubleshooting, save-profile notes, and asset-loading checks.

## Project Structure

```
src/
  app/         — game bootstrap and main loop
  sim/         — simulation and progression
  render/      — canvas rendering, particles, combat visuals
  ui/          — DOM-based menus, tabs, panels
  input/       — input event translation
  data/        — definitions, upgrades, and balance constants
  settings/    — user settings and save/load
  util/        — formatting helpers
```

See [ARCHITECTURE.md](./ARCHITECTURE.md) for detailed system documentation.
See [DECISIONS.md](./DECISIONS.md) for technical decision rationale.
See [file_index.md](./file_index.md) for per-file documentation.
