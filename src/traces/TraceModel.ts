import type { MarkerSelectionStrategy } from '../measurements.js';
import type { Point } from '../math/geometry.js';
import type { TraceInput } from '../samples.js';
import { TraceBuffer } from './TraceBuffer.js';

export interface TraceMarker {
  readonly number: number;
  sampleIndex: number;
}

/** Owns validated samples and marker selections without depending on SVG or D3. */
export class TraceModel {
  private samples: TraceBuffer;
  private markers: TraceMarker[] = [];
  private markerCount = 0;

  public constructor(samples: TraceInput) {
    this.samples = TraceBuffer.from(samples);
  }

  public get Samples(): TraceBuffer {
    return this.samples;
  }

  public get Markers(): readonly TraceMarker[] {
    return this.markers.slice();
  }

  public addMarker(sampleIndex: number): TraceMarker {
    this.validateSampleIndex(sampleIndex);
    const marker = { number: ++this.markerCount, sampleIndex };
    this.markers.push(marker);
    return marker;
  }

  public removeMarker(index: number): TraceMarker | undefined {
    const marker = this.markers[index];
    if (marker) {
      this.markers.splice(index, 1);
    }
    return marker;
  }

  public getMarker(index: number): TraceMarker | undefined {
    return this.markers[index];
  }

  public markerIndex(marker: TraceMarker): number {
    return this.markers.indexOf(marker);
  }

  public markerSampleIndex(index: number): number {
    const marker = this.markers[index];
    return marker?.sampleIndex ?? -1;
  }

  public setMarkerSample(index: number, sampleIndex: number): TraceMarker | undefined {
    const marker = this.markers[index];
    if (!marker) {
      return;
    }
    this.validateSampleIndex(sampleIndex);
    marker.sampleIndex = sampleIndex;
    return marker;
  }

  public setMarkerFrequency(index: number, frequencyHz: number): TraceMarker | undefined {
    if (!this.markers[index]) {
      return;
    }
    if (!Number.isFinite(frequencyHz) || frequencyHz < 0) {
      throw new RangeError('Marker frequency must be finite and non-negative.');
    }
    return this.setMarkerSample(index, this.samples.nearestFrequency(frequencyHz));
  }

  /** Returns false when dragging still selects the same sample. */
  public selectNearestPoint(marker: TraceMarker, point: Readonly<Point>): boolean {
    if (!this.markers.includes(marker)) {
      return false;
    }
    const sampleIndex = this.samples.nearestPoint(point);
    if (sampleIndex === marker.sampleIndex) {
      return false;
    }
    marker.sampleIndex = sampleIndex;
    return true;
  }

  public update(values: TraceInput | TraceBuffer, strategy: MarkerSelectionStrategy): void {
    // Prepare every selection before replacing data so rejected updates are atomic.
    const samples = values instanceof TraceBuffer ? values : TraceBuffer.from(values);
    const selectedIndices = this.markers.map((entry) => {
      if (strategy === 'sample-index') {
        return Math.min(entry.sampleIndex, samples.length - 1);
      }
      if (strategy === 'reflection') {
        return samples.nearestPoint([
          this.samples.real(entry.sampleIndex),
          this.samples.imaginary(entry.sampleIndex),
        ]);
      }
      return samples.nearestFrequency(this.samples.frequency(entry.sampleIndex));
    });
    this.samples = samples;
    this.markers.forEach((entry, index) => {
      entry.sampleIndex = selectedIndices[index];
    });
  }

  public clear(): void {
    this.samples = TraceBuffer.empty();
    this.markers = [];
  }

  private validateSampleIndex(index: number): void {
    if (!Number.isInteger(index) || index < 0 || index >= this.samples.length) {
      throw new RangeError('Sample index is outside this trace.');
    }
  }
}
