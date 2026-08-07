import { resolve } from 'node:path';
import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    emptyOutDir: true,
    lib: {
      entry: resolve(import.meta.dirname, 'src/index.js'),
      name: 'FeedbackTool',
      formats: ['es', 'iife'],
      fileName: (format) => `feedback-tool.${format}.js`,
    },
    license: true,
    rolldownOptions: {
      output: {
        exports: 'named',
      },
    },
  },
});
