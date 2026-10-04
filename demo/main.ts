import './style.css';
import { Smith, SmithScales, SmithEventType } from '../src';
import type { SmithEvent, SmithCursorEvent, SmithMarkerEvent, S1P } from '../src';
import { parseTouchstone } from '../src/io/touchstone';

function element<T extends HTMLElement>(id: string): T {
  const node = document.getElementById(id);
  if (!node) {
    throw new Error(`Missing element: ${id}`);
  }
  return node as T;
}

const smith = new Smith(50);
smith.draw('#smith');
const scales = new SmithScales();
scales.draw('#smith-scales');

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

type ReadoutSource = 'cursor' | 'marker';
let source: ReadoutSource = 'cursor';
let preferredSource: ReadoutSource = 'cursor';
let cursorData: SmithCursorEvent | SmithMarkerEvent | undefined;
let markerData: SmithMarkerEvent | undefined;
let activeMarkerDrags = 0;
const readoutIntervalMs = 33;
let pendingReadout: ReturnType<typeof setTimeout> | undefined;
const markerSelect = element<HTMLSelectElement>('marker-select');

function markerKey(data: SmithMarkerEvent): string {
  return `${data.datasetNo}:${data.markerNo}`;
}

function refreshMarkerOptions(): void {
  const options = smith.Datasets.flatMap((dataset, datasetNo) =>
    dataset.Markers.map(
      (_, markerNo) =>
        new Option(`Trace ${datasetNo + 1} · marker ${markerNo + 1}`, `${datasetNo}:${markerNo}`),
    ),
  );
  markerSelect.replaceChildren(...options);
  markerSelect.disabled = options.length === 0;
  if (!markerData) {
    markerData = smith.getMarkerData(0, 0);
  }
  renderReadout();
}

markerSelect.addEventListener('change', () => {
  const [datasetNo, markerNo] = markerSelect.value.split(':').map(Number);
  markerData = smith.getMarkerData(datasetNo!, markerNo!);
  renderReadout();
});

function renderReadout(): void {
  clearTimeout(pendingReadout);
  pendingReadout = undefined;
  const data = source === 'cursor' ? cursorData : markerData;
  scales.update(data?.reflectionCoefficient ?? null);
  smith.PeripheralScales.update(data?.reflectionCoefficient ?? null);
  element('parameter-gamma').textContent = data
    ? smith.formatComplex(data.reflectionCoefficient)
    : '—';
  element('parameter-impedance').textContent = data
    ? data.impedance
      ? smith.formatComplex(data.impedance)
      : '∞'
    : '—';
  element('parameter-admittance').textContent = data
    ? data.admittance
      ? smith.formatComplex(data.admittance)
      : '∞'
    : '—';
  element('parameter-q').textContent = data?.Q?.toFixed(3) ?? '—';

  const markerReadout = element('marker-readout');
  markerReadout.hidden = source !== 'marker';
  element('marker-selection').hidden = source !== 'marker';
  markerSelect.value = markerData ? markerKey(markerData) : '';
  element('cursor-help').hidden = source !== 'cursor';
  if (markerData) {
    const summary = document.createElement('div');
    summary.textContent = `Trace ${markerData.datasetNo + 1} · marker ${markerData.markerNo + 1} · Frequency: ${smith.formatNumber(markerData.freq)}Hz`;
    const component = document.createElement('div');
    component.textContent = `Reactive component: ${smith.getReactanceComponentValue(markerData.reflectionCoefficient, markerData.freq)} · Scales: ratios or dB.`;
    markerReadout.replaceChildren(summary, component);
  } else {
    markerReadout.textContent = 'Load a trace to place a marker.';
  }
}

function selectSource(next: ReadoutSource, remember = true): void {
  source = next;
  if (remember) {
    preferredSource = next;
  }
  for (const name of ['cursor', 'marker'] as const) {
    const tab = element<HTMLButtonElement>(`${name}-tab`);
    tab.setAttribute('aria-selected', String(name === source));
    tab.tabIndex = name === source ? 0 : -1;
  }
  element('parameter-panel').setAttribute('aria-labelledby', `${source}-tab`);
  renderReadout();
}

for (const name of ['cursor', 'marker'] as const) {
  const tab = element<HTMLButtonElement>(`${name}-tab`);
  tab.addEventListener('click', () => selectSource(name));
  tab.addEventListener('keydown', (event) => {
    let next: ReadoutSource;
    if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
      next = name === 'cursor' ? 'marker' : 'cursor';
    } else if (event.key === 'Home') {
      next = 'cursor';
    } else if (event.key === 'End') {
      next = 'marker';
    } else {
      return;
    }
    event.preventDefault();
    selectSource(next);
    element(`${next}-tab`).focus();
  });
}

function updateReadout(event: SmithEvent): void {
  if (event.type === SmithEventType.Cursor) {
    cursorData = event.data;
  } else if (
    event.data &&
    'freq' in event.data &&
    (event.type === SmithEventType.MarkerDragStart ||
      !markerData ||
      markerKey(event.data) === markerKey(markerData))
  ) {
    markerData = event.data;
  }
  if (event.type === SmithEventType.MarkerDragStart) {
    activeMarkerDrags++;
    selectSource('marker', false);
    return;
  } else if (event.type === SmithEventType.MarkerDragEnd) {
    activeMarkerDrags = Math.max(0, activeMarkerDrags - 1);
    if (activeMarkerDrags === 0) {
      selectSource(preferredSource, false);
      return;
    }
  }
  if (!event.data) {
    renderReadout();
    return;
  }
  if (pendingReadout === undefined) {
    pendingReadout = setTimeout(renderReadout, readoutIntervalMs);
  }
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
  if (!file) {
    return;
  }
  try {
    const parsed = parseTouchstone(await file.text());
    if (parsed.referenceImpedance !== 50) {
      throw new Error(
        `This chart uses 50 Ω; the file uses ${parsed.referenceImpedance} Ω. Renormalize the data before importing.`,
      );
    }
    smith.addS1P(parsed.values);
    refreshMarkerOptions();
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
  refreshMarkerOptions();
  status('Sample: 101 samples, 1–2 GHz, normalized resistance r = 1.');
});
