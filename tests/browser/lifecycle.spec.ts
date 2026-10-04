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
    const invalid = [0, -1, NaN, Infinity].every((z) => fails(() => new Smith(z)));
    const chart = new Smith(75);
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

test('updates samples and markers, keeps colors, and resolves indices after removal', async ({
  page,
}) => {
  const result = await page.evaluate(async () => {
    const { Smith } = window.SmithTest;
    const chart = new Smith();
    chart.draw('#first');
    const events: import('../../src/index').SmithMarkerEvent[] = [];
    chart.setUserActionHandler((event) => {
      if (event.data && 'datasetNo' in event.data) {
        events.push(event.data);
      }
    });
    const sample: import('../../src/index').S1P = [{ freq: 1e9, point: [0.5, 0] }];
    const first = chart.addS1P(sample);
    chart.addS1P([{ freq: 2e9, point: [0, 0] }]);
    const dataset = chart.Datasets[1];
    dataset.addMarker();
    const markers = dataset.Markers.map((m) => m.marker);
    const color = document.querySelectorAll('[data-role=samples]')[1].getAttribute('fill');
    sample[0].point[0] = -1;
    const copied = chart.getMarkerData(0, 0)?.reflectionCoefficient.real === 0.5;
    chart.Datasets.pop();
    const defensive = chart.Datasets.length === 2;
    chart.removeS1P(0);
    chart.updateS1P(0, [
      { freq: 3e9, point: [0.1, 0] },
      { freq: 4e9, point: [0.9, 0] },
    ]);
    let invalid = false;
    try {
      chart.updateS1P(0, [{ freq: NaN, point: [0, 0] }]);
    } catch {
      invalid = true;
    }
    await new Promise((resolve) => setTimeout(resolve, 20));
    const preserved =
      dataset === chart.Datasets[0] && markers.every((m, i) => dataset.Markers[i].marker === m);
    const colorUnchanged =
      document.querySelector('[data-role=samples]')?.getAttribute('fill') === color;
    const pointCount = document.querySelectorAll('[data-role=samples] circle').length;
    const notified = events.map((event) => [event.datasetNo, event.markerNo, event.freq]);
    const missing = [chart.removeS1P(-1), chart.updateS1P(8, sample), chart.removeS1P(0.5)];
    const emptyIgnored = chart.addS1P([]) === undefined;
    chart.updateS1P(0, []);
    const empty =
      chart.Datasets.length === 0 && document.querySelectorAll('[data-role]').length === 0;
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
      emptyIgnored,
      empty,
    };
  });
  expect(result).toEqual({
    first: 0,
    copied: true,
    defensive: true,
    invalid: true,
    preserved: true,
    colorUnchanged: true,
    pointCount: 2,
    notified: [
      [0, 0, 3e9],
      [0, 1, 3e9],
    ],
    missing: [false, false, false],
    emptyIgnored: true,
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
    other.setUserActionHandler(() => calls++);
    let invalidCalls = 0;
    for (let i = 0; i < 5; i++) {
      const chart = new Smith();
      chart.draw('#first');
      chart.setUserActionHandler(() => invalidCalls++);
      chart.addS1P([{ freq: 1, point: [0, 0] }]);
      const dataset = chart.Datasets[0];
      const nodes = [...document.querySelectorAll('#first svg, #first svg *')];
      chart.destroy();
      chart.destroy();
      const events = nodes.some((node) => (node as Element & { __on?: unknown[] }).__on?.length);
      if (events) {
        throw new Error('Retained nodes still have listeners.');
      }
      if (dataset.Markers.length) {
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
    other.addS1P([{ freq: 2, point: [0, 0] }]);
    other.resetView();
    await new Promise((resolve) => setTimeout(resolve, 20));
    const remaining = document.querySelectorAll('svg').length;
    other.clearS1P();
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
      chart.addS1P([{ freq: 1, point: [0, 0] }]);
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
    chart.addS1P([{ freq: 1, point: [0, 0] }]);
    chart.addS1P([{ freq: 2, point: [0, 0.05] }]);
    recordOrder();
    chart.updateS1P(0, [{ freq: 3, point: [0, 0] }]);
    recordOrder();
    chart.updateS1P(1, [{ freq: 4, point: [0, 0.05] }]);
    recordOrder();
    chart.Datasets[0].addMarker();
    chart.addS1P([{ freq: 5, point: [0, 0.05] }]);
    chart.resetView();
    recordOrder();
    chart.removeS1P(1);
    recordOrder();
    chart.clearS1P();
    const remaining = document.querySelectorAll(
      '#first [data-role=marker], #first [data-role=samples]',
    ).length;
    chart.destroy();
    return { snapshots, remaining };
  });
  expect(result).toEqual({ snapshots: [true, true, true, true, true], remaining: 0 });
});
