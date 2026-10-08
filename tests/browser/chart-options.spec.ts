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
      interaction: { zoom: false },
      peripheralScales: { visible: false },
      grid: {
        detail: 'basic',
        labelsVisible: false,
        style: { stroke: '#123456', majorWidth: 2 },
        layers: {
          resistance: { labelsVisible: true, style: { stroke: '#abcdef' } },
          conductance: { visible: true, detail: 'standard' },
        },
      },
      circles: {
        q: { visible: true, values: [1, 2, 2], style: { stroke: '#654321', strokeWidth: 3 } },
        vswr: { visible: true, values: [], style: { stroke: '#fedcba' } },
      },
    };
    const chart = new window.SmithTest.Smith(options);
    options.grid!.style!.majorWidth = 8;
    options.grid!.detail = 'detailed';
    options.circles!.q!.values = [5];
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
      { interaction: { zoom: 'false' } },
      { interaction: { cursor: 'false' } },
      { peripheralScales: { visible: 0 } },
      { grid: null },
      { interaction: null },
      { peripheralScales: [] },
      { circles: null },
      { zoomEnabled: true },
      { interaction: { zoomEnabled: true } },
      { grid: { layers: { q: {} } } },
      { circles: { resistance: {} } },
      { peripheralScales: { phase: false } },
      { grid: { layers: [] } },
      { grid: { detail: 'invalid' } },
      { grid: { style: { majorWidth: -1 } } },
      { grid: { layers: { resistance: { labelsVisible: 1 } } } },
      { circles: { q: { values: [1, 0] } } },
      { circles: { vswr: { values: [0.5] } } },
      { circles: { q: { values: '1' } } },
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
      circles: { q: { values, style: { stroke: '#654321' } } },
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

test('default and partially configured charts render a static standard impedance grid', async ({
  page,
}) => {
  const results = await page.evaluate(async () => {
    const results = [];
    for (const options of [undefined, {}, { appearance: { theme: 'dark' as const } }]) {
      const chart = new window.SmithTest.Smith(options);
      chart.draw('#chart');
      const svg = document.querySelector('svg')!;
      const surface = svg.querySelector<SVGCircleElement>('circle[fill=transparent]')!;
      const box = surface.getBoundingClientRect();
      const events: string[] = [];
      chart.onEvent((event) => events.push(event.type));
      surface.dispatchEvent(
        new PointerEvent('pointermove', {
          clientX: box.x + box.width / 2,
          clientY: box.y + box.height / 2,
        }),
      );
      surface.dispatchEvent(new PointerEvent('pointerleave'));
      const transform = svg.firstElementChild!.getAttribute('transform');
      const wheel = new WheelEvent('wheel', { deltaY: -100, bubbles: true, cancelable: true });
      svg.dispatchEvent(wheel);
      await new Promise((resolve) => setTimeout(resolve, 20));
      const layers = ['resistance', 'reactance', 'conductance', 'susceptance'].map((name) => {
        const layer = svg.querySelector(`[data-layer=${name}]`)!;
        return {
          visible: layer.getAttribute('opacity') !== '0',
          minorHidden: layer.children[0].getAttribute('opacity') === '0',
          count: layer.children[1].childElementCount,
        };
      });
      const readingEvents = events.length;
      const trace = chart.addTrace([
        { frequencyHz: 1e9, reflectionCoefficient: [0, 0] },
        { frequencyHz: 2e9, reflectionCoefficient: [0.5, 0] },
      ]);
      const markersAbsent = chart.getTraces()[0].markers.length === 0;
      const marker = chart.addMarker(trace)!;
      chart.focusMarker(marker);
      document.activeElement!.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }),
      );
      const markerWorks = chart.getMarker(marker)!.sampleIndex === 1;
      const exported = new DOMParser().parseFromString(chart.toSvg(), 'image/svg+xml');
      results.push({
        readingEvents,
        markersAbsent,
        markerWorks,
        labelsVisible: [...svg.querySelectorAll('[data-label-layer=resistance] text')].some(
          (text) => getComputedStyle(text).display !== 'none',
        ),
        scalesHidden:
          svg.querySelector('[data-layer=peripheral-scales]')!.getAttribute('opacity') === '0',
        cursorHidden: svg.querySelector('.smith-cursor')!.getAttribute('opacity') === '0',
        viewUnchanged: svg.firstElementChild!.getAttribute('transform') === transform,
        scrollingUnblocked: !wheel.defaultPrevented,
        exportedScalesHidden:
          exported.querySelector<SVGElement>('[data-layer=peripheral-scales]')!.style.opacity ===
          '0',
        layers,
      });
      chart.destroy();
    }
    return results;
  });
  for (const result of results) {
    expect(result).toMatchObject({
      readingEvents: 0,
      markersAbsent: true,
      markerWorks: true,
      labelsVisible: true,
      scalesHidden: true,
      cursorHidden: true,
      viewUnchanged: true,
      scrollingUnblocked: true,
      exportedScalesHidden: true,
    });
    expect(result.layers.map((layer) => layer.visible)).toEqual([true, true, false, false]);
    expect(result.layers.every((layer) => layer.minorHidden)).toBe(true);
    expect(result.layers[0].count).toBeGreaterThan(5);
    expect(result.layers[1].count).toBeGreaterThan(11);
  }
});

