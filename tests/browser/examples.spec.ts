import { expect, test } from '@playwright/test';
import { readFile } from 'node:fs/promises';

test('demo links to a gallery with runnable examples and executable source', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('');
  await page.getByRole('link', { name: 'Examples', exact: true }).click();
  await expect(page).toHaveURL(/\/smithkit\/examples\/index.html$/);
  await expect(page.locator('.card')).toHaveCount(7);
  await page.screenshot({ path: 'test-results/examples-gallery.png', fullPage: true });
  for (const name of [
    'Large trace',
    'Static chart',
    'External marker controls',
    'Themes and overrides',
    'Report export',
    'Touchstone',
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
    await expect(page.locator('.card')).toHaveCount(7);
  }
  await page.setViewportSize({ width: 360, height: 740 });
  for (const slug of [
    'static',
    'markers',
    'appearance',
    'export',
    'basic',
    'large-trace',
    'touchstone',
  ]) {
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

test('example grid labels contrast with their actual background in light and dark themes', async ({
  page,
}) => {
  const contrast = () =>
    page.locator('#chart').evaluate((host) => {
      const svg = host.querySelector('svg')!;
      const label = [
        ...host.querySelectorAll<SVGTextElement>('[data-label-layer=resistance] text'),
      ].find(
        (node) =>
          node.getBoundingClientRect().width > 0 && getComputedStyle(node).visibility === 'visible',
      );
      if (!label) {
        throw new Error('No visible resistance labels');
      }
      const svgBackground = getComputedStyle(svg).backgroundColor;
      const background =
        svgBackground === 'rgba(0, 0, 0, 0)' || svgBackground === 'transparent'
          ? getComputedStyle(host).backgroundColor
          : svgBackground;
      if (background === 'rgba(0, 0, 0, 0)' || background === 'transparent') {
        throw new Error('A light chart needs an explicit host background');
      }
      const luminance = (color: string) => {
        const channels = color
          .match(/[\d.]+/g)!
          .slice(0, 3)
          .map(Number)
          .map((value) => {
            const normalized = value / 255;
            return normalized <= 0.04045
              ? normalized / 12.92
              : ((normalized + 0.055) / 1.055) ** 2.4;
          });
        return channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722;
      };
      const text = luminance(getComputedStyle(label).fill);
      const surface = luminance(background);
      return (Math.max(text, surface) + 0.05) / (Math.min(text, surface) + 0.05);
    });
  for (const slug of [
    'static',
    'markers',
    'appearance',
    'export',
    'basic',
    'large-trace',
    'touchstone',
  ]) {
    await page.goto(`examples/${slug}/index.html`);
    await expect(page.locator('#chart svg')).toHaveCount(1);
    expect(await contrast()).toBeGreaterThanOrEqual(4.5);
    if (slug === 'static') {
      await page.screenshot({ path: 'test-results/examples-static-labels.png' });
    }
    if (slug === 'appearance') {
      await page.locator('#theme').selectOption('dark');
      expect(await contrast()).toBeGreaterThanOrEqual(4.5);
      await page.locator('#theme').selectOption('light');
      expect(await contrast()).toBeGreaterThanOrEqual(4.5);
    }
  }
});

test('large-trace example switches to one million samples, compares detail and restores zoom', async ({
  page,
}) => {
  await page.goto('examples/large-trace/index.html');
  await expect(page.locator('#source')).toContainText('new Float64Array(count * 3)');
  await expect(page.locator('#reading')).toContainText('Sample 1 / 100000');
  await page.locator('#sample').fill('99999');
  await expect(page.locator('#reading')).toContainText('Sample 100000 / 100000');
  await expect(page.locator('#reading')).toContainText('3 GHz');
  await page.getByRole('button', { name: 'Focus marker' }).click();
  await page.keyboard.press('Home');
  await expect(page.locator('#sample')).toHaveValue('0');
  await page.keyboard.press('End');
  await expect(page.locator('#sample')).toHaveValue('99999');
  const group = page.locator('#chart svg > g').first();
  const original = await group.getAttribute('transform');
  await page.locator('#chart').hover();
  await page.mouse.wheel(0, -240);
  await expect(group).not.toHaveAttribute('transform', original!);
  await page.getByRole('button', { name: 'Reset view' }).click();
  await expect(group).toHaveAttribute('transform', original!);
  await expect(page.locator('#reading')).toContainText('Sample 100000 / 100000');
  await page.locator('#sample-count').selectOption('1000000');
  await expect(page.locator('#sample')).toHaveAttribute('max', '999999');
  await page.getByRole('button', { name: 'Focus marker' }).click();
  await page.keyboard.press('End');
  await expect(page.locator('#reading')).toContainText('Sample 1000000 / 1000000');
  await expect(page.locator('#reading')).toContainText('3 GHz');
  const vertices = () =>
    page.locator('.trace-line').evaluate((node) => node.getAttribute('d')!.match(/[ML]/g)!.length);
  const simplifiedCount = await vertices();
  expect(simplifiedCount).toBeLessThan(20000);
  await page.locator('#line-detail').selectOption('0');
  expect(await vertices()).toBe(1_000_000);
  await page.locator('#line-detail').selectOption('0.5');
  expect(await vertices()).toBe(simplifiedCount);
  await page.screenshot({ path: 'test-results/examples-large-trace.png', fullPage: true });
});

test('Touchstone example downloads the selected, renormalized reflection in s1p format', async ({
  page,
}) => {
  await page.goto('examples/touchstone/index.html');
  await page.getByLabel('Reflection parameter').selectOption('S22');
  await page.getByLabel('Trace reference').selectOption('75');
  await expect(page.locator('#status')).toHaveText('S22: 3 packed samples at 75 Ω.');
  const downloading = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download .s1p' }).click();
  const download = await downloading;
  expect(download.suggestedFilename()).toBe('S22-75ohm.s1p');
  const text = await readFile((await download.path())!, 'utf8');
  expect(text).toContain('# Hz S RI R 75\n');
  const lines = text.trim().split('\n');
  expect(lines).toHaveLength(4);
  const [frequency, re, im] = lines[2].split(' ').map(Number);
  expect(frequency).toBe(1.5e9);
  expect(re).toBeCloseTo((0.1 - 0.2) / (1 - 0.2 * 0.1), 14);
  expect(im).toBe(0);
  await page.screenshot({ path: 'test-results/examples-touchstone.png', fullPage: true });
});
