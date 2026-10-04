import { execFileSync } from 'node:child_process';
import { rmSync } from 'node:fs';

// Keep the library and demo outputs independent, and remove stale library modules.
rmSync(new URL('../dist/lib/', import.meta.url), { recursive: true, force: true });
execFileSync('tsc', ['-p', 'tsconfig.lib.json'], {
  stdio: 'inherit',
  shell: process.platform === 'win32',
});
