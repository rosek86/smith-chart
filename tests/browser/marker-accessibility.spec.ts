import { expect, test, type Page } from '@playwright/test';
import { loadLibrary } from './library';
import type { Smith, SmithEvent } from '../../src';

declare global {
  interface Window {
    accessibleChart: Smith;
    markerEvents: SmithEvent[];
    accessibleTrace: string;
    accessibleMarker: string;
  }
}

async function setup(page: Page): Promise<void> {
  await page.setContent(
    '<button>Before chart</button><div id="chart" style="width:500px;height:500px"></div><input aria-label="After chart">',
  );
  await loadLibrary(page);
  await page.evaluate(() => {
    const chart = new window.SmithTest.Smith({
      zoomEnabled: true,
      cursorEnabled: true,
      peripheralScalesVisible: true,
      grid: { detail: 'detailed' },
    });
    chart.draw('#chart');
    chart.setZoomEnabled(false);
    const trace = chart.addTrace(
      Array.from({ length: 21 }, (_, i) => ({
        frequencyHz: 1e9 + i * 1e6,
        reflectionCoefficient: [-0.8 + i * 0.08, 0] as [number, number],
      })),
      { name: 'Antenna', mode: 'line' },
    );
    chart.addMarker(trace);
    const marker = chart.getTraces()[0].markers[0].id;
    window.accessibleChart = chart;
    window.accessibleTrace = trace;
    window.accessibleMarker = marker;
    window.markerEvents = [];
    chart.onEvent((event) => window.markerEvents.push(event));
  });
}

test('Tab selects markers and sample navigation clamps to the trace without zooming', async ({
  page,
}) => {
  await setup(page);
  await page.evaluate(() => window.accessibleChart.addMarker(window.accessibleTrace, 10));
  const first = page.getByRole('slider', { name: 'Antenna, marker 1', exact: true });
  const second = page.getByRole('slider', { name: 'Antenna, marker 2', exact: true });
  const view = page.locator('#chart svg > g');
  const transform = await view.getAttribute('transform');
  await page.getByRole('button', { name: 'Before chart' }).focus();
  await page.keyboard.press('Tab');
  await expect(first).toBeFocused();
  await expect(first.locator('.marker-focus')).not.toHaveAttribute('visibility', 'hidden');
  await expect(first).toHaveAttribute('aria-valuetext', '1 GHz, sample 1 of 21');
  for (const [key, index] of [
    ['ArrowRight', 1],
    ['ArrowUp', 2],
    ['Shift+ArrowRight', 12],
    ['PageDown', 2],
    ['End', 20],
    ['ArrowRight', 20],
    ['Home', 0],
    ['ArrowDown', 0],
  ] as const) {
    await page.keyboard.press(key);
    await expect(first).toHaveAttribute('aria-valuenow', String(index));
  }
  await expect(view).toHaveAttribute('transform', transform!);
  await page.keyboard.press('Tab');
  await expect(second).toBeFocused();
  await expect(first.locator('.marker-focus')).toHaveAttribute('visibility', 'hidden');
  await page.keyboard.press('Tab');
  await expect(page.getByRole('textbox', { name: 'After chart' })).toBeFocused();
  await page.keyboard.press('Shift+Tab');
  await expect(second).toBeFocused();
  await page.keyboard.press('Shift+Tab');
  await expect(first).toBeFocused();
  const events = await page.evaluate(() => window.markerEvents.map((event) => event.type));
  expect(events).toContain('marker-select');
  expect(events).toContain('marker');
  expect(events).not.toContain('marker-drag-start');
});

test('focus API and accessible readings follow rename, updates, visibility and removal', async ({
  page,
}) => {
  await setup(page);
  expect(
    await page.evaluate(() => window.accessibleChart.focusMarker(window.accessibleMarker)),
  ).toBe(true);
  await page.evaluate(() => {
    window.accessibleChart.setTraceOptions(window.accessibleTrace, { name: 'Updated antenna' });
    window.accessibleChart.updateTrace(window.accessibleTrace, [
      { frequencyHz: 2e9, reflectionCoefficient: [0, 0] },
    ]);
  });
  const marker = page.getByRole('slider', { name: 'Updated antenna, marker 1', exact: true });
  await expect(marker).toBeFocused();
  await expect(marker).toHaveAttribute('aria-disabled', 'true');
  await expect(marker).toHaveAttribute('aria-valuetext', '2 GHz, sample 1 of 1');
  await page.keyboard.press('End');
  await expect(marker).toHaveAttribute('aria-valuenow', '0');
  const exported = await page.evaluate(() => {
    const svg = new DOMParser().parseFromString(window.accessibleChart.toSvg(), 'image/svg+xml');
    return {
      interactive: svg.querySelectorAll('[role=slider], [tabindex]').length,
      label: svg.querySelector('[data-role=marker]')!.getAttribute('aria-label'),
    };
  });
  expect(exported.interactive).toBe(0);
  expect(exported.label).toContain('2 GHz, sample 1 of 1');
  const hidden = await page.evaluate(() => {
    window.accessibleChart.setTraceOptions(window.accessibleTrace, { visible: false });
    return window.accessibleChart.focusMarker(window.accessibleMarker);
  });
  expect(hidden).toBe(false);
  await expect(marker).toHaveCount(0);
  const removed = await page.evaluate(() => {
    window.accessibleChart.setTraceOptions(window.accessibleTrace, { visible: true });
    window.accessibleChart.removeMarker(window.accessibleMarker);
    const missing = window.accessibleChart.focusMarker(window.accessibleMarker);
    window.accessibleChart.destroy();
    return missing;
  });
  expect(removed).toBe(false);
  await expect(page.locator('[data-role=marker]')).toHaveCount(0);
});

