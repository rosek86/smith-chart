import { select, format } from 'd3';
import type { Complex } from '../complex/Complex.js';
import { SmithGroup } from '../draw/SmithGroup.js';
import { peripheralScales } from './peripheralScales.js';

let nextScaleId = 0;
const firstRadius = 250;
const ringSpacing = 20;

function point(radius: number, degrees: number): [number, number] {
  const angle = (degrees * Math.PI) / 180;
  return [250 + radius * Math.cos(angle), 250 - radius * Math.sin(angle)];
}

/** Peripheral rulers in the chart's 500-unit coordinate system. */
export class SmithPeripheralScales extends SmithGroup {
  public readonly labels = new SmithGroup()
    .attr('data-label-layer', 'peripheral-scales')
    .attr('pointer-events', 'none');
  private readonly scales = peripheralScales();
  private readonly axes = this.Element.attr('data-layer', 'peripheral-scales')
    .attr('pointer-events', 'none')
    .selectAll<SVGGElement, (typeof this.scales)[number]>('g')
    .data(this.scales)
    .join('g')
    .attr('data-scale', (scale) => scale.id)
    .attr('role', 'img')
    .attr('aria-label', (scale) => scale.title);

  public constructor() {
    super();
    const labelAxes = this.labels.Element.selectAll<SVGGElement, (typeof this.scales)[number]>('g')
      .data(this.scales)
      .join('g')
      .attr('data-label-scale', (scale) => scale.id)
      .nodes();
    this.axes.each(function (scale, index) {
      const labelAxis = select(labelAxes[index]);
      const axis = select(this);
      const radius = firstRadius + index * ringSpacing;
      const captionAngle = scale.unit === 'λ' ? 180 : 0;
      axis.append('title').text(scale.title);
      axis
        .append('circle')
        .attr('cx', 250)
        .attr('cy', 250)
        .attr('r', radius)
        .attr('fill', 'none')
        .attr('stroke', '#475569')
        .attr('stroke-width', 0.8)
        .attr('vector-effect', 'non-scaling-stroke');
      for (const value of scale.ticks) {
        const angle = scale.angle(value);
        const [x1, y1] = point(radius, angle);
        const major = scale.major(value);
        const [x2, y2] = point(radius - (major ? 4 : 2), angle);
        axis
          .append('line')
          .attr('x1', x1)
          .attr('y1', y1)
          .attr('x2', x2)
          .attr('y2', y2)
          .attr('stroke', '#475569')
          .attr('stroke-width', major ? 0.8 : 0.5)
          .attr('vector-effect', 'non-scaling-stroke');
        const captionDistance = Math.abs(((angle - captionAngle + 540) % 360) - 180);
        if (major && captionDistance > 25) {
          const [x, y] = point(radius + 8, angle);
          const rotation = angle >= 0 ? 90 - angle : -90 - angle;
          labelAxis
            .append('text')
            .attr('x', x)
            .attr('y', y)
            .attr('transform', `rotate(${rotation},${x},${y})`)
            .attr('text-anchor', 'middle')
            .attr('dominant-baseline', 'central')
            .attr('font-family', 'system-ui, sans-serif')
            .attr('font-size', 10.5)
            .attr('fill', '#334155')
            .text(scale.unit === 'λ' ? value.toFixed(2) : String(value));
        }
      }
      // Reserve a label sector for the curved caption without masking the ruler or its ticks.
      const captionRadius = radius + 5;
      const start = point(captionRadius, captionAngle + 45);
      const end = point(captionRadius, captionAngle - 45);
      const pathId = `smithkit-peripheral-caption-${nextScaleId++}`;
      axis
        .append('defs')
        .append('path')
        .attr('id', pathId)
        .attr('d', `M${start} A${captionRadius},${captionRadius} 0 0 1 ${end}`);
      const caption =
        scale.unit === 'λ'
          ? scale.id === 'wavelengths-generator'
            ? 'WAVELENGTHS TOWARD GENERATOR →'
            : '← WAVELENGTHS TOWARD LOAD'
          : scale.title.toUpperCase();
      labelAxis
        .append('text')
        .attr('class', 'peripheral-caption')
        .attr('text-anchor', 'middle')
        .attr('font-family', 'system-ui, sans-serif')
        .attr('font-size', 10.5)
        .attr('font-weight', 500)
        .attr('letter-spacing', 0.3)
        .attr('fill', '#334155')
        .append('textPath')
        .attr('href', `#${pathId}`)
        .attr('startOffset', '50%')
        .text(caption);
      axis
        .append('circle')
        .attr('class', 'peripheral-indicator')
        .attr('r', 3)
        .attr('visibility', 'hidden')
        .attr('fill', '#dc2626')
        .attr('stroke', 'white')
        .attr('stroke-width', 1);
    });
  }

  public override show(): SmithGroup {
    this.labels.show();
    return super.show();
  }

  public override hide(): SmithGroup {
    this.labels.hide();
    return super.hide();
  }

  /** Connect to the same cursor or marker data as the independent parameter scales. */
  public update(gamma: Complex | null): void {
    const valid = gamma !== null && Number.isFinite(gamma.abs()) && gamma.abs() <= 1;
    this.axes.each(function (scale, index) {
      const value = valid ? scale.read(gamma!) : null;
      const axis = select(this);
      const label =
        value === null ? scale.title : `${scale.title}: ${format('.4~g')(value)} ${scale.unit}`;
      axis.attr('aria-label', label).select('title').text(label);
      const dot = axis.select('.peripheral-indicator');
      if (value === null) {
        dot.attr('visibility', 'hidden').attr('data-value', null);
        return;
      }
      const [x, y] = point(firstRadius + index * ringSpacing, scale.angle(value));
      dot.attr('cx', x).attr('cy', y).attr('data-value', value).attr('visibility', null);
    });
  }
}
