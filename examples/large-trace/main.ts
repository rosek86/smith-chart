import { Smith, SmithEventType, SmithFormatter } from 'smithkit';

// A synthetic 1–3 GHz sweep with 100,000 samples, packed as f/re/im triples.
const count = 100_000;
const samples = new Float64Array(count * 3);
for (let i = 0; i < count; i++) {
  const t = i / (count - 1);
  const radius = 0.15 + 0.7 * t;
  const angle = 8 * Math.PI * t;
  samples[3 * i] = 1e9 + 2e9 * t;
  samples[3 * i + 1] = radius * Math.cos(angle);
  samples[3 * i + 2] = radius * Math.sin(angle);
}

const chart = new Smith({ interaction: { zoom: true } });
chart.draw('#chart');
// Point rendering limits overlapping SVG dots; every measured sample stays available.
const traceId = chart.addTrace(samples, { name: '100k synthetic sweep', mode: 'points' });
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
