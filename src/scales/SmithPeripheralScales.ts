import { select, format } from 'd3';
import type { Complex } from '../complex/Complex.js';
import { SmithGroup } from '../draw/SmithGroup.js';
import { peripheralScales } from './peripheralScales.js';

function point(radius: number, degrees: number): [number, number] {
  const angle = (degrees * Math.PI) / 180;
  return [250 + radius * Math.cos(angle), 250 - radius * Math.sin(angle)];
}

/** Peripheral rulers in the chart's 500-unit coordinate system. */
export class SmithPeripheralScales extends SmithGroup {
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
    this.axes.each(function (scale, index) {
      const axis = select(this);
      const radius = 258 + index * 22;
      axis.append('title').text(scale.title);
      axis
        .append('circle')
        .attr('cx', 250)
        .attr('cy', 250)
        .attr('r', radius)
        .attr('fill', 'none')
        .attr('stroke', '#94a3b8')
        .attr('stroke-width', 0.6)
        .attr('vector-effect', 'non-scaling-stroke');
      for (const value of scale.ticks) {
        const angle = scale.angle(value);
        const [x1, y1] = point(radius, angle);
        const [x2, y2] = point(radius + (scale.major(value) ? 5 : 3), angle);
        axis
          .append('line')
          .attr('x1', x1)
          .attr('y1', y1)
          .attr('x2', x2)
          .attr('y2', y2)
          .attr('stroke', '#64748b')
          .attr('stroke-width', 0.6)
          .attr('vector-effect', 'non-scaling-stroke');
        if (scale.major(value)) {
          const [x, y] = point(radius + 12, angle);
          const rotation = angle >= 0 ? 90 - angle : -90 - angle;
          axis
            .append('text')
            .attr('x', x)
            .attr('y', y)
            .attr('transform', `rotate(${rotation},${x},${y})`)
            .attr('text-anchor', 'middle')
            .attr('dominant-baseline', 'central')
            .attr('font-family', 'system-ui, sans-serif')
            .attr('font-size', 12)
            .attr('fill', '#475569')
            .text(scale.unit === 'λ' ? value.toFixed(2) : String(value));
        }
      }
      // A small caption interrupts each ring at the top, keeping the chart self-describing.
      axis
        .append('rect')
        .attr('x', 165)
        .attr('y', 250 - radius - 19)
        .attr('width', 170)
        .attr('height', 18)
        .attr('fill', 'white');
      axis
        .append('text')
        .attr('x', 250)
        .attr('y', 250 - radius - 7)
        .attr('text-anchor', 'middle')
        .attr('font-family', 'system-ui, sans-serif')
        .attr('font-size', 12)
        .attr('fill', '#334155')
        .text(scale.title);
      axis
        .append('circle')
        .attr('class', 'peripheral-indicator')
        .attr('r', 3.5)
        .attr('visibility', 'hidden')
        .attr('fill', '#dc2626')
        .attr('stroke', 'white')
        .attr('stroke-width', 1);
    });
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
      const [x, y] = point(258 + index * 22, scale.angle(value));
      dot.attr('cx', x).attr('cy', y).attr('data-value', value).attr('visibility', null);
    });
  }
}
