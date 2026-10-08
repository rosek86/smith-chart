import { expect, test } from '@playwright/test';
import { loadLibrary } from './library';

for (const theme of ['light', 'dark'] as const) {
  test(`${theme}: detail changes preserve styles and visibility and restore the full grid`, async ({
    page,
  }) => {
    await page.setContent('<div id="chart" style="width:600px;height:600px"></div>');
    await loadLibrary(page);
    const results = await page.evaluate((theme) => {
      const chart = new window.SmithTest.Smith(50, { theme });
      chart.draw('#chart');
      chart.peripheralScales.setVisible(false);
      for (const layer of [chart.layers.resistance, chart.layers.reactance]) {
        layer.setVisible(false);
      }
      return (['resistance', 'reactance', 'conductance', 'susceptance'] as const).map((name) => {
        const layer = chart.layers[name];
        const group = document.querySelector(`[data-layer=${name}]`)!;
        const [minor, major] = group.children;
        const labels = document.querySelector(`[data-label-layer=${name}]`)!;
        const original = major.innerHTML;
        layer.setStyle({ stroke: '#123456', majorWidth: 2 });
        layer.setDetail('basic');
        const hidden = group.getAttribute('opacity');
        layer.setVisible(true);
        const basic = {
          circles: major.querySelectorAll('circle').length,
          arcs: major.querySelectorAll('path').length,
          lines: major.querySelectorAll('line').length,
          minorHidden: minor.getAttribute('opacity'),
          labels: [...labels.querySelectorAll('text')]
            .filter((text) => getComputedStyle(text).display !== 'none')
            .map((text) => text.textContent),
          stroke: getComputedStyle(major.firstElementChild!).stroke,
          width: getComputedStyle(major.firstElementChild!).strokeWidth,
        };
        layer.setDetail('standard');
        const standard = {
          restored: major.innerHTML === original,
          minorHidden: minor.getAttribute('opacity'),
          labelsRestored: !labels.querySelector('[display=none]'),
        };
        layer.setDetail('detailed');
        const detailed = {
          restored: major.innerHTML === original,
          minorHidden: minor.getAttribute('opacity'),
        };
        layer.setVisible(false);
        return { name, hidden, basic, standard, detailed };
      });
    }, theme);
    for (const { name, hidden, basic, standard, detailed } of results) {
      const real = name === 'resistance' || name === 'conductance';
      expect(hidden).toBe('0');
      expect(basic).toMatchObject({
        circles: real ? 5 : 0,
        arcs: real ? 0 : 10,
        lines: real ? 0 : 1,
        minorHidden: '0',
        stroke: 'rgb(18, 52, 86)',
        width: '2px',
      });
      expect(basic.labels.map(Number).sort((a, b) => a - b)).toEqual(
        real ? [0, 0.2, 0.5, 1, 2, 5] : [-5, -2, -1, -0.5, -0.2, 0.2, 0.5, 1, 2, 5],
      );
      expect(standard).toEqual({ restored: true, minorHidden: '0', labelsRestored: true });
      expect(detailed).toEqual({ restored: true, minorHidden: null });
    }
  });
}

test('invalid detail is rejected without changing the chart; destroyed controls remain guarded', async ({
  page,
}) => {
  await page.setContent('<div id="chart" style="width:500px;height:500px"></div>');
  await loadLibrary(page);
  const result = await page.evaluate(() => {
    const chart = new window.SmithTest.Smith();
    chart.draw('#chart');
    const before = document.querySelector('svg')!.outerHTML;
    let invalidRejected = false;
    try {
      chart.layers.resistance.setDetail('invalid' as 'basic');
    } catch (error) {
      invalidRejected = error instanceof RangeError;
    }
    const unchanged = before === document.querySelector('svg')!.outerHTML;
    chart.destroy();
    let destroyedRejected = false;
    try {
      chart.layers.resistance.setDetail('basic');
    } catch {
      destroyedRejected = true;
    }
    return { invalidRejected, unchanged, destroyedRejected };
  });
  expect(result).toEqual({ invalidRejected: true, unchanged: true, destroyedRejected: true });
});

test('demo selector applies all three levels to both grids and exports the basic view', async ({
  page,
}) => {
  await page.goto('./');
  await page.getByRole('button', { name: 'Chart settings', exact: true }).click();
  const detail = page.getByLabel('Grid detail');
  await expect(detail).toHaveValue('detailed');
  for (const level of ['basic', 'standard', 'detailed', 'basic']) {
    await detail.selectOption(level);
    for (const name of ['resistance', 'reactance', 'conductance', 'susceptance']) {
      const layer = page.locator(`[data-layer=${name}]`);
      const minor = layer.locator(':scope > g').first();
      if (level === 'detailed') {
        await expect(minor).not.toHaveAttribute('opacity', '0');
      } else {
        await expect(minor).toHaveAttribute('opacity', '0');
      }
      const major = layer.locator(':scope > g').last();
      if (level === 'basic') {
        await expect(major.locator('circle, line, path')).toHaveCount(
          name === 'resistance' || name === 'conductance' ? 5 : 11,
        );
      }
    }
  }
  await page.locator('#peripheral-scales').uncheck();
  await page.getByRole('button', { name: 'Close', exact: true }).click();
  await page.screenshot({ path: 'test-results/basic-impedance.png', fullPage: true });
  await page.getByRole('button', { name: 'Chart settings', exact: true }).click();
  await page.locator('#impedance').uncheck();
  await page.locator('#admittance').check();
  await page.locator('#theme').selectOption('dark');
  await page.getByRole('button', { name: 'Close', exact: true }).click();
  await page.screenshot({ path: 'test-results/basic-admittance-dark.png', fullPage: true });
  const download = page.waitForEvent('download');
  await page.locator('#export-chart').click();
  const file = await download;
  const stream = await file.createReadStream();
  const chunks: Buffer[] = [];
  for await (const chunk of stream) {
    chunks.push(Buffer.from(chunk));
  }
  const svg = Buffer.concat(chunks).toString();
  expect(svg).toContain('data-layer="conductance"');
  expect(svg).not.toMatch(/NaN|Infinity/);
  await page.setContent(svg);
  await expect(page.locator('[data-layer=conductance] > g').last().locator('circle')).toHaveCount(
    5,
  );
  await expect(page.locator('[data-layer=susceptance] > g').last().locator('path')).toHaveCount(10);
});
