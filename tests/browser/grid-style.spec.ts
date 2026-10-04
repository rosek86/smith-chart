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
    const chart = new Smith();
    chart.draw('#chart');
    return [
      chart.ConstResistance,
      chart.ConstReactance,
      chart.ConstConductance,
      chart.ConstSusceptance,
    ].map((layer) => {
      layer.show();
      const [minor, major, labels] = layer.draw().Node!.children;
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
        const labelStyle = getComputedStyle(labels.querySelector('text')!);
        return {
          minor: geometryStyles(minor),
          major: geometryStyles(major),
          text: { stroke: labelStyle.stroke, fill: labelStyle.fill, size: labelStyle.fontSize },
        };
      };
      const initial = snapshot();
      layer.Stroke = '#123456';
      layer.MajorWidth = '2';
      layer.MinorWidth = '0.5';
      const updated = snapshot();
      layer.setDrawOptions({
        stroke: '#654321',
        majorWidth: '3',
        minorWidth: '0.75',
        textColor: '#abcdef',
        textFontFamily: 'sans-serif',
        textFontSize: '9',
      });
      const options = snapshot();
      // Individual setters must still work after applying a complete options object.
      layer.Stroke = '#123456';
      layer.MajorWidth = '2';
      layer.MinorWidth = '0.5';
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
    expect(layer.options.text).toEqual({ stroke: 'none', fill: 'rgb(171, 205, 239)', size: '9px' });
  }
  expect([...tags].sort()).toEqual(['circle', 'line', 'path']);
});

for (const width of [340, 900]) {
  test(`all four grid layers keep finite labels inside the SVG at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width: width + 40, height: 1300 });
    await page.setContent(`<div id="chart" style="width:${width}px;aspect-ratio:500/650"></div>`);
    await loadLibrary(page);
    const layers = await page.evaluate(() => {
      const chart = new window.SmithTest.Smith();
      chart.draw('#chart');
      const box = document.querySelector('svg')!.getBoundingClientRect();
      const bounds = [];
      for (const layer of [
        chart.ConstResistance,
        chart.ConstReactance,
        chart.ConstConductance,
        chart.ConstSusceptance,
      ]) {
        layer.show();
        const labels = [...layer.draw().Node!.querySelectorAll('text')].map((label) => {
          const rect = label.getBoundingClientRect();
          return {
            x: rect.x - box.x,
            y: rect.y - box.y,
            right: rect.right - box.x,
            bottom: rect.bottom - box.y,
          };
        });
        bounds.push({ width: box.width, height: box.height, labels });
        layer.hide();
      }
      chart.ConstConductance.show();
      chart.ConstSusceptance.show();
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
