import type { Smith, TraceInfo, TraceRenderMode } from '../src';

function node<T extends HTMLElement>(id: string): T {
  return document.getElementById(id) as T;
}

export function markerLabel(trace: TraceInfo, number: number): string {
  return `${trace.name} · marker ${number}${trace.visible ? '' : ' (hidden)'}`;
}

/** Demo controls consume snapshots and stable IDs rather than mutable drawing objects. */
export class Measurements {
  private readonly a = node<HTMLSelectElement>('compare-a');
  private readonly b = node<HTMLSelectElement>('compare-b');

  public constructor(
    private readonly smith: Smith,
    private readonly changed: () => void,
    private readonly selectMarker: (id: string) => void,
  ) {
    this.a.addEventListener('change', () => this.updateComparison());
    this.b.addEventListener('change', () => this.updateComparison());
  }

  public render(): void {
    const traces = this.smith.getTraces();
    node('trace-list').replaceChildren(...traces.map((trace) => this.traceControls(trace)));
    const markers = traces.flatMap((trace) =>
      trace.markers.map((marker) => ({
        id: marker.id,
        label: markerLabel(trace, marker.number),
      })),
    );
    for (const select of [this.a, this.b]) {
      const previous = select.value;
      select.replaceChildren(...markers.map((marker) => new Option(marker.label, marker.id)));
      select.disabled = markers.length < 2;
      if (markers.some((marker) => marker.id === previous)) {
        select.value = previous;
      } else {
        select.value =
          (select === this.b
            ? markers.find((marker) => marker.id !== this.a.value)?.id
            : markers[0]?.id) ?? '';
      }
      if (!markers.length) {
        select.add(new Option('No markers available', ''));
      }
    }
    this.updateComparison();
  }

  public updateComparison(): void {
    const comparison =
      this.a.disabled || this.b.disabled
        ? undefined
        : this.smith.compareMarkers(this.a.value, this.b.value);
    node('comparison-frequency').textContent = comparison
      ? `${this.smith.formatNumber(comparison.frequencyDeltaHz)}Hz`
      : '—';
    node('comparison-impedance').textContent = comparison?.impedanceDeltaOhms
      ? `${this.smith.formatComplex(comparison.impedanceDeltaOhms).trim()} Ω`
      : '—';
    node('comparison-phase').textContent =
      comparison?.phaseDeltaDegrees !== undefined
        ? `${comparison.phaseDeltaDegrees.toFixed(3)}°`
        : '—';
    node('comparison-help').textContent = comparison
      ? '— means undefined: phase at Γ = 0, or impedance at an open circuit.'
      : 'Add at least two markers to compare measurements.';
    // Keep sample controls synchronized with dragging without replacing focused controls.
    for (const input of document.querySelectorAll<HTMLInputElement>('[data-marker-sample]')) {
      const marker = this.smith.getMarker(input.dataset.markerSample!);
      if (marker && document.activeElement !== input) {
        input.value = String(marker.sampleIndex + 1);
      }
    }
  }

  private button(label: string, action: () => void): HTMLButtonElement {
    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = label;
    button.addEventListener('click', action);
    return button;
  }

  private traceControls(trace: TraceInfo): HTMLElement {
    const section = document.createElement('section');
    section.className = 'trace-controls';
    section.dataset.traceId = trace.id;
    section.setAttribute('aria-label', trace.name);
    const header = document.createElement('div');
    header.className = 'trace-heading';
    const visible = document.createElement('input');
    visible.type = 'checkbox';
    visible.checked = trace.visible;
    visible.setAttribute('aria-label', `Show ${trace.name}`);
    visible.addEventListener('change', () => {
      this.smith.setTraceOptions(trace.id, { visible: visible.checked });
      this.changed();
    });
    const color = document.createElement('input');
    color.type = 'color';
    color.value = trace.color;
    color.setAttribute('aria-label', `Color for ${trace.name}`);
    color.addEventListener('change', () => {
      this.smith.setTraceOptions(trace.id, { color: color.value });
      this.changed();
    });
    const name = document.createElement('input');
    name.type = 'text';
    name.value = trace.name;
    name.setAttribute('aria-label', 'Trace name');
    name.addEventListener('change', () => {
      if (!name.value.trim()) {
        name.value = trace.name;
        return;
      }
      this.smith.setTraceOptions(trace.id, { name: name.value });
      this.changed();
    });
    header.append(visible, color, name);
    const actions = document.createElement('div');
    actions.className = 'trace-actions';
    const count = document.createElement('span');
    count.textContent = `${trace.sampleCount} samples`;
    actions.append(
      count,
      this.button('Add marker', () => {
        const id = this.smith.addMarker(
          trace.id,
          trace.markers.length ? trace.sampleCount - 1 : 0,
        )!;
        this.changed();
        this.selectMarker(id);
      }),
      this.button('Remove trace', () => {
        this.smith.removeTrace(trace.id);
        this.changed();
      }),
    );
    const appearance = document.createElement('div');
    appearance.className = 'trace-appearance';
    const modeLabel = document.createElement('label');
    modeLabel.textContent = 'Display ';
    const mode = document.createElement('select');
    mode.setAttribute('aria-label', 'Display');
    for (const value of ['points', 'line', 'both'] as const) {
      mode.add(
        new Option(
          value === 'both' ? 'Line and points' : value === 'line' ? 'Line' : 'Points',
          value,
        ),
      );
    }
    mode.value = trace.mode;
    mode.addEventListener('change', () => {
      this.smith.setTraceOptions(trace.id, { mode: mode.value as TraceRenderMode });
      this.changed();
    });
    modeLabel.append(mode);
    appearance.append(modeLabel);
    for (const [key, caption] of [
      ['lineWidth', 'Line width (px)'],
      ['pointRadius', 'Point radius'],
    ] as const) {
      const label = document.createElement('label');
      label.textContent = caption + ' ';
      const input = document.createElement('input');
      input.type = 'number';
      input.min = '0.1';
      input.step = 'any';
      input.value = String(trace[key]);
      input.addEventListener('change', () => {
        if (!input.value || !input.checkValidity() || !Number.isFinite(Number(input.value))) {
          input.value = String(trace[key]);
          return;
        }
        this.smith.setTraceOptions(trace.id, { [key]: Number(input.value) });
        this.changed();
      });
      label.append(input);
      appearance.append(label);
    }
    section.append(header, appearance, actions);
    for (const marker of trace.markers) {
      const row = document.createElement('div');
      row.className = 'marker-controls';
      row.dataset.markerId = marker.id;
      const label = document.createElement('label');
      label.textContent = `Marker ${marker.number} · sample `;
      const sample = document.createElement('input');
      sample.type = 'number';
      sample.min = '1';
      sample.max = String(trace.sampleCount);
      sample.step = '1';
      sample.value = String(marker.sampleIndex + 1);
      sample.dataset.markerSample = marker.id;
      sample.addEventListener('change', () => {
        if (!sample.value || !sample.checkValidity()) {
          sample.value = String(this.smith.getMarker(marker.id)!.sampleIndex + 1);
          return;
        }
        this.smith.setMarkerSample(marker.id, Number(sample.value) - 1);
        this.changed();
      });
      label.append(sample);
      row.append(
        label,
        this.button('Select', () => this.selectMarker(marker.id)),
        this.button('Remove marker', () => {
          this.smith.removeMarker(marker.id);
          this.changed();
        }),
      );
      section.append(row);
    }
    return section;
  }
}
