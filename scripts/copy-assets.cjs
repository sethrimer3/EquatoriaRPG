const fs = require('node:fs');
const path = require('node:path');

const rootDir = path.resolve(__dirname, '..');
const sourceRoot = path.join(rootDir, 'ASSETS');
const targetRoot = path.join(rootDir, 'dist', 'ASSETS');
const assetDirs = ['SPRITES', 'ANIMATIONS', 'font', 'music', 'sfx'];

if (!fs.existsSync(sourceRoot)) {
  throw new Error(`Missing asset directory: ${sourceRoot}`);
}

fs.mkdirSync(targetRoot, { recursive: true });

for (const dirName of assetDirs) {
  const sourceDir = path.join(sourceRoot, dirName);
  const targetDir = path.join(targetRoot, dirName);

  if (!fs.existsSync(sourceDir)) {
    console.warn(`Skipping missing asset folder: ASSETS/${dirName}`);
    continue;
  }

  fs.cpSync(sourceDir, targetDir, { recursive: true, force: true });
  console.log(`Copied ASSETS/${dirName} to dist/ASSETS/${dirName}`);
}
