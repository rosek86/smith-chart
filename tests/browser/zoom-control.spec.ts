import { expect, test } from '@playwright/test';
import { loadLibrary } from './library';

declare global {
  interface Window {
    zoomChart: import('../../src').Smith;
  }
}

async function setup(page: import('@playwright/test').Page, enabled = true): Promise<void> {
  await page.setContent('<div id="chart" style="width:500px;height:500px"></div>');
  await loadLibrary(page);
  await page.evaluate((enabled) => {
    window.zoomChart = new window.SmithTest.Smith({
      zoomEnabled: true,
      cursorEnabled: true,
      peripheralScalesVisible: true,
      grid: { detail: 'detailed' },
    });
    window.zoomChart.setZoomEnabled(enabled);
    window.zoomChart.draw('#chart');
  }, enabled);
}

test('a fixed view ignores wheel, double click, and pan without blocking marker controls', async ({
  page,
}) => {
  await setup(page, false);
  const view = page.locator('#chart svg > g');
  const original = await view.getAttribute('transform');
  const result = await page.evaluate(() => {
    const svg = document.querySelector('#chart svg')!;
    const wheel = new WheelEvent('wheel', {
      bubbles: true,
      cancelable: true,
      deltaY: -100,
      clientX: 150,
      clientY: 200,
    });
    svg.dispatchEvent(wheel);
    const id = window.zoomChart.addTrace([
      { frequencyHz: 1, reflectionCoefficient: [0, 0] },
      { frequencyHz: 2, reflectionCoefficient: [0.5, 0] },
    ]);
    window.zoomChart.addMarker(id);
    const marker = window.zoomChart.getTraces().find((trace) => trace.id === id)!.markers[0].id;
    window.zoomChart.setMarkerSample(marker, 1);
    return {
      consumed: wheel.defaultPrevented,
      frequency: window.zoomChart.getMarker(marker)!.frequencyHz,
    };
  });
  expect(result).toEqual({ consumed: false, frequency: 2 });
  await page.mouse.move(120, 220);
  await page.mouse.down();
  await page.mouse.move(160, 250);
  await page.mouse.up();
  await page.mouse.dblclick(140, 240);
  await page.waitForTimeout(300);
  await expect(view).toHaveAttribute('transform', original!);
  const marker = page.locator('[data-role=marker] polygon').first();
  const box = (await marker.boundingBox())!;
  const svg = (await page.locator('#chart svg').boundingBox())!;
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(svg.x + svg.width / 2, svg.y + svg.height / 2, { steps: 5 });
  await page.mouse.up();
  expect(
    await page.evaluate(
      () => window.zoomChart.getMarker(window.zoomChart.getTraces()[0].markers[0].id)!.frequencyHz,
    ),
  ).toBe(1);
  await expect(view).toHaveAttribute('transform', original!);
  await page.evaluate(() => window.zoomChart.setZoomEnabled(true));
  await page.mouse.move(150, 200);
  await page.mouse.wheel(0, -120);
  await expect(view).not.toHaveAttribute('transform', original!);
});

test('disabling during pan freezes the view, allows reset, and leaves no mouse gesture listeners after release', async ({
  page,
}) => {
  await setup(page);
  const view = page.locator('#chart svg > g');
  const original = await view.getAttribute('transform');
  await page.mouse.move(150, 220);
  await page.mouse.down();
  await page.mouse.move(180, 250);
  await expect(view).not.toHaveAttribute('transform', original!);
  await page.evaluate(() => window.zoomChart.setZoomEnabled(false));
  const frozen = await view.getAttribute('transform');
  await page.mouse.move(230, 290);
  await expect(view).toHaveAttribute('transform', frozen!);
  await page.evaluate(() => window.zoomChart.resetView());
  await expect(view).toHaveAttribute('transform', original!);
  await page.mouse.move(250, 300);
  await expect(view).toHaveAttribute('transform', original!);
  await page.mouse.up();
  expect(
    await page.evaluate(
      () =>
        ((window as typeof window & { __on?: { name: string }[] }).__on ?? []).filter(
          (entry) => entry.name === 'zoom',
        ).length,
    ),
  ).toBe(0);
  await page.evaluate(() => window.zoomChart.setZoomEnabled(true));
  await page.mouse.move(150, 220);
  await page.mouse.down();
  await page.mouse.move(170, 240);
  await page.mouse.up();
  await expect(view).not.toHaveAttribute('transform', original!);
  const validation = await page.evaluate(() => {
    let invalid = false;
    try {
      window.zoomChart.setZoomEnabled('false' as unknown as boolean);
    } catch (error) {
      invalid = error instanceof TypeError;
    }
    window.zoomChart.destroy();
    let destroyed = false;
    try {
      window.zoomChart.setZoomEnabled(false);
    } catch {
      destroyed = true;
    }
    return { invalid, destroyed };
  });
  expect(validation).toEqual({ invalid: true, destroyed: true });
});

test('touch pinch respects disabling before and during a gesture and can be re-enabled', async ({
  browser,
}) => {
  const context = await browser.newContext({
    hasTouch: true,
    viewport: { width: 600, height: 700 },
  });
  const page = await context.newPage();
  try {
    await setup(page, false);
    const result = await page.evaluate(() => {
      const svg = document.querySelector('#chart svg')!;
      const view = () => svg.querySelector('g')!.getAttribute('transform');
      const initial = view();
      const send = (type: string, distance: number) => {
        const touches = [
          { identifier: 0, clientX: 250 - distance, clientY: 250, target: svg },
          { identifier: 1, clientX: 250 + distance, clientY: 250, target: svg },
        ];
        const event = new Event(type, { bubbles: true, cancelable: true });
        Object.assign(event, {
          touches: type === 'touchend' ? [] : touches,
          changedTouches: touches,
          view: window,
        });
        svg.dispatchEvent(event);
        return event.defaultPrevented;
      };
      send('touchstart', 40);
      const consumed = send('touchmove', 80);
      send('touchend', 80);
      const disabled = view() === initial;
      window.zoomChart.setZoomEnabled(true);
      send('touchstart', 40);
      send('touchmove', 80);
      const zoomed = view();
      window.zoomChart.setZoomEnabled(false);
      send('touchmove', 110);
      const frozen = view() === zoomed;
      send('touchend', 110);
      window.zoomChart.setZoomEnabled(true);
      send('touchstart', 40);
      send('touchmove', 80);
      send('touchend', 80);
      const resumed = view() !== zoomed;
      window.zoomChart.destroy();
      return { consumed, disabled, zoomed: zoomed !== initial, frozen, resumed };
    });
    expect(result).toEqual({
      consumed: false,
      disabled: true,
      zoomed: true,
      frozen: true,
      resumed: true,
    });
  } finally {
    await context.close();
  }
});
