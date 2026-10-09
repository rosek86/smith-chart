import { expect, test } from '@playwright/test';
import { loadLibrary } from './library';

for (const format of ['objects', 'tuples', 'packed'] as const) {
  test(`${format} trace input preserves rendering, markers, exports, and atomic updates`, async ({
    page,
  }) => {
    await page.setContent('<div id="chart" style="width:500px;height:500px"></div>');
    await loadLibrary(page);
    const result = await page.evaluate(async (format) => {
      const { Smith, SmithEventType } = window.SmithTest;
      const chart = new Smith();
      chart.draw('#chart');
      const tuples: [number, number, number][] = [
        [10, 0.5, 0],
        [20, 0, 0.5],
        [30, 0, 0],
      ];
      const objects = tuples.map(([frequencyHz, re, im]) => ({
        frequencyHz,
        reflectionCoefficient: [re, im] as [number, number],
      }));
      const packed = new Float64Array(tuples.flat());
      const input = format === 'objects' ? objects : format === 'tuples' ? tuples : packed;
      const id = chart.addTrace(input, { mode: 'both', name: 'Compact trace' });
      const marker = chart.addMarker(id, 1)!;
      objects[1].reflectionCoefficient[1] = 99;
      tuples[1][2] = 99;
      packed.fill(99);
      const original = chart.getMarker(marker)!.reflectionCoefficient.toVector();
      const path = document.querySelector('.trace-line')!.getAttribute('d');
      const circles = document.querySelectorAll('[data-role=samples] circle').length;
      const svg = chart.toSvg({ markerLegend: true });
      const exported = new DOMParser().parseFromString(svg, 'image/svg+xml');
      const exportPath = Array.from(exported.querySelectorAll('path'))
        .find((node) => node.getAttribute('d') === path)
        ?.getAttribute('d');
      const events: number[] = [];
      chart.onEvent((event) => {
        if (event.type === SmithEventType.Marker && event.data.markerId === marker) {
          events.push(event.data.frequencyHz);
        }
      });
      let rejected = 0;
      for (const invalid of [
        new Float64Array([1, 2]),
        [
          [1, 0, 0],
          [2, NaN, 0],
        ],
      ]) {
        try {
          chart.updateTrace(id, invalid as import('../../src').TraceInput);
        } catch (error) {
          if (error instanceof RangeError) {
            rejected++;
          }
        }
      }
      const unchanged =
        chart.getMarker(marker)!.frequencyHz === 20 &&
        document.querySelector('.trace-line')!.getAttribute('d') === path;
      chart.updateTrace(id, new Float64Array([11, 0.1, 0, 21, 0.2, 0]));
      await new Promise((resolve) => setTimeout(resolve, 10));
      const updated = chart.getMarker(marker)!;
      const z = updated.impedanceOhms!.toVector();
      chart.renormalize(75);
      const renormalized = chart.getMarker(marker)!;
      chart.updateTrace(id, [[100, 0, 0]], { markerSelection: 'sample-index' });
      const clamped = chart.getMarker(marker)!;
      const markers = chart.getTraces()[0].markers;
      chart.destroy();
      return {
        original,
        path,
        circles,
        exportPath,
        rejected,
        unchanged,
        events,
        frequency: updated.frequencyHz,
        z,
        renormalizedZ: renormalized.impedanceOhms!.toVector(),
        renormalizedIndex: renormalized.sampleIndex,
        clampedIndex: clamped.sampleIndex,
        stableIdentity: markers[0].id === marker,
      };
    }, format);
    expect(result).toMatchObject({
      original: [0, 0.5],
      path: 'M375,250L250,125L250,250',
      circles: 3,
      rejected: 2,
      unchanged: true,
      frequency: 21,
      renormalizedIndex: 1,
      clampedIndex: 0,
      stableIdentity: true,
    });
    expect(result.exportPath).toBe(result.path);
    expect(result.events).toContain(21);
    expect(result.renormalizedZ[0]).toBeCloseTo(result.z[0]);
    expect(result.renormalizedZ[1]).toBeCloseTo(result.z[1]);
  });
}

test('packed large traces retain every sample for keyboard selection and renormalization', async ({
  page,
}) => {
  await page.setContent('<div id="chart" style="width:500px;height:500px"></div>');
  await loadLibrary(page);
  await page.evaluate(() => {
    const chart = new window.SmithTest.Smith({ interaction: { zoom: true } });
    chart.draw('#chart');
    const samples = new Float64Array(100_000 * 3);
    for (let i = 0; i < 100_000; i++) {
      samples.set([1e9 + i, 0.5 * Math.cos(i / 10000), 0.5 * Math.sin(i / 10000)], i * 3);
    }
    const traceId = chart.addTrace(samples, { mode: 'points' });
    const markerId = chart.addMarker(traceId)!;
    chart.renormalize(75);
    chart.focusMarker(markerId);
    // Keep the public instance available for post-keyboard assertions only.
    Object.assign(window, { compactChart: chart, compactMarkerId: markerId });
  });
  await page.keyboard.press('End');
  const result = await page.evaluate(() => {
    const state = window as unknown as {
      compactChart: import('../../src').Smith;
      compactMarkerId: string;
    };
    const marker = state.compactChart.getMarker(state.compactMarkerId)!;
    const count = state.compactChart.getTraces()[0].sampleCount;
    const circles = document.querySelectorAll('[data-role=samples] circle').length;
    state.compactChart.destroy();
    return { sampleIndex: marker.sampleIndex, frequencyHz: marker.frequencyHz, count, circles };
  });
  expect(result).toMatchObject({ sampleIndex: 99999, frequencyHz: 1e9 + 99999, count: 100000 });
  expect(result.circles).toBeGreaterThan(0);
  expect(result.circles).toBeLessThan(5000);
});
