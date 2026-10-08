import { expect, test } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { loadLibrary } from './library';

test('marker legends identify visible markers, select fields, wrap names, and preserve the live chart', async ({
  page,
}) => {
  await page.setContent(
    '<div id="chart" style="width:320px;height:320px"></div><div id="scales" style="width:320px"></div>',
  );
  await loadLibrary(page);
  const result = await page.evaluate(() => {
    const { Smith, SmithScales } = window.SmithTest;
    const chart = new Smith({
      referenceImpedanceOhms: 50,
      appearance: { theme: 'dark' },
      interaction: { zoom: true, cursor: true },
      peripheralScales: { visible: true },
      grid: { detail: 'detailed' },
    });
    chart.draw('#chart');
    const trace = chart.addTrace(
      [
        { frequencyHz: 1e9, reflectionCoefficient: [0, 0] },
        { frequencyHz: 2e9, reflectionCoefficient: [1, 0] },
      ],
      { name: 'Antenna <A> & Γ', color: '#ff0000' },
    );
    chart.addMarker(trace);
    const first = chart.getTraces()[0].markers[0].id;
    const second = chart.addMarker(trace, 1)!;
    chart.addMarker(
      chart.addTrace([{ frequencyHz: 1e9, reflectionCoefficient: [0, 0] }], {
        name: 'Hidden trace',
        visible: false,
      }),
    );
    const scales = new SmithScales({ theme: 'dark' });
    scales.draw('#scales');
    const before = document.body.innerHTML;
    const parse = (svg: string) => {
      const root = new DOMParser().parseFromString(svg, 'image/svg+xml').documentElement;
      const texts = [...root.children].filter((node) => node.tagName === 'text');
      return {
        text: texts.map((node) => node.textContent).join(''),
        rows: texts.length,
        height: Number(root.getAttribute('height')),
      };
    };
    const defaults = parse(chart.toSvg({ markerLegend: true }));
    const none = parse(chart.toSvg({ markerLegend: false }));
    const selected = parse(
      chart.toSvg({
        markerLegend: {
          markerIds: [second, second],
          fields: ['frequency', 'impedance', 'vswr', 'returnLoss'],
        },
      }),
    );
    const allFields = parse(
      chart.toSvg({
        scales,
        markerLegend: {
          markerIds: [first],
          fields: ['admittance', 'reflectionCoefficient', 'vswr', 'returnLoss'],
        },
      }),
    );
    const empty = parse(chart.toSvg({ markerLegend: { markerIds: [] } }));
    const unchanged = before === document.body.innerHTML;
    chart.setTraceOptions(trace, { name: 'Long trace & Γ '.repeat(20) });
    const renamed = parse(
      chart.toSvg({ legend: true, markerLegend: { markerIds: [first], fields: [] } }),
    );
    chart.setMarkerSample(first, 1);
    const updated = parse(chart.toSvg({ markerLegend: { markerIds: [first] } }));
    chart.removeMarker(second);
    let unknown = false;
    try {
      chart.toSvg({ markerLegend: { markerIds: [second] } });
    } catch (error) {
      unknown = error instanceof RangeError;
    }
    let invalidField = false;
    try {
      chart.toSvg({ markerLegend: { fields: ['unknown' as never] } });
    } catch (error) {
      invalidField = error instanceof RangeError;
    }
    return {
      defaults,
      none,
      selected,
      allFields,
      empty,
      unchanged,
      renamed,
      updated,
      unknown,
      invalidField,
    };
  });
  expect(result.defaults.text).toContain(
    'Antenna <A> & Γ · Marker 1 · f = 1 GHz · Z = 50.000 + 0.000i Ω',
  );
  expect(result.defaults.text).toContain('Marker 2 · f = 2 GHz · Z = ∞ Ω');
  expect(result.defaults.text).not.toContain('Hidden trace');
  expect(result.none.text).toBe('');
  expect(result.empty.height).toBe(result.none.height);
  expect(result.selected.text).not.toContain('Marker 1');
  expect(result.selected.text.match(/Marker 2/g)).toHaveLength(1);
  expect(result.selected.text).toContain('VSWR = ∞ : 1 · Return loss = 0 dB');
  expect(result.allFields.text).toContain(
    'Y = 20.000 + 0.000i mS · Γ = 0.000 + 0.000i · VSWR = 1 : 1 · Return loss = ∞ dB',
  );
  expect(result.allFields.text).not.toContain('f =');
  expect(result.allFields.height).toBeGreaterThan(result.defaults.height);
  expect(result.renamed.rows).toBeGreaterThan(10);
  expect(result.renamed.text).not.toContain('Z =');
  expect(result.updated.text).toContain('f = 2 GHz');
  expect(result.unknown).toBe(true);
  expect(result.invalidField).toBe(true);
  expect(result.unchanged).toBe(true);
});

