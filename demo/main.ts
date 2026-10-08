import './style.css';
import { Smith, SmithScales, SmithEventType, SmithFormatter, RfCalculations } from '../src';
import type {
  SmithEvent,
  SmithReading,
  MarkerSnapshot,
  TraceSamples,
  SmithAppearance,
  GridDetail,
  MarkerLegendField,
} from '../src';
import { Touchstone } from '../src';
import { Measurements, markerLabel } from './measurements';
import { FileDownload } from './download';

function element<T extends HTMLElement>(id: string): T {
  const node = document.getElementById(id);
  if (!node) {
    throw new Error(`Missing element: ${id}`);
  }
  return node as T;
}

const settingsDialog = element<HTMLDialogElement>('chart-settings');
const settingsButton = element<HTMLButtonElement>('open-settings');
settingsButton.addEventListener('click', () => settingsDialog.showModal());
settingsDialog.addEventListener('close', () => settingsButton.focus({ preventScroll: true }));

const smith = new Smith({ referenceImpedanceOhms: 50, appearance: { theme: 'dark' } });
smith.draw('#smith');
const scales = new SmithScales({ theme: 'dark' });
scales.draw('#smith-scales');

element<HTMLSelectElement>('theme').addEventListener('change', (event) => {
  const theme = (event.target as HTMLSelectElement).value as SmithAppearance['theme'];
  const appearance: SmithAppearance = { theme };
  smith.setAppearance(appearance);
  scales.setAppearance(appearance);
  document.documentElement.dataset.theme = theme;
  measurements.render();
  renderReadout();
});

const layers = [
  ['impedance', [smith.layers.resistance, smith.layers.reactance]],
  ['admittance', [smith.layers.conductance, smith.layers.susceptance]],
  ['constantQ', [smith.layers.q]],
  ['constantSwr', [smith.layers.vswr]],
  ['peripheral-scales', [smith.peripheralScales]],
] as const;
for (const [id, groups] of layers) {
  const checkbox = element<HTMLInputElement>(id);
  const update = () => groups.forEach((group) => group.setVisible(checkbox.checked));
  checkbox.addEventListener('change', update);
  update();
}
const gridLayers = [
  smith.layers.resistance,
  smith.layers.reactance,
  smith.layers.conductance,
  smith.layers.susceptance,
];
const gridLabels = element<HTMLInputElement>('grid-labels');
const updateGridLabels = () => {
  for (const layer of gridLayers) {
    layer.setLabelsVisible(gridLabels.checked);
  }
};
gridLabels.addEventListener('change', updateGridLabels);
updateGridLabels();

const gridDetail = element<HTMLSelectElement>('grid-detail');
const updateGridDetail = () => {
  smith.setGridDetail(gridDetail.value as GridDetail);
};
gridDetail.addEventListener('change', updateGridDetail);
updateGridDetail();

