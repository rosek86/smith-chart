import './style.css';
import { Smith, SmithEventType } from '../src';
import type { SmithEvent, SmithMarkerEvent, S1P } from '../src';
import { parseTouchstone } from '../src/io/touchstone';

function element<T extends HTMLElement>(id: string): T {
  const node = document.getElementById(id);
  if (!node) throw new Error(`Missing element: ${id}`);
  return node as T;
}

const smith = new Smith(50);
smith.draw('#smith');

const layers = [
  ['impedance', [smith.ConstResistance, smith.ConstReactance]],
  ['admittance', [smith.ConstConductance, smith.ConstSusceptance]],
  ['constantQ', [smith.ConstQCircles]],
  ['constantSwr', [smith.ConstSwrCircles]],
] as const;
for (const [id, groups] of layers) {
  const checkbox = element<HTMLInputElement>(id);
  const update = () => groups.forEach((group) => (checkbox.checked ? group.show() : group.hide()));
  checkbox.addEventListener('change', update);
  update();
}
element('reset-view').addEventListener('click', () => smith.resetView());

function updateReadout(event: SmithEvent): void {
  const data = event.data;
  if (!data) return;
  const rows = [
    `Γ: ${smith.formatComplex(data.reflectionCoefficient)}`,
    `Z: ${data.impedance ? smith.formatComplex(data.impedance, 'Ω') : '∞'}`,
    `Y: ${data.admittance ? smith.formatComplex(data.admittance, 'mS') : '∞'}`,
    `VSWR: ${data.swr.toFixed(3)} : 1`,
    `Return loss: ${data.returnLoss.toFixed(2)} dB`,
    `Mismatch loss: ${data.mismatchLoss.toFixed(2)} dB`,
    `Q: ${data.Q?.toFixed(3) ?? '—'}`,
  ];
  const isMarker = event.type === SmithEventType.Marker;
  if (isMarker) {
    const marker = data as SmithMarkerEvent;
    rows.unshift(
      `Trace ${marker.datasetNo + 1} · marker ${marker.markerNo + 1}`,
      `Frequency: ${smith.formatNumber(marker.freq)}Hz`,
    );
    rows.push(
      `Reactive component: ${smith.getReactanceComponentValue(marker.reflectionCoefficient, marker.freq)}`,
    );
  }
  element(isMarker ? 'marker-readout' : 'cursor-readout').replaceChildren(
    ...rows.map((text) => {
      const row = document.createElement('div');
      row.textContent = text;
      return row;
    }),
  );
}
smith.setUserActionHandler(updateReadout);

function status(message: string, error = false): void {
  const node = element('file-status');
  node.textContent = message;
  node.dataset.error = String(error);
}
element<HTMLInputElement>('file').addEventListener('change', async (event) => {
  const input = event.currentTarget as HTMLInputElement;
  const file = input.files?.[0];
  if (!file) return;
  try {
    const parsed = parseTouchstone(await file.text());
    if (parsed.referenceImpedance !== 50)
      throw new Error(
        `This chart uses 50 Ω; the file uses ${parsed.referenceImpedance} Ω. Renormalize the data before importing.`,
      );
    smith.addS1P(parsed.values);
    status(`${file.name}: ${parsed.values.length} samples loaded.`);
  } catch (error) {
    status(error instanceof Error ? error.message : 'Could not read this file.', true);
  } finally {
    input.value = '';
  }
});
element('sample').addEventListener('click', () => {
  const values: S1P = Array.from({ length: 101 }, (_, i) => {
    const reactance = -2 + i * 0.04;
    const denominator = 4 + reactance ** 2;
    return {
      freq: 1e9 + i * 10e6,
      point: [reactance ** 2 / denominator, (2 * reactance) / denominator],
    };
  });
  smith.addS1P(values);
  status('Sample: 101 samples, 1–2 GHz, normalized resistance r = 1.');
});
