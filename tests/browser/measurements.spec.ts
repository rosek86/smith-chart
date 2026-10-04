import { expect, test } from '@playwright/test';
import { loadLibrary } from './library';

test('trace and marker IDs survive removals, updates, and queued notifications', async ({
  page,
}) => {
  await page.setContent('<div id="chart" style="width:500px"></div>');
  await loadLibrary(page);
  const result = await page.evaluate(async () => {
    const chart = new window.SmithTest.Smith(75);
    chart.draw('#chart');
    const a = chart.addTrace([{ frequencyHz: 1e9, reflectionCoefficient: [0, 0] }]);
    const b = chart.addTrace(
      [
        { frequencyHz: 1e9, reflectionCoefficient: [0.5, 0] },
        { frequencyHz: 2e9, reflectionCoefficient: [0, 0.5] },
      ],
      { name: 'DUT', color: '#123456' },
    );
    const initial = chart.getTraces();
    const first = initial[1].markers[0].id;
    const retained = chart.addMarker(b, 1)!;
    const events: import('../../src').MarkerSnapshot[] = [];
    chart.onEvent((event) => {
      if (event.type === window.SmithTest.SmithEventType.Marker) {
        events.push(event.data);
      }
    });
    chart.removeMarker(first);
    chart.removeTrace(a);
    chart.setMarkerSample(retained, 0);
    await new Promise((resolve) => setTimeout(resolve, 20));
    const snapshot = chart.getMarker(retained)!;
    const notified = events.every(
      (event) =>
        event.markerId === retained &&
        event.traceId === b &&
        event.markerNumber === 2 &&
        event.sampleIndex === 0,
    );
    chart.setTraceOptions(b, { visible: false, name: 'Renamed', color: '#abcdef' });
    chart.updateTrace(b, [{ frequencyHz: 3e9, reflectionCoefficient: [0.4, 0] }]);
    const hidden = [...document.querySelectorAll('[data-role]')].every(
      (node) => getComputedStyle(node).display === 'none',
    );
    const meta = chart.getTraces()[0];
    const missing = [
      chart.removeMarker(first),
      chart.removeTrace(a),
      chart.setTraceOptions(a, { name: 'gone' }),
      chart.updateTrace(a, []),
    ];
    let invalid = false;
    try {
      chart.setTraceOptions(b, { name: 'changed', color: 'not-a-color' });
    } catch {
      invalid = true;
    }
    const atomic = chart.getTraces()[0].name === 'Renamed';
    const updated = chart.getMarker(retained)!.frequencyHz;
    chart.setTraceOptions(b, { visible: true });
    const shown = [...document.querySelectorAll('[data-role]')].every(
      (node) => getComputedStyle(node).display !== 'none',
    );
    const markerColor = document
      .querySelector('[data-role=marker] polygon:last-of-type')!
      .getAttribute('fill');
    chart.destroy();
    let disposed = false;
    try {
      chart.addMarker(b);
    } catch {
      disposed = true;
    }
    return {
      idStable: snapshot.markerId === retained && snapshot.traceId === b,
      number: snapshot.markerNumber,
      impedance: snapshot.impedanceOhms?.re,
      notified,
      eventCount: events.length > 0,
      hidden,
      shown,
      markerColor,
      meta: { name: meta.name, color: meta.color, visible: meta.visible, count: meta.sampleCount },
      missing,
      invalid,
      atomic,
      updated,
      disposed,
      cleared: chart.getTraces().length,
    };
  });
  expect(result).toEqual({
    idStable: true,
    number: 2,
    impedance: 225,
    notified: true,
    eventCount: true,
    hidden: true,
    shown: true,
    markerColor: '#abcdef',
    meta: { name: 'Renamed', color: '#abcdef', visible: false, count: 1 },
    missing: [false, false, false, false],
    invalid: true,
    atomic: true,
    updated: 3e9,
    disposed: true,
    cleared: 0,
  });
});

