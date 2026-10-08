import { expect, test } from '@playwright/test';
import { PNG } from 'pngjs';
import { loadLibrary } from './library';

test('PNG preserves the view, replaces backgrounds, fits dimensions, and adds only visible traces to the legend', async ({
  page,
}) => {
  await page.setContent(
    '<div id="chart" style="width:300px;height:300px"></div><div id="scales" style="width:500px"></div>',
  );
  await loadLibrary(page);
  const result = await page.evaluate(async () => {
    const { Smith, SmithScales, Complex } = window.SmithTest;
    const chart = new Smith(50, { theme: 'dark' });
    chart.draw('#chart');
    chart.layers.resistance.setDetail('basic');
    chart.layers.reactance.setDetail('basic');
    chart.layers.reactance.setLabelsVisible(false);
    const trace = chart.addTrace([{ frequencyHz: 1e9, reflectionCoefficient: [0.2, 0.3] }], {
      name: 'Antenna Γ <test> — a long trace name '.repeat(3),
      color: '#ff0000',
    });
    chart.addTrace([{ frequencyHz: 1e9, reflectionCoefficient: [0.5, 0] }], {
      name: 'Hidden trace',
      visible: false,
    });
    const scales = new SmithScales({ theme: 'dark' });
    scales.draw('#scales');
    scales.update(Complex.from(0.2, 0.3));
    chart.toSvg();
    const before = document.querySelector('#chart')!.innerHTML;
    const inspect = async (blob: Blob) => {
      const url = URL.createObjectURL(blob);
      try {
        const image = new Image();
        image.src = url;
        await image.decode();
        const canvas = document.createElement('canvas');
        canvas.width = image.width;
        canvas.height = image.height;
        const ctx = canvas.getContext('2d')!;
        ctx.drawImage(image, 0, 0);
        const bytes = ctx.getImageData(0, 0, image.width, image.height).data;
        let painted = 0;
        for (let i = 0; i < bytes.length; i += 4) {
          if (
            bytes[i + 3] > 0 &&
            (bytes[i] !== bytes[0] || bytes[i + 1] !== bytes[1] || bytes[i + 2] !== bytes[2])
          ) {
            painted++;
          }
        }
        return {
          width: image.width,
          height: image.height,
          corner: [...bytes.slice(0, 4)],
          painted,
          type: blob.type,
        };
      } finally {
        URL.revokeObjectURL(url);
      }
    };
    const current = await inspect(await chart.toPng());
    const transparent = await inspect(await chart.toPng({ width: 600, background: 'transparent' }));
    const fitted = await inspect(
      await chart.toPng({ width: 600, height: 300, background: '#abcdef' }),
    );
    const high = await inspect(await chart.toPng({ height: 450 }));
    const legend = await inspect(await chart.toPng({ width: 600, legend: true }));
    const combined = await inspect(await chart.toPng({ width: 1200, scales, background: 'white' }));
    const scaleImage = await inspect(await scales.toPng({ width: 800, background: 'transparent' }));
    const unchanged = before === document.querySelector('#chart')!.innerHTML;
    chart.setTraceOptions(trace, { visible: false });
    const emptyLegend = await inspect(await chart.toPng({ width: 600, legend: true }));
    return {
      current,
      transparent,
      fitted,
      high,
      legend,
      combined,
      scaleImage,
      emptyLegend,
      unchanged,
    };
  });
  expect(result.current).toMatchObject({
    width: 300,
    height: 300,
    corner: [15, 23, 42, 255],
    type: 'image/png',
  });
  expect(result.transparent).toMatchObject({ width: 600, height: 600, corner: [0, 0, 0, 0] });
  expect(result.fitted).toMatchObject({ width: 600, height: 300, corner: [171, 205, 239, 255] });
  expect(result.high).toMatchObject({ width: 450, height: 450 });
  expect(result.legend.height).toBeGreaterThan(600);
  expect(result.emptyLegend.height).toBe(600);
  expect(result.combined).toMatchObject({ width: 1200, corner: [255, 255, 255, 255] });
  expect(result.scaleImage).toMatchObject({ width: 800, corner: [0, 0, 0, 0] });
  expect(result.unchanged).toBe(true);
  for (const image of [
    result.current,
    result.transparent,
    result.fitted,
    result.legend,
    result.combined,
    result.scaleImage,
  ]) {
    expect(image.painted).toBeGreaterThan(1000);
  }
});

