import { OptionsValidation } from './OptionsValidation.js';
import type { SmithOptions } from './options.js';
import { MarkerLegend } from './svg/MarkerLegend.js';
import { ImageExporter } from './svg/ImageExporter.js';
import type { SmithImageExportOptions } from './svg/export.js';
import { Theme } from './appearance/Theme.js';
import type { SmithAppearance, SmithTheme } from './appearance/types.js';
import { color as parseColor } from 'd3';
import { SvgChartRenderer } from './rendering/SvgChartRenderer.js';
import type { SmithData } from './traces/SmithData.js';
import type { SmithMarker } from './traces/SmithMarker.js';
import type { TraceSamples } from './samples.js';
import { Complex } from './math/Complex.js';
import type { ChartLayers, GridDetail, PeripheralScales } from './layers.js';
import { RfCalculations } from './rf/RfCalculations.js';
import type { SmithReading } from './rf/RfCalculations.js';
import { MarkerMeasurements } from './MarkerMeasurements.js';
import type {
  TraceOptions,
  TraceUpdateOptions,
  TraceInfo,
  MarkerSnapshot,
  MarkerComparison,
} from './measurements.js';

export enum SmithEventType {
  Cursor = 'cursor',
  Marker = 'marker',
  MarkerSelect = 'marker-select',
  MarkerDragStart = 'marker-drag-start',
  MarkerDragEnd = 'marker-drag-end',
}

export type SmithEvent =
  | { type: SmithEventType.Cursor; data: SmithReading | undefined }
  | {
      type:
        | SmithEventType.Marker
        | SmithEventType.MarkerSelect
        | SmithEventType.MarkerDragStart
        | SmithEventType.MarkerDragEnd;
      data: MarkerSnapshot;
    };

export class Smith {
  private theme: SmithTheme;
  private referenceOhms: number;
  private readonly renderer: SvgChartRenderer;
  private data: SmithData[] = [];
  private destroyed = false;
  private nextDatasetColor = 0;
  private nextTraceId = 1;
  private nextMarkerId = 1;
  private traceMetadata = new WeakMap<
    SmithData,
    { id: string; name: string; colorIndex?: number }
  >();
  private markerIds = new WeakMap<SmithMarker, string>();
  private draggedMarkers = new Set<SmithMarker>();
  private listeners = new Set<(event: SmithEvent) => void>();

  public readonly layers: ChartLayers;
  public readonly peripheralScales: PeripheralScales;

  constructor(options: SmithOptions = {}) {
    OptionsValidation.chart(options);
    this.referenceOhms =
      options.referenceImpedanceOhms === undefined ? 50 : options.referenceImpedanceOhms;
    if (!Number.isFinite(this.referenceOhms) || this.referenceOhms <= 0) {
      throw new RangeError('Reference impedance must be positive and finite.');
    }
    this.theme = Theme.resolve(options.appearance);
    this.renderer = new SvgChartRenderer((position) => {
      this.emit({
        type: SmithEventType.Cursor,
        data: position ? RfCalculations.readReflection(position, this.referenceOhms) : undefined,
      });
    });
    this.renderer.setTheme(this.theme);
    this.layers = this.renderer.layers;
    this.peripheralScales = this.renderer.peripheralScales;
    try {
      this.applyOptions(options);
    } catch (error) {
      // Invalid constructor options must not retain observers or event handlers.
      this.renderer.destroy();
      throw error;
    }
  }

  /** Apply a validated patch. Omitted fields retain their current settings. */
  public setOptions(options: SmithOptions): void {
    this.assertAlive();
    OptionsValidation.chart(options);
    // Renormalization can reject otherwise valid options for the loaded samples.
    // Do it before presentation changes so rejection preserves the entire chart.
    if (options.referenceImpedanceOhms !== undefined) {
      this.renormalize(options.referenceImpedanceOhms);
    }
    if (options.appearance !== undefined) {
      this.setAppearance(options.appearance);
    }
    this.applyOptions(options);
  }

  private applyOptions(options: SmithOptions): void {
    if (options.interaction?.zoom !== undefined) {
      this.setZoomEnabled(options.interaction.zoom);
    }
    if (options.interaction?.cursor !== undefined) {
      this.setCursorEnabled(options.interaction.cursor);
    }
    if (options.peripheralScales?.visible !== undefined) {
      this.peripheralScales.setVisible(options.peripheralScales.visible);
    }
    for (const name of ['resistance', 'reactance', 'conductance', 'susceptance'] as const) {
      const layer = this.layers[name];
      for (const settings of [options.grid, options.grid?.layers?.[name]]) {
        if (settings === undefined) {
          continue;
        }
        if (settings.detail !== undefined) {
          layer.setDetail(settings.detail);
        }
        if (settings.labelsVisible !== undefined) {
          layer.setLabelsVisible(settings.labelsVisible);
        }
        if (settings.style !== undefined) {
          layer.setStyle(settings.style);
        }
      }
      const visible = options.grid?.layers?.[name]?.visible;
      if (visible !== undefined) {
        layer.setVisible(visible);
      }
    }
    for (const name of ['q', 'vswr'] as const) {
      const settings = options.circles?.[name];
      if (settings === undefined) {
        continue;
      }
      const layer = this.layers[name];
      if (settings.values !== undefined) {
        layer.setValues(settings.values);
      }
      if (settings.style !== undefined) {
        layer.setStyle(settings.style);
      }
      if (settings.visible !== undefined) {
        layer.setVisible(settings.visible);
      }
    }
  }

