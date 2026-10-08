import { expect, test } from '@playwright/test';
import { loadLibrary } from './library';

test('replacement supports frequency, index, and reflection selection without changing identity', async ({
  page,
}) => {
  await page.setContent('<div id="chart"></div>');
  await loadLibrary(page);
  const result = await page.evaluate(() => {
    const chart = new window.SmithTest.Smith();
    chart.draw('#chart');
    const original: import('../../src').TraceSamples = [
      { frequencyHz: 10, reflectionCoefficient: [0, 0] },
      { frequencyHz: 20, reflectionCoefficient: [0.5, 0] },
      { frequencyHz: 30, reflectionCoefficient: [0.8, 0] },
    ];
    const next: import('../../src').TraceSamples = [
      { frequencyHz: 30, reflectionCoefficient: [-0.4, 0] },
      { frequencyHz: 40, reflectionCoefficient: [0.8, 0] },
      { frequencyHz: 10, reflectionCoefficient: [0, 0] },
    ];
    const indices = [];
    const stable = [];
    for (const markerSelection of [undefined, 'frequency', 'sample-index', 'reflection'] as const) {
      const trace = chart.addTrace(original, {
        name: 'Measured',
        color: '#123456',
        visible: false,
        mode: 'line',
      });
      chart.addMarker(trace);
      const marker = chart.getTraces().at(-1)!.markers[0].id;
      chart.setMarkerSample(marker, 2);
      chart.updateTrace(trace, next, { markerSelection });
      indices.push(chart.getMarker(marker)!.sampleIndex);
      stable.push(chart.getTraces().at(-1)!);
    }
    const trace = chart.addTrace(original);
    chart.addMarker(trace);
    const marker = chart.getTraces().at(-1)!.markers[0].id;
    chart.setMarkerSample(marker, 2);
    chart.updateTrace(trace, next.slice(0, 2), { markerSelection: 'sample-index' });
    const clamped = chart.getMarker(marker)!.sampleIndex;
    chart.renormalize(75);
    const renormalized = chart.getMarker(marker)!.sampleIndex;
    chart.destroy();
    return { indices, stable, clamped, renormalized };
  });
  expect(result.indices).toEqual([0, 0, 2, 1]);
  for (const trace of result.stable) {
    expect(trace).toMatchObject({
      name: 'Measured',
      color: '#123456',
      visible: false,
      mode: 'line',
      sampleCount: 3,
    });
    expect(trace.markers).toHaveLength(1);
  }
  expect(result.clamped).toBe(1);
  expect(result.renormalized).toBe(1);
});

test('frequency ties, duplicates, out-of-range values and invalid updates have deterministic contracts', async ({
  page,
}) => {
  await page.setContent('<div id="chart"></div>');
  await loadLibrary(page);
  const result = await page.evaluate(() => {
    const chart = new window.SmithTest.Smith();
    chart.draw('#chart');
    const indices = [];
    for (const [frequencyHz, frequencies] of [
      [30, [40, 20]],
      [20, [30, 20, 20]],
      [0, [30, 10]],
      [100, [30, 10]],
    ] as const) {
      const trace = chart.addTrace([{ frequencyHz, reflectionCoefficient: [0, 0] }]);
      chart.addMarker(trace);
      const marker = chart.getTraces().at(-1)!.markers[0].id;
      const samples: import('../../src').TraceSamples = frequencies.map((frequencyHz) => ({
        frequencyHz,
        reflectionCoefficient: [0, 0],
      }));
      chart.updateTrace(trace, samples);
      indices.push(chart.getMarker(marker)!.sampleIndex);
    }
    const trace = chart.getTraces()[0];
    const before = JSON.stringify(chart.getTraces());
    let invalid = 0;
    try {
      chart.updateTrace(trace.id, [], { markerSelection: 'bad' as 'frequency' });
    } catch (error) {
      if (error instanceof TypeError) {
        invalid++;
      }
    }
    try {
      chart.updateTrace(trace.id, []);
    } catch (error) {
      if (error instanceof RangeError) {
        invalid++;
      }
    }
    try {
      chart.updateTrace(trace.id, [{ frequencyHz: -1, reflectionCoefficient: [0, 0] }]);
    } catch (error) {
      if (error instanceof RangeError) {
        invalid++;
      }
    }
    const unchanged = JSON.stringify(chart.getTraces()) === before;
    const missing = chart.updateTrace('missing', [], { markerSelection: 'bad' as 'frequency' });
    chart.destroy();
    let destroyed = false;
    try {
      chart.updateTrace(trace.id, []);
    } catch {
      destroyed = true;
    }
    return { indices, invalid, unchanged, missing, destroyed };
  });
  expect(result).toEqual({
    indices: [0, 1, 1, 0],
    invalid: 3,
    unchanged: true,
    missing: false,
    destroyed: true,
  });
});

test('queued marker events coalesce independently, expose latest snapshots, and cancel on removal', async ({
  page,
}) => {
  await page.setContent('<div id="chart"></div>');
  await loadLibrary(page);
  const result = await page.evaluate(async () => {
    const { Smith, SmithEventType } = window.SmithTest;
    const chart = new Smith();
    chart.draw('#chart');
    const trace = chart.addTrace(
      [10, 20, 30].map((frequencyHz, i) => ({ frequencyHz, reflectionCoefficient: [i / 10, 0] })),
    );
    chart.addMarker(trace);
    const first = chart.getTraces()[0].markers[0].id;
    const second = chart.addMarker(trace)!;
    const removed = chart.addMarker(trace)!;
    const events: { id: string; frequency: number }[] = [];
    const unsubscribe = chart.onEvent((event) => {
      if (event.type === SmithEventType.Marker) {
        events.push({ id: event.data.markerId, frequency: event.data.frequencyHz });
      }
    });
    for (let i = 0; i < 50; i++) {
      chart.setMarkerSample(first, i % 3);
    }
    chart.setMarkerFrequency(second, 29);
    chart.removeMarker(removed);
    const synchronous = events.length;
    await new Promise((resolve) => setTimeout(resolve, 20));
    const delivered = events.slice();
    chart.setTraceOptions(trace, { name: 'Renamed' });
    await new Promise((resolve) => setTimeout(resolve, 20));
    const afterMetadata = events.length;
    chart.setMarkerSample(first, 0);
    unsubscribe();
    chart.destroy();
    await new Promise((resolve) => setTimeout(resolve, 20));
    return { first, second, synchronous, delivered, afterMetadata, finalCount: events.length };
  });
  expect(result.synchronous).toBe(0);
  expect(result.delivered).toEqual([
    { id: result.first, frequency: 20 },
    { id: result.second, frequency: 30 },
  ]);
  expect(result.afterMetadata).toBe(2);
  expect(result.finalCount).toBe(2);
});