test('demo manages named traces and markers and updates comparisons', async ({ page }) => {
  await page.goto('./');
  await page.locator('#file').setInputFiles({
    name: 'DUT.s1p',
    mimeType: 'text/plain',
    buffer: Buffer.from('# GHz S RI R 50\n1 0.5 0\n2 0 0.5'),
  });
  const trace = page.locator('.trace-controls');
  await expect(trace.getByLabel('Trace name')).toHaveValue('DUT.s1p');
  await trace.getByLabel('Trace name').fill('Antenna');
  await trace.getByLabel('Trace name').press('Tab');
  await trace.getByRole('button', { name: 'Add marker', exact: true }).click();
  await expect(page.locator('#marker-select')).toHaveValue('marker-2');
  await expect(page.locator('#comparison-frequency')).toHaveText('1 GHz');
  await expect(page.locator('#comparison-impedance')).toHaveText('-120.000 + 40.000i Ω');
  await expect(page.locator('#comparison-phase')).toHaveText('90.000°');
  await trace.getByLabel('Show Antenna').uncheck();
  await expect(page.locator('#marker-select')).toContainText('Antenna · marker 2 (hidden)');
  await expect(page.locator('#smith [data-role=marker]').first()).toBeHidden();
  await trace.getByLabel('Show Antenna').check();
  await trace.getByLabel('Color for Antenna').fill('#2563eb');
  await trace.getByLabel('Color for Antenna').dispatchEvent('change');
  await expect(page.locator('#marker-color')).toHaveCSS('background-color', 'rgb(37, 99, 235)');
  const sample = trace.locator('.marker-controls').nth(1).getByRole('spinbutton');
  await sample.fill('1');
  await sample.press('Tab');
  await expect(page.locator('#comparison-frequency')).toHaveText('0 Hz');
  await expect(page.locator('#comparison-phase')).toHaveText('0.000°');
  await sample.fill('2');
  await sample.press('Tab');
  await expect(page.locator('#comparison-phase')).toHaveText('90.000°');
  await trace
    .locator('.marker-controls')
    .first()
    .getByRole('button', { name: 'Remove marker' })
    .click();
  await expect(page.locator('#marker-select')).toHaveValue('marker-2');
  await expect(page.locator('#marker-readout')).toContainText('marker 2');
  await expect(page.locator('#comparison-phase')).toHaveText('—');
  await trace.getByRole('button', { name: 'Remove trace' }).click();
  await expect(trace).toHaveCount(0);
  await expect(page.locator('#marker-select')).toBeDisabled();
  await expect(page.locator('#parameter-gamma')).toHaveText('—');
  await expect(page.locator('#smith [data-role=marker]')).toHaveCount(0);
});

test('comparisons follow dragging and remain available for hidden traces', async ({ page }) => {
  await page.goto('./');
  await page.getByRole('button', { name: 'Load sample trace' }).click();
  await page.getByRole('button', { name: 'Add marker', exact: true }).click();
  await expect(page.locator('#comparison-frequency')).toHaveText('1 GHz');
  const chart = page.locator('#smith svg');
  await chart.scrollIntoViewIfNeeded();
  await chart.locator('[data-role=marker]').first().locator('polygon').last().hover();
  const box = (await chart.boundingBox())!;
  await page.mouse.down();
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2, { steps: 10 });
  await page.mouse.up();
  await expect(page.locator('#comparison-frequency')).toHaveText('500 MHz');
  await expect(page.locator('#comparison-phase')).toHaveText('—');
  await page.getByLabel('Show Trace 1').uncheck();
  await expect(page.locator('#comparison-frequency')).toHaveText('500 MHz');
  await expect(page.locator('#smith [data-role=marker]').first()).toBeHidden();
});

test('hiding an actively dragged trace ends the gesture and permits future dragging', async ({
  page,
}) => {
  await page.setContent('<div id="chart" style="width:500px"></div>');
  await loadLibrary(page);
  await page.evaluate(() => {
    const chart = new window.SmithTest.Smith();
    chart.draw('#chart');
    const id = chart.addTrace([{ frequencyHz: 1e9, reflectionCoefficient: [0, 0] }]);
    const events: string[] = [];
    chart.onEvent((event) => {
      if (event.type === window.SmithTest.SmithEventType.MarkerDragStart) {
        events.push('start');
      }
      if (event.type === window.SmithTest.SmithEventType.MarkerDragEnd) {
        events.push('end');
      }
      document.body.dataset.events = events.join(',');
    });
    (window as typeof window & { setTraceVisible: (visible: boolean) => void }).setTraceVisible = (
      visible,
    ) => {
      chart.setTraceOptions(id, { visible });
    };
  });
  const marker = page.locator('[data-role=marker] polygon').last();
  await marker.hover();
  await page.mouse.down();
  await page.evaluate(() => {
    (window as typeof window & { setTraceVisible: (visible: boolean) => void }).setTraceVisible(
      false,
    );
  });
  await expect(page.locator('svg')).not.toHaveCSS('cursor', 'grabbing');
  await page.mouse.up();
  await expect(page.locator('body')).toHaveAttribute('data-events', 'start,end');
  await page.evaluate(() => {
    (window as typeof window & { setTraceVisible: (visible: boolean) => void }).setTraceVisible(
      true,
    );
  });
  await marker.hover();
  await page.mouse.down();
  await page.mouse.up();
  await expect(page.locator('body')).toHaveAttribute('data-events', 'start,end,start,end');
});
