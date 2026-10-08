import { SmithFormatter } from '../SmithFormatter.js';
import type { MarkerSnapshot, TraceInfo } from '../measurements.js';
import type { MarkerLegendField, MarkerLegendOptions } from './export.js';

/** Format detached marker readings for the shared SVG/PNG report footer. */
export class MarkerLegend {
  private constructor() {}

  public static entries(
    traces: readonly TraceInfo[],
    reading: (id: string) => MarkerSnapshot,
    options: true | MarkerLegendOptions,
  ): { name: string; color: string }[] {
    const { markerIds, fields = ['frequency', 'impedance'] } = options === true ? {} : options;
    const knownIds = new Set(traces.flatMap((trace) => trace.markers.map((marker) => marker.id)));
    if (markerIds?.some((id) => !knownIds.has(id))) {
      throw new RangeError('Marker legend contains an unknown marker ID.');
    }
    const available: readonly MarkerLegendField[] = [
      'frequency',
      'impedance',
      'admittance',
      'reflectionCoefficient',
      'vswr',
      'returnLoss',
    ];
    if (fields.some((field) => !available.includes(field))) {
      throw new RangeError('Marker legend contains an unknown field.');
    }
    const selected = markerIds === undefined ? undefined : new Set(markerIds);
    return traces
      .filter((trace) => trace.visible)
      .flatMap((trace) =>
        trace.markers
          .filter((marker) => selected === undefined || selected.has(marker.id))
          .map((marker) => {
            const snapshot = reading(marker.id);
            return {
              color: trace.color,
              name: [
                `${trace.name} · Marker ${marker.number}`,
                ...[...new Set(fields)].map((field) => MarkerLegend.field(snapshot, field)),
              ].join(' · '),
            };
          }),
      );
  }

  private static field(marker: MarkerSnapshot, field: MarkerLegendField): string {
    switch (field) {
      case 'frequency':
        return `f = ${SmithFormatter.number(marker.frequencyHz)}Hz`;
      case 'impedance':
        return `Z = ${marker.impedanceOhms?.toString(3) ?? '∞'} Ω`;
      case 'admittance':
        return `Y = ${marker.admittanceSiemens?.mul(1000).toString(3) ?? '∞'} mS`;
      case 'reflectionCoefficient':
        return `Γ = ${marker.reflectionCoefficient.toString(3)}`;
      case 'vswr':
        return `VSWR = ${MarkerLegend.number(marker.vswr)}${marker.vswr === undefined ? '' : ' : 1'}`;
      case 'returnLoss':
        return `Return loss = ${MarkerLegend.number(marker.returnLossDb)} dB`;
    }
  }

  private static number(value: number | undefined): string {
    if (value === undefined || Number.isNaN(value)) {
      return '—';
    }
    if (!Number.isFinite(value)) {
      return value < 0 ? '−∞' : '∞';
    }
    return String(Number(value.toPrecision(4)));
  }
}
