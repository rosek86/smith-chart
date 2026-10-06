import { Complex } from './complex/Complex.js';
import type { SmithReading } from './rf.js';

export type TraceRenderMode = 'points' | 'line' | 'both';

export interface TraceStyle {
  mode: TraceRenderMode;
  /** Non-scaling SVG stroke width in CSS pixels. Default: 2. */
  lineWidth: number;
  /** Point radius in CSS pixels; remains constant under chart zoom and container resize. Default: 2. */
  pointRadius: number;
}

export interface TraceOptions extends Partial<TraceStyle> {
  name?: string;
  /** A solid CSS color, such as '#2563eb' or 'orange'. */
  color?: string;
  visible?: boolean;
}

/** How markers select samples when a trace is replaced. */
export type MarkerSelectionStrategy = 'frequency' | 'sample-index' | 'reflection';

export interface TraceUpdateOptions {
  /** Default: frequency. Ties select the earliest input sample; indices clamp to the new last sample. */
  markerSelection?: MarkerSelectionStrategy;
}

export interface MarkerInfo {
  readonly id: string;
  /** Stable display number within the trace; removed numbers are not reused. */
  readonly number: number;
  readonly sampleIndex: number;
}

export interface TraceInfo extends Readonly<TraceStyle> {
  readonly id: string;
  readonly name: string;
  readonly color: string;
  readonly visible: boolean;
  readonly sampleCount: number;
  readonly markers: readonly MarkerInfo[];
}

/** A detached reading identified by stable, chart-local trace and marker IDs. */
export interface MarkerSnapshot extends SmithReading {
  readonly frequencyHz: number;
  readonly traceId: string;
  readonly markerId: string;
  readonly markerNumber: number;
  readonly sampleIndex: number;
}

export interface MarkerComparison {
  readonly frequencyDeltaHz: number;
  /** Undefined if either impedance is singular or non-finite. */
  readonly impedanceDeltaOhms: Complex | undefined;
  /** Shortest signed B − A phase difference in [−180, 180); undefined at Γ = 0. */
  readonly phaseDeltaDegrees: number | undefined;
}

/** Compare B against A without a chart or browser. Frequencies must be finite and non-negative. */
export function compareMarkerReadings(
  a: Pick<MarkerSnapshot, 'frequencyHz' | 'impedanceOhms' | 'reflectionCoefficient'>,
  b: Pick<MarkerSnapshot, 'frequencyHz' | 'impedanceOhms' | 'reflectionCoefficient'>,
): MarkerComparison {
  if (
    ![a.frequencyHz, b.frequencyHz].every(
      (frequencyHz) => Number.isFinite(frequencyHz) && frequencyHz >= 0,
    )
  ) {
    throw new RangeError('Marker frequencies must be finite and non-negative.');
  }
  const isFinite = (value: Complex) => Number.isFinite(value.re) && Number.isFinite(value.im);
  const hasPhase = (gamma: Complex) => isFinite(gamma) && (gamma.re !== 0 || gamma.im !== 0);
  const phaseDelta =
    hasPhase(a.reflectionCoefficient) && hasPhase(b.reflectionCoefficient)
      ? ((b.reflectionCoefficient.arg() - a.reflectionCoefficient.arg()) * 180) / Math.PI
      : undefined;
  const impedanceDelta =
    a.impedanceOhms && b.impedanceOhms && isFinite(a.impedanceOhms) && isFinite(b.impedanceOhms)
      ? b.impedanceOhms.sub(a.impedanceOhms)
      : undefined;
  return {
    frequencyDeltaHz: b.frequencyHz - a.frequencyHz,
    impedanceDeltaOhms: impedanceDelta && isFinite(impedanceDelta) ? impedanceDelta : undefined,
    phaseDeltaDegrees: phaseDelta === undefined ? undefined : ((phaseDelta + 540) % 360) - 180,
  };
}
