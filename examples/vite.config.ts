import { defineConfig } from 'vite';

export default defineConfig({
  base: './',
  build: {
    rolldownOptions: {
      input: [
        'index.html',
        'static/index.html',
        'markers/index.html',
        'appearance/index.html',
        'export/index.html',
        'basic/index.html',
      ],
    },
  },
});