test('PNG rejects invalid sizes, colors, unmounted and destroyed components without changing the chart', async ({
  page,
}) => {
  await page.setContent('<div id="chart" style="width:300px;height:300px"></div>');
  await loadLibrary(page);
  const result = await page.evaluate(async () => {
    const chart = new window.SmithTest.Smith();
    const scales = new window.SmithTest.SmithScales();
    let rejected = 0;
    for (const component of [chart, scales]) {
      try {
        await component.toPng();
      } catch {
        rejected++;
      }
    }
    chart.draw('#chart');
    chart.toSvg();
    const before = document.querySelector('#chart')!.innerHTML;
    const invalid = [
      { width: 0 },
      { height: -1 },
      { width: 1.5 },
      { width: NaN },
      { height: Infinity },
      { width: 8193 },
      { width: 8192, height: 8192 },
      { background: 'not-a-color' },
      { background: 'var(--page)' },
    ];
    for (const options of invalid) {
      try {
        await chart.toPng(options);
      } catch (error) {
        if (error instanceof RangeError) {
          rejected++;
        }
      }
    }
    try {
      await chart.toPng({ scales });
    } catch {
      rejected++;
    }
    const unchanged = before === document.querySelector('#chart')!.innerHTML;
    chart.destroy();
    scales.destroy();
    for (const component of [chart, scales]) {
      try {
        await component.toPng();
      } catch {
        rejected++;
      }
    }
    return { rejected, unchanged };
  });
  expect(result).toEqual({ rejected: 14, unchanged: true });
});

test('PNG releases its temporary image URL even when SVG decoding fails', async ({ page }) => {
  await page.setContent('<div id="chart" style="width:300px;height:300px"></div>');
  await loadLibrary(page);
  const result = await page.evaluate(async () => {
    const chart = new window.SmithTest.Smith();
    chart.draw('#chart');
    const decode = HTMLImageElement.prototype.decode;
    const revoke = URL.revokeObjectURL;
    let released = 0;
    let rejected = false;
    HTMLImageElement.prototype.decode = () => Promise.reject(new Error('Decode failed'));
    URL.revokeObjectURL = (url) => {
      released++;
      revoke(url);
    };
    try {
      await chart.toPng();
    } catch {
      rejected = true;
    } finally {
      HTMLImageElement.prototype.decode = decode;
      URL.revokeObjectURL = revoke;
    }
    return { released, rejected };
  });
  expect(result).toEqual({ released: 1, rejected: true });
});

test('demo downloads a combined report with the requested size, background, and legend', async ({
  page,
}) => {
  await page.goto('./');
  await page.getByRole('button', { name: 'Load sample trace' }).click();
  await page.getByRole('button', { name: 'Export PNG', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: 'Export PNG', exact: true });
  await dialog.getByLabel('Include', { exact: true }).selectOption('scales');
  await expect(dialog.getByLabel('Include visible trace legend')).toBeDisabled();
  await dialog.getByLabel('Include', { exact: true }).selectOption('combined');
  await expect(dialog.getByLabel('Include visible trace legend')).toBeEnabled();
  await dialog.getByLabel('Width (px)').fill('1200');
  await dialog.getByLabel('Height (px)').fill('700');
  await dialog.getByLabel('Background', { exact: true }).selectOption('custom');
  await dialog.getByLabel('Background color').fill('#ffffff');
  await page.screenshot({ path: 'test-results/png-export-dialog.png' });
  const downloading = page.waitForEvent('download');
  await dialog.getByRole('button', { name: 'Download PNG' }).click();
  const download = await downloading;
  expect(download.suggestedFilename()).toBe('smith-report.png');
  const path = 'test-results/smith-report.png';
  await download.saveAs(path);
  const stream = await download.createReadStream();
  const chunks: Buffer[] = [];
  for await (const chunk of stream) {
    chunks.push(Buffer.from(chunk));
  }
  const image = PNG.sync.read(Buffer.concat(chunks));
  expect([image.width, image.height]).toEqual([1200, 700]);
  expect([...image.data.slice(0, 4)]).toEqual([255, 255, 255, 255]);
  await expect(dialog.getByRole('status')).toContainText('Saved smith-report.png');
  await page.setViewportSize({ width: 360, height: 640 });
  expect(await dialog.evaluate((node) => node.scrollWidth <= node.clientWidth)).toBe(true);
  await page.keyboard.press('Escape');
  await expect(page.getByRole('button', { name: 'Export PNG', exact: true })).toBeFocused();
});
