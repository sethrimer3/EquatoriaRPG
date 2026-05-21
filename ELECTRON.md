# Equatoria RPG Electron Notes

Equatoria RPG is still a Vite browser game first. The Electron shell only loads the built files from `dist/` for local desktop play.

## Install Dependencies

```bash
npm install
```

On Windows, the `.bat` launchers install dependencies automatically when `node_modules` is missing. If `package-lock.json` exists, they use `npm ci`; otherwise they use `npm install`.

## Run Desktop Electron

The easiest Windows entry point is:

```text
run-desktop.bat
```

Manual command:

```bash
npm run desktop
```

This runs `npm run build:desktop`, copies `ASSETS/` into `dist/ASSETS/`, and launches Electron. The desktop build uses Vite mode `desktop`, which sets the Vite base path to `./` so module scripts, CSS, and assets resolve under `file://`.

## Run Browser Dev

Windows launcher:

```text
run-browser-dev.bat
```

Manual command:

```bash
npm run dev
```

The Vite dev server runs at `http://localhost:3000`.

## Build For Browser Or GitHub Pages

Windows launcher:

```text
build-game.bat
```

Manual command:

```bash
npm run build
```

The normal production build keeps the existing browser and GitHub Pages behavior. In GitHub Actions, `vite.config.ts` derives the hosted base path from `GITHUB_REPOSITORY`.

## Launcher Files

- `run-desktop.bat`: installs dependencies if needed, builds the desktop-friendly `dist/`, and opens Electron.
- `run-browser-dev.bat`: installs dependencies if needed and starts the Vite dev server.
- `build-game.bat`: installs dependencies if needed and creates a production `dist/` build.

## Saves

The game uses `localStorage` for save data and settings. Electron keeps its own localStorage profile for the local desktop app, so browser saves and Electron saves are separate unless a future migration tool is added.

## Troubleshooting

If Electron opens to a black screen, run:

```bash
npm run build:desktop
npm run electron
```

Check that `dist/index.html` exists and that `dist/ASSETS/` contains `SPRITES`, `ANIMATIONS`, `font`, `music`, and `sfx`.

If assets are missing, rerun the build and confirm `scripts/copy-assets.cjs` printed copy messages. Missing module scripts, CSS, fonts, images, or audio in Electron usually mean the desktop build was not used or the asset copy step did not complete.
