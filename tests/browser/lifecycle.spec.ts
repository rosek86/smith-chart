import { expect, test } from '@playwright/test';
import { loadLibrary } from './library';

test.beforeEach(async ({ page }) => {
  await page.setContent(
    '<div id="first" style="width:500px;height:650px"></div><div id="second" style="width:500px;height:650px"></div>',
  );
  await loadLibrary(page);
});

test('mounts by element, moves without duplicating SVG, and validates containers and Z0', async ({
  page,
}) => {
  const result = await page.evaluate(() => {
    const { Smith } = window.SmithTest;
    const fails = (fn: () => void) => {
      try {
        fn();
        return false;
      } catch {
        return true;
      }
    };
    const invalid = [0, -1, NaN, Infinity].every((z) =>
      fails(() => new Smith({ referenceImpedanceOhms: z })),
    );
    const chart = new Smith({ referenceImpedanceOhms: 75 });
    chart.draw(document.getElementById('first')!);
    chart.draw('#first');
    const once = document.querySelectorAll('svg').length;
    chart.draw('#second');
    const moved = document.querySelectorAll('#first svg').length === 0;
    const missing = fails(() => chart.draw('#missing'));
    chart.destroy();
    return { invalid, once, moved, missing };
  });
  expect(result).toEqual({ invalid: true, once: 1, moved: true, missing: true });
});

test('updates samples and markers, keeps colors, and retains stable IDs after removal', async ({
  page,
}) => {
  const result = await page.evaluate(async () => {
    const { Smith } = window.SmithTest;
    const chart = new Smith();
    chart.draw('#first');
    const events: import('../../src/index').MarkerSnapshot[] = [];
    chart.onEvent((event) => {
      if (event.type === window.SmithTest.SmithEventType.Marker) {
        events.push(event.data);
      }
    });
    const sample = [{ frequencyHz: 1e9, reflectionCoefficient: [0.5, 0] as [number, number] }];
    const first = chart.addTrace(sample);
    chart.addMarker(first);
    const second = chart.addTrace([{ frequencyHz: 2e9, reflectionCoefficient: [0, 0] }]);
    chart.addMarker(second);
    chart.addMarker(second);
    const markers = chart.getTraces()[1].markers.map((m) => m.id);
    const color = document.querySelectorAll('[data-role=samples]')[1].getAttribute('fill');
    sample[0].reflectionCoefficient[0] = -1;
    const copied =
      chart.getMarker(chart.getTraces()[0].markers[0].id)?.reflectionCoefficient.re === 0.5;
    chart.getTraces().pop();
    const defensive = chart.getTraces().length === 2;
    chart.removeTrace(first);
    chart.updateTrace(second, [
      { frequencyHz: 3e9, reflectionCoefficient: [0.1, 0] },
      { frequencyHz: 4e9, reflectionCoefficient: [0.9, 0] },
    ]);
    let invalid = false;
    try {
      chart.updateTrace(second, [{ frequencyHz: NaN, reflectionCoefficient: [0, 0] }]);
    } catch {
      invalid = true;
    }
    await new Promise((resolve) => setTimeout(resolve, 20));
    const preserved =
      chart.getTraces()[0].id === second &&
      markers.every((id, i) => chart.getTraces()[0].markers[i].id === id);
    const colorUnchanged =
      document.querySelector('[data-role=samples]')?.getAttribute('fill') === color;
    const pointCount = document.querySelectorAll('[data-role=samples] circle').length;
    const notified = events.map((event) => [event.traceId, event.markerNumber, event.frequencyHz]);
    const missing = [
      chart.removeTrace('missing'),
      chart.updateTrace('missing', sample),
      chart.removeMarker('missing'),
    ];
    let emptyRejected = false;
    try {
      chart.addTrace([]);
    } catch {
      emptyRejected = true;
    }
    let emptyUpdateRejected = false;
    try {
      chart.updateTrace(second, []);
    } catch {
      emptyUpdateRejected = chart.getTraces()[0].sampleCount === 2;
    }
    chart.removeTrace(second);
    const empty =
      chart.getTraces().length === 0 && document.querySelectorAll('[data-role]').length === 0;
    chart.destroy();
    return {
      first,
      copied,
      defensive,
      invalid,
      preserved,
      colorUnchanged,
      pointCount,
      notified,
      missing,
      emptyRejected,
      emptyUpdateRejected,
      empty,
    };
  });
  expect(result).toEqual({
    first: 'trace-1',
    copied: true,
    defensive: true,
    invalid: true,
    preserved: true,
    colorUnchanged: true,
    pointCount: 2,
    notified: [
      ['trace-2', 1, 3e9],
      ['trace-2', 2, 3e9],
    ],
    missing: [false, false, false],
    emptyRejected: true,
    emptyUpdateRejected: true,
    empty: true,
  });
});

