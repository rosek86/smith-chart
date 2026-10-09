/* global window, document, requestAnimationFrame, MouseEvent, WheelEvent */
import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { build } from 'vite';
import { chromium, webkit } from '@playwright/test';

// Run before and after changes on the same machine. Timings are diagnostic, not CI thresholds.
const engine = process.env.BENCH_BROWSER === 'webkit' ? webkit : chromium;
const formats = (process.env.BENCH_FORMATS ?? 'objects,tuples,packed').split(',');
const modes = (process.env.BENCH_MODES ?? 'line,points').split(',');
const lineTolerancePx = Number(process.env.BENCH_LINE_TOLERANCE_PX ?? 0);
const sizes = (process.env.BENCH_SIZES ?? '10000,100000,1000000').split(',').map(Number);
const built = await build({
  configFile: false,
  logLevel: 'silent',
  build: {
    lib: { entry: resolve('src/index.ts'), name: 'SmithTest', formats: ['iife'] },
    write: false,
    minify: false,
  },
});
const output = Array.isArray(built) ? built[0] : built;
const bundle = output.output.find((entry) => entry.type === 'chunk').code;
const browser = await engine.launch();
const results = [];
try {
  for (const size of sizes) {
    for (const format of formats) {
      for (const mode of modes) {
        const runs = [];
        for (let run = 0; run < 3; run++) {
          const page = await browser.newPage({ viewport: { width: 800, height: 800 } });
          await page.setContent('<div id="chart" style="width:500px;height:500px"></div>');
          await page.addScriptTag({ content: bundle });
          runs.push(
            await page.evaluate(
              async ({ size, format, mode, lineTolerancePx }) => {
                const input = format === 'packed' ? new Float64Array(size * 3) : new Array(size);
                for (let i = 0; i < size; i++) {
                  const f = 1e9 + i * 1000;
                  const re = 0.7 * Math.cos((i / size) * 10);
                  const im = 0.7 * Math.sin((i / size) * 10);
                  if (format === 'packed') {
                    input[i * 3] = f;
                    input[i * 3 + 1] = re;
                    input[i * 3 + 2] = im;
                  } else {
                    input[i] =
                      format === 'tuples'
                        ? [f, re, im]
                        : { frequencyHz: f, reflectionCoefficient: [re, im] };
                  }
                }
                const chart = new window.SmithTest.Smith({ interaction: { zoom: true } });
                chart.draw('#chart');
                const measure = (fn) => {
                  const start = performance.now();
                  fn();
                  return performance.now() - start;
                };
                const frame = () => new Promise((resolve) => requestAnimationFrame(resolve));
                let id;
                const addMs = measure(() => {
                  id = chart.addTrace(input, { mode, lineTolerancePx });
                });
                const marker = chart.addMarker(id);
                const updateMs = measure(() => chart.updateTrace(id, input));
                const frequencyMs = measure(() =>
                  chart.setMarkerFrequency(marker, 1e9 + (size - 1) * 1000),
                );
                await frame();
                await frame();
                const dragTarget = document.querySelector('[data-role=marker]');
                const rect = dragTarget.getBoundingClientRect();
                dragTarget.dispatchEvent(
                  new MouseEvent('mousedown', {
                    bubbles: true,
                    view: window,
                    clientX: rect.x,
                    clientY: rect.y,
                    buttons: 1,
                  }),
                );
                const dragMs = measure(() =>
                  window.dispatchEvent(
                    new MouseEvent('mousemove', {
                      bubbles: true,
                      view: window,
                      clientX: 250,
                      clientY: 100,
                      buttons: 1,
                    }),
                  ),
                );
                window.dispatchEvent(new MouseEvent('mouseup', { bubbles: true, view: window }));
                const selectedIndex = chart.getMarker(marker).sampleIndex;
                const svg = document.querySelector('#chart svg');
                const start = performance.now();
                const zoomMs = measure(() =>
                  svg.dispatchEvent(
                    new WheelEvent('wheel', {
                      deltaY: -80,
                      clientX: 250,
                      clientY: 250,
                      bubbles: true,
                      cancelable: true,
                      view: window,
                    }),
                  ),
                );
                await frame();
                await frame();
                const zoomFrameMs = performance.now() - start;
                const pointCount = document.querySelectorAll('[data-role=samples] circle').length;
                const lineVertices =
                  document.querySelector('.trace-line')?.getAttribute('d')?.match(/[ML]/g)
                    ?.length ?? 0;
                const sampleCount = chart.getTraces()[0].sampleCount;
                chart.destroy();
                return {
                  addMs,
                  updateMs,
                  frequencyMs,
                  dragMs,
                  zoomMs,
                  zoomFrameMs,
                  pointCount,
                  lineVertices,
                  sampleCount,
                  selectedIndex,
                };
              },
              { size, format, mode, lineTolerancePx },
            ),
          );
          await page.close();
        }
        const median = Object.fromEntries(
          Object.keys(runs[0]).map((key) => [
            key,
            runs.map((run) => run[key]).sort((a, b) => a - b)[1],
          ]),
        );
        const result = { size, format, mode, lineTolerancePx, median, runs };
        results.push(result);
        console.log(JSON.stringify({ size, format, mode, lineTolerancePx, ...median }));
      }
    }
  }
} finally {
  await browser.close();
}
if (process.argv[2]) {
  writeFileSync(
    process.argv[2],
    JSON.stringify(
      {
        browser: engine.name(),
        browserVersion: browser.version(),
        platform: process.platform,
        arch: process.arch,
        results,
      },
      null,
      2,
    ) + '\n',
  );
}
