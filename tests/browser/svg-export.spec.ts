import pixelmatch from 'pixelmatch';
import { PNG } from 'pngjs';
import { expect, test } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { loadLibrary } from './library';

test('SVG export preserves the mounted chart, computed styles, zoom, and text references', async ({
  page,
}) => {
  await page.setContent(`
    <style>
      #chart { width: 640px; height: 480px; --trace-color: #ab1234; }
      #chart .trace-line { stroke: var(--trace-color); stroke-width: 4px; }
      #chart text { font-family: monospace; }
    </style>
    <div id="chart"></div>
  `);
  await loadLibrary(page);
  const result = await page.evaluate(async () => {
    const chart = new window.SmithTest.Smith();
    chart.draw('#chart');
    chart.layers.resistance.setDetail('standard');
    const trace = chart.addTrace(
      [
        { frequencyHz: 1e9, reflectionCoefficient: [0.2, 0.3] },
        { frequencyHz: 2e9, reflectionCoefficient: [0.5, -0.1] },
      ],
      { mode: 'both' },
    );
    const hidden = chart.addTrace([{ frequencyHz: 1, reflectionCoefficient: [-0.5, 0] }], {
      visible: false,
    });
    chart.setMarkerSample(chart.getTraces()[0].markers[0].id, 1);
    const svg = document.querySelector<SVGSVGElement>('#chart svg')!;
    svg.dispatchEvent(
      new WheelEvent('wheel', {
        deltaY: -150,
        clientX: 320,
        clientY: 240,
        bubbles: true,
        cancelable: true,
        view: window,
      }),
    );
    await new Promise((resolve) => setTimeout(resolve, 200));
    const before = svg.outerHTML;
    const exported = chart.toSvg();
    const unchanged = before === svg.outerHTML;
    const image = new DOMParser().parseFromString(exported, 'image/svg+xml');
    const root = image.documentElement;
    const path =
      root.querySelector('.trace-line') ?? root.querySelector('[data-role=samples] path');
    const references = [...root.querySelectorAll('textPath')].map((node) =>
      node.getAttribute('href'),
    );
    const intactReferences =
      references.length > 0 &&
      references.every((href) => href?.startsWith('#') && image.getElementById(href.slice(1)));
    const transforms = [
      svg.querySelector('g')!.getAttribute('transform'),
      root.querySelector('g')!.getAttribute('transform'),
    ];
    const hiddenDisplay = (root.querySelectorAll('[data-role=samples]')[1] as SVGElement).style
      .display;
    chart.updateTrace(trace, [{ frequencyHz: 3e9, reflectionCoefficient: [0, 0] }]);
    chart.removeTrace(hidden);
    const stillWorks =
      chart.getTraces().length === 1 &&
      chart.getMarker(chart.getTraces()[0].markers[0].id)!.frequencyHz === 3e9;
    chart.destroy();
    return {
      exported,
      unchanged,
      invalid: Boolean(image.querySelector('parsererror')),
      width: root.getAttribute('width'),
      height: root.getAttribute('height'),
      stroke: (path as SVGElement).style.stroke,
      strokeWidth: (path as SVGElement).style.strokeWidth,
      textFont: (root.querySelector('text') as SVGElement).style.fontFamily,
      intactReferences,
      transforms,
      hiddenDisplay,
      stillWorks,
      namespace: root.namespaceURI,
    };
  });
  expect(result).toMatchObject({
    unchanged: true,
    invalid: false,
    width: '640',
    height: '480',
    stroke: 'rgb(171, 18, 52)',
    strokeWidth: '4px',
    textFont: 'monospace',
    intactReferences: true,
    hiddenDisplay: 'none',
    stillWorks: true,
    namespace: 'http://www.w3.org/2000/svg',
  });
  expect(result.transforms[0]).toBe(result.transforms[1]);
  expect(result.exported).not.toContain('var(');
  // Open the exported document independently of the application's styles and scripts.
  const standalone = await page.context().newPage();
  await standalone.route('https://smithkit.test/export.svg', (route) =>
    route.fulfill({
      contentType: 'image/svg+xml',
      body: result.exported,
    }),
  );
  await standalone.goto('https://smithkit.test/export.svg');
  await expect(standalone.locator('[data-role=samples] path')).toHaveCSS(
    'stroke',
    'rgb(171, 18, 52)',
  );
  await expect(standalone.locator('text').first()).toHaveCSS('font-family', 'monospace');
  await standalone.close();
});

