import type { Page } from '@playwright/test';
import { resolve } from 'node:path';
import { build } from 'vite';

declare global {
  interface Window {
    SmithTest: typeof import('../../src/index');
  }
}

let bundle: Promise<string> | undefined;

export async function loadLibrary(page: Page): Promise<void> {
  bundle ??= build({
    configFile: false,
    logLevel: 'silent',
    build: {
      lib: { entry: resolve('src/index.ts'), name: 'SmithTest', formats: ['iife'] },
      write: false,
      minify: false,
    },
  }).then((result) => {
    const output = Array.isArray(result) ? result[0] : result;
    if (!('output' in output)) {
      throw new Error('Expected a library bundle.');
    }
    const chunk = output.output.find((item) => item.type === 'chunk');
    if (!chunk) {
      throw new Error('The library bundle contains no JavaScript.');
    }
    return chunk.code;
  });
  await page.addScriptTag({ content: await bundle });
}
