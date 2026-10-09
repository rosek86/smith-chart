import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';

export default defineConfig({
  base: './',
  resolve: { alias: { smithkit: fileURLToPath(new URL('./src/index.ts', import.meta.url)) } },
  build: {
    outDir: 'dist/demo',
    target: 'es2022',
    sourcemap: true,
    rolldownOptions: {
      input: [
        'index.html',
        'examples/large-trace/index.html',
        'examples/index.html',
        'examples/static/index.html',
        'examples/touchstone/index.html',
        'examples/markers/index.html',
        'examples/appearance/index.html',
        'examples/export/index.html',
        'examples/basic/index.html',
      ],
    },
  },
});