test('marker target stays 44 CSS pixels through resize and zoom', async ({ page }) => {
  await setup(page);
  const target = page.locator('.marker-hit-area');
  for (const width of [320, 700, 500]) {
    await page.locator('#chart').evaluate((node, size) => {
      node.style.width = node.style.height = size + 'px';
    }, width);
    await expect.poll(async () => (await target.boundingBox())!.width).toBeCloseTo(44, 3);
  }
  await page.evaluate(() => window.accessibleChart.setZoomEnabled(true));
  await page.locator('#chart svg').hover({ position: { x: 250, y: 250 } });
  await page.mouse.wheel(0, -180);
  await expect.poll(async () => (await target.boundingBox())!.width).toBeCloseTo(44, 3);
});

test('touch target selects and drags without panning; cancellation releases the gesture', async ({
  browser,
}) => {
  const context = await browser.newContext({
    hasTouch: true,
    viewport: { width: 700, height: 800 },
  });
  const page = await context.newPage();
  try {
    await setup(page);
    await page.evaluate(() => window.accessibleChart.setZoomEnabled(true));
    const target = page.locator('.marker-hit-area');
    const box = (await target.boundingBox())!;
    // Tap outside the visible 18px triangle, inside the larger touch target.
    await page.touchscreen.tap(box.x + box.width / 2 + 17, box.y + box.height / 2);
    await expect(page.getByRole('slider')).toBeFocused();
    const result = await page.evaluate(() => {
      const chart = window.accessibleChart;
      const target = document.querySelector('.marker-hit-area')!;
      const svg = document.querySelector<SVGSVGElement>('#chart svg')!;
      const transform = () => svg.querySelector('g')!.getAttribute('transform');
      const before = transform();
      const start = target.getBoundingClientRect();
      const x = start.x + start.width / 2;
      const y = start.y + start.height / 2;
      const send = (type: string, delta: number) => {
        const touch = { identifier: 7, target, clientX: x + delta, clientY: y };
        const event = new Event(type, { bubbles: true, cancelable: true });
        Object.assign(event, {
          touches: type === 'touchcancel' ? [] : [touch],
          changedTouches: [touch],
          view: window,
        });
        target.dispatchEvent(event);
      };
      send('touchstart', 0);
      send('touchmove', 150);
      const index = chart.getMarker(window.accessibleMarker)!.sampleIndex;
      // A second finger outside the marker must not start a competing chart pinch.
      for (const [type, offset] of [
        ['touchstart', 0],
        ['touchmove', 100],
        ['touchend', 100],
      ] as const) {
        const touches = [
          { identifier: 7, target, clientX: x + 150, clientY: y },
          { identifier: 8, target: svg, clientX: x + 220 + offset, clientY: y + 80 },
        ];
        const event = new Event(type, { bubbles: true, cancelable: true });
        Object.assign(event, {
          touches: type === 'touchend' ? [touches[0]] : touches,
          changedTouches: [touches[1]],
          view: window,
        });
        svg.dispatchEvent(event);
      }
      send('touchcancel', 150);
      const cursor = svg.style.cursor;
      chart.destroy();
      send('touchmove', 200);
      return {
        index,
        before,
        after: transform(),
        cursor,
        events: window.markerEvents.map((event) => event.type),
      };
    });
    expect(result.index).toBe(10);
    expect(result.after).toBe(result.before);
    expect(result.cursor).not.toBe('grabbing');
    expect(result.events.filter((event) => event === 'marker-drag-start')).toHaveLength(2);
    expect(result.events.filter((event) => event === 'marker-drag-end')).toHaveLength(2);
  } finally {
    await context.close();
  }
});

test('demo selects focused markers and provides a keyboard route from the marker selector', async ({
  page,
}) => {
  await page.goto('./');
  await page.getByRole('button', { name: 'Load sample trace' }).click();
  await page.getByRole('tab', { name: 'Marker', exact: true }).click();
  await page.getByRole('button', { name: 'Focus on chart' }).click();
  await expect(page.getByRole('slider')).toBeFocused();
  await page.keyboard.press('End');
  await expect(page.locator('#marker-readout')).toContainText('2 GHz');
  await expect(page.locator('#marker-select')).toHaveValue('marker-1');
  await expect(page.getByRole('tab', { name: 'Marker', exact: true })).toHaveAttribute(
    'aria-selected',
    'true',
  );
});
