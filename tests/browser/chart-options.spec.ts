import { expect, test } from '@playwright/test';
import { loadLibrary } from './library';

test.beforeEach(async ({ page }) => {
  await page.setContent('<div id="chart" style="width:600px;height:600px"></div>');
  await loadLibrary(page);
});

test('constructor settings apply shared defaults, then per-layer overrides without retaining input', async ({
  page,
}) => {
  const result = await page.evaluate(() => {
    const options: import('../../src').SmithOptions = {
      referenceImpedanceOhms: 75,
      appearance: { theme: 'dark' },
      zoomEnabled: false,
      peripheralScalesVisible: false,
      grid: { detail: 'basic', labelsVisible: false, style: { stroke: '#123456', majorWidth: 2 } },
      layers: {
        resistance: { labelsVisible: true, style: { stroke: '#abcdef' } },
        conductance: { visible: true, detail: 'standard' },
        q: { visible: true, values: [1, 2, 2], style: { stroke: '#654321', strokeWidth: 3 } },
        vswr: { visible: true, values: [], style: { stroke: '#fedcba' } },
      },
    };
    const chart = new window.SmithTest.Smith(options);
    options.grid!.style!.majorWidth = 8;
    options.grid!.detail = 'detailed';
    options.layers!.q!.values = [5];
    chart.draw('#chart');
    const svg = document.querySelector('svg')!;
    const grids = (['resistance', 'reactance', 'conductance', 'susceptance'] as const).map(
      (name) => {
        const group = svg.querySelector(`[data-layer=${name}]`)!;
        const major = group.children[1];
        const shape = major.firstElementChild!;
        return {
          name,
          count: major.childElementCount,
          visible: group.getAttribute('opacity') !== '0',
          labels:
            svg.querySelector(`[data-label-layer=${name}]`)!.getAttribute('display') !== 'none',
          stroke: getComputedStyle(shape).stroke,
          width: getComputedStyle(shape).strokeWidth,
        };
      },
    );
    const q = svg.querySelector('g[stroke="#654321"]')!;
    const vswr = svg.querySelector('g[stroke="#fedcba"]')!;
    const transform = svg.firstElementChild!.getAttribute('transform');
    const wheel = new WheelEvent('wheel', { deltaY: -100, cancelable: true, bubbles: true });
    svg.dispatchEvent(wheel);
    chart.setAppearance({ theme: 'light' });
    const retainedStroke = getComputedStyle(
      svg.querySelector('[data-layer=resistance] > g:last-child > *')!,
    ).stroke;
    const output = {
      reference: chart.referenceImpedanceOhms,
      grids,
      qCount: q.querySelectorAll('path').length,
      qVisible: q.getAttribute('opacity') !== '0',
      qWidth: getComputedStyle(q.firstElementChild!).strokeWidth,
      vswrCount: vswr.childElementCount,
      zoomDisabled:
        !wheel.defaultPrevented && transform === svg.firstElementChild!.getAttribute('transform'),
      retainedStroke,
    };
    chart.destroy();
    return output;
  });
  expect(result).toMatchObject({
    reference: 75,
    qCount: 4,
    qVisible: true,
    qWidth: '3px',
    vswrCount: 0,
    zoomDisabled: true,
    retainedStroke: 'rgb(171, 205, 239)',
  });
  expect(result.grids[0]).toMatchObject({
    count: 5,
    visible: true,
    labels: true,
    stroke: 'rgb(171, 205, 239)',
    width: '2px',
  });
  expect(result.grids[1]).toMatchObject({
    count: 11,
    visible: true,
    labels: false,
    stroke: 'rgb(18, 52, 86)',
    width: '2px',
  });
  expect(result.grids[2].count).toBeGreaterThan(5);
  expect(result.grids[2]).toMatchObject({ visible: true, labels: false });
  expect(result.grids[3]).toMatchObject({ count: 11, visible: false, labels: false });
});

test('invalid constructor settings reject and disconnect allocated observers', async ({ page }) => {
  const result = await page.evaluate(() => {
    let active = 0;
    const OriginalObserver = window.ResizeObserver;
    window.ResizeObserver = class extends OriginalObserver {
      constructor(callback: ResizeObserverCallback) {
        super(callback);
        active++;
      }
      disconnect(): void {
        super.disconnect();
        active--;
      }
    };
    const invalid: unknown[] = [
      null,
      50,
      [],
      { referenceImpedanceOhms: 0 },
      { referenceImpedanceOhms: null },
      { appearance: { theme: 'invalid' } },
      { zoomEnabled: 'false' },
      { peripheralScalesVisible: 0 },
      { grid: null },
      { layers: [] },
      { grid: { detail: 'invalid' } },
      { grid: { style: { majorWidth: -1 } } },
      { layers: { resistance: { labelsVisible: 1 } } },
      { layers: { q: { values: [1, 0] } } },
      { layers: { vswr: { values: [0.5] } } },
      { layers: { q: { values: '1' } } },
    ];
    const rejected = invalid.map((options) => {
      try {
        new window.SmithTest.Smith(options as import('../../src').SmithOptions);
        return false;
      } catch (error) {
        return error instanceof TypeError || error instanceof RangeError;
      }
    });
    window.ResizeObserver = OriginalObserver;
    return { rejected, active };
  });
  expect(result.rejected.every(Boolean)).toBe(true);
  expect(result.active).toBe(0);
});