test('destroy cancels queued events, releases retained nodes, and leaves other charts usable', async ({
  page,
}) => {
  const result = await page.evaluate(async () => {
    const { Smith } = window.SmithTest;
    let calls = 0;
    const other = new Smith();
    other.draw('#second');
    other.onEvent(() => calls++);
    let invalidCalls = 0;
    for (let i = 0; i < 5; i++) {
      const chart = new Smith();
      chart.draw('#first');
      chart.onEvent(() => invalidCalls++);
      chart.addMarker(chart.addTrace([{ frequencyHz: 1, reflectionCoefficient: [0, 0] }]));

      const nodes = [...document.querySelectorAll('#first svg, #first svg *')];
      chart.destroy();
      chart.destroy();
      const events = nodes.some((node) => (node as Element & { __on?: unknown[] }).__on?.length);
      if (events) {
        throw new Error('Retained nodes still have listeners.');
      }
      if (chart.getTraces().length) {
        throw new Error('Removed dataset retained its markers.');
      }
      try {
        chart.draw('#first');
        throw new Error('Expected destroyed chart to reject mounting.');
      } catch (error) {
        if (!(error instanceof Error) || !error.message.includes('destroyed')) {
          throw error;
        }
      }
    }
    other.addMarker(other.addTrace([{ frequencyHz: 2, reflectionCoefficient: [0, 0] }]));
    other.resetView();
    await new Promise((resolve) => setTimeout(resolve, 20));
    const remaining = document.querySelectorAll('svg').length;
    other.clearTraces();
    other.destroy();
    return { invalidCalls, calls, remaining };
  });
  expect(result).toEqual({ invalidCalls: 0, calls: 1, remaining: 1 });
});

for (const gesture of ['zoom', 'drag'] as const) {
  test(`destroy during ${gesture} releases window listeners`, async ({ page }) => {
    await page.evaluate(() => {
      const chart = new window.SmithTest.Smith();
      chart.draw('#first');
      chart.addMarker(chart.addTrace([{ frequencyHz: 1, reflectionCoefficient: [0, 0] }]));
      (window as typeof window & { destroyChart: () => void }).destroyChart = () => chart.destroy();
    });
    const target =
      gesture === 'drag'
        ? page.locator('[data-role=marker] polygon').last()
        : page.locator('#first svg');
    const box = (await target.boundingBox())!;
    // Start chart panning away from the marker at Γ = 0.
    const offset = gesture === 'zoom' ? 0.3 : 0.5;
    await page.mouse.move(box.x + box.width * offset, box.y + box.height / 2);
    await page.mouse.down();
    const state = await page.evaluate((namespace) => {
      const listeners = () =>
        (window as typeof window & { __on?: { type: string; name: string }[] }).__on ?? [];
      const active = listeners().some(
        (entry) => entry.type === 'mousemove' && entry.name === namespace,
      );
      (window as typeof window & { destroyChart: () => void }).destroyChart();
      const remaining = listeners().filter((entry) => ['zoom', 'drag'].includes(entry.name)).length;
      return { active, remaining };
    }, gesture);
    await page.mouse.up();
    expect(state).toEqual({ active: true, remaining: 0 });
  });
}

test('all markers stay above all sample points after adding and updating datasets', async ({
  page,
}) => {
  const result = await page.evaluate(() => {
    const chart = new window.SmithTest.Smith();
    chart.draw('#first');
    const snapshots: boolean[] = [];
    const recordOrder = () => {
      const markers = [...document.querySelectorAll('#first [data-role=marker]')];
      const samples = [...document.querySelectorAll('#first [data-role=samples]')];
      snapshots.push(
        markers.length > 0 &&
          samples.length > 0 &&
          samples.every((sample) =>
            markers.every((marker) =>
              Boolean(sample.compareDocumentPosition(marker) & Node.DOCUMENT_POSITION_FOLLOWING),
            ),
          ),
      );
    };
    const first = chart.addTrace([{ frequencyHz: 1, reflectionCoefficient: [0, 0] }]);
    chart.addMarker(first);
    const second = chart.addTrace([{ frequencyHz: 2, reflectionCoefficient: [0, 0.05] }]);
    chart.addMarker(second);
    recordOrder();
    chart.updateTrace(first, [{ frequencyHz: 3, reflectionCoefficient: [0, 0] }]);
    recordOrder();
    chart.updateTrace(second, [{ frequencyHz: 4, reflectionCoefficient: [0, 0.05] }]);
    recordOrder();
    chart.addMarker(first);
    chart.addMarker(chart.addTrace([{ frequencyHz: 5, reflectionCoefficient: [0, 0.05] }]));
    chart.resetView();
    recordOrder();
    chart.removeTrace(second);
    recordOrder();
    chart.clearTraces();
    const remaining = document.querySelectorAll(
      '#first [data-role=marker], #first [data-role=samples]',
    ).length;
    chart.destroy();
    return { snapshots, remaining };
  });
  expect(result).toEqual({ snapshots: [true, true, true, true, true], remaining: 0 });
});

