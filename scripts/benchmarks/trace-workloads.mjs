/* global document, window, requestAnimationFrame, MouseEvent, WheelEvent */
import { Smith } from '../../src/index.ts';
import { TraceBuffer } from '../../src/traces/TraceBuffer.ts';

// Browser-only diagnostic harness. Internal imports do not extend the package API.
export function samples(count, shape, seed = 1) {
  const values = new Float64Array(count * 3);
  let random = seed;
  const noise = () => {
    random = (Math.imul(random, 1664525) + 1013904223) >>> 0;
    return (random / 2 ** 32 - 0.5) * 0.02;
  };
  for (let i = 0; i < count; i++) {
    const t = i / (count - 1);
    const angle = t * 8 * Math.PI + seed * 0.03;
    const radius = 0.15 + 0.7 * t;
    values[i * 3] = 1e9 + 2e9 * t;
    values[i * 3 + 1] = radius * Math.cos(angle) + (shape === 'noisy' ? noise() : 0);
    values[i * 3 + 2] = radius * Math.sin(angle) + (shape === 'noisy' ? noise() : 0);
  }
  return values;
}
const frame = () => new Promise((resolve) => requestAnimationFrame(resolve));
const settle = async () => {
  await frame();
  await frame();
};
const timed = (fn) => {
  const start = performance.now();
  const value = fn();
  return { ms: performance.now() - start, value };
};
const summary = (values) => {
  const sorted = [...values].sort((a, b) => a - b);
  return {
    p50: sorted[Math.floor(sorted.length / 2)],
    p95: sorted[Math.ceil(sorted.length * 0.95) - 1],
    max: sorted.at(-1),
    samples: values,
  };
};
function create(config) {
  const chart = new Smith({ interaction: { zoom: true } });
  chart.draw('#chart');
  const inputs = Array.from({ length: config.traces }, (_, i) =>
    samples(config.size, config.shape, i + 1),
  );
  const ids = [];
  const add = timed(() =>
    inputs.forEach((input) =>
      ids.push(chart.addTrace(input, { mode: 'line', lineTolerancePx: config.tolerance })),
    ),
  );
  const marker = chart.addMarker(ids[0]);
  return { chart, ids, marker, inputs, addMs: add.ms };
}

// Diagnostic only: safe for this bounded dataset, NOT a general replacement for Math.hypot.
function nearestSquared(data, point) {
  let closest = 0;
  let distance = Infinity;
  for (let i = 0; i < data.length; i++) {
    const dx = point[0] - data.real(i);
    const dy = point[1] - data.imaginary(i);
    const next = dx * dx + dy * dy;
    if (next < distance) {
      distance = next;
      closest = i;
    }
  }
  return closest;
}

