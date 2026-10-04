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
  await expect(page.locator('#cursor-gamma')).not.toHaveText('—');

  const marker = chart.locator('[data-role=marker] polygon').last();
  await marker.hover();
  await expect(marker).toHaveCSS('cursor', 'grab');
  await page.mouse.down();
  await expect(marker).toHaveCSS('cursor', 'grabbing');
  await expect(chart).toHaveCSS('cursor', 'grabbing');
  await page.mouse.move(center.x, center.y, { steps: 10 });
  await expect(page.locator('#marker-readout')).toContainText('Frequency: 1.5 GHz');
  await expect(page.locator('#cursor-gamma')).toHaveText('—');
  await expect(chart.locator('.smith-cursor')).toHaveAttribute('opacity', '0');
  for (const dot of await page.locator('.scale-indicator').all()) {
    await expect(dot).toHaveAttribute('visibility', 'hidden');
  }
  await page.mouse.up();
  await expect(chart).not.toHaveCSS('cursor', 'grabbing');
  await expect(marker).toHaveCSS('cursor', 'grab');
  await expect(page.locator('#cursor-gamma')).toHaveText('—');
  await page.mouse.move(center.x + 30, center.y + 30);
  await expect(page.locator('#cursor-gamma')).not.toHaveText('—');
  await expect(chart.locator('.smith-cursor')).not.toHaveAttribute('opacity', '0');

  // D3 ends the gesture even if the mouse is released outside the chart.
  await marker.hover();
  await page.mouse.down();
  await page.mouse.move(5, 5, { steps: 5 });
  await page.mouse.up();
  await expect(chart).not.toHaveCSS('cursor', 'grabbing');
  await page.mouse.move(center.x + 20, center.y + 20);
  await expect(page.locator('#cursor-gamma')).not.toHaveText('—');
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
    first.setUserActionHandler((event) => {
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
  await page.mouse.up();
  const box = (await chart.boundingBox())!;
  await page.mouse.move(box.x + box.width * 0.6, box.y + box.height * 0.6);
  await expect(page.locator('body')).toHaveAttribute('data-cursor-updated', 'true');
});