test('PNG captures marker legend readings at invocation and uses the same text as SVG', async ({
  page,
}) => {
  await page.setContent('<div id="chart" style="width:400px;height:400px"></div>');
  await loadLibrary(page);
  const result = await page.evaluate(async () => {
    const chart = new window.SmithTest.Smith({
      interaction: { zoom: true, cursor: true },
      peripheralScales: { visible: true },
      grid: { detail: 'detailed' },
    });
    chart.draw('#chart');
    chart.addMarker(
      chart.addTrace(
        [
          { frequencyHz: 1e9, reflectionCoefficient: [0, 0] },
          { frequencyHz: 2e9, reflectionCoefficient: [0.5, 0] },
        ],
        { name: 'Antenna' },
      ),
    );
    const root = new DOMParser().parseFromString(
      chart.toSvg({ markerLegend: true }),
      'image/svg+xml',
    ).documentElement;
    const expected = [...root.children]
      .filter((node) => node.tagName === 'text')
      .map((node) => node.textContent)
      .join('');
    const drawn: string[] = [];
    const original = CanvasRenderingContext2D.prototype.fillText;
    CanvasRenderingContext2D.prototype.fillText = function (text, x, y) {
      drawn.push(text);
      original.call(this, text, x, y);
    };
    try {
      const pending = chart.toPng({ markerLegend: true });
      chart.setMarkerSample(chart.getTraces()[0].markers[0].id, 1);
      const blob = await pending;
      return { expected, actual: drawn.join(''), type: blob.type, size: blob.size };
    } finally {
      CanvasRenderingContext2D.prototype.fillText = original;
    }
  });
  expect(result.actual).toBe(result.expected);
  expect(result.actual).toContain('f = 1 GHz');
  expect(result.type).toBe('image/png');
  expect(result.size).toBeGreaterThan(1000);
});

test('demo selects marker legend content independently from traces and scale readings', async ({
  page,
}) => {
  await page.goto('');
  await page.getByRole('button', { name: 'Load sample trace' }).click();
  await page.getByRole('button', { name: 'Add marker', exact: true }).click();
  await page.getByRole('button', { name: 'Export', exact: true }).click();
  await expect(page.locator('#image-marker-legend')).not.toBeChecked();
  await page.locator('#image-marker-legend').check();
  await page.locator('#image-legend').uncheck();
  await page.locator('#image-target').selectOption('combined');
  await page.locator('#image-readout').selectOption('');
  await page.locator('#image-marker-list input').last().uncheck();
  await page.locator('[name="image-marker-field"][value="admittance"]').check();
  await page.locator('#image-width').fill('1200');
  await page.locator('#image-background').selectOption('custom');
  await page.locator('#image-color').fill('#0f172a');
  await page.locator('#image-format').selectOption('svg');
  const downloading = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download', exact: true }).click();
  const download = await downloading;
  const svg = await readFile((await download.path())!, 'utf8');
  expect(svg).toContain('Marker 1');
  expect(svg).not.toContain('Marker 2');
  expect(svg).toContain(' mS');
  expect(svg).not.toContain('scale-readout-label');
  await page.locator('#image-format').selectOption('png');
  const pngDownloading = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download', exact: true }).click();
  await (await pngDownloading).saveAs('test-results/marker-legend-report.png');
  await page.locator('#image-target').selectOption('scales');
  await expect(page.locator('#image-marker-legend')).toBeDisabled();
  await expect(page.locator('#image-marker-legend-settings')).toBeHidden();
  await page.locator('#image-target').selectOption('chart');
  await page.setViewportSize({ width: 360, height: 640 });
  const dialog = page.getByRole('dialog', { name: 'Export', exact: true });
  expect(await dialog.evaluate((node) => node.scrollWidth <= node.clientWidth)).toBe(true);
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: 'Export', exact: true }).click();
  await expect(page.locator('#image-marker-list input').last()).not.toBeChecked();
  await page.locator('#image-marker-legend-settings').scrollIntoViewIfNeeded();
  await page.screenshot({ path: 'test-results/marker-legend-dialog.png' });
});
