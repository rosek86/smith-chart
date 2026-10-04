import { defineConfig } from 'vite';

export default defineConfig({
  base: './',
  build: { outDir: 'dist/demo', target: 'es2022', sourcemap: true },
});
