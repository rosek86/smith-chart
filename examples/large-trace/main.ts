import { Smith, SmithEventType, SmithFormatter } from 'smithkit';

// A synthetic 1–3 GHz sweep, packed as f/re/im triples.
function createSamples(count: number): Float64Array {
  const samples = new Float64Array(count * 3);
  for (let i = 0; i < count; i++) {
    const t = i / (count - 1);
    const radius = 0.15 + 0.7 * t;
    const angle = 8 * Math.PI * t;
    samples[3 * i] = 1e9 + 2e9 * t;
    samples[3 * i + 1] = radius * Math.cos(angle);
    samples[3 * i + 2] = radius * Math.sin(angle);
  }
  return samples;
}
let count = 100_000;

const chart = new Smith({ interaction: { zoom: true } });
chart.draw('#chart');
// Simplify only the displayed line; markers still use every measured sample.
const traceId = chart.addTrace(createSamples(count), {
  name: 'Synthetic sweep',
  mode: 'line',
  lineTolerancePx: 0.5,
});
const markerId = chart.addMarker(traceId)!;
const slider = document.querySelector<HTMLInputElement>('#sample')!;
const output = document.querySelector<HTMLOutputElement>('#reading')!;
slider.max = String(count - 1);

function renderReading(): void {
  const marker = chart.getMarker(markerId)!;
  slider.value = String(marker.sampleIndex);
  output.value = `Sample ${marker.sampleIndex + 1} / ${count} · f = ${SmithFormatter.number(marker.frequencyHz)}Hz · Γ = ${marker.reflectionCoefficient.toString(3)}`;
}
chart.onEvent((event) => {
  if (event.type !== SmithEventType.Cursor && event.data.markerId === markerId) {
    renderReading();
  }
});
slider.addEventListener('input', () => chart.setMarkerSample(markerId, slider.valueAsNumber));
document
  .querySelector('#focus-marker')!
  .addEventListener('click', () => chart.focusMarker(markerId));
document.querySelector('#reset-view')!.addEventListener('click', () => chart.resetView());
renderReading();

const detail = document.querySelector<HTMLSelectElement>('#line-detail')!;
detail.addEventListener('change', () => {
  chart.setTraceOptions(traceId, { lineTolerancePx: Number(detail.value) });
});

const sampleCount = document.querySelector<HTMLSelectElement>('#sample-count')!;
sampleCount.addEventListener('change', () => {
  count = Number(sampleCount.value);
  slider.max = String(count - 1);
  chart.updateTrace(traceId, createSamples(count));
  renderReading();
});
