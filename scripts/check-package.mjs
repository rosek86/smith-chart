import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

const repo = resolve(import.meta.dirname, '..');
const temp = mkdtempSync(join(tmpdir(), 'smithkit-package-'));
const manifest = JSON.parse(readFileSync(join(repo, 'package.json'), 'utf8'));
const run = (command, args, cwd = temp) =>
  execFileSync(command, args, { cwd, encoding: 'utf8', timeout: 120_000 });

try {
  const [packed] = JSON.parse(run('npm', ['pack', '--json', '--pack-destination', temp], repo));
  assert.equal(packed.name, 'smithkit');
  assert.equal(packed.version, manifest.version);
  for (const file of packed.files) {
    assert.ok(
      file.path.startsWith('dist/lib/') ||
        ['package.json', 'README.md', 'LICENSE'].includes(file.path),
      `Unexpected package file: ${file.path}`,
    );
  }
  writeFileSync(join(temp, 'package.json'), JSON.stringify({ private: true, type: 'module' }));
  run('npm', [
    'install',
    '--offline',
    '--ignore-scripts',
    '--no-audit',
    '--no-fund',
    join(temp, packed.filename),
  ]);
  writeFileSync(
    join(temp, 'consumer.ts'),
    `
import { Smith, Complex, SmithConstantCircle, parseTouchstone, SmithEventType } from 'smithkit';
import type { S1P, S1PEntry, TouchstoneData, SmithEvent, SmithCursorEvent, SmithMarkerEvent } from 'smithkit';
const entry: S1PEntry = { freq: 1e9, point: [0, 0] };
const samples: S1P = [entry];
const parsed: TouchstoneData = parseTouchstone('# GHz S RI R 50\\n1 0 0');
const chart = new Smith(parsed.referenceImpedance);
chart.draw(document.createElement('div'));
const index: number | undefined = chart.addS1P(samples);
if (index !== undefined) {
  const updated: boolean = chart.updateS1P(index, samples);
  const removed: boolean = chart.removeS1P(index);
  void [updated, removed];
}
chart.setUserActionHandler((event: SmithEvent) => console.log(event));
chart.setUserActionHandler(null);
chart.clearS1P();
chart.destroy();
const events: (SmithCursorEvent | SmithMarkerEvent)[] = [];
void [Complex, SmithConstantCircle, SmithEventType, events];
`,
  );
  for (const [module, resolution] of [
    ['NodeNext', 'NodeNext'],
    ['ESNext', 'Bundler'],
  ]) {
    run(join(repo, 'node_modules/.bin/tsc'), [
      '--strict',
      '--noEmit',
      '--target',
      'ES2022',
      '--module',
      module,
      '--moduleResolution',
      resolution,
      'consumer.ts',
    ]);
  }
  run('node', [
    '--input-type=module',
    '-e',
    `
import assert from 'node:assert/strict';
import { Smith, Complex, SmithConstantCircle, parseTouchstone } from 'smithkit';
assert.equal(typeof Smith.prototype.destroy, 'function');
assert.equal(typeof Smith.prototype.updateS1P, 'function');
assert.equal(Complex.from(3, 4).abs(), 5);
assert.equal(new SmithConstantCircle().frequencyFromWaveLength(1), 299792458);
assert.deepEqual(parseTouchstone('# GHz S RI R 50\\n1 0 0').values, [{ freq: 1e9, point: [0, 0] }]);
`,
  ]);
  console.log(
    `Verified ${packed.filename}: contents, installation, ESM runtime, and NodeNext/Bundler types.`,
  );
} finally {
  rmSync(temp, { recursive: true, force: true });
}
