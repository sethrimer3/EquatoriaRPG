# Equatoria Idle

The RPG form.

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
  sim/         — simulation (equation, resources, progression)
  render/      — canvas rendering (equation, particles)
  ui/          — DOM-based menus, tabs, panels
  input/       — input event translation
  data/        — tier definitions, upgrades, balance constants
  settings/    — user settings and save/load
  util/        — formatting helpers
```

See [ARCHITECTURE.md](./ARCHITECTURE.md) for detailed system documentation.
See [DECISIONS.md](./DECISIONS.md) for technical decision rationale.
See [file_index.md](./file_index.md) for per-file documentation.
