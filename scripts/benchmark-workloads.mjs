/* global window, document */
import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { cpus, totalmem } from 'node:os';
import { execFileSync } from 'node:child_process';
import { build } from 'vite';
import { chromium, webkit } from '@playwright/test';

const engine = process.env.BENCH_BROWSER === 'webkit' ? webkit : chromium;
const search = process.env.BENCH_SEARCH ?? 'original';
const multiple = process.env.BENCH_MULTIPLE !== '0';
const memoryCycles = Number(process.env.BENCH_MEMORY_CYCLES ?? 10);
const runs = Number(process.env.BENCH_RUNS ?? 3);
const steps = Number(process.env.BENCH_STEPS ?? 20);
const phases = (process.env.BENCH_PHASES ?? 'selection,rendering,memory').split(',');
const tolerances = (process.env.BENCH_TOLERANCES ?? '0,0.5').split(',').map(Number);
const sizes = (process.env.BENCH_SIZES ?? '100000,1000000').split(',').map(Number);
const shapes = (process.env.BENCH_SHAPES ?? 'smooth,noisy').split(',');
if (
  ![runs, steps, memoryCycles].every((value) => Number.isInteger(value) && value > 0) ||
  !sizes.every((value) => Number.isInteger(value) && value >= 2)
) {
  throw new RangeError(
    'Runs, steps and memory cycles must be positive integers; sizes must be at least two.',
  );
}
if (
  !['original', 'bounded-squared'].includes(search) ||
  !shapes.every((value) => ['smooth', 'noisy'].includes(value)) ||
  !phases.every((value) => ['selection', 'rendering', 'memory'].includes(value)) ||
  !tolerances.every((value) => Number.isFinite(value) && value >= 0)
) {
  throw new TypeError('Invalid workload, phase, search experiment or tolerance.');
}
const built = await build({
  configFile: false,
  logLevel: 'silent',
  build: {
    lib: {
      entry: resolve('scripts/benchmarks/trace-workloads.mjs'),
      name: 'SmithBench',
      formats: ['iife'],
    },
    write: false,
    minify: false,
  },
});
const output = Array.isArray(built) ? built[0] : built;
const bundle = output.output.find((entry) => entry.type === 'chunk').code;
const browser = await engine.launch();
const result = {
  browser: engine.name(),
  browserVersion: browser.version(),
  platform: process.platform,
  arch: process.arch,
  cpu: cpus()[0]?.model,
  ramBytes: totalmem(),
  nodeVersion: process.version,
  libraryCommit: execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim(),
  recordedAt: new Date().toISOString(),
  runs,
  steps,
  search,
  memoryCycles,
  selection: [],
  rendering: [],
  memory: [],
};
async function page() {
  const page = await browser.newPage({ viewport: { width: 800, height: 800 } });
  await page.setContent('<div id="chart" style="width:500px;height:500px"></div>');
  await page.addScriptTag({ content: bundle });
  return page;
}
function record(phase, config, measurements) {
  result[phase].push({ config, measurements });
  // Preserve completed cases if a later workload is interrupted.
  if (process.argv[2]) {
    writeFileSync(process.argv[2], JSON.stringify(result, null, 2) + '\n');
  }
  const latest = measurements.at(-1);
  console.log(
    JSON.stringify({ phase, ...config, latest }, (key, value) =>
      key === 'samples' ? undefined : value,
    ),
  );
}
try {
  if (phases.includes('selection')) {
    for (const shape of shapes) {
      for (const size of sizes) {
        const measurements = [];
        for (let run = 0; run < runs; run++) {
          console.log(`Selecting ${shape} ${size}, run ${run + 1}/${runs}`);
          const tab = await page();
          measurements.push(
            await tab.evaluate((config) => window.SmithBench.selection(config), { size, shape }),
          );
          await tab.close();
        }
        record('selection', { size, shape }, measurements);
      }
    }
  }
  if (phases.includes('rendering')) {
    const cases = shapes.flatMap((shape) => [
      ...sizes.map((size) => ({ size, shape, traces: 1 })),
      ...(multiple ? [{ size: 250000, shape, traces: 4 }] : []),
    ]);
    for (const config of cases) {
      for (const tolerance of tolerances) {
        const measurements = [];
        for (let run = 0; run < runs; run++) {
          console.log(
            `Running ${config.shape} ${config.traces} × ${config.size}, tolerance ${tolerance}, run ${run + 1}/${runs}`,
          );
          const tab = await page();
          measurements.push(
            await tab.evaluate((config) => window.SmithBench.workload(config), {
              ...config,
              tolerance,
              steps,
              search,
            }),
          );
          await tab.close();
        }
        record('rendering', { ...config, tolerance, search }, measurements);
      }
    }
  }
  if (phases.includes('memory') && engine === chromium) {
    const browserCdp = await browser.newBrowserCDPSession();
    for (const shape of shapes) {
      const config = { size: 1000000, traces: 1, shape, tolerance: 0.5 };
      const measurements = [];
      for (let run = 0; run < runs; run++) {
        const tab = await page();
        const cdp = await tab.context().newCDPSession(tab);
        const snapshot = async (label) => {
          const mountedSvg = await tab.evaluate(
            () => document.querySelectorAll('#chart svg').length,
          );
          await cdp.send('HeapProfiler.collectGarbage');
          const heap = await cdp.send('Runtime.getHeapUsage');
          const dom = await cdp.send('Memory.getDOMCounters');
          let processRssBytes;
          if (['darwin', 'linux'].includes(process.platform)) {
            const { processInfo } = await browserCdp.send('SystemInfo.getProcessInfo');
            const pids = processInfo.map((info) => info.id).join(',');
            processRssBytes = execFileSync('ps', ['-o', 'rss=', '-p', pids], { encoding: 'utf8' })
              .trim()
              .split(/\s+/)
              .reduce((sum, value) => sum + Number(value) * 1024, 0);
          }
          return { label, ...heap, ...dom, mountedSvg, processRssBytes };
        };
        // Warm code and browser caches before the baseline, on the same page.
        await tab.evaluate((config) => window.SmithBench.memoryCreate(config), config);
        await tab.evaluate(() => window.SmithBench.memoryDestroy());
        const snapshots = [await snapshot('warm-baseline')];
        await tab.evaluate((config) => window.SmithBench.memoryCreate(config), config);
        snapshots.push(await snapshot('mounted'));
        for (let i = 1; i <= 10; i++) {
          await tab.evaluate(({ config, seed }) => window.SmithBench.memoryUpdate(config, seed), {
            config,
            seed: i + 10,
          });
          if ([1, 5, 10].includes(i)) {
            snapshots.push(await snapshot(`update-${i}`));
          }
        }
        await tab.evaluate(() => window.SmithBench.memoryDestroy());
        snapshots.push(await snapshot('destroyed'));
        for (let i = 1; i <= memoryCycles; i++) {
          await tab.evaluate((config) => window.SmithBench.memoryCreate(config), config);
          await tab.evaluate(({ config, seed }) => window.SmithBench.memoryUpdate(config, seed), {
            config,
            seed: i + 100,
          });
          await tab.evaluate(() => window.SmithBench.memoryDestroy());
          if ([1, 5, 10, 25, 50, 100, memoryCycles].includes(i)) {
            snapshots.push(await snapshot(`cycle-${i}`));
          }
        }
        measurements.push(snapshots);
        await cdp.detach();
        await tab.close();
      }
      record('memory', config, measurements);
    }
    await browserCdp.detach();
  }
} finally {
  await browser.close();
}
