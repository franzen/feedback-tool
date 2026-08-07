import { resolve } from 'node:path';
import { defineConfig } from 'vite';

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
      external: ['fabric', 'html2canvas', /^node:/],
      output: {
        exports: 'named',
      },
    },
  },
});
