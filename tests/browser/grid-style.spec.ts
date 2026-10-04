import { expect, test } from '@playwright/test';
import { resolve } from 'node:path';
import { build } from 'vite';

// Exercise the library API in a real SVG DOM without exposing test hooks in the demo.
let libraryBundle: string;

test.beforeAll(async () => {
  const result = await build({
    configFile: false,
    logLevel: 'silent',
    build: {
      lib: { entry: resolve('src/index.ts'), name: 'SmithTest', formats: ['iife'] },
      write: false,
      minify: false,
    },
  });
  const bundle = Array.isArray(result) ? result[0] : result;
  if (!('output' in bundle)) throw new Error('Expected a library bundle.');
  const chunk = bundle.output.find((output) => output.type === 'chunk');
  if (!chunk) throw new Error('The library bundle contains no JavaScript.');
  libraryBundle = chunk.code;
});

test('grid setters and drawing options update the rendered geometry of all four layers', async ({
  page,
}) => {
  await page.setContent('<div id="chart" style="width: 500px; height: 650px"></div>');
  await page.addScriptTag({ content: libraryBundle });
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
      [layer.initial, 'rgb(0, 0, 0)', '0.2px', '0.1px'],
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
