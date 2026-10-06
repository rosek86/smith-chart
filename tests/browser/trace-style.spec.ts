import { expect, test } from '@playwright/test';
import { loadLibrary } from './library';

test('trace styles preserve samples, markers, visibility, and ordering across changes', async ({
  page,
}) => {
  await page.setContent('<div id="chart" style="width:500px;height:500px"></div>');
  await loadLibrary(page);
  const result = await page.evaluate(() => {
    const chart = new window.SmithTest.Smith();
    chart.draw('#chart');
    const samples: import('../../src').TraceSamples = [
      { frequencyHz: 3, reflectionCoefficient: [0.5, 0] },
      { frequencyHz: 1, reflectionCoefficient: [0, 0.5] },
      { frequencyHz: 2, reflectionCoefficient: [0, 0] },
    ];
    const id = chart.addTrace(samples, { mode: 'line', lineWidth: 3, pointRadius: 4 });
    const marker = chart.getTraces()[0].markers[0].id;
    const count = () => ({
      paths: document.querySelectorAll('.trace-line').length,
      points: document.querySelectorAll('[data-role=samples] circle').length,
    });
    const line = count();
    const path = document.querySelector('.trace-line')!.getAttribute('d');
    chart.setTraceOptions(id, { mode: 'both', color: '#123456' });
    chart.setMarkerSample(marker, 2);
    const both = count();
    const width = document.querySelector('.trace-line')!.getAttribute('stroke-width');
    const color = document.querySelector('.trace-line')!.getAttribute('stroke');
    chart.setTraceOptions(id, { visible: false });
    chart.updateTrace(id, samples);
    const hidden = getComputedStyle(document.querySelector('[data-role=samples]')!).display;
    const style = chart.getTraces()[0];
    const stable = chart.getMarker(marker)!.frequencyHz;
    chart.setTraceOptions(id, { mode: 'points', visible: true });
    const points = count();
    const before = chart.getTraces()[0].color;
    let invalid = 0;
    for (const options of [{ lineWidth: NaN }, { pointRadius: 0 }, { mode: 'invalid' }]) {
      try {
        chart.setTraceOptions(id, { color: 'red', ...options } as import('../../src').TraceOptions);
      } catch {
        invalid++;
      }
    }
    const atomic = chart.getTraces()[0].color === before;
    const ordered = Boolean(
      document
        .querySelector('[data-role=samples]')!
        .compareDocumentPosition(document.querySelector('[data-role=marker]')!) &
      Node.DOCUMENT_POSITION_FOLLOWING,
    );
    const radius = Number(document.querySelector('[data-role=samples] circle')!.getAttribute('r'));
    chart.destroy();
    return {
      line,
      both,
      points,
      path,
      width,
      color,
      hidden,
      style: { mode: style.mode, lineWidth: style.lineWidth, pointRadius: style.pointRadius },
      stable,
      invalid,
      atomic,
      ordered,
      radius,
    };
  });
  expect(result).toMatchObject({
    line: { paths: 1, points: 0 },
    both: { paths: 1, points: 3 },
    points: { paths: 0, points: 3 },
    width: '3',
    color: '#123456',
    hidden: 'none',
    style: { mode: 'both', lineWidth: 3, pointRadius: 4 },
    stable: 2,
    invalid: 3,
    atomic: true,
    ordered: true,
  });
  expect(result.path).toBe('M375,250L250,125L250,250');
  expect(result.radius).toBeCloseTo(4 / 0.75);
});

test('demo exposes appearance controls and keeps line width constant during zoom', async ({
  page,
}) => {
  await page.goto('./');
  await page.getByRole('button', { name: 'Load sample trace' }).click();
  const trace = page.locator('.trace-controls');
  await trace.getByLabel('Display', { exact: true }).selectOption('both');
  await trace.getByLabel('Line width (px)', { exact: true }).fill('4');
  await trace.getByLabel('Line width (px)', { exact: true }).press('Tab');
  await trace.getByLabel('Point radius (px)', { exact: true }).fill('3');
  await trace.getByLabel('Point radius (px)', { exact: true }).press('Tab');
  const path = page.locator('.trace-line');
  await expect(path).toHaveAttribute('stroke-width', '4');
  await expect(path).toHaveAttribute('vector-effect', 'non-scaling-stroke');
  const point = page.locator('[data-role=samples] circle').first();
  const before = (await point.boundingBox())!.width;
  await page.locator('#smith svg').hover();
  await page.mouse.wheel(0, -240);
  await expect(async () => {
    expect((await point.boundingBox())!.width).toBeCloseTo(before, 1);
  }).toPass();
  await expect(path).toHaveAttribute('stroke-width', '4');
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(async () => {
    expect((await point.boundingBox())!.width).toBeCloseTo(6, 1);
  }).toPass();
  await trace.getByLabel('Display', { exact: true }).selectOption('line');
  await expect(point).toHaveCount(0);
  await expect(page.locator('[data-role=marker]')).toHaveCount(1);
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(390);
});