test('cursor tracking can be enabled independently, disabled during a queued move, and safely re-enabled', async ({
  page,
}) => {
  const result = await page.evaluate(async () => {
    const chart = new window.SmithTest.Smith({ interaction: { cursor: true } });
    chart.draw('#chart');
    const events: boolean[] = [];
    chart.onEvent((event) => {
      if (event.type === window.SmithTest.SmithEventType.Cursor) {
        events.push(Boolean(event.data));
        if (!event.data) {
          // Calling the setter from a clearing notification must be safe and idempotent.
          chart.setCursorEnabled(false);
        }
      }
    });
    const surface = document.querySelector<SVGCircleElement>('circle[fill=transparent]')!;
    const box = surface.getBoundingClientRect();
    const move = () =>
      surface.dispatchEvent(
        new PointerEvent('pointermove', {
          clientX: box.x + box.width * 0.6,
          clientY: box.y + box.height / 2,
        }),
      );
    const settle = () => new Promise((resolve) => setTimeout(resolve, 20));
    move();
    await settle();
    const initial = [...events];
    const reading = chart.cursorReading.reflectionCoefficient.re;
    move();
    chart.setCursorEnabled(false);
    chart.setCursorEnabled(false);
    move();
    surface.dispatchEvent(new PointerEvent('pointerleave'));
    chart.renormalize(75);
    await settle();
    const disabled = [...events];
    const hidden = document.querySelector('.smith-cursor')!.getAttribute('opacity') === '0';
    const retainedPosition = chart.cursorReading.reflectionCoefficient.re === reading;
    chart.setCursorEnabled(true);
    await settle();
    const waiting = events.length === disabled.length;
    move();
    await settle();
    const resumed = [...events];
    const shown = document.querySelector('.smith-cursor')!.getAttribute('opacity') !== '0';
    let invalid = false;
    try {
      chart.setCursorEnabled('false' as unknown as boolean);
    } catch (error) {
      invalid = error instanceof TypeError;
    }
    chart.destroy();
    let disposed = false;
    try {
      chart.setCursorEnabled(true);
    } catch {
      disposed = true;
    }
    return {
      initial,
      disabled,
      resumed,
      hidden,
      retainedPosition,
      waiting,
      shown,
      invalid,
      disposed,
    };
  });
  expect(result).toEqual({
    initial: [true],
    disabled: [true, false],
    resumed: [true, false, true],
    hidden: true,
    retainedPosition: true,
    waiting: true,
    shown: true,
    invalid: true,
    disposed: true,
  });
});