  /** Replace the appearance while retaining explicit layer styles and trace colors. */
  public setAppearance(appearance: SmithAppearance): void {
    this.assertAlive();
    const theme = Theme.resolve(appearance);
    this.theme = theme;
    this.renderer.setTheme(theme);
    for (const data of this.data) {
      const index = this.traceMetadata.get(data)!.colorIndex;
      if (index !== undefined) {
        data.setColor(theme.traceColors[index % theme.traceColors.length]);
      }
    }
  }

  public draw(target: string | HTMLElement): void {
    this.assertAlive();
    this.renderer.draw(target);
  }

  /** Set the same detail level on all impedance and admittance grid layers. */
  public setGridDetail(detail: GridDetail): void {
    this.assertAlive();
    for (const name of ['resistance', 'reactance', 'conductance', 'susceptance'] as const) {
      this.layers[name].setDetail(detail);
    }
  }

  /** Export the current mounted view as standalone SVG with its configured background. */
  public toSvg(options?: SmithImageExportOptions): string {
    this.assertAlive();
    this.validateExportOptions(options);
    const source = this.renderer.toSvg();
    if (options === undefined) {
      return source;
    }
    const sources = [source];
    if (options.scales) {
      sources.push(options.scales.toSvg({ readout: options.scaleReadout }));
    }
    return ImageExporter.svg(sources, options, this.exportLegend(options));
  }

  private validateExportOptions(options: SmithImageExportOptions | undefined): void {
    if (options?.scaleReadout !== undefined && !options.scales) {
      throw new TypeError('Scale readout requires included radial scales.');
    }
  }

  private exportLegend(options: SmithImageExportOptions) {
    const traces = this.getTraces();
    return {
      entries: [
        ...(options.legend ? traces.filter((trace) => trace.visible) : []),
        ...(options.markerLegend
          ? MarkerLegend.entries(traces, (id) => this.getMarker(id)!, options.markerLegend)
          : []),
      ],
      textColor: this.theme.grid.textColor,
      fontFamily: this.theme.fontFamily,
    };
  }

  /** Export the mounted view as PNG, optionally with radial scales and a trace legend. */
  public async toPng(options: SmithImageExportOptions = {}): Promise<Blob> {
    this.assertAlive();
    this.validateExportOptions(options);
    const sources = [this.toSvg()];
    if (options.scales) {
      sources.push(options.scales.toSvg({ readout: options.scaleReadout }));
    }
    return ImageExporter.png(sources, options, this.exportLegend(options));
  }

  /** Remove this chart and release its event handlers. Safe to call more than once. */
  public destroy(): void {
    if (this.destroyed) {
      return;
    }
    this.listeners.clear();
    this.clearTraces();
    this.destroyed = true;
    this.renderer.destroy();
  }

  private assertAlive(): void {
    if (this.destroyed) {
      throw new Error('This Smith chart has been destroyed. Create a new instance.');
    }
  }

  private markerDragChanged(marker: SmithMarker, dragging: boolean): void {
    const wasDragging = this.draggedMarkers.size > 0;
    if (dragging) {
      this.draggedMarkers.add(marker);
    } else {
      this.draggedMarkers.delete(marker);
    }
    const isDragging = this.draggedMarkers.size > 0;
    if (isDragging === wasDragging) {
      return;
    }
    this.renderer.setMarkerDragging(isDragging);
  }

  /** Last cursor position. Use cursor events to detect pointer leave. */
  public get cursorReading(): SmithReading {
    return RfCalculations.readReflection(this.renderer.cursorPosition, this.referenceOhms);
  }

  /** Enable or disable wheel, double-click, and mouse/touch zoom/pan. Keeps the current view. */
  public setZoomEnabled(enabled: boolean): void {
    this.assertAlive();
    this.renderer.setZoomEnabled(enabled);
  }

  /** Enable or disable the cursor overlay and readings independently of zoom and markers. */
  public setCursorEnabled(enabled: boolean): void {
    this.assertAlive();
    this.renderer.setCursorEnabled(enabled);
  }

  public resetView(): void {
    this.assertAlive();
    this.renderer.resetView();
  }