test('shared detail and circle replacement preserve presentation and reject invalid changes atomically', async ({
  page,
}) => {
  const result = await page.evaluate(() => {
    const values = [1, 2];
    const chart = new window.SmithTest.Smith({
      grid: { labelsVisible: false, style: { stroke: '#123456' } },
      layers: { q: { values, style: { stroke: '#654321' } } },
    });
    chart.draw('#chart');
    values.push(5);
    chart.layers.q.addValue(3);
    const svg = document.querySelector('svg')!;
    const q = svg.querySelector('g[stroke="#654321"]')!;
    const copied = q.querySelectorAll('path').length === 6;
    chart.layers.q.setValues([2, 2]);
    const replaced = q.querySelectorAll('path').length === 2 && q.getAttribute('opacity') === '0';
    const before = svg.outerHTML;
    let rejected = 0;
    for (const action of [
      () => chart.layers.q.setValues([4, -1]),
      () => chart.setGridDetail('invalid' as 'basic'),
    ]) {
      try {
        action();
      } catch (error) {
        if (error instanceof RangeError) {
          rejected++;
        }
      }
    }
    const atomic = before === svg.outerHTML;
    chart.setGridDetail('basic');
    const basic = ['resistance', 'reactance', 'conductance', 'susceptance'].map((name) => {
      const group = svg.querySelector(`[data-layer=${name}]`)!;
      return {
        count: group.children[1].childElementCount,
        visible: group.getAttribute('opacity') !== '0',
        labels: svg.querySelector(`[data-label-layer=${name}]`)!.getAttribute('display'),
        stroke: getComputedStyle(group.children[1].firstElementChild!).stroke,
      };
    });
    chart.setGridDetail('detailed');
    const restored = [
      ...svg.querySelectorAll('[data-layer=resistance] > g, [data-layer=conductance] > g'),
    ].every((group) => group.getAttribute('opacity') !== '0');
    chart.layers.q.setValues([]);
    const cleared = q.childElementCount === 0;
    chart.destroy();
    let disposed = 0;
    for (const action of [
      () => chart.setGridDetail('basic'),
      () => chart.layers.q.setValues([1]),
    ]) {
      try {
        action();
      } catch {
        disposed++;
      }
    }
    return { copied, replaced, rejected, atomic, basic, restored, cleared, disposed };
  });
  expect(result).toMatchObject({
    copied: true,
    replaced: true,
    rejected: 2,
    atomic: true,
    restored: true,
    cleared: true,
    disposed: 2,
  });
  expect(result.basic.map((layer) => layer.count)).toEqual([5, 11, 5, 11]);
  expect(result.basic.map((layer) => layer.visible)).toEqual([true, true, false, false]);
  for (const layer of result.basic) {
    expect(layer).toMatchObject({ labels: 'none', stroke: 'rgb(18, 52, 86)' });
  }
});

test('default charts have no implicit markers, including after replacement and renormalization', async ({
  page,
}) => {
  const result = await page.evaluate(() => {
    const charts = [new window.SmithTest.Smith(), new window.SmithTest.Smith({})];
    return charts.map((chart) => {
      chart.draw('#chart');
      const samples = [{ frequencyHz: 1e9, reflectionCoefficient: [0.2, 0.3] as const }];
      const trace = chart.addTrace(samples);
      chart.updateTrace(trace, samples);
      chart.renormalize(75);
      const empty =
        chart.getTraces()[0].markers.length === 0 && !document.querySelector('[data-role=marker]');
      const marker = chart.addMarker(trace)!;
      const number = chart.getMarker(marker)!.markerNumber;
      chart.removeMarker(marker);
      chart.updateTrace(trace, samples);
      const stillEmpty = chart.getTraces()[0].markers.length === 0;
      chart.destroy();
      return { empty, number, stillEmpty };
    });
  });
  expect(result).toEqual([
    { empty: true, number: 1, stillEmpty: true },
    { empty: true, number: 1, stillEmpty: true },
  ]);
});