export async function workload(config) {
  const { chart, ids, marker, inputs, addMs } = create(config);
  const updateMs = timed(() => ids.forEach((id, i) => chart.updateTrace(id, inputs[i]))).ms;
  await settle();
  const paths = [...document.querySelectorAll('.trace-line')].map((node) => node.getAttribute('d'));
  // Count without creating a million-element regex-match array.
  let vertices = 0;
  for (const path of paths) {
    for (let i = 0; i < path.length; i++) {
      if (path[i] === 'M' || path[i] === 'L') {
        vertices++;
      }
    }
  }
  const search = [];
  const handlers = [];
  const frames = [];
  let changed = 0;
  let previous = chart.getMarker(marker).sampleIndex;
  const nearest = TraceBuffer.prototype.nearestPoint;
  // Instrument the actual full-data search used by dragging, not a stand-in operation.
  TraceBuffer.prototype.nearestPoint = function (point) {
    const result = timed(() =>
      config.search === 'bounded-squared' ? nearestSquared(this, point) : nearest.call(this, point),
    );
    search.push(result.ms);
    return result.value;
  };
  try {
    const target = document.querySelector('[data-role=marker]');
    const rect = target.getBoundingClientRect();
    target.dispatchEvent(
      new MouseEvent('mousedown', {
        bubbles: true,
        view: window,
        clientX: rect.x + rect.width / 2,
        clientY: rect.y + rect.height / 2,
        buttons: 1,
      }),
    );
    for (let i = 0; i < config.steps + 5; i++) {
      const angle = i * 0.41;
      const start = performance.now();
      const handler = timed(() =>
        window.dispatchEvent(
          new MouseEvent('mousemove', {
            bubbles: true,
            view: window,
            clientX: 258 + Math.cos(angle) * 125,
            clientY: 258 + Math.sin(angle) * 125,
            buttons: 1,
          }),
        ),
      ).ms;
      await settle();
      if (i >= 5) {
        handlers.push(handler);
        frames.push(performance.now() - start);
      }
      const selected = chart.getMarker(marker).sampleIndex;
      if (selected !== previous) {
        changed++;
      }
      previous = selected;
    }
    window.dispatchEvent(new MouseEvent('mouseup', { bubbles: true, view: window }));
  } finally {
    TraceBuffer.prototype.nearestPoint = nearest;
  }
  if (search.length !== config.steps + 5 || changed < config.steps / 2) {
    throw new Error('The benchmark did not exercise real marker selection.');
  }
  const zoomHandlers = [];
  const zoomFrames = [];
  const svg = document.querySelector('#chart svg');
  for (let i = 0; i < 8; i++) {
    const start = performance.now();
    const handler = timed(() =>
      svg.dispatchEvent(
        new WheelEvent('wheel', {
          deltaY: i % 2 ? 80 : -80,
          clientX: 258,
          clientY: 258,
          bubbles: true,
          cancelable: true,
          view: window,
        }),
      ),
    ).ms;
    await settle();
    if (i >= 2) {
      zoomHandlers.push(handler);
      zoomFrames.push(performance.now() - start);
    }
  }
  const count = chart.getTraces().reduce((sum, trace) => sum + trace.sampleCount, 0);
  chart.destroy();
  await settle();
  return {
    addMs,
    updateMs,
    vertices,
    count,
    changed,
    search: summary(search.slice(5)),
    drag: summary(handlers),
    dragFrames: summary(frames),
    zoom: summary(zoomHandlers),
    zoomFrames: summary(zoomFrames),
  };
}

// Isolate CPU selection from SVG painting, including an intentionally limited experiment.
export function selection(config) {
  const data = TraceBuffer.from(samples(config.size, config.shape));
  const points = Array.from({ length: 80 }, (_, i) => [
    Math.cos(i * 0.41) * 0.65,
    Math.sin(i * 0.41) * 0.65,
  ]);
  const direct = [];
  const experiment = [];
  for (let i = 0; i < points.length; i++) {
    // Alternate order to avoid consistently favoring a warm cache.
    const results =
      i % 2
        ? [
            timed(() => nearestSquared(data, points[i])),
            timed(() => data.nearestPoint(points[i])),
          ].reverse()
        : [timed(() => data.nearestPoint(points[i])), timed(() => nearestSquared(data, points[i]))];
    if (results[0].value !== results[1].value) {
      throw new Error('Experimental selection differs on the benchmark dataset.');
    }
    if (i >= 20) {
      direct.push(results[0].ms);
      experiment.push(results[1].ms);
    }
  }
  return { direct: summary(direct), boundedSquaredExperiment: summary(experiment) };
}

let retained;
export async function memoryCreate(config) {
  retained = create(config);
  // Release caller-owned input: measure only retained chart state after this call returns.
  retained.inputs = undefined;
  await settle();
}
export async function memoryUpdate(config, seed) {
  for (let i = 0; i < retained.ids.length; i++) {
    retained.chart.updateTrace(retained.ids[i], samples(config.size, config.shape, seed + i));
  }
  await settle();
}
export async function memoryDestroy() {
  retained.chart.destroy();
  retained = undefined;
  await settle();
}