  /** Add a named trace without markers. Use addMarker to create markers explicitly. Returns a chart-local, stable ID. */
  public addTrace(values: TraceSamples, options: TraceOptions = {}): string {
    this.assertAlive();
    this.validateTraceOptions(options);
    if (!values.length) {
      throw new RangeError('A trace requires at least one sample.');
    }
    const data = this.createSmithData(values, this.nextDatasetColor, options);
    this.nextDatasetColor++;
    this.data.push(data);
    const id = this.traceMetadata.get(data)!.id;
    this.setTraceOptions(id, options);
    return id;
  }

  /** Detached metadata snapshots; IDs and marker display numbers survive removals. */
  public getTraces(): TraceInfo[] {
    return this.data.map((data) => ({
      id: this.traceMetadata.get(data)!.id,
      name: this.traceMetadata.get(data)!.name,
      ...data.Style,
      color: data.Color,
      visible: data.Visible,
      sampleCount: data.SampleCount,
      markers: data.Markers.map((entry, index) => ({
        id: this.markerId(entry.marker),
        number: entry.number,
        sampleIndex: data.markerSampleIndex(index),
      })),
    }));
  }

  private traceIndex(id: string): number {
    return this.data.findIndex((data) => this.traceMetadata.get(data)!.id === id);
  }

  private markerId(marker: SmithMarker): string {
    let id = this.markerIds.get(marker);
    if (!id) {
      id = `marker-${this.nextMarkerId++}`;
      this.markerIds.set(marker, id);
    }
    return id;
  }

  private findMarker(id: string): { datasetNo: number; markerNo: number } | undefined {
    for (const [datasetNo, data] of this.data.entries()) {
      const markerNo = data.Markers.findIndex((entry) => this.markerId(entry.marker) === id);
      if (markerNo >= 0) {
        return { datasetNo, markerNo };
      }
    }
    return;
  }

  private validateTraceOptions(options: TraceOptions): void {
    if (options.mode !== undefined && !['points', 'line', 'both'].includes(options.mode)) {
      throw new TypeError('Trace mode must be points, line, or both.');
    }
    for (const key of ['lineWidth', 'pointRadius'] as const) {
      const value = options[key];
      if (value !== undefined && (!Number.isFinite(value) || value <= 0)) {
        throw new RangeError(`${key} must be positive and finite.`);
      }
    }
    if (options.name !== undefined && (typeof options.name !== 'string' || !options.name.trim())) {
      throw new TypeError('Trace name must not be empty.');
    }
    if (
      options.color !== undefined &&
      (typeof options.color !== 'string' || !parseColor(options.color))
    ) {
      throw new TypeError('Trace color must be a solid CSS color.');
    }
    if (options.visible !== undefined && typeof options.visible !== 'boolean') {
      throw new TypeError('Trace visibility must be a boolean.');
    }
  }

  public setTraceOptions(id: string, options: TraceOptions): boolean {
    this.assertAlive();
    const data = this.data[this.traceIndex(id)];
    if (!data) {
      return false;
    }
    this.validateTraceOptions(options);
    data.setStyle(options);
    if (options.name !== undefined) {
      this.traceMetadata.get(data)!.name = options.name.trim();
      data.setName(options.name.trim());
    }
    if (options.color !== undefined) {
      data.setColor(options.color);
      delete this.traceMetadata.get(data)!.colorIndex;
    }
    if (options.visible !== undefined) {
      data.setVisible(options.visible);
    }
    return true;
  }

  /** Replace samples; by default each marker follows its nearest measured frequency. */
  public updateTrace(id: string, values: TraceSamples, options: TraceUpdateOptions = {}): boolean {
    this.assertAlive();
    const data = this.data[this.traceIndex(id)];
    if (!data) {
      return false;
    }
    const strategy = options.markerSelection ?? 'frequency';
    if (!['frequency', 'sample-index', 'reflection'].includes(strategy)) {
      throw new TypeError('Marker selection must be frequency, sample-index, or reflection.');
    }
    data.update(values, strategy);
    return true;
  }

  public removeTrace(id: string): boolean {
    this.assertAlive();
    const index = this.traceIndex(id);
    if (index < 0) {
      return false;
    }
    this.renderer.removeTrace(this.data[index]);
    this.data.splice(index, 1);
    return true;
  }

  /** Place a marker on an existing sample; no interpolation is performed. */
  public addMarker(traceId: string, sampleIndex = 0): string | undefined {
    this.assertAlive();
    const data = this.data[this.traceIndex(traceId)];
    if (!data) {
      return;
    }
    const index = data.addMarker(sampleIndex);
    return this.markerId(data.Markers[index].marker);
  }

  public removeMarker(id: string): boolean {
    this.assertAlive();
    const location = this.findMarker(id);
    return location ? this.data[location.datasetNo].removeMarker(location.markerNo) : false;
  }

