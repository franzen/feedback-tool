import { resolve } from 'node:path';
import { defineConfig } from 'vite';
import manifest from './package.json' with { type: 'json' };

// Runtime dependencies stay external so host bundlers can deduplicate them.
// Derived from package.json so the list cannot drift from what consumers install.
const runtimeDependencies = Object.keys(manifest.dependencies);
const isExternal = (id) =>
  id.startsWith('node:') || runtimeDependencies.some((name) => id === name || id.startsWith(`${name}/`));

export default defineConfig({
  build: {
    emptyOutDir: true,
    lib: {
      entry: {
        index: resolve(import.meta.dirname, 'src/index.js'),
        server: resolve(import.meta.dirname, 'src/server/index.js'),
      },
      name: 'FeedbackTool',
      formats: ['es'],
      fileName: (_format, entryName) => `${entryName}.js`,
    },
    license: true,
    rollupOptions: {
      external: isExternal,
      output: {
        exports: 'named',
      },
    },
  },
});
