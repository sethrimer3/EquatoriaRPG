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
