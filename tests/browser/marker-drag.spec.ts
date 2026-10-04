import { expect, test } from '@playwright/test';
import { loadLibrary } from './library';

test('dragging a marker suspends cursor guides and readouts until the next pointer move', async ({
  page,
}) => {
  await page.goto('./');
  await page.getByRole('button', { name: 'Load sample trace' }).click();
  const chart = page.locator('#smith svg');
  const box = (await chart.boundingBox())!;
  const center = { x: box.x + box.width / 2, y: box.y + box.height / 2 };
  await page.mouse.move(center.x, center.y);
  await expect(page.locator('#parameter-gamma')).not.toHaveText('—');

  const marker = chart.locator('[data-role=marker] polygon').last();
  await marker.hover();
  await expect(marker).toHaveCSS('cursor', 'grab');
  await page.mouse.down();
  await expect(marker).toHaveCSS('cursor', 'grabbing');
  await expect(chart).toHaveCSS('cursor', 'grabbing');
  await page.mouse.move(center.x, center.y, { steps: 10 });
  await expect(page.locator('#marker-readout')).toContainText('Frequency: 1.5 GHz');
  await expect(page.getByRole('tab', { name: 'Marker', exact: true })).toHaveAttribute(
    'aria-selected',
    'true',
  );
  await expect(page.locator('#parameter-gamma')).toHaveText('0.000 + 0.000i');
  await expect(chart.locator('.smith-cursor')).toHaveAttribute('opacity', '0');
  await expect(page.locator('[data-scale=vswr] .scale-value')).toHaveText('1 : 1');
  await page.mouse.up();
  await expect(chart).not.toHaveCSS('cursor', 'grabbing');
  await expect(marker).toHaveCSS('cursor', 'grab');
  await expect(page.getByRole('tab', { name: 'Cursor', exact: true })).toHaveAttribute(
    'aria-selected',
    'true',
  );
  await expect(page.locator('#parameter-gamma')).toHaveText('—');
  await page.mouse.move(center.x + 30, center.y + 30);
  await expect(page.locator('#parameter-gamma')).not.toHaveText('—');
  await expect(chart.locator('.smith-cursor')).not.toHaveAttribute('opacity', '0');

  // D3 ends the gesture even if the mouse is released outside the chart.
  await marker.hover();
  await page.mouse.down();
  await page.mouse.move(5, 5, { steps: 5 });
  await page.mouse.up();
  await expect(chart).not.toHaveCSS('cursor', 'grabbing');
  await page.mouse.move(center.x + 20, center.y + 20);
  await expect(page.locator('#parameter-gamma')).not.toHaveText('—');
});

test('removing a dragged dataset restores the cursor without affecting another chart', async ({
  page,
}) => {
  await page.setContent(
    '<div id="first" style="width:500px;height:500px"></div><div id="second" style="width:300px;height:300px"></div>',
  );
  await loadLibrary(page);
  await page.evaluate(() => {
    const { Smith, SmithEventType } = window.SmithTest;
    const first = new Smith();
    const second = new Smith();
    first.draw('#first');
    second.draw('#second');
    first.addS1P([{ freq: 1e9, point: [0, 0] }]);
    second.addS1P([{ freq: 1e9, point: [0, 0] }]);
    const dragEvents: [string, number | undefined][] = [];
    first.setUserActionHandler((event) => {
      if (
        event.type === SmithEventType.MarkerDragStart ||
        event.type === SmithEventType.MarkerDragEnd
      ) {
        dragEvents.push([
          event.type === SmithEventType.MarkerDragStart ? 'start' : 'end',
          event.data && 'freq' in event.data ? event.data.freq : undefined,
        ]);
        document.body.dataset.dragEvents = JSON.stringify(dragEvents);
      }
      if (event.type === SmithEventType.Cursor && event.data) {
        document.body.dataset.cursorUpdated = 'true';
      }
    });
    (window as typeof window & { removeDataset: () => void }).removeDataset = () => {
      first.removeS1P(0);
      document.body.dataset.cursorUpdated = 'false';
    };
    document.querySelector<SVGElement>('#first svg')!.style.cursor = 'crosshair';
  });
  const chart = page.locator('#first svg');
  const marker = chart.locator('[data-role=marker] polygon').last();
  await marker.hover();
  await page.mouse.down();
  await expect(chart).toHaveCSS('cursor', 'grabbing');
  await expect(page.locator('#second [data-role=marker] polygon').last()).toHaveCSS(
    'cursor',
    'grab',
  );
  await page.evaluate(() => {
    (window as typeof window & { removeDataset: () => void }).removeDataset();
  });
  await expect(chart).toHaveCSS('cursor', 'crosshair');
  await expect(page.locator('body')).toHaveAttribute(
    'data-drag-events',
    JSON.stringify([
      ['start', 1e9],
      ['end', 1e9],
    ]),
  );
  await page.mouse.up();
  const box = (await chart.boundingBox())!;
  await page.mouse.move(box.x + box.width * 0.6, box.y + box.height * 0.6);
  await expect(page.locator('body')).toHaveAttribute('data-cursor-updated', 'true');
});

test('manual tabs keep marker values independent of cursor movement and support keyboard selection', async ({
  page,
}) => {
  await page.goto('./');
  const cursorTab = page.getByRole('tab', { name: 'Cursor', exact: true });
  const markerTab = page.getByRole('tab', { name: 'Marker', exact: true });
  await cursorTab.focus();
  await page.keyboard.press('ArrowRight');
  await expect(markerTab).toBeFocused();
  await expect(page.getByRole('tabpanel')).toHaveAttribute('aria-labelledby', 'marker-tab');
  await expect(page.locator('#marker-readout')).toHaveText('Load a trace to place a marker.');
  await page.getByRole('button', { name: 'Load sample trace' }).click();
  await expect(page.locator('#marker-readout')).toContainText('Frequency: 1 GHz');
  const value = await page.locator('#parameter-gamma').textContent();
  const chart = page.locator('#smith svg');
  const box = (await chart.boundingBox())!;
  await page.mouse.move(box.x + box.width * 0.6, box.y + box.height * 0.6);
  await expect(page.locator('#parameter-gamma')).toHaveText(value!);

  await chart.locator('[data-role=marker] polygon').last().hover();
  await page.mouse.down();
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2, { steps: 10 });
  await page.mouse.up();
  await expect(markerTab).toHaveAttribute('aria-selected', 'true');
  await expect(page.locator('#marker-readout')).toContainText('Frequency: 1.5 GHz');
  await markerTab.focus();
  await page.keyboard.press('Home');
  await expect(cursorTab).toBeFocused();
  await expect(cursorTab).toHaveAttribute('aria-selected', 'true');
  await expect(page.locator('#marker-readout')).toBeHidden();
  await expect(page.getByRole('heading', { name: 'Marker', exact: true })).toHaveCount(0);
});