element('reset-view').addEventListener('click', () => smith.resetView());
const exportDialog = element<HTMLDialogElement>('image-export');
const exportButton = element<HTMLButtonElement>('open-image-export');
const exportForm = element<HTMLFormElement>('image-export-form');
const exportTarget = element<HTMLSelectElement>('image-target');
const exportBackground = element<HTMLSelectElement>('image-background');
const exportLegend = element<HTMLInputElement>('image-legend');
const exportMarkerLegend = element<HTMLInputElement>('image-marker-legend');
const exportMarkerList = element('image-marker-list');
const exportMarkerSelection = new Map<string, boolean>();
const exportReadout = element<HTMLSelectElement>('image-readout');
exportButton.addEventListener('click', () => {
  const options = smith
    .getTraces()
    .flatMap((trace) =>
      trace.markers.map(
        (marker) => new Option(`Marker: ${markerLabel(trace, marker.number)}`, marker.id),
      ),
    );
  exportReadout.replaceChildren(new Option('None', ''), ...options);
  const selectedMarkerId = markerData?.markerId;
  exportReadout.value = options.some((option) => option.value === selectedMarkerId)
    ? selectedMarkerId!
    : '';
  for (const input of exportMarkerList.querySelectorAll<HTMLInputElement>('input')) {
    exportMarkerSelection.set(input.value, input.checked);
  }
  exportMarkerList.replaceChildren();
  for (const trace of smith.getTraces().filter((trace) => trace.visible)) {
    for (const marker of trace.markers) {
      const label = document.createElement('label');
      const input = document.createElement('input');
      input.type = 'checkbox';
      input.value = marker.id;
      input.checked = exportMarkerSelection.get(marker.id) ?? true;
      label.append(input, document.createTextNode(markerLabel(trace, marker.number)));
      exportMarkerList.append(label);
    }
  }
  if (!exportMarkerList.childElementCount) {
    exportMarkerList.textContent = 'No markers on visible traces.';
  }
  updateExportReadout();
  updateMarkerLegendSettings();
  exportDialog.showModal();
});
function updateMarkerLegendSettings(): void {
  exportMarkerLegend.disabled = exportTarget.value === 'scales';
  element('image-marker-legend-settings').hidden =
    !exportMarkerLegend.checked || exportMarkerLegend.disabled;
}
exportMarkerLegend.addEventListener('change', updateMarkerLegendSettings);
function updateExportReadout(): void {
  element('image-readout-settings').hidden = exportTarget.value === 'chart';
  const marker = exportReadout.value ? smith.getMarker(exportReadout.value) : undefined;
  const trace = smith.getTraces().find((trace) => trace.id === marker?.traceId);
  element('image-readout-description').textContent =
    marker && trace
      ? `${markerLabel(trace, marker.markerNumber)} · Frequency: ${SmithFormatter.number(marker.frequencyHz)}Hz`
      : 'Scales without readings. Cursor position is not exported.';
}
exportReadout.addEventListener('change', updateExportReadout);
exportDialog.addEventListener('close', () => exportButton.focus({ preventScroll: true }));
exportTarget.addEventListener('change', () => {
  exportLegend.disabled = exportTarget.value === 'scales';
  updateMarkerLegendSettings();
  updateExportReadout();
});
exportBackground.addEventListener('change', () => {
  element('image-custom-background').hidden = exportBackground.value !== 'custom';
});
exportForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  const download = element<HTMLButtonElement>('download-image');
  const output = element('image-status');
  const dimension = (id: string) => {
    const input = element<HTMLInputElement>(id);
    return input.value === '' ? undefined : input.valueAsNumber;
  };
  const options = {
    width: dimension('image-width'),
    height: dimension('image-height'),
    background:
      exportBackground.value === 'current'
        ? undefined
        : exportBackground.value === 'custom'
          ? element<HTMLInputElement>('image-color').value
          : exportBackground.value,
  };
  const target = exportTarget.value;
  const format = element<HTMLSelectElement>('image-format').value;
  const marker = exportReadout.value ? smith.getMarker(exportReadout.value) : undefined;
  const trace = smith.getTraces().find((trace) => trace.id === marker?.traceId);
  const readout = {
    reflectionCoefficient: marker?.reflectionCoefficient ?? null,
    label:
      marker && trace
        ? `${markerLabel(trace, marker.markerNumber)} · Frequency: ${SmithFormatter.number(marker.frequencyHz)}Hz`
        : undefined,
  };
  const scaleOptions = { ...options, readout };
  const chartOptions = {
    ...options,
    scaleReadout: readout,
    legend: exportLegend.checked,
    markerLegend: exportMarkerLegend.checked
      ? {
          markerIds: [...exportMarkerList.querySelectorAll<HTMLInputElement>('input:checked')].map(
            (input) => input.value,
          ),
          fields: [
            ...exportForm.querySelectorAll<HTMLInputElement>('[name="image-marker-field"]:checked'),
          ].map((input) => input.value as MarkerLegendField),
        }
      : false,
    scales: target === 'combined' ? scales : undefined,
  };
  download.disabled = true;
  output.textContent = `Preparing ${format.toUpperCase()}…`;
  output.dataset.error = 'false';
  try {
    const blob =
      format === 'svg'
        ? new Blob([target === 'scales' ? scales.toSvg(scaleOptions) : smith.toSvg(chartOptions)], {
            type: 'image/svg+xml;charset=utf-8',
          })
        : target === 'scales'
          ? await scales.toPng(scaleOptions)
          : await smith.toPng(chartOptions);
    const filename = `${target === 'combined' ? 'smith-report' : `smith-${target}`}.${format}`;
    FileDownload.save(blob, filename);
    output.textContent = `Saved ${filename}.`;
  } catch (error) {
    output.textContent = error instanceof Error ? error.message : 'Could not export image.';
    output.dataset.error = 'true';
  } finally {
    download.disabled = false;
  }
});

