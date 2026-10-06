import type { MarkerSelectionStrategy } from '../measurements.js';
import type { Point } from '../math/geometry.js';
import type { TraceSample, TraceSamples } from '../samples.js';

export interface TraceMarker {
  readonly number: number;
  selectedPoint: TraceSample;
}

/** Owns validated samples and marker selections without depending on SVG or D3. */
export class TraceModel {
  private samples: TraceSamples;
  private markers: TraceMarker[] = [];
  private markerCount = 0;

  public constructor(samples: TraceSamples) {
    this.samples = this.copySamples(samples);
  }

  public get Samples(): TraceSamples {
    return this.samples;
  }

  public get Markers(): readonly TraceMarker[] {
    return this.markers.slice();
  }

  public addMarker(sampleIndex: number): TraceMarker {
    this.validateSampleIndex(sampleIndex);
    const marker = { number: ++this.markerCount, selectedPoint: this.samples[sampleIndex] };
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
    return marker ? this.samples.indexOf(marker.selectedPoint) : -1;
  }

  public setMarkerSample(index: number, sampleIndex: number): TraceMarker | undefined {
    const marker = this.markers[index];
    if (!marker) {
      return;
    }
    this.validateSampleIndex(sampleIndex);
    marker.selectedPoint = this.samples[sampleIndex];
    return marker;
  }

  public setMarkerFrequency(index: number, frequencyHz: number): TraceMarker | undefined {
    if (!this.markers[index]) {
      return;
    }
    if (!Number.isFinite(frequencyHz) || frequencyHz < 0) {
      throw new RangeError('Marker frequency must be finite and non-negative.');
    }
    return this.setMarkerSample(index, this.nearestFrequencyIndex(frequencyHz));
  }

  /** Returns false when dragging still selects the same sample. */
  public selectNearestPoint(marker: TraceMarker, point: Readonly<Point>): boolean {
    if (!this.markers.includes(marker)) {
      return false;
    }
    const sample = this.nearestPoint(point);
    if (sample === marker.selectedPoint) {
      return false;
    }
    marker.selectedPoint = sample;
    return true;
  }

  public update(values: TraceSamples, strategy: MarkerSelectionStrategy): void {
    // Validate and copy before mutating either samples or marker selections.
    const samples = this.copySamples(values);
    const selectedIndices = this.markers.map((entry) => this.samples.indexOf(entry.selectedPoint));
    this.samples = samples;
    this.markers.forEach((entry, index) => {
      if (strategy === 'sample-index') {
        entry.selectedPoint = samples[Math.min(selectedIndices[index], samples.length - 1)];
      } else if (strategy === 'reflection') {
        entry.selectedPoint = this.nearestPoint(entry.selectedPoint.reflectionCoefficient);
      } else {
        entry.selectedPoint = samples[this.nearestFrequencyIndex(entry.selectedPoint.frequencyHz)];
      }
    });
  }

  public clear(): void {
    this.samples = [];
    this.markers = [];
  }

  private nearestFrequencyIndex(frequencyHz: number): number {
    let closest = 0;
    let distance = Math.abs(this.samples[0].frequencyHz - frequencyHz);
    for (let i = 1; i < this.samples.length; i++) {
      const nextDistance = Math.abs(this.samples[i].frequencyHz - frequencyHz);
      if (nextDistance < distance) {
        closest = i;
        distance = nextDistance;
      }
    }
    return closest;
  }

  private nearestPoint(point: Readonly<Point>): TraceSample {
    const distance = (sample: TraceSample) =>
      Math.hypot(
        point[0] - sample.reflectionCoefficient[0],
        point[1] - sample.reflectionCoefficient[1],
      );
    return this.samples.reduce((previous, current) =>
      distance(previous) <= distance(current) ? previous : current,
    );
  }

  private validateSampleIndex(index: number): void {
    if (!Number.isInteger(index) || index < 0 || index >= this.samples.length) {
      throw new RangeError('Sample index is outside this trace.');
    }
  }

  private copySamples(values: TraceSamples): TraceSamples {
    if (
      !values.length ||
      values.some(
        ({ frequencyHz, reflectionCoefficient }) =>
          !Number.isFinite(frequencyHz) ||
          frequencyHz < 0 ||
          reflectionCoefficient.length !== 2 ||
          !reflectionCoefficient.every(Number.isFinite),
      )
    ) {
      throw new RangeError(
        'A dataset requires samples with a non-negative finite frequency and two finite coordinates.',
      );
    }
    return values.map(({ frequencyHz, reflectionCoefficient }) => ({
      frequencyHz,
      reflectionCoefficient: [reflectionCoefficient[0], reflectionCoefficient[1]],
    }));
  }
}
