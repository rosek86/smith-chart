import { expect, test } from '@playwright/test';
import { loadLibrary } from './library';

test('line detail adapts to zoom, keeps full marker data and exports full or view geometry', async ({
  page,
}) => {
  await page.setContent('<div id="chart" style="width:500px;height:500px"></div>');
  await loadLibrary(page);
  const result = await page.evaluate(async () => {
    const { Smith } = window.SmithTest;
    const chart = new Smith({ interaction: { zoom: true } });
    chart.draw('#chart');
    const samples = new Float64Array(30_000);
    for (let i = 0; i < 10_000; i++) {
      samples[i * 3] = i;
      samples[i * 3 + 1] = 0.7 * Math.cos(i / 1000);
      samples[i * 3 + 2] = 0.7 * Math.sin(i / 1000);
    }
    const id = chart.addTrace(samples, { mode: 'line', color: '#123456' });
    const path = () => document.querySelector('.trace-line')!.getAttribute('d')!;
    const vertices = (d: string) => d.match(/[ML]/g)!.length;
    const full = path();
    chart.setTraceOptions(id, { lineTolerancePx: 1 });
    const simplified = path();
    const marker = chart.addMarker(id)!;
    chart.setMarkerSample(marker, 8765);
    const reading = chart.getMarker(marker)!;
    const exportedPath = (svg: string) =>
      [...new DOMParser().parseFromString(svg, 'image/svg+xml').querySelectorAll('path')]
        .find((node) => (node as SVGElement).style.stroke === 'rgb(18, 52, 86)')!
        .getAttribute('d');
    const fullExport = exportedPath(chart.toSvg());
    const viewExport = exportedPath(chart.toSvg({ lineDetail: 'view' }));
    const unchangedAfterExport = path() === simplified;
    // A small zoom remains within the cached level and leaves d unchanged.
    const svg = document.querySelector('#chart svg')!;
    const wheel = (deltaY: number) =>
      svg.dispatchEvent(
        new WheelEvent('wheel', {
          deltaY,
          clientX: 250,
          clientY: 250,
          bubbles: true,
          cancelable: true,
        }),
      );
    wheel(-1);
    const smallZoomUnchanged = path() === simplified;
    wheel(-2000);
    const zoomed = vertices(path());
    chart.resetView();
    const reset = path() === simplified;
    chart.updateTrace(id, new Float64Array([0, 0, 0, 1, 0.5, 0.5]));
    const updated = vertices(path());
    chart.destroy();
    return {
      full: vertices(full),
      simplified: vertices(simplified),
      fullExport: fullExport === full,
      viewExport: viewExport === simplified,
      unchangedAfterExport,
      smallZoomUnchanged,
      zoomed,
      reset,
      updated,
      index: reading.sampleIndex,
      frequency: reading.frequencyHz,
    };
  });
  expect(result.full).toBe(10_000);
  expect(result.simplified).toBeLessThan(5000);
  expect(result.fullExport).toBe(true);
  expect(result.viewExport).toBe(true);
  expect(result.unchangedAfterExport).toBe(true);
  expect(result.smallZoomUnchanged).toBe(true);
  expect(result.zoomed).toBeGreaterThan(result.simplified);
  expect(result.reset).toBe(true);
  expect(result.updated).toBe(2);
  expect(result.index).toBe(8765);
  expect(result.frequency).toBe(8765);
});

test('resize, mode changes and renormalization refresh detail; invalid options are atomic', async ({
  page,
}) => {
  await page.setContent('<div id="chart" style="width:250px;height:250px"></div>');
  await loadLibrary(page);
  const result = await page.evaluate(async () => {
    const chart = new window.SmithTest.Smith();
    chart.draw('#chart');
    const samples = Array.from(
      { length: 10_000 },
      (_, i) => [i, 0.8 * Math.cos(i / 2000), 0.8 * Math.sin(i / 2000)] as const,
    );
    const id = chart.addTrace(samples, { mode: 'line', lineTolerancePx: 0.5 });
    const path = () => document.querySelector('.trace-line')!.getAttribute('d')!;
    const vertices = () => path().match(/[ML]/g)!.length;
    const frame = () => new Promise((resolve) => requestAnimationFrame(resolve));
    await frame();
    await frame();
    const small = vertices();
    const host = document.querySelector<HTMLElement>('#chart')!;
    host.style.width = '1000px';
    host.style.height = '1000px';
    await frame();
    await frame();
    const large = vertices();
    const before = path();
    let rejected = 0;
    for (const lineTolerancePx of [-1, NaN, Infinity]) {
      try {
        chart.setTraceOptions(id, { lineTolerancePx, mode: 'points' });
      } catch (error) {
        if (error instanceof RangeError) {
          rejected++;
        }
      }
    }
    try {
      chart.toSvg({ lineDetail: 'bad' as 'full' });
    } catch (error) {
      if (error instanceof TypeError) {
        rejected++;
      }
    }
    try {
      await chart.toPng({ lineDetail: 'bad' as 'full' });
    } catch (error) {
      if (error instanceof TypeError) {
        rejected++;
      }
    }
    const atomic = path() === before;
    chart.setTraceOptions(id, { mode: 'points' });
    chart.setTraceOptions(id, { mode: 'line' });
    const modeRestored = path() === before;
    chart.renormalize(75);
    const changed = path() !== before;
    const normalized = path();
    chart.setTraceOptions(id, { lineTolerancePx: 0 });
    const full = vertices();
    chart.setTraceOptions(id, { lineTolerancePx: 0.5 });
    const restored = path() === normalized;
    const png = await chart.toPng({ lineDetail: 'view', width: 300 });
    const afterPng = path() === normalized;
    chart.destroy();
    return {
      small,
      large,
      rejected,
      atomic,
      modeRestored,
      changed,
      full,
      restored,
      pngType: png.type,
      afterPng,
    };
  });
  expect(result.large).toBeGreaterThan(result.small);
  expect(result.rejected).toBe(5);
  expect(result.atomic).toBe(true);
  expect(result.modeRestored).toBe(true);
  expect(result.changed).toBe(true);
  expect(result.full).toBe(10_000);
  expect(result.restored).toBe(true);
  expect(result.pngType).toBe('image/png');
  expect(result.afterPng).toBe(true);
});