type ReadoutSource = 'cursor' | 'marker';
let source: ReadoutSource = 'cursor';
let preferredSource: ReadoutSource = 'cursor';
let cursorData: SmithReading | undefined;
let markerData: MarkerSnapshot | undefined;
let activeMarkerDrags = 0;
const readoutIntervalMs = 33;
let pendingReadout: ReturnType<typeof setTimeout> | undefined;
const markerSelect = element<HTMLSelectElement>('marker-select');

const measurements = new Measurements(smith, refreshMarkerOptions, (id) => {
  markerData = smith.getMarker(id);
  selectSource('marker');
});

function refreshMarkerOptions(): void {
  const traces = smith.getTraces();
  const options = traces.flatMap((trace) =>
    trace.markers.map((marker) => new Option(markerLabel(trace, marker.number), marker.id)),
  );
  markerSelect.replaceChildren(...options);
  markerSelect.disabled = options.length === 0;
  markerData =
    (markerData && smith.getMarker(markerData.markerId)) ??
    (options[0] ? smith.getMarker(options[0].value) : undefined);
  if (!options.length) {
    markerSelect.add(new Option('No markers available', ''));
  }
  measurements.render();
  renderReadout();
}

element('focus-marker').addEventListener('click', () => {
  if (markerData) {
    smith.focusMarker(markerData.markerId);
  }
});

markerSelect.addEventListener('change', () => {
  markerData = smith.getMarker(markerSelect.value);
  renderReadout();
});

