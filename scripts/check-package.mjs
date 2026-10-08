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
  const providedArchive = process.argv[2] ? resolve(process.argv[2]) : undefined;
  const [packed] = JSON.parse(
    run(
      'npm',
      providedArchive
        ? ['pack', providedArchive, '--dry-run', '--ignore-scripts', '--json']
        : ['pack', '--json', '--pack-destination', temp],
      repo,
    ),
  );
  const archive = providedArchive ?? join(temp, packed.filename);
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
    archive,
  ]);
  writeFileSync(
    join(temp, 'consumer.ts'),
    `
import { SmithFormatter, RfCalculations, Smith, SmithScales, Complex, Touchstone, SmithEventType, MarkerMeasurements } from 'smithkit';
import type { TraceSamples, TraceSample, TouchstoneData, SmithEvent, SmithReading, TraceOptions, TraceInfo, MarkerSnapshot, MarkerComparison } from 'smithkit';
const component = RfCalculations.reactanceToComponent(-50, 1e9);
if (component?.kind === 'capacitor') { SmithFormatter.number(component.capacitanceFarads); }
SmithFormatter.complex(Complex.one());
SmithFormatter.polar(Complex.i);
// @ts-expect-error Standalone parsing was replaced by the Touchstone class.
import { parseTouchstone } from 'smithkit';
// @ts-expect-error Stateless classes cannot be constructed.
new RfCalculations();
// @ts-expect-error Complex exposes only re/im component names.
Complex.one().real;
const entry: TraceSample = { frequencyHz: 1e9, reflectionCoefficient: [0, 0] };
const samples: TraceSamples = [entry];
const immutableSamples = [{ frequencyHz: 1e9, reflectionCoefficient: [0, 0] }] as const;
const readonlySamples: TraceSamples = immutableSamples;
Complex.from(immutableSamples[0].reflectionCoefficient);
void readonlySamples;
const parsed: TouchstoneData = Touchstone.parse('# GHz S RI R 50\\n1 0 0');
import type { SmithOptions, GridOptions, GridLayerOptions, CircleLayerOptions, CircleOptions, InteractionOptions, PeripheralScalesOptions } from 'smithkit';
const grid: GridOptions = { detail: 'basic', labelsVisible: true };
const gridLayer: GridLayerOptions = { visible: true, style: { majorWidth: 2 } };
const circles: CircleLayerOptions = { values: [1, 2] as const, visible: true };
const interaction: InteractionOptions = { zoom: true, cursor: true };
const peripheralScales: PeripheralScalesOptions = { visible: false };
const constantCircles: CircleOptions = { q: circles };
new Smith({ interaction, peripheralScales, circles: constantCircles });
// @ts-expect-error Flat interaction fields are not part of the grouped API.
new Smith({ zoomEnabled: true });
// @ts-expect-error Constant circles do not belong to the impedance/admittance grid.
new Smith({ grid: { layers: { q: circles } } });
// @ts-expect-error Per-ruler visibility is not supported.
new Smith({ peripheralScales: { phase: false } });
const configuration: SmithOptions = { referenceImpedanceOhms: parsed.referenceImpedanceOhms, appearance: { theme: 'dark' }, interaction: { zoom: false, cursor: true }, peripheralScales: { visible: false }, grid: { ...grid, layers: {resistance: gridLayer} }, circles: {q: circles, vswr: { values: [] }} };
const chart = new Smith(configuration);
chart.setOptions(configuration);
chart.setOptions({ interaction: { cursor: false }, grid: { layers: { resistance: { visible: true } } } });
// @ts-expect-error Patches use the same grouped schema as the constructor.
chart.setOptions({ cursorEnabled: true });
new Smith();
new Smith({});
chart.setGridDetail('basic');
chart.setCursorEnabled(true);
chart.setCursorEnabled(false);
// @ts-expect-error Cursor tracking requires a boolean.
chart.setCursorEnabled('false');
// @ts-expect-error Cursor configuration requires a boolean.
new Smith({ interaction: { cursor: 'true' } });
chart.layers.q.setValues([1, 2] as const);
// @ts-expect-error Positional constructor arguments are no longer supported.
new Smith(50);
// @ts-expect-error Unknown detail levels must not compile.
new Smith({ grid: { detail: 'sparse' } });
// @ts-expect-error Grid and circle layer options are distinct.
new Smith({ circles: {q: { detail: 'basic' }} });
// @ts-expect-error Shared detail accepts only documented levels.
chart.setGridDetail('sparse');
// @ts-expect-error Circle values are numeric.
chart.layers.vswr.setValues(['2']);
const options: TraceOptions = { name: 'Consumer', color: '#123456', visible: true, mode: 'both', lineWidth: 2, pointRadius: 3 };
const traceId: string = chart.addTrace(samples, options);
const traces: TraceInfo[] = chart.getTraces();
const markerId: string | undefined = chart.addMarker(traceId, 0);
if (markerId) {
  chart.setMarkerSample(markerId, 0);
  const focused: boolean = chart.focusMarker(markerId);
  void focused;
  const selected: boolean = chart.setMarkerFrequency(markerId, 1.2e9);
  void selected;
  const marker: MarkerSnapshot | undefined = chart.getMarker(markerId);
  const comparison: MarkerComparison | undefined = chart.compareMarkers(markerId, markerId);
  if (marker) { MarkerMeasurements.compare(marker, marker); }
  chart.removeMarker(markerId);
  void comparison;
}
chart.setTraceOptions(traceId, { visible: false });
import type { TraceUpdateOptions, MarkerSelectionStrategy } from 'smithkit';
const strategy: MarkerSelectionStrategy = 'frequency';
const updateOptions: TraceUpdateOptions = { markerSelection: strategy };
const updated: boolean = chart.updateTrace(traceId, samples, updateOptions);
void updated;
chart.updateTrace(traceId, samples, { markerSelection: 'sample-index' });
chart.updateTrace(traceId, samples, { markerSelection: 'reflection' });
// @ts-expect-error Unknown marker selection strategies must not compile.
chart.updateTrace(traceId, samples, { markerSelection: 'nearest' });
// @ts-expect-error Marker IDs are required, not historical numeric indices.
chart.setMarkerSample(0, 1);
chart.removeTrace(traceId);
void [traces, chart.referenceImpedanceOhms];
chart.setZoomEnabled(false);
chart.resetView();
chart.setZoomEnabled(true);
// @ts-expect-error Zoom must be explicitly enabled/disabled with a boolean.
chart.setZoomEnabled('false');
chart.draw(document.createElement('div'));
const scales = new SmithScales();
scales.draw(document.createElement('div'));
scales.update(Complex.zero());
scales.update(null);
scales.destroy();
const unsubscribe = chart.onEvent((event: SmithEvent) => {
  if (event.type === SmithEventType.Marker || event.type === SmithEventType.MarkerSelect) {
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
const chartSvg: string = chart.toSvg();
const scalesSvg: string = new SmithScales().toSvg();
void [chartSvg, scalesSvg];
chart.destroy();
const events: (SmithReading | MarkerSnapshot)[] = [];
void [Complex, RfCalculations.readReflection, SmithEventType, events];
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
import { SmithFormatter, RfCalculations, Smith, SmithScales, Complex, Touchstone, MarkerMeasurements } from 'smithkit';
assert.equal(SmithFormatter.number(1e9) + 'Hz', '1 GHz');
assert.equal(RfCalculations.reactanceToComponent(-50, 1e9).kind, 'capacitor');
assert.equal(typeof Smith.prototype.formatNumber, 'undefined');
assert.equal(typeof Touchstone.parse, 'function');
assert.equal(typeof SmithFormatter.complex, 'function');
assert.equal(typeof SmithFormatter.polar, 'function');
const reading = { frequencyHz: 1e9, reflectionCoefficient: Complex.from(0.5), impedanceOhms: Complex.from(150) };
assert.equal(MarkerMeasurements.compare(reading, reading).phaseDeltaDegrees, 0);
assert.equal(typeof SmithScales.prototype.update, 'function');
assert.equal(typeof Smith.prototype.destroy, 'function');
assert.equal(typeof Smith.prototype.setOptions, 'function');
await assert.rejects(import('smithkit/dist/lib/Smith.js'), { code: 'ERR_PACKAGE_PATH_NOT_EXPORTED' });
assert.equal(typeof Smith.prototype.toSvg, 'function');
assert.equal(typeof SmithScales.prototype.toSvg, 'function');
assert.equal(typeof Smith.prototype.updateTrace, 'function');
assert.equal(Complex.from(3, 4).abs(), 5);
assert.ok(Math.abs(RfCalculations.renormalizeReflection(Complex.zero(), 75, 50).re - 0.2) < 1e-14);
assert.equal(RfCalculations.renormalizeSamples([{frequencyHz: 1, reflectionCoefficient: [0, 0]}], 75, 50)[0].frequencyHz, 1);
assert.equal(RfCalculations.readReflection(Complex.zero(), 75).impedanceOhms.re, 75);
assert.deepEqual(Touchstone.parse('# GHz S RI R 50\\n1 0 0').samples, [{ frequencyHz: 1e9, reflectionCoefficient: [0, 0] }]);
`,
  ]);
  console.log(
    `Verified ${packed.filename}: contents, installation, ESM runtime, NodeNext/Bundler types, and ${examples.length} README examples.`,
  );
} finally {
  rmSync(temp, { recursive: true, force: true });
}
