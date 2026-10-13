import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import tailwindcss from '@tailwindcss/postcss';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

const projectRoot = fileURLToPath(new URL('.', import.meta.url));
const base = process.env.DEMO_BASE_PATH ?? '/wonders-ex-fan-game/';

// Restrict this to a same-origin path so all game media stays in the artifact.
if (!/^\/(?:[A-Za-z0-9_-]+\/)*$/.test(base)) {
  throw new Error(
    'DEMO_BASE_PATH must be / or a path such as /wonders-ex-fan-game/.',
  );
}

export default defineConfig({
  root: fileURLToPath(new URL('./demo', import.meta.url)),
  base,
  publicDir: fileURLToPath(new URL('./public', import.meta.url)),
  resolve: { alias: { '@': projectRoot } },
  css: { postcss: { plugins: [tailwindcss()] } },
  plugins: [
    react(),
    {
      name: 'demo-notices',
      generateBundle() {
        this.emitFile({ type: 'asset', fileName: '.nojekyll', source: '' });
        this.emitFile({
          type: 'asset',
          fileName: 'ASSET_CREDITS.md',
          source: readFileSync(
            new URL('./ASSET_CREDITS.md', import.meta.url),
            'utf8',
          ),
        });
      },
    },
  ],
  build: {
    outDir: fileURLToPath(new URL('./dist-demo', import.meta.url)),
    emptyOutDir: true,
  },
});