function renderReadout(): void {
  clearTimeout(pendingReadout);
  pendingReadout = undefined;
  measurements.updateComparison();
  const data = source === 'cursor' ? cursorData : markerData;
  scales.update(data?.reflectionCoefficient ?? null);
  smith.peripheralScales.update(data?.reflectionCoefficient ?? null);
  element('parameter-gamma').textContent = data
    ? SmithFormatter.complex(data.reflectionCoefficient)
    : '—';
  element('parameter-impedance').textContent = data
    ? data.impedanceOhms
      ? SmithFormatter.complex(data.impedanceOhms)
      : '∞'
    : '—';
  element('parameter-admittance').textContent = data
    ? data.admittanceSiemens
      ? SmithFormatter.complex(data.admittanceSiemens.mul(1000))
      : '∞'
    : '—';
  element('parameter-q').textContent = data?.q?.toFixed(3) ?? '—';

  const markerReadout = element('marker-readout');
  markerReadout.hidden = source !== 'marker';
  element('marker-selection').hidden = source !== 'marker';
  markerSelect.value = markerData ? markerData.markerId : '';
  element('cursor-help').hidden = source !== 'cursor';
  const trace = smith.getTraces().find((entry) => entry.id === markerData?.traceId);
  element<HTMLButtonElement>('focus-marker').disabled = !trace?.visible;
  const swatch = element('marker-color');
  swatch.hidden = !trace;
  swatch.style.backgroundColor = trace?.color ?? '';
  if (markerData && trace) {
    const summary = document.createElement('div');
    summary.textContent = `${markerLabel(trace, markerData.markerNumber)} · Frequency: ${SmithFormatter.number(markerData.frequencyHz)}Hz`;
    const component = document.createElement('div');
    const equivalent = markerData.impedanceOhms
      ? RfCalculations.reactanceToComponent(markerData.impedanceOhms.im, markerData.frequencyHz)
      : undefined;
    const componentValue =
      equivalent?.kind === 'inductor'
        ? `${SmithFormatter.number(equivalent.inductanceHenries)}H`
        : equivalent?.kind === 'capacitor'
          ? `${SmithFormatter.number(equivalent.capacitanceFarads)}F`
          : '—';
    component.textContent = `Reactive component: ${componentValue} · Scales: ratios or dB.`;
    markerReadout.replaceChildren(summary, component);
  } else {
    markerReadout.textContent = smith.getTraces().length
      ? 'Add a marker to a loaded trace.'
      : 'Load a trace to place a marker.';
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
    event.type === SmithEventType.MarkerDragStart ||
    event.type === SmithEventType.MarkerSelect ||
    !markerData ||
    event.data.markerId === markerData.markerId
  ) {
    markerData = event.data;
  }
  if (event.type === SmithEventType.MarkerSelect) {
    selectSource('marker', false);
    return;
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
smith.onEvent(updateReadout);

function status(message: string, error = false, target = 'file-status'): void {
  const node = element(target);
  node.textContent = message;
  node.dataset.error = String(error);
}
element('apply-reference').addEventListener('click', () => {
  const input = element<HTMLInputElement>('reference-impedance');
  try {
    if (!input.value || !input.checkValidity()) {
      throw new RangeError('Reference impedance must be positive and finite.');
    }
    smith.renormalize(Number(input.value));
    element('reference-value').textContent = `Z₀ = ${smith.referenceImpedanceOhms} Ω`;
    cursorData = undefined;
    refreshMarkerOptions();
    status(
      `Chart renormalized to ${smith.referenceImpedanceOhms} Ω. Physical impedances and selected samples are preserved.`,
      false,
      'reference-status',
    );
  } catch (error) {
    input.value = String(smith.referenceImpedanceOhms);
    status(
      error instanceof Error ? error.message : 'Could not change reference impedance.',
      true,
      'reference-status',
    );
  }
});
element<HTMLInputElement>('file').addEventListener('change', async (event) => {
  const input = event.currentTarget as HTMLInputElement;
  const file = input.files?.[0];
  if (!file) {
    return;
  }
  try {
    const parsed = Touchstone.parse(await file.text());
    const reference = smith.referenceImpedanceOhms;
    const mismatch = parsed.referenceImpedanceOhms !== reference;
    if (mismatch && !element<HTMLInputElement>('renormalize-import').checked) {
      throw new Error(
        `This chart uses ${reference} Ω; the file uses ${parsed.referenceImpedanceOhms} Ω. Enable import renormalization or change chart Z₀.`,
      );
    }
    const samples = mismatch
      ? RfCalculations.renormalizeSamples(parsed.samples, parsed.referenceImpedanceOhms, reference)
      : parsed.samples;
    smith.addMarker(smith.addTrace(samples, { name: file.name }));
    refreshMarkerOptions();
    status(
      `${file.name}: ${samples.length} samples loaded.${mismatch ? ` The file uses ${parsed.referenceImpedanceOhms} Ω; converted to ${reference} Ω.` : ''}`,
    );
  } catch (error) {
    status(error instanceof Error ? error.message : 'Could not read this file.', true);
  } finally {
    input.value = '';
  }
});
element('sample').addEventListener('click', () => {
  const values: TraceSamples = Array.from({ length: 101 }, (_, i) => {
    const reactance = -2 + i * 0.04;
    const denominator = 4 + reactance ** 2;
    return {
      frequencyHz: 1e9 + i * 10e6,
      reflectionCoefficient: [reactance ** 2 / denominator, (2 * reactance) / denominator],
    };
  });
  smith.addMarker(smith.addTrace(values));
  refreshMarkerOptions();
  status('Sample: 101 samples, 1–2 GHz, normalized resistance r = 1.');
});
