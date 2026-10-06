import { expect, test } from '@playwright/test';

test('renders labels and supports cursor, zoom, layers and marker drag under /smithkit/', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('./');
  const svg = page.locator('#smith svg');
  await expect(svg).toBeVisible();
  await expect(svg.locator('.radial-scales')).toHaveCount(0);
  await expect(page.locator('#smith-scales [data-scale]')).toHaveCount(12);
  for (const layer of ['resistance', 'reactance']) {
    expect(await svg.locator(`[data-layer=${layer}]`).getAttribute('opacity')).not.toBe('0');
    expect(await svg.locator(`[data-label-layer=${layer}] text`).count()).toBeGreaterThan(20);
  }
  expect(await svg.evaluate((node) => /NaN|Infinity/.test(node.outerHTML))).toBe(false);
  const box = (await svg.boundingBox())!;
  // The square chart is centered in its own SVG.
  const center = { x: box.x + box.width / 2, y: box.y + box.height / 2 };
  await page.mouse.move(center.x, center.y);
  // Native mouse coordinates can be rounded to device pixels in WebKit.
  // Exact RF values are covered by synthetic-coordinate and unit tests.
  await expect(async () => {
    const vswr = parseFloat((await page.locator('[data-scale=vswr] .scale-value').textContent())!);
    const q = Number(await page.locator('#parameter-q').textContent());
    expect(vswr).toBeGreaterThanOrEqual(1);
    expect(vswr).toBeLessThan(1.02);
    expect(q).toBeLessThan(0.02);
  }).toPass();
  const chart = svg.locator(':scope > g');
  const original = await chart.getAttribute('transform');
  await page.mouse.wheel(0, -240);
  await expect(chart).not.toHaveAttribute('transform', original!);
  await page.getByRole('button', { name: 'Reset view' }).click();
  await expect(chart).toHaveAttribute('transform', original!);
  await page.getByLabel('Impedance', { exact: true }).uncheck();
  for (const layer of ['resistance', 'reactance']) {
    await expect(svg.locator(`[data-layer=${layer}]`)).toHaveAttribute('opacity', '0');
  }
  await page.getByLabel('Admittance', { exact: true }).check();
  for (const layer of ['conductance', 'susceptance']) {
    expect(await svg.locator(`[data-layer=${layer}]`).getAttribute('opacity')).not.toBe('0');
  }
  await page.getByLabel('Impedance', { exact: true }).check();
  await page.getByLabel('Admittance', { exact: true }).uncheck();
  await page.getByRole('button', { name: 'Load sample trace' }).click();
  await expect(page.locator('#marker-readout')).toContainText('Frequency: 1 GHz');
  const marker = svg.locator('polygon').first();
  const markerBox = (await marker.boundingBox())!;
  await page.mouse.move(markerBox.x + markerBox.width / 2, markerBox.y + markerBox.height / 2);
  await page.mouse.down();
  // Loading controls can scroll the document; use the current chart geometry.
  const currentBox = (await svg.boundingBox())!;
  await page.mouse.move(currentBox.x + currentBox.width / 2, currentBox.y + currentBox.height / 2, {
    steps: 15,
  });
  await page.mouse.up();
  await expect(page.locator('#marker-readout')).toContainText('Frequency: 1.5 GHz');
  expect(errors).toEqual([]);
  await page.screenshot({ path: 'test-results/chart-desktop.png', fullPage: true });
});

test('imports measurements and reports errors without losing existing traces', async ({ page }) => {
  await page.goto('./');
  const input = page.locator('#file');
  await input.setInputFiles({
    name: 'sample.s1p',
    mimeType: 'text/plain',
    buffer: Buffer.from('# MHz S RI R 50\n1000 0.5 -0.2\n1500 0 0'),
  });
  await expect(page.locator('#file-status')).toContainText('2 samples loaded');
  await expect(page.locator('#marker-readout')).toContainText('Frequency: 1 GHz');
  await input.setInputFiles({
    name: 'invalid.s1p',
    mimeType: 'text/plain',
    buffer: Buffer.from('# Hz S RI R 50\ninvalid'),
  });
  await expect(page.locator('#file-status')).toHaveAttribute('data-error', 'true');
  await expect(page.locator('#marker-readout')).toContainText('Frequency: 1 GHz');
  await input.setInputFiles({
    name: '75-ohm.s1p',
    mimeType: 'text/plain',
    buffer: Buffer.from('# Hz S RI R 75\n1 0 0'),
  });
  await expect(page.locator('#file-status')).toContainText('file uses 75 Ω');
});

test('fits the chart and radial labels on a narrow screen', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('./');
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(390);
  const labels = page.locator('.radial-scales text');
  const svg = (await page.locator('#smith-scales').boundingBox())!;
  for (const label of await labels.all()) {
    // WebKit's automation boundingBox ignores text-anchor on SVG text.
    // The DOM rect includes the actual anchored position used by layout.
    const box = await label.evaluate((node) => {
      const rect = node.getBoundingClientRect();
      return { x: rect.x, y: rect.y, width: rect.width, height: rect.height };
    });
    expect(box.x).toBeGreaterThanOrEqual(svg.x);
    expect(box.x + box.width).toBeLessThanOrEqual(svg.x + svg.width);
    expect(box.y + box.height).toBeLessThanOrEqual(svg.y + svg.height);
  }
  await page.screenshot({ path: 'test-results/chart-mobile.png', fullPage: true });
});