test('20,000-sample sweeps retain full data in every rendering mode', async ({
  page,
}, testInfo) => {
  await page.setContent('<div id="chart" style="width:500px;height:500px"></div>');
  await loadLibrary(page);
  const result = await page.evaluate(async () => {
    const chart = new window.SmithTest.Smith();
    chart.draw('#chart');
    const samples: import('../../src').TraceSamples = Array.from({ length: 20000 }, (_, i) => ({
      frequencyHz: 1e9 + i * 1e4,
      reflectionCoefficient: [0.7 * Math.cos(i / 2000), 0.7 * Math.sin(i / 2000)],
    }));
    const timings: Record<string, number> = {};
    const frame = () => new Promise((resolve) => requestAnimationFrame(resolve));
    let start = performance.now();
    const id = chart.addTrace(samples, { mode: 'line' });
    await frame();
    await frame();
    timings.lineMountMs = performance.now() - start;
    const marker = chart.getTraces()[0].markers[0].id;
    chart.setMarkerSample(marker, 19999);
    start = performance.now();
    chart.setTraceOptions(id, { mode: 'both' });
    await frame();
    await frame();
    timings.bothMountMs = performance.now() - start;
    const circleCount = document.querySelectorAll('[data-role=samples] circle').length;
    const frameTimes = [];
    for (let i = 0; i < 12; i++) {
      await frame();
      start = performance.now();
      document.querySelector('svg')!.dispatchEvent(
        new WheelEvent('wheel', {
          deltaY: i % 2 ? -40 : 40,
          clientX: 250,
          clientY: 250,
          bubbles: true,
          cancelable: true,
          view: window,
        }),
      );
      await frame();
      frameTimes.push(performance.now() - start);
    }
    timings.medianUpdateFrameMs = frameTimes.sort((a, b) => a - b)[
      Math.floor(frameTimes.length / 2)
    ];
    const count = chart.getTraces()[0].sampleCount;
    const frequency = chart.getMarker(marker)!.frequencyHz;
    chart.destroy();
    return { timings, circleCount, count, frequency };
  });
  expect(result.circleCount).toBeGreaterThan(0);
  expect(result.circleCount).toBeLessThan(5000);
  expect(result).toMatchObject({ count: 20000, frequency: 1e9 + 19999 * 1e4 });
  await testInfo.attach('rendering-timings', {
    body: JSON.stringify(result, null, 2),
    contentType: 'application/json',
  });
  console.log('20k trace timing:', JSON.stringify(result.timings));
});

test('updating an earlier trace preserves its stacking order and marker layer', async ({
  page,
}) => {
  await page.setContent('<div id="chart" style="width:500px;height:500px"></div>');
  await loadLibrary(page);
  const result = await page.evaluate(() => {
    const chart = new window.SmithTest.Smith();
    chart.draw('#chart');
    const samples: import('../../src').TraceSamples = [
      { frequencyHz: 10, reflectionCoefficient: [0, 0] },
      { frequencyHz: 20, reflectionCoefficient: [0.5, 0] },
    ];
    const first = chart.addTrace(samples, { color: 'red', mode: 'both' });
    chart.addTrace(samples, { color: 'blue', mode: 'line' });
    const marker = chart.getTraces()[0].markers[0].id;
    const order = () =>
      Array.from(document.querySelectorAll('[data-role=samples]'), (group) =>
        group.getAttribute('fill'),
      );
    const before = order();
    chart.updateTrace(first, samples.slice().reverse());
    const after = order();
    const selected = chart.getMarker(marker)!;
    chart.setTraceOptions(first, { mode: 'points' });
    const afterStyle = order();
    const above = Array.from(document.querySelectorAll('[data-role=samples]')).every((group) =>
      Boolean(
        group.compareDocumentPosition(document.querySelector('[data-role=marker]')!) &
        Node.DOCUMENT_POSITION_FOLLOWING,
      ),
    );
    chart.destroy();
    return { before, after, afterStyle, above, sampleIndex: selected.sampleIndex };
  });
  expect(result).toEqual({
    before: ['red', 'blue'],
    after: ['red', 'blue'],
    afterStyle: ['red', 'blue'],
    above: true,
    sampleIndex: 1,
  });
});
