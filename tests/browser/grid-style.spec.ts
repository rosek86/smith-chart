import { expect, test } from '@playwright/test';
import { loadLibrary } from './library';

test('grid setters and drawing options update the rendered geometry of all four layers', async ({
  page,
}) => {
  await page.setContent('<div id="chart" style="width: 500px; height: 650px"></div>');
  await loadLibrary(page);
  const layers = await page.evaluate(() => {
    const { Smith } = (window as typeof window & { SmithTest: typeof import('../../src/index') })
      .SmithTest;
    const chart = new Smith({
      interaction: { zoom: true, cursor: true },
      peripheralScales: { visible: true },
      grid: { detail: 'detailed' },
    });
    chart.draw('#chart');
    return (['resistance', 'reactance', 'conductance', 'susceptance'] as const).map((name) => {
      const layer = chart.layers[name];
      layer.setVisible(true);
      const [minor, major] = document.querySelector(`[data-layer=${name}]`)!.children;
      const labels = document.querySelector(`[data-label-layer=${name}]`)!;
      const geometryStyles = (group: Element) =>
        Array.from(group.querySelectorAll('line, circle, path'), (shape) => {
          const style = getComputedStyle(shape);
          return {
            tag: shape.tagName,
            stroke: style.stroke,
            width: style.strokeWidth,
            fill: style.fill,
            vectorEffect: style.vectorEffect,
          };
        });
      const snapshot = () => {
        const label = labels.querySelector('text')!;
        const labelStyle = getComputedStyle(label);
        const matrix = label.getScreenCTM()!;
        return {
          minor: geometryStyles(minor),
          major: geometryStyles(major),
          text: {
            stroke: labelStyle.stroke,
            fill: labelStyle.fill,
            size: labels.getAttribute('font-size'),
            renderedSize: parseFloat(labelStyle.fontSize) * Math.hypot(matrix.a, matrix.b),
          },
        };
      };
      const initial = snapshot();
      layer.setStyle({ stroke: '#123456', majorWidth: 2, minorWidth: 0.5 });
      const updated = snapshot();
      layer.setStyle({
        stroke: '#654321',
        majorWidth: 3,
        minorWidth: 0.75,
        textColor: '#abcdef',
        textFontFamily: 'sans-serif',
        textFontSize: 9,
      });
      const options = snapshot();
      // Individual setters must still work after applying a complete options object.
      layer.setStyle({ stroke: '#123456', majorWidth: 2, minorWidth: 0.5 });
      return { initial, updated, options, updatedAgain: snapshot() };
    });
  });

  const tags = new Set<string>();
  for (const layer of layers) {
    for (const [snapshot, stroke, majorWidth, minorWidth] of [
      [layer.initial, 'rgb(100, 116, 139)', '1px', '0.6px'],
      [layer.updated, 'rgb(18, 52, 86)', '2px', '0.5px'],
      [layer.options, 'rgb(101, 67, 33)', '3px', '0.75px'],
      [layer.updatedAgain, 'rgb(18, 52, 86)', '2px', '0.5px'],
    ] as const) {
      for (const [shapes, width] of [
        [snapshot.major, majorWidth],
        [snapshot.minor, minorWidth],
      ] as const) {
        expect(shapes.length).toBeGreaterThan(0);
        for (const shape of shapes) {
          tags.add(shape.tag);
          expect(shape).toMatchObject({
            stroke,
            width,
            fill: 'none',
            vectorEffect: 'non-scaling-stroke',
          });
        }
      }
      expect(snapshot.text.stroke).toBe('none');
    }
    expect(layer.updated.text).toEqual(layer.initial.text);
    expect(layer.options.text).toMatchObject({
      stroke: 'none',
      fill: 'rgb(171, 205, 239)',
      size: '9',
    });
    expect(layer.options.text.renderedSize).toBeGreaterThanOrEqual(8.99);
  }
  expect([...tags].sort()).toEqual(['circle', 'line', 'path']);
});

for (const width of [340, 900]) {
  test(`all four grid layers keep finite labels inside the SVG at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width: width + 40, height: 1300 });
    await page.setContent(`<div id="chart" style="width:${width}px;aspect-ratio:500/650"></div>`);
    await loadLibrary(page);
    const layers = await page.evaluate(() => {
      const chart = new window.SmithTest.Smith({
        interaction: { zoom: true, cursor: true },
        peripheralScales: { visible: true },
        grid: { detail: 'detailed' },
      });
      chart.draw('#chart');
      const box = document.querySelector('svg')!.getBoundingClientRect();
      const bounds = [];
      for (const name of [
        'resistance',
        'reactance',
        'conductance',
        'susceptance',
        'peripheral-scales',
      ] as const) {
        const layer = name === 'peripheral-scales' ? chart.peripheralScales : chart.layers[name];
        layer.setVisible(true);
        const labels = [
          ...document.querySelectorAll<SVGTextElement>(`[data-label-layer=${name}] text`),
        ]
          .filter((label) => getComputedStyle(label).visibility !== 'hidden')
          .map((label) => {
            const rect = label.getBoundingClientRect();
            return {
              x: rect.x - box.x,
              y: rect.y - box.y,
              right: rect.right - box.x,
              bottom: rect.bottom - box.y,
            };
          });
        bounds.push({ width: box.width, height: box.height, labels });
        layer.setVisible(false);
      }
      chart.layers.conductance.setVisible(true);
      chart.layers.susceptance.setVisible(true);
      return bounds;
    });
    for (const layer of layers) {
      for (const label of layer.labels) {
        expect(Object.values(label).every(Number.isFinite)).toBe(true);
        expect(label.x).toBeGreaterThanOrEqual(0);
        expect(label.y).toBeGreaterThanOrEqual(0);
        expect(label.right).toBeLessThanOrEqual(layer.width);
        expect(label.bottom).toBeLessThanOrEqual(layer.height);
      }
    }
    await page.screenshot({ path: `test-results/admittance-${width}.png`, fullPage: true });
  });
}

test('numeric layer styles reject invalid lengths before changing any style', async ({ page }) => {
  await page.setContent('<div id="chart" style="width:500px;height:500px"></div>');
  await loadLibrary(page);
  const result = await page.evaluate(() => {
    const chart = new window.SmithTest.Smith({
      interaction: { zoom: true, cursor: true },
      peripheralScales: { visible: true },
      grid: { detail: 'detailed' },
    });
    chart.draw('#chart');
    chart.layers.resistance.setStyle({ stroke: 'blue', majorWidth: 2 });
    chart.layers.q.setStyle({ stroke: 'blue', strokeWidth: 2 });
    const before = document.querySelector('svg')!.outerHTML;
    let rejected = 0;
    for (const width of [0, -1, NaN, Infinity, '3']) {
      for (const apply of [
        () => chart.layers.resistance.setStyle({ stroke: 'red', majorWidth: width as number }),
        () => chart.layers.q.setStyle({ stroke: 'red', strokeWidth: width as number }),
      ]) {
        try {
          apply();
        } catch (error) {
          if (error instanceof RangeError) {
            rejected++;
          }
        }
      }
    }
    const unchanged = document.querySelector('svg')!.outerHTML === before;
    chart.destroy();
    return { rejected, unchanged };
  });
  expect(result).toEqual({ rejected: 10, unchanged: true });
});
