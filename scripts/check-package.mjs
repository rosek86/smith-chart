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
    '--prefer-offline',
    '--ignore-scripts',
    '--no-audit',
    '--no-fund',
    join(temp, packed.filename),
  ]);
  writeFileSync(
    join(temp, 'consumer.ts'),
    `
import { formatNumber, formatComplex, formatComplexPolar, reactanceToComponent, Smith, SmithScales, Complex, readReflection, parseTouchstone, SmithEventType, compareMarkerReadings, renormalizeReflection, renormalizeSamples } from 'smithkit';
import type { TraceSamples, TraceSample, TouchstoneData, SmithEvent, SmithReading, TraceOptions, TraceInfo, MarkerSnapshot, MarkerComparison } from 'smithkit';
const component = reactanceToComponent(-50, 1e9);
if (component?.kind === 'capacitor') { formatNumber(component.capacitanceFarads); }
formatComplex(Complex.one());
formatComplexPolar(Complex.i);
// @ts-expect-error Complex exposes only re/im component names.
Complex.one().real;
const entry: TraceSample = { frequencyHz: 1e9, reflectionCoefficient: [0, 0] };
const samples: TraceSamples = [entry];
const immutableSamples = [{ frequencyHz: 1e9, reflectionCoefficient: [0, 0] }] as const;
const readonlySamples: TraceSamples = immutableSamples;
Complex.from(immutableSamples[0].reflectionCoefficient);
void readonlySamples;
const parsed: TouchstoneData = parseTouchstone('# GHz S RI R 50\\n1 0 0');
const chart = new Smith(parsed.referenceImpedanceOhms);
const options: TraceOptions = { name: 'Consumer', color: '#123456', visible: true, mode: 'both', lineWidth: 2, pointRadius: 3 };
const traceId: string = chart.addTrace(samples, options);
const traces: TraceInfo[] = chart.getTraces();
const markerId: string | undefined = chart.addMarker(traceId, 0);
if (markerId) {
  chart.setMarkerSample(markerId, 0);
  const selected: boolean = chart.setMarkerFrequency(markerId, 1.2e9);
  void selected;
  const marker: MarkerSnapshot | undefined = chart.getMarker(markerId);
  const comparison: MarkerComparison | undefined = chart.compareMarkers(markerId, markerId);
  if (marker) { compareMarkerReadings(marker, marker); }
  chart.removeMarker(markerId);
  void comparison;
}
chart.setTraceOptions(traceId, { visible: false });
chart.updateTrace(traceId, samples);
chart.removeTrace(traceId);
void [traces, chart.referenceImpedanceOhms];
chart.draw(document.createElement('div'));
const scales = new SmithScales();
scales.draw(document.createElement('div'));
scales.update(Complex.zero());
scales.update(null);
scales.destroy();
const unsubscribe = chart.onEvent((event: SmithEvent) => {
  if (event.type === SmithEventType.Marker) {
    const frequency: number = event.data.frequencyHz;
    const id: string = event.data.markerId;
    void [frequency, id];
  } else if (event.type === SmithEventType.Cursor) {
    const reading: SmithReading | undefined = event.data;
    void reading;
  }
});
chart.renormalize(75);
chart.layers.resistance.setStyle({ majorWidth: 2 });
// @ts-expect-error Public lengths are numeric CSS pixels, not SVG strings.
chart.layers.resistance.setStyle({ majorWidth: '2' });
chart.peripheralScales.update(Complex.zero());
unsubscribe();
chart.clearTraces();
chart.destroy();
const events: (SmithReading | MarkerSnapshot)[] = [];
void [Complex, readReflection, SmithEventType, events];
`,
  );
  const examples = [
    ...readFileSync(join(repo, 'README.md'), 'utf8').matchAll(/```ts\n([\s\S]*?)```/g),
  ].map(([, source], index) => {
    const name = `readme-example-${index}.ts`;
    const context = [
      'export {};',
      !/^const chart\b/m.test(source) ? "declare const chart: import('smithkit').Smith;" : '',
      !/^const traceId\b/m.test(source) ? 'declare const traceId: string;' : '',
    ].join('\n');
    writeFileSync(join(temp, name), `${context}\n${source}`);
    return name;
  });
  assert.ok(examples.length > 0, 'Expected TypeScript examples in README.md.');
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
      ...examples,
    ]);
  }
  run('node', [
    '--input-type=module',
    '-e',
    `
import assert from 'node:assert/strict';
import { formatNumber, formatComplex, formatComplexPolar, reactanceToComponent, Smith, SmithScales, Complex, readReflection, parseTouchstone, compareMarkerReadings, renormalizeReflection, renormalizeSamples } from 'smithkit';
assert.equal(formatNumber(1e9) + 'Hz', '1 GHz');
assert.equal(reactanceToComponent(-50, 1e9).kind, 'capacitor');
assert.equal(typeof Smith.prototype.formatNumber, 'undefined');
const reading = { frequencyHz: 1e9, reflectionCoefficient: Complex.from(0.5), impedanceOhms: Complex.from(150) };
assert.equal(compareMarkerReadings(reading, reading).phaseDeltaDegrees, 0);
assert.equal(typeof SmithScales.prototype.update, 'function');
assert.equal(typeof Smith.prototype.destroy, 'function');
assert.equal(typeof Smith.prototype.updateTrace, 'function');
assert.equal(Complex.from(3, 4).abs(), 5);
assert.ok(Math.abs(renormalizeReflection(Complex.zero(), 75, 50).re - 0.2) < 1e-14);
assert.equal(renormalizeSamples([{frequencyHz: 1, reflectionCoefficient: [0, 0]}], 75, 50)[0].frequencyHz, 1);
assert.equal(readReflection(Complex.zero(), 75).impedanceOhms.re, 75);
assert.deepEqual(parseTouchstone('# GHz S RI R 50\\n1 0 0').samples, [{ frequencyHz: 1e9, reflectionCoefficient: [0, 0] }]);
`,
  ]);
  console.log(
    `Verified ${packed.filename}: contents, installation, ESM runtime, NodeNext/Bundler types, and ${examples.length} README examples.`,
  );
} finally {
  rmSync(temp, { recursive: true, force: true });
}