test('event subscriptions are independent, removable, and cleared on destruction', async ({
  page,
}) => {
  const result = await page.evaluate(async () => {
    const { Smith, SmithEventType } = window.SmithTest;
    const chart = new Smith();
    chart.draw('#first');
    let count = 0;
    const listener = (event: import('../../src').SmithEvent) => {
      if (event.type === SmithEventType.Marker) {
        count++;
      }
    };
    const stopA = chart.onEvent(listener);
    const stopB = chart.onEvent(listener);
    const trace = chart.addTrace([{ frequencyHz: 1, reflectionCoefficient: [0.5, 0] }]);
    chart.addMarker(trace);
    await new Promise((resolve) => setTimeout(resolve, 20));
    const both = count;
    stopA();
    stopA();
    const marker = chart.getTraces()[0].markers[0].id;
    chart.setMarkerSample(marker, 0);
    await new Promise((resolve) => setTimeout(resolve, 20));
    const one = count;
    chart.addMarker(trace);
    stopB();
    await new Promise((resolve) => setTimeout(resolve, 20));
    const stopped = count;
    chart.onEvent(listener);
    chart.setMarkerSample(marker, 0);
    chart.destroy();
    await new Promise((resolve) => setTimeout(resolve, 20));
    let rejected = false;
    try {
      chart.onEvent(listener);
    } catch {
      rejected = true;
    }
    return { both, one, stopped, destroyed: count, rejected };
  });
  expect(result).toEqual({ both: 2, one: 3, stopped: 3, destroyed: 3, rejected: true });
});

test('traces share the current view when created before mounting or after zoom and remount', async ({
  page,
}) => {
  const result = await page.evaluate(() => {
    const chart = new window.SmithTest.Smith();
    const samples: import('../../src').TraceSamples = [
      { frequencyHz: 1e9, reflectionCoefficient: [0.25, 0.1] },
    ];
    chart.addMarker(chart.addTrace(samples, { pointRadius: 3 }));
    document.getElementById('first')!.style.width = '320px';
    chart.draw('#first');
    const svg = document.querySelector('#first svg')!;
    const view = svg.firstElementChild!;
    const initial = view.getAttribute('transform');
    svg.dispatchEvent(
      new WheelEvent('wheel', {
        bubbles: true,
        cancelable: true,
        deltaY: -200,
        clientX: 160,
        clientY: 160,
      }),
    );
    const zoomed = view.getAttribute('transform') !== initial;
    chart.addMarker(chart.addTrace(samples, { pointRadius: 3 }));
    const sizes = () =>
      [...svg.querySelectorAll('[data-role=samples] circle, .marker-hit-area')].map(
        (node) => node.getBoundingClientRect().width,
      );
    const afterZoom = sizes();
    const pointBoxes = [...svg.querySelectorAll('[data-role=samples] circle')].map((node) =>
      node.getBoundingClientRect(),
    );
    const aligned = pointBoxes[0].x === pointBoxes[1].x && pointBoxes[0].y === pointBoxes[1].y;
    chart.draw('#second');
    const afterRemount = sizes();
    const sameView = view.getAttribute('transform');
    chart.clearTraces();
    const emptied = svg.querySelectorAll('[data-role=samples], [data-role=marker]').length;
    chart.addMarker(chart.addTrace(samples, { pointRadius: 3 }));
    const afterClear = sizes();
    const viewPreserved = view.getAttribute('transform') === sameView;
    chart.resetView();
    const reset = view.getAttribute('transform') === initial;
    const afterReset = sizes();
    const layers = chart.layers;
    const peripheral = chart.peripheralScales;
    chart.destroy();
    let rejectedControls = 0;
    for (const action of [
      () => layers.resistance.setVisible(false),
      () => peripheral.setVisible(false),
    ]) {
      try {
        action();
      } catch {
        rejectedControls++;
      }
    }
    return {
      zoomed,
      aligned,
      afterZoom,
      afterRemount,
      emptied,
      afterClear,
      viewPreserved,
      reset,
      afterReset,
      rejectedControls,
    };
  });
  expect(result).toMatchObject({
    zoomed: true,
    aligned: true,
    emptied: 0,
    viewPreserved: true,
    reset: true,
    rejectedControls: 2,
  });
  for (const sizes of [result.afterZoom, result.afterRemount]) {
    sizes.forEach((size, index) => expect(size).toBeCloseTo(index < 2 ? 6 : 44, 1));
  }
  for (const sizes of [result.afterClear, result.afterReset]) {
    expect(sizes[0]).toBeCloseTo(6, 1);
    expect(sizes[1]).toBeCloseTo(44, 1);
  }
});
