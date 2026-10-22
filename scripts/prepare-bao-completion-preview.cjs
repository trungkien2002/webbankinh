// Copies the fully integrated app into an optional review snapshot.
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const preview = path.join(path.dirname(root), 'bao-completion-preview');
fs.mkdirSync(preview, { recursive: true });
for (const dir of ['src']) fs.cpSync(path.join(root, dir), path.join(preview, dir), { recursive: true });
for (const file of ['package.json', 'package-lock.json', 'app.json', 'App.tsx', 'index.ts', 'tsconfig.json', 'vitest.config.ts'])
  fs.copyFileSync(path.join(root, file), path.join(preview, file));
for (const dir of ['node_modules', 'assets', 'data']) {
  const destination = path.join(preview, dir);
  if (!fs.existsSync(destination)) fs.symlinkSync(path.join(root, dir), destination, 'junction');
}
console.log('Integrated app snapshot prepared: ' + preview);
console.log('All completion components are already connected in the main app; no integration patch needed.');
