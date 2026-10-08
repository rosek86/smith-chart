import { expect, test } from '@playwright/test';
import { readFile } from 'node:fs/promises';

test('demo links to a gallery with runnable examples and executable source', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('');
  await page.getByRole('link', { name: 'Examples', exact: true }).click();
  await expect(page).toHaveURL(/\/smithkit\/examples\/index.html$/);
  await expect(page.locator('.card')).toHaveCount(5);
  await page.screenshot({ path: 'test-results/examples-gallery.png', fullPage: true });
  for (const name of [
    'Static chart',
    'External marker controls',
    'Themes and overrides',
    'Report export',
    'Mount, update, and destroy',
  ]) {
    await page
      .locator('.card')
      .filter({ has: page.getByRole('heading', { name, exact: true }) })
      .click();
    await expect(page.locator('#chart svg')).toHaveCount(1);
    await expect(page.locator('#source')).toContainText("from 'smithkit'");
    await page.reload();
    await expect(page.locator('#chart svg')).toHaveCount(1);
    await page.goBack();
    await expect(page.locator('.card')).toHaveCount(5);
  }
  await page.setViewportSize({ width: 360, height: 740 });
  for (const slug of ['static', 'markers', 'appearance', 'export', 'basic']) {
    await page.goto(`examples/${slug}/index.html`);
    await expect(page.locator('#chart svg')).toHaveCount(1);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(360);
  }
  expect(errors).toEqual([]);
});

test('examples connect HTML controls to public marker and appearance APIs', async ({ page }) => {
  await page.goto('examples/markers/index.html');
  await page.locator('#sample').fill('2');
  await expect(page.locator('#reading')).toContainText('1.5 GHz');
  await page.getByRole('button', { name: 'Focus marker' }).click();
  await page.keyboard.press('ArrowRight');
  await expect(page.locator('#sample')).toHaveValue('3');
  await expect(page.locator('#reading')).toContainText('1.75 GHz');
  await page.goto('examples/appearance/index.html');
  const before = await page
    .locator('#chart svg')
    .evaluate((node) => getComputedStyle(node).backgroundColor);
  await page.locator('#theme').selectOption('dark');
  await expect
    .poll(() =>
      page.locator('#chart svg').evaluate((node) => getComputedStyle(node).backgroundColor),
    )
    .not.toBe(before);
  await expect(page.locator('#chart [data-role="marker"]')).toHaveCount(1);
  await page.screenshot({ path: 'test-results/examples-theme.png', fullPage: true });
  await page.goto('examples/static/index.html');
  await expect(page.locator('#chart [data-role="marker"]')).toHaveCount(0);
  const transform = await page.locator('#chart svg > g').getAttribute('transform');
  await page.locator('#chart').hover();
  await page.mouse.wheel(0, -400);
  await expect(page.locator('#chart svg > g')).toHaveAttribute('transform', transform!);
});

test('report example downloads SVG and PNG without demo helpers', async ({ page }) => {
  await page.goto('examples/export/index.html');
  for (const format of ['SVG', 'PNG']) {
    const downloading = page.waitForEvent('download');
    await page.getByRole('button', { name: `Download ${format}` }).click();
    const download = await downloading;
    expect(download.suggestedFilename()).toBe(`smithkit-report.${format.toLowerCase()}`);
    await expect(page.locator('#status')).toContainText('Saved');
    const bytes = await readFile((await download.path())!);
    if (format === 'SVG') {
      expect(bytes.toString()).toContain('Marker 1');
      expect(bytes.toString()).toContain('Measured antenna');
    } else {
      expect(bytes.subarray(1, 4).toString()).toBe('PNG');
    }
  }
});
