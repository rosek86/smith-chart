import { Smith, SmithEventType, SmithFormatter } from 'smithkit';

const chart = new Smith();
chart.draw('#chart');
const traceId = chart.addTrace(
  // Packed triples: frequency in Hz, real Γ, imaginary Γ.
  new Float64Array([
    1e9, 0.4, -0.4, 1.25e9, 0.1, -0.2, 1.5e9, 0, 0, 1.75e9, 0.1, 0.2, 2e9, 0.4, 0.4,
  ]),
  { name: 'Antenna', mode: 'both' },
);
const markerId = chart.addMarker(traceId)!;
const slider = document.querySelector<HTMLInputElement>('#sample')!;
const output = document.querySelector<HTMLOutputElement>('#reading')!;

function renderReading(): void {
  const marker = chart.getMarker(markerId)!;
  slider.value = String(marker.sampleIndex);
  const impedance = marker.impedanceOhms?.toString(2) ?? '∞';
  output.value = `${SmithFormatter.number(marker.frequencyHz)}Hz · Z = ${impedance} Ω`;
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
renderReading();