  /** Focus a mounted, visible marker for keyboard interaction. */
  public focusMarker(id: string): boolean {
    this.assertAlive();
    const location = this.findMarker(id);
    return location
      ? this.data[location.datasetNo].Markers[location.markerNo].marker.focus()
      : false;
  }

  public setMarkerSample(id: string, sampleIndex: number): boolean {
    this.assertAlive();
    const location = this.findMarker(id);
    return location
      ? this.data[location.datasetNo].setMarkerSample(location.markerNo, sampleIndex)
      : false;
  }

  /** Select the nearest measured frequency; ties choose the earliest input sample. */
  public setMarkerFrequency(id: string, frequencyHz: number): boolean {
    this.assertAlive();
    const location = this.findMarker(id);
    return location
      ? this.data[location.datasetNo].setMarkerFrequency(location.markerNo, frequencyHz)
      : false;
  }

  public getMarker(id: string): MarkerSnapshot | undefined {
    const location = this.findMarker(id);
    if (!location) {
      return;
    }
    const data = this.data[location.datasetNo];
    const marker = data.Markers[location.markerNo];
    return {
      ...RfCalculations.readReflection(
        Complex.from(...marker.selectedPoint.reflectionCoefficient),
        this.referenceImpedanceOhms,
      ),
      frequencyHz: marker.selectedPoint.frequencyHz,
      traceId: this.traceMetadata.get(data)!.id,
      markerId: id,
      markerNumber: marker.number,
      sampleIndex: data.markerSampleIndex(location.markerNo),
    };
  }

  /** Return B − A, or undefined if either marker no longer exists. */
  public compareMarkers(a: string, b: string): MarkerComparison | undefined {
    const first = this.getMarker(a);
    const second = this.getMarker(b);
    return first && second ? MarkerMeasurements.compare(first, second) : undefined;
  }

  /** Current positive real reference impedance, in ohms. */
  public get referenceImpedanceOhms(): number {
    return this.referenceOhms;
  }

  /** Renormalize all traces while retaining physical impedance, IDs, and selected sample indices. */
  public renormalize(referenceImpedanceOhms: number): void {
    this.assertAlive();
    // Validate even with no traces, and prepare every result before changing any state.
    RfCalculations.renormalizeSamples([], this.referenceOhms, referenceImpedanceOhms);
    if (referenceImpedanceOhms === this.referenceOhms) {
      return;
    }
    const samples = this.data.map((data) =>
      RfCalculations.renormalizeSamples(data.Samples, this.referenceOhms, referenceImpedanceOhms),
    );
    this.data.forEach((data) => data.Markers.forEach((entry) => entry.marker.cancelDrag()));
    this.referenceOhms = referenceImpedanceOhms;
    this.data.forEach((data, index) => data.update(samples[index], 'sample-index'));
    this.renderer.hideCursor();
  }

  public clearTraces(): void {
    this.assertAlive();
    this.data.forEach((dataset) => this.renderer.removeTrace(dataset));
    this.data = [];
  }

  private createSmithData(values: TraceSamples, dataset: number, options: TraceOptions): SmithData {
    const color = this.theme.traceColors[dataset % this.theme.traceColors.length];
    const data = this.renderer.createTrace(values, color, options, (marker, dragging) => {
      this.markerDragChanged(marker, dragging);
      const snapshot = this.getMarker(this.markerId(marker));
      if (snapshot) {
        this.emit({
          type: dragging ? SmithEventType.MarkerDragStart : SmithEventType.MarkerDragEnd,
          data: snapshot,
        });
      }
    });
    const number = this.nextTraceId++;
    this.traceMetadata.set(data, {
      id: `trace-${number}`,
      name: `Trace ${number}`,
      colorIndex: dataset,
    });
    data.setName(`Trace ${number}`);
    data.setMarkerSelectHandler((marker) => {
      const snapshot = this.getMarker(this.markerId(marker));
      if (snapshot) {
        this.emit({ type: SmithEventType.MarkerSelect, data: snapshot });
      }
    });
    data.setMarkerMoveHandler((index) => {
      const marker = data.Markers[index];
      const snapshot = marker && this.getMarker(this.markerId(marker.marker));
      if (snapshot) {
        this.emit({ type: SmithEventType.Marker, data: snapshot });
      }
    });
    return data;
  }

  /** Subscribe to chart events. The returned function removes this subscription. */
  public onEvent(listener: (event: SmithEvent) => void): () => void {
    this.assertAlive();
    // Separate registrations of the same function remain independently removable.
    const subscription = (event: SmithEvent) => listener(event);
    this.listeners.add(subscription);
    return () => {
      this.listeners.delete(subscription);
    };
  }

  private emit(event: SmithEvent): void {
    for (const listener of this.listeners) {
      listener(event);
    }
  }
}