test('setOptions patches supplied fields and renormalizes data without resetting identity or presentation', async ({
  page,
}) => {
  const result = await page.evaluate(() => {
    const chart = new window.SmithTest.Smith({
      appearance: { theme: 'dark' },
      interaction: { zoom: true },
      grid: { style: { stroke: '#123456', majorWidth: 2 } },
    });
    chart.draw('#chart');
    const trace = chart.addTrace([{ frequencyHz: 1e9, reflectionCoefficient: [0.5, 0] }]);
    const marker = chart.addMarker(trace)!;
    const svg = document.querySelector('svg')!;
    svg.dispatchEvent(
      new WheelEvent('wheel', {
        deltaY: -100,
        bubbles: true,
        cancelable: true,
        clientX: 300,
        clientY: 300,
      }),
    );
    const view = svg.firstElementChild!.getAttribute('transform');
    const background = getComputedStyle(svg).backgroundColor;
    const values = [2, 3];
    const options: import('../../src').SmithOptions = {
      referenceImpedanceOhms: 75,
      interaction: { cursor: true },
      grid: { detail: 'basic', layers: { resistance: { style: { majorWidth: 3 } } } },
      circles: { vswr: { values, visible: true, style: { stroke: '#abcdef' } } },
      peripheralScales: { visible: true },
    };
    chart.setOptions(options);
    values.push(5);
    options.grid!.detail = 'detailed';
    chart.setOptions({ grid: {}, interaction: { zoom: undefined }, appearance: undefined });
    const unchanged =
      view === svg.firstElementChild!.getAttribute('transform') &&
      getComputedStyle(svg).backgroundColor === background;
    const resistance = svg.querySelector('[data-layer=resistance] > g:last-child')!;
    const style = getComputedStyle(resistance.firstElementChild!);
    const reading = chart.getMarker(marker)!;
    const beforeNoop = svg.outerHTML;
    chart.setOptions({});
    const noop = beforeNoop === svg.outerHTML;
    chart.setOptions({ appearance: { theme: 'light' }, grid: { labelsVisible: false } });
    const preservedStyle =
      getComputedStyle(resistance.firstElementChild!).stroke === 'rgb(18, 52, 86)';
    const circleCount = svg.querySelector('g[stroke="#abcdef"]')!.childElementCount;
    const scales =
      svg.querySelector('[data-layer=peripheral-scales]')!.getAttribute('opacity') !== '0';
    const labelsHidden =
      svg.querySelector('[data-label-layer=resistance]')!.getAttribute('display') === 'none';
    const output = {
      unchanged,
      noop,
      preservedStyle,
      circleCount,
      scales,
      labelsHidden,
      reference: chart.referenceImpedanceOhms,
      impedance: reading.impedanceOhms!.re,
      gamma: reading.reflectionCoefficient.re,
      sameId: reading.markerId === marker && reading.traceId === trace,
      width: style.strokeWidth,
      count: resistance.childElementCount,
    };
    chart.destroy();
    let disposed = false;
    try {
      chart.setOptions({});
    } catch {
      disposed = true;
    }
    return { ...output, disposed };
  });
  expect(result).toMatchObject({
    unchanged: true,
    noop: true,
    preservedStyle: true,
    circleCount: 2,
    scales: true,
    labelsHidden: true,
    reference: 75,
    sameId: true,
    width: '3px',
    count: 5,
    disposed: true,
  });
  expect(result.gamma).toBeCloseTo(1 / 3);
  expect(result.impedance).toBeCloseTo(150);
});

test('configuration patches reject all invalid fields before any mutation, including singular reference conversion', async ({
  page,
}) => {
  const result = await page.evaluate(() => {
    const chart = new window.SmithTest.Smith();
    chart.draw('#chart');
    const trace = chart.addTrace([{ frequencyHz: 1e9, reflectionCoefficient: [5, 0] }]);
    const marker = chart.addMarker(trace)!;
    const svg = document.querySelector('svg')!;
    const before = svg.outerHTML;
    const patches: unknown[] = [
      { appearance: { theme: 'dark' }, grid: { style: { majorWidth: -1 } } },
      { interaction: { cursor: true }, circles: { vswr: { values: [2, 0] } } },
      { grid: { detail: 'basic', layers: { resistance: { visible: 'false' } } } },
      { grid: { style: { unknown: 1 } } },
      { grid: { detail: 'basic', style: { textColor: null } } },
      { appearance: { unknown: true } },
      {
        referenceImpedanceOhms: 75,
        appearance: { theme: 'dark' },
        peripheralScales: { visible: true },
      },
      { zoomEnabled: true },
      null,
    ];
    const rejected = patches.map((options) => {
      let caught = false;
      try {
        chart.setOptions(options as import('../../src').SmithOptions);
      } catch (error) {
        caught = error instanceof TypeError || error instanceof RangeError;
      }
      return (
        caught &&
        before === svg.outerHTML &&
        chart.referenceImpedanceOhms === 50 &&
        chart.getMarker(marker)!.reflectionCoefficient.re === 5
      );
    });
    chart.destroy();
    return rejected;
  });
  expect(result).toEqual(Array(9).fill(true));
});

test('visibility controls reject non-booleans and SVG/PNG reject unattached scale readings consistently', async ({
  page,
}) => {
  const result = await page.evaluate(async () => {
    const chart = new window.SmithTest.Smith();
    chart.draw('#chart');
    const before = document.querySelector('svg')!.outerHTML;
    const controls = [chart.layers.resistance, chart.layers.q, chart.peripheralScales];
    let errors = 0;
    for (const control of controls) {
      try {
        control.setVisible('false' as unknown as boolean);
      } catch (error) {
        if (error instanceof TypeError) {
          errors++;
        }
      }
    }
    try {
      chart.layers.resistance.setLabelsVisible(1 as unknown as boolean);
    } catch (error) {
      if (error instanceof TypeError) {
        errors++;
      }
    }
    const options = { scaleReadout: { reflectionCoefficient: null } };
    try {
      chart.toSvg(options);
    } catch (error) {
      if (error instanceof TypeError) {
        errors++;
      }
    }
    try {
      await chart.toPng(options);
    } catch (error) {
      if (error instanceof TypeError) {
        errors++;
      }
    }
    const unchanged = before === document.querySelector('svg')!.outerHTML;
    chart.destroy();
    return { errors, unchanged };
  });
  expect(result).toEqual({ errors: 6, unchanged: true });
});