test('SVG export requires a mounted, measurable, live chart', async ({ page }) => {
  await page.setContent('<div id="chart" style="display:none;width:500px;height:500px"></div>');
  await loadLibrary(page);
  const errors = await page.evaluate(() => {
    const chart = new window.SmithTest.Smith();
    const messages: string[] = [];
    const attempt = () => {
      try {
        chart.toSvg();
      } catch (error) {
        messages.push((error as Error).message);
      }
    };
    attempt();
    chart.draw('#chart');
    attempt();
    document.getElementById('chart')!.style.display = 'block';
    const valid = chart.toSvg().startsWith('<svg');
    chart.destroy();
    attempt();
    return { messages, valid };
  });
  expect(errors.valid).toBe(true);
  expect(errors.messages).toHaveLength(3);
  expect(errors.messages[0]).toContain('mounted');
  expect(errors.messages[1]).toContain('non-zero size');
  expect(errors.messages[2]).toContain('destroyed');
});

test('demo downloads a standalone chart SVG with traces and markers', async ({ page }) => {
  await page.goto('./');
  await page.getByRole('button', { name: 'Load sample trace' }).click();
  const pending = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Export chart SVG', exact: true }).click();
  const download = await pending;
  expect(download.suggestedFilename()).toBe('smith-chart.svg');
  const content = await readFile((await download.path())!, 'utf8');
  const parsed = await page.evaluate((text) => {
    const document = new DOMParser().parseFromString(text, 'image/svg+xml');
    return {
      error: Boolean(document.querySelector('parsererror')),
      points: document.querySelectorAll('[data-role=samples] circle').length,
      markers: document.querySelectorAll('[data-role=marker]').length,
    };
  }, content);
  expect(parsed).toEqual({ error: false, points: 101, markers: 1 });
});

test('scale export preserves responsive layout and current readings without changing the DOM', async ({
  page,
}) => {
  await page.setContent('<div id="scales" style="width:720px"></div>');
  await loadLibrary(page);
  const result = await page.evaluate(() => {
    const { SmithScales, Complex } = window.SmithTest;
    const scales = new SmithScales();
    const errors: string[] = [];
    try {
      scales.toSvg();
    } catch (error) {
      errors.push((error as Error).message);
    }
    scales.draw('#scales');
    scales.update(Complex.from(0.3, 0.4));
    const container = document.querySelector<HTMLElement>('.radial-scales')!;
    const capture = () => {
      const bounds = container.getBoundingClientRect();
      const before = container.outerHTML;
      const exported = scales.toSvg();
      const doc = new DOMParser().parseFromString(exported, 'image/svg+xml');
      const axes = [...doc.documentElement.querySelectorAll('svg')];
      const expected = [...container.querySelectorAll('svg')].map((axis) => {
        const box = axis.getBoundingClientRect();
        return [box.x - bounds.x, box.y - bounds.y, box.width, box.height];
      });
      const positions = axes.map((axis) =>
        ['x', 'y', 'width', 'height'].map((key) => Number(axis.getAttribute(key))),
      );
      return {
        unchanged: before === container.outerHTML,
        invalid: Boolean(doc.querySelector('parsererror')),
        count: axes.length,
        positions,
        expected,
        readouts: [...doc.querySelectorAll('[data-role=labels] > text:nth-child(2)')].map(
          (text) => text.textContent,
        ),
        indicators: doc.querySelectorAll('[data-position]').length,
        height: Number(doc.documentElement.getAttribute('height')),
      };
    };
    const wide = capture();
    document.getElementById('scales')!.style.width = '300px';
    const narrow = capture();
    scales.update(null);
    const cleared = capture();
    scales.destroy();
    try {
      scales.toSvg();
    } catch (error) {
      errors.push((error as Error).message);
    }
    return { wide, narrow, cleared, errors };
  });
  for (const capture of [result.wide, result.narrow, result.cleared]) {
    expect(capture).toMatchObject({ unchanged: true, invalid: false, count: 12 });
    expect(capture.positions).toEqual(capture.expected);
  }
  expect(result.wide.indicators).toBe(12);
  expect(result.wide.readouts[0]).toBe('3 : 1');
  expect(result.narrow.readouts).toEqual(result.wide.readouts);
  expect(result.narrow.height).toBeGreaterThan(result.wide.height);
  expect(result.cleared.indicators).toBe(0);
  expect(result.cleared.readouts.every((text) => text === '—')).toBe(true);
  expect(result.errors).toHaveLength(2);
  expect(result.errors[0]).toContain('mounted');
  expect(result.errors[1]).toContain('destroyed');
});

