import { resolve } from 'node:path';
import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    emptyOutDir: true,
    lib: {
      entry: resolve(import.meta.dirname, 'src/index.js'),
      name: 'FeedbackTool',
      formats: ['es'],
      fileName: () => 'index.js',
    },
    license: true,
    rollupOptions: {
      external: ['fabric', 'html2canvas'],
      output: {
        exports: 'named',
      },
    },
  },
});
