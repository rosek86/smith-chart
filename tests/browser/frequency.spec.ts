import { expect, test } from '@playwright/test';
import { loadLibrary } from './library';

test('frequency selection handles unsorted sweeps, duplicates, ties, bounds, and updates', async ({
  page,
}) => {
  await page.setContent('<div id="chart"></div>');
  await loadLibrary(page);
  const result = await page.evaluate(async () => {
    const { Smith, SmithEventType } = window.SmithTest;
    const chart = new Smith({
      zoomEnabled: true,
      cursorEnabled: true,
      peripheralScalesVisible: true,
      grid: { detail: 'detailed' },
    });
    chart.draw('#chart');
    const trace = chart.addTrace(
      [30, 10, 20, 20].map((frequencyHz, i) => ({
        frequencyHz,
        reflectionCoefficient: [i / 10, 0],
      })),
    );
    chart.addMarker(trace);
    const marker = chart.getTraces()[0].markers[0].id;
    const indices = [20, 25, 0, 100, 19].map((frequency) => {
      chart.setMarkerFrequency(marker, frequency);
      return chart.getMarker(marker)!.sampleIndex;
    });
    const invalid = [-1, NaN, Infinity].every((frequency) => {
      try {
        chart.setMarkerFrequency(marker, frequency);
        return false;
      } catch {
        return chart.getMarker(marker)!.sampleIndex === 2;
      }
    });
    chart.updateTrace(trace, [{ frequencyHz: 5, reflectionCoefficient: [0.5, 0] }]);
    chart.setMarkerFrequency(marker, 99);
    const events: number[] = [];
    chart.onEvent((event) => {
      if (event.type === SmithEventType.Marker) {
        events.push(event.data.frequencyHz);
      }
    });
    await new Promise((resolve) => setTimeout(resolve, 20));
    const actual = chart.getMarker(marker)!.frequencyHz;
    chart.removeMarker(marker);
    const missing = chart.setMarkerFrequency(marker, 1);
    chart.destroy();
    let destroyed = false;
    try {
      chart.setMarkerFrequency(marker, 1);
    } catch {
      destroyed = true;
    }
    return { indices, invalid, actual, events, missing, destroyed };
  });
  expect(result).toMatchObject({
    indices: [2, 0, 1, 0, 2],
    invalid: true,
    actual: 5,
    missing: false,
    destroyed: true,
  });
  expect(result.events.length).toBeGreaterThan(0);
  expect(result.events.every((value) => value === 5)).toBe(true);
});

test('demo selects nearest frequency and synchronizes sample, readout, and comparison', async ({
  page,
}) => {
  await page.goto('./');
  await page.getByRole('button', { name: 'Load sample trace' }).click();
  await page.getByRole('button', { name: 'Add marker', exact: true }).click();
  const marker = page.locator('.marker-controls').nth(1);
  const frequency = marker.locator('[data-marker-frequency]');
  await frequency.fill('1514');
  await frequency.press('Tab');
  await expect(frequency).toHaveValue('1510');
  await expect(marker.locator('[data-marker-sample]')).toHaveValue('52');
  await expect(marker.locator('output')).toHaveText('Selected: 1.51 GHz');
  await expect(page.locator('#comparison-frequency')).toHaveText('510 MHz');
  await expect(page.locator('#marker-readout')).toContainText('1.51 GHz');
  await frequency.fill('-1');
  await frequency.press('Tab');
  await expect(frequency).toHaveValue('1510');
  await marker.locator('[data-marker-sample]').fill('1');
  await marker.locator('[data-marker-sample]').press('Tab');
  await expect(frequency).toHaveValue('1000');
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(390);
});