test('demo downloads all radial scales as one independent SVG', async ({ page }) => {
  await page.goto('./');
  const pending = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Export scales SVG', exact: true }).click();
  const download = await pending;
  expect(download.suggestedFilename()).toBe('smith-scales.svg');
  const content = await readFile((await download.path())!, 'utf8');
  const result = await page.evaluate((text) => {
    const document = new DOMParser().parseFromString(text, 'image/svg+xml');
    return {
      invalid: Boolean(document.querySelector('parsererror')),
      scales: document.querySelectorAll('[data-scale]').length,
      height: Number(document.documentElement.getAttribute('height')),
    };
  }, content);
  expect(result).toMatchObject({ invalid: false, scales: 12 });
  expect(result.height).toBeGreaterThan(0);
});

test('standalone SVG paints the same chart as the live view', async ({ page }, testInfo) => {
  await page.setContent('<div id="chart" style="width:500px;height:500px"></div>');
  await loadLibrary(page);
  const svg = await page.evaluate(() => {
    const chart = new window.SmithTest.Smith();
    chart.draw('#chart');
    chart.layers.resistance.setStyle({ textColor: '#ab1234', textFontSize: 8 });
    chart.addTrace(
      [
        { frequencyHz: 1, reflectionCoefficient: [0.3, 0.4] },
        { frequencyHz: 2, reflectionCoefficient: [-0.3, -0.4] },
      ],
      { mode: 'both' },
    );
    return chart.toSvg();
  });
  const original = await page.locator('#chart > svg').screenshot();
  const standalone = await page.context().newPage();
  await standalone.route('https://smithkit.test/chart.svg', (route) =>
    route.fulfill({ contentType: 'image/svg+xml', body: svg }),
  );
  await standalone.goto('https://smithkit.test/chart.svg');
  const exported = await standalone.locator('svg').screenshot();
  await testInfo.attach('live', { body: original, contentType: 'image/png' });
  await testInfo.attach('export', { body: exported, contentType: 'image/png' });
  const reference = PNG.sync.read(original);
  expect([reference.width, reference.height]).toEqual([500, 500]);
  const compare = (image: Buffer) => {
    const actual = PNG.sync.read(image);
    expect([actual.width, actual.height]).toEqual([reference.width, reference.height]);
    const diff = new PNG({ width: reference.width, height: reference.height });
    // Ignore detected antialiasing, which differs between inline and standalone SVG
    // on Linux. Keep a strict limit on perceptually different pixels elsewhere.
    const differentPixels = pixelmatch(
      reference.data,
      actual.data,
      diff.data,
      reference.width,
      reference.height,
      { threshold: 0.1, includeAA: false },
    );
    return { differentPixels, diff: PNG.sync.write(diff) };
  };
  const difference = compare(exported);
  await testInfo.attach('diff', { body: difference.diff, contentType: 'image/png' });
  expect(difference.differentPixels).toBeLessThan(25);

  // Verify that the comparison still rejects an omitted caption or measurement trace.
  for (const selector of [
    '[data-label-scale=wavelengths-generator] text:has(textPath)',
    '[data-layer=samples]',
  ]) {
    const element = standalone.locator(selector);
    const style = await element.getAttribute('style');
    await element.evaluate((node) => {
      node.style.visibility = 'hidden';
    });
    const missingElement = compare(await standalone.locator('svg').screenshot());
    expect(missingElement.differentPixels, selector).toBeGreaterThanOrEqual(25);
    await element.evaluate((node, originalStyle) => {
      if (originalStyle === null) {
        node.removeAttribute('style');
      } else {
        node.setAttribute('style', originalStyle);
      }
    }, style);
  }
  await standalone.close();
});
