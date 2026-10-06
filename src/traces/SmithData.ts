import { SmithGroup } from '../svg/SmithGroup.js';
import type { TraceStyle, MarkerSelectionStrategy } from '../measurements.js';
import { SmithMarker } from './SmithMarker.js';
import { SmithScaler } from '../svg/SmithScaler.js';
import type { TraceSamples, TraceSample } from '../samples.js';
import { TraceModel, type TraceMarker } from './TraceModel.js';
import { TraceRenderer, type TraceTransform } from './TraceRenderer.js';

/** Coordinates trace rendering, draggable markers, and deferred marker events. */
export class SmithData {
  private readonly model: TraceModel;
  private readonly renderer: TraceRenderer;
  private readonly markers = new Map<TraceMarker, SmithMarker>();
  private readonly pendingEvents = new Map<TraceMarker, ReturnType<typeof setTimeout>>();
  private destroyed = false;
  private visible = true;
  private handler: ((marker: number, data: TraceSample) => void) | null = null;

  public constructor(
    data: TraceSamples,
    private color: string,
    private transform: TraceTransform,
    container: SmithGroup,
    private scaler: SmithScaler,
    private markerDragHandler?: (marker: SmithMarker, dragging: boolean) => void,
    private markerContainer: SmithGroup = container,
    style: Partial<TraceStyle> = {},
  ) {
    this.model = new TraceModel(data);
    this.renderer = new TraceRenderer(
      this.model.Samples,
      color,
      transform,
      container,
      scaler,
      style,
    );
  }

  public setViewportScale(scale: number): void {
    this.renderer.setViewportScale(scale);
  }

  public zoom(transform: TraceTransform): void {
    if (this.destroyed) {
      return;
    }
    this.transform = transform;
    this.renderer.zoom(transform);
    this.markers.forEach((marker) => marker.zoom(transform.k));
  }

  public addMarker(sampleIndex = 0): number {
    this.assertAlive();
    const entry = this.model.addMarker(sampleIndex);
    const marker = new SmithMarker(entry.number, this.color, (dragging) =>
      this.markerDragHandler?.(marker, dragging),
    );
    this.markers.set(entry, marker);
    marker.Element.attr('data-role', 'marker');
    this.markerContainer.append(marker);
    marker.setDragHandler((point) => {
      if (this.model.selectNearestPoint(entry, this.scaler.pointInvert(point))) {
        this.moveMarker(entry);
        marker.zoom(this.transform.k);
      }
    });
    marker.zoom(this.transform.k);
    marker.show();
    marker.Element.style('display', () => (this.visible ? null : 'none'));
    this.moveMarker(entry);
    return this.model.markerIndex(entry);
  }

  public removeMarker(index: number): boolean {
    const entry = this.model.getMarker(index);
    if (!entry) {
      return false;
    }
    clearTimeout(this.pendingEvents.get(entry));
    this.pendingEvents.delete(entry);
    // Ending a drag must still be able to read the marker snapshot.
    this.markers.get(entry)!.destroy();
    this.markers.delete(entry);
    this.model.removeMarker(index);
    return true;
  }

  public setMarkerSample(index: number, sampleIndex: number): boolean {
    const entry = this.model.setMarkerSample(index, sampleIndex);
    if (!entry) {
      return false;
    }
    this.moveMarker(entry);
    return true;
  }

  public setMarkerFrequency(index: number, frequencyHz: number): boolean {
    const entry = this.model.setMarkerFrequency(index, frequencyHz);
    if (!entry) {
      return false;
    }
    this.moveMarker(entry);
    return true;
  }

  public get Samples(): TraceSamples {
    return this.model.Samples;
  }

  public get SampleCount(): number {
    return this.model.Samples.length;
  }

  public get Color(): string {
    return this.color;
  }

  public get Visible(): boolean {
    return this.visible;
  }

  public markerSampleIndex(index: number): number {
    return this.model.markerSampleIndex(index);
  }

  public setColor(color: string): void {
    this.color = color;
    this.renderer.setColor(color);
    this.markers.forEach((marker) => marker.setColor(color));
  }

  public get Style(): TraceStyle {
    return this.renderer.Style;
  }

  public setStyle(options: Partial<TraceStyle>): void {
    this.renderer.setStyle(options);
  }

  public setVisible(visible: boolean): void {
    this.visible = visible;
    this.renderer.setVisible(visible);
    this.markers.forEach((marker) => {
      if (!visible) {
        marker.cancelDrag();
      }
      marker.Element.style('display', () => (visible ? null : 'none'));
    });
  }

  private moveMarker(entry: TraceMarker): void {
    this.markers.get(entry)!.move(this.scaler.point(entry.selectedPoint.reflectionCoefficient));
    this.notifyMarker(entry);
  }

  private notifyMarker(entry: TraceMarker): void {
    if (this.pendingEvents.has(entry)) {
      return;
    }
    const timer = setTimeout(() => {
      this.pendingEvents.delete(entry);
      const index = this.model.markerIndex(entry);
      if (!this.destroyed && index >= 0) {
        this.handler?.(index, entry.selectedPoint);
      }
    }, 0);
    this.pendingEvents.set(entry, timer);
  }

  private cancelEvents(): void {
    this.pendingEvents.forEach((timer) => clearTimeout(timer));
    this.pendingEvents.clear();
  }

  public update(values: TraceSamples, strategy: MarkerSelectionStrategy = 'frequency'): void {
    this.assertAlive();
    this.model.update(values, strategy);
    this.cancelEvents();
    this.renderer.update(this.model.Samples);
    this.model.Markers.forEach((entry) => this.moveMarker(entry));
  }

  public destroy(): void {
    if (this.destroyed) {
      return;
    }
    this.destroyed = true;
    this.cancelEvents();
    this.handler = null;
    this.markers.forEach((marker) => marker.destroy());
    this.markers.clear();
    this.model.clear();
    this.markerDragHandler = undefined;
    this.renderer.destroy();
  }

  public get Markers() {
    return this.model.Markers.map((entry) => ({ ...entry, marker: this.markers.get(entry)! }));
  }

  public setMarkerMoveHandler(handler: (marker: number, data: TraceSample) => void): void {
    this.handler = handler;
  }

  private assertAlive(): void {
    if (this.destroyed) {
      throw new Error('This dataset has been removed.');
    }
  }
}
